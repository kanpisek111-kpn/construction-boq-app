export type ConstructionCategory = 
  | 'preparation'    // งานเตรียมการและฐานราก
  | 'structure'      // งานโครงสร้าง คสล.
  | 'roof'           // งานโครงหลังคาและมุงหลังคา
  | 'masonry_wall'   // งานก่ออิฐ ฉาบปูน ผนัง
  | 'doors_windows'  // งานประตู หน้าต่าง
  | 'finishes'       // งานฝ้าเพดาน ปูพื้น ทาสี
  | 'decorations'    // งานตกแต่งภายใน-ภายนอก: บัวพื้น บัวปูนหน้าต่าง หินกาบ ผนังกรุ
  | 'sanitary'       // งานสุขาภิบาลและห้องน้ำ
  | 'electrical'     // งานระบบไฟฟ้าและแสงสว่าง
  | 'external_works'; // งานภายนอก: รั้ว, โรงรถ, ทางเดินรอบบ้าน, ระบายน้ำ, ถังน้ำ-ปั๊ม

export interface BOQItem {
  id: string;
  category: ConstructionCategory;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  materialUnitPrice: number;
  laborUnitPrice: number;
  wastePercent: number; // % เผื่อเศษวัสดุ
  basePerSqm?: number;   // สัดส่วนปริมาณต่อ 1 ตร.ม. สำหรับคำนวณปรับสเกลอัตโนมัติ
  itemSubtype?: string;  // ประเภทย่อย
  milestoneNumber?: number; // ลำดับงวดงานที่ต้องเบิก/ทำ (1, 2, 3...)
}

// 🚽 ชนิดสุขภัณฑ์และอุปกรณ์ในห้องน้ำ
export type SanitaryFixtureType = 
  | 'toilet'             // โถสุขภัณฑ์ ชักโครก
  | 'bidet_spray'       // สายฉีดชำระ
  | 'basin'             // อ่างล้างหน้าและก๊อก
  | 'shower_system'     // ฝักบัว เรนชาวเวอร์ เครื่องทำน้ำอุ่น
  | 'urinal'            // โถปัสสาวะชาย
  | 'bathroom_accessory'// กระจกเงา ราวแขวนผ้า ชั้นวางสบู่ ตะแกรงกันกลิ่น
  | 'shower_enclosure'; // ฉากกั้นอาบน้ำกระจกนิรภัย

export interface SanitaryFixturePreset {
  id: string;
  type: SanitaryFixtureType;
  name: string;
  spec: string;
  unit: string;
  defaultQty: number;
  materialUnitPrice: number;
  laborUnitPrice: number;
  wastePercent: number;
  gradeTier: 'standard' | 'premium' | 'luxury';
  description: string;
  installationTip: string;
}

// 🪜 ข้อมูลการคำนวณบันได คสล. (RC Stair Calculation)
export type StairType = 'straight' | 'dog_leg' | 'u_turn';
export type StairNosingFinish = 'wood_solid' | 'spc_vinyl' | 'granito_tile' | 'polished_concrete';

export interface StairCalcParams {
  stairCount: number;             
  stairType: StairType;           
  totalHeightM: number;           
  widthM: number;                 
  riserHeightCm: number;          
  treadWidthCm: number;           
  landingCount: number;           
  landingLengthM: number;         
  waistThicknessCm: number;       
  includeHandrail: boolean;       
  handrailType: 'steel_wood' | 'stainless_glass' | 'wrought_iron' | 'steel_pipe';
  finishType: StairNosingFinish;  
}

export interface StairCalcResult {
  stepCount: number;              
  actualRiserCm: number;          
  totalRunLengthM: number;        
  concreteVolCuM: number;         
  formworkSqm: number;            
  mainSteelDb12Kg: number;        
  mainSteelDb12Bars: number;      
  tempSteelRb9Kg: number;         
  tempSteelRb9Bars: number;       
  handrailLengthM: number;        
  treadStepPieces: number;        
  estConcreteCost: number;        
  estSteelCost: number;           
  estFormworkCost: number;        
  estFinishCost: number;          
  estHandrailCost: number;        
  estTotalMaterialCost: number;   
  estTotalLaborCost: number;      
}

// 🧱 ข้อมูลการคำนวณงานรั้วรอบบ้าน (Fence Estimator)
export interface FenceCalcParams {
  fenceLengthM: number;           
  fenceHeightM: number;           
  baySpacingM: number;            
  pileType: 'hexagon_6m' | 'i_pile_12m' | 'spread_footing'; 
  fenceWallType: 'solid_block' | 'half_wood_louver' | 'brick_plaster'; 
  includePlasterAndPaint: boolean; 
}

export interface FenceCalcResult {
  postsCount: number;             
  pilesCount: number;             
  footingConcreteCuM: number;     
  beamConcreteCuM: number;        
  rebarKg: number;                
  concreteBlocksCount: number;    
  plasterAreaSqm: number;         
  totalMaterialCost: number;
  totalLaborCost: number;
}

// 🌊 ข้อมูลการคำนวณงานระบบระบายน้ำรอบบ้าน (Drainage Estimator)
export interface DrainageCalcParams {
  pipeLengthM: number;            
  pipeDiameterM: 0.30 | 0.40;     
  manholeSpacingM: number;        
  includeGratingDitch: boolean;   
  gratingDitchLengthM: number;    
}

export interface DrainageCalcResult {
  pipesCount: number;             
  manholesCount: number;          
  excavationSandCuM: number;      
  gratingDitchPieces: number;     
  totalMaterialCost: number;
  totalLaborCost: number;
}

// 🎨 ข้อมูลการคำนวณสีทาอาคารและงานทาสีเหล็ก
export type PaintGrade = 'premium_ultra' | 'medium_standard' | 'economy';
export type PaintSurfaceCondition = 'new_plaster' | 'old_repaint' | 'moist_alkali';
export type SteelPrimerType = 'red_oxide' | 'grey_epoxy' | 'zinc_phosphate';

export interface PaintCalculationResult {
  interiorWallSqm: number;
  exteriorWallSqm: number;
  ceilingSqm: number;
  steelWeightKg: number;
  steelAreaSqm: number;
  primerBuckets5Gal: number;
  interiorTopcoatBuckets5Gal: number;
  exteriorTopcoatBuckets5Gal: number;
  ceilingTopcoatBuckets5Gal: number;
  steelPrimerGallons: number;
  steelTopcoatGallons: number;
  thinnerGallons: number;
  paintMaterialCost: number;
  paintLaborCost: number;
  steelPaintMaterialCost: number;
  steelPaintLaborCost: number;
  totalCost: number;
}

// 🚿 ข้อมูลการคำนวณงานสุขาภิบาล
export interface SanitaryCalcParams {
  bathroomCount: number;
  kitchenCount: number;
  washingYardCount: number;
  pipeTypeWater: 'ppr_green' | 'pvc_blue_8.5' | 'pvc_blue_13.5';
  septicTankLiters: 1000 | 1600 | 2000;
  greaseTrapLiters: 15 | 30 | 50 | 100;
  includeWaterPumpAndTank: boolean;
  waterTankLiters: 1000 | 1500 | 2000;
  waterPumpWatt: 150 | 200 | 250 | 300;
}

export interface SanitaryCalcResult {
  coldWaterPipePipes4m: number;
  wasteWaterPipes4m: number;
  soilPipes4m: number;
  ventPipes4m: number;
  fittingsEstimatePcs: number;
  septicTankQty: number;
  greaseTrapQty: number;
  waterTankQty: number;
  waterPumpQty: number;
  floorDrainPcs: number;
  totalMaterialCost: number;
  totalLaborCost: number;
}

export interface PaymentMilestone {
  id: string;
  milestoneNumber: number;      
  title: string;                
  percentage: number;           
  amountThb?: number;           
  durationDays?: number;        
  startDate?: string;           
  deliverables: string[];       
  inspectionCriteria: string;   
  status?: 'pending' | 'in_progress' | 'approved' | 'paid';
  matchedCategories?: ConstructionCategory[];
}

export interface GanttTask {
  id: string;
  milestoneNumber: number;
  name: string;
  category?: ConstructionCategory;
  startDayOffset: number; 
  durationDays: number;   
  progressPercent: number; 
  dependencies?: string[]; 
  assignedContractor?: string; 
  isCritical?: boolean; 
}

export interface MilestoneTemplate {
  id: string;
  name: string;
  description: string;
  milestonesCount: number;
  milestones: Omit<PaymentMilestone, 'id' | 'amountThb'>[];
}

export type WireType = 'THW' | 'VAF' | 'VAF_G' | 'NYY' | 'VCT';
export type WireCrossSection = '1.5' | '2.5' | '4' | '6' | '10' | '16' | '25' | '35';
export type ElectricalCircuitType = 
  | 'lighting'            
  | 'receptacle'          
  | 'air_con_small'       
  | 'air_con_large'       
  | 'water_heater_3500w'  
  | 'water_heater_4500w'  
  | 'ev_charger'          
  | 'main_feeder';        

export interface ElectricalCircuitConfig {
  id: string;
  circuitType: ElectricalCircuitType;
  name: string;
  pointsCount: number;         
  avgDistanceM: number;        
  wireType: WireType;          
  phaseWiresSize: WireCrossSection; 
  groundWireSize?: WireCrossSection; 
  conduitType: 'pvc_white' | 'pvc_yellow' | 'emt_steel' | 'clip_nail' | 'none'; 
  breakerRatingA: number;
  notes: string;
}

export interface ElectricalCalculationResult {
  wireSummary: {
    wireSize: WireCrossSection;
    wireType: WireType;
    totalLengthM: number;
    wastePercent: number;
    totalOrderM: number;
    coils100m: number;
    estPricePerM: number;
    totalCost: number;
    standardPurpose: string;
  }[];
  conduitSummary: {
    conduitType: string;
    totalLengthM: number;
    conduitPipes3m: number;
    fittingJunctionBoxes: number;
    estCost: number;
  };
  panelSummary: {
    recommendedSlots: number;
    mainBreakerAmp: number;
    rcboCount: number;
    branchBreakers: { amp: number; count: number }[];
    groundRodRequired: boolean;
  };
  totalMaterialCost: number;
  totalLaborCost: number;
}

export type DecorationItemType =
  | 'interior_skirting'
  | 'exterior_molding'
  | 'slate_stone_wall'
  | 'wall_cladding';

export interface DecorationItemPreset {
  id: string;
  type: DecorationItemType;
  name: string;
  spec: string;
  unit: string;
  defaultQty: number;
  materialUnitPrice: number;
  laborUnitPrice: number;
  wastePercent: number;
  description: string;
  recommendation: string;
  installationTip: string;
}

export interface QuotationMeta {
  quotationNumber: string;
  issueDate: string;
  validityDays: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  contractorName: string;
  contractorPhone: string;
  contractorTaxId: string;
  paymentTerms: string;
  warrantyTerms: string;
  notes: string;
  companyLogo?: string;
}

export type ProjectStatus = 'draft' | 'quotation' | 'construction' | 'completed';


export interface ActualExpenseItem {
  id: string;
  date: string; // YYYY-MM-DD
  category: ConstructionCategory;
  expenseType: 'material' | 'labor' | 'subcontractor' | 'equipment' | 'other';
  vendorOrPayee: string; // e.g. "ไทวัสดุ บางบัวทอง", "ทีมช่างสมศักดิ์", "ร้านซีแพค"
  description: string;
  invoiceNumber?: string;
  amount: number;
  linkedMilestoneNumber?: number; // 1, 2, 3...
  receiptImage?: string; // Base64 slip image
  notes?: string;
}

export interface ProjectSaveState {
  id: string;  // unique project id for multi-project support
  version: string;
  savedAt: string;
  projectName: string;
  houseAreaSqm: number;
  overheadPercent: number;
  vatPercent: number;
  items: BOQItem[];
  quotationMeta: QuotationMeta;
  milestones?: PaymentMilestone[];
  projectStartDate?: string;
  customTasks?: GanttTask[];
  status?: ProjectStatus;
  actualExpenses?: ActualExpenseItem[];
  procurementCheckedItems?: Record<string, boolean>;
}

export type ExternalItemType = 
  | 'preliminaries'
  | 'fence'
  | 'carport'
  | 'drainage'
  | 'pavement'
  | 'water_system';

export interface ExternalWorksPreset {
  id: string;
  type: ExternalItemType;
  name: string;
  spec: string;
  unit: string;
  defaultQty: number;
  materialUnitPrice: number;
  laborUnitPrice: number;
  wastePercent: number;
  description: string;
  popularNote: string;
}

export interface SiteMaterialItem {
  id: string;
  materialGroup: 
    | 'cement_concrete'
    | 'steel_rebar'
    | 'masonry_brick'
    | 'roof_finishes'
    | 'tiles_finishes'
    | 'decorations'
    | 'doors_windows'
    | 'mep_fixtures'
    | 'external_civil';
  name: string;
  spec: string;
  netQuantity: number;
  wastePercent: number;
  orderQuantity: number;
  unit: string;
  unitPriceEstimate: number;
  totalEstimatedCost: number;
  priorityPhase: string;
  milestoneNumber: number;
  milestoneTitle: string;
  boqCategory: ConstructionCategory;
  packageNote: string;
}

export interface AluminumItemPreset {
  id: string;
  categoryType: 'door' | 'window';
  name: string;
  typeTh: string;
  frameColor: 'black' | 'white' | 'anodize' | 'wood';
  glassType: 'clear_green' | 'clear' | 'euro_gray' | 'laminated' | 'reflective';
  dimensions: string;
  defaultMaterialPrice: number;
  defaultLaborPrice: number;
  unit: string;
  description: string;
}

export type RoomDoorMaterial = 'hdf' | 'solid_wood' | 'wpc' | 'upvc' | 'pvc';
export type RoomDoorWidth = '70' | '80' | '90';

export interface RoomDoorPreset {
  id: string;
  name: string;
  doorType: 'bedroom' | 'bathroom' | 'main_entry' | 'kitchen_back';
  materialType: RoomDoorMaterial;
  widthCm: RoomDoorWidth;
  dimensions: string;
  defaultMaterialPrice: number;
  defaultLaborPrice: number;
  frameMaterial: string;
  hardwareIncluded: string;
  description: string;
}

export type WallMasonryType = 'aac_block' | 'red_brick' | 'concrete_block';

export interface MasonryCalcParams {
  brickType: WallMasonryType;
  wallAreaSqm: number;
  openingsCount: number;
  avgOpeningWidthM: number;
  wallThicknessCm: number;
  plasterSides: 1 | 2;
}

export interface MasonryCalcResult {
  brickType: WallMasonryType;
  brickCount: number;
  brickUnit: string;
  mortarBags50kg: number;
  plasterBags50kg: number;
  masonrySandCuM: number;
  lintelLengthM: number;
  lintelConcreteCuM: number;
  lintelRebarKg: number;
  lintelRebarBars: number;
  wireMeshOrDowelQty: number;
  estMaterialCost: number;
  estLaborCost: number;
}

export interface TileItemPreset {
  id: string;
  zoneType: 'bath_floor' | 'bath_wall' | 'general_floor' | 'exterior_porch' | 'subway_kitchen';
  name: string;
  sizeTh: string;
  surfaceFinish: 'matte_antislip' | 'glossy' | 'semi_polished' | 'stone_texture';
  defaultMaterialPrice: number;
  defaultLaborPrice: number;
  wastePercent: number;
  description: string;
}

export interface PlanAnalysisResult {
  floorAreaSqm: number;
  footprintWidthM: number;
  footprintLengthM: number;
  estimatedColumnsCount: number;
  estimatedBeamsLengthM: number;
  wallAreaSqm: number;
  roofTypeSuggested: string;
  roofPitchDeg: number;
  detailedNotes: string[];
  detectedRooms?: { name: string; areaSqm: number; dimensions?: string }[];
  detectedGridSpan?: string;
  detectedDoorWindowSchedule?: { mark: string; type: 'door' | 'window'; count: number; spec?: string }[];
  suggestedItems: {
    category: ConstructionCategory;
    name: string;
    spec: string;
    quantity: number;
    unit: string;
    materialUnitPrice: number;
    laborUnitPrice: number;
    basePerSqm?: number;
  }[];
}

export type RoofStyle = 'lean_to' | 'gable' | 'hip' | 'flat_slab';
export type RoofMaterialType = 'metal_sheet' | 'concrete_tile' | 'cpac' | 'shingle';
export type RoofInsulationType = 'none' | 'pu_foam_1in' | 'pe_foam_5mm' | 'stay_cool_75mm' | 'stay_cool_150mm';
export type FasciaType = 
  | 'fiber_cement_double'
  | 'fiber_cement_single'
  | 'flashing_metal'
  | 'natural_wood';
export type BirdStopType =
  | 'roman_tile'
  | 'cpac_wave'
  | 'metal_sheet_eaves'
  | 'custom_mesh'
  | 'none';

export interface RoofCalculationParams {
  style: RoofStyle;
  baseWidthM: number;
  baseLengthM: number;
  overhangM: number;
  pitchDeg: number;
  materialType: RoofMaterialType;
  purlinSpacingM: number;
  includeFascia: boolean;
  fasciaType: FasciaType;
  includeBirdStop: boolean;
  birdStopType: BirdStopType;
  insulationType?: RoofInsulationType;
  rafterSpacingM?: number;
}

export interface RoofCalculationResult {
  effectiveRoofAreaSqm: number;
  c_channel_kg: number;
  c_channel_bars: number;
  box_steel_kg: number;
  box_steel_bars: number;
  purlin_bars: number;
  roofSheetsCount: number;
  ridgeTilesM: number;
  eavesPerimeterM: number;
  fasciaLengthM: number;
  fasciaPieces3m: number;
  birdStopLengthM: number;
  birdStopPieces: number;
  fasciaMaterialCost: number;
  fasciaLaborCost: number;
  birdStopMaterialCost: number;
  birdStopLaborCost: number;
  laborEstimateThb: number;
  materialEstimateThb: number;
  wallPlateBars: number;
  rafterBars: number;
  ridgeBeamBars: number;
  kingPostBars: number;
  valleyGutterM: number;
  valleyGutterCost: number;
  dryRidgeRolls: number;
  dryRidgeCost: number;
  roofScrewsPcs: number;
  roofScrewsCost: number;
  insulationSqm: number;
  insulationMaterialCost: number;
  insulationLaborCost: number;
}

export type SlabSystemType = 'precast_plank' | 'cast_in_place' | 'hybrid';

export interface FootingItem {
  id: string;
  code: string;                  
  name: string;                  
  count: number;                 
  widthM: number;                
  lengthM: number;               
  thicknessM: number;            
  barType: 'DB12' | 'DB16';      
  barSpacingM: number;           
  pilesPerFooting?: number;      
}

export interface BeamItem {
  id: string;
  code: string;                  
  name: string;                  
  totalLengthM: number;          
  widthM: number;                
  depthM: number;                
  mainBarsCount: number;         
  mainBarType: 'DB12' | 'DB16';  
  stirrupSpacingM: number;       
}

export type FoundationPileType = 
  | 'spread_footing'     // ฐานแผ่ (ไม่ตอกเข็ม)
  | 'bored_pile_35'      // เสาเข็มเจาะ Ø 0.35 ม.
  | 'driven_pile_i22'    // เสาเข็มไอ I-22
  | 'driven_pile_i18'    // เสาเข็มไอ I-18
  | 'micro_pile_i20'     // เสาเข็มไมโครไพล์
  | 'hex_pile_6m';       // เสาเข็มหกเหลี่ยมกลวง 6 ม.

export interface StructureCalcParams {
  columnCount: number;
  columnWidthM: number;
  columnDepthM: number;
  columnHeightM: number;
  columnMainBars: number;
  columnMainBarType: 'DB12' | 'DB16';
  columnStirrupSpacingM: number;
  footings?: FootingItem[];
  beams?: BeamItem[];
  footingWidthM?: number;
  footingLengthM?: number;
  footingThicknessM?: number;
  footingBarType?: 'DB12' | 'DB16';
  footingBarSpacingM?: number;
  beamTotalLengthM?: number;
  beamWidthM?: number;
  beamDepthM?: number;
  beamMainBars?: number;
  beamMainBarType?: 'DB12' | 'DB16';
  beamStirrupSpacingM?: number;
  slabType: SlabSystemType;
  totalFloorAreaSqm: number;
  precastAreaSqm: number;
  castInPlaceAreaSqm: number;
  toppingThicknessCm: number;
  castInPlaceThicknessCm: number;
  wireMeshDiameterMm: 4 | 6;
  castInPlaceRebarType: 'RB9' | 'DB12';
    castInPlaceRebarSpacingM: number;
  // งานดินขุดและเสาเข็ม (Earthwork & Foundation)
  pileType?: FoundationPileType;
  pileLengthM?: number;
  pilesPerFooting?: number;
  excavationDepthM?: number;
  sandBeddingThicknessM?: number;
  leanConcreteThicknessM?: number;
};

export interface StructureCalcResult {
  concreteFootingCuM: number;
  concreteColumnCuM: number;
  concreteBeamCuM: number;
  concreteSlabToppingCuM: number;
  concreteSlabCastInPlaceCuM: number;
  concreteSlabTotalCuM: number;
  totalConcreteCuM: number;
  cementBags50kg: number;
  formworkFootingSqm: number;
  formworkColumnSqm: number;
  formworkBeamSqm: number;
  formworkSlabCastInPlaceSqm: number;
  totalFormworkSqm: number;
  db12Kg: number;
  db12Bars: number;
  db16Kg: number;
  db16Bars: number;
  colStirrupPcs: number;
  colStirrupM: number;
  colStirrupKg: number;
  colStirrupBars: number;
  beamStirrupPcs: number;
  beamStirrupM: number;
  beamStirrupKg: number;
  beamStirrupBars: number;
  stirrupKg: number;
  stirrupBars: number;
  precastPlanksCount: number;
  wireMeshAreaSqm: number;
  slabCastRebarKg: number;
  slabCastRebarBars: number;
  tieWireKg: number;
  sandCuM: number;
  rockCuM: number;
  concreteSpacersPcs: number;
  rebarLapAllowanceKg: number;
  estMaterialCost: number;
  estLaborCost: number;
  footingSummaryList?: { code: string; count: number; concreteCuM: number; formworkSqm: number; steelKg: number }[];
  beamSummaryList?: { code: string; lengthM: number; concreteCuM: number; formworkSqm: number; steelKg: number }[];
  // ผลคำนวณงานเสาเข็มและงานดินขุด (Earthwork & Piling)
  totalFootingsCount: number;
  totalPilesCount: number;
  totalPileMeters: number;
  pileMaterialCost: number;
  pileLaborCost: number;
  pileCutOffCost: number;
  excavationCuM: number;
  backfillCuM: number;
  sandBeddingCuM: number;
  leanConcreteCuM: number;
}
