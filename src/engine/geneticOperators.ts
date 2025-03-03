import { Chromosome } from './chromosome';
import { Class } from '../models/types';

/**
 * Genetic operators for the genetic algorithm.
 * This includes crossover and mutation operators.
 */
export class GeneticOperators {
  /**
   * Creates new genetic operators
   * @param classes Classes to schedule
   * @param crossoverRate Probability of crossover (0.0 to 1.0)
   * @param mutationRate Probability of mutation (0.0 to 1.0)
   */
  constructor(
    private classes: Class[],
    private crossoverRate: number = 0.8,
    private mutationRate: number = 0.2
  ) {}

  /**
   * Performs one-point crossover between two parent chromosomes
   * @param parent1 First parent chromosome
   * @param parent2 Second parent chromosome
   * @returns Two child chromosomes resulting from crossover
   */
  crossover(parent1: Chromosome, parent2: Chromosome): [Chromosome, Chromosome] {
    // Check if crossover should occur based on crossover rate
    if (Math.random() > this.crossoverRate) {
      // If no crossover, return clones of parents
      return [parent1.clone(), parent2.clone()];
    }

    // Get genes from both parents
    const parent1Genes = parent1.getGenes();
    const parent2Genes = parent2.getGenes();
    
    // Ensure both parents have the same number of genes
    if (parent1Genes.length !== parent2Genes.length) {
      throw new Error('Parents must have the same number of genes for crossover');
    }
    
    // Pick a random crossover point
    const crossoverPoint = Math.floor(Math.random() * parent1Genes.length);
    
    // Create new gene arrays for children
    const child1Genes: Assignment[] = [];
    const child2Genes: Assignment[] = [];
    
    // Process all genes
    for (let i = 0; i < parent1Genes.length; i++) {
      // For child1: Take genes from parent1 before crossover point, parent2 after
      // For child2: Take genes from parent2 before crossover point, parent1 after
      if (i < crossoverPoint) {
        // Before crossover point - keep original parent genes
        child1Genes.push({
          classId: parent1Genes[i].classId,
          timeSlot: { ...parent1Genes[i].timeSlot }
        });
        
        child2Genes.push({
          classId: parent2Genes[i].classId,
          timeSlot: { ...parent2Genes[i].timeSlot }
        });
      } else {
        // At or after crossover point - swap time slots
        // Get matching genes by class ID between parents
        const child1ClassId = parent1Genes[i].classId;
        const child2ClassId = parent2Genes[i].classId;
        
        // Find parent2's time slot for the same class
        const parent2MatchingGene = parent2Genes.find(g => g.classId === child1ClassId);
        const parent1MatchingGene = parent1Genes.find(g => g.classId === child2ClassId);
        
        if (parent2MatchingGene && parent1MatchingGene) {
          child1Genes.push({
            classId: child1ClassId,
            timeSlot: { ...parent2MatchingGene.timeSlot }
          });
          
          child2Genes.push({
            classId: child2ClassId,
            timeSlot: { ...parent1MatchingGene.timeSlot }
          });
        } else {
          // Fallback if matching genes aren't found (shouldn't happen with valid test data)
          child1Genes.push({
            classId: child1ClassId,
            timeSlot: { ...parent1Genes[i].timeSlot }
          });
          
          child2Genes.push({
            classId: child2ClassId,
            timeSlot: { ...parent2Genes[i].timeSlot }
          });
        }
      }
    }
    
    // Create new chromosomes with the constructed genes
    const child1 = new Chromosome(this.classes, child1Genes);
    const child2 = new Chromosome(this.classes, child2Genes);
    
    return [child1, child2];
  }
  
  /**
   * Performs uniform crossover between two parent chromosomes
   * @param parent1 First parent chromosome
   * @param parent2 Second parent chromosome
   * @param mixingRatio Probability of taking a gene from parent1 (0.0 to 1.0, default: 0.5)
   * @returns Two child chromosomes resulting from uniform crossover
   */
  uniformCrossover(
    parent1: Chromosome, 
    parent2: Chromosome, 
    mixingRatio: number = 0.5
  ): [Chromosome, Chromosome] {
    // Check if crossover should occur based on crossover rate
    if (Math.random() > this.crossoverRate) {
      // If no crossover, return clones of parents
      return [parent1.clone(), parent2.clone()];
    }
    
    // Create new child chromosomes by cloning parents
    const child1 = parent1.clone();
    const child2 = parent2.clone();
    
    // Get genes from both parents
    const parent1Genes = parent1.getGenes();
    const parent2Genes = parent2.getGenes();
    
    // Ensure both parents have the same number of genes
    if (parent1Genes.length !== parent2Genes.length) {
      throw new Error('Parents must have the same number of genes for crossover');
    }
    
    // For each gene position, decide which parent's gene to use for each child
    for (let i = 0; i < parent1Genes.length; i++) {
      const class1Id = parent1Genes[i].classId;
      const class2Id = parent2Genes[i].classId;
      
      // Keep references to original time slots
      const class1TimeSlot = { ...parent1Genes[i].timeSlot };
      const class2TimeSlot = { ...parent2Genes[i].timeSlot };
      
      // Randomly decide whether to swap the time slots
      if (Math.random() < mixingRatio) {
        // Swap time slots
        child1.updateAssignment(class1Id, class2TimeSlot);
        child2.updateAssignment(class2Id, class1TimeSlot);
      }
    }
    
    return [child1, child2];
  }
  
  /**
   * Performs mutation on a chromosome by swapping the time slots of two randomly selected classes
   * @param chromosome Chromosome to mutate
   * @returns Mutated chromosome
   */
  mutate(chromosome: Chromosome): Chromosome {
    // Create a clone of the chromosome to avoid modifying the original
    const mutatedChromosome = chromosome.clone();
    
    // Check if mutation should occur based on mutation rate
    if (Math.random() > this.mutationRate) {
      return mutatedChromosome;
    }
    
    // Get genes
    const genes = mutatedChromosome.getGenes();
    
    // Need at least 2 genes to perform a swap
    if (genes.length < 2) {
      return mutatedChromosome;
    }
    
    // Pick two random classes to swap
    const index1 = Math.floor(Math.random() * genes.length);
    let index2 = Math.floor(Math.random() * genes.length);
    
    // Ensure index2 is different from index1
    while (index2 === index1) {
      index2 = Math.floor(Math.random() * genes.length);
    }
    
    // Create a new array of genes for the mutated chromosome
    const newGenes = [...genes];
    
    // Swap the time slots directly in the new genes array
    const tempTimeSlot = { ...newGenes[index1].timeSlot };
    newGenes[index1] = {
      classId: newGenes[index1].classId,
      timeSlot: { ...newGenes[index2].timeSlot }
    };
    newGenes[index2] = {
      classId: newGenes[index2].classId,
      timeSlot: tempTimeSlot
    };
    
    // Create a new chromosome with the modified genes
    return new Chromosome(this.classes, newGenes);
  }
  
  /**
   * Performs advanced mutation on a chromosome by swapping the time slots of multiple pairs of classes
   * @param chromosome Chromosome to mutate
   * @param maxSwaps Maximum number of swaps to perform (default: 3)
   * @returns Mutated chromosome
   */
  advancedMutate(chromosome: Chromosome, maxSwaps: number = 3): Chromosome {
    // Clone the chromosome to avoid modifying the original
    let mutatedChromosome = chromosome.clone();
    
    // Check if mutation should occur based on mutation rate
    if (Math.random() > this.mutationRate) {
      return mutatedChromosome;
    }
    
    // Get genes
    let genes = [...mutatedChromosome.getGenes()];
    
    // Need at least 2 genes to perform a swap
    if (!genes || genes.length < 2) {
      return mutatedChromosome;
    }
    
    // Determine the number of swaps to perform (1 to maxSwaps)
    const numSwaps = Math.max(1, Math.min(Math.floor(Math.random() * maxSwaps) + 1, Math.floor(genes.length / 2)));
    
    // Perform multiple swaps
    for (let swap = 0; swap < numSwaps; swap++) {
      // Ensure we still have at least 2 genes to swap
      if (genes.length < 2) {
        break;
      }
      
      // Pick two random classes to swap
      const index1 = Math.floor(Math.random() * genes.length);
      let index2 = Math.floor(Math.random() * genes.length);
      
      // Ensure index2 is different from index1
      let attempts = 0;
      while (index2 === index1 && attempts < 10) {
        index2 = Math.floor(Math.random() * genes.length);
        attempts++;
      }
      
      // If we can't find a different index after multiple attempts, just skip this swap
      if (index2 === index1) {
        continue;
      }
      
      // Swap the time slots directly in the genes array
      const tempTimeSlot = { ...genes[index1].timeSlot };
      genes[index1] = {
        classId: genes[index1].classId,
        timeSlot: { ...genes[index2].timeSlot }
      };
      genes[index2] = {
        classId: genes[index2].classId,
        timeSlot: tempTimeSlot
      };
    }
    
    // Create a new chromosome with the modified genes
    return new Chromosome(this.classes, genes);
  }
}
