import React, { useState } from 'react';
import { ROOM_DOOR_CATALOG } from '../constants';
import { RoomDoorPreset, BOQItem, RoomDoorWidth } from '../types';

interface RoomDoorSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: BOQItem[]) => void;
}

export const RoomDoorSelectorModal: React.FC<RoomDoorSelectorModalProps> = ({
  isOpen,
  onClose,
  onAddItems
}) => {
  const [filterWidth, setFilterWidth] = useState<'all' | '70' | '80' | '90'>('all');
  const [filterMaterial, setFilterMaterial] = useState<'all' | 'hdf' | 'solid_wood' | 'wpc' | 'upvc' | 'pvc'>('all');
  const [selectedDoors, setSelectedDoors] = useState<{ [id: string]: { qty: number; preset: RoomDoorPreset } }>({});

  if (!isOpen) return null;

  const filteredCatalog = ROOM_DOOR_CATALOG.filter(item => {
    if (filterWidth !== 'all' && item.widthCm !== filterWidth) return false;
    if (filterMaterial !== 'all' && item.materialType !== filterMaterial) return false;
    return true;
  });

  const handleToggleSelect = (preset: RoomDoorPreset) => {
    setSelectedDoors(prev => {
      const copy = { ...prev };
      if (copy[preset.id]) {
        delete copy[preset.id];
      } else {
        // แนะนำจำนวนเริ่มต้น: 70 ซม. (ห้องน้ำ) = 2, 80 ซม. (ห้องนอน) = 3, 90 ซม. (ทางเข้า) = 1
        const defaultQty = preset.widthCm === '70' ? 2 : preset.widthCm === '80' ? 3 : 1;
        copy[preset.id] = { qty: defaultQty, preset };
      }
      return copy;
    });
  };

  const handleQtyChange = (id: string, delta: number) => {
    setSelectedDoors(prev => {
      if (!prev[id]) return prev;
      const newQty = Math.max(1, prev[id].qty + delta);
      return {
        ...prev,
        [id]: { ...prev[id], qty: newQty }
      };
    });
  };

  const selectedCount = Object.keys(selectedDoors).length;
  const estimatedTotal = Object.values(selectedDoors).reduce((sum, { qty, preset }) => {
    return sum + (qty * (preset.defaultMaterialPrice + preset.defaultLaborPrice));
  }, 0);

  const handleApplyToBOQ = () => {
    const newBOQItems: BOQItem[] = Object.values(selectedDoors).map(({ qty, preset }, idx) => ({
      id: `room-door-${Date.now()}-${idx}`,
      category: 'doors_windows',
      name: `ชุดประตูห้อง ${preset.name} (ขนาด ${preset.dimensions})`,
      spec: `${preset.frameMaterial} + ${preset.hardwareIncluded}`,
      quantity: qty,
      unit: 'ชุด',
      materialUnitPrice: preset.defaultMaterialPrice,
      laborUnitPrice: preset.defaultLaborPrice,
      wastePercent: 0,
      itemSubtype: preset.id,
      basePerSqm: qty / 120
    }));

    onAddItems(newBOQItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-400 text-2xl">meeting_room</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                เลือกประตูห้อง (ไม่ใช่ประตูอะลูมิเนียม) ขนาด 70 / 80 / 90 ซม.
              </h2>
              <p className="text-xs text-slate-400">
                ประตูไม้จริง, ไม้ HDF, ไม้สังเคราะห์ WPC, UPVC, PVC พร้อมวงกบและอุปกรณ์บานพับลูกบิด
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

        {/* Filters Bar: Width Size 70, 80, 90 & Material Type */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          
          {/* Width Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">ขนาดความกว้างบาน:</span>
            <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFilterWidth('all')}
                className={`px-3 py-1 rounded-lg transition ${filterWidth === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                ทุกขนาด
              </button>
              <button
                type="button"
                onClick={() => setFilterWidth('70')}
                className={`px-3 py-1 rounded-lg transition ${filterWidth === '70' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                🚪 70 x 200 ซม. (ห้องน้ำ)
              </button>
              <button
                type="button"
                onClick={() => setFilterWidth('80')}
                className={`px-3 py-1 rounded-lg transition ${filterWidth === '80' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                🚪 80 x 200 ซม. (ห้องนอน)
              </button>
              <button
                type="button"
                onClick={() => setFilterWidth('90')}
                className={`px-3 py-1 rounded-lg transition ${filterWidth === '90' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                🚪 90 x 200 ซม. (ทางเข้า/บานใหญ่)
              </button>
            </div>
          </div>

          {/* Material Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">ชนิดวัสดุ:</span>
            <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFilterMaterial('all')}
                className={`px-2.5 py-1 rounded-lg transition ${filterMaterial === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setFilterMaterial('hdf')}
                className={`px-2.5 py-1 rounded-lg transition ${filterMaterial === 'hdf' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'}`}
              >
                ไม้ HDF
              </button>
              <button
                type="button"
                onClick={() => setFilterMaterial('solid_wood')}
                className={`px-2.5 py-1 rounded-lg transition ${filterMaterial === 'solid_wood' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'}`}
              >
                ไม้จริง
              </button>
              <button
                type="button"
                onClick={() => setFilterMaterial('wpc')}
                className={`px-2.5 py-1 rounded-lg transition ${filterMaterial === 'wpc' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'}`}
              >
                WPC ไม้สังเคราะห์
              </button>
              <button
                type="button"
                onClick={() => setFilterMaterial('upvc')}
                className={`px-2.5 py-1 rounded-lg transition ${filterMaterial === 'upvc' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'}`}
              >
                UPVC
              </button>
              <button
                type="button"
                onClick={() => setFilterMaterial('pvc')}
                className={`px-2.5 py-1 rounded-lg transition ${filterMaterial === 'pvc' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'}`}
              >
                PVC
              </button>
            </div>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCatalog.map(item => {
            const isSelected = !!selectedDoors[item.id];
            const currentQty = selectedDoors[item.id]?.qty || 1;
            const lineTotal = (item.defaultMaterialPrice + item.defaultLaborPrice) * currentQty;

            return (
              <div
                key={item.id}
                onClick={() => handleToggleSelect(item)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-400/80 shadow-lg shadow-amber-950/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 font-mono">
                        ขนาด {item.widthCm} x 200 ซม.
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {item.materialType === 'hdf' ? 'ไม้ HDF' : item.materialType === 'solid_wood' ? 'ไม้จริงแท้' : item.materialType === 'wpc' ? 'WPC ไม้สังเคราะห์' : item.materialType === 'upvc' ? 'UPVC เกรดสูง' : 'PVC กันน้ำ'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.doorType === 'bathroom' ? '🚿 ห้องน้ำ' : item.doorType === 'bedroom' ? '🛏️ ห้องนอน' : '🏡 ทางเข้า/หน้าบ้าน'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                        isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'border border-slate-700 text-transparent'
                      }`}>
                        ✓
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2">{item.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                  
                  <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex flex-col gap-0.5">
                    <div><strong>วงกบ:</strong> {item.frameMaterial}</div>
                    <div><strong>อุปกรณ์:</strong> {item.hardwareIncluded}</div>
                  </div>
                </div>

                {/* Price and Quantity Adjuster */}
                <div 
                  className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">
                      ค่าบาน+วงกบ ฿{item.defaultMaterialPrice.toLocaleString()} + แรงติดตั้ง ฿{item.defaultLaborPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      รวม ฿{(item.defaultMaterialPrice + item.defaultLaborPrice).toLocaleString()} / ชุด
                    </span>
                  </div>

                  {isSelected ? (
                    <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-amber-500/40">
                      <span className="text-[11px] text-slate-300">จำนวน:</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.id, -1)}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-white text-xs"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-amber-300 px-1 text-xs">{currentQty} ชุด</span>
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
                      + เลือกประตูนี้
                    </button>
                  )}
                </div>

                {isSelected && (
                  <div className="text-right text-[11px] text-amber-300 font-mono font-semibold">
                    ราคารวมทั้งรายการ: ฿{lineTotal.toLocaleString()}
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
              เลือกแล้ว <strong className="text-amber-400 font-bold">{selectedCount}</strong> รายการ
            </span>
            {selectedCount > 0 && (
              <span className="text-xs font-mono text-amber-400">
                (ประมาณการรวม: ฿{estimatedTotal.toLocaleString()})
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
