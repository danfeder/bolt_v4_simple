import { Day, Period, Class, TimeSlot, Schedule, Assignment } from '../models/types';
import { areTimeSlotsEqual } from './timeSlot';
import { isSameDay } from 'date-fns';

/**
 * Utility functions for drag and drop operations in the schedule
 */

/**
 * Validates if a class can be moved to a specific time slot
 * @param classId ID of the class being moved
 * @param targetDay Target day
 * @param targetPeriod Target period
 * @param schedule Current schedule
 * @param classes List of all classes
 * @returns Object containing validation result and reason if invalid
 */
export const validateClassMove = (
  classId: string,
  targetDay: Day,
  targetPeriod: Period,
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
  // Create a target time slot to check against
  const targetTimeSlot: TimeSlot = { day: targetDay, period: targetPeriod };
  
  // Check if there's already a class in this time slot
  const existingAssignment = schedule.assignments.find(a => {
    const timeSlot = a.timeSlot;
    // Use date if available, otherwise compare day
    if (timeSlot.date) {
      return timeSlot.period === targetPeriod && 
        ((targetTimeSlot.date && isSameDay(timeSlot.date, targetTimeSlot.date)) || 
         timeSlot.day === targetDay);
    }
    return timeSlot.day === targetDay && timeSlot.period === targetPeriod;
  });
  
  if (existingAssignment) {
    // Get the existing class name for better feedback
    const existingClass = classes.find(c => c.id === existingAssignment.classId);
    const existingClassName = existingClass ? existingClass.name : existingAssignment.classId;
    
    return { 
      isValid: false, 
      reason: `Time slot is already occupied by ${existingClassName}`,
      conflictDetails: {
        type: 'OCCUPIED',
        conflictingClass: existingAssignment.classId,
        conflictDescription: `${existingClassName} is already scheduled at this time`
      }
    };
  }
  
  // Get the class being moved
  const classObj = classes.find(c => c.id === classId);
  if (!classObj) {
    return { 
      isValid: false, 
      reason: 'Class not found' 
    };
  }
  
  // Check if this time slot conflicts with the class's conflicts
  const hasConflict = classObj.conflicts.some(conflict => {
    // Use date if available, otherwise compare day
    if (conflict.date && targetTimeSlot.date) {
      return conflict.period === targetPeriod && isSameDay(conflict.date, targetTimeSlot.date);
    }
    return conflict.day === targetDay && conflict.period === targetPeriod;
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
  
  // All checks passed
  return { isValid: true };
};

/**
 * Updates a schedule by moving a class to a new time slot
 * @param schedule Current schedule
 * @param classId ID of the class to move
 * @param targetTimeSlot Target time slot
 * @returns Updated schedule with the class moved
 */
export const moveClassInSchedule = (
  schedule: Schedule,
  classId: string,
  targetTimeSlot: TimeSlot
): Schedule => {
  // Create a copy of the current assignments
  const newAssignments = [...schedule.assignments];
  
  // Find and remove the original assignment
  const originalAssignmentIndex = newAssignments.findIndex(
    a => a.classId === classId
  );
  
  if (originalAssignmentIndex !== -1) {
    newAssignments.splice(originalAssignmentIndex, 1);
  }
  
  // Add the new assignment
  newAssignments.push({
    classId,
    timeSlot: { ...targetTimeSlot }
  });
  
  return {
    ...schedule,
    assignments: newAssignments
  };
};

/**
 * Gets the corresponding tooltip message for a drop validation
 * @param isValid Whether the drop is valid
 * @param reason Reason for invalid drop
 * @param conflictDetails Additional details about the conflict
 * @returns Tooltip message
 */
export const getDropTooltip = (
  isValid: boolean, 
  reason?: string, 
  conflictDetails?: {
    type: 'OCCUPIED' | 'CLASS_CONFLICT';
    conflictingClass?: string;
    conflictDescription?: string;
  }
): string => {
  if (isValid) {
    return 'Drop here to assign class to this time slot';
  }
  
  if (conflictDetails) {
    return conflictDetails.conflictDescription || reason || 'Invalid time slot';
  }
  
  return reason || 'Cannot assign class to this time slot';
};
