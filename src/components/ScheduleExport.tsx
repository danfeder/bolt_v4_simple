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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  FormControlLabel,
  Checkbox,
  Tooltip,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import { Schedule, Class, Day, Period } from '../models/types';
import { dataUtils } from '../utils/dataUtils';
import { schedulerApi } from '../engine/schedulerAPI';

interface ScheduleExportProps {
  schedule?: Schedule | null;
  classes?: Class[];
}

const ScheduleExport: React.FC<ScheduleExportProps> = ({ 
  schedule = null,
  classes = []
}) => {
  // Get current schedule and classes if not provided through props
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(schedule);
  const [currentClasses, setCurrentClasses] = useState<Class[]>(classes);
  
  // Date selection for the schedule
  const [startDate, setStartDate] = useState<Date | null>(
    currentSchedule?.startDate || dataUtils.getNextMonday()
  );
  
  // Export settings
  const [includeClassId, setIncludeClassId] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  
  // Preview data for the table
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  // Load data if not provided via props
  useEffect(() => {
    if (!schedule) {
      const savedSchedule = dataUtils.loadSchedule();
      setCurrentSchedule(savedSchedule);
    }
    
    if (classes.length === 0) {
      const savedClasses = schedulerApi.getClasses();
      setCurrentClasses(savedClasses);
    }
  }, [schedule, classes]);
  
  // Update preview data when schedule or start date changes
  useEffect(() => {
    if (currentSchedule && startDate) {
      generatePreviewData();
    }
  }, [currentSchedule, startDate, includeClassId]);
  
  // Generate the preview data
  const generatePreviewData = () => {
    if (!currentSchedule || !startDate) return;
    
    const dayToDateMap = dataUtils.calculateDatesForWeek(startDate);
    const byDay = currentSchedule.assignments.reduce((acc, assignment) => {
      const { day } = assignment.timeSlot;
      if (!acc[day]) acc[day] = [];
      acc[day].push(assignment);
      return acc;
    }, {} as Record<Day, any[]>);
    
    const data: any[] = [];
    
    // Add rows
    for (const day of Object.values(Day)) {
      if (!byDay[day] || byDay[day].length === 0) continue;
      
      // Get the date for this day
      const dateForDay = dayToDateMap[day];
      const formattedDate = dateForDay.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Sort by period
      const dayAssignments = [...(byDay[day] || [])];
      dayAssignments.sort((a, b) => a.timeSlot.period - b.timeSlot.period);
      
      // Add each assignment
      for (const assignment of dayAssignments) {
        const classId = assignment.classId;
        const period = assignment.timeSlot.period;
        const classObj = currentClasses.find(c => c.id === classId);
        const className = classObj ? classObj.name : 'Unknown class';
        
        data.push({
          date: formattedDate,
          day,
          period,
          className,
          classId
        });
      }
    }
    
    setPreviewData(data);
  };
  
  // Export schedule as calendar CSV
  const handleExportCalendarCSV = () => {
    if (!currentSchedule || !startDate) {
      alert('No schedule available to export.');
      return;
    }
    
    const calendarCSV = dataUtils.exportScheduleToCalendarCSV(currentSchedule, currentClasses, startDate);
    dataUtils.downloadData(calendarCSV, 'schedule_calendar.csv', 'text/csv');
  };
  
  // Get formatted date
  const getFormattedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  if (!currentSchedule) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          No schedule available. Please generate a schedule first using the scheduler.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Schedule Export 
        <Tooltip title="Export your schedule in a calendar-like format with dates">
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Export Settings
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Schedule Start Date"
                  value={startDate}
                  onChange={(newDate) => setStartDate(newDate)}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true, 
                      helperText: "Choose the first day (Monday) of your schedule rotation"
                    } 
                  }}
                />
              </LocalizationProvider>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeClassId}
                    onChange={(e) => setIncludeClassId(e.target.checked)}
                  />
                }
                label="Include class IDs in export"
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showPreview}
                    onChange={(e) => setShowPreview(e.target.checked)}
                  />
                }
                label="Show preview"
              />
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={handleExportCalendarCSV}
              fullWidth
            >
              Export Schedule as CSV
            </Button>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          {showPreview && (
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Preview
              </Typography>
              
              <TableContainer sx={{ maxHeight: 440 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Day</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell>Class</TableCell>
                      {includeClassId && <TableCell>Class ID</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={includeClassId ? 5 : 4}>
                          <Alert severity="info">
                            No schedule data available for preview.
                          </Alert>
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{getFormattedDate(row.date)}</TableCell>
                          <TableCell>{row.day}</TableCell>
                          <TableCell>{row.period}</TableCell>
                          <TableCell>{row.className}</TableCell>
                          {includeClassId && <TableCell>{row.classId}</TableCell>}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScheduleExport;
