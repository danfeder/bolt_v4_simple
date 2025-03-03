import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Tab,
  Tabs,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RestoreIcon from '@mui/icons-material/Restore';
import { ScheduleRotation, Day, Class } from '../models/types';
import { dataUtils } from '../utils/dataUtils';
import { schedulerApi } from '../engine/schedulerAPI';

interface RotationHistoryProps {
  onLoadRotation?: (rotation: ScheduleRotation) => void;
  classes?: Class[];
}

/**
 * Component for viewing and managing schedule rotation history
 */
const RotationHistory: React.FC<RotationHistoryProps> = ({
  onLoadRotation,
  classes = []
}) => {
  // State for rotations
  const [rotations, setRotations] = useState<ScheduleRotation[]>([]);
  const [currentClasses, setCurrentClasses] = useState<Class[]>(classes || []);
  
  // State for previewing a rotation
  const [previewRotation, setPreviewRotation] = useState<ScheduleRotation | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // State for editing a rotation
  const [editingRotation, setEditingRotation] = useState<ScheduleRotation | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  
  // State for delete confirmation
  const [deleteRotationId, setDeleteRotationId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // State for saving current schedule
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newRotationName, setNewRotationName] = useState('');
  const [newRotationNotes, setNewRotationNotes] = useState('');
  
  // Load rotations on mount
  useEffect(() => {
    loadRotations();
    
    if (!classes || classes.length === 0) {
      setCurrentClasses(schedulerApi.getClasses() || []);
    }
  }, [classes]);
  
  // Load all rotations from storage
  const loadRotations = () => {
    const savedRotations = dataUtils.getRotationHistory();
    // Sort by creation date (newest first)
    savedRotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setRotations(savedRotations);
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle deleting a rotation
  const handleDeleteRotation = (id: string) => {
    setDeleteRotationId(id);
    setShowDeleteConfirm(true);
  };
  
  // Confirm deletion
  const confirmDelete = () => {
    if (deleteRotationId) {
      dataUtils.deleteRotation(deleteRotationId);
      loadRotations();
      setShowDeleteConfirm(false);
      setDeleteRotationId(null);
    }
  };
  
  // Handle editing rotation metadata
  const handleEditRotation = (rotation: ScheduleRotation) => {
    setEditingRotation(rotation);
    setEditName(rotation.name);
    setEditNotes(rotation.notes || '');
    setShowEdit(true);
  };
  
  // Save edited rotation
  const saveRotationEdit = () => {
    if (editingRotation) {
      dataUtils.updateRotation(editingRotation.id, {
        name: editName,
        notes: editNotes
      });
      loadRotations();
      setShowEdit(false);
      setEditingRotation(null);
    }
  };
  
  // Handle previewing a rotation
  const handlePreviewRotation = (rotation: ScheduleRotation) => {
    setPreviewRotation(rotation);
    setShowPreview(true);
  };
  
  // Handle loading a rotation to current schedule
  const handleLoadRotation = (rotation: ScheduleRotation) => {
    if (onLoadRotation) {
      onLoadRotation(rotation);
    } else {
      // If no callback provided, just load into the scheduler API
      schedulerApi.setSchedule(JSON.parse(JSON.stringify(rotation.schedule)));
      // Also save as current schedule
      dataUtils.saveSchedule(rotation.schedule);
    }
    setShowPreview(false);
  };
  
  // Handle saving current schedule to history
  const handleSaveCurrentSchedule = () => {
    const currentSchedule = schedulerApi.getCurrentSchedule();
    if (!currentSchedule) {
      alert('No current schedule found to save');
      return;
    }
    
    setShowSaveDialog(true);
  };
  
  // Save current schedule to history
  const saveToHistory = () => {
    const currentSchedule = schedulerApi.getCurrentSchedule();
    if (!currentSchedule || !newRotationName) {
      return;
    }
    
    dataUtils.saveScheduleToRotationHistory(
      currentSchedule,
      newRotationName,
      newRotationNotes
    );
    
    loadRotations();
    setShowSaveDialog(false);
    setNewRotationName('');
    setNewRotationNotes('');
  };
  
  // Generate table rows for a schedule preview
  const generatePreviewRows = (rotation: ScheduleRotation) => {
    if (!rotation || !rotation.schedule || !rotation.schedule.assignments) {
      return [];
    }
    
    // Group assignments by day
    const byDay = rotation.schedule.assignments.reduce((acc, assignment) => {
      const { day } = assignment.timeSlot;
      if (!acc[day]) acc[day] = [];
      acc[day].push(assignment);
      return acc;
    }, {} as Record<Day, any[]>);
    
    const rows: any[] = [];
    
    // Add rows for each day
    for (const day of Object.values(Day)) {
      if (!byDay[day] || byDay[day].length === 0) continue;
      
      // Sort by period
      const dayAssignments = [...(byDay[day] || [])];
      dayAssignments.sort((a, b) => a.timeSlot.period - b.timeSlot.period);
      
      // Add each assignment
      for (const assignment of dayAssignments) {
        const classId = assignment.classId;
        const period = assignment.timeSlot.period;
        const classObj = currentClasses.find(c => c.id === classId);
        const className = classObj ? classObj.name : `Class ${classId}`;
        
        rows.push({
          day,
          period,
          className,
          classId
        });
      }
    }
    
    return rows;
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Schedule Rotation History</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />}
          onClick={handleSaveCurrentSchedule}
        >
          Save Current Schedule
        </Button>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {rotations.length === 0 ? (
        <Alert severity="info">
          No saved schedule rotations found. Generate a schedule and save it to create your first rotation.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {rotations.map(rotation => (
            <Grid item xs={12} md={6} lg={4} key={rotation.id}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>{rotation.name}</Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Created: {formatDate(rotation.createdAt)}
                    </Typography>
                    <Chip 
                      label={`${rotation.classCount || rotation.schedule.assignments.length} classes`} 
                      size="small" 
                      color="primary" 
                    />
                  </Box>
                  
                  {rotation.notes && (
                    <Box sx={{ mt: 2, backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                      <Typography variant="body2">{rotation.notes}</Typography>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions>
                  <Tooltip title="Preview this rotation">
                    <IconButton onClick={() => handlePreviewRotation(rotation)}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Edit details">
                    <IconButton onClick={() => handleEditRotation(rotation)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Delete rotation">
                    <IconButton onClick={() => handleDeleteRotation(rotation.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Box sx={{ flexGrow: 1 }} />
                  
                  <Tooltip title="Load this rotation">
                    <Button 
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<RestoreIcon />}
                      onClick={() => handleLoadRotation(rotation)}
                    >
                      Load
                    </Button>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {previewRotation?.name}
          <Typography variant="subtitle2" color="text.secondary">
            {previewRotation && formatDate(previewRotation.createdAt)}
          </Typography>
        </DialogTitle>
        
        <DialogContent dividers>
          {previewRotation?.notes && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Notes:</Typography>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography variant="body2">{previewRotation.notes}</Typography>
              </Paper>
            </Box>
          )}
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Day</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Class</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewRotation && generatePreviewRows(previewRotation).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.day}</TableCell>
                    <TableCell>{row.period}</TableCell>
                    <TableCell>{row.className}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Close</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => previewRotation && handleLoadRotation(previewRotation)}
          >
            Load This Schedule
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog
        open={showEdit}
        onClose={() => setShowEdit(false)}
      >
        <DialogTitle>Edit Rotation Details</DialogTitle>
        
        <DialogContent>
          <TextField
            label="Rotation Name"
            fullWidth
            margin="normal"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          
          <TextField
            label="Notes"
            fullWidth
            margin="normal"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            multiline
            rows={4}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={saveRotationEdit}
            disabled={!editName}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <DialogTitle>Delete Rotation</DialogTitle>
        
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this rotation? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={confirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Save Current Schedule Dialog */}
      <Dialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
      >
        <DialogTitle>Save Current Schedule to History</DialogTitle>
        
        <DialogContent>
          <TextField
            label="Rotation Name"
            fullWidth
            margin="normal"
            value={newRotationName}
            onChange={(e) => setNewRotationName(e.target.value)}
            required
          />
          
          <TextField
            label="Notes (Optional)"
            fullWidth
            margin="normal"
            value={newRotationNotes}
            onChange={(e) => setNewRotationNotes(e.target.value)}
            multiline
            rows={4}
            placeholder="Add any notes about this schedule rotation"
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={saveToHistory}
            disabled={!newRotationName}
          >
            Save to History
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RotationHistory;
