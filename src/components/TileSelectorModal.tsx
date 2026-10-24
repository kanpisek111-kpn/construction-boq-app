import React, { useState, useMemo } from 'react';
import { TILE_CATALOG } from '../constants';
import { TileItemPreset, BOQItem } from '../types';
interface TileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: BOQItem[]) => void;
}
export const TileSelectorModal: React.FC<TileSelectorModalProps> = ({
  isOpen,
  onClose,
  onAddItems
}) => {
  // พารามิเตอร์พื้นที่ห้องน้ำเพื่อช่วยคำนวณ ตร.ม. อัตโนมัติ
  const [bathCount, setBathCount] = useState<number>(2);
  const [bathWidthM, setBathWidthM] = useState<number>(1.8);
  const [bathLengthM, setBathLengthM] = useState<number>(2.4);
  const [bathHeightM, setBathHeightM] = useState<number>(2.6); // ความสูงผนังบุห้องน้ำ
  const [doorWindowDeductSqm, setDoorWindowDeductSqm] = useState<number>(2.0); // หักช่องประตู
  // Filter Zone
  const [activeZone, setActiveZone] = useState<'all' | 'bath_floor' | 'bath_wall' | 'general_floor'>('all');
  // ตะกร้ากระเบื้องที่เลือก
  const [selectedTiles, setSelectedTiles] = useState<{ [id: string]: { areaSqm: number; preset: TileItemPreset } }>({});
  // คำนวณพื้นที่ห้องน้ำอัตโนมัติ
  const autoBathFloorArea = useMemo(() => {
    return Math.round((bathCount * bathWidthM * bathLengthM) * 10) / 10;
  }, [bathCount, bathWidthM, bathLengthM]);
  const autoBathWallArea = useMemo(() => {
    const perimeter = 2 * (bathWidthM + bathLengthM);
    const grossWall = perimeter * bathHeightM;
    const netPerBath = Math.max(0, grossWall - doorWindowDeductSqm);
    return Math.round((bathCount * netPerBath) * 10) / 10;
  }, [bathCount, bathWidthM, bathLengthM, bathHeightM, doorWindowDeductSqm]);
  if (!isOpen) return null;
  const filteredTiles = TILE_CATALOG.filter(item => {
    if (activeZone === 'all') return true;
    if (activeZone === 'bath_floor') return item.zoneType === 'bath_floor';
    if (activeZone === 'bath_wall') return item.zoneType === 'bath_wall';
    return item.zoneType === 'general_floor' || item.zoneType === 'exterior_porch';
  });
  const handleSelectTile = (preset: TileItemPreset) => {
    setSelectedTiles(prev => {
      const copy = { ...prev };
      if (copy[preset.id]) {
        delete copy[preset.id];
      } else {
        // แนะนำ ตร.ม. อัตโนมัติตามโซน
        let defaultArea = 10;
        if (preset.zoneType === 'bath_floor') defaultArea = autoBathFloorArea;
        else if (preset.zoneType === 'bath_wall') defaultArea = autoBathWallArea;
        else defaultArea = 80;
        copy[preset.id] = { areaSqm: defaultArea, preset };
      }
      return copy;
    });
  };
  const handleAreaChange = (id: string, newArea: number) => {
    setSelectedTiles(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], areaSqm: Math.max(0.5, newArea) }
      };
    });
  };
  const selectedCount = Object.keys(selectedTiles).length;
  const handleApplyToBOQ = () => {
    const newBOQItems: BOQItem[] = Object.values(selectedTiles).map(({ areaSqm, preset }, idx) => {
      const wasteFactor = 1 + (preset.wastePercent / 100);
      return {
        id: `tile-custom-${Date.now()}-${idx}`,
        category: 'finishes',
        name: `งานปูกระเบื้อง: ${preset.name}`,
        spec: `ขนาด ${preset.sizeTh} พร้อมปูนทราย ปูนกาวซีเมนต์ และยาแนวกันเชื้อรา (เผื่อเศษ ${preset.wastePercent}%)`,
        quantity: areaSqm,
        unit: 'ตร.ม.',
        materialUnitPrice: preset.defaultMaterialPrice,
        laborUnitPrice: preset.defaultLaborPrice,
        wastePercent: preset.wastePercent,
        itemSubtype: preset.id,
        basePerSqm: areaSqm / 120
      };
    });
    onAddItems(newBOQItems);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-400 text-2xl">grid_view</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                เครื่องคำนวณและเลือกราคางานกระเบื้อง (พื้น & ผนังห้องน้ำ)
              </h2>
              <p className="text-xs text-slate-400">
                คำนวณพื้นที่ ตร.ม. ห้องน้ำอัตโนมัติ เลือกกระเบื้องพื้นกันลื่น R10 ผนังห้องน้ำ และแกรนิตโต้ลง BOQ
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
        {/* Bathroom Dimension Calculator Helper */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">bathtub</span>
              ผู้ช่วยคำนวณขนาดห้องน้ำ:
            </span>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">จำนวน:</span>
              <input
                type="number"
                min="1"
                max="10"
                value={bathCount}
                onChange={(e) => setBathCount(parseInt(e.target.value) || 1)}
                className="w-10 bg-transparent text-white font-mono font-bold text-center"
              />
              <span className="text-slate-500">ห้อง</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">กว้าง x ยาว:</span>
              <input
                type="number"
                step="0.1"
                value={bathWidthM}
                onChange={(e) => setBathWidthM(parseFloat(e.target.value) || 1)}
                className="w-12 bg-transparent text-white font-mono text-center"
              />
              <span className="text-slate-500">x</span>
              <input
                type="number"
                step="0.1"
                value={bathLengthM}
                onChange={(e) => setBathLengthM(parseFloat(e.target.value) || 1)}
                className="w-12 bg-transparent text-white font-mono text-center"
              />
              <span className="text-slate-500">ม.</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">สูงจรดฝ้า:</span>
              <input
                type="number"
                step="0.1"
                value={bathHeightM}
                onChange={(e) => setBathHeightM(parseFloat(e.target.value) || 2.4)}
                className="w-12 bg-transparent text-white font-mono text-center"
              />
              <span className="text-slate-500">ม.</span>
            </div>
          </div>
          {/* Quick Calculated Stats */}
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono">
              พื้นห้องน้ำ: <strong>{autoBathFloorArea}</strong> ตร.ม.
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-mono">
              ผนังห้องน้ำ: <strong>{autoBathWallArea}</strong> ตร.ม.
            </span>
          </div>
        </div>
        {/* Category Tabs */}
        <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setActiveZone('all')}
              className={`px-3 py-1.5 rounded-lg transition ${activeZone === 'all' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              แสดงทุกหมวด ({TILE_CATALOG.length})
            </button>
            <button
              onClick={() => setActiveZone('bath_floor')}
              className={`px-3 py-1.5 rounded-lg transition ${activeZone === 'bath_floor' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              🚿 พื้นห้องน้ำ (กันลื่น R10-R11)
            </button>
            <button
              onClick={() => setActiveZone('bath_wall')}
              className={`px-3 py-1.5 rounded-lg transition ${activeZone === 'bath_wall' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              🧼 ผนังห้องน้ำ (ผิวมัน/ซับเวย์)
            </button>
            <button
              onClick={() => setActiveZone('general_floor')}
              className={`px-3 py-1.5 rounded-lg transition ${activeZone === 'general_floor' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              🏡 พื้นแกรนิตโต้ 60x60 & ระเบียง
            </button>
          </div>
        </div>
        {/* Tile Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTiles.map(item => {
            const isSelected = !!selectedTiles[item.id];
            const currentArea = selectedTiles[item.id]?.areaSqm || (item.zoneType === 'bath_floor' ? autoBathFloorArea : item.zoneType === 'bath_wall' ? autoBathWallArea : 80);
            const lineTotal = (item.defaultMaterialPrice * (1 + item.wastePercent / 100) + item.defaultLaborPrice) * currentArea;
            return (
              <div
                key={item.id}
                onClick={() => handleSelectTile(item)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-emerald-950/30 border-emerald-400/80 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.zoneType === 'bath_floor' 
                          ? 'bg-cyan-500/20 text-cyan-300' 
                          : item.zoneType === 'bath_wall' 
                          ? 'bg-indigo-500/20 text-indigo-300' 
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {item.zoneType === 'bath_floor' ? 'พื้นห้องน้ำ' : item.zoneType === 'bath_wall' ? 'ผนังห้องน้ำ' : 'พื้นทั่วไป'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{item.sizeTh}</span>
                    </div>
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                      isSelected ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-slate-700 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1.5">{item.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                </div>
                {/* Price and Area Input */}
                <div 
                  className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">
                      ค่ากระเบื้อง ฿{item.defaultMaterialPrice} + ปูกาว/ยาแนว ฿{item.defaultLaborPrice} (เผื่อ {item.wastePercent}%)
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      รวม ฿{Math.round(item.defaultMaterialPrice * (1 + item.wastePercent / 100) + item.defaultLaborPrice)} / ตร.ม.
                    </span>
                  </div>
                  {isSelected ? (
                    <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-emerald-500/40">
                      <span className="text-[11px] text-slate-300">พื้นที่:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={currentArea}
                        onChange={(e) => handleAreaChange(item.id, parseFloat(e.target.value) || 1)}
                        className="w-16 bg-transparent text-emerald-300 font-mono font-bold text-right focus:outline-none"
                      />
                      <span className="text-slate-400 text-xs">ตร.ม.</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectTile(item)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                    >
                      + เลือกรายการนี้
                    </button>
                  )}
                </div>
                {isSelected && (
                  <div className="text-right text-[11px] text-emerald-300 font-mono font-semibold">
                    ราคารวมงานนี้ ({currentArea} ตร.ม.): ฿{Math.round(lineTotal).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-slate-300">
            เลือกงานกระเบื้องแล้ว <strong className="text-emerald-400 font-bold">{selectedCount}</strong> รายการ
          </span>
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">playlist_add</span>
              นำเข้าตาราง BOQ ({selectedCount} รายการ)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};