import { BOQItem, PriceBookConfig, RegionalPreset, RegionalZoneId, MasterRatesConfig, SavedPriceBookItem } from '../types';

export const PRICE_BOOK_STORAGE_KEY = 'thai_boq_price_book_v1';

// 🗺️ 6 โซนภูมิภาคมาตรฐานของประเทศไทย พร้อมสัดส่วนตัวคูณดัชนีราคาวัสดุและค่าแรง
export const REGIONAL_PRESETS: RegionalPreset[] = [
  {
    id: 'central_bkk',
    name: 'กรุงเทพฯ และปริมณฑล',
    shortDesc: 'ฐานราคามาตรฐานศูนย์กลางขนส่งและค่าแรงขั้นต่ำระดับเมืองหลวง',
    materialMultiplier: 1.00,
    laborMultiplier: 1.00,
    provincesSample: 'กทม., นนทบุรี, ปทุมธานี, สมุทรปราการ, สมุทรสาคร, นครปฐม'
  },
  {
    id: 'central_east',
    name: 'ภาคกลางและภาคตะวันออก',
    shortDesc: 'ต้นทุนขนส่งใกล้โรงงานผลิตปูนซีเมนต์/เหล็ก ค่าแรงอิงเขตอุตสาหกรรม EEC',
    materialMultiplier: 1.03,
    laborMultiplier: 0.95,
    provincesSample: 'อยุธยา, สระบุรี, ชลบุรี, ระยอง, ฉะเชิงเทรา, จันทบุรี'
  },
  {
    id: 'north',
    name: 'ภาคเหนือ',
    shortDesc: 'ระยะทางขนส่งไกลจากแหล่งผลิต ค่าน้ำมันขนส่งสูงขึ้น แต่ฐานค่าแรงช่างท้องถิ่นต่ำกว่า',
    materialMultiplier: 1.06,
    laborMultiplier: 0.85,
    provincesSample: 'เชียงใหม่, เชียงราย, ลำปาง, ลำพูน, พิษณุโลก, น่าน, แพร่'
  },
  {
    id: 'northeast',
    name: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)',
    shortDesc: 'ค่าขนส่งวัสดุหนักเพิ่มขึ้นเล็กน้อย แหล่งแรงงานก่อสร้าง ค่าแรงรายวันย่อมเยา',
    materialMultiplier: 1.05,
    laborMultiplier: 0.82,
    provincesSample: 'นครราชสีมา, ขอนแก่น, อุดรธานี, อุบลราชธานี, บุรีรัมย์, สกลนคร'
  },
  {
    id: 'south',
    name: 'ภาคใต้',
    shortDesc: 'ระยะทางขนส่งยาวไกล หิน/ทรายบางพื้นที่ขาดแคลน ค่าครองชีพและค่าแรงสูงใกล้เคียง กทม.',
    materialMultiplier: 1.08,
    laborMultiplier: 0.98,
    provincesSample: 'ภูเก็ต, สุราษฎร์ธานี, สงขลา, กระบี่, นครศรีธรรมราช, ชุมพร'
  },
  {
    id: 'remote_island',
    name: 'พื้นที่พิเศษ / เกาะ / บนดอย',
    shortDesc: 'ต้องข้ามเรือเฟอร์รี่ หรือขึ้นเขาชัน ขนย้ายวัสดุลำบาก ค่าแรงหน้างานต้องบวกเบี้ยเลี้ยง',
    materialMultiplier: 1.20,
    laborMultiplier: 1.10,
    provincesSample: 'เกาะสมุย, เกาะพะงัน, เกาะเต่า, เกาะช้าง, แม่ฮ่องสอน, ปาย'
  }
];

// ราคากลางวัสดุและค่าแรงหลักเริ่มต้น (Master Rates)
export const DEFAULT_MASTER_RATES: MasterRatesConfig = {
  concreteReadyMixedPerCuM: 2150, // คอนกรีตผสมเสร็จ 240 ksc คิวละ
  steelDeformedBarPerKg: 26,      // เหล็กข้ออ้อย มอก. กก.ละ
  formworkPerSqm: 140,            // ไม้แบบหล่อโครงสร้าง ตร.ม.ละ
  masonryLaborPerSqm: 100,        // ค่าแรงก่อผนัง ตร.ม.ละ
  plasterLaborPerSqm: 95,         // ค่าแรงฉาบปูน 2 ด้าน ตร.ม.ละ
  tileLaborPerSqm: 200,           // ค่าแรงปูกระเบื้อง ตร.ม.ละ
  paintLaborPerSqm: 55            // ค่าแรงทาสี ตร.ม.ละ
};

// ตัวอย่างรายการในคลังส่วนตัวเริ่มต้น (Preset Custom Items)
export const INITIAL_SAVED_CUSTOM_ITEMS: SavedPriceBookItem[] = [
  {
    savedId: 'sample-paving-1',
    category: 'external_works',
    name: 'งานปูบล็อกหญ้าคอนกรีต ปลูกหญ้ามาเลเซีย',
    spec: 'บล็อกปลูกหญ้า 40x25x8 ซม. SCG พร้อมทรายรองก้นบดอัดและดินปลูกหญ้า',
    quantity: 25,
    unit: 'ตร.ม.',
    materialUnitPrice: 280,
    laborUnitPrice: 120,
    wastePercent: 5,
    customGroup: 'งานจัดสวนและทางเท้า'
  },
  {
    savedId: 'sample-fence-mesh',
    category: 'external_works',
    name: 'รั้วตาข่ายถัก Chainlink ชุบกัลวาไนซ์ สูง 1.80 ม.',
    spec: 'ตาข่ายเบอร์ 10 ตา 2" พร้อมเสาท่อเหล็กกัลวาไนซ์ 2" @ 2.50 ม. เทตอม่อ คสล.',
    quantity: 30,
    unit: 'ม.',
    materialUnitPrice: 580,
    laborUnitPrice: 220,
    wastePercent: 3,
    customGroup: 'งานรั้วและประตู'
  },
  {
    savedId: 'sample-poly-roof',
    category: 'roof',
    name: 'กันสาดแผ่นโพลีคาร์บอเนตตัน หนา 3 มม. โครงสแตนเลส',
    spec: 'โครงสแตนเลสกล่อง 304 พร้อมแผ่นโพลีฯ กรองรังสียูวี และยาแนวซิลิโคนกันรั่วซึม',
    quantity: 12,
    unit: 'ตร.ม.',
    materialUnitPrice: 1850,
    laborUnitPrice: 550,
    wastePercent: 5,
    customGroup: 'งานกันสาดและโรงรถ'
  }
];

export const DEFAULT_PRICE_BOOK_CONFIG: PriceBookConfig = {
  regionId: 'central_bkk',
  regionName: 'กรุงเทพฯ และปริมณฑล',
  materialMultiplier: 1.00,
  laborMultiplier: 1.00,
  autoApplyToNewItems: true,
  masterRates: { ...DEFAULT_MASTER_RATES },
  savedCustomItems: [...INITIAL_SAVED_CUSTOM_ITEMS],
  lastUpdated: new Date().toISOString()
};

/**
 * โหลดการตั้งค่าคลังราคาและภูมิภาคจาก localStorage
 */
export function loadPriceBookConfig(): PriceBookConfig {
  try {
    const raw = localStorage.getItem(PRICE_BOOK_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRICE_BOOK_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      regionId: parsed.regionId || 'central_bkk',
      regionName: parsed.regionName || 'กรุงเทพฯ และปริมณฑล',
      materialMultiplier: typeof parsed.materialMultiplier === 'number' ? parsed.materialMultiplier : 1.00,
      laborMultiplier: typeof parsed.laborMultiplier === 'number' ? parsed.laborMultiplier : 1.00,
      autoApplyToNewItems: parsed.autoApplyToNewItems ?? true,
      masterRates: { ...DEFAULT_MASTER_RATES, ...(parsed.masterRates || {}) },
      savedCustomItems: Array.isArray(parsed.savedCustomItems) ? parsed.savedCustomItems : [...INITIAL_SAVED_CUSTOM_ITEMS],
      lastUpdated: parsed.lastUpdated || new Date().toISOString()
    };
  } catch (err) {
    console.warn('Failed to load PriceBookConfig, using default', err);
    return { ...DEFAULT_PRICE_BOOK_CONFIG };
  }
}

/**
 * บันทึกการตั้งค่าคลังราคาและภูมิภาคลง localStorage
 */
export function savePriceBookConfig(config: PriceBookConfig): void {
  try {
    const dataToSave: PriceBookConfig = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(PRICE_BOOK_STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (err) {
    console.error('Failed to save PriceBookConfig', err);
  }
}

/**
 * รีเซ็ตการตั้งค่าคลังราคาและภูมิภาคกลับเป็นค่าเริ่มต้น
 */
export function resetPriceBookConfig(): PriceBookConfig {
  const fresh = { ...DEFAULT_PRICE_BOOK_CONFIG, lastUpdated: new Date().toISOString() };
  savePriceBookConfig(fresh);
  return fresh;
}

/**
 * นำราคากลาง Master Rates ไปตรวจสอบและอัปเดตราคาฐานของรายการที่ตรงกัน
 */
function checkAndUpdateMasterRate(item: BOQItem, baseMat: number, baseLab: number, masterRates: MasterRatesConfig): { baseMat: number; baseLab: number } {
  let newBaseMat = baseMat;
  let newBaseLab = baseLab;
  const nameLower = (item.name || '').toLowerCase();
  const unitLower = (item.unit || '').toLowerCase();

  // 1. คอนกรีตผสมเสร็จ (หน่วย คิว หรือ ลบ.ม.)
  if (
    masterRates.concreteReadyMixedPerCuM && masterRates.concreteReadyMixedPerCuM > 0 &&
    (unitLower.includes('คิว') || unitLower.includes('ลบ.ม.')) &&
    (nameLower.includes('คอนกรีต') || nameLower.includes('คสล.') || item.category === 'structure')
  ) {
    if (nameLower.includes('คอนกรีตผสมเสร็จ') || nameLower.includes('คอนกรีตโครงสร้าง') || nameLower.includes('240 ksc') || nameLower.includes('280 ksc')) {
      newBaseMat = masterRates.concreteReadyMixedPerCuM;
    }
  }

  // 2. เหล็กเส้นก่อสร้าง (หน่วย กก. หรือ kg)
  if (
    masterRates.steelDeformedBarPerKg && masterRates.steelDeformedBarPerKg > 0 &&
    (unitLower === 'กก.' || unitLower === 'kg') &&
    (nameLower.includes('เหล็ก') || item.category === 'structure')
  ) {
    if (nameLower.includes('เหล็กข้ออ้อย') || nameLower.includes('เหล็กเส้น') || nameLower.includes('db12') || nameLower.includes('db16') || nameLower.includes('rb9')) {
      newBaseMat = masterRates.steelDeformedBarPerKg;
    }
  }

  // 3. ไม้แบบหล่อคอนกรีต (หน่วย ตร.ม.)
  if (
    masterRates.formworkPerSqm && masterRates.formworkPerSqm > 0 &&
    unitLower.includes('ตร.ม.') &&
    nameLower.includes('ไม้แบบ')
  ) {
    newBaseMat = masterRates.formworkPerSqm;
  }

  // 4. ค่าแรงก่อผนัง (หน่วย ตร.ม.)
  if (
    masterRates.masonryLaborPerSqm && masterRates.masonryLaborPerSqm > 0 &&
    unitLower.includes('ตร.ม.') &&
    (nameLower.includes('ก่ออิฐ') || nameLower.includes('ก่อผนัง') || nameLower.includes('อิฐมวลเบา') || nameLower.includes('คอนกรีตบล็อก'))
  ) {
    newBaseLab = masterRates.masonryLaborPerSqm;
  }

  // 5. ค่าแรงฉาบปูน (หน่วย ตร.ม.)
  if (
    masterRates.plasterLaborPerSqm && masterRates.plasterLaborPerSqm > 0 &&
    unitLower.includes('ตร.ม.') &&
    (nameLower.includes('ฉาบปูน') || nameLower.includes('ฉาบเรียบ') || nameLower.includes('ฉาบผนัง'))
  ) {
    newBaseLab = masterRates.plasterLaborPerSqm;
  }

  // 6. ค่าแรงปูกระเบื้อง (หน่วย ตร.ม.)
  if (
    masterRates.tileLaborPerSqm && masterRates.tileLaborPerSqm > 0 &&
    unitLower.includes('ตร.ม.') &&
    (nameLower.includes('ปูกระเบื้อง') || nameLower.includes('กระเบื้องแกรนิตโต้') || nameLower.includes('กระเบื้องเซรามิก'))
  ) {
    newBaseLab = masterRates.tileLaborPerSqm;
  }

  // 7. ค่าแรงทาสี (หน่วย ตร.ม.)
  if (
    masterRates.paintLaborPerSqm && masterRates.paintLaborPerSqm > 0 &&
    unitLower.includes('ตร.ม.') &&
    (nameLower.includes('ทาสี') || nameLower.includes('งานสี') || nameLower.includes('สีรองพื้น'))
  ) {
    newBaseLab = masterRates.paintLaborPerSqm;
  }

  return { baseMat: newBaseMat, baseLab: newBaseLab };
}

/**
 * คำนวณปรับราคาของรายการเดี่ยวตาม PriceBookConfig (จำ base price ป้องกันคูณทบซ้ำ)
 */
export function applyPriceBookToSingleItem(item: BOQItem, config: PriceBookConfig): BOQItem {
  // 1) บันทึก base price จากราคาเดิมหากยังไม่มี
  let baseMat = typeof item.baseMaterialUnitPrice === 'number' ? item.baseMaterialUnitPrice : item.materialUnitPrice;
  let baseLab = typeof item.baseLaborUnitPrice === 'number' ? item.baseLaborUnitPrice : item.laborUnitPrice;

  // 2) ตรวจสอบและอัปเดตราคาฐานตาม Master Rates ถ้ามีระบุ
  if (config.masterRates) {
    const updated = checkAndUpdateMasterRate(item, baseMat, baseLab, config.masterRates);
    baseMat = updated.baseMat;
    baseLab = updated.baseLab;
  }

  // 3) คูณสัดส่วนภูมิภาคจาก base price แล้วปัดเศษเป็นจำนวนเต็ม
  const matMultiplier = typeof config.materialMultiplier === 'number' && config.materialMultiplier > 0 ? config.materialMultiplier : 1.00;
  const labMultiplier = typeof config.laborMultiplier === 'number' && config.laborMultiplier > 0 ? config.laborMultiplier : 1.00;

  const adjustedMat = Math.round(baseMat * matMultiplier);
  const adjustedLab = Math.round(baseLab * labMultiplier);

  return {
    ...item,
    baseMaterialUnitPrice: baseMat,
    baseLaborUnitPrice: baseLab,
    materialUnitPrice: adjustedMat,
    laborUnitPrice: adjustedLab
  };
}

/**
 * คำนวณปรับราคาทั้งตารางรายการ BOQ ตาม PriceBookConfig
 */
export function applyPriceBookToItems(items: BOQItem[], config: PriceBookConfig): BOQItem[] {
  if (!items || items.length === 0) return [];
  return items.map(item => applyPriceBookToSingleItem(item, config));
}
