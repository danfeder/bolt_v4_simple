import localforage from 'localforage';
import { Class, Schedule, SchedulingConstraints } from '../models/types';

// Initialize storage
localforage.config({
  name: 'gym-scheduler',
  storeName: 'gym-scheduler-store'
});

// Storage keys
export const STORAGE_KEYS = {
  CLASSES: 'classes',
  CONSTRAINTS: 'constraints',
  SCHEDULES: 'schedules',
  CURRENT_SCHEDULE: 'current-schedule'
};

/**
 * Save classes to local storage
 * @param classes Array of class objects
 */
export async function saveClasses(classes: Class[]): Promise<void> {
  await localforage.setItem(STORAGE_KEYS.CLASSES, classes);
}

/**
 * Load classes from local storage
 * @returns Array of class objects or null if not found
 */
export async function loadClasses(): Promise<Class[] | null> {
  return localforage.getItem<Class[]>(STORAGE_KEYS.CLASSES);
}

/**
 * Save constraints to local storage
 * @param constraints Scheduling constraints
 */
export async function saveConstraints(constraints: SchedulingConstraints): Promise<void> {
  await localforage.setItem(STORAGE_KEYS.CONSTRAINTS, constraints);
}

/**
 * Load constraints from local storage
 * @returns Scheduling constraints or null if not found
 */
export async function loadConstraints(): Promise<SchedulingConstraints | null> {
  return localforage.getItem<SchedulingConstraints>(STORAGE_KEYS.CONSTRAINTS);
}

/**
 * Save a schedule to local storage
 * @param schedule Schedule to save
 * @param id Optional ID for the schedule
 */
export async function saveSchedule(schedule: Schedule, id?: string): Promise<void> {
  // Save to current schedule
  await localforage.setItem(STORAGE_KEYS.CURRENT_SCHEDULE, schedule);
  
  if (id) {
    // Save to schedules history
    const schedules = await loadSchedules() || {};
    schedules[id] = schedule;
    await localforage.setItem(STORAGE_KEYS.SCHEDULES, schedules);
  }
}

/**
 * Load the current schedule from local storage
 * @returns Current schedule or null if not found
 */
export async function loadCurrentSchedule(): Promise<Schedule | null> {
  return localforage.getItem<Schedule>(STORAGE_KEYS.CURRENT_SCHEDULE);
}

/**
 * Load all saved schedules from local storage
 * @returns Object with schedule IDs as keys and schedules as values
 */
export async function loadSchedules(): Promise<Record<string, Schedule> | null> {
  return localforage.getItem<Record<string, Schedule>>(STORAGE_KEYS.SCHEDULES);
}

/**
 * Clear all stored data
 */
export async function clearAllData(): Promise<void> {
  await localforage.clear();
}
