import { Day, Period, Class, TimeSlot, Schedule, Assignment } from '../models/types';

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
): { isValid: boolean; reason?: string } => {
  // Check if there's already a class in this time slot
  const existingAssignment = schedule.assignments.find(
    a => a.timeSlot.day === targetDay && a.timeSlot.period === targetPeriod
  );
  
  if (existingAssignment) {
    return { 
      isValid: false, 
      reason: `Time slot is already occupied by ${existingAssignment.classId}` 
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
  const hasConflict = classObj.conflicts.some(
    conflict => conflict.day === targetDay && conflict.period === targetPeriod
  );
  
  if (hasConflict) {
    return { 
      isValid: false, 
      reason: 'Class has a conflict during this time slot' 
    };
  }
  
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
    timeSlot: targetTimeSlot
  });
  
  // Create updated schedule
  return {
    ...schedule,
    assignments: newAssignments
  };
};

/**
 * Gets the corresponding tooltip message for a drop validation
 * @param isValid Whether the drop is valid
 * @param reason Reason for invalid drop
 * @returns Tooltip message
 */
export const getDropTooltip = (isValid: boolean, reason?: string): string => {
  if (isValid) {
    return 'Drop here to move class to this time slot';
  }
  
  return reason || 'Cannot move class to this time slot';
};
