import React, { useState, useMemo } from 'react';
import { BOQItem, ConstructionCategory } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { computeBOQSummary } from '../services/calculator';

export type SanitySeverity = 'critical' | 'warning' | 'info';

export interface SanityIssue {
  id: string;
  category: ConstructionCategory | 'costing' | 'general';
  categoryLabel: string;
  severity: SanitySeverity;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  canAutoFix?: boolean;
  fixActionType?: 'add_stirrups' | 'add_plaster' | 'add_zero_labor' | 'add_lintel' | 'add_roof_structure';
}

interface AISanityCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BOQItem[];
  houseAreaSqm: number;
  overheadPercent: number;
  vatPercent: number;
  projectName: string;
  onApplyFixes: (updatedItems: BOQItem[]) => void;
}

export const AISanityCheckModal: React.FC<AISanityCheckModalProps> = ({
  isOpen,
  onClose,
  items,
  houseAreaSqm,
  overheadPercent,
  vatPercent,
  projectName,
  onApplyFixes
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [copyToast, setCopyToast] = useState<boolean>(false);
  const [fixedIssues, setFixedIssues] = useState<Record<string, boolean>>({});

  const summary = useMemo(() => {
    return computeBOQSummary(items, overheadPercent, vatPercent);
  }, [items, overheadPercent, vatPercent]);

  // Deep Rule-Based Engineering & Cost Sanity Analysis
  const issues = useMemo<SanityIssue[]>(() => {
    const list: SanityIssue[] = [];

    // Helper matchers
    const findItems = (cat?: ConstructionCategory, regex?: RegExp) => {
      return items.filter(i => {
        const catMatch = !cat || i.category === cat;
        const textMatch = !regex || regex.test(i.name) || (i.spec && regex.test(i.spec));
        return catMatch && textMatch;
      });
    };

    const sumQty = (cat?: ConstructionCategory, regex?: RegExp) => {
      return findItems(cat, regex).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    };

    // -------------------------------------------------------------------------
    // 1. STRUCTURE AUDIT: Concrete vs Rebar & Formwork
    // -------------------------------------------------------------------------
    const concreteItems = findItems('structure', /คอนกรีต|concrete/i);
    const concreteM3 = concreteItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const rebarItems = findItems('structure', /เหล็กข้ออ้อย|เหล็กเส้น|เหล็กกลม|rb|db/i);
    const rebarKg = rebarItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const stirrupItems = findItems('structure', /เหล็กปลอก|ปลอกเสา|ปลอกคาน/i);
    const stirrupKg = stirrupItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const formworkItems = findItems('structure', /ไม้แบบ|แบบหล่อ|แบบเหล็ก/i);
    const formworkM2 = formworkItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const pileItems = findItems('structure', /เสาเข็ม|pile/i);
    const footingItems = findItems('structure', /ฐานราก|footing/i);

    // Rule 1.1: Concrete with 0 Rebar
    if (concreteM3 > 0 && rebarKg === 0) {
      list.push({
        id: 'struct-no-rebar',
        category: 'structure',
        categoryLabel: CATEGORY_LABELS['structure']?.title || 'งานโครงสร้าง',
        severity: 'critical',
        title: `มีงานคอนกรีตโครงสร้าง ${concreteM3.toLocaleString()} ลบ.ม. แต่ไม่มีเหล็กเส้นเสริมเลย (0 กก.)`,
        description: 'ตรวจพบคอนกรีตโครงสร้างฐานราก เสา คาน หรือพื้น แต่ไม่พบรายการเหล็กเส้นเสริมคอนกรีต (DB / RB)',
        impact: 'อันตรายร้ายแรง! คอนกรีตรับแรงดึงไม่ได้ อาคารจะไม่ปลอดภัยและโครงสร้างพังทลายตามหลักวิศวกรรม',
        recommendation: 'ต้องเพิ่มรายการเหล็กข้ออ้อย (DB12, DB16, DB20) และเหล็กเส้นกลม (RB6, RB9) ทันที'
      });
    } else if (concreteM3 > 0 && rebarKg > 0) {
      const ratio = Math.round(rebarKg / concreteM3);
      // Rule 1.2: Rebar-to-concrete ratio too low (< 80 kg/m3)
      if (ratio < 80) {
        list.push({
          id: 'struct-low-rebar-ratio',
          category: 'structure',
          categoryLabel: CATEGORY_LABELS['structure']?.title || 'งานโครงสร้าง',
          severity: 'critical',
          title: `สัดส่วนเหล็กเส้นต่อคอนกรีตต่ำกว่าเกณฑ์ (${ratio} กก./ลบ.ม.)`,
          description: `มีคอนกรีต ${concreteM3.toFixed(1)} ลบ.ม. และเหล็กเส้น ${rebarKg.toLocaleString()} กก. คิดเป็นอัตราส่วน ${ratio} กก./ลบ.ม. ซึ่งเกณฑ์มาตรฐาน วสท. สำหรับบ้านพักอาศัย คสล. ทั่วไปควรอยู่ที่ 90 – 130 กก./ลบ.ม.`,
          impact: 'โครงสร้างคานและเสาเสี่ยงต่อการรับน้ำหนักเกินพิกัด แอ่นตัว หรือแตกร้าวจากการเสริมเหล็กไม่เพียงพอ',
          recommendation: 'ตรวจสอบแบบวิศวกรรมโครงสร้างและเพิ่มปริมาณเหล็กเส้นเสริมพิเศษหรือเหล็กเสริมหัวเสา'
        });
      }
    }

    // Rule 1.3: Rebar without Stirrups
    if (rebarKg > 200 && stirrupKg === 0) {
      list.push({
        id: 'struct-no-stirrups',
        category: 'structure',
        categoryLabel: CATEGORY_LABELS['structure']?.title || 'งานโครงสร้าง',
        severity: 'warning',
        title: 'มีเหล็กเส้นหลัก แต่ไม่มีรายการเหล็กปลอกเสา-คาน (Stirrups)',
        description: `มีเหล็กข้ออ้อย ${rebarKg.toLocaleString()} กก. แต่ไม่พบรายการเหล็กปลอก RB6 / RB9`,
        impact: 'เหล็กปลอกจำเป็นสำหรับรับแรงเฉือนและยึดเหล็กแกนให้อยู่ในตำแหน่ง หากขาดไปโครงสร้างจะวิบัติจากแรงเฉือนได้ง่าย',
        recommendation: 'เพิ่มรายการเหล็กปลอกเสาและเหล็กปลอกคาน (ปกติประมาณ 15-20% ของน้ำหนักเหล็กแกน)',
        canAutoFix: true,
        fixActionType: 'add_stirrups'
      });
    }

    // Rule 1.4: Concrete without Formwork
    if (concreteM3 > 10 && formworkM2 === 0) {
      list.push({
        id: 'struct-no-formwork',
        category: 'structure',
        categoryLabel: CATEGORY_LABELS['structure']?.title || 'งานโครงสร้าง',
        severity: 'warning',
        title: `มีงานเทคอนกรีต ${concreteM3.toFixed(1)} ลบ.ม. แต่ไม่มีรายการไม้แบบหล่อ (Formwork)`,
        description: 'ไม่พบรายการไม้แบบ ค้ำยัน หรือน้ำยาทาแบบในหมวดงานโครงสร้าง',
        impact: 'เสี่ยงผู้รับเหมาขาดทุนเนื่องจากลืมคิดค่าเช่า/ซื้อไม้แบบ และค่าแรงช่างตั้งค้ำยันเข้าแบบ',
        recommendation: 'เพิ่มรายการไม้แบบหล่อคอนกรีต (เฉลี่ยประมาณ 5-8 ตร.ม. ต่อ คอนกรีต 1 ลบ.ม.)'
      });
    }

    // Rule 1.5: Piles without Footing
    if (pileItems.length > 0 && footingItems.length === 0) {
      list.push({
        id: 'struct-piles-no-footing',
        category: 'structure',
        categoryLabel: CATEGORY_LABELS['structure']?.title || 'งานโครงสร้าง',
        severity: 'warning',
        title: 'มีรายการเสาเข็ม แต่ไม่มีงานคอนกรีตฐานราก (Footings)',
        description: 'ตรวจพบรายการเสาเข็มตอก/เข็มเจาะ แต่ไม่มีรายการเทคอนกรีตและเหล็กเสริมฐานรากรับหัวเสาเข็ม',
        impact: 'ไม่สามารถถ่ายแรงจากเสาลงสู่เสาเข็มได้ ทำให้งานโครงสร้างขาดช่วง',
        recommendation: 'เพิ่มรายการงานขุดดิน ฐานราก คสล. และตัดหัวเสาเข็ม'
      });
    }

    // -------------------------------------------------------------------------
    // 2. ROOF AUDIT: Roof Covering vs Steel Trusses
    // -------------------------------------------------------------------------
    const roofCoverItems = findItems('roof', /กระเบื้อง|แผ่นมุง|เมทัลชีท|ซีแพค|ลอนคู่|shingle/i);
    const roofCoverM2 = roofCoverItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const roofSteelItems = findItems('roof', /เหล็กรูปพรรณ|แป|จันทัน|อกไก่|อะเส|ตะเฆ่|c-channel|เหล็กกล่อง/i);
    const roofSteelKg = roofSteelItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const roofRidgeItems = findItems('roof', /ครอบสัน|ครอบข้าง|ครอบตะเข้|flashing/i);
    const roofInsulationItems = findItems('roof', /ฉนวน|สะท้อนความร้อน|foil/i);

    // Rule 2.1: Roof Tiles with 0 Steel Structure
    if (roofCoverM2 > 0 && roofSteelKg === 0) {
      list.push({
        id: 'roof-no-steel',
        category: 'roof',
        categoryLabel: CATEGORY_LABELS['roof']?.title || 'งานหลังคา',
        severity: 'critical',
        title: `มีกระเบื้องมุงหลังคา ${roofCoverM2.toLocaleString()} ตร.ม. แต่งานโครงสร้างเหล็กหลังคาเป็น 0 กก.`,
        description: 'ตรวจพบรายการแผ่นมุงหลังคา แต่ไม่พบรายการโครงสร้างเหล็กรูปพรรณ (อะเส จันทัน แป โครงถัก)',
        impact: 'ไม่มีโครงสร้างรองรับน้ำหนักกระเบื้องหลังคา หากลืมคิดราคาโครงเหล็กจะทำให้งบประมาณขาดทุนหลักแสนบาท',
        recommendation: 'ใช้เครื่องมือคำนวณ "2. หลังคา & มุง" เพื่อถอดแบบโครงสร้างเหล็กและแปหลังคาให้ครบถ้วน',
        canAutoFix: true,
        fixActionType: 'add_roof_structure'
      });
    }

    // Rule 2.2: Roof Tiles without Ridge Caps
    if (roofCoverM2 > 30 && roofRidgeItems.length === 0) {
      list.push({
        id: 'roof-no-ridge',
        category: 'roof',
        categoryLabel: CATEGORY_LABELS['roof']?.title || 'งานหลังคา',
        severity: 'warning',
        title: 'มีกระเบื้องมุงหลังคา แต่ไม่มีชุดครอบสันหลังคาหรือครอบข้าง (Ridge Caps)',
        description: `มีพื้นที่มุง ${roofCoverM2.toFixed(0)} ตร.ม. แต่ไม่มีรายการกระเบื้องครอบสันหลังคาหรือปูนยึดครอบแห้ง (Dry Tech)`,
        impact: 'น้ำฝนจะรั่วซึมรอยต่อสันหลังคาเข้าสู่ฝ้าเพดานภายในบ้านอย่างแน่นอน',
        recommendation: 'เพิ่มรายการครอบสันหลังคา ครอบข้าง และอุปกรณ์ยึดครอบแห้งตามแนวยาวสันหลังคา'
      });
    }

    // Rule 2.3: Roof without Heat Insulation
    if (roofCoverM2 > 50 && roofInsulationItems.length === 0) {
      list.push({
        id: 'roof-no-insulation',
        category: 'roof',
        categoryLabel: CATEGORY_LABELS['roof']?.title || 'งานหลังคา',
        severity: 'info',
        title: 'แนะนำติดตั้งแผ่นสะท้อนความร้อนหรือฉนวนกันความร้อนใต้หลังคา',
        description: 'ไม่พบรายการแผ่นฟอยล์สะท้อนความร้อนหรือฉนวนใยแก้วใต้แผ่นหลังคา',
        impact: 'บ้านพักอาศัยในประเทศไทยจะสะสมความร้อนสูง ทำให้เครื่องปรับอากาศกินไฟมากขึ้น',
        recommendation: 'เพิ่มแผ่นสะท้อนความร้อนปูใต้แป หรือฉนวนกันความร้อนเหนือฝ้าเพดานหนา 3-6 นิ้ว'
      });
    }

    // -------------------------------------------------------------------------
    // 3. MASONRY AUDIT: Brick Masonry vs Plastering & Lintels
    // -------------------------------------------------------------------------
    const masonryItems = findItems('masonry_wall', /ก่ออิฐ|อิฐมวลเบา|อิฐมอญ|อิฐบล็อก/i);
    const masonryM2 = masonryItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const plasterItems = findItems('masonry_wall', /ฉาบปูน|ปูนฉาบ|ฉาบผิว/i);
    const plasterM2 = plasterItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const lintelItems = findItems('masonry_wall', /เสาเอ็น|ทับหลัง|เสาค้ำยันผนัง/i);

    // Rule 3.1: Masonry with 0 Plaster
    if (masonryM2 > 0 && plasterM2 === 0) {
      list.push({
        id: 'wall-no-plaster',
        category: 'masonry_wall',
        categoryLabel: CATEGORY_LABELS['masonry_wall']?.title || 'งานผนังและฉาบปูน',
        severity: 'critical',
        title: `มีงานก่อผนัง ${masonryM2.toLocaleString()} ตร.ม. แต่ไม่มีงานฉาบปูนตกแต่งผิว (0 ตร.ม.)`,
        description: 'ตรวจพบปริมาณงานก่ออิฐ แต่ไม่พบรายการปูนฉาบผิวผนังทั้งด้านในและด้านนอก',
        impact: 'ผนังอิฐเปลือยไม่สามารถทนฝนและกักเก็บเสียงได้ อีกทั้งผิวงานจะไม่เรียบสำหรับทาสีตกแต่ง',
        recommendation: 'คำนวณงานฉาบปูนทั้ง 2 ด้านของผนัง (พื้นที่ฉาบ = พื้นที่ก่อผนัง x 2)',
        canAutoFix: true,
        fixActionType: 'add_plaster'
      });
    } else if (masonryM2 > 20 && plasterM2 > 0 && plasterM2 < masonryM2 * 1.5) {
      // Rule 3.2: Plaster area too low (less than 2 sides)
      list.push({
        id: 'wall-low-plaster-area',
        category: 'masonry_wall',
        categoryLabel: CATEGORY_LABELS['masonry_wall']?.title || 'งานผนังและฉาบปูน',
        severity: 'warning',
        title: `พื้นที่ฉาบปูน (${plasterM2.toFixed(0)} ตร.ม.) น้อยกว่า 2 เท่าของพื้นที่ก่ออิฐ (${(masonryM2 * 2).toFixed(0)} ตร.ม.)`,
        description: 'ผนังอาคารทั่วไปต้องฉาบทั้งด้านในและด้านนอก ยกเว้นผนังตกแต่งเฉพาะจุด',
        impact: 'อาจคำนวณพื้นที่ฉาบปูนตกหล่นเพียงด้านเดียว ส่งผลให้งบประมาณค่าปูนและค่าแรงฉาบไม่พอ',
        recommendation: 'ตรวจสอบว่ามีการคิดพื้นที่ฉาบปูนครบทั้งผิวนอกและผิวในอาคารแล้วหรือไม่'
      });
    }

    // Rule 3.3: Masonry without Lintels & Stiffeners
    if (masonryM2 > 30 && lintelItems.length === 0) {
      list.push({
        id: 'wall-no-lintels',
        category: 'masonry_wall',
        categoryLabel: CATEGORY_LABELS['masonry_wall']?.title || 'งานผนังและฉาบปูน',
        severity: 'warning',
        title: 'มีงานก่อผนัง แต่ไม่มีรายการเสาเอ็นและคานทับหลัง คสล. (Lintels & Stiffeners)',
        description: `มีผนังก่อ ${masonryM2.toFixed(0)} ตร.ม. แต่ไม่พบรายการเสาเอ็น-ทับหลังรอบวงกบประตูหน้าต่าง`,
        impact: 'หากไม่มีเสาเอ็นและคานทับหลัง ผนังจะเกิดรอยร้าวทแยงมุมรอบวงกบประตูหน้าต่าง และผนังอาจล้มเมื่อโดนลมปะทะ',
        recommendation: 'เพิ่มรายการเสาเอ็นและคานทับหลัง คสล. (อัตราส่วนประมาณ 1.5 - 2 เมตรต่อ ตร.ม. ผนัง)',
        canAutoFix: true,
        fixActionType: 'add_lintel'
      });
    }

    // -------------------------------------------------------------------------
    // 4. ELECTRICAL AUDIT: Outlets vs Wire & Protection
    // -------------------------------------------------------------------------
    const elecPointItems = findItems('electrical', /ดวงโคม|เต้ารับ|สวิตช์|หลอดไฟ|โคมไฟ|ดาวน์ไลท์/i);
    const elecPointsCount = elecPointItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const wireItems = findItems('electrical', /สายไฟ|thw|vaf|nyy|สาย thw|สาย vaf/i);
    const wireLengthM = wireItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const breakerItems = findItems('electrical', /ตู้ควบคุม|consumer unit|ตู้ไฟ|เบรกเกอร์|cb/i);
    const groundItems = findItems('electrical', /หลักดิน|ground rod|แท่งกราวด์|สายดิน/i);

    // Rule 4.1: Elec points without Wire
    if (elecPointsCount > 5 && wireLengthM === 0) {
      list.push({
        id: 'elec-no-wire',
        category: 'electrical',
        categoryLabel: CATEGORY_LABELS['electrical']?.title || 'งานระบบไฟฟ้า',
        severity: 'critical',
        title: `มีอุปกรณ์ไฟฟ้า/เต้ารับ ${elecPointsCount} จุด แต่ไม่มีรายการสายไฟแม้แต่ม้วนเดียว (0 ม.)`,
        description: 'ตรวจพบเต้ารับ สวิตช์ และดวงโคม แต่ไม่พบรายการสายไฟ THW / VAF และท่อร้อยสายไฟ',
        impact: 'ระบบไฟฟ้าไม่สามารถเชื่อมต่อได้ ขาดต้นทุนสายไฟและท่อร้อยสายซึ่งเป็นค่าวัสดุหลักของระบบไฟฟ้า',
        recommendation: 'ใช้เครื่องมือคำนวณ "7. ไฟฟ้า & วงจรย่อย" เพื่อคำนวณความยาวสายไฟและท่อร้อยสายอัตโนมัติ'
      });
    }

    // Rule 4.2: Elec without Consumer Unit
    if (elecPointsCount > 10 && breakerItems.length === 0) {
      list.push({
        id: 'elec-no-panel',
        category: 'electrical',
        categoryLabel: CATEGORY_LABELS['electrical']?.title || 'งานระบบไฟฟ้า',
        severity: 'warning',
        title: 'ไม่มีรายการตู้ควบคุมไฟฟ้า Consumer Unit และเบรกเกอร์ป้องกันไฟรั่ว',
        description: 'ไม่พบตู้ควบคุมไฟฟ้าหลัก เบรกเกอร์เมน หรือลูกเซอร์กิตเบรกเกอร์สำหรับตัดวงจร',
        impact: 'ไม่ผ่านเกณฑ์ตรวจมาตรฐานของการไฟฟ้า (กฟน./กฟภ.) และเสี่ยงอันตรายต่อชีวิตจากไฟดูด/ไฟฟ้าลัดวงจร',
        recommendation: 'เพิ่มตู้ Consumer Unit 6-12 ช่อง พร้อม Main Breaker และ RCBO ตัดไฟรั่ว'
      });
    }

    // Rule 4.3: Elec without Ground Rod
    if (elecPointsCount > 10 && groundItems.length === 0) {
      list.push({
        id: 'elec-no-ground',
        category: 'electrical',
        categoryLabel: CATEGORY_LABELS['electrical']?.title || 'งานระบบไฟฟ้า',
        severity: 'warning',
        title: 'ไม่มีรายการแท่งหลักดิน (Ground Rod) ตามข้อกำหนดการไฟฟ้า',
        description: 'ไม่พบรายการแท่งทองแดงตอกลงดิน (Ground Rod ขนาดมาตรฐาน 5/8" ยาว 2.40 ม.)',
        impact: 'การไฟฟ้าจะไม่ยอมจ่ายไฟเข้ามิเตอร์หากตรวจไม่พบระบบสายดินมาตรฐาน',
        recommendation: 'เพิ่มรายการแท่งหลักดินทองแดง 5/8" ยาว 2.40 เมตร พร้อมแคลมป์ทองเหลืองและสายดิน THW'
      });
    }

    // -------------------------------------------------------------------------
    // 5. SANITARY AUDIT: Fixtures vs Water Supply & Drainage Pipes
    // -------------------------------------------------------------------------
    const fixtureItems = findItems('sanitary', /สุขภัณฑ์|ชักโครก|โถส้วม|อ่างล้างหน้า|ฝักบัว|ก๊อกน้ำ|โถปัสสาวะ/i);
    const fixturesCount = fixtureItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const waterPipes = findItems('sanitary', /ท่อน้ำดี|ท่อประปา|pvc ฟ้า|ppr/i);
    const drainPipes = findItems('sanitary', /ท่อน้ำทิ้ง|ท่อโสโครก|ท่ออากาศ|ท่อส้วม/i);
    const septicItems = findItems('sanitary', /ถังบำบัด|septic|ถังแซท/i);

    // Rule 5.1: Fixtures without water pipes
    if (fixturesCount > 0 && waterPipes.length === 0) {
      list.push({
        id: 'sanitary-no-water-pipes',
        category: 'sanitary',
        categoryLabel: CATEGORY_LABELS['sanitary']?.title || 'งานสุขาภิบาล',
        severity: 'critical',
        title: `มีสุขภัณฑ์ ${fixturesCount} ชุด แต่ไม่มีรายการท่อประปาน้ำดี (PPR / PVC)`,
        description: 'มีรายการโถสุขภัณฑ์ อ่างล้างหน้า หรือฝักบัว แต่ไม่พบรายการเดินท่อประปาน้ำดีและข้อต่อ',
        impact: 'ห้องน้ำใช้งานไม่ได้ ไม่มีระบบจ่ายน้ำ และตกหล่นต้นทุนท่อประปา ข้อต่อ และวาล์วน้ำ',
        recommendation: 'เพิ่มรายการท่อ PVC ชั้น 13.5 หรือท่อ PPR พร้อมอุปกรณ์ข้อต่อและบอลวาล์ว'
      });
    }

    // Rule 5.2: Fixtures without septic tank
    if (fixturesCount > 0 && septicItems.length === 0) {
      list.push({
        id: 'sanitary-no-septic',
        category: 'sanitary',
        categoryLabel: CATEGORY_LABELS['sanitary']?.title || 'งานสุขาภิบาล',
        severity: 'warning',
        title: 'มีโถสุขภัณฑ์ แต่ไม่มีรายการถังบำบัดน้ำเสียสำเร็จรูป (Septic Tank)',
        description: 'ไม่พบถังบำบัดน้ำเสียสำหรับบำบัดของเสียจากสุขภัณฑ์และน้ำทิ้ง',
        impact: 'ไม่สามารถขออนุญาตเปิดใช้อาคาร และเป็นปัญหาด้านสุขอนามัยและสิ่งแวดล้อม',
        recommendation: 'เพิ่มถังบำบัดน้ำเสียสำเร็จรูปขนาด 1,000 - 2,000 ลิตร พร้อมงานขุดดินฝังถัง'
      });
    }

    // -------------------------------------------------------------------------
    // 6. FINANCIAL & PRICING AUDIT: Missing Labor, Zero Prices
    // -------------------------------------------------------------------------
    const zeroPriceItems = items.filter(i => {
      const q = Number(i.quantity) || 0;
      const mat = Number(i.materialUnitPrice) || 0;
      const lab = Number(i.laborUnitPrice) || 0;
      return q > 0 && (mat + lab === 0);
    });

    if (zeroPriceItems.length > 0) {
      list.push({
        id: 'cost-zero-prices',
        category: 'costing',
        categoryLabel: 'การตั้งราคา & ต้นทุน',
        severity: 'critical',
        title: `พบ ${zeroPriceItems.length} รายการที่มีปริมาณงาน แต่ราคาต่อหน่วยเป็น 0 บาท`,
        description: `รายการที่มีปริมาณแต่ไม่มีราคา เช่น: ${zeroPriceItems.slice(0, 3).map(i => i.name).join(', ')}${zeroPriceItems.length > 3 ? '...' : ''}`,
        impact: 'ทำให้ราคาประเมิน BOQ ต่ำกว่าความเป็นจริงอย่างมีนัยสำคัญ ส่งผลให้เสนอราคาขาดทุนทันที',
        recommendation: 'ตรวจสอบและกรอกราคาต่อหน่วยของวัสดุและค่าแรงให้ครบทุกรายการ'
      });
    }

    const zeroLaborItems = items.filter(i => {
      const q = Number(i.quantity) || 0;
      const mat = Number(i.materialUnitPrice) || 0;
      const lab = Number(i.laborUnitPrice) || 0;
      // Skip materials that typically don't have separate labor or are package items
      const isPureMaterialOnly = /ค่าทดสอบ|ค่าน้ำชั่วคราว|ค่าไฟชั่วคราว|ค่าขนย้าย/i.test(i.name);
      return q > 0 && mat > 0 && lab === 0 && !isPureMaterialOnly;
    });

    if (zeroLaborItems.length >= 3) {
      list.push({
        id: 'cost-zero-labor',
        category: 'costing',
        categoryLabel: 'การตั้งราคา & ต้นทุน',
        severity: 'warning',
        title: `พบ ${zeroLaborItems.length} รายการที่มีค่าของ แต่ไม่ได้ใส่ค่าแรงช่าง (ค่าแรง = 0)`,
        description: `เช่น ${zeroLaborItems.slice(0, 3).map(i => i.name).join(', ')}${zeroLaborItems.length > 3 ? '...' : ''}`,
        impact: 'ผู้รับเหมามักตกม้าตายกับการลืมใส่ค่าแรง ทำให้ต้องออกค่าแรงช่างเองจากกำไรของบริษัท',
        recommendation: 'ใส่ค่าแรงติดตั้งตามมาตรฐานกรมบัญชีกลางหรือราคากลางท้องถิ่น',
        canAutoFix: true,
        fixActionType: 'add_zero_labor'
      });
    }

    // Labor ratio check
    if (summary.totalMaterial > 0) {
      const laborPercent = Math.round((summary.totalLabor / (summary.totalMaterial + summary.totalLabor)) * 100);
      if (laborPercent < 15) {
        list.push({
          id: 'cost-low-labor-ratio',
          category: 'costing',
          categoryLabel: 'การตั้งราคา & ต้นทุน',
          severity: 'warning',
          title: `สัดส่วนค่าแรงรวมต่ำผิดปกติ (${laborPercent}% ของต้นทุนตรง)`,
          description: `ค่าแรงรวมคิดเป็นเพียง ${laborPercent}% เทียบกับค่าวัสดุ (ปกติงานอาคารไทยควรอยู่ที่ 25% – 35%)`,
          impact: 'เสี่ยงคำนวณค่าแรงต่ำเกินจริง ไม่ครอบคลุมค่าจ้างช่างฝีมือในสภาพตลาดปัจจุบัน',
          recommendation: 'ทบทวนอัตราค่าแรงต่อหน่วยในแต่ละหมวดงาน โดยเฉพาะงานโครงสร้างและงานปูกระเบื้อง'
        });
      }
    }

    return list;
  }, [items, summary]);

  // Compute Health Score (0 - 100)
  const healthScore = useMemo(() => {
    let score = 100;
    issues.forEach(issue => {
      if (issue.severity === 'critical') score -= 18;
      else if (issue.severity === 'warning') score -= 7;
      else if (issue.severity === 'info') score -= 2;
    });
    return Math.max(10, Math.min(100, score));
  }, [issues]);

  const scoreColor = healthScore >= 90 ? 'text-emerald-400' : healthScore >= 70 ? 'text-amber-400' : 'text-rose-400';
  const scoreBg = healthScore >= 90 ? 'bg-emerald-500/10 border-emerald-500/30' : healthScore >= 70 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-rose-500/10 border-rose-500/30';
  const scoreLabel = healthScore >= 90 ? 'สุขภาพ BOQ ดีเยี่ยม ผ่านเกณฑ์วิศวกรรม' : healthScore >= 70 ? 'ปานกลาง มีข้อควรระวังที่ควรปรับปรุง' : 'มีความเสี่ยงสูง ต้องแก้ไขก่อนเสนอราคา';

  // Filtered issues
  const filteredIssues = useMemo(() => {
    if (activeTab === 'all') return issues;
    return issues.filter(i => i.severity === activeTab);
  }, [issues, activeTab]);

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  if (!isOpen) return null;

  // Handle Auto-Fix
  const handleExecuteFix = (issue: SanityIssue) => {
    if (!issue.canAutoFix || !issue.fixActionType) return;

    let updated = [...items];

    if (issue.fixActionType === 'add_stirrups') {
      // Find main rebar weight
      const rebarItems = updated.filter(i => i.category === 'structure' && /เหล็กข้ออ้อย|เหล็กเส้น|db/i.test(i.name));
      const totalRebarKg = rebarItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      const estStirrupKg = Math.max(150, Math.round(totalRebarKg * 0.18));
      const estTieWireKg = Math.max(15, Math.round(totalRebarKg * 0.025));

      const newStirrupItem: BOQItem = {
        id: 'auto-stirrup-' + Date.now(),
        category: 'structure',
        name: 'เหล็กปลอกเสา-คาน RB6 มม. มอก. (พร้อมดัดขึ้นรูป)',
        spec: 'เหล็กปลอกรับแรงเฉือน สำหรับเสาและคาน คสล.',
        unit: 'กก.',
        quantity: estStirrupKg,
        materialUnitPrice: 27,
        laborUnitPrice: 7,
        wastePercent: 5
      };

      const newWireItem: BOQItem = {
        id: 'auto-wire-' + Date.now(),
        category: 'structure',
        name: 'ลวดผูกเหล็ก เบอร์ 18 (Annealed Wire)',
        spec: 'สำหรับผูกเหล็กเสริมโครงสร้าง คสล.',
        unit: 'กก.',
        quantity: estTieWireKg,
        materialUnitPrice: 48,
        laborUnitPrice: 0,
        wastePercent: 5
      };

      updated.push(newStirrupItem, newWireItem);
    } else if (issue.fixActionType === 'add_plaster') {
      // Find masonry area
      const masonryItems = updated.filter(i => i.category === 'masonry_wall' && /ก่ออิฐ/i.test(i.name));
      const totalMasonryM2 = masonryItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      const estPlasterM2 = Math.round(totalMasonryM2 * 2);

      const newPlasterItem: BOQItem = {
        id: 'auto-plaster-' + Date.now(),
        category: 'masonry_wall',
        name: 'งานฉาบปูนผิวผนัง 2 ด้าน (ฉาบปูนสำเร็จรูป หนา 1.5 ซม.)',
        spec: 'ปูนฉาบผิวเรียบทั้งด้านในและด้านนอก พร้อมจับเซี้ยม-จับปุ่ม',
        unit: 'ตร.ม.',
        quantity: estPlasterM2,
        materialUnitPrice: 95,
        laborUnitPrice: 105,
        wastePercent: 5
      };

      updated.push(newPlasterItem);
    } else if (issue.fixActionType === 'add_zero_labor') {
      // Apply 30% of material price as standard labor for items with 0 labor
      updated = updated.map(item => {
        const q = Number(item.quantity) || 0;
        const mat = Number(item.materialUnitPrice) || 0;
        const lab = Number(item.laborUnitPrice) || 0;
        const isExcluded = /ค่าทดสอบ|ค่าน้ำชั่วคราว|ค่าไฟชั่วคราว/i.test(item.name);

        if (q > 0 && mat > 0 && lab === 0 && !isExcluded) {
          const autoLabor = Math.max(25, Math.round(mat * 0.3));
          return { ...item, laborUnitPrice: autoLabor };
        }
        return item;
      });
    } else if (issue.fixActionType === 'add_lintel') {
      const masonryItems = updated.filter(i => i.category === 'masonry_wall' && /ก่ออิฐ/i.test(i.name));
      const totalMasonryM2 = masonryItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      const estLintelM = Math.max(20, Math.round(totalMasonryM2 * 0.4));

      const newLintelItem: BOQItem = {
        id: 'auto-lintel-' + Date.now(),
        category: 'masonry_wall',
        name: 'งานเสาเอ็นและคานทับหลัง คสล. ขนาด 0.10 x 0.10 ม.',
        spec: 'เสริมเหล็ก 2-RB9 พร้อมเหล็กปลอก RB6 @0.20 ม. รอบวงกบประตูหน้าต่าง',
        unit: 'ม.',
        quantity: estLintelM,
        materialUnitPrice: 120,
        laborUnitPrice: 90,
        wastePercent: 5
      };

      updated.push(newLintelItem);
    }

    setFixedIssues(prev => ({ ...prev, [issue.id]: true }));
    onApplyFixes(updated);
  };

  const handleCopyReport = () => {
    let report = `🛡️ รายงานผลการตรวจสอบ BOQ & มาตรฐานวิศวกรรม (AI Safety Check)\n`;
    report += `🏗️ โครงการ: ${projectName} (${houseAreaSqm} ตร.ม.)\n`;
    report += `📊 คะแนนความสมบูรณ์: ${healthScore}/100 (${scoreLabel})\n`;
    report += `--------------------------------------------------\n`;
    report += `🚨 ข้อผิดพลาดวิกฤต (Critical): ${criticalCount} รายการ\n`;
    report += `⚠️ ข้อควรระวัง (Warning): ${warningCount} รายการ\n`;
    report += `💡 คำแนะนำ (Best Practice): ${infoCount} รายการ\n`;
    report += `--------------------------------------------------\n\n`;

    issues.forEach((iss, idx) => {
      const sevTag = iss.severity === 'critical' ? '🔴 [CRITICAL]' : iss.severity === 'warning' ? '🟡 [WARNING]' : '🔵 [INFO]';
      report += `${idx + 1}. ${sevTag} ${iss.title}\n`;
      report += `   หมวดงาน: ${iss.categoryLabel}\n`;
      report += `   รายละเอียด: ${iss.description}\n`;
      report += `   ผลกระทบ: ${iss.impact}\n`;
      report += `   แนวทางแก้ไข: ${iss.recommendation}\n\n`;
    });

    report += `--------------------------------------------------\n`;
    report += `✨ ตรวจสอบอัตโนมัติโดยระบบ Thai Construction BOQ Pro`;

    navigator.clipboard.writeText(report);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  };

  const handleReScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  AI ตรวจสอบความถูกต้อง & มาตรฐานความปลอดภัย BOQ
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                  AI Sanity Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                สแกนความขัดแย้งของปริมาณงาน, สัดส่วนวิศวกรรม วสท., และข้อผิดพลาดที่เสี่ยงต่อการขาดทุน
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

        {/* Health Score Overview Banner */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center ${scoreBg} shadow-inner shrink-0`}>
              <span className={`text-2xl font-black font-mono leading-none ${scoreColor}`}>
                {healthScore}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold mt-0.5">/ 100</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${scoreColor}`}>
                  {scoreLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                โครงการ: <span className="text-slate-200 font-medium">{projectName}</span> ({houseAreaSqm} ตร.ม.)
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] font-semibold">
                <span className="text-rose-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  วิกฤต: {criticalCount}
                </span>
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  ข้อควรระวัง: {warningCount}
                </span>
                <span className="text-cyan-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  คำแนะนำ: {infoCount}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReScan}
              disabled={isScanning}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <span className={`material-symbols-outlined text-sm ${isScanning ? 'animate-spin' : ''}`}>sync</span>
              <span>{isScanning ? 'กำลังสแกน...' : 'สแกนซ้ำ'}</span>
            </button>
            <button
              onClick={handleCopyReport}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
                copyToast 
                  ? 'bg-emerald-600 border-emerald-500 text-white' 
                  : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{copyToast ? 'check' : 'content_copy'}</span>
              <span>{copyToast ? 'คัดลอกแล้ว!' : 'คัดลอกรายงาน'}</span>
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>ทั้งหมด</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800">
              {issues.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('critical')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'critical'
                ? 'bg-rose-600 text-white shadow'
                : 'text-rose-400/80 hover:text-rose-300'
            }`}
          >
            <span>🚨 วิกฤต (Critical)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/30">
              {criticalCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('warning')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'warning'
                ? 'bg-amber-600 text-white shadow'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <span>⚠️ ข้อควรระวัง (Warning)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30">
              {warningCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-cyan-400/80 hover:text-cyan-300'
            }`}
          >
            <span>💡 ข้อแนะนำ (Tips)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
              {infoCount}
            </span>
          </button>
        </div>

        {/* Issues List Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3.5 bg-slate-950/60">
          {filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                ไม่พบความผิดปกติในหมวดนี้
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                ปริมาณงานและรายการวัสดุตรงตามมาตรฐานวิศวกรรมโครงสร้างและหลักความปลอดภัย
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => {
              const isFixed = fixedIssues[issue.id];
              const borderTheme = issue.severity === 'critical'
                ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-900'
                : issue.severity === 'warning'
                ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900'
                : 'border-cyan-500/40 bg-gradient-to-r from-cyan-950/30 via-slate-900 to-slate-900';

              const badgeTheme = issue.severity === 'critical'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : issue.severity === 'warning'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';

              const badgeIcon = issue.severity === 'critical' ? 'error' : issue.severity === 'warning' ? 'warning' : 'lightbulb';
              const badgeText = issue.severity === 'critical' ? 'วิกฤต (Critical)' : issue.severity === 'warning' ? 'ข้อควรระวัง (Warning)' : 'คำแนะนำ (Tip)';

              return (
                <div 
                  key={issue.id}
                  className={`p-4 rounded-xl border ${borderTheme} flex flex-col gap-2.5 transition relative overflow-hidden`}
                >
                  {isFixed && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check</span>
                      <span>แก้ไขแล้วใน BOQ</span>
                    </div>
                  )}

                  {/* Title & Badges */}
                  <div className="flex items-start justify-between gap-3 pr-20">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badgeTheme}`}>
                        <span className="material-symbols-outlined text-xs">{badgeIcon}</span>
                        <span>{badgeText}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-medium">
                        {issue.categoryLabel}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-white leading-snug">
                    {issue.title}
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {issue.description}
                  </p>

                  {/* Impact & Consequence */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 text-[11px] flex flex-col gap-1">
                    <div className="flex items-start gap-1.5 text-rose-300/90 font-medium">
                      <span className="material-symbols-outlined text-xs text-rose-400 mt-0.5 shrink-0">report_problem</span>
                      <span><strong>ผลกระทบ:</strong> {issue.impact}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-emerald-300/90 font-medium">
                      <span className="material-symbols-outlined text-xs text-emerald-400 mt-0.5 shrink-0">task_alt</span>
                      <span><strong>แนวทางแก้ไข:</strong> {issue.recommendation}</span>
                    </div>
                  </div>

                  {/* Quick Fix Button (If supported) */}
                  {issue.canAutoFix && !isFixed && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleExecuteFix(issue)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">bolt</span>
                        <span>กดแก้ไขด่วนอัตโนมัติ</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-purple-400">psychology</span>
            <span>ระบบวิเคราะห์ตามมาตรฐานวิศวกรรมสถานแห่งประเทศไทย (วสท.) & กรมบัญชีกลาง</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
