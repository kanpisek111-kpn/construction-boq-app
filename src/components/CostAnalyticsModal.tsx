import React, { useMemo } from 'react';
import { BOQItem, ConstructionCategory } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { computeBOQSummary } from '../services/calculator';

interface CostAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BOQItem[];
  houseAreaSqm: number;
  overheadPercent: number;
  vatPercent: number;
  projectName: string;
}

export const CostAnalyticsModal: React.FC<CostAnalyticsModalProps> = ({
  isOpen,
  onClose,
  items,
  houseAreaSqm,
  overheadPercent,
  vatPercent,
  projectName
}) => {
  const summary = useMemo(() => {
    return computeBOQSummary(items, overheadPercent, vatPercent);
  }, [items, overheadPercent, vatPercent]);

  // Breakdown by categories
  const categoryStats = useMemo(() => {
    const stats: Record<ConstructionCategory, { mat: number; lab: number; total: number; count: number }> = {
      preparation: { mat: 0, lab: 0, total: 0, count: 0 },
      structure: { mat: 0, lab: 0, total: 0, count: 0 },
      roof: { mat: 0, lab: 0, total: 0, count: 0 },
      masonry_wall: { mat: 0, lab: 0, total: 0, count: 0 },
      doors_windows: { mat: 0, lab: 0, total: 0, count: 0 },
      finishes: { mat: 0, lab: 0, total: 0, count: 0 },
      decorations: { mat: 0, lab: 0, total: 0, count: 0 },
      sanitary: { mat: 0, lab: 0, total: 0, count: 0 },
      electrical: { mat: 0, lab: 0, total: 0, count: 0 },
      external_works: { mat: 0, lab: 0, total: 0, count: 0 },
    };

    items.forEach(item => {
      const cat = item.category in stats ? item.category : 'preparation';
      const wasteMult = 1 + ((item.wastePercent || 0) / 100);
      const mat = item.quantity * item.materialUnitPrice * wasteMult;
      const lab = item.quantity * item.laborUnitPrice;
      stats[cat].mat += mat;
      stats[cat].lab += lab;
      stats[cat].total += (mat + lab);
      stats[cat].count += 1;
    });

    const directCost = summary.directCost || 1;
    const sorted = (Object.keys(stats) as ConstructionCategory[])
      .map(cat => ({
        category: cat,
        label: CATEGORY_LABELS[cat]?.title || cat,
        icon: CATEGORY_LABELS[cat]?.icon || 'folder',
        mat: Math.round(stats[cat].mat),
        lab: Math.round(stats[cat].lab),
        total: Math.round(stats[cat].total),
        percentOfDirect: Math.round((stats[cat].total / directCost) * 100),
        count: stats[cat].count
      }))
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);

    return sorted;
  }, [items, summary.directCost]);

  // Risk & Health Checks
  const healthChecks = useMemo(() => {
    const checks = [];
    const direct = summary.directCost || 1;
    const laborRatio = Math.round((summary.totalLabor / direct) * 100);

    // 1. Labor Ratio
    if (laborRatio < 20) {
      checks.push({
        status: 'warning',
        title: `สัดส่วนค่าแรงค่อนข้างต่ำ (${laborRatio}%)`,
        desc: 'เกณฑ์มาตรฐานบ้านพักอาศัยคือ 25% - 35% หากต่ำเกินไปอาจหาช่างรับงานยาก หรือเกิดปัญหาช่างขอขึ้นราคาหน้างาน',
        icon: 'warning'
      });
    } else if (laborRatio > 40) {
      checks.push({
        status: 'warning',
        title: `สัดส่วนค่าแรงสูงกว่าปกติ (${laborRatio}%)`,
        desc: 'ค่าแรงสูงกว่าเกณฑ์ทั่วไป ควรตรวจสอบว่ามีรายการคิดค่าแรงซ้ำซ้อนหรือไม่',
        icon: 'info'
      });
    } else {
      checks.push({
        status: 'pass',
        title: `สัดส่วนค่าแรงสมดุล (${laborRatio}% ต่อต้นทุนตรง)`,
        desc: 'อยู่ในกรอบมาตรฐานวิศวกรรมไทย (25% - 35%) บริหารงานช่างได้คล่องตัว',
        icon: 'check_circle'
      });
    }

    // 2. Profit & Overhead
    if (overheadPercent < 7) {
      checks.push({
        status: 'warning',
        title: `อัตรากำไรต่ำ (${overheadPercent}%) เสี่ยงขาดทุน`,
        desc: 'ราคาเหล็กและคอนกรีตมีความผันผวน หากเกิดงานแก้งานซ่อมอาจทำให้ขาดทุน แนะนำเผื่ออย่างน้อย 8-12%',
        icon: 'trending_down'
      });
    } else {
      checks.push({
        status: 'pass',
        title: `อัตราค่าดำเนินการและกำไรปลอดภัย (${overheadPercent}%)`,
        desc: 'มี Buffer รองรับความผันผวนของราคาวัสดุและค่าใช้จ่ายหน้างานที่คาดไม่ถึง',
        icon: 'verified'
      });
    }

    // 3. Waste allowance
    const tilesAndRebar = items.filter(i => 
      i.name.includes('กระเบื้อง') || i.name.includes('เหล็ก') || i.category === 'roof'
    );
    const zeroWasteCount = tilesAndRebar.filter(i => (i.wastePercent || 0) === 0).length;
    if (zeroWasteCount > 2) {
      checks.push({
        status: 'warning',
        title: `มี ${zeroWasteCount} รายการวัสดุสำคัญที่ลืมเผื่อเศษ (0% Waste)`,
        desc: 'งานเหล็ก กระเบื้อง และหลังคา จำเป็นต้องเผื่อเศษตัดต่อ 5% - 10% เพื่อไม่ให้ของขาดหน้างาน',
        icon: 'inventory_2'
      });
    } else {
      checks.push({
        status: 'pass',
        title: 'มีการเผื่อเศษตัดต่อวัสดุ (Waste Factor) ครบถ้วน',
        desc: 'คำนวณเผื่อวัสดุแตกหักและตัดหัวตัดท้าย 5-10% ช่วยให้สั่งของหน้างานได้พอดี',
        icon: 'check_circle'
      });
    }

    // 4. Temporary utilities
    const hasTempUtility = items.some(i => 
      i.name.includes('ไฟฟ้าชั่วคราว') || i.name.includes('ประปาชั่วคราว') || i.name.includes('มิเตอร์')
    );
    if (!hasTempUtility) {
      checks.push({
        status: 'tip',
        title: 'แนะนำเพิ่มงานสาธารณูปโภคชั่วคราว (ไฟ-น้ำไซต์งาน)',
        desc: 'ควรมีมิเตอร์ไฟฟ้าชั่วคราวและน้ำประปาชั่วคราวในหมวด 1 เพื่อคิดเป็นต้นทุนให้ลูกค้าจ่ายแทนผู้รับเหมา',
        icon: 'lightbulb'
      });
    } else {
      checks.push({
        status: 'pass',
        title: 'มีงานสาธารณูปโภคและเตรียมการไซต์ครบถ้วน',
        desc: 'ครอบคลุมหม้อไฟชั่วคราว น้ำประปา และสุขอนามัยช่างตามมาตรฐานก่อสร้าง',
        icon: 'construction'
      });
    }

    return checks;
  }, [summary, overheadPercent, items]);

  if (!isOpen) return null;

  const costPerSqm = houseAreaSqm > 0 ? Math.round(summary.grandTotal / houseAreaSqm) : 0;
  const directCost = summary.directCost || 1;
  const matPct = Math.round((summary.totalMaterial / directCost) * 100);
  const labPct = Math.round((summary.totalLabor / directCost) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-cyan-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-cyan-500/20">
              <span className="material-symbols-outlined text-2xl">analytics</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>แดชบอร์ดวิเคราะห์ต้นทุน & กำไร (Cost & Profit Analytics)</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                  {houseAreaSqm} ตร.ม.
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                วิเคราะห์สัดส่วนค่าวัสดุ-ค่าแรง จัดอันดับหมวดที่กินงบสูงสุด และตรวจสอบความเสี่ยงก่อนยื่นราคา
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 text-xs">
          
          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">รวมค่าวัสดุ (Material):</span>
              <span className="text-lg font-black font-mono text-cyan-400">
                ฿{summary.totalMaterial.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">{matPct}% ของต้นทุนตรง</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">รวมค่าแรงช่าง (Labor):</span>
              <span className="text-lg font-black font-mono text-emerald-400">
                ฿{summary.totalLabor.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">{labPct}% ของต้นทุนตรง</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">กำไร & จัดการ ({overheadPercent}%):</span>
              <span className="text-lg font-black font-mono text-amber-400">
                ฿{summary.overheadCost.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">ส่วนบริหารโครงการ</span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40">
              <span className="text-[11px] text-amber-300 block mb-1 font-bold">ยอดสุทธิรวมทั้งสิ้น:</span>
              <span className="text-lg font-black font-mono text-amber-400">
                ฿{summary.grandTotal.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-300 block mt-0.5 font-mono">
                เฉลี่ย <strong>฿{costPerSqm.toLocaleString()}</strong> / ตร.ม.
              </span>
            </div>
          </div>

          {/* Visual Ratio Bar */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-cyan-400">pie_chart</span>
                สัดส่วนโครงสร้างต้นทุน (Cost Structure Breakdown)
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                ต้นทุนตรง ฿{summary.directCost.toLocaleString()} บาท
              </span>
            </div>

            <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
              <div 
                style={{ width: `${matPct}%` }} 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500" 
                title={`ค่าวัสดุ: ${matPct}%`}
              />
              <div 
                style={{ width: `${labPct}%` }} 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" 
                title={`ค่าแรง: ${labPct}%`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono pt-1">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span>ค่าวัสดุ {matPct}% (฿{summary.totalMaterial.toLocaleString()})</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>ค่าแรงงาน {labPct}% (฿{summary.totalLabor.toLocaleString()})</span>
              </span>
            </div>
          </div>

          {/* 2-Columns: Category Ranking (Left) & Risk Audit Radar (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Left: Category Ranking (7 cols) */}
            <div className="md:col-span-7 p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-amber-400">leaderboard</span>
                  จัดอันดับหมวดงานที่ใช้เงินสูงสุด (Top Cost Drivers)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">% ของต้นทุนตรง</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {categoryStats.map((cat, idx) => (
                  <div key={cat.category} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-200">
                        <span className="w-4 text-slate-500 font-mono text-[10px]">{idx + 1}.</span>
                        <span className="material-symbols-outlined text-xs text-slate-400">{cat.icon}</span>
                        <span className="truncate max-w-[180px] sm:max-w-xs">{cat.label}</span>
                      </span>
                      <span className="font-mono font-bold text-white shrink-0">
                        ฿{cat.total.toLocaleString()} <span className="text-amber-400 text-[10px]">({cat.percentOfDirect}%)</span>
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden flex">
                      <div 
                        style={{ width: `${Math.min(100, cat.percentOfDirect)}%` }} 
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-cyan-400' : idx === 2 ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Risk Health Check (5 cols) */}
            <div className="md:col-span-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">health_and_safety</span>
                  ระบบตรวจสอบจุดเสี่ยง (Smart Risk Radar)
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {healthChecks.map((check, i) => (
                  <div 
                    key={i} 
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                      check.status === 'pass'
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : check.status === 'warning'
                        ? 'bg-amber-950/25 border-amber-500/40 text-amber-200'
                        : 'bg-blue-950/20 border-blue-500/30 text-blue-200'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-base mt-0.5 shrink-0 ${
                      check.status === 'pass' ? 'text-emerald-400' : check.status === 'warning' ? 'text-amber-400' : 'text-blue-400'
                    }`}>
                      {check.icon}
                    </span>
                    <div className="flex flex-col gap-0.5 leading-tight">
                      <strong className="text-[11px] font-bold text-white">{check.title}</strong>
                      <p className="text-[10px] text-slate-300 leading-normal">{check.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 font-mono">
            โครงการ: {projectName} • วิเคราะห์ ณ {new Date().toLocaleDateString('th-TH')}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
