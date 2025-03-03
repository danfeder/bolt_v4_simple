import React from 'react';
import {
  Grid,
  TextField,
  Typography,
  Box,
  Slider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { HardConstraints } from '../models/types';

interface HardConstraintsSectionProps {
  constraints: HardConstraints;
  onChange: (constraints: HardConstraints) => void;
}

/**
 * Component for inputting hard constraints
 */
const HardConstraintsSection: React.FC<HardConstraintsSectionProps> = ({
  constraints,
  onChange
}) => {
  // Handle numeric input changes
  const handleNumericChange = (field: keyof HardConstraints) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      onChange({
        ...constraints,
        [field]: value
      });
    }
  };

  // Handle date changes
  const handleDateChange = (field: 'rotationStartDate' | 'rotationEndDate') => (
    date: Date | null
  ) => {
    if (date) {
      onChange({
        ...constraints,
        [field]: date
      });
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Rotation Start/End Date */}
        <Grid item xs={12} sm={6}>
          <DatePicker
            label="Rotation Start Date"
            value={constraints.rotationStartDate}
            onChange={handleDateChange('rotationStartDate')}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DatePicker
            label="Rotation End Date (Optional)"
            value={constraints.rotationEndDate || null}
            onChange={handleDateChange('rotationEndDate')}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Grid>
        
        {/* Maximum Consecutive Periods */}
        <Grid item xs={12}>
          <Typography id="max-consecutive-periods-slider" gutterBottom>
            Maximum Consecutive Periods: {constraints.maxConsecutivePeriods}
          </Typography>
          <Slider
            value={constraints.maxConsecutivePeriods}
            onChange={(_event: Event, value: number | number[], _activeThumb: number) => 
              onChange({
                ...constraints,
                maxConsecutivePeriods: value as number
              })
            }
            valueLabelDisplay="auto"
            step={1}
            marks
            min={1}
            max={8}
          />
        </Grid>
        
        {/* Daily Min/Max Classes */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Daily Minimum Classes"
            type="number"
            value={constraints.dailyMinClasses}
            onChange={handleNumericChange('dailyMinClasses')}
            InputProps={{
              inputProps: { min: 0, max: 8 }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Daily Maximum Classes"
            type="number"
            value={constraints.dailyMaxClasses}
            onChange={handleNumericChange('dailyMaxClasses')}
            InputProps={{
              inputProps: { min: 0, max: 8 }
            }}
          />
        </Grid>
        
        {/* Weekly Min/Max Classes */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Weekly Minimum Classes"
            type="number"
            value={constraints.weeklyMinClasses}
            onChange={handleNumericChange('weeklyMinClasses')}
            InputProps={{
              inputProps: { min: 0, max: 40 }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Weekly Maximum Classes"
            type="number"
            value={constraints.weeklyMaxClasses}
            onChange={handleNumericChange('weeklyMaxClasses')}
            InputProps={{
              inputProps: { min: 0, max: 40 }
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default HardConstraintsSection;
