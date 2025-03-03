import { Class } from '../models/types';
import { Chromosome } from './chromosome';

/**
 * Population management for the genetic algorithm.
 * This class manages a fixed-size population of chromosomes and provides
 * selection methods.
 */
export class Population {
  /**
   * The chromosomes in this population
   */
  private chromosomes: Chromosome[];
  
  /**
   * Fitness scores for each chromosome
   */
  private fitnessScores: Map<Chromosome, number>;
  
  /**
   * The size of the population
   */
  public size: number;

  /**
   * Creates a new population
   * @param populationSize Size of the population
   * @param chromosomeGenerator Function to generate new chromosomes
   */
  constructor(
    populationSize: number,
    private chromosomeGenerator: () => Chromosome
  ) {
    this.size = populationSize;
    this.fitnessScores = new Map();
    this.chromosomes = [];
    
    // Generate initial population
    for (let i = 0; i < populationSize; i++) {
      this.chromosomes.push(chromosomeGenerator());
    }
  }
  
  /**
   * Gets all chromosomes in the population
   * @returns Array of chromosomes
   */
  getChromosomes(): Chromosome[] {
    return [...this.chromosomes];
  }
  
  /**
   * Gets a chromosome at a specific index
   * @param index Index of the chromosome to get
   * @returns Chromosome at the specified index
   */
  getChromosomeAt(index: number): Chromosome {
    return this.chromosomes[index];
  }
  
  /**
   * Gets the size of the population
   * @returns Size of the population
   */
  getSize(): number {
    return this.size;
  }
  
  /**
   * Gets the best chromosome in the population
   * @returns Best chromosome based on fitness score
   */
  getBestChromosome(): Chromosome {
    if (this.chromosomes.length === 0) {
      throw new Error('Population is empty');
    }
    
    // If fitness scores are not computed, return the first chromosome
    if (this.fitnessScores.size === 0) {
      return this.chromosomes[0];
    }
    
    // Find the chromosome with the highest fitness score
    let bestChromosome = this.chromosomes[0];
    let bestFitness = this.fitnessScores.get(bestChromosome) || 0;
    
    for (const chromosome of this.chromosomes) {
      const fitness = this.fitnessScores.get(chromosome) || 0;
      if (fitness > bestFitness) {
        bestFitness = fitness;
        bestChromosome = chromosome;
      }
    }
    
    return bestChromosome;
  }
  
  /**
   * Updates the fitness score for a chromosome
   * @param chromosome Chromosome to update
   * @param fitness Fitness score
   */
  updateFitness(chromosome: Chromosome, fitness: number): void {
    this.fitnessScores.set(chromosome, fitness);
  }
  
  /**
   * Gets the fitness score for a chromosome
   * @param chromosome Chromosome to get fitness for
   * @returns Fitness score, or 0 if not computed
   */
  getFitness(chromosome: Chromosome): number {
    return this.fitnessScores.get(chromosome) || 0;
  }
  
  /**
   * Adds a chromosome to the population.
   * If the population is already at its maximum size, the worst chromosome is replaced.
   * @param chromosome New chromosome to add
   * @param fitness Optional fitness score for the chromosome
   */
  addChromosome(chromosome: Chromosome, fitness?: number): void {
    if (fitness !== undefined) {
      this.fitnessScores.set(chromosome, fitness);
    }
    
    if (this.chromosomes.length < this.size) {
      // If population not at max size, simply add
      this.chromosomes.push(chromosome);
    } else {
      // Replace the worst chromosome
      let worstChromosome = this.chromosomes[0];
      let worstFitness = this.fitnessScores.get(worstChromosome) || 0;
      
      for (const chrom of this.chromosomes) {
        const chromFitness = this.fitnessScores.get(chrom) || 0;
        if (chromFitness < worstFitness) {
          worstFitness = chromFitness;
          worstChromosome = chrom;
        }
      }
      
      // If the new chromosome is better than the worst, replace it
      if (fitness === undefined || fitness > worstFitness) {
        const index = this.chromosomes.indexOf(worstChromosome);
        if (index !== -1) {
          this.chromosomes[index] = chromosome;
        }
      }
    }
  }
  
  /**
   * Performs tournament selection to select a chromosome from the population.
   * @param tournamentSize Number of chromosomes to include in the tournament (default: 3)
   * @returns Selected chromosome
   */
  tournamentSelection(tournamentSize: number = 3): Chromosome {
    if (this.chromosomes.length === 0) {
      throw new Error('Population is empty');
    }
    
    // Adjust tournament size if it's larger than the population
    const actualSize = Math.min(tournamentSize, this.chromosomes.length);
    
    // Randomly select chromosomes for the tournament
    const tournament: Chromosome[] = [];
    const indices = new Set<number>();
    
    while (tournament.length < actualSize) {
      const randomIndex = Math.floor(Math.random() * this.chromosomes.length);
      
      // Ensure we don't select the same chromosome twice
      if (!indices.has(randomIndex)) {
        indices.add(randomIndex);
        tournament.push(this.chromosomes[randomIndex]);
      }
    }
    
    // Select the best chromosome from the tournament
    let bestChromosome = tournament[0];
    
    for (let i = 1; i < tournament.length; i++) {
      if ((this.fitnessScores.get(tournament[i]) || 0) > (this.fitnessScores.get(bestChromosome) || 0)) {
        bestChromosome = tournament[i];
      }
    }
    
    return bestChromosome;
  }
  
  /**
   * Replaces the population with a new set of chromosomes.
   * This is typically used for generational replacement.
   * @param newChromosomes New chromosomes to replace the population with
   */
  replacePopulation(newChromosomes: Chromosome[]): void {
    // Ensure the new population has the correct size
    if (newChromosomes.length < this.size) {
      // If not enough chromosomes, generate additional ones
      const additionalCount = this.size - newChromosomes.length;
      for (let i = 0; i < additionalCount; i++) {
        newChromosomes.push(this.chromosomeGenerator());
      }
    } else if (newChromosomes.length > this.size) {
      // If too many chromosomes, keep only the first size
      newChromosomes = newChromosomes.slice(0, this.size);
    }
    
    // Replace the population
    this.chromosomes = newChromosomes;
    
    // Clear fitness scores for chromosomes that are no longer in the population
    const newFitnessScores = new Map<Chromosome, number>();
    for (const chromosome of this.chromosomes) {
      const fitness = this.fitnessScores.get(chromosome);
      if (fitness !== undefined) {
        newFitnessScores.set(chromosome, fitness);
      }
    }
    
    this.fitnessScores = newFitnessScores;
  }
  
  /**
   * Replaces the current population with a new set of chromosomes
   * @param chromosomes New chromosomes to replace the population with
   */
  replaceWith(chromosomes: Chromosome[]): void {
    if (chromosomes.length > this.size) {
      throw new Error(`Cannot replace population with ${chromosomes.length} chromosomes, maximum size is ${this.size}`);
    }
    
    // Copy chromosomes to the population
    this.chromosomes = [...chromosomes];
    
    // If the new population is smaller than the desired size, fill with random chromosomes
    while (this.chromosomes.length < this.size) {
      this.chromosomes.push(this.chromosomeGenerator());
    }
  }
  
  /**
   * Sorts the chromosomes in the population by fitness in descending order (highest fitness first)
   */
  sortByFitness(): void {
    this.chromosomes.sort((a, b) => 
      (this.fitnessScores.get(b) || 0) - (this.fitnessScores.get(a) || 0)
    );
  }
  
  /**
   * Gets the fittest chromosome in the population
   * @returns The chromosome with the highest fitness
   */
  getFittestChromosome(): Chromosome {
    // Sort if not already sorted
    this.sortByFitness();
    
    if (this.chromosomes.length === 0) {
      throw new Error("Population is empty");
    }
    
    return this.chromosomes[0];
  }
  
  /**
   * Gets the top n fittest chromosomes from the population
   * @param n Number of chromosomes to return
   * @returns Array of the n fittest chromosomes
   */
  getFittestChromosomes(n: number): Chromosome[] {
    // Sort if not already sorted
    this.sortByFitness();
    
    if (n <= 0) {
      return [];
    }
    
    // Return at most n chromosomes
    return this.chromosomes.slice(0, Math.min(n, this.chromosomes.length));
  }
}
