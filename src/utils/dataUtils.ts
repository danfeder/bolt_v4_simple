import { Class, Schedule, Assignment, Day, Period, SchedulingConstraints } from '../models/types';

/**
 * Interface for constraint set metadata
 */
export interface ConstraintSetMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

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
  },

  /**
   * Generates a unique ID for constraint sets
   * @returns A unique string ID
   */
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  },

  /**
   * Save a named constraint set with metadata
   * @param name The name of the constraint set
   * @param constraints The constraints to save
   * @param description Optional description for the constraint set
   * @param existingId Optional ID of an existing constraint set to update
   * @returns The ID of the saved constraint set
   */
  saveNamedConstraintSet(
    name: string,
    constraints: SchedulingConstraints,
    description: string = '',
    existingId?: string
  ): string {
    try {
      // Get existing metadata
      const metadataList = this.getConstraintSetsList();
      
      // Create new metadata entry or update existing
      const timestamp = new Date().toISOString();
      let id = existingId || '';
      let updatedMetadataList: ConstraintSetMetadata[] = [];
      
      if (existingId) {
        // Update existing set by ID
        const existingIndex = metadataList.findIndex(m => m.id === existingId);
        if (existingIndex >= 0) {
          // Update existing set
          metadataList[existingIndex].name = name;
          metadataList[existingIndex].updatedAt = timestamp;
          metadataList[existingIndex].description = description;
          updatedMetadataList = [...metadataList];
        } else {
          // ID not found, treat as new
          id = this.generateId();
          const newMetadata: ConstraintSetMetadata = {
            id,
            name,
            description,
            createdAt: timestamp,
            updatedAt: timestamp
          };
          updatedMetadataList = [...metadataList, newMetadata];
        }
      } else {
        // Check if a set with this name already exists
        const existingIndex = metadataList.findIndex(m => m.name === name);
        if (existingIndex >= 0) {
          // Update existing set
          id = metadataList[existingIndex].id;
          metadataList[existingIndex].updatedAt = timestamp;
          if (description) {
            metadataList[existingIndex].description = description;
          }
          updatedMetadataList = [...metadataList];
        } else {
          // Create new set
          id = this.generateId();
          const newMetadata: ConstraintSetMetadata = {
            id,
            name,
            description,
            createdAt: timestamp,
            updatedAt: timestamp
          };
          updatedMetadataList = [...metadataList, newMetadata];
        }
      }
      
      // Save metadata
      localStorage.setItem('gym-scheduler-constraint-sets-meta', JSON.stringify(updatedMetadataList));
      
      // Save actual constraints
      localStorage.setItem(`gym-scheduler-constraint-set-${id}`, JSON.stringify(constraints));
      
      return id;
    } catch (error) {
      console.error('Failed to save named constraint set:', error);
      return '';
    }
  },

  /**
   * Gets the list of all saved constraint sets
   * @returns Array of constraint set metadata
   */
  getConstraintSetsList(): ConstraintSetMetadata[] {
    try {
      const json = localStorage.getItem('gym-scheduler-constraint-sets-meta');
      if (json) {
        return JSON.parse(json) as ConstraintSetMetadata[];
      }
    } catch (error) {
      console.error('Failed to get constraint sets list:', error);
    }
    return [];
  },

  /**
   * Loads a specific constraint set by ID
   * @param id The ID of the constraint set to load
   * @returns The constraints, or null if not found
   */
  loadConstraintSetById(id: string): SchedulingConstraints | null {
    try {
      const json = localStorage.getItem(`gym-scheduler-constraint-set-${id}`);
      if (json) {
        const constraints = JSON.parse(json) as SchedulingConstraints;
        
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
      console.error(`Failed to load constraint set with ID ${id}:`, error);
    }
    return null;
  },

  /**
   * Deletes a constraint set by ID
   * @param id The ID of the constraint set to delete
   * @returns True if deleted successfully, false otherwise
   */
  deleteConstraintSet(id: string): boolean {
    try {
      // Get metadata list
      const metadataList = this.getConstraintSetsList();
      
      // Find and remove from metadata
      const updatedList = metadataList.filter(item => item.id !== id);
      
      // If no change, the ID wasn't found
      if (updatedList.length === metadataList.length) {
        return false;
      }
      
      // Update metadata
      localStorage.setItem('gym-scheduler-constraint-sets-meta', JSON.stringify(updatedList));
      
      // Remove the actual constraints
      localStorage.removeItem(`gym-scheduler-constraint-set-${id}`);
      
      return true;
    } catch (error) {
      console.error(`Failed to delete constraint set with ID ${id}:`, error);
      return false;
    }
  }
};
