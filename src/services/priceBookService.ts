import { BOQItem, PriceBookConfig, ProjectRegionalConfig, RegionalPreset, RegionalZoneId, MasterRatesConfig, SavedPriceBookItem } from '../types';

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
  steelDeformedBarPerKg: 28,      // เหล็กข้ออ้อย มอก. กก.ละ
  formworkPerSqm: 240,            // ไม้แบบหล่อโครงสร้าง ตร.ม.ละ
  masonryLaborPerSqm: 100,        // ค่าแรงก่อผนัง ตร.ม.ละ
  plasterLaborPerSqm: 95,         // ค่าแรงฉาบปูน 2 ด้าน ตร.ม.ละ
  tileLaborPerSqm: 200,           // ค่าแรงปูกระเบื้อง ตร.ม.ละ
  paintLaborPerSqm: 40            // ค่าแรงทาสี ตร.ม.ละ
};

// ตัวอย่างรายการในคลังส่วนตัวเริ่มต้น ครอบคลุม 10 หมวดหมู่งานก่อสร้างมาตรฐาน (Preset Construction Items)
export const INITIAL_SAVED_CUSTOM_ITEMS: SavedPriceBookItem[] = [
  // 1. งานเตรียมการและฐานราก (preparation)
  {
    savedId: 'prep-layout-excavate',
    category: 'preparation',
    name: 'งานวางผังอาคารและขุดดินฐานราก',
    spec: 'วางผังด้วยกล้องสำรวจ ขุดหลุมฐานรากและคานคอดิน พร้อมขนย้ายดินส่วนเกินทิ้ง',
    quantity: 1,
    unit: 'เหมา',
    materialUnitPrice: 3000,
    laborUnitPrice: 12000,
    wastePercent: 0,
    customGroup: 'งานเตรียมการ'
  },
  {
    savedId: 'prep-sand-bed',
    category: 'preparation',
    name: 'ทรายหยาบรองก้นหลุมหนา 10 ซม. พร้อมบดอัดแน่น',
    spec: 'ทรายหยาบคัดเกรดรองใต้ฐานรากและคานคอดิน บดอัดด้วยเครื่องตบดิน',
    quantity: 8,
    unit: 'ลบ.ม.',
    materialUnitPrice: 480,
    laborUnitPrice: 120,
    wastePercent: 10,
    customGroup: 'งานเตรียมการ'
  },
  {
    savedId: 'prep-lean-concrete',
    category: 'preparation',
    name: 'คอนกรีตหยาบ 1:3:5 หนา 5 ซม. รองก้นหลุมฐานราก',
    spec: 'คอนกรีตผสมเทปรับระดับก้นหลุมก่อนผูกเหล็กฐานราก',
    quantity: 4,
    unit: 'ลบ.ม.',
    materialUnitPrice: 1850,
    laborUnitPrice: 350,
    wastePercent: 5,
    customGroup: 'งานเตรียมการ'
  },
  {
    savedId: 'prep-pile-i18',
    category: 'preparation',
    name: 'เสาเข็มคอนกรีตอัดแรงรูปตัวไอ I-18 ยาว 8.00 ม.',
    spec: 'ตอกด้วยปั้นจั่น Drop Hammer ตรวจสอบ Last 10 Blows ตามมาตรฐานวิศวกรรม',
    quantity: 16,
    unit: 'ต้น',
    materialUnitPrice: 1650,
    laborUnitPrice: 450,
    wastePercent: 0,
    customGroup: 'งานเสาเข็ม'
  },

  // 2. งานโครงสร้าง คสล. (structure)
  {
    savedId: 'struct-concrete-240',
    category: 'structure',
    name: 'คอนกรีตผสมเสร็จ 240 ksc หยาบ (Cylinder)',
    spec: 'คอนกรีตโครงสร้าง CPAC / TPI สำหรับเทฐานราก เสา คาน และพื้น คสล.',
    quantity: 25,
    unit: 'ลบ.ม.',
    materialUnitPrice: 2150,
    laborUnitPrice: 380,
    wastePercent: 5,
    customGroup: 'งานโครงสร้าง'
  },
  {
    savedId: 'struct-rebar-db12',
    category: 'structure',
    name: 'เหล็กเส้นข้ออ้อย SD40 มอก. DB12',
    spec: 'เหล็กโรงใหญ่ มอก. 24-2548 สำหรับเหล็กแกนเสา คาน คสล.',
    quantity: 850,
    unit: 'กก.',
    materialUnitPrice: 28,
    laborUnitPrice: 5,
    wastePercent: 7,
    customGroup: 'งานโครงสร้าง'
  },
  {
    savedId: 'struct-rebar-db16',
    category: 'structure',
    name: 'เหล็กเส้นข้ออ้อย SD40 มอก. DB16',
    spec: 'เหล็กโรงใหญ่ มอก. 24-2548 สำหรับเหล็กแกนเสา คานคอดิน ฐานราก',
    quantity: 650,
    unit: 'กก.',
    materialUnitPrice: 28,
    laborUnitPrice: 5,
    wastePercent: 7,
    customGroup: 'งานโครงสร้าง'
  },
  {
    savedId: 'struct-rebar-rb9',
    category: 'structure',
    name: 'เหล็กเส้นกลมผิวเรียบ SR24 มอก. RB9',
    spec: 'เหล็กปลอกเสา คาน ปลายงอ 135 องศา มอก. 20-2559',
    quantity: 420,
    unit: 'กก.',
    materialUnitPrice: 29,
    laborUnitPrice: 5,
    wastePercent: 7,
    customGroup: 'งานโครงสร้าง'
  },
  {
    savedId: 'struct-formwork',
    category: 'structure',
    name: 'ไม้แบบหล่อโครงสร้างพร้อมค้ำยันเหล็ก',
    spec: 'ไม้อัดเคลือบฟิล์มดำหนา 15 มม. โครงไม้คร่าว ค้ำยันเหล็ก หมุนเวียน 3 ครั้ง',
    quantity: 120,
    unit: 'ตร.ม.',
    materialUnitPrice: 140,
    laborUnitPrice: 100,
    wastePercent: 10,
    customGroup: 'งานโครงสร้าง'
  },
  {
    savedId: 'struct-precast-slab',
    category: 'structure',
    name: 'แผ่นพื้นสำเร็จรูป คสล. ท้องเรียบ หนา 5 ซม.',
    spec: 'แผ่นพื้นดึงลวด PC Wire 4 เส้น กว้าง 35 ซม. SCG / C-Pac พร้อมค้ำยันชั่วคราว',
    quantity: 65,
    unit: 'ตร.ม.',
    materialUnitPrice: 240,
    laborUnitPrice: 60,
    wastePercent: 3,
    customGroup: 'งานพื้น คสล.'
  },
  {
    savedId: 'struct-wiremesh-4mm',
    category: 'structure',
    name: 'ตะแกรงเหล็กไวร์เมช (Wire Mesh) ขนาด 4 มม. @ 20 ซม.',
    spec: 'เหล็กรีดเย็น มอก. 737 สำหรับเสริมเหล็กกันร้าว Topping พื้น คสล.',
    quantity: 80,
    unit: 'ตร.ม.',
    materialUnitPrice: 38,
    laborUnitPrice: 10,
    wastePercent: 5,
    customGroup: 'งานพื้น คสล.'
  },

  // 3. งานโครงหลังคาและมุงหลังคา (roof)
  {
    savedId: 'roof-galv-truss',
    category: 'roof',
    name: 'โครงหลังคาเหล็กกัลวาไนซ์ปลอดสนิม GI',
    spec: 'เหล็กกล่อง GI 100x50x2.0 มม. และ 50x50x1.8 มม. พ่นสีกันสนิมรอยเชื่อม',
    quantity: 110,
    unit: 'ตร.ม.',
    materialUnitPrice: 380,
    laborUnitPrice: 160,
    wastePercent: 5,
    customGroup: 'งานหลังคา'
  },
  {
    savedId: 'roof-metalsheet-pu',
    category: 'roof',
    name: 'แผ่นหลังคาเมทัลชีท หนา 0.35 มม. ติดฉนวน PU Foam 1 นิ้ว',
    spec: 'บลูสโคป Zacs เคลือบสี พร้อมฉนวนกันความร้อน PU หนา 1 นิ้ว ปิดผิวฟอยล์เงิน',
    quantity: 110,
    unit: 'ตร.ม.',
    materialUnitPrice: 420,
    laborUnitPrice: 90,
    wastePercent: 5,
    customGroup: 'งานหลังคา'
  },
  {
    savedId: 'roof-cpac-tile',
    category: 'roof',
    name: 'กระเบื้องมุงหลังคา ซีแพคโมเนีย SCG พร้อมครอบสันหลังคา',
    spec: 'กระเบื้องคอนกรีต SCG ลอนมาตรฐาน พร้อมครอบแห้ง DryTech ไร้ปูนปั้นสันหลังคา',
    quantity: 90,
    unit: 'ตร.ม.',
    materialUnitPrice: 360,
    laborUnitPrice: 140,
    wastePercent: 5,
    customGroup: 'งานหลังคา'
  },
  {
    savedId: 'roof-gutter-sus304',
    category: 'roof',
    name: 'รางน้ำฝนสแตนเลส เกรด 304 หนา 0.6 มม. ขนาด 6 นิ้ว',
    spec: 'สแตนเลสพับขอบขึ้นรูป พร้อมตะขอแขวนสแตนเลสหนา 1.5 มม. ทุกระยะ 0.80 ม.',
    quantity: 22,
    unit: 'ม.',
    materialUnitPrice: 480,
    laborUnitPrice: 140,
    wastePercent: 5,
    customGroup: 'งานรางน้ำฝน'
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
  },

  // 4. งานก่ออิฐ ฉาบปูน ผนัง (masonry_wall)
  {
    savedId: 'wall-aac-block',
    category: 'masonry_wall',
    name: 'ก่อผนังอิฐมวลเบา หนา 7.5 ซม. พร้อมเหล็ก Dowel เสียบเสา',
    spec: 'อิฐมวลเบาชั้นคุณภาพ G4 ก่อด้วยปูนก่ออิฐมวลเบาบาง เสียบ Dowel ทุก 2 แถว',
    quantity: 160,
    unit: 'ตร.ม.',
    materialUnitPrice: 165,
    laborUnitPrice: 100,
    wastePercent: 5,
    customGroup: 'งานก่อผนัง'
  },
  {
    savedId: 'wall-clay-brick',
    category: 'masonry_wall',
    name: 'ก่อผนังอิฐมอญครึ่งแผ่น หนา 7 ซม.',
    spec: 'อิฐมอญ 2 รูเผาสุก ได้มาตรฐาน ก่อด้วยปูนทรายผสมน้ำยาประสานคอนกรีต',
    quantity: 45,
    unit: 'ตร.ม.',
    materialUnitPrice: 145,
    laborUnitPrice: 110,
    wastePercent: 8,
    customGroup: 'งานก่อผนัง'
  },
  {
    savedId: 'wall-plaster-interior',
    category: 'masonry_wall',
    name: 'ฉาบปูนเรียบภายในอาคาร หนา 1.5 ซม.',
    spec: 'ปูนฉาบสำเร็จรูปสูตรละเอียด (เสือมอร์ตาร์/ลูกดิ่ง) จับเซี้ยมจับปุ่มได้ดิ่งฉาก',
    quantity: 280,
    unit: 'ตร.ม.',
    materialUnitPrice: 65,
    laborUnitPrice: 95,
    wastePercent: 5,
    customGroup: 'งานฉาบปูน'
  },
  {
    savedId: 'wall-lintel-stiffener',
    category: 'masonry_wall',
    name: 'เสาเอ็นและทับหลัง คสล. รัดขอบช่องเปิดประตู-หน้าต่าง',
    spec: 'ขนาด 10x10 ซม. คอนกรีต 240 ksc เสริมเหล็ก 2-RB9 ปลอก RB6@0.20 ม.',
    quantity: 55,
    unit: 'ม.',
    materialUnitPrice: 85,
    laborUnitPrice: 75,
    wastePercent: 5,
    customGroup: 'งานเสาเอ็น-ทับหลัง'
  },

  // 5. งานประตู หน้าต่าง (doors_windows)
  {
    savedId: 'door-teak-wood',
    category: 'doors_windows',
    name: 'ชุดประตูไม้สักแท้ ขนาด 0.80 x 2.00 ม. พร้อมวงกบไม้เต็ง',
    spec: 'บานไม้สักแท้อบแห้ง ลายเรียบทันสมัย พร้อมวงกบไม้เต็ง บานพับสแตนเลส 4 ตัว',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 6800,
    laborUnitPrice: 700,
    wastePercent: 0,
    customGroup: 'งานประตู'
  },
  {
    savedId: 'door-upvc-bath',
    category: 'doors_windows',
    name: 'ชุดประตู uPVC กันน้ำ 100% สำหรับห้องน้ำ ขนาด 0.70 x 2.00 ม.',
    spec: 'บาน uPVC เกล็ดระบายอากาศล่าง ทนชื้น ไม่บวม ปลวกไม่กิน พร้อมลูกบิดสแตนเลส',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 1950,
    laborUnitPrice: 450,
    wastePercent: 0,
    customGroup: 'งานประตู'
  },
  {
    savedId: 'window-alum-slide',
    category: 'doors_windows',
    name: 'หน้าต่างบานเลื่อนสลับอลูมิเนียม สีดำ 1.20 x 1.10 ม. กระจกเขียว 6 มม.',
    spec: 'อลูมิเนียมอบดำหนา 1.2 มม. กระจกเขียวตัดแสง 6 มม. พร้อมมุ้งลวดไฟเบอร์',
    quantity: 6,
    unit: 'ชุด',
    materialUnitPrice: 2450,
    laborUnitPrice: 350,
    wastePercent: 0,
    customGroup: 'งานหน้าต่าง'
  },

  // 6. งานฝ้าเพดาน ปูพื้น ทาสี (finishes)
  {
    savedId: 'fin-gypsum-ceiling',
    category: 'finishes',
    name: 'ฝ้าเพดานยิปซั่มบอร์ด 9 มม. ฉาบเรียบ โครง C-Line กัลวาไนซ์',
    spec: 'ยิปซั่มบอร์ดตราช้าง 9 มม. โครง C-Line 0.40 มม. แขวนสลิงชุบสังกะสี',
    quantity: 95,
    unit: 'ตร.ม.',
    materialUnitPrice: 175,
    laborUnitPrice: 95,
    wastePercent: 5,
    customGroup: 'งานฝ้าเพดาน'
  },
  {
    savedId: 'fin-granito-60x60',
    category: 'finishes',
    name: 'ปูกระเบื้องแกรนิตโต้ ขนาด 60x60 ซม. นาโน ผิวมันเงา',
    spec: 'กระเบื้องแกรนิตโต้ตัดขอบ ปูด้วยปูนกาวซีเมนต์ จรดยาแนวกันเชื้อรา',
    quantity: 75,
    unit: 'ตร.ม.',
    materialUnitPrice: 320,
    laborUnitPrice: 200,
    wastePercent: 7,
    customGroup: 'งานปูกระเบื้อง'
  },
  {
    savedId: 'fin-spc-flooring',
    category: 'finishes',
    name: 'ปูพื้นไม้ SPC ไวนิลคลิกล็อก หนา 4 มม. พร้อมโฟม IXPE ในตัว',
    spec: 'กันน้ำ 100% ปลวกไม่กิน ผิวสัมผัสลายไม้ธรรมชาติ ติดตั้งพร้อมตัวจบ PVC',
    quantity: 45,
    unit: 'ตร.ม.',
    materialUnitPrice: 420,
    laborUnitPrice: 80,
    wastePercent: 5,
    customGroup: 'งานปูพื้นไม้'
  },
  {
    savedId: 'fin-paint-primer',
    category: 'finishes',
    name: 'ทาสีรองพื้นปูนใหม่กันด่าง 1 เที่ยว',
    spec: 'TOA Quick Primer / Beger Water Block ป้องกันคราบเกลือและด่าง',
    quantity: 320,
    unit: 'ตร.ม.',
    materialUnitPrice: 32,
    laborUnitPrice: 25,
    wastePercent: 5,
    customGroup: 'งานทาสี'
  },
  {
    savedId: 'fin-paint-acrylic',
    category: 'finishes',
    name: 'ทาสีน้ำอะคริลิกแท้ 100% กึ่งเงา ภายใน-ภายนอก 2 เที่ยว',
    spec: 'TOA 4Seasons / Beger Shield 5 in 1 เช็ดล้างทำความสะอาดได้',
    quantity: 320,
    unit: 'ตร.ม.',
    materialUnitPrice: 55,
    laborUnitPrice: 40,
    wastePercent: 5,
    customGroup: 'งานทาสี'
  },

  // 7. งานตกแต่งภายใน-ภายนอก (decorations)
  {
    savedId: 'deco-skirting-pvc',
    category: 'decorations',
    name: 'บัวเชิงผนัง PVC ลายไม้ สูง 4 นิ้ว',
    spec: 'บัว PVC ทนน้ำ ปลวกไม่กิน ติดตั้งด้วยกาวตะปูและแด๊ปเก็บขอบเรียบร้อย',
    quantity: 65,
    unit: 'ม.',
    materialUnitPrice: 85,
    laborUnitPrice: 45,
    wastePercent: 5,
    customGroup: 'งานบัวตกแต่ง'
  },
  {
    savedId: 'deco-fluted-wall',
    category: 'decorations',
    name: 'ผนังกรุไม้เทียมระแนง WPC Fluted Wall Panel ลายไม้โมเดิร์น',
    spec: 'ไม้เทียมคอมโพสิท ลอนระแนง สำหรับกรุผนังตกแต่งห้องรับแขก/หัวเตียง',
    quantity: 12,
    unit: 'ตร.ม.',
    materialUnitPrice: 850,
    laborUnitPrice: 250,
    wastePercent: 5,
    customGroup: 'งานตกแต่งผนัง'
  },

  // 8. งานสุขาภิบาลและห้องน้ำ (sanitary)
  {
    savedId: 'san-toilet-cotto',
    category: 'sanitary',
    name: 'โถสุขภัณฑ์ชักโครก 2 ชิ้น ประหยัดน้ำ 3/4.5 ลิตร COTTO / Karat',
    spec: 'ระบบชำระล้าง Dual Flush พร้อมฝารองนั่ง Soft Close ปิดนุ่มนวล',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 3650,
    laborUnitPrice: 600,
    wastePercent: 0,
    customGroup: 'งานสุขภัณฑ์'
  },
  {
    savedId: 'san-basin-counter',
    category: 'sanitary',
    name: 'อ่างล้างหน้าแขวนผนังพร้อมก๊อกน้ำและท่อน้ำทิ้งดักกลิ่น COTTO',
    spec: 'เซรามิกขาวเงา พร้อมก๊อกน้ำเซรามิกวาล์ว สายน้ำดีสแตนเลส ท่อน้ำทิ้ง P-Trap',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 1850,
    laborUnitPrice: 400,
    wastePercent: 0,
    customGroup: 'งานสุขภัณฑ์'
  },
  {
    savedId: 'san-shower-rain',
    category: 'sanitary',
    name: 'ชุดฝักบัวอาบน้ำเรนชาวเวอร์สแตนเลส 304 พร้อมฝักบัวสายอ่อน',
    spec: 'สแตนเลสปัดด้าน ไม่เป็นสนิม หัวฝักบัวขนาด 8 นิ้ว พร้อมวาล์วเปลี่ยนทิศทางน้ำ',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 2450,
    laborUnitPrice: 450,
    wastePercent: 0,
    customGroup: 'งานสุขภัณฑ์'
  },
  {
    savedId: 'san-septic-tank-1000',
    category: 'sanitary',
    name: 'ถังบำบัดน้ำเสียสำเร็จรูป PE ขนาด 1,000 ลิตร DOS พร้อมติดตั้ง',
    spec: 'ถังบำบัดไร้อากาศ พร้อมหัวเชื้อจุลินทรีย์ ข้อต่ออ่อน และฝาปิดกลมพลาสติก',
    quantity: 1,
    unit: 'ถัง',
    materialUnitPrice: 4800,
    laborUnitPrice: 1500,
    wastePercent: 0,
    customGroup: 'งานบำบัดน้ำเสีย'
  },
  {
    savedId: 'san-water-tank-pump',
    category: 'sanitary',
    name: 'ถังเก็บน้ำบนดิน DOS 1,000 ลิตร พร้อมปั๊มน้ำอัตโนมัติ Mitsubishi 200W',
    spec: 'ถังแอนตี้แบคทีเรีย UV8 ปั๊มแรงดันคงที่ 200W พร้อมเช็ควาล์วและเบรกเกอร์กันดูด',
    quantity: 1,
    unit: 'ชุด',
    materialUnitPrice: 12500,
    laborUnitPrice: 2000,
    wastePercent: 0,
    customGroup: 'งานระบบประปา'
  },

  // 9. งานระบบไฟฟ้าและแสงสว่าง (electrical)
  {
    savedId: 'elec-consumer-unit',
    category: 'electrical',
    name: 'ตู้ Consumer Unit 6 ช่อง พร้อมเมนเบรกเกอร์กันดูด RCBO 50A Schneider',
    spec: 'ตู้ควบคุมวงจรไฟฟ้าพร้อมลูกเซอร์กิต 6 ช่อง และอุปกรณ์ป้องกันไฟดูด มอก.',
    quantity: 1,
    unit: 'ตู้',
    materialUnitPrice: 3200,
    laborUnitPrice: 1200,
    wastePercent: 0,
    customGroup: 'งานระบบไฟฟ้า'
  },
  {
    savedId: 'elec-downlight-led',
    category: 'electrical',
    name: 'จุดโคมไฟฝังฝ้า LED Downlight ทรงกลม 9W-12W แสง Warm/Daylight',
    spec: 'โคมฝังฝ้าขอบขาว สายไฟ THW 1.5 sq.mm. ร้อยท่อร้อยสายร้อยฝ้าเพดาน',
    quantity: 16,
    unit: 'จุด',
    materialUnitPrice: 280,
    laborUnitPrice: 180,
    wastePercent: 5,
    customGroup: 'งานระบบไฟฟ้า'
  },
  {
    savedId: 'elec-socket-outlet',
    category: 'electrical',
    name: 'จุดเต้ารับไฟฟ้าคู่มีกราวด์ ปลั๊กคู่ Panasonic Wide Series',
    spec: 'เต้ารับ 3 ขาคู่ พร้อมฝาครอบ บล็อกฝังผนัง สายไฟ THW 2.5 + G 1.5 sq.mm.',
    quantity: 14,
    unit: 'จุด',
    materialUnitPrice: 320,
    laborUnitPrice: 190,
    wastePercent: 5,
    customGroup: 'งานระบบไฟฟ้า'
  },
  {
    savedId: 'elec-ground-rod',
    category: 'electrical',
    name: 'ระบบแท่งกราวด์ต่อลงดิน ทองแดงแท้ ขนาด 5/8" ยาว 2.40 ม.',
    spec: 'ตอกลงดินลึก 2.40 ม. พร้อมแคลมป์ทองแดง สายทองแดงเปลือย THW 10 sq.mm.',
    quantity: 1,
    unit: 'ชุด',
    materialUnitPrice: 750,
    laborUnitPrice: 450,
    wastePercent: 0,
    customGroup: 'งานระบบไฟฟ้า'
  },

  // 10. งานภายนอก (external_works)
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
    savedId: 'ext-pavement-concrete',
    category: 'external_works',
    name: 'เทพื้นคอนกรีตลานจอดรถ/ทางเดิน คสล. 240 ksc หนา 10 ซม. ขัดหยาบ',
    spec: 'บดอัดทรายหยาบ 5 ซม. ปูไวร์เมช 4 มม. เทคอนกรีต 240 ksc ขัดหยาบลายกวาด',
    quantity: 35,
    unit: 'ตร.ม.',
    materialUnitPrice: 320,
    laborUnitPrice: 110,
    wastePercent: 5,
    customGroup: 'งานทางเดินและลานจอดรถ'
  },
  {
    savedId: 'ext-drainage-pipe',
    category: 'external_works',
    name: 'ท่อระบายน้ำ คสล. คมล. มอก. dia 0.30 ม. พร้อมบ่อพัก คสล.',
    spec: 'วางท่อระบายน้ำ คสล. 0.30 ม. ยาแนวปูนทราย พร้อมบ่อพัก คสล. ทุกระยะ 6.00 ม.',
    quantity: 18,
    unit: 'ม.',
    materialUnitPrice: 420,
    laborUnitPrice: 220,
    wastePercent: 5,
    customGroup: 'งานระบายน้ำภายนอก'
  }
];

export const PRICE_BOOK_LIBRARY_VERSION = 2;

/**
 * คืนค่าการตั้งค่าโซนภูมิภาคเริ่มต้นสำหรับโครงการใหม่ (ค่าเริ่มต้น: กรุงเทพฯ และปริมณฑล)
 */
export function getDefaultProjectRegionalConfig(regionId: RegionalZoneId = 'central_bkk'): ProjectRegionalConfig {
  const preset = REGIONAL_PRESETS.find(p => p.id === regionId) || REGIONAL_PRESETS[0];
  return {
    regionId: preset.id,
    regionName: preset.name,
    materialMultiplier: preset.materialMultiplier,
    laborMultiplier: preset.laborMultiplier,
    autoApplyToNewItems: true,
    enableMasterRateOverride: false,
    masterRates: { ...DEFAULT_MASTER_RATES }
  };
}

/**
 * ปรับข้อมูล regionalConfig ให้สมบูรณ์และถูกต้องสำหรับโครงการเดิมที่ยังไม่มีฟิลด์นี้
 */
export function normalizeProjectRegionalConfig(input?: Partial<ProjectRegionalConfig> | null): ProjectRegionalConfig {
  if (!input) {
    return getDefaultProjectRegionalConfig();
  }
  const preset = REGIONAL_PRESETS.find(p => p.id === input.regionId) || REGIONAL_PRESETS[0];
  return {
    regionId: input.regionId || preset.id,
    regionName: input.regionName || preset.name,
    materialMultiplier: typeof input.materialMultiplier === 'number' && input.materialMultiplier > 0 ? input.materialMultiplier : preset.materialMultiplier,
    laborMultiplier: typeof input.laborMultiplier === 'number' && input.laborMultiplier > 0 ? input.laborMultiplier : preset.laborMultiplier,
    autoApplyToNewItems: input.autoApplyToNewItems ?? true,
    enableMasterRateOverride: input.enableMasterRateOverride ?? false,
    masterRates: { ...DEFAULT_MASTER_RATES, ...(input.masterRates || {}) }
  };
}

export const DEFAULT_PRICE_BOOK_CONFIG: PriceBookConfig = {
  ...getDefaultProjectRegionalConfig('central_bkk'),
  libraryVersion: PRICE_BOOK_LIBRARY_VERSION,
  savedCustomItems: [...INITIAL_SAVED_CUSTOM_ITEMS],
  lastUpdated: new Date().toISOString()
};

/**
 * บันทึกเฉพาะคลังรายการส่วนกลาง (Global Shared Library) ร่วมกันทุกโครงการ
 */
export function saveGlobalPriceBookLibrary(savedCustomItems: SavedPriceBookItem[]): void {
  try {
    const current = loadPriceBookConfig();
    const updated: PriceBookConfig = {
      ...current,
      savedCustomItems,
      libraryVersion: PRICE_BOOK_LIBRARY_VERSION,
      lastUpdated: new Date().toISOString()
    };
    savePriceBookConfig(updated);
  } catch (err) {
    console.error('Failed to save global PriceBook library', err);
  }
}

/**
 * โหลดการตั้งค่าคลังราคาและภูมิภาคจาก localStorage
 */
export function loadPriceBookConfig(): PriceBookConfig {
  try {
    const raw = localStorage.getItem(PRICE_BOOK_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRICE_BOOK_CONFIG };
    const parsed = JSON.parse(raw);
    let savedCustomItems: SavedPriceBookItem[] = Array.isArray(parsed.savedCustomItems) ? parsed.savedCustomItems : [];

    // ถ้า libraryVersion ในเครื่องยังไม่ตรงกับเวอร์ชันปัจจุบัน ให้ Merge รายการมาตรฐานที่ขาดให้ครบ 10 หมวด
    if (parsed.libraryVersion !== PRICE_BOOK_LIBRARY_VERSION) {
      const existingIds = new Set(savedCustomItems.map(item => item.savedId));
      const missingDefaults = INITIAL_SAVED_CUSTOM_ITEMS.filter(def => !existingIds.has(def.savedId));
      savedCustomItems = [...savedCustomItems, ...missingDefaults];
    } else if (savedCustomItems.length === 0) {
      savedCustomItems = [...INITIAL_SAVED_CUSTOM_ITEMS];
    }

    return {
      regionId: parsed.regionId || 'central_bkk',
      regionName: parsed.regionName || 'กรุงเทพฯ และปริมณฑล',
      materialMultiplier: typeof parsed.materialMultiplier === 'number' ? parsed.materialMultiplier : 1.00,
      laborMultiplier: typeof parsed.laborMultiplier === 'number' ? parsed.laborMultiplier : 1.00,
      autoApplyToNewItems: parsed.autoApplyToNewItems ?? true,
      enableMasterRateOverride: parsed.enableMasterRateOverride ?? false,
      libraryVersion: PRICE_BOOK_LIBRARY_VERSION,
      masterRates: { ...DEFAULT_MASTER_RATES, ...(parsed.masterRates || {}) },
      savedCustomItems,
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
    (nameLower.includes('ทาสี') || nameLower.includes('งานสี')) &&
    !nameLower.includes('รองพื้น') &&
    !nameLower.includes('กันสนิม')
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

  // 2) ตรวจสอบและอัปเดตราคาฐานตาม Master Rates ถ้ามีระบุ และเปิดสวิตช์ enableMasterRateOverride
  if (config.enableMasterRateOverride === true && config.masterRates) {
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
