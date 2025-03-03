import { describe, it, expect, beforeEach } from 'vitest';
import { GeneticAlgorithm } from './geneticAlgorithm';
import { Class, Day } from '../models/types';

describe('GeneticAlgorithm', () => {
  // Test data
  const testClasses: Class[] = [
    {
      id: 'class1',
      name: 'Yoga',
      instructor: 'Instructor 1',
      conflicts: []
    },
    {
      id: 'class2',
      name: 'Pilates',
      instructor: 'Instructor 2',
      conflicts: []
    },
    {
      id: 'class3',
      name: 'CrossFit',
      instructor: 'Instructor 3',
      conflicts: []
    },
    {
      id: 'class4',
      name: 'Zumba',
      instructor: 'Instructor 1', // Same instructor as class1
      conflicts: []
    }
  ];
  
  const config = {
    populationSize: 20,
    generations: 5,
    tournamentSize: 3,
    crossoverRate: 0.8,
    mutationRate: 0.2
  };
  
  let ga: GeneticAlgorithm;
  
  beforeEach(() => {
    ga = new GeneticAlgorithm(testClasses, config);
  });
  
  describe('initialization', () => {
    it('should create an initial population of the correct size', () => {
      expect(ga.getPopulation().size).toBe(config.populationSize);
    });
    
    it('should evaluate fitness of initial population', () => {
      const bestChromosome = ga.getBestChromosome();
      const stats = ga.getStatistics();
      expect(stats.bestFitness).toBeGreaterThan(0);
    });
  });
  
  describe('evolution', () => {
    it('should advance the generation counter with each evolution step', () => {
      expect(ga.getCurrentGeneration()).toBe(0);
      
      ga.nextGeneration();
      expect(ga.getCurrentGeneration()).toBe(1);
      
      ga.nextGeneration();
      expect(ga.getCurrentGeneration()).toBe(2);
    });
    
    it('should improve fitness over generations', () => {
      const initialBest = ga.getBestChromosome().getFitness();
      
      // Run for a few generations
      ga.evolve();
      
      const finalBest = ga.getBestChromosome().getFitness();
      expect(finalBest).toBeGreaterThanOrEqual(initialBest);
    });
  });
  
  describe('statistics', () => {
    it('should provide statistics about the population', () => {
      const stats = ga.getStatistics();
      
      expect(stats).toHaveProperty('generation', 0);
      expect(stats).toHaveProperty('bestFitness');
      expect(stats).toHaveProperty('averageFitness');
      expect(stats).toHaveProperty('worstFitness');
      expect(stats).toHaveProperty('populationSize', config.populationSize);
      expect(stats).toHaveProperty('hardConstraintViolations');
    });
  });
  
  describe('best chromosome', () => {
    it('should track the best chromosome across generations', () => {
      // Run for a few generations
      for (let i = 0; i < 3; i++) {
        ga.nextGeneration();
      }
      
      const bestChromosome = ga.getBestChromosome();
      
      // Check that all classes have assignments
      for (const cls of testClasses) {
        const assignment = bestChromosome.getAssignmentForClass(cls.id);
        expect(assignment).toBeDefined();
        expect(assignment?.timeSlot).toBeDefined();
      }
    });
  });
  
  describe('full evolution', () => {
    it('should complete full evolution for specified generations', () => {
      const result = ga.evolve();
      
      // Should run for the specified number of generations
      expect(ga.getCurrentGeneration()).toBe(config.generations);
      
      // Result should be a valid chromosome with assignments for all classes
      expect(result).toBeDefined();
      
      // Check that all classes have assignments
      for (const cls of testClasses) {
        const assignment = result.getAssignmentForClass(cls.id);
        expect(assignment).toBeDefined();
        expect(assignment?.timeSlot).toBeDefined();
      }
    });
  });
});
