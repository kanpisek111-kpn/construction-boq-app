import React, { useState } from 'react';
import { ProjectSaveState } from '../types';
import { DEFAULT_STANDARD_BOQ, DEFAULT_QUOTATION_META, DEFAULT_PAYMENT_MILESTONES } from '../constants';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectSaveState[];
  activeProjectId: string;
  onSwitchProject: (id: string) => void;
  onCreateProject: (name: string, area: number) => void;
  onDuplicateProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSwitchProject,
  onCreateProject,
  onDuplicateProject,
  onRenameProject,
  onDeleteProject,
}) => {
  const [newProjectName, setNewProjectName] = useState('บ้านพักอาศัย คสล. 1-2 ชั้น');
  const [newProjectArea, setNewProjectArea] = useState(120);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim(), newProjectArea);
    setNewProjectName('บ้านพักอาศัย คสล. 1-2 ชั้น');
    setNewProjectArea(120);
  };

  const handleStartRename = (proj: ProjectSaveState) => {
    setRenamingId(proj.id);
    setRenameValue(proj.projectName);
  };

  const handleCommitRename = (id: string) => {
    if (renameValue.trim()) {
      onRenameProject(id, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleSwitchAndClose = (id: string) => {
    onSwitchProject(id);
    onClose();
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '—';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
              <span className="material-symbols-outlined text-white text-xl">folder_open</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">จัดการโครงการ</h2>
              <p className="text-[11px] text-slate-400">{projects.length} โครงการทั้งหมด • กดเปิดเพื่อสลับโครงการ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {projects.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">
              ยังไม่มีโครงการ — สร้างโครงการแรกด้านล่าง
            </div>
          )}
          {projects.map((proj) => {
            const isActive = proj.id === activeProjectId;
            const isRenaming = renamingId === proj.id;
            const isDeleteConfirm = deleteConfirmId === proj.id;
            return (
              <div
                key={proj.id}
                className={`rounded-xl border p-3.5 flex flex-col gap-2 transition ${
                  isActive
                    ? 'bg-indigo-950/60 border-indigo-500/60 shadow-lg shadow-indigo-950/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <span className="material-symbols-outlined text-base">
                        {isActive ? 'check_circle' : 'home_work'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCommitRename(proj.id);
                            if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                          }}
                          onBlur={() => handleCommitRename(proj.id)}
                          className="w-full bg-slate-800 border border-indigo-400 rounded-lg px-2 py-1 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-white truncate">{proj.projectName}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {proj.houseAreaSqm} ตร.ม.
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {proj.items.length} รายการ
                        </span>
                        {isActive && (
                          <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-bold">
                            กำลังใช้งาน
                          </span>
                        )}
                        <span className="text-[10px] text-slate-600 font-mono">
                          อัปเดต: {formatDate(proj.savedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!isDeleteConfirm && (
                    <div className="flex items-center gap-1 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => handleSwitchAndClose(proj.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition active:scale-95"
                          title="สลับมาโครงการนี้"
                        >
                          <span className="material-symbols-outlined text-xs">open_in_new</span>
                          <span>เปิด</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleStartRename(proj)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-amber-600 text-slate-400 hover:text-white flex items-center justify-center transition"
                        title="เปลี่ยนชื่อ"
                      >
                        <span className="material-symbols-outlined text-xs">edit</span>
                      </button>
                      <button
                        onClick={() => onDuplicateProject(proj.id)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-teal-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                        title="ทำสำเนาโครงการ"
                      >
                        <span className="material-symbols-outlined text-xs">content_copy</span>
                      </button>
                      {projects.length > 1 && (
                        <button
                          onClick={() => setDeleteConfirmId(proj.id)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                          title="ลบโครงการ"
                        >
                          <span className="material-symbols-outlined text-xs">delete</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Delete confirm inline */}
                  {isDeleteConfirm && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-rose-300 font-semibold">ลบโครงการนี้?</span>
                      <button
                        onClick={() => {
                          onDeleteProject(proj.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition active:scale-95"
                      >
                        ยืนยัน
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create New Project */}
        <div className="border-t border-slate-800 p-4 bg-slate-950/60 shrink-0">
          <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            สร้างโครงการใหม่
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="ชื่อโครงการ..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400 transition"
            />
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 w-44 shrink-0">
              <span className="text-xs text-slate-400 shrink-0">พื้นที่:</span>
              <input
                type="number"
                value={newProjectArea}
                min={30}
                max={2000}
                step={10}
                onChange={(e) => setNewProjectArea(parseInt(e.target.value) || 120)}
                className="w-full bg-transparent text-sm font-mono text-amber-400 font-bold focus:outline-none text-right"
              />
              <span className="text-xs text-slate-400 shrink-0">ตร.ม.</span>
            </div>
            <button
              onClick={handleCreate}
              disabled={!newProjectName.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition shadow active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>สร้าง</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-2">
            โครงการใหม่จะเริ่มต้นด้วยรายการ BOQ มาตรฐานตามขนาดพื้นที่บ้านที่กำหนด
          </p>
        </div>
      </div>
    </div>
  );
};
