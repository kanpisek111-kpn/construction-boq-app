import React, { useState, useMemo } from 'react';
import { PaymentMilestone, MilestoneTemplate, ConstructionCategory } from '../types';
import { MILESTONE_TEMPLATES, DEFAULT_4_MILESTONES, CATEGORY_LABELS } from '../constants';

interface MilestonesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestones: PaymentMilestone[];
  onSaveMilestones: (updated: PaymentMilestone[]) => void;
  grandTotal: number;
}

export const MilestonesManagerModal: React.FC<MilestonesManagerModalProps> = ({
  isOpen,
  onClose,
  milestones,
  onSaveMilestones,
  grandTotal
}) => {
  const [items, setItems] = useState<PaymentMilestone[]>(() => {
    return milestones && milestones.length > 0 ? milestones : DEFAULT_4_MILESTONES;
  });
  const [activeEditingId, setActiveEditingId] = useState<string | null>(items[0]?.id || null);

  // คำนวณเปอร์เซ็นต์รวม
  const totalPercentage = useMemo(() => {
    return Math.round(items.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0) * 10) / 10;
  }, [items]);

  const isBalanced = Math.abs(totalPercentage - 100) < 0.05;

  if (!isOpen) return null;

  // ปรับเปอร์เซ็นต์
  const handleUpdatePercentage = (id: string, val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    const cleanVal = isNaN(num) ? 0 : Math.max(0, Math.min(100, Math.round(num)));
    setItems(prev => prev.map(m => m.id === id ? { ...m, percentage: cleanVal } : m));
  };

  // ปรับแก้ข้อมูลทั่วไป
  const handleUpdateMilestone = (id: string, patch: Partial<PaymentMilestone>) => {
    setItems(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  // สลับหมวดหมู่งานที่ผูกกับงวดนี้
  const handleToggleCategoryForMilestone = (milestoneId: string, category: ConstructionCategory) => {
    setItems(prev => {
      // 1. ถอดหมวดนี้ออกจากงวดอื่นก่อน เพื่อให้ 1 หมวดมีงวดหลักที่ชัดเจน
      const targetMilestone = prev.find(m => m.id === milestoneId);
      const isAlreadyIncluded = targetMilestone?.matchedCategories?.includes(category);

      return prev.map(m => {
        const currentCats = m.matchedCategories || [];
        if (m.id === milestoneId) {
          return {
            ...m,
            matchedCategories: isAlreadyIncluded 
              ? currentCats.filter(c => c !== category)
              : [...currentCats, category]
          };
        } else {
          // นำออกจากงวดอื่นถ้ากำลังเลือกให้งวดนี้
          return {
            ...m,
            matchedCategories: currentCats.filter(c => c !== category)
          };
        }
      });
    });
  };

  // ปรับสมดุลให้ครบ 100% อัตโนมัติ (Rebalance to 100%)
  const handleAutoRebalance = (currentList: PaymentMilestone[] = items): PaymentMilestone[] => {
    if (currentList.length === 0) return currentList;
    const currentSum = currentList.reduce((s, m) => s + (Number(m.percentage) || 0), 0);
    
    if (currentSum === 0) {
      const equalShare = Math.floor(100 / currentList.length);
      const remainder = 100 - (equalShare * currentList.length);
      return currentList.map((m, idx) => ({
        ...m,
        percentage: idx === currentList.length - 1 ? equalShare + remainder : equalShare
      }));
    }

    let distributed = 0;
    const rebalanced = currentList.map((m, idx) => {
      if (idx === currentList.length - 1) {
        const finalP = Math.max(1, 100 - distributed);
        return { ...m, percentage: finalP };
      }
      const rawP = Math.round((m.percentage / currentSum) * 100);
      distributed += rawP;
      return { ...m, percentage: rawP };
    });

    return rebalanced;
  };

  const handleApplyRebalance = () => {
    const rebalanced = handleAutoRebalance(items);
    setItems(rebalanced);
  };

  // โหลดแม่แบบงวดงาน (Template Picker)
  const handleApplyTemplate = (tmpl: MilestoneTemplate) => {
    const newItems: PaymentMilestone[] = tmpl.milestones.map((m, idx) => ({
      id: `mile-${Date.now()}-${idx}`,
      milestoneNumber: m.milestoneNumber,
      title: m.title,
      percentage: m.percentage,
      durationDays: m.durationDays,
      deliverables: [...m.deliverables],
      inspectionCriteria: m.inspectionCriteria,
      status: idx === 0 ? 'in_progress' : 'pending'
    }));
    setItems(newItems);
    setActiveEditingId(newItems[0]?.id || null);
  };

  // เพิ่มงวดงานใหม่
  const handleAddMilestone = () => {
    const nextNumber = items.length + 1;
    const newMilestone: PaymentMilestone = {
      id: `mile-custom-${Date.now()}`,
      milestoneNumber: nextNumber,
      title: `งวดที่ ${nextNumber}: ระบุเนื้องานก่อสร้างและสั่งซื้อวัสดุ`,
      percentage: 10,
      durationDays: 20,
      deliverables: ['ระบุงานส่งมอบสำหรับงวดนี้'],
      inspectionCriteria: 'เงื่อนไขการตรวจสอบรับมอบงาน',
      status: 'pending',
      matchedCategories: []
    };
    setItems(prev => [...prev, newMilestone]);
    setActiveEditingId(newMilestone.id);
  };

  // ลบงวดงาน
  const handleDeleteMilestone = (id: string) => {
    if (items.length <= 2) {
      alert('สัญญาจ้างควรกำหนดงวดงานอย่างน้อย 2 งวด');
      return;
    }
    const filtered = items.filter(m => m.id !== id);
    const renumbered = filtered.map((m, idx) => ({
      ...m,
      milestoneNumber: idx + 1
    }));
    setItems(renumbered);
    if (activeEditingId === id) {
      setActiveEditingId(renumbered[0]?.id || null);
    }
  };

  // จัดการ Deliverables (เนื้องานย่อย)
  const handleAddDeliverable = (milestoneId: string) => {
    setItems(prev => prev.map(m => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        deliverables: [...m.deliverables, 'รายการส่งมอบใหม่']
      };
    }));
  };

  const handleUpdateDeliverable = (milestoneId: string, index: number, text: string) => {
    setItems(prev => prev.map(m => {
      if (m.id !== milestoneId) return m;
      const updatedDeliv = [...m.deliverables];
      updatedDeliv[index] = text;
      return { ...m, deliverables: updatedDeliv };
    }));
  };

  const handleDeleteDeliverable = (milestoneId: string, index: number) => {
    setItems(prev => prev.map(m => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        deliverables: m.deliverables.filter((_, i) => i !== index)
      };
    }));
  };

  // กดบันทึก - หากเปอร์เซ็นต์ยังไม่ครบ 100% จะช่วยปรับเกลี่ยให้ครบ 100% อัตโนมัติทันที
  const handleSaveAndApply = () => {
    let finalItems = items;
    if (!isBalanced) {
      finalItems = handleAutoRebalance(items);
    }
    onSaveMilestones(finalItems);
    onClose();
  };

  const activeMilestone = items.find(m => m.id === activeEditingId) || items[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-md">
              <span className="material-symbols-outlined text-2xl font-bold">payments</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>ปรับแต่งงวดงาน & เชื่อมโยงรายการสั่งซื้อหน้างาน</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  {items.length} งวดงาน
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                แก้ไขรายละเอียดงวดงาน สัดส่วนเงิน %, วันทำงาน, รายการส่งมอบ, เกณฑ์ตรวจรับ และกำหนดหมวดวัสดุสั่งซื้อให้ตรงงวด
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

        {/* Template Selector & Percentage Balance Bar */}
        <div className="px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          
          {/* แม่แบบงวดงาน */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-amber-400">bookmark</span>
              เลือกแม่แบบงวดงาน:
            </span>
            <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 flex-wrap gap-0.5">
              {MILESTONE_TEMPLATES.map(tmpl => {
                const isSelected = items.length === tmpl.milestonesCount;
                const is4Stages = tmpl.milestonesCount === 4;

                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black shadow'
                        : is4Stages
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={tmpl.description}
                  >
                    {is4Stages && <span className="material-symbols-outlined text-xs">bolt</span>}
                    <span>{tmpl.milestonesCount} งวด</span>
                    <span className="text-[10px] opacity-80">
                      ({tmpl.milestones.map(m => m.percentage).join('-')}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* สัดส่วนรวม % Indicator & ปุ่ม Rebalance */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">สัดส่วนรวม:</span>
              <span className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg border ${
                isBalanced
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {totalPercentage}% {isBalanced ? '✓ ครบ 100%' : `(ขาด/เกิน ${Math.round((100 - totalPercentage) * 10) / 10}%)`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleApplyRebalance}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1 transition shadow-sm"
              title="ปรับสัดส่วนเปอร์เซ็นต์ให้ครบ 100% พอดี"
            >
              <span className="material-symbols-outlined text-xs">auto_fix_high</span>
              <span>เฉลี่ย 100%</span>
            </button>

            <button
              type="button"
              onClick={handleAddMilestone}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-semibold flex items-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              <span>เพิ่มงวด</span>
            </button>
          </div>
        </div>

        {/* Content Body: Split View */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* ด้านซ้าย: รายการงวดงาน */}
          <div className="w-full md:w-5/12 border-r border-slate-800 bg-slate-950/60 p-4 overflow-y-auto flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 px-1">
              <span>เลือกงวดงานเพื่อแก้ไขรายละเอียด:</span>
              <span className="font-mono text-[11px] text-amber-400 font-bold">
                ยอดรวม ฿{grandTotal.toLocaleString()}
              </span>
            </div>

            {items.map((m) => {
              const amount = Math.round(grandTotal * (m.percentage / 100));
              const isSelected = activeEditingId === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => setActiveEditingId(m.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-950/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {m.milestoneNumber}
                      </span>
                      <span className="font-bold text-xs text-white leading-tight">
                        {m.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={m.percentage}
                        onChange={(e) => handleUpdatePercentage(m.id, e.target.value)}
                        className="w-14 text-right bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-amber-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-slate-400 font-mono text-xs">%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={m.percentage}
                      onChange={(e) => handleUpdatePercentage(m.id, e.target.value)}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 font-mono">
                    <span className="text-slate-400">
                      ระยะเวลา ~{m.durationDays || 30} วัน ({m.deliverables.length} งาน)
                    </span>
                    <span className="font-bold text-amber-300">
                      ฿{amount.toLocaleString()} บาท
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ด้านขวา: เจาะลึกงวดงานที่เลือก */}
          <div className="flex-1 bg-slate-900 p-6 overflow-y-auto flex flex-col gap-5">
            {activeMilestone ? (
              <div className="flex flex-col gap-4">
                
                {/* Header งวดงานที่เลือก */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black font-mono text-xs">
                        งวดที่ {activeMilestone.milestoneNumber}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        (สัดส่วน {activeMilestone.percentage}% ~ ฿{Math.round(grandTotal * (activeMilestone.percentage / 100)).toLocaleString()} บาท)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">ระยะเวลา:</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={activeMilestone.durationDays || 30}
                        onChange={(e) => handleUpdateMilestone(activeMilestone.id, { durationDays: parseInt(e.target.value) || 1 })}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center text-xs text-white font-mono font-bold"
                      />
                      <span className="text-xs text-slate-400">วัน</span>

                      {items.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMilestone(activeMilestone.id)}
                          className="text-slate-500 hover:text-red-400 p-1 transition ml-2"
                          title="ลบงวดนี้"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">ชื่องวดงาน (ปรากฏในสัญญาและใบเสนอราคา):</label>
                    <input
                      type="text"
                      value={activeMilestone.title}
                      onChange={(e) => handleUpdateMilestone(activeMilestone.id, { title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                {/* 🚚 เชื่อมโยงหมวดหมู่งานที่ต้องสั่งซื้อวัสดุในงวดนี้ 🚚 */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-amber-500/30 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-400">local_shipping</span>
                      หมวดหมู่วัสดุที่ผูกให้สั่งซื้อในงวดนี้ (ซื้อให้ตรงงวด)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      คลิกเพื่อเลือกหมวดงานที่ต้องสั่งของในงวดที่ {activeMilestone.milestoneNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                    {(Object.keys(CATEGORY_LABELS) as ConstructionCategory[]).map(catKey => {
                      const info = CATEGORY_LABELS[catKey];
                      const isMatched = activeMilestone.matchedCategories?.includes(catKey);

                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => handleToggleCategoryForMilestone(activeMilestone.id, catKey)}
                          className={`p-2 rounded-lg border text-left text-[11px] flex items-center gap-2 transition ${
                            isMatched
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm shrink-0">{info.icon}</span>
                          <span className="truncate">{info.title.split('. ')[1] || info.title}</span>
                          {isMatched && <span className="ml-auto text-amber-400 font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* รายการเนื้องานส่งมอบ */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">checklist</span>
                      เนื้องานที่ต้องส่งมอบในงวดนี้ (Deliverables)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddDeliverable(activeMilestone.id)}
                      className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[11px] font-medium hover:bg-cyan-900 transition flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      <span>เพิ่มข้อส่งมอบ</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {activeMilestone.deliverables.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono text-[11px] w-4 text-center">{idx + 1}.</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleUpdateDeliverable(activeMilestone.id, idx, e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                        />
                        {activeMilestone.deliverables.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDeliverable(activeMilestone.id, idx)}
                            className="text-slate-600 hover:text-red-400 p-1 transition"
                            title="ลบข้อนี้"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* เกณฑ์การตรวจสอบรับมอบงาน */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    เกณฑ์การตรวจสอบรับมอบงาน (Inspection & Acceptance Criteria)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    เงื่อนไขที่เจ้าของบ้าน/วิศวกรผู้ควบคุมงานจะใช้ตรวจประเมินก่อนอนุมัติจ่ายเงินงวด:
                  </p>
                  <textarea
                    rows={3}
                    value={activeMilestone.inspectionCriteria}
                    onChange={(e) => handleUpdateMilestone(activeMilestone.id, { inspectionCriteria: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                    placeholder="เช่น ตรวจระดับพื้น คอนกรีตไม่มีโพรงอากาศ ทดสอบแรงดันน้ำท่อประปา..."
                  />
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                เลือกงวดงานทางด้านซ้ายเพื่อแก้ไขรายละเอียด
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              สถานะสัดส่วน:
            </span>
            <span className={`text-xs font-mono font-bold ${isBalanced ? 'text-emerald-400' : 'text-amber-300'}`}>
              {totalPercentage}% {isBalanced ? '(ครบ 100% พอดี)' : '(ระบบจะเฉลี่ยให้ครบ 100% ให้อัตโนมัติเมื่อกดบันทึก)'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSaveAndApply}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              บันทึกและเชื่อมโยงเข้างวดงาน BOQ ทันที
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
