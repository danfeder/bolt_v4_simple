import { Chromosome } from './chromosome';
import { Class, Assignment, Constraint, ConstraintType, TimeSlot } from '../models/types';
import { areTimeSlotsEqual } from '../utils/timeSlot';

/**
 * Constants for fitness evaluation
 */
export const FITNESS_CONSTANTS = {
  // Base fitness score for a valid schedule
  BASE_FITNESS: 1000,
  
  // Penalty per hard constraint violation
  HARD_CONSTRAINT_PENALTY: 500,
  
  // Reward per satisfied soft constraint
  SOFT_CONSTRAINT_REWARD: 50
};

/**
 * Represents different types of constraint violations that can occur in a schedule
 */
export enum ViolationType {
  INSTRUCTOR_CONFLICT,  // Same instructor scheduled at the same time
  TIME_CONFLICT,        // Class scheduled at a time it cannot be scheduled
  ROOM_CONFLICT,        // Too many classes scheduled for the same room
  OTHER                 // Other constraint violation
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
  softConstraintsSatisfied: number;
  
  // Detailed list of constraint violations
  violations: ConstraintViolation[];
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
    const result: FitnessResult = {
      fitnessScore: FITNESS_CONSTANTS.BASE_FITNESS,
      hardConstraintViolations: 0,
      softConstraintsSatisfied: 0,
      violations: []
    };
    
    // Check for basic scheduling violations first
    this.checkBasicViolations(chromosome, result);
    
    // Evaluate all other constraints
    for (const constraint of this.constraints) {
      const isSatisfied = this.evaluateConstraint(constraint, chromosome, result);
      
      if (constraint.type === ConstraintType.HARD) {
        if (!isSatisfied) {
          result.hardConstraintViolations++;
          result.fitnessScore -= FITNESS_CONSTANTS.HARD_CONSTRAINT_PENALTY;
        }
      } else { // Soft constraint
        if (isSatisfied) {
          result.softConstraintsSatisfied++;
          result.fitnessScore += FITNESS_CONSTANTS.SOFT_CONSTRAINT_REWARD;
        }
      }
    }
    
    // Fitness score can't be negative
    result.fitnessScore = Math.max(0, result.fitnessScore);
    
    return result;
  }
  
  /**
   * Checks for basic scheduling violations like instructor conflicts
   * @param chromosome Chromosome to check
   * @param result Fitness result to update
   */
  private checkBasicViolations(chromosome: Chromosome, result: FitnessResult): void {
    const instructorTimeSlots = new Map<string, Set<string>>();
    const assignments = chromosome.getGenes();
    
    // Check for instructor conflicts
    for (const assignment of assignments) {
      const classInfo = this.classes.find(c => c.id === assignment.classId);
      
      if (!classInfo) {
        continue; // Skip if class not found
      }
      
      const timeSlotKey = `${assignment.timeSlot.day}-${assignment.timeSlot.period}`;
      
      // Check if instructor is already scheduled at this time
      if (!instructorTimeSlots.has(classInfo.instructor)) {
        instructorTimeSlots.set(classInfo.instructor, new Set<string>());
      }
      
      const instructorSlots = instructorTimeSlots.get(classInfo.instructor)!;
      
      if (instructorSlots.has(timeSlotKey)) {
        // Instructor conflict - teaching two classes at the same time
        result.hardConstraintViolations++;
        result.fitnessScore -= FITNESS_CONSTANTS.HARD_CONSTRAINT_PENALTY;
        
        result.violations.push({
          type: ViolationType.INSTRUCTOR_CONFLICT,
          constraintId: 'instructor-conflict',
          classId: assignment.classId,
          timeSlot: assignment.timeSlot,
          description: `Instructor ${classInfo.instructor} is scheduled to teach multiple classes at the same time`
        });
      }
      
      instructorSlots.add(timeSlotKey);
      
      // Check if class is scheduled at a time it conflicts with
      if (classInfo.conflicts.some(conflict => 
        areTimeSlotsEqual(conflict, assignment.timeSlot)
      )) {
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
   * Evaluates a single constraint against a chromosome
   * @param constraint Constraint to evaluate
   * @param chromosome Chromosome to evaluate against
   * @param result Fitness result to update with violations
   * @returns True if the constraint is satisfied
   */
  private evaluateConstraint(
    constraint: Constraint, 
    chromosome: Chromosome,
    result: FitnessResult
  ): boolean {
    const assignments = chromosome.getGenes();
    
    // Depending on the constraint definition, implement the specific check
    // For now, we'll implement a few common constraints
    
    // Specific class must be at a specific time
    if (constraint.id.startsWith('class-at-time-')) {
      const classId = constraint.parameters?.classId as string;
      const targetDay = constraint.parameters?.day as number;
      const targetPeriod = constraint.parameters?.period as number;
      
      if (classId && targetDay !== undefined && targetPeriod !== undefined) {
        const assignment = assignments.find(a => a.classId === classId);
        
        if (assignment && 
            assignment.timeSlot.day === targetDay && 
            assignment.timeSlot.period === targetPeriod) {
          return true;
        }
        
        if (constraint.type === ConstraintType.HARD) {
          result.violations.push({
            type: ViolationType.TIME_CONFLICT,
            constraintId: constraint.id,
            classId,
            timeSlot: { day: targetDay, period: targetPeriod },
            description: `Class ${classId} must be scheduled at day ${targetDay}, period ${targetPeriod}`
          });
        }
        
        return false;
      }
    }
    
    // Classes taught by the same instructor should be on the same day
    if (constraint.id === 'instructor-classes-same-day') {
      const instructorClasses = new Map<string, Set<number>>();
      
      // Group classes by instructor and day
      for (const assignment of assignments) {
        const classInfo = this.classes.find(c => c.id === assignment.classId);
        
        if (!classInfo) {
          continue;
        }
        
        if (!instructorClasses.has(classInfo.instructor)) {
          instructorClasses.set(classInfo.instructor, new Set<number>());
        }
        
        instructorClasses.get(classInfo.instructor)!.add(assignment.timeSlot.day);
      }
      
      // Check if all instructors have classes on at most one day
      for (const [instructor, days] of instructorClasses.entries()) {
        if (days.size > 1) {
          if (constraint.type === ConstraintType.HARD) {
            result.violations.push({
              type: ViolationType.OTHER,
              constraintId: constraint.id,
              classId: '',
              timeSlot: { day: 0, period: 0 },
              description: `Instructor ${instructor} has classes on multiple days`
            });
          }
          return false;
        }
      }
      
      return true;
    }
    
    // No more than N classes per day
    if (constraint.id === 'max-classes-per-day') {
      const maxClasses = constraint.parameters?.maxClasses as number || 10;
      const classesByDay = new Map<number, number>();
      
      // Count classes per day
      for (const assignment of assignments) {
        const day = assignment.timeSlot.day;
        classesByDay.set(day, (classesByDay.get(day) || 0) + 1);
      }
      
      // Check if any day exceeds the maximum
      for (const [day, count] of classesByDay.entries()) {
        if (count > maxClasses) {
          if (constraint.type === ConstraintType.HARD) {
            result.violations.push({
              type: ViolationType.OTHER,
              constraintId: constraint.id,
              classId: '',
              timeSlot: { day, period: 0 },
              description: `Day ${day} has ${count} classes, exceeding the maximum of ${maxClasses}`
            });
          }
          return false;
        }
      }
      
      return true;
    }
    
    // Default to assuming the constraint is satisfied
    return true;
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
}
