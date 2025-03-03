import { useState, useEffect } from 'react';
import { Container, Typography, Box, Tabs, Tab } from '@mui/material';
import SchedulerCLI from './components/SchedulerCLI';
import ConstraintInputForm from './components/ConstraintInputForm';
import ConstraintSetManager from './components/ConstraintSetManager';
import WeeklyScheduleDashboard from './components/WeeklyScheduleDashboard';
import { SchedulingConstraints, Schedule } from './models/types';
import { dataUtils } from './utils/dataUtils';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [constraints, setConstraints] = useState<SchedulingConstraints | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);

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
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleConstraintSubmit = (newConstraints: SchedulingConstraints) => {
    // Save the constraints
    dataUtils.saveConstraints(newConstraints);
    setConstraints(newConstraints);
    console.log('Constraints saved to local storage');
  };

  const handleScheduleChange = (newSchedule: Schedule) => {
    // Save the schedule
    dataUtils.saveSchedule(newSchedule);
    setSchedule(newSchedule);
    console.log('Schedule saved to local storage');
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
              }}
            />
          }
          {activeTab === 2 && 
            <WeeklyScheduleDashboard 
              schedule={schedule || undefined} 
              onScheduleChange={handleScheduleChange}
            />
          }
          {activeTab === 3 && <SchedulerCLI />}
        </Box>
      </Box>
    </Container>
  );
}

export default App;
