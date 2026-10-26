import React, { useState, useMemo } from 'react';
import { SiteMaterialItem, PaymentMilestone } from '../types';
import { Flow } from 'flow-sdk';

interface SiteProcurementViewProps {
  items: SiteMaterialItem[];
  projectName: string;
  houseAreaSqm: number;
  milestones?: PaymentMilestone[];
  checkedItems?: Record<string, boolean>;
  onToggleCheck?: (id: string) => void;
  onBulkCheck?: (newChecked: Record<string, boolean>) => void;
}

const safeToLocaleString = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString();
};

const GROUP_LABELS: Record<string, { label: string; icon: string }> = {
  cement_concrete: { label: 'ปูนซีเมนต์ & คอนกรีตผสมเสร็จ & ทราย-หิน', icon: 'conveyor_belt' },
  steel_rebar: { label: 'เหล็กเส้น & เหล็กรูปพรรณ & ลวดผูก', icon: 'line_weight' },
  masonry_brick: { label: 'อิฐมอญ/บล็อก/มวลเบา & ปูนก่อ-ปูนฉาบ', icon: 'layers' },
  roof_finishes: { label: 'แผ่นหลังคา เมทัลชีท ฉนวน & สกรูยึด', icon: 'roofing' },
  tiles_finishes: { label: 'กระเบื้อง ปูนกาว ยาแนว ยิปซัม & สีทา', icon: 'grid_view' },
  doors_windows: { label: 'ชุดประตู วงกบ บานพับ & อลูมิเนียม', icon: 'meeting_room' },
  mep_fixtures: { label: 'ท่อประปา สายไฟ สุขภัณฑ์ & ถังบำบัด', icon: 'plumbing' },
  external_civil: { label: 'งานรั้ว บล็อกปูพื้น โรงรถ & ท่อระบายน้ำ คสล.', icon: 'fence' },
};

export const SiteProcurementView: React.FC<SiteProcurementViewProps> = ({
  items,
  projectName,
  houseAreaSqm,
  milestones = [],
  checkedItems: propCheckedItems,
  onToggleCheck: propOnToggleCheck,
  onBulkCheck: propOnBulkCheck
}) => {
  const [selectedMilestoneFilter, setSelectedMilestoneFilter] = useState<'all' | number>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [localChecked, setLocalChecked] = useState<Record<string, boolean>>({});

  const activeChecked = propCheckedItems !== undefined ? propCheckedItems : localChecked;
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  // กรองตาม Milestone ที่ผู้ใช้ตั้งไว้จริง, Group และคำค้นหา
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedMilestoneFilter !== 'all' && item.milestoneNumber !== selectedMilestoneFilter) {
        return false;
      }
      if (selectedGroup !== 'all' && item.materialGroup !== selectedGroup) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesSpec = item.spec.toLowerCase().includes(q);
        const matchesNote = item.packageNote.toLowerCase().includes(q);
        if (!matchesName && !matchesSpec && !matchesNote) return false;
      }
      return true;
    });
  }, [items, selectedMilestoneFilter, selectedGroup, searchQuery]);

  // สรุปยอดเงินรวมรายการสั่งซื้อ
  const totalCost = useMemo(() => {
    return filteredItems.reduce((acc, cur) => acc + (cur.totalEstimatedCost || 0), 0);
  }, [filteredItems]);

  const orderedCount = useMemo(() => {
    return Object.values(activeChecked).filter(Boolean).length;
  }, [activeChecked]);

  const handleToggleCheck = (id: string) => {
    if (propOnToggleCheck) {
      propOnToggleCheck(id);
    } else {
      setLocalChecked(prev => ({
        ...prev,
        [id]: !prev[id]
      }));
    }
  };

  const handleCheckAll = (status: boolean) => {
    const updated: Record<string, boolean> = { ...activeChecked };
    filteredItems.forEach(i => {
      updated[i.id] = status;
    });
    if (propOnBulkCheck) {
      propOnBulkCheck(updated);
    } else {
      setLocalChecked(updated);
    }
  };

  // Export Purchase Order CSV
  const handleExportPOCSV = async () => {
    setIsExporting(true);
    try {
      let csv = '\uFEFF';
      csv += `ใบสรุปรายการสั่งซื้อวัสดุหน้างานจริง (Jobsite Purchase Order),โครงการ "${projectName.replace(/"/g, '""')}"\n`;
      csv += `พื้นที่บ้าน,${houseAreaSqm},ตร.ม.\n`;
      csv += `ยอดงบประมาณวัสดุรวม,${totalCost},บาท\n\n`;
      csv += 'ลำดับ,งวดงานหน้างาน,หมวดวัสดุ,รายการวัสดุที่ต้องสั่งซื้อ,สเปก / ขนาด,ปริมาณสุทธิ,เผื่อเศษ(%),จำนวนสั่งซื้อจริง,หน่วยสั่งซื้อ,ราคาประเมิน/หน่วย,งบรวมโดยประมาณ(บาท),คำแนะนำการสั่งและการขนส่ง,สถานะสั่งแล้ว\n';

      filteredItems.forEach((item, idx) => {
        const phaseName = `งวดที่ ${item.milestoneNumber}: ${item.milestoneTitle}`;
        const groupName = GROUP_LABELS[item.materialGroup]?.label || item.materialGroup;
        const isChecked = activeChecked[item.id] ? 'สั่งแล้ว ✓' : 'รอดำเนินการ';
        csv += `${idx + 1},"${phaseName}","${groupName}","${item.name.replace(/"/g, '""')}","${item.spec.replace(/"/g, '""')}",${item.netQuantity},${item.wastePercent}%,${item.orderQuantity},"${item.unit}",${item.unitPriceEstimate},${item.totalEstimatedCost},"${item.packageNote.replace(/"/g, '""')}","${isChecked}"\n`;
      });

      const base64 = btoa(unescape(encodeURIComponent(csv)));
      await Flow.download({
        base64,
        mimeType: 'text/csv;charset=utf-8',
        filename: `Jobsite_PO_${projectName.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}_${Date.now()}.csv`
      });
    } catch (err) {
      console.error('Failed to export PO CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy PO Summary to Clipboard
  const handleCopyClipboard = async () => {
    let text = `📦 ใบสั่งซื้อและจัดส่งวัสดุหน้างานจริง - โครงการ: ${projectName} (${houseAreaSqm} ตร.ม.)\n`;
    text += `========================================\n\n`;

    filteredItems.forEach((item, idx) => {
      text += `${idx + 1}. [งวดที่ ${item.milestoneNumber}] ${item.name}\n`;
      text += `   - สเปก: ${item.spec}\n`;
      text += `   - สั่งซื้อจริง: ${safeToLocaleString(item.orderQuantity)} ${item.unit} (เผื่อเศษ ${item.wastePercent}%)\n`;
      text += `   - งบประมาณ: ฿${safeToLocaleString(item.totalEstimatedCost)}\n`;
      text += `   - จัดส่ง: ${item.packageNote}\n\n`;
    });

    text += `รวมงบสั่งซื้อวัสดุ: ฿${safeToLocaleString(totalCost)} บาท`;

    let copied = false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {
        console.warn('Fallback copy failed', e);
      }
    }

    if (copied) {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  return (
    <div className="flex flex-col h-full w-full gap-5">
      
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Banner 1: Header Info */}
        <div className="bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-900 p-4 rounded-2xl border border-amber-500/40 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-base">local_shipping</span>
              สั่งซื้อหน้างานจริง (Site Order)
            </div>
            <h3 className="text-base font-bold text-white">รายการสั่งซื้อผูกตรงกับงวดงานจริง</h3>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              เชื่อมโยงตามงวดงาน {milestones.length} งวดที่ปรับไว้ในสัญญา ช่วยให้สั่งวัสดุเข้าไซท์งานได้ถูกล็อต ไม่ต้องกองทิ้งและไม่ขาดหน้างาน
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">ขนาดบ้าน:</span>
            <span className="text-amber-300 font-bold">{houseAreaSqm} ตารางเมตร</span>
          </div>
        </div>

        {/* Banner 2: Total Items to Procure */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>รายการวัสดุที่ต้องสั่ง</span>
            <span className="material-symbols-outlined text-cyan-400">inventory_2</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-cyan-300">
              {filteredItems.length} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
            <span className="text-[11px] text-slate-500">
              สั่งแล้ว {orderedCount} / {filteredItems.length} รายการ
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-cyan-400 h-full transition-all duration-300"
              style={{ width: `${filteredItems.length ? (orderedCount / filteredItems.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Banner 3: Total Materials Cost */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>งบค่าวัสดุสั่งซื้อรวม</span>
            <span className="material-symbols-outlined text-amber-400">receipt_long</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-amber-400">
              ฿{safeToLocaleString(totalCost)}
            </div>
            <span className="text-[11px] text-slate-500">
              เฉลี่ย ฿{safeToLocaleString(Math.round(totalCost / (houseAreaSqm || 1)))} / ตร.ม.
            </span>
          </div>
          <div className="text-[10px] text-amber-300/80 font-mono">
            ✓ คิดรวมเผื่อตัดเศษและแตกหักหน้างานแล้ว
          </div>
        </div>

        {/* Banner 4: Quick Action Controls */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-2.5">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-emerald-400">share</span>
            ส่งรายการให้ร้านค้า/ช่าง
          </span>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleExportPOCSV}
              disabled={isExporting}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>{isExporting ? 'กำลังส่งออก...' : 'ดาวน์โหลดใบสั่งซื้อ CSV'}</span>
            </button>
            <button
              onClick={handleCopyClipboard}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
              <span>{copiedToast ? 'คัดลอกลงคลิปบอร์ดแล้ว ✓' : 'คัดลอกสรุปส่งไลน์'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Filter and Phase Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        
        {/* Dynamic Milestones Timeline Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <span className="text-xs font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-emerald-400">payments</span>
            จัดส่งตามงวดงานจริง ({milestones.length} งวด):
          </span>
          <button
            onClick={() => setSelectedMilestoneFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition ${
              selectedMilestoneFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm">all_inclusive</span>
            <span>ทุกงวดงาน ({items.length})</span>
          </button>
          {milestones.map((m) => {
            const isSelected = selectedMilestoneFilter === m.milestoneNumber;
            const count = items.filter(i => i.milestoneNumber === m.milestoneNumber).length;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMilestoneFilter(m.milestoneNumber)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span className="font-mono font-bold text-xs">งวด {m.milestoneNumber}</span>
                <span className="text-[10px] opacity-80">({m.percentage}%)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-slate-900/40 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Material Group and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          
          {/* Search Input */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 w-72 focus-within:border-amber-400 transition">
            <span className="material-symbols-outlined text-slate-500 text-base">search</span>
            <input
              type="text"
              placeholder="ค้นหาชื่อวัสดุ กระเบื้อง สเปก หรือหน่วย..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Group Filter Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">ประเภทวัสดุ:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400"
            >
              <option value="all">ทุกประเภทวัสดุ</option>
              {Object.entries(GROUP_LABELS).map(([gKey, gInfo]) => (
                <option key={gKey} value={gKey}>{gInfo.label}</option>
              ))}
            </select>
          </div>

          {/* Check All Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCheckAll(true)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-cyan-950/40 border border-cyan-500/30 transition"
            >
              เลือกทั้งหมด
            </button>
            <button
              onClick={() => handleCheckAll(false)}
              className="text-[11px] text-slate-400 hover:text-slate-300 px-2 py-1 rounded bg-slate-950 border border-slate-800 transition"
            >
              ล้างการเลือก
            </button>
          </div>

        </div>

      </div>

      {/* Main Table: Jobsite Purchase Order */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col">
        
        {/* Table Head Bar */}
        <div className="px-5 py-3.5 bg-slate-850/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-lg">fact_check</span>
            <span className="font-bold text-slate-100">
              ตารางสั่งซื้อและเช็คยอดส่งเข้าหน้างาน ({filteredItems.length} รายการ)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            * สั่งซื้อจริงคิดรวม % เผื่อตัดเศษและแตกบิ่นหน้างานเรียบร้อยแล้ว
          </span>
        </div>

        {/* Scrollable Table Content */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/60 uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">ตรวจ</th>
                <th className="py-3 px-3 min-w-[200px]">ชื่อวัสดุสั่งซื้อ</th>
                <th className="py-3 px-3 min-w-[240px]">สเปก / ขนาด / ข้อมูลคำนวณกล่อง</th>
                <th className="py-3 px-3 w-28 text-right">จำนวนสุทธิ</th>
                <th className="py-3 px-3 w-20 text-center">เผื่อเศษ</th>
                <th className="py-3 px-3 w-36 text-right font-bold text-amber-400 bg-amber-500/5">
                  สั่งซื้อจริงหน้างาน
                </th>
                <th className="py-3 px-3 w-28 text-right">ราคา/หน่วย (฿)</th>
                <th className="py-3 px-3 w-32 text-right font-bold text-slate-200">งบรวม (฿)</th>
                <th className="py-3 px-3 min-w-[260px]">วิธีสั่ง & ข้อควรระวังหน้างาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                    ไม่พบรายการวัสดุในงวดงานนี้ ลองเลือกดู "ทุกงวดงาน" หรือเปลี่ยนประเภทวัสดุ
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isChecked = !!activeChecked[item.id];
                  return (
                    <tr 
                      key={item.id} 
                      className={`transition ${isChecked ? 'bg-emerald-950/20' : 'hover:bg-slate-850/50'}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleCheck(item.id)}
                          className={`w-5 h-5 rounded flex items-center justify-center transition border ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                              : 'border-slate-700 hover:border-slate-500 text-transparent'
                          }`}
                        >
                          ✓
                        </button>
                      </td>

                      {/* Material Name */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <span className={`font-bold ${isChecked ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                            {item.name}
                          </span>
                          <span className="text-[10px] font-mono flex items-center gap-1 text-emerald-400">
                            <span className="material-symbols-outlined text-[12px]">payments</span>
                            <span>งวดที่ {item.milestoneNumber}: {item.milestoneTitle?.split(':')[1] || item.milestoneTitle}</span>
                          </span>
                        </div>
                      </td>

                      {/* Spec */}
                      <td className="py-3 px-3">
                        <span className="text-slate-300 text-[11px] leading-relaxed">
                          {item.spec}
                        </span>
                      </td>

                      {/* Net Quantity */}
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {safeToLocaleString(item.netQuantity)} {item.unit.includes('กล่อง') ? 'ตร.ม.' : item.unit}
                      </td>

                      {/* Waste % */}
                      <td className="py-3 px-3 text-center font-mono text-[11px]">
                        {item.wastePercent > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                            +{item.wastePercent}%
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Actual Order Quantity */}
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-amber-300 bg-amber-500/5">
                        <div className="flex flex-col items-end">
                          <span className="text-base text-amber-400">{safeToLocaleString(item.orderQuantity)}</span>
                          <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        ฿{safeToLocaleString(item.unitPriceEstimate)}
                      </td>

                      {/* Total Cost */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-white text-sm">
                        ฿{safeToLocaleString(item.totalEstimatedCost)}
                      </td>

                      {/* Packaging & Jobsite Tips */}
                      <td className="py-3 px-3">
                        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-1.5">
                          <span className="material-symbols-outlined text-xs text-amber-400 mt-0.5 shrink-0">tips_and_updates</span>
                          <span>{item.packageNote}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary Info */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-4 text-slate-400">
            <span>แสดง <strong>{filteredItems.length}</strong> รายการวัสดุ</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">
              เช็คแล้ว {orderedCount} รายการ ({Math.round(filteredItems.length ? (orderedCount / filteredItems.length) * 100 : 0)}%)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">งบประมาณสั่งซื้อวัสดุรวมสุทธิ:</span>
            <span className="text-lg font-black font-mono text-amber-400">
              ฿{safeToLocaleString(totalCost)} บาท
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
