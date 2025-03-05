import { describe, it, expect } from 'vitest';
import { FitnessEvaluator, FITNESS_CONSTANTS, ViolationType } from './fitness';
import { Chromosome } from './chromosome';
import { Class, Constraint, ConstraintType, Day, Assignment } from '../models/types';

describe('FitnessEvaluator', () => {
  // Test data
  const testClasses: Class[] = [
    {
      id: 'class1',
      name: 'Class 1',
      conflicts: [{ day: Day.FRIDAY, period: 3 }]
    },
    {
      id: 'class2',
      name: 'Class 2',
      conflicts: []
    },
    {
      id: 'class3',
      name: 'Class 3',
      conflicts: []
    }
  ];
  
  const testConstraints: Constraint[] = [
    {
      id: 'class-at-time-1',
      type: ConstraintType.HARD,
      description: 'Class 1 must be at Monday period 2',
      parameters: {
        classId: 'class1',
        day: Day.MONDAY,
        period: 2
      }
    },
    {
      id: 'max-classes-per-day',
      type: ConstraintType.HARD,
      description: 'No more than 2 classes per day',
      parameters: {
        maxClasses: 2
      }
    }
  ];
  
  describe('evaluate', () => {
    it('should return base fitness for empty constraints', () => {
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 2 } },
        { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.WEDNESDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      const evaluator = new FitnessEvaluator(testClasses, []);
      
      const result = evaluator.evaluate(chromosome);
      
      expect(result.fitnessScore).toBe(FITNESS_CONSTANTS.BASE_FITNESS);
      expect(result.hardConstraintViolations).toBe(0);
      expect(result.softConstraintsSatisfied).toBe(0);
      expect(result.violations).toHaveLength(0);
    });
    
    it('should detect class scheduling conflicts', () => {
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.FRIDAY, period: 3 } }, // Conflicts with class1's constraints
        { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.WEDNESDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      const evaluator = new FitnessEvaluator(testClasses, []);
      
      const result = evaluator.evaluate(chromosome);
      
      expect(result.hardConstraintViolations).toBe(1);
      expect(result.fitnessScore).toBe(FITNESS_CONSTANTS.BASE_FITNESS - FITNESS_CONSTANTS.HARD_CONSTRAINT_PENALTY);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe(ViolationType.TIME_CONFLICT);
    });
    
    it('should evaluate hard constraint: class must be at specific time', () => {
      // Class1 should be at Monday period 2
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.TUESDAY, period: 3 } }, // Not where it should be
        { classId: 'class2', timeSlot: { day: Day.WEDNESDAY, period: 4 } },
        { classId: 'class3', timeSlot: { day: Day.THURSDAY, period: 5 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      const evaluator = new FitnessEvaluator(testClasses, [testConstraints[0]]);
      
      const result = evaluator.evaluate(chromosome);
      
      expect(result.hardConstraintViolations).toBe(1);
      expect(result.fitnessScore).toBe(FITNESS_CONSTANTS.BASE_FITNESS - FITNESS_CONSTANTS.HARD_CONSTRAINT_PENALTY);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].constraintId).toBe('class-at-time-1');
    });
    
    it('should evaluate hard constraint: max classes per day', () => {
      // Max 2 classes per day, but we have 3 on Monday
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 2 } },
        { classId: 'class2', timeSlot: { day: Day.MONDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.MONDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      const evaluator = new FitnessEvaluator(testClasses, [testConstraints[1]]);
      
      const result = evaluator.evaluate(chromosome);
      
      expect(result.hardConstraintViolations).toBe(1);
      expect(result.fitnessScore).toBe(FITNESS_CONSTANTS.BASE_FITNESS - FITNESS_CONSTANTS.HARD_CONSTRAINT_PENALTY);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].constraintId).toBe('max-classes-per-day');
    });
    
    it('should evaluate multiple constraints at once', () => {
      // All constraints are violated:
      // 1. class1 is not at Monday period 2
      // 2. More than 2 classes on Monday
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.TUESDAY, period: 2 } }, // Should be Monday period 2
        { classId: 'class2', timeSlot: { day: Day.MONDAY, period: 3 } },  // 
        { classId: 'class3', timeSlot: { day: Day.MONDAY, period: 4 } }   // This makes 2 classes on Monday, which is ok
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      const evaluator = new FitnessEvaluator(testClasses, testConstraints);
      
      const result = evaluator.evaluate(chromosome);
      
      expect(result.hardConstraintViolations).toBe(1); // Just the class-at-time constraint
      expect(result.fitnessScore).toBe(FITNESS_CONSTANTS.BASE_FITNESS - FITNESS_CONSTANTS.HARD_CONSTRAINT_PENALTY);
    });
    
    it('should not return negative fitness', () => {
      // Create many violations to try to make fitness negative
      const manyConstraints: Constraint[] = [];
      
      // Add 10 hard constraints that will all be violated
      for (let i = 0; i < 10; i++) {
        manyConstraints.push({
          id: `class-at-time-${i}`,
          type: ConstraintType.HARD,
          description: `Class ${i} must be at specific time`,
          parameters: {
            classId: `class${i % 3 + 1}`,
            day: Day.FRIDAY,
            period: 8
          }
        });
      }
      
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 2 } },
        { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.WEDNESDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      const evaluator = new FitnessEvaluator(testClasses, manyConstraints);
      
      const result = evaluator.evaluate(chromosome);
      
      // With 10 hard constraint violations, fitness would be negative, but should be clamped to 0
      expect(result.hardConstraintViolations).toBe(10);
      expect(result.fitnessScore).toBe(0);
    });
  });
});
