import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WallMasonryType, MasonryWallZone, BOQItem } from '../types';
import { calculateMasonryMaterials } from '../services/calculator';

interface MasonryEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToBOQ: (newItems: BOQItem[], mode?: 'replace' | 'append') => void;
  currentHouseAreaSqm: number;
  existingMasonryItems?: BOQItem[];
}

const BRICK_META: Record<
  WallMasonryType,
  {
    label: string;
    shortLabel: string;
    sub: string;
    icon: string;
    badgeClass: string;
    dotClass: string;
    thicknessOptions: { cm: number; label: string }[];
  }
> = {
  aac_block: {
    label: 'อิฐมวลเบา (AAC)',
    shortLabel: 'มวลเบา',
    sub: 'กันร้อน น้ำหนักเบา ก่อไว',
    icon: 'layers',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    dotClass: 'bg-sky-400',
    thicknessOptions: [
      { cm: 7.5, label: '7.5 ซม. (มาตรฐาน)' },
      { cm: 10.0, label: '10 ซม. (หนาพิเศษ/กันเสียง)' }
    ]
  },
  red_brick: {
    label: 'อิฐแดง / อิฐมอญ',
    shortLabel: 'อิฐแดง',
    sub: 'เจาะแขวนแน่น ทนชื้นดี',
    icon: 'square',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    dotClass: 'bg-amber-400',
    thicknessOptions: [
      { cm: 7.0, label: '7 ซม. (ก่อครึ่งแผ่น)' },
      { cm: 15.0, label: '15 ซม. (ก่อ 2 ชั้นเต็มแผ่น)' }
    ]
  },
  concrete_block: {
    label: 'คอนกรีตบล็อก',
    shortLabel: 'อิฐบล็อก',
    sub: 'ประหยัด ก่อผนังโรงรถ/รั้ว',
    icon: 'view_module',
    badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    dotClass: 'bg-slate-400',
    thicknessOptions: [
      { cm: 7.0, label: '7 ซม. (มาตรฐาน)' },
      { cm: 9.0, label: '9 ซม. (หนาพิเศษ)' }
    ]
  }
};

const ZONE_NAME_SUGGESTIONS = [
  'ห้องนอน / โถงทั่วไป',
  'ห้องน้ำ / ห้องครัว',
  'ผนังภายนอก / กันเสียง',
  'โรงรถ / ห้องเก็บของ',
  'ผนังตกแต่งโชว์แนว'
];

const createZoneId = () => `zone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function getZonePerSqmPrices(zone: MasonryWallZone): { materialUnitPrice: number; laborUnitPrice: number } {
  if (zone.brickType === 'red_brick') {
    const isDoubleWall = zone.wallThicknessCm >= 14;
    return isDoubleWall
      ? { materialUnitPrice: 486, laborUnitPrice: 210 }
      : { materialUnitPrice: 249, laborUnitPrice: 120 };
  }
  if (zone.brickType === 'concrete_block') {
    const isThick9cm = zone.wallThicknessCm >= 9;
    return isThick9cm
      ? { materialUnitPrice: 174, laborUnitPrice: 95 }
      : { materialUnitPrice: 140, laborUnitPrice: 85 };
  }
  const isThick10cm = zone.wallThicknessCm >= 10;
  return isThick10cm
    ? { materialUnitPrice: 308, laborUnitPrice: 105 }
    : { materialUnitPrice: 233, laborUnitPrice: 95 };
}

export const MasonryEstimatorModal: React.FC<MasonryEstimatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToBOQ,
  currentHouseAreaSqm,
  existingMasonryItems = []
}) => {
  const defaultTotalWallArea = Math.max(20, Math.round((currentHouseAreaSqm || 120) * 1.75));

  const buildSingleDefaultZones = (totalArea: number): MasonryWallZone[] => [
    {
      id: createZoneId(),
      zoneName: 'ผนังหลักทั้งหลัง',
      brickType: 'aac_block',
      wallAreaSqm: totalArea,
      openingsCount: 12,
      avgOpeningWidthM: 1.2,
      wallThicknessCm: 7.5,
      plasterSides: 2,
      includeLintel: true
    }
  ];

  const buildHybridDefaultZones = (totalArea: number): MasonryWallZone[] => {
    const mainArea = Math.max(10, Math.round(totalArea * 0.7));
    const wetArea = Math.max(10, totalArea - mainArea);
    return [
      {
        id: createZoneId(),
        zoneName: 'ห้องนอน / โถงทั่วไป',
        brickType: 'aac_block',
        wallAreaSqm: mainArea,
        openingsCount: 9,
        avgOpeningWidthM: 1.3,
        wallThicknessCm: 7.5,
        plasterSides: 2,
        includeLintel: true
      },
      {
        id: createZoneId(),
        zoneName: 'ห้องน้ำ / ห้องครัว',
        brickType: 'red_brick',
        wallAreaSqm: wetArea,
        openingsCount: 4,
        avgOpeningWidthM: 0.9,
        wallThicknessCm: 7.0,
        plasterSides: 2,
        includeLintel: true
      }
    ];
  };

  const [zones, setZones] = useState<MasonryWallZone[]>(() => buildSingleDefaultZones(defaultTotalWallArea));
  const [activeZoneId, setActiveZoneId] = useState<string>(() => zones[0]?.id || '');
  const [splitSupportByZone, setSplitSupportByZone] = useState<boolean>(true);
  const wasOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setZones(prev => {
        if (prev.length === 1 && prev[0].zoneName === 'ผนังหลักทั้งหลัง') {
          const refreshed = [{ ...prev[0], wallAreaSqm: defaultTotalWallArea }];
          setActiveZoneId(refreshed[0].id);
          return refreshed;
        }
        if (!prev.some(z => z.id === activeZoneId) && prev[0]) {
          setActiveZoneId(prev[0].id);
        }
        return prev;
      });
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, defaultTotalWallArea, activeZoneId]);

  const activeZone = useMemo(
    () => zones.find(z => z.id === activeZoneId) || zones[0],
    [zones, activeZoneId]
  );

  const zoneCalculations = useMemo(() => {
    return zones.map(zone => {
      const safeArea = Math.max(0, Number(zone.wallAreaSqm) || 0);
      const calc = calculateMasonryMaterials({
        brickType: zone.brickType,
        wallAreaSqm: safeArea,
        openingsCount: zone.includeLintel ? Math.max(0, zone.openingsCount) : 0,
        avgOpeningWidthM: zone.avgOpeningWidthM,
        wallThicknessCm: zone.wallThicknessCm,
        plasterSides: zone.plasterSides
      });
      if (!zone.includeLintel) {
        return {
          zone,
          calc: {
            ...calc,
            lintelLengthM: 0,
            lintelConcreteCuM: 0,
            lintelCementBags50kg: 0,
            lintelCoarseSandCuM: 0,
            lintelRockCuM: 0,
            lintelRebarKg: 0,
            lintelRebarBars: 0,
            wireMeshOrDowelQty: 0
          }
        };
      }
      return { zone, calc };
    });
  }, [zones]);

  const totals = useMemo(() => {
    const brickBreakdown: Record<WallMasonryType, { count: number; area: number }> = {
      aac_block: { count: 0, area: 0 },
      red_brick: { count: 0, area: 0 },
      concrete_block: { count: 0, area: 0 }
    };

    let totalWallAreaSqm = 0;
    let totalMortarBags50kg = 0;
    let totalMasonrySandCuM = 0;
    let totalPlasterAreaSqm = 0;
    let totalPlasterBags50kg = 0;
    let totalPlasterFineSandCuM = 0;
    let totalLintelLengthM = 0;
    let totalLintelConcreteCuM = 0;
    let totalLintelCementBags50kg = 0;
    let totalLintelCoarseSandCuM = 0;
    let totalLintelRockCuM = 0;
    let totalLintelRebarBars = 0;
    let totalLintelRebarKg = 0;
    let totalWireMeshOrDowelQty = 0;
    let totalOpenings = 0;
    let totalMaterialCost = 0;
    let totalLaborCost = 0;

    zoneCalculations.forEach(({ zone, calc }) => {
      const area = Math.max(0, Number(zone.wallAreaSqm) || 0);
      totalWallAreaSqm += area;
      totalMortarBags50kg += calc.mortarBags50kg;
      totalMasonrySandCuM += calc.masonrySandCuM;
      totalPlasterAreaSqm += area * Math.max(0, zone.plasterSides);
      totalPlasterBags50kg += calc.plasterBags50kg;
      totalPlasterFineSandCuM += calc.plasterFineSandCuM || 0;
      totalLintelLengthM += calc.lintelLengthM;
      totalLintelConcreteCuM += calc.lintelConcreteCuM;
      totalLintelCementBags50kg += calc.lintelCementBags50kg || 0;
      totalLintelCoarseSandCuM += calc.lintelCoarseSandCuM || 0;
      totalLintelRockCuM += calc.lintelRockCuM || 0;
      totalLintelRebarBars += calc.lintelRebarBars;
      totalLintelRebarKg += calc.lintelRebarKg;
      totalWireMeshOrDowelQty += calc.wireMeshOrDowelQty;
      if (zone.includeLintel) {
        totalOpenings += Math.max(0, zone.openingsCount);
      }

      brickBreakdown[zone.brickType].count += calc.brickCount;
      brickBreakdown[zone.brickType].area += area;

      totalMaterialCost += calc.estMaterialCost;
      totalLaborCost += calc.estLaborCost;
    });

    return {
      brickBreakdown,
      totalWallAreaSqm: Math.round(totalWallAreaSqm * 10) / 10,
      totalMortarBags50kg,
      totalMasonrySandCuM: Math.round(totalMasonrySandCuM * 100) / 100,
      totalPlasterAreaSqm: Math.round(totalPlasterAreaSqm * 10) / 10,
      totalPlasterBags50kg,
      totalPlasterFineSandCuM: Math.round(totalPlasterFineSandCuM * 100) / 100,
      totalLintelLengthM: Math.round(totalLintelLengthM * 10) / 10,
      totalLintelConcreteCuM: Math.round(totalLintelConcreteCuM * 100) / 100,
      totalLintelCementBags50kg,
      totalLintelCoarseSandCuM: Math.round(totalLintelCoarseSandCuM * 100) / 100,
      totalLintelRockCuM: Math.round(totalLintelRockCuM * 100) / 100,
      totalCoarseSandAllCuM: Math.round((totalMasonrySandCuM + totalLintelCoarseSandCuM) * 100) / 100,
      totalLintelRebarBars,
      totalLintelRebarKg,
      totalWireMeshOrDowelQty,
      totalOpenings,
      totalMaterialCost,
      totalLaborCost
    };
  }, [zoneCalculations]);

  if (!isOpen) return null;

  const updateActiveZone = (patch: Partial<MasonryWallZone>) => {
    if (!activeZone) return;
    setZones(prev => prev.map(z => (z.id === activeZone.id ? { ...z, ...patch } : z)));
  };

  const handleAddPresetZone = (preset: 'aac' | 'red_single' | 'red_double' | 'concrete') => {
    const newId = createZoneId();
    let newZone: MasonryWallZone;
    if (preset === 'aac') {
      newZone = {
        id: newId,
        zoneName: 'ห้องนอน / โถงทั่วไป',
        brickType: 'aac_block',
        wallAreaSqm: 60,
        openingsCount: 5,
        avgOpeningWidthM: 1.2,
        wallThicknessCm: 7.5,
        plasterSides: 2,
        includeLintel: true
      };
    } else if (preset === 'red_single') {
      newZone = {
        id: newId,
        zoneName: 'ห้องน้ำ / ห้องครัว',
        brickType: 'red_brick',
        wallAreaSqm: 45,
        openingsCount: 3,
        avgOpeningWidthM: 0.9,
        wallThicknessCm: 7.0,
        plasterSides: 2,
        includeLintel: true
      };
    } else if (preset === 'red_double') {
      newZone = {
        id: newId,
        zoneName: 'ผนังภายนอก / กันเสียง (ก่อ 2 ชั้น)',
        brickType: 'red_brick',
        wallAreaSqm: 40,
        openingsCount: 3,
        avgOpeningWidthM: 1.5,
        wallThicknessCm: 15.0,
        plasterSides: 2,
        includeLintel: true
      };
    } else {
      newZone = {
        id: newId,
        zoneName: 'โรงรถ / ห้องเก็บของ',
        brickType: 'concrete_block',
        wallAreaSqm: 35,
        openingsCount: 2,
        avgOpeningWidthM: 1.0,
        wallThicknessCm: 7.0,
        plasterSides: 2,
        includeLintel: true
      };
    }
    setZones(prev => [...prev, newZone]);
    setActiveZoneId(newId);
  };

  const handleRemoveZone = (zoneId: string) => {
    if (zones.length <= 1) return;
    setZones(prev => {
      const next = prev.filter(z => z.id !== zoneId);
      if (activeZoneId === zoneId && next[0]) {
        setActiveZoneId(next[0].id);
      }
      return next;
    });
  };

  const handleApplyHybridPreset = () => {
    const next = buildHybridDefaultZones(defaultTotalWallArea);
    setZones(next);
    setActiveZoneId(next[0].id);
  };

  const buildBOQItems = (): BOQItem[] => {
    const timestamp = Date.now();
    const safeHouseArea = currentHouseAreaSqm > 0 ? currentHouseAreaSqm : 1;
    const newItems: BOQItem[] = [];
    const showZoneTag = zones.length > 1;

    zoneCalculations.forEach(({ zone, calc }, idx) => {
      const area = Math.max(0, Number(zone.wallAreaSqm) || 0);
      if (area <= 0) return;

      const zoneSuffix = showZoneTag ? ` — [${zone.zoneName || `โซน ${idx + 1}`}]` : '';
      const isRedDouble = zone.brickType === 'red_brick' && zone.wallThicknessCm >= 14;

      const brickName =
        zone.brickType === 'red_brick'
          ? isRedDouble
            ? `งานก่ออิฐมอญ/อิฐแดง 2 ชั้น (เต็มแผ่น ${zone.wallThicknessCm} ซม.)${zoneSuffix}`
            : `งานก่ออิฐมอญ/อิฐแดง 2 รู (ครึ่งแผ่น ${zone.wallThicknessCm} ซม.)${zoneSuffix}`
          : zone.brickType === 'concrete_block'
          ? `งานก่อผนังคอนกรีตบล็อก (หนา ${zone.wallThicknessCm} ซม.)${zoneSuffix}`
          : `งานก่อผนังอิฐมวลเบา (AAC หนา ${zone.wallThicknessCm} ซม.)${zoneSuffix}`;

      const brickSpec =
        zone.brickType === 'red_brick'
          ? `ใช้อิฐแดง ~${calc.brickCount.toLocaleString()} ก้อน + ปูนก่อ ${calc.mortarBags50kg} ถุง + ทราย ${calc.masonrySandCuM} คิว`
          : zone.brickType === 'concrete_block'
          ? `ใช้อิฐบล็อก ~${calc.brickCount.toLocaleString()} ก้อน + ปูนก่อ ${calc.mortarBags50kg} ถุง + ทราย ${calc.masonrySandCuM} คิว`
          : `ใช้อิฐมวลเบา ~${calc.brickCount.toLocaleString()} ก้อน + ปูนกาวมวลเบา ${calc.mortarBags50kg} ถุง`;

      const { materialUnitPrice, laborUnitPrice } = getZonePerSqmPrices(zone);

      newItems.push({
        id: `wall-brick-${zone.brickType}-${idx}-${timestamp}`,
        category: 'masonry_wall',
        name: brickName,
        spec: brickSpec,
        quantity: area,
        unit: 'ตร.ม.',
        materialUnitPrice,
        laborUnitPrice,
        wastePercent: 7,
        basePerSqm: area / safeHouseArea
      });

      if (splitSupportByZone) {
        if (zone.includeLintel && calc.lintelLengthM > 0) {
          newItems.push({
            id: `wall-lintel-${idx}-${timestamp}`,
            category: 'masonry_wall',
            name: `งานเสาเอ็น & คานทับหลัง คสล. (รอบวงกบ ${zone.openingsCount} ช่อง)${zoneSuffix}`,
            spec: `ยาว ${calc.lintelLengthM} ม. (ปูน ${calc.lintelCementBags50kg || 0} กระสอบ + ทรายหยาบ ${calc.lintelCoarseSandCuM || 0} คิว + หิน ${calc.lintelRockCuM || 0} คิว + เหล็ก ${calc.lintelRebarBars} เส้น)`,
            quantity: calc.lintelLengthM,
            unit: 'ม.',
            materialUnitPrice: 115,
            laborUnitPrice: 90,
            wastePercent: 5,
            basePerSqm: calc.lintelLengthM / safeHouseArea
          });
        }

        if (zone.plasterSides > 0) {
          const plasterArea = Math.round(area * zone.plasterSides * 10) / 10;
          newItems.push({
            id: `wall-plaster-${idx}-${timestamp}`,
            category: 'masonry_wall',
            name: `งานฉาบปูนผิวผนัง (${zone.plasterSides === 2 ? 'ฉาบ 2 ด้าน' : 'ฉาบด้านเดียว'})${zoneSuffix}`,
            spec: `พื้นที่ฉาบ ${plasterArea} ตร.ม. (ปูนฉาบ ${calc.plasterBags50kg} กระสอบ + ทรายละเอียด ${calc.plasterFineSandCuM || 0} คิว หนา 1.5 ซม.)`,
            quantity: plasterArea,
            unit: 'ตร.ม.',
            materialUnitPrice: 90,
            laborUnitPrice: 95,
            wastePercent: 5,
            basePerSqm: plasterArea / safeHouseArea
          });
        }
      }
    });

    if (!splitSupportByZone) {
      if (totals.totalLintelLengthM > 0) {
        newItems.push({
          id: `wall-lintel-all-${timestamp}`,
          category: 'masonry_wall',
          name: `งานเสาเอ็น & คานทับหลัง คสล. รวมทุกโซน (รอบวงกบ ${totals.totalOpenings} ช่อง)`,
          spec: `ยาวรวม ${totals.totalLintelLengthM} ม. (ปูน ${totals.totalLintelCementBags50kg} กระสอบ + ทรายหยาบ ${totals.totalLintelCoarseSandCuM} คิว + หิน ${totals.totalLintelRockCuM} คิว + เหล็ก ${totals.totalLintelRebarBars} เส้น)`,
          quantity: totals.totalLintelLengthM,
          unit: 'ม.',
          materialUnitPrice: 115,
          laborUnitPrice: 90,
          wastePercent: 5,
          basePerSqm: totals.totalLintelLengthM / safeHouseArea
        });
      }

      if (totals.totalPlasterAreaSqm > 0) {
        newItems.push({
          id: `wall-plaster-all-${timestamp}`,
          category: 'masonry_wall',
          name: `งานฉาบปูนผิวผนัง รวมทุกโซน`,
          spec: `พื้นที่ฉาบรวม ${totals.totalPlasterAreaSqm} ตร.ม. (ปูนฉาบ ${totals.totalPlasterBags50kg} กระสอบ + ทรายละเอียด ${totals.totalPlasterFineSandCuM} คิว หนา 1.5 ซม.)`,
          quantity: totals.totalPlasterAreaSqm,
          unit: 'ตร.ม.',
          materialUnitPrice: 90,
          laborUnitPrice: 95,
          wastePercent: 5,
          basePerSqm: totals.totalPlasterAreaSqm / safeHouseArea
        });
      }
    }

    return newItems;
  };

  const handleApply = (mode: 'replace' | 'append') => {
    const newItems = buildBOQItems();
    if (newItems.length === 0) return;
    onApplyToBOQ(newItems, mode);
    onClose();
  };

  const activeMeta = activeZone ? BRICK_META[activeZone.brickType] : BRICK_META.aac_block;
  const activeCalcItem = zoneCalculations.find(z => z.zone.id === activeZone?.id);
  const canApply = totals.totalWallAreaSqm > 0;
  const hasExistingItems = existingMasonryItems.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[93vh] overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-500 text-2xl">handyman</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                คำนวณงานก่อฉาบผนังหลายโซน & ชนิดอิฐผสม (Multi-Zone Masonry)
              </h2>
              <p className="text-xs text-slate-400">
                แยกโซนได้อิสระ เช่น ห้องนอน/โถงใช้อิฐมวลเบา + ห้องน้ำ/ครัวใช้อิฐแดง + ก่อ 2 ชั้น หรือโรงรถใช้อิฐบล็อก ไม่ทับซ้อนกัน
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 mr-1">
                <span className="material-symbols-outlined text-sm">workspaces</span>
                โซนผนัง ({zones.length}):
              </span>
              {zones.map((z, idx) => {
                const isSelected = z.id === activeZone?.id;
                const meta = BRICK_META[z.brickType];
                return (
                  <div
                    key={z.id}
                    className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl border text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white font-semibold shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                    onClick={() => setActiveZoneId(z.id)}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dotClass}`} />
                    <span className="max-w-[140px] truncate">{z.zoneName || `โซน ${idx + 1}`}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950/70 text-slate-300 font-mono">
                      {meta.shortLabel} {z.wallAreaSqm}ตร.ม.
                    </span>
                    {zones.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveZone(z.id);
                        }}
                        title="ลบโซนนี้"
                        className="p-0.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <span className="material-symbols-outlined text-sm leading-none">close</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {zones.length === 1 && (
              <button
                type="button"
                onClick={handleApplyHybridPreset}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 flex items-center gap-1 transition"
              >
                <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                แบ่ง 2 ชนิดอัตโนมัติ (มวลเบา 70% + อิฐแดง 30%)
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 mr-1">+ เพิ่มโซนผนัง:</span>
            <button type="button" onClick={() => handleAddPresetZone('aac')} className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 transition flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">add</span> อิฐมวลเบา (ห้องนอน/โถง)
            </button>
            <button type="button" onClick={() => handleAddPresetZone('red_single')} className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 transition flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">add</span> อิฐแดง (ห้องน้ำ/ครัว)
            </button>
            <button type="button" onClick={() => handleAddPresetZone('red_double')} className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-orange-300 transition flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">add</span> อิฐแดง 2 ชั้น (กันเสียง/ภายนอก)
            </button>
            <button type="button" onClick={() => handleAddPresetZone('concrete')} className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">add</span> คอนกรีตบล็อก (โรงรถ/เก็บของ)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {activeZone && (
            <div className="lg:col-span-5 flex flex-col gap-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">tune</span>
                  ตั้งค่าโซน: {activeZone.zoneName || 'โซนปัจจุบัน'}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${activeMeta.badgeClass}`}>
                  {activeMeta.shortLabel}
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">ชื่อโซน / บริเวณผนัง</label>
                <input
                  type="text"
                  value={activeZone.zoneName}
                  onChange={(e) => updateActiveZone({ zoneName: e.target.value })}
                  placeholder="เช่น ห้องน้ำ-ครัว, ห้องนอนชั้นบน, ผนังกันเสียง"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ZONE_NAME_SUGGESTIONS.map(tag => (
                    <button key={tag} type="button" onClick={() => updateActiveZone({ zoneName: tag })} className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-medium">ชนิดอิฐก่อผนัง</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['aac_block', 'red_brick', 'concrete_block'] as WallMasonryType[]).map(typeKey => {
                    const item = BRICK_META[typeKey];
                    const selected = activeZone.brickType === typeKey;
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => {
                          const defaultThick = BRICK_META[typeKey].thicknessOptions[0].cm;
                          updateActiveZone({ brickType: typeKey, wallThicknessCm: defaultThick });
                        }}
                        className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition ${
                          selected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-md'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg mb-1">{item.icon}</span>
                        <span className="text-xs">{item.label}</span>
                        <span className="text-[10px] opacity-75 mt-0.5 leading-tight">{item.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-medium">ความหนา / รูปแบบการก่อ</label>
                <div className="grid grid-cols-2 gap-2">
                  {activeMeta.thicknessOptions.map(opt => (
                    <button
                      key={opt.cm}
                      type="button"
                      onClick={() => updateActiveZone({ wallThicknessCm: opt.cm })}
                      className={`py-2 px-2.5 text-xs rounded-lg border font-medium transition ${
                        Math.abs(activeZone.wallThicknessCm - opt.cm) < 0.5
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-300 font-medium">พื้นที่ผนังโซนนี้ (หักช่องเปิดสุทธิ)</label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    คิดเป็น {totals.totalWallAreaSqm > 0 ? Math.round((activeZone.wallAreaSqm / totals.totalWallAreaSqm) * 100) : 0}% ของผนังทั้งหมด
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 focus-within:border-amber-400">
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    step="1"
                    value={activeZone.wallAreaSqm}
                    onChange={(e) => updateActiveZone({ wallAreaSqm: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-transparent text-sm font-bold font-mono text-amber-400 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 shrink-0">ตร.ม.</span>
                </div>
              </div>

              <div className="border border-slate-800 bg-slate-900/60 p-3 rounded-xl flex flex-col gap-2.5">
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">fence</span>
                    เสาเอ็น & คานทับหลัง คสล. (โซนนี้)
                  </span>
                  <input
                    type="checkbox"
                    checked={activeZone.includeLintel}
                    onChange={(e) => updateActiveZone({ includeLintel: e.target.checked })}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </label>

                {activeZone.includeLintel ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">จำนวนช่องเปิด (ช่อง)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={activeZone.openingsCount}
                        onChange={(e) => updateActiveZone({ openingsCount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">ประตู + หน้าต่างในโซน</span>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">ความกว้างเฉลี่ย (ม.)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="5.0"
                        value={activeZone.avgOpeningWidthM}
                        onChange={(e) => updateActiveZone({ avgOpeningWidthM: parseFloat(e.target.value) || 1.2 })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">สำหรับคานทับหลังพาดขอบ</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    ปิดไว้: ไม่สร้างรายการเสาเอ็น-ทับหลังสำหรับโซนนี้ (เหมาะสำหรับผนังย่อยหรือโซนที่นับรวมไว้แล้ว)
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-medium">การฉาบปูนผนังโซนนี้</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { sides: 2 as const, label: 'ฉาบ 2 ด้าน' },
                    { sides: 1 as const, label: 'ฉาบ 1 ด้าน' },
                    { sides: 0 as const, label: 'ไม่ฉาบ (โชว์แนว)' }
                  ].map(opt => (
                    <button
                      key={opt.sides}
                      type="button"
                      onClick={() => updateActiveZone({ plasterSides: opt.sides })}
                      className={`py-2 px-2 text-xs rounded-lg border font-medium transition ${
                        activeZone.plasterSides === opt.sides
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 block mb-1">อิฐแยกชนิด (พท. {totals.totalWallAreaSqm.toLocaleString()} ตร.ม.)</span>
                <div className="flex flex-col gap-0.5 text-xs font-mono">
                  {totals.brickBreakdown.aac_block.count > 0 && (
                    <span className="text-sky-300 font-bold">มวลเบา {totals.brickBreakdown.aac_block.count.toLocaleString()} ก้อน</span>
                  )}
                  {totals.brickBreakdown.red_brick.count > 0 && (
                    <span className="text-amber-400 font-bold">อิฐแดง {totals.brickBreakdown.red_brick.count.toLocaleString()} ก้อน</span>
                  )}
                  {totals.brickBreakdown.concrete_block.count > 0 && (
                    <span className="text-slate-300 font-bold">อิฐบล็อก {totals.brickBreakdown.concrete_block.count.toLocaleString()} ก้อน</span>
                  )}
                  {totals.totalWallAreaSqm === 0 && <span className="text-slate-500">0 ก้อน</span>}
                </div>
              </div>
              <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 block mb-1">ปูนสั่งซื้อ (กระสอบ 50 กก.)</span>
                <div className="flex flex-col gap-0.5 text-[11px] font-mono">
                  <span className="text-orange-300 font-bold">ก่อ: {totals.totalMortarBags50kg} กระสอบ</span>
                  <span className="text-cyan-300 font-bold">ทับหลัง: {totals.totalLintelCementBags50kg} กระสอบ</span>
                  <span className="text-emerald-300 font-bold">ฉาบ: {totals.totalPlasterBags50kg} กระสอบ</span>
                </div>
              </div>
              <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 block mb-1">ทรายหยาบ (ก่อ+ทับหลัง)</span>
                <span className="text-xl font-bold font-mono text-amber-300">{totals.totalCoarseSandAllCuM}</span>
                <span className="text-xs text-slate-400 ml-1">คิว</span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  ก่อ {totals.totalMasonrySandCuM} + ทับหลัง {totals.totalLintelCoarseSandCuM}
                </span>
              </div>
              <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 block mb-1">ทรายละเอียด (งานฉาบ)</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{totals.totalPlasterFineSandCuM}</span>
                <span className="text-xs text-slate-400 ml-1">คิว</span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  พท.ฉาบ {totals.totalPlasterAreaSqm} ตร.ม.
                </span>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col">
              <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2 text-xs">
                <span className="font-semibold text-slate-200">
                  รายละเอียดถอดวัสดุแต่ละโซน & ยอดรวมทั้งหลัง
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={splitSupportByZone}
                    onChange={(e) => setSplitSupportByZone(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-400 rounded"
                  />
                  <span>แยกแถวเสาเอ็น-ทับหลังและฉาบปูนตามโซน (แก้ไขใน BOQ ได้อิสระ)</span>
                </label>
              </div>

              <div className="p-4 flex flex-col gap-3 text-xs overflow-y-auto max-h-[380px]">
                <div className="flex flex-col gap-2">
                  {zoneCalculations.map(({ zone, calc }, idx) => {
                    const meta = BRICK_META[zone.brickType];
                    const isSelected = zone.id === activeZone?.id;
                    return (
                      <div
                        key={zone.id}
                        onClick={() => setActiveZoneId(zone.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-amber-500/60 shadow-sm'
                            : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${meta.dotClass}`} />
                            <span className="font-bold text-white">{zone.zoneName || `โซน ${idx + 1}`}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                              {meta.label} {zone.wallThicknessCm} ซม.
                            </span>
                          </div>
                          <span className="font-mono font-bold text-amber-400">{zone.wallAreaSqm.toLocaleString()} ตร.ม.</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400">
                          <div>อิฐ: <span className="text-slate-200 font-mono font-semibold">{calc.brickCount.toLocaleString()}</span> ก้อน</div>
                          <div>ปูนก่อ: <span className="text-orange-300 font-mono font-semibold">{calc.mortarBags50kg}</span> กระสอบ{calc.masonrySandCuM > 0 && ` / ทรายหยาบ ${calc.masonrySandCuM} คิว`}</div>
                          <div>เสาเอ็น: <span className="text-cyan-300 font-mono font-semibold">{zone.includeLintel ? `${calc.lintelCementBags50kg || 0} กส. / ทรายหยาบ ${calc.lintelCoarseSandCuM || 0} คิว` : 'ไม่รวม'}</span></div>
                          <div>ฉาบ: <span className="text-emerald-300 font-mono font-semibold">{zone.plasterSides === 0 ? 'ไม่ฉาบ' : `${calc.plasterBags50kg} กส. / ทรายละเอียด ${calc.plasterFineSandCuM || 0} คิว`}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activeCalcItem && activeZone && activeZone.includeLintel && (
                  <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex flex-wrap justify-between items-center gap-2 text-[11px]">
                    <span className="text-slate-300">
                      <strong className="text-cyan-300">ดีเทลเทเสาเอ็น-ทับหลัง ({activeZone.zoneName} ยาว {activeCalcItem.calc.lintelLengthM} ม.):</strong>{' '}
                      ปูน {activeCalcItem.calc.lintelCementBags50kg || 0} กระสอบ + ทรายหยาบ {activeCalcItem.calc.lintelCoarseSandCuM || 0} คิว + หิน 3/4" {activeCalcItem.calc.lintelRockCuM || 0} คิว + เหล็ก {activeCalcItem.calc.lintelRebarBars} เส้น ({activeCalcItem.calc.lintelRebarKg} กก.)
                    </span>
                  </div>
                )}

                {hasExistingItems && (
                  <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-start gap-2 text-[11px] text-sky-200">
                    <span className="material-symbols-outlined text-base text-sky-400 shrink-0">info</span>
                    <div>
                      <span className="font-semibold">
                        ใน BOQ ปัจจุบันมีหมวดงานผนังก่อฉาบอยู่แล้ว {existingMasonryItems.length} รายการ
                      </span>
                      <span className="block text-sky-300/80">
                        เลือก <strong>"เพิ่มต่อท้ายรายการเดิม"</strong> หากต้องการเพิ่มโซนผนังใหม่โดยไม่ลบของเดิม หรือเลือก <strong>"แทนที่หมวดก่อฉาบทั้งหมด"</strong> เพื่อจัดเรียงใหม่ทั้งหมวดไม่ให้ทับซ้อน
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/25 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-amber-300 font-semibold block">
                      ประมาณการต้นทุนรวมทุกโซน (ก่ออิฐ + เสาเอ็นทับหลัง + ฉาบปูน)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ค่าวัสดุ ~ ฿{totals.totalMaterialCost.toLocaleString()} | ค่าแรงช่าง ~ ฿{totals.totalLaborCost.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-base font-bold font-mono text-amber-400">
                    ฿{(totals.totalMaterialCost + totals.totalLaborCost).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap justify-between items-center gap-3">
          <p className="text-xs text-slate-400">
            คำนวณตามมาตรฐานกรมโยธาธิการและผังเมือง พร้อมปูนก่อ ปูนฉาบ และเหล็กเสริมทับหลังครบทุกโซน
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition">
              ยกเลิก
            </button>
            {hasExistingItems ? (
              <>
                <button disabled={!canApply} onClick={() => handleApply('append')} className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white flex items-center gap-1.5 shadow-lg shadow-sky-600/20 transition active:scale-95">
                  <span className="material-symbols-outlined text-sm">playlist_add</span>
                  เพิ่มต่อท้ายรายการเดิม
                </button>
                <button disabled={!canApply} onClick={() => handleApply('replace')} className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95">
                  <span className="material-symbols-outlined text-sm">sync</span>
                  แทนที่หมวดก่อฉาบทั้งหมด
                </button>
              </>
            ) : (
              <button disabled={!canApply} onClick={() => handleApply('replace')} className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95">
                <span className="material-symbols-outlined text-sm">add_task</span>
                เพิ่มเข้างวดงาน BOQ ทันที
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
