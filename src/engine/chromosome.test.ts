import { describe, it, expect, beforeEach } from 'vitest';
import { Chromosome } from './chromosome';
import { Class, Day, Period, TimeSlot, Assignment } from '../models/types';

describe('Chromosome', () => {
  let testClasses: Class[];
  let availableTimeSlots: TimeSlot[];
  
  beforeEach(() => {
    // Create test classes
    testClasses = [
      {
        id: 'class1',
        name: 'Class 1',
        conflicts: [
          { day: Day.MONDAY, period: 1 },
          { day: Day.TUESDAY, period: 2 },
        ]
      },
      {
        id: 'class2',
        name: 'Class 2',
        conflicts: [
          { day: Day.WEDNESDAY, period: 3 },
          { day: Day.THURSDAY, period: 4 },
        ]
      },
      {
        id: 'class3',
        name: 'Class 3',
        conflicts: [
          { day: Day.FRIDAY, period: 5 },
          { day: Day.MONDAY, period: 6 },
        ]
      }
    ];
    
    // Create test time slots
    availableTimeSlots = [
      { day: Day.MONDAY, period: 2 },
      { day: Day.TUESDAY, period: 3 },
      { day: Day.WEDNESDAY, period: 4 }
    ];
  });
  
  describe('constructor', () => {
    it('should generate random assignments when no initial genes are provided', () => {
      const chromosome = new Chromosome(testClasses);
      const genes = chromosome.getGenes();
      
      // Should have one assignment per class
      expect(genes.length).toBe(testClasses.length);
      
      // Check if each class has an assignment
      for (const cls of testClasses) {
        const assignment = genes.find(gene => gene.classId === cls.id);
        expect(assignment).toBeDefined();
      }
    });
    
    it('should use initial genes when provided', () => {
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 2 } },
        { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.WEDNESDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      const genes = chromosome.getGenes();
      
      // Should have same assignments as initial genes
      expect(genes).toEqual(initialGenes);
    });
  });
  
  describe('getAssignmentForClass', () => {
    it('should return the assignment for a specific class', () => {
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 2 } },
        { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.WEDNESDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      
      const assignment = chromosome.getAssignmentForClass('class2');
      expect(assignment).toEqual({ classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } });
    });
    
    it('should return undefined for non-existent class', () => {
      const chromosome = new Chromosome(testClasses);
      const assignment = chromosome.getAssignmentForClass('non-existent');
      expect(assignment).toBeUndefined();
    });
  });
  
  describe('getClassForTimeSlot', () => {
    it('should return the class assigned to a specific time slot', () => {
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 2 } },
        { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.WEDNESDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      
      const classId = chromosome.getClassForTimeSlot({ day: Day.TUESDAY, period: 3 });
      expect(classId).toBe('class2');
    });
    
    it('should return undefined for unassigned time slot', () => {
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 2 } },
        { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.WEDNESDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      const classId = chromosome.getClassForTimeSlot({ day: Day.FRIDAY, period: 8 });
      expect(classId).toBeUndefined();
    });
  });
  
  describe('updateAssignment', () => {
    it('should update the assignment for a class', () => {
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 2 } },
        { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.WEDNESDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      
      const newTimeSlot: TimeSlot = { day: Day.FRIDAY, period: 1 };
      const success = chromosome.updateAssignment('class1', newTimeSlot);
      
      expect(success).toBe(true);
      
      const updatedAssignment = chromosome.getAssignmentForClass('class1');
      expect(updatedAssignment?.timeSlot).toEqual(newTimeSlot);
    });
    
    it('should return false when trying to update with an already assigned time slot', () => {
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 2 } },
        { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.WEDNESDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      
      // Try to update class1 to class2's time slot
      const success = chromosome.updateAssignment('class1', { day: Day.TUESDAY, period: 3 });
      
      expect(success).toBe(false);
      
      // Assignment should remain unchanged
      const assignment = chromosome.getAssignmentForClass('class1');
      expect(assignment?.timeSlot).toEqual({ day: Day.MONDAY, period: 2 });
    });
  });
  
  describe('swapAssignments', () => {
    it('should swap the time slots of two classes', () => {
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 2 } },
        { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.WEDNESDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      
      const success = chromosome.swapAssignments('class1', 'class2');
      
      expect(success).toBe(true);
      
      // Check if the assignments were swapped
      const assignment1 = chromosome.getAssignmentForClass('class1');
      const assignment2 = chromosome.getAssignmentForClass('class2');
      
      expect(assignment1?.timeSlot).toEqual({ day: Day.TUESDAY, period: 3 });
      expect(assignment2?.timeSlot).toEqual({ day: Day.MONDAY, period: 2 });
    });
    
    it('should return false when trying to swap with a non-existent class', () => {
      const chromosome = new Chromosome(testClasses);
      
      const success = chromosome.swapAssignments('class1', 'non-existent');
      
      expect(success).toBe(false);
    });
  });
  
  describe('clone', () => {
    it('should create a deep copy of the chromosome', () => {
      const initialGenes: Assignment[] = [
        { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 2 } },
        { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 3 } },
        { classId: 'class3', timeSlot: { day: Day.WEDNESDAY, period: 4 } }
      ];
      
      const chromosome = new Chromosome(testClasses, initialGenes);
      const clone = chromosome.clone();
      
      // Check if the genes are equal
      expect(clone.getGenes()).toEqual(chromosome.getGenes());
      
      // Modify the original chromosome
      chromosome.updateAssignment('class1', { day: Day.FRIDAY, period: 1 });
      
      // Clone should remain unchanged
      expect(clone.getAssignmentForClass('class1')?.timeSlot).toEqual({ day: Day.MONDAY, period: 2 });
    });
  });
});
