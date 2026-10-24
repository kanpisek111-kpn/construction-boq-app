import React, { useState } from 'react';
import { ALUMINUM_CATALOG } from '../constants';
import { AluminumItemPreset, BOQItem } from '../types';
interface AluminumSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: BOQItem[]) => void;
}
export const AluminumSelectorModal: React.FC<AluminumSelectorModalProps> = ({
  isOpen,
  onClose,
  onAddItems
}) => {
  const [filterType, setFilterType] = useState<'all' | 'door' | 'window'>('all');
  const [selectedPresets, setSelectedPresets] = useState<{ [id: string]: { qty: number; preset: AluminumItemPreset } }>({});
  const [frameColorChoice, setFrameColorChoice] = useState<'black' | 'white' | 'anodize'>('black');
  const [glassChoice, setGlassChoice] = useState<'clear_green' | 'clear' | 'euro_gray'>('clear_green');
  if (!isOpen) return null;
  const filteredCatalog = ALUMINUM_CATALOG.filter(item => {
    if (filterType === 'all') return true;
    return item.categoryType === filterType;
  });
  const handleToggleSelect = (preset: AluminumItemPreset) => {
    setSelectedPresets(prev => {
      const copy = { ...prev };
      if (copy[preset.id]) {
        delete copy[preset.id];
      } else {
        copy[preset.id] = { qty: preset.categoryType === 'door' ? 1 : 2, preset };
      }
      return copy;
    });
  };
  const handleQtyChange = (id: string, delta: number) => {
    setSelectedPresets(prev => {
      if (!prev[id]) return prev;
      const newQty = Math.max(1, prev[id].qty + delta);
      return {
        ...prev,
        [id]: { ...prev[id], qty: newQty }
      };
    });
  };
  const selectedCount = Object.keys(selectedPresets).length;
  const estimatedTotal = Object.values(selectedPresets).reduce((sum, { qty, preset }) => {
    return sum + (qty * (preset.defaultMaterialPrice + preset.defaultLaborPrice));
  }, 0);
  const handleApplyToBOQ = () => {
    const frameLabel = frameColorChoice === 'black' ? 'อลูมิเนียมดำหนา 1.2-1.5 มม.' : frameColorChoice === 'white' ? 'อลูมิเนียมอบขาว 1.2-1.5 มม.' : 'อลูมิเนียมอโนไดซ์สีธรรมชาติ';
    const glassLabel = glassChoice === 'clear_green' ? 'กระจกเขียวตัดแสง 6 มม.' : glassChoice === 'euro_gray' ? 'กระจกสีชา/ยูโรเกรย์ 6 มม.' : 'กระจกใส 6 มม.';
    const newBOQItems: BOQItem[] = Object.values(selectedPresets).map(({ qty, preset }, idx) => ({
      id: `alu-custom-${Date.now()}-${idx}`,
      category: 'doors_windows',
      name: `[${preset.categoryType === 'door' ? 'ประตู' : 'หน้าต่าง'}] ${preset.name}`,
      spec: `ขนาด ${preset.dimensions} (${frameLabel} + ${glassLabel})`,
      quantity: qty,
      unit: preset.unit,
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
            <span className="material-symbols-outlined text-cyan-400 text-2xl">door_front</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                เลือกประเภทและเช็คราคา ประตู-หน้าต่าง อลูมิเนียม
              </h2>
              <p className="text-xs text-slate-400">
                เลือกรูปแบบบานเลื่อน บานเปิด บานกระทุ้ง บานเฟี้ยม พร้อมอัปเดตราคาวัสดุและค่าแรงติดตั้งลง BOQ
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
        {/* Global Options Bar (Frame & Glass Color) */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">สีกรอบอลูมิเนียม:</span>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFrameColorChoice('black')}
                  className={`px-2.5 py-1 rounded text-xs transition ${frameColorChoice === 'black' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
                >
                  ⬛ สีดำพาวเดอร์โค้ท
                </button>
                <button
                  type="button"
                  onClick={() => setFrameColorChoice('white')}
                  className={`px-2.5 py-1 rounded text-xs transition ${frameColorChoice === 'white' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
                >
                  ⬜ สีอบขาว
                </button>
                <button
                  type="button"
                  onClick={() => setFrameColorChoice('anodize')}
                  className={`px-2.5 py-1 rounded text-xs transition ${frameColorChoice === 'anodize' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
                >
                  🔘 อโนไดซ์เงิน
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">สีกระจก:</span>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setGlassChoice('clear_green')}
                  className={`px-2.5 py-1 rounded text-xs transition ${glassChoice === 'clear_green' ? 'bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400'}`}
                >
                  🟢 เขียวตัดแสง 6มม.
                </button>
                <button
                  type="button"
                  onClick={() => setGlassChoice('euro_gray')}
                  className={`px-2.5 py-1 rounded text-xs transition ${glassChoice === 'euro_gray' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
                >
                  ⚫ ชา/ยูโรเกรย์ 6มม.
                </button>
                <button
                  type="button"
                  onClick={() => setGlassChoice('clear')}
                  className={`px-2.5 py-1 rounded text-xs transition ${glassChoice === 'clear' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
                >
                  ⚪ ใส 6มม.
                </button>
              </div>
            </div>
          </div>
          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition ${filterType === 'all' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              ทั้งหมด ({ALUMINUM_CATALOG.length})
            </button>
            <button
              onClick={() => setFilterType('door')}
              className={`px-3 py-1 rounded-lg transition ${filterType === 'door' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              🚪 งานประตู
            </button>
            <button
              onClick={() => setFilterType('window')}
              className={`px-3 py-1 rounded-lg transition ${filterType === 'window' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              🪟 งานหน้าต่าง
            </button>
          </div>
        </div>
        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCatalog.map(item => {
            const isSelected = !!selectedPresets[item.id];
            const currentQty = selectedPresets[item.id]?.qty || 1;
            const lineTotal = (item.defaultMaterialPrice + item.defaultLaborPrice) * currentQty;
            return (
              <div
                key={item.id}
                onClick={() => handleToggleSelect(item)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400/80 shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.categoryType === 'door' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {item.categoryType === 'door' ? 'ประตู' : 'หน้าต่าง'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{item.dimensions}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                        isSelected ? 'bg-cyan-500 text-slate-950 font-bold' : 'border border-slate-700 text-transparent'
                      }`}>
                        ✓
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1.5">{item.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                </div>
                {/* Price & Quantity Adjuster */}
                <div 
                  className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">
                      ค่าของ ฿{item.defaultMaterialPrice.toLocaleString()} + แรง ฿{item.defaultLaborPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      รวม ฿{(item.defaultMaterialPrice + item.defaultLaborPrice).toLocaleString()} / {item.unit}
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
                      <span className="font-mono font-bold text-cyan-300 px-1 text-xs">{currentQty} {item.unit}</span>
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
              เลือกแล้ว <strong className="text-cyan-400 font-bold">{selectedCount}</strong> รายการ
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition active:scale-95"
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