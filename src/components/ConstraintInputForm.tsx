import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Stack,
  Alert,
  Snackbar
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { HardConstraints, SoftConstraints, SchedulingConstraints } from '../models/types';
import HardConstraintsSection from './HardConstraintsSection';
import SoftConstraintsSection from './SoftConstraintsSection';
import PersonalConflictsSection from './PersonalConflictsSection';

interface ConstraintInputFormProps {
  onSubmit: (constraints: SchedulingConstraints) => void;
  initialConstraints?: SchedulingConstraints;
}

/**
 * Component for inputting scheduling constraints (both hard and soft)
 */
const ConstraintInputForm: React.FC<ConstraintInputFormProps> = ({ 
  onSubmit, 
  initialConstraints 
}) => {
  // Initial empty constraints
  const defaultHardConstraints: HardConstraints = {
    personalConflicts: [],
    maxConsecutivePeriods: 3,
    dailyMinClasses: 0,
    dailyMaxClasses: 8,
    weeklyMinClasses: 0,
    weeklyMaxClasses: 33,
    rotationStartDate: new Date()
  };

  const defaultSoftConstraints: SoftConstraints = {
    teacherPreferences: {
      preferred: [],
      notPreferred: []
    },
    balanceWorkload: true
  };

  // State for form values
  const [hardConstraints, setHardConstraints] = useState<HardConstraints>(
    initialConstraints?.hard || defaultHardConstraints
  );
  
  const [softConstraints, setSoftConstraints] = useState<SoftConstraints>(
    initialConstraints?.soft || defaultSoftConstraints
  );

  // State for notification
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      hard: hardConstraints,
      soft: softConstraints
    });
    
    setNotification({
      open: true,
      message: 'Constraints saved successfully!',
      severity: 'success'
    });
  };

  // Handle reset
  const handleReset = () => {
    setHardConstraints(initialConstraints?.hard || defaultHardConstraints);
    setSoftConstraints(initialConstraints?.soft || defaultSoftConstraints);
    
    setNotification({
      open: true,
      message: 'Form reset to initial values',
      severity: 'info'
    });
  };

  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper 
        elevation={3} 
        component="form" 
        onSubmit={handleSubmit}
        sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 2 }}
      >
        <Typography variant="h4" component="h2" gutterBottom>
          Scheduling Constraints
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Define the constraints for the gym class scheduler
        </Typography>

        {/* Personal Conflicts Section */}
        <PersonalConflictsSection 
          conflicts={hardConstraints.personalConflicts}
          onChange={(conflicts) => setHardConstraints({
            ...hardConstraints,
            personalConflicts: conflicts
          })}
        />

        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h3" gutterBottom>
            Hard Constraints
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These constraints must be satisfied by the schedule
          </Typography>

          <HardConstraintsSection 
            constraints={hardConstraints}
            onChange={setHardConstraints}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h3" gutterBottom>
            Soft Constraints
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These constraints are preferred but can be relaxed if necessary
          </Typography>

          <SoftConstraintsSection 
            constraints={softConstraints}
            onChange={setSoftConstraints}
          />
        </Box>

        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 4 }}>
          <Button type="button" variant="outlined" onClick={handleReset}>
            Reset
          </Button>
          <Button type="submit" variant="contained" color="primary">
            Save Constraints
          </Button>
        </Stack>
      </Paper>

      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000}
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
    </LocalizationProvider>
  );
};

export default ConstraintInputForm;
