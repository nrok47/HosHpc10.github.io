import React, { useMemo, useState } from 'react';
import { Edit, Trash2, ArrowLeft, ChevronRight, Calendar } from 'lucide-react';
import { Project } from '../types';
import { BudgetSummary } from '../types';
import { getFiscalYearMonths, CUMULATIVE_TARGETS } from '../constants';
import { getProjectDisbursedInMonth } from '../utils-googlesheets';

interface ReportByGroupProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onMonthClick: (monthIndex: number) => void;
  isDarkMode: boolean;
}

interface GroupSummary {
  group: string;
  totalBudget: number;
  count: number;
  projects: Project[];
}

export const ReportByGroup: React.FC<ReportByGroupProps> = ({
  projects,
  onEdit,
  onDelete,
  onMonthClick,
  isDarkMode,
}) => {
  const [drillDownGroup, setDrillDownGroup] = useState<string | null>(null);

  const months = getFiscalYearMonths();

  // สรุปผลรวมเงินต่อกลุ่ม (เฉพาะกลุ่มที่มีกิจกรรม)
  const groupSummaries = useMemo((): GroupSummary[] => {
    const byGroup = new Map<string, Project[]>();
    for (const p of projects) {
      const list = byGroup.get(p.group) ?? [];
      list.push(p);
      byGroup.set(p.group, list);
    }
    return Array.from(byGroup.entries())
      .map(([group, list]) => ({
        group,
        totalBudget: list.reduce((s, p) => s + p.budget, 0),
        count: list.length,
        projects: list,
      }))
      .sort((a, b) => b.totalBudget - a.totalBudget);
  }, [projects]);

  // งบประมาณรายเดือน / เป้าหมายสะสม / ผลสะสมจริง (% จากผลเบิกจ่ายเท่านั้น)
  const budgetSummary = useMemo((): BudgetSummary[] => {
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    let cumulativeBudget = 0;
    let cumulativeDisbursed = 0;
    return months.map((_, index) => {
      const monthProjects = projects.filter((p) => p.startMonth === index);
      const monthlyBudget = monthProjects.reduce((sum, p) => sum + p.budget, 0);
      const monthlyDisbursed = monthProjects.reduce(
        (sum, p) => sum + getProjectDisbursedInMonth(p, index),
        0
      );
      cumulativeBudget += monthlyBudget;
      cumulativeDisbursed += monthlyDisbursed;
      const cumulativeActual = totalBudget > 0 ? (cumulativeDisbursed / totalBudget) * 100 : 0;
      return {
        monthlyBudget,
        cumulativeBudget,
        cumulativeTarget: CUMULATIVE_TARGETS[index],
        cumulativeActual,
      };
    });
  }, [projects, months]);

  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-300';
  const headerBg = isDarkMode ? 'bg-gray-700' : 'bg-gray-100';
  const hoverRow = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  // มุมมอง drill down: แสดงรายกิจกรรมของกลุ่มที่เลือก
  if (drillDownGroup) {
    const groupData = groupSummaries.find((g) => g.group === drillDownGroup);
    const groupProjects = groupData?.projects ?? [];

    return (
      <div className="overflow-x-auto">
        <div className={`p-3 ${headerBg} border-b ${borderColor} flex items-center gap-3 flex-wrap`}>
          <button
            type="button"
            onClick={() => setDrillDownGroup(null)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <ArrowLeft size={18} />
            กลับไปภาพรวมรายกลุ่ม
          </button>
          <span className="font-semibold">
            รายกิจกรรมของกลุ่ม: {drillDownGroup}
            {groupData && (
              <span className="ml-2 text-sm font-normal opacity-80">
                ({groupData.count} กิจกรรม · รวม {groupData.totalBudget.toLocaleString('th-TH')} บาท)
              </span>
            )}
          </span>
        </div>

        <table className={`w-full border-collapse ${bgColor} ${textColor}`}>
          <thead className={headerBg}>
            <tr>
              <th className={`border ${borderColor} p-3 text-left min-w-[300px]`}>กิจกรรม</th>
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
          <tbody>
            {groupProjects.map((project) => (
              <tr key={project.id} className={hoverRow}>
                <td className={`border ${borderColor} p-3`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold">{project.name}</div>
                      <div className="text-sm mt-1">
                        แผน: {project.budget.toLocaleString('th-TH')} บาท
                      </div>
                      <div
                        className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${
                          project.status === 'เสร็จสิ้น'
                            ? 'bg-green-600 text-white'
                            : project.status === 'กำลังดำเนินการ'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 text-white'
                        }`}
                      >
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
                  <td key={monthIndex} className={`border ${borderColor} p-2 text-center`}>
                    {project.startMonth === monthIndex && (() => {
                      const disp = getProjectDisbursedInMonth(project, monthIndex);
                      return (
                        <div className={`${project.color} text-white px-2 py-1 rounded text-xs font-medium inline-flex flex-col gap-0.5`}>
                          <span title="งบแผน">{project.budget.toLocaleString('th-TH', { notation: 'compact' })}</span>
                          <span className="opacity-90 border-t border-white/30 pt-0.5 text-[10px]" title="ผลเบิกจ่าย (ช่อง L)">
                            {disp > 0 ? disp.toLocaleString('th-TH', { notation: 'compact' }) : '–'}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                ))}
              </tr>
            ))}
            {groupProjects.length === 0 && (
              <tr>
                <td colSpan={13} className="text-center py-8 opacity-50">
                  ไม่มีกิจกรรมในกลุ่มนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // มุมมองหลัก: ภาพรวมรายกลุ่ม (ผลรวมเงินต่อกลุ่ม)
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse ${bgColor} ${textColor}`}>
        <thead className={headerBg}>
          <tr>
            <th className={`border ${borderColor} p-3 text-left`}>กลุ่มงาน</th>
            <th className={`border ${borderColor} p-3 text-center min-w-[100px]`}>จำนวนกิจกรรม</th>
            <th className={`border ${borderColor} p-3 text-right min-w-[160px]`}>ผลรวมเงิน (บาท)</th>
            <th className={`border ${borderColor} p-2 w-12`} />
          </tr>
        </thead>
        <tbody>
          {groupSummaries.map((row) => (
            <tr
              key={row.group}
              className={`${hoverRow} cursor-pointer`}
              onClick={() => setDrillDownGroup(row.group)}
            >
              <td className={`border ${borderColor} p-3 font-medium`}>{row.group}</td>
              <td className={`border ${borderColor} p-3 text-center`}>{row.count}</td>
              <td className={`border ${borderColor} p-3 text-right font-semibold`}>
                {row.totalBudget.toLocaleString('th-TH')}
              </td>
              <td className={`border ${borderColor} p-2 text-center`}>
                <ChevronRight size={20} className="inline opacity-60" />
              </td>
            </tr>
          ))}
          {groupSummaries.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-8 opacity-50">
                ไม่มีข้อมูลกลุ่มงาน
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className={headerBg}>
          <tr className="font-semibold">
            <td className={`border ${borderColor} p-3`}>รวมทั้งหมด</td>
            <td className={`border ${borderColor} p-3 text-center`}>{projects.length}</td>
            <td className={`border ${borderColor} p-3 text-right`}>
              {projects.reduce((s, p) => s + p.budget, 0).toLocaleString('th-TH')}
            </td>
            <td className={`border ${borderColor} p-2`} />
          </tr>
        </tfoot>
      </table>

      {/* สรุปงบประมาณรายเดือน / เป้าหมายสะสม / ผลสะสมจริง */}
      <table className={`w-full border-collapse ${bgColor} ${textColor} mt-6`}>
        <thead className={headerBg}>
          <tr>
            <th className={`border ${borderColor} p-2 text-left min-w-[160px]`}>รายการ</th>
            {months.map((month, index) => (
              <th key={index} className={`border ${borderColor} p-2 text-center min-w-[72px] text-xs`}>
                {month.shortMonth} {month.year}
              </th>
            ))}
          </tr>
        </thead>
        <tfoot className={headerBg}>
          <tr className="font-semibold text-sm">
            <td className={`border ${borderColor} p-2`}>งบประมาณรายเดือน</td>
            {budgetSummary.map((s, index) => (
              <td key={index} className={`border ${borderColor} p-2 text-center`}>
                {s.monthlyBudget > 0 && s.monthlyBudget.toLocaleString('th-TH', { notation: 'compact' })}
              </td>
            ))}
          </tr>
          <tr className="font-semibold text-sm">
            <td className={`border ${borderColor} p-2`}>เป้าหมายสะสม (%)</td>
            {budgetSummary.map((s, index) => (
              <td key={index} className={`border ${borderColor} p-2 text-center`}>
                {s.cumulativeTarget}%
              </td>
            ))}
          </tr>
          <tr className="font-semibold text-sm">
            <td className={`border ${borderColor} p-2`}>ผลสะสมจริง (%)</td>
            {budgetSummary.map((s, index) => (
              <td
                key={index}
                className={`border ${borderColor} p-2 text-center ${
                  s.cumulativeActual >= s.cumulativeTarget
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {s.cumulativeActual.toFixed(1)}%
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

      <p className="text-sm opacity-75 mt-3 px-1">
        คลิกที่แถวกลุ่มงานเพื่อดูรายกิจกรรมของกลุ่มนั้น
      </p>
    </div>
  );
};
