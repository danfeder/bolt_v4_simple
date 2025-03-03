import { Class, Assignment, TimeSlot } from '../models/types';
import { areTimeSlotsEqual, generateAllTimeSlots } from '../utils/timeSlot';

/**
 * Represents a chromosome in the genetic algorithm.
 * Each chromosome encodes a complete schedule solution where each gene
 * represents a class assignment to a specific time slot.
 */
export class Chromosome {
  /**
   * The genes in this chromosome, where each gene is an Assignment
   * (a class assigned to a specific time slot)
   */
  private genes: Assignment[];

  /**
   * Available time slots for scheduling
   */
  private availableTimeSlots: TimeSlot[];

  /**
   * Fitness score for this chromosome
   */
  private fitness: number = 0;

  /**
   * Creates a new chromosome
   * @param classes Classes to schedule
   * @param initialGenes Optional initial genes (assignments)
   */
  constructor(
    private classes: Class[],
    initialGenes?: Assignment[]
  ) {
    this.availableTimeSlots = generateAllTimeSlots();
    
    if (initialGenes) {
      this.genes = [...initialGenes];
    } else {
      // Create random initial assignments
      this.genes = this.generateRandomAssignments();
    }
  }

  /**
   * Generates random assignments for all classes
   * @returns Array of random assignments
   */
  private generateRandomAssignments(): Assignment[] {
    const assignments: Assignment[] = [];
    
    // Create a copy of available time slots to avoid modifying the original
    const availableSlots = [...this.availableTimeSlots];
    
    // Assign each class to a random time slot
    for (const cls of this.classes) {
      // Filter out time slots that conflict with this class
      const validSlots = availableSlots.filter(slot => 
        !cls.conflicts.some(conflict => areTimeSlotsEqual(conflict, slot))
      );
      
      if (validSlots.length === 0) {
        // If no valid slots, just pick a random one from all available
        const randomIndex = Math.floor(Math.random() * availableSlots.length);
        const randomSlot = availableSlots[randomIndex];
        
        assignments.push({
          classId: cls.id,
          timeSlot: randomSlot
        });
        
        // Remove the selected slot from available slots
        availableSlots.splice(randomIndex, 1);
      } else {
        // Pick a random valid slot
        const randomIndex = Math.floor(Math.random() * validSlots.length);
        const randomSlot = validSlots[randomIndex];
        
        assignments.push({
          classId: cls.id,
          timeSlot: randomSlot
        });
        
        // Remove the selected slot from available slots
        const slotIndex = availableSlots.findIndex(slot => 
          areTimeSlotsEqual(slot, randomSlot)
        );
        if (slotIndex !== -1) {
          availableSlots.splice(slotIndex, 1);
        }
      }
    }
    
    return assignments;
  }

  /**
   * Gets all genes (assignments) in this chromosome
   * @returns Array of assignments
   */
  getGenes(): Assignment[] {
    return [...this.genes];
  }

  /**
   * Sets the genes (assignments) for this chromosome
   * @param genes New assignments
   */
  setGenes(genes: Assignment[]): void {
    this.genes = [...genes];
  }

  /**
   * Gets the assignment for a specific class
   * @param classId Class ID
   * @returns Assignment for the class, or undefined if not found
   */
  getAssignmentForClass(classId: string): Assignment | undefined {
    return this.genes.find(gene => gene.classId === classId);
  }

  /**
   * Gets the class assigned to a specific time slot
   * @param timeSlot Time slot
   * @returns Class ID assigned to the time slot, or undefined if none
   */
  getClassForTimeSlot(timeSlot: TimeSlot): string | undefined {
    const assignment = this.genes.find(gene => 
      areTimeSlotsEqual(gene.timeSlot, timeSlot)
    );
    return assignment?.classId;
  }

  /**
   * Checks if a time slot is available (not assigned to any class)
   * @param timeSlot Time slot to check
   * @returns True if the time slot is available
   */
  isTimeSlotAvailable(timeSlot: TimeSlot): boolean {
    const existingClass = this.getClassForTimeSlot(timeSlot);
    return existingClass === undefined;
  }

  /**
   * Updates the assignment for a specific class
   * @param classId Class ID
   * @param newTimeSlot New time slot
   * @returns True if the update was successful
   */
  updateAssignment(classId: string, newTimeSlot: TimeSlot): boolean {
    // Check if the time slot is already assigned to another class
    const existingClass = this.getClassForTimeSlot(newTimeSlot);
    if (existingClass && existingClass !== classId) {
      return false;
    }
    
    // Find the assignment for this class
    const index = this.genes.findIndex(gene => gene.classId === classId);
    
    if (index === -1) {
      return false;
    }
    
    // Update the assignment
    this.genes[index] = {
      classId,
      timeSlot: newTimeSlot
    };
    
    return true;
  }

  /**
   * Swaps the time slots of two classes
   * @param classId1 First class ID
   * @param classId2 Second class ID
   * @returns True if the swap was successful
   */
  swapAssignments(classId1: string, classId2: string): boolean {
    const index1 = this.genes.findIndex(gene => gene.classId === classId1);
    const index2 = this.genes.findIndex(gene => gene.classId === classId2);
    
    if (index1 === -1 || index2 === -1) {
      return false;
    }
    
    // Swap time slots
    const tempTimeSlot = this.genes[index1].timeSlot;
    this.genes[index1].timeSlot = this.genes[index2].timeSlot;
    this.genes[index2].timeSlot = tempTimeSlot;
    
    return true;
  }

  /**
   * Creates a deep copy of this chromosome
   * @returns New chromosome with the same genes
   */
  clone(): Chromosome {
    return new Chromosome(this.classes, this.genes);
  }

  /**
   * Gets the fitness score for this chromosome
   * @returns The fitness score
   */
  getFitness(): number {
    return this.fitness;
  }
  
  /**
   * Sets the fitness score for this chromosome
   * @param fitness The new fitness score
   */
  setFitness(fitness: number): void {
    this.fitness = fitness;
  }
  
  /**
   * Creates a chromosome with random gene assignments
   * @param classes Classes to schedule
   * @returns A new chromosome with random assignments
   */
  static createRandom(classes: Class[]): Chromosome {
    return new Chromosome(classes);
  }
}
