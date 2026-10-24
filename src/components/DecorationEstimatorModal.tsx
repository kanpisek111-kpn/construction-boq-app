import React, { useState, useMemo } from 'react';
import { DECORATION_CATALOG } from '../constants';
import { DecorationItemPreset, BOQItem, DecorationItemType } from '../types';

interface DecorationEstimatorModalProps {
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

export const DecorationEstimatorModal: React.FC<DecorationEstimatorModalProps> = ({
  isOpen,
  onClose,
  onAddItems,
  currentHouseAreaSqm
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | DecorationItemType>('all');
  const [selectedItems, setSelectedItems] = useState<{ [id: string]: { qty: number; preset: DecorationItemPreset } }>({});

  // ตัวช่วยคำนวณอัตโนมัติ (Quick Calculators)
  const [perimeterCalcRooms, setPerimeterCalcRooms] = useState<number>(4);
  const [avgRoomWidthM, setAvgRoomWidthM] = useState<number>(4.0);
  const [avgRoomLengthM, setAvgRoomLengthM] = useState<number>(4.5);
  const [doorDeductPerRoomM, setDoorDeductPerRoomM] = useState<number>(1.2);

  const [windowCount, setWindowCount] = useState<number>(8);
  const [avgWinWidthM, setAvgWinWidthM] = useState<number>(1.2);
  const [avgWinHeightM, setAvgWinHeightM] = useState<number>(1.1);

  // คำนวณความยาวบัวพื้นกันเปื้อนอัตโนมัติ
  const autoSkirtingLengthM = useMemo(() => {
    const singleRoomPerimeter = 2 * (avgRoomWidthM + avgRoomLengthM);
    const netSingleRoom = Math.max(0, singleRoomPerimeter - doorDeductPerRoomM);
    return Math.round(netSingleRoom * perimeterCalcRooms * 10) / 10;
  }, [perimeterCalcRooms, avgRoomWidthM, avgRoomLengthM, doorDeductPerRoomM]);

  // คำนวณความยาวบัวปูนหน้าต่างภายนอกรอบกรอบ
  const autoWindowMoldingM = useMemo(() => {
    const singleWindowPerimeter = 2 * (avgWinWidthM + avgWinHeightM);
    return Math.round(singleWindowPerimeter * windowCount * 10) / 10;
  }, [windowCount, avgWinWidthM, avgWinHeightM]);

  if (!isOpen) return null;

  const filteredCatalog = DECORATION_CATALOG.filter(item => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  const handleToggleSelect = (preset: DecorationItemPreset) => {
    setSelectedItems(prev => {
      const copy = { ...prev };
      if (copy[preset.id]) {
        delete copy[preset.id];
      } else {
        let initialQty = preset.defaultQty;
        if (preset.type === 'interior_skirting') {
          initialQty = autoSkirtingLengthM;
        } else if (preset.type === 'exterior_molding') {
          initialQty = autoWindowMoldingM;
        }
        copy[preset.id] = { qty: safeNum(initialQty), preset };
      }
      return copy;
    });
  };

  const handleQtyChange = (id: string, delta: number) => {
    setSelectedItems(prev => {
      if (!prev[id]) return prev;
      const newQty = Math.max(0.5, safeNum(prev[id].qty) + delta);
      return {
        ...prev,
        [id]: { ...prev[id], qty: Math.round(newQty * 10) / 10 }
      };
    });
  };

  const handleSetCustomQty = (id: string, val: number) => {
    setSelectedItems(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], qty: Math.max(0.5, safeNum(val)) }
      };
    });
  };

  const selectedCount = Object.keys(selectedItems).length;
  const estimatedTotal = Object.values(selectedItems).reduce((sum, { qty, preset }) => {
    const wasteFactor = 1 + (safeNum(preset.wastePercent) / 100);
    const matPrice = safeNum(preset.materialUnitPrice ?? (preset as any).defaultMaterialPrice);
    const labPrice = safeNum(preset.laborUnitPrice ?? (preset as any).defaultLaborPrice);
    const safeQ = safeNum(qty);
    return sum + (safeQ * matPrice * wasteFactor) + (safeQ * labPrice);
  }, 0);

  const handleApplyToBOQ = () => {
    const newBOQItems: BOQItem[] = Object.values(selectedItems).map(({ qty, preset }, idx) => {
      const matPrice = safeNum(preset.materialUnitPrice ?? (preset as any).defaultMaterialPrice);
      const labPrice = safeNum(preset.laborUnitPrice ?? (preset as any).defaultLaborPrice);
      const safeQ = safeNum(qty);

      return {
        id: `dec-custom-${Date.now()}-${idx}`,
        category: 'decorations',
        name: preset.name,
        spec: `${preset.spec} (เผื่อเศษ ${safeNum(preset.wastePercent)}%)`,
        quantity: safeQ,
        unit: preset.unit,
        materialUnitPrice: matPrice,
        laborUnitPrice: labPrice,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-2xl">architecture</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                หมวดงานตกแต่งภายในและภายนอก (บัวพื้น • บัวปูนหน้าต่าง • ผนังหินกาบ • ผนังกรุ)
              </h2>
              <p className="text-xs text-slate-400">
                คำนวณความยาวบัวกันเปื้อน บัวปูนดักน้ำขอบหน้าต่าง ตกแต่งผนังหินกาบธรรมชาติ และผนังกรุระแนง WPC
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

        {/* Quick Interactive Estimator Banner */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          {/* Box 1: บัวพื้นกันเปื้อน */}
          <div className="p-3 bg-slate-900/90 rounded-xl border border-amber-500/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">view_sidebar</span>
                1. ตัวช่วยคิดความยาวบัวพื้นกันเปื้อน (ห้องนอน + โถง)
              </span>
              <span className="font-mono text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                ~ {autoSkirtingLengthM} เมตร
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <label className="text-slate-400 block mb-0.5">จำนวนห้อง:</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded px-2 py-1">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={perimeterCalcRooms}
                    onChange={(e) => setPerimeterCalcRooms(parseInt(e.target.value) || 1)}
                    className="w-full bg-transparent text-white font-mono font-bold"
                  />
                  <span className="text-slate-500 text-[10px]">ห้อง</span>
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">กว้าง x ยาว (ม.):</label>
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-1.5 py-1">
                  <input
                    type="number"
                    step="0.5"
                    value={avgRoomWidthM}
                    onChange={(e) => setAvgRoomWidthM(parseFloat(e.target.value) || 3)}
                    className="w-8 bg-transparent text-white font-mono text-center"
                  />
                  <span className="text-slate-500">x</span>
                  <input
                    type="number"
                    step="0.5"
                    value={avgRoomLengthM}
                    onChange={(e) => setAvgRoomLengthM(parseFloat(e.target.value) || 4)}
                    className="w-8 bg-transparent text-white font-mono text-center"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">หักช่องประตู/ห้อง:</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded px-2 py-1">
                  <input
                    type="number"
                    step="0.1"
                    value={doorDeductPerRoomM}
                    onChange={(e) => setDoorDeductPerRoomM(parseFloat(e.target.value) || 1.0)}
                    className="w-full bg-transparent text-white font-mono"
                  />
                  <span className="text-slate-500 text-[10px]">ม.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: บัวปูนหน้าต่างภายนอก */}
          <div className="p-3 bg-slate-900/90 rounded-xl border border-cyan-500/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">crop_square</span>
                2. ตัวช่วยคิดความยาวบัวปูนกรอบหน้าต่างภายนอก
              </span>
              <span className="font-mono text-[11px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-bold">
                ~ {autoWindowMoldingM} เมตร
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-slate-400 block mb-0.5">จำนวนหน้าต่างรอบบ้าน:</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded px-2 py-1">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={windowCount}
                    onChange={(e) => setWindowCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-transparent text-white font-mono font-bold"
                  />
                  <span className="text-slate-500 text-[10px]">ช่อง</span>
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">ขนาดหน้าต่างเฉลี่ย กว้าง x สูง (ม.):</label>
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-1.5 py-1">
                  <input
                    type="number"
                    step="0.1"
                    value={avgWinWidthM}
                    onChange={(e) => setAvgWinWidthM(parseFloat(e.target.value) || 1.2)}
                    className="w-10 bg-transparent text-white font-mono text-center"
                  />
                  <span className="text-slate-500">x</span>
                  <input
                    type="number"
                    step="0.1"
                    value={avgWinHeightM}
                    onChange={(e) => setAvgWinHeightM(parseFloat(e.target.value) || 1.1)}
                    className="w-10 bg-transparent text-white font-mono text-center"
                  />
                  <span className="text-slate-500 text-[10px]">ม.</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Filter Navigation Tabs */}
        <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                activeFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              แสดงทุกงานตกแต่ง ({DECORATION_CATALOG.length})
            </button>
            <button
              onClick={() => setActiveFilter('interior_skirting')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeFilter === 'interior_skirting' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_sidebar</span>
              <span>บัวพื้นกันเปื้อนภายใน</span>
            </button>
            <button
              onClick={() => setActiveFilter('exterior_molding')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeFilter === 'exterior_molding' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">crop_square</span>
              <span>บัวปูนปั้น/โฟมหน้าต่างภายนอก</span>
            </button>
            <button
              onClick={() => setActiveFilter('slate_stone_wall')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeFilter === 'slate_stone_wall' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">texture</span>
              <span>ผนังหินกาบธรรมชาติ/หินเทียม</span>
            </button>
            <button
              onClick={() => setActiveFilter('wall_cladding')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                activeFilter === 'wall_cladding' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">table_rows</span>
              <span>ผนังกรุระแนง WPC & ไม้ฝา</span>
            </button>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCatalog.map(item => {
            const isSelected = !!selectedItems[item.id];
            
            const recommendedQty = item.type === 'interior_skirting'
              ? autoSkirtingLengthM
              : item.type === 'exterior_molding'
              ? autoWindowMoldingM
              : item.defaultQty;

            const currentQty = safeNum(selectedItems[item.id]?.qty ?? recommendedQty);
            const matPrice = safeNum(item.materialUnitPrice ?? (item as any).defaultMaterialPrice);
            const labPrice = safeNum(item.laborUnitPrice ?? (item as any).defaultLaborPrice);
            const wasteFactor = 1 + (safeNum(item.wastePercent) / 100);
            const lineTotal = Math.round((currentQty * matPrice * wasteFactor) + (currentQty * labPrice));

            return (
              <div
                key={item.id}
                onClick={() => handleToggleSelect(item)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-950/30 border-amber-400/80 shadow-lg shadow-amber-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.type === 'interior_skirting' ? 'bg-amber-500/20 text-amber-300' :
                        item.type === 'exterior_molding' ? 'bg-cyan-500/20 text-cyan-300' :
                        item.type === 'slate_stone_wall' ? 'bg-rose-500/20 text-rose-300' :
                        'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {item.type === 'interior_skirting' ? 'บัวพื้นภายใน' :
                         item.type === 'exterior_molding' ? 'บัวปูนหน้าต่าง' :
                         item.type === 'slate_stone_wall' ? 'ผนังหินกาบ/หินโชว์' : 'ผนังกรุระแนง'}
                      </span>
                      <span className="text-[11px] text-slate-400">{item.recommendation}</span>
                    </div>
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                      isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'border border-slate-700 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-1.5">{item.name}</h3>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{item.spec}</p>
                  
                  {/* Tip & Description */}
                  <div className="mt-2 p-2 bg-slate-900/90 rounded-lg border border-slate-800 text-[10px] text-slate-400 flex flex-col gap-0.5">
                    <div><strong>ฟังก์ชัน:</strong> {item.description}</div>
                    <div className="text-amber-400/90"><strong>เทคนิคช่าง:</strong> {item.installationTip}</div>
                  </div>
                </div>

                {/* Price and Quantity Adjuster */}
                <div 
                  className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">
                      วัสดุ ฿{safeToLocaleString(matPrice)} + แรง ฿{safeToLocaleString(labPrice)} (เผื่อ {safeNum(item.wastePercent)}%)
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      รวม ฿{safeToLocaleString(Math.round((matPrice * wasteFactor) + labPrice))} / {item.unit}
                    </span>
                  </div>

                  {isSelected ? (
                    <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-amber-500/40">
                      <span className="text-[11px] text-slate-300">ปริมาณ:</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.id, -1)}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-white text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="any"
                        value={currentQty}
                        onChange={(e) => handleSetCustomQty(item.id, parseFloat(e.target.value) || 1)}
                        className="w-16 bg-transparent text-amber-300 font-mono font-bold text-center text-xs focus:outline-none"
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
                  <div className="text-right text-[11px] text-amber-300 font-mono font-semibold">
                    ราคารวมงานนี้ ({currentQty} {item.unit}): ฿{safeToLocaleString(lineTotal)} บาท
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300">
              เลือกรายการตกแต่งแล้ว <strong className="text-amber-400 font-bold">{selectedCount}</strong> รายการ
            </span>
            {selectedCount > 0 && (
              <span className="text-xs font-mono text-cyan-400">
                (ประมาณการรวม: ฿{safeToLocaleString(Math.round(estimatedTotal))} บาท)
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">playlist_add</span>
              เพิ่มเข้างวดงาน BOQ ({selectedCount} รายการ)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
