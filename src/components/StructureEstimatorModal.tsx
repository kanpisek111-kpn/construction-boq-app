import React, { useState, useMemo } from 'react';
import { StructureCalcParams, BOQItem, SlabSystemType, FootingItem, BeamItem, FoundationPileType } from '../types';
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
  // 🌟 งานเสาเข็มและงานดินขุด (Piling & Earthwork) 🌟
  const [pileType, setPileType] = useState<FoundationPileType>('bored_pile_35');
  const [pileLengthM, setPileLengthM] = useState<number>(20);
  const [pilesPerFooting, setPilesPerFooting] = useState<number>(1);
  const [excavationDepthM, setExcavationDepthM] = useState<number>(1.50);
  const [sandBeddingThicknessCm, setSandBeddingThicknessCm] = useState<number>(5);
  const [leanConcreteThicknessCm, setLeanConcreteThicknessCm] = useState<number>(5);
  const [includePiles, setIncludePiles] = useState<boolean>(true);
  const [includeEarthwork, setIncludeEarthwork] = useState<boolean>(true);
  const [includeSandAndLean, setIncludeSandAndLean] = useState<boolean>(true);

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
      stirrupSpacingM: 0.20,
      extraTopNearBars: 2,
      extraBottomMidBars: 1,
      extraTopFarBars: 2,
      extraBarType: 'DB12'
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
      stirrupSpacingM: 0.20,
      extraTopNearBars: 0,
      extraBottomMidBars: 0,
      extraTopFarBars: 0,
      extraBarType: 'DB12'
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
      stirrupSpacingM: 0.15,
      extraTopNearBars: 2,
      extraBottomMidBars: 2,
      extraTopFarBars: 2,
      extraBarType: 'DB16'
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

  // แท็บทำงาน: งานเสาเข็มและดินขุด, ฟุตติ้ง, คาน, เสา, พื้น
  const [activeTab, setActiveTab] = useState<'piles_earthwork' | 'footing' | 'beam' | 'column' | 'slab'>('piles_earthwork');

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
      castInPlaceRebarSpacingM,
      pileType,
      pileLengthM,
      pilesPerFooting,
      excavationDepthM,
      sandBeddingThicknessM: sandBeddingThicknessCm / 100,
      leanConcreteThicknessM: leanConcreteThicknessCm / 100
    };
    return calculateStructureMaterials(params);
  }, [
    totalColumnCount, columnWidthM, columnDepthM, columnHeightM, columnMainBars, columnMainBarType, columnStirrupSpacingM,
    footings, beams,
    slabType, totalFloorAreaSqm, precastAreaSqm, castInPlaceAreaSqm, toppingThicknessCm, castInPlaceThicknessCm,
    wireMeshDiameterMm, castInPlaceRebarType, castInPlaceRebarSpacingM,
    pileType, pileLengthM, pilesPerFooting, excavationDepthM, sandBeddingThicknessCm, leanConcreteThicknessCm
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

    // ==========================================
    // หมวด 1: งานเตรียมการและฐานราก (preparation)
    // ==========================================
    // 1. งานเสาเข็ม (Piling)
    if (includePiles && pileType !== 'spread_footing' && result.totalPilesCount > 0) {
      let pileName = '';
      let pileSpec = '';
      let pileUnitMat = 0;
      let pileUnitLab = 0;

      if (pileType === 'bored_pile_35') {
        pileName = `งานเสาเข็มเจาะ Ø 0.35 ม. ลึก ${pileLengthM} ม. พร้อมคอนกรีตและเหล็กเสริม คสล.`;
        pileSpec = `เข็มเจาะหล่อในที่ Ø 0.35ม. (${result.totalPilesCount} ต้น x ${pileLengthM}ม. = ${result.totalPileMeters} ม.) เทคอนกรีต 240 ksc พร้อมโครงเหล็กข้ออ้อย`;
        pileUnitMat = 650;
        pileUnitLab = 280;
      } else if (pileType === 'driven_pile_i22') {
        pileName = `เสาเข็มคอนกรีตอัดแรงรูปตัวไอ I-22 (ความยาว ${pileLengthM} ม.) ตอกด้วยปั้นจั่น`;
        pileSpec = `เสาเข็มไอ 0.22 x 0.22 ม. มอก. ความยาวท่อนละ 8-10 ม. ต่อเชื่อมด้วยปลอกเหล็ก (${result.totalPilesCount} ต้น x ${pileLengthM}ม. = ${result.totalPileMeters} ม.)`;
        pileUnitMat = 280;
        pileUnitLab = 95;
      } else if (pileType === 'driven_pile_i18') {
        pileName = `เสาเข็มคอนกรีตอัดแรงรูปตัวไอ I-18 (ความยาว ${pileLengthM} ม.) ตอกด้วยปั้นจั่น`;
        pileSpec = `เสาเข็มไอ 0.18 x 0.18 ม. มอก. (${result.totalPilesCount} ต้น x ${pileLengthM}ม. = ${result.totalPileMeters} ม.)`;
        pileUnitMat = 230;
        pileUnitLab = 85;
      } else if (pileType === 'micro_pile_i20') {
        pileName = `เสาเข็มสปันไมโครไพล์ (Spun Micro Pile) ตอกลึก ${pileLengthM} ม. แรงสั่นสะเทือนต่ำ`;
        pileSpec = `เสาเข็มท่อนละ 1.50 ม. ต่อเชื่อมด้วยการเชื่อมไฟฟ้า ลึก ${pileLengthM} ม. (${result.totalPilesCount} ต้น รวม ${result.totalPileMeters} ม.)`;
        pileUnitMat = 1100;
        pileUnitLab = 350;
      } else if (pileType === 'hex_pile_6m') {
        pileName = `เสาเข็มคอนกรีตอัดแรงหกเหลี่ยมกลวง Ø 0.15 ม. ความยาว 6.00 ม.`;
        pileSpec = `ตอกหรือกดด้วยรถแบ็คโฮ จำนวน ${result.totalPilesCount} ต้น (ฐานรากรั้ว/ลานซักล้าง/ส่วนต่อเติม)`;
        pileUnitMat = 380;
        pileUnitLab = 120;
      }

      newItems.push({
        id: `prep-pile-${timestamp}`,
        category: 'preparation',
        name: pileName,
        spec: pileSpec,
        quantity: pileType === 'hex_pile_6m' ? result.totalPilesCount : result.totalPileMeters,
        unit: pileType === 'hex_pile_6m' ? 'ต้น' : 'ม.',
        materialUnitPrice: pileUnitMat,
        laborUnitPrice: pileUnitLab,
        wastePercent: 0,
      });

      // ค่าสกัดและตัดแต่งหัวเสาเข็ม
      newItems.push({
        id: `prep-pile-cutoff-${timestamp + 1}`,
        category: 'preparation',
        name: `งานตัดและสกัดแต่งหัวเสาเข็ม คสล. พร้อมดัดเหล็กเดือยฝากฐานราก`,
        spec: `สกัดหัวเข็มลงถึงระดับก้นฐานราก (${result.totalPilesCount} ต้น)`,
        quantity: result.totalPilesCount,
        unit: 'ต้น',
        materialUnitPrice: 0,
        laborUnitPrice: 220,
        wastePercent: 0,
      });
    }

    // 2. งานดินขุดและดินถมกลับ (Earthwork)
    if (includeEarthwork && result.excavationCuM > 0) {
      newItems.push({
        id: `prep-excavation-${timestamp + 2}`,
        category: 'preparation',
        name: `งานขุดดินหลุมฐานรากและร่องคานคอดิน พร้อมขนย้ายดินส่วนเกิน`,
        spec: `ขุดหลุมฐานราก ${result.totalFootingsCount} หลุม ลึก ${excavationDepthM} ม. เผื่อขอบหลุมเข้าแบบ 0.30 ม. รวมร่องคานคอดิน`,
        quantity: result.excavationCuM,
        unit: 'ลบ.ม.',
        materialUnitPrice: 0,
        laborUnitPrice: 110,
        wastePercent: 0,
      });

      newItems.push({
        id: `prep-backfill-${timestamp + 3}`,
        category: 'preparation',
        name: `งานถมดินกลับรอบฐานรากและคานคอดิน พร้อมบดอัดแน่นเป็นชั้นๆ`,
        spec: `ถมดินรอบฐานรากและแนวคานหลังแกะแบบ ป้องกันการทรุดตัวรอบอาคาร`,
        quantity: result.backfillCuM,
        unit: 'ลบ.ม.',
        materialUnitPrice: 0,
        laborUnitPrice: 75,
        wastePercent: 0,
      });
    }

    // 3. ทรายหยาบรองก้นหลุม & คอนกรีตหยาบลีน
    if (includeSandAndLean) {
      if (result.sandBeddingCuM > 0) {
        newItems.push({
          id: `prep-sand-bedding-${timestamp + 4}`,
          category: 'preparation',
          name: `ทรายหยาบรองพื้นก้นหลุมฐานราก (หนา ${sandBeddingThicknessCm} ซม.)`,
          spec: `ปรับระดับก้นหลุมก่อนเทคอนกรีตหยาบ ปริมาตรรวม ${result.sandBeddingCuM} ลบ.ม.`,
          quantity: result.sandBeddingCuM,
          unit: 'ลบ.ม.',
          materialUnitPrice: 480,
          laborUnitPrice: 120,
          wastePercent: 5,
        });
      }

      if (result.leanConcreteCuM > 0) {
        newItems.push({
          id: `prep-lean-concrete-${timestamp + 5}`,
          category: 'preparation',
          name: `คอนกรีตหยาบ 1:3:5 เทรองก้นหลุมฐานราก (หนา ${leanConcreteThicknessCm} ซม.)`,
          spec: `เทรองรับลูกปูนหนุนเหล็กและป้องกันดินเปื้อนเหล็กเสริม ปริมาตรรวม ${result.leanConcreteCuM} ลบ.ม.`,
          quantity: result.leanConcreteCuM,
          unit: 'ลบ.ม.',
          materialUnitPrice: 1750,
          laborUnitPrice: 350,
          wastePercent: 5,
        });
      }
    }

    // ==========================================
    // หมวด 2: งานโครงสร้าง คสล. (structure)
    // ==========================================
    const footingSpecStr = footings.map(f => `${f.code}: ${f.count} ฐาน (${f.widthM}x${f.lengthM}x${f.thicknessM}ม. ${f.barType})`).join(' | ');
    const beamSpecStr = beams.map(b => {
      const extraParts: string[] = [];
      const extraType = b.extraBarType || b.mainBarType;
      if (b.extraTopNearBars) extraParts.push(`หัว ${b.extraTopNearBars}`);
      if (b.extraBottomMidBars) extraParts.push(`กลาง ${b.extraBottomMidBars}`);
      if (b.extraTopFarBars) extraParts.push(`ท้าย ${b.extraTopFarBars}`);
      const extraNote = extraParts.length > 0 ? ` + เสริมพิเศษ(${extraParts.join(',')}-${extraType})` : '';
      return `${b.code}: ${b.totalLengthM}ม. (${b.widthM}x${b.depthM}ม. แกน ${b.mainBarsCount}${b.mainBarType}${extraNote})`;
    }).join(' | ');
    const totalBeamLen = beams.reduce((sum, b) => sum + (b.totalLengthM || 0), 0);

    // 1. คอนกรีตฐานราก
    newItems.push({
      id: `str-footing-conc-${timestamp + 6}`,
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
      id: `str-col-conc-${timestamp + 7}`,
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
      id: `str-beam-conc-${timestamp + 8}`,
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
        id: `str-slab-conc-${timestamp + 9}`,
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
        id: `str-precast-${timestamp + 10}`,
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
        id: `str-wiremesh-${timestamp + 11}`,
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
        id: `str-cast-rebar-${timestamp + 12}`,
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
        id: `str-cast-form-${timestamp + 13}`,
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
        id: `str-db12-${timestamp + 14}`,
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
        id: `str-db16-${timestamp + 15}`,
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

    // 8.1 เหล็ก DB20 (สำหรับคานช่วงยาวพิเศษ/เหล็กเสริมพิเศษ)
    if (result.db20Kg && result.db20Kg > 0) {
      newItems.push({
        id: `str-db20-${timestamp + 151}`,
        category: 'structure',
        name: `เหล็กข้ออ้อย DB20 มอก. SD40 (ความยาว 10 ม.)`,
        spec: `สำหรับโครงสร้างคานช่วงยาวและเหล็กเสริมพิเศษ คำนวณได้ ${result.db20Bars} เส้น (${result.db20Kg} กก.)`,
        quantity: result.db20Kg,
        unit: 'กก.',
        materialUnitPrice: 29.0,
        laborUnitPrice: 7.0,
        wastePercent: 5,
      });
    }

    // 9. แยกปลอกเสา คสล. (Column Ties)
    if (result.colStirrupKg > 0) {
      newItems.push({
        id: `str-col-stirrup-${timestamp + 16}`,
        category: 'structure',
        name: `เหล็กปลอกเสา คสล. (RB6/RB9 SR24)`,
        spec: `ปลอกเสาอาคาร ${totalColumnCount} ต้น รวม ${result.colStirrupPcs} ปลอก (${result.colStirrupBars} เส้น / ${result.colStirrupKg} กก.)`,
        quantity: result.colStirrupKg,
        unit: 'กก.',
        materialUnitPrice: 29,
        laborUnitPrice: 7.5,
        wastePercent: 5,
      });
    }

    // 10. แยกปลอกคาน คสล. (Beam Stirrups)
    if (result.beamStirrupKg > 0) {
      newItems.push({
        id: `str-beam-stirrup-${timestamp + 17}`,
        category: 'structure',
        name: `เหล็กปลอกคาน คสล. (RB6/RB9 SR24)`,
        spec: `ปลอกคานอาคาร (${beams.map(b => b.code).join(', ')}) รวม ${result.beamStirrupPcs} ปลอก (${result.beamStirrupBars} เส้น / ${result.beamStirrupKg} กก.)`,
        quantity: result.beamStirrupKg,
        unit: 'กก.',
        materialUnitPrice: 29,
        laborUnitPrice: 7.5,
        wastePercent: 5,
      });
    }

    // 11. ลวดผูกเหล็ก เบอร์ 18
    if (result.tieWireKg > 0) {
      newItems.push({
        id: `str-tie-wire-${timestamp + 18}`,
        category: 'structure',
        name: `ลวดผูกเหล็ก เบอร์ 18 (Black Annealed Tie Wire)`,
        spec: `สำหรับผูกเหล็กเสริมฐานราก เสา คาน และพื้น คสล. (${result.tieWireKg} กก.)`,
        quantity: result.tieWireKg,
        unit: 'กก.',
        materialUnitPrice: 55,
        laborUnitPrice: 0,
        wastePercent: 0,
      });
    }

    // 12. ไม้แบบหล่อคอนกรีตฐานราก เสา คาน
    const formworkSum = Math.round((result.formworkFootingSqm + result.formworkColumnSqm + result.formworkBeamSqm) * 10) / 10;
    newItems.push({
      id: `str-formwork-${timestamp + 19}`,
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-2xl">apartment</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>คำนวณฐานราก เสาเข็ม ดินขุด และโครงสร้าง คสล.</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {footings.length} ขนาดฟุตติ้ง • {beams.length} ขนาดคาน
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                กำหนดชนิดเสาเข็ม งานดินขุด ฐานราก (F1, F2...) และคาน (B1, B2...) พร้อมแยกปลอกเสา-ปลอกคานอย่างละเอียด
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
          <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('piles_earthwork')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'piles_earthwork' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">agriculture</span>
              <span>0. เสาเข็ม & ดินขุด</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('footing')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'footing' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">foundation</span>
              <span>1. ฐานราก/ฟุตติ้ง ({footings.length} ขนาด)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('beam')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'beam' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">straighten</span>
              <span>2. คาน คสล. ({beams.length} ขนาด)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('column')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'column' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_column</span>
              <span>3. เสาอาคาร ({totalColumnCount} ต้น)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('slab')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'slab' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
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

            {/* 🌟 TAB 0: งานเสาเข็มและดินขุด 🌟 */}
            {activeTab === 'piles_earthwork' && (
              <div className="flex flex-col gap-4">
                {/* ชนิดเสาเข็ม */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">foundation</span> ชนิดของระบบเสาเข็ม / ฐานราก
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={includePiles}
                        onChange={(e) => setIncludePiles(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span>คิดงานเสาเข็ม</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'bored_pile_35', label: 'เข็มเจาะ Ø 0.35 ม.', sub: 'หล่อในที่ 18-22 ม. (กทม./ชิดข้างบ้าน)' },
                      { id: 'driven_pile_i22', label: 'เข็มตอกไอ I-22', sub: 'ปั้นจั่นตอก 16-20 ม.' },
                      { id: 'driven_pile_i18', label: 'เข็มตอกไอ I-18', sub: 'ปั้นจั่นตอก 12-16 ม.' },
                      { id: 'micro_pile_i20', label: 'สปันไมโครไพล์', sub: 'ท่อนละ 1.5ม. ตอกในที่แคบ' },
                      { id: 'hex_pile_6m', label: 'เข็มหกเหลี่ยม 6 ม.', sub: 'ฐานรั้ว/ลานซักล้าง/ดินถม' },
                      { id: 'spread_footing', label: 'ฐานรากแผ่ (ไม่ตอกเข็ม)', sub: 'ดินแข็ง/ต่างจังหวัด/ภูเขา' },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPileType(item.id as FoundationPileType);
                          if (item.id === 'hex_pile_6m') setPileLengthM(6);
                          else if (item.id === 'spread_footing') setPileLengthM(0);
                          else if (pileLengthM <= 6) setPileLengthM(20);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          pileType === item.id 
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-xs">{item.label}</div>
                        <div className="text-[10px] opacity-75 mt-0.5">{item.sub}</div>
                      </button>
                    ))}
                  </div>

                  {pileType !== 'spread_footing' && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">
                          ความลึกเสาเข็ม (เมตร/ต้น)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="35"
                          disabled={pileType === 'hex_pile_6m'}
                          value={pileLengthM}
                          onChange={(e) => setPileLengthM(parseFloat(e.target.value) || 20)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">
                          จำนวนเสาเข็มต่อฐานราก (เฉลี่ย)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="6"
                          value={pilesPerFooting}
                          onChange={(e) => setPilesPerFooting(parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-400 font-mono font-bold text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ดินขุดและดินถมกลับ */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">terrain</span> งานดินขุดฐานราก & ดินถมกลับพร้อมบดอัด
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={includeEarthwork}
                        onChange={(e) => setIncludeEarthwork(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span>คิดงานดินขุด/ถม</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">
                        ความลึกขุดหลุมฐานราก (เมตร)
                      </label>
                      <input
                        type="number"
                        step="0.10"
                        min="0.5"
                        max="5.0"
                        value={excavationDepthM}
                        onChange={(e) => setExcavationDepthM(parseFloat(e.target.value) || 1.50)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">เผื่อขอบหลุมเข้าแบบ 0.30 ม. รอบด้าน</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400">ปริมาตรดินขุดคำนวณได้:</span>
                      <span className="text-base font-bold font-mono text-cyan-400">
                        {result.excavationCuM} <span className="text-xs text-slate-400 font-normal">ลบ.ม. (คิว)</span>
                      </span>
                      <span className="text-[10px] text-slate-500">ดินถมกลับ: {result.backfillCuM} คิว</span>
                    </div>
                  </div>
                </div>

                {/* ทรายรองพื้น & คอนกรีตหยาบ */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">layers</span> ทรายรองก้นหลุม & คอนกรีตหยาบลีน 1:3:5
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={includeSandAndLean}
                        onChange={(e) => setIncludeSandAndLean(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span>คิดทราย + ลีน</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">
                        ความหนาทรายหยาบ (ซม.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={sandBeddingThicknessCm}
                        onChange={(e) => setSandBeddingThicknessCm(parseInt(e.target.value) || 5)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">ได้ {result.sandBeddingCuM} คิว</span>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">
                        ความหนาคอนกรีตหยาบ 1:3:5 (ซม.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={leanConcreteThicknessCm}
                        onChange={(e) => setLeanConcreteThicknessCm(parseInt(e.target.value) || 5)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">ได้ {result.leanConcreteCuM} คิว</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🌟 TAB 1: ฟุตติ้งหลายขนาด (F1, F2, F3...) 🌟 */}
            {activeTab === 'footing' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
                  <span>กำหนดรายการฐานรากแต่ละเบอร์ (กว้าง x ยาว x หนา และเหล็กเสริม):</span>
                  <span className="text-cyan-300 font-mono font-bold">รวมทั้งหลัง: {totalColumnCount} ฐาน</span>
                </div>

                {footings.map((f) => (
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

                    {/* สเปกเหล็กเสริมในฐานราก */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">ขนาดเหล็กเสริม:</label>
                        <select
                          value={f.barType}
                          onChange={(e) => handleUpdateFooting(f.id, { barType: e.target.value as 'DB12' | 'DB16' })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono font-bold"
                        >
                          <option value="DB12">DB12 (ข้ออ้อย 12มม.)</option>
                          <option value="DB16">DB16 (ข้ออ้อย 16มม.)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">ระยะห่าง @ (ม.):</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="0.3"
                          value={f.barSpacingM}
                          onChange={(e) => handleUpdateFooting(f.id, { barSpacingM: parseFloat(e.target.value) || 0.15 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 🌟 TAB 2: คานหลายขนาด (B1, B2, B3...) 🌟 */}
            {activeTab === 'beam' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
                  <span>กำหนดรายการคานแต่ละเบอร์ (ความยาว กว้าง ลึก เหล็กยืน ปลอก):</span>
                  <span className="text-cyan-300 font-mono font-bold">
                    รวมความยาว: {beams.reduce((s, b) => s + (b.totalLengthM || 0), 0)} ม.
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
                          <span className="text-slate-400 text-[11px]">ความยาว:</span>
                          <input
                            type="number"
                            min="1"
                            max="500"
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

                    {/* หน้าตัด กว้าง x ลึก x เหล็กแกน */}
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-850">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">กว้าง (ม.):</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          value={b.widthM}
                          onChange={(e) => handleUpdateBeam(b.id, { widthM: parseFloat(e.target.value) || 0.15 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">ลึก (ม.):</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.2"
                          value={b.depthM}
                          onChange={(e) => handleUpdateBeam(b.id, { depthM: parseFloat(e.target.value) || 0.3 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">เหล็กแกนหลัก (เส้น):</label>
                        <input
                          type="number"
                          min="2"
                          max="16"
                          value={b.mainBarsCount}
                          onChange={(e) => handleUpdateBeam(b.id, { mainBarsCount: parseInt(e.target.value) || 4 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-400 font-mono font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">ขนาดเหล็กแกน:</label>
                        <select
                          value={b.mainBarType}
                          onChange={(e) => handleUpdateBeam(b.id, { mainBarType: e.target.value as 'DB12' | 'DB16' | 'DB20' })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono font-bold"
                        >
                          <option value="DB12">DB12</option>
                          <option value="DB16">DB16</option>
                          <option value="DB20">DB20</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>ระยะห่างเหล็กปลอกคาน @ (ม.):</span>
                      <div className="flex items-center gap-1 w-32">
                        <input
                          type="number"
                          step="0.05"
                          min="0.10"
                          max="0.30"
                          value={b.stirrupSpacingM}
                          onChange={(e) => handleUpdateBeam(b.id, { stirrupSpacingM: parseFloat(e.target.value) || 0.20 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-mono text-center"
                        />
                        <span>ม.</span>
                      </div>
                    </div>

                    {/* 🌟 ส่วนเสริมเหล็กพิเศษ (หัวคาน / กลางคาน / ท้ายคาน) 🌟 */}
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-indigo-500/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-indigo-400">architecture</span>
                          เสริมเหล็กพิเศษตามแบบ (หัวคาน / กลางคาน / ท้ายคาน)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">ขนาดเหล็กพิเศษ:</span>
                          <select
                            value={b.extraBarType || b.mainBarType}
                            onChange={(e) => handleUpdateBeam(b.id, { extraBarType: e.target.value as 'DB12' | 'DB16' | 'DB20' })}
                            className="bg-slate-950 border border-indigo-500/40 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-300"
                          >
                            <option value="DB12">DB12</option>
                            <option value="DB16">DB16</option>
                            <option value="DB20">DB20</option>
                          </select>
                        </div>
                      </div>

                      {/* 3 ช่อง หัว-กลาง-ท้าย */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* 1. หัวคาน (บน) */}
                        <div className="p-2 rounded bg-slate-950 border border-indigo-500/20 flex flex-col gap-1 text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-indigo-300 font-medium">
                            <span>หัวคาน (บน)</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">L/4</span>
                          </div>
                          <span className="text-[9px] text-slate-500">รับโมเมนต์ลบ (-M)</span>
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <input
                              type="number"
                              min="0"
                              max="8"
                              value={b.extraTopNearBars || 0}
                              onChange={(e) => handleUpdateBeam(b.id, { extraTopNearBars: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="w-12 bg-slate-900 border border-indigo-500/40 rounded py-0.5 text-center font-mono font-bold text-amber-300 text-xs"
                            />
                            <span className="text-[10px] text-slate-400">เส้น</span>
                          </div>
                        </div>

                        {/* 2. กลางคาน (ล่าง) */}
                        <div className="p-2 rounded bg-slate-950 border border-emerald-500/20 flex flex-col gap-1 text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-300 font-medium">
                            <span>กลางคาน (ล่าง)</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">0.6L</span>
                          </div>
                          <span className="text-[9px] text-slate-500">รับโมเมนต์บวก (+M)</span>
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <input
                              type="number"
                              min="0"
                              max="8"
                              value={b.extraBottomMidBars || 0}
                              onChange={(e) => handleUpdateBeam(b.id, { extraBottomMidBars: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="w-12 bg-slate-900 border border-emerald-500/40 rounded py-0.5 text-center font-mono font-bold text-amber-300 text-xs"
                            />
                            <span className="text-[10px] text-slate-400">เส้น</span>
                          </div>
                        </div>

                        {/* 3. ท้ายคาน (บน) */}
                        <div className="p-2 rounded bg-slate-950 border border-indigo-500/20 flex flex-col gap-1 text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-indigo-300 font-medium">
                            <span>ท้ายคาน (บน)</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">L/4</span>
                          </div>
                          <span className="text-[9px] text-slate-500">รับโมเมนต์ลบ (-M)</span>
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <input
                              type="number"
                              min="0"
                              max="8"
                              value={b.extraTopFarBars || 0}
                              onChange={(e) => handleUpdateBeam(b.id, { extraTopFarBars: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="w-12 bg-slate-900 border border-indigo-500/40 rounded py-0.5 text-center font-mono font-bold text-amber-300 text-xs"
                            />
                            <span className="text-[10px] text-slate-400">เส้น</span>
                          </div>
                        </div>
                      </div>

                      {/* ปุ่มคลิกด่วน */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 flex-wrap gap-1">
                        <span>พรีเซ็ตด่วน:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateBeam(b.id, { extraTopNearBars: 2, extraBottomMidBars: 1, extraTopFarBars: 2 })}
                            className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 transition text-[10px]"
                            title="เสริมหัว 2, กลาง 1, ท้าย 2"
                          >
                            หัว 2 / กลาง 1 / ท้าย 2
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateBeam(b.id, { extraTopNearBars: 2, extraBottomMidBars: 2, extraTopFarBars: 2 })}
                            className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 transition text-[10px]"
                            title="เสริมหัว 2, กลาง 2, ท้าย 2"
                          >
                            หัว 2 / กลาง 2 / ท้าย 2
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateBeam(b.id, { extraTopNearBars: 0, extraBottomMidBars: 0, extraTopFarBars: 0 })}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-[10px]"
                            title="ล้างเหล็กพิเศษเป็น 0"
                          >
                            ล้างเป็น 0
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: เสาอาคาร */}
            {activeTab === 'column' && (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">view_column</span> ขนาดและเหล็กเสริมเสาอาคาร
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    จำนวนเสาอ้างอิงจากฐานราก: <strong className="text-amber-400 font-mono">{totalColumnCount} ต้น</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ความกว้างเสา (ม.)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.15"
                      value={columnWidthM}
                      onChange={(e) => setColumnWidthM(parseFloat(e.target.value) || 0.20)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ความลึกเสา (ม.)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.15"
                      value={columnDepthM}
                      onChange={(e) => setColumnDepthM(parseFloat(e.target.value) || 0.20)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ความสูงเสาเฉลี่ย (ม.)</label>
                    <input
                      type="number"
                      step="0.10"
                      min="2.0"
                      value={columnHeightM}
                      onChange={(e) => setColumnHeightM(parseFloat(e.target.value) || 3.50)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">ขนาดเหล็กยืนเสา</label>
                    <select
                      value={columnMainBarType}
                      onChange={(e) => setColumnMainBarType(e.target.value as 'DB12' | 'DB16')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold"
                    >
                      <option value="DB12">DB12 (ข้ออ้อย 12มม.)</option>
                      <option value="DB16">DB16 (ข้ออ้อย 16มม.)</option>
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

                  {slabType === 'hybrid' && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">แผ่นสำเร็จรูป (ตร.ม.)</label>
                        <input
                          type="number"
                          value={precastAreaSqm}
                          onChange={(e) => setPrecastAreaSqm(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">หล่อในที่ (ห้องน้ำ/ระเบียง)</label>
                        <input
                          type="number"
                          value={castInPlaceAreaSqm}
                          onChange={(e) => setCastInPlaceAreaSqm(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">ความหนา Topping (ซม.)</label>
                      <input
                        type="number"
                        min="4"
                        max="10"
                        value={toppingThicknessCm}
                        onChange={(e) => setToppingThicknessCm(parseInt(e.target.value) || 5)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">Wire Mesh ลวด</label>
                      <select
                        value={wireMeshDiameterMm}
                        onChange={(e) => setWireMeshDiameterMm(parseInt(e.target.value) as 4 | 6)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      >
                        <option value={4}>Ø 4 มม. @ 0.20 ม.</option>
                        <option value={6}>Ø 6 มม. @ 0.20 ม.</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Result Column (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* สรุปคอนกรีตรวม & เหล็กเสริม */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">คอนกรีตโครงสร้างรวม</span>
                <span className="text-lg font-bold font-mono text-cyan-400">{result.totalConcreteCuM}</span>
                <span className="text-xs text-slate-500 ml-1">คิว</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">เหล็กข้ออ้อยรวม (DB)</span>
                <span className="text-lg font-bold font-mono text-amber-400">
                  {(result.db12Kg + result.db16Kg + (result.db20Kg || 0)).toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 ml-1">กก.</span>
              </div>
            </div>

            {/* รายการแจกแจงแยกเบอร์ */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3 text-xs flex-1">
              <span className="font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
                <span>สรุปปริมาณแยกหมวด (Takeoff Summary)</span>
                <span className="text-[10px] font-mono text-slate-400">คิว / กก. / ต้น</span>
              </span>

              {/* สรุปงานดินและเสาเข็ม */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">agriculture</span> งานเสาเข็มและดินขุด:
                </span>
                {pileType !== 'spread_footing' && (
                  <div className="flex justify-between items-center text-[11px] text-slate-300 pl-2">
                    <span>• เสาเข็ม ({result.totalPilesCount} ต้น):</span>
                    <span className="font-mono font-semibold text-white">
                      {result.totalPileMeters} ม. (฿{(result.pileMaterialCost + result.pileLaborCost).toLocaleString()})
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[11px] text-slate-300 pl-2">
                  <span>• ดินขุด & ถมกลับ:</span>
                  <span className="font-mono font-semibold text-white">
                    ขุด {result.excavationCuM} / ถม {result.backfillCuM} คิว
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-300 pl-2">
                  <span>• ทรายรอง & ลีน 1:3:5:</span>
                  <span className="font-mono font-semibold text-white">
                    ทราย {result.sandBeddingCuM} / ลีน {result.leanConcreteCuM} คิว
                  </span>
                </div>
              </div>

              {/* ฐานรากแยกเบอร์ */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-850">
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
                  <div key={b.code} className="flex flex-col gap-0.5 pl-2 py-1 rounded bg-slate-950/40 border border-slate-850/60">
                    <div className="flex justify-between items-center text-[11px] text-slate-300">
                      <span className="font-semibold text-white">• {b.code} ({b.lengthM} ม.):</span>
                      <span className="font-mono font-semibold text-cyan-300">
                        {b.concreteCuM} คิว | {b.steelKg} กก.
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                      <span>{b.mainBarsStr}</span>
                      {b.extraBarsStr && (
                        <span className="text-amber-400 font-sans font-medium text-[9px] bg-amber-950/40 px-1 py-0.2 rounded border border-amber-500/30">
                          {b.extraBarsStr}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* สรุปเหล็กเส้นแยกปลอกเสาและปลอกคาน */}
              <div className="flex flex-col gap-1 pt-2 border-t border-slate-850">
                <span className="text-[11px] font-bold text-amber-400">เหล็กเสริม & เหล็กปลอกแยกเฉพาะ:</span>
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
                {result.db20Kg && result.db20Kg > 0 ? (
                  <div className="flex justify-between text-[11px] text-cyan-300 pl-2 font-mono">
                    <span>• เหล็ก DB20 (คานพิเศษ):</span>
                    <span>{result.db20Bars} เส้น ({result.db20Kg.toLocaleString()} กก.)</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-[11px] text-cyan-300 pl-2 font-mono">
                  <span>• ปลอกเสา (RB6/9):</span>
                  <span>{result.colStirrupPcs} ปลอก ({result.colStirrupBars} เส้น / {result.colStirrupKg} กก.)</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-300 pl-2 font-mono">
                  <span>• ปลอกคาน (RB6/9):</span>
                  <span>{result.beamStirrupPcs} ปลอก ({result.beamStirrupBars} เส้น / {result.beamStirrupKg} กก.)</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pl-2 font-mono">
                  <span>• ลวดผูกเหล็ก #18:</span>
                  <span>{result.tieWireKg} กก.</span>
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
            ระบบจะนำรายการเสาเข็ม งานดินขุด ทราย-ลีน คอนกรีต ไม้แบบ และเหล็กเส้นแยกปลอกเสา-คาน เข้าตาราง BOQ ทันที
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
