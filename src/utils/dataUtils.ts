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
 * Interface for schedule rotation history entry
 */
export interface ScheduleRotation {
  id: string;
  name: string;
  schedule: Schedule;
  createdAt: Date;
  notes: string;
  classCount: number;
}

/**
 * Utility functions for loading and saving data for the scheduler
 */
export const dataUtils = {
  // Local storage keys
  SCHEDULE_KEY: 'gym-scheduler-schedule',
  CLASSES_KEY: 'gym-scheduler-classes',
  CONSTRAINTS_KEY: 'gym-scheduler-constraints',
  CONSTRAINT_SETS_KEY: 'gym-scheduler-constraint-sets-meta',
  CONSTRAINT_SET_PREFIX: 'gym-scheduler-constraint-set-',
  ROTATION_HISTORY_KEY: 'gym-scheduler-rotation-history',
  
  // Maximum number of rotations to keep in history
  MAX_ROTATION_HISTORY: 20,

  /**
   * Save classes to local storage
   * @param classes Classes to save
   */
  saveClasses(classes: Class[]): void {
    localStorage.setItem(this.CLASSES_KEY, JSON.stringify(classes));
  },

  /**
   * Load classes from local storage
   * @returns Array of classes, or empty array if none found
   */
  loadClasses(): Class[] {
    const data = localStorage.getItem(this.CLASSES_KEY);
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
    localStorage.setItem(this.SCHEDULE_KEY, JSON.stringify(schedule));
  },

  /**
   * Load schedule from local storage
   * @returns Schedule, or null if none found
   */
  loadSchedule(): Schedule | null {
    const data = localStorage.getItem(this.SCHEDULE_KEY);
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
   * Export schedule to Calendar-like CSV format with actual dates
   * @param schedule Schedule to export
   * @param classes Classes for name lookup
   * @param startDate The starting date for the rotation (defaults to next Monday if not provided)
   * @returns CSV string
   */
  exportScheduleToCalendarCSV(schedule: Schedule, classes: Class[], startDate?: Date): string {
    if (!schedule || !schedule.assignments || schedule.assignments.length === 0) {
      return 'No schedule data to export';
    }

    // If no start date is provided, default to next Monday
    const actualStartDate = startDate || this.getNextMonday();
    
    // Group assignments by day
    const byDay = schedule.assignments.reduce((acc, assignment) => {
      const { day } = assignment.timeSlot;
      if (!acc[day]) acc[day] = [];
      acc[day].push(assignment);
      return acc;
    }, {} as Record<Day, Assignment[]>);
    
    // CSV header
    let csv = 'Date,Day,Period,Class Name\n';
    
    // Calculate dates for the week
    const dayToDateMap = this.calculateDatesForWeek(actualStartDate);
    
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
        const classObj = classes.find(c => c.id === classId);
        const className = classObj ? classObj.name : 'Unknown class';
        
        csv += `${formattedDate},${day},${period},${className}\n`;
      }
    }
    
    return csv;
  },

  /**
   * Get the next Monday from today
   * @returns Date object representing next Monday
   */
  getNextMonday(): Date {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    
    // Calculate days until next Monday (if today is Monday, we get next Monday)
    const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
    
    // Create new date by adding days
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    
    // Reset time to beginning of day
    nextMonday.setHours(0, 0, 0, 0);
    
    return nextMonday;
  },

  /**
   * Calculate dates for each day of the week starting from a given date
   * @param startDate Starting date (should be a Monday)
   * @returns Map of Day to Date objects
   */
  calculateDatesForWeek(startDate: Date): Record<Day, Date> {
    const result: Record<Day, Date> = {} as Record<Day, Date>;
    const days = [Day.MONDAY, Day.TUESDAY, Day.WEDNESDAY, Day.THURSDAY, Day.FRIDAY];
    
    // Copy the start date to avoid modifying the original
    const currentDate = new Date(startDate);
    
    // For each day, calculate the corresponding date
    for (let i = 0; i < days.length; i++) {
      if (i > 0) {
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Store the date for this day
      result[days[i]] = new Date(currentDate);
    }
    
    return result;
  },

  /**
   * Generate a unique ID for schedule rotations
   * @returns A unique string ID
   */
  generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  },

  /**
   * Save a schedule to the rotation history
   * @param schedule The schedule to save
   * @param name Name for this rotation
   * @param notes Optional notes about this rotation
   * @returns The created rotation entry
   */
  saveScheduleToRotationHistory(
    schedule: Schedule, 
    name: string, 
    notes?: string
  ): ScheduleRotation {
    // Get existing rotation history
    const rotations = this.getRotationHistory();
    
    // Create new rotation entry
    const newRotation: ScheduleRotation = {
      id: this.generateUniqueId(),
      name,
      schedule: JSON.parse(JSON.stringify(schedule)), // Deep copy the schedule
      createdAt: new Date(),
      notes: notes || '',
      classCount: schedule.assignments.length
    };
    
    // Add to history
    rotations.push(newRotation);
    
    // Ensure we don't exceed the maximum number of rotations
    if (rotations.length > this.MAX_ROTATION_HISTORY) {
      // Remove oldest rotations
      rotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      rotations.splice(this.MAX_ROTATION_HISTORY);
    }
    
    // Save updated history
    localStorage.setItem(this.ROTATION_HISTORY_KEY, JSON.stringify(rotations));
    
    return newRotation;
  },
  
  /**
   * Get all saved schedule rotations
   * @returns Array of rotation history entries
   */
  getRotationHistory(): ScheduleRotation[] {
    const rotationsJson = localStorage.getItem(this.ROTATION_HISTORY_KEY);
    if (!rotationsJson) return [];
    
    try {
      const rotations = JSON.parse(rotationsJson) as ScheduleRotation[];
      
      // Ensure dates are properly parsed
      return rotations.map(rotation => ({
        ...rotation,
        createdAt: new Date(rotation.createdAt),
        schedule: {
          ...rotation.schedule,
          startDate: rotation.schedule.startDate ? new Date(rotation.schedule.startDate) : new Date()
        }
      }));
    } catch (error) {
      console.error('Error parsing rotation history:', error);
      return [];
    }
  },
  
  /**
   * Alias for getRotationHistory for backward compatibility
   */
  loadRotations(): ScheduleRotation[] {
    return this.getRotationHistory();
  },
  
  /**
   * Get a specific schedule rotation by ID
   * @param id The rotation ID to find
   * @returns The rotation if found, or undefined
   */
  getRotationById(id: string): ScheduleRotation | undefined {
    const rotations = this.getRotationHistory();
    return rotations.find(rotation => rotation.id === id);
  },
  
  /**
   * Alias for getRotationById for backward compatibility
   */
  loadRotation(id: string): ScheduleRotation | undefined {
    return this.getRotationById(id);
  },
  
  /**
   * Delete a specific rotation from history
   * @param id The rotation ID to delete
   * @returns true if successful, false if not found
   */
  deleteRotation(id: string): boolean {
    const rotations = this.getRotationHistory();
    const initialLength = rotations.length;
    
    const filteredRotations = rotations.filter(rotation => rotation.id !== id);
    
    if (filteredRotations.length !== initialLength) {
      localStorage.setItem(this.ROTATION_HISTORY_KEY, JSON.stringify(filteredRotations));
      return true;
    }
    
    return false;
  },
  
  /**
   * Update a rotation's metadata (name, notes)
   * @param id The rotation ID to update
   * @param updates Object containing the fields to update
   * @returns The updated rotation if successful, undefined if not found
   */
  updateRotation(
    id: string, 
    updates: { name?: string; notes?: string }
  ): ScheduleRotation | undefined {
    const rotations = this.getRotationHistory();
    const rotationIndex = rotations.findIndex(rotation => rotation.id === id);
    
    if (rotationIndex === -1) return undefined;
    
    // Apply updates
    if (updates.name) rotations[rotationIndex].name = updates.name;
    if (updates.notes !== undefined) rotations[rotationIndex].notes = updates.notes;
    
    // Save changes
    localStorage.setItem(this.ROTATION_HISTORY_KEY, JSON.stringify(rotations));
    
    return rotations[rotationIndex];
  },

  /**
   * Parse a CSV file containing class data
   * Expected format: Class,Monday,Tuesday,Wednesday,Thursday,Friday
   * Where each day column contains comma-separated list of period numbers that are conflicts
   * @param csvText CSV text to parse
   * @returns Array of parsed classes
   */
  parseClassesFromCSV(csvText: string): Class[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return []; // Need at least header and one data row
    
    const days = [Day.MONDAY, Day.TUESDAY, Day.WEDNESDAY, Day.THURSDAY, Day.FRIDAY];
    const classes: Class[] = [];
    
    // Parse header to confirm format
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const expectedColumns = ['class', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    // Check if header contains expected columns
    const headerValid = expectedColumns.every(col => header.includes(col));
    if (!headerValid) {
      console.error('Invalid CSV header format. Expected: Class,Monday,Tuesday,Wednesday,Thursday,Friday');
      return [];
    }
    
    // Skip header, process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line, handling quoted values that may contain commas
      const parts = this.parseCSVLine(line);
      if (parts.length < 6) continue; // Need class name + 5 days
      
      const name = parts[0].trim();
      const conflicts: { day: Day; period: Period }[] = [];
      
      // Parse conflicts for each day
      for (let d = 0; d < days.length; d++) {
        const dayConflicts = parts[d + 1].trim();
        if (!dayConflicts) continue;
        
        // Parse period numbers
        const periodStrs = dayConflicts.replace(/"/g, '').split(/,\s*/);
        for (const periodStr of periodStrs) {
          const period = parseInt(periodStr.trim(), 10);
          if (!isNaN(period) && period >= 1 && period <= 8) {
            conflicts.push({ day: days[d], period: period as Period });
          }
        }
      }
      
      // Generate a unique ID based on class name
      const id = `class_${name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}`;
      
      classes.push({
        id,
        name,
        conflicts
      });
    }
    
    return classes;
  },
  
  /**
   * Parse a CSV line, handling quoted values that might contain commas
   * @param line CSV line to parse
   * @returns Array of values from the line
   */
  parseCSVLine(line: string): string[] {
    const result: string[] = [];
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
    
    // Add the last value
    result.push(current);
    return result;
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
      localStorage.setItem(this.CONSTRAINTS_KEY, JSON.stringify(constraints));
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
      const constraintsJson = localStorage.getItem(this.CONSTRAINTS_KEY);
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
      localStorage.setItem(this.CONSTRAINT_SETS_KEY, JSON.stringify(updatedMetadataList));
      
      // Save actual constraints
      localStorage.setItem(`${this.CONSTRAINT_SET_PREFIX}${id}`, JSON.stringify(constraints));
      
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
      const json = localStorage.getItem(this.CONSTRAINT_SETS_KEY);
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
      const json = localStorage.getItem(`${this.CONSTRAINT_SET_PREFIX}${id}`);
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
      localStorage.setItem(this.CONSTRAINT_SETS_KEY, JSON.stringify(updatedList));
      
      // Remove the actual constraints
      localStorage.removeItem(`${this.CONSTRAINT_SET_PREFIX}${id}`);
      
      return true;
    } catch (error) {
      console.error(`Failed to delete constraint set with ID ${id}:`, error);
      return false;
    }
  }
};
