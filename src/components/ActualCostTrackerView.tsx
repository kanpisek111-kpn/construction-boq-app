import React, { useState, useMemo } from 'react';
import { BOQItem, ConstructionCategory, ActualExpenseItem, PaymentMilestone } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { computeBOQSummary } from '../services/calculator';

interface ActualCostTrackerViewProps {
  items: BOQItem[];
  overheadPercent: number;
  vatPercent: number;
  projectName: string;
  houseAreaSqm: number;
  milestones: PaymentMilestone[];
  expenses: ActualExpenseItem[];
  onUpdateExpenses: (expenses: ActualExpenseItem[]) => void;
}

export const ActualCostTrackerView: React.FC<ActualCostTrackerViewProps> = ({
  items = [],
  overheadPercent = 7,
  vatPercent = 7,
  projectName = 'โครงการก่อสร้าง',
  houseAreaSqm = 120,
  milestones = [],
  expenses = [],
  onUpdateExpenses
}) => {
  // Expense Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [viewReceiptModal, setViewReceiptModal] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copyToast, setCopyToast] = useState<boolean>(false);

  // New Expense Input State
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState<ConstructionCategory>('structure');
  const [expenseType, setExpenseType] = useState<'material' | 'labor' | 'subcontractor' | 'equipment' | 'other'>('material');
  const [vendorOrPayee, setVendorOrPayee] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [linkedMilestone, setLinkedMilestone] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // 1. BOQ Contract & Budget Summary
  const boqSummary = useMemo(() => {
    return computeBOQSummary(items, overheadPercent, vatPercent);
  }, [items, overheadPercent, vatPercent]);

  // 2. Budget by Category from BOQ
  const categoryBudgets = useMemo(() => {
    const map: Record<ConstructionCategory, { material: number; labor: number; total: number }> = {
      preparation: { material: 0, labor: 0, total: 0 },
      structure: { material: 0, labor: 0, total: 0 },
      roof: { material: 0, labor: 0, total: 0 },
      masonry_wall: { material: 0, labor: 0, total: 0 },
      doors_windows: { material: 0, labor: 0, total: 0 },
      finishes: { material: 0, labor: 0, total: 0 },
      decorations: { material: 0, labor: 0, total: 0 },
      sanitary: { material: 0, labor: 0, total: 0 },
      electrical: { material: 0, labor: 0, total: 0 },
      external_works: { material: 0, labor: 0, total: 0 },
    };

    items.forEach(item => {
      const q = Number(item.quantity) || 0;
      const mat = Number(item.materialUnitPrice) || 0;
      const lab = Number(item.laborUnitPrice) || 0;
      const waste = 1 + ((Number(item.wastePercent) || 0) / 100);

      const matTotal = Math.round(q * mat * waste);
      const labTotal = Math.round(q * lab);

      if (map[item.category]) {
        map[item.category].material += matTotal;
        map[item.category].labor += labTotal;
        map[item.category].total += (matTotal + labTotal);
      }
    });

    return map;
  }, [items]);

  // 3. Actual Spent by Category
  const categoryActuals = useMemo(() => {
    const map: Record<ConstructionCategory, { material: number; labor: number; other: number; total: number; count: number }> = {
      preparation: { material: 0, labor: 0, other: 0, total: 0, count: 0 },
      structure: { material: 0, labor: 0, other: 0, total: 0, count: 0 },
      roof: { material: 0, labor: 0, other: 0, total: 0, count: 0 },
      masonry_wall: { material: 0, labor: 0, other: 0, total: 0, count: 0 },
      doors_windows: { material: 0, labor: 0, other: 0, total: 0, count: 0 },
      finishes: { material: 0, labor: 0, other: 0, total: 0, count: 0 },
      decorations: { material: 0, labor: 0, other: 0, total: 0, count: 0 },
      sanitary: { material: 0, labor: 0, other: 0, total: 0, count: 0 },
      electrical: { material: 0, labor: 0, other: 0, total: 0, count: 0 },
      external_works: { material: 0, labor: 0, other: 0, total: 0, count: 0 },
    };

    (expenses || []).forEach(exp => {
      const amt = Number(exp.amount) || 0;
      if (map[exp.category]) {
        map[exp.category].count += 1;
        map[exp.category].total += amt;
        if (exp.expenseType === 'material') {
          map[exp.category].material += amt;
        } else if (exp.expenseType === 'labor') {
          map[exp.category].labor += amt;
        } else {
          map[exp.category].other += amt;
        }
      }
    });

    return map;
  }, [expenses]);

  // 4. Overall Financial Metrics
  const totalActualSpent = useMemo(() => {
    return (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const totalActualMaterial = useMemo(() => {
    return (expenses || []).filter(e => e.expenseType === 'material').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const totalActualLabor = useMemo(() => {
    return (expenses || []).filter(e => e.expenseType === 'labor').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  // Projected Profit: Contract Grand Total - Total Actual Expenses
  const projectedRemainingProfit = Math.round(boqSummary.grandTotal - totalActualSpent);
  const profitMarginPercent = boqSummary.grandTotal > 0
    ? Math.round((projectedRemainingProfit / boqSummary.grandTotal) * 1000) / 10
    : 0;

  // Profit Health Status
  const healthStatus = useMemo(() => {
    if (profitMarginPercent >= 15) {
      return {
        level: 'good',
        label: 'สุขภาพการเงินดีเยี่ยม (ปลอดภัย)',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        textColor: 'text-emerald-400',
        barColor: 'bg-emerald-500',
        icon: 'verified',
        desc: 'กำไรสุทธิอยู่ในเกณฑ์เป้าหมาย ควบคุมต้นทุนได้ตามแผนงาน'
      };
    } else if (profitMarginPercent >= 5) {
      return {
        level: 'warning',
        label: 'เฝ้าระวัง (กำไรเริ่มลดลง)',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        textColor: 'text-amber-400',
        barColor: 'bg-amber-500',
        icon: 'warning',
        desc: 'ต้นทุนเริ่มใกล้เคียงเพดานงบประมาณ ตรวจสอบการสั่งซื้อวัสดุและค่าแรงด่วน'
      };
    } else {
      return {
        level: 'danger',
        label: 'วิกฤต! เสี่ยงขาดทุน / เกินงบ',
        badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        textColor: 'text-rose-400',
        barColor: 'bg-rose-500',
        icon: 'error',
        desc: 'ค่าใช้จ่ายจริงเกินงบหรือกำไรเหลือน้อยกว่า 5% จำเป็นต้องหยุดค่าใช้จ่ายรั่วไหลทันที'
      };
    }
  }, [profitMarginPercent]);

  // Categories with budget overruns
  const overrunCategories = useMemo(() => {
    const list: { category: ConstructionCategory; budget: number; actual: number; overAmount: number; overPercent: number }[] = [];
    (Object.keys(CATEGORY_LABELS) as ConstructionCategory[]).forEach(cat => {
      const b = categoryBudgets[cat]?.total || 0;
      const a = categoryActuals[cat]?.total || 0;
      if (b > 0 && a > b) {
        list.push({
          category: cat,
          budget: b,
          actual: a,
          overAmount: a - b,
          overPercent: Math.round(((a - b) / b) * 100)
        });
      }
    });
    return list;
  }, [categoryBudgets, categoryActuals]);

  // Handle Photo Upload
  const handleReceiptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert('ขนาดไฟล์รูปสลิปต้องไม่เกิน 4MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReceiptImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('กรุณากรอกจำนวนเงินให้ถูกต้อง');
      return;
    }
    if (!description.trim()) {
      alert('กรุณากรอกรายละเอียดรายการหรือชื่อสินค้า');
      return;
    }

    const newExpense: ActualExpenseItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: expenseDate,
      category: expenseCategory,
      expenseType,
      vendorOrPayee: vendorOrPayee.trim() || 'ไม่ระบุผู้รับเงิน',
      description: description.trim(),
      invoiceNumber: invoiceNumber.trim() || undefined,
      amount: numAmount,
      linkedMilestoneNumber: linkedMilestone ? parseInt(linkedMilestone) : undefined,
      receiptImage: receiptImage || undefined,
      notes: notes.trim() || undefined
    };

    onUpdateExpenses([newExpense, ...expenses]);

    // Reset Form
    setDescription('');
    setAmount('');
    setInvoiceNumber('');
    setReceiptImage('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  // Delete Expense
  const handleDeleteExpense = (id: string) => {
    if (confirm('คุณต้องการลบรายการค่าใช้จ่ายนี้ใช่หรือไม่?')) {
      onUpdateExpenses(expenses.filter(e => e.id !== id));
    }
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      const matchCat = filterCategory === 'all' || e.category === filterCategory;
      const matchType = filterType === 'all' || e.expenseType === filterType;
      const matchSearch = !searchTerm || 
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.vendorOrPayee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.invoiceNumber && e.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchType && matchSearch;
    });
  }, [expenses, filterCategory, filterType, searchTerm]);

  // Copy Summary to LINE
  const handleCopyLineReport = () => {
    let text = `📊 สรุปความคืบหน้าต้นทุนจริง vs BOQ (Actual Cost & Profit Tracker)\n`;
    text += `🏗️ โครงการ: ${projectName} (${houseAreaSqm} ตร.ม.)\n`;
    text += `💰 มูลค่าสัญญารวม: ฿${boqSummary.grandTotal.toLocaleString()} บาท\n`;
    text += `💸 จ่ายจริงสะสม: ฿${totalActualSpent.toLocaleString()} บาท\n`;
    text += `   - ค่าวัสดุซื้อจริง: ฿${totalActualMaterial.toLocaleString()} บาท\n`;
    text += `   - ค่าแรงจ่ายจริง: ฿${totalActualLabor.toLocaleString()} บาท\n`;
    text += `🎯 กำไรคงเหลือคาดการณ์: ฿${projectedRemainingProfit.toLocaleString()} บาท (${profitMarginPercent}%)\n`;
    text += `🚦 สถานะสุขภาพกำไร: ${healthStatus.label}\n`;
    text += `------------------------------------\n`;

    if (overrunCategories.length > 0) {
      text += `⚠️ หมวดที่เกินงบ BOQ:\n`;
      overrunCategories.forEach(o => {
        text += `• ${CATEGORY_LABELS[o.category]?.title || o.category}: เกิน +${o.overPercent}% (+฿${o.overAmount.toLocaleString()} บ.)\n`;
      });
      text += `------------------------------------\n`;
    }

    text += `🧾 จำนวนบิลที่บันทึก: ${expenses.length} รายการ\n`;
    text += `✨ ตรวจสอบและบริหารต้นทุนด้วยระบบ Thai Construction BOQ Pro`;

    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-4 sm:p-6 gap-6">
      
      {/* Top Banner: Profit Health Meter & Financial KPIs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  ระบบคุมต้นทุนจริง vs BOQ ป้องกันขาดทุน
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                  Cost & Profit Tracker
                </span>
              </div>
              <p className="text-xs text-slate-400">
                บันทึกบิลซื้อของหน้างานและค่าแรงช่าง เปรียบเทียบกับงบประมาณใน BOQ เพื่อปกป้องผลกำไรแบบ Real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLineReport}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                copyToast 
                  ? 'bg-emerald-600 border-emerald-500 text-white' 
                  : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{copyToast ? 'check' : 'content_copy'}</span>
              <span>{copyToast ? 'คัดลอกสำเร็จ!' : '📲 คัดลอกสรุปส่ง LINE'}</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:brightness-110 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-base font-black">add_circle</span>
              <span>+ บันทึกบิลซื้อของ / ค่าแรง</span>
            </button>
          </div>
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: มูลค่างานตามสัญญา */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>งบประมาณตามสัญญา (BOQ)</span>
              <span className="material-symbols-outlined text-sm text-cyan-400">description</span>
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
                ฿{boqSummary.grandTotal.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 block mt-0.5">
                รวมค่าโสหุ้ยและภาษี {overheadPercent + vatPercent}%
              </span>
            </div>
          </div>

          {/* Card 2: จ่ายจริงสะสม */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>จ่ายจริงสะสม (Actual Paid)</span>
              <span className="material-symbols-outlined text-sm text-amber-400">payments</span>
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                ฿{totalActualSpent.toLocaleString()}
              </span>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span>ของ: ฿{totalActualMaterial.toLocaleString()}</span>
                <span>•</span>
                <span>แรง: ฿{totalActualLabor.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card 3: กำไรสุทธิคงเหลือคาดการณ์ */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>กำไรคงเหลือคาดการณ์</span>
              <span className="material-symbols-outlined text-sm text-emerald-400">trending_up</span>
            </div>
            <div className="mt-2">
              <span className={`text-xl sm:text-2xl font-black font-mono ${projectedRemainingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ฿{projectedRemainingProfit.toLocaleString()}
              </span>
              <span className="text-xs font-bold block mt-0.5">
                มาร์จิ้น: <span className={healthStatus.textColor}>{profitMarginPercent}%</span>
              </span>
            </div>
          </div>

          {/* Card 4: Profit Health Meter */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Profit Health Meter</span>
              <span className="material-symbols-outlined text-sm text-purple-400">monitor_heart</span>
            </div>
            <div className="mt-2">
              <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold inline-flex items-center gap-1 ${healthStatus.badgeColor}`}>
                <span className="material-symbols-outlined text-xs">{healthStatus.icon}</span>
                <span>{healthStatus.label}</span>
              </span>
              <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
                <div 
                  className={`h-full ${healthStatus.barColor} transition-all duration-500`}
                  style={{ width: `${Math.min(100, Math.max(0, profitMarginPercent * 3))}%` }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Warning Alert if categories are overrun */}
        {overrunCategories.length > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-xs text-rose-200">
            <span className="material-symbols-outlined text-rose-400 text-lg mt-0.5 shrink-0">report</span>
            <div>
              <span className="font-bold text-white block">
                ตรวจพบ {overrunCategories.length} หมวดงานที่ค่าใช้จ่ายจริงเกินงบประมาณใน BOQ:
              </span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {overrunCategories.map(o => (
                  <span key={o.category} className="px-2 py-0.5 rounded bg-rose-900/80 border border-rose-600/50 text-rose-200 font-mono text-[11px]">
                    {CATEGORY_LABELS[o.category]?.title.split('. ')[1] || o.category}: 
                    เกิน +฿{o.overAmount.toLocaleString()} (+{o.overPercent}%)
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Budget vs Actual Variance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400">query_stats</span>
            <h3 className="text-sm font-bold text-white">
              เปรียบเทียบงบประมาณ BOQ vs จ่ายจริงรายหมวด (10 หมวดงาน)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            จำนวนบิลที่บันทึกแล้วทั้งหมด: <strong className="text-white">{expenses.length}</strong> ใบ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 w-48">หมวดหมู่งาน</th>
                <th className="py-3 px-3 text-right">งบประมาณ BOQ</th>
                <th className="py-3 px-3 text-right">จ่ายจริงสะสม</th>
                <th className="py-3 px-3 text-right">ผลต่าง (คงเหลือ / เกิน)</th>
                <th className="py-3 px-4 w-44">% ที่ใช้ไป</th>
                <th className="py-3 px-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {(Object.keys(CATEGORY_LABELS) as ConstructionCategory[]).map(catKey => {
                const info = CATEGORY_LABELS[catKey];
                const budget = categoryBudgets[catKey]?.total || 0;
                const actual = categoryActuals[catKey]?.total || 0;
                const variance = budget - actual;
                const isOver = actual > budget && budget > 0;
                const percentUsed = budget > 0 ? Math.round((actual / budget) * 100) : (actual > 0 ? 100 : 0);

                const barColor = isOver 
                  ? 'bg-rose-500' 
                  : percentUsed >= 85 
                  ? 'bg-amber-500' 
                  : 'bg-emerald-500';

                return (
                  <tr key={catKey} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 flex items-center gap-2 font-medium text-slate-200">
                      <span className="material-symbols-outlined text-sm text-slate-400">{info?.icon}</span>
                      <span className="truncate">{info?.title || catKey}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      ฿{budget.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-300">
                      ฿{actual.toLocaleString()}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isOver ? `+฿${(actual - budget).toLocaleString()}` : `฿${variance.toLocaleString()}`}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full ${barColor} transition-all duration-300`} 
                            style={{ width: `${Math.min(100, percentUsed)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] w-10 text-right text-slate-300">
                          {percentUsed}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isOver ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          เกินงบ {percentUsed - 100}%
                        </span>
                      ) : percentUsed >= 85 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ใกล้เต็มงบ
                        </span>
                      ) : actual > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          อยู่ในงบ
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actual Expenses Log & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">receipt_long</span>
            <h3 className="text-sm font-bold text-white">
              ประวัติการจ่ายเงิน & บิลซื้อของจริง ({filteredExpenses.length} รายการ)
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาร้านค้า, บิล, รายการ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 w-44 sm:w-56"
              />
              <span className="material-symbols-outlined absolute left-2 top-2 text-sm text-slate-500">search</span>
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="all">ทุกหมวดงาน</option>
              {(Object.keys(CATEGORY_LABELS) as ConstructionCategory[]).map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]?.title.split('. ')[1] || c}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="all">ทุกประเภทการจ่าย</option>
              <option value="material">ค่าวัสดุ</option>
              <option value="labor">ค่าแรงช่าง</option>
              <option value="subcontractor">ผู้รับเหมาช่วง</option>
              <option value="equipment">ค่าเครื่องจักร</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>
        </div>

        {/* Expenses Table */}
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">receipt</span>
            <span>ยังไม่มีรายการบันทึกค่าใช้จ่ายจริงในเงื่อนไขที่เลือก</span>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-600 hover:text-white transition"
            >
              + บันทึกบิลแรกของคุณ
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3 w-28">วันที่</th>
                  <th className="py-2.5 px-3">หมวดงาน</th>
                  <th className="py-2.5 px-3">ประเภท</th>
                  <th className="py-2.5 px-3">ร้านค้า / ผู้รับเงิน</th>
                  <th className="py-2.5 px-3">รายการ / เนื้องาน</th>
                  <th className="py-2.5 px-3">เลขที่บิล</th>
                  <th className="py-2.5 px-3 text-right">จำนวนเงิน</th>
                  <th className="py-2.5 px-2 text-center w-14">สลิป</th>
                  <th className="py-2.5 px-2 text-center w-12">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredExpenses.map((exp) => {
                  const typeLabel = exp.expenseType === 'material' ? 'ค่าวัสดุ' 
                    : exp.expenseType === 'labor' ? 'ค่าแรง' 
                    : exp.expenseType === 'subcontractor' ? 'เหมาช่วง' 
                    : exp.expenseType === 'equipment' ? 'เครื่องจักร' : 'อื่นๆ';

                  const typeColor = exp.expenseType === 'material' ? 'text-cyan-400 bg-cyan-950/60 border-cyan-700/40'
                    : exp.expenseType === 'labor' ? 'text-amber-400 bg-amber-950/60 border-amber-700/40'
                    : 'text-indigo-400 bg-indigo-950/60 border-indigo-700/40';

                  return (
                    <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {exp.date}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-medium">
                        {CATEGORY_LABELS[exp.category]?.title.split('. ')[1] || exp.category}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeColor}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-white font-semibold">
                        {exp.vendorOrPayee}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                        {exp.description}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {exp.invoiceNumber || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                        ฿{Number(exp.amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {exp.receiptImage ? (
                          <button
                            onClick={() => setViewReceiptModal(exp.receiptImage || null)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition"
                            title="ดูรูปสลิป / บิล"
                          >
                            <span className="material-symbols-outlined text-sm">image</span>
                          </button>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition"
                          title="ลบรายการนี้"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add New Expense Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-xl">add_circle</span>
                <h3 className="text-base font-bold text-white">บันทึกบิลซื้อของ / ค่าแรงจริง</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 overflow-y-auto flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-medium">วันที่จ่ายเงิน / วันที่ในบิล:</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-medium">ประเภทค่าใช้จ่าย:</label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  >
                    <option value="material">ค่าวัสดุ / ซื้อของเข้าไซต์</option>
                    <option value="labor">ค่าแรงช่าง / รายวัน / รายสัปดาห์</option>
                    <option value="subcontractor">ผู้รับเหมาช่วง (Sub-contractor)</option>
                    <option value="equipment">ค่าเครื่องจักร / นั่งร้าน / ค้ำยัน</option>
                    <option value="other">ค่าใช้จ่ายอื่นๆ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-medium">หมวดงานตาม BOQ:</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as ConstructionCategory)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  >
                    {(Object.keys(CATEGORY_LABELS) as ConstructionCategory[]).map(c => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]?.title || c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-medium">งวดงานที่ผูก (Milestone):</label>
                  <select
                    value={linkedMilestone}
                    onChange={(e) => setLinkedMilestone(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  >
                    <option value="">ไม่ระบุงวดงาน</option>
                    {milestones.map(m => (
                      <option key={m.id} value={m.milestoneNumber}>งวดที่ {m.milestoneNumber}: {m.title.slice(0, 25)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-medium">ร้านค้า / ผู้รับเงิน:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ไทวัสดุ, ร้านเหล็กโชคดี, ช่างสมศักดิ์"
                    value={vendorOrPayee}
                    onChange={(e) => setVendorOrPayee(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-medium">เลขที่บิล / ใบเสร็จ (ถ้ามี):</label>
                  <input
                    type="text"
                    placeholder="เช่น INV-6804-012"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">รายการ / เนื้องานที่จ่าย:</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ซื้อเหล็กข้ออ้อย DB12 80 เส้น, ค่าแรงเทคานชั้น 2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-amber-300 font-bold">จำนวนเงินที่จ่ายจริง (บาท):</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border-2 border-amber-500/50 rounded-lg p-2.5 font-mono text-base font-bold text-amber-300 focus:outline-none focus:border-amber-400 pl-8"
                  />
                  <span className="absolute left-3 top-3 text-amber-500 font-bold">฿</span>
                </div>
              </div>

              {/* Upload Receipt Slip */}
              <div className="flex flex-col gap-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                  รูปถ่ายสลิปโอนเงิน / ใบเสร็จหน้างาน (Receipt Photo):
                </label>
                <div className="flex items-center gap-3 mt-1">
                  {receiptImage ? (
                    <div className="flex items-center gap-2">
                      <img src={receiptImage} alt="Receipt Preview" className="w-14 h-14 object-cover rounded-lg border border-slate-700" />
                      <button
                        type="button"
                        onClick={() => setReceiptImage('')}
                        className="px-2 py-1 rounded bg-rose-950 border border-rose-500/40 text-rose-300 text-[11px] hover:bg-rose-900"
                      >
                        ลบรูป
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer px-3 py-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-semibold hover:bg-indigo-900 flex items-center gap-1.5 transition">
                      <span className="material-symbols-outlined text-base">upload_file</span>
                      <span>ถ่ายรูปหรือเลือกไฟล์สลิป</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleReceiptImageUpload} 
                        className="hidden" 
                      />
                    </label>
                  )}
                  <span className="text-[11px] text-slate-500">
                    รองรับถ่ายรูปจากกล้องมือถือหน้างานหรืออัปโหลดสลิป
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  บันทึกค่าใช้จ่าย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Full Size Receipt */}
      {viewReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-400">image</span>
                รูปถ่ายสลิป / ใบเสร็จรับเงิน
              </span>
              <button
                onClick={() => setViewReceiptModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center">
              <img src={viewReceiptModal} alt="Receipt Full" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
