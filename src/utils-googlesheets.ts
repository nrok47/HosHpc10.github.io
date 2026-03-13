import { Project } from './types';

/** โปรเจคนี้ใช้เฉพาะ ศูนย์อนามัยที่ 10 อุบลราชธานี (กำกับติดตามโดย นพ.นิติ) — แยกจาก BudgetTrack.github.io เดิมอย่างสิ้นเชิง */
export const GOOGLE_SHEET_ID = '17WdWPnU-LURpSlMv9vc37vZG0IgpKOfsNLS4cvCh_3k';
const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycby0uPm9v4Bl-__FX6bhsRRpXBeLNW7KKxuaj04sgQ8XJYRe7CD7iFPoIDySfNEXz6DUYQ/exec';

/**
 * Load projects from Google Sheets
 */
export const loadFromGoogleSheets = async (): Promise<Project[]> => {
  try {
    const response = await fetch(`${GOOGLE_SHEETS_API}?action=getProjects&timestamp=${Date.now()}`, {
      method: 'GET',
      redirect: 'follow',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.projects || [];
  } catch (error) {
    console.error('Error loading from Google Sheets:', error);
    throw error;
  }
};

/**
 * โหลดรายชื่อกลุ่มงานจาก plans (คอลัมน์ C)
 */
export const loadGroups = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${GOOGLE_SHEETS_API}?action=getGroups&timestamp=${Date.now()}`, {
      method: 'GET',
      redirect: 'follow',
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (data.error) return [];
    return Array.isArray(data.groups) ? data.groups : [];
  } catch (error) {
    console.error('Error loading groups:', error);
    return [];
  }
};

/**
 * เปลี่ยนชื่อกลุ่มงาน (ทุกกิจกรรมในกลุ่ม oldName เป็น newName)
 */
export const updateGroupInSheets = async (oldName: string, newName: string): Promise<boolean> => {
  try {
    const url = `${GOOGLE_SHEETS_API}?action=updateGroup&oldName=${encodeURIComponent(oldName)}&newName=${encodeURIComponent(newName)}&timestamp=${Date.now()}`;
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    const data = await response.json().catch(() => ({}));
    return !data.error;
  } catch (error) {
    console.error('Error updating group:', error);
    return false;
  }
};

/**
 * ลบกลุ่มงาน (ลบทุกกิจกรรมในกลุ่มนั้น)
 */
export const deleteGroupInSheets = async (name: string): Promise<boolean> => {
  try {
    const url = `${GOOGLE_SHEETS_API}?action=deleteGroup&name=${encodeURIComponent(name)}&timestamp=${Date.now()}`;
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    const data = await response.json().catch(() => ({}));
    return !data.error;
  } catch (error) {
    console.error('Error deleting group:', error);
    return false;
  }
};

/**
 * ผลเบิกจ่ายจาก plans คอลัมน์ L — แสดงเฉพาะในเดือนที่กิจกรรมอยู่
 */
export function getProjectDisbursedInMonth(project: Project, monthIndex: number): number {
  if (project.startMonth !== monthIndex) return 0;
  return project.disbursed ?? 0;
}

/**
 * Save projects to Google Sheets
 * ส่งแบบ application/x-www-form-urlencoded เพื่อให้ GAS อ่าน e.parameter ได้ (FormData/multipart GAS ไม่ parse)
 */
export const saveToGoogleSheets = async (projects: Project[]): Promise<boolean> => {
  try {
    const body = `action=saveProjects&projects=${encodeURIComponent(JSON.stringify(projects))}`;
    const response = await fetch(GOOGLE_SHEETS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body,
    });
    const data = await response.json().catch(() => ({}));
    if (data.error) {
      console.error('Google Sheets save error:', data.error);
      return false;
    }
    if (!response.ok) return false;
    return data.success === true || data.count !== undefined;
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    return false;
  }
};

/**
 * Parse CSV content to Project array (kept for backward compatibility)
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
 * Load projects from CSV file (fallback)
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

/**
 * Update meeting dates to match new fiscal month while preserving the day
 * @param oldStartDate - Original meeting start date (YYYY-MM-DD)
 * @param oldEndDate - Original meeting end date (YYYY-MM-DD)
 * @param newFiscalMonth - New fiscal month index (0-11)
 * @param fiscalYear - Current fiscal year object
 * @returns Updated dates or undefined if original dates don't exist
 */
export const updateMeetingDatesToNewMonth = (
  oldStartDate: string | undefined,
  oldEndDate: string | undefined,
  newFiscalMonth: number,
  fiscalYear: { startYear: number; endYear: number }
): { meetingStartDate?: string; meetingEndDate?: string } => {
  // If no meeting dates exist, return undefined
  if (!oldStartDate || !oldEndDate) {
    return { meetingStartDate: undefined, meetingEndDate: undefined };
  }

  try {
    // Get the calendar month/year for the new fiscal month
    const { month: newCalendarMonth, year: newCalendarYear } = fiscalMonthToCalendarMonth(newFiscalMonth, fiscalYear);

    // Parse old dates to get the day values
    const oldStart = new Date(oldStartDate);
    const oldEnd = new Date(oldEndDate);
    const startDay = oldStart.getDate();
    const endDay = oldEnd.getDate();

    // Get max days in the new month
    const maxDaysInNewMonth = getDaysInMonth(newCalendarMonth, newCalendarYear);

    // Ensure days don't exceed the max days in new month
    const newStartDay = Math.min(startDay, maxDaysInNewMonth);
    const newEndDay = Math.min(endDay, maxDaysInNewMonth);

    // Create new dates with the new month/year but preserve the day
    const newStartDate = new Date(newCalendarYear, newCalendarMonth, newStartDay);
    const newEndDate = new Date(newCalendarYear, newCalendarMonth, newEndDay);

    // Format as YYYY-MM-DD
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      meetingStartDate: formatDate(newStartDate),
      meetingEndDate: formatDate(newEndDate)
    };
  } catch (error) {
    console.error('Error updating meeting dates:', error);
    return { meetingStartDate: oldStartDate, meetingEndDate: oldEndDate };
  }
};
