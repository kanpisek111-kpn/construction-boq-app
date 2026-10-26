import React, { useState, useMemo } from 'react';
import { RoofStyle, RoofMaterialType, RoofCalculationParams, BOQItem, FasciaType, BirdStopType, RoofInsulationType } from '../types';
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
  const [insulationType, setInsulationType] = useState<RoofInsulationType>('none');
  const [rafterSpacingM, setRafterSpacingM] = useState<number>(1.0);

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
      insulationType,
      rafterSpacingM,
    };
    return calculateRoofMaterials(params);
  }, [style, baseWidthM, baseLengthM, overhangM, pitchDeg, materialType, purlinSpacingM, includeFascia, fasciaType, includeBirdStop, birdStopType, insulationType, rafterSpacingM]);

  if (!isOpen) return null;

  const handleApply = () => {
    const timestamp = Date.now();
    const generatedItems: BOQItem[] = [];

    // 1. เหล็กอะเส (Wall Plate)
    if (result.wallPlateBars > 0) {
      generatedItems.push({
        id: `roof-gen-wallplate-${timestamp}`,
        category: 'roof',
        name: 'เหล็กอะเสรอบตัวบ้าน C-125x50x20x3.2 มม. หรือ C-150 (ท่อนละ 6.00 ม.)',
        spec: `ความยาวอะเสรวม ${Math.round(result.wallPlateBars * 6)} ม. (${result.wallPlateBars} ท่อน @ 6ม.) ยึดเสา คสล. ด้วย J-Bolt / พุกเหล็ก`,
        quantity: result.wallPlateBars,
        unit: 'ท่อน',
        materialUnitPrice: 680,
        laborUnitPrice: 140,
        wastePercent: 5,
      });
    }

    // 2. เหล็กจันทัน (Rafters) - แก้ไขคำนวณเต็มช่วงลาดเอียงและจำนวนแถวตามแนวยาว
    if (result.rafterBars > 0) {
      const rafterName = `เหล็กจันทัน ${result.steelSpecDesc || 'C-100x50x20x2.3 มม.'} (ระยะห่าง @ ${rafterSpacingM} ม.)`;
      const rafterSpec = style === 'lean_to'
        ? `เพิงหมาแหงน พาดเต็มช่วงลาดเอียง ${result.rafterLengthM || 0} ม. รวม ${result.rafterCount || 0} แนว (@ ${rafterSpacingM}ม.) รวมสั่ง ${result.rafterBars} ท่อน @ 6ม.`
        : `ลาดเอียง ${pitchDeg}° รวม ${result.rafterCount || 0} แนว (สั่ง ${result.rafterBars} ท่อน @ 6ม.)`;

      generatedItems.push({
        id: `roof-gen-rafter-${timestamp + 1}`,
        category: 'roof',
        name: rafterName,
        spec: rafterSpec,
        quantity: result.rafterBars,
        unit: 'ท่อน',
        materialUnitPrice: materialType === 'cpac' ? 620 : materialType === 'concrete_tile' ? 550 : 490,
        laborUnitPrice: 120,
        wastePercent: 6,
      });
    }

    // 🌟 2.5 เหล็กอะเสกลาง / คานซอยรับจันทัน (Intermediate Support Beam)
    if (result.intermediateBeamBars && result.intermediateBeamBars > 0) {
      generatedItems.push({
        id: `roof-gen-intermediate-beam-${timestamp + 12}`,
        category: 'roof',
        name: 'เหล็กอะเสกลาง/คานซอยรับจันทัน C-125 หรือ 2C-100 พร้อมเสาค้ำยัน',
        spec: `ช่วงกว้างอาคาร ${baseWidthM} ม. (> 4.5 ม.) วิศวกรรมกำหนดเพิ่มอะเสกลางป้องกันจันทันแอ่นตัว (Deflection) ความยาวรวม ${result.intermediateBeamM} ม. (${result.intermediateBeamBars} ท่อน @ 6ม.)`,
        quantity: result.intermediateBeamBars,
        unit: 'ท่อน',
        materialUnitPrice: 680,
        laborUnitPrice: 140,
        wastePercent: 5,
      });
    }

    // 3. เหล็กอกไก่และดั้ง/ค้ำยัน (Ridge Beam & King Post)
    const ridgeAndPostBars = result.ridgeBeamBars + result.kingPostBars;
    if (ridgeAndPostBars > 0) {
      const kingPostName = style === 'lean_to'
        ? 'เหล็กเสาดั้งยกสโลปเพิงแหงนและท้าวแขนค้ำยันรับแรงลม (King Post & Wind Bracing)'
        : 'เหล็กอกไก่และดั้งรับสันหลังคา C-125/C-150 หรือ 2C ประกบคู่ พร้อมค้ำยัน';
      const kingPostSpec = style === 'lean_to'
        ? `เสาดั้งยกสโลปเต็มช่วงกว้างสูง ${result.slopeRiseHeightM || 0} ม. พร้อมท้าวแขนค้ำยันรับลมโยก (${ridgeAndPostBars} ท่อน @ 6ม.)`
        : `แนวสันอกไก่ยาว ${result.ridgeTilesM} ม. รวมดั้งและท้าวแขนค้ำยัน (${ridgeAndPostBars} ท่อน @ 6ม.)`;

      generatedItems.push({
        id: `roof-gen-ridgebeam-${timestamp + 2}`,
        category: 'roof',
        name: kingPostName,
        spec: kingPostSpec,
        quantity: ridgeAndPostBars,
        unit: 'ท่อน',
        materialUnitPrice: 650,
        laborUnitPrice: 150,
        wastePercent: 5,
      });
    }

    // 4. แปสำเร็จรูปกัลวาไนซ์ (Purlins) - พร้อมเผื่อระยะทาบต่อ 25 ซม. เหนือจันทัน
    if (result.purlin_bars > 0) {
      const purlinSpec = `แปกัลวาไนซ์สำเร็จรูป ${result.purlinRowsCount ? 'จำนวน ' + result.purlinRowsCount + ' แถว ' : ''}ระยะแป @ ${purlinSpacingM} ม. (เผื่อระยะทาบต่อ 25 ซม. เหนือจันทันทุกช่วง 6.00 ม.) รวมสั่ง ${result.purlin_bars} ท่อน @ 6ม.`;

      generatedItems.push({
        id: `roof-gen-purlin-${timestamp + 3}`,
        category: 'roof',
        name: 'แปกัลวาไนซ์สำเร็จรูป ป้องกันสนิม (ท่อนละ 6.00 ม.)',
        spec: purlinSpec,
        quantity: result.purlin_bars,
        unit: 'ท่อน',
        materialUnitPrice: 195,
        laborUnitPrice: 45,
        wastePercent: 5,
      });
    }

    // 5. วัสดุมุงหลังคา (Roof Sheets / Tiles)
    const roofSheetName = materialType === 'metal_sheet'
      ? 'แผ่นหลังคาเมทัลชีทเคลือบสีอลูซิงค์ (AZ-150) หนา 0.35-0.40 มม. มอก.'
      : materialType === 'cpac'
      ? 'กระเบื้องหลังคาคอนกรีตแผ่นเรียบ/ซีแพคโมเนีย ตราช้าง/SCG มอก.'
      : 'กระเบื้องหลังคาคอนกรีตลอนคู่ มอก.';

    generatedItems.push({
      id: `roof-gen-sheet-${timestamp + 4}`,
      category: 'roof',
      name: roofSheetName,
      spec: `พื้นที่ผิวลาดเอียง ${result.effectiveRoofAreaSqm} ตร.ม. (องศา ${pitchDeg}°) คำนวณเผื่อซ้อนทับและเศษวัสดุ`,
      quantity: result.effectiveRoofAreaSqm,
      unit: 'ตร.ม.',
      materialUnitPrice: materialType === 'metal_sheet' ? 240 : 380,
      laborUnitPrice: materialType === 'metal_sheet' ? 85 : 140,
      wastePercent: 6,
    });

    // 6. ครอบสันหลังคาและครอบตะเฆ่สัน (Ridge & Hip Caps)
    if (result.ridgeTilesM > 0) {
      const capName = materialType === 'metal_sheet'
        ? 'แฟลชชิ่งครอบสันจั่ว/ครอบข้างเมทัลชีท พับขึ้นรูปสีเดียวกับหลังคา'
        : 'กระเบื้องครอบสันโค้ง/ครอบตะเข้สัน SCG ซีแพคโมเนีย พร้อมอุปกรณ์ยึด';

      generatedItems.push({
        id: `roof-gen-ridgecap-${timestamp + 5}`,
        category: 'roof',
        name: capName,
        spec: `ความยาวแนวสันหลังคาและตะเฆ่สันรวม ${result.ridgeTilesM} ม.`,
        quantity: result.ridgeTilesM,
        unit: 'ม.',
        materialUnitPrice: materialType === 'metal_sheet' ? 120 : 190,
        laborUnitPrice: materialType === 'metal_sheet' ? 45 : 75,
        wastePercent: 5,
      });
    }

    // 7. ระบบครอบแห้ง Dry Ridge System (สำหรับกระเบื้องคอนกรีต/ซีแพค)
    if (result.dryRidgeRolls > 0 && (materialType === 'concrete_tile' || materialType === 'cpac')) {
      generatedItems.push({
        id: `roof-gen-dryridge-${timestamp + 6}`,
        category: 'roof',
        name: 'แผ่นปิดรอยต่อกันรั่วระบบครอบแห้ง (Dry Ridge System / ม้วนละ 3.00 ม.)',
        spec: `แผ่นบิวทิลพร้อมแถบกาวกันน้ำ ทน UV ยึดใต้ครอบสันหลังคา ${result.dryRidgeRolls} ม้วน (ไม่ต้องใช้ปูนปั้น ไม่แตกร้าว)`,
        quantity: result.dryRidgeRolls,
        unit: 'ม้วน',
        materialUnitPrice: 750,
        laborUnitPrice: 150,
        wastePercent: 0,
      });
    }

    // 8. รางน้ำตะเฆ่รางสแตนเลส (Valley Gutter) สำหรับทรงปั้นหยา
    if (result.valleyGutterM > 0 && style === 'hip') {
      generatedItems.push({
        id: `roof-gen-valleygutter-${timestamp + 7}`,
        category: 'roof',
        name: 'รางน้ำตะเฆ่รางสแตนเลส เกรด 304 หนา 0.5 มม. พับปีกกันน้ำย้อน',
        spec: `ความยาวตะเฆ่รางรับน้ำฝน ${result.valleyGutterM} ม. ป้องกันน้ำรั่วซึมเข้าร่องหักหลังคา`,
        quantity: result.valleyGutterM,
        unit: 'ม.',
        materialUnitPrice: 450,
        laborUnitPrice: 120,
        wastePercent: 5,
      });
    }

    // 9. สกรูยึดหลังคาปลายสว่านหัวหกเหลี่ยม + ยาง EPDM
    if (result.roofScrewsPcs > 0) {
      const screwBoxes = Math.ceil(result.roofScrewsPcs / 100);
      generatedItems.push({
        id: `roof-gen-screws-${timestamp + 8}`,
        category: 'roof',
        name: 'สกรูปลายสว่านหัวหกเหลี่ยม พร้อมแหวนยาง EPDM กันรั่วซึม (กล่อง 100 ตัว)',
        spec: `จำนวน ${result.roofScrewsPcs} ตัว (${screwBoxes} กล่อง) ผ่านมาตรฐานการทดสอบการรั่วซึม มอก.`,
        quantity: screwBoxes,
        unit: 'กล่อง',
        materialUnitPrice: 140,
        laborUnitPrice: 30,
        wastePercent: 5,
      });
    }

    // 10. ฉนวนกันความร้อน (ถ้าเลือก)
    if (insulationType !== 'none' && result.insulationSqm > 0) {
      const insName = insulationType === 'pu_foam_1in'
        ? 'ฉนวนกันความร้อนโพลียูรีเทนโฟม (PU Foam) หนา 1 นิ้ว เคลือบฟอยล์สะท้อนความร้อน'
        : insulationType === 'pe_foam_5mm'
        ? 'ฉนวนกันความร้อน PE Foam หนา 5 มม. ติดใต้แผ่นหลังคา'
        : insulationType === 'stay_cool_75mm'
        ? 'ฉนวนใยแก้วกันความร้อน SCG Stay Cool หนา 75 มม. (3 นิ้ว) วางเหนือฝ้าเพดาน'
        : 'ฉนวนใยแก้วกันความร้อน SCG Stay Cool หนา 150 มม. (6 นิ้ว) วางเหนือฝ้าเพดาน';

      const insMat = insulationType === 'pu_foam_1in' ? 180 : insulationType === 'pe_foam_5mm' ? 65 : insulationType === 'stay_cool_75mm' ? 145 : 260;
      const insLab = insulationType === 'pu_foam_1in' ? 45 : insulationType === 'pe_foam_5mm' ? 25 : insulationType === 'stay_cool_75mm' ? 35 : 45;

      generatedItems.push({
        id: `roof-gen-insulation-${timestamp + 9}`,
        category: 'roof',
        name: insName,
        spec: `พื้นที่ติดตั้ง ${result.insulationSqm} ตร.ม. ช่วยลดความร้อนเข้าสู่ตัวบ้านและลดเสียงฝนตกกระทบ`,
        quantity: result.insulationSqm,
        unit: 'ตร.ม.',
        materialUnitPrice: insMat,
        laborUnitPrice: insLab,
        wastePercent: 5,
      });
    }

    // 11. ไม้เชิงชาย (ถ้าเลือก)
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
        id: `roof-gen-fascia-${timestamp + 10}`,
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

    // 12. แผ่นปิดกันนก (ถ้าเลือก)
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
        id: `roof-gen-birdstop-${timestamp + 11}`,
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

            {/* ฉนวนกันความร้อน */}
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-medium">ฉนวนกันความร้อน (Roof Insulation)</label>
              <select
                value={insulationType}
                onChange={(e) => setInsulationType(e.target.value as RoofInsulationType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="none">ไม่ใส่ฉนวนกันความร้อน</option>
                <option value="pu_foam_1in">PU Foam หนา 1 นิ้ว (ฉีดพ่นใต้แผ่น / ติดสำเร็จรูป ลดเสียงฝนดีเยี่ยม)</option>
                <option value="pe_foam_5mm">PE Foam หนา 5 มม. ติดใต้หลังคาเมทัลชีท (ประหยัด)</option>
                <option value="stay_cool_75mm">ฉนวนใยแก้ว SCG Stay Cool หนา 75 มม. (3 นิ้ว) ปูบนฝ้า</option>
                <option value="stay_cool_150mm">ฉนวนใยแก้ว SCG Stay Cool หนา 150 มม. (6 นิ้ว) ปูบนฝ้า (กันร้อนสูงสุด)</option>
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
                
                {/* 🌟 ป้ายมาตรฐานวิศวกรรม: เกรดเหล็กและน้ำหนักบรรทุก (Point 6) */}
                <div className="p-2.5 bg-slate-900/90 border border-amber-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5">
                  <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                    <span className="material-symbols-outlined text-sm text-amber-400">verified</span>
                    <span>เกรดเหล็กรับน้ำหนัก: <strong className="text-white">{result.steelSpecDesc}</strong></span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    ค้ำยัน/ขื่อยึด {result.bracingPercent}% ({materialType === 'metal_sheet' ? '~5 กก./ตร.ม.' : materialType === 'concrete_tile' ? '~15 กก./ตร.ม.' : '~45 กก./ตร.ม.'})
                  </span>
                </div>

                {/* 1. เหล็กอะเส */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span className="text-slate-300 font-medium">เหล็กอะเสรอบบ้าน C-125/C-150:</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-cyan-300 mr-1">{result.wallPlateBars} ท่อน</span>
                    <span className="text-slate-500 font-mono text-[10px]">(@ 6ม. เผื่อเข้ามุม)</span>
                  </div>
                </div>

                {/* 2. เหล็กจันทัน - Point 1 & 2 */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      <span className="text-slate-300 font-medium">เหล็กจันทัน (@ {rafterSpacingM}ม.):</span>
                    </div>
                    <span className="text-[10px] text-slate-500 ml-4">
                      {style === 'lean_to' 
                        ? `พาดเต็มช่วงลาดเอียง ${result.rafterLengthM} ม. x ${result.rafterCount} แนว` 
                        : `ยาวช่วงละ ${result.rafterLengthM} ม. x ${result.rafterCount} แนว`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-blue-300 mr-1">{result.rafterBars} ท่อน</span>
                    <span className="text-slate-500 font-mono text-[10px]">(@ 6ม.)</span>
                  </div>
                </div>

                {/* 🌟 2.5 อะเสกลาง / คานซอยรับจันทัน (Point 3) */}
                {result.intermediateBeamBars && result.intermediateBeamBars > 0 ? (
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-850 bg-cyan-950/20 px-2 rounded">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        <span className="text-cyan-200 font-medium">อะเสกลาง / คานซอยรับจันทัน (สแปน {baseWidthM}ม. &gt; 4.5ม.):</span>
                      </div>
                      <span className="text-[10px] text-cyan-400/80 ml-4">
                        คานยาวรวม {result.intermediateBeamM} ม. พร้อมเสาดั้งค้ำยัน (ป้องกันจันทันแอ่นตัว Deflection)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-cyan-300 mr-1">{result.intermediateBeamBars} ท่อน</span>
                      <span className="text-slate-500 font-mono text-[10px]">(@ 6ม.)</span>
                    </div>
                  </div>
                ) : null}

                {/* 3. เหล็กอกไก่ ดั้ง และค้ำยัน - Point 4 */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                      <span className="text-slate-300 font-medium">{style === 'lean_to' ? 'เสาดั้งยกสโลป & ท้าวแขนค้ำยันรับลม:' : 'เหล็กอกไก่ & ดั้ง & ค้ำยัน:'}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 ml-4">
                      {style === 'lean_to' ? `คำนวณยกสโลปเต็มช่วงกว้างสูง ${result.slopeRiseHeightM} ม. พร้อมค้ำยันรับลม` : `รวมดั้งสูง ${result.slopeRiseHeightM} ม. และท้าวแขน`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-indigo-300 mr-1">{result.ridgeBeamBars + result.kingPostBars} ท่อน</span>
                    <span className="text-slate-500 font-mono text-[10px]">(@ 6ม.)</span>
                  </div>
                </div>

                {/* 4. แปหลังคา - Point 5 */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span className="text-slate-300 font-medium">แปกัลวาไนซ์ / แปโอเมก้า (@ {purlinSpacingM} ม.):</span>
                    </div>
                    <span className="text-[10px] text-slate-500 ml-4">
                      {result.purlinRowsCount ? `จำนวน ${result.purlinRowsCount} แถว ` : ''}(เผื่อระยะทาบต่อ 25 ซม. เหนือจันทันทุก 6.00 ม.)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-300">{result.purlin_bars} ท่อน</span>
                    <span className="text-slate-500 font-mono text-[10px] ml-1">(@ 6ม.)</span>
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

                {/* 🌟 7. ระบบครอบแห้ง Dry Ridge (สำหรับกระเบื้อง) 🌟 */}
                {result.dryRidgeRolls > 0 && (materialType === 'concrete_tile' || materialType === 'cpac') && (
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span className="text-slate-300 font-medium">แผ่นปิดรอยต่อครอบแห้ง Dry Ridge:</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-amber-300 mr-1">{result.dryRidgeRolls} ม้วน</span>
                      <span className="text-slate-500 font-mono text-[10px]">(ม้วนละ 3 ม. ฿{result.dryRidgeCost.toLocaleString()})</span>
                    </div>
                  </div>
                )}

                {/* 🌟 8. รางน้ำตะเฆ่รางสแตนเลส (ทรงปั้นหยา) 🌟 */}
                {result.valleyGutterM > 0 && style === 'hip' && (
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                      <span className="text-slate-300 font-medium">รางน้ำตะเฆ่รางสแตนเลส 304 หนา 0.5มม.:</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-teal-300 mr-1">{result.valleyGutterM} ม.</span>
                      <span className="text-slate-500 font-mono text-[10px]">(฿{result.valleyGutterCost.toLocaleString()})</span>
                    </div>
                  </div>
                )}

                {/* 🌟 9. สกรูยึดหลังคา EPDM 🌟 */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span className="text-slate-300 font-medium">สกรูปลายสว่านหัวหกเหลี่ยม + ยาง EPDM:</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-purple-300 mr-1">{result.roofScrewsPcs} ตัว</span>
                    <span className="text-slate-500 font-mono text-[10px]">({Math.ceil(result.roofScrewsPcs / 100)} กล่อง)</span>
                  </div>
                </div>

                {/* 🌟 10. ฉนวนกันความร้อน 🌟 */}
                {insulationType !== 'none' && result.insulationSqm > 0 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-850">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                      <span className="text-slate-300 font-medium">ฉนวนกันความร้อน ({insulationType === 'pu_foam_1in' ? 'PU โฟม 1 นิ้ว' : insulationType === 'pe_foam_5mm' ? 'PE โฟม 5มม.' : 'Stay Cool ใยแก้ว'}):</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-pink-300 mr-1">{result.insulationSqm} ตร.ม.</span>
                      <span className="text-slate-500 font-mono text-[10px]">(฿{(result.insulationMaterialCost + result.insulationLaborCost).toLocaleString()})</span>
                    </div>
                  </div>
                )}

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
