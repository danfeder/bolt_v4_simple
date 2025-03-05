import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { startOfWeek, addDays, format, isSameDay, parseISO } from 'date-fns';
import { TimeSlot, Day, Period } from '../models/types';

interface PersonalConflictsSectionProps {
  conflicts: TimeSlot[];
  onChange: (conflicts: TimeSlot[]) => void;
}

/**
 * Component for managing personal time conflicts using a calendar view
 */
const PersonalConflictsSection: React.FC<PersonalConflictsSectionProps> = ({
  conflicts,
  onChange
}) => {
  // State for selected week
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 })); // Start on Monday
  const [selectedPeriods, setSelectedPeriods] = useState<{ [key: string]: number[] }>({});

  // Update week start when selected date changes
  useEffect(() => {
    setWeekStart(startOfWeek(selectedDate, { weekStartsOn: 1 }));
    // Reset selected periods when week changes
    setSelectedPeriods({});
  }, [selectedDate]);

  // Get day of week from date - FIXED to correctly map the JavaScript day numbers to our Day enum
  const getDayOfWeek = (date: Date): Day => {
    const day = date.getDay();
    const dayMap: { [key: number]: Day } = {
      0: Day.SUNDAY,    // Sunday is 0 in JavaScript
      1: Day.MONDAY,    // Monday is 1 in JavaScript
      2: Day.TUESDAY,   // Tuesday is 2 in JavaScript
      3: Day.WEDNESDAY, // Wednesday is 3 in JavaScript
      4: Day.THURSDAY,  // Thursday is 4 in JavaScript
      5: Day.FRIDAY,    // Friday is 5 in JavaScript
      6: Day.SATURDAY   // Saturday is 6 in JavaScript
    };
    return dayMap[day];
  };

  // Toggle a period selection for a specific date
  const togglePeriodSelection = (date: Date, period: Period) => {
    const dateKey = format(typeof date === 'string' ? parseISO(date) : date, 'yyyy-MM-dd');
    const currentPeriods = selectedPeriods[dateKey] || [];
    
    setSelectedPeriods(prev => {
      const newPeriods = { ...prev };
      
      if (currentPeriods.includes(period)) {
        // Remove the period if already selected
        newPeriods[dateKey] = currentPeriods.filter(p => p !== period);
        if (newPeriods[dateKey].length === 0) {
          delete newPeriods[dateKey];
        }
      } else {
        // Add the period
        newPeriods[dateKey] = [...currentPeriods, period];
      }
      
      return newPeriods;
    });
  };

  // Add conflicts from the current selections
  const handleAddConflicts = () => {
    const newConflicts: TimeSlot[] = [];
    
    Object.entries(selectedPeriods).forEach(([dateStr, periods]) => {
      // Create a new date object to ensure proper date handling
      const date = new Date(dateStr + 'T12:00:00');
      const day = getDayOfWeek(date);
      
      periods.forEach(period => {
        const newConflict: TimeSlot = {
          day,
          period,
          date
        };
        
        // Check if conflict already exists
        const conflictExists = conflicts.some(c => {
          if (!c.date) return false;
          // Ensure we're working with Date objects
          const conflictDate = typeof c.date === 'string' ? parseISO(c.date) : c.date;
          const dateToCompare = typeof date === 'string' ? parseISO(date) : date;
          return isSameDay(conflictDate, dateToCompare) && c.period === period;
        });
        
        if (!conflictExists) {
          newConflicts.push(newConflict);
        }
      });
    });
    
    if (newConflicts.length > 0) {
      onChange([...conflicts, ...newConflicts]);
      // Reset selected periods
      setSelectedPeriods({});
    }
  };

  // Remove a conflict
  const handleRemoveConflict = (index: number) => {
    onChange([
      ...conflicts.slice(0, index),
      ...conflicts.slice(index + 1)
    ]);
  };

  // Generate the 5-day week view
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  // Check if a specific date and period are selected
  const isPeriodSelected = (date: Date, period: Period): boolean => {
    const dateKey = format(typeof date === 'string' ? parseISO(date) : date, 'yyyy-MM-dd');
    return selectedPeriods[dateKey]?.includes(period) || false;
  };

  // Check if a specific date and period are in conflicts
  const isConflict = (date: Date, period: Period): boolean => {
    return conflicts.some(c => {
      if (!c.date) return false;
      // Ensure we're working with Date objects
      const conflictDate = typeof c.date === 'string' ? parseISO(c.date) : c.date;
      const targetDate = typeof date === 'string' ? parseISO(date) : date;
      return isSameDay(conflictDate, targetDate) && c.period === period;
    });
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Personal Conflicts
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select time slots when you are not available to teach
      </Typography>

      {/* Calendar Week Selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <DatePicker
          label="Select Week"
          value={selectedDate}
          onChange={(date) => date && setSelectedDate(date)}
          slotProps={{ textField: { size: 'small', sx: { mr: 2 } } }}
        />
        <Typography variant="body1">
          Week of {format(typeof weekStart === 'string' ? parseISO(weekStart) : weekStart, 'MMM d, yyyy')}
        </Typography>
      </Box>

      {/* Calendar View */}
      <Paper sx={{ mb: 3, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width="100">Period</TableCell>
              {weekDays.map((day) => (
                <TableCell key={day.toISOString()} align="center">
                  {format(typeof day === 'string' ? parseISO(day) : day, 'EEE')}<br />
                  {format(typeof day === 'string' ? parseISO(day) : day, 'MMM d')}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {periods.map((period) => (
              <TableRow key={`period-${period}`}>
                <TableCell>Period {period}</TableCell>
                {weekDays.map((day) => (
                  <TableCell 
                    key={`${day.toISOString()}-${period}`} 
                    align="center"
                    sx={{ 
                      position: 'relative',
                      cursor: 'pointer',
                      bgcolor: isPeriodSelected(day, period as Period) ? 'primary.light' : 
                              isConflict(day, period as Period) ? 'error.light' : 'inherit'
                    }}
                    onClick={() => togglePeriodSelection(day, period as Period)}
                  >
                    <Checkbox
                      checked={isPeriodSelected(day, period as Period)}
                      sx={{ p: 0.5 }}
                      disabled={isConflict(day, period as Period)}
                    />
                    {isConflict(day, period as Period) && (
                      <Tooltip title="This time slot is already marked as a conflict">
                        <Chip 
                          size="small" 
                          label="Conflict" 
                          color="error" 
                          sx={{ position: 'absolute', right: 2, top: 2, transform: 'scale(0.7)' }}
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          onClick={handleAddConflicts}
          disabled={Object.keys(selectedPeriods).length === 0}
        >
          Add Selected Conflicts
        </Button>
      </Box>

      {/* Conflicts List */}
      {conflicts.length > 0 ? (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Day</TableCell>
                <TableCell>Period</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {conflicts.map((conflict, index) => (
                <TableRow key={`conflict-${index}`}>
                  <TableCell>
                    {conflict.date 
                      ? format(
                          typeof conflict.date === 'string' ? parseISO(conflict.date) : conflict.date,
                          'MMM d, yyyy'
                        ) 
                      : 'N/A'}
                  </TableCell>
                  <TableCell>{conflict.day}</TableCell>
                  <TableCell>Period {conflict.period}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveConflict(index)}
                      aria-label="delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No personal conflicts added yet.
        </Typography>
      )}
    </Box>
  );
};

export default PersonalConflictsSection;
