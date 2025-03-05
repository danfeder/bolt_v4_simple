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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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
import { isSameDay, parseISO } from 'date-fns';
import { getDayDate, organizeScheduleIntoWeeks } from '../utils/scheduleUtils';
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
  const [tempClasses, setTempClasses] = useState<{
    classId: string;
    classObj: Class;
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
          // Ensure the schedule has a start date
          if (!scheduleData.startDate) {
            // If no start date, use the next Monday as default
            scheduleData.startDate = schedulerApi.getNextMonday();
          }
          
          // Ensure the schedule has an assignments array
          if (!scheduleData.assignments) {
            scheduleData.assignments = [];
          }
          
          // Ensure the schedule has weeks organized
          if (!scheduleData.weeks) {
            try {
              const weeks = organizeScheduleIntoWeeks(scheduleData);
              scheduleData = {
                ...scheduleData,
                weeks: weeks
              };
            } catch (error) {
              console.warn('Could not organize schedule into weeks:', error);
              // Continue with the schedule even if weeks organization fails
            }
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
  const handleDropOnCell = (item: DragItem, targetTimeSlot: TimeSlot) => {
    if (!currentSchedule) return;
    
    // Check if the drop is valid
    const validationResult = validateClassMove(item.classId, targetTimeSlot, currentSchedule, classes);
    
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
      targetTimeSlot
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
    if (tempClasses.some(tempClass => tempClass.classId === item.classId)) {
      setTempClasses(prev => prev.filter(tempClass => tempClass.classId !== item.classId));
    }
    
    // Get class name for better feedback
    const classObj = classes.find(c => c.id === item.classId);
    const className = classObj ? classObj.name : item.classId;
    
    // Format date for feedback message
    const dateStr = formatDate(targetTimeSlot.date);
    
    // Show success notification with enhanced details
    showNotification(`${className} moved to ${targetTimeSlot.day}, Period ${targetTimeSlot.period + 1} (${dateStr})`, 'success');
  };

  // Handle class drop on temporary storage
  const handleDropOnTempStorage = (item: DragItem) => {
    if (!currentSchedule) return;
    
    // Get the class object
    const classObj = classes.find(c => c.id === item.classId);
    if (!classObj) return;
    
    // Remove the class from the schedule
    const updatedAssignments = currentSchedule.assignments.filter(
      a => a.classId !== item.classId
    );
    const updatedSchedule = {
      ...currentSchedule,
      assignments: updatedAssignments
    };
    
    // Add the class to temporary storage
    setTempClasses(prev => [
      ...prev,
      {
        classId: item.classId,
        classObj,
      }
    ]);
    
    // Update the schedule
    updateSchedule(updatedSchedule);
    
    // Show notification
    showNotification(`${classObj.name} moved to temporary storage`, 'info');
  };

  // Handle drag start from temporary storage
  const handleDragStartFromTemp = (classId: string) => {
    // You can add any logic needed when dragging starts from temp storage
  };

  // Handle drag end from temporary storage
  const handleDragEndFromTemp = (classId: string) => {
    // Remove the class from temporary storage when it's dragged out and dropped somewhere
    // This will only execute if the class is dropped in a valid location, otherwise
    // it will bounce back to temporary storage
  };

  // Remove a class from temporary storage
  const handleRemoveFromTemp = (classId: string) => {
    setTempClasses(prev => prev.filter(tempClass => tempClass.classId !== classId));
    showNotification('Class removed from temporary storage', 'info');
  };

  // Validate if a class can be dropped to a time slot
  const isValidDropTarget = (item: DragItem, timeSlot: TimeSlot): boolean => {
    if (!currentSchedule) return false;
    
    // Find the class being moved
    const classObj = classes.find(c => c.id === item.classId);
    if (!classObj) return false;
    
    // Check if the drop is valid using validation function
    const result = validateClassMove(item.classId, timeSlot, currentSchedule, classes);
    return result.isValid;
  };

  // Find class assignment for a given time slot
  const findClassForTimeSlot = (day: Day, period: Period): string | null => {
    if (!currentSchedule) return null;
    
    // Make sure assignments exist
    if (!currentSchedule.assignments || !Array.isArray(currentSchedule.assignments)) {
      return null;
    }
    
    // Get the date for this time slot based on the current week
    const slotDate = getDayDate(getCurrentWeekStartDate(), day);
    
    const assignment = currentSchedule.assignments.find(
      a => {
        // If the assignment has a date, we need to match by date
        if (a.timeSlot.date && slotDate) {
          // Ensure we're working with Date objects
          const assignmentDate = typeof a.timeSlot.date === 'string' ? parseISO(a.timeSlot.date) : a.timeSlot.date;
          const targetDate = typeof slotDate === 'string' ? parseISO(slotDate) : slotDate;
          const isSameDateMatch = isSameDay(assignmentDate, targetDate);
          return isSameDateMatch && a.timeSlot.period === period;
        }
        // Otherwise, match by day and period
        return a.timeSlot.day === day && a.timeSlot.period === period;
      }
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
  
  // Format a date for display - updated to use abbreviated format
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric'
    };
    return new Date(date).toLocaleDateString(undefined, options);
  };

  // Format day header with abbreviated day name and date
  const formatDayHeader = (day: Day, currentWeekStartDate: Date): string => {
    const dayDate = getDayDate(currentWeekStartDate, day);
    // Use the first 3 letters of the day name (safely)
    const dayName = day && typeof day === 'string' ? day.substring(0, 3) : '';
    const formattedDate = formatDate(dayDate);
    return `${dayName} ${formattedDate}`;
  };

  // Get the current week's start date (Monday)
  const getCurrentWeekStartDate = (): Date => {
    if (!rotationWeeks.length || !rotationWeeks[currentWeekIndex]) {
      return new Date(); // Fallback to today
    }
    return rotationWeeks[currentWeekIndex].startDate;
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
    // Open the confirmation dialog
    setReOptimizeDialogOpen(true);
  };
  
  // Cancel re-optimization and close the dialog
  const cancelReOptimize = () => {
    setReOptimizeDialogOpen(false);
  };
  
  // Confirm and proceed with re-optimization
  const confirmReOptimize = () => {
    setReOptimizeDialogOpen(false);
    
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
      
      {!currentSchedule && (
        <Alert severity="warning" sx={{ mt: 2, mb: 3 }}>
          No schedule available. Please use the "Generate Schedule" button above to create a new schedule.
        </Alert>
      )}
      
      {currentSchedule && rotationWeeks.length > 0 && (
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Button 
              onClick={goToPreviousWeek} 
              disabled={currentWeekIndex === 0}
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              size="small"
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
              variant="outlined"
              size="small"
            >
              Next Week
            </Button>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
            <Grid container spacing={1} className="schedule-grid">
              {/* Header row with day names and dates */}
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
                    {formatDayHeader(day as Day, getCurrentWeekStartDate())}
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
                    
                    // Get the date for this cell based on the current week
                    const cellDate = getDayDate(getCurrentWeekStartDate(), day as Day);
                    const cellTimeSlot: TimeSlot = { 
                      day: day as Day, 
                      period: periodIndex as Period,
                      date: cellDate
                    };
                    
                    return (
                      <Grid item xs key={`${day}-${periodIndex}`} 
                            sx={{ position: 'relative' }}>
                        <Box sx={{ 
                          height: '100px', 
                          border: '1px solid rgba(224, 224, 224, 0.4)',
                          borderRadius: '4px',
                          transition: 'all 0.2s ease'
                        }}>
                          <DroppableCell
                            timeSlot={cellTimeSlot}
                            onDrop={handleDropOnCell}
                            isValidDropTarget={(item) => isValidDropTarget(item, cellTimeSlot)}
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
                                date={cellDate}
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
            
            <TemporaryDropZone 
              tempClasses={tempClasses}
              onDrop={handleDropOnTempStorage}
              onDragStart={handleDragStartFromTemp}
              onDragEnd={handleDragEndFromTemp}
              draggableRender={(classId, classObj) => (
                <DraggableClassItem
                  classObj={classObj}
                  classId={classId}
                  day={Day.UNASSIGNED}
                  period={0}
                  isUnassigned={true}
                />
              )}
            />
          </DndProvider>
        </Paper>
      )}
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Tooltip title="Re-optimize the schedule while preserving your manual adjustments">
          <span>
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleReOptimize}
              disabled={isReOptimizing || manuallyAdjustedClasses.size === 0}
            >
              {isReOptimizing ? 'Re-Optimizing...' : 'Re-Optimize Schedule'}
            </Button>
          </span>
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
