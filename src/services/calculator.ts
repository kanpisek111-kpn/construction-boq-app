import { RoofCalculationParams, RoofCalculationResult, BOQItem, StructureCalcParams, StructureCalcResult, MasonryCalcParams, MasonryCalcResult, SiteMaterialItem, ElectricalCircuitConfig, ElectricalCalculationResult, WireCrossSection, WireType, FootingItem, BeamItem, PaymentMilestone, ConstructionCategory, SanitaryCalcParams, SanitaryCalcResult, StairCalcParams, StairCalcResult, FenceCalcParams, FenceCalcResult, DrainageCalcParams, DrainageCalcResult } from '../types';
import { WIRE_PRICE_STANDARDS } from '../constants';

/**
 * 🧱 ฟังก์ชันคำนวณงานรั้ว คสล. (Fence Quantity Takeoff)
 * คำนวณ เสาเข็ม ฐานราก คานคอดิน เสารั้ว ทับหลัง คอนกรีตบล็อก ฉาบปูนและทาสี
 */
export function calculateFenceMaterials(params: FenceCalcParams): FenceCalcResult {
  const {
    fenceLengthM,
    fenceHeightM = 1.80,
    baySpacingM = 2.50,
    pileType = 'hexagon_6m',
    fenceWallType = 'solid_block',
    includePlasterAndPaint = true
  } = params;

  const baysCount = Math.max(1, Math.ceil(fenceLengthM / baySpacingM));
  const postsCount = baysCount + 1; // เสาหัวท้าย
  const pilesCount = pileType === 'spread_footing' ? 0 : postsCount;

  // ฐานรากรั้ว 0.60 x 0.60 x 0.25 ม.
  const footingVol = postsCount * (0.60 * 0.60 * 0.25);
  // เสารั้ว 0.15 x 0.15 x ความสูงรั้ว
  const postVol = postsCount * (0.15 * 0.15 * (fenceHeightM + 0.50));
  const footingConcreteCuM = Math.round((footingVol + postVol) * 1.05 * 100) / 100;

  // คานคอดินรั้ว 0.15 x 0.30 ม. + ทับหลังรั้ว 0.10 x 0.10 ม.
  const beamVol = fenceLengthM * (0.15 * 0.30);
  const capVol = fenceLengthM * (0.10 * 0.10);
  const beamConcreteCuM = Math.round((beamVol + capVol) * 1.05 * 100) / 100;

  // เหล็กเสริมรั้ว (DB12 เสา+คาน + ปลอก RB6) เฉลี่ย 8-10 กก./เมตร
  const rebarKg = Math.round(fenceLengthM * 9.5);

  // คอนกรีตบล็อก (บล็อกมาตรฐาน 12.5 ก้อน/ตร.ม.)
  const netWallHeight = fenceWallType === 'half_wood_louver' ? 0.80 : Math.max(0.6, fenceHeightM - 0.40);
  const wallAreaSqm = fenceLengthM * netWallHeight;
  const concreteBlocksCount = Math.ceil(wallAreaSqm * 13.0); // เผื่อแตก 4%
  const plasterAreaSqm = includePlasterAndPaint ? Math.round(wallAreaSqm * 2 * 10) / 10 : 0;

  // ประมาณการต้นทุน
  const pilePrice = pileType === 'i_pile_12m' ? 3200 : pileType === 'hexagon_6m' ? 850 : 0;
  const concPrice = (footingConcreteCuM + beamConcreteCuM) * 2150;
  const steelPrice = rebarKg * 28.5;
  const blockPrice = concreteBlocksCount * 7.5;
  const plasterMatPrice = includePlasterAndPaint ? plasterAreaSqm * 45 : 0;
  const louverMatPrice = fenceWallType === 'half_wood_louver' ? fenceLengthM * 1.0 * 550 : 0;

  const totalMaterialCost = Math.round((pilesCount * pilePrice) + concPrice + steelPrice + blockPrice + plasterMatPrice + louverMatPrice);
  const totalLaborCost = Math.round(
    (postsCount * 450) + 
    (fenceLengthM * 450) + 
    (includePlasterAndPaint ? plasterAreaSqm * 90 : 0)
  );

  return {
    postsCount,
    pilesCount,
    footingConcreteCuM,
    beamConcreteCuM,
    rebarKg,
    concreteBlocksCount,
    plasterAreaSqm,
    totalMaterialCost,
    totalLaborCost
  };
}

/**
 * 🌊 ฟังก์ชันคำนวณงานทางระบายน้ำ คสล. & บ่อพัก (Drainage System Takeoff)
 */
export function calculateDrainageMaterials(params: DrainageCalcParams): DrainageCalcResult {
  const {
    pipeLengthM,
    pipeDiameterM = 0.30,
    manholeSpacingM = 7.0,
    includeGratingDitch = true,
    gratingDitchLengthM = 5.0
  } = params;

  // ท่อ คสล. ยาวท่อนละ 1.00 ม.
  const pipesCount = Math.ceil(pipeLengthM * 1.02);
  // บ่อพักวางทุกระยะ 6-8 เมตร และจุดหักมุม
  const manholesCount = Math.max(2, Math.ceil(pipeLengthM / manholeSpacingM) + 1);
  // ทรายหยาบรองก้นร่องหนา 0.10 ม. กว้าง 0.50 ม.
  const excavationSandCuM = Math.round(pipeLengthM * 0.50 * 0.10 * 10) / 10;
  const gratingDitchPieces = includeGratingDitch ? Math.ceil(gratingDitchLengthM / 1.00) : 0;

  const pipeUnitPrice = pipeDiameterM === 0.40 ? 320 : 220;
  const manholeUnitPrice = pipeDiameterM === 0.40 ? 780 : 580;
  const gratingDitchPrice = 1250; // รางยูพร้อมตะแกรงเหล็ก

  const totalMaterialCost = Math.round(
    (pipesCount * pipeUnitPrice) + 
    (manholesCount * manholeUnitPrice) + 
    (excavationSandCuM * 450) + 
    (gratingDitchPieces * gratingDitchPrice)
  );

  const totalLaborCost = Math.round(
    (pipeLengthM * 280) + 
    (manholesCount * 300) + 
    (gratingDitchPieces * 350)
  );

  return {
    pipesCount,
    manholesCount,
    excavationSandCuM,
    gratingDitchPieces,
    totalMaterialCost,
    totalLaborCost
  };
}

/**
 * 🪜 ฟังก์ชันคำนวณบันได คสล. (RC Stair Takeoff)
 */
export function calculateStairMaterials(params: StairCalcParams): StairCalcResult {
  const {
    stairCount = 1,
    stairType = 'dog_leg',
    totalHeightM = 3.20,
    widthM = 1.00,
    riserHeightCm = 17.5,
    treadWidthCm = 26.0,
    landingCount = 1,
    landingLengthM = 1.00,
    waistThicknessCm = 12.0,
    includeHandrail = true,
    handrailType = 'steel_wood',
    finishType = 'wood_solid'
  } = params;

  // 1. คำนวณจำนวนขั้น (ลูกตั้ง)
  const totalHeightCm = totalHeightM * 100;
  const stepCount = Math.max(2, Math.round(totalHeightCm / riserHeightCm));
  const actualRiserCm = Math.round((totalHeightCm / stepCount) * 10) / 10;
  const treadCount = stepCount - 1; 

  // 2. ความยาวทางราบและความลาดชัน
  const treadWidthM = treadWidthCm / 100;
  const flightRunM = (treadCount * treadWidthM);
  const totalRunLengthM = Math.round((flightRunM + (landingCount * landingLengthM)) * 100) / 100;
  // ความยาวแนวเอียงของท้องบันได
  const slopeHypotM = Math.sqrt(Math.pow(flightRunM, 2) + Math.pow(totalHeightM, 2));

  // 3. ปริมาตรคอนกรีต
  const riserM = actualRiserCm / 100;
  const waistThickM = waistThicknessCm / 100;
  const stepsVolCuM = 0.5 * riserM * treadWidthM * widthM * treadCount;
  const waistVolCuM = slopeHypotM * widthM * waistThickM;
  const landingVolCuM = landingCount * landingLengthM * widthM * Math.max(waistThickM, 0.12);
  const singleStairConcreteCuM = (stepsVolCuM + waistVolCuM + landingVolCuM) * 1.05; 
  const concreteVolCuM = Math.round(singleStairConcreteCuM * stairCount * 100) / 100;

  // 4. พื้นที่ไม้แบบ
  const formworkSoffit = (slopeHypotM + (landingCount * landingLengthM)) * widthM;
  const formworkSides = 2 * (slopeHypotM * waistThickM + (0.5 * riserM * treadWidthM * treadCount));
  const formworkRisers = treadCount * riserM * widthM;
  const singleStairFormSqm = (formworkSoffit + formworkSides + formworkRisers);
  const formworkSqm = Math.round(singleStairFormSqm * stairCount * 10) / 10;

  // 5. ปริมาณเหล็กเสริม
  const mainBarsCount = Math.ceil(widthM / 0.15) + 1;
  const mainBarLen = (slopeHypotM + (landingCount * landingLengthM) + 1.20) * 1.15; 
  const totalDb12M = mainBarsCount * mainBarLen * 2 * stairCount; 
  const mainSteelDb12Kg = Math.round(totalDb12M * 0.888);
  const mainSteelDb12Bars = Math.ceil(totalDb12M / 10);

  const tempBarsPerFlight = Math.ceil((slopeHypotM + landingLengthM) / 0.20) + 1;
  const tempBarLen = widthM + 0.20;
  const stepExtraRebarM = treadCount * widthM * 2; 
  const totalRb9M = ((tempBarsPerFlight * tempBarLen) + stepExtraRebarM) * 1.15 * stairCount;
  const tempSteelRb9Kg = Math.round(totalRb9M * 0.499);
  const tempSteelRb9Bars = Math.ceil(totalRb9M / 10);

  // 6. ราวบันได
  const singleHandrailM = Math.round((slopeHypotM + (landingCount * landingLengthM)) * 10) / 10;
  const handrailLengthM = includeHandrail ? Math.round(singleHandrailM * stairCount * 10) / 10 : 0;
  let handrailPricePerM = 1450;
  if (handrailType === 'stainless_glass') handrailPricePerM = 3200;
  else if (handrailType === 'steel_wood') handrailPricePerM = 1850;
  else if (handrailType === 'wrought_iron') handrailPricePerM = 2400;
  else handrailPricePerM = 1100;
  const estHandrailCost = includeHandrail ? Math.round(handrailLengthM * handrailPricePerM) : 0;

  // 7. ปิดผิวขั้นนอน
  const treadStepPieces = treadCount * stairCount;
  let finishPricePerStep = 650;
  if (finishType === 'spc_vinyl') finishPricePerStep = 380;
  else if (finishType === 'granito_tile') finishPricePerStep = 450;
  else if (finishType === 'polished_concrete') finishPricePerStep = 180;
  const estFinishCost = Math.round(treadStepPieces * finishPricePerStep);

  // 8. ค่าวัสดุและค่าแรง
  const estConcreteCost = Math.round(concreteVolCuM * 2150);
  const estSteelCost = Math.round((mainSteelDb12Kg * 28) + (tempSteelRb9Kg * 29) + (Math.ceil((mainSteelDb12Kg + tempSteelRb9Kg) * 0.02) * 55));
  const estFormworkCost = Math.round(formworkSqm * 240);
  const matTotal = estConcreteCost + estSteelCost + estFormworkCost + estFinishCost + (includeHandrail ? Math.round(estHandrailCost * 0.75) : 0);
  const labTotal = Math.round(
    (concreteVolCuM * 450) +
    ((mainSteelDb12Kg + tempSteelRb9Kg) * 7.5) +
    (formworkSqm * 130) +
    (treadStepPieces * 200) +
    (includeHandrail ? Math.round(estHandrailCost * 0.25) : 0)
  );

  return {
    stepCount,
    actualRiserCm,
    totalRunLengthM,
    concreteVolCuM,
    formworkSqm,
    mainSteelDb12Kg,
    mainSteelDb12Bars,
    tempSteelRb9Kg,
    tempSteelRb9Bars,
    handrailLengthM,
    treadStepPieces,
    estConcreteCost,
    estSteelCost,
    estFormworkCost,
    estFinishCost,
    estHandrailCost,
    estTotalMaterialCost: matTotal,
    estTotalLaborCost: labTotal
  };
}

export function getMilestoneForCategory(category: ConstructionCategory, milestones: PaymentMilestone[]): {
  milestoneNumber: number;
  milestoneTitle: string;
} {
  if (milestones && milestones.length > 0) {
    const explicitlyMatched = milestones.find(m => m.matchedCategories && m.matchedCategories.includes(category));
    if (explicitlyMatched) {
      return {
        milestoneNumber: explicitlyMatched.milestoneNumber,
        milestoneTitle: explicitlyMatched.title
      };
    }
  }

  const count = milestones?.length || 4;
  let assignedNumber = 1;

  if (count === 3) {
    if (['preparation', 'structure'].includes(category)) {
      assignedNumber = 1;
    } else if (['roof', 'masonry_wall', 'doors_windows', 'finishes', 'decorations', 'sanitary'].includes(category)) {
      assignedNumber = 2;
    } else {
      assignedNumber = 3;
    }
  } else if (count === 4) {
    if (category === 'preparation') {
      assignedNumber = 1;
    } else if (['structure', 'roof'].includes(category)) {
      assignedNumber = 2;
    } else if (['masonry_wall', 'finishes', 'decorations', 'sanitary'].includes(category)) {
      assignedNumber = 3;
    } else {
      assignedNumber = 4;
    }
  } else if (count === 5) {
    if (category === 'preparation') {
      assignedNumber = 1;
    } else if (category === 'structure') {
      assignedNumber = 2;
    } else if (['roof', 'masonry_wall'].includes(category)) {
      assignedNumber = 3;
    } else if (['doors_windows', 'finishes', 'decorations'].includes(category)) {
      assignedNumber = 4;
    } else {
      assignedNumber = 5;
    }
  } else if (count >= 6) {
    if (category === 'preparation') assignedNumber = 1;
    else if (category === 'structure') assignedNumber = 2;
    else if (category === 'roof') assignedNumber = 3;
    else if (category === 'masonry_wall') assignedNumber = 4;
    else if (['doors_windows', 'finishes', 'decorations'].includes(category)) assignedNumber = 5;
    else assignedNumber = 6;
  }

  const matchedMilestone = milestones.find(m => m.milestoneNumber === assignedNumber) || milestones[Math.min(assignedNumber - 1, milestones.length - 1)];

  return {
    milestoneNumber: matchedMilestone?.milestoneNumber || assignedNumber,
    milestoneTitle: matchedMilestone?.title || `งวดที่ ${assignedNumber}`
  };
}

export function calculateSanitarySystem(params: SanitaryCalcParams): SanitaryCalcResult {
  const {
    bathroomCount,
    kitchenCount,
    washingYardCount,
    pipeTypeWater,
    septicTankLiters,
    greaseTrapLiters,
    includeWaterPumpAndTank,
    waterTankLiters,
    waterPumpWatt
  } = params;

  const totalWaterPoints = (bathroomCount * 4) + (kitchenCount * 2) + (washingYardCount * 2);
  const totalDrainPoints = (bathroomCount * 2) + (kitchenCount * 1) + (washingYardCount * 1);

  const coldWaterPipePipes4m = Math.ceil((totalWaterPoints * 4.5) / 4);
  const wasteWaterPipes4m = Math.ceil((totalDrainPoints * 5.5) / 4);
  const soilPipes4m = Math.ceil((bathroomCount * 7.5) / 4);
  const ventPipes4m = Math.ceil((bathroomCount * 4) / 4);

  const fittingsEstimatePcs = Math.ceil(totalWaterPoints * 5 + totalDrainPoints * 4);
  const floorDrainPcs = bathroomCount + washingYardCount;

  const pipeUnitPrice = pipeTypeWater === 'ppr_green' ? 240 : pipeTypeWater === 'pvc_blue_13.5' ? 140 : 105;
  const pipeMaterialTotal = 
    (coldWaterPipePipes4m * pipeUnitPrice) +
    (wasteWaterPipes4m * 185) +
    (soilPipes4m * 340) +
    (ventPipes4m * 135) +
    (fittingsEstimatePcs * 35) +
    (floorDrainPcs * 180);

  const septicPrice = septicTankLiters === 2000 ? 8900 : septicTankLiters === 1600 ? 7400 : 5800;
  const greasePrice = greaseTrapLiters >= 50 ? 2800 : 1650;

  let pumpTankCost = 0;
  if (includeWaterPumpAndTank) {
    const tankPrice = waterTankLiters === 2000 ? 7200 : waterTankLiters === 1500 ? 5900 : 4800;
    const pumpPrice = waterPumpWatt >= 250 ? 6900 : 5400;
    pumpTankCost = tankPrice + pumpPrice + 1200;
  }

  const totalMaterialCost = Math.round(pipeMaterialTotal + septicPrice + greasePrice + pumpTankCost);
  const totalLaborCost = Math.round(
    (bathroomCount * 3500) + 
    (kitchenCount * 1800) + 
    (washingYardCount * 1200) + 
    2500 + 
    (includeWaterPumpAndTank ? 2000 : 0)
  );

  return {
    coldWaterPipePipes4m,
    wasteWaterPipes4m,
    soilPipes4m,
    ventPipes4m,
    fittingsEstimatePcs,
    septicTankQty: 1,
    greaseTrapQty: Math.max(1, kitchenCount),
    waterTankQty: includeWaterPumpAndTank ? 1 : 0,
    waterPumpQty: includeWaterPumpAndTank ? 1 : 0,
    floorDrainPcs,
    totalMaterialCost,
    totalLaborCost
  };
}

export function calculateElectricalSystem(circuits: ElectricalCircuitConfig[]): ElectricalCalculationResult {
  const wireAccumulator: Record<string, {
    wireSize: WireCrossSection;
    wireType: WireType;
    netLengthM: number;
    points: number;
  }> = {};

  let totalConduitLengthM = 0;
  let totalJunctionBoxes = 0;
  let rcboCount = 0;
  let totalBreakerBranches = 0;
  const breakerMap: Record<number, number> = {};

  circuits.forEach(circuit => {
    const { pointsCount, avgDistanceM, wireType, phaseWiresSize, groundWireSize, breakerRatingA, conduitType } = circuit;
    const runDistanceM = pointsCount * avgDistanceM;
    const phaseCores = 2;
    const phaseTotalM = runDistanceM * phaseCores;

    const phaseKey = `${wireType}_${phaseWiresSize}`;
    if (!wireAccumulator[phaseKey]) {
      wireAccumulator[phaseKey] = {
        wireSize: phaseWiresSize,
        wireType,
        netLengthM: 0,
        points: 0
      };
    }
    wireAccumulator[phaseKey].netLengthM += phaseTotalM;
    wireAccumulator[phaseKey].points += pointsCount;

    if (groundWireSize) {
      const groundKey = `${wireType}_${groundWireSize}_G`;
      if (!wireAccumulator[groundKey]) {
        wireAccumulator[groundKey] = {
          wireSize: groundWireSize,
          wireType,
          netLengthM: 0,
          points: 0
        };
      }
      wireAccumulator[groundKey].netLengthM += runDistanceM;
      wireAccumulator[groundKey].points += pointsCount;
    }

    if (conduitType !== 'none' && conduitType !== 'clip_nail') {
      totalConduitLengthM += runDistanceM;
      totalJunctionBoxes += Math.ceil(pointsCount * 1.2);
    }

    if (circuit.circuitType.includes('water_heater') || circuit.name.includes('น้ำอุ่น') || circuit.name.includes('ปั๊มน้ำ')) {
      rcboCount += pointsCount;
    }

    breakerMap[breakerRatingA] = (breakerMap[breakerRatingA] || 0) + Math.ceil(pointsCount / (circuit.circuitType === 'lighting' ? 12 : circuit.circuitType === 'receptacle' ? 8 : 1));
    totalBreakerBranches += 1;
  });

  const wireSummary = Object.values(wireAccumulator).map(item => {
    const spec = WIRE_PRICE_STANDARDS[item.wireSize];
    const wastePercent = 10;
    const totalOrderM = Math.ceil(item.netLengthM * (1 + wastePercent / 100));
    const coils100m = Math.ceil(totalOrderM / 100);
    const estPricePerM = item.wireType === 'THW' ? spec.thwPricePerM : item.wireType === 'NYY' ? spec.nyyPricePerM : spec.vafPricePerM;
    const totalCost = totalOrderM * estPricePerM;

    return {
      wireSize: item.wireSize,
      wireType: item.wireType,
      totalLengthM: Math.round(item.netLengthM),
      wastePercent,
      totalOrderM,
      coils100m,
      estPricePerM,
      totalCost,
      standardPurpose: spec.purposeTh
    };
  });

  const conduitPipes3m = Math.ceil(totalConduitLengthM / 2.92);
  const conduitCost = (conduitPipes3m * 48) + (totalJunctionBoxes * 35);

  const neededSlots = Object.values(breakerMap).reduce((a, b) => a + b, 0) + 2;
  let recommendedSlots = 6;
  if (neededSlots > 14) recommendedSlots = 16;
  else if (neededSlots > 12) recommendedSlots = 14;
  else if (neededSlots > 10) recommendedSlots = 12;
  else if (neededSlots > 8) recommendedSlots = 10;
  else if (neededSlots > 6) recommendedSlots = 8;

  const mainFeeder = circuits.find(c => c.circuitType === 'main_feeder');
  const mainBreakerAmp = mainFeeder?.breakerRatingA || 50;

  const branchBreakers = Object.entries(breakerMap).map(([amp, count]) => ({
    amp: parseInt(amp),
    count
  }));

  const totalWireMatCost = wireSummary.reduce((acc, cur) => acc + cur.totalCost, 0);
  const panelCost = 3500 + (recommendedSlots * 180) + (rcboCount * 650);
  const totalMaterialCost = Math.round(totalWireMatCost + conduitCost + panelCost);

  const totalWiresMeters = wireSummary.reduce((a, b) => a + b.totalOrderM, 0);
  const totalLaborCost = Math.round((totalWiresMeters * 7.5) + (circuits.reduce((a, b) => a + b.pointsCount, 0) * 120));

  return {
    wireSummary,
    conduitSummary: {
      conduitType: 'ท่อร้อยสาย uPVC สีขาว Ø 16-20 มม. (มอก.)',
      totalLengthM: Math.round(totalConduitLengthM),
      conduitPipes3m,
      fittingJunctionBoxes: totalJunctionBoxes,
      estCost: conduitCost
    },
    panelSummary: {
      recommendedSlots,
      mainBreakerAmp,
      rcboCount,
      branchBreakers,
      groundRodRequired: true
    },
    totalMaterialCost,
    totalLaborCost
  };
}

export function generateSiteMaterialsProcurementList(
  boqItems: BOQItem[],
  houseAreaSqm: number,
  milestones: PaymentMilestone[] = []
): SiteMaterialItem[] {
  const materials: SiteMaterialItem[] = [];

  boqItems.forEach((item, index) => {
    if (item.materialUnitPrice <= 0) return;

    const wastePercent = typeof item.wastePercent === 'number' ? item.wastePercent : 0;
    const wasteMult = 1 + (wastePercent / 100);
    const exactOrderQty = item.quantity * wasteMult;
    const calculatedOrderQty = Math.round(exactOrderQty * 10) / 10;
    const lineTotal = Math.round(exactOrderQty * item.materialUnitPrice);

    const nameLower = item.name.toLowerCase();
    const specLower = item.spec.toLowerCase();

    const milestoneInfo = getMilestoneForCategory(item.category, milestones);
    const milestoneNumber = item.milestoneNumber || milestoneInfo.milestoneNumber;
    const milestoneTitle = milestoneInfo.milestoneTitle;
    const priorityPhase = `phase_${milestoneNumber}`;

    if (item.category === 'roof' && (nameLower.includes('เหล็ก') || specLower.includes('เหล็กซี') || specLower.includes('แป') || item.unit === 'กก.')) {
      const totalKg = exactOrderQty;
      
      const cMatch = item.spec.match(/เหล็กซี\s*(\d+)\s*ท่อน/);
      const boxMatch = item.spec.match(/เหล็กกล่อง\s*(\d+)\s*ท่อน/);
      const purlinMatch = item.spec.match(/แป\s*(\d+)\s*ท่อน/);

      let cBars = cMatch ? parseInt(cMatch[1]) : 0;
      let boxBars = boxMatch ? parseInt(boxMatch[1]) : 0;
      let purlinBars = purlinMatch ? parseInt(purlinMatch[1]) : 0;

      if (cBars === 0 && boxBars === 0 && purlinBars === 0) {
        const cKg = totalKg * 0.60;
        const boxKg = totalKg * 0.25;
        const purlinKg = totalKg * 0.15;

        cBars = Math.ceil(cKg / 24.3);
        boxBars = Math.ceil(boxKg / 30.5);
        purlinBars = Math.ceil(purlinKg / 9.5);
      }

      const totalBars = cBars + boxBars + purlinBars;

      materials.push({
        id: `mat-proc-roof-steel-${item.id}-${index}`,
        materialGroup: 'steel_rebar',
        name: 'เหล็กโครงหลังคาแปรรูป (เหล็กซี C100, เหล็กกล่อง 100x50, แปโอเมก้า)',
        spec: `สั่งเป็นเส้นยาว 6.0 ม. รวม ${totalBars} เส้น: [1] เหล็กซี C100x50x20x3.2 มม. = ${cBars} เส้น (จันทัน/อะเส) | [2] เหล็กกล่อง 100x50x3.2 มม. = ${boxBars} เส้น (อกไก่/ขื่อ/ดั้ง) | [3] แปหลังคาโอเมก้ากัลวาไนซ์ = ${purlinBars} เส้น (ยาว 6ม.) (น้ำหนักรวม ${Math.round(totalKg).toLocaleString()} กก.)`,
        netQuantity: Math.round(item.quantity),
        wastePercent,
        orderQuantity: totalBars,
        unit: 'เส้น (ท่อนละ 6ม.)',
        unitPriceEstimate: Math.round(lineTotal / Math.max(1, totalBars)),
        totalEstimatedCost: lineTotal,
        priorityPhase,
        milestoneNumber,
        milestoneTitle,
        boqCategory: item.category,
        packageNote: `สั่งเหล็ก มอก. ยาวท่อนละ 6.00 ม. เข้าหน้างานพร้อมสีกันสนิม 2 ถัง (ทา 2 เที่ยว) + ลวดเชื่อมไฟฟ้า + เผื่อค้ำยันชั่วคราว`
      });
      return;
    }

    if (nameLower.includes('กระเบื้อง') || nameLower.includes('แกรนิตโต้') || nameLower.includes('พอร์ซเลน') || (item.category === 'finishes' && nameLower.includes('tile'))) {
      let sqmPerBox = 1.0;
      let piecesPerBox = 11;
      let tileDimStr = 'ทั่วไป';

      if (nameLower.includes('60x60') || specLower.includes('60x60') || nameLower.includes('แกรนิตโต้') || nameLower.includes('พอร์ซเลน')) {
        sqmPerBox = 1.44;
        piecesPerBox = 4;
        tileDimStr = '60x60 ซม. (4 แผ่น/กล่อง = 1.44 ตร.ม.)';
      } else if (nameLower.includes('30x60') || specLower.includes('30x60')) {
        sqmPerBox = 1.44;
        piecesPerBox = 8;
        tileDimStr = '30x60 ซม. (8 แผ่น/กล่อง = 1.44 ตร.ม.)';
      } else if (nameLower.includes('30x30') || specLower.includes('30x30') || nameLower.includes('12"x12"')) {
        sqmPerBox = 1.00;
        piecesPerBox = 11;
        tileDimStr = '30x30 ซม. (11 แผ่น/กล่อง = 1.00 ตร.ม.)';
      } else if (nameLower.includes('40x40') || specLower.includes('40x40') || nameLower.includes('16"x16"')) {
        sqmPerBox = 1.00;
        piecesPerBox = 6;
        tileDimStr = '40x40 ซม. (6 แผ่น/กล่อง = 0.96 ตร.ม.)';
      } else if (nameLower.includes('ซับเวย์') || specLower.includes('ซับเวย์') || nameLower.includes('10x20') || nameLower.includes('10x30')) {
        sqmPerBox = 1.00;
        piecesPerBox = 50;
        tileDimStr = 'Subway Tile (1.00 ตร.ม./กล่อง)';
      } else if (nameLower.includes('ลายไม้') || specLower.includes('15x60') || specLower.includes('20x100')) {
        sqmPerBox = 1.20;
        piecesPerBox = 8;
        tileDimStr = 'ลายไม้ (1.20 ตร.ม./กล่อง)';
      } else {
        sqmPerBox = 1.00;
        tileDimStr = '1.00 ตร.ม./กล่อง';
      }

      const totalBoxes = Math.ceil(exactOrderQty / sqmPerBox);
      const approxTotalPieces = totalBoxes * piecesPerBox;
      const adhesiveBags20kg = Math.ceil(exactOrderQty / 4.5);
      const groutBags1kg = Math.ceil(exactOrderQty / 4.0);

      materials.push({
        id: `mat-proc-tile-${item.id}-${index}`,
        materialGroup: 'tiles_finishes',
        name: item.name,
        spec: `${item.spec} [ขนาด ${tileDimStr}] ต้องปูสุทธิ ${item.quantity} ตร.ม. + เผื่อตัดเศษ ${wastePercent}% = ${Math.round(exactOrderQty * 10) / 10} ตร.ม. (ต้องสั่งจริง ${totalBoxes} กล่อง ~${approxTotalPieces} แผ่น)`,
        netQuantity: Math.round(item.quantity * 10) / 10,
        wastePercent,
        orderQuantity: totalBoxes,
        unit: `กล่อง (~${Math.round(totalBoxes * sqmPerBox * 10) / 10} ตร.ม.)`,
        unitPriceEstimate: Math.round(item.materialUnitPrice * sqmPerBox),
        totalEstimatedCost: lineTotal,
        priorityPhase,
        milestoneNumber,
        milestoneTitle,
        boqCategory: item.category,
        packageNote: `สั่ง ${totalBoxes} กล่อง (เช็คเฉดสี/LOT เดียวกันกันสีเพี้ยน) + ต้องใช้ปูนกาว ~${adhesiveBags20kg} ถุง(20กก.) + กาวยาแนวกันรา ~${groutBags1kg} ถุง(1กก.)`
      });
      return;
    }

    if (item.category === 'electrical') {
      if (nameLower.includes('สายไฟ') || nameLower.includes('thw') || nameLower.includes('vaf') || nameLower.includes('nyy')) {
        const coils100m = Math.ceil(exactOrderQty / 100);
        materials.push({
          id: `mat-proc-wire-${item.id}-${index}`,
          materialGroup: 'mep_fixtures',
          name: item.name,
          spec: `${item.spec} (ความยาว ${Math.round(item.quantity)} ม. + เผื่อเลี้ยว ${wastePercent}% = ${Math.round(exactOrderQty)} ม. ~ สั่ง ${coils100m} ขด)`,
          netQuantity: Math.round(item.quantity),
          wastePercent,
          orderQuantity: coils100m,
          unit: 'ขด (ม้วนละ 100 ม.)',
          unitPriceEstimate: Math.round(item.materialUnitPrice * 100),
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'สั่งเป็นขด 100 ม. แบรนด์มาตรฐาน มอก. 11-2553 ร้อยท่อก่อนฉาบปูน'
        });
        return;
      }

      if (nameLower.includes('ท่อร้อยสาย') || nameLower.includes('conduit') || nameLower.includes('upvc')) {
        const pipes = Math.ceil(exactOrderQty);
        materials.push({
          id: `mat-proc-conduit-${item.id}-${index}`,
          materialGroup: 'mep_fixtures',
          name: item.name,
          spec: item.spec,
          netQuantity: item.quantity,
          wastePercent,
          orderQuantity: pipes,
          unit: 'ท่อน (ยาว 2.92 ม.)',
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'ท่อ uPVC ขาวดัดเย็น พร้อมกาวประสานท่อ คอนเน็กเตอร์ และบ็อกซ์พักสาย'
        });
        return;
      }

      if (nameLower.includes('ตู้คอนซูเมอร์') || nameLower.includes('ตู้ควบคุม') || nameLower.includes('เบรกเกอร์')) {
        materials.push({
          id: `mat-proc-panel-${item.id}-${index}`,
          materialGroup: 'mep_fixtures',
          name: item.name,
          spec: item.spec,
          netQuantity: item.quantity,
          wastePercent: 0,
          orderQuantity: Math.ceil(item.quantity),
          unit: 'ชุด',
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'พร้อมเมนเบรกเกอร์ RCBO กันดูด และแท่งกราวด์ทองแดง 5/8" x 2.40 ม.'
        });
        return;
      }

      if (nameLower.includes('สวิตช์') || nameLower.includes('ปลั๊ก') || nameLower.includes('โคมไฟ') || nameLower.includes('เต้ารับ')) {
        materials.push({
          id: `mat-proc-elec-fixture-${item.id}-${index}`,
          materialGroup: 'mep_fixtures',
          name: item.name,
          spec: item.spec,
          netQuantity: item.quantity,
          wastePercent,
          orderQuantity: Math.ceil(item.quantity),
          unit: item.unit,
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'ติดตั้งหน้ากากและดวงโคมหลังงานทาสีเสร็จสิ้น'
        });
        return;
      }
    }

    if (item.category === 'sanitary') {
      if (nameLower.includes('ท่อประปา') || nameLower.includes('ท่อน้ำทิ้ง') || specLower.includes('ppr') || specLower.includes('pvc')) {
        materials.push({
          id: `mat-proc-san-pipe-${item.id}-${index}`,
          materialGroup: 'mep_fixtures',
          name: 'ชุดท่อประปา PPR & ท่อน้ำทิ้ง-สิ่งปฏิกูล PVC ตราช้าง มอก.',
          spec: `${item.spec} พร้อมข้อต่อ บอลวาล์ว น้ำยาประสานท่อ และกิ๊บรัดก้ามปู`,
          netQuantity: 1,
          wastePercent: 0,
          orderQuantity: 1,
          unit: 'ชุดงานระบบ',
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'เดินท่อฝังผนังและใต้คานก่อนเทพื้นและฉาบปูน พร้อมทดสอบแรงดันน้ำก่อนปิดผิว'
        });
        return;
      }

      if (nameLower.includes('ถังบำบัด')) {
        materials.push({
          id: `mat-proc-san-septic-${item.id}-${index}`,
          materialGroup: 'mep_fixtures',
          name: item.name,
          spec: item.spec,
          netQuantity: item.quantity,
          wastePercent: 0,
          orderQuantity: Math.ceil(item.quantity),
          unit: 'ชุด',
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'ขุดฝังดินพร้อมเทคอนกรีตรองก้นหลุมหนา 15 ซม. เติมน้ำเต็มถังทันทีก่อนกลบดิน'
        });
        return;
      }

      if (nameLower.includes('สุขภัณฑ์')) {
        materials.push({
          id: `mat-proc-san-fixtures-${item.id}-${index}`,
          materialGroup: 'mep_fixtures',
          name: item.name,
          spec: item.spec,
          netQuantity: item.quantity,
          wastePercent: 0,
          orderQuantity: Math.ceil(item.quantity),
          unit: item.unit || 'ห้อง',
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'ติดตั้งโถสุขภัณฑ์ อ่างล้างหน้า ฝักบัว และอุปกรณ์หลังปูกระเบื้องเสร็จสิ้น 100%'
        });
        return;
      }
    }

    if (item.category === 'decorations') {
      if (nameLower.includes('บัวพื้น') || nameLower.includes('บัวเชิงผนัง') || nameLower.includes('กันเปื้อน')) {
        const pieceLengthM = 2.4;
        const piecesCount = Math.ceil(exactOrderQty / pieceLengthM);
        materials.push({
          id: `mat-proc-skirting-${item.id}-${index}`,
          materialGroup: 'decorations',
          name: item.name,
          spec: `${item.spec} (ความยาว ${item.quantity} ม. + เผื่อตัดมุม ${wastePercent}% ~ สั่งบัวแผ่นยาว 2.4ม. รวม ${piecesCount} ท่อน)`,
          netQuantity: item.quantity,
          wastePercent,
          orderQuantity: piecesCount,
          unit: 'ท่อน (ยาว 2.4ม.)',
          unitPriceEstimate: Math.round(item.materialUnitPrice * pieceLengthM),
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'ยึดด้วยกาวตะปู ยิงแด๊ปอะคริลิกขอบบนและตัดเข้ามุม 45 องศา'
        });
        return;
      }

      if (nameLower.includes('บัวปูน') || nameLower.includes('บัวหน้าต่าง') || nameLower.includes('บัวโฟม')) {
        const piecesCount = Math.ceil(exactOrderQty / 2.0);
        materials.push({
          id: `mat-proc-molding-${item.id}-${index}`,
          materialGroup: 'decorations',
          name: item.name,
          spec: `${item.spec} (ความยาวรวม ${item.quantity} ม. ~ ใช้บัวปูนสำเร็จรูปประมาณ ${piecesCount} ท่อน @ 2ม.)`,
          netQuantity: item.quantity,
          wastePercent,
          orderQuantity: calculatedOrderQty,
          unit: item.unit,
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'ต้องกรีดทำร่องหยดน้ำ (Drip Line) ใต้บัวล่างเพื่อตัดทางน้ำฝน'
        });
        return;
      }

      if (nameLower.includes('หินกาบ') || nameLower.includes('หินธรรมชาติ') || nameLower.includes('หินเทียม')) {
        const adhesiveBags = Math.ceil(exactOrderQty / 3.5);
        materials.push({
          id: `mat-proc-stone-${item.id}-${index}`,
          materialGroup: 'decorations',
          name: item.name,
          spec: `${item.spec} (ใช้ปูนกาวปูหินแรงยึดสูง ~ ${adhesiveBags} ถุง 20กก. เคลือบน้ำยากันตะไคร่ 2 เที่ยว)`,
          netQuantity: item.quantity,
          wastePercent,
          orderQuantity: calculatedOrderQty,
          unit: item.unit,
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'สกัดผิวปูนฉาบให้หยาบ (Chipping) ก่อนปูหินเพื่อป้องกันการหลุดร่อน'
        });
        return;
      }

      if (nameLower.includes('กรุ') || nameLower.includes('ระแนง') || nameLower.includes('ไม้ฝา') || nameLower.includes('แผ่นพีวีซี')) {
        materials.push({
          id: `mat-proc-cladding-${item.id}-${index}`,
          materialGroup: 'decorations',
          name: item.name,
          spec: item.spec,
          netQuantity: item.quantity,
          wastePercent,
          orderQuantity: calculatedOrderQty,
          unit: item.unit,
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'ติดตั้งคลิปล็อคซ่อนหัวสกรูและฉีดแด๊ปปิดขอบมุม'
        });
        return;
      }
    }

    if (item.category === 'doors_windows') {
      const isAlu = nameLower.includes('อลูมิเนียม') || specLower.includes('อลูมิเนียม');
      materials.push({
        id: `mat-proc-doorwin-${item.id}-${index}`,
        materialGroup: 'doors_windows',
        name: item.name,
        spec: `${item.spec} (สั่งผลิตสำเร็จรูปตรงตามขนาดช่องเปิด)`,
        netQuantity: item.quantity,
        wastePercent: 0,
        orderQuantity: Math.ceil(item.quantity),
        unit: 'ชุด',
        unitPriceEstimate: item.materialUnitPrice,
        totalEstimatedCost: lineTotal,
        priorityPhase,
        milestoneNumber,
        milestoneTitle,
        boqCategory: item.category,
        packageNote: isAlu 
          ? 'วัดระยะช่องปูนจริงหลังจับเซี้ยมฉาบปูนเสร็จ ก่อนสั่งตัดประกอบกรอบอลูมิเนียม' 
          : 'ติดตั้งวงกบและติดตั้งบานพร้อมบานพับและชุดล็อค'
      });
      return;
    }

    if (item.category === 'finishes') {
      if (nameLower.includes('ฝ้า') || specLower.includes('ยิปซัม') || nameLower.includes('ยิปซัม')) {
        const gypsumSheets = Math.ceil(exactOrderQty / 2.88);
        materials.push({
          id: `mat-proc-ceiling-${item.id}-${index}`,
          materialGroup: 'tiles_finishes',
          name: item.name,
          spec: `${item.spec} (พื้นที่ ${item.quantity} ตร.ม. ~ สั่งแผ่นยิปซัม 1.20x2.40ม. รวม ${gypsumSheets} แผ่น พร้อมโครง C-Line)`,
          netQuantity: item.quantity,
          wastePercent,
          orderQuantity: gypsumSheets,
          unit: 'แผ่น (1.20x2.40ม.)',
          unitPriceEstimate: Math.round(item.materialUnitPrice * 2.88),
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'สั่งแผ่นยิปซัมขอบลาดหนา 9 มม. พร้อมโครงคร่าว C-Line และปูนฉาบรอยต่อ'
        });
        return;
      }

      if (nameLower.includes('สี') || nameLower.includes('ทาสี') || specLower.includes('รองพื้น')) {
        const paintBuckets5Gal = Math.ceil(exactOrderQty / 75);
        materials.push({
          id: `mat-proc-paint-${item.id}-${index}`,
          materialGroup: 'tiles_finishes',
          name: item.name,
          spec: `${item.spec} (พื้นที่ผิวทาสี ${Math.round(item.quantity)} ตร.ม. ~ สั่งสีขนาด 5 แกลลอน รวม ${paintBuckets5Gal} ถัง)`,
          netQuantity: Math.round(item.quantity),
          wastePercent,
          orderQuantity: paintBuckets5Gal,
          unit: 'ถังใหญ่ (5 แกลลอน)',
          unitPriceEstimate: Math.round(item.materialUnitPrice * 75),
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'สีรองพื้นปูนใหม่กันด่าง 1 เที่ยว + สีจริงอะคริลิกกึ่งเงา 2 เที่ยว'
        });
        return;
      }
    }

    if (item.category === 'external_works') {
      if (nameLower.includes('รั้ว') && !nameLower.includes('ประตู')) {
        const blocksNeeded = Math.ceil(item.quantity * 1.8 * 13.5);
        materials.push({
          id: `mat-proc-fence-${item.id}-${index}`,
          materialGroup: 'external_civil',
          name: 'คอนกรีตบล็อกสำหรับงานรั้ว + เสาเข็มหกเหลี่ยม/เสาไอรั้ว',
          spec: `ความยาวรั้ว ${item.quantity} ม. (บล็อกประมาณ ${blocksNeeded.toLocaleString()} ก้อน)`,
          netQuantity: item.quantity,
          wastePercent,
          orderQuantity: Math.ceil(item.quantity * wasteMult),
          unit: 'ม.',
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'ทำแนวเขตที่ดินร่วมกับที่ดินข้างเคียงก่อนขุดฐานรากรั้ว'
        });
        return;
      }

      if (nameLower.includes('ประตูรั้ว') || nameLower.includes('มอเตอร์')) {
        materials.push({
          id: `mat-proc-gate-${item.id}-${index}`,
          materialGroup: 'external_civil',
          name: item.name,
          spec: item.spec,
          netQuantity: item.quantity,
          wastePercent: 0,
          orderQuantity: Math.ceil(item.quantity),
          unit: item.unit || 'ชุด',
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'เทคานธรณีประตูและฝังรางเพลาให้ได้ระดับแนวระนาบ'
        });
        return;
      }

      if (nameLower.includes('โรงจอดรถ') || nameLower.includes('โรงรถ')) {
        const isRoof = nameLower.includes('หลังคา');
        materials.push({
          id: `mat-proc-carport-${item.id}-${index}`,
          materialGroup: isRoof ? 'steel_rebar' : 'cement_concrete',
          name: item.name,
          spec: item.spec,
          netQuantity: item.quantity,
          wastePercent,
          orderQuantity: calculatedOrderQty,
          unit: item.unit,
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: isRoof ? 'แนะนำใช้เหล็กกัลวาไนซ์กันสนิม' : 'เทแยก Joint จากคานตัวบ้าน'
        });
        return;
      }

      if (nameLower.includes('ท่อระบายน้ำ') || nameLower.includes('บ่อพัก') || nameLower.includes('รางระบายน้ำ')) {
        const manholeCount = Math.max(3, Math.ceil(item.quantity / 7));
        materials.push({
          id: `mat-proc-drain-${item.id}-${index}`,
          materialGroup: 'external_civil',
          name: 'ท่อระบายน้ำ คสล. Ø 0.30 ม. + บ่อพักคอนกรีตสำเร็จรูปพร้อมฝาปิด',
          spec: `ท่อระบายน้ำความยาว ${item.quantity} ม. พร้อมบ่อพักประมาณ ${manholeCount} จุด`,
          netQuantity: item.quantity,
          wastePercent,
          orderQuantity: Math.ceil(item.quantity * wasteMult),
          unit: 'ม. (พร้อมบ่อพัก)',
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'จับระดับ Slope ท่ออย่างน้อย 1:100 - 1:200'
        });
        return;
      }

      if (nameLower.includes('ทางเดิน') || nameLower.includes('ลานซักล้าง') || nameLower.includes('พิมพ์ลาย')) {
        materials.push({
          id: `mat-proc-pave-${item.id}-${index}`,
          materialGroup: 'external_civil',
          name: item.name,
          spec: item.spec,
          netQuantity: item.quantity,
          wastePercent,
          orderQuantity: calculatedOrderQty,
          unit: item.unit,
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'ปูพลาสติกรองพื้นก่อนเทคอนกรีต'
        });
        return;
      }

      if (nameLower.includes('ถังน้ำ') || nameLower.includes('ปั๊มน้ำ') || nameLower.includes('ฐานราก คสล. วางถัง')) {
        materials.push({
          id: `mat-proc-tank-${item.id}-${index}`,
          materialGroup: 'mep_fixtures',
          name: item.name,
          spec: item.spec,
          netQuantity: item.quantity,
          wastePercent: 0,
          orderQuantity: Math.ceil(item.quantity),
          unit: item.unit,
          unitPriceEstimate: item.materialUnitPrice,
          totalEstimatedCost: lineTotal,
          priorityPhase,
          milestoneNumber,
          milestoneTitle,
          boqCategory: item.category,
          packageNote: 'แท่นวางถังน้ำต้องลงเสาเข็มสั้น 4-6 ต้น'
        });
        return;
      }
    }

    if (nameLower.includes('คอนกรีต') || nameLower.includes('concrete') || (item.unit === 'ลบ.ม.' && (nameLower.includes('ปูน') || item.category === 'structure'))) {
      const orderQty = Math.round(exactOrderQty * 10) / 10;
      materials.push({
        id: `mat-proc-conc-${item.id}-${index}`,
        materialGroup: 'cement_concrete',
        name: item.name.includes('คอนกรีต') ? item.name : `คอนกรีตผสมเสร็จ (${item.name})`,
        spec: item.spec || 'กำลังอัด 240 ksc ทรงลูกบาศก์',
        netQuantity: item.quantity,
        wastePercent,
        orderQuantity: orderQty,
        unit: 'ลบ.ม. (คิว)',
        unitPriceEstimate: item.materialUnitPrice,
        totalEstimatedCost: Math.round(orderQty * item.materialUnitPrice),
        priorityPhase,
        milestoneNumber,
        milestoneTitle,
        boqCategory: item.category,
        packageNote: `สั่งรถโม่ปูน Ready-Mix เข้าหน้างานตรงตามยอด BOQ (${item.quantity} คิว + เผื่อ ${wastePercent}% = ${orderQty} คิว)`
      });
      return;
    }

    if (nameLower.includes('เสาเข็ม')) {
      materials.push({
        id: `mat-proc-pile-${item.id}-${index}`,
        materialGroup: 'cement_concrete',
        name: item.name,
        spec: item.spec,
        netQuantity: item.quantity,
        wastePercent,
        orderQuantity: Math.ceil(item.quantity * wasteMult),
        unit: 'ต้น',
        unitPriceEstimate: item.materialUnitPrice,
        totalEstimatedCost: lineTotal,
        priorityPhase,
        milestoneNumber,
        milestoneTitle,
        boqCategory: item.category,
        packageNote: 'สั่งจองล่วงหน้า 3-5 วัน พร้อมปั้นจั่นตอก'
      });
      return;
    }

    if (nameLower.includes('ทราย') || nameLower.includes('หิน')) {
      const orderQty = Math.round(exactOrderQty * 10) / 10;
      materials.push({
        id: `mat-proc-sandrock-${item.id}-${index}`,
        materialGroup: 'cement_concrete',
        name: item.name,
        spec: item.spec || 'ทรายหยาบก่อสร้าง / หินเบอร์ 1-2',
        netQuantity: item.quantity,
        wastePercent,
        orderQuantity: orderQty,
        unit: 'ลบ.ม. (คิว)',
        unitPriceEstimate: item.materialUnitPrice,
        totalEstimatedCost: Math.round(orderQty * item.materialUnitPrice),
        priorityPhase,
        milestoneNumber,
        milestoneTitle,
        boqCategory: item.category,
        packageNote: 'สั่งเป็นรถสิบล้อ หรือหกล้อ เทกองใกล้จุดผสมปูน'
      });
      return;
    }

    if (nameLower.includes('เหล็กเส้น') || nameLower.includes('db12') || nameLower.includes('db16') || nameLower.includes('rb9')) {
      const totalKg = exactOrderQty;
      const isDb16 = nameLower.includes('db16') || specLower.includes('db16');
      const isDb12 = nameLower.includes('db12') || specLower.includes('db12');
      const weightPerBar = isDb16 ? 15.8 : isDb12 ? 8.88 : 4.99;
      const barCount = Math.ceil(totalKg / weightPerBar);
      materials.push({
        id: `mat-proc-steel-${item.id}-${index}`,
        materialGroup: 'steel_rebar',
        name: item.name,
        spec: `${item.spec} (แปลงจาก ${Math.round(totalKg).toLocaleString()} กก. @ ${weightPerBar} กก./เส้น)`,
        netQuantity: Math.round(item.quantity),
        wastePercent,
        orderQuantity: barCount,
        unit: 'เส้น (ยาว 10ม.)',
        unitPriceEstimate: Math.round(item.materialUnitPrice * weightPerBar),
        totalEstimatedCost: lineTotal,
        priorityPhase,
        milestoneNumber,
        milestoneTitle,
        boqCategory: item.category,
        packageNote: 'สั่งมัดรวมยกด้วยเครน จัดที่หนุนหมอนไม้และผ้าใบคลุมกันสนิม'
      });
      return;
    }

    if (nameLower.includes('ไม้แบบ')) {
      materials.push({
        id: `mat-proc-form-${item.id}-${index}`,
        materialGroup: 'steel_rebar',
        name: item.name,
        spec: item.spec,
        netQuantity: item.quantity,
        wastePercent,
        orderQuantity: calculatedOrderQty,
        unit: item.unit,
        unitPriceEstimate: item.materialUnitPrice,
        totalEstimatedCost: lineTotal,
        priorityPhase,
        milestoneNumber,
        milestoneTitle,
        boqCategory: item.category,
        packageNote: 'ทาด้วยน้ำยาทาแบบก่อนเทคอนกรีตทุกครั้ง'
      });
      return;
    }

    if (nameLower.includes('แผ่นพื้น') || nameLower.includes('พื้นสำเร็จรูป')) {
      const plankCount = Math.ceil(exactOrderQty / (0.35 * 3.8));
      materials.push({
        id: `mat-proc-plank-${item.id}-${index}`,
        materialGroup: 'cement_concrete',
        name: item.name,
        spec: `${item.spec} (สั่งเฉลี่ย ${plankCount} แผ่น)`,
        netQuantity: item.quantity,
        wastePercent,
        orderQuantity: calculatedOrderQty,
        unit: item.unit,
        unitPriceEstimate: item.materialUnitPrice,
        totalEstimatedCost: lineTotal,
        priorityPhase,
        milestoneNumber,
        milestoneTitle,
        boqCategory: item.category,
        packageNote: 'เช็คช่วงคานหน้างานจริงก่อนส่งตัด'
      });
      return;
    }

    materials.push({
      id: `mat-proc-gen-${item.id}-${index}`,
      materialGroup: 'tiles_finishes',
      name: item.name,
      spec: item.spec,
      netQuantity: item.quantity,
      wastePercent,
      orderQuantity: calculatedOrderQty,
      unit: item.unit,
      unitPriceEstimate: item.materialUnitPrice,
      totalEstimatedCost: lineTotal,
      priorityPhase,
      milestoneNumber,
      milestoneTitle,
      boqCategory: item.category,
      packageNote: 'สั่งซื้อตามระยะเวลาก่อสร้างจริง'
    });
  });

  return materials;
}

export function calculateMasonryMaterials(params: MasonryCalcParams): MasonryCalcResult {
  const {
    brickType,
    wallAreaSqm,
    openingsCount,
    avgOpeningWidthM,
    wallThicknessCm,
    plasterSides
  } = params;

  let brickRate = 8.5;
  let brickUnitPrice = 25;
  let mortarBagsPerSqm = 0.04;
  let sandPerSqm = 0.005;
  let brickLaborPerSqm = 95;
  let plasterLaborPerSqm = 90;

  if (brickType === 'aac_block') {
    brickRate = 8.8;
    brickUnitPrice = 24;
    mortarBagsPerSqm = 0.045;
    sandPerSqm = 0;
    brickLaborPerSqm = 95;
    plasterLaborPerSqm = 90;
  } else if (brickType === 'red_brick') {
    brickRate = 135;
    brickUnitPrice = 1.35;
    mortarBagsPerSqm = 0.32;
    sandPerSqm = 0.045;
    brickLaborPerSqm = 120;
    plasterLaborPerSqm = 95;
  } else if (brickType === 'concrete_block') {
    brickRate = 13.2;
    brickUnitPrice = 7.5;
    mortarBagsPerSqm = 0.18;
    sandPerSqm = 0.032;
    brickLaborPerSqm = 85;
    plasterLaborPerSqm = 90;
  }

  const brickCount = Math.ceil(wallAreaSqm * brickRate);
  const mortarBags50kg = Math.ceil(wallAreaSqm * mortarBagsPerSqm);
  const totalPlasterAreaSqm = wallAreaSqm * plasterSides;
  const plasterBags50kg = Math.ceil(totalPlasterAreaSqm / 2.6);
  const masonrySandCuM = Math.round(wallAreaSqm * sandPerSqm * 10) / 10;

  const openingLintelM = openingsCount * (4.0 + (2 * (avgOpeningWidthM + 0.40)));
  const solidWallStiffenerM = (wallAreaSqm / 15) * 3.0;
  const lintelLengthM = Math.round((openingLintelM + solidWallStiffenerM) * 10) / 10;

  const lintelWidthM = 0.10;
  const lintelThickM = Math.max(0.075, wallThicknessCm / 100);
  const lintelConcreteCuM = Math.round(lintelLengthM * lintelWidthM * lintelThickM * 1.15 * 100) / 100;
  const lintelMainSteelM = lintelLengthM * 2 * 1.15;
  const lintelRebarKg = Math.round(lintelMainSteelM * 0.499);
  const lintelRebarBars = Math.ceil(lintelMainSteelM / 10);
  const wireMeshOrDowelQty = Math.ceil(wallAreaSqm * 0.8 + (openingsCount * 8));

  const estBrickCost = brickCount * brickUnitPrice;
  const estMortarCost = mortarBags50kg * 145;
  const estPlasterCost = plasterBags50kg * 125;
  const estSandCost = masonrySandCuM * 450;
  const estLintelConcCost = lintelConcreteCuM * 2150;
  const estLintelSteelCost = (lintelRebarKg * 29) + (wireMeshOrDowelQty * 12);

  const estMaterialCost = Math.round(estBrickCost + estMortarCost + estPlasterCost + estSandCost + estLintelConcCost + estLintelSteelCost);

  const estBrickLabor = wallAreaSqm * brickLaborPerSqm;
  const estPlasterLabor = totalPlasterAreaSqm * (plasterLaborPerSqm / 2);
  const estLintelLabor = lintelLengthM * 90;
  const estLaborCost = Math.round(estBrickLabor + estPlasterLabor + estLintelLabor);

  return {
    brickType,
    brickCount,
    brickUnit: 'ก้อน',
    mortarBags50kg,
    plasterBags50kg,
    masonrySandCuM,
    lintelLengthM,
    lintelConcreteCuM,
    lintelRebarKg,
    lintelRebarBars,
    wireMeshOrDowelQty,
    estMaterialCost,
    estLaborCost
  };
}

export function scaleBOQByArea(
  currentItems: BOQItem[],
  newAreaSqm: number,
  referenceAreaSqm: number = 120
): BOQItem[] {
  if (newAreaSqm <= 0) return currentItems;
  const ratio = newAreaSqm / referenceAreaSqm;

  return currentItems.map(item => {
    let newQty: number;
    if (typeof item.basePerSqm === 'number' && item.basePerSqm > 0) {
      newQty = item.basePerSqm * newAreaSqm;
    } else {
      newQty = item.quantity * ratio;
    }

    if (['ต้น', 'ชุด', 'ห้อง', 'จุด'].includes(item.unit)) {
      newQty = Math.max(1, Math.round(newQty));
    } else if (item.unit === 'งานเหมา') {
      newQty = 1;
    } else if (['ลบ.ม.', 'ตัน'].includes(item.unit)) {
      newQty = Math.round(newQty * 10) / 10;
    } else if (item.unit === 'กก.') {
      newQty = Math.round(newQty);
    } else {
      newQty = Math.round(newQty * 10) / 10;
    }

    return {
      ...item,
      quantity: Math.max(0.1, newQty)
    };
  });
}

export function calculateRoofMaterials(params: RoofCalculationParams): RoofCalculationResult {
  const {
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
    insulationType = 'none',
    rafterSpacingM = 1.0
  } = params;

  const effectiveWidth = Math.max(1, baseWidthM + (overhangM * 2));
  const effectiveLength = Math.max(1, baseLengthM + (overhangM * 2));
  const rad = (pitchDeg * Math.PI) / 180;
  const slopeFactor = 1 / Math.cos(rad);

  let surfaceArea = 0;
  let ridgeLength = 0;
  let eavesPerimeterM = 0;
  let birdStopLengthM = 0;

  const slopeLengthHalfWidth = (effectiveWidth / 2) * slopeFactor;
  const slopeLengthFull = effectiveLength * slopeFactor;

  let wallPlateM = 0;
  let ridgeBeamM = 0;
  let hipRafterLen = 0;
  let valleyGutterM = 0;

  switch (style) {
    case 'lean_to':
      surfaceArea = effectiveWidth * (effectiveLength * slopeFactor);
      ridgeLength = effectiveWidth;
      eavesPerimeterM = (2 * effectiveWidth) + (2 * slopeLengthFull);
      birdStopLengthM = effectiveWidth;
      wallPlateM = 2 * effectiveWidth;
      ridgeBeamM = effectiveWidth;
      break;
    case 'gable':
      surfaceArea = 2 * (effectiveLength) * slopeLengthHalfWidth;
      ridgeLength = effectiveLength;
      eavesPerimeterM = (2 * effectiveLength) + (4 * slopeLengthHalfWidth);
      birdStopLengthM = 2 * effectiveLength;
      wallPlateM = 2 * effectiveLength;
      ridgeBeamM = effectiveLength;
      break;
    case 'hip':
      surfaceArea = effectiveWidth * effectiveLength * slopeFactor * 1.08;
      hipRafterLen = Math.sqrt(Math.pow(slopeLengthHalfWidth, 2) + Math.pow(effectiveWidth / 2, 2));
      ridgeLength = Math.max(1, effectiveLength - effectiveWidth) + (4 * hipRafterLen);
      eavesPerimeterM = 2 * (effectiveWidth + effectiveLength);
      birdStopLengthM = eavesPerimeterM;
      wallPlateM = 2 * (effectiveWidth + effectiveLength);
      ridgeBeamM = Math.max(1, effectiveLength - effectiveWidth);
      valleyGutterM = Math.round(hipRafterLen * 1.5 * 10) / 10;
      break;
    case 'flat_slab':
      surfaceArea = effectiveWidth * effectiveLength;
      ridgeLength = 0;
      eavesPerimeterM = 0;
      birdStopLengthM = 0;
      wallPlateM = 0;
      ridgeBeamM = 0;
      break;
  }

  eavesPerimeterM = Math.round(eavesPerimeterM * 10) / 10;
  birdStopLengthM = Math.round(birdStopLengthM * 10) / 10;

  // 1. คำนวณเหล็กตามหลักวิศวกรรมจริงแยกรายชิ้นส่วน (ท่อนละ 6 ม.)
  const wallPlateBars = wallPlateM > 0 ? Math.ceil((wallPlateM * 1.08) / 6) : 0;
  
  const rafterCount = style === 'lean_to' 
    ? (Math.ceil(effectiveWidth / rafterSpacingM) + 1)
    : (Math.ceil(effectiveLength / rafterSpacingM) + 1) * 2;
  const raftersTotalM = (rafterCount * slopeLengthHalfWidth) + (style === 'hip' ? 4 * hipRafterLen : 0);
  const rafterBars = raftersTotalM > 0 ? Math.ceil((raftersTotalM * 1.10) / 6) : 0;

  const ridgeBeamBars = ridgeBeamM > 0 ? Math.ceil((ridgeBeamM * 1.10) / 6) * 2 : 0; // ประกบคู่ 2C-150

  const kingPostHeight = (effectiveWidth / 2) * Math.tan(rad);
  const kingPostCount = ridgeBeamM > 0 ? Math.max(2, Math.ceil(ridgeBeamM / 3.5) + 1) : 0;
  const kingPostBars = kingPostCount > 0 ? Math.ceil((kingPostCount * (kingPostHeight + 1.2) * 1.15) / 6) : 0;

  // แปสำเร็จรูปกัลวาไนซ์
  const purlinBars = Math.ceil(surfaceArea / (purlinSpacingM * 6) * 1.15);

  const cChannelBars = wallPlateBars + rafterBars + ridgeBeamBars + kingPostBars;
  const cChannelKg = Math.round(cChannelBars * 24.3); // C-100x50x20x2.3 mm ~ 24.3 kg/ท่อน 6ม.
  
  const boxSteelBars = Math.ceil(cChannelBars * 0.25); // เหล็กกล่องสำหรับดั้งรัดและค้ำยัน
  const boxSteelKg = Math.round(boxSteelBars * 28.5);

  const isHeavyRoof = materialType === 'concrete_tile' || materialType === 'cpac';
  let sheetsCount = surfaceArea;
  if (isHeavyRoof) {
    sheetsCount = Math.ceil(surfaceArea * 11); // ซีแพค 11 แผ่น/ตร.ม.
  }

  // 2. เชิงชาย
  let fasciaLength = 0;
  let fasciaPieces = 0;
  let fasciaMatPricePerM = 0;
  let fasciaLabPricePerM = 0;

  if (includeFascia && style !== 'flat_slab') {
    fasciaLength = eavesPerimeterM;
    fasciaPieces = Math.ceil(fasciaLength / 3.0);
    switch (fasciaType) {
      case 'fiber_cement_double':
        fasciaMatPricePerM = 165;
        fasciaLabPricePerM = 85;
        break;
      case 'fiber_cement_single':
        fasciaMatPricePerM = 110;
        fasciaLabPricePerM = 65;
        break;
      case 'flashing_metal':
        fasciaMatPricePerM = 95;
        fasciaLabPricePerM = 50;
        break;
      case 'natural_wood':
        fasciaMatPricePerM = 320;
        fasciaLabPricePerM = 130;
        break;
    }
  }

  const fasciaMaterialCost = Math.round(fasciaLength * fasciaMatPricePerM);
  const fasciaLaborCost = Math.round(fasciaLength * fasciaLabPricePerM);

  // 3. แผ่นปิดกันนก
  let birdStopLength = 0;
  let birdStopPieces = 0;
  let birdStopMatPricePerM = 0;
  let birdStopLabPricePerM = 0;

  if (includeBirdStop && birdStopType !== 'none' && style !== 'flat_slab') {
    birdStopLength = birdStopLengthM;
    switch (birdStopType) {
      case 'roman_tile':
        birdStopMatPricePerM = 65;
        birdStopLabPricePerM = 35;
        birdStopPieces = Math.ceil(birdStopLength / 0.50);
        break;
      case 'cpac_wave':
        birdStopMatPricePerM = 85;
        birdStopLabPricePerM = 40;
        birdStopPieces = Math.ceil(birdStopLength / 0.60);
        break;
      case 'metal_sheet_eaves':
        birdStopMatPricePerM = 55;
        birdStopLabPricePerM = 30;
        birdStopPieces = Math.ceil(birdStopLength / 1.00);
        break;
      case 'custom_mesh':
        birdStopMatPricePerM = 120;
        birdStopLabPricePerM = 50;
        birdStopPieces = Math.ceil(birdStopLength / 1.00);
        break;
    }
  }

  const birdStopMaterialCost = Math.round(birdStopLength * birdStopMatPricePerM);
  const birdStopLaborCost = Math.round(birdStopLength * birdStopLabPricePerM);

  // 4. ระบบครอบแห้ง Dry Ridge System & รางน้ำตะเฆ่ราง
  const dryRidgeRolls = ridgeLength > 0 ? Math.ceil(ridgeLength / 3.0) : 0;
  const dryRidgeCost = dryRidgeRolls * 750; // ม้วนละ 3 เมตร 750 บาท

  const valleyGutterCost = Math.round(valleyGutterM * 450); // สแตนเลส 304 หนา 0.5 มม. 450 บาท/ม.

  // 5. สกรูยึดหลังคาพร้อมยาง EPDM
  const roofScrewsPcs = Math.ceil(surfaceArea * 5.5);
  const roofScrewsCost = Math.ceil(roofScrewsPcs * 1.5);

  // 6. ฉนวนกันความร้อน
  let insulationSqm = 0;
  let insulationMaterialCost = 0;
  let insulationLaborCost = 0;
  if (insulationType !== 'none' && surfaceArea > 0) {
    insulationSqm = Math.round(surfaceArea);
    let matRate = 0;
    let labRate = 0;
    if (insulationType === 'pu_foam_1in') {
      matRate = 180;
      labRate = 45;
    } else if (insulationType === 'pe_foam_5mm') {
      matRate = 65;
      labRate = 25;
    } else if (insulationType === 'stay_cool_75mm') {
      matRate = 145;
      labRate = 35;
    } else if (insulationType === 'stay_cool_150mm') {
      matRate = 260;
      labRate = 45;
    }
    insulationMaterialCost = Math.round(insulationSqm * matRate);
    insulationLaborCost = Math.round(insulationSqm * labRate);
  }

  const baseMaterialPricePerSqm = isHeavyRoof ? 550 : 380;
  const baseLaborPricePerSqm = isHeavyRoof ? 180 : 120;
  const roofMatTotal = Math.round((surfaceArea * baseMaterialPricePerSqm) + (cChannelKg * 34) + (boxSteelKg * 36) + (purlinBars * 190));
  const roofLabTotal = Math.round((surfaceArea * baseLaborPricePerSqm) + ((cChannelKg + boxSteelKg) * 14));

  return {
    effectiveRoofAreaSqm: Math.round(surfaceArea * 10) / 10,
    c_channel_kg: cChannelKg,
    c_channel_bars: cChannelBars,
    box_steel_kg: boxSteelKg,
    box_steel_bars: boxSteelBars,
    purlin_bars: purlinBars,
    roofSheetsCount: Math.round(sheetsCount),
    ridgeTilesM: Math.round(ridgeLength * 10) / 10,
    eavesPerimeterM,
    fasciaLengthM: fasciaLength,
    fasciaPieces3m: fasciaPieces,
    birdStopLengthM: birdStopLength,
    birdStopPieces,
    fasciaMaterialCost,
    fasciaLaborCost,
    birdStopMaterialCost,
    birdStopLaborCost,
    wallPlateBars,
    rafterBars,
    ridgeBeamBars,
    kingPostBars,
    valleyGutterM,
    valleyGutterCost,
    dryRidgeRolls,
    dryRidgeCost,
    roofScrewsPcs,
    roofScrewsCost,
    insulationSqm,
    insulationMaterialCost,
    insulationLaborCost,
    materialEstimateThb: roofMatTotal + fasciaMaterialCost + birdStopMaterialCost + dryRidgeCost + valleyGutterCost + roofScrewsCost + insulationMaterialCost,
    laborEstimateThb: roofLabTotal + fasciaLaborCost + birdStopLaborCost + insulationLaborCost
  };
}

export function calculateStructureMaterials(params: StructureCalcParams): StructureCalcResult {
  const {
    columnCount,
    columnWidthM,
    columnDepthM,
    columnHeightM,
    columnMainBars,
    columnMainBarType,
    columnStirrupSpacingM,
    footings,
    beams,
    footingWidthM = 1.00,
    footingLengthM = 1.00,
    footingThicknessM = 0.30,
    footingBarType = 'DB12',
    footingBarSpacingM = 0.15,
    beamTotalLengthM = 75,
    beamWidthM = 0.20,
    beamDepthM = 0.40,
    beamMainBars = 4,
    beamMainBarType = 'DB12',
    beamStirrupSpacingM = 0.20,
    slabType,
    totalFloorAreaSqm,
    precastAreaSqm,
    castInPlaceAreaSqm,
    toppingThicknessCm,
    castInPlaceThicknessCm,
    wireMeshDiameterMm,
    castInPlaceRebarType,
    castInPlaceRebarSpacingM,
    pileType = 'bored_pile_35',
    pileLengthM = 20,
    pilesPerFooting = 1,
    excavationDepthM = 1.50,
    sandBeddingThicknessM = 0.05,
    leanConcreteThicknessM = 0.05
  } = params;

  let concreteFootingCuM = 0;
  let formworkFootingSqm = 0;
  let totalFootingDB12M = 0;
  let totalFootingDB16M = 0;
  const footingSummaryList: { code: string; count: number; concreteCuM: number; formworkSqm: number; steelKg: number }[] = [];

  const effectiveFootings: FootingItem[] = footings && footings.length > 0 
    ? footings 
    : [{
        id: 'f-default',
        code: 'F1',
        name: 'ฐานรากมาตรฐาน F1',
        count: columnCount,
        widthM: footingWidthM,
        lengthM: footingLengthM,
        thicknessM: footingThicknessM,
        barType: footingBarType,
        barSpacingM: footingBarSpacingM
      }];

  effectiveFootings.forEach(f => {
    const vol = f.widthM * f.lengthM * f.thicknessM * f.count;
    concreteFootingCuM += vol;
    const form = 2 * (f.widthM + f.lengthM) * f.thicknessM * f.count;
    formworkFootingSqm += form;

    const barsX = Math.floor(f.widthM / f.barSpacingM) + 1;
    const barsY = Math.floor(f.lengthM / f.barSpacingM) + 1;
    const lenX = f.lengthM + 0.30;
    const lenY = f.widthM + 0.30;

    const rebarM = f.count * ((barsX * lenX) + (barsY * lenY)) * 1.10;
    const weightPerM = f.barType === 'DB16' ? 1.58 : 0.888;
    const steelKg = Math.round(rebarM * weightPerM);

    if (f.barType === 'DB12') {
      totalFootingDB12M += rebarM;
    } else {
      totalFootingDB16M += rebarM;
    }

    footingSummaryList.push({
      code: f.code || 'F',
      count: f.count,
      concreteCuM: Math.round(vol * 100) / 100,
      formworkSqm: Math.round(form * 10) / 10,
      steelKg
    });
  });

  const singleColumnVol = columnWidthM * columnDepthM * columnHeightM;
  const concreteColumnCuM = singleColumnVol * columnCount;
  const colPerimeter = 2 * (columnWidthM + columnDepthM);
  const formworkColumnSqm = colPerimeter * columnHeightM * columnCount;

  const columnBarLength = columnHeightM + 1.00;
  const totalColumnMainM = columnCount * columnMainBars * columnBarLength * 1.08;
  let totalColDB12M = 0;
  let totalColDB16M = 0;
  if (columnMainBarType === 'DB12') totalColDB12M += totalColumnMainM;
  else totalColDB16M += totalColumnMainM;

  const colStirrupsPerCol = Math.floor(columnHeightM / columnStirrupSpacingM) + 1;
  const colStirrupPerimeter = (2 * (columnWidthM - 0.05) + 2 * (columnDepthM - 0.05)) + 0.15;
  const totalColStirrupM = columnCount * colStirrupsPerCol * colStirrupPerimeter;

  let concreteBeamCuM = 0;
  let formworkBeamSqm = 0;
  let totalBeamDB12M = 0;
  let totalBeamDB16M = 0;
  let totalBeamStirrupM = 0;
  const beamSummaryList: { code: string; lengthM: number; concreteCuM: number; formworkSqm: number; steelKg: number }[] = [];

  const effectiveBeams: BeamItem[] = beams && beams.length > 0 
    ? beams 
    : [{
        id: 'b-default',
        code: 'B1',
        name: 'คานมาตรฐาน B1',
        totalLengthM: beamTotalLengthM,
        widthM: beamWidthM,
        depthM: beamDepthM,
        mainBarsCount: beamMainBars,
        mainBarType: beamMainBarType,
        stirrupSpacingM: beamStirrupSpacingM
      }];

  effectiveBeams.forEach(b => {
    const vol = b.widthM * b.depthM * b.totalLengthM;
    concreteBeamCuM += vol;
    const form = ((2 * b.depthM) + b.widthM) * b.totalLengthM;
    formworkBeamSqm += form;

    const mainM = b.totalLengthM * b.mainBarsCount * 1.15;
    const weightPerM = b.mainBarType === 'DB16' ? 1.58 : 0.888;
    const steelKg = Math.round(mainM * weightPerM);

    if (b.mainBarType === 'DB12') {
      totalBeamDB12M += mainM;
    } else {
      totalBeamDB16M += mainM;
    }

    const stirrupCount = Math.floor(b.totalLengthM / b.stirrupSpacingM) + 1;
    const stirrupPerimeter = (2 * (b.widthM - 0.05) + 2 * (b.depthM - 0.05)) + 0.15;
    totalBeamStirrupM += (stirrupCount * stirrupPerimeter);

    beamSummaryList.push({
      code: b.code || 'B',
      lengthM: b.totalLengthM,
      concreteCuM: Math.round(vol * 100) / 100,
      formworkSqm: Math.round(form * 10) / 10,
      steelKg
    });
  });

  let effectivePrecastSqm = 0;
  let effectiveCastInPlaceSqm = 0;

  if (slabType === 'precast_plank') {
    effectivePrecastSqm = totalFloorAreaSqm;
    effectiveCastInPlaceSqm = 0;
  } else if (slabType === 'cast_in_place') {
    effectivePrecastSqm = 0;
    effectiveCastInPlaceSqm = totalFloorAreaSqm;
  } else {
    effectivePrecastSqm = precastAreaSqm;
    effectiveCastInPlaceSqm = castInPlaceAreaSqm;
  }

  const toppingThickM = toppingThicknessCm / 100;
  const concreteSlabToppingCuM = Math.round(effectivePrecastSqm * toppingThickM * 1.05 * 100) / 100;

  const castThickM = castInPlaceThicknessCm / 100;
  const concreteSlabCastInPlaceCuM = Math.round(effectiveCastInPlaceSqm * castThickM * 1.05 * 100) / 100;

  const concreteSlabTotalCuM = Math.round((concreteSlabToppingCuM + concreteSlabCastInPlaceCuM) * 100) / 100;
  const formworkSlabCastInPlaceSqm = effectiveCastInPlaceSqm;

  const totalConcreteCuM = Math.round((concreteFootingCuM + concreteColumnCuM + concreteBeamCuM + concreteSlabTotalCuM) * 1.05 * 100) / 100;
  const totalFormworkSqm = Math.round((formworkFootingSqm + formworkColumnSqm + formworkBeamSqm + formworkSlabCastInPlaceSqm) * 10) / 10;

  const cementBags50kg = Math.ceil(totalConcreteCuM * 7);
  const sandCuM = Math.round(totalConcreteCuM * 0.55 * 10) / 10;
  const rockCuM = Math.round(totalConcreteCuM * 1.02 * 10) / 10;

  const precastPlanksCount = effectivePrecastSqm > 0 ? Math.ceil((effectivePrecastSqm / 0.35) / 3.8) : 0;
  const wireMeshAreaSqm = Math.round(effectivePrecastSqm * 1.08 * 10) / 10;

  let slabCastRebarM = 0;
  if (effectiveCastInPlaceSqm > 0) {
    const barsPerMeter = Math.ceil(1 / castInPlaceRebarSpacingM);
    slabCastRebarM = effectiveCastInPlaceSqm * (barsPerMeter * 2 * 2) * 1.15;
  }
  const weightPerMeterSlabRebar = castInPlaceRebarType === 'DB12' ? 0.888 : 0.499;
  const slabCastRebarKg = Math.round(slabCastRebarM * weightPerMeterSlabRebar);
  const slabCastRebarBars = Math.ceil(slabCastRebarM / 10);

  let totalDB12M = totalFootingDB12M + totalColDB12M + totalBeamDB12M;
  let totalDB16M = totalFootingDB16M + totalColDB16M + totalBeamDB16M;

  if (castInPlaceRebarType === 'DB12') {
    totalDB12M += slabCastRebarM;
  }

  const db12Kg = Math.round(totalDB12M * 0.888);
  const db16Kg = Math.round(totalDB16M * 1.580);
  const db12Bars = Math.ceil(totalDB12M / 10);
  const db16Bars = Math.ceil(totalDB16M / 10);

  // 1. แยกคำนวณเหล็กปลอกเสา คสล. (Column Ties)
  const colStirrupsTotalPcs = columnCount * colStirrupsPerCol;
  const colStirrupTotalM = Math.round(totalColStirrupM * 1.08 * 10) / 10;
  const colStirrupKg = Math.round(colStirrupTotalM * 0.388); // RB6/RB9 เฉลี่ย ~0.388 กก./ม.
  const colStirrupBars = Math.ceil(colStirrupTotalM / 10);

  // 2. แยกคำนวณเหล็กปลอกคาน คสล. (Beam Stirrups)
  let beamStirrupsTotalPcs = 0;
  effectiveBeams.forEach(b => {
    beamStirrupsTotalPcs += (Math.floor(b.totalLengthM / b.stirrupSpacingM) + 1);
  });
  const beamStirrupTotalM = Math.round(totalBeamStirrupM * 1.08 * 10) / 10;
  const beamStirrupKg = Math.round(beamStirrupTotalM * 0.388);
  const beamStirrupBars = Math.ceil(beamStirrupTotalM / 10);

  // รวมเหล็กปลอกทั้งหมด
  const stirrupKg = colStirrupKg + beamStirrupKg;
  const stirrupBars = colStirrupBars + beamStirrupBars;
  const totalStirrupM = colStirrupTotalM + beamStirrupTotalM;

  const totalSteelKg = db12Kg + db16Kg + stirrupKg + (castInPlaceRebarType === 'RB9' ? slabCastRebarKg : 0);
  const tieWireKg = Math.max(5, Math.ceil(totalSteelKg * 0.02));

  const estConcreteMat = totalConcreteCuM * 2150;
  const estConcreteLab = totalConcreteCuM * 450;
  const estSteelMat = (totalSteelKg * 28.5) + (tieWireKg * 55);
  const estSteelLab = totalSteelKg * 7.5;
  // ไม้แบบคิดค่าเสื่อมการหมุนเวียนใช้ซ้ำ 3-4 ครั้ง (40% ของราคาไม้ใหม่ตามมาตรฐานกรมบัญชีกลาง)
  const estFormMat = Math.round(totalFormworkSqm * (150 * 0.40));
  // เผื่อระยะทาบ 40d-50d และงอขอเหล็กเสริม 12%
  const rebarLapAllowanceKg = Math.round((db12Kg + db16Kg) * 0.12);
  // ลูกปูนหนุนเหล็ก Covering 4.5 ลูก/ตร.ม. ไม้แบบ
  const concreteSpacersPcs = Math.ceil(totalFormworkSqm * 4.5);
  const estFormLab = totalFormworkSqm * 120;

  const wireMeshPricePerSqm = wireMeshDiameterMm === 6 ? 65 : 45;
  // --- คำนวณงานเสาเข็มและงานดินขุด (Earthwork & Piling) ---
  const totalFootingsCount = effectiveFootings.reduce((sum, f) => sum + (Number(f.count) || 0), 0) || columnCount;
  const totalFootingAreaSqm = effectiveFootings.reduce((sum, f) => sum + ((f.widthM || 1) * (f.lengthM || 1) * (Number(f.count) || 1)), 0);

  const isPiled = pileType !== 'spread_footing';
  const totalPilesCount = isPiled ? totalFootingsCount * (pilesPerFooting || 1) : 0;
  const effPileLen = isPiled ? (pileType === 'hex_pile_6m' ? 6 : (pileLengthM || 20)) : 0;
  const totalPileMeters = totalPilesCount * effPileLen;

  let pileUnitMat = 0;
  let pileUnitLab = 0;
  if (pileType === 'bored_pile_35') {
    pileUnitMat = 650;
    pileUnitLab = 280;
  } else if (pileType === 'driven_pile_i22') {
    pileUnitMat = 280;
    pileUnitLab = 95;
  } else if (pileType === 'driven_pile_i18') {
    pileUnitMat = 230;
    pileUnitLab = 85;
  } else if (pileType === 'micro_pile_i20') {
    pileUnitMat = 1100;
    pileUnitLab = 350;
  } else if (pileType === 'hex_pile_6m') {
    pileUnitMat = 380 / 6;
    pileUnitLab = 120 / 6;
  }

  const pileMaterialCost = Math.round(totalPileMeters * pileUnitMat);
  const pileLaborCost = Math.round(totalPileMeters * pileUnitLab);
  const pileCutOffCost = isPiled ? totalPilesCount * 220 : 0;

  // ดินขุดฐานราก + คานคอดิน (เผื่อขอบหลุมเข้าแบบ +0.30 ม. แต่ละด้าน)
  const footingExcavationCuM = effectiveFootings.reduce((sum, f) => {
    const pitW = (f.widthM || 1) + 0.60;
    const pitL = (f.lengthM || 1) + 0.60;
    return sum + (pitW * pitL * (excavationDepthM || 1.50) * (Number(f.count) || 1));
  }, 0);

  const beamExcavationCuM = effectiveBeams.reduce((sum, b) => {
    return sum + ((b.totalLengthM || 0) * ((b.widthM || 0.20) + 0.20) * ((b.depthM || 0.40) + 0.10));
  }, 0);

  const excavationCuM = Math.round((footingExcavationCuM + beamExcavationCuM) * 10) / 10;
  const backfillCuM = Math.max(0, Math.round((excavationCuM - concreteFootingCuM - (concreteBeamCuM * 0.7)) * 10) / 10);

  const sandBeddingCuM = Math.round(totalFootingAreaSqm * (sandBeddingThicknessM || 0.05) * 100) / 100;
  const leanConcreteCuM = Math.round(totalFootingAreaSqm * (leanConcreteThicknessM || 0.05) * 100) / 100;

  const estPrecastPlanksMat = effectivePrecastSqm * 240;
  const estPrecastPlanksLab = effectivePrecastSqm * 55;
  const estWireMeshMat = wireMeshAreaSqm * wireMeshPricePerSqm;
  const estWireMeshLab = wireMeshAreaSqm * 15;
  const slabExtraMat = estPrecastPlanksMat + estWireMeshMat;
  const slabExtraLab = estPrecastPlanksLab + estWireMeshLab;

  return {
    concreteFootingCuM: Math.round(concreteFootingCuM * 100) / 100,
    concreteColumnCuM: Math.round(concreteColumnCuM * 100) / 100,
    concreteBeamCuM: Math.round(concreteBeamCuM * 100) / 100,
    concreteSlabToppingCuM,
    concreteSlabCastInPlaceCuM,
    concreteSlabTotalCuM,
    totalConcreteCuM,
    cementBags50kg,
    sandCuM,
    rockCuM,
    concreteSpacersPcs,
    rebarLapAllowanceKg,
    colStirrupPcs: colStirrupsTotalPcs,
    colStirrupM: colStirrupTotalM,
    colStirrupKg,
    colStirrupBars,
    beamStirrupPcs: beamStirrupsTotalPcs,
    beamStirrupM: beamStirrupTotalM,
    beamStirrupKg,
    beamStirrupBars,
    formworkFootingSqm: Math.round(formworkFootingSqm * 10) / 10,
    formworkColumnSqm: Math.round(formworkColumnSqm * 10) / 10,
    formworkBeamSqm: Math.round(formworkBeamSqm * 10) / 10,
    formworkSlabCastInPlaceSqm: Math.round(formworkSlabCastInPlaceSqm * 10) / 10,
    totalFormworkSqm,
    db12Kg,
    db12Bars,
    db16Kg,
    db16Bars,
    stirrupKg,
    stirrupBars,
    precastPlanksCount,
    wireMeshAreaSqm,
    slabCastRebarKg,
    slabCastRebarBars,
    tieWireKg,
    estMaterialCost: Math.round(estConcreteMat + estSteelMat + estFormMat + slabExtraMat),
    estLaborCost: Math.round(estConcreteLab + estSteelLab + estFormLab + slabExtraLab),
    footingSummaryList,
    beamSummaryList,
    totalFootingsCount,
    totalPilesCount,
    totalPileMeters,
    pileMaterialCost,
    pileLaborCost,
    pileCutOffCost,
    excavationCuM,
    backfillCuM,
    sandBeddingCuM,
    leanConcreteCuM
  };
}

export function computeBOQSummary(items: BOQItem[], overheadPercent: number = 7, vatPercent: number = 7) {
  let totalMaterial = 0;
  let totalLabor = 0;

  items.forEach(item => {
    const wasteMultiplier = 1 + (item.wastePercent / 100);
    const itemMat = item.quantity * item.materialUnitPrice * wasteMultiplier;
    const itemLab = item.quantity * item.laborUnitPrice;
    totalMaterial += itemMat;
    totalLabor += itemLab;
  });

  const directCost = totalMaterial + totalLabor;
  const overheadCost = directCost * (overheadPercent / 100);
  const subtotalWithOverhead = directCost + overheadCost;
  const vatAmount = subtotalWithOverhead * (vatPercent / 100);
  const grandTotal = subtotalWithOverhead + vatAmount;

  return {
    totalMaterial: Math.round(totalMaterial),
    totalLabor: Math.round(totalLabor),
    directCost: Math.round(directCost),
    overheadCost: Math.round(overheadCost),
    vatAmount: Math.round(vatAmount),
    grandTotal: Math.round(grandTotal),
  };
}
