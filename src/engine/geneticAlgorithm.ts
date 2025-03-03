import { Chromosome } from './chromosome';
import { GeneticOperators } from './geneticOperators';
import { Population } from './population';
import { FitnessEvaluator } from './fitness';
import { Class, GeneticAlgorithmConfig } from '../models/types';

/**
 * The GeneticAlgorithm class is responsible for running the genetic algorithm
 * and evolving a population of chromosomes to find the best solution.
 */
export class GeneticAlgorithm {
  private population: Population;
  private fitnessEvaluator: FitnessEvaluator;
  private geneticOperators: GeneticOperators;
  private generation: number = 0;
  private bestChromosome: Chromosome | null = null;
  
  /**
   * Creates a new genetic algorithm
   * @param classes List of classes to schedule
   * @param config Configuration for the genetic algorithm
   */
  constructor(
    private classes: Class[],
    private config: GeneticAlgorithmConfig
  ) {
    // Initialize components
    this.fitnessEvaluator = new FitnessEvaluator(classes);
    this.geneticOperators = new GeneticOperators(
      classes,
      config.crossoverRate,
      config.mutationRate
    );
    
    // Create initial population of random chromosomes
    this.population = new Population(
      config.populationSize,
      () => Chromosome.createRandom(classes)
    );
    
    // Evaluate fitness of initial population
    this.evaluatePopulation();
  }
  
  /**
   * Run the genetic algorithm for the specified number of generations
   * @returns The best chromosome found
   */
  evolve(): Chromosome {
    // Run for the specified number of generations
    for (let i = 0; i < this.config.generations; i++) {
      this.nextGeneration();
    }
    
    return this.getBestChromosome();
  }
  
  /**
   * Run the genetic algorithm with a provided initial population
   * This is useful for re-optimization with locked assignments
   * 
   * @param initialPopulation Array of chromosomes to use as the initial population
   * @returns The best chromosome found
   */
  evolveWithInitialPopulation(initialPopulation: Chromosome[]): Chromosome {
    // Initialize the population with the provided chromosomes
    this.population = new Population(
      this.config.populationSize,
      () => Chromosome.createRandom(this.classes)
    );
    this.population.replaceWith(initialPopulation);
    
    // Reset generation counter and best chromosome
    this.generation = 0;
    this.bestChromosome = null;
    
    // Evaluate initial population
    this.evaluatePopulation();
    
    // Run the genetic algorithm
    return this.evolve();
  }
  
  /**
   * Advances the algorithm by one generation
   */
  nextGeneration(): void {
    // Create new population
    const newPopulation: Chromosome[] = [];
    
    // Elitism: keep the best individual(s)
    const eliteCount = Math.max(1, Math.floor(this.population.size * 0.1)); // Keep top 10%
    const elites = this.population.getFittestChromosomes(eliteCount);
    newPopulation.push(...elites);
    
    // Fill the rest of the population with children from crossover and mutation
    while (newPopulation.length < this.population.size) {
      // Select parents using tournament selection
      const parent1 = this.population.tournamentSelection(this.config.tournamentSize);
      const parent2 = this.population.tournamentSelection(this.config.tournamentSize);
      
      // Perform crossover
      let [child1, child2] = this.geneticOperators.crossover(parent1, parent2);
      
      // Perform mutation on children
      child1 = this.geneticOperators.mutate(child1);
      child2 = this.geneticOperators.mutate(child2);
      
      // Add children to new population (if there's space)
      if (newPopulation.length < this.population.size) {
        newPopulation.push(child1);
      }
      
      if (newPopulation.length < this.population.size) {
        newPopulation.push(child2);
      }
    }
    
    // Replace old population with new population
    this.population.replaceWith(newPopulation);
    
    // Evaluate fitness of new population
    this.evaluatePopulation();
    
    // Increment generation counter
    this.generation++;
  }
  
  /**
   * Evaluates fitness for all chromosomes in the population
   */
  private evaluatePopulation(): void {
    // Evaluate each chromosome
    for (const chromosome of this.population.getChromosomes()) {
      const fitness = this.fitnessEvaluator.evaluate(chromosome);
      this.population.updateFitness(chromosome, fitness.fitnessScore);
    }
    
    // Sort population by fitness
    this.population.sortByFitness();
    
    // Update best chromosome
    const currentBest = this.population.getFittestChromosome();
    const currentBestFitness = this.population.getFitness(currentBest);
    
    if (!this.bestChromosome || currentBestFitness > (this.bestChromosome ? this.population.getFitness(this.bestChromosome) : 0)) {
      this.bestChromosome = currentBest.clone();
    }
  }
  
  /**
   * Gets the best chromosome found so far
   * @returns The best chromosome
   */
  getBestChromosome(): Chromosome {
    if (this.bestChromosome) {
      return this.bestChromosome.clone();
    }
    return this.population.getFittestChromosome().clone();
  }
  
  /**
   * Gets the current generation number
   * @returns The current generation
   */
  getCurrentGeneration(): number {
    return this.generation;
  }
  
  /**
   * Gets the current population
   * @returns The current population
   */
  getPopulation(): Population {
    return this.population;
  }
  
  /**
   * Creates a statistics object with information about the current state of the algorithm
   * @returns Statistics object
   */
  getStatistics(): {
    generation: number;
    bestFitness: number;
    averageFitness: number;
    worstFitness: number;
    populationSize: number;
    hardConstraintViolations: number;
  } {
    const chromosomes = this.population.getChromosomes();
    
    // Calculate statistics
    let bestFitness = 0; 
    let worstFitness = Number.MAX_VALUE;
    let fitnessSum = 0;
    
    for (const chromosome of chromosomes) {
      const fitness = this.population.getFitness(chromosome);
      bestFitness = Math.max(bestFitness, fitness);
      worstFitness = Math.min(worstFitness, fitness);
      fitnessSum += fitness;
    }
    
    const averageFitness = chromosomes.length > 0 ? fitnessSum / chromosomes.length : 0;
    const hardConstraintViolations = this.fitnessEvaluator.evaluate(this.getBestChromosome()).hardConstraintViolations;
    
    return {
      generation: this.generation,
      bestFitness,
      averageFitness,
      worstFitness,
      populationSize: this.population.getSize(),
      hardConstraintViolations
    };
  }
}
