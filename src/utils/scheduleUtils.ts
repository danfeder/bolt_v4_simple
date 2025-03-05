import { 
  addDays, 
  getDay, 
  isSameDay, 
  startOfWeek, 
  endOfWeek, 
  format, 
  isWithinInterval,
  parseISO 
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
export function getDayDate(startDate: Date | string, day: Day): Date {
  if (day === "Unassigned") {
    return new Date(0); // Return epoch time for unassigned days
  }
  
  // Parse date string if needed
  const parsedStartDate = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  
  const dayOffset = dayEnumToNumber[day] - 1; // -1 because we start from Monday (offset 0)
  return addDays(parsedStartDate, dayOffset);
}

/**
 * Get the Monday of the current week
 * @param date A date within the week
 * @returns The Monday of that week
 */
export const getWeekStart = (date: Date | string): Date => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return startOfWeek(parsedDate, { weekStartsOn: 1 }); // 1 = Monday
};

/**
 * Get the Friday of the current week
 * @param date A date within the week
 * @returns The Friday of that week
 */
export const getWeekEnd = (date: Date | string): Date => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  // Get Friday (5) of the week (Monday is 1)
  return addDays(startOfWeek(parsedDate, { weekStartsOn: 1 }), 4);
};

/**
 * Format a date as MM/DD/YYYY
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDateFull(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, 'MM/dd/yyyy');
};

/**
 * Organize a schedule into weekly rotations
 * @param schedule The schedule to organize
 * @returns Schedule object with weeks property
 */
export const organizeScheduleIntoWeeks = (schedule: Schedule): Schedule => {
  console.log('organizeScheduleIntoWeeks called with schedule:', schedule);
  
  if (!schedule.startDate) {
    console.error('Schedule must have a start date');
    return { ...schedule, weeks: [] };
  }
  
  // Parse start date if it's a string
  const parsedStartDate = typeof schedule.startDate === 'string' 
    ? parseISO(schedule.startDate) 
    : schedule.startDate;
  
  console.log('Using parsed start date:', parsedStartDate);
  
  // Use specified number of weeks or default to 1
  const numberOfWeeks = schedule.numberOfWeeks || 1;
  const weeks: RotationWeek[] = [];
  
  for (let i = 0; i < numberOfWeeks; i++) {
    const weekStartDate = addDays(parsedStartDate, i * 7);
    const weekEndDate = addDays(weekStartDate, 4); // Monday to Friday
    
    weeks.push({
      weekNumber: i + 1,
      startDate: weekStartDate,
      endDate: weekEndDate,
      assignments: [] // Will populate with assignments in this week's date range
    });
  }
  
  console.log('Created empty weeks:', weeks.length);
  
  // Populate assignments into weeks
  if (schedule.assignments && Array.isArray(schedule.assignments)) {
    console.log('Processing assignments:', schedule.assignments.length);
    let assignmentsPlaced = 0;
    
    schedule.assignments.forEach(assignment => {
      if (assignment.timeSlot.date) {
        // Parse assignment date if it's a string
        const assignmentDate = typeof assignment.timeSlot.date === 'string'
          ? parseISO(assignment.timeSlot.date)
          : assignment.timeSlot.date;
        
        // Find the week this assignment belongs to
        const weekIndex = weeks.findIndex(week => 
          isWithinInterval(assignmentDate, {
            start: week.startDate,
            end: week.endDate
          })
        );
        
        if (weekIndex !== -1) {
          weeks[weekIndex].assignments.push(assignment);
          assignmentsPlaced++;
        } else {
          console.warn(`Assignment date ${assignmentDate} doesn't fit in any week`);
        }
      } else {
        // For assignments without dates, distribute across all weeks
        weeks.forEach(week => {
          if (week.weekNumber >= 1 && week.weekNumber <= weeks.length) {
            weeks[week.weekNumber - 1].assignments.push(assignment);
            assignmentsPlaced++;
          }
        });
      }
    });
    
    console.log(`Placed ${assignmentsPlaced} assignments into weeks`);
  }
  
  // Calculate the end date as the end of the last week
  const endDate = weeks.length > 0 
    ? weeks[weeks.length - 1].endDate 
    : addDays(parsedStartDate, 4);
    
  console.log(`Created ${weeks.length} weeks, with endDate ${endDate}`);
  
  // Return enriched schedule object
  const finalSchedule = {
    ...schedule,
    weeks,
    endDate,
    numberOfWeeks
  };
  
  return finalSchedule;
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
 * @param scheduleOrAssignments Array of assignments to enhance with dates or a Schedule object
 * @param startDateOverride Optional start date to use as reference (required if providing an array of assignments)
 * @returns Array of assignments with added date properties or updated Schedule object
 */
export const enhanceAssignmentsWithDates = (
  scheduleOrAssignments: Schedule | Assignment[], 
  startDateOverride?: Date | string
): Schedule | Assignment[] => {
  let assignments: Assignment[];
  let startDate: Date;
  let isSchedule = false;
  let originalSchedule: Schedule | null = null;
  
  if ('assignments' in scheduleOrAssignments) {
    // If a Schedule object was passed
    isSchedule = true;
    originalSchedule = scheduleOrAssignments;
    assignments = scheduleOrAssignments.assignments;
    
    // Handle string dates in the schedule or override
    if (startDateOverride) {
      startDate = typeof startDateOverride === 'string' ? parseISO(startDateOverride) : startDateOverride;
    } else {
      const scheduleStartDate = scheduleOrAssignments.startDate;
      startDate = typeof scheduleStartDate === 'string' ? parseISO(scheduleStartDate) : scheduleStartDate;
    }
  } else {
    // If an array of assignments was passed
    assignments = scheduleOrAssignments;
    if (!startDateOverride) {
      throw new Error('startDate is required when providing an array of assignments');
    }
    startDate = typeof startDateOverride === 'string' ? parseISO(startDateOverride) : startDateOverride;
  }
  
  const enhancedAssignments = assignments.map(assignment => {
    // Skip if the assignment already has a date
    if (assignment.timeSlot.date) {
      return assignment;
    }
    
    const { day } = assignment.timeSlot;
    const date = getDayDate(startDate, day as Day); // getDayDate now handles string dates
    
    return {
      ...assignment,
      timeSlot: {
        ...assignment.timeSlot,
        date
      }
    };
  });
  
  // Return a full Schedule object if that's what was passed in
  if (isSchedule && originalSchedule) {
    return {
      ...originalSchedule,
      assignments: enhancedAssignments
    };
  }
  
  return enhancedAssignments;
};

/**
 * Create a schedule for a specific date range
 * @param baseScheduleOrStartDate The base schedule to clone or the start date for the new schedule
 * @param startDateOrEndDate The start date of the new schedule (if base schedule provided) or the end date (if start date provided)
 * @param endDate Optional end date when base schedule is provided
 * @returns A new empty schedule with the specified date range
 */
export const createScheduleForDateRange = (
  baseScheduleOrStartDate: Schedule | Date | string,
  startDateOrEndDate?: Date | string,
  endDate?: Date | string
): Schedule => {
  let startDate: Date;
  let calculatedEndDate: Date;
  let baseAssignments: Assignment[] = [];
  
  // Determine if we're working with a base schedule or just dates
  if (baseScheduleOrStartDate instanceof Date || typeof baseScheduleOrStartDate === 'string') {
    // Handle first parameter as date
    startDate = typeof baseScheduleOrStartDate === 'string' ? parseISO(baseScheduleOrStartDate) : baseScheduleOrStartDate;
    
    // Handle second parameter as end date or use default
    if (startDateOrEndDate) {
      calculatedEndDate = typeof startDateOrEndDate === 'string' ? parseISO(startDateOrEndDate) : startDateOrEndDate;
    } else {
      calculatedEndDate = addDays(startDate, 4); // Default to 5-day week (Mon-Fri)
    }
  } else {
    // We have a base schedule
    baseAssignments = [...baseScheduleOrStartDate.assignments];
    
    // Handle start date from parameter or from schedule
    if (startDateOrEndDate) {
      startDate = typeof startDateOrEndDate === 'string' ? parseISO(startDateOrEndDate) : startDateOrEndDate;
    } else {
      const scheduleStartDate = baseScheduleOrStartDate.startDate;
      startDate = typeof scheduleStartDate === 'string' ? parseISO(scheduleStartDate) : scheduleStartDate;
    }
    
    // Handle end date from parameter or calculate it
    if (endDate) {
      calculatedEndDate = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    } else {
      calculatedEndDate = addDays(startDate, 4);
    }
  }
  
  const daysDiff = Math.ceil(
    (calculatedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const numberOfWeeks = Math.ceil(daysDiff / 7);
  
  // Create new assignments by cloning the base ones but with updated dates
  let newAssignments: Assignment[] = [];
  if (baseAssignments.length > 0) {
    // For each week in the range, duplicate the assignments
    for (let week = 0; week < numberOfWeeks; week++) {
      const weekStartDate = addDays(startDate, week * 7);
      
      // Clone and update assignments with new dates for this week
      const weekAssignments = baseAssignments.map(assignment => ({
        ...assignment,
        timeSlot: {
          ...assignment.timeSlot,
          date: undefined // Reset date to be calculated based on new start date
        }
      }));
      
      // Apply dates based on this week's start date
      const datedAssignments = enhanceAssignmentsWithDates(weekAssignments, weekStartDate) as Assignment[];
      newAssignments = [...newAssignments, ...datedAssignments];
    }
  }
  
  // Create the schedule with all the assignments
  const newSchedule: Schedule = {
    id: `schedule-${Date.now()}`,
    assignments: newAssignments,
    startDate,
    endDate: calculatedEndDate,
    numberOfWeeks
  };
  
  // Organize the schedule into weeks
  return organizeScheduleIntoWeeks(newSchedule);
};
