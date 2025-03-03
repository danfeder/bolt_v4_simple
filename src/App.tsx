import { useState, useEffect } from 'react';
import { Container, Typography, Box, Tabs, Tab, Snackbar, Alert } from '@mui/material';
import SchedulerCLI from './components/SchedulerCLI';
import ConstraintInputForm from './components/ConstraintInputForm';
import ConstraintSetManager from './components/ConstraintSetManager';
import WeeklyScheduleDashboard from './components/WeeklyScheduleDashboard';
import FileUploadInterface from './components/FileUploadInterface';
import ClassManager from './components/ClassManager';
import ScheduleExport from './components/ScheduleExport';
import RotationHistory from './components/RotationHistory';
import { SchedulingConstraints, Schedule, Class } from './models/types';
import { dataUtils } from './utils/dataUtils';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [constraints, setConstraints] = useState<SchedulingConstraints | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load saved constraints and schedule on mount
  useEffect(() => {
    const savedConstraints = dataUtils.loadConstraints();
    if (savedConstraints) {
      setConstraints(savedConstraints);
      console.log('Loaded saved constraints from local storage');
    }

    const savedSchedule = dataUtils.loadSchedule();
    if (savedSchedule) {
      setSchedule(savedSchedule);
      console.log('Loaded saved schedule from local storage');
    }
    
    const savedClasses = dataUtils.loadClasses();
    if (savedClasses) {
      setClasses(savedClasses);
      console.log('Loaded saved classes from local storage');
    }
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleConstraintSubmit = (newConstraints: SchedulingConstraints) => {
    // Save the constraints
    dataUtils.saveConstraints(newConstraints);
    setConstraints(newConstraints);
    console.log('Constraints saved to local storage');
    showNotification('Constraints saved successfully', 'success');
  };

  const handleScheduleChange = (newSchedule: Schedule) => {
    // Save the schedule
    dataUtils.saveSchedule(newSchedule);
    setSchedule(newSchedule);
    console.log('Schedule saved to local storage');
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
    setNotification({
      ...notification,
      open: false
    });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Gym Class Rotation Scheduler
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          A lean, user-friendly scheduling tool for optimizing gym class rotations.
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 4 }}>
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab label="Constraints" />
            <Tab label="Saved Sets" />
            <Tab label="Schedule" />
            <Tab label="Class Manager" />
            <Tab label="File Management" />
            <Tab label="Export" />
            <Tab label="History" />
            <Tab label="CLI" />
          </Tabs>
        </Box>

        <Box sx={{ mt: 2 }}>
          {activeTab === 0 && 
            <ConstraintInputForm 
              onSubmit={handleConstraintSubmit} 
              initialConstraints={constraints || undefined}
            />
          }
          {activeTab === 1 && 
            <ConstraintSetManager 
              currentConstraints={constraints}
              onLoad={(loadedConstraints) => {
                setConstraints(loadedConstraints);
                // Also save as current constraints
                dataUtils.saveConstraints(loadedConstraints);
                // Switch to constraints tab to show the loaded constraints
                setActiveTab(0);
                showNotification('Constraint set loaded successfully', 'success');
              }}
            />
          }
          {activeTab === 2 && 
            <WeeklyScheduleDashboard 
              schedule={schedule || undefined} 
              onScheduleChange={handleScheduleChange}
            />
          }
          {activeTab === 3 && <ClassManager />}
          {activeTab === 4 && <FileUploadInterface />}
          {activeTab === 5 && <ScheduleExport schedule={schedule} />}
          {activeTab === 6 && 
            <RotationHistory 
              classes={classes}
              onLoadRotation={(rotation) => {
                dataUtils.saveSchedule(rotation.schedule);
                setSchedule(rotation.schedule);
                console.log('Schedule loaded from rotation history');
                // Switch to the schedule tab
                setActiveTab(2);
                showNotification('Rotation loaded successfully', 'success');
              }}
            />
          }
          {activeTab === 7 && <SchedulerCLI />}
        </Box>
      </Box>
      
      {/* Global notification system */}
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
    </Container>
  );
}

export default App;
