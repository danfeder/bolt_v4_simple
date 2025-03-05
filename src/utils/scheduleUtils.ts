import { 
  Schedule, 
  TimeSlot, 
  Day, 
  Period, 
  Assignment, 
  RotationWeek,
  DateRange
} from '../models/types';
import { 
  addDays, 
  differenceInDays, 
  eachDayOfInterval, 
  endOfWeek, 
  getDay, 
  isSameDay, 
  startOfWeek 
} from 'date-fns';

/**
 * Maps JavaScript day numbers (0-6, starting with Sunday) to our Day enum
 */
const dayNumberToEnum: Record<number, Day> = {
  1: Day.MONDAY,
  2: Day.TUESDAY,
  3: Day.WEDNESDAY,
  4: Day.THURSDAY,
  5: Day.FRIDAY
};

/**
 * Maps our Day enum to JavaScript day numbers
 */
const dayEnumToNumber: Record<Day, number> = {
  [Day.MONDAY]: 1,
  [Day.TUESDAY]: 2,
  [Day.WEDNESDAY]: 3,
  [Day.THURSDAY]: 4,
  [Day.FRIDAY]: 5
};

/**
 * Converts a Date object to the corresponding Day enum value
 * @param date Date to convert
 * @returns The corresponding Day enum value, or undefined if it's a weekend
 */
export function dateToDay(date: Date): Day | undefined {
  const dayNumber = getDay(date); // 0 = Sunday, 1 = Monday, etc.
  return dayNumberToEnum[dayNumber]; // Returns undefined for weekends
}

/**
 * Gets the corresponding date for a specific day within a week
 * @param startDate The start date of the week (typically a Monday)
 * @param day The day to get the date for
 * @returns The Date object for the specified day
 */
export function getDayDate(startDate: Date, day: Day): Date {
  const dayOffset = dayEnumToNumber[day] - 1; // -1 because we start from Monday (offset 0)
  return addDays(startDate, dayOffset);
}

/**
 * Organizes a schedule into rotation weeks
 * @param schedule The schedule to organize
 * @returns The schedule with populated weeks
 */
export function organizeScheduleIntoWeeks(schedule: Schedule): Schedule {
  if (!schedule.startDate) {
    throw new Error('Schedule must have a start date to organize into weeks');
  }

  // Clone the schedule to avoid mutating the original
  const result: Schedule = { ...schedule };
  
  // Determine the end date based on assignments if not provided
  if (!result.endDate) {
    // Find the latest date in assignments or default to 2 weeks
    const latestDate = getLatestDateFromAssignments(schedule.assignments, schedule.startDate);
    result.endDate = latestDate;
  }

  // Calculate the number of weeks in the rotation
  const startOfFirstWeek = startOfWeek(result.startDate, { weekStartsOn: 1 }); // 1 = Monday
  const endOfLastWeek = endOfWeek(result.endDate, { weekStartsOn: 1 });
  
  const totalDays = differenceInDays(endOfLastWeek, startOfFirstWeek) + 1;
  const numberOfWeeks = Math.ceil(totalDays / 7);
  
  result.numberOfWeeks = numberOfWeeks;
  result.weeks = [];

  // Create week objects and populate with assignments
  for (let i = 0; i < numberOfWeeks; i++) {
    const weekStartDate = addDays(startOfFirstWeek, i * 7);
    const weekEndDate = i === numberOfWeeks - 1 
      ? endOfLastWeek 
      : addDays(weekStartDate, 6);
    
    // Get assignments for this week
    const weekAssignments = getAssignmentsForDateRange(schedule.assignments, {
      startDate: weekStartDate,
      endDate: weekEndDate
    });
    
    result.weeks.push({
      weekNumber: i + 1,
      startDate: weekStartDate,
      endDate: weekEndDate,
      assignments: weekAssignments
    });
  }
  
  return result;
}

/**
 * Gets assignments that fall within a specific date range
 * @param assignments All assignments
 * @param dateRange The date range to filter by
 * @returns Assignments within the specified date range
 */
export function getAssignmentsForDateRange(
  assignments: Assignment[], 
  dateRange: DateRange
): Assignment[] {
  return assignments.filter(assignment => {
    // If the assignment has a date, check if it falls within the range
    if (assignment.timeSlot.date) {
      return (
        assignment.timeSlot.date >= dateRange.startDate && 
        assignment.timeSlot.date <= dateRange.endDate
      );
    }
    
    // If it only has a day, we need to check if any date with that day falls within the range
    const day = assignment.timeSlot.day;
    
    // Get all dates in the range
    const allDates = eachDayOfInterval({
      start: dateRange.startDate,
      end: dateRange.endDate
    });
    
    // Check if any of these dates corresponds to the assignment's day
    return allDates.some(date => {
      const dateDay = dateToDay(date);
      return dateDay === day;
    });
  });
}

/**
 * Gets the latest date from a set of assignments or defaults to 2 weeks from start
 * @param assignments All assignments in the schedule
 * @param startDate The schedule start date
 * @returns The latest date in the assignments or 2 weeks from start
 */
export function getLatestDateFromAssignments(assignments: Assignment[], startDate: Date): Date {
  let latestDate = addDays(startDate, 14); // Default to 2 weeks
  
  // Check if any assignments have dates later than our default
  for (const assignment of assignments) {
    if (assignment.timeSlot.date && assignment.timeSlot.date > latestDate) {
      latestDate = assignment.timeSlot.date;
    }
  }
  
  return latestDate;
}

/**
 * Enhances assignments with dates based on the schedule's start date
 * @param schedule The schedule to enhance
 * @returns The enhanced schedule with dates added to assignments
 */
export function enhanceAssignmentsWithDates(schedule: Schedule): Schedule {
  if (!schedule.startDate) {
    throw new Error('Schedule must have a start date to enhance assignments');
  }
  
  // Clone the schedule to avoid mutating the original
  const result: Schedule = { 
    ...schedule,
    assignments: [...schedule.assignments]
  };
  
  // Enhance each assignment with a date if it doesn't already have one
  result.assignments = result.assignments.map(assignment => {
    if (!assignment.timeSlot.date) {
      // Clone the assignment to avoid mutating the original
      const enhancedAssignment: Assignment = {
        ...assignment,
        timeSlot: {
          ...assignment.timeSlot,
          date: getDayDate(schedule.startDate, assignment.timeSlot.day)
        }
      };
      return enhancedAssignment;
    }
    return assignment;
  });
  
  return result;
}

/**
 * Determines if a date falls on a school day (Monday-Friday)
 * @param date The date to check
 * @returns True if the date is a school day, false otherwise
 */
export function isSchoolDay(date: Date): boolean {
  const day = getDay(date);
  return day >= 1 && day <= 5; // 1 = Monday, 5 = Friday
}

/**
 * Creates a full schedule for a specific duration, starting from a given date
 * @param baseSchedule The base schedule to replicate
 * @param startDate The start date for the new schedule
 * @param endDate Optional end date (defaults to 4 weeks from start)
 * @returns A new schedule covering the specified date range
 */
export function createScheduleForDateRange(
  baseSchedule: Schedule, 
  startDate: Date,
  endDate: Date = addDays(startDate, 28) // Default to 4 weeks
): Schedule {
  // Create a new schedule
  const newSchedule: Schedule = {
    assignments: [],
    startDate,
    endDate,
    fitness: baseSchedule.fitness,
    hardConstraintViolations: baseSchedule.hardConstraintViolations,
    softConstraintSatisfaction: baseSchedule.softConstraintSatisfaction
  };
  
  // Get all school days in the range
  const schoolDays = eachDayOfInterval({ start: startDate, end: endDate })
    .filter(isSchoolDay);
  
  // For each school day, add the appropriate assignments
  for (const date of schoolDays) {
    const day = dateToDay(date);
    if (!day) continue; // Skip if not a school day (though this shouldn't happen)
    
    // Find assignments for this day in the base schedule
    const dayAssignments = baseSchedule.assignments.filter(a => a.timeSlot.day === day);
    
    // Create new assignments for this specific date
    for (const assignment of dayAssignments) {
      newSchedule.assignments.push({
        classId: assignment.classId,
        timeSlot: {
          day,
          period: assignment.timeSlot.period,
          date,
          isFixed: assignment.timeSlot.isFixed
        }
      });
    }
  }
  
  // Organize into weeks
  return organizeScheduleIntoWeeks(newSchedule);
}
