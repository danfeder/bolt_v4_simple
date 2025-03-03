import { describe, it, expect } from 'vitest';
import { GymClassScheduler } from './scheduler';
import { Class, Day } from '../models/types';

describe('GymClassScheduler', () => {
  // Test data
  const testClasses: Class[] = [
    {
      id: 'class1',
      name: 'Yoga',
      instructor: 'Instructor 1',
      conflicts: []
    },
    {
      id: 'class2',
      name: 'Pilates',
      instructor: 'Instructor 2',
      conflicts: []
    },
    {
      id: 'class3',
      name: 'CrossFit',
      instructor: 'Instructor 3',
      conflicts: []
    },
    {
      id: 'class4',
      name: 'Zumba',
      instructor: 'Instructor 1', // Same instructor as class1
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
});
