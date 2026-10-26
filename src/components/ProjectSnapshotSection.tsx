import React, { useState, useMemo } from 'react';
import { ProjectSaveState, ConstructionCategory, ActualExpenseItem } from '../types';
import { CATEGORY_LABELS } from '../constants';

interface ProjectSnapshotSectionProps {
  projects: ProjectSaveState[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onUpdateProjectExpenses: (projectId: string, expenses: ActualExpenseItem[]) => void;
}

type SnapshotViewTab = 'chart' | 'matrix' | 'table';
type CategoryFilter = 'all' | 'over' | 'watchlist' | 'safe';

export const ProjectSnapshotSection: React.FC<ProjectSnapshotSectionProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onUpdateProjectExpenses,
}) => {
  const [activeTab, setActiveTab] = useState<SnapshotViewTab>('chart');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  // Selected project object
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

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
    const variance = totalPlanned - totalActual; // +: เหลือ, -: เกิน
    const burnRate = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

    let cpi = 1.0;
    if (totalActual > 0) {
      cpi = totalPlanned / totalActual;
    }

    let cpiStatus: 'on_track' | 'watchlist' | 'high_risk' = 'on_track';
    let cpiLabel = 'ปลอดภัย (On-Track)';
    let cpiBg = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
    let cpiDot = 'bg-emerald-400';

    if (totalActual > 0) {
      if (cpi >= 1.0) {
        cpiStatus = 'on_track';
        cpiLabel = 'ปลอดภัย (On-Track)';
        cpiBg = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
        cpiDot = 'bg-emerald-400';
      } else if (cpi >= 0.85) {
        cpiStatus = 'watchlist';
        cpiLabel = 'เฝ้าระวัง (Watchlist)';
        cpiBg = 'bg-amber-500/15 border-amber-500/30 text-amber-400';
        cpiDot = 'bg-amber-400';
      } else {
        cpiStatus = 'high_risk';
        cpiLabel = 'ความเสี่ยงสูง (High Risk)';
        cpiBg = 'bg-rose-500/15 border-rose-500/30 text-rose-400';
        cpiDot = 'bg-rose-400';
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
      cpiBg,
      cpiDot,
    };
  }, [categoryBudgets, categoryActuals]);

  // Category comparisons list
  const categoryComparisons = useMemo(() => {
    return categoryKeys.map((catKey) => {
      const planned = categoryBudgets[catKey] || 0;
      const actual = categoryActuals[catKey] || 0;
      const diff = planned - actual; // +: เหลือ, -: เกิน
      const spentPercent = planned > 0 ? (actual / planned) * 100 : actual > 0 ? 100 : 0;
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

  // Filtered categories
  const filteredCategoryList = useMemo(() => {
    if (categoryFilter === 'over') return categoryComparisons.filter((c) => c.isOver);
    if (categoryFilter === 'watchlist') return categoryComparisons.filter((c) => c.isWatchlist);
    if (categoryFilter === 'safe') return categoryComparisons.filter((c) => c.isSafe);
    return categoryComparisons;
  }, [categoryComparisons, categoryFilter]);

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

  const handleOpenEditor = () => {
    setEditorInputs({ ...categoryActuals });
    setIsEditorOpen(true);
  };

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

  if (!currentProject) return null;

  const countOver = categoryComparisons.filter((c) => c.isOver).length;
  const countWatchlist = categoryComparisons.filter((c) => c.isWatchlist).length;
  const countSafe = categoryComparisons.filter((c) => c.isSafe).length;

  return (
    <div id="project-snapshot-section" className="flex flex-col gap-4 scroll-mt-6">
      
      {/* 🌟 1. HERO TOP BAR: CLEAN & MODERN */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <span className="material-symbols-outlined text-xl">analytics</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                Project Snapshot
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">คุมต้นทุนและวิเคราะห์ความเสี่ยง</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{currentProject.projectName}</span>
              <span className="text-xs font-mono font-normal text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-800/40">
                {currentProject.houseAreaSqm} ตร.ม.
              </span>
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dropdown switch project */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-400 transition">
            <span className="material-symbols-outlined text-slate-400 text-xs">home_work</span>
            <select
              value={currentProject.id}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.projectName}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Edit Cost Button */}
          <button
            onClick={handleOpenEditor}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95"
          >
            <span className="material-symbols-outlined text-xs">edit</span>
            <span>ปรับต้นทุนจริง</span>
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition"
            title="พิมพ์รายงาน"
          >
            <span className="material-symbols-outlined text-sm">print</span>
          </button>
        </div>
      </div>

      {/* 🌟 2. AT-A-GLANCE FINANCIAL HEALTH ROW: 1 GAUGE + 3 NUMBERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Left: Overall Health & Burn Rate Gauge (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-cyan-400">speed</span>
              สุขภาพงบประมาณโครงการ (Burn Rate)
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${financialKPIs.cpiBg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${financialKPIs.cpiDot}`} />
              <span>CPI {financialKPIs.cpi.toFixed(2)}: {financialKPIs.cpiLabel}</span>
            </span>
          </div>

          <div className="my-3 flex items-center gap-4">
            {/* Circular / Big Percent Indicator */}
            <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 shrink-0">
              <span className={`text-2xl font-black font-mono ${
                financialKPIs.burnRate > 100 ? 'text-rose-400' : 'text-cyan-400'
              }`}>
                {Math.round(financialKPIs.burnRate)}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">ใช้ไปแล้ว</span>
            </div>

            {/* Quick Context Summary */}
            <div className="flex-1 flex flex-col justify-center gap-1">
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    financialKPIs.burnRate > 100 
                      ? 'bg-rose-500' 
                      : financialKPIs.burnRate > 85 
                      ? 'bg-amber-400' 
                      : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, financialKPIs.burnRate)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-0.5">
                <span>ความเสี่ยงโดยรวม:</span>
                {countOver > 0 ? (
                  <span className="text-rose-400 font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs">warning</span>
                    เกินงบ {countOver} หมวดงาน
                  </span>
                ) : countWatchlist > 0 ? (
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs">info</span>
                    เฝ้าระวัง {countWatchlist} หมวด
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs">check</span>
                    ทุกหมวดอยู่ในเกณฑ์ปลอดภัย
                  </span>
                )}
              </div>
            </div>
          </div>

          <span className="text-[10px] text-slate-500">
            คำนวณจากยอดงบประมาณ BOQ เทียบกับบิลและค่าใช้จ่ายจริงที่บันทึก
          </span>
        </div>

        {/* Right: 3 Clean KPI Cards (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Card 1: Planned Budget */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              1. งบตั้งไว้ (Planned)
            </span>
            <div className="my-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-white">
                ฿{financialKPIs.totalPlanned.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              ~฿{Math.round(financialKPIs.totalPlanned / (currentProject.houseAreaSqm || 1)).toLocaleString()} / ตร.ม.
            </span>
          </div>

          {/* Card 2: Actual Cost */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
              2. จ่ายจริง (Actual)
            </span>
            <div className="my-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
                ฿{financialKPIs.totalActual.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              บันทึกแล้ว {currentProject.actualExpenses?.length || 0} รายการ
            </span>
          </div>

          {/* Card 3: Remaining / Variance */}
          <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            financialKPIs.variance >= 0
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-rose-950/20 border-rose-500/40'
          }`}>
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full inline-block ${financialKPIs.variance >= 0 ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              3. ส่วนต่าง (Variance)
            </span>
            <div className="my-1.5">
              <span className={`text-xl sm:text-2xl font-black font-mono ${
                financialKPIs.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {financialKPIs.variance >= 0 ? '+' : ''}฿{financialKPIs.variance.toLocaleString()}
              </span>
            </div>
            <span className={`text-[10px] font-medium font-mono ${
              financialKPIs.variance >= 0 ? 'text-emerald-400/90' : 'text-rose-300 font-bold'
            }`}>
              {financialKPIs.variance >= 0 ? '✓ เหลืองบในเป้าหมาย' : '⚠️ ใช้งบเกินเป้าหมาย'}
            </span>
          </div>

        </div>

      </div>

      {/* 🌟 3. MAIN SECTION: SIMPLIFIED VISUAL COMPARISON & TABS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
        
        {/* Navigation & Filter Bar */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'chart'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_stream</span>
              <span>กราฟแท่งแถบเดี่ยว</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'matrix'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">grid_view</span>
              <span>เมทริกซ์ 3 กลุ่มความเสี่ยง</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'table'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">table_rows</span>
              <span>ตารางตัวเลข</span>
            </button>
          </div>

          {/* Quick Filter Chips (All, Over, Watchlist, Safe) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline">กรองดู:</span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                categoryFilter === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ทั้งหมด (10)
            </button>
            <button
              onClick={() => setCategoryFilter('over')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
                categoryFilter === 'over'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>เกินงบ ({countOver})</span>
            </button>
            <button
              onClick={() => setCategoryFilter('watchlist')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
                categoryFilter === 'watchlist'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>เฝ้าระวัง ({countWatchlist})</span>
            </button>
            <button
              onClick={() => setCategoryFilter('safe')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
                categoryFilter === 'safe'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>ปลอดภัย ({countSafe})</span>
            </button>
          </div>

        </div>

        {/* VIEW 1: SLEEK UNIFIED COMPARISON ROWS (Cleanest & Easiest to read) */}
        {activeTab === 'chart' && (
          <div className="p-4 sm:p-5 flex flex-col gap-2.5">
            {filteredCategoryList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                ไม่พบหมวดงานในหมวดหมู่ที่เลือก
              </div>
            ) : (
              filteredCategoryList.map((cat, idx) => {
                const percent = Math.round(cat.spentPercent);
                const isOver = cat.isOver;

                return (
                  <div
                    key={cat.key}
                    className={`p-3 rounded-xl border transition-all ${
                      isOver 
                        ? 'bg-rose-950/15 border-rose-500/30 hover:border-rose-500/50' 
                        : cat.isWatchlist 
                        ? 'bg-amber-950/10 border-amber-500/25 hover:border-amber-500/40' 
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Title + Variance Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-sm text-amber-400 shrink-0">{cat.icon}</span>
                        <span className="text-xs font-bold text-white truncate">{cat.title}</span>
                      </div>

                      {/* Clean Badge */}
                      <div className="shrink-0">
                        {isOver ? (
                          <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            เกินงบ +฿{Math.abs(cat.diff).toLocaleString()} (+{Math.round(((cat.actual - cat.planned) / (cat.planned || 1)) * 100)}%) ⚠️
                          </span>
                        ) : cat.actual > 0 ? (
                          <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                            ใช้ไป {percent}% (เหลือ ฿{cat.diff.toLocaleString()}) ✓
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ยังไม่มีค่าใช้จ่าย
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Sleek Unified Progress Bar */}
                    <div className="relative w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                      {/* Target reference 100% line */}
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver 
                            ? 'bg-rose-500' 
                            : cat.isWatchlist 
                            ? 'bg-amber-400' 
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>

                    {/* Bottom Row: Compact Numbers in 1 Line */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-1.5">
                      <div className="flex items-center gap-3">
                        <span>
                          จ่ายจริง: <strong className={isOver ? 'text-rose-400' : 'text-slate-200'}>฿{cat.actual.toLocaleString()}</strong>
                        </span>
                        <span className="text-slate-600">/</span>
                        <span>
                          งบตั้งไว้: <span className="text-slate-300">฿{cat.planned.toLocaleString()}</span>
                        </span>
                      </div>

                      <span className="text-slate-400">
                        {percent}%
                      </span>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 2: RISK MATRIX (3 Columns) */}
        {activeTab === 'matrix' && (
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
            
            {/* Column 1: Over Budget */}
            <div className="bg-rose-950/15 border border-rose-500/25 rounded-xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-rose-500/20 text-rose-300">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-rose-400">error</span>
                  🔴 เกินงบ (&gt; 100%)
                </span>
                <span className="text-xs font-mono font-bold">{countOver} หมวด</span>
              </div>
              <div className="flex flex-col gap-2">
                {countOver === 0 ? (
                  <span className="text-xs text-rose-300/60 py-6 text-center">✓ ไม่มีหมวดงานที่เกินงบ</span>
                ) : (
                  categoryComparisons.filter(c => c.isOver).map((c) => (
                    <div key={c.key} className="bg-slate-950 p-2.5 rounded-lg border border-rose-500/30 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span className="truncate">{c.title}</span>
                        <span className="text-rose-400 font-mono">{Math.round(c.spentPercent)}%</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>งบ ฿{c.planned.toLocaleString()}</span>
                        <span className="text-rose-300 font-bold">จริง ฿{c.actual.toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] text-rose-400 font-mono">เกินงบ +฿{Math.abs(c.diff).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Watchlist */}
            <div className="bg-amber-950/15 border border-amber-500/25 rounded-xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 text-amber-300">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-amber-400">visibility</span>
                  🟡 เฝ้าระวัง (85% - 100%)
                </span>
                <span className="text-xs font-mono font-bold">{countWatchlist} หมวด</span>
              </div>
              <div className="flex flex-col gap-2">
                {countWatchlist === 0 ? (
                  <span className="text-xs text-amber-300/60 py-6 text-center">ไม่มีหมวดงานในกลุ่มเฝ้าระวัง</span>
                ) : (
                  categoryComparisons.filter(c => c.isWatchlist).map((c) => (
                    <div key={c.key} className="bg-slate-950 p-2.5 rounded-lg border border-amber-500/30 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span className="truncate">{c.title}</span>
                        <span className="text-amber-400 font-mono">{Math.round(c.spentPercent)}%</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>งบ ฿{c.planned.toLocaleString()}</span>
                        <span className="text-amber-300 font-bold">จริง ฿{c.actual.toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono">เหลืองบ ฿{c.diff.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Safe */}
            <div className="bg-emerald-950/15 border border-emerald-500/25 rounded-xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20 text-emerald-300">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  🟢 ปลอดภัย (&lt; 85%)
                </span>
                <span className="text-xs font-mono font-bold">{countSafe} หมวด</span>
              </div>
              <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                {categoryComparisons.filter(c => c.isSafe).map((c) => (
                  <div key={c.key} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <span className="truncate">{c.title}</span>
                      <span className="text-emerald-400 font-mono">{Math.round(c.spentPercent)}%</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>งบ ฿{c.planned.toLocaleString()}</span>
                      <span>จริง ฿{c.actual.toLocaleString()}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">เหลืองบ ฿{c.diff.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 3: DETAILED TABLE */}
        {activeTab === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-4">หมวดงานก่อสร้าง</th>
                  <th className="py-2.5 px-4 text-right">งบตั้งไว้ (Planned)</th>
                  <th className="py-2.5 px-4 text-right">จ่ายจริง (Actual)</th>
                  <th className="py-2.5 px-4 text-right">ส่วนต่างคงเหลือ</th>
                  <th className="py-2.5 px-4 text-center">% ใช้ไป</th>
                  <th className="py-2.5 px-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {categoryComparisons.map((c, idx) => (
                  <tr key={c.key} className="hover:bg-slate-850/40 transition">
                    <td className="py-2.5 px-4 font-medium text-slate-200 flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-sm">{c.icon}</span>
                      <span>{c.title}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-300 font-semibold">
                      ฿{c.planned.toLocaleString()}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                      c.isOver ? 'text-rose-400' : 'text-cyan-300'
                    }`}>
                      ฿{c.actual.toLocaleString()}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                      c.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {c.diff >= 0 ? '+' : ''}฿{c.diff.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">
                      {Math.round(c.spentPercent)}%
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {c.isOver ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          เกินงบ
                        </span>
                      ) : c.isWatchlist ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          เฝ้าระวัง
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          ปลอดภัย
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950 font-bold text-white border-t border-slate-700 text-xs">
                  <td className="py-3 px-4 text-amber-400">รวม 10 หมวดงาน:</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-200">
                    ฿{financialKPIs.totalPlanned.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-cyan-300">
                    ฿{financialKPIs.totalActual.toLocaleString()}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono ${
                    financialKPIs.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {financialKPIs.variance >= 0 ? '+' : ''}฿{financialKPIs.variance.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-indigo-300">
                    {Math.round(financialKPIs.burnRate)}%
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-emerald-400">
                    CPI {financialKPIs.cpi.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

      </div>

      {/* 🌟 4. INTERACTIVE ACTUAL COSTS EDITOR MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
            
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-lg">edit_note</span>
                <div>
                  <h3 className="text-sm font-bold text-white">บันทึกและจำลองต้นทุนจริง</h3>
                  <p className="text-[11px] text-slate-400">ปรับตัวเลขค่าใช้จ่ายจริงเทียบกับงบ BOQ</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Presets */}
            <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">ทางลัดจำลอง:</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('structure')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 border border-slate-700"
                >
                  ⚡ โครงสร้าง
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('progress60')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 border border-slate-700"
                >
                  ⚡ คืบหน้า 60%
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('sync100')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 border border-slate-700"
                >
                  ⚡ เท่างบ BOQ
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('reset0')}
                  className="px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-[10px] font-semibold text-rose-300 border border-rose-500/30"
                >
                  ⚡ รีเซ็ต 0
                </button>
              </div>
            </div>

            {/* Inputs List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {categoryKeys.map((catKey) => {
                const planned = categoryBudgets[catKey] || 0;
                const actual = editorInputs[catKey] || 0;
                const isOver = actual > planned && planned > 0;

                return (
                  <div key={catKey} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="material-symbols-outlined text-amber-400 text-sm shrink-0">
                        {CATEGORY_LABELS[catKey]?.icon || 'layers'}
                      </span>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-white block truncate">
                          {CATEGORY_LABELS[catKey]?.title || catKey}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          งบ: ฿{planned.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-500">฿</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={actual}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setEditorInputs((prev) => ({ ...prev, [catKey]: val }));
                        }}
                        className={`w-32 bg-slate-900 border rounded-lg pl-5 pr-2 py-1 text-xs font-mono font-bold text-right focus:outline-none ${
                          isOver 
                            ? 'border-rose-500 text-rose-400' 
                            : 'border-slate-700 text-white focus:border-indigo-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                รวม: <strong className="text-cyan-300">฿{Object.values(editorInputs).reduce((a, b) => a + b, 0).toLocaleString()}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditor}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow"
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
