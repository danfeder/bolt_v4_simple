import { Class, Assignment, TimeSlot, Day, Period } from '../models/types';
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
      
      // Make sure all classes are assigned - add missing classes
      this.ensureAllClassesAssigned();
    } else {
      // Create random initial assignments
      this.genes = this.generateRandomAssignments();
    }
  }
  
  /**
   * Ensures all classes in the class list are assigned in this chromosome
   * This is important when initializing with partial assignments
   */
  private ensureAllClassesAssigned(): void {
    // Get the set of class IDs that are already assigned
    const assignedClassIds = new Set(this.genes.map(gene => gene.classId));
    
    // Find classes that are not yet assigned
    const unassignedClasses = this.classes.filter(cls => !assignedClassIds.has(cls.id));
    
    if (unassignedClasses.length === 0) {
      return; // All classes are already assigned
    }
    
    // Create a list of time slots that are already used
    const usedTimeSlots = new Set<string>();
    for (const gene of this.genes) {
      usedTimeSlots.add(`${gene.timeSlot.day}-${gene.timeSlot.period}`);
    }
    
    // Get available time slots that are not already used
    const availableSlots = this.availableTimeSlots.filter(slot => {
      return !usedTimeSlots.has(`${slot.day}-${slot.period}`);
    });
    
    // Assign each unassigned class to an available time slot
    for (const cls of unassignedClasses) {
      // Filter out time slots that conflict with this class
      const validSlots = availableSlots.filter(slot => 
        !cls.conflicts.some(conflict => areTimeSlotsEqual(conflict, slot))
      );
      
      if (validSlots.length > 0) {
        // Pick a random valid slot
        const randomIndex = Math.floor(Math.random() * validSlots.length);
        const randomSlot = validSlots[randomIndex];
        
        this.genes.push({
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
        
        // Mark the slot as used
        usedTimeSlots.add(`${randomSlot.day}-${randomSlot.period}`);
      } else if (availableSlots.length > 0) {
        // No valid slots, pick any available slot
        const randomIndex = Math.floor(Math.random() * availableSlots.length);
        const randomSlot = availableSlots[randomIndex];
        
        this.genes.push({
          classId: cls.id,
          timeSlot: randomSlot
        });
        
        // Remove the selected slot from available slots
        availableSlots.splice(randomIndex, 1);
        
        // Mark the slot as used
        usedTimeSlots.add(`${randomSlot.day}-${randomSlot.period}`);
      } else {
        // No available slots left, reuse an already used slot
        const randomDay = Math.floor(Math.random() * 5); // 0-4 for Monday-Friday
        const randomPeriod = Math.floor(Math.random() * 8) + 1; // 1-8
        
        this.genes.push({
          classId: cls.id,
          timeSlot: { day: randomDay, period: randomPeriod }
        });
      }
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
        if (availableSlots.length === 0) {
          // If no slots left at all, create a random one
          // This might create conflicts, but it's better than not assigning
          const randomDay = Math.floor(Math.random() * 5); // 0-4 for Monday-Friday
          const randomPeriod = Math.floor(Math.random() * 8) + 1; // 1-8
          
          assignments.push({
            classId: cls.id,
            timeSlot: { day: randomDay, period: randomPeriod }
          });
        } else {
          const randomIndex = Math.floor(Math.random() * availableSlots.length);
          const randomSlot = availableSlots[randomIndex];
          
          assignments.push({
            classId: cls.id,
            timeSlot: randomSlot
          });
          
          // Remove the selected slot from available slots
          availableSlots.splice(randomIndex, 1);
        }
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
    this.ensureAllClassesAssigned();
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
   * @param timeSlot New time slot
   * @returns True if the update was successful
   */
  updateAssignment(classId: string, timeSlot: TimeSlot): boolean {
    // Check if the time slot is already assigned to another class
    const existingClass = this.getClassForTimeSlot(timeSlot);
    if (existingClass && existingClass !== classId) {
      return false;
    }
    
    // Find the assignment for this class
    const index = this.genes.findIndex(gene => gene.classId === classId);
    
    if (index === -1) {
      // If class not found, add a new assignment
      this.genes.push({
        classId,
        timeSlot
      });
      return true;
    }
    
    // Update the assignment
    this.genes[index] = {
      classId,
      timeSlot
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
   * Creates a copy of this chromosome
   * @returns New chromosome with the same genes
   */
  clone(): Chromosome {
    const clone = new Chromosome(this.classes);
    clone.genes = [...this.genes];
    clone.fitness = this.fitness;
    return clone;
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
   * Creates a new random chromosome
   * @param classes Classes to schedule
   * @param maxPerDay Maximum number of classes per day, defaults to 10
   * @param maxPerWeek Maximum number of classes per week, defaults to all classes
   * @returns New chromosome with random assignments
   */
  static createRandom(classes: Class[], maxPerDay: number = 10, maxPerWeek: number = classes.length): Chromosome {
    // Create empty chromosome
    const chromosome = new Chromosome(classes);
    
    console.log(`Chromosome.createRandom: Creating random chromosome with ${classes.length} classes`);
    console.log(`Chromosome.createRandom: Max classes per day: ${maxPerDay}, max classes per week: ${maxPerWeek}`);
    
    // Create an array to track the number of assignments per day
    const assignmentsPerDay: Record<string, number> = {
      [Day.MONDAY]: 0,
      [Day.TUESDAY]: 0,
      [Day.WEDNESDAY]: 0,
      [Day.THURSDAY]: 0,
      [Day.FRIDAY]: 0
    };
    
    // Available periods (1-8)
    const periods: Period[] = [1, 2, 3, 4, 5, 6, 7, 8];
    
    // Available days (excluding UNASSIGNED)
    const availableDays: Day[] = [
      Day.MONDAY,
      Day.TUESDAY,
      Day.WEDNESDAY,
      Day.THURSDAY,
      Day.FRIDAY
    ];
    
    // Shuffle the classes to randomize assignment order
    const shuffledClasses = [...classes].sort(() => Math.random() - 0.5);
    
    // If we need to limit the number of classes per week, only take a subset of classes
    const classesToAssign = maxPerWeek < shuffledClasses.length 
      ? shuffledClasses.slice(0, maxPerWeek)
      : shuffledClasses;
    
    console.log(`Chromosome.createRandom: Assigning ${classesToAssign.length} classes`);
    
    // Track all assigned time slots to avoid duplicates
    const assignedTimeSlots = new Set<string>();
    
    // Create a genes array to build up
    const genes: Assignment[] = [];
    
    // Assign each class to a random day and period
    for (const classItem of classesToAssign) {
      let assigned = false;
      let attempts = 0;
      const maxAttempts = 100; // Increase max attempts to find valid slot
      
      while (!assigned && attempts < maxAttempts) {
        attempts++;
        
        // Find days that have not reached max capacity
        const availableDaysFiltered = availableDays.filter(
          day => assignmentsPerDay[day] < maxPerDay
        );
        
        // If all days are at capacity, skip this class
        if (availableDaysFiltered.length === 0) {
          console.log(`Chromosome.createRandom: All days at capacity, skipping class ${classItem.id}`);
          break;
        }
        
        // Randomly select a day from available days
        const day = availableDaysFiltered[Math.floor(Math.random() * availableDaysFiltered.length)];
        
        // Shuffle the periods to try them in random order
        const shuffledPeriods = [...periods].sort(() => Math.random() - 0.5);
        
        // Try each period in the shuffled order
        for (const period of shuffledPeriods) {
          // Check if the time slot is already assigned
          const timeSlotKey = `${day}-${period}`;
          if (assignedTimeSlots.has(timeSlotKey)) {
            continue;
          }
          
          // Check if the assigned time slot is valid (no conflicts)
          const conflicts = classItem.conflicts || [];
          const hasConflict = conflicts.some(conflict => {
            return conflict.day === day && conflict.period === period;
          });
          
          if (!hasConflict) {
            // Add gene to array
            genes.push({
              classId: classItem.id,
              timeSlot: { day, period }
            });
            
            // Mark this time slot as assigned
            assignedTimeSlots.add(timeSlotKey);
            
            // Increment the assignment count for this day
            assignmentsPerDay[day]++;
            
            assigned = true;
            break;
          }
        }
      }
      
      // If we couldn't find a valid slot after max attempts
      if (!assigned) {
        console.log(`Chromosome.createRandom: Could not find valid slot for class ${classItem.id} after ${maxAttempts} attempts`);
        
        // Try assigning to any available slot (ignoring conflicts)
        // Find a day with room left
        const availableDaysFiltered = availableDays.filter(
          day => assignmentsPerDay[day] < maxPerDay
        );
        
        if (availableDaysFiltered.length > 0) {
          const day = availableDaysFiltered[Math.floor(Math.random() * availableDaysFiltered.length)];
          
          // Try to find an unassigned time slot
          let periodAssigned = false;
          for (const period of periods) {
            const timeSlotKey = `${day}-${period}`;
            if (!assignedTimeSlots.has(timeSlotKey)) {
              // Add gene
              genes.push({
                classId: classItem.id,
                timeSlot: { day, period }
              });
              
              // Mark as assigned
              assignedTimeSlots.add(timeSlotKey);
              
              // Increment count
              assignmentsPerDay[day]++;
              
              periodAssigned = true;
              break;
            }
          }
          
          // If all slots on available days are taken, assign to a random slot
          if (!periodAssigned) {
            console.log(`Chromosome.createRandom: All slots on available days taken, assigning to random slot`);
            const day = availableDaysFiltered[Math.floor(Math.random() * availableDaysFiltered.length)];
            const period = periods[Math.floor(Math.random() * periods.length)];
            
            // Add gene
            genes.push({
              classId: classItem.id,
              timeSlot: { day, period }
            });
            
            // Increment count
            assignmentsPerDay[day]++;
          }
        }
      }
    }
    
    console.log(`Chromosome.createRandom: Assigned ${genes.length}/${classesToAssign.length} classes`);
    console.log(`Chromosome.createRandom: Classes per day:`, assignmentsPerDay);
    
    // Set all genes at once
    chromosome.setGenes(genes);
    
    return chromosome;
  }
}
