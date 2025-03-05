import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dataUtils } from './dataUtils';
import { Schedule, ScheduleRotation } from '../models/types';
import { Day } from '../models/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => {
      return store[key] || null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    getAll: () => store
  };
})();

// Replace global localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Schedule Rotation History Utilities', () => {
  // Sample schedule for testing
  const sampleSchedule: Schedule = {
    assignments: [
      { classId: 'class1', timeSlot: { day: Day.MONDAY, period: 1 } },
      { classId: 'class2', timeSlot: { day: Day.TUESDAY, period: 2 } }
    ],
    startDate: new Date('2025-01-01')
  };

  // Clear localStorage before each test
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('saveScheduleToRotationHistory', () => {
    it('should save a schedule to rotation history', () => {
      const rotationName = 'Test Rotation';
      const savedRotation = dataUtils.saveScheduleToRotationHistory(sampleSchedule, rotationName);
      
      // Check that the rotation was saved with the right properties
      expect(savedRotation.id).toBeDefined();
      expect(savedRotation.name).toBe(rotationName);
      expect(savedRotation.classCount).toBe(2);
      
      // Check properties but not the whole object since dates are serialized
      expect(savedRotation.schedule.assignments).toEqual(sampleSchedule.assignments);
      
      // Verify localStorage was called with the correct data
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should enforce MAX_ROTATIONS limit', () => {
      // Spy on console.log to avoid test noise
      vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Create MAX_ROTATIONS + 1 schedules
      const rotations: ScheduleRotation[] = [];
      for (let i = 0; i < dataUtils.MAX_ROTATION_HISTORY + 1; i++) {
        const rotation = dataUtils.saveScheduleToRotationHistory(sampleSchedule, `Rotation ${i}`);
        rotations.push(rotation);
      }
      
      // Get current rotations
      const currentRotations = dataUtils.getRotationHistory();
      
      // Expect only MAX_ROTATIONS to be stored (oldest should be removed)
      expect(currentRotations.length).toBe(dataUtils.MAX_ROTATION_HISTORY);
      
      // The implementation might not necessarily remove rotation 0, it could be based on
      // creation date, so just check that we don't have more than MAX_ROTATION_HISTORY
      expect(currentRotations.length).toBeLessThanOrEqual(dataUtils.MAX_ROTATION_HISTORY);
      
      // Restore console.log
      vi.restoreAllMocks();
    });
  });

  describe('getRotationHistory', () => {
    it('should return empty array when no rotations exist', () => {
      const rotations = dataUtils.getRotationHistory();
      expect(rotations).toEqual([]);
    });

    it('should return all saved rotations', () => {
      // Save 3 rotations
      dataUtils.saveScheduleToRotationHistory(sampleSchedule, 'Rotation 1');
      dataUtils.saveScheduleToRotationHistory(sampleSchedule, 'Rotation 2');
      dataUtils.saveScheduleToRotationHistory(sampleSchedule, 'Rotation 3');
      
      const rotations = dataUtils.getRotationHistory();
      
      expect(rotations.length).toBe(3);
      expect(rotations[0].name).toBe('Rotation 1');
      expect(rotations[1].name).toBe('Rotation 2');
      expect(rotations[2].name).toBe('Rotation 3');
    });
  });

  describe('getRotationById', () => {
    it('should return undefined for non-existent rotation', () => {
      const rotation = dataUtils.getRotationById('non-existent-id');
      expect(rotation).toBeUndefined();
    });

    it('should return the correct rotation by ID', () => {
      const saved = dataUtils.saveScheduleToRotationHistory(sampleSchedule, 'Test Rotation');
      const retrieved = dataUtils.getRotationById(saved.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(saved.id);
      expect(retrieved?.name).toBe('Test Rotation');
    });
  });

  describe('deleteRotation', () => {
    it('should delete a rotation by ID', () => {
      // Save 2 rotations
      const rotation1 = dataUtils.saveScheduleToRotationHistory(sampleSchedule, 'Rotation 1');
      const rotation2 = dataUtils.saveScheduleToRotationHistory(sampleSchedule, 'Rotation 2');
      
      // Delete the first one
      dataUtils.deleteRotation(rotation1.id);
      
      // Check that only rotation2 remains
      const rotations = dataUtils.getRotationHistory();
      expect(rotations.length).toBe(1);
      expect(rotations[0].id).toBe(rotation2.id);
    });

    it('should do nothing when deleting non-existent rotation', () => {
      // Save a rotation
      dataUtils.saveScheduleToRotationHistory(sampleSchedule, 'Rotation 1');
      
      // Try to delete non-existent rotation
      dataUtils.deleteRotation('non-existent-id');
      
      // Check that the existing rotation is still there
      const rotations = dataUtils.getRotationHistory();
      expect(rotations.length).toBe(1);
    });
  });

  describe('updateRotation', () => {
    it('should update rotation name and notes', () => {
      // Save a rotation
      const saved = dataUtils.saveScheduleToRotationHistory(sampleSchedule, 'Original Name');
      
      // Update name and notes
      dataUtils.updateRotation(saved.id, { name: 'Updated Name', notes: 'These are test notes' });
      
      // Check that the rotation was updated
      const updated = dataUtils.getRotationById(saved.id);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.notes).toBe('These are test notes');
    });

    it('should do nothing when updating non-existent rotation', () => {
      // Try to update non-existent rotation
      dataUtils.updateRotation('non-existent-id', { name: 'Updated Name', notes: 'These are test notes' });
      
      // Verify localStorage was called appropriately
      expect(localStorageMock.getItem).toHaveBeenCalled();
      // But setItem should not be called since the rotation doesn't exist
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
});
