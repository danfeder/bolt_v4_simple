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
  });

  describe('formatTimeSlot', () => {
    it('should format time slot correctly', () => {
      const timeSlot: TimeSlot = { day: Day.MONDAY, period: 3 };
      expect(formatTimeSlot(timeSlot)).toBe('Monday, Period 3');
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
  });
});
