import React, { useState } from 'react';
import { SANITARY_FIXTURES_CATALOG } from '../constants';
import { SanitaryFixturePreset, BOQItem, SanitaryFixtureType } from '../types';

interface SanitaryFixtureSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: BOQItem[]) => void;
  currentHouseAreaSqm: number;
}

const safeNum = (val: number | undefined | null): number => {
  if (val === undefined || val === null || isNaN(val)) return 0;
  return val;
};

const safeToLocaleString = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString();
};

export const SanitaryFixtureSelectorModal: React.FC<SanitaryFixtureSelectorModalProps> = ({
  isOpen,
  onClose,
  onAddItems,
  currentHouseAreaSqm = 120
}) => {
  const [activeType, setActiveType] = useState<'all' | SanitaryFixtureType>('all');
  const [activeTier, setActiveTier] = useState<'all' | 'standard' | 'premium' | 'luxury'>('all');
  const [selectedFixtures, setSelectedFixtures] = useState<{ [id: string]: { qty: number; preset: SanitaryFixturePreset } }>({});

  // ตัวช่วยคำนวณจำนวนห้องน้ำในบ้าน
  const [bathroomCount, setBathroomCount] = useState<number>(2);

  if (!isOpen) return null;

  const filteredCatalog = SANITARY_FIXTURES_CATALOG.filter(item => {
    if (activeType !== 'all' && item.type !== activeType) return false;
    if (activeTier !== 'all' && item.gradeTier !== activeTier) return false;
    return true;
  });

  const handleToggleSelect = (preset: SanitaryFixturePreset) => {
    setSelectedFixtures(prev => {
      const copy = { ...prev };
      if (copy[preset.id]) {
        delete copy[preset.id];
      } else {
        const defaultQty = preset.unit === 'จุด' && preset.id.includes('floor-drain') 
          ? bathroomCount * 2 
          : bathroomCount;
        copy[preset.id] = { qty: Math.max(1, safeNum(defaultQty)), preset };
      }
      return copy;
    });
  };

  const handleQtyChange = (id: string, delta: number) => {
    setSelectedFixtures(prev => {
      if (!prev[id]) return prev;
      const newQty = Math.max(1, safeNum(prev[id].qty) + delta);
      return {
        ...prev,
        [id]: { ...prev[id], qty: newQty }
      };
    });
  };

  const handleSetCustomQty = (id: string, val: number) => {
    setSelectedFixtures(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], qty: Math.max(1, safeNum(val)) }
      };
    });
  };

  // เลือกชุดมาตรฐานห้องน้ำครบเซ็ต (1-Click Package)
  const handleSelectFullBathroomPackage = (tier: 'standard' | 'premium') => {
    const newSelected: { [id: string]: { qty: number; preset: SanitaryFixturePreset } } = {};
    
    SANITARY_FIXTURES_CATALOG.forEach(item => {
      if (tier === 'standard') {
        if (
          item.id === 'fix-toilet-two-piece-std' ||
          item.id === 'fix-bidet-spray-sus304' ||
          item.id === 'fix-basin-counter-top' ||
          item.id === 'fix-basin-faucet-mixing' ||
          item.id === 'fix-water-heater-3500-4500w' ||
          item.id === 'fix-acc-hardware-set-6pcs' ||
          item.id === 'fix-floor-drain-trap-antiodor'
        ) {
          newSelected[item.id] = {
            qty: item.id.includes('floor-drain') ? bathroomCount * 2 : bathroomCount,
            preset: item
          };
        }
      } else if (tier === 'premium') {
        if (
          item.id === 'fix-toilet-one-piece-prem' ||
          item.id === 'fix-bidet-spray-sus304' ||
          item.id === 'fix-basin-cabinet-set' ||
          item.id === 'fix-rain-shower-set' ||
          item.id === 'fix-water-heater-3500-4500w' ||
          item.id === 'fix-glass-shower-screen' ||
          item.id === 'fix-mirror-led-touch' ||
          item.id === 'fix-acc-hardware-set-6pcs' ||
          item.id === 'fix-floor-drain-trap-antiodor'
        ) {
          newSelected[item.id] = {
            qty: item.id.includes('floor-drain') ? bathroomCount * 2 : bathroomCount,
            preset: item
          };
        }
      }
    });

    setSelectedFixtures(newSelected);
  };

  const selectedCount = Object.keys(selectedFixtures).length;
  const estimatedTotal = Object.values(selectedFixtures).reduce((sum, { qty, preset }) => {
    const mat = safeNum(preset.materialUnitPrice ?? (preset as any).defaultMaterialPrice);
    const lab = safeNum(preset.laborUnitPrice ?? (preset as any).defaultLaborPrice);
    return sum + (safeNum(qty) * (mat + lab));
  }, 0);

  const handleApplyToBOQ = () => {
    const newBOQItems: BOQItem[] = Object.values(selectedFixtures).map(({ qty, preset }, idx) => {
      const mat = safeNum(preset.materialUnitPrice ?? (preset as any).defaultMaterialPrice);
      const lab = safeNum(preset.laborUnitPrice ?? (preset as any).defaultLaborPrice);
      const safeQ = safeNum(qty);

      return {
        id: `san-fixture-${Date.now()}-${idx}`,
        category: 'sanitary',
        name: `${preset.name}`,
        spec: `${preset.spec}`,
        quantity: safeQ,
        unit: preset.unit,
        materialUnitPrice: mat,
        laborUnitPrice: lab,
        wastePercent: safeNum(preset.wastePercent),
        itemSubtype: preset.id,
        basePerSqm: safeQ / (currentHouseAreaSqm || 120)
      };
    });

    onAddItems(newBOQItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-2xl font-bold">wash</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>เลือกสุขภัณฑ์และอุปกรณ์ในห้องน้ำ (Bathroom Fixtures)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  {SANITARY_FIXTURES_CATALOG.length} รายการมาตรฐาน มอก.
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                เลือกชักโครก 1/2 ชิ้น, อ่างล้างหน้าเคาน์เตอร์, สายฉีดชำระ, เรนชาวเวอร์, เครื่องทำน้ำอุ่น, ฉากกั้นกระจก, กระจก LED และอุปกรณ์สแตนเลส
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

        {/* Quick Package Picker Banner */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
              <span className="text-slate-400">จำนวนห้องน้ำในบ้าน:</span>
              <input
                type="number"
                min="1"
                max="10"
                value={bathroomCount}
                onChange={(e) => setBathroomCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-10 bg-transparent text-amber-400 font-mono font-bold text-center text-xs focus:outline-none"
              />
              <span className="text-slate-500">ห้อง</span>
            </div>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 font-medium">ชุดสำเร็จรูป 1-Click:</span>
            <button
              type="button"
              onClick={() => handleSelectFullBathroomPackage('standard')}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-xs">done_all</span>
              <span>เซ็ตมาตรฐาน มอก. (ครบ {bathroomCount} ห้อง)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectFullBathroomPackage('premium')}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-600/40 to-yellow-600/40 hover:from-amber-600/60 hover:to-yellow-600/60 text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-xs">hotel_class</span>
              <span>เซ็ตพรีเมียม + เรนชาวเวอร์ + ฉากกระจก</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <span className="text-xs font-mono text-emerald-400 font-bold">
                เลือกแล้ว {selectedCount} ชนิด (~฿{safeToLocaleString(estimatedTotal)})
              </span>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0 scrollbar-hide">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveType('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                activeType === 'all' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              ทุกหมวดสุขภัณฑ์ ({SANITARY_FIXTURES_CATALOG.length})
            </button>
            <button
              onClick={() => setActiveType('toilet')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeType === 'toilet' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">wc</span>
              <span>โถชักโครก (1 ชิ้น / 2 ชิ้น / Smart)</span>
            </button>
            <button
              onClick={() => setActiveType('bidet_spray')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeType === 'bidet_spray' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">shower</span>
              <span>สายฉีดชำระ</span>
            </button>
            <button
              onClick={() => setActiveType('basin')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeType === 'basin' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">wash</span>
              <span>อ่างล้างหน้า & ก๊อกผสม</span>
            </button>
            <button
              onClick={() => setActiveType('shower_system')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeType === 'shower_system' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">shower</span>
              <span>เรนชาวเวอร์ & น้ำอุ่น</span>
            </button>
            <button
              onClick={() => setActiveType('shower_enclosure')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeType === 'shower_enclosure' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_carousel</span>
              <span>ฉากกั้นอาบน้ำกระจกนิรภัย</span>
            </button>
            <button
              onClick={() => setActiveType('bathroom_accessory')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeType === 'bathroom_accessory' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">interests</span>
              <span>อุปกรณ์ในห้องน้ำ & ตะแกรงกันกลิ่น</span>
            </button>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCatalog.map(item => {
            const isSelected = !!selectedFixtures[item.id];
            const currentQty = safeNum(selectedFixtures[item.id]?.qty ?? (item.unit === 'จุด' ? bathroomCount * 2 : bathroomCount));
            const matPrice = safeNum(item.materialUnitPrice ?? (item as any).defaultMaterialPrice);
            const labPrice = safeNum(item.laborUnitPrice ?? (item as any).defaultLaborPrice);
            const lineTotal = (matPrice + labPrice) * currentQty;

            return (
              <div
                key={item.id}
                onClick={() => handleToggleSelect(item)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-cyan-950/30 border-cyan-400/80 shadow-lg shadow-cyan-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.type === 'toilet' ? 'bg-indigo-500/20 text-indigo-300' :
                        item.type === 'basin' ? 'bg-cyan-500/20 text-cyan-300' :
                        item.type === 'shower_system' ? 'bg-blue-500/20 text-blue-300' :
                        item.type === 'shower_enclosure' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {item.type === 'toilet' ? 'โถสุขภัณฑ์' :
                         item.type === 'bidet_spray' ? 'สายฉีดชำระ' :
                         item.type === 'basin' ? 'อ่างล้างหน้า' :
                         item.type === 'shower_system' ? 'ระบบฝักบัว' :
                         item.type === 'shower_enclosure' ? 'ฉากกั้นกระจก' : 'อุปกรณ์ห้องน้ำ'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        item.gradeTier === 'luxury' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        item.gradeTier === 'premium' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {item.gradeTier === 'luxury' ? '👑 Luxury' : item.gradeTier === 'premium' ? '✨ Premium' : 'เกรดมาตรฐาน'}
                      </span>
                    </div>
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                      isSelected ? 'bg-cyan-500 text-slate-950 font-bold' : 'border border-slate-700 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-1.5">{item.name}</h3>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{item.spec}</p>
                  
                  {/* Tip */}
                  <div className="mt-2 p-2 bg-slate-900/90 rounded-lg border border-slate-800 text-[10px] text-slate-400 flex flex-col gap-0.5">
                    <div><strong>คุณสมบัติ:</strong> {item.description}</div>
                    <div className="text-cyan-400/90"><strong>การติดตั้ง:</strong> {item.installationTip}</div>
                  </div>
                </div>

                {/* Price and Quantity Adjuster */}
                <div 
                  className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">
                      ค่าของ ฿{safeToLocaleString(matPrice)} + แรงติดตั้ง ฿{safeToLocaleString(labPrice)}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      รวม ฿{safeToLocaleString(matPrice + labPrice)} / {item.unit}
                    </span>
                  </div>

                  {isSelected ? (
                    <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-cyan-500/40">
                      <span className="text-[11px] text-slate-300">จำนวน:</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.id, -1)}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-white text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={currentQty}
                        onChange={(e) => handleSetCustomQty(item.id, parseInt(e.target.value) || 1)}
                        className="w-12 bg-transparent text-cyan-300 font-mono font-bold text-center text-xs focus:outline-none"
                      />
                      <span className="text-slate-400 text-xs font-mono">{item.unit}</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.id, 1)}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-white text-xs"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(item)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                    >
                      + เลือกรายการนี้
                    </button>
                  )}
                </div>

                {isSelected && (
                  <div className="text-right text-[11px] text-cyan-300 font-mono font-semibold">
                    ราคารวมงานนี้ ({currentQty} {item.unit}): ฿{safeToLocaleString(lineTotal)} บาท
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300">
              เลือกสุขภัณฑ์และอุปกรณ์แล้ว <strong className="text-cyan-400 font-bold">{selectedCount}</strong> รายการ
            </span>
            {selectedCount > 0 && (
              <span className="text-xs font-mono text-amber-400">
                (ประมาณการรวม: ฿{safeToLocaleString(estimatedTotal)} บาท)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              ปิด
            </button>
            <button
              onClick={handleApplyToBOQ}
              disabled={selectedCount === 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">playlist_add</span>
              เพิ่มสุขภัณฑ์เข้างวดงาน BOQ ({selectedCount} รายการ)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
