import React, { useState, useMemo } from 'react';
import { BOQItem, ConstructionCategory, FoundationPileType } from '../types';

interface QuickBOQWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBOQ: (newItems: BOQItem[], projectName: string, houseAreaSqm: number) => void;
  currentHouseAreaSqm?: number;
}

type BuildingArchetype = 'modern_1fl' | 'contemporary_2fl' | 'nordic_minimal' | 'commercial_shophouse' | 'home_extension';
type QualityGrade = 'economy' | 'standard' | 'premium';
type RoofArchetype = 'lean_to' | 'gable' | 'hip' | 'nordic';

export const QuickBOQWizardModal: React.FC<QuickBOQWizardModalProps> = ({
  isOpen,
  onClose,
  onApplyBOQ,
  currentHouseAreaSqm = 120
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Building Archetype & Size
  const [archetype, setArchetype] = useState<BuildingArchetype>('contemporary_2fl');
  const [areaSqm, setAreaSqm] = useState<number>(currentHouseAreaSqm || 140);
  const [widthM, setWidthM] = useState<number>(10);
  const [lengthM, setLengthM] = useState<number>(14);
  const [floors, setFloors] = useState<1 | 2 | 3>(2);
  const [customName, setCustomName] = useState<string>('บ้านพักอาศัย คสล. 2 ชั้น สไตล์ร่วมสมัย');

  // Step 2: Foundation & Roof System
  const [pileType, setPileType] = useState<FoundationPileType>('bored_pile_35');
  const [roofType, setRoofType] = useState<RoofArchetype>('hip');

  // Step 3: Material Quality Grade
  const [grade, setGrade] = useState<QualityGrade>('standard');
  const [includeFenceAndCarport, setIncludeFenceAndCarport] = useState<boolean>(true);

  // Auto update dimensions when archetype changes
  const handleSelectArchetype = (type: BuildingArchetype) => {
    setArchetype(type);
    if (type === 'modern_1fl') {
      setFloors(1);
      setAreaSqm(100);
      setWidthM(8);
      setLengthM(12.5);
      setRoofType('lean_to');
      setPileType('driven_pile_i22');
      setCustomName('บ้านเดี่ยวโมเดิร์น 1 ชั้น (Modern 1-Storey)');
    } else if (type === 'contemporary_2fl') {
      setFloors(2);
      setAreaSqm(160);
      setWidthM(10);
      setLengthM(16);
      setRoofType('hip');
      setPileType('bored_pile_35');
      setCustomName('บ้านพักอาศัย คสล. 2 ชั้น สไตล์ร่วมสมัย (Contemporary)');
    } else if (type === 'nordic_minimal') {
      setFloors(1);
      setAreaSqm(120);
      setWidthM(8);
      setLengthM(15);
      setRoofType('nordic');
      setPileType('bored_pile_35');
      setCustomName('บ้านสไตล์นอร์ดิก มินิมอล (Nordic Minimal House)');
    } else if (type === 'commercial_shophouse') {
      setFloors(3);
      setAreaSqm(240);
      setWidthM(4.5);
      setLengthM(18);
      setRoofType('lean_to');
      setPileType('bored_pile_35');
      setCustomName('อาคารพาณิชย์ คสล. 3 ชั้น (Commercial Shophouse)');
    } else if (type === 'home_extension') {
      setFloors(1);
      setAreaSqm(35);
      setWidthM(5);
      setLengthM(7);
      setRoofType('lean_to');
      setPileType('hex_pile_6m');
      setCustomName('งานต่อเติมห้องครัวหลังบ้าน & โรงจอดรถ คสล.');
    }
  };

  // Real-time calculation generator
  const generatedBOQ = useMemo(() => {
    const ts = Date.now();
    const items: BOQItem[] = [];
    const A = areaSqm;

    // Multipliers based on grade
    const matMul = grade === 'economy' ? 0.85 : grade === 'premium' ? 1.35 : 1.0;
    const labMul = grade === 'economy' ? 0.90 : grade === 'premium' ? 1.20 : 1.0;

    // Estimated quantities
    const colCount = Math.max(6, Math.ceil(A / 10));
    const concVol = Math.round(A * 0.35 * (floors === 2 ? 1.15 : floors === 3 ? 1.30 : 1.0) * 10) / 10;
    const rebarKg = Math.round(concVol * 115);
    const formworkSqm = Math.round(concVol * 8.5);

    // 1. หมวดเตรียมการและเสาเข็ม
    items.push({
      id: `wiz-prep-1-${ts}`,
      category: 'preparation',
      name: 'ปรับระดับดิน เคลียร์พื้นที่หน้างาน และวางผังอาคาร',
      spec: `พื้นที่โครงการ ${A} ตร.ม. พร้อมวางผังดิ่งฉากและแนวเขตที่ดิน`,
      quantity: A,
      unit: 'ตร.ม.',
      materialUnitPrice: 0,
      laborUnitPrice: 45,
      wastePercent: 0,
    });

    if (pileType !== 'spread_footing') {
      const pileLen = pileType === 'hex_pile_6m' ? 6 : pileType === 'bored_pile_35' ? 20 : 18;
      const totalPiles = colCount * (floors > 1 ? 2 : 1);
      const pilePriceMat = pileType === 'bored_pile_35' ? 650 : pileType === 'driven_pile_i22' ? 280 : 380 / 6;
      const pilePriceLab = pileType === 'bored_pile_35' ? 280 : pileType === 'driven_pile_i22' ? 95 : 120 / 6;

      items.push({
        id: `wiz-prep-pile-${ts}`,
        category: 'preparation',
        name: pileType === 'bored_pile_35' 
          ? `งานเสาเข็มเจาะ Ø 0.35 ม. ลึก ${pileLen} ม. เทคอนกรีต คสล.` 
          : pileType === 'driven_pile_i22'
          ? `เสาเข็มคอนกรีตอัดแรงรูปตัวไอ I-22 (ความยาว ${pileLen} ม.) ตอกด้วยปั้นจั่น`
          : `เสาเข็มหกเหลี่ยมกลวง 6.0 ม. ตอก/กดด้วยรถแบ็คโฮ`,
        spec: `จำนวน ${totalPiles} ต้น x ${pileLen} ม. = ${totalPiles * pileLen} เมตร`,
        quantity: totalPiles * pileLen,
        unit: 'ม.',
        materialUnitPrice: Math.round(pilePriceMat),
        laborUnitPrice: Math.round(pilePriceLab),
        wastePercent: 0,
      });

      items.push({
        id: `wiz-prep-cutoff-${ts}`,
        category: 'preparation',
        name: 'งานสกัดและตัดแต่งหัวเสาเข็ม คสล. พร้อมดัดเหล็กเดือย',
        spec: `จำนวน ${totalPiles} ต้น ลงถึงระดับท้องฐานราก`,
        quantity: totalPiles,
        unit: 'ต้น',
        materialUnitPrice: 0,
        laborUnitPrice: 220,
        wastePercent: 0,
      });
    }

    const footingArea = colCount * 1.0;
    items.push({
      id: `wiz-prep-sand-lean-${ts}`,
      category: 'preparation',
      name: 'ทรายหยาบ + ลีนคอนกรีต 1:3:5 หนา 10 ซม. รองก้นหลุมฐานราก',
      spec: `สำหรับฐานราก ${colCount} หลุม ปริมาตรรวม ${Math.round(footingArea * 0.10 * 10) / 10} คิว`,
      quantity: Math.max(1.5, Math.round(footingArea * 0.10 * 10) / 10),
      unit: 'ลบ.ม.',
      materialUnitPrice: 1850,
      laborUnitPrice: 350,
      wastePercent: 5,
    });

    items.push({
      id: `wiz-prep-util-${ts}`,
      category: 'preparation',
      name: 'งานสาธารณูปโภคชั่วคราว (มิเตอร์ไฟฟ้าชั่วคราว + มิเตอร์น้ำประปาชั่วคราว + สุขาคนงาน)',
      spec: 'พร้อมตู้เมนเบรกเกอร์ ปลั๊กพ่วง และท่อเมนจ่ายน้ำไซต์งานตลอดระยะเวลาก่อสร้าง',
      quantity: 1,
      unit: 'งาน',
      materialUnitPrice: 14500,
      laborUnitPrice: 5500,
      wastePercent: 0,
    });

    // 2. หมวดโครงสร้าง คสล.
    items.push({
      id: `wiz-str-conc-${ts}`,
      category: 'structure',
      name: `คอนกรีตผสมเสร็จ 240 ksc (ฐานราก-เสา-คาน-พื้น)`,
      spec: `กำลังอัด 240 ksc ทรงลูกบาศก์ ปริมาตรรวมทั้งหลัง ${concVol} คิว`,
      quantity: concVol,
      unit: 'ลบ.ม.',
      materialUnitPrice: 2150,
      laborUnitPrice: 450,
      wastePercent: 0,
    });

    items.push({
      id: `wiz-str-db-${ts}`,
      category: 'structure',
      name: 'เหล็กข้ออ้อย DB12 / DB16 มอก. SD40 (ยาว 10 ม.)',
      spec: `สำหรับโครงสร้างฐานราก เสา คาน และพื้น คสล. (${Math.round(rebarKg * 0.75)} กก.)`,
      quantity: Math.round(rebarKg * 0.75),
      unit: 'กก.',
      materialUnitPrice: Math.round(28.5 * matMul),
      laborUnitPrice: Math.round(6.5 * labMul),
      wastePercent: 5,
    });

    items.push({
      id: `wiz-str-stirrup-col-${ts}`,
      category: 'structure',
      name: 'เหล็กปลอกเสา คสล. (RB6/RB9 SR24)',
      spec: `สำหรับเสาอาคาร ${colCount} ต้น ปลอกรัดตามมาตรฐาน วสท.`,
      quantity: Math.round(rebarKg * 0.12),
      unit: 'กก.',
      materialUnitPrice: Math.round(29 * matMul),
      laborUnitPrice: Math.round(7.5 * labMul),
      wastePercent: 5,
    });

    items.push({
      id: `wiz-str-stirrup-beam-${ts}`,
      category: 'structure',
      name: 'เหล็กปลอกคาน คสล. (RB6/RB9 SR24)',
      spec: `สำหรับคานคอดินและคานชั้นบน ปลอกรัดตามมาตรฐาน วสท.`,
      quantity: Math.round(rebarKg * 0.13),
      unit: 'กก.',
      materialUnitPrice: Math.round(29 * matMul),
      laborUnitPrice: Math.round(7.5 * labMul),
      wastePercent: 5,
    });

    items.push({
      id: `wiz-str-wire-${ts}`,
      category: 'structure',
      name: 'ลวดผูกเหล็ก เบอร์ 18 (Black Annealed Tie Wire)',
      spec: 'สำหรับผูกเหล็กเสริมโครงสร้าง',
      quantity: Math.max(10, Math.round(rebarKg * 0.02)),
      unit: 'กก.',
      materialUnitPrice: 55,
      laborUnitPrice: 0,
      wastePercent: 0,
    });

    items.push({
      id: `wiz-str-form-${ts}`,
      category: 'structure',
      name: 'ไม้แบบหล่อคอนกรีต คสล. (ฐานราก-เสา-คาน-พื้น)',
      spec: `พื้นที่ผิวสัมผัสไม้แบบ ${formworkSqm} ตร.ม. (คิดหมุนเวียนใช้ซ้ำ 3-4 ครั้ง)`,
      quantity: formworkSqm,
      unit: 'ตร.ม.',
      materialUnitPrice: Math.round(240 * 0.40),
      laborUnitPrice: 130,
      wastePercent: 5,
    });

    items.push({
      id: `wiz-str-precast-${ts}`,
      category: 'structure',
      name: 'แผ่นพื้นสำเร็จรูปท้องเรียบ (Plank) พร้อม Wire Mesh Ø 4มม.',
      spec: `สำหรับพื้นที่พื้นอาคาร ~${Math.round(A * 0.85)} ตร.ม.`,
      quantity: Math.round(A * 0.85),
      unit: 'ตร.ม.',
      materialUnitPrice: Math.round(285 * matMul),
      laborUnitPrice: 80,
      wastePercent: 5,
    });

    // 3. หมวดหลังคา
    const roofArea = Math.round(A * 1.25);
    const roofSteelKg = Math.round(roofArea * 18);
    const roofMatName = roofType === 'hip' 
      ? (grade === 'premium' ? 'กระเบื้องแผ่นเรียบ SCG Prestige + อุปกรณ์ครอบแห้ง' : 'กระเบื้องซีแพคโมเนีย + ครอบแห้ง Dry Ridge')
      : roofType === 'nordic'
      ? 'แผ่นหลังคาเมทัลชีท Seamless Snap-lock บุ PU Foam หนา 2 นิ้ว'
      : (grade === 'economy' ? 'แผ่นหลังคาเมทัลชีทบุฉนวนกันความร้อน PE หนา 5 มม.' : 'แผ่นหลังคาเมทัลชีทบุ PU Foam หนา 1 นิ้ว เคลือบสีดำด้าน');
    const roofUnitPrice = roofType === 'hip' ? (grade === 'premium' ? 480 : 380) : (grade === 'economy' ? 220 : 350);

    items.push({
      id: `wiz-roof-steel-${ts}`,
      category: 'roof',
      name: 'โครงสร้างหลังคาเหล็กรูปพรรณ (อะเส-จันทัน-อกไก่-แป) ท่อนละ 6 ม.',
      spec: `เหล็กซี C100x50 + เหล็กกล่อง 100x50 + แปสำเร็จรูป (${roofSteelKg} กก.) พ่นสีกันสนิม 2 เที่ยว`,
      quantity: roofSteelKg,
      unit: 'กก.',
      materialUnitPrice: Math.round(38 * matMul),
      laborUnitPrice: Math.round(15 * labMul),
      wastePercent: 5,
    });

    items.push({
      id: `wiz-roof-covering-${ts}`,
      category: 'roof',
      name: `งานมุงหลังคา: ${roofMatName}`,
      spec: `พื้นที่มุงหลังคารวม ${roofArea} ตร.ม. พร้อมสกรู EPDM และอุปกรณ์ครอบสันหลังคา`,
      quantity: roofArea,
      unit: 'ตร.ม.',
      materialUnitPrice: Math.round(roofUnitPrice * matMul),
      laborUnitPrice: Math.round(110 * labMul),
      wastePercent: 5,
    });

    // 4. หมวดผนังก่อฉาบ
    const wallArea = Math.round(A * 2.2);
    const wallBrickName = grade === 'premium' 
      ? 'อิฐมอญแดงก่อ 2 ชั้น พร้อมฉาบปูนเรียบกันความร้อน-กันเสียง' 
      : grade === 'economy' 
      ? 'คอนกรีตบล็อกหนา 7 ซม. พร้อมฉาบปูนเรียบ 2 ด้าน' 
      : 'อิฐมวลเบา Q-Con หนา 7.5 ซม. พร้อมฉาบปูนมวลเบาเรียบ 2 ด้าน';
    const wallPriceMat = grade === 'premium' ? 380 : grade === 'economy' ? 180 : 260;

    items.push({
      id: `wiz-wall-masonry-${ts}`,
      category: 'masonry_wall',
      name: `งานก่อผนัง: ${wallBrickName}`,
      spec: `พื้นที่ผนังรวม ${wallArea} ตร.ม. พร้อมตาข่ายไฟเบอร์กรงไก่ตามแนวท่อและรอยต่อ`,
      quantity: wallArea,
      unit: 'ตร.ม.',
      materialUnitPrice: Math.round(wallPriceMat * matMul),
      laborUnitPrice: Math.round(160 * labMul),
      wastePercent: 5,
    });

    items.push({
      id: `wiz-wall-lintel-${ts}`,
      category: 'masonry_wall',
      name: 'เสาเอ็นและคานทับหลัง คสล. รอบช่องเปิดประตู-หน้าต่าง',
      spec: 'คอนกรีต 240 ksc เสริมเหล็ก RB9 ปลอก RB6 ทุกระยะ 1.5-2.0 ม.',
      quantity: Math.round(wallArea * 0.25),
      unit: 'ม.',
      materialUnitPrice: 110,
      laborUnitPrice: 90,
      wastePercent: 5,
    });

    // 5. ประตูและหน้าต่าง
    const doorCount = Math.max(4, Math.ceil(A / 25));
    const winCount = Math.max(6, Math.ceil(A / 18));
    items.push({
      id: `wiz-door-${ts}`,
      category: 'doors_windows',
      name: grade === 'premium' ? 'ประตูไม้จริงสัก / UPVC เกรดพรีเมียม พร้อมลูกบิดสแตนเลส 304' : 'ประตูไม้อัด HDF ลายไม้ / UPVC ห้องน้ำ พร้อมอุปกรณ์ล็อค',
      spec: `ขนาด 80x200 และ 70x200 รวม ${doorCount} ชุด พร้อมวงกบ บานพับ และโช๊คอัพ`,
      quantity: doorCount,
      unit: 'ชุด',
      materialUnitPrice: grade === 'premium' ? 4800 : 2400,
      laborUnitPrice: 650,
      wastePercent: 0,
    });

    items.push({
      id: `wiz-window-${ts}`,
      category: 'doors_windows',
      name: grade === 'premium' ? 'หน้าต่างอลูมิเนียมดำพาวเดอร์โค้ท หนา 1.5 มม. ยูโรโปรไฟล์ กระจกลามิเนต' : 'หน้าต่างอลูมิเนียมดำ หนา 1.2 มม. กระจกเขียวตัดแสง หนา 6 มม.',
      spec: `รวมบานเลื่อนและบานกระทุ้ง ${winCount} ชุด พร้อมมุ้งลวดและซีลยางกันน้ำ EPDM`,
      quantity: winCount,
      unit: 'ชุด',
      materialUnitPrice: grade === 'premium' ? 5800 : 3200,
      laborUnitPrice: 750,
      wastePercent: 0,
    });

    // 6. ผิวพื้น ฝ้า และสี
    const tileMatName = grade === 'premium' ? 'กระเบื้องยาง SPC ลายไม้หนา 5.5 มม. + แกรนิตโต้ 60x120 ซม.' : grade === 'economy' ? 'กระเบื้องเซรามิก 40x40 ซม. พร้อมปูนกาว' : 'กระเบื้องแกรนิตโต้พอร์ซเลน 60x60 ซม. นาโนกันคราบ';
    items.push({
      id: `wiz-floor-tile-${ts}`,
      category: 'finishes',
      name: `งานปูพื้น: ${tileMatName}`,
      spec: `พื้นที่ปูรวม ${A} ตร.ม. พร้อมปูนกาวซีเมนต์ กาวยาแนวกันรา และบัวเชิงผนัง`,
      quantity: A,
      unit: 'ตร.ม.',
      materialUnitPrice: grade === 'premium' ? 520 : grade === 'economy' ? 240 : 360,
      laborUnitPrice: 160,
      wastePercent: 5,
    });

    items.push({
      id: `wiz-ceiling-${ts}`,
      category: 'finishes',
      name: 'ฝ้าเพดานยิปซัมบอร์ด หนา 9 มม. ฉาบเรียบ โครงคร่าว C-Line ชุบสังกะสี',
      spec: `พื้นที่ฝ้า ${Math.round(A * 0.95)} ตร.ม. พร้อมหลุมซ่อนไฟห้องโถง`,
      quantity: Math.round(A * 0.95),
      unit: 'ตร.ม.',
      materialUnitPrice: 165,
      laborUnitPrice: 110,
      wastePercent: 5,
    });

    items.push({
      id: `wiz-paint-${ts}`,
      category: 'finishes',
      name: 'งานทาสีอาคารภายนอก-ภายใน (รองพื้นปูนใหม่ 1 เที่ยว + สีจริงกึ่งเงา 2 เที่ยว)',
      spec: `พื้นที่ผิวทาสีรวม ${Math.round(wallArea * 1.8)} ตร.ม. สีเกรดพรีเมียมเช็ดล้างได้`,
      quantity: Math.round(wallArea * 1.8),
      unit: 'ตร.ม.',
      materialUnitPrice: 45,
      laborUnitPrice: 55,
      wastePercent: 0,
    });

    // 7. งานสุขาภิบาล & ท่อประปา
    const bathCount = Math.max(1, Math.ceil(A / 60));
    items.push({
      id: `wiz-sanitary-pipe-${ts}`,
      category: 'sanitary',
      name: 'ระบบท่อประปา PPR (น้ำดี) และท่อน้ำทิ้ง-สิ่งปฏิกูล PVC ตราช้าง มอก.',
      spec: `สำหรับ ${bathCount} ห้องน้ำ + ห้องครัว + ส่วนซักล้าง พร้อมทดสอบแรงดันน้ำ`,
      quantity: bathCount,
      unit: 'ห้อง',
      materialUnitPrice: 6500,
      laborUnitPrice: 3500,
      wastePercent: 0,
    });

    items.push({
      id: `wiz-sanitary-septic-${ts}`,
      category: 'sanitary',
      name: 'ถังบำบัดน้ำเสียสำเร็จรูปชีวภาพ ขนาด 1,600 - 2,000 ลิตร พร้อมถังดักไขมัน',
      spec: 'พร้อมขุดฝัง เทคอนกรีตรองก้นหลุม ท่อระบายอากาศ และท่อเชื่อมต่อ',
      quantity: 1,
      unit: 'ชุด',
      materialUnitPrice: 11500,
      laborUnitPrice: 3500,
      wastePercent: 0,
    });

    items.push({
      id: `wiz-sanitary-fixtures-${ts}`,
      category: 'sanitary',
      name: grade === 'premium' ? 'ชุดสุขภัณฑ์ประหยัดน้ำแบบชิ้นเดียว (Cotto/American Standard) + ก๊อกผสม' : 'ชุดสุขภัณฑ์ประหยัดน้ำชักโครก 2 ชิ้น + อ่างล้างหน้า + ฝักบัวโครเมียม',
      spec: `จำนวน ${bathCount} ห้องน้ำ พร้อมสายฉีดชำระ ตะแกรงกันกลิ่นสแตนเลส และกระจกเงา`,
      quantity: bathCount,
      unit: 'ชุด',
      materialUnitPrice: grade === 'premium' ? 14500 : 8500,
      laborUnitPrice: 1800,
      wastePercent: 0,
    });

    // 8. งานระบบไฟฟ้า
    const lightPoints = Math.max(15, Math.ceil(A * 0.45));
    const outletPoints = Math.max(12, Math.ceil(A * 0.35));
    items.push({
      id: `wiz-elec-panel-${ts}`,
      category: 'electrical',
      name: 'ตู้คอนซูเมอร์ยูนิต (Consumer Unit) 10-14 ช่อง พร้อมเมนเบรกเกอร์ RCBO กันดูด',
      spec: 'พร้อมแท่งกราวด์ร็อดทองแดง 5/8" x 2.40 ม. ตอกลงดินค่าความต้านทาน < 5 โอห์ม',
      quantity: 1,
      unit: 'ชุด',
      materialUnitPrice: 6500,
      laborUnitPrice: 2500,
      wastePercent: 0,
    });

    items.push({
      id: `wiz-elec-wiring-${ts}`,
      category: 'electrical',
      name: 'งานเดินสายไฟร้อยท่อ uPVC ขาวฝังผนัง (แสงสว่าง + เต้ารับ + เครื่องปรับอากาศ + น้ำอุ่น)',
      spec: `รวม ${lightPoints + outletPoints} จุด สายไฟ มอก. บางกอกเคเบิ้ล THW/VAF/NYY`,
      quantity: lightPoints + outletPoints,
      unit: 'จุด',
      materialUnitPrice: 420,
      laborUnitPrice: 380,
      wastePercent: 0,
    });

    // 9. งานภายนอก (ถ้าเลือก)
    if (includeFenceAndCarport) {
      items.push({
        id: `wiz-ext-carport-${ts}`,
        category: 'external_works',
        name: 'ลานจอดรถ คสล. วางบนเสาเข็มหกเหลี่ยม 6 ม. ปาดเรียบ/ขัดมัน',
        spec: 'ขนาด ~25 ตร.ม. คอนกรีต 240 ksc หนา 12 ซม. ไวร์เมช 4 มม.',
        quantity: 25,
        unit: 'ตร.ม.',
        materialUnitPrice: 580,
        laborUnitPrice: 220,
        wastePercent: 5,
      });

      items.push({
        id: `wiz-ext-drain-${ts}`,
        category: 'external_works',
        name: 'ท่อระบายน้ำ คสล. Ø 0.30 ม. พร้อมบ่อพักคอนกรีตรอบบ้าน',
        spec: 'ความยาว 25 ม. พร้อมบ่อพักทุกระยะ 6-8 ม. และฝาปิด คสล.',
        quantity: 25,
        unit: 'ม.',
        materialUnitPrice: 680,
        laborUnitPrice: 320,
        wastePercent: 0,
      });
    }

    return items;
  }, [archetype, areaSqm, floors, pileType, roofType, grade, includeFenceAndCarport]);

  // Grand summary calculation
  const summary = useMemo(() => {
    let mat = 0;
    let lab = 0;
    generatedBOQ.forEach(i => {
      const wasteMult = 1 + ((i.wastePercent || 0) / 100);
      mat += i.quantity * i.materialUnitPrice * wasteMult;
      lab += i.quantity * i.laborUnitPrice;
    });
    const direct = mat + lab;
    const overhead = Math.round(direct * 0.10);
    const grand = direct + overhead;
    const costPerSqm = areaSqm > 0 ? Math.round(grand / areaSqm) : 0;
    return { mat: Math.round(mat), lab: Math.round(lab), direct: Math.round(direct), overhead, grand, costPerSqm };
  }, [generatedBOQ, areaSqm]);

  if (!isOpen) return null;

  const handleFinish = () => {
    onApplyBOQ(generatedBOQ, customName, areaSqm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30">
              <span className="material-symbols-outlined text-2xl">magic_button</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>สร้าง BOQ ด่วน 3 นาที (Quick BOQ Wizard)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                  ขั้นตอนที่ {currentStep}/4
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                เลือกรูปแบบบ้าน สเปกวัสดุ และระบบวิศวกรรม ระบบจะคำนวณถอดแบบทั้ง 10 หมวดงานให้อัตโนมัติ
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

        {/* Step Indicator */}
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs shrink-0 overflow-x-auto gap-2">
          {[
            { step: 1, label: '1. ประเภท & ขนาดบ้าน' },
            { step: 2, label: '2. ฐานราก & หลังคา' },
            { step: 3, label: '3. เกรดสเปกวัสดุ' },
            { step: 4, label: '4. สรุป & ยืนยันสร้าง' },
          ].map(s => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step as any)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition shrink-0 ${
                currentStep === s.step
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : currentStep > s.step
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>{s.label}</span>
              {currentStep > s.step && <span className="material-symbols-outlined text-xs">check</span>}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs flex flex-col gap-5">
          
          {/* STEP 1 */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-4 animate-in fade-in">
              <span className="text-sm font-bold text-amber-400">เลือกประเภทและขนาดอาคารที่ต้องการประมาณราคา:</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: 'modern_1fl', name: 'บ้านเดี่ยวโมเดิร์น 1 ชั้น', desc: 'ยอดนิยม ก่อสร้างรวดเร็ว หลังคาเพิงแหงน/จั่ว', icon: 'cottage', def: '100 ตร.ม.' },
                  { id: 'contemporary_2fl', name: 'บ้านเดี่ยว 2 ชั้นร่วมสมัย', desc: 'พื้นที่กว้างขวาง หลังคาปั้นหยา พื้นสำเร็จรูป', icon: 'apartment', def: '160 ตร.ม.' },
                  { id: 'nordic_minimal', name: 'บ้านสไตล์นอร์ดิก / มินิมอล', desc: 'หลังคาทรงจั่วสูง ไร้ชายคา กระจกบานใหญ่', icon: 'villa', def: '120 ตร.ม.' },
                  { id: 'commercial_shophouse', name: 'อาคารพาณิชย์ / ตึกแถว 3 ชั้น', desc: 'โครงสร้างรับน้ำหนักสูง พื้นที่ค้าขายและพักอาศัย', icon: 'domain', def: '240 ตร.ม.' },
                  { id: 'home_extension', name: 'งานต่อเติมครัว & โรงจอดรถ', desc: 'ต่อเติมหลังบ้าน คาน คสล. เสาเข็มหกเหลี่ยม/ไมโครไพล์', icon: 'garage', def: '35 ตร.ม.' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectArchetype(item.id as BuildingArchetype)}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                      archetype === item.id 
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10' 
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`material-symbols-outlined text-xl ${archetype === item.id ? 'text-amber-400' : 'text-slate-400'}`}>
                        {item.icon}
                      </span>
                      <strong className="text-xs">{item.name}</strong>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                    <span className="text-[10px] font-mono text-cyan-400 self-end">ขนาดแนะนำ: {item.def}</span>
                  </button>
                ))}
              </div>

              {/* ปรับขนาดพื้นที่ กว้าง x ยาว */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3 mt-2">
                <span className="font-bold text-white text-xs">ระบุขนาดพื้นที่ใช้สอยจริง:</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">ความกว้างบ้าน (ม.)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={widthM}
                      onChange={(e) => {
                        const w = parseFloat(e.target.value) || 1;
                        setWidthM(w);
                        setAreaSqm(Math.round(w * lengthM * floors));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">ความยาวบ้าน (ม.)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={lengthM}
                      onChange={(e) => {
                        const l = parseFloat(e.target.value) || 1;
                        setLengthM(l);
                        setAreaSqm(Math.round(widthM * l * floors));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">จำนวนชั้น</label>
                    <select
                      value={floors}
                      onChange={(e) => {
                        const fl = parseInt(e.target.value) as 1 | 2 | 3;
                        setFloors(fl);
                        setAreaSqm(Math.round(widthM * lengthM * fl));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-bold font-mono"
                    >
                      <option value={1}>1 ชั้น</option>
                      <option value={2}>2 ชั้น</option>
                      <option value={3}>3 ชั้น</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-amber-400 block mb-1 font-bold">พื้นที่ใช้สอยรวม (ตร.ม.)</label>
                    <input
                      type="number"
                      value={areaSqm}
                      onChange={(e) => setAreaSqm(parseFloat(e.target.value) || 10)}
                      className="w-full bg-amber-950/40 border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-bold font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">ชื่อโครงการ / แบบบ้าน</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-5 animate-in fade-in">
              {/* เสาเข็มและฐานราก */}
              <div className="flex flex-col gap-2.5">
                <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">foundation</span> ระบบเสาเข็มและฐานราก (Foundation System):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'bored_pile_35', title: 'เสาเข็มเจาะ Ø 0.35 ม. (ลึก 18-22 ม.)', desc: 'หล่อในที่ แรงสั่นสะเทือนต่ำ เหมาะกับ กทม./ปริมณฑล หรือชิดบ้านข้างเคียง' },
                    { id: 'driven_pile_i22', title: 'เสาเข็มคอนกรีตอัดแรงรูปตัวไอ I-22 (ลึก 16-20 ม.)', desc: 'ตอกด้วยปั้นจั่น ประหยัด รวดเร็ว เหมาะกับพื้นที่โล่งเข้าถึงง่าย' },
                    { id: 'hex_pile_6m', title: 'เสาเข็มหกเหลี่ยมกลวง 6.0 ม.', desc: 'ตอกด้วยรถแบ็คโฮ เหมาะกับฐานรากรั้ว ลานจอดรถ หรือส่วนต่อเติมเบา' },
                    { id: 'spread_footing', title: 'ฐานรากแผ่ (Spread Footing - ไม่ตอกเข็ม)', desc: 'สำหรับชั้นดินแข็ง ต่างจังหวัด ดินภูเขา ภาคเหนือ/อีสาน' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPileType(p.id as FoundationPileType)}
                      className={`p-3 rounded-xl border text-left transition ${
                        pileType === p.id 
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow' 
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <strong className="text-xs block mb-1 text-cyan-300">{p.title}</strong>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ทรงหลังคา */}
              <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-850">
                <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">roofing</span> รูปแบบทรงหลังคา (Roof Archetype):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'lean_to', title: 'ทรงเพิงหมาแหงน (Lean-to)', desc: 'ลาดเอียงทางเดียว สไตล์โมเดิร์น ระบายน้ำฝนดีเยี่ยม' },
                    { id: 'hip', title: 'ทรงปั้นหยา (Hip Roof)', desc: 'ลาดเอียง 4 ด้าน สมมาตร แข็งแรงทนลมพายุ' },
                    { id: 'gable', title: 'ทรงจั่วมาตรฐาน (Gable)', desc: 'ทรงจั่วคู่ ระบายความร้อนใต้หลังคาได้ดี' },
                    { id: 'nordic', title: 'ทรงนอร์ดิก (High Gable)', desc: 'จั่วองศาสูง ไร้ชายคา สไตล์ยุโรปมินิมอล' },
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoofType(r.id as RoofArchetype)}
                      className={`p-3 rounded-xl border text-left transition ${
                        roofType === r.id 
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow' 
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs mb-1 text-white">{r.title}</div>
                      <div className="text-[10px] text-slate-400 leading-normal">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-4 animate-in fade-in">
              <span className="text-sm font-bold text-amber-400">เลือกระดับเกรดสเปกวัสดุและงานตกแต่ง (Finishing Grade):</span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'economy',
                    title: '1. Economy (ประหยัด คุ้มค่า)',
                    priceEst: '~ 9,500 - 11,500 บ./ตร.ม.',
                    features: [
                      'คอนกรีตบล็อก ฉาบปูนเรียบ 2 ด้าน',
                      'หลังคาเมทัลชีทบุฉนวน PE กันร้อน',
                      'พื้นปูกระเบื้องเซรามิก 40x40 ซม.',
                      'ประตู PVC / อลูมิเนียมเงินกระจกใส',
                      'ระบบไฟส่องสว่างมาตรฐาน มอก.'
                    ]
                  },
                  {
                    id: 'standard',
                    title: '2. Standard (มาตรฐานยอดนิยม)',
                    priceEst: '~ 12,500 - 15,500 บ./ตร.ม.',
                    badge: 'ยอดนิยมสูงสุด',
                    features: [
                      'ผนังอิฐมวลเบา Q-Con หนา 7.5 ซม. ฉาบเรียบ',
                      'หลังคากระเบื้องซีแพค / เมทัลชีท PU 1 นิ้ว',
                      'พื้นแกรนิตโต้พอร์ซเลน 60x60 ซม. นาโน',
                      'ประตู HDF / อลูมิเนียมดำกระจกตัดแสง',
                      'โคมไฟ LED ดาวน์ไลท์ + สุขภัณฑ์ Cotto'
                    ]
                  },
                  {
                    id: 'premium',
                    title: '3. Premium (หรูหรา โมเดิร์น)',
                    priceEst: '~ 16,500 - 21,000 บ./ตร.ม.',
                    features: [
                      'ผนังอิฐมอญ 2 ชั้น กันความร้อนและเสียงรบกวน',
                      'หลังคาแผ่นเรียบ SCG Prestige / Snap-lock',
                      'พื้น SPC ลายไม้ 5.5 มม. / แกรนิตโต้ 60x120',
                      'ประตูไม้จริงสัก / อลูมิเนียม Euro Profile',
                      'สุขภัณฑ์ Smart Toilet ชิ้นเดียว + ไฟฝ้าหลุม'
                    ]
                  },
                ].map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGrade(g.id as QualityGrade)}
                    className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 ${
                      grade === g.id 
                        ? 'bg-amber-500/15 border-amber-500 shadow-xl shadow-amber-500/10' 
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-xs text-white">{g.title}</strong>
                        {g.badge && (
                          <span className="text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-black">
                            {g.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400 block mb-2">{g.priceEst}</span>
                      <ul className="flex flex-col gap-1.5 text-[11px] text-slate-300">
                        {g.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-xs text-emerald-400 mt-0.5 shrink-0">check_circle</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between mt-2">
                <div>
                  <strong className="text-white text-xs block">รวมงานลานจอดรถ คสล. และท่อระบายน้ำรอบบ้าน</strong>
                  <span className="text-[11px] text-slate-400">เพิ่มลานจอดรถขนาด 25 ตร.ม. พร้อมท่อระบายน้ำ คสล. 25 ม. และบ่อพัก</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFenceAndCarport}
                    onChange={(e) => setIncludeFenceAndCarport(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-400">คิดรวมใน BOQ</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-4 animate-in fade-in">
              <span className="text-sm font-bold text-amber-400">สรุปการประมาณราคา BOQ อัตโนมัติ (10 หมวดงาน):</span>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">รวมค่าวัสดุ (Material):</span>
                  <span className="text-base font-bold font-mono text-cyan-400">
                    ฿{summary.mat.toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">รวมค่าแรงช่าง (Labor):</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    ฿{summary.lab.toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40">
                  <span className="text-[10px] text-amber-300 block mb-0.5">งบประมาณรวมทั้งสิ้น (+กำไร 10%):</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black font-mono text-amber-400">
                      ฿{summary.grand.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      (~{summary.costPerSqm.toLocaleString()} บ./ตร.ม.)
                    </span>
                  </div>
                </div>
              </div>

              {/* Table Preview of generated categories */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 max-h-56 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-1">หมวด</th>
                      <th className="py-1">รายการตัวอย่างที่คำนวณได้</th>
                      <th className="py-1 text-right">จำนวน</th>
                      <th className="py-1 text-right">รวมค่าวัสดุ+แรง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {generatedBOQ.slice(0, 10).map(item => (
                      <tr key={item.id} className="text-slate-300">
                        <td className="py-1 text-cyan-400 font-mono">{item.category}</td>
                        <td className="py-1">{item.name}</td>
                        <td className="py-1 text-right font-mono">{item.quantity} {item.unit}</td>
                        <td className="py-1 text-right font-mono font-bold text-white">
                          ฿{(Math.round(item.quantity * item.materialUnitPrice * (1 + item.wastePercent/100)) + Math.round(item.quantity * item.laborUnitPrice)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-200">
                <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0">verified</span>
                <span>
                  ระบบได้ถอดแบบคำนวณครบ <strong>{generatedBOQ.length} รายการ</strong> ครอบคลุมงานเสาเข็ม คอนกรีต เหล็กเส้นปลอกเสา-คาน มุงหลังคา ก่อฉาบ ประตู-หน้าต่าง และงานระบบ พร้อมส่งออก Excel หรือยื่นกู้ธนาคารทันที
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep - 1) as any)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>ย้อนกลับ</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              ยกเลิก
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep + 1) as any)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95"
              >
                <span>ถัดไป</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/30 transition active:scale-95"
              >
                <span className="material-symbols-outlined text-base">rocket_launch</span>
                <span>ยืนยันสร้าง BOQ ทันที</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
