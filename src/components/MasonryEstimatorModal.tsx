import React, { useState, useMemo } from 'react';
import { WallMasonryType, MasonryCalcParams, BOQItem } from '../types';
import { calculateMasonryMaterials } from '../services/calculator';

interface MasonryEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToBOQ: (newItems: BOQItem[]) => void;
  currentHouseAreaSqm: number;
}

export const MasonryEstimatorModal: React.FC<MasonryEstimatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToBOQ,
  currentHouseAreaSqm
}) => {
  // ค่าเริ่มต้นพื้นที่ผนังประมาณ 1.75 เท่าของพื้นที่บ้าน
  const defaultWallArea = Math.round(currentHouseAreaSqm * 1.75);

  const [brickType, setBrickType] = useState<WallMasonryType>('red_brick');
  const [wallAreaSqm, setWallAreaSqm] = useState<number>(defaultWallArea || 210);
  const [openingsCount, setOpeningsCount] = useState<number>(12); // ช่องประตู+หน้าต่างรวม
  const [avgOpeningWidthM, setAvgOpeningWidthM] = useState<number>(1.2);
  const [wallThicknessCm, setWallThicknessCm] = useState<number>(7.5);
  const [plasterSides, setPlasterSides] = useState<1 | 2>(2);

  const result = useMemo(() => {
    const params: MasonryCalcParams = {
      brickType,
      wallAreaSqm,
      openingsCount,
      avgOpeningWidthM,
      wallThicknessCm,
      plasterSides
    };
    return calculateMasonryMaterials(params);
  }, [brickType, wallAreaSqm, openingsCount, avgOpeningWidthM, wallThicknessCm, plasterSides]);

  if (!isOpen) return null;

  const handleApply = () => {
    const timestamp = Date.now();
    const newItems: BOQItem[] = [];

    const brickName = brickType === 'red_brick' 
      ? 'งานก่อผนังอิฐมอญ/อิฐแดง 2 รู แข็งแรงทนทาน' 
      : brickType === 'concrete_block' 
      ? 'งานก่อผนังคอนกรีตบล็อก (อิฐบล็อก 7 ซม.)' 
      : 'งานก่อผนังอิฐมวลเบา หนา 7.5 ซม. กันความร้อน';

    const brickSpec = brickType === 'red_brick'
      ? `ใช้อิฐแดง ~${result.brickCount.toLocaleString()} ก้อน + ปูนก่อผสมทราย ${result.mortarBags50kg} ถุง ทราย ${result.masonrySandCuM} คิว`
      : brickType === 'concrete_block'
      ? `ใช้อิฐบล็อก ~${result.brickCount.toLocaleString()} ก้อน + ปูนก่อ ${result.mortarBags50kg} ถุง`
      : `ใช้อิฐมวลเบา ~${result.brickCount.toLocaleString()} ก้อน + ปูนกาวมวลเบา ${result.mortarBags50kg} ถุง`;

    // 1. งานก่ออิฐ
    newItems.push({
      id: `wall-brick-${timestamp}`,
      category: 'masonry_wall',
      name: brickName,
      spec: brickSpec,
      quantity: wallAreaSqm,
      unit: 'ตร.ม.',
      materialUnitPrice: Math.round(
        (brickType === 'red_brick' ? (135 * 1.35) + 45 : brickType === 'concrete_block' ? (13.2 * 7.5) + 35 : (8.8 * 24) + 25)
      ),
      laborUnitPrice: brickType === 'red_brick' ? 120 : brickType === 'concrete_block' ? 85 : 95,
      wastePercent: 7,
      basePerSqm: wallAreaSqm / currentHouseAreaSqm
    });

    // 2. งานเสาเอ็นและคานทับหลัง คสล.
    newItems.push({
      id: `wall-lintel-${timestamp + 1}`,
      category: 'masonry_wall',
      name: `งานเสาเอ็น & คานทับหลัง คสล. (รอบวงกบ ${openingsCount} ช่อง & แผงผนัง)`,
      spec: `ความยาว ${result.lintelLengthM} ม. (คอนกรีต ${result.lintelConcreteCuM} คิว + เหล็ก RB9/DB12 รวม ${result.lintelRebarBars} เส้น ${result.lintelRebarKg} กก. + หนวดกุ้ง ${result.wireMeshOrDowelQty} จุด)`,
      quantity: result.lintelLengthM,
      unit: 'ม.',
      materialUnitPrice: 115,
      laborUnitPrice: 90,
      wastePercent: 5,
      basePerSqm: result.lintelLengthM / currentHouseAreaSqm
    });

    // 3. งานฉาบปูน
    newItems.push({
      id: `wall-plaster-${timestamp + 2}`,
      category: 'masonry_wall',
      name: `ปูนฉาบผิวผนังสำเร็จรูป (${plasterSides === 2 ? 'ฉาบ 2 ด้าน ภายใน-ภายนอก' : 'ฉาบด้านเดียว'})`,
      spec: `พื้นที่ฉาบ ${wallAreaSqm * plasterSides} ตร.ม. (ใช้ปูนฉาบ ${result.plasterBags50kg} ถุง หนา 1.5 ซม. ติดตาข่ายไฟเบอร์)`,
      quantity: wallAreaSqm * plasterSides,
      unit: 'ตร.ม.',
      materialUnitPrice: 90,
      laborUnitPrice: 95,
      wastePercent: 5,
      basePerSqm: (wallAreaSqm * plasterSides) / currentHouseAreaSqm
    });

    onApplyToBOQ(newItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-500 text-2xl">handyman</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                เครื่องคำนวณงานก่อฉาบผนัง & อุปกรณ์ปูน-เหล็กทับหลัง คสล.
              </h2>
              <p className="text-xs text-slate-400">
                เลือกชนิดอิฐ (อิฐแดง / คอนกรีตบล็อก / อิฐมวลเบา) พร้อมคำนวณปูนก่อ ปูนฉาบ และเหล็กเสาเอ็นทับหลังรอบวงกบ
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
              <span className="material-symbols-outlined text-sm">tune</span> เลือกชนิดอิฐและพื้นที่ผนัง
            </h3>

            {/* เลือกชนิดอิฐ 3 แบบ */}
            <div>
              <label className="text-xs text-slate-300 block mb-1.5 font-medium">ชนิดอิฐก่อผนัง (Brick Type)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'red_brick', label: 'อิฐแดง / อิฐมอญ', sub: 'เจาะแขวนแน่น ทนชื้น', icon: 'square' },
                  { id: 'concrete_block', label: 'คอนกรีตบล็อก', sub: 'ประหยัด ก่อไว', icon: 'view_module' },
                  { id: 'aac_block', label: 'อิฐมวลเบา (AAC)', sub: 'กันร้อน น้ำหนักเบา', icon: 'layers' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setBrickType(item.id as WallMasonryType);
                      if (item.id === 'aac_block') setWallThicknessCm(7.5);
                      else if (item.id === 'concrete_block') setWallThicknessCm(7.0);
                      else setWallThicknessCm(7.0);
                    }}
                    className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition ${
                      brickType === item.id 
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-md' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg mb-1">{item.icon}</span>
                    <span className="text-xs">{item.label}</span>
                    <span className="text-[10px] opacity-75 mt-0.5">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* พื้นที่ผนังรวม ตร.ม. */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-slate-300 font-medium">พื้นที่ผนังก่อรวม (ตร.ม.)</label>
                <span className="text-[10px] text-slate-400 font-mono">สูตร: ~{Math.round(wallAreaSqm / (currentHouseAreaSqm || 1) * 10) / 10}x พท.บ้าน</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 focus-within:border-amber-400">
                <input
                  type="number"
                  min="5"
                  max="5000"
                  step="5"
                  value={wallAreaSqm}
                  onChange={(e) => setWallAreaSqm(parseFloat(e.target.value) || 10)}
                  className="w-full bg-transparent text-sm font-bold font-mono text-amber-400 focus:outline-none"
                />
                <span className="text-xs text-slate-400 shrink-0">ตร.ม.</span>
              </div>
            </div>

            {/* ช่องเปิดประตู-หน้าต่าง (ตัวแปรคำนวณเสาเอ็น-ทับหลัง) */}
            <div className="border border-slate-850 bg-slate-900/60 p-3 rounded-xl flex flex-col gap-2.5">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">fence</span> 
                จุดติดตั้งเสาเอ็นและคานทับหลัง (Lintel)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">จำนวนช่องเปิด (ช่อง)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={openingsCount}
                    onChange={(e) => setOpeningsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">รวมประตู + หน้าต่างทุกบาน</span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">ความกว้างเฉลี่ยช่อง (ม.)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="5.0"
                    value={avgOpeningWidthM}
                    onChange={(e) => setAvgOpeningWidthM(parseFloat(e.target.value) || 1.2)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">สำหรับคำนวณทับหลังพาดขอบ</span>
                </div>
              </div>
            </div>

            {/* งานฉาบปูนกี่ด้าน */}
            <div>
              <label className="text-xs text-slate-300 block mb-1.5 font-medium">การฉาบปูนผนัง</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlasterSides(2)}
                  className={`py-2 px-3 text-xs rounded-lg border font-medium transition ${
                    plasterSides === 2 
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold' 
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  ฉาบ 2 ด้าน (ภายใน + ภายนอก)
                </button>
                <button
                  type="button"
                  onClick={() => setPlasterSides(1)}
                  className={`py-2 px-3 text-xs rounded-lg border font-medium transition ${
                    plasterSides === 1 
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold' 
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  ฉาบ 1 ด้าน (ด้านเดียว)
                </button>
              </div>
            </div>
          </div>

          {/* Results Column (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            
            {/* Top Stat Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 block mb-1">
                  {brickType === 'red_brick' ? 'จำนวนอิฐแดง' : brickType === 'concrete_block' ? 'จำนวนอิฐบล็อก' : 'จำนวนอิฐมวลเบา'}
                </span>
                <span className="text-xl font-bold font-mono text-amber-400">{result.brickCount.toLocaleString()}</span>
                <span className="text-xs text-slate-500 ml-1">ก้อน</span>
              </div>
              <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 block mb-1">เสาเอ็น-ทับหลัง คสล.</span>
                <span className="text-xl font-bold font-mono text-cyan-400">{result.lintelLengthM}</span>
                <span className="text-xs text-slate-500 ml-1">เมตร</span>
              </div>
              <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-700/80 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 block mb-1">ปูนฉาบสำเร็จรูป (50กก.)</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{result.plasterBags50kg}</span>
                <span className="text-xs text-slate-500 ml-1">ถุง</span>
              </div>
            </div>

            {/* Bill of Quantities Breakdown */}
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col">
              <div className="px-4 py-2.5 bg-slate-850/80 border-b border-slate-800 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-200">
                  รายการถอดวัสดุและอุปกรณ์ปูน-เหล็กสำหรับสั่งซื้อ (Takeoff)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">คิดเผื่อเศษวัสดุ 5-7%</span>
              </div>
              <div className="p-4 flex flex-col gap-2.5 text-xs overflow-y-auto max-h-[380px]">
                
                {/* 1. ก้อนอิฐ */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      {brickType === 'red_brick' ? 'อิฐมอญ/อิฐแดง 2 รู:' : brickType === 'concrete_block' ? 'คอนกรีตบล็อก 7x19x39 ซม.:' : 'อิฐมวลเบา AAC 20x60x7.5 ซม.:'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      สำหรับพื้นที่ผนัง {wallAreaSqm} ตร.ม. (รวมอัตราสูญเสียเศษแล้ว)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-400 text-sm">{result.brickCount.toLocaleString()} ก้อน</span>
                </div>

                {/* 2. ปูนก่อ & ทราย */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                      {brickType === 'aac_block' ? 'ปูนกาวก่ออิฐมวลเบา (50 กก.):' : 'ปูนซีเมนต์ผสมสำหรับงานก่อ (50 กก.):'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {brickType === 'aac_block' ? 'ปูนกาวมวลเบาสูตรเฉพาะ' : `ใช้ปูน ${result.mortarBags50kg} ถุง + ทรายก่อ ${result.masonrySandCuM} ลบ.ม.`}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-orange-300 text-sm">{result.mortarBags50kg} ถุง</span>
                </div>

                {/* 3. เสาเอ็นและคานทับหลัง: ปูนคอนกรีต */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      คอนกรีตเทเสาเอ็น-ทับหลัง (รอบ {openingsCount} ช่องเปิด):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ความยาวรวม {result.lintelLengthM} ม. (หล่อกว้าง 10 ซม. x หนา {wallThicknessCm} ซม.)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-cyan-300 text-sm">{result.lintelConcreteCuM} ลบ.ม. (คิว)</span>
                </div>

                {/* 4. เสาเอ็นและคานทับหลัง: เหล็กเส้น RB9/DB12 */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      เหล็กแกนเสาเอ็น-ทับหลัง (RB9 / DB12) + ลวดผูกเหล็ก:
                    </span>
                    <span className="text-[10px] text-slate-400">
                      เหล็ก 2 เส้นตลอดแนว + เหล็กหนวดกุ้งยึดเสา {result.wireMeshOrDowelQty} จุด
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-blue-300 text-sm">{result.lintelRebarBars} เส้น</span>
                    <span className="text-[10px] text-slate-400 block font-mono">({result.lintelRebarKg} กก.)</span>
                  </div>
                </div>

                {/* 5. ปูนฉาบสำเร็จรูป */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      ปูนฉาบสำเร็จรูปละเอียด (ฉาบ {plasterSides} ด้าน รวม {wallAreaSqm * plasterSides} ตร.ม.):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ความหนา 1.5 ซม. พร้อมตาข่ายไฟเบอร์ดักรอยแตกร้าว 45° มุมวงกบ
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-300 text-sm">{result.plasterBags50kg} ถุง</span>
                </div>

                {/* สรุปประมาณการค่าใช้จ่าย */}
                <div className="mt-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-amber-300 font-medium block">
                      ประมาณการต้นทุนรวมงานก่อฉาบ + เสาเอ็นทับหลัง
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ค่าวัสดุ ~ ฿{result.estMaterialCost.toLocaleString()} | ค่าแรงช่าง ~ ฿{result.estLaborCost.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-base font-bold font-mono text-amber-400">
                    ฿{(result.estMaterialCost + result.estLaborCost).toLocaleString()}
                  </span>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center">
          <p className="text-xs text-slate-400">
            คำนวณตามมาตรฐานกรมโยธาธิการและผังเมือง พร้อมปูนทราย ปูนฉาบ และเหล็กเสริมทับหลังครบถ้วน
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
