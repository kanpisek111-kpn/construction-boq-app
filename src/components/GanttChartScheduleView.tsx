import React, { useState, useMemo } from 'react';
import { PaymentMilestone, GanttTask, ConstructionCategory } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { Flow } from 'flow-sdk';

interface GanttChartScheduleViewProps {
  milestones: PaymentMilestone[];
  projectName: string;
  projectStartDate?: string;
  onUpdateMilestones?: (updated: PaymentMilestone[]) => void;
  grandTotal?: number;
  tasks?: GanttTask[];
  onUpdateTasks?: (updated: GanttTask[]) => void;
  onUpdateProjectStartDate?: (newDate: string) => void;
}

// สร้างงานก่อสร้างมาตรฐานอัตโนมัติตามเนื้องานของแต่ละงวด
function generateDefaultGanttTasks(milestones: PaymentMilestone[]): GanttTask[] {
  const tasks: GanttTask[] = [];
  let currentDayCursor = 0;

  milestones.forEach((m) => {
    const milestoneDuration = m.durationDays || 30;
    const deliverables = m.deliverables && m.deliverables.length > 0 ? m.deliverables : ['ดำเนินงานตามงวดงาน'];
    const taskDuration = Math.max(5, Math.round(milestoneDuration / deliverables.length));

    deliverables.forEach((deliv, idx) => {
      const taskStart = currentDayCursor + (idx * Math.floor(taskDuration * 0.8));
      tasks.push({
        id: `task-${m.milestoneNumber}-${idx}-${Date.now()}`,
        milestoneNumber: m.milestoneNumber,
        name: deliv,
        startDayOffset: taskStart,
        durationDays: taskDuration,
        progressPercent: m.status === 'paid' ? 100 : m.status === 'in_progress' ? (idx === 0 ? 80 : 30) : 0,
        isCritical: idx === 0,
        assignedContractor: m.milestoneNumber === 1 ? 'ทีมเสาเข็ม & โครงสร้าง' : m.milestoneNumber === 2 ? 'ทีมโครงสร้าง & หลังคา' : m.milestoneNumber === 3 ? 'ทีมก่อฉาบ & สถาปัตย์' : 'ทีมสถาปัตย์ & ช่างระบบ'
      });
    });

    currentDayCursor += milestoneDuration;
  });

  return tasks;
}

export const GanttChartScheduleView: React.FC<GanttChartScheduleViewProps> = ({
  milestones,
  projectName,
  projectStartDate: initialStartDate,
  onUpdateMilestones,
  grandTotal = 0,
  tasks: propTasks,
  onUpdateTasks,
  onUpdateProjectStartDate
}) => {
  const [projectStartDate, setProjectStartDate] = useState<string>(
    initialStartDate || new Date().toISOString().split('T')[0]
  );
  const [viewZoom, setViewZoom] = useState<'day' | 'week' | 'month'>('week');
  const [activeMilestoneFilter, setActiveMilestoneFilter] = useState<'all' | number>('all');
  const [tasks, setTasks] = useState<GanttTask[]>(() => {
    if (propTasks && propTasks.length > 0) return propTasks;
    return generateDefaultGanttTasks(milestones);
  });

  // Sync when propTasks change externally
  React.useEffect(() => {
    if (propTasks && propTasks.length > 0) {
      setTasks(propTasks);
    }
  }, [propTasks]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // คำนวณวันทำงานรวมทั้งหมดของโครงการ
  const totalProjectDays = useMemo(() => {
    return milestones.reduce((sum, m) => sum + (m.durationDays || 30), 0);
  }, [milestones]);

  // คำนวณวันสิ้นสุดโครงการ
  const projectEndDate = useMemo(() => {
    const d = new Date(projectStartDate);
    d.setDate(d.getDate() + totalProjectDays);
    return d.toISOString().split('T')[0];
  }, [projectStartDate, totalProjectDays]);

  // คำนวณระยะเวลาสะสมของแต่ละงวดงาน
  const milestoneTimeRanges = useMemo(() => {
    let dayAcc = 0;
    return milestones.map((m) => {
      const startDay = dayAcc;
      const duration = m.durationDays || 30;
      const endDay = dayAcc + duration;
      dayAcc = endDay;

      const startDateObj = new Date(projectStartDate);
      startDateObj.setDate(startDateObj.getDate() + startDay);

      const endDateObj = new Date(projectStartDate);
      endDateObj.setDate(endDateObj.getDate() + endDay);

      return {
        ...m,
        startDay,
        endDay,
        duration,
        startDateStr: startDateObj.toISOString().split('T')[0],
        endDateStr: endDateObj.toISOString().split('T')[0]
      };
    });
  }, [milestones, projectStartDate]);

  // คอลัมน์สเกลเวลา (ตามวัน/สัปดาห์/เดือน)
  const timeScaleColumns = useMemo(() => {
    const cols = [];
    if (viewZoom === 'day') {
      const step = Math.max(1, Math.ceil(totalProjectDays / 40));
      for (let day = 0; day <= totalProjectDays; day += step) {
        const curDate = new Date(projectStartDate);
        curDate.setDate(curDate.getDate() + day);
        cols.push({
          label: `D+${day}`,
          subLabel: `${curDate.getDate()}/${curDate.getMonth() + 1}`,
          dayOffset: day
        });
      }
    } else if (viewZoom === 'week') {
      const weeksCount = Math.ceil(totalProjectDays / 7) + 1;
      for (let w = 0; w < weeksCount; w++) {
        const dayOffset = w * 7;
        const curDate = new Date(projectStartDate);
        curDate.setDate(curDate.getDate() + dayOffset);
        cols.push({
          label: `W${w + 1}`,
          subLabel: `${curDate.getDate()} ${curDate.toLocaleString('th-TH', { month: 'short' })}`,
          dayOffset
        });
      }
    } else {
      // Month scale
      const monthsCount = Math.ceil(totalProjectDays / 30) + 1;
      for (let m = 0; m < monthsCount; m++) {
        const dayOffset = m * 30;
        const curDate = new Date(projectStartDate);
        curDate.setDate(curDate.getDate() + dayOffset);
        cols.push({
          label: `เดือน ${m + 1}`,
          subLabel: curDate.toLocaleString('th-TH', { month: 'short', year: '2-digit' }),
          dayOffset
        });
      }
    }
    return cols;
  }, [viewZoom, totalProjectDays, projectStartDate]);

  // กรอง Tasks ตามงวดงาน
  const visibleTasks = useMemo(() => {
    if (activeMilestoneFilter === 'all') return tasks;
    return tasks.filter(t => t.milestoneNumber === activeMilestoneFilter);
  }, [tasks, activeMilestoneFilter]);

  // สรุป % ความคืบหน้ารวมของโครงการ
  const overallProgressPercent = useMemo(() => {
    if (tasks.length === 0) return 0;
    const totalProg = tasks.reduce((sum, t) => sum + (t.progressPercent || 0), 0);
    return Math.round(totalProg / tasks.length);
  }, [tasks]);

  const handleUpdateTask = (id: string, patch: Partial<GanttTask>) => {
    setTasks(prev => {
      const nextTasks = prev.map(t => t.id === id ? { ...t, ...patch } : t);
      if (onUpdateTasks) {
        onUpdateTasks(nextTasks);
      }
      return nextTasks;
    });
  };

  const handlePrintGantt = () => {
    window.print();
  };

  // ส่งออกเป็น CSV แผนงาน
  const handleExportScheduleCSV = async () => {
    setIsExporting(true);
    try {
      let csv = '\uFEFF';
      csv += `แผนงานก่อสร้างและไทม์ไลน์งวดงาน (Construction Schedule & Gantt Chart),โครงการ "${projectName.replace(/"/g, '""')}"\n`;
      csv += `วันเริ่มโครงการ,${projectStartDate},วันส่งมอบงานโดยประมาณ,${projectEndDate},ระยะเวลารวม,${totalProjectDays},วัน\n`;
      csv += `ความคืบหน้ารวมของโครงการ,${overallProgressPercent}%\n\n`;
      csv += 'งวดที่,ชื่องวดงาน,สัดส่วน(%),ยอดเงินงวด(บาท),วันเริ่มต้นงวด,วันสิ้นสุดงวด,ระยะเวลางวด(วัน)\n';

      milestoneTimeRanges.forEach(m => {
        const amt = Math.round(grandTotal * (m.percentage / 100));
        csv += `${m.milestoneNumber},"${m.title.replace(/"/g, '""')}",${m.percentage}%,${amt},${m.startDateStr},${m.endDateStr},${m.duration}\n`;
      });

      csv += '\nลำดับงาน,งวดงาน,ชื่องานก่อสร้าง (Task),เริ่มวันที่ (วันนับจากเริ่ม),ระยะเวลา (วัน),ความคืบหน้า (%),ผู้รับผิดชอบ\n';
      tasks.forEach((t, i) => {
        const taskStartDate = new Date(projectStartDate);
        taskStartDate.setDate(taskStartDate.getDate() + t.startDayOffset);
        csv += `${i + 1},งวดที่ ${t.milestoneNumber},"${t.name.replace(/"/g, '""')}","${taskStartDate.toISOString().split('T')[0]} (D+${t.startDayOffset})",${t.durationDays},${t.progressPercent}%,"${t.assignedContractor || '-'}"\n`;
      });

      const base64 = btoa(unescape(encodeURIComponent(csv)));
      await Flow.download({
        base64,
        mimeType: 'text/csv;charset=utf-8',
        filename: `Schedule_Gantt_${projectName.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}_${Date.now()}.csv`
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full gap-4 text-slate-100">
      
      {/* 🧭 Top Summary & Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
        
        {/* Card 1: Project Timeline Meta */}
        <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 p-3.5 rounded-xl border border-indigo-500/40 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">calendar_month</span>
              ระยะเวลารวมทั้งโครงการ
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
              {milestones.length} งวดงาน
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-black font-mono text-white">{totalProjectDays}</span>
            <span className="text-xs text-slate-400 font-medium">วัน (~{Math.round(totalProjectDays / 30 * 10) / 10} เดือน)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-300 pt-2 border-t border-indigo-500/20 font-mono">
            <span>เริ่ม: <strong>{projectStartDate}</strong></span>
            <span>เสร็จ: <strong className="text-amber-300">{projectEndDate}</strong></span>
          </div>
        </div>

        {/* Card 2: Overall Progress Indicator */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-200">ความคืบหน้ารวม (Progress)</span>
            <span className="material-symbols-outlined text-emerald-400 text-base">timeline</span>
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-emerald-400">{overallProgressPercent}%</span>
              <span className="text-[11px] text-slate-400">จาก {tasks.length} รายการส่งมอบ</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-1">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
              style={{ width: `${overallProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Card 3: Date Picker & Settings */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-sm text-cyan-400">event</span>
            วันเริ่มเข้าทำงานหน้างาน (Day 0)
          </span>
          <input
            type="date"
            value={projectStartDate}
            onChange={(e) => setProjectStartDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
          />
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
            <span>ส่งมอบบ้าน: {projectEndDate}</span>
            <span className="text-emerald-400 font-bold">ตรงตามเกณฑ์ วสท.</span>
          </div>
        </div>

        {/* Card 4: Zoom & Export Actions */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">สเกลมุมมอง:</span>
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setViewZoom('day')}
                className={`px-2 py-0.5 rounded transition ${viewZoom === 'day' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
              >
                วัน
              </button>
              <button
                onClick={() => setViewZoom('week')}
                className={`px-2 py-0.5 rounded transition ${viewZoom === 'week' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
              >
                สัปดาห์
              </button>
              <button
                onClick={() => setViewZoom('month')}
                className={`px-2 py-0.5 rounded transition ${viewZoom === 'month' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
              >
                เดือน
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrintGantt}
              className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 shadow"
              title="พิมพ์เอกสารแผนงานก่อสร้างเป็นทางการ / บันทึก PDF"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>พิมพ์ / PDF</span>
            </button>
            <button
              onClick={handleExportScheduleCSV}
              disabled={isExporting}
              className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 shadow"
              title="ดาวน์โหลดตารางแผนงานเป็นไฟล์ Excel CSV"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>CSV</span>
            </button>
          </div>
        </div>

      </div>

      {/* 📊 Milestone Timeline Phase Pills */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
          <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1 mr-1">
            <span className="material-symbols-outlined text-sm text-amber-400">flag</span>
            คัดกรองตามงวดงาน:
          </span>
          <button
            onClick={() => setActiveMilestoneFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium shrink-0 transition text-xs ${
              activeMilestoneFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            แสดงทุกงวด ({tasks.length} งาน)
          </button>
          {milestoneTimeRanges.map((m) => {
            const isSelected = activeMilestoneFilter === m.milestoneNumber;
            return (
              <button
                key={m.id}
                onClick={() => setActiveMilestoneFilter(m.milestoneNumber)}
                className={`px-3 py-1 rounded-lg shrink-0 transition flex items-center gap-1.5 text-xs ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>งวด {m.milestoneNumber}</span>
                <span className="font-mono text-[10px] opacity-80">({m.percentage}%)</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800/80 text-amber-300">
                  {m.duration} วัน
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 📅 Interactive Gantt Chart Table & Visual Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex-1 flex flex-col min-h-0">
        
        {/* Table Top Header */}
        <div className="px-5 py-3 bg-slate-855 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400 text-base">bar_chart</span>
            <span className="font-bold text-slate-100">
              ผังแสดงระยะเวลาก่อสร้างตามงวดงาน (Gantt Chart Timeline)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> งานเสร็จแล้ว
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> กำลังดำเนินการ
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-indigo-500 inline-block"></span> รอดำเนินการ
            </span>
          </div>
        </div>

        {/* Scrollable Gantt Body */}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <div className="min-w-[900px] flex flex-col">
            
            {/* Timeline Scale Header */}
            <div className="flex border-b border-slate-800 bg-slate-950 text-[11px] font-mono text-slate-400 sticky top-0 z-10">
              <div className="w-80 p-2.5 border-r border-slate-800 shrink-0 font-sans font-bold text-slate-300">
                งวดงาน & เนื้องานส่งมอบ
              </div>
              <div className="w-20 p-2.5 border-r border-slate-800 shrink-0 text-center font-bold">
                วันเริ่ม (D+)
              </div>
              <div className="w-20 p-2.5 border-r border-slate-800 shrink-0 text-center font-bold">
                ระยะเวลา
              </div>
              <div className="w-24 p-2.5 border-r border-slate-800 shrink-0 text-center font-bold text-emerald-400">
                ความคืบหน้า
              </div>
              {/* Dynamic Time Columns */}
              <div className="flex-1 flex">
                {timeScaleColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className="flex-1 min-w-[50px] p-2 text-center border-r border-slate-850/80 bg-slate-950/90"
                  >
                    <div className="font-bold text-white text-[10px]">{col.label}</div>
                    <div className="text-[9px] text-slate-500">{col.subLabel}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones and Task Rows */}
            <div className="divide-y divide-slate-800/80">
              {milestoneTimeRanges.map((m) => {
                const milestoneTasks = tasks.filter(t => t.milestoneNumber === m.milestoneNumber);
                if (activeMilestoneFilter !== 'all' && activeMilestoneFilter !== m.milestoneNumber) {
                  return null;
                }

                // สัดส่วนพิกัดของ Milestone Bar
                const mLeftPercent = totalProjectDays > 0 ? (m.startDay / totalProjectDays) * 100 : 0;
                const mWidthPercent = totalProjectDays > 0 ? (m.duration / totalProjectDays) * 100 : 10;

                return (
                  <div key={m.id} className="flex flex-col bg-slate-900/40">
                    
                    {/* 🚩 Milestone Summary Row */}
                    <div className="flex items-center bg-slate-850/80 hover:bg-slate-800/80 transition text-xs border-y border-slate-800/60 font-semibold py-2">
                      <div className="w-80 px-3 flex items-center gap-2 shrink-0 truncate">
                        <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                          {m.milestoneNumber}
                        </span>
                        <span className="font-bold text-white truncate">{m.title}</span>
                        <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {m.percentage}%
                        </span>
                      </div>
                      <div className="w-20 text-center font-mono text-slate-400 text-[11px] shrink-0">
                        D+{m.startDay}
                      </div>
                      <div className="w-20 text-center font-mono text-amber-300 font-bold text-[11px] shrink-0">
                        {m.duration} วัน
                      </div>
                      <div className="w-24 text-center font-mono text-slate-400 text-[11px] shrink-0">
                        {m.startDateStr.slice(5)} - {m.endDateStr.slice(5)}
                      </div>
                      {/* Visual Milestone Range Bar */}
                      <div className="flex-1 relative h-6 px-1 flex items-center">
                        <div
                          className="absolute h-4 rounded-md bg-gradient-to-r from-emerald-600/70 via-teal-600/70 to-cyan-600/70 border border-emerald-400/60 shadow flex items-center justify-between px-2 text-[10px] text-white font-mono font-bold overflow-hidden"
                          style={{
                            left: `${Math.max(0, Math.min(95, mLeftPercent))}%`,
                            width: `${Math.max(4, Math.min(100 - mLeftPercent, mWidthPercent))}%`
                          }}
                        >
                          <span className="truncate">งวด {m.milestoneNumber} ({m.duration} วัน)</span>
                          <span className="opacity-80 shrink-0">฿{Math.round(grandTotal * (m.percentage / 100)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* 🔨 Tasks under this Milestone */}
                    {milestoneTasks.map((task) => {
                      const tLeftPercent = totalProjectDays > 0 ? (task.startDayOffset / totalProjectDays) * 100 : 0;
                      const tWidthPercent = totalProjectDays > 0 ? (task.durationDays / totalProjectDays) * 100 : 5;
                      const isEditing = editingTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          className="flex items-center hover:bg-slate-800/40 transition text-xs py-1.5 group border-b border-slate-850/40"
                        >
                          {/* Task Name & Details */}
                          <div className="w-80 px-3 pl-8 flex items-center gap-2 shrink-0 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                            {isEditing ? (
                              <input
                                type="text"
                                value={task.name}
                                onChange={(e) => handleUpdateTask(task.id, { name: e.target.value })}
                                onBlur={() => setEditingTaskId(null)}
                                autoFocus
                                className="w-full bg-slate-950 border border-cyan-400 rounded px-1.5 py-0.5 text-xs text-white"
                              />
                            ) : (
                              <span
                                onClick={() => setEditingTaskId(task.id)}
                                className="truncate text-slate-300 hover:text-white cursor-pointer"
                                title="คลิกเพื่อแก้ไขชื่องาน"
                              >
                                {task.name}
                              </span>
                            )}
                          </div>
                          {/* Start Offset */}
                          <div className="w-20 text-center font-mono text-slate-400 text-[11px] shrink-0">
                            D+{task.startDayOffset}
                          </div>
                          {/* Duration input */}
                          <div className="w-20 text-center font-mono text-[11px] shrink-0">
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={task.durationDays}
                              onChange={(e) => handleUpdateTask(task.id, { durationDays: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-12 bg-transparent text-center font-bold text-amber-300 border-0 border-b border-transparent focus:border-amber-400 focus:bg-slate-950/60 rounded"
                            />
                            <span className="text-[10px] text-slate-500">ว.</span>
                          </div>
                          {/* Progress % */}
                          <div className="w-24 text-center font-mono text-[11px] shrink-0 flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="10"
                              value={task.progressPercent}
                              onChange={(e) => handleUpdateTask(task.id, { progressPercent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                              className={`w-10 text-right font-bold bg-transparent border-0 border-b border-transparent focus:border-emerald-400 focus:bg-slate-950/60 rounded ${
                                task.progressPercent === 100 ? 'text-emerald-400' : task.progressPercent > 0 ? 'text-amber-400' : 'text-slate-400'
                              }`}
                            />
                            <span className="text-slate-500">%</span>
                          </div>
                          {/* Visual Gantt Bar */}
                          <div className="flex-1 relative h-6 px-1 flex items-center">
                            {/* Grid Lines Overlay */}
                            <div className="absolute inset-0 flex pointer-events-none opacity-10">
                              {timeScaleColumns.map((_, i) => (
                                <div key={i} className="flex-1 border-r border-slate-500"></div>
                              ))}
                            </div>
                            {/* The Actual Task Bar */}
                            <div
                              className="absolute h-5 rounded-md bg-slate-800 border border-slate-650 shadow overflow-hidden flex items-center group/bar cursor-pointer"
                              style={{
                                left: `${Math.max(0, Math.min(96, tLeftPercent))}%`,
                                width: `${Math.max(3, Math.min(100 - tLeftPercent, tWidthPercent))}%`
                              }}
                              title={`${task.name} (เริ่ม D+${task.startDayOffset}, นาน ${task.durationDays} วัน, คืบหน้า ${task.progressPercent}%)`}
                            >
                              {/* Filled Progress inside Bar */}
                              <div
                                className={`h-full transition-all ${
                                  task.progressPercent === 100
                                    ? 'bg-emerald-500'
                                    : task.progressPercent > 0
                                    ? 'bg-amber-500'
                                    : 'bg-indigo-600/70'
                                }`}
                                style={{ width: `${task.progressPercent}%` }}
                              />
                              {/* Label on Hover / small */}
                              <div className="absolute inset-0 px-2 flex items-center justify-between text-[10px] text-white font-mono pointer-events-none drop-shadow">
                                <span className="truncate pr-1">{task.name}</span>
                                <span className="opacity-90 shrink-0 font-bold">{task.progressPercent}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Gantt Footer Helper */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span>💡 <strong>คำแนะนำหน้างาน:</strong> สามารถปรับจำนวนวันทำงานและอัปเดต % ความคืบหน้าของแต่ละงานได้โดยตรง</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-300">
              สถานะ: {overallProgressPercent === 100 ? '✅ โครงการเสร็จสิ้น 100%' : `กำลังก่อสร้าง (${overallProgressPercent}%)`}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
