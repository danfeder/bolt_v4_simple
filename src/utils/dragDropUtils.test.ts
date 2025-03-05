import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateClassMove, moveClassInSchedule } from './dragDropUtils';
import { Schedule, Class, Day, Period } from '../models/types';
import { schedulerApi } from '../engine/schedulerAPI';

// Mock the schedulerApi methods
vi.mock('../engine/schedulerAPI', () => ({
  schedulerApi: {
    saveSchedule: vi.fn(),
    loadSchedule: vi.fn(),
    validateSchedule: vi.fn(),
  }
}));

describe('Drag and Drop Utils', () => {
  let mockSchedule: Schedule;
  let mockClasses: Class[];

  beforeEach(() => {
    // Reset mock calls
    vi.resetAllMocks();

    // Setup test data
    mockClasses = [
      {
        id: 'class_1',
        name: 'Math',
        conflicts: [
          { day: Day.MONDAY, period: 1 as Period },
          { day: Day.TUESDAY, period: 2 as Period },
        ]
      },
      {
        id: 'class_2',
        name: 'Science',
        conflicts: [
          { day: Day.WEDNESDAY, period: 3 as Period },
          { day: Day.THURSDAY, period: 4 as Period },
        ]
      }
    ];

    mockSchedule = {
      assignments: [
        {
          classId: 'class_1',
          timeSlot: { day: Day.MONDAY, period: 2 as Period }
        },
        {
          classId: 'class_2',
          timeSlot: { day: Day.TUESDAY, period: 3 as Period }
        }
      ],
      startDate: new Date()
    };

    // Configure validateSchedule mock to return valid result by default
    if (schedulerApi && schedulerApi.validateSchedule) {
      vi.mocked(schedulerApi.validateSchedule).mockReturnValue({
        isValid: true,
        hardConstraintViolations: 0,
        violationDetails: []
      });
    }
  });

  describe('validateClassMove', () => {
    it('should return invalid when target slot is occupied', () => {
      const result = validateClassMove(
        'class_1',
        { day: Day.TUESDAY, period: 3 as Period },
        mockSchedule,
        mockClasses
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('occupied');
    });

    it('should return invalid when class has conflict in target slot', () => {
      const result = validateClassMove(
        'class_1',
        { day: Day.MONDAY, period: 1 as Period },
        mockSchedule,
        mockClasses
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('conflict');
    });

    it('should return valid for an empty slot with no conflicts', () => {
      const result = validateClassMove(
        'class_1',
        { day: Day.WEDNESDAY, period: 1 as Period },
        mockSchedule,
        mockClasses
      );

      expect(result.isValid).toBe(true);
    });

    it('should return invalid if class is not found', () => {
      const result = validateClassMove(
        'nonexistent_class',
        { day: Day.WEDNESDAY, period: 1 as Period },
        mockSchedule,
        mockClasses
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Class not found');
    });
  });

  describe('moveClassInSchedule', () => {
    it('should move a class to a new time slot', () => {
      const newSchedule = moveClassInSchedule(
        mockSchedule,
        'class_1',
        { day: Day.WEDNESDAY, period: 1 as Period }
      );

      // The class should be removed from its original slot
      expect(
        newSchedule.assignments.find(a => 
          a.classId === 'class_1' && 
          a.timeSlot.day === Day.MONDAY && 
          a.timeSlot.period === 2
        )
      ).toBeUndefined();

      // And added to the new slot
      expect(
        newSchedule.assignments.find(a => 
          a.classId === 'class_1' && 
          a.timeSlot.day === Day.WEDNESDAY && 
          a.timeSlot.period === 1
        )
      ).toBeDefined();

      // Total number of assignments should remain the same
      expect(newSchedule.assignments.length).toBe(2);
    });

    it('should add the class if it was not previously in the schedule', () => {
      // Create a schedule without class_1
      const partialSchedule: Schedule = {
        assignments: [
          {
            classId: 'class_2',
            timeSlot: { day: Day.TUESDAY, period: 3 as Period }
          }
        ],
        startDate: new Date()
      };

      const newSchedule = moveClassInSchedule(
        partialSchedule,
        'class_1',
        { day: Day.WEDNESDAY, period: 1 as Period }
      );

      // The class should be added to the new slot
      expect(
        newSchedule.assignments.find(a => 
          a.classId === 'class_1' && 
          a.timeSlot.day === Day.WEDNESDAY && 
          a.timeSlot.period === 1
        )
      ).toBeDefined();

      // Total number of assignments should increase
      expect(newSchedule.assignments.length).toBe(2);
    });

    it('should properly handle schedule updates when scheduler API is integrated', () => {
      const newSchedule = moveClassInSchedule(
        mockSchedule,
        'class_1',
        { day: Day.WEDNESDAY, period: 1 as Period }
      );

      // Now let's simulate what would happen when this is integrated with the API
      if (schedulerApi && schedulerApi.saveSchedule) {
        schedulerApi.saveSchedule(newSchedule);
        
        expect(schedulerApi.saveSchedule).toHaveBeenCalledWith(newSchedule);
        
        const mockCalls = vi.mocked(schedulerApi.saveSchedule).mock.calls;
        if (mockCalls.length > 0 && mockCalls[0][0]) {
          expect(mockCalls[0][0].assignments).toHaveLength(2);
          
          const movedAssignment = mockCalls[0][0].assignments.find(a => 
            a.classId === 'class_1' && 
            a.timeSlot.day === Day.WEDNESDAY && 
            a.timeSlot.period === 1
          );
          
          expect(movedAssignment).toBeDefined();
        }
      }
    });
  });
});
