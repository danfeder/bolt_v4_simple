import { describe, it, expect, beforeEach } from 'vitest';
import { GymClassScheduler } from './scheduler';
import { Class, Day, TimeSlot } from '../models/types';

describe('GymClassScheduler with Date-Specific TimeSlots', () => {
  let scheduler: GymClassScheduler;
  let testClasses: Class[];
  
  beforeEach(() => {
    scheduler = new GymClassScheduler();
    
    // Create test classes with date-specific conflicts
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    testClasses = [
      {
        id: 'class1',
        name: 'Yoga',
        instructor: 'John',
        conflicts: [
          { day: Day.MONDAY, period: 1, date: today } // Date-specific conflict
        ]
      },
      {
        id: 'class2',
        name: 'Pilates',
        instructor: 'Jane',
        conflicts: [
          { day: Day.MONDAY, period: 2 } // Regular day-based conflict
        ]
      }
    ];
    
    scheduler.setClasses(testClasses);
  });
  
  it('should validate schedule with date-specific conflicts', () => {
    const today = new Date();
    
    // Create a schedule with an assignment that violates a date-specific conflict
    const invalidSchedule = {
      assignments: [
        { 
          classId: 'class1', 
          timeSlot: { day: Day.MONDAY, period: 1, date: today } 
        }
      ],
      classes: testClasses,
      startDate: today
    };
    
    // Validate the schedule
    const validation = scheduler.validateSchedule(invalidSchedule);
    
    // Should be invalid due to the date-specific conflict
    expect(validation.isValid).toBe(false);
    expect(validation.hardConstraintViolations).toBeGreaterThan(0);
    expect(validation.violationDetails.length).toBeGreaterThan(0);
  });
  
  it('should validate schedule with mixed conflict types', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Create a schedule with assignments that don't violate conflicts
    // - class1 is scheduled on tomorrow (not conflicting with today's conflict)
    // - class2 is scheduled on Tuesday (not conflicting with Monday's conflict)
    const validSchedule = {
      assignments: [
        { 
          classId: 'class1', 
          timeSlot: { day: Day.TUESDAY, period: 1, date: tomorrow } 
        },
        {
          classId: 'class2',
          timeSlot: { day: Day.TUESDAY, period: 2 }
        }
      ],
      classes: testClasses,
      startDate: today
    };
    
    // Validate the schedule
    const validation = scheduler.validateSchedule(validSchedule);
    
    // Should be valid since no conflicts are violated
    expect(validation.isValid).toBe(true);
    expect(validation.hardConstraintViolations).toBe(0);
    expect(validation.violationDetails.length).toBe(0);
  });
});
