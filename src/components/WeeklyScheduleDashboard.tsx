import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  IconButton, 
  Tooltip, 
  Chip,
  Card,
  CardContent,
  useTheme,
  Button
} from '@mui/material';
import { 
  NavigateBefore, 
  NavigateNext,
  Today,
  Info
} from '@mui/icons-material';
import { Day, Period, Schedule, Class, Assignment } from '../models/types';
import { format, addWeeks, subWeeks, isEqual, startOfWeek, addDays } from 'date-fns';
import { schedulerApi } from '../engine/schedulerAPI';
import { dataUtils } from '../utils/dataUtils';

interface WeeklyScheduleDashboardProps {
  schedule?: Schedule;
  onScheduleChange?: (schedule: Schedule) => void;
}

const WeeklyScheduleDashboard: React.FC<WeeklyScheduleDashboardProps> = ({
  schedule: propSchedule,
  onScheduleChange
}) => {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [schedule, setSchedule] = useState<Schedule | null>(propSchedule || null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  // Define the periods for the schedule
  const periods: Period[] = [1, 2, 3, 4, 5, 6, 7, 8];
  const days = Object.values(Day);

  // Calculate start of week and weekdays
  useEffect(() => {
    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    const dates = Array(5)
      .fill(null)
      .map((_, index) => addDays(startOfCurrentWeek, index));
    setWeekDates(dates);
  }, [currentDate]);

  // Load schedule and classes when component mounts
  useEffect(() => {
    if (propSchedule) {
      setSchedule(propSchedule);
    } else {
      const savedSchedule = dataUtils.loadSchedule();
      if (savedSchedule) {
        setSchedule(savedSchedule);
      }
    }

    const classData = schedulerApi.getClasses();
    if (classData.length > 0) {
      setClasses(classData);
    } else {
      const savedClasses = dataUtils.loadClasses();
      if (savedClasses && savedClasses.length > 0) {
        setClasses(savedClasses);
        schedulerApi.setClasses(savedClasses);
      }
    }
  }, [propSchedule]);

  // Navigate to previous week
  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  // Navigate to next week
  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  // Navigate to current week
  const handleCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  // Generate a new schedule
  const handleGenerateSchedule = () => {
    try {
      const newSchedule = schedulerApi.generateSchedule();
      setSchedule(newSchedule);
      
      // Save the schedule to storage
      dataUtils.saveSchedule(newSchedule);
      
      // Notify parent if callback provided
      if (onScheduleChange) {
        onScheduleChange(newSchedule);
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      alert(`Error: ${(error as Error).message || 'Failed to generate schedule'}`);
    }
  };

  // Find the class assignment for a specific time slot
  const getAssignmentForTimeSlot = (day: Day, period: Period): Assignment | undefined => {
    if (!schedule || !schedule.assignments) return undefined;
    
    return schedule.assignments.find(
      assignment => assignment.timeSlot.day === day && assignment.timeSlot.period === period
    );
  };

  // Get class information by ID
  const getClassById = (classId: string): Class | undefined => {
    return classes.find(c => c.id === classId);
  };

  // Render a class cell
  const renderClassCell = (day: Day, period: Period) => {
    const assignment = getAssignmentForTimeSlot(day, period);
    
    if (!assignment) {
      return (
        <Box 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderRadius: 1,
            p: 1
          }}
        >
          <Typography variant="body2" color="text.secondary">No Class</Typography>
        </Box>
      );
    }
    
    const classObj = getClassById(assignment.classId);
    
    return (
      <Card 
        variant="outlined" 
        sx={{ 
          height: '100%',
          bgcolor: theme.palette.primary.light,
          borderColor: theme.palette.primary.main,
        }}
      >
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <Typography variant="body2" fontWeight="bold" noWrap>
            {classObj ? classObj.name : 'Unknown Class'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {assignment.classId}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        {/* Header with navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Weekly Schedule: {format(weekDates[0] || new Date(), 'MMM d')} - {format(weekDates[4] || new Date(), 'MMM d, yyyy')}
          </Typography>
          <Box>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<Info />}
              sx={{ mr: 2 }}
              onClick={handleGenerateSchedule}
            >
              Generate Schedule
            </Button>
            <IconButton onClick={handlePreviousWeek}>
              <NavigateBefore />
            </IconButton>
            <Tooltip title="Go to current week">
              <IconButton onClick={handleCurrentWeek}>
                <Today />
              </IconButton>
            </Tooltip>
            <IconButton onClick={handleNextWeek}>
              <NavigateNext />
            </IconButton>
          </Box>
        </Box>

        {/* Schedule Status */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          {schedule ? (
            <>
              <Chip 
                label={`${schedule.assignments.length} Classes Scheduled`} 
                color="success" 
                size="small" 
                sx={{ mr: 1 }}
              />
              {schedule.hardConstraintViolations && schedule.hardConstraintViolations > 0 ? (
                <Chip 
                  label={`${schedule.hardConstraintViolations} Constraint Violations`} 
                  color="error" 
                  size="small" 
                />
              ) : (
                <Chip 
                  label="No Constraint Violations" 
                  color="success" 
                  size="small" 
                />
              )}
            </>
          ) : (
            <Chip 
              label="No Schedule Generated" 
              color="warning" 
              size="small" 
            />
          )}
        </Box>

        {/* Schedule Grid */}
        <Grid container spacing={1}>
          {/* Header row with days */}
          <Grid item xs={1}>
            <Box sx={{ height: '40px' }}></Box>
          </Grid>
          {days.map((day, index) => (
            <Grid item xs={2.2} key={day}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 1, 
                  textAlign: 'center',
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="subtitle2">
                  {day} {weekDates[index] && `(${format(weekDates[index], 'MM/dd')})`}
                </Typography>
              </Paper>
            </Grid>
          ))}

          {/* Schedule body */}
          {periods.map(period => (
            <React.Fragment key={period}>
              {/* Period column */}
              <Grid item xs={1}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 1, 
                    textAlign: 'center',
                    bgcolor: theme.palette.secondary.main,
                    color: 'white',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="subtitle2">
                    Period {period}
                  </Typography>
                </Paper>
              </Grid>

              {/* Day cells */}
              {days.map(day => (
                <Grid item xs={2.2} key={`${day}-${period}`}>
                  <Box sx={{ 
                    height: '80px', 
                    borderRadius: 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                  }}>
                    {renderClassCell(day, period)}
                  </Box>
                </Grid>
              ))}
            </React.Fragment>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default WeeklyScheduleDashboard;
