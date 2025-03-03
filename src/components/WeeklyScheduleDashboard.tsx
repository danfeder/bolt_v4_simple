import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  Snackbar, 
  Alert,
  CircularProgress,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Schedule, TimeSlot, Day, Period, Class } from '../models/types';
import { schedulerApi } from '../engine/schedulerAPI';
import { DAYS_OF_WEEK, PERIODS_PER_DAY } from '../models/constants';
import DraggableClassItem, { DragItem } from './DraggableClassItem';
import DroppableCell from './DroppableCell';
import TemporaryDropZone from './TemporaryDropZone';
import { validateClassMove, moveClassInSchedule } from '../utils/dragDropUtils';
import './WeeklyScheduleDashboard.css';

// Detect if the device has touch support
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

interface WeeklyScheduleDashboardProps {
  schedule?: Schedule;
  onScheduleChange?: (schedule: Schedule) => void;
}

const WeeklyScheduleDashboard: React.FC<WeeklyScheduleDashboardProps> = ({ 
  schedule,
  onScheduleChange 
}) => {
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // State for re-optimization
  const [isReOptimizing, setIsReOptimizing] = useState(false);
  const [reOptimizeDialogOpen, setReOptimizeDialogOpen] = useState(false);
  const [manuallyAdjustedClasses, setManuallyAdjustedClasses] = useState<Set<string>>(new Set());
  
  // State for the temporary storage zone
  const [tempStorage, setTempStorage] = useState<{
    classId: string;
    classObj: Class;
    originalTimeSlot: {
      day: string;
      period: number;
    };
  }[]>([]);

  // Load the schedule and classes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // If a schedule is provided, use it
        if (schedule) {
          setCurrentSchedule(schedule);
        } else {
          // Otherwise, try to generate a new one
          const generatedSchedule = await schedulerApi.generateSchedule();
          setCurrentSchedule(generatedSchedule);
        }
        
        // Load all classes
        const loadedClasses = await schedulerApi.getClasses();
        setClasses(loadedClasses);
        
        setError(null);
      } catch (err) {
        console.error('Error loading schedule data:', err);
        setError('Failed to load schedule data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [schedule]);

  // Update the underlying data model and notify parents
  const updateSchedule = (updatedSchedule: Schedule) => {
    setCurrentSchedule(updatedSchedule);
    
    // Update scheduler API
    try {
      schedulerApi.saveSchedule(updatedSchedule);
      // Only show notification for manual saves, not automatic ones from drag and drop
    } catch (err) {
      console.error('Error updating schedule in API:', err);
      showNotification('Changes saved locally but failed to update engine data. Your changes may not persist after reload.', 'warning');
    }
    
    // Notify parent component about the change
    if (onScheduleChange) {
      onScheduleChange(updatedSchedule);
    }
  };

  // Handle class drop on a cell
  const handleDropOnCell = (item: DragItem, day: Day, period: Period) => {
    if (!currentSchedule) return;
    
    // Check if the drop is valid
    const validationResult = validateClassMove(item.classId, day, period, currentSchedule, classes);
    
    if (!validationResult.isValid) {
      // Show an error notification with enhanced details
      const detailMessage = validationResult.conflictDetails?.conflictDescription || validationResult.reason || 'Invalid move';
      showNotification(detailMessage, 'error');
      return;
    }
    
    // Update the schedule
    const updatedSchedule = moveClassInSchedule(
      currentSchedule,
      item.classId,
      { day, period }
    );
    
    // Add this class to the manually adjusted classes set
    setManuallyAdjustedClasses(prev => {
      const updated = new Set(prev);
      updated.add(item.classId);
      return updated;
    });
    
    // Update the schedule in state and API
    updateSchedule(updatedSchedule);
    
    // Check if the class was in temp storage and remove it if it was
    if (tempStorage.some(tempClass => tempClass.classId === item.classId)) {
      setTempStorage(prev => prev.filter(tempClass => tempClass.classId !== item.classId));
    }
    
    // Get class name for better feedback
    const classObj = classes.find(c => c.id === item.classId);
    const className = classObj ? classObj.name : item.classId;
    
    // Show success notification with enhanced details
    showNotification(`${className} moved to ${day}, Period ${period + 1}`, 'success');
  };

  // Handle class drop on temporary storage
  const handleDropOnTemp = (item: DragItem) => {
    if (!currentSchedule) return;
    
    // Find the class object
    const classObj = classes.find(c => c.id === item.classId);
    if (!classObj) {
      showNotification('Class not found', 'error');
      return;
    }
    
    // Check if already in temp storage
    if (tempStorage.some(tempClass => tempClass.classId === item.classId)) {
      showNotification('Class is already in temporary storage', 'info');
      return;
    }
    
    // Update the schedule by removing the class
    const updatedSchedule = {
      ...currentSchedule,
      assignments: currentSchedule.assignments.filter(
        assignment => assignment.classId !== item.classId
      )
    };
    
    // Add this class to the manually adjusted classes set
    setManuallyAdjustedClasses(prev => {
      const updated = new Set(prev);
      updated.add(item.classId);
      return updated;
    });
    
    // Update the schedule in state and API
    updateSchedule(updatedSchedule);
    
    // Add to temp storage
    setTempStorage(prev => [
      ...prev,
      {
        classId: item.classId,
        classObj,
        originalTimeSlot: item.originalTimeSlot
      }
    ]);
    
    showNotification('Class moved to temporary storage', 'info');
  };

  // Remove a class from temporary storage
  const handleRemoveFromTemp = (classId: string) => {
    setTempStorage(prev => prev.filter(tempClass => tempClass.classId !== classId));
    showNotification('Class removed from temporary storage', 'info');
  };

  // Check if a drop target is valid
  const isValidDropTarget = (item: DragItem, day: Day, period: Period): boolean => {
    if (!currentSchedule) return false;
    
    const validationResult = validateClassMove(item.classId, day, period, currentSchedule, classes);
    return validationResult.isValid;
  };

  // Find class assignment for a given time slot
  const findClassForTimeSlot = (day: Day, period: Period): string | null => {
    if (!currentSchedule) return null;
    
    const assignment = currentSchedule.assignments.find(
      a => a.timeSlot.day === day && a.timeSlot.period === period
    );
    
    return assignment ? assignment.classId : null;
  };

  // Find the class object for a given class ID
  const getClassById = (classId: string): Class | undefined => {
    return classes.find(c => c.id === classId);
  };

  // Handle re-optimization
  const handleReOptimize = () => {
    setReOptimizeDialogOpen(true);
  };

  // Confirm re-optimization
  const confirmReOptimize = async () => {
    if (!currentSchedule) return;
    
    setReOptimizeDialogOpen(false);
    setIsReOptimizing(true);
    
    try {
      // Convert manually adjusted classes set to array
      const lockedAssignments = Array.from(manuallyAdjustedClasses);
      
      // Use the schedulerAPI to re-optimize
      const reOptimizedSchedule = await schedulerApi.reOptimizeSchedule(lockedAssignments);
      
      // Update the schedule
      setCurrentSchedule(reOptimizedSchedule);
      
      // Notify parent component about the change
      if (onScheduleChange) {
        onScheduleChange(reOptimizedSchedule);
      }
      
      showNotification(
        `Schedule successfully re-optimized while preserving ${lockedAssignments.length} manual adjustments`, 
        'success'
      );
    } catch (err) {
      console.error('Error during re-optimization:', err);
      showNotification('Failed to re-optimize schedule. Please try again.', 'error');
    } finally {
      setIsReOptimizing(false);
    }
  };

  // Cancel re-optimization
  const cancelReOptimize = () => {
    setReOptimizeDialogOpen(false);
  };

  // Handle saving the current schedule (button click)
  const handleSaveSchedule = () => {
    if (!currentSchedule) return;
    
    try {
      schedulerApi.saveSchedule(currentSchedule);
      
      // Count the number of assignments for better feedback
      const assignmentCount = currentSchedule.assignments.length;
      showNotification(`Schedule with ${assignmentCount} class assignments saved successfully`, 'success');
    } catch (err) {
      console.error('Error saving schedule:', err);
      showNotification('Failed to save schedule. Please try again.', 'error');
    }
  };

  // Show notification
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({
      open: true,
      message,
      severity
    });
    
    // For errors and warnings, log to console for debugging
    if (severity === 'error' || severity === 'warning') {
      console.log(`[${severity.toUpperCase()}] ${message}`);
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!currentSchedule) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        No schedule available. Please generate a new schedule.
      </Alert>
    );
  }

  return (
    <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
      <Paper elevation={1} sx={{ p: 3, mt: 2 }}>
        <Typography variant="h5" gutterBottom>
          Weekly Schedule Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Drag and drop classes to adjust the schedule. Classes can be temporarily removed to the storage zone below.
        </Typography>
        
        <Divider sx={{ mb: 2 }} />
        
        <TemporaryDropZone 
          onDrop={handleDropOnTemp} 
          storedClasses={tempStorage}
          onDragFromTemp={(classId) => {
            // This is handled by the drag logic, no additional action needed
          }}
          onRemoveFromTemp={handleRemoveFromTemp}
        />
        
        <Grid container spacing={1} className="schedule-grid">
          {/* Header row with day names */}
          <Grid item xs={1}>
            <Box sx={{ height: '50px' }}></Box>
          </Grid>
          {DAYS_OF_WEEK.map(day => (
            <Grid item xs key={day}>
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  fontWeight: 'bold',
                  p: 1,
                  backgroundColor: 'primary.light',
                  borderRadius: '4px 4px 0 0',
                  color: 'primary.contrastText'
                }}
              >
                {day}
              </Box>
            </Grid>
          ))}
          
          {/* Schedule grid */}
          {Array.from({ length: PERIODS_PER_DAY }).map((_, periodIndex) => (
            <React.Fragment key={periodIndex}>
              {/* Period label */}
              <Grid item xs={1}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100px',
                    backgroundColor: 'grey.100',
                    p: 1,
                    fontWeight: 'medium'
                  }}
                >
                  Period {periodIndex + 1}
                </Box>
              </Grid>
              
              {/* Day cells */}
              {DAYS_OF_WEEK.map(day => {
                const classId = findClassForTimeSlot(day as Day, periodIndex as Period);
                const classObj = classId ? getClassById(classId) : undefined;
                const isEmpty = !classId;
                
                return (
                  <Grid item xs key={`${day}-${periodIndex}`}>
                    <Box sx={{ height: '100px' }}>
                      <DroppableCell
                        day={day as Day}
                        period={periodIndex as Period}
                        onDrop={handleDropOnCell}
                        isValidDropTarget={isValidDropTarget}
                        isEmpty={isEmpty}
                        classes={classes}
                        schedule={currentSchedule}
                      >
                        {classObj && classId && (
                          <DraggableClassItem
                            classObj={classObj}
                            classId={classId}
                            day={day}
                            period={periodIndex}
                          />
                        )}
                      </DroppableCell>
                    </Box>
                  </Grid>
                );
              })}
            </React.Fragment>
          ))}
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Tooltip title="Re-optimize the schedule while preserving your manual adjustments">
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleReOptimize}
              disabled={isReOptimizing || manuallyAdjustedClasses.size === 0}
            >
              {isReOptimizing ? 'Re-Optimizing...' : 'Re-Optimize Schedule'}
            </Button>
          </Tooltip>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSaveSchedule}
          >
            Save Schedule
          </Button>
        </Box>
      </Paper>
      
      {/* Re-optimization confirmation dialog */}
      <Dialog
        open={reOptimizeDialogOpen}
        onClose={cancelReOptimize}
      >
        <DialogTitle>Confirm Schedule Re-Optimization</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Re-optimization will keep your {manuallyAdjustedClasses.size} manually adjusted classes in their current positions, 
            while optimizing the schedule for the remaining classes. This may significantly change 
            the positions of non-adjusted classes to achieve the best overall schedule.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelReOptimize} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmReOptimize} color="primary" variant="contained">
            Re-Optimize
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Enhanced notification system */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </DndProvider>
  );
};

export default WeeklyScheduleDashboard;
