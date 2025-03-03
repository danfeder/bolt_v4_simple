import { describe, it, expect } from 'vitest';
import { dataUtils } from './dataUtils';
import { Day } from '../models/types';

describe('CSV Parsing', () => {
  it('should correctly parse class conflict data from CSV', () => {
    const csvContent = `Class,Monday,Tuesday,Wednesday,Thursday,Friday
PK207,2,2,4,3,"1, 3"
PK214,"2, 5","3, 5","1, 5","5, 7","2, 3, 5"`;

    const classes = dataUtils.parseClassesFromCSV(csvContent);
    
    // Check that we parsed 2 classes
    expect(classes).toHaveLength(2);
    
    // Check the first class
    expect(classes[0].name).toBe('PK207');
    expect(classes[0].conflicts).toHaveLength(6); // 1 each for Mon, Tue, Wed, Thu and 2 for Fri
    
    // Check that Friday has both period 1 and 3 conflicts for PK207
    const fridayConflicts = classes[0].conflicts.filter(c => c.day === Day.FRIDAY);
    expect(fridayConflicts).toHaveLength(2);
    expect(fridayConflicts.map(c => c.period).sort()).toEqual([1, 3]);
    
    // Check the second class
    expect(classes[1].name).toBe('PK214');
    
    // Check that each day has the correct conflicts for PK214
    const mondayConflicts = classes[1].conflicts.filter(c => c.day === Day.MONDAY);
    expect(mondayConflicts.map(c => c.period).sort()).toEqual([2, 5]);
    
    const tuesdayConflicts = classes[1].conflicts.filter(c => c.day === Day.TUESDAY);
    expect(tuesdayConflicts.map(c => c.period).sort()).toEqual([3, 5]);
    
    const wednesdayConflicts = classes[1].conflicts.filter(c => c.day === Day.WEDNESDAY);
    expect(wednesdayConflicts.map(c => c.period).sort()).toEqual([1, 5]);
    
    const thursdayConflicts = classes[1].conflicts.filter(c => c.day === Day.THURSDAY);
    expect(thursdayConflicts.map(c => c.period).sort()).toEqual([5, 7]);
    
    const fridayConflicts2 = classes[1].conflicts.filter(c => c.day === Day.FRIDAY);
    expect(fridayConflicts2.map(c => c.period).sort()).toEqual([2, 3, 5]);
  });
  
  it('should handle edge cases in CSV parsing', () => {
    const csvContent = `Class,Monday,Tuesday,Wednesday,Thursday,Friday
Empty,,,,, 
Invalid,9,x,a,,
Invalid2,"1, 9",,"x, y",,`;

    const classes = dataUtils.parseClassesFromCSV(csvContent);
    
    // Check that we parsed 3 classes
    expect(classes).toHaveLength(3);
    
    // First class should have no conflicts
    expect(classes[0].conflicts).toHaveLength(0);
    
    // Second class should only have valid conflicts (none in this case)
    expect(classes[1].conflicts).toHaveLength(0);
    
    // Third class should only have the valid conflict (period 1 on Monday)
    expect(classes[2].conflicts).toHaveLength(1);
    expect(classes[2].conflicts[0].day).toBe(Day.MONDAY);
    expect(classes[2].conflicts[0].period).toBe(1);
  });
});
