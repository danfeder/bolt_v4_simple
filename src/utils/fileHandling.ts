import { Class, Day, Period, TimeSlot } from '../models/types';

/**
 * Parse a CSV file containing class conflict data
 * @param csvContent CSV content as string
 * @returns Array of Class objects
 */
export function parseClassesFromCsv(csvContent: string): Class[] {
  const lines = csvContent.split('\n');
  const classes: Class[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
    if (columns.length < 7) continue; // Need at least class ID, name, and 5 days of conflicts
    
    const [id, name, ...conflictData] = columns;
    
    const conflicts: TimeSlot[] = [];
    
    // Parse conflict periods for each day
    const days = [Day.MONDAY, Day.TUESDAY, Day.WEDNESDAY, Day.THURSDAY, Day.FRIDAY];
    
    for (let j = 0; j < 5; j++) {
      const dayConflicts = conflictData[j];
      if (!dayConflicts) continue;
      
      // Parse periods (comma-separated list of numbers)
      const periods = dayConflicts.split(';')
        .map(p => parseInt(p.trim()))
        .filter(p => !isNaN(p) && p >= 1 && p <= 8) as Period[];
      
      // Add each period as a conflict
      for (const period of periods) {
        conflicts.push({ day: days[j], period });
      }
    }
    
    classes.push({
      id: id.trim(),
      name: name.trim(),
      conflicts,
      preferences: {
        preferred: [],
        notPreferred: []
      }
    });
  }
  
  return classes;
}

/**
 * Generate CSV content from an array of Class objects
 * @param classes Array of Class objects
 * @returns CSV content as string
 */
export function generateClassesCsv(classes: Class[]): string {
  let csv = 'ID,Name,Monday,Tuesday,Wednesday,Thursday,Friday\n';
  
  for (const cls of classes) {
    const days = [Day.MONDAY, Day.TUESDAY, Day.WEDNESDAY, Day.THURSDAY, Day.FRIDAY];
    
    // For each day, collect conflict periods
    const conflictsByDay = days.map(day => {
      const periods = cls.conflicts
        .filter(conflict => conflict.day === day)
        .map(conflict => conflict.period)
        .sort();
      
      return periods.join(';');
    });
    
    csv += `${cls.id},${cls.name},${conflictsByDay.join(',')}\n`;
  }
  
  return csv;
}

/**
 * Export CSV content as a downloadable file
 * @param content CSV content
 * @param filename Filename to save as
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
