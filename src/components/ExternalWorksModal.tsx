import React, { useState, useMemo } from 'react';
import { EXTERNAL_WORKS_CATALOG } from '../constants';
import { ExternalWorksPreset, BOQItem, ExternalItemType, FenceCalcParams, DrainageCalcParams } from '../types';
import { calculateFenceMaterials, calculateDrainageMaterials } from '../services/calculator';

interface ExternalWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: BOQItem[]) => void;
}

const safeNum = (val: number | undefined | null): number => {
  if (val === undefined || val === null || isNaN(val)) return 0;
  return val;
};

const safeToLocaleString = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString();
};

export const ExternalWorksModal: React.FC<ExternalWorksModalProps> = ({
  isOpen,
  onClose,
  onAddItems
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | ExternalItemType | 'fence_calc' | 'drain_calc'>('all');
  const [selectedItems, setSelectedItems] = useState<{ [id: string]: { qty: number; preset: ExternalWorksPreset } }>({});

  // 🧱 ตัวคำนวณรั้ว คสล.
  const [fenceLengthM, setFenceLengthM] = useState<number>(40);
  const [fenceHeightM, setFenceHeightM] = useState<number>(1.80);
  const [baySpacingM, setBaySpacingM] = useState<number>(2.50);
  const [pileType, setPileType] = useState<'hexagon_6m' | 'i_pile_12m' | 'spread_footing'>('hexagon_6m');
  const [fenceWallType, setFenceWallType] = useState<'solid_block' | 'half_wood_louver' | 'brick_plaster'>('solid_block');
  const [includePlasterAndPaint, setIncludePlasterAndPaint] = useState<boolean>(true);

  // 🌊 ตัวคำนวณทางระบายน้ำ & บ่อพัก
  const [pipeLengthM, setPipeLengthM] = useState<number>(35);
  const [pipeDiameterM, setPipeDiameterM] = useState<0.30 | 0.40>(0.30);
  const [manholeSpacingM, setManholeSpacingM] = useState<number>(7.0);
  const [includeGratingDitch, setIncludeGratingDitch] = useState<boolean>(true);
  const [gratingDitchLengthM, setGratingDitchLengthM] = useState<number>(5.0);

  const fenceResult = useMemo(() => {
    const params: FenceCalcParams = {
      fenceLengthM,
      fenceHeightM,
      baySpacingM,
      pileType,
      fenceWallType,
      includePlasterAndPaint
    };
    return calculateFenceMaterials(params);
  }, [fenceLengthM, fenceHeightM, baySpacingM, pileType, fenceWallType, includePlasterAndPaint]);

  const drainResult = useMemo(() => {
    const params: DrainageCalcParams = {
      pipeLengthM,
      pipeDiameterM,
      manholeSpacingM,
      includeGratingDitch,
      gratingDitchLengthM
    };
    return calculateDrainageMaterials(params);
  }, [pipeLengthM, pipeDiameterM, manholeSpacingM, includeGratingDitch, gratingDitchLengthM]);

  if (!isOpen) return null;

  const filteredCatalog = EXTERNAL_WORKS_CATALOG.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'fence_calc' || activeFilter === 'drain_calc') return false;
    return item.type === activeFilter;
  });

  const handleToggleSelect = (preset: ExternalWorksPreset) => {
    setSelectedItems(prev => {
      const copy = { ...prev };
      if (copy[preset.id]) {
        delete copy[preset.id];
      } else {
        copy[preset.id] = { qty: safeNum(preset.defaultQty) || 1, preset };
      }
      return copy;
    });
  };

  const handleQtyChange = (id: string, delta: number) => {
    setSelectedItems(prev => {
      if (!prev[id]) return prev;
      const newQty = Math.max(1, safeNum(prev[id].qty) + delta);
      return {
        ...prev,
        [id]: { ...prev[id], qty: newQty }
      };
    });
  };

  const handleSetCustomQty = (id: string, val: number) => {
    setSelectedItems(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], qty: Math.max(0.5, safeNum(val) || 1) }
      };
    });
  };

  const selectedCount = Object.keys(selectedItems).length;
  const estimatedTotal = Object.values(selectedItems).reduce((sum, { qty, preset }) => {
    const wasteFactor = 1 + (safeNum(preset.wastePercent) / 100);
    const matPrice = safeNum(preset.materialUnitPrice);
    const labPrice = safeNum(preset.laborUnitPrice);
    const safeQ = safeNum(qty);
    return sum + (safeQ * matPrice * wasteFactor) + (safeQ * labPrice);
  }, 0);

  // นำรายการจากแคตตาล็อกเข้า BOQ
  const handleApplyToBOQ = () => {
    const newBOQItems: BOQItem[] = Object.values(selectedItems).map(({ qty, preset }, idx) => ({
      id: `ext-custom-${Date.now()}-${idx}`,
      category: 'external_works',
      name: preset.name,
      spec: preset.spec,
      quantity: safeNum(qty),
      unit: preset.unit,
      materialUnitPrice: safeNum(preset.materialUnitPrice),
      laborUnitPrice: safeNum(preset.laborUnitPrice),
      wastePercent: safeNum(preset.wastePercent),
      itemSubtype: preset.id,
      basePerSqm: safeNum(qty) / 120
    }));

    onAddItems(newBOQItems);
    onClose();
  };

  // นำผลคำนวณรั้วเข้า BOQ
  const handleApplyFenceCalc = () => {
    const ts = Date.now();
    const postsCount = safeNum(fenceResult?.postsCount);
    const pilesCount = safeNum(fenceResult?.pilesCount);
    const rebarKg = safeNum(fenceResult?.rebarKg);
    const concreteBlocksCount = safeNum(fenceResult?.concreteBlocksCount);
    const totalMaterialCost = safeNum(fenceResult?.totalMaterialCost);
    const totalLaborCost = safeNum(fenceResult?.totalLaborCost);
    const plasterAreaSqm = safeNum(fenceResult?.plasterAreaSqm);

    const items: BOQItem[] = [
      {
        id: `ext-fence-calc-${ts}`,
        category: 'external_works',
        name: `งานรั้ว คสล. ก่อคอนกรีตบล็อก สูง ${fenceHeightM} ม. (ความยาว ${fenceLengthM} ม.)`,
        spec: `เสา คสล. ${postsCount} ต้น (@ ${baySpacingM} ม.) + ${pilesCount > 0 ? `เสาเข็ม ${pilesCount} ต้น` : 'ฐานแผ่'} + คานคอดิน-ทับหลัง (บล็อก ~${safeToLocaleString(concreteBlocksCount)} ก้อน, เหล็ก ${rebarKg} กก.)`,
        quantity: fenceLengthM,
        unit: 'ม.',
        materialUnitPrice: Math.round(totalMaterialCost / Math.max(1, fenceLengthM)),
        laborUnitPrice: Math.round(totalLaborCost / Math.max(1, fenceLengthM)),
        wastePercent: 5,
        basePerSqm: fenceLengthM / 120
      }
    ];

    if (includePlasterAndPaint && plasterAreaSqm > 0) {
      items.push({
        id: `ext-fence-plaster-${ts + 1}`,
        category: 'external_works',
        name: 'งานฉาบปูนเรียบและทาสีภายนอกผนังรั้ว 2 ด้าน',
        spec: `พื้นที่ผิวฉาบ ${plasterAreaSqm} ตร.ม. พร้อมตาข่ายไฟเบอร์และทาสีรองพื้น+สีจริง 2 เที่ยว`,
        quantity: plasterAreaSqm,
        unit: 'ตร.ม.',
        materialUnitPrice: 65,
        laborUnitPrice: 90,
        wastePercent: 5,
        basePerSqm: plasterAreaSqm / 120
      });
    }

    onAddItems(items);
    onClose();
  };

  // นำผลคำนวณทางระบายน้ำเข้า BOQ
  const handleApplyDrainCalc = () => {
    const ts = Date.now();
    const pipesCount = safeNum(drainResult?.pipesCount);
    const manholesCount = safeNum(drainResult?.manholesCount);
    const excavationSandCuM = safeNum(drainResult?.excavationSandCuM);
    const gratingDitchPieces = safeNum(drainResult?.gratingDitchPieces);
    const totalMaterialCost = safeNum(drainResult?.totalMaterialCost);
    const totalLaborCost = safeNum(drainResult?.totalLaborCost);

    const items: BOQItem[] = [
      {
        id: `ext-drain-calc-${ts}`,
        category: 'external_works',
        name: `ท่อระบายน้ำ คสล. Ø ${pipeDiameterM}0 ม. + บ่อพักคอนกรีตสำเร็จรูปพร้อมฝา คสล.`,
        spec: `แนวระบายน้ำรอบบ้าน ${pipeLengthM} ม. (ท่อ คสล. ${pipesCount} ท่อน + บ่อพัก ${manholesCount} บ่อ @ ${manholeSpacingM} ม. พร้อมทรายรองก้น ${excavationSandCuM} คิว)`,
        quantity: pipeLengthM,
        unit: 'ม.',
        materialUnitPrice: Math.round(totalMaterialCost / Math.max(1, pipeLengthM)),
        laborUnitPrice: Math.round(totalLaborCost / Math.max(1, pipeLengthM)),
        wastePercent: 5,
        basePerSqm: pipeLengthM / 120
      }
    ];

    if (includeGratingDitch && gratingDitchPieces > 0) {
      items.push({
        id: `ext-drain-grating-${ts + 1}`,
        category: 'external_works',
        name: 'รางระบายน้ำตัวยู คสล. พร้อมฝาตะแกรงเหล็กชุบกัลวาไนซ์กันสนิม (หน้าโรงรถ/ประตูรั้ว)',
        spec: `ความยาว ${gratingDitchLengthM} ม. (${gratingDitchPieces} ท่อน) รับน้ำหนักรถยนต์วิ่งผ่านได้`,
        quantity: gratingDitchLengthM,
        unit: 'ม.',
        materialUnitPrice: 1250,
        laborUnitPrice: 450,
        wastePercent: 0,
        basePerSqm: gratingDitchLengthM / 120
      });
    }

    onAddItems(items);
    onClose();
  };

  const totalFenceBudget = safeNum(fenceResult?.totalMaterialCost) + safeNum(fenceResult?.totalLaborCost);
  const totalDrainBudget = safeNum(drainResult?.totalMaterialCost) + safeNum(drainResult?.totalLaborCost);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-emerald-600 flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-2xl">fence</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                หมวดงานภายนอกอาคาร (รั้ว คสล. • ท่อระบายน้ำ • โรงรถ • ทางเดิน • ถังน้ำ)
              </h2>
              <p className="text-xs text-slate-400">
                เลือกจากแคตตาล็อกมาตรฐาน หรือใช้เครื่องคำนวณงานรั้วและท่อระบายน้ำ คสล. แบบละเอียด
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

        {/* Filter Tabs by Category */}
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                activeFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              แคตตาล็อกทั้งหมด ({EXTERNAL_WORKS_CATALOG.length})
            </button>
            {/* ปุ่มเปิดเครื่องคิดคำนวณรั้ว */}
            <button
              onClick={() => setActiveFilter('fence_calc')}
              className={`px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 transition ${
                activeFilter === 'fence_calc' 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'bg-amber-950/60 text-amber-300 border border-amber-500/40 hover:bg-amber-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm">calculate</span>
              <span>คำนวณรั้ว คสล. ละเอียด</span>
            </button>
            {/* ปุ่มเปิดเครื่องคิดคำนวณท่อระบายน้ำ */}
            <button
              onClick={() => setActiveFilter('drain_calc')}
              className={`px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 transition ${
                activeFilter === 'drain_calc' 
                  ? 'bg-cyan-500 text-slate-950 shadow-md' 
                  : 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm">water_damage</span>
              <span>คำนวณท่อระบายน้ำ & บ่อพัก</span>
            </button>
            <button
              onClick={() => setActiveFilter('carport')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeFilter === 'carport' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>โรงจอดรถ</span>
            </button>
            <button
              onClick={() => setActiveFilter('pavement')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeFilter === 'pavement' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>ทางเดิน/ลานซักล้าง</span>
            </button>
            <button
              onClick={() => setActiveFilter('water_system')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeFilter === 'water_system' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>ถังน้ำ & ปั๊มน้ำ</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* 🌟 1. เครื่องคำนวณรั้ว คสล. แบบละเอียด 🌟 */}
          {activeFilter === 'fence_calc' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-6 bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col gap-3.5 text-xs">
                <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 text-sm">
                  <span className="material-symbols-outlined text-base">fence</span>
                  กำหนดพารามิเตอร์งานรั้วรอบบ้าน
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ความยาวรั้วรวม (เมตร)</label>
                    <input
                      type="number"
                      min="5"
                      max="1000"
                      value={fenceLengthM}
                      onChange={(e) => setFenceLengthM(parseFloat(e.target.value) || 10)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-400 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ความสูงรั้ว (เมตร)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="3.0"
                      value={fenceHeightM}
                      onChange={(e) => setFenceHeightM(parseFloat(e.target.value) || 1.8)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ระยะช่วงเสารั้ว @ (ม.)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="2.0"
                      max="3.5"
                      value={baySpacingM}
                      onChange={(e) => setBaySpacingM(parseFloat(e.target.value) || 2.5)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ชนิดเสาเข็มรั้ว:</label>
                    <select
                      value={pileType}
                      onChange={(e) => setPileType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      <option value="hexagon_6m">เสาเข็มหกเหลี่ยมกลวง 6 ม. (ยอดนิยม)</option>
                      <option value="i_pile_12m">เสาเข็มไอ 0.15 x 12 ม. (กันดินทรุด)</option>
                      <option value="spread_footing">ฐานรากแผ่ (ดินแข็ง/ต่างจังหวัด)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">รูปแบบผนังรั้ว:</label>
                  <select
                    value={fenceWallType}
                    onChange={(e) => setFenceWallType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                  >
                    <option value="solid_block">รั้วทึบคอนกรีตบล็อก คสล. ตลอดแนว (มาตรฐาน)</option>
                    <option value="half_wood_louver">รั้วกึ่งโปร่ง (บล็อกทึบ 0.80 ม. + ระแนงไม้เทียม/เหล็ก 1.0 ม.)</option>
                    <option value="brick_plaster">รั้วอิฐมอญฉาบปูนหนาพิเศษ</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-850">
                  <span className="text-slate-300 font-medium">ฉาบปูนเรียบและทาสีผนังรั้ว 2 ด้าน:</span>
                  <input
                    type="checkbox"
                    checked={includePlasterAndPaint}
                    onChange={(e) => setIncludePlasterAndPaint(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 cursor-pointer rounded"
                  />
                </div>
              </div>

              {/* Fence Result Breakdown */}
              <div className="md:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3 text-xs">
                <span className="font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>ถอดรายการวัสดุงานรั้วความยาว {fenceLengthM} ม.</span>
                  <span className="text-amber-400 font-mono font-bold">เสารั้ว {safeNum(fenceResult?.postsCount)} ต้น</span>
                </span>

                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-300">เสาเข็มรั้ว ({pileType === 'hexagon_6m' ? 'หกเหลี่ยม 6ม.' : 'เสาเข็มไอ'}):</span>
                  <span className="font-mono font-bold text-cyan-300">{safeNum(fenceResult?.pilesCount)} ต้น</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-300">คอนกรีตฐานราก เสา คานคอดิน และทับหลัง:</span>
                  <span className="font-mono font-bold text-white">
                    {Math.round((safeNum(fenceResult?.footingConcreteCuM) + safeNum(fenceResult?.beamConcreteCuM)) * 10) / 10} ลบ.ม. (คิว)
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-300">เหล็กข้ออ้อย DB12 และปลอก RB6 รั้ว:</span>
                  <span className="font-mono font-bold text-amber-300">{safeToLocaleString(fenceResult?.rebarKg)} กก.</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-300">คอนกรีตบล็อกก่อผนังรั้ว:</span>
                  <span className="font-mono font-bold text-cyan-200">{safeToLocaleString(fenceResult?.concreteBlocksCount)} ก้อน</span>
                </div>

                {includePlasterAndPaint && (
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-300">งานฉาบปูนและทาสีผนังรั้ว 2 ด้าน:</span>
                    <span className="font-mono font-bold text-slate-300">{safeNum(fenceResult?.plasterAreaSqm)} ตร.ม.</span>
                  </div>
                )}

                <div className="mt-auto p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-amber-300 font-bold block">งบรวมงานรั้ว {fenceLengthM} ม.</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (เฉลี่ย ฿{safeToLocaleString(Math.round(totalFenceBudget / Math.max(1, fenceLengthM)))} / เมตร)
                    </span>
                  </div>
                  <span className="text-base font-black font-mono text-amber-400">
                    ฿{safeToLocaleString(totalFenceBudget)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleApplyFenceCalc}
                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 mt-1"
                >
                  <span className="material-symbols-outlined text-sm">add_task</span>
                  <span>เพิ่มผลคำนวณรั้วลงใน BOQ ทันที</span>
                </button>
              </div>
            </div>
          )}

          {/* 🌟 2. เครื่องคำนวณทางระบายน้ำ คสล. & บ่อพัก 🌟 */}
          {activeFilter === 'drain_calc' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-6 bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col gap-3.5 text-xs">
                <span className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 text-sm">
                  <span className="material-symbols-outlined text-base">water_damage</span>
                  กำหนดแนวท่อระบายน้ำ คสล. & บ่อพัก
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ความยาวแนวท่อรอบบ้าน (เมตร)</label>
                    <input
                      type="number"
                      min="5"
                      max="500"
                      value={pipeLengthM}
                      onChange={(e) => setPipeLengthM(parseFloat(e.target.value) || 10)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ขนาดท่อ คสล. มอก.</label>
                    <select
                      value={pipeDiameterM}
                      onChange={(e) => setPipeDiameterM(parseFloat(e.target.value) as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      <option value={0.30}>Ø 0.30 ม. (30 ซม. - มาตรฐานบ้านเดี่ยว)</option>
                      <option value={0.40}>Ø 0.40 ม. (40 ซม. - ระบายน้ำปริมาณมาก)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">ระยะห่างบ่อพักสำเร็จรูป (เมตร)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="4"
                    max="15"
                    value={manholeSpacingM}
                    onChange={(e) => setManholeSpacingM(parseFloat(e.target.value) || 7.0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">แนะนำทุกระยะ 6.0 - 8.0 ม. และจุดหักมุม</span>
                </div>

                <div className="pt-2 border-t border-slate-850 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">รวมรางยูตะแกรงเหล็กหน้าโรงรถ/ประตูรั้ว:</span>
                    <input
                      type="checkbox"
                      checked={includeGratingDitch}
                      onChange={(e) => setIncludeGratingDitch(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 cursor-pointer rounded"
                    />
                  </div>

                  {includeGratingDitch && (
                    <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[11px]">ความยาวรางยูหน้าบ้าน:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="20"
                        value={gratingDitchLengthM}
                        onChange={(e) => setGratingDitchLengthM(parseFloat(e.target.value) || 5.0)}
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-300 font-mono font-bold text-center"
                      />
                      <span className="text-slate-400 text-xs">เมตร</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Drain Result Breakdown */}
              <div className="md:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3 text-xs">
                <span className="font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>ถอดรายการท่อระบายน้ำ คสล. {pipeLengthM} ม.</span>
                  <span className="text-cyan-400 font-mono font-bold">บ่อพัก {safeNum(drainResult?.manholesCount)} บ่อ</span>
                </span>

                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-300">ท่อ คสล. ปากลิ้นราง Ø {pipeDiameterM}0 ม. (ยาว 1ม./ท่อน):</span>
                  <span className="font-mono font-bold text-cyan-300">{safeNum(drainResult?.pipesCount)} ท่อน</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-300">บ่อพักคอนกรีตสำเร็จรูปพร้อมฝา คสล.:</span>
                  <span className="font-mono font-bold text-white">{safeNum(drainResult?.manholesCount)} บ่อ</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-300">ทรายหยาบรองก้นร่องท่อ:</span>
                  <span className="font-mono font-bold text-amber-300">{safeNum(drainResult?.excavationSandCuM)} ลบ.ม. (คิว)</span>
                </div>

                {includeGratingDitch && (
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-300">รางยู คสล. พร้อมฝาตะแกรงเหล็กกัลวาไนซ์ ({gratingDitchLengthM} ม.):</span>
                    <span className="font-mono font-bold text-cyan-200">{safeNum(drainResult?.gratingDitchPieces)} ท่อน</span>
                  </div>
                )}

                <div className="mt-auto p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-cyan-300 font-bold block">งบรวมงานระบายน้ำ {pipeLengthM} ม.</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (เฉลี่ย ฿{safeToLocaleString(Math.round(totalDrainBudget / Math.max(1, pipeLengthM)))} / เมตร)
                    </span>
                  </div>
                  <span className="text-base font-black font-mono text-cyan-400">
                    ฿{safeToLocaleString(totalDrainBudget)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleApplyDrainCalc}
                  className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 mt-1"
                >
                  <span className="material-symbols-outlined text-sm">add_task</span>
                  <span>เพิ่มผลคำนวณทางระบายน้ำลงใน BOQ ทันที</span>
                </button>
              </div>
            </div>
          )}

          {/* 🌟 3. แคตตาล็อกหมวดงานภายนอกทั่วไป 🌟 */}
          {activeFilter !== 'fence_calc' && activeFilter !== 'drain_calc' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCatalog.map(item => {
                const isSelected = !!selectedItems[item.id];
                const currentQty = safeNum(selectedItems[item.id]?.qty ?? item.defaultQty ?? 1);
                const matPrice = safeNum(item.materialUnitPrice);
                const labPrice = safeNum(item.laborUnitPrice);
                const wasteFactor = 1 + (safeNum(item.wastePercent) / 100);
                const lineTotal = Math.round((currentQty * matPrice * wasteFactor) + (currentQty * labPrice));

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleSelect(item)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-400/80 shadow-lg shadow-amber-950/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.type === 'fence' ? 'bg-amber-500/20 text-amber-300' :
                            item.type === 'carport' ? 'bg-cyan-500/20 text-cyan-300' :
                            item.type === 'drainage' ? 'bg-blue-500/20 text-blue-300' :
                            item.type === 'pavement' ? 'bg-emerald-500/20 text-emerald-300' :
                            'bg-purple-500/20 text-purple-300'
                          }`}>
                            {item.type === 'fence' ? 'งานรั้ว/ประตูรั้ว' :
                             item.type === 'carport' ? 'งานโรงรถ' :
                             item.type === 'drainage' ? 'งานระบายน้ำ' :
                             item.type === 'pavement' ? 'ทางเดิน/ลาน' : 'ระบบน้ำภายนอก'}
                          </span>
                          <span className="text-[11px] text-slate-400">{item.popularNote}</span>
                        </div>
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                          isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'border border-slate-700 text-transparent'
                        }`}>
                          ✓
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white mt-1.5">{item.name}</h3>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{item.spec}</p>
                      <p className="text-[10px] text-slate-500 mt-1 italic">{item.description}</p>
                    </div>

                    <div 
                      className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400">
                          วัสดุ ฿{safeToLocaleString(matPrice)} + แรง ฿{safeToLocaleString(labPrice)}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          รวม ฿{safeToLocaleString(matPrice + labPrice)} / {item.unit}
                        </span>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-amber-500/40">
                          <span className="text-[11px] text-slate-300">ปริมาณ:</span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.id, -1)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-white text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="any"
                            value={currentQty}
                            onChange={(e) => handleSetCustomQty(item.id, parseFloat(e.target.value) || 1)}
                            className="w-14 bg-transparent text-amber-300 font-mono font-bold text-center text-xs focus:outline-none"
                          />
                          <span className="text-slate-400 text-xs font-mono">{item.unit}</span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.id, 1)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-white text-xs"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(item)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                        >
                          + เลือกรายการนี้
                        </button>
                      )}
                    </div>

                    {isSelected && (
                      <div className="text-right text-[11px] text-amber-300 font-mono font-semibold">
                        ราคารวมงานนี้: ฿{safeToLocaleString(lineTotal)} บาท
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        {activeFilter !== 'fence_calc' && activeFilter !== 'drain_calc' && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between flex-wrap gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300">
                เลือกงานภายนอกแล้ว <strong className="text-amber-400 font-bold">{selectedCount}</strong> รายการ
              </span>
              {selectedCount > 0 && (
                <span className="text-xs font-mono text-cyan-400">
                  (ประมาณการรวม: ฿{safeToLocaleString(Math.round(estimatedTotal))} บาท)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                ปิด
              </button>
              <button
                onClick={handleApplyToBOQ}
                disabled={selectedCount === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">playlist_add</span>
                เพิ่มเข้างวดงาน BOQ ({selectedCount} รายการ)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
