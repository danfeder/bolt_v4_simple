import { 
  addDays, 
  getDay, 
  isSameDay, 
  startOfWeek, 
  endOfWeek, 
  format, 
  isWithinInterval 
} from 'date-fns';
import { 
  Schedule, 
  Assignment, 
  TimeSlot, 
  RotationWeek, 
  Day 
} from '../models/types';

/**
 * Maps JavaScript day numbers (0-6, starting with Sunday) to our Day enum
 */
const dayNumberToEnum: Record<number, Day | undefined> = {
  0: undefined, // Sunday - not in our school week
  1: "Monday" as Day,
  2: "Tuesday" as Day,
  3: "Wednesday" as Day,
  4: "Thursday" as Day,
  5: "Friday" as Day,
  6: undefined, // Saturday - not in our school week
};

/**
 * Maps our Day enum values to JavaScript day numbers (0-6, starting with Sunday)
 */
const dayEnumToNumber: Record<Day, number> = {
  "Monday": 1,
  "Tuesday": 2,
  "Wednesday": 3,
  "Thursday": 4,
  "Friday": 5,
  "Unassigned": -1, // Use -1 to indicate unassigned
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
 * @returns The date for the specified day
 */
export function getDayDate(startDate: Date, day: Day): Date {
  if (day === "Unassigned") {
    return new Date(0); // Return epoch time for unassigned days
  }
  const dayOffset = dayEnumToNumber[day] - 1; // -1 because we start from Monday (offset 0)
  return addDays(startDate, dayOffset);
}

/**
 * Get the Monday of the current week
 * @param date A date within the week
 * @returns The Monday of that week
 */
export const getWeekStart = (date: Date): Date => {
  return startOfWeek(date, { weekStartsOn: 1 }); // 1 = Monday
};

/**
 * Get the Friday of the current week
 * @param date A date within the week
 * @returns The Friday of that week
 */
export const getWeekEnd = (date: Date): Date => {
  const end = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
  return addDays(end, -2); // Go back 2 days to Friday
};

/**
 * Format a date as MM/DD/YYYY
 * @param date The date to format
 * @returns Formatted date string
 */
export const formatDateFull = (date: Date): string => {
  return format(date, 'MM/dd/yyyy');
};

/**
 * Organize a schedule into weekly rotations
 * @param schedule The schedule to organize
 * @returns Array of RotationWeek objects
 */
export const organizeScheduleIntoWeeks = (schedule: Schedule): RotationWeek[] => {
  if (!schedule.startDate) {
    console.error('Schedule must have a start date');
    return [];
  }
  
  // Use specified number of weeks or default to 1
  const numberOfWeeks = schedule.numberOfWeeks || 1;
  const weeks: RotationWeek[] = [];
  
  for (let i = 0; i < numberOfWeeks; i++) {
    const weekStartDate = addDays(new Date(schedule.startDate), i * 7);
    const weekEndDate = addDays(weekStartDate, 4); // Monday to Friday
    
    weeks.push({
      weekNumber: i + 1,
      startDate: weekStartDate,
      endDate: weekEndDate,
      assignments: [] // Will populate with assignments in this week's date range
    });
  }
  
  // Populate assignments into weeks
  if (schedule.assignments && Array.isArray(schedule.assignments)) {
    schedule.assignments.forEach(assignment => {
      if (assignment.timeSlot.date) {
        const assignmentDate = new Date(assignment.timeSlot.date);
        
        // Find the week this assignment belongs to
        const weekIndex = weeks.findIndex(week => 
          isWithinInterval(assignmentDate, {
            start: week.startDate,
            end: week.endDate
          })
        );
        
        if (weekIndex !== -1) {
          weeks[weekIndex].assignments.push(assignment);
        }
      } else {
        // For assignments without dates, distribute across all weeks
        weeks.forEach(week => {
          if (week.weekNumber >= 1 && week.weekNumber <= weeks.length) {
            weeks[week.weekNumber - 1].assignments.push(assignment);
          }
        });
      }
    });
  }
  
  return weeks;
};

/**
 * Enhance a schedule by adding dates to assignments
 * @param schedule The original schedule to enhance
 * @returns A new schedule with date-enhanced assignments
 */
export const enhanceScheduleWithDates = (schedule: Schedule): Schedule => {
  if (!schedule.startDate) {
    console.error('Schedule must have a start date');
    return schedule;
  }
  
  const enhancedAssignments = schedule.assignments.map(assignment => {
    // Skip if the assignment already has a date
    if (assignment.timeSlot.date) {
      return assignment;
    }
    
    const { day, period } = assignment.timeSlot;
    const date = getDayDate(new Date(schedule.startDate), day as Day);
    
    return {
      ...assignment,
      timeSlot: {
        ...assignment.timeSlot,
        date
      }
    };
  });
  
  return {
    ...schedule,
    assignments: enhancedAssignments
  };
};

/**
 * Enhances an array of assignments with dates based on a start date
 * @param assignments Array of assignments to enhance with dates
 * @param startDate The start date to use as reference
 * @returns Array of assignments with added date properties
 */
export const enhanceAssignmentsWithDates = (assignments: Assignment[], startDate: Date): Assignment[] => {
  return assignments.map(assignment => {
    // Skip if the assignment already has a date
    if (assignment.timeSlot.date) {
      return assignment;
    }
    
    const { day } = assignment.timeSlot;
    const date = getDayDate(new Date(startDate), day as Day);
    
    return {
      ...assignment,
      timeSlot: {
        ...assignment.timeSlot,
        date
      }
    };
  });
};

/**
 * Create a schedule for a specific date range
 * @param startDate The start date of the schedule
 * @param endDate Optional end date (defaults to 5 days after start date)
 * @returns A new empty schedule with the specified date range
 */
export const createScheduleForDateRange = (startDate: Date, endDate?: Date): Schedule => {
  const calculatedEndDate = endDate || addDays(startDate, 4); // Default to 5-day week (Mon-Fri)
  const daysDiff = Math.ceil((calculatedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const numberOfWeeks = Math.ceil(daysDiff / 7);
  
  return {
    id: `schedule-${Date.now()}`,
    assignments: [],
    startDate,
    endDate: calculatedEndDate,
    numberOfWeeks
  };
};
