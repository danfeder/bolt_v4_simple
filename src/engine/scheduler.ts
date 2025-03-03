import { Class, Schedule, GeneticAlgorithmConfig, Day, Assignment } from '../models/types';
import { GeneticAlgorithm } from './geneticAlgorithm';
import { FitnessEvaluator } from './fitness';
import { Chromosome } from './chromosome';

/**
 * Default configuration for the genetic algorithm
 */
const DEFAULT_CONFIG: GeneticAlgorithmConfig = {
  populationSize: 100,
  generations: 100,
  tournamentSize: 5,
  crossoverRate: 0.8,
  mutationRate: 0.2
};

/**
 * Main scheduler class for the gym class scheduling application.
 * Uses a genetic algorithm to generate schedules.
 */
export class GymClassScheduler {
  private classes: Class[] = [];
  private config: GeneticAlgorithmConfig;
  private fitnessEvaluator: FitnessEvaluator;

  /**
   * Creates a new GymClassScheduler
   * @param config Optional configuration for the genetic algorithm
   */
  constructor(config?: Partial<GeneticAlgorithmConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fitnessEvaluator = new FitnessEvaluator([]);
  }

  /**
   * Sets the classes to be scheduled
   * @param classes Array of Class objects to schedule
   */
  setClasses(classes: Class[]): void {
    this.classes = [...classes];
    this.fitnessEvaluator = new FitnessEvaluator(this.classes);
  }

  /**
   * Updates the genetic algorithm configuration
   * @param config New configuration options (partial)
   */
  updateConfig(config: Partial<GeneticAlgorithmConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generates a schedule for the classes
   * @returns A Schedule object containing assignments and fitness information
   */
  generateSchedule(): Schedule {
    if (this.classes.length === 0) {
      return { assignments: [], fitness: 0, hardConstraintViolations: 0, softConstraintSatisfaction: 0 };
    }

    // Create and run the genetic algorithm
    const ga = new GeneticAlgorithm(this.classes, this.config);
    const bestChromosome = ga.evolve();
    
    // Get statistics
    const stats = ga.getStatistics();
    
    // Create the schedule from the best chromosome
    const schedule: Schedule = {
      assignments: bestChromosome.getGenes(),
      fitness: stats.bestFitness,
      hardConstraintViolations: stats.hardConstraintViolations,
      softConstraintSatisfaction: 0 // Calculate this if needed
    };

    return schedule;
  }

  /**
   * Re-optimizes a schedule with locked assignments
   * This allows the algorithm to optimize around manually adjusted classes
   * 
   * @param currentSchedule The current schedule with manual adjustments
   * @param lockedAssignments Array of class IDs that should not be moved during re-optimization
   * @returns A new optimized schedule that preserves the locked assignments
   */
  reOptimizeSchedule(currentSchedule: Schedule, lockedAssignments: string[]): Schedule {
    if (this.classes.length === 0) {
      return currentSchedule;
    }

    // Create a set of locked assignment IDs for faster lookups
    const lockedAssignmentSet = new Set(lockedAssignments);
    
    // Extract all assignments from the current schedule
    const currentAssignments = [...currentSchedule.assignments];
    
    // Get the list of classes that are not locked and need to be re-optimized
    const classesToSchedule = this.classes.filter(
      cls => !lockedAssignmentSet.has(cls.id)
    );
    
    // Get the list of locked assignments that should remain unchanged
    const lockedAssignmentObjects = currentAssignments.filter(
      assignment => lockedAssignmentSet.has(assignment.classId)
    );
    
    // Validate that the locked assignments don't have conflicts
    this.validateLockedAssignments(lockedAssignmentObjects);
    
    // Calculate already occupied time slots
    const occupiedTimeSlots = new Set<string>();
    for (const assignment of lockedAssignmentObjects) {
      const { day, period } = assignment.timeSlot;
      occupiedTimeSlots.add(`${day}-${period}`);
    }
    
    // Create and run a modified genetic algorithm that respects locked assignments
    const ga = new GeneticAlgorithm(this.classes, {
      ...this.config,
      // Increase mutation rate slightly to encourage diversity
      mutationRate: Math.min(this.config.mutationRate * 1.5, 0.5)
    });
    
    // Initialize with a population that respects locked assignments
    const initialPopulation = this.createInitialPopulationWithLockedAssignments(
      currentAssignments,
      lockedAssignmentSet,
      occupiedTimeSlots
    );
    
    // Evolve the population
    const bestChromosome = ga.evolveWithInitialPopulation(initialPopulation);
    
    // Get statistics
    const stats = ga.getStatistics();
    
    // Create the schedule from the best chromosome
    const reOptimizedSchedule: Schedule = {
      assignments: bestChromosome.getGenes(),
      fitness: stats.bestFitness,
      hardConstraintViolations: stats.hardConstraintViolations,
      softConstraintSatisfaction: 0
    };

    return reOptimizedSchedule;
  }
  
  /**
   * Validates that the locked assignments don't have conflicts
   * @param lockedAssignments Array of locked assignments
   * @throws Error if there are conflicts between locked assignments
   */
  private validateLockedAssignments(lockedAssignments: Assignment[]): void {
    // Check for time slot conflicts (two classes in the same time slot)
    const timeSlotMap = new Map<string, string[]>();
    
    for (const assignment of lockedAssignments) {
      const timeSlotKey = `${assignment.timeSlot.day}-${assignment.timeSlot.period}`;
      
      if (!timeSlotMap.has(timeSlotKey)) {
        timeSlotMap.set(timeSlotKey, []);
      }
      
      timeSlotMap.get(timeSlotKey)!.push(assignment.classId);
      
      // If there's more than one class in this time slot, we have a conflict
      if (timeSlotMap.get(timeSlotKey)!.length > 1) {
        const conflictingClassIds = timeSlotMap.get(timeSlotKey)!;
        throw new Error(`Conflict detected in locked assignments: Classes ${conflictingClassIds.join(', ')} are assigned to the same time slot (${assignment.timeSlot.day}, period ${assignment.timeSlot.period}).`);
      }
    }
    
    // Check for conflicts with class constraints
    for (const assignment of lockedAssignments) {
      const classObj = this.classes.find(c => c.id === assignment.classId);
      if (!classObj) continue; // Skip if class not found
      
      // Check if this assignment conflicts with the class's constraints
      const hasConflict = classObj.conflicts.some(
        conflict => conflict.day === assignment.timeSlot.day && conflict.period === assignment.timeSlot.period
      );
      
      if (hasConflict) {
        throw new Error(`Class ${classObj.name} (${assignment.classId}) is locked in a time slot that conflicts with its constraints (${assignment.timeSlot.day}, period ${assignment.timeSlot.period}).`);
      }
    }
  }
  
  /**
   * Creates an initial population where certain assignments are locked
   * 
   * @param currentAssignments Current assignments from the schedule
   * @param lockedAssignmentSet Set of class IDs that should not be moved
   * @param occupiedTimeSlots Set of time slots that are already occupied by locked assignments
   * @returns Array of chromosomes with the locked assignments preserved
   */
  private createInitialPopulationWithLockedAssignments(
    currentAssignments: Assignment[],
    lockedAssignmentSet: Set<string>,
    occupiedTimeSlots: Set<string>
  ): Chromosome[] {
    const population: Chromosome[] = [];
    const availableTimeSlots = this.getAvailableTimeSlots().filter(
      slot => !occupiedTimeSlots.has(`${slot.day}-${slot.period}`)
    );
    
    // Create multiple chromosomes for the initial population
    for (let i = 0; i < this.config.populationSize; i++) {
      // Start with a chromosome containing the locked assignments
      const lockedAssignmentsArray = currentAssignments.filter(a => lockedAssignmentSet.has(a.classId));
      const chromosome = new Chromosome(this.classes, lockedAssignmentsArray);
      
      // Now assign the remaining classes randomly but respecting the locked assignments
      const unlockedClasses = this.classes.filter(cls => !lockedAssignmentSet.has(cls.id));
      
      // Create a copy of available time slots that we can modify for this chromosome
      const remainingTimeSlots = [...availableTimeSlots];
      
      // Shuffle the available time slots for this chromosome
      remainingTimeSlots.sort(() => Math.random() - 0.5);
      
      // Assign each unlocked class to an available time slot
      for (const cls of unlockedClasses) {
        // If we're out of time slots, create a fallback assignment
        if (remainingTimeSlots.length === 0) {
          // Find any available time slot that's not in the conflicts list
          const allTimeSlots = this.getAvailableTimeSlots();
          
          // Filter out occupied slots and slots that conflict with this class
          const possibleSlots = allTimeSlots.filter(slot => {
            // Check if occupied by a locked assignment
            if (occupiedTimeSlots.has(`${slot.day}-${slot.period}`)) return false;
            
            // Check if it conflicts with the class's constraints
            return !cls.conflicts.some(
              conflict => conflict.day === slot.day && conflict.period === slot.period
            );
          });
          
          // If there are any possible slots, choose one randomly
          if (possibleSlots.length > 0) {
            const randomIndex = Math.floor(Math.random() * possibleSlots.length);
            const slot = possibleSlots[randomIndex];
            chromosome.updateAssignment(cls.id, slot);
          } else {
            // Last resort: just assign to any unoccupied slot, even if it's in a conflict
            const unoccupiedSlots = allTimeSlots.filter(
              slot => !occupiedTimeSlots.has(`${slot.day}-${slot.period}`)
            );
            
            if (unoccupiedSlots.length > 0) {
              const randomIndex = Math.floor(Math.random() * unoccupiedSlots.length);
              const slot = unoccupiedSlots[randomIndex];
              chromosome.updateAssignment(cls.id, slot);
              // Mark as occupied for future assignments in this chromosome
              occupiedTimeSlots.add(`${slot.day}-${slot.period}`);
            } else {
              // We're completely out of slots - just pick a random one
              const randomDay = Object.values(Day)[Math.floor(Math.random() * Object.values(Day).length)];
              const randomPeriod = Math.floor(Math.random() * 8) + 1;
              chromosome.updateAssignment(cls.id, { day: randomDay, period: randomPeriod });
            }
          }
          continue;
        }
        
        // Try to find a non-conflicting time slot for this class
        let assigned = false;
        for (let j = 0; j < remainingTimeSlots.length; j++) {
          const timeSlot = remainingTimeSlots[j];
          
          // Check if this slot conflicts with the class's constraints
          const hasConflict = cls.conflicts.some(
            conflict => conflict.day === timeSlot.day && conflict.period === timeSlot.period
          );
          
          if (!hasConflict) {
            // Assign this time slot to the class
            chromosome.updateAssignment(cls.id, timeSlot);
            
            // Remove this time slot from available slots
            remainingTimeSlots.splice(j, 1);
            assigned = true;
            break;
          }
        }
        
        // If we couldn't find a non-conflicting slot, just pick the first available one
        if (!assigned && remainingTimeSlots.length > 0) {
          const timeSlot = remainingTimeSlots[0];
          chromosome.updateAssignment(cls.id, timeSlot);
          remainingTimeSlots.shift();
        }
      }
      
      // Ensure all classes have an assignment
      if (chromosome.getGenes().length !== this.classes.length) {
        console.warn(`Chromosome has ${chromosome.getGenes().length} assignments but should have ${this.classes.length} classes`);
      }
      
      population.push(chromosome);
    }
    
    return population;
  }

  /**
   * Returns the available time slots for scheduling
   * @returns Array of available time slots
   */
  getAvailableTimeSlots(): { day: Day; period: number }[] {
    const timeSlots: { day: Day; period: number }[] = [];
    
    // For each day and period, create a time slot
    for (const day of Object.values(Day)) {
      for (let period = 1; period <= 8; period++) {
        timeSlots.push({ day, period });
      }
    }
    
    return timeSlots;
  }

  /**
   * Validates a schedule to check for constraint violations
   * @param schedule The schedule to validate
   * @returns Object containing validation results
   */
  validateSchedule(schedule: Schedule): { 
    isValid: boolean; 
    hardConstraintViolations: number;
    violationDetails: string[];
  } {
    const chromosome = this.createChromosomeFromAssignments(schedule.assignments);
    const result = this.fitnessEvaluator.evaluateWithDetails(chromosome);
    
    return {
      isValid: result.hardConstraintViolations === 0,
      hardConstraintViolations: result.hardConstraintViolations,
      violationDetails: result.violationDetails
    };
  }
  
  /**
   * Helper method to create a chromosome from assignments
   * @param assignments The assignments to create a chromosome from
   * @returns A new chromosome with the given assignments
   */
  private createChromosomeFromAssignments(assignments: Assignment[]): Chromosome {
    return new Chromosome(this.classes, assignments);
  }
}
