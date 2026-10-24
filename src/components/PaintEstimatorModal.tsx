import React, { useState, useMemo } from 'react';
import { BOQItem, PaintGrade, PaintSurfaceCondition, SteelPrimerType, PaintCalculationResult } from '../types';

interface PaintEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToBOQ: (newItems: BOQItem[]) => void;
  currentHouseAreaSqm: number;
}

export const PaintEstimatorModal: React.FC<PaintEstimatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToBOQ,
  currentHouseAreaSqm = 120
}) => {
  // ค่าเริ่มต้นพื้นที่ผนังและฝ้าตามสัดส่วนพื้นที่บ้าน
  const defaultWallTotal = Math.round(currentHouseAreaSqm * 2.8);
  const defaultExtWall = Math.round(defaultWallTotal * 0.4);
  const defaultIntWall = Math.round(defaultWallTotal * 0.6);
  const defaultCeiling = Math.round(currentHouseAreaSqm * 1.05);

  const [exteriorWallSqm, setExteriorWallSqm] = useState<number>(defaultExtWall);
  const [interiorWallSqm, setInteriorWallSqm] = useState<number>(defaultIntWall);
  const [ceilingSqm, setCeilingSqm] = useState<number>(defaultCeiling);

  // งานเหล็ก (กิโลกรัม) นำมาแปลงเป็นพื้นที่ผิว (ตร.ม.)
  const [steelWeightKg, setSteelWeightKg] = useState<number>(1800);
  const [includeSteelPainting, setIncludeSteelPainting] = useState<boolean>(true);

  // เกรดและระบบสี
  const [paintGrade, setPaintGrade] = useState<PaintGrade>('medium_standard');
  const [surfaceCondition, setSurfaceCondition] = useState<PaintSurfaceCondition>('new_plaster');
  const [steelPrimerType, setSteelPrimerType] = useState<SteelPrimerType>('grey_epoxy');

  // คำนวณปริมาณสีและค่าแรง
  const result: PaintCalculationResult = useMemo(() => {
    // 1 ถังใหญ่ (5 แกลลอน = 18.925 ลิตร) ทา 2 เที่ยวได้ประมาณ 75 - 80 ตร.ม. (สีรองพื้น 1 เที่ยวได้ประมาณ 150 ตร.ม.)
    const totalWallAndCeiling = exteriorWallSqm + interiorWallSqm + ceilingSqm;

    // สีรองพื้นปูนใหม่/เก่า (1 เที่ยว)
    const primerCoveragePer5Gal = surfaceCondition === 'new_plaster' ? 150 : 130;
    const primerBuckets5Gal = Math.ceil(totalWallAndCeiling / primerCoveragePer5Gal);

    // สีทับหน้าจริง (ทา 2 เที่ยว)
    const topcoatCoveragePer5Gal = 75;
    const exteriorTopcoatBuckets5Gal = Math.ceil(exteriorWallSqm / topcoatCoveragePer5Gal);
    const interiorTopcoatBuckets5Gal = Math.ceil(interiorWallSqm / topcoatCoveragePer5Gal);
    const ceilingTopcoatBuckets5Gal = Math.ceil(ceilingSqm / topcoatCoveragePer5Gal);

    // ราคาต่อถัง 5 แกลลอน ตามเกรด
    let primerBucketPrice = 1850;
    let extBucketPrice = 2800;
    let intBucketPrice = 2100;
    let ceilBucketPrice = 1950;

    if (paintGrade === 'premium_ultra') {
      primerBucketPrice = 2450;
      extBucketPrice = 3800;
      intBucketPrice = 2900;
      ceilBucketPrice = 2400;
    } else if (paintGrade === 'economy') {
      primerBucketPrice = 1350;
      extBucketPrice = 1950;
      intBucketPrice = 1450;
      ceilBucketPrice = 1350;
    }

    const wallPaintMatCost = 
      (primerBuckets5Gal * primerBucketPrice) +
      (exteriorTopcoatBuckets5Gal * extBucketPrice) +
      (interiorTopcoatBuckets5Gal * intBucketPrice) +
      (ceilingTopcoatBuckets5Gal * ceilBucketPrice);

    // ค่าแรงทาสีอาคาร (ตร.ม. ละ 55-65 บาท)
    const wallPaintLabCost = Math.round(totalWallAndCeiling * (paintGrade === 'premium_ultra' ? 65 : 55));

    // การคำนวณงานเหล็ก: เหล็กรูปพรรณ 1,000 กก. มีพื้นที่ผิวทาสีประมาณ 25 - 30 ตร.ม.
    const steelAreaSqm = Math.round((steelWeightKg / 1000) * 28 * 10) / 10;
    
    // สีกันสนิมเหล็ก 1 แกลลอน (3.785 ลิตร) ทา 1 เที่ยวได้ประมาณ 30-35 ตร.ม. (ทา 2 เที่ยวได้ประมาณ 15-18 ตร.ม.)
    const steelPrimerGallons = Math.ceil((steelAreaSqm * 2) / 32);
    const steelTopcoatGallons = Math.ceil((steelAreaSqm * 2) / 32);
    const thinnerGallons = Math.max(1, Math.ceil((steelPrimerGallons + steelTopcoatGallons) * 0.25));

    const primerPriceGal = steelPrimerType === 'grey_epoxy' ? 650 : steelPrimerType === 'zinc_phosphate' ? 580 : 450;
    const topcoatPriceGal = 680;
    const thinnerPriceGal = 280;

    const steelPaintMaterialCost = includeSteelPainting
      ? (steelPrimerGallons * primerPriceGal) + (steelTopcoatGallons * topcoatPriceGal) + (thinnerGallons * thinnerPriceGal)
      : 0;

    const steelPaintLaborCost = includeSteelPainting
      ? Math.round(steelAreaSqm * 65)
      : 0;

    return {
      interiorWallSqm,
      exteriorWallSqm,
      ceilingSqm,
      steelWeightKg,
      steelAreaSqm,
      primerBuckets5Gal,
      interiorTopcoatBuckets5Gal,
      exteriorTopcoatBuckets5Gal,
      ceilingTopcoatBuckets5Gal,
      steelPrimerGallons,
      steelTopcoatGallons,
      thinnerGallons,
      paintMaterialCost: wallPaintMatCost,
      paintLaborCost: wallPaintLabCost,
      steelPaintMaterialCost,
      steelPaintLaborCost,
      totalCost: wallPaintMatCost + wallPaintLabCost + steelPaintMaterialCost + steelPaintLaborCost
    };
  }, [exteriorWallSqm, interiorWallSqm, ceilingSqm, steelWeightKg, includeSteelPainting, paintGrade, surfaceCondition, steelPrimerType]);

  if (!isOpen) return null;

  const handleApply = () => {
    const timestamp = Date.now();
    const newItems: BOQItem[] = [];

    const gradeLabel = paintGrade === 'premium_ultra' 
      ? 'เกรดพรีเมียม 10-15 ปี (เช็ดล้างได้ สะท้อนความร้อน)' 
      : paintGrade === 'economy' 
      ? 'เกรดมาตรฐานโครงการ 3-5 ปี' 
      : 'เกรดมาตรฐาน มอก. 7-10 ปี';

    // 1. สีทาภายนอกอาคาร
    newItems.push({
      id: `paint-ext-${timestamp}`,
      category: 'finishes',
      name: `งานทาสีผนังภายนอกอาคาร (${gradeLabel})`,
      spec: `พื้นที่ ${exteriorWallSqm} ตร.ม. [รองพื้น 1 เที่ยว + สีจริงอะคริลิกกึ่งเงา 2 เที่ยว ~ สั่งสีจริง ${result.exteriorTopcoatBuckets5Gal} ถัง 5 แกลลอน]`,
      quantity: exteriorWallSqm,
      unit: 'ตร.ม.',
      materialUnitPrice: Math.round((result.exteriorTopcoatBuckets5Gal * 2800) / Math.max(1, exteriorWallSqm)),
      laborUnitPrice: 55,
      wastePercent: 5,
      basePerSqm: exteriorWallSqm / (currentHouseAreaSqm || 120)
    });

    // 2. สีทาภายในอาคาร
    newItems.push({
      id: `paint-int-${timestamp + 1}`,
      category: 'finishes',
      name: `งานทาสีผนังภายในอาคาร (${gradeLabel})`,
      spec: `พื้นที่ ${interiorWallSqm} ตร.ม. [รองพื้น 1 เที่ยว + สีจริงอะคริลิกด้าน/กึ่งเงา 2 เที่ยว ~ สั่งสีจริง ${result.interiorTopcoatBuckets5Gal} ถัง 5 แกลลอน]`,
      quantity: interiorWallSqm,
      unit: 'ตร.ม.',
      materialUnitPrice: Math.round((result.interiorTopcoatBuckets5Gal * 2100) / Math.max(1, interiorWallSqm)),
      laborUnitPrice: 50,
      wastePercent: 5,
      basePerSqm: interiorWallSqm / (currentHouseAreaSqm || 120)
    });

    // 3. สีทาฝ้าเพดาน
    newItems.push({
      id: `paint-ceil-${timestamp + 2}`,
      category: 'finishes',
      name: `งานทาสีฝ้าเพดาน (สูตรลดแสงสะท้อน สำหรับฝ้ายิปซัม)`,
      spec: `พื้นที่ ${ceilingSqm} ตร.ม. [ทาสีจริงสำหรับฝ้า 2 เที่ยว ~ สั่งสีฝ้า ${result.ceilingTopcoatBuckets5Gal} ถัง 5 แกลลอน]`,
      quantity: ceilingSqm,
      unit: 'ตร.ม.',
      materialUnitPrice: Math.round((result.ceilingTopcoatBuckets5Gal * 1950) / Math.max(1, ceilingSqm)),
      laborUnitPrice: 45,
      wastePercent: 5,
      basePerSqm: ceilingSqm / (currentHouseAreaSqm || 120)
    });

    // 4. งานทาสีกันสนิมและทาสีทับหน้าโครงสร้างเหล็ก
    if (includeSteelPainting && result.steelAreaSqm > 0) {
      const steelPrimerName = steelPrimerType === 'grey_epoxy' 
        ? 'สีรองพื้นกันสนิมอีพ็อกซี่ 2K (Epoxy Rust Inhibitive Primer)' 
        : steelPrimerType === 'zinc_phosphate' 
        ? 'สีรองพื้นซิงค์ฟอสเฟต (Zinc Phosphate Primer)' 
        : 'สีรองพื้นแดงกันสนิมเรดออกไซด์ (Red Oxide)';

      newItems.push({
        id: `paint-steel-${timestamp + 3}`,
        category: 'roof',
        name: `งานขัดสนิมและทาสีกันสนิมโครงสร้างเหล็ก 2 เที่ยว (${steelPrimerName})`,
        spec: `สำหรับเหล็กโครงสร้าง ${steelWeightKg.toLocaleString()} กก. (~พื้นที่ผิว ${result.steelAreaSqm} ตร.ม.) สั่งสีรองพื้น ${result.steelPrimerGallons} แกลลอน + สีจริง ${result.steelTopcoatGallons} แกลลอน + ทินเนอร์ ${result.thinnerGallons} แกลลอน`,
        quantity: result.steelAreaSqm,
        unit: 'ตร.ม.',
        materialUnitPrice: Math.round(result.steelPaintMaterialCost / Math.max(1, result.steelAreaSqm)),
        laborUnitPrice: 65,
        wastePercent: 5,
        basePerSqm: result.steelAreaSqm / (currentHouseAreaSqm || 120)
      });
    }

    onApplyToBOQ(newItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-2xl font-bold">format_paint</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                เครื่องคำนวณสีทาอาคารและงานทาสีกันสนิมเหล็กอย่างละเอียด
              </h2>
              <p className="text-xs text-slate-400">
                คำนวณพื้นที่ผิวผนัง ฝ้าเพดาน และแปลงน้ำหนักเหล็กเป็นพื้นที่ผิว พร้อมคำนวณจำนวนถังสี 5 แกลลอน สำหรับสั่งซื้อจริง
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
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Controls Column (6 cols) */}
          <div className="md:col-span-6 flex flex-col gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">tune</span> 1. กำหนดพื้นที่ผิวทาสีอาคาร
            </span>

            {/* เกรดสี */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">เกรดและคุณภาพสีทาอาคาร:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'premium_ultra', label: 'พรีเมียม 15 ปี', sub: 'เช็ดล้าง สะท้อน UV' },
                  { id: 'medium_standard', label: 'มาตรฐาน 7-10 ปี', sub: 'ยอดนิยม มอก.' },
                  { id: 'economy', label: 'ประหยัด 3-5 ปี', sub: 'โครงการ/ปล่อยเช่า' },
                ].map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setPaintGrade(g.id as PaintGrade)}
                    className={`p-2 rounded-lg border text-center transition ${
                      paintGrade === g.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs">{g.label}</div>
                    <div className="text-[9px] opacity-75">{g.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* พื้นที่ผนังภายนอก & ภายใน */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ผนังภายนอก (ตร.ม.)</label>
                <input
                  type="number"
                  min="0"
                  value={exteriorWallSqm}
                  onChange={(e) => setExteriorWallSqm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ผนังภายใน (ตร.ม.)</label>
                <input
                  type="number"
                  min="0"
                  value={interiorWallSqm}
                  onChange={(e) => setInteriorWallSqm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono font-bold"
                />
              </div>
            </div>

            {/* พื้นที่ฝ้าเพดาน */}
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">ฝ้าเพดานยิปซัม/คอนกรีต (ตร.ม.)</label>
              <input
                type="number"
                min="0"
                value={ceilingSqm}
                onChange={(e) => setCeilingSqm(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>

            {/* 🏗️ หมวดงานทาสีเหล็กรูปพรรณและกันสนิม */}
            <div className="pt-3 border-t border-slate-850 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
                  2. งานทาสีกันสนิมโครงสร้างเหล็ก
                </span>
                <input
                  type="checkbox"
                  checked={includeSteelPainting}
                  onChange={(e) => setIncludeSteelPainting(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer rounded"
                />
              </div>

              {includeSteelPainting && (
                <div className="flex flex-col gap-2.5 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">น้ำหนักเหล็กรูปพรรณรวม (กก.):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={steelWeightKg}
                        onChange={(e) => setSteelWeightKg(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-amber-300 font-mono font-bold"
                      />
                      <span className="text-xs text-slate-400 shrink-0 font-mono">
                        ≈ {result.steelAreaSqm} ตร.ม.
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">ชนิดสีกันสนิม:</label>
                    <select
                      value={steelPrimerType}
                      onChange={(e) => setSteelPrimerType(e.target.value as SteelPrimerType)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="grey_epoxy">สีรองพื้นอีพ็อกซี่ 2K สีเทา (เกรดสูงสุด ป้องกันสนิมดีเยี่ยม)</option>
                      <option value="zinc_phosphate">สีรองพื้นซิงค์ฟอสเฟต (ทนทานสูง แห้งไว)</option>
                      <option value="red_oxide">สีรองพื้นแดงกันสนิมเรดออกไซด์ (มาตรฐานทั่วไป)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Takeoff Column (6 cols) */}
          <div className="md:col-span-6 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>สรุปจำนวนถังสำหรับสั่งซื้อจริง (5 Gal & 1 Gal)</span>
              <span className="text-[10px] text-slate-400 font-mono">1 ถังใหญ่ = 18.9 ลิตร</span>
            </span>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5 text-xs">
              
              {/* รองพื้นปูน */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">สีรองพื้นปูนใหม่กันด่าง (1 เที่ยว):</span>
                  <span className="text-[10px] text-slate-400">สำหรับผนังและฝ้าทั้งหมด ({exteriorWallSqm + interiorWallSqm + ceilingSqm} ตร.ม.)</span>
                </div>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {result.primerBuckets5Gal} ถังใหญ่ (5 Gal)
                </span>
              </div>

              {/* สีจริงภายนอก */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">สีทับหน้าภายนอกอะคริลิก (2 เที่ยว):</span>
                  <span className="text-[10px] text-slate-400">พื้นที่ {exteriorWallSqm} ตร.ม.</span>
                </div>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {result.exteriorTopcoatBuckets5Gal} ถังใหญ่ (5 Gal)
                </span>
              </div>

              {/* สีจริงภายใน */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">สีทับหน้าภายในอะคริลิก (2 เที่ยว):</span>
                  <span className="text-[10px] text-slate-400">พื้นที่ {interiorWallSqm} ตร.ม.</span>
                </div>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {result.interiorTopcoatBuckets5Gal} ถังใหญ่ (5 Gal)
                </span>
              </div>

              {/* สีจริงฝ้าเพดาน */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">สีทาฝ้าเพดานสูตรลดแสงสะท้อน:</span>
                  <span className="text-[10px] text-slate-400">พื้นที่ {ceilingSqm} ตร.ม.</span>
                </div>
                <span className="font-mono font-bold text-white text-sm">
                  {result.ceilingTopcoatBuckets5Gal} ถังใหญ่ (5 Gal)
                </span>
              </div>

              {/* สีกันสนิมเหล็ก */}
              {includeSteelPainting && result.steelAreaSqm > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-slate-850 bg-cyan-950/20 px-2 rounded">
                  <div>
                    <span className="font-semibold text-cyan-300 block">สีกันสนิม + สีทับหน้าเหล็ก + ทินเนอร์:</span>
                    <span className="text-[10px] text-slate-400">
                      เหล็ก {steelWeightKg.toLocaleString()} กก. (~{result.steelAreaSqm} ตร.ม.)
                    </span>
                  </div>
                  <div className="text-right font-mono font-bold text-cyan-200">
                    <div>กันสนิม {result.steelPrimerGallons} แกลลอน</div>
                    <div className="text-[10px] text-slate-400">สีจริง {result.steelTopcoatGallons} Gal + ทินเนอร์ {result.thinnerGallons} Gal</div>
                  </div>
                </div>
              )}

              {/* สรุปงบประมาณรวม */}
              <div className="mt-2 p-3 rounded-lg bg-gradient-to-r from-pink-950/40 via-slate-900 to-amber-950/40 border border-amber-500/30 flex justify-between items-center">
                <div>
                  <span className="text-[11px] text-amber-300 font-bold block">งบรวมงานสีและงานเหล็ก</span>
                  <span className="text-[10px] text-slate-400">
                    ค่าวัสดุ ฿{(result.paintMaterialCost + result.steelPaintMaterialCost).toLocaleString()} | ค่าแรงช่าง ฿{(result.paintLaborCost + result.steelPaintLaborCost).toLocaleString()}
                  </span>
                </div>
                <span className="text-base font-black font-mono text-amber-400">
                  ฿{result.totalCost.toLocaleString()}
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
          <p className="text-xs text-slate-400">
            ระบบจะเพิ่มรายการสีภายนอก ภายใน ฝ้าเพดาน และงานสีกันสนิมเหล็กเข้าสู่ตาราง BOQ ทันที
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">add_task</span>
              นำเข้าตาราง BOQ ทันที
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
