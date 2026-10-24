import { ConstructionCategory, BOQItem, AluminumItemPreset, TileItemPreset, RoomDoorPreset, ExternalWorksPreset, QuotationMeta, DecorationItemPreset, ElectricalCircuitConfig, WireCrossSection, WireType, PaymentMilestone, MilestoneTemplate, SanitaryFixturePreset } from './types';

export const CATEGORY_LABELS: Record<ConstructionCategory, { title: string; icon: string }> = {
  preparation: { title: '1. งานเตรียมพื้นที่ & ฐานราก/เสาเข็ม', icon: 'foundation' },
  structure: { title: '2. งานโครงสร้าง คสล. (คาน-เสา-พื้น)', icon: 'apartment' },
  roof: { title: '3. งานโครงหลังคา & มุงกระเบื้อง/เมทัลชีท', icon: 'roofing' },
  masonry_wall: { title: '4. งานผนัง ก่ออิฐมวลเบา/มอญ/บล็อก & ฉาบปูน & เสาทับหลัง', icon: 'handyman' },
  doors_windows: { title: '5. งานประตูห้อง (70/80/90) & หน้าต่าง-ประตูอลูมิเนียม', icon: 'door_front' },
  finishes: { title: '6. งานฝ้าเพดาน & ปูพื้นกระเบื้อง & สี', icon: 'format_paint' },
  decorations: { title: '7. งานตกแต่งภายใน-ภายนอก (บัวพื้น-บัวปูน-หินกาบ-ผนังกรุ)', icon: 'architecture' },
  sanitary: { title: '8. งานสุขาภิบาล ท่อประปา & สุขภัณฑ์', icon: 'plumbing' },
  electrical: { title: '9. งานระบบไฟฟ้า แสงสว่าง ตู้ควบคุม & คำนวณสายไฟ วสท.', icon: 'bolt' },
  external_works: { title: '10. งานภายนอก (รั้ว-ประตูรั้ว-โรงรถ-รางระบายน้ำ-ทางเดินรอบบ้าน)', icon: 'fence' },
};

// ฐานอ้างอิงบ้านมาตรฐานขนาด 120 ตร.ม. พร้อมอัตราส่วน basePerSqm
export const DEFAULT_BASE_AREA_SQM = 120;

// 🚽 แคตตาล็อกสุขภัณฑ์และอุปกรณ์ในห้องน้ำมาตรฐาน มอก.
export const SANITARY_FIXTURES_CATALOG: SanitaryFixturePreset[] = [
  {
    id: 'fix-toilet-two-piece-std',
    type: 'toilet',
    name: 'โถสุขภัณฑ์ชักโครก 2 ชิ้น (Two-Piece Toilet) ประหยัดน้ำ 3/4.5 ลิตร มอก.',
    spec: 'ระบบ Dual Flush ชำระล้างแบบ Washdown ฝารองนั่งเปิด-ปิดนุ่มนวล Soft Close ระยะท่อลงพื้น 305 มม. แบรนด์ COTTO/American Standard/Karat',
    unit: 'ชุด',
    defaultQty: 2,
    materialUnitPrice: 3450,
    laborUnitPrice: 750,
    wastePercent: 0,
    gradeTier: 'standard',
    description: 'สุขภัณฑ์ 2 ชิ้น ทนทาน ซ่อมแซมและเปลี่ยนอะไหล่หม้อน้ำง่าย ยอดนิยมสำหรับบ้านพักอาศัยทั่วไป',
    installationTip: 'ติดตั้งพร้อมประเก็นขี้ผึ้งกันกลิ่น (Wax Ring) และวาล์วสต๊อปเปิด-ปิดน้ำ 1/2"'
  },
  {
    id: 'fix-toilet-one-piece-prem',
    type: 'toilet',
    name: 'โถสุขภัณฑ์ชักโครกชิ้นเดียว (One-Piece Toilet) ทรงโมเดิร์น ไร้รอยต่อ',
    spec: 'ระบบชำระล้าง Siphon Vortex ทรงพลังและเงียบ ไร้ร่องรอยต่อทำความสะอาดง่าย ฝาชะลอการกระแทก แบรนด์ TOTO/COTTO/Kohler',
    unit: 'ชุด',
    defaultQty: 2,
    materialUnitPrice: 6800,
    laborUnitPrice: 950,
    wastePercent: 0,
    gradeTier: 'premium',
    description: 'สวยงาม หรูหรา ไร้ซอกหลืบสะสมสิ่งสกปรกและเชื้อโรค เหมาะกับห้องน้ำสไตล์โมเดิร์น',
    installationTip: 'ต่อท่อดักกลิ่นและใส่ Wax Ring อุดรอยต่อท่อโสโครก 4 นิ้วให้แนบสนิท'
  },
  {
    id: 'fix-toilet-smart-luxury',
    type: 'toilet',
    name: 'สุขภัณฑ์อัจฉริยะอัตโนมัติ (Smart Electronic Toilet) ระบบฝาเปิด-ปิดออโต้',
    spec: 'ระบบก้านฉีดชำระสแตนเลสปรับอุณหภูมิ ลมเป่าอุ่น รีโมทคอนโทรลไร้สาย ระบบฟลัชอัตโนมัติเมื่อลุกขึ้น',
    unit: 'ชุด',
    defaultQty: 1,
    materialUnitPrice: 24500,
    laborUnitPrice: 2000,
    wastePercent: 0,
    gradeTier: 'luxury',
    description: 'ระดับโรงแรม 5 ดาว สะดวกสบายและถูกสุขอนามัยสูงสุด',
    installationTip: 'ต้องเดินเต้ารับไฟฟ้ากันน้ำ IP44 พร้อมสายดินและ RCBO ห่างจากโถไม่เกิน 1 เมตร'
  },
  {
    id: 'fix-bidet-spray-sus304',
    type: 'bidet_spray',
    name: 'ชุดสายฉีดชำระสแตนเลส 304 แท้ ป้องกันสนิม พร้อมสายถักและขอแขวน',
    spec: 'หัวฉีดน้ำสแตนเลส SUS304 ไม่เป็นสนิม สายสแตนเลสยาว 1.20 ม. ทนแรงดันน้ำสูง วาล์วเซรามิก',
    unit: 'ชุด',
    defaultQty: 2,
    materialUnitPrice: 480,
    laborUnitPrice: 150,
    wastePercent: 0,
    gradeTier: 'standard',
    description: 'ทนทาน ไม่หักเปื่อยเหมือนสายพลาสติก หัวกดนุ่มมือ สายไม่บิดงอ',
    installationTip: 'ติดมินิวาล์วเปิด-ปิดปรับแรงดันน้ำก่อนเข้าสายฉีดเพื่อป้องกันแรงดันน้ำกระชาก'
  },
  {
    id: 'fix-basin-counter-top',
    type: 'basin',
    name: 'อ่างล้างหน้าแบบวางบนเคาน์เตอร์ (Vessel Basin) เซรามิกผิวเคลือบเงาพิเศษ',
    spec: 'อ่างเซรามิกสีขาว ขนาด 45-55 ซม. พร้อมก๊อกน้ำทรงสูง สะดืออ่างแบบกด Pop-up และท่อน้ำทิ้งดักกลิ่น P-Trap',
    unit: 'ชุด',
    defaultQty: 2,
    materialUnitPrice: 3200,
    laborUnitPrice: 650,
    wastePercent: 0,
    gradeTier: 'premium',
    description: 'วางบนท็อปหินแกรนิตหรือเคาน์เตอร์ปูน สวยเด่น สไตล์โมเดิร์นรีสอร์ต',
    installationTip: 'ยิงซิลิโคนกันเชื้อรา 100% รอบขอบฐานอ่างที่สัมผัสเคาน์เตอร์'
  },
  {
    id: 'fix-basin-cabinet-set',
    type: 'basin',
    name: 'ชุดตู้เคาน์เตอร์อ่างล้างหน้าสำเร็จรูปพร้อมกระจกเงาและชั้นวางของ (กันน้ำ 100%)',
    spec: 'ตู้แขวนวัสดุ WPC/PVC โพลีเมอร์กันน้ำ บานพับ Soft Close อ่างล้างหน้าเซรามิกในตัว พร้อมกระจกเงาไฟ LED',
    unit: 'ชุด',
    defaultQty: 2,
    materialUnitPrice: 5900,
    laborUnitPrice: 850,
    wastePercent: 0,
    gradeTier: 'premium',
    description: 'มีช่องเก็บอุปกรณ์อาบน้ำ แชมพู สบู่ ให้ห้องน้ำเป็นระเบียบเรียบร้อย',
    installationTip: 'ยึดพุกสแตนเลสกับผนังปูนที่แข็งแรงและยาแนวขอบบน'
  },
  {
    id: 'fix-basin-faucet-mixing',
    type: 'basin',
    name: 'ก๊อกผสมอ่างล้างหน้าน้ำร้อน-น้ำเย็น ทองเหลืองชุบโครเมียม / สีดำด้าน',
    spec: 'ก๊อกเดี่ยวก้านโยก วาล์วเซรามิกเปิดปิดนุ่มนวล พร้อมสายน้ำดีสแตนเลสคู่',
    unit: 'ชุด',
    defaultQty: 2,
    materialUnitPrice: 1250,
    laborUnitPrice: 250,
    wastePercent: 0,
    gradeTier: 'standard',
    description: 'ปรับอุณหภูมิน้ำล้างหน้าได้ตามใจชอบ ผิวโครเมียมเงางามทนคราบตะกรัน',
    installationTip: 'พันเทปเกลียวท่อน้ำดีให้ได้ทิศทางและไม่ขันแน่นจนโอริงปริ'
  },
  {
    id: 'fix-rain-shower-set',
    type: 'shower_system',
    name: 'ชุดเรนชาวเวอร์ (Rain Shower Set) ก้านสแตนเลส พร้อมหัวฝักบัวสายอ่อน 3 ระดับ',
    spec: 'หัวเรนชาวเวอร์ทรงเหลี่ยม/กลม ขนาด 8-10 นิ้ว ก้านปรับระดับได้ พร้อมวาล์วเปลี่ยนทิศทางน้ำและก๊อกผสม',
    unit: 'ชุด',
    defaultQty: 2,
    materialUnitPrice: 4200,
    laborUnitPrice: 750,
    wastePercent: 0,
    gradeTier: 'premium',
    description: 'สัมผัสการอาบน้ำดั่งสายฝนธรรมชาติ กระจายน้ำนุ่มนวลทั่วร่างกาย',
    installationTip: 'ระดับความสูงหัวเรนชาวเวอร์ควรอยู่ที่ 2.10 - 2.20 เมตรจากพื้นกระเบื้อง'
  },
  {
    id: 'fix-water-heater-3500-4500w',
    type: 'shower_system',
    name: 'เครื่องทำน้ำอุ่น 3,500 - 4,500W หม้อต้มทองแดง พร้อมระบบตัดไฟ ELCB',
    spec: 'ระบบนิรภัยตัดไฟรั่วอัตโนมัติ หม้อต้มกริลลอน/ทองแดงแท้ แบรนด์ Panasonic/Stiebel Eltron/Toshiba',
    unit: 'เครื่อง',
    defaultQty: 2,
    materialUnitPrice: 3850,
    laborUnitPrice: 700,
    wastePercent: 0,
    gradeTier: 'standard',
    description: 'อาบน้ำอุ่นสบาย ปลอดภัยด้วยระบบตัดไฟอัตโนมัติภายใน 0.01 วินาที',
    installationTip: 'ต้องต่อสายดิน Ground ขนาด 2.5 ตร.มม. เข้าหลักดินของบ้านโดยตรง ห้ามละเลยเด็ดขาด'
  },
  {
    id: 'fix-glass-shower-screen',
    type: 'shower_enclosure',
    name: 'ฉากกั้นอาบน้ำกระจกนิรภัย Tempered Glass หนา 10 มม. (โซนเปียก-แห้ง)',
    spec: 'กระจกนิรภัยเทมเปอร์ มอก. พร้อมอุปกรณ์ฟิตติ้งสแตนเลส 304 รางแขวน/บานสวิง ขอบยางแม่เหล็กกันน้ำกระเด็น',
    unit: 'ชุด',
    defaultQty: 2,
    materialUnitPrice: 9500,
    laborUnitPrice: 1800,
    wastePercent: 0,
    gradeTier: 'premium',
    description: 'แบ่งโซนเปียก-แห้งชัดเจน ช่วยให้พื้นห้องน้ำโซนแห้งสะอาด ไม่ลื่นล้ม ป้องกันคราบสบู่',
    installationTip: 'ต้องวัดขนาดหลังปูกระเบื้องเสร็จสิ้น 100% เพื่อตัดกระจกพอดีช่อง'
  },
  {
    id: 'fix-mirror-led-touch',
    type: 'bathroom_accessory',
    name: 'กระจกเงาติดผนังห้องน้ำ พร้อมไฟ LED ทัชสกรีน และระบบไล่ฝ้าหมอก',
    spec: 'กระจกตัดขอบไร้สารตะกั่ว หนา 5 มม. ไฟ LED แสง Daylight/Warm Light สวิตช์ทัชบนกระจก',
    unit: 'บาน',
    defaultQty: 2,
    materialUnitPrice: 1850,
    laborUnitPrice: 350,
    wastePercent: 0,
    gradeTier: 'premium',
    description: 'แต่งหน้าหรือโกนหนวดชัดเจน ไฟส่องสว่างนวลตา และปุ่มไล่ฝ้าไอน้ำหลังอาบน้ำอุ่น',
    installationTip: 'เตรียมจุดต่อสายไฟเต้ารับไว้หลังกระจกหรือใกล้เคียง'
  },
  {
    id: 'fix-acc-hardware-set-6pcs',
    type: 'bathroom_accessory',
    name: 'ชุดอุปกรณ์สแตนเลสในห้องน้ำครบเซ็ต (ราวแขวนผ้า 60ซม., ที่ใส่กระดาษชำระ, ชั้นวางสบู่, ขอแขวนผ้า)',
    spec: 'สแตนเลส 304 แท้ ผิวเงา/สีดำด้าน พร้อมพุกและสกรูสแตนเลสครบชุด',
    unit: 'ชุด',
    defaultQty: 2,
    materialUnitPrice: 1450,
    laborUnitPrice: 400,
    wastePercent: 0,
    gradeTier: 'standard',
    description: 'จัดระเบียบผ้าขนหนู กระดาษทิชชู และขวดแชมพู ป้องกันสนิมตลอดอายุการใช้งาน',
    installationTip: 'ใช้สว่านหัวกระเบื้องเจาะรูกระเบื้องอย่างระมัดระวังไม่ให้แผ่นกระเบื้องแตกร้าว'
  },
  {
    id: 'fix-floor-drain-trap-antiodor',
    type: 'bathroom_accessory',
    name: 'ตะแกรงดักกลิ่นและแมลง Floor Drain สแตนเลสแท้ มีถ้วยดักน้ำและลิ้นสปริงเปิด-ปิด',
    spec: 'ขนาดหน้าแปลน 4" x 4" สแตนเลส SUS304 มีระบบดักกลิ่น 2 ชั้น กลิ่นและแมลงจากท่อไม่ย้อนกลับ 100%',
    unit: 'จุด',
    defaultQty: 4,
    materialUnitPrice: 380,
    laborUnitPrice: 150,
    wastePercent: 0,
    gradeTier: 'standard',
    description: 'ป้องกันกลิ่นเหม็นอับและแมลงสาบจากท่อระบายน้ำขึ้นมาในห้องน้ำ',
    installationTip: 'ไล่ระดับสโลปกระเบื้องลงหาตะแกรงอย่างน้อย 1:50 ให้น้ำไหลลงอย่างรวดเร็ว'
  }
];

// 💰 งวดงานก่อสร้าง 4 งวดมาตรฐาน (Default 4-Milestone Standard: 20-30-30-20)
export const DEFAULT_4_MILESTONES: PaymentMilestone[] = [
  {
    id: 'mile-4-1',
    milestoneNumber: 1,
    title: 'งวดที่ 1 (20%): ทำสัญญา วางผัง ฐานราก และเสาเข็ม',
    percentage: 20,
    durationDays: 20,
    deliverables: [
      'ลงนามสัญญาจ้างก่อสร้างและมอบเอกสารแบบแปลน',
      'ปรับระดับดิน เคลียร์พื้นที่หน้างาน และวางผังหมุดเสาเข็ม',
      'ตอกเสาเข็มไอ คสล. ตัดปอกหัวเข็ม และหล่อคอนกรีตฐานราก (Footing)'
    ],
    inspectionCriteria: 'ตรวจแนวผังหมุดเขตที่ดิน รายงานการตอกเสาเข็ม (Blow Count) และระดับหัวเสาเข็มถูกต้องตามแบบ',
    status: 'in_progress'
  },
  {
    id: 'mile-4-2',
    milestoneNumber: 2,
    title: 'งวดที่ 2 (30%): โครงสร้าง คสล. เสา-คาน-พื้น และโครงหลังคามุงเสร็จ',
    percentage: 30,
    durationDays: 35,
    deliverables: [
      'หล่อเสา คานคอดิน คานชั้นบน และวางแผ่นพื้นเทคอนกรีต Topping',
      'ติดตั้งโครงสร้างเหล็กรูปพรรณหลังคา ทาสีกันสนิม',
      'มุงแผ่นเมทัลชีท/กระเบื้องหลังคา เชิงชาย และแผ่นปิดกันนก'
    ],
    inspectionCriteria: 'ตรวจความสมบูรณ์ของเนื้อคอนกรีต แกะไม้แบบตรวจโพรงอากาศ (Honeycomb) และทดสอบการรั่วซึมของหลังคา',
    status: 'pending'
  },
  {
    id: 'mile-4-3',
    milestoneNumber: 3,
    title: 'งวดที่ 3 (30%): ก่อผนัง ฉาบปูน ฝ้าเพดาน ปูกระเบื้อง ฝังท่อร้อยสายไฟและท่อประปา',
    percentage: 30,
    durationDays: 40,
    deliverables: [
      'ก่อผนังอิฐมวลเบา/อิฐมอญ หล่อเสาเอ็น-ทับหลัง และฉาบปูนเรียบ 2 ด้าน',
      'ติดตั้งโครงคร่าวฝ้าเพดานยิปซัมบอร์ด ฉาบเรียบรอยต่อ',
      'ปูกระเบื้องพื้นแกรนิตโต้ และกระเบื้องห้องน้ำกันลื่น R10 จรดฝ้า',
      'กรีดผนังฝังท่อร้อยสายไฟ uPVC และท่อประปาภายในอาคาร'
    ],
    inspectionCriteria: 'ตรวจแนวดิ่งฉากผนังก่อ เคาะตรวจโพรงใต้กระเบื้อง (ไม่กลวง) และทดสอบแรงดันน้ำท่อประปา',
    status: 'pending'
  },
  {
    id: 'mile-4-4',
    milestoneNumber: 4,
    title: 'งวดที่ 4 (20%): ทาสี ติดตั้งประตูหน้าต่าง สุขภัณฑ์ ดวงโคม งานภายนอก ส่งมอบบ้าน',
    percentage: 20,
    durationDays: 20,
    deliverables: [
      'ทาสีรองพื้นปูนใหม่ + สีจริงอะคริลิกกึ่งเงา 2 เที่ยว',
      'ติดตั้งกรอบประตูหน้าต่างอลูมิเนียม บานประตูห้อง 70/80/90',
      'ติดตั้งสุขภัณฑ์ห้องน้ำ อุปกรณ์ประปา ตู้คอนซูเมอร์ยูนิต สวิตช์ และโคมไฟ LED',
      'งานรั้ว โรงจอดรถ ท่อระบายน้ำ ทำความสะอาด เก็บ Defect 100% และส่งมอบบ้าน'
    ],
    inspectionCriteria: 'ทดสอบระบบตัดไฟรั่ว RCBO ทดสอบระบบระบายน้ำ และตรวจรับข้อบกพร่อง (Defect) รอบบ้านครบถ้วน 100%',
    status: 'pending'
  }
];

export const DEFAULT_PAYMENT_MILESTONES: PaymentMilestone[] = DEFAULT_4_MILESTONES;

// 📋 แม่แบบแบ่งงวดงานยอดนิยม (Milestone Templates)
export const MILESTONE_TEMPLATES: MilestoneTemplate[] = [
  {
    id: 'template-4-stages',
    name: 'มาตรฐาน 4 งวด (สูตรยอดนิยม 20-30-30-20 บ้าน 1-2 ชั้น / ส่วนต่อเติม)',
    description: 'สูตรยอดนิยม 4 งวด แบ่งรอบเบิกจ่าย 20% - 30% - 30% - 20% ควบคุมงานก่อสร้างและกระแสเงินสดง่าย',
    milestonesCount: 4,
    milestones: DEFAULT_4_MILESTONES.map(({ milestoneNumber, title, percentage, durationDays, deliverables, inspectionCriteria }) => ({
      milestoneNumber,
      title,
      percentage,
      durationDays,
      deliverables,
      inspectionCriteria
    }))
  },
  {
    id: 'template-3-stages',
    name: 'มาตรฐาน 3 งวด (สูตร 30-40-30 ต่อเติม / รีโนเวต)',
    description: 'เหมาะสำหรับงานรีโนเวต ต่อเติมครัว-โรงรถ หรืองานก่อสร้างที่ต้องการรอบเบิกจ่ายกระชับ แบ่ง 30% - 40% - 30%',
    milestonesCount: 3,
    milestones: [
      {
        milestoneNumber: 1,
        title: 'งวดที่ 1 (30%): ทำสัญญา วางผัง ฐานราก เสาเข็ม และโครงสร้าง คสล. เสา-คาน-พื้น',
        percentage: 30,
        durationDays: 30,
        deliverables: [
          'ทำสัญญาจ้างและส่งมอบแบบแปลนก่อสร้าง',
          'ปรับพื้นที่ วางผัง ตอกเสาเข็มและเทฐานราก คสล.',
          'หล่อเสา คานคอดิน คานชั้นบน และวางแผ่นพื้นเท Topping'
        ],
        inspectionCriteria: 'ตรวจตำแหน่งหมุดเขต รายงานการตอกเสาเข็ม และความสมบูรณ์ของโครงสร้างคอนกรีต คสล.'
      },
      {
        milestoneNumber: 2,
        title: 'งวดที่ 2 (40%): โครงหลังคามุงเสร็จ ก่อฉาบผนัง ฝังท่อร้อยสายไฟ ประปา ฝ้าเพดาน และปูกระเบื้อง',
        percentage: 40,
        durationDays: 45,
        deliverables: [
          'ติดตั้งโครงหลังคาเหล็ก มุงแผ่นหลังคา เชิงชาย และแผ่นปิดกันนก',
          'ก่อผนังอิฐ หล่อเสาเอ็น-ทับหลัง ฉาบปูนเรียบ 2 ด้าน',
          'กรีดฝังท่อร้อยสายไฟ uPVC ท่อประปา และติดตั้งโครงคร่าวฝ้าเพดาน',
          'ปูกระเบื้องพื้นแกรนิตโต้ และกระเบื้องห้องน้ำกันลื่น R10'
        ],
        inspectionCriteria: 'ทดสอบการรั่วซึมหลังคา ตรวจแนวดิ่งฉากผนัง ท่อประปาไม่มีรอยรั่วซึม และเคาะตรวจผิวกระเบื้องไม่กลวง'
      },
      {
        milestoneNumber: 3,
        title: 'งวดที่ 3 (30%): ทาสี ติดตั้งประตูหน้าต่าง สุขภัณฑ์ ดวงโคม งานภายนอก เก็บ Defect และส่งมอบ',
        percentage: 30,
        durationDays: 25,
        deliverables: [
          'ทาสีรองพื้นและสีจริงภายใน-ภายนอก 2 เที่ยว',
          'ติดตั้งชุดประตูห้อง 70/80/90 หน้าต่าง-ประตูอลูมิเนียม และบัวพื้น',
          'ติดตั้งสุขภัณฑ์ห้องน้ำ อุปกรณ์ประปา ตู้คอนซูเมอร์ยูนิต สวิตช์ และโคมไฟ LED',
          'งานรั้ว โรงจอดรถ ท่อระบายน้ำ คสล. ทำความสะอาด และส่งมอบงาน 100%'
        ],
        inspectionCriteria: 'ทดสอบระบบตัดไฟรั่ว RCBO ทดสอบการเปิด-ปิดประตูหน้าต่าง ระบบระบายน้ำ และตรวจรับ Defect รอบอาคาร 100%'
      }
    ]
  },
  {
    id: 'template-5-stages',
    name: 'มาตรฐาน 5 งวด (สมาคมธุรกิจสร้างบ้าน 15-25-25-20-15)',
    description: 'สูตรยอดนิยม 15-25-25-20-15 กระจายภาระการจ่ายเงินสมดุลระหว่างเจ้าของบ้านและผู้รับเหมา',
    milestonesCount: 5,
    milestones: [
      {
        milestoneNumber: 1,
        title: 'งวดที่ 1 (15%): ทำสัญญาจ้าง วางผังอาคาร และตอกเสาเข็ม',
        percentage: 15,
        durationDays: 15,
        deliverables: [
          'ลงนามสัญญาจ้างก่อสร้างและมอบเอกสารแบบแปลน',
          'ปรับระดับดิน เคลียร์พื้นที่หน้างาน และวางผังหมุดเสาเข็ม',
          'ตอกเสาเข็มไอ คสล. และตัดปอกหัวเข็มครบทุกต้น'
        ],
        inspectionCriteria: 'ตรวจสอบแนวผังหมุดเขตที่ดิน รายงานการตอกเสาเข็ม (Blow Count) และระดับหัวเสาเข็มถูกต้องตามแบบ'
      },
      {
        milestoneNumber: 2,
        title: 'งวดที่ 2 (25%): งานฐานราก เสา คานคอดิน และพื้น คสล.',
        percentage: 25,
        durationDays: 30,
        deliverables: [
          'หล่อคอนกรีตฐานราก (Footing) และตอม่อ',
          'หล่อคานคอดิน คานชั้นบน และเสาโครงสร้าง คสล.',
          'วางแผ่นพื้นสำเร็จรูป ปูวายเมช เทคอนกรีต Topping และหล่อพื้นห้องน้ำ'
        ],
        inspectionCriteria: 'ตรวจความสมบูรณ์ของเนื้อคอนกรีต แกะไม้แบบตรวจโพรงอากาศ (Honeycomb) และระดับผิวพื้นอาคาร'
      },
      {
        milestoneNumber: 3,
        title: 'งวดที่ 3 (25%): โครงหลังคา มุงหลังคา ก่อผนัง และฝังท่อร้อยสาย',
        percentage: 25,
        durationDays: 35,
        deliverables: [
          'ติดตั้งโครงสร้างเหล็กรูปพรรณหลังคา ทาสีกันสนิม 2 เที่ยว',
          'มุงแผ่นเมทัลชีท/กระเบื้องหลังคา เชิงชาย และแผ่นปิดกันนก',
          'ก่อผนังอิฐมวลเบา/อิฐมอญ หล่อเสาเอ็น-ทับหลังรอบวงกบ',
          'กรีดผนังฝังท่อร้อยสายไฟ uPVC และท่อประปาภายใน'
        ],
        inspectionCriteria: 'ทดสอบการรั่วซึมของหลังคา ตรวจแนวดิ่งฉากผนังก่อ และการทดสอบแรงดันน้ำท่อประปา'
      },
      {
        milestoneNumber: 4,
        title: 'งวดที่ 4 (20%): ฉาบปูน ฝ้าเพดาน ปูกระเบื้อง ประตูหน้าต่าง ตกแต่งบัว-หิน',
        percentage: 20,
        durationDays: 30,
        deliverables: [
          'ฉาบปูนผิวผนัง 2 ด้าน ติดตาข่ายไฟเบอร์มุมวงกบ',
          'ติดตั้งโครงคร่าวฝ้าเพดานยิปซัมบอร์ด ฉาบเรียบรอยต่อ',
          'ปูกระเบื้องพื้นแกรนิตโต้ และกระเบื้องห้องน้ำกันลื่น R10 จรดฝ้า',
          'ติดตั้งกรอบประตูหน้าต่างอลูมิเนียม บานประตูห้อง 70/80/90',
          'ติดบัวพื้นกันเปื้อน บัวปูนหน้าต่าง และงานหินกาบผนังตกแต่ง'
        ],
        inspectionCriteria: 'เคาะตรวจโพรงใต้กระเบื้อง (ไม่กลวง) ตรวจระดับสโลปน้ำห้องน้ำ และการเปิด-ปิดล็อกของประตูหน้าต่าง'
      },
      {
        milestoneNumber: 5,
        title: 'งวดที่ 5 (15%): ทาสี ดวงโคม สุขภัณฑ์ งานภายนอก และส่งมอบบ้าน',
        percentage: 15,
        durationDays: 20,
        deliverables: [
          'ทาสีรองพื้นปูนใหม่ + สีจริงอะคริลิกกึ่งเงา 2 เที่ยว',
          'ดึงสายไฟเข้าตู้คอนซูเมอร์ ติดตั้งสวิตช์ เต้ารับ โคมไฟ LED',
          'ติดตั้งสุขภัณฑ์ห้องน้ำ อ่างล้างหน้า ฝักบัว และอุปกรณ์ห้องน้ำ',
          'งานรั้ว ประตูรั้ว โรงจอดรถ ท่อระบายน้ำ และแท่นวางถังน้ำ',
          'ทำความสะอาด เก็บ Defect ส่งมอบบ้านพร้อมกุญแจและเอกสารรับประกัน'
        ],
        inspectionCriteria: 'ทดสอบระบบตัดไฟรั่ว RCBO ทดสอบระบบระบายน้ำ ตรวจสอบ Defect รอบบ้านครบถ้วน 100%'
      }
    ]
  },
  {
    id: 'template-6-stages',
    name: 'มาตรฐาน 6 งวด (บ้าน 2 ชั้น / บ้านหลังใหญ่ 10-20-20-20-15-15)',
    description: 'แบ่งงวดละเอียด 10-20-20-20-15-15 ช่วยคุมกระแสเงินสดและตรวจรับงานถี่ขึ้นสำหรับบ้านขนาดใหญ่',
    milestonesCount: 6,
    milestones: [
      {
        milestoneNumber: 1,
        title: 'งวดที่ 1 (10%): ทำสัญญา วางผัง ตอกเข็ม และฐานรากตอม่อ',
        percentage: 10,
        durationDays: 20,
        deliverables: ['เซ็นสัญญา', 'วางผัง', 'ตอกเสาเข็ม', 'เทฐานราก คสล.'],
        inspectionCriteria: 'ตรวจความลึกเสาเข็มและตำแหน่งผังเสา'
      },
      {
        milestoneNumber: 2,
        title: 'งวดที่ 2 (20%): คานคอดิน เสาชั้น 1-2 และพื้น คสล.',
        percentage: 20,
        durationDays: 30,
        deliverables: ['เทคานคอดิน', 'หล่อเสาชั้น 1 และ 2', 'วางแผ่นพื้นและเท Topping'],
        inspectionCriteria: 'ตรวจระดับพื้นและเนื้อคอนกรีตเสา-คาน'
      },
      {
        milestoneNumber: 3,
        title: 'งวดที่ 3 (20%): โครงหลังคา มุงหลังคา เชิงชาย และฝังท่อเมน',
        percentage: 20,
        durationDays: 30,
        deliverables: ['ติดตั้งโครงหลังคาเหล็ก', 'มุงกระเบื้อง/เมทัลชีท', 'ท่อเมนน้ำทิ้งและเมนไฟฟ้า'],
        inspectionCriteria: 'ตรวจความลาดเอียงหลังคาและการกันน้ำรั่วซึม'
      },
      {
        milestoneNumber: 4,
        title: 'งวดที่ 4 (20%): ก่อผนัง ทับหลัง วงกบ และกรีดฝังท่อร้อยสาย',
        percentage: 20,
        durationDays: 35,
        deliverables: ['ก่อผนังอิฐมอญ/มวลเบา', 'เทเสาเอ็น-ทับหลัง', 'ติดตั้งวงกบประตูหน้าต่าง', 'ฝังท่อร้อยสายไฟ'],
        inspectionCriteria: 'ตรวจฉากมุมผนัง เสาเอ็นรอบวงกบ และแนวท่อไฟ'
      },
      {
        milestoneNumber: 5,
        title: 'งวดที่ 5 (15%): ฉาบปูน ฝ้าเพดาน ปูกระเบื้อง ประตูหน้าต่าง ตกแต่งบัว-หิน',
        percentage: 15,
        durationDays: 30,
        deliverables: ['ฉาบปูนเรียบ', 'ทำฝ้าเพดาน', 'ปูกระเบื้องแกรนิตโต้และห้องน้ำ', 'ติดบัวพื้นและหินกาบ'],
        inspectionCriteria: 'ตรวจความเรียบผิวปูนฉาบ เคาะตรวจกระเบื้อง'
      },
      {
        milestoneNumber: 6,
        title: 'งวดที่ 6 (15%): ทาสี สุขภัณฑ์ เดินสายไฟ ตู้คอนซูเมอร์ งานภายนอก ส่งมอบ',
        percentage: 15,
        durationDays: 25,
        deliverables: ['ทาสีภายในภายนอก', 'สุขภัณฑ์', 'ตู้ควบคุมไฟและโคมไฟ', 'รั้ว-โรงรถ-ระบายน้ำ', 'ส่งมอบบ้าน'],
        inspectionCriteria: 'ตรวจทดสอบระบบไฟฟ้า ประปา ระบายน้ำ และเก็บ Defect 100%'
      }
    ]
  }
];

// ⚡ ตารางราคาประเมินและสเปกสายไฟมาตรฐาน วสท. / มอก. 11-2553
export const WIRE_PRICE_STANDARDS: Record<WireCrossSection, {
  nominalAmps: number;
  thwPricePerM: number;
  thw100mCoil: number;
  vafPricePerM: number;
  vafGPricePerM: number;
  nyyPricePerM: number;
  purposeTh: string;
  recommendedBreaker: number;
}> = {
  '1.5': {
    nominalAmps: 15,
    thwPricePerM: 8.5,
    thw100mCoil: 780,
    vafPricePerM: 18,
    vafGPricePerM: 26,
    nyyPricePerM: 38,
    purposeTh: 'วงจรแสงสว่าง, หลอดไฟ LED, สวิตช์ไฟทั่วไป',
    recommendedBreaker: 10
  },
  '2.5': {
    nominalAmps: 20,
    thwPricePerM: 13.5,
    thw100mCoil: 1250,
    vafPricePerM: 28,
    vafGPricePerM: 42,
    nyyPricePerM: 52,
    purposeTh: 'วงจรเต้ารับไฟฟ้า (ปลั๊กไฟ 3 รู), พัดลมระบายอากาศ, ปั๊มน้ำ',
    recommendedBreaker: 16
  },
  '4': {
    nominalAmps: 27,
    thwPricePerM: 21,
    thw100mCoil: 1950,
    vafPricePerM: 45,
    vafGPricePerM: 65,
    nyyPricePerM: 78,
    purposeTh: 'เครื่องปรับอากาศ 9,000-18,000 BTU, เครื่องทำน้ำอุ่น 3,500W',
    recommendedBreaker: 20
  },
  '6': {
    nominalAmps: 36,
    thwPricePerM: 32,
    thw100mCoil: 2980,
    vafPricePerM: 68,
    vafGPricePerM: 95,
    nyyPricePerM: 110,
    purposeTh: 'เครื่องปรับอากาศ 24,000-36,000 BTU, เครื่องทำน้ำอุ่น 4,500-6,000W, เตาอบ',
    recommendedBreaker: 32
  },
  '10': {
    nominalAmps: 50,
    thwPricePerM: 54,
    thw100mCoil: 4950,
    vafPricePerM: 110,
    vafGPricePerM: 155,
    nyyPricePerM: 175,
    purposeTh: 'สายเมนย่อย, EV Wallbox 7.4 kW, เครื่องทำน้ำร้อนหม้อต้ม 8,000W',
    recommendedBreaker: 40
  },
  '16': {
    nominalAmps: 68,
    thwPricePerM: 85,
    thw100mCoil: 7800,
    vafPricePerM: 175,
    vafGPricePerM: 240,
    nyyPricePerM: 265,
    purposeTh: 'สายเมนเข้าบ้าน มิเตอร์ 15(45)A มาตรฐานการไฟฟ้านครหลวง/ภูมิภาค',
    recommendedBreaker: 50
  },
  '25': {
    nominalAmps: 89,
    thwPricePerM: 135,
    thw100mCoil: 12400,
    vafPricePerM: 260,
    vafGPricePerM: 360,
    nyyPricePerM: 390,
    purposeTh: 'สายเมนเข้าบ้านหลังใหญ่ มิเตอร์ 30(100)A เฟสเดียว',
    recommendedBreaker: 63
  },
  '35': {
    nominalAmps: 111,
    thwPricePerM: 185,
    thw100mCoil: 16900,
    vafPricePerM: 350,
    vafGPricePerM: 480,
    nyyPricePerM: 520,
    purposeTh: 'สายเมนเข้าบ้าน 3 เฟส หรือบ้านที่มีระบบแอร์และ EV หลายจุด',
    recommendedBreaker: 100
  }
};

// วงจรไฟฟ้ามาตรฐานเริ่มต้นสำหรับบ้านพักอาศัย
export function getDefaultElectricalCircuits(houseAreaSqm: number): ElectricalCircuitConfig[] {
  const scale = Math.max(0.6, houseAreaSqm / 120);
  
  return [
    {
      id: 'cir-main',
      circuitType: 'main_feeder',
      name: 'สายเมนประธานเข้าตู้ควบคุม (มิเตอร์ 15(45)A หรือ 30(100)A)',
      pointsCount: 1,
      avgDistanceM: 25,
      wireType: 'THW',
      phaseWiresSize: houseAreaSqm > 180 ? '25' : '16',
      groundWireSize: '10',
      conduitType: 'pvc_white',
      breakerRatingA: houseAreaSqm > 180 ? 63 : 50,
      notes: 'ร้อยท่อ PVC ขาว/เหลือง หรือท่อ EMT จากเสาไฟฟ้าหน้าบ้านเข้าตู้คอนซูเมอร์'
    },
    {
      id: 'cir-light',
      circuitType: 'lighting',
      name: 'วงจรแสงสว่างและสวิตช์ไฟ (โคม LED / ดาวน์ไลท์)',
      pointsCount: Math.round(28 * scale),
      avgDistanceM: 14,
      wireType: 'THW',
      phaseWiresSize: '1.5',
      conduitType: 'pvc_white',
      breakerRatingA: 10,
      notes: 'แยก 2-3 วงจรย่อยตามชั้นหรือโซน ร้อยท่อบนฝ้าเพดาน'
    },
    {
      id: 'cir-receptacle',
      circuitType: 'receptacle',
      name: 'วงจรเต้ารับไฟฟ้า ปลั๊กไฟกราวด์คู่ (ห้องนอน โถง ครัว)',
      pointsCount: Math.round(36 * scale),
      avgDistanceM: 16,
      wireType: 'THW',
      phaseWiresSize: '2.5',
      groundWireSize: '2.5',
      conduitType: 'pvc_white',
      breakerRatingA: 16,
      notes: 'มีสายดิน (G) ทุกจุดตามมาตรฐาน วสท. และติดตั้งแยกวงจรละไม่เกิน 10 จุด'
    },
    {
      id: 'cir-air-small',
      circuitType: 'air_con_small',
      name: 'วงจรเครื่องปรับอากาศ 9,000 - 18,000 BTU (ห้องนอน)',
      pointsCount: Math.max(2, Math.round(3 * scale)),
      avgDistanceM: 18,
      wireType: 'THW',
      phaseWiresSize: '4',
      groundWireSize: '2.5',
      conduitType: 'pvc_white',
      breakerRatingA: 20,
      notes: 'เดินสายตรงจากตู้คอนซูเมอร์แยกเฉพาะเครื่อง ห้ามพ่วงรวมกับเต้ารับ'
    },
    {
      id: 'cir-air-large',
      circuitType: 'air_con_large',
      name: 'วงจรเครื่องปรับอากาศ 24,000 BTU+ (ห้องโถงรับแขก)',
      pointsCount: Math.max(1, Math.round(1 * scale)),
      avgDistanceM: 20,
      wireType: 'THW',
      phaseWiresSize: '6',
      groundWireSize: '4',
      conduitType: 'pvc_white',
      breakerRatingA: 32,
      notes: 'รองรับกระแสสตาร์ทคอมเพรสเซอร์อินเวอร์เตอร์ขนาดใหญ่'
    },
    {
      id: 'cir-water-heater',
      circuitType: 'water_heater_3500w',
      name: 'วงจรเครื่องทำน้ำอุ่นห้องน้ำ (3,500W - 4,500W)',
      pointsCount: Math.max(1, Math.round(2 * scale)),
      avgDistanceM: 15,
      wireType: 'THW',
      phaseWiresSize: '4',
      groundWireSize: '2.5',
      conduitType: 'pvc_white',
      breakerRatingA: 20,
      notes: 'ต้องผ่านเบรกเกอร์กันดูด RCBO (ตัดไฟรั่วไม่เกิน 30mA ภายใน 0.04 วินาที)'
    },
    {
      id: 'cir-pump-outdoor',
      circuitType: 'receptacle',
      name: 'วงจรปั๊มน้ำ แท่นกรองน้ำ & ไฟกิ่งรอบรั้ว/โรงรถ',
      pointsCount: 1,
      avgDistanceM: 22,
      wireType: 'NYY',
      phaseWiresSize: '2.5',
      groundWireSize: '2.5',
      conduitType: 'pvc_yellow',
      breakerRatingA: 16,
      notes: 'สาย NYY ทนความชื้นและแสงแดด ป้องกันการเปื่อยแตกกรอบ'
    }
  ];
}

// ฟังก์ชันแปลงรายการงวดงานเป็นข้อความสรุปสำหรับใบเสนอราคา
export function formatMilestonesToPaymentTerms(milestones: PaymentMilestone[], grandTotal: number): string {
  if (!milestones || milestones.length === 0) return '';
  return milestones.map(m => {
    const amount = Math.round(grandTotal * (m.percentage / 100));
    return `งวดที่ ${m.milestoneNumber} (${m.percentage}% ~ ฿${amount.toLocaleString()}): ${m.title} [ระยะเวลา ~${m.durationDays || 30} วัน]`;
  }).join('\n');
}

// ค่าเริ่มต้นสำหรับเอกสารใบเสนอราคา
export const DEFAULT_QUOTATION_META: QuotationMeta = {
  quotationNumber: `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
  issueDate: new Date().toISOString().split('T')[0],
  validityDays: 30,
  customerName: 'คุณสมศักดิ์ สุขเจริญ (เจ้าของโครงการ)',
  customerPhone: '081-234-5678',
  customerAddress: 'แปลงที่ 14 หมู่บ้านสุขนิเวศน์ ต.บางกรวย อ.บางกรวย จ.นนทบุรี',
  contractorName: 'ห้างหุ้นส่วนจำกัด ไทยคอนสตรัคชั่น แอนด์ ดีไซน์',
  contractorPhone: '089-876-5432, 02-345-6789',
  contractorTaxId: '0-1035-64012-34-5',
  paymentTerms: 'งวดที่ 1 (20%): ทำสัญญา วางผัง ฐานราก และเสาเข็ม\nงวดที่ 2 (30%): โครงสร้าง คสล. เสา-คาน-พื้น และโครงหลังคามุงเสร็จ\nงวดที่ 3 (30%): ก่อผนัง ฉาบปูน ฝ้าเพดาน ปูกระเบื้อง ท่อสายไฟและประปา\nงวดที่ 4 (20%): ทาสี สุขภัณฑ์ ติดตั้งดวงโคม เก็บรายละเอียดส่งมอบ',
  warrantyTerms: 'รับประกันโครงสร้างอาคาร 5 ปี • รับประกันงานสถาปัตยกรรมและการรั่วซึม 1 ปี • รับประกันระบบไฟฟ้า 1 ปี',
  notes: 'ราคานี้รวมค่าแรง ค่าวัสดุ ขนส่ง และภาษีแล้ว ไม่รวมค่าธรรมเนียมขออนุญาตขอมิเตอร์น้ำ-ไฟ'
};

// 🏛️ แคตตาล็อกงานตกแต่งภายในและภายนอก
export const DECORATION_CATALOG: DecorationItemPreset[] = [
  {
    id: 'dec-skirt-pvc-4in',
    type: 'interior_skirting',
    name: 'บัวเชิงผนัง PVC / WPC กันเปื้อนภายใน สูง 4 นิ้ว (10 ซม.) หนา 12-15 มม.',
    spec: 'บัวโพลีเมอร์ WPC ลายไม้/สีขาว มอก. ยึดด้วยกาวตะปูและปืนลม ยาแนวอะคริลิกเก็บรอยต่อหัว-ท้าย',
    unit: 'ม.',
    defaultQty: 75,
    materialUnitPrice: 135,
    laborUnitPrice: 55,
    wastePercent: 8,
    description: 'ป้องกันผนังเปื้อนน้ำยาถูพื้นและคราบไม้กวาด ปกปิดรอยต่อระหว่างกระเบื้องกับผนังปูนให้เรียบร้อย',
    recommendation: 'ความยาวรอบห้องโถง ทางเดิน และห้องนอนทั้งหมด (บ้าน 120 ตร.ม. ใช้ประมาณ 65 - 85 เมตร)',
    installationTip: 'ตัดเข้ามุม 45 องศาด้วยเลื่อยองศา และยิงแด๊ปอะคริลิกขอบบนก่อนทาสีทับ'
  },
  {
    id: 'dec-skirt-wood-3in',
    type: 'interior_skirting',
    name: 'บัวพื้นไม้จริงเนื้อแข็ง (ไม้เต็ง/ไม้แดง) ไสลบเหลี่ยม สูง 3-4 นิ้ว ทาสีย้อมไม้',
    spec: 'ไม้เนื้อแข็งอบแห้งป้องกันบิดโก่ง ไสเรียบ เข้าลิ้นมุม ติดตั้งพร้อมทาสีย้อมไม้ 2 เที่ยว',
    unit: 'ม.',
    defaultQty: 50,
    materialUnitPrice: 240,
    laborUnitPrice: 85,
    wastePercent: 10,
    description: 'ให้ความรู้สึกอบอุ่น พรีเมียม เหมาะกับบ้านสไตล์ลักชัวรี คลาสสิก หรือพื้นไม้ปาร์เก้/SPC',
    recommendation: 'เหมาะกับห้องรับแขกและห้องนอนใหญ่',
    installationTip: 'ลงน้ำยากันปลวกก่อนติดตั้ง และโป๊วปิดหัวตะปูด้วยขี้เลื่อยผสมกาวลาเท็กซ์'
  },
  {
    id: 'dec-skirt-alu-shadow',
    type: 'interior_skirting',
    name: 'บัวอลูมิเนียมฝังซ่อนผนัง / บัวร่องเงา Shadow Gap (Modern Minimal)',
    spec: 'กรอบอลูมิเนียมตัว U/L อบสีดำหรือสีขาว ฝังใต้แผ่นยิปซัม/ร่องผนัง ฉาบเรียบขนานพื้น',
    unit: 'ม.',
    defaultQty: 40,
    materialUnitPrice: 210,
    laborUnitPrice: 95,
    wastePercent: 8,
    description: 'สไตล์โมเดิร์น มินิมอล สร้างมิติผนังลอย (Floating Wall) สวยงามไร้คิ้วบัวยื่นสะสมฝุ่น',
    recommendation: 'นิยมใช้ในบ้านสไตล์โมเดิร์น มินิมอล คอนโด หรือโถงรับแขกโอ่โถง',
    installationTip: 'ต้องฝังก่อนงานฉาบปูนหรือก่อนกรุผนังยิปซัม'
  },
  {
    id: 'dec-mold-conc-sill',
    type: 'exterior_molding',
    name: 'บัวปูนปั้น คสล. กรอบหน้าต่างภายนอก ป้องกันน้ำไหลย้อน (บัวดักน้ำบน-ล่าง-ข้าง)',
    spec: 'หล่อปูนทรายผสมน้ำยากันซึม กว้าง 10 ซม. หนา 5 ซม. เซาะร่องหยดน้ำ (Drip Line) ใต้บัวล่าง',
    unit: 'ม.',
    defaultQty: 48,
    materialUnitPrice: 140,
    laborUnitPrice: 110,
    wastePercent: 5,
    description: 'ป้องกันน้ำฝนไหลย้อนซึมเข้ารอยต่อขอบวงกบหน้าต่างอลูมิเนียม พร้อมเพิ่มมิติลายเส้นภายนอกอาคาร',
    recommendation: 'กรอบหน้าต่างขนาด 1.2 x 1.1 ม. 1 ช่อง ใช้ความยาวบัวรอบกรอบประมาณ 4.6 - 5.0 เมตร',
    installationTip: 'ต้องกรีดทำร่องหยดน้ำใต้บัวล่าง ห่างจากขอบ 1.5 ซม. เพื่อตัดการไหลของน้ำฝนไม่ให้ย้อนเข้าผนัง'
  },
  {
    id: 'dec-mold-eps-foam',
    type: 'exterior_molding',
    name: 'บัวโฟม EPS เคลือบปูนผสมโพลีเมอร์และตาข่ายไฟเบอร์ น้ำหนักเบา (EPS Lightweight Molding)',
    spec: 'บัวสำเร็จรูปความหนาแน่นสูง ไม่ดูดซึมน้ำ ยึดด้วยกาวซีเมนต์แรงยึดเกาะสูง ป้องกันรอยแตกร้าว 100%',
    unit: 'ม.',
    defaultQty: 35,
    materialUnitPrice: 195,
    laborUnitPrice: 90,
    wastePercent: 5,
    description: 'น้ำหนักเบา ไม่เพิ่มโหลดให้โครงสร้าง ติดตั้งเร็ว ไม่แตกร้าวจากความร้อน ทนแดดทนฝน',
    recommendation: 'เหมาะกับบ้านสไตล์คอนเทมโพรารี ยุโรป หรือโมเดิร์นคลาสสิกที่ต้องการบัวขนาดใหญ่',
    installationTip: 'ใช้ปูนกาวชนิดโพลีเมอร์ยึดผนังและยาแนวรอยต่อด้วยโพลียูรีเทน (PU Sealant)'
  },
  {
    id: 'dec-stone-slate-natural',
    type: 'slate_stone_wall',
    name: 'งานกรุผนังหินกาบธรรมชาติ (Slate Stone Wall) สีดำ/เทา/สนิม ผิวหน้าธรรมชาติ',
    spec: 'หินกาบแท้ตัดขอบ คละขนาด ปูด้วยปูนกาวซีเมนต์สำหรับหินธรรมชาติ เคลือบน้ำยาอะคริลิกกันตะไคร่ 2 เที่ยว',
    unit: 'ตร.ม.',
    defaultQty: 18,
    materialUnitPrice: 680,
    laborUnitPrice: 380,
    wastePercent: 12,
    description: 'ลวดลายหินธรรมชาติแท้ มีมิติ Texture แข็งแกร่ง หรูหรา ทนทานตลอดอายุการใช้งาน ไม่ซีดจาง',
    recommendation: 'แผงผนังหน้าบ้านโชว์ทางเข้า, เสาโชว์หน้าเฉลียง, หรือผนังน้ำพุ/สวนหย่อม (เฉลี่ย 15 - 25 ตร.ม.)',
    installationTip: 'ก่อนติดหินต้องสกัดผิวปูนฉาบให้หยาบ (Chipping) เพื่อให้ปูนกาวยึดเกาะแน่นไม่ร่วงหล่น'
  },
  {
    id: 'dec-stone-culture-brick',
    type: 'slate_stone_wall',
    name: 'งานกรุหินเทียม / อิฐเทียมตกแต่งสไตล์ลอฟท์ (Cultured Stone / Antique Brick)',
    spec: 'หินเทียมคอนกรีตมวลเบาขึ้นรูป ผิวสัมผัสเลียนแบบหินภูเขา/อิฐโบราณ ยาแนวร่องสไตล์คันทรี',
    unit: 'ตร.ม.',
    defaultQty: 15,
    materialUnitPrice: 620,
    laborUnitPrice: 320,
    wastePercent: 10,
    description: 'สร้างบรรยากาศอบอุ่น สไตล์รีสอร์ต ลอฟท์ หรือคอทเทจ น้ำหนักเบากว่าหินธรรมชาติ 50%',
    recommendation: 'ผนังตกแต่งห้องรับแขก แบ็คดรอปทีวี หรือซุ้มทางเข้าหน้าบ้าน',
    installationTip: 'จัดเรียงสลับลายบนพื้นก่อนแปะจริง เพื่อกระจายเฉดสีให้เป็นธรรมชาติ'
  },
  {
    id: 'dec-clad-wpc-fluted',
    type: 'wall_cladding',
    name: 'ผนังกรุระแนงไม้เทียม WPC Fluted Wall Panel (ภายใน/ภายนอกร่ม)',
    spec: 'แผ่นระแนง WPC ลอนเหลี่ยม หนา 12-25 มม. หน้ากว้าง 15-20 ซม. ยึดคลิปล็อคสแตนเลสบนโครงคร่าว',
    unit: 'ตร.ม.',
    defaultQty: 22,
    materialUnitPrice: 580,
    laborUnitPrice: 260,
    wastePercent: 8,
    description: 'ผนังระแนงลอนโมเดิร์น ไม่บวมน้ำ ปลวกไม่กิน ผิวสัมผัสไม้ธรรมชาติ เพิ่มมิติให้ผนังเรียบ',
    recommendation: 'ผนัง Accent Wall ห้องนั่งเล่น, แผงกั้นส่วนทานอาหาร, ผนังหัวเตียง หรือโถงบันได',
    installationTip: 'สามารถติดตั้งบนผนังปูนฉาบเรียบโดยตรงด้วยกาวตะปู หรือยึดบนโครงเหล็กกัลวาไนซ์'
  },
  {
    id: 'dec-clad-fibercement-plank',
    type: 'wall_cladding',
    name: 'ผนังกรุไม้ฝาไฟเบอร์ซีเมนต์ เซาะร่องบังใบภายนอก (Fiber Cement Siding Plank)',
    spec: 'ไม้ฝาหน้า 6-8 นิ้ว หนา 8-10 มม. ติดตั้งซ้อนเกล็ด/ชนชิด โครงกัลวาไนซ์ ทาสีน้ำอะคริลิกภายนอก',
    unit: 'ตร.ม.',
    defaultQty: 25,
    materialUnitPrice: 320,
    laborUnitPrice: 190,
    wastePercent: 8,
    description: 'ตกแต่งแผงใต้จั่ว ผนังชั้นสอง หรือผนังโชว์ภายนอกบ้าน ทนแดดทนฝน ไม่ติดไฟ ไม่ผุกร่อน',
    recommendation: 'แผงหน้าจั่วหลังคา หรือผนังตกแต่งภายนอกชั้น 2',
    installationTip: 'ยึดด้วยสกรูมีปีกจมมิด โป๊วรอยต่อด้วยอะคริลิกฟิลเลอร์ก่อนทาสีจริง 2 เที่ยว'
  },
  {
    id: 'dec-clad-marble-pvc',
    type: 'wall_cladding',
    name: 'ผนังกรุแผ่นพีวีซีลายหินอ่อน UV Marble Sheet หนา 3 มม. (ขนาด 1.22 x 2.44 ม.)',
    spec: 'แผ่น PVC เคลือบ UV เงางาม ทนความชื้น ติดตั้งบนโครงไม้อัด/ผนังเดิม พร้อมคิ้วอลูมิเนียมสีทอง/พิงค์โกลด์',
    unit: 'ตร.ม.',
    defaultQty: 16,
    materialUnitPrice: 450,
    laborUnitPrice: 220,
    wastePercent: 10,
    description: 'สวยหรูเหมือนหินอ่อนแท้ ไร้รอยต่อแผ่นใหญ่ ติดตั้งง่าย เช็ดทำความสะอาดง่าย น้ำหนักเบา',
    recommendation: 'ผนังหลังทีวี (TV Wall), ผนังโต๊ะอาหาร, หรือโถงต้อนรับสไตล์ลักชัวรี',
    installationTip: 'ใช้กาวตะปูและเทปโฟม 3M สองหน้ายึดกับผนังที่แห้งสนิท'
  }
];

// 🏡 แคตตาล็อกงานภายนอกอาคาร
export const EXTERNAL_WORKS_CATALOG: ExternalWorksPreset[] = [
  {
    id: 'ext-fence-concrete-block',
    type: 'fence',
    name: 'รั้วคอนกรีตบล็อก คสล. สูง 1.80-2.00 ม. (ฐานรากแผ่/เสาเข็ม 4-6 ม.)',
    spec: 'เสา คสล. @ 2.50 ม. คานคอดิน คานทับหลัง ก่อคอนกรีตบล็อก ฉาบเรียบ 2 ด้าน ทาสีภายนอก',
    unit: 'ม.',
    defaultQty: 40,
    materialUnitPrice: 1450,
    laborUnitPrice: 850,
    wastePercent: 5,
    description: 'รั้วทึบมาตรฐาน แข็งแรง ก่อสร้างรวดเร็ว ป้องกันสัตว์และสายตาจากภายนอก',
    popularNote: 'ความยาวแปลงมาตรฐานประมาณ 35 - 50 เมตร'
  },
  {
    id: 'ext-fence-louver-wood',
    type: 'fence',
    name: 'รั้วกึ่งโปร่ง เสา คสล. + ระแนงไม้เทียม / เหล็กกล่องกล่องโมเดิร์น สูง 1.80 ม.',
    spec: 'คานคอดิน คสล. ก่ออิฐทึบเตี้ย 0.80 ม. + แผงระแนง WPC ไม้เทียม/เหล็กกล่องกัลวาไนซ์ 1.00 ม.',
    unit: 'ม.',
    defaultQty: 25,
    materialUnitPrice: 1750,
    laborUnitPrice: 900,
    wastePercent: 5,
    description: 'สวยงาม โปร่ง ลมพัดผ่านได้ดี นิยมสำหรับรั้วด้านหน้าบ้านสไตล์โมเดิร์น/มินิมอล',
    popularNote: 'นิยมใช้ฝั่งหน้าบ้านติดถนนสาธารณะ'
  },
  {
    id: 'ext-gate-sliding-steel',
    type: 'fence',
    name: 'ประตูรั้วบานเลื่อนเหล็กกล่องกัลวาไนซ์ + ระแนงไม้เทียม (กว้าง 4.00-5.00 ม.)',
    spec: 'โครงเหล็กกล่อง 2"x4" กัลวาไนซ์ ทาสีอีพ็อกซี่ ล้อสแตนเลส รางเพลา พร้อมเสาประคองและล็อค',
    unit: 'ชุด',
    defaultQty: 1,
    materialUnitPrice: 24500,
    laborUnitPrice: 4500,
    wastePercent: 0,
    description: 'ประตูรั้วหน้าบ้านสำหรับรถยนต์เข้า-ออก เลื่อนลื่น เงียบ รองรับการติดมอเตอร์รีโมทในอนาคต',
    popularNote: 'ขนาดกว้าง 4.0 - 5.5 ม. รถเข้าสะดวก'
  },
  {
    id: 'ext-gate-motor-remote',
    type: 'fence',
    name: 'มอเตอร์ประตูรั้วอัตโนมัติ (Sliding Gate Opener) 800-1000 กก. พร้อมรีโมท',
    spec: 'มอเตอร์ AC/DC พร้อมสะพานเฟือง 4-5 ม. รีโมทไร้สาย 3 ตัว เซนเซอร์กันหนีบ',
    unit: 'ชุด',
    defaultQty: 1,
    materialUnitPrice: 12500,
    laborUnitPrice: 2500,
    wastePercent: 0,
    description: 'เปิด-ปิดประตูรั้วอัตโนมัติไม่ต้องลงจากรถตอนฝนตก ปลอดภัยด้วยเซนเซอร์',
    popularNote: 'อัปเกรดความสะดวกสบายให้กับประตูรั้วหลัก'
  },
  {
    id: 'ext-carport-slab-piling',
    type: 'carport',
    name: 'พื้น คสล. โรงจอดรถ 2 คัน (30-36 ตร.ม.) กดเสาเข็มหกเหลี่ยมกลวง 6 ม. ปูพรม',
    spec: 'เสาเข็มหกเหลี่ยม @ 1.0-1.2 ม. คอนกรีต 240 ksc หนา 12-15 ซม. ตะแกรงวายเมช 6 มม. ปั่นขัดหยาบกันลื่น',
    unit: 'ตร.ม.',
    defaultQty: 32,
    materialUnitPrice: 850,
    laborUnitPrice: 450,
    wastePercent: 5,
    description: 'ป้องกันพื้นโรงรถทรุดตัวและแตกร้าวจากการรับน้ำหนักรถยนต์ 2 คันระยะยาว',
    popularNote: 'จอดรถ 2 คัน กว้าง 5.5 x ยาว 6.0 ม. = 33 ตร.ม.'
  },
  {
    id: 'ext-carport-roof-steel',
    type: 'carport',
    name: 'โครงหลังคาโรงจอดรถ เหล็กกล่องกัลวาไนซ์ + แผ่นเมทัลชีท บุฉนวน PU หนา 1 นิ้ว',
    spec: 'เสาเหล็กกล่อง 4"x4" คานเหล็ก 2"x4" แปโอเมก้า แผ่นเมทัลชีทลอนสแนปล็อค/ลอนมาตรฐาน พร้อมรางน้ำสแตนเลส',
    unit: 'ตร.ม.',
    defaultQty: 32,
    materialUnitPrice: 950,
    laborUnitPrice: 480,
    wastePercent: 5,
    description: 'กันแดดและฝนให้ตัวรถ ฉนวน PU ช่วยซับเสียงฝนตกและลดความร้อนใต้หลังคา',
    popularNote: 'โครงสร้างแยกขาดจากตัวบ้าน ไม่ดึงรั้งตัวบ้านทรุด'
  },
  {
    id: 'ext-carport-stamped-concrete',
    type: 'carport',
    name: 'ผิวพื้นคอนกรีตพิมพ์ลาย (Stamped Concrete) ลายหินธรรมชาติ/Ashlar Slate',
    spec: 'เคลือบสี Color Hardener + น้ำยาเคลือบเงาอะคริลิกกันลื่น ทนคราบน้ำมันเครื่อง',
    unit: 'ตร.ม.',
    defaultQty: 32,
    materialUnitPrice: 480,
    laborUnitPrice: 250,
    wastePercent: 5,
    description: 'พื้นผิวหรูหราเหมือนหินธรรมชาติแท้ ทำความสะอาดง่าย ไม่สะสมตะไคร่น้ำ',
    popularNote: 'ผิวสำเร็จยอดนิยมสำหรับโรงรถบ้านเดี่ยว'
  },
  {
    id: 'ext-drain-manhole-pipe',
    type: 'drainage',
    name: 'ท่อระบายน้ำ คสล. Ø 0.30 ม. (มอก.) + บ่อพักคอนกรีตสำเร็จรูป พร้อมฝา คสล.',
    spec: 'ท่อ คสล. ปากลิ้นราง ขุดดินวางท่อบดอัดทราย พร้อมบ่อพักทุกระยะ 6-8 ม. และมุมหักเลี้ยว',
    unit: 'ม.',
    defaultQty: 35,
    materialUnitPrice: 620,
    laborUnitPrice: 380,
    wastePercent: 5,
    description: 'ระบายน้ำฝนและน้ำซักล้างออกสู่ท่อระบายน้ำสาธารณะ ป้องกันน้ำท่วมขังรอบบ้าน',
    popularNote: 'วางรอบตัวบ้านเพื่อไล่ระดับน้ำลงท่อเทศบาล/อบต.'
  },
  {
    id: 'ext-drain-gutters-grate',
    type: 'drainage',
    name: 'รางระบายน้ำรูปตัวยู (U-Ditch) พร้อมฝาตะแกรงเหล็กชุบกัลวาไนซ์กันสนิม (หน้าโรงรถ/ลาน)',
    spec: 'ราง U สำเร็จรูป กว้าง 0.20-0.25 ม. พร้อมฝาตะแกรงเหล็กรับน้ำหนักรถยนต์วิ่งผ่านได้',
    unit: 'ม.',
    defaultQty: 6,
    materialUnitPrice: 1250,
    laborUnitPrice: 450,
    wastePercent: 0,
    description: 'ดักน้ำฝนหน้าแนวประตูรั้วและโรงรถ ไม่ให้น้ำไหลทะลักเข้าพื้นที่บ้าน',
    popularNote: 'ติดตั้งตามแนวขวางหน้าประตูรั้ว'
  },
  {
    id: 'ext-pavement-walkway-slab',
    type: 'pavement',
    name: 'ทางเดินคอนกรีตรอบบ้าน (กว้าง 1.0 ม.) หนา 8-10 ซม. พร้อมลวดตะแกรงวายเมช',
    spec: 'ปรับทรายหยาบ เทคอนกรีต 240 ksc ปาดลายขูดหยาบ หรือปูแผ่นทางเดินสำเร็จรูป',
    unit: 'ตร.ม.',
    defaultQty: 30,
    materialUnitPrice: 320,
    laborUnitPrice: 180,
    wastePercent: 5,
    description: 'ทางเดินรอบตัวบ้าน ป้องกันดินกระเด็นเปื้อนผนังตอนฝนตก สะอาด เดินตรวจเช็คบ้านสะดวก',
    popularNote: 'ความกว้างมาตรฐาน 0.80 - 1.20 ม. รอบ 3 ด้านของบ้าน'
  },
  {
    id: 'ext-pavement-washing-yard',
    type: 'pavement',
    name: 'ลานซักล้างหลังบ้าน คสล. หนา 10 ซม. (3.0 x 4.0 ม.) พร้อมปูกระเบื้องผิวด้าน R11',
    spec: 'เสาเข็มสั้น 4 ม. คอนกรีต คสล. ปูกระเบื้องภายนอก ท่อน้ำทิ้ง Floor Drain และก๊อกซักล้าง',
    unit: 'ตร.ม.',
    defaultQty: 12,
    materialUnitPrice: 580,
    laborUnitPrice: 320,
    wastePercent: 8,
    description: 'ลานสารพัดประโยชน์สำหรับวางเครื่องซักผ้า ตากผ้า ล้างจานนอกบ้าน',
    popularNote: 'พื้นที่ใช้งานสำคัญด้านหลังบ้าน'
  },
  {
    id: 'ext-water-tank-base',
    type: 'water_system',
    name: 'ฐานราก คสล. รองรับถังเก็บน้ำบนดิน 1,000 - 2,000 ลิตร และแท่นปั๊มน้ำ',
    spec: 'เทคอนกรีต คสล. หนา 15 ซม. เสริมเหล็ก 2 ชั้น พร้อมลงเสาเข็มหกเหลี่ยม 4-6 ต้น ป้องกันฐานเอียง',
    unit: 'จุด',
    defaultQty: 1,
    materialUnitPrice: 4200,
    laborUnitPrice: 1800,
    wastePercent: 0,
    description: 'น้ำหนักน้ำ 1,000-2,000 กก. ต้องมีฐานรากเฉพาะ ห้ามวางบนดินเปล่าเพราะจะทรุดเอียงดึงท่อแตก',
    popularNote: 'จำเป็นต้องมีสำหรับระบบสำรองน้ำ'
  },
  {
    id: 'ext-water-tank-pump-combo',
    type: 'water_system',
    name: 'ถังเก็บน้ำบนดิน Antibac 1,000-1,500 ลิตร + ปั๊มน้ำอัตโนมัติแรงดันคงที่ 200-250W',
    spec: 'ถังเก็บน้ำโพลีเมอร์เกรด มอก. ปั๊มน้ำ Mitsubishi/Hitachi พร้อมระบบบายพาส (Bypass) และเช็ควาล์ว',
    unit: 'ชุด',
    defaultQty: 1,
    materialUnitPrice: 14800,
    laborUnitPrice: 2500,
    wastePercent: 0,
    description: 'ระบบน้ำประปาพร้อมใช้ แรงดันสม่ำเสมอทุกจุดแม้เปิดพร้อมกัน และมีน้ำสำรองกรณีน้ำประปาหยุดไหล',
    popularNote: 'อุปกรณ์มาตรฐานที่ทุกบ้านต้องมี'
  }
];

// 🚪 แคตตาล็อกประตูห้องที่ไม่ใช่อะลูมิเนียม
export const ROOM_DOOR_CATALOG: RoomDoorPreset[] = [
  {
    id: 'door-pvc-70',
    name: 'ประตู PVC ห้องน้ำ บานเกล็ดล่าง + วงกบ PVC (70 x 200 ซม.)',
    doorType: 'bathroom',
    materialType: 'pvc',
    widthCm: '70',
    dimensions: '0.70 x 2.00 ม.',
    defaultMaterialPrice: 1650,
    defaultLaborPrice: 500,
    frameMaterial: 'วงกบ PVC กันน้ำ 100% พร้อมบัวซับขอบ',
    hardwareIncluded: 'บานพับสแตนเลส 3 ตัว + ลูกบิดหัวกลมสแตนเลส',
    description: 'ทนน้ำ กันปลวก 100% น้ำหนักเบา มีเกล็ดระบายความชื้นด้านล่าง เหมาะกับห้องน้ำทุกรูปแบบ'
  },
  {
    id: 'door-upvc-70',
    name: 'ประตู UPVC กันน้ำ เซาะร่องโมเดิร์น + วงกบ UPVC (70 x 200 ซม.)',
    doorType: 'bathroom',
    materialType: 'upvc',
    widthCm: '70',
    dimensions: '0.70 x 2.00 ม.',
    defaultMaterialPrice: 2450,
    defaultLaborPrice: 600,
    frameMaterial: 'วงกบ UPVC แข็งแรงพิเศษ เสริมแกนโฟมความหนาแน่นสูง',
    hardwareIncluded: 'บานพับสแตนเลส 304 x 3 + ลูกบิดก้านโยกห้องน้ำ',
    description: 'ผิวสัมผัสหนา เรียบเนียน ไม่บวม ไม่โก่งตัว ไร้กังวลเรื่องคราบราและปลวก'
  },
  {
    id: 'door-wpc-70',
    name: 'ประตู WPC ไม้สังเคราะห์กันน้ำ 100% ลายเสี้ยนไม้ (70 x 200 ซม.)',
    doorType: 'bathroom',
    materialType: 'wpc',
    widthCm: '70',
    dimensions: '0.70 x 2.00 ม.',
    defaultMaterialPrice: 3200,
    defaultLaborPrice: 650,
    frameMaterial: 'วงกบ WPC โพลีเมอร์ไม้ คอมโพสิต แข็งแกร่ง บากรับลิ้นล็อค',
    hardwareIncluded: 'บานพับสแตนเลส 304 x 3 + มือจับก้านโยกสแตนเลส',
    description: 'สวยเหมือนไม้จริง ทนน้ำ ทนชื้น ไม่ลามไฟ ให้ความรู้สึกพรีเมียมเหมาะกับบ้านสไตล์โมเดิร์น'
  },
  {
    id: 'door-hdf-80',
    name: 'ประตู HDF ลายลูกฟักคลาสสิก / เซาะร่องมินิมอล (80 x 200 ซม.)',
    doorType: 'bedroom',
    materialType: 'hdf',
    widthCm: '80',
    dimensions: '0.80 x 2.00 ม.',
    defaultMaterialPrice: 1850,
    defaultLaborPrice: 550,
    frameMaterial: 'วงกบไม้สังเคราะห์ WPC หรือไม้เนื้อแข็งทาสี',
    hardwareIncluded: 'บานพับสแตนเลส 4x3 นิ้ว 3 ตัว + ลูกบิดกุญแจห้องนอน',
    description: 'ประตูลูกฟักอัดความหนาแน่นสูง น้ำหนักเบา ทาสีได้ตามต้องการ ยอดนิยมอันดับ 1 สำหรับห้องนอน'
  },
  {
    id: 'door-upvc-80',
    name: 'ประตู UPVC โครงสร้างภายในเสริมไม้สังเคราะห์ (80 x 200 ซม.)',
    doorType: 'bedroom',
    materialType: 'upvc',
    widthCm: '80',
    dimensions: '0.80 x 2.00 ม.',
    defaultMaterialPrice: 2850,
    defaultLaborPrice: 650,
    frameMaterial: 'วงกบ UPVC ชนิดหนาพิเศษ ทนแรงกระแทก',
    hardwareIncluded: 'บานพับสแตนเลส 304 x 3 + มือจับก้านโยก Mortise Lock',
    description: 'กันเสียงได้ดี ไม่ลามไฟ ป้องกันปลวก มอด แมลงกัดกินตลอดอายุการใช้งาน'
  },
  {
    id: 'door-wpc-80',
    name: 'ประตู WPC พรีเมียม ปิดผิว PVC ลามิเนตลายไม้ธรรมชาติ (80 x 200 ซม.)',
    doorType: 'bedroom',
    materialType: 'wpc',
    widthCm: '80',
    dimensions: '0.80 x 2.00 ม.',
    defaultMaterialPrice: 3850,
    defaultLaborPrice: 700,
    frameMaterial: 'วงกบไม้คอมโพสิต WPC ซับขอบบังใบในตัว',
    hardwareIncluded: 'บานพับแหวนลูกปืนสแตนเลส x 3 + ก้านโยกล็อค Mortise 2 จังหวะ',
    description: 'ผิวสัมผัสเสมือนไม้ธรรมชาติ 100% แข็งแกร่งแน่นตัน เก็บเสียงดีเยี่ยม'
  },
  {
    id: 'door-solid-wood-80',
    name: 'ประตูไม้จริง (ไม้เต็ง / ไม้สักประสาน FJL) โมเดิร์น (80 x 200 ซม.)',
    doorType: 'bedroom',
    materialType: 'solid_wood',
    widthCm: '80',
    dimensions: '0.80 x 2.00 ม.',
    defaultMaterialPrice: 5800,
    defaultLaborPrice: 900,
    frameMaterial: 'วงกบไม้แดง / ไม้เต็งธรรมชาติแท้ อบแห้งกันบิดงอ',
    hardwareIncluded: 'บานพับแหวนลูกปืนหนา 4 นิ้ว x 3 + ลูกบิดก้านโยกทองเหลือง/สแตนเลส',
    description: 'ไม้จริงทั้งบาน หรูหรา อบอุ่น แข็งแรงทนทาน ไสปรับแต่งได้ตามหน้างานจริง'
  },
  {
    id: 'door-solid-wood-90',
    name: 'ประตูไม้จริงหน้าบ้าน ไม้เนื้อแข็งอบแห้ง ลายบานคู่หรือบานเดี่ยวกว้าง (90 x 200 ซม.)',
    doorType: 'main_entry',
    materialType: 'solid_wood',
    widthCm: '90',
    dimensions: '0.90 x 2.00 ม.',
    defaultMaterialPrice: 7200,
    defaultLaborPrice: 1100,
    frameMaterial: 'วงกบไม้เต็งแท้ ขนาด 2" x 4" พร้อมบัวหน้าต่างตกแต่ง',
    hardwareIncluded: 'บานพับแหวนลูกปืนรับน้ำหนักหนัก 4 ตัว + ชุดล็อค Digital Door Lock หรือมือจับก้านโยกใหญ่',
    description: 'ทางเข้าหลักกว้างขวาง เข้าออกสะดวก ขนเฟอร์นิเจอร์ง่าย ภูมิฐานและมีระดับ'
  },
  {
    id: 'door-wpc-90',
    name: 'ประตู WPC ไม้สังเคราะห์บานกว้างพิเศษ ทนแดดทนฝน (90 x 200 ซม.)',
    doorType: 'main_entry',
    materialType: 'wpc',
    widthCm: '90',
    dimensions: '0.90 x 2.00 ม.',
    defaultMaterialPrice: 4600,
    defaultLaborPrice: 800,
    frameMaterial: 'วงกบ WPC ทนสภาพอากาศภายนอกได้ดี',
    hardwareIncluded: 'บานพับสแตนเลส 4 นิ้ว x 4 + มือจับก้านโยกสแตนเลสพรีเมียม',
    description: 'เหมาะกับทางเข้าหลังบ้าน ประตูห้องนอนใหญ่ หรือระเบียงกว้าง ไม่บิดงอเมื่อโดนแดด'
  },
  {
    id: 'door-upvc-90',
    name: 'ประตู UPVC โมเดิร์นบานใหญ่ ลวดลายเรขาคณิต (90 x 200 ซม.)',
    doorType: 'bedroom',
    materialType: 'upvc',
    widthCm: '90',
    dimensions: '0.90 x 2.00 ม.',
    defaultMaterialPrice: 3400,
    defaultLaborPrice: 700,
    frameMaterial: 'วงกบ UPVC ซับเสียงและร่องยาง EPDM',
    hardwareIncluded: 'บานพับสแตนเลส 4 นิ้ว x 3 + มือจับก้านโยก Mortise Lock',
    description: 'เปิดกว้างโปร่งสบาย ทำความสะอาดง่าย ไร้ปัญหาปลวกกัดกินตลอดชีพ'
  }
];

// 🚪 แคตตาล็อกประเภท ประตู-หน้าต่าง อลูมิเนียม
export const ALUMINUM_CATALOG: AluminumItemPreset[] = [
  {
    id: 'alu-door-slide-2',
    categoryType: 'door',
    name: 'ประตูบานเลื่อนสลับ 2 บาน (Sliding Door 2-Panel)',
    typeTh: 'บานเลื่อนสลับ (2 บาน)',
    frameColor: 'black',
    glassType: 'clear_green',
    dimensions: '2.00 x 2.05 ม.',
    defaultMaterialPrice: 6800,
    defaultLaborPrice: 900,
    unit: 'ชุด',
    description: 'กรอบอลูมิเนียมพาวเดอร์โค้ทสีดำ/อบขาว 1.2-1.5 มม. กระจกเขียวตัดแสง 6 มม. ล็อคมาตรฐาน'
  },
  {
    id: 'alu-door-slide-4',
    categoryType: 'door',
    name: 'ประตูบานเลื่อน 4 บาน เลื่อนเปิดกลาง (Sliding Door 4-Panel)',
    typeTh: 'บานเลื่อน 4 บาน (เปิดตรงกลาง)',
    frameColor: 'black',
    glassType: 'clear_green',
    dimensions: '3.20 x 2.05 ม.',
    defaultMaterialPrice: 13500,
    defaultLaborPrice: 1800,
    unit: 'ชุด',
    description: 'เหมาะสำหรับหน้าบ้านหรือระเบียงใหญ่ กรอบหนา 1.5 มม. ล้อรางคู่ แข็งแรงทนทาน'
  },
  {
    id: 'alu-door-swing-single',
    categoryType: 'door',
    name: 'ประตูบานเปิดเดี่ยว อลูมิเนียมกระจก (Swing Door)',
    typeTh: 'บานเปิดเดี่ยว (Swing)',
    frameColor: 'black',
    glassType: 'clear_green',
    dimensions: '0.90 x 2.05 ม.',
    defaultMaterialPrice: 4200,
    defaultLaborPrice: 700,
    unit: 'ชุด',
    description: 'บานสวิงหรือบานเปิด สำหรับทางออกหลังบ้านหรือห้องทำงาน มือจับก้านโยก'
  },
  {
    id: 'alu-door-folding',
    categoryType: 'door',
    name: 'ประตูบานเฟี้ยม อลูมิเนียม 4 บาน (Folding Door)',
    typeTh: 'บานเฟี้ยมพับเก็บ (4 บาน)',
    frameColor: 'black',
    glassType: 'clear_green',
    dimensions: '3.00 x 2.40 ม.',
    defaultMaterialPrice: 24000,
    defaultLaborPrice: 3200,
    unit: 'ชุด',
    description: 'พับเก็บเปิดโล่งเชื่อมพื้นที่สวน รางแขวนบนนุ่มนวล ซีลยางกันเสียงรอบบาน'
  },
  {
    id: 'alu-door-bath-louver',
    categoryType: 'door',
    name: 'ประตูห้องน้ำ อลูมิเนียมบานเกล็ดระบายอากาศ + แผ่นคอมโพสิต',
    typeTh: 'บานเปิดห้องน้ำ (กันน้ำ 100%)',
    frameColor: 'white',
    glassType: 'clear',
    dimensions: '0.70 x 2.00 ม.',
    defaultMaterialPrice: 2800,
    defaultLaborPrice: 550,
    unit: 'ชุด',
    description: 'ไม่ผุกร่อน ไม่บวมน้ำ ระบายอากาศดี มีเกล็ดระบายความชื้นด้านล่าง'
  },
  {
    id: 'alu-win-slide-2',
    categoryType: 'window',
    name: 'หน้าต่างบานเลื่อนสลับ 2 บาน (Sliding Window)',
    typeTh: 'บานเลื่อนสลับ (2 บาน)',
    frameColor: 'black',
    glassType: 'clear_green',
    dimensions: '1.20 x 1.10 ม.',
    defaultMaterialPrice: 2800,
    defaultLaborPrice: 450,
    unit: 'ชุด',
    description: 'ขนาดมาตรฐานห้องนอน/ห้องนั่งเล่น พร้อมมุ้งลวดกันยุงไฟเบอร์กลาส'
  },
  {
    id: 'alu-win-slide-4',
    categoryType: 'window',
    name: 'หน้าต่างบานเลื่อน 4 บาน เปิดกลาง (Sliding Window 4-Panel)',
    typeTh: 'บานเลื่อน 4 บาน',
    frameColor: 'black',
    glassType: 'clear_green',
    dimensions: '2.40 x 1.10 ม.',
    defaultMaterialPrice: 5600,
    defaultLaborPrice: 850,
    unit: 'ชุด',
    description: 'หน้าต่างแผงกว้างรับแสง ห้องโถงรับแขก พร้อมรางมุ้งลวดคู่'
  },
  {
    id: 'alu-win-awning',
    categoryType: 'window',
    name: 'หน้าต่างบานกระทุ้งเดี่ยว (Awning Window)',
    typeTh: 'บานกระทุ้ง',
    frameColor: 'black',
    glassType: 'clear_green',
    dimensions: '0.60 x 1.10 ม.',
    defaultMaterialPrice: 2100,
    defaultLaborPrice: 400,
    unit: 'ชุด',
    description: 'มือจับก้านหมุน/ก้านกระทุ้ง สแตนเลส เปิดรับลมแม้เวลาฝนตก ซีลยาง EPDM กันน้ำซึม'
  },
  {
    id: 'alu-win-bath-vent',
    categoryType: 'window',
    name: 'หน้าต่างบานกระทุ้งห้องน้ำ ระบายอากาศ (Bathroom Vent Window)',
    typeTh: 'บานกระทุ้งห้องน้ำ',
    frameColor: 'white',
    glassType: 'clear',
    dimensions: '0.60 x 0.40 ม.',
    defaultMaterialPrice: 1450,
    defaultLaborPrice: 350,
    unit: 'ชุด',
    description: 'กระจกฝ้าบังสายตา หนา 5 มม. เหมาะกับห้องน้ำระบายกลิ่นและไอน้ำ'
  },
  {
    id: 'alu-win-casement',
    categoryType: 'window',
    name: 'หน้าต่างบานเปิดข้างคู่ สไตล์ยุโรป (Casement Window)',
    typeTh: 'บานเปิดข้าง (Casement)',
    frameColor: 'black',
    glassType: 'clear_green',
    dimensions: '1.20 x 1.20 ม.',
    defaultMaterialPrice: 3600,
    defaultLaborPrice: 600,
    unit: 'ชุด',
    description: 'บานพับวิสโก้สแตนเลส รับลมได้ 100% เต็มช่อง ปิดแน่นสนิทกันเสียงรบกวน'
  },
  {
    id: 'alu-win-fixed',
    categoryType: 'window',
    name: 'หน้าต่างช่องแสงติดตาย (Fixed Picture Window)',
    typeTh: 'บานติดตาย (Fix)',
    frameColor: 'black',
    glassType: 'clear_green',
    dimensions: '1.80 x 0.60 ม.',
    defaultMaterialPrice: 2200,
    defaultLaborPrice: 400,
    unit: 'ชุด',
    description: 'ช่องแสงหัวเตียง บันได หรือโถงทางเดิน เสริมความสว่างให้ตัวบ้าน'
  }
];

// 🧱 แคตตาล็อกงานกระเบื้อง
export const TILE_CATALOG: TileItemPreset[] = [
  {
    id: 'tile-bath-floor-30',
    zoneType: 'bath_floor',
    name: 'กระเบื้องปูพื้นห้องน้ำ ผิวหยาบกันลื่น R10 (30x30 ซม.)',
    sizeTh: '30 x 30 ซม. (12" x 12")',
    surfaceFinish: 'matte_antislip',
    defaultMaterialPrice: 280,
    defaultLaborPrice: 220,
    wastePercent: 10,
    description: 'ผิวหน้าหยาบด้าน ป้องกันอุบัติเหตุลื่นล้ม ดูดซึมน้ำต่ำ ตัดเศษเข้ารูป Floor Drain ง่าย'
  },
  {
    id: 'tile-bath-floor-40',
    zoneType: 'bath_floor',
    name: 'กระเบื้องพอร์ซเลนปูพื้นห้องน้ำ โมเดิร์น (40x40 ซม.) ลายหินแกรนิตด้าน',
    sizeTh: '40 x 40 ซม. (16" x 16")',
    surfaceFinish: 'matte_antislip',
    defaultMaterialPrice: 350,
    defaultLaborPrice: 240,
    wastePercent: 8,
    description: 'เนื้อพอร์ซเลนแกร่ง ทนคราบสบู่และน้ำยาเคมี ยาแนวกันเชื้อรา'
  },
  {
    id: 'tile-bath-floor-60',
    zoneType: 'bath_floor',
    name: 'กระเบื้องแกรนิตโต้ผิวด้าน R11 พื้นห้องน้ำโซนเปียก/แห้ง (60x60 ซม.)',
    sizeTh: '60 x 60 ซม. (24" x 24")',
    surfaceFinish: 'matte_antislip',
    defaultMaterialPrice: 420,
    defaultLaborPrice: 260,
    wastePercent: 10,
    description: 'แผ่นใหญ่ไร้รอยต่อ หรูหรา สไตล์รีสอร์ต ไล่สโลปน้ำอย่างประณีต'
  },
  {
    id: 'tile-bath-wall-3060-gloss',
    zoneType: 'bath_wall',
    name: 'กระเบื้องบุผนังห้องน้ำ ผิวมันเงา เช็ดล้างง่าย (30x60 ซม.) ลายหินอ่อน',
    sizeTh: '30 x 60 ซม. (12" x 24")',
    surfaceFinish: 'glossy',
    defaultMaterialPrice: 340,
    defaultLaborPrice: 240,
    wastePercent: 8,
    description: 'ผิวมันเงา สะท้อนแสงทำให้ห้องน้ำดูกว้าง ไม่อมคราบไขมันสบู่ เช็ดทำความสะอาดง่าย'
  },
  {
    id: 'tile-bath-wall-subway',
    zoneType: 'bath_wall',
    name: 'กระเบื้องซับเวย์ผนังห้องน้ำ (Subway Tile 10x20 หรือ 10x30 ซม.) สไตล์มินิมอล/คาเฟ่',
    sizeTh: '10 x 20 ซม. หรือ 10 x 30 ซม.',
    surfaceFinish: 'glossy',
    defaultMaterialPrice: 480,
    defaultLaborPrice: 280,
    wastePercent: 12,
    description: 'ปูลายก่ออิฐสลับ ขอบมน ตัดขอบเนียน นิยมตกแต่งผนังส่วนเคาน์เตอร์อ่างล้างหน้าและโซนฝักบัว'
  },
  {
    id: 'tile-bath-wall-porcelain-60',
    zoneType: 'bath_wall',
    name: 'กระเบื้องพอร์ซเลนผนังห้องน้ำ แผ่นใหญ่จรดฝ้า (60x60 ซม. / 60x120 ซม.)',
    sizeTh: '60 x 60 ซม. หรือ 60 x 120 ซม.',
    surfaceFinish: 'semi_polished',
    defaultMaterialPrice: 520,
    defaultLaborPrice: 280,
    wastePercent: 10,
    description: 'กรุผนังสูงจรดฝ้าเพดาน รอยต่อยาแนวน้อย ไม่สะสมเชื้อรา สไตล์คอนโดลักชูรี'
  },
  {
    id: 'tile-floor-granito-60',
    zoneType: 'general_floor',
    name: 'กระเบื้องแกรนิตโต้ปูพื้นห้องโถง/ห้องนอน ผิวกึ่งเงา Nano (60x60 ซม.) เกรด A',
    sizeTh: '60 x 60 ซม. (24" x 24")',
    surfaceFinish: 'semi_polished',
    defaultMaterialPrice: 360,
    defaultLaborPrice: 180,
    wastePercent: 7,
    description: 'เนื้อเดียวกันทั้งแผ่น ทนรอยขีดข่วน เคลือบนาโนทำความสะอาดง่าย'
  },
  {
    id: 'tile-floor-wood-plank',
    zoneType: 'general_floor',
    name: 'กระเบื้องลายไม้ตัดขอบ ปูพื้นห้องนอน (15x60 หรือ 20x100 ซม.)',
    sizeTh: '15 x 60 ซม. หรือ 20 x 100 ซม.',
    surfaceFinish: 'matte_antislip',
    defaultMaterialPrice: 420,
    defaultLaborPrice: 220,
    wastePercent: 10,
    description: 'ลายเสี้ยนไม้ธรรมชาติ อบอุ่น ทนปลวก ไม่บวมน้ำเหมือนไม้ลามิเนต'
  },
  {
    id: 'tile-porch-exterior-40',
    zoneType: 'exterior_porch',
    name: 'กระเบื้องปูพื้นระเบียง เฉลียง ลานซักล้าง ภายนอก (40x40 ซม.) ลายหินธรรมชาติ',
    sizeTh: '40 x 40 ซม.',
    surfaceFinish: 'stone_texture',
    defaultMaterialPrice: 290,
    defaultLaborPrice: 190,
    wastePercent: 8,
    description: 'ทนแดด ทนฝน ผิวสัมผัสเนื้อทรายด้าน ไม่ลื่นเมื่อโดนน้ำฝน'
  }
];

export const DEFAULT_STANDARD_BOQ: BOQItem[] = [
  // 1. Preparation & Foundation
  {
    id: 'prep-1',
    category: 'preparation',
    name: 'ปรับระดับดิน เคลียร์พื้นที่หน้างาน',
    spec: 'พร้อมวางผัง ขุดหลุมฐานราก',
    quantity: 120,
    unit: 'ตร.ม.',
    materialUnitPrice: 0,
    laborUnitPrice: 45,
    wastePercent: 0,
    basePerSqm: 1.0,
  },
  {
    id: 'prep-2',
    category: 'preparation',
    name: 'เสาเข็มไอ 0.22 x 0.22 ม. ลึก 18-20 ม.',
    spec: 'ตอกด้วยปั้นจั่น พร้อมปอกหัวเข็ม (ระยะช่วงเสา 3.5-4 ม.)',
    quantity: 16,
    unit: 'ต้น',
    materialUnitPrice: 4800,
    laborUnitPrice: 1200,
    wastePercent: 5,
    basePerSqm: 16 / 120,
  },
  {
    id: 'prep-3',
    category: 'preparation',
    name: 'ทรายหยาบ + ลีนคอนกรีตรองก้นหลุม',
    spec: 'หนา 0.10 ม. รองฐานราก',
    quantity: 5.5,
    unit: 'ลบ.ม.',
    materialUnitPrice: 1850,
    laborUnitPrice: 280,
    wastePercent: 5,
    basePerSqm: 5.5 / 120,
  },
  // 2. Concrete Structure
  {
    id: 'str-1',
    category: 'structure',
    name: 'คอนกรีตผสมเสร็จ 240 ksc (ทรงลูกบาศก์)',
    spec: 'สำหรับฐานราก เสา คาน และพื้น คสล.',
    quantity: 38,
    unit: 'ลบ.ม.',
    materialUnitPrice: 2150,
    laborUnitPrice: 450,
    wastePercent: 5,
    basePerSqm: 38 / 120,
  },
  {
    id: 'str-2',
    category: 'structure',
    name: 'เหล็กเส้นกลม RB9 (SR24) & เหล็กข้ออ้อย DB12/DB16 (SD40)',
    spec: 'มาตรฐาน มอก. พร้อมลวดผูกเหล็ก',
    quantity: 3400,
    unit: 'กก.',
    materialUnitPrice: 28,
    laborUnitPrice: 6.5,
    wastePercent: 10,
    basePerSqm: 3400 / 120,
  },
  {
    id: 'str-3',
    category: 'structure',
    name: 'ไม้แบบหล่อคอนกรีต + ค้ำยัน',
    spec: 'ไม้แบบและไม้ยูคาลิปตัส (คิดหักใช้งานซ้ำ 3-4 ครั้ง)',
    quantity: 185,
    unit: 'ตร.ม.',
    materialUnitPrice: 290,
    laborUnitPrice: 130,
    wastePercent: 8,
    basePerSqm: 185 / 120,
  },
  {
    id: 'str-4',
    category: 'structure',
    name: 'แผ่นพื้นสำเร็จรูปท้องเรียบ (Hollow Core / Plank)',
    spec: 'หนา 0.05 ม. พร้อมเททับหน้า (Topping) 5 ซม. เหล็กไวร์เมช',
    quantity: 95,
    unit: 'ตร.ม.',
    materialUnitPrice: 380,
    laborUnitPrice: 110,
    wastePercent: 5,
    basePerSqm: 95 / 120,
  },
  // 3. Roof System
  {
    id: 'roof-1',
    category: 'roof',
    name: 'โครงสร้างเหล็กรูปพรรณหลังคา (เหล็กซี C100, เหล็กกล่อง 100x50, แปโอเมก้า)',
    spec: 'เหล็ก มอก. ยาว 6.0ม. รวม 73 ท่อน: เหล็กซี C100x50x20x3.2มม. 41 ท่อน (จันทัน/อะเส) + เหล็กกล่อง 100x50x3.2มม. 14 ท่อน (อกไก่/ขื่อ/ดั้ง) + แปโอเมก้ากัลวาไนซ์ 28 ท่อน ทาสีกันสนิม 2 เที่ยว',
    quantity: 1650,
    unit: 'กก.',
    materialUnitPrice: 34,
    laborUnitPrice: 15,
    wastePercent: 8,
    basePerSqm: 1650 / 120,
  },
  {
    id: 'roof-2',
    category: 'roof',
    name: 'แผ่นเมทัลชีท หนา 0.35 มม. เคลือบสี พร้อมฉนวน PU หนา 1 นิ้ว',
    spec: 'พร้อมครอบจั่ว แฟลชชิ่ง สกรูยึดมาตรฐาน (เผื่อชายคายื่น 1.0 ม.)',
    quantity: 145,
    unit: 'ตร.ม.',
    materialUnitPrice: 360,
    laborUnitPrice: 95,
    wastePercent: 5,
    basePerSqm: 145 / 120,
  },
  {
    id: 'roof-3',
    category: 'roof',
    name: 'เชิงชายสำเร็จรูป ไฟเบอร์ซีเมนต์ 8 นิ้ว + 6 นิ้ว',
    spec: 'ทาสีน้ำอะคริลิกสำหรับไฟเบอร์ซีเมนต์',
    quantity: 48,
    unit: 'ม.',
    materialUnitPrice: 120,
    laborUnitPrice: 85,
    wastePercent: 5,
    basePerSqm: 48 / 120,
  },
  // 4. Masonry & Wall
  {
    id: 'wall-1',
    category: 'masonry_wall',
    name: 'ผนังก่ออิฐมวลเบา หนา 7.5 ซม. (หรือเลือกสลับอิฐมอญ/อิฐบล็อก)',
    spec: 'ก่อด้วยปูนกาวมวลเบา เหล็กหนวดกุ้งยึดเสาทุก 40 ซม. พร้อมเผื่อเศษ 7%',
    quantity: 210,
    unit: 'ตร.ม.',
    materialUnitPrice: 220,
    laborUnitPrice: 95,
    wastePercent: 7,
    basePerSqm: 210 / 120,
  },
  {
    id: 'wall-lintel',
    category: 'masonry_wall',
    name: 'งานเสาเอ็นและคานทับหลัง คสล. (รอบวงกบประตู-หน้าต่าง & ผนังแผงยาว)',
    spec: 'คอนกรีต 240 ksc หนา 0.10x0.10 ม. เสริมเหล็ก RB9/DB12 2 เส้น ปลอก RB6 @0.20 ม.',
    quantity: 110,
    unit: 'ม.',
    materialUnitPrice: 115,
    laborUnitPrice: 90,
    wastePercent: 5,
    basePerSqm: 110 / 120,
  },
  {
    id: 'wall-2',
    category: 'masonry_wall',
    name: 'ปูนฉาบผิวผนัง 2 ด้าน (ภายใน-ภายนอก)',
    spec: 'ปูนฉาบละเอียดสำเร็จรูป หนา 1.5 ซม. ดักตาข่ายไฟเบอร์มุมวงกบ',
    quantity: 420,
    unit: 'ตร.ม.',
    materialUnitPrice: 90,
    laborUnitPrice: 95,
    wastePercent: 5,
    basePerSqm: 420 / 120,
  },
  // 5. Doors & Windows
  {
    id: 'dw-room-bedroom-80',
    category: 'doors_windows',
    name: 'ชุดประตูห้องนอน HDF / UPVC ขนาด 80 x 200 ซม.',
    spec: 'รวมวงกบไม้สังเคราะห์ WPC บานพับสแตนเลส 3 ตัว ลูกบิดกุญแจครบชุด',
    quantity: 3,
    unit: 'ชุด',
    materialUnitPrice: 2450,
    laborUnitPrice: 600,
    wastePercent: 0,
    basePerSqm: 3 / 120,
    itemSubtype: 'door-hdf-80'
  },
  {
    id: 'dw-room-bath-70',
    category: 'doors_windows',
    name: 'ชุดประตูห้องน้ำ UPVC / PVC กันน้ำ 100% ขนาด 70 x 200 ซม.',
    spec: 'บานเกล็ดระบายอากาศล่าง รวมวงกบ บานพับสแตนเลส ลูกบิดห้องน้ำ',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 1950,
    laborUnitPrice: 550,
    wastePercent: 0,
    basePerSqm: 2 / 120,
    itemSubtype: 'door-upvc-70'
  },
  {
    id: 'dw-room-main-90',
    category: 'doors_windows',
    name: 'ชุดประตูห้องนอนใหญ่ / ทางเข้าหลัก ขนาดกว้างพิเศษ 90 x 200 ซม.',
    spec: 'บาน WPC / ไม้จริง พร้อมวงกบ บานพับลูกปืน 3 ตัว ชุดล็อคก้านโยก',
    quantity: 1,
    unit: 'ชุด',
    materialUnitPrice: 4200,
    laborUnitPrice: 750,
    wastePercent: 0,
    basePerSqm: 1 / 120,
    itemSubtype: 'door-wpc-90'
  },
  {
    id: 'dw-alu-1',
    category: 'doors_windows',
    name: 'ชุดประตูบานเลื่อน อลูมิเนียมดำ หนา 1.2-1.5 มม. กระจกเขียวตัดแสง 6 มม.',
    spec: 'ขนาด 2.00 x 2.05 ม. พร้อมอุปกรณ์ล็อค มือจับฝัง',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 6800,
    laborUnitPrice: 900,
    wastePercent: 0,
    basePerSqm: 2 / 120,
    itemSubtype: 'alu-door-slide-2'
  },
  {
    id: 'dw-alu-2',
    category: 'doors_windows',
    name: 'ชุดหน้าต่างบานเลื่อนสลับ อลูมิเนียมดำ กระจกเขียวตัดแสง 6 มม.',
    spec: 'ขนาดมาตรฐาน 1.20 x 1.10 ม. รวมมุ้งลวดไฟเบอร์',
    quantity: 6,
    unit: 'ชุด',
    materialUnitPrice: 2800,
    laborUnitPrice: 450,
    wastePercent: 0,
    basePerSqm: 6 / 120,
    itemSubtype: 'alu-win-slide-2'
  },
  {
    id: 'dw-alu-3',
    category: 'doors_windows',
    name: 'ชุดหน้าต่างบานกระทุ้งห้องน้ำ กระจกฝ้า 5 มม.',
    spec: 'ขนาด 0.60 x 0.40 ม. พร้อมแขนค้ำสแตนเลส',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 1450,
    laborUnitPrice: 350,
    wastePercent: 0,
    basePerSqm: 2 / 120,
    itemSubtype: 'alu-win-bath-vent'
  },
  // 6. Finishes
  {
    id: 'fin-1',
    category: 'finishes',
    name: 'ฝ้าเพดานยิปซัมบอร์ด ฉาบเรียบ หนา 9 มม. โครงคร่าว C-Line',
    spec: 'รวมฝ้ากันชื้นในห้องน้ำ และฝ้าชายคาระบายอากาศภายนอก',
    quantity: 120,
    unit: 'ตร.ม.',
    materialUnitPrice: 185,
    laborUnitPrice: 95,
    wastePercent: 5,
    basePerSqm: 1.0,
  },
  {
    id: 'fin-tile-bath-floor',
    category: 'finishes',
    name: 'กระเบื้องปูพื้นห้องน้ำ ผิวหยาบกันลื่น R10 (30x30 ซม.)',
    spec: 'รวมปูนทราย ปูนกาวซีเมนต์ และยาแนวกันเชื้อรา (2 ห้องน้ำ)',
    quantity: 9,
    unit: 'ตร.ม.',
    materialUnitPrice: 280,
    laborUnitPrice: 220,
    wastePercent: 10,
    basePerSqm: 9 / 120,
    itemSubtype: 'tile-bath-floor-30'
  },
  {
    id: 'fin-tile-bath-wall',
    category: 'finishes',
    name: 'กระเบื้องบุผนังห้องน้ำ ผิวมันเงา เช็ดล้างง่าย (30x60 ซม.)',
    spec: 'ปูสูงจรดฝ้า 2.60 ม. รวมปูนกาว ยาแนว และคิ้วมุมพีวีซี/อลูมิเนียม',
    quantity: 36,
    unit: 'ตร.ม.',
    materialUnitPrice: 340,
    laborUnitPrice: 240,
    wastePercent: 8,
    basePerSqm: 36 / 120,
    itemSubtype: 'tile-bath-wall-3060-gloss'
  },
  {
    id: 'fin-tile-main-floor',
    category: 'finishes',
    name: 'กระเบื้องปูพื้นแกรนิตโต้ 60x60 ซม. (ห้องโถง ทางเดิน ห้องนอน)',
    spec: 'เกรด A ปูชิด ปรับระดับสม่ำเสมอ พร้อมปูนกาว ยาแนว',
    quantity: 85,
    unit: 'ตร.ม.',
    materialUnitPrice: 360,
    laborUnitPrice: 180,
    wastePercent: 8,
    basePerSqm: 85 / 120,
    itemSubtype: 'tile-floor-granito-60'
  },
  {
    id: 'fin-paint',
    category: 'finishes',
    name: 'งานทาสีอาคาร (รองพื้นปูนใหม่ 1 เที่ยว + สีจริงกึ่งเงา 2 เที่ยว)',
    spec: 'เกรดมาตรฐาน มอก. ทั้งภายในและภายนอก',
    quantity: 540,
    unit: 'ตร.ม.',
    materialUnitPrice: 65,
    laborUnitPrice: 55,
    wastePercent: 5,
    basePerSqm: 540 / 120,
  },
  // 7. Decorations
  {
    id: 'dec-1',
    category: 'decorations',
    name: 'บัวเชิงผนัง PVC / WPC กันเปื้อนภายใน สูง 4 นิ้ว (10 ซม.) หนา 12-15 มม.',
    spec: 'บัวโพลีเมอร์ WPC ลายไม้/ขาว ยึดด้วยกาวตะปู ยิงแด๊ปอะคริลิกขอบบนเรียบร้อย (ห้องโถง-ห้องนอน)',
    quantity: 70,
    unit: 'ม.',
    materialUnitPrice: 135,
    laborUnitPrice: 55,
    wastePercent: 8,
    basePerSqm: 70 / 120,
    itemSubtype: 'dec-skirt-pvc-4in'
  },
  {
    id: 'dec-2',
    category: 'decorations',
    name: 'บัวปูนปั้น คสล. กรอบหน้าต่างภายนอก ป้องกันน้ำไหลย้อน (บัวดักน้ำบน-ล่าง-ข้าง)',
    spec: 'ปูนทรายผสมน้ำยากันซึม กว้าง 10 ซม. หนา 5 ซม. เซาะร่องหยดน้ำ Drip Line ป้องกันคราบน้ำฝน',
    quantity: 36,
    unit: 'ม.',
    materialUnitPrice: 140,
    laborUnitPrice: 110,
    wastePercent: 5,
    basePerSqm: 36 / 120,
    itemSubtype: 'dec-mold-conc-sill'
  },
  {
    id: 'dec-3',
    category: 'decorations',
    name: 'งานกรุผนังหินกาบธรรมชาติ (Slate Stone Wall) สีดำ/เทา/สนิม ผิวหน้าธรรมชาติ',
    spec: 'หินกาบแท้ตัดขอบ ปูด้วยปูนกาวซีเมนต์หินธรรมชาติ เคลือบน้ำยากันตะไคร่น้ำ (เสาโชว์/แผงหน้าบ้าน)',
    quantity: 15,
    unit: 'ตร.ม.',
    materialUnitPrice: 680,
    laborUnitPrice: 380,
    wastePercent: 12,
    basePerSqm: 15 / 120,
    itemSubtype: 'dec-stone-slate-natural'
  },
  {
    id: 'dec-4',
    category: 'decorations',
    name: 'ผนังกรุระแนงไม้เทียม WPC Fluted Wall Panel ลอนเหลี่ยมโมเดิร์น',
    spec: 'แผ่นระแนง WPC ลอนร่วมสมัย ยึดคลิปล็อคสแตนเลส (ตกแต่ง Accent Wall โถงรับแขก/หัวเตียง)',
    quantity: 18,
    unit: 'ตร.ม.',
    materialUnitPrice: 580,
    laborUnitPrice: 260,
    wastePercent: 8,
    basePerSqm: 18 / 120,
    itemSubtype: 'dec-clad-wpc-fluted'
  },
  // 8. Sanitary & Plumbing
  {
    id: 'san-1',
    category: 'sanitary',
    name: 'ท่อประปา PPR & ท่อน้ำทิ้ง-สิ่งปฏิกูล PVC ตราช้าง ชั้น 8.5/13.5',
    spec: 'รวมข้อต่อ บอลวาล์ว กิ๊บรัด และทดสอบแรงดันน้ำ',
    quantity: 1,
    unit: 'งานเหมา',
    materialUnitPrice: 28500,
    laborUnitPrice: 16500,
    wastePercent: 0,
    basePerSqm: 1 / 120,
  },
  {
    id: 'san-toilet-std',
    category: 'sanitary',
    name: 'โถสุขภัณฑ์ชักโครก 2 ชิ้น ประหยัดน้ำ 3/4.5 ลิตร (COTTO/American Standard)',
    spec: 'ระบบ Dual Flush ฝาเปิด-ปิด Soft Close พร้อมอุปกรณ์ครบชุดและ Wax Ring',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 3450,
    laborUnitPrice: 750,
    wastePercent: 0,
    basePerSqm: 2 / 120,
    itemSubtype: 'fix-toilet-two-piece-std'
  },
  {
    id: 'san-bidet-spray',
    category: 'sanitary',
    name: 'ชุดสายฉีดชำระสแตนเลส 304 แท้ พร้อมสายถักและมินิวาล์วเปิด-ปิด',
    spec: 'สแตนเลส SUS304 ไม่เป็นสนิม สายยาว 1.20 ม. ทนแรงดันน้ำสูง',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 480,
    laborUnitPrice: 150,
    wastePercent: 0,
    basePerSqm: 2 / 120,
    itemSubtype: 'fix-bidet-spray-sus304'
  },
  {
    id: 'san-basin-counter',
    category: 'sanitary',
    name: 'อ่างล้างหน้าเซรามิกพร้อมก๊อกผสมน้ำและสะดืออ่าง Pop-up ดักกลิ่น P-Trap',
    spec: 'อ่างวางเคาน์เตอร์ ก๊อกเดี่ยวก้านโยกทองเหลืองชุบโครเมียม ท่อน้ำทิ้งทองเหลือง',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 3200,
    laborUnitPrice: 650,
    wastePercent: 0,
    basePerSqm: 2 / 120,
    itemSubtype: 'fix-basin-counter-top'
  },
  {
    id: 'san-rain-shower',
    category: 'sanitary',
    name: 'ชุดฝักบัวเรนชาวเวอร์ (Rain Shower Set) พร้อมฝักบัวสายอ่อน 3 ระดับ',
    spec: 'ก้านสแตนเลส หัวเรนชาวเวอร์ 8 นิ้ว วาล์วปรับทิศทางน้ำ มอก.',
    quantity: 2,
    unit: 'ชุด',
    materialUnitPrice: 4200,
    laborUnitPrice: 750,
    wastePercent: 0,
    basePerSqm: 2 / 120,
    itemSubtype: 'fix-rain-shower-set'
  },
  {
    id: 'san-accessories-set',
    category: 'sanitary',
    name: 'ชุดอุปกรณ์ห้องน้ำสแตนเลส (กระจกเงา, ราวแขวนผ้า, ที่ใส่กระดาษ, Floor Drain กันกลิ่น)',
    spec: 'สแตนเลส 304 แท้ กระจกเงาหนา 5 มม. ตะแกรงกันกลิ่น 2 ชั้น',
    quantity: 2,
    unit: 'ห้อง',
    materialUnitPrice: 2450,
    laborUnitPrice: 650,
    wastePercent: 0,
    basePerSqm: 2 / 120,
    itemSubtype: 'fix-acc-hardware-set-6pcs'
  },
  {
    id: 'san-septic-tank',
    category: 'sanitary',
    name: 'ถังบำบัดน้ำเสียสำเร็จรูป ขนาด 1,000-1,600 ลิตร พร้อมถังดักไขมัน',
    spec: 'รวมฝัง ขุดดิน เทคอนกรีตรองก้นถัง',
    quantity: 1,
    unit: 'ชุด',
    materialUnitPrice: 7200,
    laborUnitPrice: 2800,
    wastePercent: 0,
    basePerSqm: 1 / 120,
  },
  // 9. Electrical
  {
    id: 'elec-1',
    category: 'electrical',
    name: 'ตู้คอนซูเมอร์ยูนิต 10-12 ช่อง เมนเบรกเกอร์ 50A/63A พร้อมตัวตัดไฟดูด RCBO',
    spec: 'เบรกเกอร์ย่อย 10A, 16A, 20A, 32A + แท่งหลักดินทองแดง 5/8" x 2.40 ม. ตอกลงดิน R < 5 โอห์ม',
    quantity: 1,
    unit: 'ชุด',
    materialUnitPrice: 7200,
    laborUnitPrice: 2800,
    wastePercent: 0,
    basePerSqm: 1 / 120,
  },
  {
    id: 'elec-wire-15',
    category: 'electrical',
    name: 'สายไฟทองแดง THW 1.5 sq.mm. วงจรแสงสว่างและสวิตช์ไฟ (มาตรฐาน วสท.)',
    spec: 'สายแกนเดี่ยวฉนวน PVC มอก. 11-2553 ร้อยท่อร้อยสาย PVC สีขาวบนฝ้าเพดาน (เผื่อเลี้ยวหักมุม 10%)',
    quantity: 350,
    unit: 'ม.',
    materialUnitPrice: 8.5,
    laborUnitPrice: 6.5,
    wastePercent: 10,
    basePerSqm: 350 / 120,
  },
  {
    id: 'elec-wire-25',
    category: 'electrical',
    name: 'สายไฟทองแดง THW 2.5 sq.mm. วงจรเต้ารับไฟฟ้า ปลั๊กกราวด์คู่',
    spec: 'สาย L + N ขนาด 2.5 ตร.มม. พร้อมสายดิน G ขนาด 2.5 ตร.มม. ร้อยท่อฝังผนังและบนฝ้า',
    quantity: 480,
    unit: 'ม.',
    materialUnitPrice: 13.5,
    laborUnitPrice: 7.5,
    wastePercent: 10,
    basePerSqm: 480 / 120,
  },
  {
    id: 'elec-wire-4-6',
    category: 'electrical',
    name: 'สายไฟเฉพาะทาง THW 4 - 6 sq.mm. แอร์ & เครื่องทำน้ำอุ่น (Heavy Load)',
    spec: 'แอร์ห้องนอน/โถง และเครื่องทำน้ำอุ่น 3500-4500W เดินตรงจากตู้เมนผ่าน RCBO',
    quantity: 160,
    unit: 'ม.',
    materialUnitPrice: 24.5,
    laborUnitPrice: 9.5,
    wastePercent: 10,
    basePerSqm: 160 / 120,
  },
  {
    id: 'elec-conduit-pvc',
    category: 'electrical',
    name: 'ท่อร้อยสายไฟ uPVC สีขาว Ø 16-20 มม. (ยาว 2.92 ม./ท่อน) พร้อมกล่องพักสาย',
    spec: 'ท่อโค้งดัดเย็น ไม่ลามไฟ มอก. 216-2524 พร้อมข้อต่อ บ๊อกซ์ลอย คอนเน็กเตอร์ และก้ามปูรัดท่อ',
    quantity: 110,
    unit: 'ท่อน',
    materialUnitPrice: 48,
    laborUnitPrice: 35,
    wastePercent: 5,
    basePerSqm: 110 / 120,
  },
  {
    id: 'elec-fixtures-receptacles',
    category: 'electrical',
    name: 'จุดสวิตช์ ปลั๊กเต้ารับกราวด์คู่ มอก. และหน้ากากพลาสติกแบบโมดูลาร์',
    spec: 'สวิตช์ทางเดียว ปลั๊กกราวด์คู่ ม่านนิรภัย แบรนด์ Panasonic/Schneider พร้อมกล่องฝังผนัง',
    quantity: 42,
    unit: 'จุด',
    materialUnitPrice: 160,
    laborUnitPrice: 120,
    wastePercent: 0,
    basePerSqm: 42 / 120,
  },
  {
    id: 'elec-lighting-led',
    category: 'electrical',
    name: 'โคมไฟดาวน์ไลท์ LED ฝังฝ้า 9W-12W & ไฟกิ่งภายนอกกันน้ำ IP65',
    spec: 'แสง Daylight/Warm White ประหยัดไฟ พร้อมขั้วต่อสายเซฟตี้',
    quantity: 26,
    unit: 'ชุด',
    materialUnitPrice: 240,
    laborUnitPrice: 120,
    wastePercent: 0,
    basePerSqm: 26 / 120,
  },
  // 10. External Works
  {
    id: 'ext-fence-1',
    category: 'external_works',
    name: 'รั้วคอนกรีตบล็อก คสล. ฉาบเรียบทาสี สูง 1.80 ม. (รอบด้านข้าง-หลัง)',
    spec: 'เสา คสล. @ 2.5 ม. คานคอดิน ทับหลัง คสล. ก่อคอนกรีตบล็อก 7 ซม.',
    quantity: 35,
    unit: 'ม.',
    materialUnitPrice: 1450,
    laborUnitPrice: 850,
    wastePercent: 5,
    basePerSqm: 35 / 120,
  },
  {
    id: 'ext-gate-1',
    category: 'external_works',
    name: 'ประตูรั้วบานเลื่อนเหล็กกล่องกัลวาไนซ์ + ระแนงไม้เทียม (กว้าง 4.5 ม.)',
    spec: 'พร้อมรางเพลา ล้อสแตนเลส เสาประคอง และล็อคกุญแจ',
    quantity: 1,
    unit: 'ชุด',
    materialUnitPrice: 24500,
    laborUnitPrice: 4500,
    wastePercent: 0,
    basePerSqm: 1 / 120,
  },
  {
    id: 'ext-carport-slab-1',
    category: 'external_works',
    name: 'พื้น คสล. โรงจอดรถ 2 คัน (30 ตร.ม.) ลงเสาเข็มหกเหลี่ยม 6 ม. ปูพรม',
    spec: 'คอนกรีต 240 ksc หนา 12 ซม. ตะแกรงวายเมช 6 มม. ขัดหยาบกันลื่น',
    quantity: 30,
    unit: 'ตร.ม.',
    materialUnitPrice: 850,
    laborUnitPrice: 450,
    wastePercent: 5,
    basePerSqm: 30 / 120,
  },
  {
    id: 'ext-carport-roof-1',
    category: 'external_works',
    name: 'โครงหลังคาโรงจอดรถ เหล็กกล่องกัลวาไนซ์ + แผ่นเมทัลชีท ฉนวน PU',
    spec: 'เสาเหล็ก 4"x4" แปโอเมก้า แผ่นเมทัลชีท PU หนา 1 นิ้ว พร้อมรางน้ำฝน',
    quantity: 30,
    unit: 'ตร.ม.',
    materialUnitPrice: 950,
    laborUnitPrice: 480,
    wastePercent: 5,
    basePerSqm: 30 / 120,
  },
  {
    id: 'ext-drain-1',
    category: 'external_works',
    name: 'ท่อระบายน้ำ คสล. Ø 0.30 ม. + บ่อพักคอนกรีตสำเร็จรูป ฝา คสล.',
    spec: 'บ่อพักทุกระยะ 6-8 ม. พร้อมต่อท่อน้ำทิ้งระบายออกท่อสาธารณะ',
    quantity: 28,
    unit: 'ม.',
    materialUnitPrice: 620,
    laborUnitPrice: 380,
    wastePercent: 5,
    basePerSqm: 28 / 120,
  },
  {
    id: 'ext-pavement-1',
    category: 'external_works',
    name: 'ทางเดินคอนกรีตรอบบ้าน (กว้าง 1.0 ม.) หนา 8 ซม. วายเมช',
    spec: 'ปรับทรายหยาบ เทคอนกรีต 240 ksc ปาดลายขูดหยาบกันลื่น',
    quantity: 25,
    unit: 'ตร.ม.',
    materialUnitPrice: 320,
    laborUnitPrice: 180,
    wastePercent: 5,
    basePerSqm: 25 / 120,
  },
  {
    id: 'ext-water-tank-base-1',
    category: 'external_works',
    name: 'ฐานราก คสล. วางถังเก็บน้ำและปั๊มน้ำ (เสาเข็มหกเหลี่ยม 4-6 ม.)',
    spec: 'เทคอนกรีตหนา 15 ซม. รับน้ำหนัก 2 ตัน ไม่ทรุดดึงท่อแตก',
    quantity: 1,
    unit: 'จุด',
    materialUnitPrice: 4200,
    laborUnitPrice: 1800,
    wastePercent: 0,
    basePerSqm: 1 / 120,
  },
];
