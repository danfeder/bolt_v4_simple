import React from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  Switch,
  Typography,
  Grid,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import { SoftConstraints, Day, Period, TimeSlot } from '../models/types';

interface SoftConstraintsSectionProps {
  constraints: SoftConstraints;
  onChange: (constraints: SoftConstraints) => void;
}

/**
 * Component for inputting soft constraints
 */
const SoftConstraintsSection: React.FC<SoftConstraintsSectionProps> = ({
  constraints,
  onChange
}) => {
  // Handle workload balance toggle
  const handleWorkloadBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...constraints,
      balanceWorkload: e.target.checked
    });
  };

  // Add a preferred time slot
  const [selectedDay, setSelectedDay] = React.useState<Day | ''>('');
  const [selectedPeriod, setSelectedPeriod] = React.useState<Period | ''>('');
  const [preferenceType, setPreferenceType] = React.useState<'preferred' | 'notPreferred'>('preferred');

  // Handle adding a teacher preference
  const handleAddTeacherPreference = () => {
    if (!selectedDay || !selectedPeriod) return;

    const newTimeSlot: TimeSlot = {
      day: selectedDay as Day,
      period: selectedPeriod as Period
    };

    const updatedPreferences = { ...constraints.teacherPreferences };
    
    // Create arrays if they don't exist
    if (!updatedPreferences.preferred) updatedPreferences.preferred = [];
    if (!updatedPreferences.notPreferred) updatedPreferences.notPreferred = [];
    
    // Add to the appropriate preference array
    if (preferenceType === 'preferred') {
      updatedPreferences.preferred = [...updatedPreferences.preferred, newTimeSlot];
    } else {
      updatedPreferences.notPreferred = [...updatedPreferences.notPreferred, newTimeSlot];
    }

    onChange({
      ...constraints,
      teacherPreferences: updatedPreferences
    });

    // Reset selection
    setSelectedDay('');
    setSelectedPeriod('');
  };

  // Remove a preference
  const handleRemoveTeacherPreference = (type: 'preferred' | 'notPreferred', index: number) => {
    const updatedPreferences = { ...constraints.teacherPreferences };
    
    if (updatedPreferences[type]) {
      updatedPreferences[type] = [
        ...updatedPreferences[type]!.slice(0, index),
        ...updatedPreferences[type]!.slice(index + 1)
      ];
    }

    onChange({
      ...constraints,
      teacherPreferences: updatedPreferences
    });
  };

  return (
    <Box>
      {/* Workload Balance */}
      <FormControlLabel
        control={
          <Switch
            checked={constraints.balanceWorkload}
            onChange={handleWorkloadBalanceChange}
          />
        }
        label="Balance teacher workload throughout day/week"
        sx={{ mb: 3, display: 'block' }}
      />
      
      <Typography variant="h6" gutterBottom>
        Teacher Preferences
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Preference Type</InputLabel>
            <Select
              value={preferenceType}
              onChange={(e) => setPreferenceType(e.target.value as 'preferred' | 'notPreferred')}
              label="Preference Type"
            >
              <MenuItem value="preferred">Preferred Time</MenuItem>
              <MenuItem value="notPreferred">Not Preferred Time</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
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
        <Grid item xs={12} sm={3}>
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
            onClick={handleAddTeacherPreference}
            disabled={!selectedDay || !selectedPeriod}
            fullWidth
            sx={{ height: '100%' }}
          >
            Add
          </Button>
        </Grid>
      </Grid>

      {/* Display current preferences */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Preferred Time Slots:
        </Typography>
        {constraints.teacherPreferences.preferred && 
         constraints.teacherPreferences.preferred.length > 0 ? (
          <Grid container spacing={1}>
            {constraints.teacherPreferences.preferred.map((slot, index) => (
              <Grid item key={`pref-${index}`}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={() => handleRemoveTeacherPreference('preferred', index)}
                  sx={{ mr: 1 }}
                >
                  {slot.day} - Period {slot.period} ✕
                </Button>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No preferred time slots added.
          </Typography>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Not Preferred Time Slots:
        </Typography>
        {constraints.teacherPreferences.notPreferred && 
         constraints.teacherPreferences.notPreferred.length > 0 ? (
          <Grid container spacing={1}>
            {constraints.teacherPreferences.notPreferred.map((slot, index) => (
              <Grid item key={`not-pref-${index}`}>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => handleRemoveTeacherPreference('notPreferred', index)}
                  sx={{ mr: 1 }}
                >
                  {slot.day} - Period {slot.period} ✕
                </Button>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No non-preferred time slots added.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default SoftConstraintsSection;
