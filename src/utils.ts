import { Project } from './types';
import { STORAGE_KEY } from './constants';

/**
 * Parse CSV content to Project array
 */
export const parseCSV = (csvContent: string): Project[] => {
  const lines = csvContent.trim().split('\n');
  if (lines.length <= 1) return [];
  
  // Skip header line
  const projects: Project[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle commas within quoted fields
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    
    const project: Project = {
      id: values[0] || '',
      name: values[1] || '',
      group: values[2] || '',
      budget: parseFloat(values[3]) || 0,
      disbursed: parseFloat(values[11]) || 0,
      startMonth: parseInt(values[4]) || 0,
      color: values[5] || 'bg-blue-600',
      status: (values[6] as Project['status']) || 'ยังไม่เริ่ม',
      meetingStartDate: values[7] || undefined,
      meetingEndDate: values[8] || undefined,
      vehicle: values[9] || undefined,
      chairman: values[10] || undefined,
    };
    
    projects.push(project);
  }
  
  return projects;
};

/**
 * Convert Project array to CSV content
 */
export const projectsToCSV = (projects: Project[]): string => {
  const headers = 'id,name,group,budget,startMonth,color,status,meetingStartDate,meetingEndDate,vehicle,chairman,disbursed';
  
  const rows = projects.map(p => {
    const escapeName = p.name.includes(',') ? `"${p.name}"` : p.name;
    const escapeVehicle = p.vehicle && p.vehicle.includes(',') ? `"${p.vehicle}"` : (p.vehicle || '');
    const escapeChairman = p.chairman && p.chairman.includes(',') ? `"${p.chairman}"` : (p.chairman || '');
    return [
      p.id,
      escapeName,
      p.group,
      p.budget,
      p.startMonth,
      p.color,
      p.status,
      p.meetingStartDate || '',
      p.meetingEndDate || '',
      escapeVehicle,
      escapeChairman,
      p.disbursed ?? 0
    ].join(',');
  });
  
  return [headers, ...rows].join('\n');
};

/**
 * Load projects from localStorage
 */
export const loadFromLocalStorage = (): Project[] | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

/**
 * Save projects to localStorage
 */
export const saveToLocalStorage = (projects: Project[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

/**
 * Load projects from CSV file
 */
export const loadFromCSV = async (): Promise<Project[]> => {
  try {
    const response = await fetch('/projects.csv');
    const csvContent = await response.text();
    return parseCSV(csvContent);
  } catch (error) {
    console.error('Error loading CSV:', error);
    return [];
  }
};

/**
 * Download projects as CSV file
 */
export const downloadCSV = (projects: Project[], filename = 'projects.csv'): void => {
  const csvContent = projectsToCSV(projects);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Calculate which month a date falls in (0 = October, 11 = September)
 */
export const dateToFiscalMonth = (dateString: string): number => {
  const date = new Date(dateString);
  const month = date.getMonth(); // 0-11 (Jan=0)
  
  // Convert to fiscal year month (Oct=0)
  // Oct=9, Nov=10, Dec=11 -> 0, 1, 2
  // Jan=0, Feb=1, ..., Sep=8 -> 3, 4, ..., 11
  if (month >= 9) {
    return month - 9; // Oct=0, Nov=1, Dec=2
  } else {
    return month + 3; // Jan=3, Feb=4, ..., Sep=11
  }
};

/**
 * Get the actual calendar month/year for a fiscal month index
 */
export const fiscalMonthToCalendarMonth = (fiscalMonth: number, fiscalYear: { startYear: number; endYear: number }): { month: number; year: number } => {
  // fiscalMonth 0-2 (Oct-Dec) use startYear
  // fiscalMonth 3-11 (Jan-Sep) use endYear
  const year = fiscalMonth < 3 ? fiscalYear.startYear : fiscalYear.endYear;
  const month = fiscalMonth < 3 ? fiscalMonth + 9 : fiscalMonth - 3;
  
  return { month, year };
};

/**
 * Get days in a month
 */
export const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Check if a date is within a range
 */
export const isDateInRange = (date: Date, startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return date >= start && date <= end;
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};
