/**
 * Core data models for the scheduling application
 */

// Day types
export enum Day {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday'
}

// Period definition (1-8)
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Time slot represents a specific day and period
export interface TimeSlot {
  day: Day;
  period: Period;
  date?: Date; // Add date field for calendar-specific conflicts
}

// Class definition
export interface Class {
  id: string;
  name: string;
  conflicts: TimeSlot[];  // Periods when the class is not available (prep periods)
  preferences?: {
    preferred?: TimeSlot[];
    notPreferred?: TimeSlot[];
  };
}

// Hard constraints
export interface HardConstraints {
  // Weekly prep schedules per class (included in Class.conflicts)
  personalConflicts: TimeSlot[];  // Teacher's personal conflicts
  maxConsecutivePeriods: number;  // Maximum consecutive periods without a break
  dailyMinClasses?: number;       // Minimum classes per day
  dailyMaxClasses?: number;       // Maximum classes per day
  weeklyMinClasses?: number;      // Minimum classes per week
  weeklyMaxClasses?: number;      // Maximum classes per week
  rotationStartDate: Date;        // When the rotation starts
  rotationEndDate?: Date;         // Optional end date constraint
}

// Soft constraints
export interface SoftConstraints {
  // Class preferences included in each Class object
  teacherPreferences: {
    preferred?: TimeSlot[];
    notPreferred?: TimeSlot[];
  };
  balanceWorkload: boolean;       // Whether to balance workload throughout day/week
}

// Combined constraints
export interface SchedulingConstraints {
  hard: HardConstraints;
  soft: SoftConstraints;
}

// Assignment of a class to a time slot
export interface Assignment {
  classId: string;
  timeSlot: TimeSlot;
}

// Complete schedule representation
export interface Schedule {
  assignments: Assignment[];
  fitness?: number;               // Optional fitness score
  hardConstraintViolations?: number; // Number of hard constraint violations
  softConstraintSatisfaction?: number; // Measure of soft constraint satisfaction
  startDate?: Date;               // Optional start date for the schedule
}

// Schedule rotation history entry
export interface ScheduleRotation {
  id: string;                   // Unique identifier for the rotation
  name: string;                 // User-defined name for this rotation
  schedule: Schedule;           // The actual schedule
  createdAt: Date;              // When this rotation was created
  notes?: string;               // Optional notes about this rotation
  classCount?: number;          // Number of classes in this rotation (for quick reference)
}

// Constraint type (hard or soft)
export enum ConstraintType {
  HARD = 'HARD',
  SOFT = 'SOFT'
}

// Constraint definition
export interface Constraint {
  id: string;
  type: ConstraintType;
  description: string;
  parameters?: Record<string, any>;
}

// Configuration for the genetic algorithm
export interface GeneticAlgorithmConfig {
  populationSize: number;
  generations: number;
  tournamentSize: number;
  crossoverRate: number;
  mutationRate: number;
}
