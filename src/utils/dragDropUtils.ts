import { Day, Period, Class, TimeSlot, Schedule, Assignment } from '../models/types';
import { isSameDay } from 'date-fns';

/**
 * Utility functions for drag and drop operations in the schedule
 */

/**
 * Validates whether a class can be moved to a specific time slot
 * @param classId ID of the class to move
 * @param targetTimeSlot The target time slot (with optional date)
 * @param schedule Current schedule
 * @param classes All available classes
 * @returns Validation result with details
 */
export const validateClassMove = (
  classId: string,
  targetTimeSlot: TimeSlot,
  schedule: Schedule,
  classes: Class[]
): { 
  isValid: boolean; 
  reason?: string;
  conflictDetails?: {
    type: 'OCCUPIED' | 'CLASS_CONFLICT';
    conflictingClass?: string;
    conflictDescription?: string;
  }
} => {
  // Destructure the target time slot for convenience
  const { day, period, date } = targetTimeSlot;
  
  // Check if the class exists
  const classObj = classes.find(c => c.id === classId);
  if (!classObj) {
    return {
      isValid: false,
      reason: 'Class not found'
    };
  }
  
  // Check if the time slot is already occupied
  const existingAssignment = schedule.assignments.find(assignment => {
    // Skip the assignment for the class being moved
    if (assignment.classId === classId) return false;
    
    // If both time slots have dates, compare dates precisely
    if (date && assignment.timeSlot.date) {
      return isSameDay(new Date(assignment.timeSlot.date), new Date(date)) &&
             assignment.timeSlot.period === period;
    }
    
    // Otherwise, fall back to day and period comparison
    return assignment.timeSlot.day === day && assignment.timeSlot.period === period;
  });
  
  if (existingAssignment) {
    const conflictingClass = classes.find(c => c.id === existingAssignment.classId);
    const conflictingClassName = conflictingClass ? conflictingClass.name : 'Unknown class';
    return {
      isValid: false,
      reason: `Time slot already occupied by ${conflictingClassName}`,
      conflictDetails: {
        type: 'OCCUPIED',
        conflictingClass: conflictingClassName,
        conflictDescription: `${conflictingClassName} is already scheduled in this time slot`
      }
    };
  }
  
  // Check if this time slot conflicts with the class's conflicts
  const hasConflict = classObj.conflicts.some(conflict => {
    // If both time slots have dates, compare dates precisely
    if (date && conflict.date) {
      return conflict.period === period && isSameDay(new Date(conflict.date), new Date(date));
    }
    
    // Otherwise, fall back to day and period comparison
    return conflict.day === day && conflict.period === period;
  });
  
  if (hasConflict) {
    return { 
      isValid: false, 
      reason: `${classObj.name} has a scheduling conflict during this time slot`,
      conflictDetails: {
        type: 'CLASS_CONFLICT',
        conflictDescription: `${classObj.name} has a constraint that prevents scheduling during this time`
      }
    };
  }
  
  // Additional check: look for other scheduling constraints
  // (This is a placeholder for future enhanced constraint checks)
  
  // If we're here, the slot is free
  return { isValid: true };
};

/**
 * Moves a class to a new time slot in the schedule
 * @param schedule The current schedule
 * @param classId The class to move
 * @param targetTimeSlot The target time slot
 * @returns Updated schedule
 */
export const moveClassInSchedule = (
  schedule: Schedule,
  classId: string,
  targetTimeSlot: TimeSlot
): Schedule => {
  // Create a new assignments array with the class moved to the new time slot
  const updatedAssignments = schedule.assignments.map(assignment => {
    if (assignment.classId === classId) {
      return {
        ...assignment,
        timeSlot: targetTimeSlot
      };
    }
    return assignment;
  });
  
  // Return a new schedule object with the updated assignments
  return {
    ...schedule,
    assignments: updatedAssignments
  };
};

/**
 * Gets a tooltip message for a drop operation
 * @param isValid Whether the drop is valid
 * @param reason Optional reason why the drop is invalid
 * @param details Optional conflict details
 * @returns Tooltip message
 */
export const getDropTooltip = (
  isValid: boolean, 
  reason?: string,
  details?: {
    type: 'OCCUPIED' | 'CLASS_CONFLICT';
    conflictingClass?: string;
    conflictDescription?: string;
  }
): string => {
  if (isValid) {
    return 'Drop here to assign class to this time slot';
  }
  
  // If we have detailed conflict information, use that
  if (details?.conflictDescription) {
    return details.conflictDescription;
  }
  
  // Otherwise use the reason or a generic message
  return reason || 'Cannot assign class to this time slot';
};
