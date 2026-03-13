import { useState, useEffect, useCallback, startTransition } from 'react';
import { Plus, Download, Moon, Sun, Filter, ArrowUpDown, Search, Cloud, CloudOff, CheckCircle, X, Save } from 'lucide-react';
import { Project } from './types';
import { ToastContainer } from './components/Toast';
import { createToast, Toast } from './hooks/useToast'; 
import { 
  loadFromGoogleSheets, 
  loadGroups,
  saveToGoogleSheets, 
  updateGroupInSheets,
  deleteGroupInSheets,
  downloadCSV 
} from './utils-googlesheets';
import { ProjectGanttChart } from './components/ProjectGanttChart';
import { ReportByGroup } from './components/ReportByGroup';
import { ReportByGroupAndMonth } from './components/ReportByGroupAndMonth';
import { ProjectModal } from './components/ProjectModal';
import { CalendarModal } from './components/CalendarModal';
import { GroupsModal } from './components/GroupsModal';

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [filterGroup, setFilterGroup] = useState<string>('ทั้งหมด');
  const [sortBy, setSortBy] = useState<'name' | 'budget' | 'startMonth' | 'status'>('startMonth');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isOnline, setIsOnline] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'gantt' | 'report' | 'report-by-month'>('gantt');
  const [groups, setGroups] = useState<string[]>([]);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);

  // Helper function to add toast (wrapped in useCallback to prevent infinite loops)
  const addToast = useCallback((message: string, type: Toast['type']) => {
    const toast = createToast(message, type);
    setToasts(prev => [...prev, toast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('กลับมาออนไลน์แล้ว', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast('ออฟไลน์ - ไม่สามารถบันทึกได้', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setSyncStatus('syncing');
      
      try {
        const [googleProjects, groupList] = await Promise.all([
          loadFromGoogleSheets(),
          loadGroups(),
        ]);
        if (groupList.length > 0) setGroups(groupList);
        
        if (googleProjects && googleProjects.length > 0) {
          setProjects(googleProjects);
          if (groupList.length === 0) {
            const unique = [...new Set(googleProjects.map(p => p.group).filter(Boolean))].sort();
            setGroups(unique);
          }
          setSyncStatus('success');
          setHasUnsavedChanges(false);
          addToast('โหลดข้อมูลจาก Google Sheets สำเร็จ', 'success');
        } else {
          setProjects([]);
          setSyncStatus('idle');
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error('Error loading from Google Sheets:', error);
        setSyncStatus('error');
        setProjects([]);
        addToast('โหลดข้อมูลจาก Google Sheets ไม่ได้', 'error');
        setHasUnsavedChanges(false);
      }
      setIsLoading(false);
    };
    
    loadData();
  }, [addToast]);

  // Auto-save to Google Sheets only
  useEffect(() => {
    if (!isLoading && projects.length > 0) {
      setHasUnsavedChanges(true);
      
      if (isOnline) {
        const syncTimer = setTimeout(() => {
          saveToGoogleSheets(projects)
            .then((ok) => {
              if (ok) {
                setSyncStatus('success');
                setHasUnsavedChanges(false);
                setTimeout(() => setSyncStatus('idle'), 2000);
              } else {
                setSyncStatus('error');
                addToast('บันทึกลง Sheet ไม่สำเร็จ', 'error');
                setTimeout(() => setSyncStatus('idle'), 3000);
              }
            })
            .catch((error) => {
              console.error('Auto-sync to Google Sheets failed:', error);
              setSyncStatus('error');
              addToast('บันทึกลง Sheet ไม่สำเร็จ', 'error');
              setTimeout(() => setSyncStatus('idle'), 3000);
            });
        }, 1000);
        return () => clearTimeout(syncTimer);
      }
    }
  }, [projects, isLoading, isOnline]);

  // Load dark mode preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', String(newValue));
      return newValue;
    });
  };

  // CRUD operations
  const handleAddProject = () => {
    setSelectedProject(undefined);
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleSaveProject = (project: Project) => {
    if (selectedProject) {
      // Update existing
      setProjects(prev => prev.map(p => p.id === project.id ? project : p));
      addToast('แก้ไขกิจกรรมสำเร็จ', 'success');
    } else {
      // Add new
      setProjects(prev => [...prev, project]);
      addToast('เพิ่มกิจกรรมสำเร็จ', 'success');
    }
  };

  const handleDeleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (window.confirm(`คุณต้องการลบกิจกรรม "${project?.name}" หรือไม่?`)) {
      setProjects(prev => prev.filter(p => p.id !== id));
      addToast('ลบกิจกรรมสำเร็จ', 'success');
    }
  };

  const handleUpdateProject = (project: Project) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
  };

  // Manual save to Google Sheets
  const handleManualSave = async () => {
    if (!isOnline) {
      addToast('ไม่สามารถบันทึกได้ - กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', 'error');
      return;
    }

    try {
      setSyncStatus('syncing');
      const ok = await saveToGoogleSheets(projects);
      if (ok) {
        setSyncStatus('success');
        setHasUnsavedChanges(false);
        addToast('บันทึกข้อมูลลง Google Sheets สำเร็จ', 'success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        setSyncStatus('error');
        addToast('บันทึกข้อมูลลง Google Sheets ไม่สำเร็จ', 'error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Failed to save to Google Sheets:', error);
      setSyncStatus('error');
      addToast('ไม่สามารถบันทึกข้อมูลลง Google Sheets ได้', 'error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // Export to CSV
  const handleExport = () => {
    downloadCSV(projects, `projects_${new Date().toISOString().split('T')[0]}.csv`);
    addToast('ดาวน์โหลดไฟล์ CSV สำเร็จ', 'success');
  };

  // Open calendar
  const handleMonthClick = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setIsCalendarOpen(true);
  };

  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';

  if (isLoading) {
    return (
      <div className={`min-h-screen ${bgColor} ${textColor} flex items-center justify-center`}>
        <div className="text-xl">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`${cardBg} shadow-lg sticky top-0 z-20`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-600">
                ตารางกำกับและติดตามกิจกรรม
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ศูนย์อนามัยที่ 10 อุบลราชธานี
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => startTransition(() => setViewMode('gantt'))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'gantt'
                      ? 'bg-blue-600 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ตารางกำกับ (รายกิจกรรม)
                </button>
                <button
                  onClick={() => startTransition(() => setViewMode('report'))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'report'
                      ? 'bg-blue-600 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  รายงานภาพรวมรายกลุ่ม
                </button>
                <button
                  onClick={() => startTransition(() => setViewMode('report-by-month'))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'report-by-month'
                      ? 'bg-blue-600 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  รายงานภาพรวมรายกลุ่ม+รายเดือน
                </button>
              </div>
              {/* Sync Status Indicator */}
              <div className="flex items-center gap-1 text-sm">
                {!isOnline && (
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400" title="ออฟไลน์">
                    <CloudOff size={16} />
                  </div>
                )}
                {isOnline && syncStatus === 'syncing' && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400" title="กำลังซิงค์...">
                    <Cloud size={16} className="animate-pulse" />
                  </div>
                )}
                {isOnline && syncStatus === 'success' && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400" title="ซิงค์สำเร็จ">
                    <CheckCircle size={16} />
                  </div>
                )}
                {isOnline && syncStatus === 'error' && (
                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400" title="ซิงค์ล้มเหลว">
                    <CloudOff size={16} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title={isDarkMode ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Manual Save Button */}
              <button
                onClick={handleManualSave}
                disabled={!isOnline || syncStatus === 'syncing' || !hasUnsavedChanges}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  hasUnsavedChanges && isOnline
                    ? 'bg-orange-600 text-white hover:bg-orange-700 animate-pulse'
                    : 'bg-gray-400 text-white cursor-not-allowed opacity-50'
                }`}
                title={!isOnline ? 'ออฟไลน์ - ไม่สามารถบันทึกได้' : hasUnsavedChanges ? 'บันทึกข้อมูลลง Google Sheets' : 'ไม่มีการเปลี่ยนแปลง'}
              >
                <Save size={20} />
                <span className="hidden sm:inline">
                  {syncStatus === 'syncing' ? 'กำลังบันทึก...' : 'บันทึก'}
                </span>
                {hasUnsavedChanges && <span className="ml-1 text-xs">●</span>}
              </button>

              {/* Add Project */}
              <button
                onClick={() => setIsGroupsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                title="จัดการกลุ่มงาน"
              >
                <Filter size={20} />
                <span className="hidden sm:inline">กลุ่มงาน</span>
              </button>
              <button
                onClick={handleAddProject}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">เพิ่มกิจกรรม</span>
              </button>

              {/* Download CSV */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download size={20} />
                <span className="hidden sm:inline">ดาวน์โหลด</span>
              </button>
            </div>
          </div>

          {/* Filters and Sort - แสดงเฉพาะในมุมมองตารางกำกับ */}
          {viewMode === 'gantt' && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1">
              <Search size={20} />
              <input
                type="text"
                placeholder="ค้นหาชื่อกิจกรรม..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 px-3 py-2 border rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 placeholder-gray-400' 
                    : 'bg-white border-gray-300 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="ล้างการค้นหา"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Group Filter */}
            <div className="flex items-center gap-2">
              <Filter size={20} />
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className={`px-3 py-2 border rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-white border-gray-300'
                } focus:ring-2 focus:ring-blue-500`}
              >
                <option value="ทั้งหมด">ทุกกลุ่ม</option>
                {groups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={20} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`px-3 py-2 border rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-white border-gray-300'
                } focus:ring-2 focus:ring-blue-500`}
              >
                <option value="startMonth">เรียงตามเดือน</option>
                <option value="name">เรียงตามชื่อ</option>
                <option value="budget">เรียงตามงบประมาณ</option>
                <option value="status">เรียงตามสถานะ</option>
              </select>
            </div>

            {/* Summary */}
            <div className="flex-1 flex items-center justify-end gap-4 text-sm">
              <div>
                กิจกรรมทั้งหมด: <span className="font-bold">{projects.length}</span>
                {searchQuery && (
                  <span className="ml-1 text-blue-600 dark:text-blue-400">
                    (กรอง: {projects.filter(p => 
                      p.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length})
                  </span>
                )}
              </div>
              <div>
                งบประมาณรวม: <span className="font-bold">
                  {projects.reduce((sum, p) => sum + p.budget, 0).toLocaleString('th-TH')} บาท
                </span>
              </div>
            </div>
          </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`${cardBg} rounded-lg shadow-lg overflow-hidden`}>
          {viewMode === 'gantt' ? (
          <ProjectGanttChart
            projects={projects}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
            onUpdateProject={handleUpdateProject}
            onMonthClick={handleMonthClick}
            isDarkMode={isDarkMode}
            filterGroup={filterGroup}
            sortBy={sortBy}
            searchQuery={searchQuery}
          />
          ) : viewMode === 'report' ? (
          <ReportByGroup
            projects={projects}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
            onMonthClick={handleMonthClick}
            isDarkMode={isDarkMode}
          />
          ) : (
          <ReportByGroupAndMonth
            projects={projects}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
            onMonthClick={handleMonthClick}
            isDarkMode={isDarkMode}
          />
          )}
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Modals */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProject}
        project={selectedProject}
        isDarkMode={isDarkMode}
        groups={groups}
        onGroupsChange={setGroups}
      />
      <GroupsModal
        isOpen={isGroupsModalOpen}
        onClose={() => setIsGroupsModalOpen(false)}
        groups={groups}
        projects={projects}
        onRenameGroup={async (oldName, newName) => {
          const ok = await updateGroupInSheets(oldName, newName);
          if (ok) {
            setProjects(prev => prev.map(p => p.group === oldName ? { ...p, group: newName } : p));
            setGroups(prev => [...new Set(prev.map(g => g === oldName ? newName : g))].sort());
            addToast(`เปลี่ยนชื่อกลุ่ม "${oldName}" เป็น "${newName}" แล้ว`, 'success');
          }
        }}
        onDeleteGroup={async (name) => {
          if (!window.confirm(`ลบกลุ่ม "${name}" จะลบทุกกิจกรรมในกลุ่มนี้ด้วย. ต้องการดำเนินการหรือไม่?`)) return;
          const ok = await deleteGroupInSheets(name);
          if (ok) {
            setProjects(prev => prev.filter(p => p.group !== name));
            setGroups(prev => prev.filter(g => g !== name));
            addToast(`ลบกลุ่ม "${name}" แล้ว`, 'success');
          }
        }}
        isDarkMode={isDarkMode}
      />

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        monthIndex={selectedMonth}
        projects={projects}
        isDarkMode={isDarkMode}
      />

      {/* Footer */}
      <footer className="mt-8 pb-6 text-center text-sm opacity-75">
        <p>ปีงบประมาณ 2569 (ต.ค. 68 - ก.ย. 69) | ระบบติดตามงบประมาณกิจกรรม</p>
      </footer>
    </div>
  );
}

export default App;
