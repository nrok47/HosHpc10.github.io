import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Project, ProjectStatus } from '../types';
import { PROJECT_STATUSES, COLOR_OPTIONS, THAI_MONTHS } from '../constants';
import { dateToFiscalMonth, generateId } from '../utils';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  project?: Project;
  isDarkMode: boolean;
  groups: string[];
  onGroupsChange?: (groups: string[]) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  project,
  isDarkMode,
  groups,
  onGroupsChange,
}) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    group: '',
    budget: 0,
    disbursed: 0,
    startMonth: 0,
    color: COLOR_OPTIONS[0].value,
    status: 'ยังไม่เริ่ม',
    meetingStartDate: '',
    meetingEndDate: '',
    vehicle: '',
    chairman: '',
  });
  
  const [originalData, setOriginalData] = useState<Partial<Project>>({});
  const [isMonthLocked, setIsMonthLocked] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultGroup = groups.length > 0 ? groups[0] : '';
      const initialData: Partial<Project> = project ? { ...project } : {
        name: '',
        group: defaultGroup,
        budget: 0,
        disbursed: 0,
        startMonth: 0,
        color: COLOR_OPTIONS[0].value,
        status: 'ยังไม่เริ่ม' as ProjectStatus,
        meetingStartDate: '',
        meetingEndDate: '',
        vehicle: '',
        chairman: '',
      };
      if (initialData.disbursed === undefined) initialData.disbursed = 0;
      if (!initialData.group && defaultGroup) initialData.group = defaultGroup;
      setFormData(initialData);
      setOriginalData(initialData);
      setIsMonthLocked(!!initialData.meetingStartDate);
    }
  }, [isOpen, project, groups]);

  const hasUnsavedChanges = (): boolean => {
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    onClose();
  };

  const handleChange = (field: keyof Project, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-lock month when meeting start date is selected
      if (field === 'meetingStartDate' && value) {
        const fiscalMonth = dateToFiscalMonth(value);
        updated.startMonth = fiscalMonth;
        setIsMonthLocked(true);
      } else if (field === 'meetingStartDate' && !value) {
        setIsMonthLocked(false);
      }
      
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate date range
    if (formData.meetingStartDate && formData.meetingEndDate) {
      const startDate = new Date(formData.meetingStartDate);
      const endDate = new Date(formData.meetingEndDate);
      if (endDate < startDate) {
        alert('วันสิ้นสุดประชุมต้องมากกว่าหรือเท่ากับวันเริ่มประชุม');
        return;
      }
    }
    
    const newGroup = (formData.group || '').trim();
    if (newGroup && onGroupsChange && !groups.includes(newGroup)) {
      onGroupsChange([...groups, newGroup].sort());
    }
    const projectData: Project = {
      id: project?.id || generateId(),
      name: formData.name || '',
      group: newGroup || (groups[0] || ''),
      budget: formData.budget || 0,
      disbursed: formData.disbursed ?? 0,
      startMonth: formData.startMonth || 0,
      color: formData.color || COLOR_OPTIONS[0].value,
      status: formData.status || 'ยังไม่เริ่ม',
      meetingStartDate: formData.meetingStartDate || undefined,
      meetingEndDate: formData.meetingEndDate || undefined,
      vehicle: formData.vehicle || undefined,
      chairman: formData.chairman || undefined,
    };
    
    onSave(projectData);
    onClose();
  };

  if (!isOpen) return null;

  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-300';
  const inputBg = isDarkMode ? 'bg-gray-700' : 'bg-white';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={handleClose} />
      <div className={`fixed inset-0 z-50 overflow-y-auto`}>
        <div className="flex min-h-full items-center justify-center p-4">
          <div className={`${bgColor} ${textColor} rounded-lg shadow-xl max-w-2xl w-full`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${borderColor}`}>
              <h2 className="text-2xl font-bold">
                {project ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรมใหม่'}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium mb-2">ชื่อกิจกรรม *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-4 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
                  placeholder="ระบุชื่อกิจกรรม"
                />
              </div>

              {/* Group */}
              <div>
                <label className="block text-sm font-medium mb-2">กลุ่มงาน *</label>
                <input
                  type="text"
                  list="groups-list"
                  required
                  value={formData.group}
                  onChange={(e) => handleChange('group', e.target.value)}
                  className={`w-full px-4 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
                  placeholder="เลือกหรือพิมพ์ชื่อกลุ่มงานใหม่"
                />
                <datalist id="groups-list">
                  {groups.map(g => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium mb-2">งบประมาณแผน (บาท) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={Number.isFinite(Number(formData.budget)) ? formData.budget : ''}
                  onChange={(e) => handleChange('budget', parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
                  placeholder="0"
                />
              </div>

              {/* ผลเบิกจ่าย (ช่อง L ใน plans) */}
              <div>
                <label className="block text-sm font-medium mb-2">ผลเบิกจ่าย (บาท)</label>
                <input
                  type="number"
                  min="0"
                  value={Number.isFinite(Number(formData.disbursed)) ? (formData.disbursed ?? 0) : ''}
                  onChange={(e) => handleChange('disbursed', parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
                  placeholder="0"
                />
              </div>

              {/* Meeting Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">วันเริ่มประชุม</label>
                  <input
                    type="date"
                    value={formData.meetingStartDate}
                    onChange={(e) => handleChange('meetingStartDate', e.target.value)}
                    className={`w-full px-4 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">วันสิ้นสุดประชุม</label>
                  <input
                    type="date"
                    value={formData.meetingEndDate}
                    onChange={(e) => handleChange('meetingEndDate', e.target.value)}
                    min={formData.meetingStartDate || undefined}
                    className={`w-full px-4 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
                  />
                  {formData.meetingStartDate && formData.meetingEndDate && 
                   new Date(formData.meetingEndDate) < new Date(formData.meetingStartDate) && (
                    <p className="text-red-500 text-xs mt-1">วันสิ้นสุดต้องมากกว่าหรือเท่ากับวันเริ่มต้น</p>
                  )}
                </div>
              </div>

              {/* Start Month */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  เดือนที่เริ่ม *
                  {isMonthLocked && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                      (ถูกล็อคตามวันประชุม)
                    </span>
                  )}
                </label>
                <select
                  required
                  value={Number.isFinite(Number(formData.startMonth)) ? formData.startMonth : 0}
                  onChange={(e) => handleChange('startMonth', parseInt(e.target.value, 10) || 0)}
                  disabled={isMonthLocked}
                  className={`w-full px-4 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500 ${
                    isMonthLocked ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {THAI_MONTHS.map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">สถานะ *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value as ProjectStatus)}
                  className={`w-full px-4 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
                >
                  {PROJECT_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium mb-2">สี *</label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleChange('color', color.value)}
                      className={`${color.value} ${color.textColor} h-12 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
                        formData.color === color.value ? 'ring-4 ring-blue-500 scale-105' : 'hover:scale-105'
                      }`}
                      title={color.name}
                    >
                      {formData.color === color.value && '✓'}
                    </button>
                  ))}
                </div>
                {formData.color && (
                  <p className="text-sm mt-2 text-center opacity-75">
                    เลือก: {COLOR_OPTIONS.find(c => c.value === formData.color)?.name}
                  </p>
                )}
              </div>

              {/* Vehicle */}
              <div>
                <label className="block text-sm font-medium mb-2">รถราชการและพนักงานขับรถที่ใช้</label>
                <input
                  type="text"
                  value={formData.vehicle || ''}
                  onChange={(e) => handleChange('vehicle', e.target.value)}
                  className={`w-full px-4 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
                  placeholder="ระบุรถและพนักงาน (ถ้ามี)"
                />
              </div>

              {/* Chairman */}
              <div>
                <label className="block text-sm font-medium mb-2">ประธานในกิจกรรม</label>
                <input
                  type="text"
                  value={formData.chairman || ''}
                  onChange={(e) => handleChange('chairman', e.target.value)}
                  className={`w-full px-4 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
                  placeholder="ระบุชื่อประธาน (ถ้ามี)"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className={`px-6 py-2 border ${borderColor} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700`}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {project ? 'บันทึก' : 'เพิ่มกิจกรรม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {showUnsavedWarning && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-60" />
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
            <div className={`${bgColor} ${textColor} rounded-lg shadow-xl max-w-md w-full p-6`}>
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="text-yellow-500 flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-bold text-lg mb-2">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</h3>
                  <p className="text-sm opacity-75">คุณต้องการปิดหน้าต่างโดยไม่บันทึกการเปลี่ยนแปลงหรือไม่?</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowUnsavedWarning(false)}
                  className={`px-4 py-2 border ${borderColor} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700`}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmClose}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  ปิดโดยไม่บันทึก
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
