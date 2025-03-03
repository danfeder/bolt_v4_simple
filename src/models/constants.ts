import { Day } from './types';

// Days of the week
export const DAYS_OF_WEEK: Day[] = [
  Day.Monday,
  Day.Tuesday,
  Day.Wednesday,
  Day.Thursday,
  Day.Friday
];

// Number of periods per day
export const PERIODS_PER_DAY = 8;

// Duration of each period in minutes
export const PERIOD_DURATION_MINUTES = 45;

// Default scheduling constraints
export const DEFAULT_MAX_GENERATIONS = 100;
export const DEFAULT_POPULATION_SIZE = 50;
export const DEFAULT_MUTATION_RATE = 0.1;
export const DEFAULT_CROSSOVER_RATE = 0.8;
