import { GymClassScheduler } from './scheduler';
import { 
  Class, 
  Schedule, 
  GeneticAlgorithmConfig, 
  Day, 
  Period, 
  TimeSlot,
  Assignment
} from '../models/types';
import { dataUtils } from '../utils/dataUtils';
import { isTestEnv } from '../utils/testing';
import { 
  enhanceAssignmentsWithDates, 
  organizeScheduleIntoWeeks,
  createScheduleForDateRange
} from '../utils/scheduleUtils';

/**
 * API wrapper for the GymClassScheduler, providing a simplified interface
 * for integration with the UI or CLI testing.
 */
export class SchedulerAPI {
  private scheduler: GymClassScheduler;
  private classes: Class[] = [];
  private currentSchedule: Schedule | null = null;

  /**
   * Creates a new SchedulerAPI instance
   * @param config Optional configuration for the genetic algorithm
   */
  constructor(config?: Partial<GeneticAlgorithmConfig>) {
    this.scheduler = new GymClassScheduler(config);
    
    // Skip loading saved data in test environment
    if (!isTestEnv()) {
      this.loadSavedData();
    }
  }

  /**
   * Loads previously saved data from storage
   */
  private loadSavedData(): void {
    // Load classes
    const savedClasses = dataUtils.loadClasses();
    if (savedClasses && savedClasses.length > 0) {
      this.classes = savedClasses;
      this.scheduler.setClasses(this.classes);
    }

    // Load schedule
    const savedSchedule = dataUtils.loadSchedule();
    if (savedSchedule) {
      this.currentSchedule = savedSchedule;
    }
  }

  /**
   * Directly sets the classes to be scheduled
   * @param classes The complete list of classes to use
   */
  setClasses(classes: Class[]): void {
    this.classes = [...classes];
    this.scheduler.setClasses(this.classes);
    
    // Persist to storage if not in test environment
    if (!isTestEnv()) {
      dataUtils.saveClasses(this.classes);
    }
  }

  /**
   * Adds a class to be scheduled
   * @param classData The class data to add
   * @returns The ID of the added class
   */
  addClass(classData: Omit<Class, 'id'>): string {
    const id = `class_${this.classes.length + 1}`;
    const newClass: Class = {
      ...classData,
      id
    };
    
    this.classes.push(newClass);
    this.scheduler.setClasses(this.classes);
    
    // Persist to storage if not in test environment
    if (!isTestEnv()) {
      dataUtils.saveClasses(this.classes);
    }
    
    return id;
  }

  /**
   * Updates an existing class
   * @param id The ID of the class to update
   * @param classData The updated class data
   * @returns True if the class was updated, false if not found
   */
  updateClass(id: string, classData: Partial<Omit<Class, 'id'>>): boolean {
    const index = this.classes.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    this.classes[index] = {
      ...this.classes[index],
      ...classData
    };
    
    this.scheduler.setClasses(this.classes);
    
    // Persist to storage if not in test environment
    if (!isTestEnv()) {
      dataUtils.saveClasses(this.classes);
    }
    
    return true;
  }

  /**
   * Removes a class
   * @param id The ID of the class to remove
   * @returns True if the class was removed, false if not found
   */
  removeClass(id: string): boolean {
    const initialLength = this.classes.length;
    this.classes = this.classes.filter(c => c.id !== id);
    
    if (this.classes.length !== initialLength) {
      this.scheduler.setClasses(this.classes);
      
      // Persist to storage if not in test environment
      if (!isTestEnv()) {
        dataUtils.saveClasses(this.classes);
      }
      
      // Also update the schedule if this class was assigned
      if (this.currentSchedule) {
        this.currentSchedule = {
          ...this.currentSchedule,
          assignments: this.currentSchedule.assignments.filter(a => a.classId !== id)
        };
        
        this.saveSchedule(this.currentSchedule);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Gets all classes
   * @returns Array of all classes
   */
  getClasses(): Class[] {
    return [...this.classes];
  }

  /**
   * Updates the genetic algorithm configuration
   * @param config New configuration options (partial)
   */
  updateConfig(config: Partial<GeneticAlgorithmConfig>): void {
    this.scheduler.updateConfig(config);
  }

  /**
   * Generates a schedule using the current classes and configuration
   * @param startDate Optional start date for the schedule (defaults to the next Monday)
   * @returns A Schedule object
   */
  generateSchedule(startDate?: Date): Schedule {
    if (this.classes.length === 0) {
      throw new Error('No classes to schedule');
    }
    
    // Generate a basic schedule
    const generatedSchedule = this.scheduler.generateSchedule();
    
    // Determine the start date
    let scheduleStartDate: Date;
    if (startDate) {
      scheduleStartDate = startDate;
    } else {
      // Use the rotation start date from constraints if available
      const constraints = this.scheduler.getConstraints();
      if (constraints.hard.rotationStartDate) {
        scheduleStartDate = constraints.hard.rotationStartDate;
      } else {
        // Default to next Monday
        scheduleStartDate = this.getNextMonday();
      }
    }
    
    // Set the start date
    generatedSchedule.startDate = scheduleStartDate;
    
    // Calculate end date as 2 weeks from start by default
    const twoWeeksLater = new Date(scheduleStartDate);
    twoWeeksLater.setDate(scheduleStartDate.getDate() + 14);
    generatedSchedule.endDate = twoWeeksLater;
    
    // Enhance the schedule with dates and organize into weeks
    const enhancedSchedule = this.enhanceScheduleWithDates(generatedSchedule);
    
    this.currentSchedule = enhancedSchedule;
    
    // Persist to storage if not in test environment
    if (!isTestEnv()) {
      dataUtils.saveSchedule(enhancedSchedule);
    }
    
    return enhancedSchedule;
  }
  
  /**
   * Enhances a schedule with dates and organizes it into weeks
   * @param schedule The schedule to enhance
   * @returns The enhanced schedule
   */
  enhanceScheduleWithDates(schedule: Schedule): Schedule {
    // First enhance all assignments with dates
    const withDates = enhanceAssignmentsWithDates(schedule);
    
    // Then organize into weeks
    return organizeScheduleIntoWeeks(withDates);
  }
  
  /**
   * Creates a schedule covering a specified date range
   * @param startDate The start date for the schedule
   * @param endDate Optional end date (defaults to 4 weeks from start)
   * @returns A new schedule covering the specified date range
   */
  createScheduleForDateRange(startDate: Date, endDate?: Date): Schedule {
    if (!this.currentSchedule) {
      throw new Error('No current schedule to extend');
    }
    
    // Create a new schedule for the specified date range
    const newSchedule = createScheduleForDateRange(
      this.currentSchedule,
      startDate,
      endDate
    );
    
    this.currentSchedule = newSchedule;
    
    // Persist to storage if not in test environment
    if (!isTestEnv()) {
      dataUtils.saveSchedule(newSchedule);
    }
    
    return newSchedule;
  }

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
  }

  /**
   * Re-optimizes a schedule while keeping specified assignments locked
   * This allows for manual adjustments to remain fixed while the algorithm
   * optimizes the rest of the schedule around them.
   * 
   * @param lockedAssignments Array of class IDs that should not be moved
   * @param schedule Optional schedule to optimize (uses current schedule if not provided)
   * @returns A new optimized schedule that respects the locked assignments
   */
  reOptimizeSchedule(lockedAssignments: string[], schedule?: Schedule): Schedule {
    if (this.classes.length === 0) {
      throw new Error('No classes to re-optimize');
    }
    
    // Use provided schedule or current schedule
    const scheduleToOptimize = schedule || this.currentSchedule;
    
    if (!scheduleToOptimize) {
      throw new Error('No schedule available for re-optimization');
    }
    
    // Perform re-optimization
    const reOptimizedSchedule = this.scheduler.reOptimizeSchedule(
      scheduleToOptimize,
      lockedAssignments
    );
    
    // Update current schedule
    this.currentSchedule = reOptimizedSchedule;
    
    // Persist to storage if not in test environment
    if (!isTestEnv()) {
      dataUtils.saveSchedule(reOptimizedSchedule);
    }
    
    return reOptimizedSchedule;
  }

  /**
   * Saves the current schedule to storage
   * @param schedule The schedule to save (or current schedule if not provided)
   * @returns The saved schedule
   */
  saveSchedule(schedule?: Schedule): Schedule {
    if (!schedule && !this.currentSchedule) {
      throw new Error('No schedule to save');
    }
    
    const scheduleToSave = schedule || this.currentSchedule!;
    this.currentSchedule = scheduleToSave;
    
    // Validate the schedule to ensure it's still valid after manual adjustments
    const validation = this.validateSchedule(scheduleToSave);
    
    // Even if there are violations, we still save it to respect manual changes
    if (!validation.isValid) {
      console.warn('Saving schedule with constraint violations:', validation.violationDetails);
    }
    
    // Persist to storage if not in test environment
    if (!isTestEnv()) {
      dataUtils.saveSchedule(scheduleToSave);
    }
    
    return scheduleToSave;
  }

  /**
   * Loads the saved schedule from storage
   * @returns The loaded schedule or null if none exists
   */
  loadSchedule(): Schedule | null {
    // Skip loading in test environment
    if (isTestEnv()) {
      return this.currentSchedule;
    }
    
    const savedSchedule = dataUtils.loadSchedule();
    if (savedSchedule) {
      this.currentSchedule = savedSchedule;
    }
    return this.currentSchedule;
  }

  /**
   * Gets the current schedule
   * @returns Current schedule or null if none exists
   */
  getCurrentSchedule(): Schedule | null {
    return this.currentSchedule;
  }

  /**
   * Validates a schedule
   * @param schedule The schedule to validate
   * @returns Validation results
   */
  validateSchedule(schedule: Schedule): { 
    isValid: boolean; 
    hardConstraintViolations: number;
    violationDetails: string[];
  } {
    return this.scheduler.validateSchedule(schedule);
  }

  /**
   * Gets the available time slots for scheduling
   * @returns Array of available time slots
   */
  getAvailableTimeSlots(): { day: Day; period: number }[] {
    return this.scheduler.getAvailableTimeSlots();
  }

  /**
   * Adds a conflict to a class
   * @param classId The ID of the class
   * @param conflict The conflict time slot to add
   * @returns True if successful, false if class not found or conflict already exists
   */
  addClassConflict(classId: string, conflict: TimeSlot): boolean {
    const classIndex = this.classes.findIndex(c => c.id === classId);
    if (classIndex === -1) return false;
    
    const classData = this.classes[classIndex];
    
    // Check if conflict already exists
    const conflictExists = classData.conflicts.some(
      c => c.day === conflict.day && c.period === conflict.period
    );
    
    if (conflictExists) return false;
    
    // Add conflict
    classData.conflicts.push({ ...conflict });
    this.scheduler.setClasses(this.classes);
    
    // Persist to storage if not in test environment
    if (!isTestEnv()) {
      dataUtils.saveClasses(this.classes);
    }
    
    return true;
  }

  /**
   * Creates random test data for quickly testing the scheduler
   * @param numClasses Number of classes to generate
   * @returns Array of generated class IDs
   */
  generateRandomTestData(numClasses: number = 33): string[] {
    const classIds: string[] = [];
    
    // Clear existing classes
    this.classes = [];
    
    // Generate classes
    for (let i = 0; i < numClasses; i++) {
      const id = `class_${i + 1}`;
      const newClass: Class = {
        id,
        name: `Class ${i + 1}`,
        conflicts: this.generateRandomConflicts()
      };
      
      this.classes.push(newClass);
      classIds.push(id);
    }
    
    this.scheduler.setClasses(this.classes);
    
    // Persist to storage if not in test environment
    if (!isTestEnv()) {
      dataUtils.saveClasses(this.classes);
    }
    
    return classIds;
  }
  
  /**
   * Helper method to generate random conflicts for a class
   * @returns Array of random conflict time slots
   */
  private generateRandomConflicts(): TimeSlot[] {
    const conflicts: TimeSlot[] = [];
    const days = Object.values(Day);
    
    // Generate 1-3 random conflicts per day
    for (const day of days) {
      const numConflicts = Math.floor(Math.random() * 3) + 1;
      const periodSet = new Set<Period>();
      
      // Generate unique periods for this day
      while (periodSet.size < numConflicts) {
        const period = (Math.floor(Math.random() * 8) + 1) as Period;
        periodSet.add(period);
      }
      
      // Add conflicts for this day
      for (const period of periodSet) {
        conflicts.push({ day, period });
      }
    }
    
    return conflicts;
  }

  /**
   * Import classes from CSV content
   * @param csvContent The CSV content to parse
   * @param mergeStrategy Strategy for handling duplicate classes: 'replace', 'skip', or 'merge'
   * @returns Object containing counts of imported, replaced, and skipped classes
   */
  importClassesFromCsv(csvContent: string, mergeStrategy: 'replace' | 'skip' | 'merge' = 'replace'): { 
    imported: number; 
    replaced: number;
    skipped: number;
    merged: number;
  } {
    // Parse the CSV content
    const importedClasses = dataUtils.parseClassesFromCSV(csvContent);
    
    if (importedClasses.length === 0) {
      throw new Error('No valid class data found in the CSV file');
    }
    
    return this.mergeClasses(importedClasses, mergeStrategy);
  }

  /**
   * Merge a list of classes with existing classes based on a specified strategy
   * @param classes Classes to merge with existing classes
   * @param mergeStrategy Strategy for handling duplicate classes: 'replace', 'skip', or 'merge'
   * @returns Statistics about the merge operation
   */
  mergeClasses(classes: Class[], mergeStrategy: 'replace' | 'skip' | 'merge' = 'replace'): {
    imported: number;
    replaced: number;
    skipped: number;
    merged: number;
  } {
    // Track statistics
    let replaced = 0;
    let skipped = 0;
    let merged = 0;
    
    // Create a map of existing classes by name for quick lookup
    const existingClassesByName = new Map(
      this.classes.map(cls => [cls.name, cls])
    );
    
    // Process imported classes
    const updatedClasses: Class[] = [...this.classes];
    
    for (const importedClass of classes) {
      const existingClass = existingClassesByName.get(importedClass.name);
      
      if (existingClass) {
        if (mergeStrategy === 'replace') {
          // Replace the existing class
          const index = updatedClasses.findIndex(c => c.id === existingClass.id);
          if (index >= 0) {
            // Keep the same ID but update other properties
            updatedClasses[index] = {
              ...importedClass,
              id: existingClass.id
            };
            replaced++;
          }
        } else if (mergeStrategy === 'merge') {
          // Merge conflicts
          const index = updatedClasses.findIndex(c => c.id === existingClass.id);
          if (index >= 0) {
            // Create a set of existing conflicts to avoid duplicates
            const existingConflictSet = new Set(
              existingClass.conflicts.map(c => `${c.day}:${c.period}`)
            );
            
            // Filter out any duplicates from imported conflicts
            const newConflicts = importedClass.conflicts.filter(
              c => !existingConflictSet.has(`${c.day}:${c.period}`)
            );
            
            // Merge conflicts
            updatedClasses[index] = {
              ...existingClass,
              conflicts: [...existingClass.conflicts, ...newConflicts]
            };
            
            merged++;
          }
        } else if (mergeStrategy === 'skip') {
          // Skip this class
          skipped++;
        }
      } else {
        // Add as a new class
        updatedClasses.push(importedClass);
      }
    }
    
    // Update the classes
    this.classes = updatedClasses;
    this.scheduler.setClasses(this.classes);
    
    // Persist to storage if not in test environment
    if (!isTestEnv()) {
      dataUtils.saveClasses(this.classes);
    }
    
    return {
      imported: classes.length - skipped - merged,
      replaced,
      skipped,
      merged
    };
  }

  /**
   * Get class by ID
   * @param id Class ID
   * @returns Class or undefined if not found
   */
  getClassById(id: string): Class | undefined {
    return this.classes.find(c => c.id === id);
  }

  /**
   * Get class by name
   * @param name Class name
   * @returns Class or undefined if not found
   */
  getClassByName(name: string): Class | undefined {
    return this.classes.find(c => c.name === name);
  }

  /**
   * Update class conflicts
   * @param classId ID of the class to update
   * @param conflicts New conflicts array
   * @returns Updated class or undefined if class not found
   */
  updateClassConflicts(classId: string, conflicts: { day: Day; period: Period }[]): Class | undefined {
    const classIndex = this.classes.findIndex(c => c.id === classId);
    if (classIndex === -1) return undefined;
    
    // Update conflicts
    const updatedClass = {
      ...this.classes[classIndex],
      conflicts
    };
    
    // Update class in the array
    this.classes[classIndex] = updatedClass;
    
    // Update scheduler
    this.scheduler.setClasses(this.classes);
    
    // Update storage
    if (!isTestEnv()) {
      dataUtils.saveClasses(this.classes);
    }
    
    return updatedClass;
  }
}

// Export a singleton instance for easy access
export const schedulerApi = new SchedulerAPI();
