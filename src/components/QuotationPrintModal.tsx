import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BOQItem, ConstructionCategory, QuotationMeta, PaymentMilestone, QuotationDisplayOptions, QuotationDisplayMode } from '../types';
import { CATEGORY_LABELS, formatMilestonesToPaymentTerms, DEFAULT_DISPLAY_OPTIONS } from '../constants';
import { exportBOQToExcel } from '../services/excelExporter';
import { computeBOQSummary } from '../services/calculator';
import { LicenseTier, canAccessFeature } from '../services/authService';
import { compressImage } from '../services/imageUtils';

/**
 * แปลงตัวเลขจำนวนเงินเป็นคำอ่านภาษาไทยมาตรฐาน
 * ตัวอย่าง: 1,250,000 -> หนึ่งล้านสองแสนห้าหมื่นบาทถ้วน
 */
export function numberToThaiBahtText(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'ศูนย์บาทถ้วน';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const rounded = Math.round(absAmount * 100) / 100;
  const baht = Math.floor(rounded);
  const satang = Math.round((rounded - baht) * 100);

  const thaiDigits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const thaiUnits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  function convertGroup(numStr: string): string {
    let result = '';
    const len = numStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(numStr[i], 10);
      const position = len - 1 - i;
      if (digit === 0) continue;

      if (position === 0 && digit === 1 && len > 1) {
        const hasNonZeroBefore = numStr.slice(0, i).split('').some(d => d !== '0');
        result += hasNonZeroBefore ? 'เอ็ด' : 'หนึ่ง';
      } else if (position === 1 && digit === 1) {
        result += 'สิบ';
      } else if (position === 1 && digit === 2) {
        result += 'ยี่สิบ';
      } else {
        result += thaiDigits[digit] + thaiUnits[position];
      }
    }
    return result;
  }

  function convertInteger(num: number): string {
    if (num === 0) return '';
    const numStr = num.toString();
    const len = numStr.length;
    if (len <= 6) {
      return convertGroup(numStr);
    }
    const millionIdx = len - 6;
    const higher = parseInt(numStr.slice(0, millionIdx), 10);
    const lowerStr = numStr.slice(millionIdx);
    return convertInteger(higher) + 'ล้าน' + convertGroup(lowerStr);
  }

  let text = '';
  if (baht > 0) {
    text += convertInteger(baht) + 'บาท';
  }

  if (satang === 0) {
    text += 'ถ้วน';
  } else {
    text += convertGroup(satang.toString().padStart(2, '0')) + 'สตางค์';
  }

  return (isNegative ? 'ลบ' : '') + text;
}

/**
 * ปันส่วนยอดเงินเป้าหมาย (targetTotal) ให้แต่ละรายการตามสัดส่วน (Hare-Niemeyer / Largest-Remainder method)
 * รับประกันว่าผลรวมของยอดที่ปันส่วนทั้งหมดจะเท่ากับ targetTotal เสมอแบบ 100% (ไม่มีเศษบาทเกินหรือขาดแม้แต่ 1 บาท)
 */
export function allocateRoundedAmounts(rawAmounts: number[], targetTotal: number): number[] {
  if (!rawAmounts || rawAmounts.length === 0) return [];
  if (rawAmounts.length === 1) return [targetTotal];

  const safeRaw = rawAmounts.map(v => Math.max(0, isNaN(v) ? 0 : v));
  const totalRaw = safeRaw.reduce((sum, val) => sum + val, 0);

  if (totalRaw <= 0) {
    const count = safeRaw.length;
    const base = Math.floor(targetTotal / count);
    const rem = targetTotal - (base * count);
    return safeRaw.map((_, i) => base + (i < rem ? 1 : 0));
  }

  const items = safeRaw.map((raw, idx) => {
    const exact = (raw / totalRaw) * targetTotal;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    return { idx, floor, remainder };
  });

  const floorSum = items.reduce((sum, item) => sum + item.floor, 0);
  const diff = Math.max(0, Math.min(items.length, targetTotal - floorSum));

  items.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < diff; i++) {
    items[i].floor += 1;
  }

  items.sort((a, b) => a.idx - b.idx);
  return items.map(item => item.floor);
}

interface ProcessedItem {
  id: string;
  name: string;
  spec?: string;
  quantity: number;
  unit: string;
  materialUnitPrice: number;
  laborUnitPrice: number;
  wastePercent: number;
  allocatedMat: number;
  allocatedLab: number;
  allocatedTotal: number;
}

interface ProcessedCategory {
  catKey: ConstructionCategory;
  catNumber: number;
  title: string;
  items: ProcessedItem[];
  allocatedMat: number;
  allocatedLab: number;
  allocatedTotal: number;
}

interface QuotationPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  houseAreaSqm: number;
  items: BOQItem[];
  overheadPercent: number;
  vatPercent: number;
  quotationMeta: QuotationMeta;
  onUpdateMeta: (meta: QuotationMeta) => void;
  onUpdateProjectName?: (name: string) => void;
  milestones?: PaymentMilestone[];
  licenseTier?: LicenseTier;
  onRequestUpgrade?: (featureName: string) => void;
}

export const QuotationPrintModal: React.FC<QuotationPrintModalProps> = ({
  isOpen,
  onClose,
  projectName,
  houseAreaSqm,
  items,
  overheadPercent,
  vatPercent,
  quotationMeta,
  onUpdateMeta,
  onUpdateProjectName,
  milestones = [],
  licenseTier = 'owner',
  onRequestUpgrade
}) => {
  const [meta, setMeta] = useState<QuotationMeta>(quotationMeta);
  const [showMetaEdit, setShowMetaEdit] = useState<boolean>(false);
  const prevIsOpenRef = useRef(false);

  // Sync meta state only when modal opens (false -> true) to prevent overwriting active typing
  useEffect(() => {
    if (!prevIsOpenRef.current && isOpen) {
      setMeta(quotationMeta);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, quotationMeta]);

  const updateMetaField = (patch: Partial<QuotationMeta>) => {
    const updated: QuotationMeta = { ...meta, ...patch };
    setMeta(updated);
    onUpdateMeta(updated);
  };

  const displayOptions: QuotationDisplayOptions = {
    ...DEFAULT_DISPLAY_OPTIONS,
    ...(meta.displayOptions || {})
  };

  const handleToggleOption = <K extends keyof QuotationDisplayOptions>(key: K, value: QuotationDisplayOptions[K]) => {
    const nextOptions: QuotationDisplayOptions = {
      ...displayOptions,
      [key]: value
    };
    updateMetaField({ displayOptions: nextOptions });
  };

  const summary = computeBOQSummary(items, overheadPercent, vatPercent);
  const costPerSqm = houseAreaSqm > 0 ? Math.round(summary.grandTotal / houseAreaSqm) : 0;
  const grandTotalThaiText = numberToThaiBahtText(summary.grandTotal);

  const subtotalBeforeVat = summary.grandTotal - summary.vatAmount;
  const rowsTargetTotal = displayOptions.showProfitLine ? summary.directCost : subtotalBeforeVat;
  const displayedProfit = Math.max(0, subtotalBeforeVat - summary.directCost);

  const processedCategories: ProcessedCategory[] = useMemo(() => {
    const categoriesList = Object.keys(CATEGORY_LABELS) as ConstructionCategory[];
    const activeCats = categoriesList
      .map(catKey => {
        const catItems = items.filter(i => i.category === catKey);
        const itemsWithRaw = catItems.map(item => {
          const rawMat = item.quantity * item.materialUnitPrice * (1 + (item.wastePercent || 0) / 100);
          const rawLab = item.quantity * item.laborUnitPrice;
          const rawTotal = rawMat + rawLab;
          return { item, rawMat, rawLab, rawTotal };
        });
        const rawCatTotal = itemsWithRaw.reduce((sum, i) => sum + i.rawTotal, 0);
        return {
          catKey,
          title: CATEGORY_LABELS[catKey]?.title || catKey,
          itemsWithRaw,
          rawCatTotal
        };
      })
      .filter(cat => cat.itemsWithRaw.length > 0);

    if (activeCats.length === 0) return [];

    const catAllocatedTotals = allocateRoundedAmounts(
      activeCats.map(c => c.rawCatTotal),
      rowsTargetTotal
    );

    return activeCats.map((cat, catIdx) => {
      const catAllocatedTotal = catAllocatedTotals[catIdx];
      const itemAllocatedTotals = allocateRoundedAmounts(
        cat.itemsWithRaw.map(i => i.rawTotal),
        catAllocatedTotal
      );

      const processedItems: ProcessedItem[] = cat.itemsWithRaw.map((itemRaw, itemIdx) => {
        const itemAllocatedTotal = itemAllocatedTotals[itemIdx];
        const [allocatedMat, allocatedLab] = allocateRoundedAmounts(
          [itemRaw.rawMat, itemRaw.rawLab],
          itemAllocatedTotal
        );

        return {
          id: itemRaw.item.id,
          name: itemRaw.item.name,
          spec: itemRaw.item.spec,
          quantity: itemRaw.item.quantity,
          unit: itemRaw.item.unit,
          materialUnitPrice: itemRaw.item.materialUnitPrice,
          laborUnitPrice: itemRaw.item.laborUnitPrice,
          wastePercent: itemRaw.item.wastePercent,
          allocatedMat,
          allocatedLab,
          allocatedTotal: itemAllocatedTotal
        };
      });

      const catAllocatedMat = processedItems.reduce((sum, i) => sum + i.allocatedMat, 0);
      const catAllocatedLab = processedItems.reduce((sum, i) => sum + i.allocatedLab, 0);

      return {
        catKey: cat.catKey,
        catNumber: catIdx + 1,
        title: cat.title,
        items: processedItems,
        allocatedMat: catAllocatedMat,
        allocatedLab: catAllocatedLab,
        allocatedTotal: catAllocatedTotal
      };
    });
  }, [items, rowsTargetTotal]);

  // Auto-format payment terms from active project milestones if available
  const autoMilestonesText = milestones && milestones.length > 0
    ? formatMilestonesToPaymentTerms(milestones, summary.grandTotal)
    : '';
  const displayedPaymentTerms = (meta.paymentTerms && meta.paymentTerms.trim().length > 0)
    ? meta.paymentTerms
    : autoMilestonesText;

  const [logoToast, setLogoToast] = useState<string>('');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canAccessFeature('white_label_branding', licenseTier)) {
      if (onRequestUpgrade) onRequestUpgrade('White-label ปรับแต่งโลโก้บริษัทและชื่อผู้รับเหมา');
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setLogoToast('ขนาดไฟล์ภาพต้องไม่เกิน 5MB');
        setTimeout(() => setLogoToast(''), 3000);
        return;
      }
      try {
        const compressedBase64 = await compressImage(file, 400, 200, 0.85);
        updateMetaField({ companyLogo: compressedBase64 });
        setLogoToast('อัปโหลดและบันทึกโลโก้สำเร็จ ✓');
        setTimeout(() => setLogoToast(''), 3000);
      } catch (err) {
        console.error('Logo upload error:', err);
        setLogoToast('เกิดข้อผิดพลาดในการโหลดรูปโลโก้');
        setTimeout(() => setLogoToast(''), 3000);
      }
    }
  };

  const handleRemoveLogo = () => {
    updateMetaField({ companyLogo: '' });
    setLogoToast('ลบโลโก้เรียบร้อย ✓');
    setTimeout(() => setLogoToast(''), 2500);
  };

  const handleSaveMeta = () => {
    onUpdateMeta(meta);
    setShowMetaEdit(false);
  };

  const handlePrint = () => {
    // บันทึกข้อมูลหัวบิลลงโครงการอัตโนมัติก่อนพิมพ์ เพื่อไม่ให้ข้อมูลสูญหาย
    onUpdateMeta(meta);

    const printArea = document.getElementById('quotation-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    try {
      // Remove any existing print iframe
      const existingIframe = document.getElementById('quotation-print-iframe');
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'quotation-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      // คัดลอก stylesheet และ style จาก document.head โดยกรอง style ที่มี #quotation-print-modal-root ออก
      const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .filter((el) => !el.textContent?.includes('#quotation-print-modal-root'))
        .map((el) => el.outerHTML)
        .join('\n');

      const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบเสนอราคา - ${meta.quotationNumber} - ${projectName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${headStyles}
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body, .print-sheet, .print-sheet * {
      visibility: visible !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Sarabun', 'Prompt', sans-serif;
      background: #ffffff !important;
      color: #0f172a !important;
      font-size: 11px;
      line-height: 1.4;
    }
    .print-sheet {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      padding: 10px;
      background: white;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
      margin-bottom: 16px;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th, td {
      padding: 5px 8px;
      vertical-align: middle;
    }
    .break-inside-avoid {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .no-print {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="print-sheet">
    ${printArea.innerHTML}
  </div>
</body>
</html>`;

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc || !iframe.contentWindow) {
        window.print();
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      let hasPrinted = false;
      const triggerPrint = () => {
        if (hasPrinted) return;
        hasPrinted = true;
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print failed, fallback to window.print()', e);
          window.print();
        }
      };

      iframe.onload = () => {
        setTimeout(triggerPrint, 300);
      };
      setTimeout(triggerPrint, 700);
    } catch (err) {
      console.warn('Hidden iframe print error:', err);
      window.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div id="quotation-print-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      
      {/* Container */}
      <div id="quotation-modal-container" className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden text-slate-100 my-auto">
        
        {/* Header - Not printed */}
        <div className="print:hidden flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-md">
              <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                พิมพ์ใบเสนอราคาค่าก่อสร้าง (Quotation / Cost Estimate)
              </h2>
              <p className="text-[11px] text-slate-400">
                เอกสารทางการพร้อมลายเซ็น ออกแบบสวยงาม สามารถพิมพ์ออกเครื่องหรือบันทึก "Save as PDF" ได้ครบทุกหน้า
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMetaEdit(!showMetaEdit)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium flex items-center gap-1.5 transition"
            >
              <span className="material-symbols-outlined text-sm">edit_note</span>
              <span>{showMetaEdit ? 'ซ่อนการแก้ไขหัวกระดาษ' : 'แก้ไขข้อมูลหัวบิล / ลูกค้า'}</span>
            </button>
            <button
              onClick={() => {
                exportBOQToExcel({
                  items,
                  projectName,
                  houseAreaSqm,
                  quotationMeta: meta,
                  milestones,
                  overheadPercent,
                  vatPercent
                });
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-95"
              title="ส่งออกไฟล์ Excel (.xlsx) สำหรับยื่นกู้ธนาคาร"
            >
              <span className="material-symbols-outlined text-sm">description</span>
              <span>ดาวน์โหลด Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>พิมพ์ / บันทึก PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Status Toast Banner */}
        {logoToast && (
          <div className="print:hidden bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 px-4 py-2 text-xs flex items-center justify-between animate-in">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-sm">info</span>
              <span>{logoToast}</span>
            </div>
            <button onClick={() => setLogoToast('')} className="text-emerald-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Edit Metadata Drawer */}
        {showMetaEdit && (
          <div className="print:hidden p-5 bg-slate-850 border-b border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {onUpdateProjectName && (
              <div>
                <label className="text-slate-400 block mb-1">ชื่อโครงการ (Project Name):</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => onUpdateProjectName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-semibold"
                />
              </div>
            )}
            <div>
              <label className="text-slate-400 block mb-1">เลขที่ใบเสนอราคา:</label>
              <input
                type="text"
                value={meta.quotationNumber}
                onChange={(e) => updateMetaField({ quotationNumber: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">วันที่ออกเอกสาร:</label>
              <input
                type="date"
                value={meta.issueDate}
                onChange={(e) => updateMetaField({ issueDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">ยืนราคาภายใน (วัน):</label>
              <input
                type="number"
                value={meta.validityDays || ''}
                onChange={(e) => updateMetaField({ validityDays: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                placeholder="30"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">ชื่อผู้ว่าจ้าง / ลูกค้า:</label>
              <input
                type="text"
                value={meta.customerName}
                onChange={(e) => updateMetaField({ customerName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">เบอร์โทรลูกค้า:</label>
              <input
                type="text"
                value={meta.customerPhone}
                onChange={(e) => updateMetaField({ customerPhone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">สถานที่ก่อสร้าง:</label>
              <input
                type="text"
                value={meta.customerAddress}
                onChange={(e) => updateMetaField({ customerAddress: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">ชื่อบริษัท / ผู้รับเหมา:</label>
              <input
                type="text"
                value={meta.contractorName}
                onChange={(e) => updateMetaField({ contractorName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">เบอร์โทรผู้รับเหมา:</label>
              <input
                type="text"
                value={meta.contractorPhone}
                onChange={(e) => updateMetaField({ contractorPhone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">เลขประจำตัวผู้เสียภาษี:</label>
              <input
                type="text"
                value={meta.contractorTaxId}
                onChange={(e) => updateMetaField({ contractorTaxId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400">เงื่อนไขการแบ่งงวดชำระเงิน:</label>
                {autoMilestonesText && (
                  <button
                    type="button"
                    onClick={() => updateMetaField({ paymentTerms: autoMilestonesText })}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-medium flex items-center gap-0.5"
                    title="ดึงข้อความจากงวดงานในโครงการมาใส่แทนที่"
                  >
                    <span className="material-symbols-outlined text-xs">sync</span>
                    <span>ดึงจากแผนงวดงานอัตโนมัติ</span>
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={displayedPaymentTerms}
                onChange={(e) => updateMetaField({ paymentTerms: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-[11px]"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">การรับประกันผลงาน:</label>
              <input
                type="text"
                value={meta.warrantyTerms}
                onChange={(e) => updateMetaField({ warrantyTerms: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1">หมายเหตุเพิ่มเติม (Notes):</label>
              <textarea
                rows={2}
                value={meta.notes || ''}
                onChange={(e) => updateMetaField({ notes: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-[11px]"
                placeholder="เช่น ราคานี้รวมค่าแรง วัสดุ และภาษีแล้ว ไม่รวมค่าธรรมเนียมขอมิเตอร์น้ำ-ไฟ..."
              />
            </div>
            
            {/* Logo Upload Section */}
            <div className="md:col-span-2 flex items-center gap-4 p-2 bg-slate-900 rounded-lg border border-slate-700">
              <div className="w-12 h-12 rounded bg-slate-800 border border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                {meta.companyLogo ? (
                  <img src={meta.companyLogo} alt="Logo Preview" className="w-full h-full object-contain" />
                ) : (
                  <span className="material-symbols-outlined text-slate-500">image</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-bold block">โลโก้บริษัท / ตราสัญลักษณ์:</span>
                  {!canAccessFeature('white_label_branding', licenseTier) && (
                    <span className="text-[10px] font-prompt px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      🔒 ปลดล็อกใน Pro & VIP
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block">รองรับไฟล์ PNG, JPG (ขนาดไม่เกิน 2MB)</span>
                <div className="flex gap-2 mt-1">
                  {!canAccessFeature('white_label_branding', licenseTier) ? (
                    <button
                      type="button"
                      onClick={() => onRequestUpgrade && onRequestUpgrade('White-label ปรับแต่งโลโก้บริษัทและชื่อผู้รับเหมา')}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-semibold transition border border-amber-500/40 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">lock</span>
                      <span>อัปเกรดเพื่อใส่โลโก้</span>
                    </button>
                  ) : (
                    <label className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold cursor-pointer transition border border-slate-600">
                      เลือกรูปภาพ
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                  {meta.companyLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-2 py-1 rounded bg-rose-950/50 hover:bg-rose-900 text-rose-300 text-[11px] transition"
                    >
                      ลบโลโก้
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSaveMeta}
                className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        )}

        {/* Quotation Display Options Toolbar (Print: Hidden) */}
        <div className="print:hidden bg-slate-850 border-b border-slate-750 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-amber-400">tune</span>
              <span>รูปแบบเอกสาร:</span>
            </span>
            <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => handleToggleOption('mode', 'client_summary')}
                className={`px-3 py-1 rounded-md font-medium text-xs transition flex items-center gap-1.5 ${
                  displayOptions.mode === 'client_summary'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-xs">summarize</span>
                <span>สรุปเสนอลูกค้า (Summary)</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleOption('mode', 'detailed_boq')}
                className={`px-3 py-1 rounded-md font-medium text-xs transition flex items-center gap-1.5 ${
                  displayOptions.mode === 'detailed_boq'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-xs">table_rows</span>
                <span>แจกแจงละเอียด (Detailed BOQ)</span>
              </button>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleToggleOption('showProfitLine', !displayOptions.showProfitLine)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 ${
                displayOptions.showProfitLine
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="แสดง/ซ่อนบรรทัดกำไรและค่าดำเนินการ (หากปิดจะรวมอยู่ในมูลค่างานก่อสร้าง)"
            >
              <span className="material-symbols-outlined text-xs">
                {displayOptions.showProfitLine ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span>แสดงบรรทัดกำไร/ดำเนินการ ({overheadPercent}%)</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleOption('showMaterialDetails', !displayOptions.showMaterialDetails)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 ${
                displayOptions.showMaterialDetails
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="แสดง/ซ่อนการแยกคอลัมน์ค่าวัสดุและค่าแรง"
            >
              <span className="material-symbols-outlined text-xs">
                {displayOptions.showMaterialDetails ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span>แยกคอลัมน์วัสดุ/ค่าแรง</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleOption('showCostPerSqm', !displayOptions.showCostPerSqm)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 ${
                displayOptions.showCostPerSqm
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="แสดง/ซ่อนราคาเฉลี่ยต่อ ตร.ม."
            >
              <span className="material-symbols-outlined text-xs">
                {displayOptions.showCostPerSqm ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span>แสดงราคาเฉลี่ย/ตร.ม.</span>
            </button>
          </div>
        </div>

        {/* Paper Document Preview Area (Printable Sheet) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex justify-center">
          
          <div 
            id="quotation-print-area"
            className="w-full max-w-[850px] bg-white text-slate-900 shadow-2xl rounded-sm p-8 sm:p-12 font-sans flex flex-col justify-between text-xs"
          >
            
            {/* Document Header */}
            <div>
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-5">
                <div className="flex items-start gap-4">
                  {meta.companyLogo && (
                    <img 
                      src={meta.companyLogo} 
                      alt="Company Logo" 
                      className="w-16 h-16 object-contain rounded border border-slate-300 p-0.5 bg-white shrink-0" 
                    />
                  )}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    ใบเสนอราคาค่าก่อสร้าง (QUOTATION)
                  </h1>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-bold">
                    {meta.contractorName}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    โทร: {meta.contractorPhone} | เลขประจำตัวผู้เสียภาษี: {meta.contractorTaxId}
                  </p>
                </div>
              </div>
                <div className="text-right flex flex-col items-end">
                  <div className="px-2.5 py-1 bg-slate-100 rounded border border-slate-300 font-mono text-xs font-bold text-slate-800">
                    {meta.quotationNumber}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    วันที่: <strong>{meta.issueDate}</strong>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ยืนราคา: <strong>{meta.validityDays || 30} วัน</strong>
                  </span>
                </div>
              </div>

              {/* Project & Client Information Box */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-[11px]">
                <div>
                  <div className="font-bold text-slate-800 text-xs mb-1">ข้อมูลผู้ว่าจ้าง / ลูกค้า:</div>
                  <div className="text-slate-700"><strong>ชื่อ:</strong> {meta.customerName}</div>
                  <div className="text-slate-700"><strong>เบอร์ติดต่อ:</strong> {meta.customerPhone}</div>
                  <div className="text-slate-700"><strong>สถานที่ก่อสร้าง:</strong> {meta.customerAddress}</div>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <div className="font-bold text-slate-800 text-xs mb-1">รายละเอียดโครงการ:</div>
                  <div className="text-slate-700"><strong>โครงการ:</strong> {projectName}</div>
                  <div className="text-slate-700"><strong>พื้นที่ใช้สอยบ้าน:</strong> {houseAreaSqm} ตร.ม.</div>
                  {displayOptions.showCostPerSqm && houseAreaSqm > 0 && (
                    <div className="text-slate-700 font-semibold text-amber-700">
                      <strong>ราคาเฉลี่ยสุทธิ:</strong> ฿{costPerSqm.toLocaleString()} บาท / ตร.ม.
                    </div>
                  )}
                </div>
              </div>

              {/* Highlight Grand Total Box */}
              <div className="border-2 border-slate-900 bg-amber-50/90 rounded-xl px-4 py-3 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm break-inside-avoid">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-base text-amber-600">payments</span>
                    <span>ยอดเสนอราคาสุทธิรวมทั้งสิ้น (GRAND TOTAL)</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 mt-0.5 font-sarabun">
                    ({grandTotalThaiText})
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{vatPercent > 0 ? `รวมภาษีมูลค่าเพิ่ม VAT ${vatPercent}% แล้ว` : 'ราคายังไม่รวมภาษีมูลค่าเพิ่ม'}</span>
                    {displayOptions.showCostPerSqm && houseAreaSqm > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-amber-800">
                          เฉลี่ย ฿{costPerSqm.toLocaleString()} บาท/ตร.ม.
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl sm:text-3xl font-mono font-black text-slate-950 leading-none">
                    ฿{summary.grandTotal.toLocaleString()} <span className="text-sm font-sans font-bold text-slate-700">บาท</span>
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="overflow-x-auto mb-5">
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    {displayOptions.mode === 'client_summary' ? (
                      <tr className="border-y-2 border-slate-800 bg-slate-100 text-slate-900 font-bold">
                        <th className="py-2 px-2 w-12 text-center">ลำดับ</th>
                        <th className="py-2 px-2 text-left">หมวดหมู่งานก่อสร้าง และรายละเอียดงาน / วัสดุ</th>
                        <th className="py-2 px-2 w-36 text-right">จำนวนเงิน (บาท)</th>
                      </tr>
                    ) : (
                      <tr className="border-y-2 border-slate-800 bg-slate-100 text-slate-900 font-bold">
                        <th className="py-2 px-2 w-8 text-center">#</th>
                        <th className="py-2 px-2">หมวดหมู่งาน / รายการก่อสร้าง</th>
                        <th className="py-2 px-2 w-16 text-right">ปริมาณ</th>
                        <th className="py-2 px-2 w-12 text-center">หน่วย</th>
                        {displayOptions.showMaterialDetails && (
                          <>
                            <th className="py-2 px-2 w-20 text-right">ค่าวัสดุ (฿)</th>
                            <th className="py-2 px-2 w-20 text-right">ค่าแรง (฿)</th>
                          </>
                        )}
                        <th className="py-2 px-2 w-24 text-right">รวมเงิน (฿)</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {processedCategories.map((cat) => {
                      // ==========================================
                      // MODE: client_summary (แบบย่อส่งลูกค้า 3 คอลัมน์)
                      // ==========================================
                      if (displayOptions.mode === 'client_summary') {
                        // หากปิด showMaterialDetails จะแสดงเฉพาะแถวสรุปแต่ละหมวด
                        if (!displayOptions.showMaterialDetails) {
                          return (
                            <tr key={cat.catKey} className="border-b border-slate-200 hover:bg-slate-50 break-inside-avoid">
                              <td className="py-2.5 px-2 text-center font-bold text-slate-700">{cat.catNumber}</td>
                              <td className="py-2.5 px-2">
                                <div className="font-bold text-slate-900 text-xs">{cat.title}</div>
                                <div className="text-[10px] text-slate-500 font-normal">ประกอบด้วย {cat.items.length} รายการมาตรฐาน</div>
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-950 text-xs">
                                ฿{cat.allocatedTotal.toLocaleString()}
                              </td>
                            </tr>
                          );
                        }

                        // หากเปิด showMaterialDetails ในโหมด client_summary จะแสดงรายการย่อยในตาราง 3 คอลัมน์
                        return (
                          <React.Fragment key={cat.catKey}>
                            <tr className="bg-slate-100/80 border-t border-slate-300 font-bold text-slate-900 break-inside-avoid">
                              <td className="py-1.5 px-2 text-center font-bold">{cat.catNumber}</td>
                              <td className="py-1.5 px-2 text-slate-900 font-bold">
                                {cat.title} ({cat.items.length} รายการ)
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-950">
                                ฿{cat.allocatedTotal.toLocaleString()}
                              </td>
                            </tr>
                            {cat.items.map((item, itemIdx) => (
                              <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50/50 break-inside-avoid">
                                <td className="py-1 px-2 text-center text-slate-400 font-mono text-[9px]">
                                  {cat.catNumber}.{itemIdx + 1}
                                </td>
                                <td className="py-1 px-2">
                                  <div className="font-medium text-slate-900">{item.name}</div>
                                  {item.spec && <div className="text-[9.5px] text-slate-500">{item.spec}</div>}
                                </td>
                                <td className="py-1 px-2 text-right font-mono text-slate-800">
                                  ฿{item.allocatedTotal.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      }

                      // ==========================================
                      // MODE: detailed_boq (แจกแจงละเอียดเต็มรูปแบบ)
                      // ==========================================
                      return (
                        <React.Fragment key={cat.catKey}>
                          {/* Category Header Row */}
                          <tr className="bg-slate-100/70 border-t border-slate-300 font-bold text-slate-900 break-inside-avoid">
                            <td className="py-1 px-2 text-center">{cat.catNumber}</td>
                            <td colSpan={displayOptions.showMaterialDetails ? 5 : 3} className="py-1 px-2 text-slate-800">
                              {cat.title} ({cat.items.length} รายการ)
                            </td>
                            <td className="py-1 px-2 text-right font-mono">
                              ฿{cat.allocatedTotal.toLocaleString()}
                            </td>
                          </tr>
                          {/* Individual items under this category */}
                          {cat.items.map((item, itemIdx) => (
                            <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50/50 break-inside-avoid">
                              <td className="py-1 px-2 text-center text-slate-400 font-mono text-[9px]">
                                {cat.catNumber}.{itemIdx + 1}
                              </td>
                              <td className="py-1 px-2">
                                <div className="font-medium text-slate-900">{item.name}</div>
                                {item.spec && <div className="text-[9.5px] text-slate-500">{item.spec}</div>}
                              </td>
                              <td className="py-1 px-2 text-right font-mono">{item.quantity}</td>
                              <td className="py-1 px-2 text-center text-slate-600">{item.unit}</td>
                              {displayOptions.showMaterialDetails && (
                                <>
                                  <td className="py-1 px-2 text-right font-mono text-slate-700">
                                    ฿{item.allocatedMat.toLocaleString()}
                                  </td>
                                  <td className="py-1 px-2 text-right font-mono text-slate-700">
                                    ฿{item.allocatedLab.toLocaleString()}
                                  </td>
                                </>
                              )}
                              <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">
                                ฿{item.allocatedTotal.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary & Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-2 border-t-2 border-slate-900 break-inside-avoid">
                
                {/* Terms and Conditions */}
                <div className="text-[10px] text-slate-600 flex flex-col gap-2">
                  <div>
                    <strong className="text-slate-800 block mb-0.5">เงื่อนไขการแบ่งงวดชำระเงิน:</strong>
                    <pre className="font-sans whitespace-pre-wrap leading-relaxed text-[9.5px] bg-slate-50 p-2 rounded border border-slate-200">
                      {displayedPaymentTerms}
                    </pre>
                  </div>
                  <div>
                    <strong className="text-slate-800 block mb-0.5">การรับประกัน:</strong>
                    <div className="text-[9.5px]">{meta.warrantyTerms}</div>
                  </div>
                  {meta.notes && meta.notes.trim().length > 0 && (
                    <div>
                      <strong className="text-slate-800 block mb-0.5">หมายเหตุเพิ่มเติม:</strong>
                      <div className="text-[9.5px] leading-relaxed text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 whitespace-pre-wrap">
                        {meta.notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Totals Table */}
                <div className="flex flex-col gap-1.5 text-xs">
                  {displayOptions.mode === 'client_summary' ? (
                    <>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-800 font-semibold">
                          {displayOptions.showProfitLine ? 'รวมค่างานก่อสร้าง (Total Construction Cost):' : 'รวมค่างานก่อสร้าง (Total Construction Value):'}
                        </span>
                        <span className="font-mono font-semibold">
                          ฿{(displayOptions.showProfitLine ? summary.directCost : subtotalBeforeVat).toLocaleString()}
                        </span>
                      </div>
                      {displayOptions.showProfitLine && (
                        <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                          <span>ค่าดำเนินการและกำไร ({overheadPercent}%):</span>
                          <span className="font-mono">฿{displayedProfit.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {displayOptions.showMaterialDetails && (
                        <>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-600">
                              {displayOptions.showProfitLine ? 'รวมค่าวัสดุก่อสร้าง (Total Material):' : 'รวมค่าวัสดุก่อสร้าง (Allocated Material):'}
                            </span>
                            <span className="font-mono font-semibold">
                              ฿{(displayOptions.showProfitLine ? summary.totalMaterial : processedCategories.reduce((sum, c) => sum + c.allocatedMat, 0)).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-600">
                              {displayOptions.showProfitLine ? 'รวมค่าแรงงานช่าง (Total Labor):' : 'รวมค่าแรงงานช่าง (Allocated Labor):'}
                            </span>
                            <span className="font-mono font-semibold">
                              ฿{(displayOptions.showProfitLine ? summary.totalLabor : processedCategories.reduce((sum, c) => sum + c.allocatedLab, 0)).toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}

                      {displayOptions.showProfitLine ? (
                        <>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-800 font-bold">ต้นทุนตรง (Direct Cost):</span>
                            <span className="font-mono font-bold">฿{summary.directCost.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                            <span>ค่าดำเนินการและกำไร ({overheadPercent}%):</span>
                            <span className="font-mono">฿{displayedProfit.toLocaleString()}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-800 font-bold">รวมมูลค่างานก่อสร้าง (Total Construction Value):</span>
                          <span className="font-mono font-bold text-slate-900">
                            ฿{subtotalBeforeVat.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {vatPercent > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                      <span>ภาษีมูลค่าเพิ่ม VAT ({vatPercent}%):</span>
                      <span className="font-mono">฿{summary.vatAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {/* High-Contrast Grand Total Box */}
                  <div className="bg-slate-900 text-white px-3.5 py-3 rounded-xl border-l-4 border-amber-400 mt-2 shadow-md">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-200 text-xs sm:text-sm">ยอดเงินสุทธิรวมทั้งสิ้น:</span>
                      <span className="font-mono font-black text-xl sm:text-2xl text-amber-300">
                        ฿{summary.grandTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-200/90 font-sarabun text-right mt-1">
                      ({grandTotalThaiText})
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-2 gap-12 mt-12 pt-6 border-t border-slate-300 text-center text-xs text-slate-700 break-inside-avoid">
              <div className="flex flex-col items-center">
                <div className="w-48 border-b border-slate-800 pb-12 mb-2"></div>
                <span>ลงชื่อ .................................................... ผู้ว่าจ้าง</span>
                <span className="text-[10px] text-slate-500 mt-1">({meta.customerName})</span>
                <span className="text-[10px] text-slate-500">วันที่ ........ / ........ / ................</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-48 border-b border-slate-800 pb-12 mb-2"></div>
                <span>ลงชื่อ .................................................... ผู้เสนอราคา</span>
                <span className="text-[10px] text-slate-500 mt-1">({meta.contractorName})</span>
                <span className="text-[10px] text-slate-500">วันที่ ........ / ........ / ................</span>
              </div>
            </div>

          </div>

        </div>

        {/* Footer info */}
        <div className="print:hidden px-6 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>💡 คำแนะนำ: ในหน้าต่างการพิมพ์ ให้เลือกเครื่องพิมพ์เป็น "Save as PDF" หรือ "บันทึกเป็น PDF"</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition"
            >
              ปิด
            </button>
            <button
              onClick={() => {
                exportBOQToExcel({
                  items,
                  projectName,
                  houseAreaSqm,
                  quotationMeta: meta,
                  milestones,
                  overheadPercent,
                  vatPercent
                });
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">description</span>
              <span>ส่งออก Excel (.xlsx)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>พิมพ์เอกสาร / เซฟเป็น PDF</span>
            </button>
          </div>
        </div>

      </div>

      {/* Embedded print styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          body {
            visibility: hidden !important;
          }
          #quotation-print-modal-root,
          #quotation-print-modal-root * {
            visibility: visible !important;
          }
          #quotation-print-modal-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            z-index: 999999 !important;
            display: block !important;
          }
          #quotation-modal-container {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print,
          .print\\:hidden {
            display: none !important;
          }
          #quotation-print-area {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            min-height: auto !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

    </div>
  );
};
