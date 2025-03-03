import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Paper,
  Stack,
  Alert,
  Snackbar,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import { dataUtils, ConstraintSetMetadata } from '../utils/dataUtils';
import { SchedulingConstraints } from '../models/types';

/**
 * Component for managing (saving, loading, deleting) constraint sets
 */
const ConstraintSetManager: React.FC<{
  currentConstraints: SchedulingConstraints | null;
  onLoad: (constraints: SchedulingConstraints) => void;
}> = ({
  currentConstraints,
  onLoad
}) => {
  // State for constraint sets
  const [constraintSets, setConstraintSets] = useState<ConstraintSetMetadata[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);

  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Load constraint sets on mount
  useEffect(() => {
    loadConstraintSets();
  }, []);

  // Load constraint sets
  const loadConstraintSets = () => {
    const sets = dataUtils.getConstraintSetsList();
    setConstraintSets(sets);
  };

  // Open save dialog
  const handleOpenSaveDialog = (edit: boolean = false, existingId: string | null = null) => {
    setEditMode(edit);
    setCurrentSetId(existingId);
    
    if (edit && existingId) {
      // Find the set metadata
      const setToEdit = constraintSets.find(set => set.id === existingId);
      if (setToEdit) {
        setNameInput(setToEdit.name);
        setDescriptionInput(setToEdit.description || '');
      }
    } else {
      // New save
      setNameInput('');
      setDescriptionInput('');
    }
    
    setSaveDialogOpen(true);
  };

  // Close save dialog
  const handleCloseSaveDialog = () => {
    setSaveDialogOpen(false);
    setNameInput('');
    setDescriptionInput('');
    setEditMode(false);
    setCurrentSetId(null);
  };

  // Save current constraints
  const handleSaveConstraints = () => {
    if (!currentConstraints) {
      setNotification({
        open: true,
        message: 'No constraints to save',
        severity: 'error'
      });
      return;
    }

    if (!nameInput.trim()) {
      setNotification({
        open: true,
        message: 'Please enter a name for the constraint set',
        severity: 'error'
      });
      return;
    }

    // If we're editing, use the existing ID, otherwise save will generate a new one
    let saveId = '';
    
    if (editMode && currentSetId) {
      // Find the existing set metadata to preserve the ID
      const existingSet = constraintSets.find(set => set.id === currentSetId);
      if (existingSet) {
        saveId = dataUtils.saveNamedConstraintSet(
          nameInput,
          currentConstraints,
          descriptionInput,
          currentSetId
        );
      }
    } else {
      // Create a new set
      saveId = dataUtils.saveNamedConstraintSet(
        nameInput,
        currentConstraints,
        descriptionInput
      );
    }

    if (saveId) {
      loadConstraintSets();
      setNotification({
        open: true,
        message: `Constraint set "${nameInput}" ${editMode ? 'updated' : 'saved'} successfully`,
        severity: 'success'
      });
    } else {
      setNotification({
        open: true,
        message: `Failed to ${editMode ? 'update' : 'save'} constraint set`,
        severity: 'error'
      });
    }

    handleCloseSaveDialog();
  };

  // Load a constraint set
  const handleLoadConstraintSet = (id: string) => {
    const constraints = dataUtils.loadConstraintSetById(id);
    if (constraints) {
      onLoad(constraints);
      
      // Find the set name for the notification
      const setName = constraintSets.find(set => set.id === id)?.name || 'Constraint set';
      
      setNotification({
        open: true,
        message: `Loaded "${setName}" successfully`,
        severity: 'success'
      });
    } else {
      setNotification({
        open: true,
        message: 'Failed to load constraint set',
        severity: 'error'
      });
    }
  };

  // Delete a constraint set
  const handleDeleteConstraintSet = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      const success = dataUtils.deleteConstraintSet(id);
      if (success) {
        loadConstraintSets();
        setNotification({
          open: true,
          message: `Constraint set "${name}" deleted`,
          severity: 'info'
        });
      } else {
        setNotification({
          open: true,
          message: 'Failed to delete constraint set',
          severity: 'error'
        });
      }
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Constraint Set Management
      </Typography>
      
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />}
          onClick={() => handleOpenSaveDialog()}
          disabled={!currentConstraints}
        >
          Save Current Constraints
        </Button>
      </Stack>
      
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="h6" gutterBottom>
        Saved Constraint Sets
      </Typography>
      
      {constraintSets.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
          No saved constraint sets found. Use the save button to create one.
        </Typography>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {constraintSets.map((set) => (
            <Box key={set.id}>
              <ListItem
                alignItems="flex-start"
                secondaryAction={
                  <Box>
                    <Tooltip title="Edit">
                      <IconButton 
                        edge="end" 
                        aria-label="edit"
                        onClick={() => handleOpenSaveDialog(true, set.id)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={() => handleDeleteConstraintSet(set.id, set.name)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                        {set.name}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleLoadConstraintSet(set.id)}
                        startIcon={<DownloadIcon />}
                      >
                        Load
                      </Button>
                    </Box>
                  }
                  secondary={
                    <>
                      {set.description && (
                        <Typography variant="body2" color="text.primary">
                          {set.description}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        Created: {formatDate(set.createdAt)}
                        {set.createdAt !== set.updatedAt && 
                          ` • Last modified: ${formatDate(set.updatedAt)}`}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </Box>
          ))}
        </List>
      )}
      
      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={handleCloseSaveDialog}>
        <DialogTitle>
          {editMode ? 'Edit Constraint Set' : 'Save Constraint Set'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaveDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveConstraints} 
            variant="contained"
            color="primary"
            disabled={!nameInput.trim()}
          >
            {editMode ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification */}
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
    </Paper>
  );
};

export default ConstraintSetManager;
