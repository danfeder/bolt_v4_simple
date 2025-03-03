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

// Helper to detect if we're in a test environment
const isTestEnv = (): boolean => {
  return typeof process !== 'undefined' && 
         process.env !== undefined && 
         process.env.NODE_ENV === 'test';
};

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
   * @returns A Schedule object
   */
  generateSchedule(): Schedule {
    if (this.classes.length === 0) {
      throw new Error('No classes to schedule');
    }
    
    const generatedSchedule = this.scheduler.generateSchedule();
    this.currentSchedule = generatedSchedule;
    
    // Persist to storage if not in test environment
    if (!isTestEnv()) {
      dataUtils.saveSchedule(generatedSchedule);
    }
    
    return generatedSchedule;
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
}

// Export a singleton instance for easy access
export const schedulerApi = new SchedulerAPI();
