import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Divider,
  Alert,
  Snackbar,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Merge as MergeIcon,
} from '@mui/icons-material';
import { Class, Day, Period } from '../models/types';
import { schedulerApi } from '../engine/schedulerAPI';

/**
 * Component for managing class data
 */
const ClassManager: React.FC = () => {
  // State
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<Class>>({});
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Load classes on mount
  useEffect(() => {
    loadClasses();
  }, []);

  // Load classes from API
  const loadClasses = () => {
    setClasses(schedulerApi.getClasses());
  };

  // Handle class selection
  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    setIsEditing(false);
  };

  // Start editing a class
  const handleEditClass = (classObj: Class) => {
    setEditingClass({ ...classObj });
    setIsEditing(true);
  };

  // Create a new class
  const handleNewClass = () => {
    setEditingClass({
      id: `class_${Date.now()}`,
      name: '',
      conflicts: [],
    });
    setSelectedClassId(null);
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    if (!selectedClassId) {
      setEditingClass({});
    }
  };

  // Add or update a conflict
  const handleAddConflict = () => {
    const day = document.getElementById('conflict-day') as HTMLSelectElement;
    const period = document.getElementById('conflict-period') as HTMLSelectElement;
    
    if (!day || !period) return;
    
    const selectedDay = day.value as Day;
    const selectedPeriod = Number(period.value) as Period;
    
    // Check if this conflict already exists
    const hasConflict = (editingClass.conflicts || []).some(
      c => c.day === selectedDay && c.period === selectedPeriod
    );
    
    if (hasConflict) {
      showNotification('This conflict already exists', 'warning');
      return;
    }
    
    setEditingClass(prev => ({
      ...prev,
      conflicts: [
        ...(prev.conflicts || []),
        { day: selectedDay, period: selectedPeriod }
      ]
    }));
  };

  // Remove a conflict
  const handleRemoveConflict = (index: number) => {
    setEditingClass(prev => ({
      ...prev,
      conflicts: (prev.conflicts || []).filter((_, i) => i !== index)
    }));
  };

  // Save the class
  const handleSaveClass = () => {
    if (!editingClass.name) {
      showNotification('Class name is required', 'error');
      return;
    }
    
    // Check for duplicate names
    const duplicateName = classes.some(
      c => c.name === editingClass.name && c.id !== editingClass.id
    );
    
    if (duplicateName) {
      showNotification('A class with this name already exists', 'error');
      return;
    }
    
    const updatedClass = {
      id: editingClass.id || `class_${Date.now()}`,
      name: editingClass.name,
      conflicts: editingClass.conflicts || []
    } as Class;
    
    // Add or update the class
    const isNew = !classes.some(c => c.id === updatedClass.id);
    
    if (isNew) {
      // Add new class
      const updatedClasses = [...classes, updatedClass];
      setClasses(updatedClasses);
      schedulerApi.setClasses(updatedClasses);
      showNotification('Class added successfully', 'success');
    } else {
      // Update existing class
      const updatedClasses = classes.map(c => 
        c.id === updatedClass.id ? updatedClass : c
      );
      setClasses(updatedClasses);
      schedulerApi.setClasses(updatedClasses);
      showNotification('Class updated successfully', 'success');
    }
    
    setIsEditing(false);
    setSelectedClassId(updatedClass.id);
    setEditingClass({});
  };

  // Delete a class
  const handleConfirmDelete = (classId: string) => {
    setConfirmDelete(classId);
  };

  // Handle delete confirmation
  const handleDeleteClass = () => {
    if (!confirmDelete) return;
    
    const updatedClasses = classes.filter(c => c.id !== confirmDelete);
    setClasses(updatedClasses);
    schedulerApi.setClasses(updatedClasses);
    
    if (selectedClassId === confirmDelete) {
      setSelectedClassId(null);
    }
    
    setConfirmDelete(null);
    showNotification('Class deleted successfully', 'success');
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

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Get selected class
  const selectedClass = selectedClassId 
    ? classes.find(c => c.id === selectedClassId) 
    : null;

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Class Manager
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="class manager tabs">
          <Tab label="Classes" />
          <Tab label="Import/Export" />
        </Tabs>
      </Box>
      
      {activeTab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Class List ({classes.length})
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleNewClass}
                size="small"
              >
                New Class
              </Button>
            </Box>
            
            <List sx={{ 
              maxHeight: 400, 
              overflow: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: 1
            }}>
              {classes.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No classes available" />
                </ListItem>
              ) : (
                classes.map((classObj) => (
                  <ListItem
                    key={classObj.id}
                    selected={classObj.id === selectedClassId}
                    onClick={() => handleSelectClass(classObj.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ListItemText
                      primary={classObj.name}
                      secondary={`${classObj.conflicts.length} conflicts`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClass(classObj);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmDelete(classObj.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          </Grid>
          
          <Grid item xs={12} md={7}>
            {isEditing ? (
              <Box>
                <Typography variant="h6">
                  {editingClass.id && classes.some(c => c.id === editingClass.id) 
                    ? 'Edit Class' 
                    : 'New Class'
                  }
                </Typography>
                
                <TextField
                  fullWidth
                  label="Class Name"
                  value={editingClass.name || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  margin="normal"
                  variant="outlined"
                  required
                />
                
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Conflicts
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel id="conflict-day-label">Day</InputLabel>
                    <Select
                      labelId="conflict-day-label"
                      id="conflict-day"
                      label="Day"
                      defaultValue={Day.MONDAY}
                    >
                      <MenuItem value={Day.MONDAY}>Monday</MenuItem>
                      <MenuItem value={Day.TUESDAY}>Tuesday</MenuItem>
                      <MenuItem value={Day.WEDNESDAY}>Wednesday</MenuItem>
                      <MenuItem value={Day.THURSDAY}>Thursday</MenuItem>
                      <MenuItem value={Day.FRIDAY}>Friday</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel id="conflict-period-label">Period</InputLabel>
                    <Select
                      labelId="conflict-period-label"
                      id="conflict-period"
                      label="Period"
                      defaultValue={1}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                        <MenuItem key={period} value={period}>
                          Period {period}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleAddConflict}
                  >
                    Add
                  </Button>
                </Box>
                
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 1, 
                  mb: 2,
                  minHeight: 50,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  p: 1
                }}>
                  {(editingClass.conflicts || []).length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No conflicts added yet
                    </Typography>
                  ) : (
                    (editingClass.conflicts || []).map((conflict, index) => (
                      <Chip
                        key={`${conflict.day}-${conflict.period}`}
                        label={`${conflict.day} - Period ${conflict.period}`}
                        onDelete={() => handleRemoveConflict(index)}
                        color="primary"
                        variant="outlined"
                      />
                    ))
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleCancelEdit}
                    startIcon={<CancelIcon />}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveClass}
                    startIcon={<SaveIcon />}
                  >
                    Save
                  </Button>
                </Box>
              </Box>
            ) : selectedClass ? (
              <Box>
                <Typography variant="h6">
                  {selectedClass.name}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditClass(selectedClass)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleConfirmDelete(selectedClass.id)}
                  >
                    Delete
                  </Button>
                </Box>
                
                <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                  Conflicts ({selectedClass.conflicts.length})
                </Typography>
                
                {selectedClass.conflicts.length === 0 ? (
                  <Alert severity="info">
                    This class has no conflicts
                  </Alert>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 1,
                    maxHeight: 200,
                    overflow: 'auto',
                    p: 1
                  }}>
                    {selectedClass.conflicts.map((conflict, index) => (
                      <Chip
                        key={index}
                        label={`${conflict.day} - Period ${conflict.period}`}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                minHeight: 200
              }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Select a class to view details or create a new one
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleNewClass}
                >
                  New Class
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      )}
      
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Import/Export Class Data
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Use the File Management tab to import class data from CSV files or 
            use the BOLT CLI tab to import/export data in various formats.
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Export Current Classes
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    const jsonStr = JSON.stringify(classes, null, 2);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'class_data.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export as JSON
                </Button>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Export as CSV
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    // Generate CSV with our specific format
                    const days = [Day.MONDAY, Day.TUESDAY, Day.WEDNESDAY, Day.THURSDAY, Day.FRIDAY];
                    let csv = 'Class,Monday,Tuesday,Wednesday,Thursday,Friday\n';
                    
                    classes.forEach(classObj => {
                      const row = [classObj.name];
                      
                      // Add data for each day
                      days.forEach(day => {
                        const dayConflicts = classObj.conflicts
                          .filter(c => c.day === day)
                          .map(c => c.period)
                          .sort();
                          
                        if (dayConflicts.length > 0) {
                          row.push(`"${dayConflicts.join(', ')}"`);
                        } else {
                          row.push('');
                        }
                      });
                      
                      csv += row.join(',') + '\n';
                    });
                    
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'class_conflicts.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export as CSV
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this class? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button onClick={handleDeleteClass} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification */}
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
    </Paper>
  );
};

export default ClassManager;
