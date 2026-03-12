import React, { useState, useMemo } from 'react';
import { Edit, Trash2, Calendar } from 'lucide-react';
import { Project, BudgetSummary } from '../types';
import { getFiscalYearMonths, CUMULATIVE_TARGETS, getCurrentFiscalYear } from '../constants';
import { updateMeetingDatesToNewMonth, getDisbursedForActivityMonth } from '../utils-googlesheets';

interface ProjectGanttChartProps {
  projects: Project[];
  disbursedMap: Record<string, number> | null;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onUpdateProject: (project: Project) => void;
  onMonthClick: (monthIndex: number) => void;
  isDarkMode: boolean;
  filterGroup: string;
  sortBy: 'name' | 'budget' | 'startMonth' | 'status';
  searchQuery?: string;
}

export const ProjectGanttChart: React.FC<ProjectGanttChartProps> = ({
  projects,
  disbursedMap,
  onEdit,
  onDelete,
  onUpdateProject,
  onMonthClick,
  isDarkMode,
  filterGroup,
  sortBy,
  searchQuery = ''
}) => {
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [dragOverMonth, setDragOverMonth] = useState<number | null>(null);

  const months = getFiscalYearMonths();

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = filterGroup === 'ทั้งหมด' 
      ? projects 
      : projects.filter(p => p.group === filterGroup);

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'th');
        case 'budget':
          return b.budget - a.budget;
        case 'startMonth':
          return a.startMonth - b.startMonth;
        case 'status':
          return a.status.localeCompare(b.status, 'th');
        default:
          return 0;
      }
    });

    return sorted;
  }, [projects, filterGroup, sortBy, searchQuery]);

  // Calculate budget summary (ผลสะสมจริง % จากผลเบิกจ่ายเท่านั้น ไม่จำเป็นต้องเต็ม 100%)
  const budgetSummary = useMemo((): BudgetSummary[] => {
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    let cumulativeBudget = 0;
    let cumulativeDisbursed = 0;

    return months.map((_, index) => {
      const monthProjects = projects.filter(p => p.startMonth === index);
      const monthlyBudget = monthProjects.reduce((sum, p) => sum + p.budget, 0);
      const namesInMonth = new Set(monthProjects.map(p => p.name));
      const monthlyDisbursed = Array.from(namesInMonth).reduce(
        (sum, name) => sum + getDisbursedForActivityMonth(disbursedMap, name, index),
        0
      );

      cumulativeBudget += monthlyBudget;
      cumulativeDisbursed += monthlyDisbursed;
      const cumulativeActual = totalBudget > 0 ? (cumulativeDisbursed / totalBudget) * 100 : 0;
      const cumulativeTarget = CUMULATIVE_TARGETS[index];

      return {
        monthlyBudget,
        cumulativeBudget,
        cumulativeTarget,
        cumulativeActual
      };
    });
  }, [projects, months, disbursedMap]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, project: Project) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, monthIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverMonth(monthIndex);
  };

  const handleDragLeave = () => {
    setDragOverMonth(null);
  };

  const handleDrop = (e: React.DragEvent, monthIndex: number) => {
    e.preventDefault();
    if (draggedProject && draggedProject.startMonth !== monthIndex) {
      // Get current fiscal year
      const fiscalYear = getCurrentFiscalYear();
      
      // Update meeting dates to match new month while preserving the day
      const updatedDates = updateMeetingDatesToNewMonth(
        draggedProject.meetingStartDate,
        draggedProject.meetingEndDate,
        monthIndex,
        fiscalYear
      );
      
      // Create updated project with new month and updated meeting dates
      const updatedProject = { 
        ...draggedProject, 
        startMonth: monthIndex,
        ...updatedDates
      };
      
      onUpdateProject(updatedProject);
    }
    setDraggedProject(null);
    setDragOverMonth(null);
  };

  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-300';
  const headerBg = isDarkMode ? 'bg-gray-700' : 'bg-gray-100';

  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse ${bgColor} ${textColor}`}>
        {/* Header */}
        <thead className={`${headerBg} sticky top-0 z-10`}>
          <tr>
            <th className={`border ${borderColor} p-3 text-left min-w-[300px]`}>
              กิจกรรม
            </th>
            {months.map((month, index) => (
              <th
                key={index}
                className={`border ${borderColor} p-2 text-center min-w-[80px] cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900`}
                onClick={() => onMonthClick(index)}
                title="คลิกเพื่อดูปฏิทิน"
              >
                <div className="flex flex-col items-center gap-1">
                  <Calendar size={16} className="opacity-50" />
                  <div className="text-xs">{month.shortMonth}</div>
                  <div className="text-xs font-normal opacity-75">{month.year}</div>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {filteredAndSortedProjects.map((project) => (
            <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className={`border ${borderColor} p-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">{project.name}</div>
                    <div className="text-sm opacity-75">{project.group}</div>
                    <div className="text-sm mt-1">
                      แผน: {project.budget.toLocaleString('th-TH')} บาท
                    </div>
                    <div className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${
                      project.status === 'เสร็จสิ้น' ? 'bg-green-600 text-white' :
                      project.status === 'กำลังดำเนินการ' ? 'bg-blue-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {project.status}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(project)}
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                      title="แก้ไข"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(project.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                      title="ลบ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </td>

              {months.map((_, monthIndex) => (
                <td
                  key={monthIndex}
                  className={`border ${borderColor} p-2 text-center ${
                    dragOverMonth === monthIndex ? 'bg-blue-100 dark:bg-blue-900' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, monthIndex)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, monthIndex)}
                >
                  {project.startMonth === monthIndex && (() => {
                    const disp = getDisbursedForActivityMonth(disbursedMap, project.name, monthIndex);
                    return (
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, project)}
                        className={`${project.color} text-white px-2 py-1 rounded text-xs font-medium cursor-move hover:opacity-80 flex flex-col gap-0.5`}
                      >
                        <span title="งบแผน">{project.budget.toLocaleString('th-TH', { notation: 'compact' })}</span>
                        <span className="opacity-90 border-t border-white/30 pt-0.5 text-[10px]" title="ผลเบิกจ่าย (จาก query_DOC)">
                          {disp > 0 ? disp.toLocaleString('th-TH', { notation: 'compact' }) : '–'}
                        </span>
                      </div>
                    );
                  })()}
                </td>
              ))}
            </tr>
          ))}

          {filteredAndSortedProjects.length === 0 && (
            <tr>
              <td colSpan={13} className="text-center py-8 opacity-50">
                ไม่มีกิจกรรม
              </td>
            </tr>
          )}
        </tbody>

        {/* Footer - Budget Summary */}
        <tfoot className={`${headerBg} font-semibold`}>
          {/* Monthly Budget */}
          <tr>
            <td className={`border ${borderColor} p-3`}>งบประมาณรายเดือน</td>
            {budgetSummary.map((summary, index) => (
              <td key={index} className={`border ${borderColor} p-2 text-center text-sm`}>
                {summary.monthlyBudget > 0 && (
                  <div>{summary.monthlyBudget.toLocaleString('th-TH', { notation: 'compact' })}</div>
                )}
              </td>
            ))}
          </tr>

          {/* Cumulative Target % */}
          <tr>
            <td className={`border ${borderColor} p-3`}>เป้าหมายสะสม (%)</td>
            {budgetSummary.map((summary, index) => (
              <td key={index} className={`border ${borderColor} p-2 text-center text-sm`}>
                {summary.cumulativeTarget}%
              </td>
            ))}
          </tr>

          {/* Cumulative Actual % */}
          <tr>
            <td className={`border ${borderColor} p-3`}>ผลสะสมจริง (%)</td>
            {budgetSummary.map((summary, index) => (
              <td
                key={index}
                className={`border ${borderColor} p-2 text-center text-sm ${
                  summary.cumulativeActual >= summary.cumulativeTarget
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {summary.cumulativeActual.toFixed(1)}%
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
