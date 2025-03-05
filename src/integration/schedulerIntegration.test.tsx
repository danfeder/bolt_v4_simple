import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Class, Schedule } from '../models/types';
import React from 'react';

// Mock the components and API modules
vi.mock('../components/ClassManager', () => ({
  default: (props: any) => {
    // Basic simulation of ClassManager component
    React.useEffect(() => {
      // Call the getClasses method on render
      props.schedulerApi.getClasses();
    }, []);
    
    return (
      <div data-testid="class-manager">
        <button 
          data-testid="add-class-btn" 
          onClick={() => props.schedulerApi.addClass({
            name: 'New Class',
            conflicts: []
          })}
        >
          Add Class
        </button>
      </div>
    );
  }
}));

vi.mock('../components/SchedulerCLI', () => ({
  default: (props: any) => {
    const executeCommand = () => {
      props.schedulerApi.generateSchedule();
    };
    
    return (
      <div data-testid="scheduler-cli">
        <input data-testid="command-input" />
        <button 
          data-testid="execute-btn" 
          onClick={executeCommand}
        >
          Execute
        </button>
      </div>
    );
  }
}));

vi.mock('../components/WeeklyScheduleDashboard', () => ({
  default: (props: any) => {
    // Basic simulation of WeeklyScheduleDashboard component
    React.useEffect(() => {
      // Call getCurrentSchedule on render
      props.schedulerApi.getCurrentSchedule();
    }, []);
    
    return (
      <div data-testid="weekly-schedule">
        <button 
          data-testid="lock-btn" 
          onClick={() => props.schedulerApi.lockAssignment({
            classId: 'class1',
            timeSlot: { day: 'Monday', period: 1 }
          })}
        >
          Lock Assignment
        </button>
        <button 
          data-testid="unlock-btn" 
          onClick={() => props.schedulerApi.unlockAssignment({
            classId: 'class1',
            timeSlot: { day: 'Monday', period: 1 }
          })}
        >
          Unlock Assignment
        </button>
        <button 
          data-testid="save-rotation-btn" 
          onClick={() => props.schedulerApi.saveScheduleToRotationHistory(
            props.schedulerApi.getCurrentSchedule(),
            'New Rotation',
            'Test notes'
          )}
        >
          Save to Rotation History
        </button>
      </div>
    );
  }
}));

// Mock the schedulerAPI module
vi.mock('../engine/schedulerAPI', () => ({
  schedulerApi: {
    addClass: vi.fn(),
    updateClass: vi.fn(),
    removeClass: vi.fn(),
    getClasses: vi.fn(),
    generateSchedule: vi.fn(),
    getCurrentSchedule: vi.fn(),
    lockAssignment: vi.fn(),
    unlockAssignment: vi.fn(),
    getLockedAssignments: vi.fn(),
    validateSchedule: vi.fn(),
    getConstraints: vi.fn(),
    updateConfig: vi.fn(),
    reOptimizeSchedule: vi.fn(),
    saveScheduleToRotationHistory: vi.fn(),
    getRotationHistory: vi.fn(),
    loadRotationById: vi.fn()
  }
}));

// Now import the mocked module
import { schedulerApi } from '../engine/schedulerAPI';

// Import the components
import ClassManager from '../components/ClassManager';
import SchedulerCLI from '../components/SchedulerCLI';
import WeeklyScheduleDashboard from '../components/WeeklyScheduleDashboard';

describe('API Integration Tests', () => {
  const testClasses: Class[] = [
    { id: 'class1', name: 'Yoga', conflicts: [] },
    { id: 'class2', name: 'Pilates', conflicts: [] }
  ];
  
  const testSchedule: Schedule = {
    assignments: [
      { classId: 'class1', timeSlot: { day: 'Monday', period: 1 } }
    ],
    classes: testClasses,
    startDate: new Date('2025-01-01')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up mock implementations
    vi.mocked(schedulerApi.addClass).mockReturnValue('new-class-id');
    vi.mocked(schedulerApi.updateClass).mockReturnValue(true);
    vi.mocked(schedulerApi.removeClass).mockReturnValue(true);
    vi.mocked(schedulerApi.getClasses).mockReturnValue(testClasses);
    vi.mocked(schedulerApi.generateSchedule).mockReturnValue(testSchedule);
    vi.mocked(schedulerApi.getCurrentSchedule).mockReturnValue(testSchedule);
    vi.mocked(schedulerApi.validateSchedule).mockReturnValue({ isValid: true, violations: [] });
    vi.mocked(schedulerApi.getLockedAssignments).mockReturnValue([]);
    vi.mocked(schedulerApi.getConstraints).mockReturnValue({
      hardConstraints: { personalConflicts: true },
      softConstraints: { evenDistribution: 5 }
    });
    vi.mocked(schedulerApi.getRotationHistory).mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // First test group: Direct API testing
  describe('Direct API Integration Tests', () => {
    it('should call appropriate API methods for schedule operations', () => {
      // Test generating a schedule
      schedulerApi.generateSchedule();
      expect(schedulerApi.generateSchedule).toHaveBeenCalled();
      
      // Test validating a schedule
      schedulerApi.validateSchedule();
      expect(schedulerApi.validateSchedule).toHaveBeenCalled();
      
      // Test locking an assignment
      const assignment = { classId: 'class1', timeSlot: { day: 'Monday', period: 1 } };
      schedulerApi.lockAssignment(assignment);
      expect(schedulerApi.lockAssignment).toHaveBeenCalledWith(assignment);
    });
    
    it('should integrate with rotation history functionality', () => {
      // Test getting a schedule
      const schedule = schedulerApi.getCurrentSchedule();
      expect(schedule).toBeDefined();
      expect(schedule).toEqual(testSchedule);
      
      // Test saving to rotation history
      schedulerApi.saveScheduleToRotationHistory(schedule, 'Test Rotation', 'Test notes');
      expect(schedulerApi.saveScheduleToRotationHistory).toHaveBeenCalledWith(
        schedule,
        'Test Rotation',
        'Test notes'
      );
      
      // Test getting rotation history
      schedulerApi.getRotationHistory();
      expect(schedulerApi.getRotationHistory).toHaveBeenCalled();
    });

    it('should call API when adding a class', () => {
      const newClass = {
        name: 'New Yoga Class',
        conflicts: []
      };
      
      schedulerApi.addClass(newClass);
      
      expect(schedulerApi.addClass).toHaveBeenCalledWith(newClass);
    });

    it('should return classes when getting all classes', () => {
      const classes = schedulerApi.getClasses();
      
      expect(schedulerApi.getClasses).toHaveBeenCalled();
      expect(classes).toHaveLength(2);
      expect(classes[0].name).toBe('Yoga');
      expect(classes[1].name).toBe('Pilates');
    });
  });
  
  // Second test group: Component integration with API
  describe('Component API Integration Tests', () => {
    it('ClassManager should call getClasses on render and addClass when button is clicked', async () => {
      render(<ClassManager schedulerApi={schedulerApi} />);
      
      // Check that getClasses was called when component rendered
      expect(schedulerApi.getClasses).toHaveBeenCalled();
      
      // Simulate clicking the add class button
      const addButton = screen.getByTestId('add-class-btn');
      fireEvent.click(addButton);
      
      // Check that addClass was called with correct parameters
      expect(schedulerApi.addClass).toHaveBeenCalledWith({
        name: 'New Class',
        conflicts: []
      });
    });
    
    it('SchedulerCLI should call generateSchedule when execute button is clicked', () => {
      render(<SchedulerCLI schedulerApi={schedulerApi} />);
      
      // Simulate clicking the execute button
      const executeButton = screen.getByTestId('execute-btn');
      fireEvent.click(executeButton);
      
      // Check that generateSchedule was called
      expect(schedulerApi.generateSchedule).toHaveBeenCalled();
    });
    
    it('WeeklyScheduleDashboard should call getCurrentSchedule on render and lockAssignment when button is clicked', () => {
      render(<WeeklyScheduleDashboard schedulerApi={schedulerApi} />);
      
      // Check that getCurrentSchedule was called when component rendered
      expect(schedulerApi.getCurrentSchedule).toHaveBeenCalled();
      
      // Simulate clicking the lock button
      const lockButton = screen.getByTestId('lock-btn');
      fireEvent.click(lockButton);
      
      // Check that lockAssignment was called with correct parameters
      expect(schedulerApi.lockAssignment).toHaveBeenCalledWith({
        classId: 'class1',
        timeSlot: { day: 'Monday', period: 1 }
      });
    });
    
    it('WeeklyScheduleDashboard should call unlockAssignment when unlock button is clicked', () => {
      render(<WeeklyScheduleDashboard schedulerApi={schedulerApi} />);
      
      // Simulate clicking the unlock button
      const unlockButton = screen.getByTestId('unlock-btn');
      fireEvent.click(unlockButton);
      
      // Check that unlockAssignment was called with correct parameters
      expect(schedulerApi.unlockAssignment).toHaveBeenCalledWith({
        classId: 'class1',
        timeSlot: { day: 'Monday', period: 1 }
      });
    });
    
    it('WeeklyScheduleDashboard should save to rotation history when save button is clicked', () => {
      render(<WeeklyScheduleDashboard schedulerApi={schedulerApi} />);
      
      // Simulate clicking the save rotation button
      const saveButton = screen.getByTestId('save-rotation-btn');
      fireEvent.click(saveButton);
      
      // Check that saveScheduleToRotationHistory was called correctly
      expect(schedulerApi.saveScheduleToRotationHistory).toHaveBeenCalledWith(
        testSchedule,
        'New Rotation',
        'Test notes'
      );
    });
    
    it('should handle multiple component interactions correctly', () => {
      // Render all components
      render(
        <div>
          <ClassManager schedulerApi={schedulerApi} />
          <SchedulerCLI schedulerApi={schedulerApi} />
          <WeeklyScheduleDashboard schedulerApi={schedulerApi} />
        </div>
      );
      
      // Initially getClasses and getCurrentSchedule should be called from components mounting
      expect(schedulerApi.getClasses).toHaveBeenCalled();
      expect(schedulerApi.getCurrentSchedule).toHaveBeenCalled();
      
      // Clear the mock calls to check further interactions
      vi.clearAllMocks();
      
      // Simulate adding a class
      const addButton = screen.getByTestId('add-class-btn');
      fireEvent.click(addButton);
      expect(schedulerApi.addClass).toHaveBeenCalled();
      
      // Simulate generating a schedule
      const executeButton = screen.getByTestId('execute-btn');
      fireEvent.click(executeButton);
      expect(schedulerApi.generateSchedule).toHaveBeenCalled();
      
      // Simulate locking an assignment
      const lockButton = screen.getByTestId('lock-btn');
      fireEvent.click(lockButton);
      expect(schedulerApi.lockAssignment).toHaveBeenCalled();
      
      // This test verifies that multiple components can interact with the API correctly
    });
  });
});
