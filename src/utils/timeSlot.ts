import { Day, Period, TimeSlot } from '../models/types';

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
  return a.day === b.day && a.period === b.period;
}

/**
 * Formats a time slot as a string
 * @param timeSlot Time slot to format
 * @returns Formatted string (e.g., "Monday, Period 3")
 */
export function formatTimeSlot(timeSlot: TimeSlot): string {
  return `${timeSlot.day}, Period ${timeSlot.period}`;
}

/**
 * Calculates consecutive periods without a break
 * @param assignments Array of time slots representing class assignments
 * @returns Maximum number of consecutive periods
 */
export function calculateConsecutivePeriods(timeSlots: TimeSlot[]): number {
  // Group by day
  const slotsByDay = timeSlots.reduce<Record<Day, Period[]>>((acc, slot) => {
    if (!acc[slot.day]) {
      acc[slot.day] = [];
    }
    acc[slot.day].push(slot.period);
    return acc;
  }, {} as Record<Day, Period[]>);

  // For each day, find the maximum consecutive periods
  let maxConsecutive = 0;
  
  Object.values(slotsByDay).forEach(periods => {
    periods.sort((a, b) => a - b);
    
    let current = 1;
    let max = 1;
    
    for (let i = 1; i < periods.length; i++) {
      if (periods[i] === periods[i - 1] + 1) {
        current++;
      } else {
        current = 1;
      }
      max = Math.max(max, current);
    }
    
    maxConsecutive = Math.max(maxConsecutive, max);
  });
  
  return maxConsecutive;
}
