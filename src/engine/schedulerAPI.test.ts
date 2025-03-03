import { describe, it, expect, beforeEach } from 'vitest';
import { SchedulerAPI } from './schedulerAPI';
import { Day, Period, Schedule } from '../models/types';

describe('SchedulerAPI', () => {
  let api: SchedulerAPI;

  beforeEach(() => {
    api = new SchedulerAPI({
      populationSize: 20,  // Smaller values for faster tests
      generations: 10,
      tournamentSize: 3,
      crossoverRate: 0.8,
      mutationRate: 0.2
    });
  });

  it('should add a class', () => {
    const id = api.addClass({
      name: 'Test Class',
      conflicts: []
    });

    expect(id).toBeDefined();
    expect(api.getClasses()).toHaveLength(1);
    expect(api.getClasses()[0].name).toBe('Test Class');
  });

  it('should update a class', () => {
    const id = api.addClass({
      name: 'Test Class',
      conflicts: []
    });

    const updated = api.updateClass(id, {
      name: 'Updated Test Class'
    });

    expect(updated).toBe(true);
    expect(api.getClasses()[0].name).toBe('Updated Test Class');
  });

  it('should remove a class', () => {
    const id = api.addClass({
      name: 'Test Class',
      conflicts: []
    });

    const removed = api.removeClass(id);

    expect(removed).toBe(true);
    expect(api.getClasses()).toHaveLength(0);
  });

  it('should add class conflicts', () => {
    const id = api.addClass({
      name: 'Test Class',
      conflicts: []
    });

    const conflict = {
      day: Day.MONDAY,
      period: 3 as Period
    };

    const added = api.addClassConflict(id, conflict);

    expect(added).toBe(true);
    expect(api.getClasses()[0].conflicts).toHaveLength(1);
    expect(api.getClasses()[0].conflicts[0].day).toBe(Day.MONDAY);
    expect(api.getClasses()[0].conflicts[0].period).toBe(3);
  });

  it('should generate random test data', () => {
    const count = 10;
    const ids = api.generateRandomTestData(count);

    expect(ids).toHaveLength(count);
    expect(api.getClasses()).toHaveLength(count);
    
    // Check that each class has some conflicts
    for (const classObj of api.getClasses()) {
      expect(classObj.conflicts.length).toBeGreaterThan(0);
    }
  });

  it('should throw an error when trying to generate a schedule with no classes', () => {
    expect(() => api.generateSchedule()).toThrow();
  });

  it('should generate a schedule with random test data', () => {
    api.generateRandomTestData(10);
    
    const schedule = api.generateSchedule();
    
    expect(schedule).toBeDefined();
    expect(schedule.assignments).toBeDefined();
    expect(schedule.assignments.length).toBe(10); // Each class should be assigned once
  });

  it('should validate a schedule', () => {
    api.generateRandomTestData(10);
    const schedule = api.generateSchedule();
    
    const validation = api.validateSchedule(schedule);
    
    expect(validation).toBeDefined();
    expect(typeof validation.isValid).toBe('boolean');
    expect(typeof validation.hardConstraintViolations).toBe('number');
    expect(Array.isArray(validation.violationDetails)).toBe(true);
  });

  it('should update configuration', () => {
    api.updateConfig({
      populationSize: 50,
      generations: 20
    });
    
    // We can't directly test the internal config, but we can generate
    // a schedule to make sure it doesn't throw an error
    api.generateRandomTestData(5);
    const schedule = api.generateSchedule();
    expect(schedule).toBeDefined();
  });
  
  describe('re-optimization', () => {
    it('should re-optimize a schedule while preserving locked assignments', () => {
      // Generate test data
      const classIds = api.generateRandomTestData(10);
      
      // Generate an initial schedule
      const initialSchedule = api.generateSchedule();
      
      // Choose some assignments to lock
      const lockedAssignmentIds = [classIds[0], classIds[2], classIds[5]];
      
      // Save the positions of locked assignments before re-optimization
      const lockedAssignmentsPositions = initialSchedule.assignments
        .filter(a => lockedAssignmentIds.includes(a.classId))
        .map(a => ({
          classId: a.classId,
          timeSlot: { ...a.timeSlot }
        }));
      
      // Re-optimize
      const reOptimizedSchedule = api.reOptimizeSchedule(lockedAssignmentIds);
      
      // Check that locked assignments remained in the same positions
      for (const lockedAssignment of lockedAssignmentsPositions) {
        const reOptimizedAssignment = reOptimizedSchedule.assignments.find(
          a => a.classId === lockedAssignment.classId
        );
        
        expect(reOptimizedAssignment).toBeDefined();
        expect(reOptimizedAssignment?.timeSlot.day).toBe(lockedAssignment.timeSlot.day);
        expect(reOptimizedAssignment?.timeSlot.period).toBe(lockedAssignment.timeSlot.period);
      }
      
      // Check that all classes are still scheduled
      expect(reOptimizedSchedule.assignments.length).toBe(10);
      
      // We should have a current schedule that matches the re-optimized one
      expect(api.getCurrentSchedule()).toEqual(reOptimizedSchedule);
    });
    
    it('should throw an error if there is no schedule to re-optimize', () => {
      // Generate classes but don't generate a schedule
      api.generateRandomTestData(5);
      
      expect(() => api.reOptimizeSchedule([])).toThrow('No schedule available for re-optimization');
    });
    
    it('should throw an error if there are no classes to re-optimize', () => {
      // Don't generate any classes
      expect(() => api.reOptimizeSchedule([])).toThrow('No classes to re-optimize');
    });
    
    it('should accept an optional schedule parameter', () => {
      // Generate test data
      const classIds = api.generateRandomTestData(5);
      
      // Generate a schedule
      const initialSchedule = api.generateSchedule();
      
      // Create a modified schedule (for example, after manual adjustment)
      const modifiedSchedule: Schedule = {
        ...initialSchedule,
        assignments: [...initialSchedule.assignments] // Make a copy of assignments
      };
      
      // Choose assignments to lock
      const lockedAssignmentIds = [classIds[0]];
      
      // Re-optimize with the provided schedule
      const reOptimizedSchedule = api.reOptimizeSchedule(lockedAssignmentIds, modifiedSchedule);
      
      // Verify the result
      expect(reOptimizedSchedule).toBeDefined();
      expect(reOptimizedSchedule.assignments.length).toBe(5);
      
      // The locked assignment should be preserved
      const lockedAssignment = modifiedSchedule.assignments.find(a => a.classId === classIds[0]);
      const reOptimizedLockedAssignment = reOptimizedSchedule.assignments.find(a => a.classId === classIds[0]);
      
      expect(reOptimizedLockedAssignment).toBeDefined();
      expect(reOptimizedLockedAssignment?.timeSlot.day).toBe(lockedAssignment?.timeSlot.day);
      expect(reOptimizedLockedAssignment?.timeSlot.period).toBe(lockedAssignment?.timeSlot.period);
    });
  });
});
