import { useState } from 'react';
import { Container, Typography, Box } from '@mui/material';

function App() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Gym Class Rotation Scheduler
        </Typography>
        <Typography variant="subtitle1">
          A lean, user-friendly scheduling tool for optimizing gym class rotations.
        </Typography>
      </Box>
    </Container>
  );
}

export default App;
