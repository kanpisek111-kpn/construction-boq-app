import React, { useState, useMemo, useRef } from 'react';
import { ProjectSaveState, ProjectStatus } from '../types';
import { computeBOQSummary } from '../services/calculator';
import { Flow } from 'flow-sdk';

interface ProjectDashboardViewProps {
  projects: ProjectSaveState[];
  activeProjectId: string;
  onOpenProject: (id: string) => void;
  onCreateProject: (
    name: string, 
    area: number, 
    clientName?: string, 
    clientPhone?: string, 
    clientAddress?: string,
    status?: ProjectStatus
  ) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onImportProjectFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProjectDashboardView: React.FC<ProjectDashboardViewProps> = ({
  projects,
  activeProjectId,
  onOpenProject,
  onCreateProject,
  onDuplicateProject,
  onDeleteProject,
  onImportProjectFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Project Form State
  const [newProjectName, setNewProjectName] = useState('บ้านพักอาศัย คสล. 1-2 ชั้น พร้อมรั้วและโรงจอดรถ');
  const [newHouseArea, setNewHouseArea] = useState<number>(120);
  const [newCustomerName, setNewCustomerName] = useState('คุณสมศักดิ์ สุขเจริญ (เจ้าของโครงการ)');
  const [newCustomerPhone, setNewCustomerPhone] = useState('081-234-5678');
  const [newCustomerAddress, setNewCustomerAddress] = useState('แปลงที่ 14 หมู่บ้านสุขนิเวศน์ ต.บางกรวย อ.บางกรวย จ.นนทบุรี');
  const [newStatus, setNewStatus] = useState<ProjectStatus>('draft');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // คำนวณสรุปสถิติพอร์ตโฟลิโอรวมทุกโครงการ
  const portfolioStats = useMemo(() => {
    let totalValue = 0;
    let totalArea = 0;
    let constructionCount = 0;
    let draftCount = 0;
    let quotationCount = 0;

    projects.forEach(p => {
      totalArea += p.houseAreaSqm || 0;
      const sum = computeBOQSummary(p.items || [], p.overheadPercent ?? 7, p.vatPercent ?? 7);
      totalValue += sum.grandTotal;

      const st = p.status || 'draft';
      if (st === 'construction') constructionCount++;
      else if (st === 'quotation') quotationCount++;
      else draftCount++;
    });

    return {
      totalProjects: projects.length,
      totalValue,
      totalArea,
      constructionCount,
      draftCount,
      quotationCount,
    };
  }, [projects]);

  // กรองโครงการตามค้นหาและสถานะ
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Filter status
      const projectStatus = p.status || 'draft';
      if (statusFilter !== 'all' && projectStatus !== statusFilter) {
        return false;
      }

      // Filter search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = (p.projectName || '').toLowerCase().includes(q);
      const matchCustomer = (p.quotationMeta?.customerName || '').toLowerCase().includes(q);
      const matchPhone = (p.quotationMeta?.customerPhone || '').toLowerCase().includes(q);
      const matchAddress = (p.quotationMeta?.customerAddress || '').toLowerCase().includes(q);
      return matchName || matchCustomer || matchPhone || matchAddress;
    });
  }, [projects, searchQuery, statusFilter]);

  // Export single project backup
  const handleDownloadBackup = async (proj: ProjectSaveState, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const jsonStr = JSON.stringify(proj, null, 2);
      const bytes = new TextEncoder().encode(jsonStr);
      const base64 = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
      const safeProjectName = proj.projectName.replace(/[^a-zA-Z0-9ก-๙]/g, '_') || 'Project';
      await Flow.download({
        base64,
        mimeType: 'application/json',
        filename: `${safeProjectName}_${proj.houseAreaSqm}sqm_${Date.now()}.boq.json`
      });
    } catch (err) {
      console.error('Download project backup failed:', err);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateProject(
      newProjectName.trim(),
      newHouseArea || 120,
      newCustomerName.trim(),
      newCustomerPhone.trim(),
      newCustomerAddress.trim(),
      newStatus
    );
    setIsCreateModalOpen(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onImportProjectFile}
        accept=".json,.boq.json,application/json"
        className="hidden"
      />

      {/* Main Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <span className="material-symbols-outlined text-white text-2xl">grid_view</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>ระบบจัดการโครงการก่อสร้าง (Project Dashboard)</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              จัดการและบริหารรายการ BOQ, สัญญาจ้าง และงวดเงินของบ้านลูกค้าทุกโครงการในที่เดียว
            </p>
          </div>
        </div>

        {/* Action Buttons: Import & Create */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-teal-500/50 text-teal-300 hover:text-teal-200 text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-base text-teal-400">upload_file</span>
            <span>นำเข้าไฟล์ (.boq.json)</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/30 active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>+ สร้างโครงการใหม่</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: โครงการทั้งหมด */}
        <div className="bg-slate-900/90 border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">โครงการทั้งหมด</span>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              {portfolioStats.totalProjects}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">โครงการที่กำลังดูแล</span>
        </div>

        {/* Card 2: มูลค่างานรวมทั้งพอร์ต */}
        <div className="bg-slate-900/90 border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">มูลค่างานรวมทั้งพอร์ต</span>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
              ฿{portfolioStats.totalValue.toLocaleString()}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">งบประมาณรวมทุกโครงการ</span>
        </div>

        {/* Card 3: พื้นที่ก่อสร้างรวม */}
        <div className="bg-slate-900/90 border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">พื้นที่ก่อสร้างรวม</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">
              {portfolioStats.totalArea.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-cyan-300">ตร.ม.</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">พื้นที่ใช้สอยรวมทุกหลัง</span>
        </div>

        {/* Card 4: สถานะกำลังก่อสร้าง */}
        <div className="bg-slate-900/90 border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">สถานะกำลังก่อสร้าง</span>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {portfolioStats.constructionCount}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">กำลังหน้างานจริง</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/70 p-2.5 rounded-2xl border border-slate-800">
        {/* Search input */}
        <div className="flex items-center gap-2.5 bg-slate-950 border border-slate-800/90 rounded-xl px-3.5 py-2 flex-1 focus-within:border-amber-400/80 transition">
          <span className="material-symbols-outlined text-slate-500 text-sm">search</span>
          <input
            type="text"
            placeholder="ค้นหาชื่อโครงการ, ชื่อลูกค้า, หรือทำเลที่ตั้ง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
              statusFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>ทั้งหมด ({projects.length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
              statusFilter === 'draft'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>ร่างแบบ</span>
          </button>
          <button
            onClick={() => setStatusFilter('quotation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
              statusFilter === 'quotation'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>เสนอราคา</span>
          </button>
          <button
            onClick={() => setStatusFilter('construction')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
              statusFilter === 'construction'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>กำลังก่อสร้าง</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">folder_off</span>
            <p className="text-sm font-semibold text-slate-400">ไม่พบโครงการที่ค้นหา</p>
            <p className="text-xs text-slate-600 mt-1">ลองเปลี่ยนคำค้นหา หรือกด "+ สร้างโครงการใหม่"</p>
          </div>
        ) : (
          filteredProjects.map((proj) => {
            const isActive = proj.id === activeProjectId;
            const summary = computeBOQSummary(proj.items || [], proj.overheadPercent ?? 7, proj.vatPercent ?? 7);
            const costPerSqm = proj.houseAreaSqm > 0 ? Math.round(summary.grandTotal / proj.houseAreaSqm) : 0;
            const projectStatus = proj.status || 'draft';

            // Formatted date
            let updatedDateStr = '2026-10-24';
            try {
              if (proj.savedAt) {
                updatedDateStr = proj.savedAt.split('T')[0];
              }
            } catch {
              updatedDateStr = '2026-10-24';
            }

            return (
              <div
                key={proj.id}
                onClick={() => onOpenProject(proj.id)}
                className={`group relative rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900/95 border-2 border-amber-500 shadow-xl shadow-amber-500/10'
                    : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/95 hover:shadow-lg'
                }`}
              >
                {/* Top Section */}
                <div className="flex flex-col gap-3">
                  {/* Badges row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Status Badge */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {projectStatus === 'draft' && 'ร่างแบบ'}
                        {projectStatus === 'quotation' && 'เสนอราคา'}
                        {projectStatus === 'construction' && 'กำลังก่อสร้าง'}
                        {projectStatus === 'completed' && 'แล้วเสร็จ'}
                      </span>

                      {/* Active Project Badge */}
                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <span>กำลังเปิดทำงาน ★</span>
                        </span>
                      )}
                    </div>

                    {/* Area Badge */}
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {proj.houseAreaSqm} ตร.ม.
                    </span>
                  </div>

                  {/* Project Name */}
                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition line-clamp-2 leading-snug">
                    {proj.projectName}
                  </h3>

                  {/* Customer & Location */}
                  <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-xs text-slate-500 shrink-0">person</span>
                      <span className="truncate">
                        {proj.quotationMeta?.customerName || 'ยังไม่ระบุลูกค้า'}
                        {proj.quotationMeta?.customerPhone ? ` | ${proj.quotationMeta.customerPhone}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate text-slate-500">
                      <span className="material-symbols-outlined text-xs shrink-0">location_on</span>
                      <span className="truncate">
                        {proj.quotationMeta?.customerAddress || 'ยังไม่ระบุที่อยู่ทำเลก่อสร้าง'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Budget Box */}
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">งบประมาณ BOQ รวม</span>
                    <span className="text-lg font-black font-mono text-amber-400">
                      ฿{summary.grandTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">เฉลี่ย</span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      ฿{costPerSqm.toLocaleString()} / ตร.ม.
                    </span>
                  </div>
                </div>

                {/* Progress Bar (ความคืบหน้าหน้างานจริง) */}
                <div className="flex flex-col gap-1 text-[11px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-xs text-emerald-400">trending_up</span>
                      <span>ความคืบหน้าหน้างาน</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {(() => {
                        if (proj.customTasks && proj.customTasks.length > 0) {
                          const sum = proj.customTasks.reduce((s, t) => s + (t.progressPercent || 0), 0);
                          return Math.round(sum / proj.customTasks.length);
                        }
                        if (proj.milestones && proj.milestones.length > 0) {
                          const completed = proj.milestones.filter(m => m.status === 'paid' || m.status === 'approved').length;
                          return Math.round((completed / proj.milestones.length) * 100);
                        }
                        return 0;
                      })()}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                      style={{
                        width: `${(() => {
                          if (proj.customTasks && proj.customTasks.length > 0) {
                            const sum = proj.customTasks.reduce((s, t) => s + (t.progressPercent || 0), 0);
                            return Math.round(sum / proj.customTasks.length);
                          }
                          if (proj.milestones && proj.milestones.length > 0) {
                            const completed = proj.milestones.filter(m => m.status === 'paid' || m.status === 'approved').length;
                            return Math.round((completed / proj.milestones.length) * 100);
                          }
                          return 0;
                        })()}%`
                      }}
                    />
                  </div>
                </div>

                {/* Footer: Date & Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    อัปเดต {updatedDateStr}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Download Backup */}
                    <button
                      onClick={(e) => handleDownloadBackup(proj, e)}
                      className="w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95"
                      title="ดาวน์โหลดไฟล์สำรองโครงการ (.boq.json)"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateProject(proj.id);
                      }}
                      className="w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95"
                      title="ทำสำเนาโครงการนี้"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>

                    {/* Delete (if more than 1 project) */}
                    {projects.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`คุณต้องการลบโครงการ "${proj.projectName}" ใช่หรือไม่?`)) {
                            onDeleteProject(proj.id);
                          }
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 flex items-center justify-center transition active:scale-95"
                        title="ลบโครงการ"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}

                    {/* Open Project Button */}
                    <button
                      onClick={() => onOpenProject(proj.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-600/30 transition active:scale-95 ml-1"
                    >
                      <span>เปิดทำงาน</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: + สร้างโครงการใหม่ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">add_business</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">สร้างโครงการใหม่</h3>
                  <p className="text-xs text-slate-400">กรอกข้อมูลเบื้องต้นเพื่อเริ่มต้นถอดแบบ BOQ</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-xs">
              {/* ชื่อโครงการ */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  ชื่อโครงการ / สัญญาจ้าง <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="เช่น บ้านพักอาศัย คสล. 2 ชั้น คุณสมชาย"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* พื้นที่ใช้สอย & สถานะ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    พื้นที่ใช้สอยบ้าน (ตร.ม.) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    required
                    value={newHouseArea}
                    onChange={(e) => setNewHouseArea(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">สถานะโครงการ</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="draft">ร่างแบบ</option>
                    <option value="quotation">เสนอราคา</option>
                    <option value="construction">กำลังก่อสร้าง</option>
                    <option value="completed">แล้วเสร็จ</option>
                  </select>
                </div>
              </div>

              {/* ข้อมูลลูกค้า */}
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                  ข้อมูลลูกค้า / เจ้าของโครงการ
                </span>

                <div>
                  <label className="text-slate-400 block mb-1">ชื่อลูกค้า / นิติบุคคล</label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="เช่น คุณสมศักดิ์ สุขเจริญ (เจ้าของโครงการ)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">ที่อยู่ / สถานที่ก่อสร้าง</label>
                  <input
                    type="text"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    placeholder="เช่น แปลงที่ 14 หมู่บ้านสุขนิเวศน์ ต.บางกรวย อ.บางกรวย จ.นนทบุรี"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black shadow-md shadow-amber-500/30"
                >
                  สร้างโครงการทันที
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
