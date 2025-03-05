import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchedulerAPI } from '../engine/schedulerAPI';
import { Class, Day, Period, SchedulingConstraints } from '../models/types';

describe('Scheduler Constraints Tests', () => {
  let schedulerApi: SchedulerAPI;
  let testClasses: Class[];

  beforeEach(() => {
    // Set up test environment
    vi.mock('../utils/testing', () => ({
      isTestEnv: () => true
    }));

    // Setup test classes (reduced to 10 for easier testing)
    testClasses = Array.from({ length: 10 }, (_, i) => ({
      id: `class-${i + 1}`,
      name: `Test Class ${i + 1}`,
      conflicts: []
    }));

    // Initialize scheduler
    schedulerApi = new SchedulerAPI();
    schedulerApi.setClasses(testClasses);
  });

  it('generates schedules respecting daily max classes constraint', () => {
    // Set a constraint that limits to 2 classes per day
    const constraints: SchedulingConstraints = {
      hard: {
        personalConflicts: [],
        maxConsecutivePeriods: 3,
        dailyMinClasses: 0,
        dailyMaxClasses: 2, // Only allow 2 classes per day
        weeklyMinClasses: 0,
        weeklyMaxClasses: 10,
        rotationStartDate: new Date()
      },
      soft: {
        teacherPreferences: {
          preferred: [],
          notPreferred: []
        },
        balanceWorkload: true
      }
    };
    
    // Apply constraints
    schedulerApi.setConstraints(constraints);
    
    // Generate schedule
    const schedule = schedulerApi.generateSchedule();
    
    console.log("Daily constraint test - Classes per day:", 
      Object.entries(
        schedule.assignments.reduce((acc, assignment) => {
          const day = assignment.timeSlot.day;
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {} as Record<number, number>)
      )
    );
    
    // Verify the assignments
    expect(schedule.assignments).toBeDefined();
    
    // Group assignments by day
    const dayMap = new Map<Day, number>();
    for (const assignment of schedule.assignments) {
      const day = assignment.timeSlot.day;
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }
    
    // Check that no day has more than the max classes
    for (const [day, count] of dayMap.entries()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });
  
  it('generates schedules respecting weekly max classes constraint', () => {
    // Set a constraint that limits to 8 classes per week
    const constraints: SchedulingConstraints = {
      hard: {
        personalConflicts: [],
        maxConsecutivePeriods: 3,
        dailyMinClasses: 0,
        dailyMaxClasses: 8,
        weeklyMinClasses: 0,
        weeklyMaxClasses: 5, // Only allow 5 classes per week out of 10 total
        rotationStartDate: new Date()
      },
      soft: {
        teacherPreferences: {
          preferred: [],
          notPreferred: []
        },
        balanceWorkload: true
      }
    };
    
    // Apply constraints
    schedulerApi.setConstraints(constraints);
    
    // Generate schedule
    const schedule = schedulerApi.generateSchedule();
    
    console.log("Weekly constraint test - Total classes:", schedule.assignments.length);
    
    // Verify the assignments
    expect(schedule.assignments).toBeDefined();
    
    // Check that there are no more than the max classes total
    expect(schedule.assignments.length).toBeLessThanOrEqual(5);
  });
});
