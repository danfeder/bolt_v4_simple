import { describe, it, expect } from 'vitest';
import { 
  generateAllTimeSlots, 
  areTimeSlotsEqual, 
  formatTimeSlot,
  calculateConsecutivePeriods
} from './timeSlot';
import { Day, TimeSlot } from '../models/types';

describe('Time Slot Utilities', () => {
  describe('generateAllTimeSlots', () => {
    it('should generate 40 time slots (5 days x 8 periods)', () => {
      const timeSlots = generateAllTimeSlots();
      expect(timeSlots.length).toBe(40);
    });

    it('should include all days and periods', () => {
      const timeSlots = generateAllTimeSlots();
      
      // Check if all days are included
      const days = new Set(timeSlots.map(slot => slot.day));
      expect(days.size).toBe(5);
      expect(days.has(Day.MONDAY)).toBe(true);
      expect(days.has(Day.FRIDAY)).toBe(true);
      
      // Check if all periods are included for Monday
      const mondaySlots = timeSlots.filter(slot => slot.day === Day.MONDAY);
      expect(mondaySlots.length).toBe(8);
      
      const mondayPeriods = new Set(mondaySlots.map(slot => slot.period));
      expect(mondayPeriods.size).toBe(8);
      expect(mondayPeriods.has(1)).toBe(true);
      expect(mondayPeriods.has(8)).toBe(true);
    });
  });

  describe('areTimeSlotsEqual', () => {
    it('should return true for equal time slots', () => {
      const a: TimeSlot = { day: Day.MONDAY, period: 3 };
      const b: TimeSlot = { day: Day.MONDAY, period: 3 };
      expect(areTimeSlotsEqual(a, b)).toBe(true);
    });

    it('should return false for different days', () => {
      const a: TimeSlot = { day: Day.MONDAY, period: 3 };
      const b: TimeSlot = { day: Day.TUESDAY, period: 3 };
      expect(areTimeSlotsEqual(a, b)).toBe(false);
    });

    it('should return false for different periods', () => {
      const a: TimeSlot = { day: Day.MONDAY, period: 3 };
      const b: TimeSlot = { day: Day.MONDAY, period: 4 };
      expect(areTimeSlotsEqual(a, b)).toBe(false);
    });

    it('should compare dates when available', () => {
      const date1 = new Date('2025-03-10T10:00:00'); // Monday
      const date2 = new Date('2025-03-10T10:00:00'); // Same Monday
      const date3 = new Date('2025-03-11T10:00:00'); // Tuesday
      
      const a: TimeSlot = { day: Day.MONDAY, period: 3, date: date1 };
      const b: TimeSlot = { day: Day.MONDAY, period: 3, date: date2 };
      const c: TimeSlot = { day: Day.TUESDAY, period: 3, date: date3 };
      
      expect(areTimeSlotsEqual(a, b)).toBe(true);
      expect(areTimeSlotsEqual(a, c)).toBe(false);
    });

    it('should prioritize date comparison over day comparison', () => {
      const date1 = new Date('2025-03-11T10:00:00'); // Tuesday
      
      // This has a Tuesday date but Monday as day property
      const a: TimeSlot = { day: Day.MONDAY, period: 3, date: date1 };
      const b: TimeSlot = { day: Day.TUESDAY, period: 3, date: date1 };
      
      // Despite different day properties, these should be equal because they have same date
      expect(areTimeSlotsEqual(a, b)).toBe(true);
    });
  });

  describe('formatTimeSlot', () => {
    it('should format time slot correctly without date', () => {
      const timeSlot: TimeSlot = { day: Day.MONDAY, period: 3 };
      expect(formatTimeSlot(timeSlot)).toBe('Monday, Period 3');
    });

    it('should format time slot with date correctly', () => {
      // Use a specific date with time to avoid timezone issues
      const date = new Date('2025-03-10T12:00:00');
      const timeSlot: TimeSlot = { day: Day.MONDAY, period: 3, date };
      
      // Extract the formatted date to check just the format pattern, not the exact date
      const formattedOutput = formatTimeSlot(timeSlot);
      expect(formattedOutput).toMatch(/^[A-Z][a-z]{2} \d{1,2}, 2025, Period 3$/);
      
      // Ensure the correct period is in the formatted output
      expect(formattedOutput).toContain('Period 3');
    });
  });

  describe('calculateConsecutivePeriods', () => {
    it('should return 0 for empty array', () => {
      expect(calculateConsecutivePeriods([])).toBe(0);
    });

    it('should return 1 for a single period', () => {
      const timeSlots: TimeSlot[] = [
        { day: Day.MONDAY, period: 3 }
      ];
      expect(calculateConsecutivePeriods(timeSlots)).toBe(1);
    });

    it('should correctly calculate consecutive periods in a day', () => {
      const timeSlots: TimeSlot[] = [
        { day: Day.MONDAY, period: 1 },
        { day: Day.MONDAY, period: 2 },
        { day: Day.MONDAY, period: 3 },
        { day: Day.TUESDAY, period: 1 },
        { day: Day.TUESDAY, period: 3 }
      ];
      expect(calculateConsecutivePeriods(timeSlots)).toBe(3);
    });

    it('should handle non-consecutive periods correctly', () => {
      const timeSlots: TimeSlot[] = [
        { day: Day.MONDAY, period: 1 },
        { day: Day.MONDAY, period: 3 },
        { day: Day.MONDAY, period: 5 },
        { day: Day.TUESDAY, period: 2 },
        { day: Day.TUESDAY, period: 4 }
      ];
      expect(calculateConsecutivePeriods(timeSlots)).toBe(1);
    });

    it('should calculate consecutive periods with date-specific time slots', () => {
      const date1 = new Date('2025-03-10'); // Monday
      const date2 = new Date('2025-03-11'); // Tuesday
      const timeSlots: TimeSlot[] = [
        { day: Day.MONDAY, period: 1, date: date1 },
        { day: Day.MONDAY, period: 2, date: date1 },
        { day: Day.MONDAY, period: 3, date: date1 },
        { day: Day.TUESDAY, period: 1, date: date2 },
        { day: Day.TUESDAY, period: 2, date: date2 }
      ];
      expect(calculateConsecutivePeriods(timeSlots)).toBe(3);
    });

    it('should handle mixed date and non-date time slots', () => {
      const date1 = new Date('2025-03-10'); // Monday
      const timeSlots: TimeSlot[] = [
        { day: Day.MONDAY, period: 1, date: date1 },
        { day: Day.MONDAY, period: 2, date: date1 },
        { day: Day.MONDAY, period: 3 }, // No date
        { day: Day.TUESDAY, period: 1 }
      ];
      expect(calculateConsecutivePeriods(timeSlots)).toBe(2);
    });
  });
});
