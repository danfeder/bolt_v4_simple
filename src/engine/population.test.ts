import { describe, it, expect, beforeEach } from 'vitest';
import { Population } from './population';
import { Chromosome } from './chromosome';
import { Class } from '../models/types';

describe('Population', () => {
  const testClasses: Class[] = [
    {
      id: 'class1',
      name: 'Yoga',
      conflicts: []
    },
    {
      id: 'class2',
      name: 'Pilates',
      conflicts: []
    }
  ];
  
  let population: Population;
  
  beforeEach(() => {
    // Create a population with 5 chromosomes for testing
    population = new Population(5, () => new Chromosome(testClasses));
  });
  
  describe('initialization', () => {
    it('should create a population of the correct size', () => {
      expect(population.getChromosomes().length).toBe(5);
    });
    
    it('should have unique chromosomes', () => {
      const chromosomes = population.getChromosomes();
      const uniqueChromosomes = new Set(chromosomes);
      expect(uniqueChromosomes.size).toBe(chromosomes.length);
    });
  });
  
  describe('getChromosomes', () => {
    it('should return all chromosomes in the population', () => {
      expect(population.getChromosomes()).toHaveLength(5);
    });
    
    it('should return a copy of the chromosomes array', () => {
      const chromosomes = population.getChromosomes();
      chromosomes.pop(); // Modify the returned array
      expect(population.getChromosomes()).toHaveLength(5); // Original should be unchanged
    });
  });
  
  describe('getSize', () => {
    it('should return the correct population size', () => {
      expect(population.getSize()).toBe(5);
    });
  });
  
  describe('fitness methods', () => {
    it('should update and retrieve fitness scores', () => {
      const chromosome = population.getChromosomes()[0];
      population.updateFitness(chromosome, 0.75);
      expect(population.getFitness(chromosome)).toBeCloseTo(0.75);
    });
    
    it('should return 0 for chromosomes without a fitness score', () => {
      const chromosome = population.getChromosomes()[0];
      expect(population.getFitness(chromosome)).toBe(0);
    });
    
    it('should return the fittest chromosome', () => {
      const chromosomes = population.getChromosomes();
      
      // Set fitness scores
      population.updateFitness(chromosomes[0], 0.5);
      population.updateFitness(chromosomes[1], 0.3);
      population.updateFitness(chromosomes[2], 0.8); // Best
      population.updateFitness(chromosomes[3], 0.1);
      population.updateFitness(chromosomes[4], 0.6);
      
      // Sort by fitness
      population.sortByFitness();
      
      // Get fittest chromosome
      const fittest = population.getFittestChromosome();
      expect(population.getFitness(fittest)).toBeCloseTo(0.8);
    });
    
    it('should return top n fittest chromosomes', () => {
      const chromosomes = population.getChromosomes();
      
      // Set fitness scores
      for (let i = 0; i < chromosomes.length; i++) {
        population.updateFitness(chromosomes[i], i * 0.2); // 0, 0.2, 0.4, 0.6, 0.8
      }
      
      // Sort by fitness
      population.sortByFitness();
      
      // Get top 3 fittest chromosomes
      const top3 = population.getFittestChromosomes(3);
      expect(top3).toHaveLength(3);
      expect(population.getFitness(top3[0])).toBeCloseTo(0.8);
      expect(population.getFitness(top3[1])).toBeCloseTo(0.6);
      expect(population.getFitness(top3[2])).toBeCloseTo(0.4);
    });
  });
  
  describe('addChromosome', () => {
    it('should add a chromosome to a non-full population', () => {
      const smallPopulation = new Population(3, () => new Chromosome(testClasses));
      expect(smallPopulation.getChromosomes()).toHaveLength(3);
      
      const newChromosome = new Chromosome(testClasses);
      smallPopulation.addChromosome(newChromosome, 0.9);
      
      expect(smallPopulation.getChromosomes()).toHaveLength(3);
    });
  });
  
  describe('tournament selection', () => {
    it('should select a chromosome from the population', () => {
      const chromosomes = population.getChromosomes();
      
      // Set fitness scores
      for (let i = 0; i < chromosomes.length; i++) {
        population.updateFitness(chromosomes[i], i * 0.2); // 0, 0.2, 0.4, 0.6, 0.8
      }
      
      // Use a tournament size of 3
      const selected = population.tournamentSelection(3);
      expect(selected).toBeDefined();
      expect(chromosomes).toContain(selected);
    });
    
    it('should handle tournament size larger than population', () => {
      const smallPopulation = new Population(2, () => new Chromosome(testClasses));
      const selected = smallPopulation.tournamentSelection(5); // Larger than population
      expect(selected).toBeDefined();
    });
  });
  
  describe('population replacement', () => {
    it('should replace the population with new chromosomes', () => {
      const newChromosomes = [
        new Chromosome(testClasses),
        new Chromosome(testClasses),
        new Chromosome(testClasses)
      ];
      
      population.replaceWith(newChromosomes);
      
      // Population size should remain the same (5)
      expect(population.getChromosomes()).toHaveLength(5);
      
      // First 3 chromosomes should match the new ones
      const currentChromosomes = population.getChromosomes();
      expect(currentChromosomes.slice(0, 3)).toEqual(newChromosomes);
    });
  });
});
