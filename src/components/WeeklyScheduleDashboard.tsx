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
import { Schedule, TimeSlot, Day, Period, Class, RotationWeek } from '../models/types';
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
  
  // State for tracking the current week in the rotation
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [rotationWeeks, setRotationWeeks] = useState<RotationWeek[]>([]);
  const [dateRange, setDateRange] = useState<{start: Date, end: Date} | null>(null);

  // Load schedule data
  useEffect(() => {
    const loadScheduleData = async () => {
      try {
        setLoading(true);
        
        // Set classes
        const loadedClasses = await schedulerApi.getClasses();
        setClasses(loadedClasses);
        
        // Load schedule (either from props or from storage)
        let scheduleData: Schedule | null = schedule;
        if (!scheduleData) {
          scheduleData = await schedulerApi.loadSchedule();
        }
        
        if (scheduleData) {
          // Ensure the schedule has weeks organized
          if (!scheduleData.weeks) {
            const { organizeScheduleIntoWeeks } = require('../utils/scheduleUtils');
            scheduleData = organizeScheduleIntoWeeks(scheduleData);
          }
          
          setCurrentSchedule(scheduleData);
          
          // Set up rotation weeks
          if (scheduleData.weeks && scheduleData.weeks.length > 0) {
            setRotationWeeks(scheduleData.weeks);
            setDateRange({
              start: scheduleData.startDate,
              end: scheduleData.endDate || scheduleData.weeks[scheduleData.weeks.length - 1].endDate
            });
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading schedule data:', error);
        setError('Failed to load schedule data');
        setLoading(false);
      }
    };
    
    loadScheduleData();
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

  // Handle week navigation
  const goToNextWeek = () => {
    if (rotationWeeks.length > 0 && currentWeekIndex < rotationWeeks.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };
  
  const goToPreviousWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };
  
  // Function to get the current week's assignments
  const getCurrentWeekAssignments = (): any[] => {
    if (rotationWeeks.length === 0 || !rotationWeeks[currentWeekIndex]) {
      return currentSchedule?.assignments || [];
    }
    return rotationWeeks[currentWeekIndex].assignments;
  };
  
  // Get formatted date range for display
  const getFormattedDateRange = (): string => {
    if (!rotationWeeks.length || !rotationWeeks[currentWeekIndex]) {
      return 'No dates available';
    }
    
    const week = rotationWeeks[currentWeekIndex];
    const startFormatted = formatDate(week.startDate);
    const endFormatted = formatDate(week.endDate);
    
    return `${startFormatted} - ${endFormatted}`;
  };
  
  // Format a date for display
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    };
    return new Date(date).toLocaleDateString(undefined, options);
  };
  
  // Generate schedule
  const handleGenerateSchedule = () => {
    try {
      setLoading(true);
      
      // Get the next Monday as the default start date
      const startDate = schedulerApi.getNextMonday();
      
      // Generate a new schedule
      const newSchedule = schedulerApi.generateSchedule(startDate);
      
      setCurrentSchedule(newSchedule);
      
      // Set up rotation weeks
      if (newSchedule.weeks && newSchedule.weeks.length > 0) {
        setRotationWeeks(newSchedule.weeks);
        setCurrentWeekIndex(0);
        setDateRange({
          start: newSchedule.startDate,
          end: newSchedule.endDate || newSchedule.weeks[newSchedule.weeks.length - 1].endDate
        });
      }
      
      setNotification({
        open: true,
        message: 'Generated new schedule',
        severity: 'success'
      });
      
      // Notify parent if callback provided
      if (onScheduleChange) {
        onScheduleChange(newSchedule);
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
      setError('Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  };

  // Re-optimize the current schedule
  const handleReOptimize = () => {
    if (!currentSchedule) {
      setError('No schedule to re-optimize');
      return;
    }
    
    try {
      setLoading(true);
      
      // Get the locked assignments
      const lockedAssignments = currentSchedule.assignments
        .filter(a => a.timeSlot.isFixed)
        .map(a => a.classId);
      
      // Re-optimize the schedule
      const newSchedule = schedulerApi.reOptimizeSchedule(lockedAssignments, currentSchedule);
      
      setCurrentSchedule(newSchedule);
      
      // Update rotation weeks
      if (newSchedule.weeks && newSchedule.weeks.length > 0) {
        setRotationWeeks(newSchedule.weeks);
        setDateRange({
          start: newSchedule.startDate,
          end: newSchedule.endDate || newSchedule.weeks[newSchedule.weeks.length - 1].endDate
        });
      }
      
      setNotification({
        open: true,
        message: 'Re-optimized schedule with locked assignments',
        severity: 'success'
      });
      
      // Notify parent if callback provided
      if (onScheduleChange) {
        onScheduleChange(newSchedule);
      }
    } catch (error) {
      console.error('Error re-optimizing schedule:', error);
      setError('Failed to re-optimize schedule');
    } finally {
      setLoading(false);
    }
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
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Weekly Schedule Dashboard
      </Typography>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleGenerateSchedule}
          disabled={loading}
        >
          Generate Schedule
        </Button>
        
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={handleReOptimize}
          disabled={!currentSchedule || loading}
        >
          Re-Optimize Schedule
        </Button>
      </Box>
      
      {currentSchedule && rotationWeeks.length > 0 && (
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Button 
              onClick={goToPreviousWeek} 
              disabled={currentWeekIndex === 0}
              startIcon={<ArrowBackIcon />}
            >
              Previous Week
            </Button>
            
            <Typography variant="h6">
              {rotationWeeks[currentWeekIndex] ? 
                `Week ${rotationWeeks[currentWeekIndex].weekNumber}: ${getFormattedDateRange()}` : 
                'No schedule data'}
            </Typography>
            
            <Button 
              onClick={goToNextWeek} 
              disabled={currentWeekIndex >= rotationWeeks.length - 1}
              endIcon={<ArrowForwardIcon />}
            >
              Next Week
            </Button>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
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
          </DndProvider>
        </Paper>
      )}
      
      <TemporaryDropZone 
        onDrop={handleDropOnTemp} 
        storedClasses={tempStorage}
        onDragFromTemp={(classId) => {
          // This is handled by the drag logic, no additional action needed
        }}
        onRemoveFromTemp={handleRemoveFromTemp}
      />
      
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
    </Box>
  );
};

export default WeeklyScheduleDashboard;
