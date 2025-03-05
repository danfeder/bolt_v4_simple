import { 
  dateToDay, 
  getDayDate, 
  organizeScheduleIntoWeeks, 
  enhanceAssignmentsWithDates, 
  createScheduleForDateRange 
} from '../scheduleUtils';
import { Schedule, Day, Assignment } from '../../models/types';
import { describe, test, expect } from 'vitest';

describe('scheduleUtils', () => {
  // Mock date for testing (2025-03-04 is a Tuesday)
  const testDate = new Date(2025, 2, 4); // March 4, 2025
  
  describe('dateToDay', () => {
    test('should convert date to correct Day enum', () => {
      // Tuesday
      expect(dateToDay(testDate)).toBe(Day.TUESDAY);
      
      // Monday
      const monday = new Date(2025, 2, 3); // March 3, 2025
      expect(dateToDay(monday)).toBe(Day.MONDAY);
      
      // Friday
      const friday = new Date(2025, 2, 7); // March 7, 2025
      expect(dateToDay(friday)).toBe(Day.FRIDAY);
    });
    
    test('should return undefined for weekend days', () => {
      // Saturday
      const saturday = new Date(2025, 2, 8); // March 8, 2025
      expect(dateToDay(saturday)).toBeUndefined();
      
      // Sunday
      const sunday = new Date(2025, 2, 9); // March 9, 2025
      expect(dateToDay(sunday)).toBeUndefined();
    });
  });
  
  describe('getDayDate', () => {
    test('should get the correct date for a specific day within a week', () => {
      // Starting from Monday (March 3, 2025)
      const monday = new Date(2025, 2, 3);
      
      // Get date for Tuesday (should be March 4, 2025)
      const tuesday = getDayDate(monday, Day.TUESDAY);
      expect(tuesday.getFullYear()).toBe(2025);
      expect(tuesday.getMonth()).toBe(2); // March (0-indexed)
      expect(tuesday.getDate()).toBe(4);
      
      // Get date for Friday (should be March 7, 2025)
      const friday = getDayDate(monday, Day.FRIDAY);
      expect(friday.getFullYear()).toBe(2025);
      expect(friday.getMonth()).toBe(2);
      expect(friday.getDate()).toBe(7);
    });
  });
  
  describe('organizeScheduleIntoWeeks', () => {
    test('should organize a schedule into weekly rotations', () => {
      // Create a sample schedule
      const schedule: Schedule = {
        startDate: new Date(2025, 2, 3), // March 3, 2025 (Monday)
        assignments: [
          // Monday assignments
          { classId: 'math', timeSlot: { day: Day.MONDAY, period: 1 } },
          { classId: 'science', timeSlot: { day: Day.MONDAY, period: 2 } },
          
          // Wednesday assignments
          { classId: 'history', timeSlot: { day: Day.WEDNESDAY, period: 3 } },
          { classId: 'english', timeSlot: { day: Day.WEDNESDAY, period: 4 } },
          
          // Friday assignments
          { classId: 'art', timeSlot: { day: Day.FRIDAY, period: 5 } },
          { classId: 'music', timeSlot: { day: Day.FRIDAY, period: 6 } }
        ]
      };
      
      const organizedSchedule = organizeScheduleIntoWeeks(schedule);
      
      // Check that weeks were created
      expect(organizedSchedule.weeks).toBeDefined();
      expect(organizedSchedule.weeks?.length).toBeGreaterThan(0);
      
      // Check that end date was calculated
      expect(organizedSchedule.endDate).toBeDefined();
      
      // Check that number of weeks was calculated
      expect(organizedSchedule.numberOfWeeks).toBeDefined();
      expect(organizedSchedule.numberOfWeeks).toBeGreaterThan(0);
      
      // Check that assignments were distributed to weeks
      const firstWeek = organizedSchedule.weeks?.[0];
      expect(firstWeek).toBeDefined();
      expect(firstWeek?.assignments.length).toBeGreaterThan(0);
    });
  });
  
  describe('enhanceAssignmentsWithDates', () => {
    test('should add date information to assignments', () => {
      // Create a sample schedule with weekday-only assignments
      const schedule: Schedule = {
        startDate: new Date(2025, 2, 3), // March 3, 2025 (Monday)
        assignments: [
          { classId: 'math', timeSlot: { day: Day.MONDAY, period: 1 } },
          { classId: 'science', timeSlot: { day: Day.TUESDAY, period: 2 } },
          { classId: 'history', timeSlot: { day: Day.WEDNESDAY, period: 3 } },
        ]
      };
      
      const enhancedSchedule = enhanceAssignmentsWithDates(schedule);
      
      // Check that all assignments now have dates
      enhancedSchedule.assignments.forEach(assignment => {
        expect(assignment.timeSlot.date).toBeDefined();
      });
      
      // Check that the dates correspond to the correct days
      const mondayAssignment = enhancedSchedule.assignments.find(
        a => a.timeSlot.day === Day.MONDAY
      );
      expect(mondayAssignment?.timeSlot.date?.getDate()).toBe(3); // March 3
      
      const tuesdayAssignment = enhancedSchedule.assignments.find(
        a => a.timeSlot.day === Day.TUESDAY
      );
      expect(tuesdayAssignment?.timeSlot.date?.getDate()).toBe(4); // March 4
      
      const wednesdayAssignment = enhancedSchedule.assignments.find(
        a => a.timeSlot.day === Day.WEDNESDAY
      );
      expect(wednesdayAssignment?.timeSlot.date?.getDate()).toBe(5); // March 5
    });
    
    test('should preserve existing dates', () => {
      // Create a sample schedule with some assignments that already have dates
      const existingDate = new Date(2025, 2, 10); // March 10, 2025
      
      const schedule: Schedule = {
        startDate: new Date(2025, 2, 3), // March 3, 2025 (Monday)
        assignments: [
          { classId: 'math', timeSlot: { day: Day.MONDAY, period: 1 } },
          { 
            classId: 'science', 
            timeSlot: { 
              day: Day.TUESDAY, 
              period: 2,
              date: existingDate
            } 
          },
        ]
      };
      
      const enhancedSchedule = enhanceAssignmentsWithDates(schedule);
      
      // Check that assignment with existing date retains it
      const scienceAssignment = enhancedSchedule.assignments.find(
        a => a.classId === 'science'
      );
      expect(scienceAssignment?.timeSlot.date).toEqual(existingDate);
      
      // Check that assignment without date gets one
      const mathAssignment = enhancedSchedule.assignments.find(
        a => a.classId === 'math'
      );
      expect(mathAssignment?.timeSlot.date).toBeDefined();
      expect(mathAssignment?.timeSlot.date?.getDate()).toBe(3); // March 3
    });
  });
  
  describe('createScheduleForDateRange', () => {
    test('should create a new schedule covering the specified date range', () => {
      // Create a base schedule
      const baseSchedule: Schedule = {
        startDate: new Date(2025, 2, 3), // March 3, 2025 (Monday)
        assignments: [
          { classId: 'math', timeSlot: { day: Day.MONDAY, period: 1 } },
          { classId: 'science', timeSlot: { day: Day.TUESDAY, period: 2 } },
          { classId: 'history', timeSlot: { day: Day.WEDNESDAY, period: 3 } },
          { classId: 'english', timeSlot: { day: Day.THURSDAY, period: 4 } },
          { classId: 'art', timeSlot: { day: Day.FRIDAY, period: 5 } },
        ]
      };
      
      // Create a new schedule for the next two weeks
      const newStartDate = new Date(2025, 2, 17); // March 17, 2025 (Monday)
      const newEndDate = new Date(2025, 2, 28); // March 28, 2025 (Friday)
      
      const newSchedule = createScheduleForDateRange(
        baseSchedule,
        newStartDate,
        newEndDate
      );
      
      // Check that the new schedule has the correct date range
      expect(newSchedule.startDate).toEqual(newStartDate);
      expect(newSchedule.endDate).toEqual(newEndDate);
      
      // Check that it has assignments for each weekday in the range
      // (10 weekdays in this range)
      expect(newSchedule.assignments.length).toBeGreaterThanOrEqual(10);
      
      // Check that it has weeks organized
      expect(newSchedule.weeks).toBeDefined();
      expect(newSchedule.weeks?.length).toBe(2); // 2 weeks
      
      // Check that assignments have dates
      newSchedule.assignments.forEach(assignment => {
        const date = assignment.timeSlot.date;
        expect(date).toBeDefined();
        
        // Type assertion to help TypeScript understand our expect check above
        if (date) {
          // Check that dates are within the specified range
          expect(date.getTime()).toBeGreaterThanOrEqual(newStartDate.getTime());
          expect(date.getTime()).toBeLessThanOrEqual(newEndDate.getTime());
        }
      });
    });
  });
});
