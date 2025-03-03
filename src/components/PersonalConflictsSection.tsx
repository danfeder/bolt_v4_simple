import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { TimeSlot, Day, Period } from '../models/types';

interface PersonalConflictsSectionProps {
  conflicts: TimeSlot[];
  onChange: (conflicts: TimeSlot[]) => void;
}

/**
 * Component for managing personal time conflicts
 */
const PersonalConflictsSection: React.FC<PersonalConflictsSectionProps> = ({
  conflicts,
  onChange
}) => {
  // State for new conflict entry
  const [selectedDay, setSelectedDay] = useState<Day | ''>('');
  const [selectedPeriod, setSelectedPeriod] = useState<Period | ''>('');

  // Add a new conflict
  const handleAddConflict = () => {
    if (!selectedDay || !selectedPeriod) return;

    const newConflict: TimeSlot = {
      day: selectedDay as Day,
      period: selectedPeriod as Period
    };

    // Check if conflict already exists
    const conflictExists = conflicts.some(
      c => c.day === newConflict.day && c.period === newConflict.period
    );

    if (!conflictExists) {
      onChange([...conflicts, newConflict]);
      
      // Reset selections
      setSelectedDay('');
      setSelectedPeriod('');
    }
  };

  // Remove a conflict
  const handleRemoveConflict = (index: number) => {
    onChange([
      ...conflicts.slice(0, index),
      ...conflicts.slice(index + 1)
    ]);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Personal Conflicts
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add time slots when you are not available to teach
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={5}>
          <FormControl fullWidth>
            <InputLabel>Day</InputLabel>
            <Select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value as Day)}
              label="Day"
            >
              {Object.values(Day).map((day) => (
                <MenuItem key={day} value={day}>
                  {day}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={5}>
          <FormControl fullWidth>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as Period)}
              label="Period"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((period) => (
                <MenuItem key={period} value={period}>
                  Period {period}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button
            variant="contained"
            onClick={handleAddConflict}
            disabled={!selectedDay || !selectedPeriod}
            fullWidth
            sx={{ height: '100%' }}
          >
            Add
          </Button>
        </Grid>
      </Grid>

      {conflicts.length > 0 ? (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell>Period</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {conflicts.map((conflict, index) => (
                <TableRow key={`conflict-${index}`}>
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
