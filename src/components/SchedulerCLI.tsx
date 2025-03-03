import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Button
} from '@mui/material';
import { SchedulerAPI } from '../engine/schedulerAPI';
import { dataUtils } from '../utils/dataUtils';
import { Schedule, Day } from '../models/types';
import './SchedulerCLI.css';

/**
 * A command-line interface component for testing the scheduling engine
 */
const SchedulerCLI: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([
    'Welcome to the Gym Class Scheduler CLI!',
    'Type "help" for a list of commands.'
  ]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  
  // Create a reference to the scheduler API
  const schedulerAPIRef = useRef(new SchedulerAPI());
  const schedulerAPI = schedulerAPIRef.current;
  
  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  // Try to load saved data on mount
  useEffect(() => {
    const savedClasses = dataUtils.loadClasses();
    if (savedClasses && savedClasses.length > 0) {
      // Load the classes into the API
      schedulerAPI.setClasses(savedClasses);
      setOutput(prev => [...prev, `Loaded ${savedClasses.length} classes from storage.`]);
    }

    const savedSchedule = dataUtils.loadSchedule();
    if (savedSchedule) {
      setSchedule(savedSchedule);
      setOutput(prev => [...prev, 'Loaded previously saved schedule from storage.']);
    }
  }, []);
  
  // Command handler
  const handleCommand = (command: string) => {
    // Split command into parts
    const parts = command.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Add command to output
    setOutput(prev => [...prev, `> ${command}`]);
    
    // Handle command
    try {
      switch (cmd) {
        case 'help':
          handleHelp();
          break;
        case 'clear':
          setOutput(['Output cleared. Type "help" for a list of commands.']);
          break;
        case 'generate':
          handleGenerate(args);
          break;
        case 'add':
          handleAdd(args);
          break;
        case 'list':
          handleList(args);
          break;
        case 'randomize':
          handleRandomize(args);
          break;
        case 'config':
          handleConfig(args);
          break;
        case 'validate':
          handleValidate();
          break;
        case 'save':
          handleSave(args);
          break;
        case 'load':
          handleLoad();
          break;
        case 'export':
          handleExport(args);
          break;
        case 'import':
          handleImport();
          break;
        default:
          setOutput(prev => [...prev, `Unknown command: ${cmd}. Type "help" for a list of commands.`]);
      }
    } catch (error) {
      if (error instanceof Error) {
        setOutput(prev => [...prev, `Error: ${error.message}`]);
      } else {
        setOutput(prev => [...prev, 'An unknown error occurred']);
      }
    }
  };
  
  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleCommand(input);
      setInput('');
    }
  };
  
  // Handle key presses
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) {
        handleCommand(input);
        setInput('');
      }
    }
  };
  
  // Help command
  const handleHelp = () => {
    setOutput(prev => [
      ...prev, 
      'Available commands:',
      '- help - Show this help message',
      '- clear - Clear the output',
      '- generate - Generate a schedule with the current classes',
      '- add <className> - Add a class with the given name',
      '- add-conflict <classId> <day> <period> - Add a conflict to a class',
      '- list classes - List all classes',
      '- list schedule - Show the current schedule',
      '- randomize <count> - Generate random test data with <count> classes (default 33)',
      '- config <param> <value> - Update a configuration parameter',
      '- validate - Validate the current schedule',
      '- save [classes|schedule|all] - Save classes or schedule to local storage',
      '- load - Load saved classes and schedule from local storage',
      '- export [csv|json] - Export the current schedule or classes to CSV or JSON',
      '- import - Import classes from a CSV file',
    ]);
  };
  
  // Generate command
  const handleGenerate = (_args: string[]) => {
    try {
      const schedule = schedulerAPI.generateSchedule();
      setSchedule(schedule);
      
      // Save the schedule to storage
      dataUtils.saveSchedule(schedule);
      
      setOutput(prev => [
        ...prev, 
        'Generated schedule successfully!', 
        'Schedule saved to local storage.',
        'Use "view schedule" to see the results.'
      ]);
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      setOutput(prev => [...prev, `Error: ${(error as Error).message || 'Failed to generate schedule'}`]);
    }
  };
  
  // Add command
  const handleAdd = (args: string[]) => {
    if (args.length < 1) {
      setOutput(prev => [...prev, 'Usage: add <className>']);
      return;
    }
    
    const className = args.join(' ');
    const id = schedulerAPI.addClass({
      name: className,
      conflicts: []
    });
    
    // Save classes to storage
    dataUtils.saveClasses(schedulerAPI.getClasses());
    
    setOutput(prev => [...prev, `Added class "${className}" with ID ${id}`, 'Classes saved to local storage.']);
  };
  
  // List command
  const handleList = (args: string[]) => {
    if (args.length < 1) {
      setOutput(prev => [...prev, 'Usage: list [classes|schedule]']);
      return;
    }
    
    const subCommand = args[0].toLowerCase();
    
    switch (subCommand) {
      case 'classes':
        const classes = schedulerAPI.getClasses();
        setOutput(prev => [
          ...prev,
          `Found ${classes.length} classes:`,
          ...classes.map((c: any) => `- ${c.id}: ${c.name} (${c.conflicts.length} conflicts)`)
        ]);
        break;
      
      case 'schedule':
        if (!schedule) {
          setOutput(prev => [...prev, 'No schedule has been generated yet. Use "generate" to create a schedule.']);
          return;
        }
        
        const { assignments } = schedule;
        
        // Group assignments by day
        const byDay = assignments.reduce((acc, assignment) => {
          const { day } = assignment.timeSlot;
          if (!acc[day]) acc[day] = [];
          acc[day].push(assignment);
          return acc;
        }, {} as Record<Day, typeof assignments>);
        
        // Format output
        const output: string[] = ['Current schedule:'];
        
        for (const day of Object.values(Day)) {
          output.push(`\n${day}:`);
          
          if (!byDay[day] || byDay[day].length === 0) {
            output.push('  No classes scheduled');
            continue;
          }
          
          // Sort by period
          const dayAssignments = [...(byDay[day] || [])];
          dayAssignments.sort((a, b) => a.timeSlot.period - b.timeSlot.period);
          
          // Format assignments
          for (const assignment of dayAssignments) {
            const classId = assignment.classId;
            const period = assignment.timeSlot.period;
            const classObj = schedulerAPI.getClasses().find((c: any) => c.id === classId);
            const className = classObj ? classObj.name : 'Unknown class';
            
            output.push(`  Period ${period}: ${className} (${classId})`);
          }
        }
        
        setOutput(prev => [...prev, ...output]);
        break;
      
      default:
        setOutput(prev => [...prev, `Unknown list subcommand: ${subCommand}. Valid options are "classes" or "schedule".`]);
    }
  };
  
  // Randomize command
  const handleRandomize = (args: string[]) => {
    const count = args.length > 0 ? parseInt(args[0], 10) : 33;
    
    if (isNaN(count) || count <= 0) {
      setOutput(prev => [...prev, 'Invalid class count. Please provide a positive number.']);
      return;
    }
    
    const classIds = schedulerAPI.generateRandomTestData(count);
    
    // Save classes to storage
    dataUtils.saveClasses(schedulerAPI.getClasses());
    
    setOutput(prev => [
      ...prev,
      `Generated ${classIds.length} random classes.`,
      'Classes saved to local storage.',
      'Type "list classes" to see the classes.'
    ]);
  };
  
  // Config command
  const handleConfig = (args: string[]) => {
    if (args.length < 2) {
      setOutput(prev => [...prev, 'Usage: config <param> <value>']);
      return;
    }
    
    const [param, valueStr] = args;
    const value = Number(valueStr);
    
    if (isNaN(value)) {
      setOutput(prev => [...prev, `Invalid value for ${param}: ${valueStr}. Must be a number.`]);
      return;
    }
    
    const validParams = ['populationSize', 'generations', 'tournamentSize', 'crossoverRate', 'mutationRate'];
    
    if (!validParams.includes(param)) {
      setOutput(prev => [
        ...prev, 
        `Invalid parameter: ${param}. Valid parameters are: ${validParams.join(', ')}`
      ]);
      return;
    }
    
    // Update config
    const config: Record<string, number> = { [param]: value };
    schedulerAPI.updateConfig(config);
    
    setOutput(prev => [...prev, `Updated ${param} to ${value}`]);
  };
  
  // Validate command
  const handleValidate = () => {
    if (!schedule) {
      setOutput(prev => [...prev, 'No schedule has been generated yet. Use "generate" to create a schedule.']);
      return;
    }
    
    const validation = schedulerAPI.validateSchedule(schedule);
    
    setOutput(prev => [
      ...prev,
      `Schedule validation: ${validation.isValid ? 'VALID' : 'INVALID'}`,
      `Hard constraint violations: ${validation.hardConstraintViolations}`,
      'Violation details:',
      ...validation.violationDetails.map((d: string) => `- ${d}`)
    ]);
  };
  
  // Save command
  const handleSave = (args: string[]) => {
    if (args.length < 1) {
      setOutput(prev => [...prev, 'Usage: save [classes|schedule|all]']);
      return;
    }
    
    const subCommand = args[0].toLowerCase();
    
    switch (subCommand) {
      case 'classes':
        dataUtils.saveClasses(schedulerAPI.getClasses());
        setOutput(prev => [...prev, 'Classes saved to local storage.']);
        break;
      
      case 'schedule':
        if (!schedule) {
          setOutput(prev => [...prev, 'No schedule has been generated yet. Use "generate" to create a schedule.']);
          return;
        }
        
        dataUtils.saveSchedule(schedule);
        setOutput(prev => [...prev, 'Schedule saved to local storage.']);
        break;
      
      case 'all':
        dataUtils.saveClasses(schedulerAPI.getClasses());
        
        if (schedule) {
          dataUtils.saveSchedule(schedule);
          setOutput(prev => [...prev, 'Classes and schedule saved to local storage.']);
        } else {
          setOutput(prev => [...prev, 'Classes saved to local storage. No schedule to save.']);
        }
        break;
      
      default:
        setOutput(prev => [
          ...prev, 
          `Unknown save subcommand: ${subCommand}. Valid options are "classes", "schedule", or "all".`
        ]);
    }
  };
  
  // Load command
  const handleLoad = () => {
    // Load classes
    const classes = dataUtils.loadClasses();
    if (classes && classes.length > 0) {
      schedulerAPI.setClasses(classes);
      setOutput(prev => [...prev, `Loaded ${classes.length} classes from local storage.`]);
    } else {
      setOutput(prev => [...prev, 'No classes found in local storage.']);
    }
    
    // Load schedule
    const loadedSchedule = dataUtils.loadSchedule();
    if (loadedSchedule) {
      setSchedule(loadedSchedule);
      setOutput(prev => [...prev, 'Loaded schedule from local storage.']);
    } else {
      setOutput(prev => [...prev, 'No schedule found in local storage.']);
    }
  };
  
  // Export command
  const handleExport = (args: string[]) => {
    if (args.length < 1) {
      setOutput(prev => [...prev, 'Usage: export [csv|json] [classes|schedule]']);
      return;
    }
    
    const format = args[0].toLowerCase();
    const target = args.length > 1 ? args[1].toLowerCase() : 'schedule';
    
    switch (format) {
      case 'csv':
        if (target === 'schedule') {
          if (!schedule) {
            setOutput(prev => [...prev, 'No schedule has been generated yet. Use "generate" to create a schedule.']);
            return;
          }
          
          const csv = dataUtils.exportScheduleToCSV(schedule, schedulerAPI.getClasses());
          dataUtils.downloadData(csv, 'schedule.csv', 'text/csv');
          setOutput(prev => [...prev, 'Schedule exported to CSV file.']);
        } else if (target === 'classes') {
          const classes = schedulerAPI.getClasses();
          
          if (classes.length === 0) {
            setOutput(prev => [...prev, 'No classes to export.']);
            return;
          }
          
          // Simple CSV export for classes
          let csv = 'ID,Name,Conflicts\n';
          for (const cls of classes) {
            const conflicts = cls.conflicts.map((c: any) => `${c.day} ${c.period}`).join(';');
            csv += `${cls.id},${cls.name},${conflicts}\n`;
          }
          
          dataUtils.downloadData(csv, 'classes.csv', 'text/csv');
          setOutput(prev => [...prev, 'Classes exported to CSV file.']);
        } else {
          setOutput(prev => [...prev, `Unknown export target: ${target}. Valid options are "classes" or "schedule".`]);
        }
        break;
      
      case 'json':
        if (target === 'schedule') {
          if (!schedule) {
            setOutput(prev => [...prev, 'No schedule has been generated yet. Use "generate" to create a schedule.']);
            return;
          }
          
          const json = JSON.stringify(schedule, null, 2);
          dataUtils.downloadData(json, 'schedule.json', 'application/json');
          setOutput(prev => [...prev, 'Schedule exported to JSON file.']);
        } else if (target === 'classes') {
          const classes = schedulerAPI.getClasses();
          
          if (classes.length === 0) {
            setOutput(prev => [...prev, 'No classes to export.']);
            return;
          }
          
          const json = JSON.stringify(classes, null, 2);
          dataUtils.downloadData(json, 'classes.json', 'application/json');
          setOutput(prev => [...prev, 'Classes exported to JSON file.']);
        } else {
          setOutput(prev => [...prev, `Unknown export target: ${target}. Valid options are "classes" or "schedule".`]);
        }
        break;
      
      default:
        setOutput(prev => [...prev, `Unknown export format: ${format}. Valid options are "csv" or "json".`]);
    }
  };
  
  // Import command - placeholder for future implementation
  const handleImport = () => {
    setOutput(prev => [
      ...prev,
      'Import functionality is not yet implemented.',
      'In a future version, this will allow importing classes from CSV files.'
    ]);
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Scheduler Command Line Interface
      </Typography>
      
      <div className="cli-container">
        <div className="cli-output">
          {output.map((line, index) => (
            <div key={index} className="cli-output-line">
              {line}
            </div>
          ))}
          <div ref={outputEndRef} />
        </div>
        
        <div className="cli-input-container">
          <span className="cli-prompt">$</span>
          <TextField
            variant="outlined"
            fullWidth
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            size="small"
            autoFocus
          />
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSubmit}
            sx={{ ml: 1 }}
          >
            Execute
          </Button>
        </div>
      </div>
    </Paper>
  );
};

export default SchedulerCLI;
