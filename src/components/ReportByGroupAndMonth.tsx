import React, { useMemo, useState } from 'react';
import { Edit, Trash2, ArrowLeft, Calendar } from 'lucide-react';
import { Project } from '../types';
import { getFiscalYearMonths, CUMULATIVE_TARGETS } from '../constants';
import { getProjectDisbursedInMonth } from '../utils-googlesheets';

interface ReportByGroupAndMonthProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onMonthClick: (monthIndex: number) => void;
  isDarkMode: boolean;
}

interface GroupMonthRow {
  group: string;
  byMonth: number[];        // index = monthIndex, value = sum budget (แผน)
  byMonthDisbursed: number[]; // index = monthIndex, value = sum ผลเบิกจ่าย
  total: number;
  count: number;
  projects: Project[];
}

export const ReportByGroupAndMonth: React.FC<ReportByGroupAndMonthProps> = ({
  projects,
  onEdit,
  onDelete,
  onMonthClick,
  isDarkMode,
}) => {
  const [drillDown, setDrillDown] = useState<{ group: string; monthIndex: number } | null>(null);

  const months = getFiscalYearMonths();

  // สรุปรายกลุ่ม + รายเดือน (ผลรวมเงินต่อกลุ่มต่อเดือน)
  const groupMonthRows = useMemo((): GroupMonthRow[] => {
    const byGroup = new Map<string, Project[]>();
    for (const p of projects) {
      const list = byGroup.get(p.group) ?? [];
      list.push(p);
      byGroup.set(p.group, list);
    }
    return Array.from(byGroup.entries())
      .map(([group, list]) => {
        const byMonth = new Array(12).fill(0);
        const byMonthDisbursed = new Array(12).fill(0);
        let total = 0;
        for (const p of list) {
          byMonth[p.startMonth] += p.budget;
          total += p.budget;
        }
        for (const p of list) {
          byMonthDisbursed[p.startMonth] += getProjectDisbursedInMonth(p, p.startMonth);
        }
        return {
          group,
          byMonth,
          byMonthDisbursed,
          total,
          count: list.length,
          projects: list,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [projects]);

  const monthlyTotals = useMemo(() => {
    const t = new Array(12).fill(0);
    for (const p of projects) {
      t[p.startMonth] += p.budget;
    }
    return t;
  }, [projects]);

  const grandTotal = useMemo(
    () => projects.reduce((s, p) => s + p.budget, 0),
    [projects]
  );

  // ผลสะสมจริง (%) = สะสมผลเบิกจ่าย / งบแผนรวม * 100 (จากผลเบิกจ่ายเท่านั้น ไม่เต็ม 100% ก็ได้)
  const monthlyDisbursedTotals = useMemo(() => {
    const t = new Array(12).fill(0);
    for (const p of projects) {
      t[p.startMonth] += getProjectDisbursedInMonth(p, p.startMonth);
    }
    return t;
  }, [projects]);

  const cumulativeActualPct = useMemo(() => {
    let cum = 0;
    return monthlyDisbursedTotals.map((m) => {
      cum += m;
      return grandTotal > 0 ? (cum / grandTotal) * 100 : 0;
    });
  }, [monthlyDisbursedTotals, grandTotal]);

  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-300';
  const headerBg = isDarkMode ? 'bg-gray-700' : 'bg-gray-100';
  const hoverCell = isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100';

  // Drill down: แสดงรายกิจกรรมของกลุ่มที่เริ่มในเดือนที่เลือก
  if (drillDown) {
    const { group, monthIndex } = drillDown;
    const groupRow = groupMonthRows.find((r) => r.group === group);
    const groupProjects = groupRow?.projects ?? [];
    const inMonth = groupProjects.filter((p) => p.startMonth === monthIndex);

    return (
      <div className="overflow-x-auto">
        <div className={`p-3 ${headerBg} border-b ${borderColor} flex items-center gap-3 flex-wrap`}>
          <button
            type="button"
            onClick={() => setDrillDown(null)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <ArrowLeft size={18} />
            กลับไปภาพรวมรายกลุ่ม+รายเดือน
          </button>
          <span className="font-semibold">
            รายกิจกรรมของกลุ่ม «{group}» ที่เริ่มในเดือน {months[monthIndex]?.shortMonth ?? ''} ({months[monthIndex]?.year ?? ''})
            <span className="ml-2 text-sm font-normal opacity-80">
              ({inMonth.length} กิจกรรม · รวม {inMonth.reduce((s, p) => s + p.budget, 0).toLocaleString('th-TH')} บาท)
            </span>
          </span>
        </div>

        <table className={`w-full border-collapse ${bgColor} ${textColor}`}>
          <thead className={headerBg}>
            <tr>
              <th className={`border ${borderColor} p-3 text-left`}>กิจกรรม</th>
              <th className={`border ${borderColor} p-2 text-right`}>แผน / ผลเบิกจ่าย (บาท)</th>
              <th className={`border ${borderColor} p-2 text-center`}>สถานะ</th>
              <th className={`border ${borderColor} p-2 w-24`} />
            </tr>
          </thead>
          <tbody>
            {inMonth.map((project) => (
              <tr key={project.id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                <td className={`border ${borderColor} p-3 font-medium`}>{project.name}</td>
                <td className={`border ${borderColor} p-3 text-right`}>
                  <div className="flex flex-col gap-0.5 items-end">
                    <span title="งบแผน">{project.budget.toLocaleString('th-TH')}</span>
                    <span className="text-xs opacity-80" title="ผลเบิกจ่าย (จาก query_DOC)">
                      {getProjectDisbursedInMonth(project, monthIndex).toLocaleString('th-TH')}
                    </span>
                  </div>
                </td>
                <td className={`border ${borderColor} p-2 text-center`}>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs ${
                      project.status === 'เสร็จสิ้น'
                        ? 'bg-green-600 text-white'
                        : project.status === 'กำลังดำเนินการ'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-white'
                    }`}
                  >
                    {project.status}
                  </span>
                </td>
                <td className={`border ${borderColor} p-2`}>
                  <div className="flex gap-1 justify-end">
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
                </td>
              </tr>
            ))}
            {inMonth.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 opacity-50">
                  ไม่มีกิจกรรมในกลุ่มนี้ที่เริ่มในเดือนนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // มุมมองหลัก: ตาราง กลุ่ม x เดือน
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse ${bgColor} ${textColor}`}>
        <thead className={`${headerBg} sticky top-0 z-10`}>
          <tr>
            <th className={`border ${borderColor} p-3 text-left min-w-[220px]`}>กลุ่มงาน</th>
            {months.map((month, index) => (
              <th
                key={index}
                className={`border ${borderColor} p-2 text-center min-w-[72px] cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900`}
                onClick={() => onMonthClick(index)}
                title="คลิกเพื่อดูปฏิทิน"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <Calendar size={14} className="opacity-50" />
                  <span className="text-xs">{month.shortMonth}</span>
                  <span className="text-xs font-normal opacity-75">{month.year}</span>
                </div>
              </th>
            ))}
            <th className={`border ${borderColor} p-2 text-right min-w-[90px] font-semibold`}>
              รวม
            </th>
          </tr>
        </thead>
        <tbody>
          {groupMonthRows.map((row) => (
            <tr key={row.group} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
              <td className={`border ${borderColor} p-3 font-medium`}>
                <span>{row.group}</span>
                <span className="block text-xs opacity-75 mt-0.5">{row.count} กิจกรรม</span>
              </td>
              {row.byMonth.map((value, monthIndex) => {
                const disp = row.byMonthDisbursed[monthIndex] ?? 0;
                const hasValue = value > 0 || disp > 0;
                return (
                  <td
                    key={monthIndex}
                    className={`border ${borderColor} p-2 text-right text-sm ${hoverCell} cursor-pointer ${
                      hasValue ? 'font-medium' : 'opacity-50'
                    }`}
                    onClick={() => hasValue && setDrillDown({ group: row.group, monthIndex })}
                    title={hasValue ? `คลิกดูรายกิจกรรม (${row.group} - ${months[monthIndex].shortMonth})` : undefined}
                  >
                    {hasValue ? (
                      <div className="inline-flex flex-col gap-0.5 items-end">
                        <span title="งบแผน">{value > 0 ? value.toLocaleString('th-TH', { notation: 'compact' }) : '–'}</span>
                        <span className="text-[10px] opacity-80 border-t border-current/30 pt-0.5" title="ผลเบิกจ่าย">
                          {disp > 0 ? disp.toLocaleString('th-TH', { notation: 'compact' }) : '–'}
                        </span>
                      </div>
                    ) : '–'}
                  </td>
                );
              })}
              <td className={`border ${borderColor} p-2 text-right font-semibold`}>
                {row.total.toLocaleString('th-TH')}
              </td>
            </tr>
          ))}
          {groupMonthRows.length === 0 && (
            <tr>
              <td colSpan={14} className="text-center py-8 opacity-50">
                ไม่มีข้อมูล
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className={headerBg}>
          <tr className="font-semibold text-sm">
            <td className={`border ${borderColor} p-2`}>งบประมาณรายเดือน</td>
            {monthlyTotals.map((value, index) => (
              <td key={index} className={`border ${borderColor} p-2 text-right text-sm`}>
                {value > 0 ? value.toLocaleString('th-TH', { notation: 'compact' }) : '–'}
              </td>
            ))}
            <td className={`border ${borderColor} p-2 text-right`}>
              {grandTotal.toLocaleString('th-TH')}
            </td>
          </tr>
          <tr className="font-semibold text-sm">
            <td className={`border ${borderColor} p-2`}>เป้าหมายสะสม (%)</td>
            {CUMULATIVE_TARGETS.map((target, index) => (
              <td key={index} className={`border ${borderColor} p-2 text-center`}>
                {target}%
              </td>
            ))}
            <td className={`border ${borderColor} p-2`} />
          </tr>
          <tr className="font-semibold text-sm">
            <td className={`border ${borderColor} p-2`}>ผลสะสมจริง (%)</td>
            {cumulativeActualPct.map((pct, index) => (
              <td
                key={index}
                className={`border ${borderColor} p-2 text-center ${
                  pct >= CUMULATIVE_TARGETS[index]
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {pct.toFixed(1)}%
              </td>
            ))}
            <td className={`border ${borderColor} p-2`} />
          </tr>
        </tfoot>
      </table>
      <p className="text-sm opacity-75 mt-3 px-1">
        คลิกที่ตัวเลขในเซลล์ (กลุ่ม x เดือน) เพื่อดูรายกิจกรรมที่เริ่มในเดือนนั้น
      </p>
    </div>
  );
};
