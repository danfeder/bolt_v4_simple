import { Class, Schedule, Assignment, Day, Period, SchedulingConstraints } from '../models/types';

/**
 * Utility functions for loading and saving data for the scheduler
 */
export const dataUtils = {
  /**
   * Save classes to local storage
   * @param classes Classes to save
   */
  saveClasses(classes: Class[]): void {
    localStorage.setItem('scheduler_classes', JSON.stringify(classes));
  },

  /**
   * Load classes from local storage
   * @returns Array of classes, or empty array if none found
   */
  loadClasses(): Class[] {
    const data = localStorage.getItem('scheduler_classes');
    if (!data) return [];
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading classes from local storage:', error);
      return [];
    }
  },

  /**
   * Save schedule to local storage
   * @param schedule Schedule to save
   */
  saveSchedule(schedule: Schedule): void {
    localStorage.setItem('scheduler_schedule', JSON.stringify(schedule));
  },

  /**
   * Load schedule from local storage
   * @returns Schedule, or null if none found
   */
  loadSchedule(): Schedule | null {
    const data = localStorage.getItem('scheduler_schedule');
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading schedule from local storage:', error);
      return null;
    }
  },

  /**
   * Export schedule to CSV format
   * @param schedule Schedule to export
   * @param classes Classes for name lookup
   * @returns CSV string
   */
  exportScheduleToCSV(schedule: Schedule, classes: Class[]): string {
    if (!schedule || !schedule.assignments || schedule.assignments.length === 0) {
      return 'No schedule data to export';
    }
    
    // Group assignments by day
    const byDay = schedule.assignments.reduce((acc, assignment) => {
      const { day } = assignment.timeSlot;
      if (!acc[day]) acc[day] = [];
      acc[day].push(assignment);
      return acc;
    }, {} as Record<Day, Assignment[]>);
    
    // CSV header
    let csv = 'Day,Period,Class Name,Class ID\n';
    
    // Add rows
    for (const day of Object.values(Day)) {
      if (!byDay[day] || byDay[day].length === 0) continue;
      
      // Sort by period
      const dayAssignments = [...(byDay[day] || [])];
      dayAssignments.sort((a, b) => a.timeSlot.period - b.timeSlot.period);
      
      // Add each assignment
      for (const assignment of dayAssignments) {
        const classId = assignment.classId;
        const period = assignment.timeSlot.period;
        const classObj = classes.find(c => c.id === classId);
        const className = classObj ? classObj.name : 'Unknown class';
        
        csv += `${day},${period},${className},${classId}\n`;
      }
    }
    
    return csv;
  },

  /**
   * Parse a CSV file containing class data
   * Expected format: Name,Day1Conflicts,Day2Conflicts,...
   * Where DayXConflicts is a comma-separated list of periods
   * @param csvText CSV text to parse
   * @returns Array of parsed classes
   */
  parseClassesFromCSV(csvText: string): Class[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return []; // Need at least header and one data row
    
    const days = [Day.MONDAY, Day.TUESDAY, Day.WEDNESDAY, Day.THURSDAY, Day.FRIDAY];
    const classes: Class[] = [];
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 6) continue; // Need name + 5 days of conflicts
      
      const name = parts[0].trim();
      const conflicts: { day: Day; period: Period }[] = [];
      
      // Parse conflicts for each day
      for (let d = 0; d < days.length; d++) {
        const dayConflicts = parts[d + 1].trim();
        if (!dayConflicts) continue;
        
        // Parse periods
        const periods = dayConflicts.split(';')
          .map(p => parseInt(p.trim(), 10))
          .filter(p => !isNaN(p) && p >= 1 && p <= 8) as Period[];
        
        // Add conflicts for this day
        for (const period of periods) {
          conflicts.push({ day: days[d], period });
        }
      }
      
      classes.push({
        id: `class_${i}`,
        name,
        conflicts
      });
    }
    
    return classes;
  },

  /**
   * Download data as a file
   * @param data Data to download
   * @param filename Filename to use
   * @param mimeType MIME type of the file
   */
  downloadData(data: string, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },

  /**
   * Saves a set of scheduling constraints to local storage
   * @param constraints The constraints to save
   */
  saveConstraints(constraints: SchedulingConstraints): void {
    try {
      localStorage.setItem('gym-scheduler-constraints', JSON.stringify(constraints));
    } catch (error) {
      console.error('Failed to save constraints to local storage:', error);
    }
  },

  /**
   * Loads a set of scheduling constraints from local storage
   * @returns The loaded constraints, or null if none were found
   */
  loadConstraints(): SchedulingConstraints | null {
    try {
      const constraintsJson = localStorage.getItem('gym-scheduler-constraints');
      if (constraintsJson) {
        const constraints = JSON.parse(constraintsJson) as SchedulingConstraints;
        
        // Convert date strings back to Date objects
        if (constraints.hard.rotationStartDate) {
          constraints.hard.rotationStartDate = new Date(constraints.hard.rotationStartDate);
        }
        if (constraints.hard.rotationEndDate) {
          constraints.hard.rotationEndDate = new Date(constraints.hard.rotationEndDate);
        }
        
        return constraints;
      }
    } catch (error) {
      console.error('Failed to load constraints from local storage:', error);
    }
    return null;
  }
};
