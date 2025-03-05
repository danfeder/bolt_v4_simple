import { Chromosome } from './chromosome';
import { Class, Assignment, Constraint, ConstraintType, TimeSlot, Day, Period } from '../models/types';

/**
 * Constants for fitness evaluation
 */
export const FITNESS_CONSTANTS = {
  // Base fitness score for a valid schedule
  BASE_FITNESS: 1000,
  
  // Penalty per hard constraint violation
  HARD_CONSTRAINT_PENALTY: 500,
  
  // Reward per satisfied soft constraint
  SOFT_CONSTRAINT_REWARD: 50,
  
  // Penalty per unsatisfied soft constraint
  SOFT_CONSTRAINT_PENALTY: 10
};

/**
 * Represents different types of constraint violations that can occur in a schedule
 */
export enum ViolationType {
  TIME_CONFLICT,        // Class scheduled at a time it cannot be scheduled
  ROOM_CONFLICT,        // Too many classes scheduled for the same room
  OTHER,                // Other constraint violation
  MAX_CLASSES_PER_DAY,  // Exceeded maximum classes per day
  MAX_CLASSES_PER_WEEK  // Exceeded maximum classes per week
}

/**
 * Represents a violation of a constraint in a schedule
 */
export interface ConstraintViolation {
  type: ViolationType;
  constraintId: string;
  classId: string;
  timeSlot: TimeSlot;
  description: string;
}

/**
 * Result of evaluating a chromosome's fitness
 */
export interface FitnessResult {
  // Total fitness score
  fitnessScore: number;
  
  // Number of hard constraints violated
  hardConstraintViolations: number;
  
  // Number of soft constraints satisfied
  softConstraintSatisfaction: number;
  
  // Detailed list of constraint violations
  violations: ConstraintViolation[];
}

/**
 * Utility function to check if two time slots are equal
 * @param slot1 First time slot
 * @param slot2 Second time slot 
 * @returns True if the time slots are equal
 */
function areTimeSlotsEqual(slot1: TimeSlot, slot2: TimeSlot): boolean {
  // If both slots have dates, compare the dates
  if (slot1.date && slot2.date) {
    const date1 = typeof slot1.date === 'string' ? new Date(slot1.date) : slot1.date;
    const date2 = typeof slot2.date === 'string' ? new Date(slot2.date) : slot2.date;
    
    // If dates are equal and periods are equal, they are equal
    return date1.getTime() === date2.getTime() && slot1.period === slot2.period;
  }
  
  // Otherwise, compare day and period
  return slot1.day === slot2.day && slot1.period === slot2.period;
}

/**
 * Class for evaluating the fitness of a chromosome (schedule)
 */
export class FitnessEvaluator {
  /**
   * Creates a new fitness evaluator
   * @param classes Classes to be scheduled
   * @param constraints Scheduling constraints
   */
  constructor(
    private classes: Class[],
    private constraints: Constraint[] = []
  ) {}
  
  /**
   * Evaluates the fitness of a chromosome
   * @param chromosome Chromosome to evaluate
   * @returns Fitness result containing score and violation details
   */
  evaluate(chromosome: Chromosome): FitnessResult {
    // Create the result object
    const result: FitnessResult = {
      fitnessScore: 100, // Start with perfect score
      hardConstraintViolations: 0,
      softConstraintSatisfaction: 0,
      violations: []
    };
    
    console.log(`===== EVALUATING CHROMOSOME FITNESS =====`);
    const genes = chromosome.getGenes();
    console.log(`Chromosome has ${genes.length} assignments`);
    
    // Get all class IDs being evaluated
    const classIds = new Set(genes.map(gene => gene.classId));
    console.log(`Evaluating ${classIds.size} unique classes`);
    
    // Count how many constraints we have of each type
    const hardConstraintCount = Object.keys(this.constraints.hard || {}).length;
    const softConstraintCount = Object.keys(this.constraints.soft || {}).length;
    console.log(`Constraints: ${hardConstraintCount} hard, ${softConstraintCount} soft`);
    
    // Track how many constraints we satisfy
    let hardConstraintsSatisfied = 0;
    let softConstraintsSatisfied = 0;
    
    // Process hard constraints first
    if (this.constraints.hard) {
      console.log(`Processing ${hardConstraintCount} hard constraints...`);
      
      // Check if we're enforcing maximum classes per day
      if (this.constraints.hard.dailyMaxClasses !== undefined) {
        const maxPerDay = this.constraints.hard.dailyMaxClasses;
        console.log(`Checking dailyMaxClasses constraint: max=${maxPerDay}`);
        
        // Count classes per day
        const classesByDay: Record<string, number> = {
          [Day.MONDAY]: 0,
          [Day.TUESDAY]: 0,
          [Day.WEDNESDAY]: 0,
          [Day.THURSDAY]: 0,
          [Day.FRIDAY]: 0
        };
        
        genes.forEach(gene => {
          const day = gene.timeSlot.day;
          if (day !== Day.UNASSIGNED) {
            classesByDay[day]++;
          }
        });
        
        console.log(`Classes per day:`, classesByDay);
        
        // Check if any day exceeds the maximum
        let exceededMaxDay = false;
        Object.entries(classesByDay).forEach(([day, count]) => {
          if (count > maxPerDay) {
            exceededMaxDay = true;
            console.log(`Violation: Day ${day} has ${count} classes, exceeding max=${maxPerDay}`);
            
            result.violations.push({
              type: ViolationType.MAX_CLASSES_PER_DAY,
              constraintId: 'daily-max-classes',
              classId: '', // No specific class
              timeSlot: { day: day as Day, period: 0 as Period }, // Just to indicate the day
              description: `Day ${day} has ${count} classes, exceeding maximum of ${maxPerDay}`
            });
          }
        });
        
        if (exceededMaxDay) {
          result.hardConstraintViolations++;
          console.log(`dailyMaxClasses constraint violated`);
        } else {
          hardConstraintsSatisfied++;
          console.log(`dailyMaxClasses constraint satisfied`);
        }
      }
      
      // Check if we're enforcing maximum classes per week
      if (this.constraints.hard.weeklyMaxClasses !== undefined) {
        const maxPerWeek = this.constraints.hard.weeklyMaxClasses;
        console.log(`Checking weeklyMaxClasses constraint: max=${maxPerWeek}`);
        
        const assignedClassesCount = genes.length;
        
        if (assignedClassesCount > maxPerWeek) {
          result.hardConstraintViolations++;
          console.log(`Violation: Total of ${assignedClassesCount} classes exceeds weekly max=${maxPerWeek}`);
          
          result.violations.push({
            type: ViolationType.MAX_CLASSES_PER_WEEK,
            constraintId: 'weekly-max-classes',
            classId: '', // No specific class
            timeSlot: { day: Day.UNASSIGNED, period: 0 as Period }, // No specific time
            description: `Total of ${assignedClassesCount} classes exceeds weekly maximum of ${maxPerWeek}`
          });
        } else {
          hardConstraintsSatisfied++;
          console.log(`weeklyMaxClasses constraint satisfied`);
        }
      }
    }
    
    // Process soft constraints
    if (this.constraints.soft) {
      console.log(`Processing ${softConstraintCount} soft constraints...`);
      
      // Check if we're enforcing minimum classes per day
      if (this.constraints.soft.dailyMinClasses !== undefined) {
        const minPerDay = this.constraints.soft.dailyMinClasses;
        console.log(`Checking dailyMinClasses constraint: min=${minPerDay}`);
        
        // Count classes per day
        const classesByDay: Record<string, number> = {
          [Day.MONDAY]: 0,
          [Day.TUESDAY]: 0,
          [Day.WEDNESDAY]: 0,
          [Day.THURSDAY]: 0,
          [Day.FRIDAY]: 0
        };
        
        genes.forEach(gene => {
          const day = gene.timeSlot.day;
          if (day !== Day.UNASSIGNED) {
            classesByDay[day]++;
          }
        });
        
        console.log(`Classes per day:`, classesByDay);
        
        // Check if any day is below the minimum
        let belowMinDay = false;
        Object.entries(classesByDay).forEach(([day, count]) => {
          if (count < minPerDay) {
            belowMinDay = true;
            console.log(`Violation: Day ${day} has ${count} classes, below min=${minPerDay}`);
            
            result.violations.push({
              type: ViolationType.OTHER,
              constraintId: 'daily-min-classes',
              classId: '', // No specific class
              timeSlot: { day: day as Day, period: 0 as Period }, // Just to indicate the day
              description: `Day ${day} has ${count} classes, below minimum of ${minPerDay}`
            });
          }
        });
        
        if (belowMinDay) {
          result.fitnessScore -= FITNESS_CONSTANTS.SOFT_CONSTRAINT_PENALTY;
          console.log(`dailyMinClasses constraint violated`);
        } else {
          softConstraintsSatisfied++;
          console.log(`dailyMinClasses constraint satisfied`);
        }
      }
    }
    
    // Check basic violations
    this.checkBasicViolations(chromosome, result);
    
    // Calculate soft constraint satisfaction rate
    result.softConstraintSatisfaction = softConstraintCount > 0 
      ? softConstraintsSatisfied / softConstraintCount 
      : 1.0;
    
    // Calculate fitness score
    result.fitnessScore = Math.max(0, result.fitnessScore);
    
    console.log(`===== FITNESS EVALUATION RESULTS =====`);
    console.log(`Hard constraint violations: ${result.hardConstraintViolations}`);
    console.log(`Soft constraint satisfaction: ${result.softConstraintSatisfaction.toFixed(2)}`);
    console.log(`Fitness score: ${result.fitnessScore.toFixed(2)}`);
    console.log(`Violations: ${result.violations.length}`);
    
    if (result.violations.length > 0) {
      console.log('Violation details:', result.violations);
    }
    
    return result;
  }
  
  private checkBasicViolations(chromosome: Chromosome, result: FitnessResult): void {
    const assignments = chromosome.getGenes();
    
    console.log(`Checking basic violations for ${assignments.length} assignments`);
    
    // Check if class is scheduled at a time it conflicts with
    for (const assignment of assignments) {
      const classInfo = this.classes.find(c => c.id === assignment.classId);
      
      if (!classInfo) {
        console.log(`Class ${assignment.classId} not found in classes array`);
        continue; // Skip if class not found
      }
      
      // Skip if class has no conflicts
      if (!classInfo.conflicts || classInfo.conflicts.length === 0) {
        continue;
      }
      
      console.log(`Checking conflicts for class ${classInfo.name} (${classInfo.id})`);
      console.log(`Class has ${classInfo.conflicts.length} conflicts`);
      
      if (classInfo.conflicts.some(conflict => 
        areTimeSlotsEqual(conflict, assignment.timeSlot)
      )) {
        console.log(`Conflict found for class ${classInfo.name} at ${assignment.timeSlot.day} period ${assignment.timeSlot.period}`);
        
        result.hardConstraintViolations++;
        result.fitnessScore -= FITNESS_CONSTANTS.HARD_CONSTRAINT_PENALTY;
        
        result.violations.push({
          type: ViolationType.TIME_CONFLICT,
          constraintId: 'time-conflict',
          classId: assignment.classId,
          timeSlot: assignment.timeSlot,
          description: `Class ${classInfo.name} is scheduled at a time it conflicts with`
        });
      }
    }
  }

  /**
   * Gets the number of hard constraint violations for a chromosome
   * @param chromosome Chromosome to evaluate
   * @returns Number of hard constraint violations
   */
  getHardConstraintViolations(chromosome: Chromosome): number {
    return this.evaluate(chromosome).hardConstraintViolations;
  }

  /**
   * Gets the fitness score for a chromosome
   * @param chromosome Chromosome to evaluate
   * @returns Fitness score between 0 and 100
   */
  getFitness(chromosome: Chromosome): number {
    return this.evaluate(chromosome).fitnessScore;
  }
  
  /**
   * Gets detailed violation information for a chromosome
   * @param chromosome Chromosome to evaluate
   * @returns Array of violations
   */
  getViolations(chromosome: Chromosome): ConstraintViolation[] {
    return this.evaluate(chromosome).violations;
  }
  
  /**
   * Gets detailed violation information for a chromosome
   * @param chromosome Chromosome to evaluate
   * @returns Array of violation descriptions
   */
  getViolationDetails(chromosome: Chromosome): string[] {
    const violations = this.getViolations(chromosome);
    return violations.map(v => v.description);
  }
  
  /**
   * Evaluates a chromosome and returns detailed results
   * @param chromosome Chromosome to evaluate
   * @returns Object containing validation results
   */
  evaluateWithDetails(chromosome: Chromosome): { 
    isValid: boolean; 
    hardConstraintViolations: number;
    violationDetails: string[];
    fitnessScore: number;
  } {
    const result = this.evaluate(chromosome);
    return {
      isValid: result.hardConstraintViolations === 0,
      hardConstraintViolations: result.hardConstraintViolations,
      violationDetails: result.violations.map(v => v.description),
      fitnessScore: result.fitnessScore
    };
  }

  /**
   * Gets the constraints used by this evaluator
   * @returns Array of constraints
   */
  getConstraints(): Constraint[] {
    return this.constraints;
  }
}
