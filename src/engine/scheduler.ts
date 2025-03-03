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
   * Returns the available time slots for scheduling
   * @returns Array of available time slots
   */
  getAvailableTimeSlots(): { day: Day; period: number }[] {
    const timeSlots: { day: Day; period: number }[] = [];
    
    // Generate time slots for each day and period
    // Monday to Friday, periods 1-8 (8am to 8pm, 1.5 hour blocks)
    const days = [Day.MONDAY, Day.TUESDAY, Day.WEDNESDAY, Day.THURSDAY, Day.FRIDAY];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];
    
    for (const day of days) {
      for (const period of periods) {
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
    // Use the fitness evaluator to check for violations
    const tempChromosome = this.createChromosomeFromAssignments(schedule.assignments);
    const hardConstraintViolations = this.fitnessEvaluator.getHardConstraintViolations(tempChromosome);
    const violationDetails = this.fitnessEvaluator.getViolationDetails(tempChromosome);
    
    return {
      isValid: hardConstraintViolations === 0,
      hardConstraintViolations,
      violationDetails
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
