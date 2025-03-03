import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Alert, 
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider 
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Class } from '../models/types';
import { schedulerApi } from '../engine/schedulerAPI';
import { dataUtils } from '../utils/dataUtils';

/**
 * Component for uploading CSV/JSON files with class conflict data
 */
const FileUploadInterface: React.FC = () => {
  // State for file upload
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [parsedClasses, setParsedClasses] = useState<Class[]>([]);

  /**
   * Handle file selection
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setMessage(null);
    setParsedClasses([]);
    
    if (selectedFile) {
      // Only accept CSV or JSON files
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExt !== 'csv' && fileExt !== 'json') {
        setMessage({
          text: 'Invalid file format. Please upload a CSV or JSON file.',
          type: 'error'
        });
        setFile(null);
        if (event.target.value) event.target.value = '';
      }
    }
  };

  /**
   * Process the selected file
   */
  const handleFileUpload = async () => {
    if (!file) {
      setMessage({
        text: 'Please select a file first.',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    
    try {
      const fileContent = await readFileContent(file);
      let parsedData: Class[] = [];
      
      // Check file type and parse accordingly
      if (file.name.endsWith('.csv')) {
        parsedData = parseCSVData(fileContent);
      } else if (file.name.endsWith('.json')) {
        parsedData = parseJSONData(fileContent);
      }
      
      if (parsedData.length === 0) {
        setMessage({
          text: 'No valid class data found in the file.',
          type: 'error'
        });
      } else {
        setParsedClasses(parsedData);
        setMessage({
          text: `Successfully parsed ${parsedData.length} classes from the file.`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setMessage({
        text: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Import the parsed classes into the scheduler
   */
  const handleImportClasses = () => {
    if (parsedClasses.length === 0) {
      setMessage({
        text: 'No classes to import.',
        type: 'error'
      });
      return;
    }
    
    try {
      // Get current classes to merge with
      const currentClasses = schedulerApi.getClasses();
      
      // Check for duplicate class names
      const existingClassNames = new Set(currentClasses.map(c => c.name));
      const duplicates = parsedClasses.filter(c => existingClassNames.has(c.name));
      
      if (duplicates.length > 0) {
        // Ask user what to do with duplicates
        if (window.confirm(`${duplicates.length} classes with the same names already exist. Replace them?`)) {
          // Remove existing classes with the same names
          const filteredClasses = currentClasses.filter(c => !parsedClasses.some(pc => pc.name === c.name));
          
          // Add new classes
          const mergedClasses = [...filteredClasses, ...parsedClasses];
          
          // Update the scheduler API
          schedulerApi.setClasses(mergedClasses);
          dataUtils.saveClasses(mergedClasses);
          
          setMessage({
            text: `Imported ${parsedClasses.length} classes, replacing ${duplicates.length} existing ones.`,
            type: 'success'
          });
        } else {
          // User cancelled, only add new classes
          const newClasses = parsedClasses.filter(c => !existingClassNames.has(c.name));
          const mergedClasses = [...currentClasses, ...newClasses];
          
          schedulerApi.setClasses(mergedClasses);
          dataUtils.saveClasses(mergedClasses);
          
          setMessage({
            text: `Imported ${newClasses.length} new classes, skipped ${duplicates.length} duplicates.`,
            type: 'success'
          });
        }
      } else {
        // No duplicates, just add all classes
        const mergedClasses = [...currentClasses, ...parsedClasses];
        schedulerApi.setClasses(mergedClasses);
        dataUtils.saveClasses(mergedClasses);
        
        setMessage({
          text: `Successfully imported ${parsedClasses.length} classes.`,
          type: 'success'
        });
      }
      
      // Reset state
      setParsedClasses([]);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error importing classes:', error);
      setMessage({
        text: `Error importing classes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  /**
   * Read file content as text
   */
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  };

  /**
   * Parse CSV data in the format specified in the example file
   * Format: Class,Monday,Tuesday,Wednesday,Thursday,Friday
   * Where each day column contains period numbers that are conflicts
   */
  const parseCSVData = (csvContent: string): Class[] => {
    const lines = csvContent.split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }
    
    // Validate header row
    const header = lines[0].split(',').map(h => h.trim());
    const expectedColumns = ['Class', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    // Check if we have the expected columns (case insensitive)
    const headerValid = expectedColumns.every(col => 
      header.some(h => h.toLowerCase() === col.toLowerCase())
    );
    
    if (!headerValid) {
      throw new Error(`Invalid CSV header. Expected: ${expectedColumns.join(', ')}`);
    }
    
    // Process data rows
    const classes: Class[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split by comma, but handle quoted values containing commas
      const columns = parseCSVLine(line);
      if (columns.length < 6) continue; // Need class name and 5 days
      
      const className = columns[0].trim();
      
      // Process conflict periods for each day
      const conflicts = [];
      for (let day = 0; day < 5; day++) {
        const dayConflicts = columns[day + 1].trim();
        if (!dayConflicts) continue;
        
        // Parse period numbers, handling various formats
        const periodStrs = dayConflicts.split(/,\s*/);
        for (const periodStr of periodStrs) {
          const period = parseInt(periodStr.trim());
          if (!isNaN(period) && period >= 1 && period <= 8) {
            conflicts.push({
              day: expectedColumns[day + 1] as any,
              period: period as any
            });
          }
        }
      }
      
      // Create the class
      classes.push({
        id: `class_${className.replace(/\s+/g, '_')}`,
        name: className,
        conflicts
      });
    }
    
    return classes;
  };

  /**
   * Parse a CSV line, handling quoted values that might contain commas
   */
  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  /**
   * Parse JSON data
   */
  const parseJSONData = (jsonContent: string): Class[] => {
    try {
      const data = JSON.parse(jsonContent);
      
      // Check if it's an array
      if (!Array.isArray(data)) {
        throw new Error('JSON data must be an array of class objects');
      }
      
      // Validate and transform
      return data.map((item, index) => {
        if (!item.name) {
          throw new Error(`Class at index ${index} is missing a name`);
        }
        
        // Create a valid class object
        return {
          id: item.id || `class_${item.name.replace(/\s+/g, '_')}`,
          name: item.name,
          conflicts: Array.isArray(item.conflicts) ? item.conflicts : []
        };
      });
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Upload Class Conflict Data
      </Typography>
      
      <Typography variant="body1" paragraph>
        Upload a CSV or JSON file containing class conflict data. The file should have the following format:
      </Typography>
      
      <Typography variant="body2" component="pre" sx={{ 
        backgroundColor: '#f5f5f5', 
        p: 2, 
        borderRadius: 1,
        overflow: 'auto',
        fontSize: '0.8rem',
        mb: 2
      }}>
        Class,Monday,Tuesday,Wednesday,Thursday,Friday
        Class1,"1, 3",2,"4, 5",6,7
        Class2,2,3,4,"5, 6","7, 8"
        ...
      </Typography>
      
      <Typography variant="body2" paragraph>
        Where each day column contains the period numbers (1-8) that are conflicts for that class.
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
          sx={{ mr: 2 }}
        >
          Select File
          <input
            id="file-upload"
            type="file"
            accept=".csv,.json"
            hidden
            onChange={handleFileChange}
          />
        </Button>
        
        {file && (
          <Typography variant="body2">
            Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </Typography>
        )}
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleFileUpload}
          disabled={!file || isLoading}
          sx={{ mr: 2 }}
        >
          Process File
        </Button>
        
        <Button
          variant="contained"
          color="success"
          onClick={handleImportClasses}
          disabled={parsedClasses.length === 0 || isLoading}
        >
          Import Classes
        </Button>
      </Box>
      
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}
      
      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}
      
      {parsedClasses.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Parsed Classes ({parsedClasses.length})
          </Typography>
          
          <List sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'background.paper' }}>
            {parsedClasses.map((cls, index) => (
              <React.Fragment key={cls.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem>
                  <ListItemText
                    primary={cls.name}
                    secondary={`${cls.conflicts.length} conflicts: ${cls.conflicts
                      .slice(0, 5)
                      .map(c => `${c.day} period ${c.period}`)
                      .join(', ')}${cls.conflicts.length > 5 ? '...' : ''}`}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
};

export default FileUploadInterface;
