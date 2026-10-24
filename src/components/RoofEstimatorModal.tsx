import React, { useState, useMemo } from 'react';
import { RoofStyle, RoofMaterialType, RoofCalculationParams, BOQItem, FasciaType, BirdStopType } from '../types';
import { calculateRoofMaterials } from '../services/calculator';

interface RoofEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToBOQ: (newItems: BOQItem[]) => void;
}

export const RoofEstimatorModal: React.FC<RoofEstimatorModalProps> = ({ isOpen, onClose, onApplyToBOQ }) => {
  const [style, setStyle] = useState<RoofStyle>('gable');
  const [baseWidthM, setBaseWidthM] = useState<number>(8);
  const [baseLengthM, setBaseLengthM] = useState<number>(12);
  const [overhangM, setOverhangM] = useState<number>(1.0);
  const [pitchDeg, setPitchDeg] = useState<number>(30);
  const [materialType, setMaterialType] = useState<RoofMaterialType>('metal_sheet');
  const [purlinSpacingM, setPurlinSpacingM] = useState<number>(1.2);

  // สวิตช์และตัวเลือก เชิงชาย & แผ่นปิดกันนก
  const [includeFascia, setIncludeFascia] = useState<boolean>(true);
  const [fasciaType, setFasciaType] = useState<FasciaType>('fiber_cement_double');
  const [includeBirdStop, setIncludeBirdStop] = useState<boolean>(true);
  const [birdStopType, setBirdStopType] = useState<BirdStopType>('metal_sheet_eaves');

  // ปรับชนิดแผ่นปิดกันนกอัตโนมัติเมื่อเปลี่ยนวัสดุมุง
  const handleMaterialChange = (newMat: RoofMaterialType) => {
    setMaterialType(newMat);
    if (newMat === 'metal_sheet') {
      setBirdStopType('metal_sheet_eaves');
      setPurlinSpacingM(1.2);
    } else if (newMat === 'concrete_tile' || newMat === 'cpac') {
      setBirdStopType('cpac_wave');
      setPurlinSpacingM(0.34);
    }
  };

  const result = useMemo(() => {
    const params: RoofCalculationParams = {
      style,
      baseWidthM,
      baseLengthM,
      overhangM,
      pitchDeg,
      materialType,
      purlinSpacingM,
      includeFascia,
      fasciaType,
      includeBirdStop,
      birdStopType,
    };
    return calculateRoofMaterials(params);
  }, [style, baseWidthM, baseLengthM, overhangM, pitchDeg, materialType, purlinSpacingM, includeFascia, fasciaType, includeBirdStop, birdStopType]);

  if (!isOpen) return null;

  const handleApply = () => {
    const timestamp = Date.now();
    const generatedItems: BOQItem[] = [
      {
        id: `roof-gen-steel-${timestamp}`,
        category: 'roof',
        name: `โครงเหล็กหลังคาจันทัน/อะเส (เหล็กซี) และแป [คำนวณตามองศา ${pitchDeg}°]`,
        spec: `ทรง ${style === 'gable' ? 'หน้าจั่ว' : style === 'hip' ? 'ปั้นหยา' : style === 'lean_to' ? 'เพิงแหงน' : 'ดาดฟ้า'} เหล็กซี ${result.c_channel_bars} ท่อน + เหล็กกล่อง ${result.box_steel_bars} ท่อน + แป ${result.purlin_bars} ท่อน`,
        quantity: result.c_channel_kg + result.box_steel_kg,
        unit: 'กก.',
        materialUnitPrice: 34,
        laborUnitPrice: 15,
        wastePercent: 8,
      },
      {
        id: `roof-gen-sheet-${timestamp + 1}`,
        category: 'roof',
        name: `วัสดุมุงหลังคา (${materialType === 'metal_sheet' ? 'แผ่นเมทัลชีทเคลือบสี บุฉนวน PU' : 'กระเบื้องคอนกรีตลอนคู่/ซีแพคโมเนีย'})`,
        spec: `พื้นที่ผิวเอียง ${result.effectiveRoofAreaSqm} ตร.ม. พร้อมครอบสันจั่ว/ตะเข้สัน ${result.ridgeTilesM} ม.`,
        quantity: result.effectiveRoofAreaSqm,
        unit: 'ตร.ม.',
        materialUnitPrice: materialType === 'metal_sheet' ? 360 : 520,
        laborUnitPrice: materialType === 'metal_sheet' ? 95 : 170,
        wastePercent: 6,
      }
    ];

    // เพิ่มไม้เชิงชาย (ถ้าเลือก)
    if (includeFascia && result.fasciaLengthM > 0) {
      const fasciaLabel = fasciaType === 'fiber_cement_double'
        ? 'ไม้เชิงชายไฟเบอร์ซีเมนต์ 2 ชั้น (หน้า 8" + หน้า 6" ทับซ้อน)'
        : fasciaType === 'fiber_cement_single'
        ? 'ไม้เชิงชายไฟเบอร์ซีเมนต์หน้าเดียว (ขนาด 8 นิ้ว หนา 16 มม.)'
        : fasciaType === 'flashing_metal'
        ? 'แฟลชชิ่งเชิงชายเมทัลชีทพับปิดมุมชายคา สีเดียวกับหลังคา'
        : 'ไม้จริงเนื้อแข็งไสเรียบ 1" x 8" ทาสีย้อมไม้กันปลวก';

      const unitPriceMat = fasciaType === 'fiber_cement_double' ? 165 : fasciaType === 'fiber_cement_single' ? 110 : fasciaType === 'flashing_metal' ? 95 : 320;
      const unitPriceLab = fasciaType === 'fiber_cement_double' ? 85 : fasciaType === 'fiber_cement_single' ? 65 : fasciaType === 'flashing_metal' ? 50 : 130;

      generatedItems.push({
        id: `roof-gen-fascia-${timestamp + 2}`,
        category: 'roof',
        name: fasciaLabel,
        spec: `ความยาวชายคารอบหลังคา ${result.fasciaLengthM} ม. (~ สั่ง ${result.fasciaPieces3m} แผ่น ยาว 3.0ม.) ยึดสกรูเกลียวปล่อยพร้อมโป๊วหัวสกรู`,
        quantity: result.fasciaLengthM,
        unit: 'ม.',
        materialUnitPrice: unitPriceMat,
        laborUnitPrice: unitPriceLab,
        wastePercent: 5,
      });
    }

    // เพิ่มแผ่นปิดกันนก (ถ้าเลือก)
    if (includeBirdStop && result.birdStopLengthM > 0 && birdStopType !== 'none') {
      const birdStopLabel = birdStopType === 'metal_sheet_eaves'
        ? 'แผ่นปิดกันนกปลายลอนเมทัลชีท (Metal Sheet Eaves Filler / โฟม PE เกรดทน UV)'
        : birdStopType === 'cpac_wave'
        ? 'แผ่นปิดกันนกกระเบื้องคอนกรีตลอน/ซีแพคโมเนีย สำเร็จรูป'
        : birdStopType === 'roman_tile'
        ? 'แผ่นปิดกันนกกระเบื้องลอนคู่ (ไฟเบอร์ซีเมนต์/พลาสติก)'
        : 'ตะแกรงสแตนเลส/กัลวาไนซ์ ตาข่ายกันนกใต้เชิงชาย';

      const birdMatPrice = birdStopType === 'metal_sheet_eaves' ? 55 : birdStopType === 'cpac_wave' ? 85 : birdStopType === 'roman_tile' ? 65 : 120;
      const birdLabPrice = birdStopType === 'metal_sheet_eaves' ? 30 : birdStopType === 'cpac_wave' ? 40 : birdStopType === 'roman_tile' ? 35 : 50;

      generatedItems.push({
        id: `roof-gen-birdstop-${timestamp + 3}`,
        category: 'roof',
        name: birdStopLabel,
        spec: `ติดตั้งตามแนวปลายลอนรับน้ำฝน ${result.birdStopLengthM} ม. (${result.birdStopPieces} ชิ้น) ป้องกันนก หนู และสัตว์เลื้อยคลานเข้าใต้ฝ้า`,
        quantity: result.birdStopLengthM,
        unit: 'ม.',
        materialUnitPrice: birdMatPrice,
        laborUnitPrice: birdLabPrice,
        wastePercent: 5,
      });
    }

    onApplyToBOQ(generatedItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-400 text-2xl">roofing</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                เครื่องคิดคำนวณโครงหลังคา มุงกระเบื้อง/เมทัลชีท เชิงชาย & แผ่นปิดกันนก
              </h2>
              <p className="text-xs text-slate-400">
                คำนวณตามรูปทรงหลังคา (เพิงแหงน/จั่ว/ปั้นหยา) ความชันลาดเอียง พร้อมเลือกใส่เชิงชายและแผ่นปิดกันนกตรงตามแบบ
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
          
          {/* Controls Column (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">tune</span> 1. รูปแบบหลังคาและขนาดอาคาร
            </h3>

            {/* ทรงหลังคา */}
            <div>
              <label className="text-xs text-slate-300 block mb-1.5 font-medium">รูปแบบทรงหลังคา (Roof Style)</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'lean_to', label: 'เพิงหมาแหงน', sub: 'ชายน้ำ 1 ด้าน', icon: 'trending_flat' },
                  { id: 'gable', label: 'ทรงจั่ว (Gable)', sub: 'ชายน้ำ 2 ด้าน + จั่ว', icon: 'change_history' },
                  { id: 'hip', label: 'ปั้นหยา (Hip)', sub: 'ชายน้ำรอบ 4 ด้าน', icon: 'diamond' },
                  { id: 'flat_slab', label: 'ดาดฟ้าสแลป', sub: 'ไม่มีชายคา', icon: 'crop_landscape' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setStyle(item.id as RoofStyle)}
                    className={`flex flex-col text-left p-2.5 rounded-xl border transition ${
                      style === item.id 
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">{item.icon}</span>
                      <span className="text-xs">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* กว้าง x ยาว อาคาร */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">ความกว้างตัวบ้าน (ม.)</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  step="0.5"
                  value={baseWidthM}
                  onChange={(e) => setBaseWidthM(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">ความยาวตัวบ้าน (ม.)</label>
                <input
                  type="number"
                  min="2"
                  max="100"
                  step="0.5"
                  value={baseLengthM}
                  onChange={(e) => setBaseLengthM(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* ระยะชายคายื่น & องศาลาดเอียง */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">ระยะยื่นชายคา (ม.)</label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  step="0.1"
                  value={overhangM}
                  onChange={(e) => setOverhangM(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">ปกติ 1.00 - 1.20 ม.</span>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-300">ความชันลาดเอียง</label>
                  <span className="text-xs font-mono text-amber-400 font-bold">{pitchDeg}°</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  value={pitchDeg}
                  onChange={(e) => setPitchDeg(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">เมทัลชีท 5°-15° / กระเบื้อง 25°-35°</span>
              </div>
            </div>

            {/* วัสดุมุง */}
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-medium">ชนิดวัสดุมุง</label>
              <select
                value={materialType}
                onChange={(e) => handleMaterialChange(e.target.value as RoofMaterialType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="metal_sheet">แผ่นเมทัลชีท เคลือบสี + ฉนวน PU Foam (เบา ลาดเอียงต่ำได้)</option>
                <option value="concrete_tile">กระเบื้องคอนกรีตลอนคู่ / ซีแพคโมเนีย (หนัก ต้องใช้เหล็กหนา)</option>
                <option value="cpac">กระเบื้องหลังคาเซรามิก / เพรสทีจแผ่นเรียบ</option>
                <option value="shingle">ยางมะตอย / แอสฟัลต์ชิงเกิ้ลบอร์ด</option>
              </select>
            </div>

            {/* 🌟 2. ตัวเลือกเฉพาะ: ไม้เชิงชาย & แผ่นปิดกันนก (Fascia & Bird Stop) 🌟 */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">view_timeline</span> 2. เชิงชายและแผ่นปิดกันนก (ตามแบบ)
              </span>

              {/* สวิตช์เปิด/ปิด ไม้เชิงชาย */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-amber-400">view_sidebar</span>
                    <span className="text-xs font-bold text-slate-200">ติดตั้งไม้เชิงชาย (Fascia Board)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeFascia}
                    onChange={(e) => setIncludeFascia(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 cursor-pointer rounded"
                  />
                </div>
                {includeFascia && (
                  <div className="pt-1.5 border-t border-slate-850 flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400">รูปแบบไม้เชิงชาย:</label>
                    <select
                      value={fasciaType}
                      onChange={(e) => setFasciaType(e.target.value as FasciaType)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="fiber_cement_double">ไม้เชิงชายไฟเบอร์ซีเมนต์ 2 ชั้น (8" + 6" สวย มิติคม)</option>
                      <option value="fiber_cement_single">ไม้เชิงชายไฟเบอร์ซีเมนต์หน้าเดียว (ขนาด 8 นิ้ว)</option>
                      <option value="flashing_metal">แฟลชชิ่งเชิงชายเมทัลชีทพับปิดมุม (โมเดิร์น ไร้รอยต่อ)</option>
                      <option value="natural_wood">ไม้จริงเนื้อแข็ง 1"x8" ทาสีย้อมไม้ (บ้านทรงไทย/คลาสสิก)</option>
                    </select>
                    <span className="text-[10px] text-slate-500">
                      แนวความยาวรอบชายคา: <strong>{result.eavesPerimeterM} ม.</strong> (~{result.fasciaPieces3m} แผ่น)
                    </span>
                  </div>
                )}
              </div>

              {/* สวิตช์เปิด/ปิด แผ่นปิดกันนก */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-cyan-400">pest_control</span>
                    <span className="text-xs font-bold text-slate-200">ติดตั้งแผ่นปิดกันนก (Bird Stop Eaves)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeBirdStop}
                    onChange={(e) => setIncludeBirdStop(e.target.checked)}
                    className="w-4 h-4 accent-cyan-400 cursor-pointer rounded"
                  />
                </div>
                {includeBirdStop && (
                  <div className="pt-1.5 border-t border-slate-850 flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400">ชนิดแผ่นปิดกันนกตามลอนหลังคา:</label>
                    <select
                      value={birdStopType}
                      onChange={(e) => setBirdStopType(e.target.value as BirdStopType)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="metal_sheet_eaves">แผ่นปิดกันนกปลายลอนเมทัลชีท (Foam PE / โลหะฉลุ)</option>
                      <option value="cpac_wave">แผ่นปิดกันนกกระเบื้องซีแพคโมเนีย/คอนกรีตลอน</option>
                      <option value="roman_tile">แผ่นปิดกันนกกระเบื้องลอนคู่ (ไฟเบอร์ซีเมนต์)</option>
                      <option value="custom_mesh">ตะแกรงลวดสแตนเลส/กัลวาไนซ์ ตาข่ายกันนก</option>
                      <option value="none">ไม่ใส่ (ปล่อยโล่ง)</option>
                    </select>
                    <span className="text-[10px] text-slate-500">
                      แนวชายน้ำหยดที่ต้องปิดกันนก: <strong>{result.birdStopLengthM} ม.</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Result Calculation Column (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            
            {/* Top Stat Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[10px] text-slate-400 block mb-0.5">พื้นที่ผิวหลังคา</span>
                <span className="text-lg font-bold font-mono text-amber-400">{result.effectiveRoofAreaSqm}</span>
                <span className="text-[11px] text-slate-500 ml-1">ตร.ม.</span>
              </div>
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[10px] text-slate-400 block mb-0.5">เหล็กรูปพรรณรวม</span>
                <span className="text-lg font-bold font-mono text-cyan-400">{(result.c_channel_kg + result.box_steel_kg).toLocaleString()}</span>
                <span className="text-[11px] text-slate-500 ml-1">กก.</span>
              </div>
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[10px] text-slate-400 block mb-0.5">ความยาวเชิงชาย</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {includeFascia ? `${result.fasciaLengthM} ม.` : 'ไม่เลือก'}
                </span>
                <span className="text-[10px] text-slate-500 block">({result.fasciaPieces3m} แผ่น)</span>
              </div>
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[10px] text-slate-400 block mb-0.5">ความยาวปิดกันนก</span>
                <span className="text-lg font-bold font-mono text-amber-300">
                  {includeBirdStop && birdStopType !== 'none' ? `${result.birdStopLengthM} ม.` : 'ไม่เลือก'}
                </span>
                <span className="text-[10px] text-slate-500 block">({result.birdStopPieces} ชิ้น)</span>
              </div>
            </div>

            {/* Detailed Bill of Quantity for Roof */}
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col">
              <div className="px-4 py-2.5 bg-slate-850/80 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200">
                  รายละเอียดการถอดวัสดุโครงสร้างหลังคา เชิงชาย และกันนก
                </span>
                <span className="text-[10px] font-mono text-slate-400">คิดตามมิติแบบ {style}</span>
              </div>

              <div className="p-4 flex flex-col gap-2.5 text-xs overflow-y-auto max-h-[380px]">
                
                {/* 1. โครงเหล็กจันทัน & อะเส */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span className="text-slate-300 font-medium">เหล็กตัวซี C100x50x20 (จันทัน & อะเส):</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white mr-1">{result.c_channel_kg.toLocaleString()} กก.</span>
                    <span className="text-slate-400 font-mono text-[11px]">({result.c_channel_bars} ท่อน @ 6ม.)</span>
                  </div>
                </div>

                {/* 2. เหล็กกล่องอกไก่ ขื่อ ดั้ง */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span className="text-slate-300 font-medium">เหล็กกล่อง 100x50 หรือ 4"x2" (ดั้ง ขื่อ อกไก่ ตะเข้สัน):</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white mr-1">{result.box_steel_kg.toLocaleString()} กก.</span>
                    <span className="text-slate-400 font-mono text-[11px]">({result.box_steel_bars} ท่อน @ 6ม.)</span>
                  </div>
                </div>

                {/* 3. แปหลังคา */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span className="text-slate-300 font-medium">แปกัลวาไนซ์ / แปโอเมก้า (ระยะห่าง {purlinSpacingM} ม.):</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-300">{result.purlin_bars} ท่อน (ยาว 6ม.)</span>
                  </div>
                </div>

                {/* 4. แผ่นมุงหลังคา */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-slate-300 font-medium">แผ่นมุงหลังคา + ครอบสันจั่ว/แฟลชชิ่ง:</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-300">
                      {materialType === 'concrete_tile' || materialType === 'cpac'
                        ? `${result.roofSheetsCount.toLocaleString()} แผ่น (ครอบ ${result.ridgeTilesM} ม.)`
                        : `${result.roofSheetsCount} ตร.ม. (ครอบ ${result.ridgeTilesM} ม.)`}
                    </span>
                  </div>
                </div>

                {/* 🌟 5. ไม้เชิงชาย 🌟 */}
                <div className={`p-2.5 rounded-lg border flex justify-between items-center ${
                  includeFascia 
                    ? 'bg-amber-950/20 border-amber-500/30' 
                    : 'bg-slate-900/50 border-slate-800 opacity-60'
                }`}>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${includeFascia ? 'bg-amber-400' : 'bg-slate-600'}`}></span>
                      ไม้เชิงชาย ({includeFascia ? (fasciaType === 'fiber_cement_double' ? '2 ชั้น 8"+6"' : fasciaType === 'fiber_cement_single' ? 'ชั้นเดียว 8"' : fasciaType === 'flashing_metal' ? 'แฟลชชิ่งเมทัลชีท' : 'ไม้จริง') : 'ไม่ได้เลือก'}):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {includeFascia ? `ยาวรอบชายคา ${result.fasciaLengthM} ม. (ใช้แผ่น 3.0ม. ประมาณ ${result.fasciaPieces3m} แผ่น) พร้อมโป๊วทาสี` : 'ไม่รวมงานเชิงชาย'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-300">
                      {includeFascia ? `฿${(result.fasciaMaterialCost + result.fasciaLaborCost).toLocaleString()}` : '-'}
                    </span>
                    {includeFascia && (
                      <span className="text-[10px] text-slate-400 block font-mono">
                        (ของ ฿{result.fasciaMaterialCost.toLocaleString()} | แรง ฿{result.fasciaLaborCost.toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>

                {/* 🌟 6. แผ่นปิดกันนก 🌟 */}
                <div className={`p-2.5 rounded-lg border flex justify-between items-center ${
                  includeBirdStop && birdStopType !== 'none'
                    ? 'bg-cyan-950/20 border-cyan-500/30' 
                    : 'bg-slate-900/50 border-slate-800 opacity-60'
                }`}>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${includeBirdStop && birdStopType !== 'none' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                      แผ่นปิดกันนก ({includeBirdStop && birdStopType !== 'none' ? (birdStopType === 'metal_sheet_eaves' ? 'ปิดปลายลอนเมทัลชีท' : birdStopType === 'cpac_wave' ? 'กันนกซีแพคโมเนีย' : birdStopType === 'roman_tile' ? 'กันนกลอนคู่' : 'ตะแกรงกันนก') : 'ไม่ได้เลือก'}):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {includeBirdStop && birdStopType !== 'none' ? `ติดตั้งตามแนวปลายลอนลาดน้ำ ${result.birdStopLengthM} ม. (${result.birdStopPieces} ชิ้น) ป้องกันสัตว์เข้าใต้ฝ้า` : 'ไม่รวมแผ่นปิดกันนก'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-cyan-300">
                      {includeBirdStop && birdStopType !== 'none' ? `฿${(result.birdStopMaterialCost + result.birdStopLaborCost).toLocaleString()}` : '-'}
                    </span>
                    {includeBirdStop && birdStopType !== 'none' && (
                      <span className="text-[10px] text-slate-400 block font-mono">
                        (ของ ฿{result.birdStopMaterialCost.toLocaleString()} | แรง ฿{result.birdStopLaborCost.toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>

                {/* สรุปค่าของ & ค่าแรงงานรวมทั้งหมด */}
                <div className="mt-2 p-3 bg-gradient-to-r from-amber-500/10 via-slate-900 to-cyan-500/10 rounded-lg border border-amber-500/30 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-amber-300 font-bold block">
                      งบประมาณรวมหมวดหลังคา (โครงเหล็ก + มุง + เชิงชาย + ปิดกันนก)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ค่าวัสดุ ~ ฿{result.materialEstimateThb.toLocaleString()} | ค่าแรงช่าง ~ ฿{result.laborEstimateThb.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-lg font-black font-mono text-amber-400">
                    ฿{(result.materialEstimateThb + result.laborEstimateThb).toLocaleString()}
                  </span>
                </div>

              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center">
          <p className="text-xs text-slate-400">
            คำนวณระยะแนวชายคาและปลายลอนตามรูปทรงหลังคาจริง ป้องกันการสั่งวัสดุตกหล่นหน้างาน
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
              เพิ่มเข้างวดงาน BOQ ทันที
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
