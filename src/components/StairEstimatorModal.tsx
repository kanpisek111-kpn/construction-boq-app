import React, { useState, useMemo } from 'react';
import { StairCalcParams, StairType, StairNosingFinish, BOQItem } from '../types';
import { calculateStairMaterials } from '../services/calculator';

interface StairEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToBOQ: (newItems: BOQItem[]) => void;
  currentHouseAreaSqm: number;
}

const safeNum = (val: number | undefined | null): number => {
  if (val === undefined || val === null || isNaN(val)) return 0;
  return val;
};

const safeToLocaleString = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString();
};

export const StairEstimatorModal: React.FC<StairEstimatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToBOQ,
  currentHouseAreaSqm = 120
}) => {
  const [stairCount, setStairCount] = useState<number>(1);
  const [stairType, setStairType] = useState<StairType>('dog_leg');
  const [totalHeightM, setTotalHeightM] = useState<number>(3.20);
  const [widthM, setWidthM] = useState<number>(1.00);
  const [riserHeightCm, setRiserHeightCm] = useState<number>(17.5);
  const [treadWidthCm, setTreadWidthCm] = useState<number>(26.0);
  const [landingCount, setLandingCount] = useState<number>(1);
  const [landingLengthM, setLandingLengthM] = useState<number>(1.00);
  const [waistThicknessCm, setWaistThicknessCm] = useState<number>(12.0);
  const [includeHandrail, setIncludeHandrail] = useState<boolean>(true);
  const [handrailType, setHandrailType] = useState<'steel_wood' | 'stainless_glass' | 'wrought_iron' | 'steel_pipe'>('steel_wood');
  const [finishType, setFinishType] = useState<StairNosingFinish>('wood_solid');

  const result = useMemo(() => {
    const params: StairCalcParams = {
      stairCount,
      stairType,
      totalHeightM,
      widthM,
      riserHeightCm,
      treadWidthCm,
      landingCount: stairType === 'straight' ? 0 : landingCount,
      landingLengthM,
      waistThicknessCm,
      includeHandrail,
      handrailType,
      finishType
    };
    return calculateStairMaterials(params);
  }, [stairCount, stairType, totalHeightM, widthM, riserHeightCm, treadWidthCm, landingCount, landingLengthM, waistThicknessCm, includeHandrail, handrailType, finishType]);

  if (!isOpen) return null;

  // กฎทองความสบายในการเดินขึ้นลง: 2R + T = 60 - 64 ซม.
  const actualRiser = safeNum(result?.actualRiserCm) || 17.5;
  const comfortFormulaVal = Math.round((2 * actualRiser + treadWidthCm) * 10) / 10;
  const isComfortable = comfortFormulaVal >= 60 && comfortFormulaVal <= 64;
  const totalCost = safeNum(result?.estTotalMaterialCost) + safeNum(result?.estTotalLaborCost);

  const handleApply = () => {
    const timestamp = Date.now();
    const newItems: BOQItem[] = [];

    const stepCount = safeNum(result?.stepCount);
    const actualRiserCm = safeNum(result?.actualRiserCm);
    const concreteVolCuM = safeNum(result?.concreteVolCuM);
    const formworkSqm = safeNum(result?.formworkSqm);
    const mainSteelDb12Bars = safeNum(result?.mainSteelDb12Bars);
    const mainSteelDb12Kg = safeNum(result?.mainSteelDb12Kg);
    const tempSteelRb9Bars = safeNum(result?.tempSteelRb9Bars);
    const tempSteelRb9Kg = safeNum(result?.tempSteelRb9Kg);
    const handrailLengthM = safeNum(result?.handrailLengthM);
    const treadStepPieces = safeNum(result?.treadStepPieces);

    const stairTypeName = stairType === 'dog_leg' 
      ? 'บันได คสล. หักฉากพับผ้า (Dog-Leg) พร้อมชานพัก' 
      : stairType === 'u_turn' 
      ? 'บันได คสล. พับ 180° รูปตัว U' 
      : 'บันได คสล. ช่วงเดียวทอดยาว (Straight)';

    // 1. คอนกรีตหล่อบันได คสล.
    newItems.push({
      id: `stair-conc-${timestamp}`,
      category: 'structure',
      name: `คอนกรีตผสมเสร็จ 240 ksc งานหล่อบันได คสล. (${stairTypeName})`,
      spec: `ความสูง ${totalHeightM} ม. กว้าง ${widthM} ม. จำนวน ${stepCount} ขั้น (ลูกตั้ง ${actualRiserCm} ซม. ลูกนอน ${treadWidthCm} ซม.) ท้องหนา ${waistThicknessCm} ซม. ปริมาตรรวม ${concreteVolCuM} คิว`,
      quantity: concreteVolCuM,
      unit: 'ลบ.ม.',
      materialUnitPrice: 2150,
      laborUnitPrice: 450,
      wastePercent: 0,
      basePerSqm: concreteVolCuM / (currentHouseAreaSqm || 120)
    });

    // 2. ไม้แบบหล่อท้องบันได ลูกตั้ง และข้างขั้น
    newItems.push({
      id: `stair-form-${timestamp + 1}`,
      category: 'structure',
      name: 'ไม้แบบหล่อท้องบันไดเอียง ท้องชานพัก และไม้กั้นลูกตั้ง ค้ำยัน',
      spec: `พื้นที่ผิวไม้แบบสัมผัสคอนกรีต ${formworkSqm} ตร.ม. (หักหมุนเวียนใช้งาน)`,
      quantity: formworkSqm,
      unit: 'ตร.ม.',
      materialUnitPrice: 240,
      laborUnitPrice: 130,
      wastePercent: 5,
      basePerSqm: formworkSqm / (currentHouseAreaSqm || 120)
    });

    // 3. เหล็กเสริมหลัก DB12 ท้องบันได
    if (mainSteelDb12Kg > 0) {
      newItems.push({
        id: `stair-db12-${timestamp + 2}`,
        category: 'structure',
        name: 'เหล็กข้ออ้อย DB12 SD40 เสริมหลักท้องบันไดและชานพัก คสล. (2 ชั้น)',
        spec: `เหล็กเสริมรับแรงดัดตลอดแนวพาด ${mainSteelDb12Bars} เส้น (${mainSteelDb12Kg} กก.) พร้อมดัดฝังคานชั้นล่างและชั้นบน`,
        quantity: mainSteelDb12Kg,
        unit: 'กก.',
        materialUnitPrice: 28,
        laborUnitPrice: 6.5,
        wastePercent: 5,
        basePerSqm: mainSteelDb12Kg / (currentHouseAreaSqm || 120)
      });
    }

    // 4. เหล็กเสริมอุณหภูมิและเสริมขั้น RB9
    if (tempSteelRb9Kg > 0) {
      newItems.push({
        id: `stair-rb9-${timestamp + 3}`,
        category: 'structure',
        name: 'เหล็กกลม RB9 SR24 เสริมกระจายอุณหภูมิท้องบันไดและเสริมจมูกขั้น',
        spec: `เหล็กเสริมตามขวาง @ 0.20 ม. รวม ${tempSteelRb9Bars} เส้น (${tempSteelRb9Kg} กก.)`,
        quantity: tempSteelRb9Kg,
        unit: 'กก.',
        materialUnitPrice: 29,
        laborUnitPrice: 7.5,
        wastePercent: 5,
        basePerSqm: tempSteelRb9Kg / (currentHouseAreaSqm || 120)
      });
    }

    // 5. ราวบันไดและลูกกรง
    if (includeHandrail && handrailLengthM > 0) {
      const handrailLabel = handrailType === 'steel_wood'
        ? 'ราวบันไดเหล็กกล่องอบสีดำด้าน + ราวจับไม้จริงเนื้อแข็งไสเรียบ'
        : handrailType === 'stainless_glass'
        ? 'ราวบันไดสแตนเลส 304 พร้อมแผงกระจกนิรภัย Tempered 10 มม.'
        : handrailType === 'wrought_iron'
        ? 'ราวบันไดเหล็กดัดอิตาลี (Wrought Iron) คลาสสิก'
        : 'ราวบันไดโครงเหล็กกล่องพ่นสีอุตสาหกรรม (โมเดิร์น ลอฟท์)';

      const handPricePerM = handrailType === 'stainless_glass' ? 3200 : handrailType === 'steel_wood' ? 1850 : handrailType === 'wrought_iron' ? 2400 : 1100;

      newItems.push({
        id: `stair-handrail-${timestamp + 4}`,
        category: 'decorations',
        name: handrailLabel,
        spec: `ความยาวราวจับตามแนวลาดบันได ${handrailLengthM} ม. พร้อมเสาตั้ง ลูกกรง และจุดยึดพุกสแตนเลส`,
        quantity: handrailLengthM,
        unit: 'ม.',
        materialUnitPrice: Math.round(handPricePerM * 0.75),
        laborUnitPrice: Math.round(handPricePerM * 0.25),
        wastePercent: 0,
        basePerSqm: handrailLengthM / (currentHouseAreaSqm || 120)
      });
    }

    // 6. วัสดุปิดผิวขั้นนอนและจมูกบันได
    const finishLabel = finishType === 'wood_solid'
      ? 'งานกรุปิดผิวลูกนอนไม้จริง (ไม้เต็ง/ไม้แดงประสาน) พร้อมเซาะร่องกันลื่น'
      : finishType === 'spc_vinyl'
      ? 'งานกรุปิดผิวลูกนอน SPC ลายไม้หนา 5.5 มม. พร้อมจมูกบันไดสำเร็จรูป'
      : finishType === 'granito_tile'
      ? 'งานปูกระเบื้องแกรนิตโต้ขั้นบันได พร้อมจมูกบันไดอลูมิเนียม/พีวีซี'
      : 'งานขัดมันคอนกรีตเปลือย (Loft Polished Concrete) เคลือบน้ำยาเงา';

    const finishPricePerUnit = finishType === 'wood_solid' ? 650 : finishType === 'spc_vinyl' ? 380 : finishType === 'granito_tile' ? 450 : 180;

    newItems.push({
      id: `stair-finish-${timestamp + 5}`,
      category: 'finishes',
      name: finishLabel,
      spec: `สำหรับลูกนอน ${treadStepPieces} ขั้น (หน้ากว้าง ${treadWidthCm} ซม. ยาว ${widthM} ม.) รวมกาวตะปูและบัวซับข้าง`,
      quantity: treadStepPieces,
      unit: 'ขั้น',
      materialUnitPrice: finishPricePerUnit,
      laborUnitPrice: 200,
      wastePercent: 0,
      basePerSqm: treadStepPieces / (currentHouseAreaSqm || 120)
    });

    onApplyToBOQ(newItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-2xl font-bold">stairs</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>ระบบคำนวณบันได คสล. (RC Stair Takeoff)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  {safeNum(result?.stepCount)} ขั้น (ลูกตั้ง {safeNum(result?.actualRiserCm)} ซม.)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                คำนวณปริมาตรคอนกรีต ไม้แบบ เหล็กเสริม DB12/RB9 ราวบันได และวัสดุปิดผิวขั้นนอนตามกฎกระทรวง
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
          <div className="md:col-span-6 flex flex-col gap-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">tune</span> 1. รูปทรงและขนาดมิติบันได
            </span>

            {/* ชนิดบันได */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">รูปแบบบันได (Stair Type):</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'dog_leg', label: 'หักฉากพับผ้า', sub: 'มีชานพัก (ยอดนิยม)', icon: 'turn_right' },
                  { id: 'straight', label: 'บันไดตรง', sub: 'ช่วงเดียวยาวตลอด', icon: 'north' },
                  { id: 'u_turn', label: 'หักกลับ U-Turn', sub: 'บันไดคู่พับ 180°', icon: 'u_turn_left' },
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStairType(st.id as StairType)}
                    className={`p-2 rounded-xl border text-center transition ${
                      stairType === st.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-sm">{st.icon}</span>
                      <span className="text-xs">{st.label}</span>
                    </div>
                    <div className="text-[9px] opacity-75 mt-0.5">{st.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ความสูงชั้น และความกว้างบันได */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ความสูงชั้น Floor to Floor (ม.)</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.50"
                  max="6.00"
                  value={totalHeightM}
                  onChange={(e) => setTotalHeightM(parseFloat(e.target.value) || 3.0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-400 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">ปกติ 3.00 - 3.40 ม.</span>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ความกว้างบันได (ม.)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.80"
                  max="3.00"
                  value={widthM}
                  onChange={(e) => setWidthM(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">กฎหมาย: ไม่น้อยกว่า 0.90 ม.</span>
              </div>
            </div>

            {/* ลูกตั้ง & ลูกนอน */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">เป้าหมายลูกตั้ง Riser (ซม.)</label>
                <input
                  type="number"
                  step="0.5"
                  min="14"
                  max="22"
                  value={riserHeightCm}
                  onChange={(e) => setRiserHeightCm(parseFloat(e.target.value) || 17.5)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">กฎหมาย: ไม่เกิน 20 ซม.</span>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ลูกนอน Tread (ซม.)</label>
                <input
                  type="number"
                  step="0.5"
                  min="22"
                  max="35"
                  value={treadWidthCm}
                  onChange={(e) => setTreadWidthCm(parseFloat(e.target.value) || 26.0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">กฎหมาย: ไม่น้อยกว่า 22 ซม.</span>
              </div>
            </div>

            {/* ความหนาท้องบันได & ชานพัก */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ความหนาท้องบันได คสล. (ซม.)</label>
                <input
                  type="number"
                  step="1"
                  min="10"
                  max="25"
                  value={waistThicknessCm}
                  onChange={(e) => setWaistThicknessCm(parseFloat(e.target.value) || 12)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">ปกติ 12 - 15 ซม.</span>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ความยาวชานพัก Landing (ม.)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.8"
                  max="2.5"
                  disabled={stairType === 'straight'}
                  value={landingLengthM}
                  onChange={(e) => setLandingLengthM(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-slate-900 disabled:opacity-40 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">ความกว้างชานพักขั้นต่ำ 0.90 ม.</span>
              </div>
            </div>

            {/* ราวบันได & ผิวปิดขั้น */}
            <div className="pt-2 border-t border-slate-850 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-amber-400">handyman</span>
                  2. ราวบันไดและผิวปิดขั้นนอน
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">ติดราวบันได:</span>
                  <input
                    type="checkbox"
                    checked={includeHandrail}
                    onChange={(e) => setIncludeHandrail(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 cursor-pointer rounded"
                  />
                </div>
              </div>

              {includeHandrail && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">รูปแบบราวบันได (Handrail):</label>
                  <select
                    value={handrailType}
                    onChange={(e) => setHandrailType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value="steel_wood">โครงเหล็กกล่องสีดำด้าน + ราวจับไม้จริงเนื้อแข็ง (ยอดนิยม)</option>
                    <option value="stainless_glass">สแตนเลส 304 + แผงกระจกนิรภัย Tempered (Modern Luxury)</option>
                    <option value="wrought_iron">ราวบันไดเหล็กดัดอิตาลี วินเทจ (Wrought Iron)</option>
                    <option value="steel_pipe">ราวเหล็กแป๊บโปร่งสีดำลอฟท์ (Minimal Industrial)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">วัสดุปิดผิวขั้นนอน (Tread Nosing):</label>
                <select
                  value={finishType}
                  onChange={(e) => setFinishType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="wood_solid">ลูกนอนไม้จริง / ไม้แดงประสาน FJL เซาะร่องกันลื่น</option>
                  <option value="spc_vinyl">แผ่นบันได SPC ลายไม้หนา 5.5 มม. จมูกบันไดสำเร็จรูป</option>
                  <option value="granito_tile">กระเบื้องแกรนิตโต้ปูขั้นบันได พร้อมจมูกอลูมิเนียม</option>
                  <option value="polished_concrete">ขัดมันคอนกรีตเปลือย ขัดหยาบกันลื่น (Loft)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Column (6 cols) */}
          <div className="md:col-span-6 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>ผลลัพธ์การถอดแบบบันได คสล.</span>
              <span className="text-[10px] font-mono text-cyan-400">คำนวณตามมาตรฐานวิศวกรรม</span>
            </span>

            {/* Formula check badge */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isComfortable
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">
                  {isComfortable ? 'check_circle' : 'info'}
                </span>
                <div>
                  <div className="font-bold">สูตรความสบาย: 2R + T = {comfortFormulaVal} ซม.</div>
                  <div className="text-[10px] opacity-80">
                    {isComfortable ? 'อยู่ในเกณฑ์เดินสบายยอดเยี่ยม (60-64 ซม.)' : 'ลูกตั้งหรือลูกนอนอาจชันเกินไปเล็กน้อย'}
                  </div>
                </div>
              </div>
              <span className="font-mono font-bold text-sm">
                {safeNum(result?.stepCount)} ขั้น
              </span>
            </div>

            {/* Detailed Takeoff List */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5 text-xs">
              
              {/* คอนกรีต */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">คอนกรีต 240 ksc (ลูกบันได + ท้อง + ชานพัก):</span>
                  <span className="text-[10px] text-slate-400">ปริมาตรเนื้อปูนรวมเผื่อ 5%</span>
                </div>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {safeNum(result?.concreteVolCuM)} ลบ.ม. (คิว)
                </span>
              </div>

              {/* ไม้แบบ */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">ไม้แบบหล่อท้องบันได ข้างขั้น และลูกตั้ง:</span>
                  <span className="text-[10px] text-slate-400">พื้นที่ผิวสัมผัสไม้แบบ</span>
                </div>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {safeNum(result?.formworkSqm)} ตร.ม.
                </span>
              </div>

              {/* เหล็ก DB12 */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">เหล็กข้ออ้อย DB12 (เหล็กหลักรับแรงดัด 2 ชั้น):</span>
                  <span className="text-[10px] text-slate-400">เหล็กตามยาวท้องบันไดและชานพัก</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-amber-300 text-sm">{safeNum(result?.mainSteelDb12Bars)} เส้น</span>
                  <span className="text-[10px] text-slate-400 font-mono block">({safeToLocaleString(result?.mainSteelDb12Kg)} กก.)</span>
                </div>
              </div>

              {/* เหล็ก RB9 */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">เหล็กกลม RB9 (เสริมตามขวาง & จมูกขั้น):</span>
                  <span className="text-[10px] text-slate-400">เหล็กเสริมอุณหภูมิ @ 0.20 ม.</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-300 text-sm">{safeNum(result?.tempSteelRb9Bars)} เส้น</span>
                  <span className="text-[10px] text-slate-400 font-mono block">({safeToLocaleString(result?.tempSteelRb9Kg)} กก.)</span>
                </div>
              </div>

              {/* ราวบันได */}
              {includeHandrail && (
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <div>
                    <span className="font-semibold text-white block">ราวบันไดและลูกกรง:</span>
                    <span className="text-[10px] text-slate-400">ความยาวตลอดแนวลาดชัน</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {safeNum(result?.handrailLengthM)} เมตร
                  </span>
                </div>
              )}

              {/* วัสดุปิดผิวลูกนอน */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">วัสดุปิดผิวขั้นนอน (Tread Steps):</span>
                  <span className="text-[10px] text-slate-400">จำนวนขั้นนอนที่ต้องปู</span>
                </div>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {safeNum(result?.treadStepPieces)} แผ่น/ขั้น
                </span>
              </div>

              {/* สรุปงบประมาณรวม */}
              <div className="mt-2 p-3 rounded-lg bg-gradient-to-r from-cyan-950/50 via-slate-900 to-amber-950/50 border border-cyan-500/30 flex justify-between items-center">
                <div>
                  <span className="text-[11px] text-cyan-300 font-bold block">งบรวมบันได คสล. ทั้งชุด</span>
                  <span className="text-[10px] text-slate-400">
                    ค่าวัสดุ ฿{safeToLocaleString(result?.estTotalMaterialCost)} | ค่าแรงช่าง ฿{safeToLocaleString(result?.estTotalLaborCost)}
                  </span>
                </div>
                <span className="text-base font-black font-mono text-amber-400">
                  ฿{safeToLocaleString(totalCost)}
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
          <p className="text-xs text-slate-400">
            ระบบจะเพิ่มรายการคอนกรีต ไม้แบบ เหล็กเสริม DB12/RB9 ราวบันได และวัสดุปิดผิวขั้นนอนลงในหมวดโครงสร้างและตกแต่งทันที
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">add_task</span>
              เพิ่มเข้างวดงาน BOQ ทันที
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
