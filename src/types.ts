export type ProjectStatus = 'ยังไม่เริ่ม' | 'กำลังดำเนินการ' | 'เสร็จสิ้น';

export interface Project {
  id: string;
  name: string;
  group: string; // e.g., 'กลุ่มอำนวยการ', 'กลุ่มยุทธศาสตร์', etc.
  budget: number;       // งบแผน (บาท)
  disbursed?: number;  // ผลการใช้จ่าย (บาท) - เมื่อ != 0 นำไปแสดงเป็น "ผลเบิกจ่าย" ในรายงาน
  startMonth: number; // 0 = October, 11 = September
  color: string; // Tailwind class e.g., 'bg-blue-600'
  status: ProjectStatus;
  meetingStartDate?: string; // ISO Date YYYY-MM-DD
  meetingEndDate?: string;   // ISO Date YYYY-MM-DD
  vehicle?: string;          // รถราชการและพนักงานขับรถ (optional)
  chairman?: string;         // ประธานในกิจกรรม (optional)
}

export interface MonthData {
  month: string;
  shortMonth: string;
  year: string;
  index: number;
}

export interface BudgetSummary {
  monthlyBudget: number;
  cumulativeBudget: number;
  cumulativeTarget: number;
  cumulativeActual: number;
}

/** แถวจากชีต query_DOC: D = ผลการใช้จ่าย (ชื่อกิจกรรม), E = เดือน, F = จำนวนเงิน */
export interface QueryDocRow {
  activityLabel: string;  // คอลัมน์ D - ผลการใช้จ่าย
  month: string;         // คอลัมน์ E - เดือน (เช่น ตุลาคม, ต.ค. 68)
  amount: number;        // คอลัมน์ F - จำนวนเงิน
}
