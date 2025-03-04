import { Day, Period, TimeSlot } from '../models/types';
import { format, isSameDay } from 'date-fns';

/**
 * Generates all possible time slots for a week (Monday-Friday, periods 1-8)
 * @returns Array of all possible time slots
 */
export function generateAllTimeSlots(): TimeSlot[] {
  const timeSlots: TimeSlot[] = [];
  
  const days: Day[] = [
    Day.MONDAY, 
    Day.TUESDAY, 
    Day.WEDNESDAY, 
    Day.THURSDAY, 
    Day.FRIDAY
  ];
  
  const periods: Period[] = [1, 2, 3, 4, 5, 6, 7, 8];
  
  for (const day of days) {
    for (const period of periods) {
      timeSlots.push({ day, period });
    }
  }
  
  return timeSlots;
}

/**
 * Checks if two time slots are equal
 * @param a First time slot
 * @param b Second time slot
 * @returns True if time slots are equal
 */
export function areTimeSlotsEqual(a: TimeSlot, b: TimeSlot): boolean {
  // If both have dates, compare dates
  if (a.date && b.date) {
    return isSameDay(a.date, b.date) && a.period === b.period;
  }
  // Otherwise fall back to day comparison
  return a.day === b.day && a.period === b.period;
}

/**
 * Formats a time slot as a string
 * @param timeSlot Time slot to format
 * @returns Formatted string (e.g., "Monday, Period 3" or "Mar 15, 2025, Period 3")
 */
export function formatTimeSlot(timeSlot: TimeSlot): string {
  if (timeSlot.date) {
    return `${format(timeSlot.date, 'MMM d, yyyy')}, Period ${timeSlot.period}`;
  }
  return `${timeSlot.day}, Period ${timeSlot.period}`;
}

/**
 * Calculates consecutive periods without a break
 * @param assignments Array of time slots representing class assignments
 * @returns Maximum number of consecutive periods
 */
export function calculateConsecutivePeriods(assignments: TimeSlot[]): number {
  // Group by day
  const byDay: { [key: string]: Period[] } = {};
  
  for (const assignment of assignments) {
    // Use date if available, otherwise use day
    const dayKey = assignment.date ? format(assignment.date, 'yyyy-MM-dd') : assignment.day;
    
    if (!byDay[dayKey]) {
      byDay[dayKey] = [];
    }
    
    byDay[dayKey].push(assignment.period);
  }
  
  let maxConsecutive = 0;
  
  // For each day, calculate consecutive periods
  for (const day in byDay) {
    const periods = byDay[day].sort((a, b) => a - b);
    let currentStreak = 1;
    let maxStreak = 1;
    
    for (let i = 1; i < periods.length; i++) {
      if (periods[i] === periods[i - 1] + 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      
      maxStreak = Math.max(maxStreak, currentStreak);
    }
    
    maxConsecutive = Math.max(maxConsecutive, maxStreak);
  }
  
  return maxConsecutive;
}
