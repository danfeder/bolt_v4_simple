import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Grid, Tabs, Tab } from '@mui/material';
import SchedulerCLI from './components/SchedulerCLI';
import ConstraintInputForm from './components/ConstraintInputForm';
import { SchedulingConstraints } from './models/types';
import { dataUtils } from './utils/dataUtils';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [constraints, setConstraints] = useState<SchedulingConstraints | null>(null);

  // Load saved constraints on mount
  useEffect(() => {
    const savedConstraints = dataUtils.loadConstraints();
    if (savedConstraints) {
      setConstraints(savedConstraints);
      console.log('Loaded saved constraints from local storage');
    }
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleConstraintSubmit = (newConstraints: SchedulingConstraints) => {
    // Save the constraints
    dataUtils.saveConstraints(newConstraints);
    setConstraints(newConstraints);
    console.log('Constraints saved to local storage');
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
          {activeTab === 1 && <SchedulerCLI />}
        </Box>
      </Box>
    </Container>
  );
}

export default App;
