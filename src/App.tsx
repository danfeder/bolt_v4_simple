import { useState } from 'react';
import { Container, Typography, Box, Paper, Grid } from '@mui/material';
import SchedulerCLI from './components/SchedulerCLI';

function App() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Gym Class Rotation Scheduler
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          A lean, user-friendly scheduling tool for optimizing gym class rotations.
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 4 }}>
          <Grid item xs={12}>
            <SchedulerCLI />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default App;
