import React from 'react';
import { BOQItem, ConstructionCategory } from '../types';
import { CATEGORY_LABELS } from '../constants';
interface BOQTableProps {
  items: BOQItem[];
  selectedCategory: ConstructionCategory | 'all';
  onUpdateItem: (id: string, updated: Partial<BOQItem>) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (category: ConstructionCategory) => void;
}
export const BOQTable: React.FC<BOQTableProps> = ({
  items,
  selectedCategory,
  onUpdateItem,
  onDeleteItem,
  onAddItem
}) => {
  // Group by category when 'all' is selected
  const categoriesToRender: ConstructionCategory[] = selectedCategory === 'all'
    ? (Object.keys(CATEGORY_LABELS) as ConstructionCategory[])
    : [selectedCategory];
  // Helper สำหรับเพิ่ม/ลดปริมาณ
  const handleStepQuantity = (item: BOQItem, delta: number) => {
    const step = item.unit === 'ตร.ม.' || item.unit === 'ม.' ? 1 : item.unit === 'ลบ.ม.' ? 0.5 : 1;
    const currentQty = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
    const newQty = Math.max(0, Math.round((currentQty + (delta * step)) * 10) / 10);
    onUpdateItem(item.id, { quantity: newQty });
  };
  return (
    <div className="flex flex-col gap-6 w-full">
      {categoriesToRender.map(catKey => {
        const catItems = items.filter(i => i.category === catKey);
        const catInfo = CATEGORY_LABELS[catKey];
        if (selectedCategory !== 'all' && catItems.length === 0 && selectedCategory !== catKey) {
          return null;
        }
        const catMatTotal = catItems.reduce((acc, cur) => acc + ((cur.quantity || 0) * (cur.materialUnitPrice || 0) * (1 + (cur.wastePercent || 0) / 100)), 0);
        const catLabTotal = catItems.reduce((acc, cur) => acc + ((cur.quantity || 0) * (cur.laborUnitPrice || 0)), 0);
        return (
          <div key={catKey} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {/* Category Header */}
            <div className="px-5 py-3.5 bg-slate-850/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400 text-xl">{catInfo.icon}</span>
                <span className="font-bold text-sm text-slate-100">{catInfo.title}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {catItems.length} รายการ
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-400">
                  ค่าของ: <strong className="text-slate-200">฿{Math.round(catMatTotal).toLocaleString()}</strong>
                </span>
                <span className="text-slate-400">
                  ค่าแรง: <strong className="text-slate-200">฿{Math.round(catLabTotal).toLocaleString()}</strong>
                </span>
                <span className="text-amber-400 font-bold">
                  รวม: ฿{Math.round(catMatTotal + catLabTotal).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => onAddItem(catKey)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition text-xs flex items-center gap-1 font-sans font-semibold border border-indigo-500/40"
                >
                  <span className="material-symbols-outlined text-xs">add</span> เพิ่มรายการใหม่
                </button>
              </div>
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/40 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">รายการวัสดุและงานก่อสร้าง</th>
                    <th className="py-2.5 px-3 min-w-[150px]">สเปก / รายละเอียด</th>
                    <th className="py-2.5 px-2 min-w-[130px] text-right">ปรับปริมาณ</th>
                    <th className="py-2.5 px-2 w-16 text-center">หน่วย</th>
                    <th className="py-2.5 px-2 w-24 text-right">ค่าของ/หน่วย (฿)</th>
                    <th className="py-2.5 px-2 w-16 text-right">เผื่อ%</th>
                    <th className="py-2.5 px-2 w-24 text-right">ค่าแรง/หน่วย (฿)</th>
                    <th className="py-2.5 px-3 w-28 text-right font-semibold text-slate-300">รวมเงิน (฿)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {catItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-slate-500 italic">
                        ยังไม่มีรายการในหมวดนี้ คลิก "+ เพิ่มรายการใหม่" เพื่อเริ่มต้น
                      </td>
                    </tr>
                  ) : (
                    catItems.map((item, idx) => {
                      const safeQty = Number(item.quantity) || 0;
                      const safeMatPrice = Number(item.materialUnitPrice) || 0;
                      const safeLabPrice = Number(item.laborUnitPrice) || 0;
                      const safeWaste = Number(item.wastePercent) || 0;
                      const matTotal = safeQty * safeMatPrice * (1 + safeWaste / 100);
                      const labTotal = safeQty * safeLabPrice;
                      const lineTotal = matTotal + labTotal;
                      return (
                        <tr key={item.id} className="hover:bg-slate-850/50 group transition">
                          <td className="py-2 px-3 text-center text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                          
                          {/* Name */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => onUpdateItem(item.id, { name: e.target.value })}
                              className="w-full bg-transparent border-0 border-b border-transparent focus:border-indigo-400 focus:bg-slate-950/60 rounded px-1.5 py-0.5 text-slate-100 font-medium focus:outline-none"
                            />
                          </td>
                          {/* Spec */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.spec}
                              onChange={(e) => onUpdateItem(item.id, { spec: e.target.value })}
                              className="w-full bg-transparent border-0 border-b border-transparent focus:border-indigo-400 focus:bg-slate-950/60 rounded px-1.5 py-0.5 text-slate-400 text-[11px] focus:outline-none"
                            />
                          </td>
                          {/* Quantity with quick +/- buttons */}
                          <td className="py-2 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStepQuantity(item, -1)}
                                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-bold flex items-center justify-center text-xs transition shrink-0"
                                title="ลดปริมาณ"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.quantity === 0 ? '' : item.quantity}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  onUpdateItem(item.id, { quantity: isNaN(val) ? 0 : val });
                                }}
                                className="w-16 text-right bg-slate-950/40 border border-slate-700/60 focus:border-amber-400 focus:bg-slate-950 rounded px-1.5 py-0.5 text-amber-400 font-mono font-bold focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleStepQuantity(item, 1)}
                                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-400 font-bold flex items-center justify-center text-xs transition shrink-0"
                                title="เพิ่มปริมาณ"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          {/* Unit */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => onUpdateItem(item.id, { unit: e.target.value })}
                              className="w-full text-center bg-transparent border-0 border-b border-transparent focus:border-indigo-400 focus:bg-slate-950/60 rounded px-1 py-0.5 text-slate-300 text-[11px] focus:outline-none"
                            />
                          </td>
                          {/* Material Price */}
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.materialUnitPrice === 0 ? '' : item.materialUnitPrice}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                onUpdateItem(item.id, { materialUnitPrice: isNaN(val) ? 0 : val });
                              }}
                              className="w-full text-right bg-transparent border-0 border-b border-transparent focus:border-indigo-400 focus:bg-slate-950/60 rounded px-1 py-0.5 text-slate-200 font-mono focus:outline-none"
                            />
                          </td>
                          {/* Waste % */}
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={item.wastePercent === 0 ? '' : item.wastePercent}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                onUpdateItem(item.id, { wastePercent: isNaN(val) ? 0 : val });
                              }}
                              className="w-12 text-right bg-transparent border-0 border-b border-transparent focus:border-indigo-400 focus:bg-slate-950/60 rounded px-1 py-0.5 text-slate-400 font-mono text-[10px] focus:outline-none"
                            />
                          </td>
                          {/* Labor Price */}
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.laborUnitPrice === 0 ? '' : item.laborUnitPrice}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                onUpdateItem(item.id, { laborUnitPrice: isNaN(val) ? 0 : val });
                              }}
                              className="w-full text-right bg-transparent border-0 border-b border-transparent focus:border-indigo-400 focus:bg-slate-950/60 rounded px-1 py-0.5 text-cyan-300 font-mono focus:outline-none"
                            />
                          </td>
                          {/* Total Line Amount */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">
                            ฿{Math.round(lineTotal).toLocaleString()}
                          </td>
                          {/* Delete action */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition p-1"
                              title="ลบรายการ"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};