import React, { useState, useEffect, useMemo } from 'react';
import { 
  BOQItem, 
  PriceBookConfig, 
  RegionalPreset, 
  RegionalZoneId, 
  MasterRatesConfig, 
  SavedPriceBookItem, 
  ConstructionCategory 
} from '../types';
import { 
  REGIONAL_PRESETS, 
  DEFAULT_MASTER_RATES, 
  INITIAL_SAVED_CUSTOM_ITEMS,
  PRICE_BOOK_LIBRARY_VERSION,
  applyPriceBookToItems, 
  applyPriceBookToSingleItem,
  resetPriceBookConfig 
} from '../services/priceBookService';
import { CATEGORY_LABELS } from '../constants';
import { LicenseTier } from '../services/authService';

interface PriceBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: PriceBookConfig;
  onSaveConfig: (newConfig: PriceBookConfig) => void;
  currentBOQItems: BOQItem[];
  onApplyToBOQ: (updatedItems: BOQItem[]) => void;
  onInsertCustomItem: (item: BOQItem) => void;
  licenseTier?: LicenseTier;
  onRequestUpgrade?: (feature: string) => void;
  currentHouseAreaSqm?: number;
}

export const PriceBookModal: React.FC<PriceBookModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
  currentBOQItems,
  onApplyToBOQ,
  onInsertCustomItem,
  licenseTier = 'starter',
  onRequestUpgrade,
  currentHouseAreaSqm = 120
}) => {
  const [activeTab, setActiveTab] = useState<'regional' | 'master_rates' | 'my_items'>('regional');
  const [draftConfig, setDraftConfig] = useState<PriceBookConfig>(currentConfig);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Local string state for Tab 2 Master Rates inputs to allow full backspacing/editing without snapping
  const [masterRateInputs, setMasterRateInputs] = useState<Record<string, string>>({});

  // Form state for creating a new custom item in Tab 3
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ConstructionCategory>('finishes');
  const [newItemSpec, setNewItemSpec] = useState('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnit, setNewItemUnit] = useState('ตร.ม.');
  const [newItemMatPrice, setNewItemMatPrice] = useState<number>(0);
  const [newItemLabPrice, setNewItemLabPrice] = useState<number>(0);
  const [newItemWaste, setNewItemWaste] = useState<number>(0);
  const [newItemCustomGroup, setNewItemCustomGroup] = useState('ทั่วไป');
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);

  // Filter for Tab 3
  const [customItemFilterCategory, setCustomItemFilterCategory] = useState<string>('all');
  const [customItemSearch, setCustomItemSearch] = useState('');

  // Sync draft when opened - ensure savedCustomItems has default library merged without deleting user custom items
  useEffect(() => {
    if (isOpen) {
      let items = currentConfig.savedCustomItems || [];
      if (currentConfig.libraryVersion !== PRICE_BOOK_LIBRARY_VERSION) {
        const existingIds = new Set(items.map(i => i.savedId));
        const missingDefaults = INITIAL_SAVED_CUSTOM_ITEMS.filter(def => !existingIds.has(def.savedId));
        items = [...items, ...missingDefaults];
      } else if (items.length === 0) {
        items = [...INITIAL_SAVED_CUSTOM_ITEMS];
      }

      const validConfig: PriceBookConfig = {
        ...currentConfig,
        libraryVersion: PRICE_BOOK_LIBRARY_VERSION,
        savedCustomItems: items
      };
      setDraftConfig(validConfig);
      if (currentConfig.libraryVersion !== PRICE_BOOK_LIBRARY_VERSION || !currentConfig.savedCustomItems || currentConfig.savedCustomItems.length === 0) {
        onSaveConfig(validConfig);
      }
      setToast(null);
      setIsAddingNewItem(false);

      // Initialize Master Rates input strings
      setMasterRateInputs({
        concreteReadyMixedPerCuM: String(validConfig.masterRates?.concreteReadyMixedPerCuM ?? DEFAULT_MASTER_RATES.concreteReadyMixedPerCuM ?? 2150),
        steelDeformedBarPerKg: String(validConfig.masterRates?.steelDeformedBarPerKg ?? DEFAULT_MASTER_RATES.steelDeformedBarPerKg ?? 28),
        formworkPerSqm: String(validConfig.masterRates?.formworkPerSqm ?? DEFAULT_MASTER_RATES.formworkPerSqm ?? 240),
        masonryLaborPerSqm: String(validConfig.masterRates?.masonryLaborPerSqm ?? DEFAULT_MASTER_RATES.masonryLaborPerSqm ?? 100),
        plasterLaborPerSqm: String(validConfig.masterRates?.plasterLaborPerSqm ?? DEFAULT_MASTER_RATES.plasterLaborPerSqm ?? 95),
        tileLaborPerSqm: String(validConfig.masterRates?.tileLaborPerSqm ?? DEFAULT_MASTER_RATES.tileLaborPerSqm ?? 200),
        paintLaborPerSqm: String(validConfig.masterRates?.paintLaborPerSqm ?? DEFAULT_MASTER_RATES.paintLaborPerSqm ?? 40),
      });
    }
  }, [isOpen]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  if (!isOpen) return null;

  const isDemo = licenseTier === 'demo';

  // 1. เลือกภูมิภาค
  const handleSelectRegion = (preset: RegionalPreset) => {
    const updated: PriceBookConfig = {
      ...draftConfig,
      regionId: preset.id,
      regionName: preset.name,
      materialMultiplier: preset.materialMultiplier,
      laborMultiplier: preset.laborMultiplier
    };
    setDraftConfig(updated);
    onSaveConfig(updated);
    showToast(`เปลี่ยนเป็น "${preset.name}" (วัสดุ ${(preset.materialMultiplier * 100).toFixed(0)}%, ค่าแรง ${(preset.laborMultiplier * 100).toFixed(0)}%) เรียบร้อย`, 'info');
  };

  // ปรับตัวคูณด้วยตนเอง (Custom Sliders / Inputs)
  const handleMultiplierChange = (type: 'material' | 'labor', val: number) => {
    const clamped = Math.max(0.5, Math.min(2.5, Math.round(val * 100) / 100));
    const isCustom = !REGIONAL_PRESETS.some(p => p.materialMultiplier === (type === 'material' ? clamped : draftConfig.materialMultiplier) && p.laborMultiplier === (type === 'labor' ? clamped : draftConfig.laborMultiplier));

    const updated: PriceBookConfig = {
      ...draftConfig,
      regionId: isCustom ? 'custom' : draftConfig.regionId,
      regionName: isCustom ? 'กำหนดสัดส่วนเอง (Custom)' : draftConfig.regionName,
      [type === 'material' ? 'materialMultiplier' : 'laborMultiplier']: clamped
    };
    setDraftConfig(updated);
    onSaveConfig(updated);
  };

  // สลับการนำไปใช้กับรายการใหม่อัตโนมัติ
  const handleToggleAutoApply = () => {
    const updated: PriceBookConfig = {
      ...draftConfig,
      autoApplyToNewItems: !draftConfig.autoApplyToNewItems
    };
    setDraftConfig(updated);
    onSaveConfig(updated);
    showToast(updated.autoApplyToNewItems ? 'เปิดการคูณสัดส่วนภูมิภาคกับรายการใหม่อัตโนมัติ ✓' : 'ปิดการคูณอัตโนมัติ (จะใช้ราคาตั้งต้นเดิม)');
  };

  // สลับการเปิดใช้ Master Rates เขียนทับราคาวัสดุหลัก
  const handleToggleMasterRateOverride = () => {
    const nextVal = !draftConfig.enableMasterRateOverride;
    const updated: PriceBookConfig = {
      ...draftConfig,
      enableMasterRateOverride: nextVal
    };
    setDraftConfig(updated);
    onSaveConfig(updated);
    showToast(
      nextVal 
        ? 'เปิดใช้ Master Rates เขียนทับราคาวัสดุหลักใน BOQ แล้ว ✓' 
        : 'ปิดใช้ Master Rates (จะปรับเฉพาะตัวคูณภูมิภาคตามราคาเดิมของแต่ละรายการ)',
      'info'
    );
  };

  // นำตัวคูณภูมิภาค & Master Rates ไปคำนวณปรับราคาทั้งตาราง BOQ ปัจจุบัน
  const handleApplyToCurrentBOQ = () => {
    if (isDemo) {
      if (onRequestUpgrade) onRequestUpgrade('ตัวปรับฐานราคาตามภูมิภาค & คลังราคาส่วนตัว');
      return;
    }
    const updated = applyPriceBookToItems(currentBOQItems, draftConfig);
    onApplyToBOQ(updated);
    showToast(`อัปเดตปรับฐานราคาทั้งตาราง BOQ (${updated.length} รายการ) ตามโซน ${draftConfig.regionName} สำเร็จแล้ว! ✓`, 'success');
  };

  // บันทึกและอัปเดตราคา Master Rates ลงตาราง BOQ (เปิด enableMasterRateOverride ให้อัตโนมัติ)
  const handleApplyMasterRatesToBOQ = () => {
    if (isDemo) {
      if (onRequestUpgrade) onRequestUpgrade('ราคากลาง Master Rates');
      return;
    }
    const updatedConfig: PriceBookConfig = {
      ...draftConfig,
      enableMasterRateOverride: true
    };
    setDraftConfig(updatedConfig);
    onSaveConfig(updatedConfig);
    const updated = applyPriceBookToItems(currentBOQItems, updatedConfig);
    onApplyToBOQ(updated);
    showToast(`เปิดใช้ Master Rates และอัปเดตราคาลงตาราง BOQ (${updated.length} รายการ) สำเร็จแล้ว! ✓`, 'success');
  };

  // 2. จัดการ Master Rates
  const handleMasterRateChange = (key: keyof MasterRatesConfig, val: number) => {
    const updatedRates: MasterRatesConfig = {
      ...draftConfig.masterRates,
      [key]: Math.max(0, val)
    };
    const updatedConfig: PriceBookConfig = {
      ...draftConfig,
      enableMasterRateOverride: true, // เปิดอัตโนมัติเมื่อผู้ใช้แก้ไขตัวเลขในแท็บ 2
      masterRates: updatedRates
    };
    setDraftConfig(updatedConfig);
    onSaveConfig(updatedConfig);
  };

  const handleResetMasterRates = () => {
    const updatedConfig: PriceBookConfig = {
      ...draftConfig,
      masterRates: { ...DEFAULT_MASTER_RATES }
    };
    setDraftConfig(updatedConfig);
    onSaveConfig(updatedConfig);
    setMasterRateInputs({
      concreteReadyMixedPerCuM: String(DEFAULT_MASTER_RATES.concreteReadyMixedPerCuM || 2150),
      steelDeformedBarPerKg: String(DEFAULT_MASTER_RATES.steelDeformedBarPerKg || 28),
      formworkPerSqm: String(DEFAULT_MASTER_RATES.formworkPerSqm || 240),
      masonryLaborPerSqm: String(DEFAULT_MASTER_RATES.masonryLaborPerSqm || 100),
      plasterLaborPerSqm: String(DEFAULT_MASTER_RATES.plasterLaborPerSqm || 95),
      tileLaborPerSqm: String(DEFAULT_MASTER_RATES.tileLaborPerSqm || 200),
      paintLaborPerSqm: String(DEFAULT_MASTER_RATES.paintLaborPerSqm || 40),
    });
    showToast('คืนค่ามาตรฐาน Master Rates เรียบร้อยแล้ว', 'info');
  };

  const handleMasterRateInputChange = (key: keyof MasterRatesConfig, valStr: string) => {
    setMasterRateInputs(prev => ({ ...prev, [key]: valStr }));
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed >= 0) {
      handleMasterRateChange(key, parsed);
    }
  };

  const handleMasterRateInputBlur = (key: keyof MasterRatesConfig, fallback: number) => {
    const currentStr = masterRateInputs[key];
    const parsed = parseFloat(currentStr);
    if (isNaN(parsed) || parsed <= 0) {
      setMasterRateInputs(prev => ({ ...prev, [key]: String(fallback) }));
      handleMasterRateChange(key, fallback);
    }
  };

  // 3. จัดการคลังรายการส่วนตัว (My Saved Items)
  const handleSaveNewCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      if (onRequestUpgrade) onRequestUpgrade('คลังราคาส่วนตัว');
      return;
    }
    if (!newItemName.trim()) {
      showToast('กรุณากรอกชื่อรายการวัสดุ/งาน', 'warning');
      return;
    }

    const newItem: SavedPriceBookItem = {
      savedId: `custom-item-${Date.now()}`,
      category: newItemCategory,
      name: newItemName.trim(),
      spec: newItemSpec.trim() || 'ตามมาตรฐานการก่อสร้าง',
      quantity: Math.max(0.1, newItemQty || 1),
      unit: newItemUnit.trim() || 'ชุด',
      materialUnitPrice: Math.max(0, newItemMatPrice || 0),
      laborUnitPrice: Math.max(0, newItemLabPrice || 0),
      wastePercent: Math.max(0, newItemWaste || 0),
      customGroup: newItemCustomGroup.trim() || 'ทั่วไป',
      updatedAt: new Date().toISOString()
    };

    const updatedList = [newItem, ...(draftConfig.savedCustomItems || [])];
    const updatedConfig: PriceBookConfig = {
      ...draftConfig,
      savedCustomItems: updatedList
    };
    setDraftConfig(updatedConfig);
    onSaveConfig(updatedConfig);

    // Reset inputs
    setNewItemName('');
    setNewItemSpec('');
    setNewItemQty(1);
    setNewItemMatPrice(0);
    setNewItemLabPrice(0);
    setNewItemWaste(0);
    setIsAddingNewItem(false);
    showToast(`เพิ่ม "${newItem.name}" เข้าคลังส่วนตัวเรียบร้อย ✓`);
  };

  const handleDeleteCustomItem = (savedId: string) => {
    if (isDemo) {
      if (onRequestUpgrade) onRequestUpgrade('คลังราคาส่วนตัว');
      return;
    }
    const updatedList = (draftConfig.savedCustomItems || []).filter(item => item.savedId !== savedId);
    const updatedConfig: PriceBookConfig = {
      ...draftConfig,
      savedCustomItems: updatedList
    };
    setDraftConfig(updatedConfig);
    onSaveConfig(updatedConfig);
    showToast('ลบรายการออกจากคลังเรียบร้อย', 'info');
  };

  const handleRestoreDefaultItems = () => {
    const defaultIds = new Set(INITIAL_SAVED_CUSTOM_ITEMS.map(item => item.savedId));
    const userCustomItems = (draftConfig.savedCustomItems || []).filter(item => !defaultIds.has(item.savedId));
    const mergedList = [...INITIAL_SAVED_CUSTOM_ITEMS, ...userCustomItems];

    const updatedConfig: PriceBookConfig = {
      ...draftConfig,
      libraryVersion: PRICE_BOOK_LIBRARY_VERSION,
      savedCustomItems: mergedList
    };
    setDraftConfig(updatedConfig);
    onSaveConfig(updatedConfig);
    showToast(`คืนค่ารายการมาตรฐานสำเร็จ โดยคงรายการส่วนตัวไว้ครบถ้วน (${mergedList.length} รายการ) ✓`, 'success');
  };

  const handleInsertIntoBOQ = (customItem: SavedPriceBookItem) => {
    if (isDemo) {
      if (onRequestUpgrade) onRequestUpgrade('คลังราคาส่วนตัว');
      return;
    }
    const timestamp = Date.now();
    const effectiveArea = Math.max(1, currentHouseAreaSqm || 120);

    let boqItem: BOQItem = {
      id: `custom-book-${timestamp}`,
      category: customItem.category,
      name: customItem.name,
      spec: customItem.spec,
      quantity: customItem.quantity,
      unit: customItem.unit,
      baseMaterialUnitPrice: customItem.materialUnitPrice,
      baseLaborUnitPrice: customItem.laborUnitPrice,
      materialUnitPrice: customItem.materialUnitPrice,
      laborUnitPrice: customItem.laborUnitPrice,
      wastePercent: customItem.wastePercent,
      basePerSqm: customItem.quantity / effectiveArea,
      itemSubtype: 'custom_price_book'
    };

    if (draftConfig.autoApplyToNewItems) {
      boqItem = applyPriceBookToSingleItem(boqItem, draftConfig);
    }

    onInsertCustomItem(boqItem);
    showToast(`+ ดึงรายการ "${customItem.name}" เข้าสู่ตาราง BOQ แล้ว! ✓`, 'success');
  };

  // Filtered saved items
  const filteredSavedItems = useMemo(() => {
    return (draftConfig.savedCustomItems || []).filter(item => {
      const matchCat = customItemFilterCategory === 'all' || item.category === customItemFilterCategory;
      const matchQuery = !customItemSearch.trim() || 
        item.name.toLowerCase().includes(customItemSearch.toLowerCase()) ||
        item.spec.toLowerCase().includes(customItemSearch.toLowerCase()) ||
        (item.customGroup && item.customGroup.toLowerCase().includes(customItemSearch.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [draftConfig.savedCustomItems, customItemFilterCategory, customItemSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <span className="material-symbols-outlined text-2xl">public</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>ฐานราคาภูมิภาค & คลังราคาส่วนตัว</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono">
                  {draftConfig.regionName}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ปรับสัดส่วนค่าวัสดุ-ค่าแรงตามจังหวัดหน้างาน พร้อมบันทึกราคากลางและคลังรายการเฉพาะตัวของผู้รับเหมา
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="ปิดหน้าต่าง"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Inline Toast Banner */}
        {toast && (
          <div className={`px-5 py-2.5 text-xs font-semibold flex items-center justify-between transition-all ${
            toast.type === 'success' ? 'bg-emerald-950 border-b border-emerald-500/40 text-emerald-300' :
            toast.type === 'warning' ? 'bg-amber-950 border-b border-amber-500/40 text-amber-300' :
            'bg-cyan-950 border-b border-cyan-500/40 text-cyan-300'
          }`}>
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">
                {toast.type === 'success' ? 'check_circle' : toast.type === 'warning' ? 'warning' : 'info'}
              </span>
              <span>{toast.message}</span>
            </span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-2 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('regional')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'regional'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">explore</span>
            <span>1. โซนภูมิภาค & ตัวคูณราคา</span>
          </button>
          <button
            onClick={() => setActiveTab('master_rates')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'master_rates'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">tune</span>
            <span>2. ราคากลางวัสดุ-ค่าแรงหลัก (Master Rates)</span>
          </button>
          <button
            onClick={() => setActiveTab('my_items')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'my_items'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">inventory_2</span>
            <span>3. คลังรายการวัสดุ & งาน ({draftConfig.savedCustomItems?.length || 0})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: REGIONAL MULTIPLIERS */}
          {activeTab === 'regional' && (
            <div className="space-y-6">
              
              {/* Info banner */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>โซนปัจจุบัน:</span>
                    <span className="text-amber-400 underline font-mono">{draftConfig.regionName}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    ค่าวัสดุ: <strong className="text-amber-300">{(draftConfig.materialMultiplier * 100).toFixed(0)}%</strong> ({draftConfig.materialMultiplier >= 1 ? `+${((draftConfig.materialMultiplier - 1) * 100).toFixed(0)}%` : `${((draftConfig.materialMultiplier - 1) * 100).toFixed(0)}%`}) | 
                    ค่าแรงงาน: <strong className="text-cyan-300">{(draftConfig.laborMultiplier * 100).toFixed(0)}%</strong> ({draftConfig.laborMultiplier >= 1 ? `+${((draftConfig.laborMultiplier - 1) * 100).toFixed(0)}%` : `${((draftConfig.laborMultiplier - 1) * 100).toFixed(0)}%`})
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl hover:bg-slate-800 transition">
                    <input 
                      type="checkbox"
                      checked={draftConfig.autoApplyToNewItems}
                      onChange={handleToggleAutoApply}
                      className="accent-amber-500 rounded"
                    />
                    <span>คูณสัดส่วนภูมิภาคกับรายการใหม่อัตโนมัติ</span>
                  </label>

                  <button
                    onClick={handleApplyToCurrentBOQ}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition"
                  >
                    <span className="material-symbols-outlined text-sm">price_change</span>
                    <span>ปรับราคาทั้งตาราง BOQ ทันที</span>
                  </button>
                </div>
              </div>

              {/* 6 Region Preset Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {REGIONAL_PRESETS.map((preset) => {
                  const isSelected = draftConfig.regionId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectRegion(preset)}
                      className={`cursor-pointer rounded-xl p-4 border transition flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/70 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-sm font-bold ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                            {preset.name}
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-amber-400 text-lg">check_circle</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {preset.shortDesc}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 text-[10px]">
                          วัสดุ: <strong className="text-amber-400">{(preset.materialMultiplier * 100).toFixed(0)}%</strong>
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          ค่าแรง: <strong className="text-cyan-400">{(preset.laborMultiplier * 100).toFixed(0)}%</strong>
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 truncate">
                        📍 {preset.provincesSample}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fine-tuning Sliders */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-amber-400">tune</span>
                    <span>ปรับแต่งตัวคูณละเอียดด้วยตนเอง (Manual Multiplier Override)</span>
                  </h4>
                  {draftConfig.regionId === 'custom' && (
                    <span className="text-[10px] text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded">
                      โหมดกำหนดเอง
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Material Multiplier */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">สัดส่วนดัชนีค่าวัสดุ (Material Index):</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {(draftConfig.materialMultiplier * 100).toFixed(0)}% (x{draftConfig.materialMultiplier.toFixed(2)})
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0.70"
                      max="1.50"
                      step="0.01"
                      value={draftConfig.materialMultiplier}
                      onChange={(e) => handleMultiplierChange('material', parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>70% (-30%)</span>
                      <span>100% (กทม. ฐาน)</span>
                      <span>150% (+50%)</span>
                    </div>
                  </div>

                  {/* Labor Multiplier */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">สัดส่วนดัชนีค่าแรงงาน (Labor Index):</span>
                      <span className="font-mono font-bold text-cyan-400 text-sm">
                        {(draftConfig.laborMultiplier * 100).toFixed(0)}% (x{draftConfig.laborMultiplier.toFixed(2)})
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0.60"
                      max="1.40"
                      step="0.01"
                      value={draftConfig.laborMultiplier}
                      onChange={(e) => handleMultiplierChange('labor', parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>60% (ช่างท้องถิ่น)</span>
                      <span>100% (กทม. ฐาน)</span>
                      <span>140% (พื้นที่พิเศษ)</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MASTER RATES */}
          {activeTab === 'master_rates' && (
            <div className="space-y-5">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">ราคากลางวัสดุและค่าแรงหลักของผู้รับเหมา (Master Unit Rates)</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      draftConfig.enableMasterRateOverride
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {draftConfig.enableMasterRateOverride ? 'เปิดใช้งานอยู่' : 'ปิดใช้งาน'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    กำหนดราคากลางที่ผู้รับเหมาซื้อได้จริงกับร้านค้าวัสดุประจำ เมื่อเปิดใช้งานระบบจะจับคู่กับรายการใน BOQ และเขียนทับราคาฐานอัตโนมัติ
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl hover:bg-slate-800 transition">
                    <input 
                      type="checkbox"
                      checked={!!draftConfig.enableMasterRateOverride}
                      onChange={handleToggleMasterRateOverride}
                      className="accent-amber-500 rounded"
                    />
                    <span>เปิดใช้ Master Rates เขียนทับราคาวัสดุหลักใน BOQ</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleResetMasterRates}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    <span>คืนค่ามาตรฐาน</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. คอนกรีตผสมเสร็จ */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-400">view_in_ar</span>
                      คอนกรีตผสมเสร็จ 240 ksc หยาบ/โครงสร้าง
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">บาท / คิว</span>
                  </div>
                  <input 
                    type="number"
                    min="1000"
                    step="50"
                    value={masterRateInputs.concreteReadyMixedPerCuM ?? ''}
                    onChange={(e) => handleMasterRateInputChange('concreteReadyMixedPerCuM', e.target.value)}
                    onBlur={() => handleMasterRateInputBlur('concreteReadyMixedPerCuM', DEFAULT_MASTER_RATES.concreteReadyMixedPerCuM || 2150)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-500">
                    มาตรฐาน CPAC / TPI / ก่อสร้างทั่วไป: 2,050 - 2,300 บาท/ลบ.ม.
                  </p>
                </div>

                {/* 2. เหล็กข้ออ้อย มอก. */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-400">reorder</span>
                      เหล็กเส้นข้ออ้อย มอก. (DB12 / DB16 / RB9)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">บาท / กก.</span>
                  </div>
                  <input 
                    type="number"
                    min="15"
                    step="0.5"
                    value={masterRateInputs.steelDeformedBarPerKg ?? ''}
                    onChange={(e) => handleMasterRateInputChange('steelDeformedBarPerKg', e.target.value)}
                    onBlur={() => handleMasterRateInputBlur('steelDeformedBarPerKg', DEFAULT_MASTER_RATES.steelDeformedBarPerKg || 28)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-500">
                    ราคาตลาดโรงใหญ่ มอก. โรงเลื่อย/ร้านค้าส่ง: 26 - 32 บาท/กก.
                  </p>
                </div>

                {/* 3. ไม้แบบหล่อคอนกรีต */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-400">square_foot</span>
                      ไม้แบบหล่อโครงสร้าง เสา-คาน-ฐานราก
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">บาท / ตร.ม.</span>
                  </div>
                  <input 
                    type="number"
                    min="50"
                    step="10"
                    value={masterRateInputs.formworkPerSqm ?? ''}
                    onChange={(e) => handleMasterRateInputChange('formworkPerSqm', e.target.value)}
                    onBlur={() => handleMasterRateInputBlur('formworkPerSqm', DEFAULT_MASTER_RATES.formworkPerSqm || 240)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-500">
                    เฉลี่ยคิดหมุนเวียน 3-4 ครั้ง: 200 - 280 บาท/ตร.ม.
                  </p>
                </div>

                {/* 4. ค่าแรงก่อผนัง */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-cyan-400">domain</span>
                      ค่าแรงก่อผนังอิฐมวลเบา / บล็อก / มอญ
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">บาท / ตร.ม.</span>
                  </div>
                  <input 
                    type="number"
                    min="50"
                    step="5"
                    value={masterRateInputs.masonryLaborPerSqm ?? ''}
                    onChange={(e) => handleMasterRateInputChange('masonryLaborPerSqm', e.target.value)}
                    onBlur={() => handleMasterRateInputBlur('masonryLaborPerSqm', DEFAULT_MASTER_RATES.masonryLaborPerSqm || 100)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500">
                    มาตรฐานช่างก่อ: 90 - 120 บาท/ตร.ม.
                  </p>
                </div>

                {/* 5. ค่าแรงฉาบปูน */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-cyan-400">format_paint</span>
                      ค่าแรงฉาบปูนเรียบ 2 ด้าน (ภายใน-ภายนอก)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">บาท / ตร.ม.</span>
                  </div>
                  <input 
                    type="number"
                    min="50"
                    step="5"
                    value={masterRateInputs.plasterLaborPerSqm ?? ''}
                    onChange={(e) => handleMasterRateInputChange('plasterLaborPerSqm', e.target.value)}
                    onBlur={() => handleMasterRateInputBlur('plasterLaborPerSqm', DEFAULT_MASTER_RATES.plasterLaborPerSqm || 95)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500">
                    มาตรฐานช่างฉาบปูนสำเร็จ: 85 - 110 บาท/ตร.ม.
                  </p>
                </div>

                {/* 6. ค่าแรงปูกระเบื้อง */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-cyan-400">grid_on</span>
                      ค่าแรงปูกระเบื้องพื้นและผนังห้องน้ำ
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">บาท / ตร.ม.</span>
                  </div>
                  <input 
                    type="number"
                    min="100"
                    step="10"
                    value={masterRateInputs.tileLaborPerSqm ?? ''}
                    onChange={(e) => handleMasterRateInputChange('tileLaborPerSqm', e.target.value)}
                    onBlur={() => handleMasterRateInputBlur('tileLaborPerSqm', DEFAULT_MASTER_RATES.tileLaborPerSqm || 200)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500">
                    แกรนิตโต้ 60x60 / ปูผนัง: 180 - 240 บาท/ตร.ม.
                  </p>
                </div>

                {/* 7. ค่าแรงทาสี */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-cyan-400">palette</span>
                      ค่าแรงทาสีรองพื้น + สีจริง 2 เที่ยว
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">บาท / ตร.ม.</span>
                  </div>
                  <input 
                    type="number"
                    min="30"
                    step="5"
                    value={masterRateInputs.paintLaborPerSqm ?? ''}
                    onChange={(e) => handleMasterRateInputChange('paintLaborPerSqm', e.target.value)}
                    onBlur={() => handleMasterRateInputBlur('paintLaborPerSqm', DEFAULT_MASTER_RATES.paintLaborPerSqm || 40)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500">
                    งานทาสีปูนใหม่ รวมเก็บรอยโป๊ว: 35 - 50 บาท/ตร.ม.
                  </p>
                </div>

              </div>

              {/* Action button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleApplyMasterRatesToBOQ}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition"
                >
                  <span className="material-symbols-outlined text-sm">sync</span>
                  <span>บันทึกและเปิดใช้ Master Rates ลงตาราง BOQ ทันที</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: MY SAVED ITEMS */}
          {activeTab === 'my_items' && (
            <div className="space-y-5">
              
              {/* Header and Add button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>คลังรายการวัสดุและงานก่อสร้าง (Construction Price Book Library)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                      {draftConfig.savedCustomItems?.length || 0} รายการ
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    รายการวัสดุพร้อมราคากลางมาตรฐานและงานสั่งทำพิเศษ กดดึงลงตาราง BOQ ได้ใน 1 คลิก พร้อมคำนวณตามโซนภูมิภาคทันที
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreDefaultItems}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                    title="โหลดรายการวัสดุ-ค่าแรงมาตรฐานทั้งหมดของระบบเข้ามาใหม่"
                  >
                    <span className="material-symbols-outlined text-sm text-amber-400">restart_alt</span>
                    <span className="hidden sm:inline">โหลดรายการมาตรฐาน</span>
                    <span>({INITIAL_SAVED_CUSTOM_ITEMS.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isDemo) {
                        if (onRequestUpgrade) onRequestUpgrade('คลังราคาส่วนตัว');
                        return;
                      }
                      setIsAddingNewItem(!isAddingNewItem);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isAddingNewItem ? 'close' : 'add'}
                    </span>
                    <span>{isAddingNewItem ? 'ปิดฟอร์ม' : '+ เพิ่มรายการใหม่'}</span>
                  </button>
                </div>
              </div>

              {/* Add New Item Form Collapsible */}
              {isAddingNewItem && (
                <form onSubmit={handleSaveNewCustomItem} className="bg-slate-950 border border-indigo-500/40 rounded-xl p-5 space-y-4 animate-in fade-in">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">add_box</span>
                    <span>กรอกข้อมูลรายการวัสดุ/งานใหม่:</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 mb-1">ชื่อรายการ *</label>
                      <input 
                        type="text"
                        placeholder="เช่น รั้วระแนงบังตา WPC สูง 2 ม., ประตูเหล็กม้วนไฟฟ้า..."
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">หมวดหมู่งาน</label>
                      <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as ConstructionCategory)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-400"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([catKey, catMeta]) => (
                          <option key={catKey} value={catKey}>{catMeta.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-slate-400 mb-1">รายละเอียดสเปก / ยี่ห้อ / มาตรฐาน</label>
                      <input 
                        type="text"
                        placeholder="เช่น ความหนา ขนาด แบรนด์ อุปกรณ์ฟิตติ้งที่รวมอยู่..."
                        value={newItemSpec}
                        onChange={(e) => setNewItemSpec(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">ปริมาณเริ่มต้น</label>
                      <input 
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(parseFloat(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">หน่วยนับ</label>
                      <input 
                        type="text"
                        placeholder="ตร.ม., ม., ชุด, จุด, ตัน..."
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">กลุ่มรายการ / Tag</label>
                      <input 
                        type="text"
                        placeholder="เช่น รั้ว, กันสาด, งานเหล็ก, งานกระจก..."
                        value={newItemCustomGroup}
                        onChange={(e) => setNewItemCustomGroup(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">ราคาวัสดุ / หน่วย (บาท)</label>
                      <input 
                        type="number"
                        min="0"
                        value={newItemMatPrice}
                        onChange={(e) => setNewItemMatPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">ราคาค่าแรง / หน่วย (บาท)</label>
                      <input 
                        type="number"
                        min="0"
                        value={newItemLabPrice}
                        onChange={(e) => setNewItemLabPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">เผื่อเศษ (%)</label>
                      <input 
                        type="number"
                        min="0"
                        max="50"
                        value={newItemWaste}
                        onChange={(e) => setNewItemWaste(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingNewItem(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs transition"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>บันทึกเข้าคลังส่วนตัว</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-400">กรองหมวด:</span>
                  <select
                    value={customItemFilterCategory}
                    onChange={(e) => setCustomItemFilterCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all">ทุกหมวดหมู่งาน ({draftConfig.savedCustomItems?.length || 0})</option>
                    {Object.entries(CATEGORY_LABELS).map(([catKey, catMeta]) => (
                      <option key={catKey} value={catKey}>{catMeta.title}</option>
                    ))}
                  </select>
                </div>

                <div className="relative w-full sm:w-64">
                  <input 
                    type="text"
                    placeholder="ค้นหาชื่อรายการ/สเปก..."
                    value={customItemSearch}
                    onChange={(e) => setCustomItemSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-500 text-sm">search</span>
                </div>
              </div>

              {/* Saved Items List */}
              {filteredSavedItems.length === 0 ? (
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-3">
                  <span className="material-symbols-outlined text-4xl text-slate-600">inventory_2</span>
                  <p className="text-xs">ไม่พบรายการที่ตรงกับเงื่อนไขค้นหา หรือคลังรายการว่างเปล่า</p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRestoreDefaultItems}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold flex items-center gap-1.5 shadow transition"
                    >
                      <span className="material-symbols-outlined text-sm">restart_alt</span>
                      <span>โหลดรายการมาตรฐานของระบบ ({INITIAL_SAVED_CUSTOM_ITEMS.length} รายการ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isDemo) {
                          if (onRequestUpgrade) onRequestUpgrade('คลังราคาส่วนตัว');
                          return;
                        }
                        setIsAddingNewItem(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
                    >
                      + เพิ่มรายการใหม่เอง
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredSavedItems.map((item) => {
                    const catLabel = CATEGORY_LABELS[item.category]?.title || item.category;
                    const catIcon = CATEGORY_LABELS[item.category]?.icon || 'folder';
                    const unitPriceTotal = item.materialUnitPrice + item.laborUnitPrice;
                    return (
                      <div
                        key={item.savedId}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-base text-amber-400">{catIcon}</span>
                              <span className="text-xs font-bold text-white leading-tight">{item.name}</span>
                            </div>
                            <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full shrink-0">
                              {catLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                            {item.spec}
                          </p>
                        </div>

                        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <div className="font-mono text-[11px]">
                            <span className="text-amber-400">฿{item.materialUnitPrice.toLocaleString()}</span>
                            <span className="text-slate-500"> + </span>
                            <span className="text-cyan-400">฿{item.laborUnitPrice.toLocaleString()}</span>
                            <span className="text-slate-500"> = </span>
                            <strong className="text-white">฿{unitPriceTotal.toLocaleString()}</strong>
                            <span className="text-slate-500 text-[10px]"> /{item.unit}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomItem(item.savedId)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-850 transition"
                              title="ลบออกจากคลัง"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertIntoBOQ(item)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition shadow active:scale-95"
                            >
                              <span className="material-symbols-outlined text-xs">playlist_add</span>
                              <span>+ ดึงลง BOQ</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between flex-wrap gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="material-symbols-outlined text-sm text-amber-400">verified</span>
            <span>บันทึกและซิงค์คลังราคาลงในเครื่องโดยอัตโนมัติ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
