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
   * @param fitnessEvaluator Optional custom fitness evaluator
   */
  constructor(
    private classes: Class[],
    private config: GeneticAlgorithmConfig,
    fitnessEvaluator?: FitnessEvaluator
  ) {
    // Initialize components
    this.fitnessEvaluator = fitnessEvaluator || new FitnessEvaluator(classes);
    this.geneticOperators = new GeneticOperators(
      classes,
      config.crossoverRate,
      config.mutationRate
    );
    
    // Get the weekly max classes constraint if it exists
    const constraints = this.fitnessEvaluator.getConstraints();
    const weeklyMaxConstraint = constraints.find(c => c.id === 'max-classes-per-week');
    const maxClassesPerWeek = weeklyMaxConstraint?.parameters?.maxClasses as number || classes.length;
    
    // Create initial population of random chromosomes
    this.population = new Population(
      config.populationSize,
      () => Chromosome.createRandom(classes, 10, maxClassesPerWeek)
    );
    
    // Evaluate fitness of initial population
    this.evaluatePopulation();
  }
  
  /**
   * Run the genetic algorithm for the specified number of generations
   * @returns The best chromosome found
   */
  evolve(): Chromosome {
    // Ensure we have at least one chromosome in the population
    if (this.population.getSize() === 0) {
      console.log('Population is empty, creating new random chromosomes');
      for (let i = 0; i < this.config.populationSize; i++) {
        this.population.addChromosome(Chromosome.createRandom(this.classes));
      }
      this.evaluatePopulation();
    }
    
    console.log(`GeneticAlgorithm: Starting evolution with population size ${this.population.getSize()}`);
    console.log(`GeneticAlgorithm: Configured for ${this.config.generations} generations`);
    console.log(`GeneticAlgorithm: Mutation rate: ${this.config.mutationRate}, Crossover rate: ${this.config.crossoverRate}`);
    
    // Log the initial best fitness before evolution starts
    let initialBestChromosome = this.getBestChromosome();
    if (initialBestChromosome) {
      const initialFitness = this.fitnessEvaluator.evaluate(initialBestChromosome);
      console.log(`GeneticAlgorithm: Initial best fitness: ${initialFitness.fitnessScore.toFixed(2)}`);
      console.log(`GeneticAlgorithm: Initial hard constraint violations: ${initialFitness.hardConstraintViolations}`);
    }

    // Run for the specified number of generations
    for (let i = 0; i < this.config.generations; i++) {
      this.generation = i + 1;
      
      // Create a new population
      const newPopulation = new Population(this.config.populationSize);
      
      // Keep track of the best chromosome from this generation
      let bestInGeneration: Chromosome | null = null;
      let bestFitness = Number.NEGATIVE_INFINITY;
      let lowestHardViolations = Number.POSITIVE_INFINITY;
      
      // Elitism: keep the best chromosome from the previous generation
      if (this.bestChromosome) {
        newPopulation.addChromosome(this.bestChromosome);
      }
      
      // If the population is too small for proper selection, add more random chromosomes
      if (this.population.getSize() < 2) {
        console.log('Population too small for selection, adding random chromosomes');
        for (let i = 0; i < Math.max(5, this.config.populationSize / 2); i++) {
          this.population.addChromosome(Chromosome.createRandom(this.classes));
        }
      }
      
      // Fill the rest of the population with new chromosomes
      while (newPopulation.getSize() < this.config.populationSize) {
        try {
          // Select parents through tournament selection
          const parent1 = this.tournamentSelection();
          const parent2 = this.tournamentSelection();
          
          // Perform crossover
          let offspring1: Chromosome;
          let offspring2: Chromosome;
          
          if (Math.random() < this.config.crossoverRate) {
            // Crossover
            [offspring1, offspring2] = this.geneticOperators.crossover(parent1, parent2);
          } else {
            // No crossover, just clone the parents
            offspring1 = parent1.clone();
            offspring2 = parent2.clone();
          }
          
          // Perform mutation on the offspring
          this.geneticOperators.mutate(offspring1);
          this.geneticOperators.mutate(offspring2);
          
          // Add offspring to the new population
          newPopulation.addChromosome(offspring1);
          if (newPopulation.getSize() < this.config.populationSize) {
            newPopulation.addChromosome(offspring2);
          }
        } catch (error) {
          console.error('Error during evolution:', error);
          // Add a random chromosome if there's an error
          newPopulation.addChromosome(Chromosome.createRandom(this.classes));
        }
      }
      
      // Replace the old population with the new one
      this.population = newPopulation;
      
      // Evaluate the new population
      this.evaluatePopulation();
      
      // Get the best chromosome from this generation
      const generationBest = this.getBestChromosome();
      
      if (generationBest) {
        const fitness = this.fitnessEvaluator.evaluate(generationBest);
        
        // Update the best chromosome if this is better
        if (!this.bestChromosome || 
            fitness.hardConstraintViolations < lowestHardViolations ||
            (fitness.hardConstraintViolations === lowestHardViolations && fitness.fitnessScore > bestFitness)) {
          
          this.bestChromosome = generationBest.clone();
          bestInGeneration = generationBest;
          bestFitness = fitness.fitnessScore;
          lowestHardViolations = fitness.hardConstraintViolations;
          
          // Log when we find a new best chromosome
          if (i % 10 === 0 || i === this.config.generations - 1) {
            console.log(`Generation ${i+1}/${this.config.generations}: Best fitness = ${fitness.fitnessScore.toFixed(2)}, Hard violations = ${fitness.hardConstraintViolations}`);
          }
        }
      }
    }
    
    // Log final results
    if (this.bestChromosome) {
      const finalFitness = this.fitnessEvaluator.evaluate(this.bestChromosome);
      console.log(`GeneticAlgorithm: Evolution complete after ${this.generation} generations`);
      console.log(`GeneticAlgorithm: Final best fitness: ${finalFitness.fitnessScore.toFixed(2)}`);
      console.log(`GeneticAlgorithm: Final hard constraint violations: ${finalFitness.hardConstraintViolations}`);
      
      // If we still have hard constraint violations, log the details
      if (finalFitness.hardConstraintViolations > 0) {
        console.log(`GeneticAlgorithm: WARNING - Final solution has ${finalFitness.hardConstraintViolations} hard constraint violations!`);
        console.log(`GeneticAlgorithm: Violation details:`, finalFitness.violations);
      }
    }
    
    // Return the best chromosome found
    if (!this.bestChromosome) {
      console.error('No best chromosome found, returning random chromosome');
      return Chromosome.createRandom(this.classes);
    }
    
    return this.bestChromosome;
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
    const eliteCount = Math.max(1, Math.floor(this.population.getSize() * 0.1)); // Keep top 10%
    const elites = this.population.getFittestChromosomes(eliteCount);
    newPopulation.push(...elites);
    
    // Fill the rest of the population with children from crossover and mutation
    while (newPopulation.length < this.population.getSize()) {
      // Select parents using tournament selection
      const parent1 = this.population.tournamentSelection(this.config.tournamentSize);
      const parent2 = this.population.tournamentSelection(this.config.tournamentSize);
      
      // Perform crossover
      let [child1, child2] = this.geneticOperators.crossover(parent1, parent2);
      
      // Perform mutation on children
      child1 = this.geneticOperators.mutate(child1);
      child2 = this.geneticOperators.mutate(child2);
      
      // Add children to new population (if there's space)
      if (newPopulation.length < this.population.getSize()) {
        newPopulation.push(child1);
      }
      
      if (newPopulation.length < this.population.getSize()) {
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
    // Clear existing fitness scores
    this.population.sortByFitness();
    
    // Evaluate each chromosome
    for (const chromosome of this.population.getChromosomes()) {
      if (!chromosome) continue; // Skip undefined chromosomes
      
      const fitnessResult = this.fitnessEvaluator.evaluate(chromosome);
      this.population.updateFitness(chromosome, fitnessResult.fitnessScore);
      
      // Update best chromosome if this one is better
      if (!this.bestChromosome) {
        this.bestChromosome = chromosome;
        continue;
      }
      
      const bestFitnessResult = this.fitnessEvaluator.evaluate(this.bestChromosome);
      
      // Prioritize lower hard constraint violations, then higher fitness
      if (fitnessResult.hardConstraintViolations < bestFitnessResult.hardConstraintViolations || 
          (fitnessResult.hardConstraintViolations === bestFitnessResult.hardConstraintViolations && 
           fitnessResult.fitnessScore > bestFitnessResult.fitnessScore)) {
        this.bestChromosome = chromosome;
      }
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
  
  /**
   * Tournament selection algorithm for selecting parent chromosomes
   * @returns Selected parent chromosome
   */
  private tournamentSelection(): Chromosome {
    if (this.population.getSize() === 0) {
      return Chromosome.createRandom(
        this.classes, 
        this.config.maxClassesPerDay || 10,
        this.config.maxClassesPerWeek || this.classes.length
      );
    }
    
    // If the population is too small, add random chromosomes
    if (this.population.getSize() < this.config.tournamentSize) {
      const numToAdd = this.config.tournamentSize - this.population.getSize();
      for (let i = 0; i < numToAdd; i++) {
        const randomChromosome = Chromosome.createRandom(
          this.classes, 
          this.config.maxClassesPerDay || 10,
          this.config.maxClassesPerWeek || this.classes.length
        );
        this.population.addChromosome(randomChromosome);
      }
    }
    
    // Select random chromosomes for the tournament
    const tournamentSize = Math.min(this.config.tournamentSize, this.population.getSize());
    const tournamentIndices: number[] = [];
    
    // Generate random indices for the tournament
    while (tournamentIndices.length < tournamentSize) {
      const randomIndex = Math.floor(Math.random() * this.population.getSize());
      if (!tournamentIndices.includes(randomIndex)) {
        tournamentIndices.push(randomIndex);
      }
    }
    
    // Choose the best chromosome from the tournament
    let bestIndex = tournamentIndices[0];
    let bestFitness = Number.NEGATIVE_INFINITY;
    let lowestViolations = Number.POSITIVE_INFINITY;
    
    for (const index of tournamentIndices) {
      try {
        const chromosome = this.population.getChromosomeAt(index);
        if (!chromosome) continue; // Skip undefined chromosomes
        
        const fitnessResult = this.fitnessEvaluator.evaluate(chromosome);
        
        // Prioritize chromosomes with fewer constraint violations
        if (fitnessResult.hardConstraintViolations < lowestViolations || 
            (fitnessResult.hardConstraintViolations === lowestViolations && 
             fitnessResult.fitnessScore > bestFitness)) {
          bestIndex = index;
          bestFitness = fitnessResult.fitnessScore;
          lowestViolations = fitnessResult.hardConstraintViolations;
        }
      } catch (error) {
        console.error(`Error during tournament selection: ${error}`);
        continue;
      }
    }
    
    try {
      return this.population.getChromosomeAt(bestIndex);
    } catch (error) {
      console.error(`Failed to get best chromosome: ${error}`);
      
      // Return a random chromosome from the population as fallback
      const chromosomes = this.population.getChromosomes();
      if (chromosomes.length > 0) {
        for (const chromosome of chromosomes) {
          if (chromosome) return chromosome;
        }
      }
      
      // If all else fails, create a new random chromosome
      return Chromosome.createRandom(this.classes);
    }
  }
}
