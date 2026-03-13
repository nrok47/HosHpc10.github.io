import React, { useState } from 'react';
import { X, Edit2, Trash2 } from 'lucide-react';

interface GroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: string[];
  projects: { id: string; name: string; group: string }[];
  onRenameGroup: (oldName: string, newName: string) => Promise<void>;
  onDeleteGroup: (name: string) => Promise<void>;
  isDarkMode: boolean;
}

export const GroupsModal: React.FC<GroupsModalProps> = ({
  isOpen,
  onClose,
  groups,
  projects,
  onRenameGroup,
  onDeleteGroup,
  isDarkMode,
}) => {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!isOpen) return null;

  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-300';
  const inputBg = isDarkMode ? 'bg-gray-700' : 'bg-white';

  const countInGroup = (name: string) => projects.filter(p => p.group === name).length;

  const handleStartEdit = (name: string) => {
    setEditing(name);
    setEditValue(name);
  };

  const handleSaveRename = async () => {
    if (!editing || editValue.trim() === editing) {
      setEditing(null);
      return;
    }
    await onRenameGroup(editing, editValue.trim());
    setEditing(null);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        <div className={`${bgColor} ${textColor} rounded-lg shadow-xl max-w-lg w-full`}>
          <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
            <h2 className="text-xl font-bold">จัดการกลุ่มงาน</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded">
              <X size={20} />
            </button>
          </div>
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            <p className="text-sm opacity-75 mb-4">
              กลุ่มงานดึงจากชีต plans (คอลัมน์ C) — เปลี่ยนชื่อหรือลบกลุ่มได้ (ลบกลุ่มจะลบทุกกิจกรรมในกลุ่มนั้น)
            </p>
            <ul className="space-y-2">
              {groups.map((name) => (
                <li
                  key={name}
                  className={`flex items-center justify-between gap-2 p-3 rounded-lg border ${borderColor}`}
                >
                  {editing === name ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded ${borderColor} ${inputBg} ${textColor}`}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveRename}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        บันทึก
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-3 py-1 border rounded hover:bg-gray-700"
                      >
                        ยกเลิก
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="font-medium">{name}</span>
                        <span className="ml-2 text-sm opacity-75">
                          ({countInGroup(name)} กิจกรรม)
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStartEdit(name)}
                          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                          title="เปลี่ยนชื่อกลุ่ม"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteGroup(name)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                          title="ลบกลุ่ม (และทุกกิจกรรมในกลุ่ม)"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {groups.length === 0 && (
              <p className="text-sm opacity-75 py-4">ยังไม่มีกลุ่มงาน — เพิ่มกิจกรรมแล้วเลือกกลุ่ม หรือพิมพ์ชื่อกลุ่มใหม่ในฟอร์มเพิ่มกิจกรรม</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
