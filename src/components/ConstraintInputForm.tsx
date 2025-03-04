import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Stack,
  Alert,
  Snackbar,
  Chip
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { HardConstraints, SoftConstraints, SchedulingConstraints, TimeSlot } from '../models/types';
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

  // Track if the form has been modified
  const [isModified, setIsModified] = useState(false);

  // State for notification
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info'
  });

  // Reset modified state when initialConstraints change
  useEffect(() => {
    if (initialConstraints) {
      setHardConstraints(initialConstraints.hard);
      setSoftConstraints(initialConstraints.soft);
      setIsModified(false);
    }
  }, [initialConstraints]);

  // Update hard constraints
  const handleHardConstraintsChange = (constraints: HardConstraints) => {
    setHardConstraints(constraints);
    setIsModified(true);
  };

  // Update soft constraints
  const handleSoftConstraintsChange = (constraints: SoftConstraints) => {
    setSoftConstraints(constraints);
    setIsModified(true);
  };

  // Update personal conflicts
  const handlePersonalConflictsChange = (conflicts: TimeSlot[]) => {
    setHardConstraints({
      ...hardConstraints,
      personalConflicts: conflicts
    });
    setIsModified(true);
  };

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
    
    setIsModified(false);
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
    
    setIsModified(false);
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Scheduling Constraints
          </Typography>
          {isModified && (
            <Chip 
              label="Modified" 
              color="warning" 
              variant="outlined" 
              size="small"
            />
          )}
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Define the constraints for the gym class scheduler
        </Typography>

        {/* Personal Conflicts Section */}
        <PersonalConflictsSection 
          conflicts={hardConstraints.personalConflicts}
          onChange={handlePersonalConflictsChange}
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
            onChange={handleHardConstraintsChange}
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
            onChange={handleSoftConstraintsChange}
          />
        </Box>

        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 4 }}>
          <Button 
            type="button" 
            variant="outlined" 
            onClick={handleReset}
            disabled={!isModified}
          >
            Reset
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={!isModified}
          >
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
