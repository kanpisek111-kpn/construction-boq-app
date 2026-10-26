import React, { useState, useMemo } from 'react';
import { ProjectSaveState, ConstructionCategory, ActualExpenseItem } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { computeBOQSummary } from '../services/calculator';

interface ProjectSnapshotSectionProps {
  projects: ProjectSaveState[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onUpdateProjectExpenses: (projectId: string, expenses: ActualExpenseItem[]) => void;
}

type SnapshotViewTab = 'chart' | 'matrix' | 'table';

export const ProjectSnapshotSection: React.FC<ProjectSnapshotSectionProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onUpdateProjectExpenses,
}) => {
  const [activeTab, setActiveTab] = useState<SnapshotViewTab>('chart');
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  // Selected project object
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Categories list
  const categoryKeys = useMemo(() => {
    return Object.keys(CATEGORY_LABELS) as ConstructionCategory[];
  }, []);

  // 1. Planned Budget by Category from BOQ
  const categoryBudgets = useMemo(() => {
    const map: Record<ConstructionCategory, number> = {
      preparation: 0,
      structure: 0,
      roof: 0,
      masonry_wall: 0,
      doors_windows: 0,
      finishes: 0,
      decorations: 0,
      sanitary: 0,
      electrical: 0,
      external_works: 0,
    };

    if (!currentProject || !currentProject.items) return map;

    currentProject.items.forEach((item) => {
      const q = item.quantity || 0;
      const mat = item.materialUnitPrice || 0;
      const lab = item.laborUnitPrice || 0;
      const total = q * (mat + lab);
      if (map[item.category] !== undefined) {
        map[item.category] += Math.round(total);
      }
    });

    return map;
  }, [currentProject]);

  // 2. Actual Costs by Category from actualExpenses
  const categoryActuals = useMemo(() => {
    const map: Record<ConstructionCategory, number> = {
      preparation: 0,
      structure: 0,
      roof: 0,
      masonry_wall: 0,
      doors_windows: 0,
      finishes: 0,
      decorations: 0,
      sanitary: 0,
      electrical: 0,
      external_works: 0,
    };

    if (!currentProject || !Array.isArray(currentProject.actualExpenses)) return map;

    currentProject.actualExpenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      if (map[exp.category] !== undefined) {
        map[exp.category] += amt;
      }
    });

    return map;
  }, [currentProject]);

  // 3. Totals and High-Level KPIs
  const financialKPIs = useMemo(() => {
    const totalPlanned = Object.values(categoryBudgets).reduce((a, b) => a + b, 0);
    const totalActual = Object.values(categoryActuals).reduce((a, b) => a + b, 0);
    const variance = totalPlanned - totalActual; // +: remaining, -: over budget
    const burnRate = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

    // CPI (Cost Performance Index) = Planned / Actual
    let cpi = 1.0;
    if (totalActual > 0) {
      cpi = totalPlanned / totalActual;
    }

    let cpiStatus: 'on_track' | 'watchlist' | 'high_risk' = 'on_track';
    let cpiLabel = 'ปลอดภัย (On-Track)';
    let cpiColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    let cpiBadgeColor = 'bg-emerald-400';

    if (totalActual > 0) {
      if (cpi >= 1.0) {
        cpiStatus = 'on_track';
        cpiLabel = 'ปลอดภัย (On-Track)';
        cpiColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        cpiBadgeColor = 'bg-emerald-400';
      } else if (cpi >= 0.85) {
        cpiStatus = 'watchlist';
        cpiLabel = 'เฝ้าระวัง (Watchlist)';
        cpiColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
        cpiBadgeColor = 'bg-amber-400';
      } else {
        cpiStatus = 'high_risk';
        cpiLabel = 'ความเสี่ยงสูง (High Risk)';
        cpiColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
        cpiBadgeColor = 'bg-rose-400';
      }
    }

    return {
      totalPlanned,
      totalActual,
      variance,
      burnRate,
      cpi,
      cpiStatus,
      cpiLabel,
      cpiColor,
      cpiBadgeColor,
    };
  }, [categoryBudgets, categoryActuals]);

  // Category comparisons list
  const categoryComparisons = useMemo(() => {
    return categoryKeys.map((catKey) => {
      const planned = categoryBudgets[catKey] || 0;
      const actual = categoryActuals[catKey] || 0;
      const diff = planned - actual; // +: เหลือ, -: เกิน
      const spentPercent = planned > 0 ? (actual / planned) * 100 : actual > 0 ? 999 : 0;
      const isOver = actual > planned && planned > 0;
      const isWatchlist = !isOver && spentPercent >= 85;
      const isSafe = !isOver && !isWatchlist;

      return {
        key: catKey,
        title: CATEGORY_LABELS[catKey]?.title || catKey,
        icon: CATEGORY_LABELS[catKey]?.icon || 'layers',
        planned,
        actual,
        diff,
        spentPercent,
        isOver,
        isWatchlist,
        isSafe,
      };
    });
  }, [categoryKeys, categoryBudgets, categoryActuals]);

  // Max value among categories for bar chart scale
  const maxCategoryValue = useMemo(() => {
    let max = 1000;
    categoryComparisons.forEach((c) => {
      if (c.planned > max) max = c.planned;
      if (c.actual > max) max = c.actual;
    });
    return max;
  }, [categoryComparisons]);

  // Editor Temporary Inputs
  const [editorInputs, setEditorInputs] = useState<Record<ConstructionCategory, number>>(() => {
    const init: Record<ConstructionCategory, number> = {
      preparation: 0,
      structure: 0,
      roof: 0,
      masonry_wall: 0,
      doors_windows: 0,
      finishes: 0,
      decorations: 0,
      sanitary: 0,
      electrical: 0,
      external_works: 0,
    };
    return init;
  });

  // Open editor and load current values
  const handleOpenEditor = () => {
    setEditorInputs({ ...categoryActuals });
    setIsEditorOpen(true);
  };

  // Smart presets for simulation
  const handleApplyPreset = (preset: 'structure' | 'progress60' | 'sync100' | 'reset0') => {
    const updated: Record<ConstructionCategory, number> = {
      preparation: 0,
      structure: 0,
      roof: 0,
      masonry_wall: 0,
      doors_windows: 0,
      finishes: 0,
      decorations: 0,
      sanitary: 0,
      electrical: 0,
      external_works: 0,
    };

    if (preset === 'structure') {
      updated.preparation = categoryBudgets.preparation;
      updated.structure = Math.round(categoryBudgets.structure * 0.9);
    } else if (preset === 'progress60') {
      updated.preparation = categoryBudgets.preparation;
      updated.structure = categoryBudgets.structure;
      updated.roof = Math.round(categoryBudgets.roof * 0.95);
      updated.masonry_wall = Math.round(categoryBudgets.masonry_wall * 0.8);
      updated.doors_windows = Math.round(categoryBudgets.doors_windows * 0.3);
      updated.electrical = Math.round(categoryBudgets.electrical * 0.4);
      updated.sanitary = Math.round(categoryBudgets.sanitary * 0.4);
      updated.finishes = Math.round(categoryBudgets.finishes * 0.1);
    } else if (preset === 'sync100') {
      categoryKeys.forEach((k) => {
        updated[k] = categoryBudgets[k];
      });
    }

    setEditorInputs(updated);
  };

  // Save edited actual costs
  const handleSaveEditor = () => {
    if (!currentProject) return;

    const timestamp = Date.now();
    const newExpenses: ActualExpenseItem[] = [];

    categoryKeys.forEach((catKey, idx) => {
      const amt = editorInputs[catKey] || 0;
      if (amt > 0) {
        newExpenses.push({
          id: `exp-snap-${catKey}-${timestamp + idx}`,
          date: new Date().toISOString().split('T')[0],
          category: catKey,
          expenseType: 'material',
          vendorOrPayee: 'สรุปต้นทุนจริงหน้างาน (Project Snapshot)',
          description: `ต้นทุนจริงสะสมหมวด ${CATEGORY_LABELS[catKey]?.title || catKey}`,
          amount: amt,
        });
      }
    });

    onUpdateProjectExpenses(currentProject.id, newExpenses);
    setIsEditorOpen(false);
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  if (!currentProject) return null;

  return (
    <div id="project-snapshot-section" className="flex flex-col gap-5 scroll-mt-6">
      
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <span className="material-symbols-outlined text-white text-2xl">analytics</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Project Snapshot
              </span>
              <span className="text-xs text-slate-400">เปรียบเทียบงบประมาณ vs ต้นทุนจริง & ดัชนีความเสี่ยง</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-0.5 flex items-center gap-2">
              <span>{currentProject.projectName}</span>
              <span className="text-xs font-mono font-normal text-slate-400">({currentProject.houseAreaSqm} ตร.ม.)</span>
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Project Switcher Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-400 transition">
            <span className="material-symbols-outlined text-slate-400 text-sm">home_work</span>
            <select
              value={currentProject.id}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.projectName}
                </option>
              ))}
            </select>
          </div>

          {/* Record / Adjust Actual Cost Button */}
          <button
            onClick={handleOpenEditor}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">edit_note</span>
            <span>✏️ บันทึก/ปรับต้นทุนจริง</span>
          </button>

          {/* Print Report Button */}
          <button
            onClick={handlePrintReport}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="พิมพ์รายงานสรุปผลภาพรวมโครงการ"
          >
            <span className="material-symbols-outlined text-sm text-cyan-400">print</span>
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* 4 Key Financial Health KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Planned BOQ Budget */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition" />
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">งบประมาณที่ตั้งไว้ (Planned)</span>
            <span className="material-symbols-outlined text-blue-400 text-base">account_balance</span>
          </div>
          <div className="my-2.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              ฿{financialKPIs.totalPlanned.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>BOQ รวม 10 หมวดงาน</span>
            <span className="font-mono text-slate-400">
              ~฿{Math.round(financialKPIs.totalPlanned / (currentProject.houseAreaSqm || 1)).toLocaleString()} / ตร.ม.
            </span>
          </div>
        </div>

        {/* KPI 2: Actual Incurred Cost */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition" />
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">ต้นทุนจริงที่บันทึกแล้ว (Actual)</span>
            <span className="material-symbols-outlined text-indigo-400 text-base">payments</span>
          </div>
          <div className="my-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-300">
              ฿{financialKPIs.totalActual.toLocaleString()}
            </span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
              financialKPIs.burnRate > 100 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}>
              {Math.round(financialKPIs.burnRate * 10) / 10}%
            </span>
          </div>
          <div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-1">
              <div
                className={`h-full transition-all duration-300 ${
                  financialKPIs.burnRate > 100 ? 'bg-rose-400' : 'bg-gradient-to-r from-cyan-400 to-indigo-400'
                }`}
                style={{ width: `${Math.min(100, financialKPIs.burnRate)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">อัตราการเบิกจ่ายจริง (% Burn Rate)</span>
          </div>
        </div>

        {/* KPI 3: Variance / Remaining */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">ส่วนต่างงบประมาณ (Variance)</span>
            <span className="material-symbols-outlined text-amber-400 text-base">balance</span>
          </div>
          <div className="my-2.5">
            <span className={`text-2xl sm:text-3xl font-black font-mono ${
              financialKPIs.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {financialKPIs.variance >= 0 ? '+' : ''}฿{financialKPIs.variance.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            {financialKPIs.variance >= 0 ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                <span>คงเหลืองบประมาณในเป้าหมาย</span>
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1 font-bold animate-pulse">
                <span className="material-symbols-outlined text-xs">warning</span>
                <span>ใช้งบเกินเป้าหมาย ({Math.abs(Math.round(financialKPIs.variance / (financialKPIs.totalPlanned || 1) * 100))}%)</span>
              </span>
            )}
          </div>
        </div>

        {/* KPI 4: CPI (Cost Performance Index) */}
        <div className={`border p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden ${financialKPIs.cpiColor}`}>
          <div className="flex items-center justify-between text-xs font-semibold opacity-90">
            <span>ดัชนีประสิทธิภาพต้นทุน CPI</span>
            <span className="material-symbols-outlined text-base">speed</span>
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono">
              {financialKPIs.totalActual > 0 ? financialKPIs.cpi.toFixed(2) : '1.00'}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/60 font-mono">
              {financialKPIs.cpiLabel}
            </span>
          </div>
          <div className="text-[10px] opacity-80 font-mono">
            <span>CPI = Planned / Actual (เกณฑ์สากล: &ge; 1.0 ดีเยี่ยม)</span>
          </div>
        </div>

      </div>

      {/* Main Breakdown Container with Multi-View Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
        
        {/* View Tabs Selector */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">วิเคราะห์ต้นทุนรายหมวด (10 หมวดงาน):</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'chart'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <span className="material-symbols-outlined text-sm">bar_chart</span>
              <span>กราฟแท่งเปรียบเทียบ</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'matrix'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <span className="material-symbols-outlined text-sm">shield</span>
              <span>เมทริกซ์ความเสี่ยง (Risk Matrix)</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'table'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <span className="material-symbols-outlined text-sm">table_chart</span>
              <span>ตารางตัวเลขละเอียด</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Dual Comparative Bar Chart */}
        {activeTab === 'chart' && (
          <div className="p-5 flex flex-col gap-4">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-medium pb-2 border-b border-slate-800/80 text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
                <span>งบที่ตั้งไว้ (Planned BOQ)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-400 inline-block" />
                <span>ต้นทุนจริงในงบ (Actual &le; Planned)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
                <span>ต้นทุนจริงเกินงบ (Actual &gt; Planned) ⚠️</span>
              </div>
            </div>

            {/* Bars List */}
            <div className="flex flex-col gap-3.5">
              {categoryComparisons.map((cat) => {
                const plannedWidth = maxCategoryValue > 0 ? (cat.planned / maxCategoryValue) * 100 : 0;
                const actualWidth = maxCategoryValue > 0 ? (cat.actual / maxCategoryValue) * 100 : 0;

                return (
                  <div key={cat.key} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/70 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-base">{cat.icon}</span>
                        <span className="text-xs font-bold text-white">{cat.title}</span>
                      </div>

                      {/* Variance Badges */}
                      <div className="flex items-center gap-2">
                        {cat.isOver ? (
                          <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                            <span>เกินงบ +฿{Math.abs(cat.diff).toLocaleString()} (+{Math.round(((cat.actual - cat.planned) / (cat.planned || 1)) * 100)}%) ⚠️</span>
                          </span>
                        ) : cat.actual > 0 ? (
                          <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <span>ในงบ ใช้ไป {Math.round(cat.spentPercent)}% (เหลือ ฿{cat.diff.toLocaleString()}) ✓</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">
                            ยังไม่มีค่าใช้จ่ายบันทึก
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dual Bars */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      {/* Bar 1: Planned (Blue) */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 w-16 text-right shrink-0">Planned:</span>
                        <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(2, plannedWidth)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-blue-300 w-24 text-right shrink-0">
                          ฿{cat.planned.toLocaleString()}
                        </span>
                      </div>

                      {/* Bar 2: Actual (Green/Red) */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 w-16 text-right shrink-0">Actual:</span>
                        <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              cat.isOver ? 'bg-rose-500' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.max(cat.actual > 0 ? 2 : 0, actualWidth)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-mono font-bold w-24 text-right shrink-0 ${
                          cat.isOver ? 'text-rose-400' : 'text-emerald-300'
                        }`}>
                          ฿{cat.actual.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Risk Matrix (3 Columns) */}
        {activeTab === 'matrix' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Column 1: High Risk (Over Budget > 100%) */}
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-rose-500/20 text-rose-300">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="material-symbols-outlined text-rose-400 text-sm">error</span>
                  <span>1. เกินงบ (High Risk &gt; 100%)</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-500/20 font-bold">
                  {categoryComparisons.filter(c => c.isOver).length} หมวด
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {categoryComparisons.filter(c => c.isOver).length === 0 ? (
                  <div className="py-8 text-center text-xs text-rose-300/60">
                    ✓ ไม่มีหมวดงานใดที่ต้นทุนเกินงบประมาณ
                  </div>
                ) : (
                  categoryComparisons.filter(c => c.isOver).map((c) => (
                    <div key={c.key} className="bg-slate-950 p-3 rounded-xl border border-rose-500/30 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white truncate">{c.title}</span>
                        <span className="font-mono text-rose-400 font-bold text-xs">{Math.round(c.spentPercent)}%</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>งบ: ฿{c.planned.toLocaleString()}</span>
                        <span className="text-rose-300 font-bold">จริง: ฿{c.actual.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-rose-400 font-mono">
                        เกินงบ +฿{Math.abs(c.diff).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Watchlist (85% - 100%) */}
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 text-amber-300">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="material-symbols-outlined text-amber-400 text-sm">visibility</span>
                  <span>2. เฝ้าระวัง (Watchlist 85-100%)</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 font-bold">
                  {categoryComparisons.filter(c => c.isWatchlist).length} หมวด
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {categoryComparisons.filter(c => c.isWatchlist).length === 0 ? (
                  <div className="py-8 text-center text-xs text-amber-300/60">
                    ไม่มีหมวดงานที่ใช้งบแตะ 85% - 100%
                  </div>
                ) : (
                  categoryComparisons.filter(c => c.isWatchlist).map((c) => (
                    <div key={c.key} className="bg-slate-950 p-3 rounded-xl border border-amber-500/30 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white truncate">{c.title}</span>
                        <span className="font-mono text-amber-400 font-bold text-xs">{Math.round(c.spentPercent)}%</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>งบ: ฿{c.planned.toLocaleString()}</span>
                        <span className="text-amber-300 font-bold">จริง: ฿{c.actual.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        เหลืองบ ฿{c.diff.toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Safe (< 85%) */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20 text-emerald-300">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                  <span>3. ในงบปลอดภัย (Safe &lt; 85%)</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 font-bold">
                  {categoryComparisons.filter(c => c.isSafe).length} หมวด
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {categoryComparisons.filter(c => c.isSafe).map((c) => (
                  <div key={c.key} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white truncate">{c.title}</span>
                      <span className="font-mono text-emerald-400 font-bold text-xs">{Math.round(c.spentPercent)}%</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>งบ: ฿{c.planned.toLocaleString()}</span>
                      <span className="text-emerald-300 font-bold">จริง: ฿{c.actual.toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      เหลืองบ ฿{c.diff.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: Detailed Table */}
        {activeTab === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">ลำดับ & หมวดงานก่อสร้าง</th>
                  <th className="py-3 px-4 text-right">งบที่ตั้งไว้ (Planned)</th>
                  <th className="py-3 px-4 text-right">ต้นทุนจริง (Actual)</th>
                  <th className="py-3 px-4 text-right">ส่วนต่างคงเหลือ (Variance)</th>
                  <th className="py-3 px-4 text-center">% ใช้ไป</th>
                  <th className="py-3 px-4 text-center">สถานะความเสี่ยง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {categoryComparisons.map((c, idx) => (
                  <tr key={c.key} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-4 font-medium text-slate-200 flex items-center gap-2">
                      <span className="text-slate-500 font-mono text-[11px] w-4">{idx + 1}.</span>
                      <span className="material-symbols-outlined text-amber-400 text-sm">{c.icon}</span>
                      <span>{c.title}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-300 font-bold">
                      ฿{c.planned.toLocaleString()}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${
                      c.isOver ? 'text-rose-400' : 'text-emerald-300'
                    }`}>
                      ฿{c.actual.toLocaleString()}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${
                      c.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {c.diff >= 0 ? '+' : ''}฿{c.diff.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        c.isOver 
                          ? 'bg-rose-500/20 text-rose-300' 
                          : c.isWatchlist 
                          ? 'bg-amber-500/20 text-amber-300' 
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {Math.round(c.spentPercent)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {c.isOver ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          🔴 เกินงบ
                        </span>
                      ) : c.isWatchlist ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          🟡 เฝ้าระวัง
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          🟢 ปลอดภัย
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950 font-bold text-white border-t-2 border-slate-700 text-xs">
                  <td className="py-3.5 px-4 text-amber-400 font-black">รวมทั้งหมด 10 หมวดงาน:</td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-300">
                    ฿{financialKPIs.totalPlanned.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-cyan-300">
                    ฿{financialKPIs.totalActual.toLocaleString()}
                  </td>
                  <td className={`py-3.5 px-4 text-right font-mono ${
                    financialKPIs.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {financialKPIs.variance >= 0 ? '+' : ''}฿{financialKPIs.variance.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-indigo-300">
                    {Math.round(financialKPIs.burnRate * 10) / 10}%
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${financialKPIs.cpiColor}`}>
                      CPI {financialKPIs.totalActual > 0 ? financialKPIs.cpi.toFixed(2) : '1.00'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

      </div>

      {/* Editor Modal: ✏️ บันทึก/ปรับต้นทุนจริง & ทางลัดจำลองข้อมูล */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400 text-xl">edit_note</span>
                <div>
                  <h3 className="text-base font-bold text-white">บันทึกและจำลองต้นทุนจริง (Actual Costs Editor)</h3>
                  <p className="text-xs text-slate-400">กรอกตัวเลขค่าใช้จ่ายจริงของแต่ละหมวดงาน เพื่อเปรียบเทียบกับงบ BOQ</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Smart Presets Bar */}
            <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-amber-400">bolt</span>
                ทางลัดจำลองข้อมูล (Smart Presets):
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('structure')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-700 transition"
                >
                  ⚡ ระยะโครงสร้าง
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('progress60')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-700 transition"
                >
                  ⚡ งานคืบหน้า 60%
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('sync100')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-700 transition"
                >
                  ⚡ ซิงก์เท่างบ BOQ (100%)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('reset0')}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-[11px] font-semibold text-rose-300 border border-rose-500/30 transition"
                >
                  ⚡ รีเซ็ตเป็น 0
                </button>
              </div>
            </div>

            {/* Modal Body: Category Inputs */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              {categoryKeys.map((catKey) => {
                const planned = categoryBudgets[catKey] || 0;
                const actual = editorInputs[catKey] || 0;
                const isOver = actual > planned && planned > 0;

                return (
                  <div key={catKey} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="material-symbols-outlined text-amber-400 text-sm shrink-0">
                        {CATEGORY_LABELS[catKey]?.icon || 'layers'}
                      </span>
                      <div className="truncate">
                        <span className="text-xs font-bold text-white block truncate">
                          {CATEGORY_LABELS[catKey]?.title || catKey}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          งบ BOQ ที่ตั้งไว้: ฿{planned.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">฿</span>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={actual}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            setEditorInputs((prev) => ({ ...prev, [catKey]: val }));
                          }}
                          className={`w-36 bg-slate-900 border rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-mono font-bold text-right focus:outline-none transition ${
                            isOver 
                              ? 'border-rose-500 text-rose-400 focus:border-rose-400' 
                              : 'border-slate-700 text-white focus:border-indigo-400'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="text-xs font-mono text-slate-400">
                รวมต้นทุนจริงที่จำลอง: <span className="font-bold text-cyan-300">฿{Object.values(editorInputs).reduce((a, b) => a + b, 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditor}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
                >
                  บันทึกลงโครงการ
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
