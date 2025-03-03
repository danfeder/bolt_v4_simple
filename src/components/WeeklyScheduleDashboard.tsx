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
  Divider
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

  // Handle class drop on a cell
  const handleDropOnCell = (item: DragItem, day: Day, period: Period) => {
    if (!currentSchedule) return;
    
    // Check if the drop is valid
    const validationResult = validateClassMove(item.classId, day, period, currentSchedule, classes);
    
    if (!validationResult.isValid) {
      // Show an error notification
      showNotification(validationResult.reason || 'Invalid move', 'error');
      return;
    }
    
    // Update the schedule
    const updatedSchedule = moveClassInSchedule(
      currentSchedule,
      item.classId,
      { day, period }
    );
    
    setCurrentSchedule(updatedSchedule);
    
    // Notify parent component about the change
    if (onScheduleChange) {
      onScheduleChange(updatedSchedule);
    }
    
    // Check if the class was in temp storage and remove it if it was
    if (tempStorage.some(tempClass => tempClass.classId === item.classId)) {
      setTempStorage(prev => prev.filter(tempClass => tempClass.classId !== item.classId));
    }
    
    // Show success notification
    showNotification('Class moved successfully', 'success');
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
    
    setCurrentSchedule(updatedSchedule);
    
    // Add to temp storage
    setTempStorage(prev => [
      ...prev,
      {
        classId: item.classId,
        classObj,
        originalTimeSlot: item.originalTimeSlot
      }
    ]);
    
    // Notify parent component about the change
    if (onScheduleChange) {
      onScheduleChange(updatedSchedule);
    }
    
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

  // Handle saving the current schedule
  const handleSaveSchedule = () => {
    if (!currentSchedule) return;
    
    try {
      schedulerApi.saveSchedule(currentSchedule);
      showNotification('Schedule saved successfully', 'success');
    } catch (err) {
      console.error('Error saving schedule:', err);
      showNotification('Failed to save schedule', 'error');
    }
  };

  // Show notification
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({
      open: true,
      message,
      severity
    });
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
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSaveSchedule}
          >
            Save Schedule
          </Button>
        </Box>
      </Paper>
      
      {/* Notification system */}
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
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </DndProvider>
  );
};

export default WeeklyScheduleDashboard;
