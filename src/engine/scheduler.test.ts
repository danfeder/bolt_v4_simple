import { describe, it, expect } from 'vitest';
import { GymClassScheduler } from './scheduler';
import { Class, Day, Schedule } from '../models/types';

describe('GymClassScheduler', () => {
  // Test data
  const testClasses: Class[] = [
    {
      id: 'class1',
      name: 'Yoga',
      conflicts: []
    },
    {
      id: 'class2',
      name: 'Pilates',
      conflicts: []
    },
    {
      id: 'class3',
      name: 'CrossFit',
      conflicts: []
    },
    {
      id: 'class4',
      name: 'Zumba',
      conflicts: []
    }
  ];
  
  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const scheduler = new GymClassScheduler();
      expect(scheduler).toBeDefined();
    });
    
    it('should accept custom configuration', () => {
      const config = {
        populationSize: 50,
        generations: 20
      };
      
      const scheduler = new GymClassScheduler(config);
      expect(scheduler).toBeDefined();
    });
  });
  
  describe('available time slots', () => {
    it('should return all available time slots', () => {
      const scheduler = new GymClassScheduler();
      const timeSlots = scheduler.getAvailableTimeSlots();
      
      // 5 days * 8 periods = 40 slots
      expect(timeSlots.length).toBe(40);
      
      // Check some specific slots
      expect(timeSlots).toContainEqual({ day: Day.MONDAY, period: 1 });
      expect(timeSlots).toContainEqual({ day: Day.FRIDAY, period: 8 });
    });
  });
  
  describe('schedule generation', () => {
    it('should return empty schedule if no classes are set', () => {
      const scheduler = new GymClassScheduler();
      const schedule = scheduler.generateSchedule();
      
      expect(schedule.assignments).toEqual([]);
      expect(schedule.fitness).toBe(0);
    });
    
    it('should generate a schedule for the provided classes', () => {
      const scheduler = new GymClassScheduler({
        populationSize: 20, // Small values for faster tests
        generations: 5
      });
      
      scheduler.setClasses(testClasses);
      const schedule = scheduler.generateSchedule();
      
      // Check that all classes are scheduled
      expect(schedule.assignments.length).toBe(testClasses.length);
      
      // All class IDs should be in the assignments
      const scheduledClassIds = schedule.assignments.map(a => a.classId);
      for (const cls of testClasses) {
        expect(scheduledClassIds).toContain(cls.id);
      }
      
      // Schedule should have fitness info
      expect(schedule.fitness).toBeGreaterThan(0);
      expect(schedule).toHaveProperty('hardConstraintViolations');
    });
  });
  
  describe('validation', () => {
    it('should validate schedules for constraint violations', () => {
      const scheduler = new GymClassScheduler();
      scheduler.setClasses(testClasses);
      
      // Generate a schedule
      const schedule = scheduler.generateSchedule();
      
      // Validate it
      const validation = scheduler.validateSchedule(schedule);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('hardConstraintViolations');
      expect(validation).toHaveProperty('violationDetails');
    });
  });
  
  describe('re-optimization', () => {
    it('should preserve locked assignments during re-optimization', () => {
      const scheduler = new GymClassScheduler({
        populationSize: 20, // Small values for faster tests
        generations: 5
      });
      
      scheduler.setClasses(testClasses);
      
      // Generate an initial schedule
      const initialSchedule = scheduler.generateSchedule();
      
      // Choose some assignments to lock
      const lockedAssignmentIds = [testClasses[0].id, testClasses[2].id];
      
      // Save the positions of locked assignments before re-optimization
      const lockedAssignmentsPositions = initialSchedule.assignments
        .filter(a => lockedAssignmentIds.includes(a.classId))
        .map(a => ({
          classId: a.classId,
          timeSlot: { ...a.timeSlot }
        }));
      
      // Run re-optimization
      const reOptimizedSchedule = scheduler.reOptimizeSchedule(
        initialSchedule,
        lockedAssignmentIds
      );
      
      // Check that locked assignments remained in the same positions
      for (const lockedAssignment of lockedAssignmentsPositions) {
        const reOptimizedAssignment = reOptimizedSchedule.assignments.find(
          a => a.classId === lockedAssignment.classId
        );
        
        expect(reOptimizedAssignment).toBeDefined();
        expect(reOptimizedAssignment?.timeSlot.day).toBe(lockedAssignment.timeSlot.day);
        expect(reOptimizedAssignment?.timeSlot.period).toBe(lockedAssignment.timeSlot.period);
      }
      
      // Check that all classes are still scheduled
      expect(reOptimizedSchedule.assignments.length).toBe(testClasses.length);
      
      // Fitness should be at least as good as or better than the initial schedule
      // (Due to the randomness of genetic algorithms, this isn't guaranteed, but it's a good heuristic)
      expect(reOptimizedSchedule.fitness).toBeGreaterThanOrEqual(initialSchedule.fitness * 0.9);
    });
    
    it('should throw an error if the locked assignments contain conflicts', () => {
      const scheduler = new GymClassScheduler();
      
      scheduler.setClasses(testClasses);
      
      // Generate an initial schedule
      const initialSchedule = scheduler.generateSchedule();
      
      // Create a modified schedule with conflict (same time slot for two classes)
      const conflictingSchedule: Schedule = {
        ...initialSchedule,
        assignments: [
          ...initialSchedule.assignments.slice(0, 2),
          {
            classId: testClasses[2].id,
            timeSlot: { ...initialSchedule.assignments[0].timeSlot } // Put in same slot as first class
          },
          ...initialSchedule.assignments.slice(3)
        ]
      };
      
      // This should throw an error since we're trying to lock in conflicting assignments
      expect(() => {
        scheduler.reOptimizeSchedule(
          conflictingSchedule,
          [testClasses[0].id, testClasses[2].id]
        );
      }).toThrow();
    });
  });
});
