import React, { useState, useMemo } from 'react';
import { StructureCalcParams, BOQItem, SlabSystemType, FootingItem, BeamItem } from '../types';
import { calculateStructureMaterials } from '../services/calculator';
interface StructureEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToBOQ: (newItems: BOQItem[]) => void;
  currentHouseAreaSqm?: number;
}
export const StructureEstimatorModal: React.FC<StructureEstimatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToBOQ,
  currentHouseAreaSqm = 120
}) => {
  // 🌟 รายการฟุตติ้งหลายขนาด (Multi-size Footings เช่น F1, F2, F3) 🌟
  const [footings, setFootings] = useState<FootingItem[]>([
    {
      id: 'footing-f1',
      code: 'F1',
      name: 'ฐานรากเดี่ยว F1 (เสากลาง/ทั่วไป)',
      count: 12,
      widthM: 1.00,
      lengthM: 1.00,
      thicknessM: 0.30,
      barType: 'DB12',
      barSpacingM: 0.15,
      pilesPerFooting: 1
    },
    {
      id: 'footing-f2',
      code: 'F2',
      name: 'ฐานรากริมรั้ว/เสาคู่ F2',
      count: 4,
      widthM: 1.20,
      lengthM: 1.20,
      thicknessM: 0.35,
      barType: 'DB16',
      barSpacingM: 0.15,
      pilesPerFooting: 2
    }
  ]);
  // 🌟 รายการคานหลายขนาด (Multi-size Beams เช่น B1, B2, B3) 🌟
  const [beams, setBeams] = useState<BeamItem[]>([
    {
      id: 'beam-b1',
      code: 'B1',
      name: 'คานคอดินหลัก B1 (0.20 x 0.40 ม.)',
      totalLengthM: 45,
      widthM: 0.20,
      depthM: 0.40,
      mainBarsCount: 4,
      mainBarType: 'DB12',
      stirrupSpacingM: 0.20
    },
    {
      id: 'beam-b2',
      code: 'B2',
      name: 'คานซอย/คานห้องน้ำ B2 (0.15 x 0.35 ม.)',
      totalLengthM: 20,
      widthM: 0.15,
      depthM: 0.35,
      mainBarsCount: 4,
      mainBarType: 'DB12',
      stirrupSpacingM: 0.20
    },
    {
      id: 'beam-b3',
      code: 'B3',
      name: 'คานรับน้ำหนักช่วงยาว B3 (0.25 x 0.50 ม.)',
      totalLengthM: 15,
      widthM: 0.25,
      depthM: 0.50,
      mainBarsCount: 6,
      mainBarType: 'DB16',
      stirrupSpacingM: 0.15
    }
  ]);
  // ข้อมูลเสา
  const [columnWidthM, setColumnWidthM] = useState<number>(0.20);
  const [columnDepthM, setColumnDepthM] = useState<number>(0.20);
  const [columnHeightM, setColumnHeightM] = useState<number>(3.50);
  const [columnMainBars, setColumnMainBars] = useState<number>(4);
  const [columnMainBarType, setColumnMainBarType] = useState<'DB12' | 'DB16'>('DB12');
  const [columnStirrupSpacingM, setColumnStirrupSpacingM] = useState<number>(0.15);
  // คำนวณจำนวนเสาอัตโนมัติจากผลรวมจำนวนฐานราก
  const totalColumnCount = useMemo(() => {
    return footings.reduce((sum, f) => sum + (f.count || 0), 0);
  }, [footings]);
  // งานพื้น (Slab System)
  const [slabType, setSlabType] = useState<SlabSystemType>('hybrid');
  const [totalFloorAreaSqm, setTotalFloorAreaSqm] = useState<number>(currentHouseAreaSqm || 120);
  const [precastAreaSqm, setPrecastAreaSqm] = useState<number>(Math.round((currentHouseAreaSqm || 120) * 0.85));
  const [castInPlaceAreaSqm, setCastInPlaceAreaSqm] = useState<number>(Math.round((currentHouseAreaSqm || 120) * 0.15));
  const [toppingThicknessCm, setToppingThicknessCm] = useState<number>(5);
  const [castInPlaceThicknessCm, setCastInPlaceThicknessCm] = useState<number>(10);
  const [wireMeshDiameterMm, setWireMeshDiameterMm] = useState<4 | 6>(4);
  const [castInPlaceRebarType, setCastInPlaceRebarType] = useState<'RB9' | 'DB12'>('RB9');
  const [castInPlaceRebarSpacingM, setCastInPlaceRebarSpacingM] = useState<number>(0.15);
  // แท็บทำงาน: ฟุตติ้ง, คาน, เสา, พื้น
  const [activeTab, setActiveTab] = useState<'footing' | 'beam' | 'column' | 'slab'>('footing');
  // คำนวณปริมาณวัสดุ
  const result = useMemo(() => {
    const params: StructureCalcParams = {
      columnCount: totalColumnCount,
      columnWidthM,
      columnDepthM,
      columnHeightM,
      columnMainBars,
      columnMainBarType,
      columnStirrupSpacingM,
      footings,
      beams,
      slabType,
      totalFloorAreaSqm,
      precastAreaSqm,
      castInPlaceAreaSqm,
      toppingThicknessCm,
      castInPlaceThicknessCm,
      wireMeshDiameterMm,
      castInPlaceRebarType,
      castInPlaceRebarSpacingM
    };
    return calculateStructureMaterials(params);
  }, [
    totalColumnCount, columnWidthM, columnDepthM, columnHeightM, columnMainBars, columnMainBarType, columnStirrupSpacingM,
    footings, beams,
    slabType, totalFloorAreaSqm, precastAreaSqm, castInPlaceAreaSqm, toppingThicknessCm, castInPlaceThicknessCm,
    wireMeshDiameterMm, castInPlaceRebarType, castInPlaceRebarSpacingM
  ]);
  if (!isOpen) return null;
  // ฟังก์ชันจัดการฟุตติ้ง
  const handleAddFooting = () => {
    const nextIndex = footings.length + 1;
    const newFooting: FootingItem = {
      id: `footing-${Date.now()}`,
      code: `F${nextIndex}`,
      name: `ฐานราก F${nextIndex}`,
      count: 2,
      widthM: 1.00,
      lengthM: 1.00,
      thicknessM: 0.30,
      barType: 'DB12',
      barSpacingM: 0.15,
      pilesPerFooting: 1
    };
    setFootings(prev => [...prev, newFooting]);
  };
  const handleUpdateFooting = (id: string, patch: Partial<FootingItem>) => {
    setFootings(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };
  const handleDeleteFooting = (id: string) => {
    if (footings.length <= 1) {
      alert('ต้องมีฐานรากอย่างน้อย 1 ประเภท');
      return;
    }
    setFootings(prev => prev.filter(f => f.id !== id));
  };
  // ฟังก์ชันจัดการคาน
  const handleAddBeam = () => {
    const nextIndex = beams.length + 1;
    const newBeam: BeamItem = {
      id: `beam-${Date.now()}`,
      code: `B${nextIndex}`,
      name: `คาน B${nextIndex}`,
      totalLengthM: 15,
      widthM: 0.20,
      depthM: 0.40,
      mainBarsCount: 4,
      mainBarType: 'DB12',
      stirrupSpacingM: 0.20
    };
    setBeams(prev => [...prev, newBeam]);
  };
  const handleUpdateBeam = (id: string, patch: Partial<BeamItem>) => {
    setBeams(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  };
  const handleDeleteBeam = (id: string) => {
    if (beams.length <= 1) {
      alert('ต้องมีคานอย่างน้อย 1 ประเภท');
      return;
    }
    setBeams(prev => prev.filter(b => b.id !== id));
  };
  const handleApply = () => {
    const timestamp = Date.now();
    const newItems: BOQItem[] = [];
    // สรุปสเปกฟุตติ้งแต่ละตัว
    const footingSpecStr = footings.map(f => `${f.code}: ${f.count} ฐาน (${f.widthM}x${f.lengthM}x${f.thicknessM}ม. ${f.barType})`).join(' | ');
    // สรุปสเปกคานแต่ละตัว
    const beamSpecStr = beams.map(b => `${b.code}: ${b.totalLengthM}ม. (${b.widthM}x${b.depthM}ม. ${b.mainBarsCount}${b.mainBarType})`).join(' | ');
    const totalBeamLen = beams.reduce((sum, b) => sum + (b.totalLengthM || 0), 0);
    // 1. คอนกรีตฐานราก
    newItems.push({
      id: `str-footing-conc-${timestamp}`,
      category: 'structure',
      name: `คอนกรีตผสมเสร็จ 240 ksc งานฐานราก คสล. (${footings.map(f => f.code).join(', ')})`,
      spec: `รวม ${totalColumnCount} ฐาน (${footingSpecStr}) ปริมาตรรวม ${result.concreteFootingCuM} คิว`,
      quantity: result.concreteFootingCuM,
      unit: 'ลบ.ม.',
      materialUnitPrice: 2150,
      laborUnitPrice: 450,
      wastePercent: 0,
    });
    // 2. คอนกรีตเสา
    newItems.push({
      id: `str-col-conc-${timestamp + 1}`,
      category: 'structure',
      name: `คอนกรีตผสมเสร็จ 240 ksc งานเสาโครงสร้าง คสล. (${totalColumnCount} ต้น)`,
      spec: `ขนาดเสา ${columnWidthM}x${columnDepthM} ม. สูง ${columnHeightM} ม. ปริมาตรรวม ${result.concreteColumnCuM} คิว`,
      quantity: result.concreteColumnCuM,
      unit: 'ลบ.ม.',
      materialUnitPrice: 2150,
      laborUnitPrice: 450,
      wastePercent: 0,
    });
    // 3. คอนกรีตคาน
    newItems.push({
      id: `str-beam-conc-${timestamp + 2}`,
      category: 'structure',
      name: `คอนกรีตผสมเสร็จ 240 ksc งานคาน คสล. (${beams.map(b => b.code).join(', ')} รวม ${totalBeamLen} ม.)`,
      spec: `คานแยกตามเบอร์: ${beamSpecStr} ปริมาตรรวม ${result.concreteBeamCuM} คิว`,
      quantity: result.concreteBeamCuM,
      unit: 'ลบ.ม.',
      materialUnitPrice: 2150,
      laborUnitPrice: 450,
      wastePercent: 0,
    });
    // 4. คอนกรีตงานพื้น
    if (result.concreteSlabTotalCuM > 0) {
      newItems.push({
        id: `str-slab-conc-${timestamp + 3}`,
        category: 'structure',
        name: `คอนกรีตผสมเสร็จ 240 ksc งานพื้นอาคาร (${slabType === 'precast_plank' ? 'Topping พื้นสำเร็จรูป' : slabType === 'cast_in_place' ? 'หล่อในที่ คสล.' : 'Topping + หล่อในที่'})`,
        spec: `${slabType !== 'cast_in_place' ? `Topping ${toppingThicknessCm} ซม. (${result.concreteSlabToppingCuM} คิว)` : ''} ${slabType !== 'precast_plank' ? `+ หล่อในที่ ${castInPlaceThicknessCm} ซม. (${result.concreteSlabCastInPlaceCuM} คิว)` : ''}`,
        quantity: result.concreteSlabTotalCuM,
        unit: 'ลบ.ม.',
        materialUnitPrice: 2150,
        laborUnitPrice: 400,
        wastePercent: 0,
      });
    }
    // 5. แผ่นพื้นสำเร็จรูป
    const effPrecastArea = slabType === 'precast_plank' ? totalFloorAreaSqm : slabType === 'hybrid' ? precastAreaSqm : 0;
    if (effPrecastArea > 0) {
      newItems.push({
        id: `str-precast-${timestamp + 4}`,
        category: 'structure',
        name: `แผ่นพื้นคอนกรีตสำเร็จรูปท้องเรียบ (Plank) ลวด 4-5 เส้น`,
        spec: `สำหรับพื้นที่ห้องทั่วไป ${effPrecastArea} ตร.ม. (~${result.precastPlanksCount} แผ่น กว้าง 0.35ม.)`,
        quantity: effPrecastArea,
        unit: 'ตร.ม.',
        materialUnitPrice: 240,
        laborUnitPrice: 65,
        wastePercent: 5,
      });
      newItems.push({
        id: `str-wiremesh-${timestamp + 5}`,
        category: 'structure',
        name: `ตะแกรงเหล็กกล้าเชื่อมติด (Wire Mesh) Ø ${wireMeshDiameterMm} มม. @ 0.20 ม.`,
        spec: `ปูทับแผ่นพื้นสำเร็จรูป Topping พื้นที่ ${result.wireMeshAreaSqm} ตร.ม.`,
        quantity: result.wireMeshAreaSqm,
        unit: 'ตร.ม.',
        materialUnitPrice: wireMeshDiameterMm === 6 ? 65 : 45,
        laborUnitPrice: 15,
        wastePercent: 5,
      });
    }
    // 6. เหล็กพื้นหล่อในที่
    const effCastArea = slabType === 'cast_in_place' ? totalFloorAreaSqm : slabType === 'hybrid' ? castInPlaceAreaSqm : 0;
    if (effCastArea > 0 && result.slabCastRebarKg > 0) {
      newItems.push({
        id: `str-cast-rebar-${timestamp + 6}`,
        category: 'structure',
        name: `เหล็กเสริมพื้นหล่อในที่ คสล. (${castInPlaceRebarType} @ ${castInPlaceRebarSpacingM} ม. 2 ชั้น)`,
        spec: `สำหรับพื้นที่เปียก/ห้องน้ำ/ระเบียง ${effCastArea} ตร.ม. หนา ${castInPlaceThicknessCm} ซม. (${result.slabCastRebarKg} กก.)`,
        quantity: result.slabCastRebarKg,
        unit: 'กก.',
        materialUnitPrice: castInPlaceRebarType === 'DB12' ? 28 : 29,
        laborUnitPrice: 7.5,
        wastePercent: 5,
      });
      newItems.push({
        id: `str-cast-form-${timestamp + 7}`,
        category: 'structure',
        name: `ไม้แบบหล่อท้องพื้น คสล. หล่อในที่ พร้อมค้ำยัน`,
        spec: `พื้นที่ ${effCastArea} ตร.ม. (หักหมุนเวียนใช้งานซ้ำ)`,
        quantity: effCastArea,
        unit: 'ตร.ม.',
        materialUnitPrice: 220,
        laborUnitPrice: 140,
        wastePercent: 5,
      });
    }
    // 7. เหล็ก DB12
    if (result.db12Kg > 0) {
      newItems.push({
        id: `str-db12-${timestamp + 8}`,
        category: 'structure',
        name: `เหล็กข้ออ้อย DB12 มอก. SD40 (ความยาว 10 ม.)`,
        spec: `สำหรับโครงสร้างฐานราก เสา คาน และพื้น คำนวณได้ ${result.db12Bars} เส้น (${result.db12Kg} กก.)`,
        quantity: result.db12Kg,
        unit: 'กก.',
        materialUnitPrice: 28,
        laborUnitPrice: 6.5,
        wastePercent: 5,
      });
    }
    // 8. เหล็ก DB16
    if (result.db16Kg > 0) {
      newItems.push({
        id: `str-db16-${timestamp + 9}`,
        category: 'structure',
        name: `เหล็กข้ออ้อย DB16 มอก. SD40 (ความยาว 10 ม.)`,
        spec: `สำหรับโครงสร้างฐานราก เสา และคานรับแรงสูง คำนวณได้ ${result.db16Bars} เส้น (${result.db16Kg} กก.)`,
        quantity: result.db16Kg,
        unit: 'กก.',
        materialUnitPrice: 28.5,
        laborUnitPrice: 6.5,
        wastePercent: 5,
      });
    }
    // 9. เหล็กปลอก
    if (result.stirrupKg > 0) {
      newItems.push({
        id: `str-stirrup-${timestamp + 10}`,
        category: 'structure',
        name: `เหล็กปลอกเสา & ปลอกคาน (RB6/RB9 SR24) พร้อมลวดผูกเหล็ก`,
        spec: `รวม ${result.stirrupBars} เส้น (${result.stirrupKg} กก.) พร้อมลวดผูกเหล็ก ${result.tieWireKg} กก.`,
        quantity: result.stirrupKg,
        unit: 'กก.',
        materialUnitPrice: 29,
        laborUnitPrice: 7.5,
        wastePercent: 5,
      });
    }
    // 10. ไม้แบบหล่อคอนกรีตฐานราก เสา คาน
    const formworkSum = Math.round((result.formworkFootingSqm + result.formworkColumnSqm + result.formworkBeamSqm) * 10) / 10;
    newItems.push({
      id: `str-formwork-${timestamp + 11}`,
      category: 'structure',
      name: `ไม้แบบหล่อคอนกรีต (ฐานราก ${totalColumnCount} หลุม + เสา + คาน ${totalBeamLen} ม.)`,
      spec: `พื้นที่ผิวสัมผัสไม้แบบ ${formworkSum} ตร.ม. (ฐานราก ${result.formworkFootingSqm} + เสา ${result.formworkColumnSqm} + คาน ${result.formworkBeamSqm} ตร.ม.)`,
      quantity: formworkSum,
      unit: 'ตร.ม.',
      materialUnitPrice: 240,
      laborUnitPrice: 130,
      wastePercent: 5,
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
            <span className="material-symbols-outlined text-cyan-400 text-2xl">apartment</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>ระบบคำนวณโครงสร้าง คสล. (ฟุตติ้ง & คาน หลายขนาด)</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold">
                  {footings.length} ขนาดฟุตติ้ง • {beams.length} ขนาดคาน
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                กำหนดขนาดฐานราก (F1, F2, F3...) และคาน (B1, B2, B3...) ตามแบบแปลนจริงได้อย่างอิสระ
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
        {/* Tab Switcher */}
        <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('footing')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === 'footing' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">foundation</span>
              <span>1. ฐานราก/ฟุตติ้ง ({footings.length} ขนาด)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('beam')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === 'beam' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">straighten</span>
              <span>2. คาน คสล. ({beams.length} ขนาด)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('column')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === 'column' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_column</span>
              <span>3. เสาอาคาร ({totalColumnCount} ต้น)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('slab')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === 'slab' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">grid_on</span>
              <span>4. พื้น (สำเร็จ/หล่อในที่)</span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            {activeTab === 'footing' && (
              <button
                type="button"
                onClick={handleAddFooting}
                className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-semibold flex items-center gap-1 transition"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>+ เพิ่มขนาดฟุตติ้ง (F{footings.length + 1})</span>
              </button>
            )}
            {activeTab === 'beam' && (
              <button
                type="button"
                onClick={handleAddBeam}
                className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-semibold flex items-center gap-1 transition"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>+ เพิ่มขนาดคาน (B{beams.length + 1})</span>
              </button>
            )}
          </div>
        </div>
        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Controls Column (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            
            {/* 🌟 TAB 1: ฟุตติ้งหลายขนาด (F1, F2, F3...) 🌟 */}
            {activeTab === 'footing' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
                  <span>กำหนดรายการฐานรากแต่ละเบอร์ (กว้าง x ยาว x หนา และเหล็กเสริม):</span>
                  <span className="text-cyan-300 font-mono font-bold">รวมทั้งหลัง: {totalColumnCount} ฐาน</span>
                </div>
                {footings.map((f, idx) => (
                  <div key={f.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={f.code}
                          onChange={(e) => handleUpdateFooting(f.id, { code: e.target.value })}
                          className="w-14 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded px-2 py-0.5 font-bold font-mono text-center focus:outline-none"
                          placeholder="F1"
                        />
                        <input
                          type="text"
                          value={f.name}
                          onChange={(e) => handleUpdateFooting(f.id, { name: e.target.value })}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-medium focus:outline-none"
                          placeholder="คำอธิบายฐานราก เช่น ฐานรากเดี่ยว F1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                          <span className="text-slate-400 text-[11px]">จำนวน:</span>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={f.count}
                            onChange={(e) => handleUpdateFooting(f.id, { count: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-12 text-center bg-transparent text-amber-400 font-mono font-bold"
                          />
                          <span className="text-slate-400 text-[11px]">ฐาน</span>
                        </div>
                        {footings.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFooting(f.id)}
                            className="text-slate-500 hover:text-red-400 p-1 transition"
                            title="ลบฐานรากนี้"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {/* มิติ กว้าง x ยาว x หนา */}
                    <div className="grid grid-cols-3 gap-2.5 pt-1 border-t border-slate-850">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">กว้าง (ม.):</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.5"
                          value={f.widthM}
                          onChange={(e) => handleUpdateFooting(f.id, { widthM: parseFloat(e.target.value) || 0.5 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">ยาว (ม.):</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.5"
                          value={f.lengthM}
                          onChange={(e) => handleUpdateFooting(f.id, { lengthM: parseFloat(e.target.value) || 0.5 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">หนา (ม.):</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.2"
                          value={f.thicknessM}
                          onChange={(e) => handleUpdateFooting(f.id, { thicknessM: parseFloat(e.target.value) || 0.2 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>
                    {/* เหล็กตะกร้อและระยะห่าง */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">ขนาดเหล็กเสริมตะกร้อ:</label>
                        <select
                          value={f.barType}
                          onChange={(e) => handleUpdateFooting(f.id, { barType: e.target.value as 'DB12' | 'DB16' })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                        >
                          <option value="DB12">DB12 (ข้ออ้อย 12 มม.)</option>
                          <option value="DB16">DB16 (ข้ออ้อย 16 มม.)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">ระยะห่างตะแกรง @ (ม.):</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.10"
                          max="0.30"
                          value={f.barSpacingM}
                          onChange={(e) => handleUpdateFooting(f.id, { barSpacingM: parseFloat(e.target.value) || 0.15 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-850 font-mono">
                      <span>คอนกรีตฐานนี้: {Math.round(f.widthM * f.lengthM * f.thicknessM * f.count * 100) / 100} คิว</span>
                      <span>ไม้แบบ: {Math.round(2 * (f.widthM + f.lengthM) * f.thicknessM * f.count * 10) / 10} ตร.ม.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* 🌟 TAB 2: คานหลายขนาด (B1, B2, B3...) 🌟 */}
            {activeTab === 'beam' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
                  <span>กำหนดรายการคานแต่ละเบอร์ (กว้าง x ลึก x ความยาวรวม และเหล็กยืน):</span>
                  <span className="text-cyan-300 font-mono font-bold">
                    ความยาวรวม: {beams.reduce((sum, b) => sum + (b.totalLengthM || 0), 0)} เมตร
                  </span>
                </div>
                {beams.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={b.code}
                          onChange={(e) => handleUpdateBeam(b.id, { code: e.target.value })}
                          className="w-14 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded px-2 py-0.5 font-bold font-mono text-center focus:outline-none"
                          placeholder="B1"
                        />
                        <input
                          type="text"
                          value={b.name}
                          onChange={(e) => handleUpdateBeam(b.id, { name: e.target.value })}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-medium focus:outline-none"
                          placeholder="คำอธิบายคาน เช่น คานคอดิน B1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                          <span className="text-slate-400 text-[11px]">ยาวรวม:</span>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={b.totalLengthM}
                            onChange={(e) => handleUpdateBeam(b.id, { totalLengthM: Math.max(1, parseFloat(e.target.value) || 1) })}
                            className="w-14 text-center bg-transparent text-amber-400 font-mono font-bold"
                          />
                          <span className="text-slate-400 text-[11px]">ม.</span>
                        </div>
                        {beams.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBeam(b.id)}
                            className="text-slate-500 hover:text-red-400 p-1 transition"
                            title="ลบคานนี้"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {/* หน้าตัด กว้าง x ลึก */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-850">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">กว้างคาน (ม.):</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          value={b.widthM}
                          onChange={(e) => handleUpdateBeam(b.id, { widthM: parseFloat(e.target.value) || 0.2 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">ลึก/สูงคาน (ม.):</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.2"
                          value={b.depthM}
                          onChange={(e) => handleUpdateBeam(b.id, { depthM: parseFloat(e.target.value) || 0.4 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>
                    {/* เหล็กยืนคานและเหล็กปลอก */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">ขนาดเหล็กยืน:</label>
                        <select
                          value={b.mainBarType}
                          onChange={(e) => handleUpdateBeam(b.id, { mainBarType: e.target.value as 'DB12' | 'DB16' })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                        >
                          <option value="DB12">DB12 (12 มม.)</option>
                          <option value="DB16">DB16 (16 มม.)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">จำนวนเหล็กยืน (เส้น):</label>
                        <input
                          type="number"
                          min="2"
                          max="16"
                          value={b.mainBarsCount}
                          onChange={(e) => handleUpdateBeam(b.id, { mainBarsCount: parseInt(e.target.value) || 4 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">ระยะปลอก @ (ม.):</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.10"
                          max="0.30"
                          value={b.stirrupSpacingM}
                          onChange={(e) => handleUpdateBeam(b.id, { stirrupSpacingM: parseFloat(e.target.value) || 0.20 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-850 font-mono">
                      <span>คอนกรีตคานนี้: {Math.round(b.widthM * b.depthM * b.totalLengthM * 100) / 100} คิว</span>
                      <span>ไม้แบบ: {Math.round(((2 * b.depthM) + b.widthM) * b.totalLengthM * 10) / 10} ตร.ม.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* TAB 3: เสาอาคาร */}
            {activeTab === 'column' && (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3 text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">view_column</span> เสาอาคาร คสล.
                </span>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300">
                  <span>จำนวนเสารวมทั้งอาคาร (เชื่อมโยงตามจำนวนฐานราก):</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">{totalColumnCount} ต้น</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ความสูงเสาเฉลี่ย (ม.)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={columnHeightM}
                      onChange={(e) => setColumnHeightM(parseFloat(e.target.value) || 3.5)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ขนาดหน้าตัดเสา (กว้าง x ลึก ม.)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.05"
                        value={columnWidthM}
                        onChange={(e) => setColumnWidthM(parseFloat(e.target.value) || 0.2)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center"
                      />
                      <span className="text-slate-500">x</span>
                      <input
                        type="number"
                        step="0.05"
                        value={columnDepthM}
                        onChange={(e) => setColumnDepthM(parseFloat(e.target.value) || 0.2)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ขนาดเหล็กยืนเสา</label>
                    <select
                      value={columnMainBarType}
                      onChange={(e) => setColumnMainBarType(e.target.value as 'DB12' | 'DB16')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    >
                      <option value="DB12">DB12 (ข้ออ้อย 12 มม.)</option>
                      <option value="DB16">DB16 (ข้ออ้อย 16 มม.)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">จำนวนเหล็กยืนต่อต้น</label>
                    <input
                      type="number"
                      min="4"
                      max="16"
                      value={columnMainBars}
                      onChange={(e) => setColumnMainBars(parseInt(e.target.value) || 4)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">ระยะห่างเหล็กปลอกเสา @ (ม.)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.10"
                    max="0.30"
                    value={columnStirrupSpacingM}
                    onChange={(e) => setColumnStirrupSpacingM(parseFloat(e.target.value) || 0.15)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}
            {/* TAB 4: งานพื้น (Slab System) */}
            {activeTab === 'slab' && (
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3 text-xs">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">grid_on</span> รูปแบบระบบพื้นอาคาร
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'hybrid', label: 'ผสม (แนะนำ)', sub: 'สำเร็จรูป + หล่อห้องน้ำ' },
                      { id: 'precast_plank', label: 'สำเร็จรูปล้วน', sub: 'แผ่นท้องเรียบ + Topping' },
                      { id: 'cast_in_place', label: 'หล่อในที่ล้วน', sub: 'คสล. 2 ชั้น' },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSlabType(item.id as SlabSystemType);
                          if (item.id === 'precast_plank') {
                            setPrecastAreaSqm(totalFloorAreaSqm);
                            setCastInPlaceAreaSqm(0);
                          } else if (item.id === 'cast_in_place') {
                            setPrecastAreaSqm(0);
                            setCastInPlaceAreaSqm(totalFloorAreaSqm);
                          } else {
                            setPrecastAreaSqm(Math.round(totalFloorAreaSqm * 0.85));
                            setCastInPlaceAreaSqm(Math.round(totalFloorAreaSqm * 0.15));
                          }
                        }}
                        className={`p-2 rounded-xl border text-center transition ${
                          slabType === item.id 
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold' 
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-xs">{item.label}</div>
                        <div className="text-[10px] opacity-75 mt-0.5">{item.sub}</div>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">พื้นที่พื้นอาคารรวม (ตร.ม.)</label>
                    <input
                      type="number"
                      value={totalFloorAreaSqm}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 10;
                        setTotalFloorAreaSqm(val);
                        if (slabType === 'hybrid') {
                          setPrecastAreaSqm(Math.round(val * 0.85));
                          setCastInPlaceAreaSqm(Math.round(val * 0.15));
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-400 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Result Column (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* สรุปคอนกรีตรวม */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">คอนกรีตโครงสร้างรวม</span>
                <span className="text-lg font-bold font-mono text-cyan-400">{result.totalConcreteCuM}</span>
                <span className="text-xs text-slate-500 ml-1">คิว</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">เหล็กข้ออ้อยรวม (DB)</span>
                <span className="text-lg font-bold font-mono text-amber-400">
                  {(result.db12Kg + result.db16Kg).toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 ml-1">กก.</span>
              </div>
            </div>
            {/* รายการแจกแจงแยกเบอร์ */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3 text-xs flex-1">
              <span className="font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
                <span>สรุปปริมาณแยกเบอร์ (Takeoff Summary)</span>
                <span className="text-[10px] font-mono text-slate-400">คิว / กก.</span>
              </span>
              {/* ฐานรากแยกเบอร์ */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-cyan-300">ฐานราก ({footings.length} ขนาด):</span>
                {result.footingSummaryList?.map(f => (
                  <div key={f.code} className="flex justify-between items-center text-[11px] text-slate-300 pl-2">
                    <span>• {f.code} ({f.count} ฐาน):</span>
                    <span className="font-mono font-semibold text-white">
                      {f.concreteCuM} คิว | {f.steelKg} กก.
                    </span>
                  </div>
                ))}
              </div>
              {/* คานแยกเบอร์ */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-850">
                <span className="text-[11px] font-bold text-cyan-300">คาน ({beams.length} ขนาด):</span>
                {result.beamSummaryList?.map(b => (
                  <div key={b.code} className="flex justify-between items-center text-[11px] text-slate-300 pl-2">
                    <span>• {b.code} ({b.lengthM} ม.):</span>
                    <span className="font-mono font-semibold text-white">
                      {b.concreteCuM} คิว | {b.steelKg} กก.
                    </span>
                  </div>
                ))}
              </div>
              {/* สรุปเหล็กเส้น */}
              <div className="flex flex-col gap-1 pt-2 border-t border-slate-850">
                <span className="text-[11px] font-bold text-amber-400">เหล็กเสริมโครงสร้าง:</span>
                {result.db12Kg > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-300 pl-2 font-mono">
                    <span>• เหล็ก DB12:</span>
                    <span>{result.db12Bars} เส้น ({result.db12Kg.toLocaleString()} กก.)</span>
                  </div>
                )}
                {result.db16Kg > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-300 pl-2 font-mono">
                    <span>• เหล็ก DB16:</span>
                    <span>{result.db16Bars} เส้น ({result.db16Kg.toLocaleString()} กก.)</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] text-slate-300 pl-2 font-mono">
                  <span>• ปลอก RB6/9:</span>
                  <span>{result.stirrupBars} เส้น ({result.stirrupKg.toLocaleString()} กก.)</span>
                </div>
              </div>
              {/* รวมค่าใช้จ่าย */}
              <div className="mt-auto p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex justify-between items-center">
                <span className="text-xs text-slate-300 font-medium">งบโครงสร้างรวม:</span>
                <span className="text-base font-bold font-mono text-cyan-300">
                  ฿{(result.estMaterialCost + result.estLaborCost).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
          <p className="text-xs text-slate-400">
            ระบบจะอัปเดตยอดคอนกรีต เหล็กเส้น และไม้แบบของฟุตติ้งและคานทุกขนาดลงในตาราง BOQ ทันที
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
              นำเข้าตาราง BOQ ทันที
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};