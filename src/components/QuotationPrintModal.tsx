import React, { useState, useEffect } from 'react';
import { BOQItem, ConstructionCategory, QuotationMeta, PaymentMilestone } from '../types';
import { CATEGORY_LABELS, formatMilestonesToPaymentTerms } from '../constants';
import { exportBOQToExcel } from '../services/excelExporter';
import { computeBOQSummary } from '../services/calculator';
import { LicenseTier, canAccessFeature } from '../services/authService';

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
  milestones = [],
  licenseTier = 'owner',
  onRequestUpgrade
}) => {
  const [meta, setMeta] = useState<QuotationMeta>(quotationMeta);
  const [showMetaEdit, setShowMetaEdit] = useState<boolean>(false);

  // Sync meta state whenever quotationMeta prop updates or modal opens (ensures fresh data per project)
  useEffect(() => {
    setMeta(quotationMeta);
  }, [quotationMeta, isOpen]);

  const summary = computeBOQSummary(items, overheadPercent, vatPercent);
  const costPerSqm = houseAreaSqm > 0 ? Math.round(summary.grandTotal / houseAreaSqm) : 0;

  // Auto-format payment terms from active project milestones if available
  const formattedMilestonesText = milestones && milestones.length > 0
    ? formatMilestonesToPaymentTerms(milestones, summary.grandTotal)
    : meta.paymentTerms;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canAccessFeature('white_label_branding', licenseTier)) {
      if (onRequestUpgrade) onRequestUpgrade('White-label ปรับแต่งโลโก้บริษัทและชื่อผู้รับเหมา');
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('ขนาดไฟล์โลโก้ต้องไม่เกิน 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setMeta(prev => ({ ...prev, companyLogo: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setMeta(prev => ({ ...prev, companyLogo: '' }));
  };

  const handleSaveMeta = () => {
    onUpdateMeta(meta);
    setShowMetaEdit(false);
  };

  const handlePrint = () => {
    const printArea = document.getElementById('quotation-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      // If popup is blocked by browser, fallback to standard window.print()
      window.print();
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบเสนอราคา - ${meta.quotationNumber} - ${projectName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
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
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
    .action-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
      z-index: 9999;
      font-family: sans-serif;
    }
    .btn-print {
      background: #f59e0b;
      color: #0f172a;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-close {
      background: #334155;
      color: #f8fafc;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <div>
      <strong>📄 ใบเสนอราคา (Quotation Preview)</strong>
      <span style="font-size: 12px; opacity: 0.8; margin-left: 10px;">เลือก "บันทึกเป็น PDF" ในหน้าต่างพิมพ์</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-print" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
      <button class="btn-close" onclick="window.close()">ปิดหน้าต่าง</button>
    </div>
  </div>
  <div class="print-sheet">
    ${printArea.innerHTML}
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  // Group items by category for professional layout
  const categories: ConstructionCategory[] = Object.keys(CATEGORY_LABELS) as ConstructionCategory[];

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

        {/* Edit Metadata Drawer */}
        {showMetaEdit && (
          <div className="print:hidden p-5 bg-slate-850 border-b border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">เลขที่ใบเสนอราคา:</label>
              <input
                type="text"
                value={meta.quotationNumber}
                onChange={(e) => setMeta({ ...meta, quotationNumber: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">วันที่ออกเอกสาร:</label>
              <input
                type="date"
                value={meta.issueDate}
                onChange={(e) => setMeta({ ...meta, issueDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">ยืนราคาภายใน (วัน):</label>
              <input
                type="number"
                value={meta.validityDays}
                onChange={(e) => setMeta({ ...meta, validityDays: parseInt(e.target.value) || 30 })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">ชื่อผู้ว่าจ้าง / ลูกค้า:</label>
              <input
                type="text"
                value={meta.customerName}
                onChange={(e) => setMeta({ ...meta, customerName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">เบอร์โทรลูกค้า:</label>
              <input
                type="text"
                value={meta.customerPhone}
                onChange={(e) => setMeta({ ...meta, customerPhone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">สถานที่ก่อสร้าง:</label>
              <input
                type="text"
                value={meta.customerAddress}
                onChange={(e) => setMeta({ ...meta, customerAddress: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">ชื่อบริษัท / ผู้รับเหมา:</label>
              <input
                type="text"
                value={meta.contractorName}
                onChange={(e) => setMeta({ ...meta, contractorName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">เบอร์โทรผู้รับเหมา:</label>
              <input
                type="text"
                value={meta.contractorPhone}
                onChange={(e) => setMeta({ ...meta, contractorPhone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">เลขประจำตัวผู้เสียภาษี:</label>
              <input
                type="text"
                value={meta.contractorTaxId}
                onChange={(e) => setMeta({ ...meta, contractorTaxId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1">เงื่อนไขการแบ่งงวดชำระเงิน:</label>
              <textarea
                rows={2}
                value={meta.paymentTerms}
                onChange={(e) => setMeta({ ...meta, paymentTerms: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-[11px]"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">การรับประกันผลงาน:</label>
              <input
                type="text"
                value={meta.warrantyTerms}
                onChange={(e) => setMeta({ ...meta, warrantyTerms: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
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
                    ยืนราคา: <strong>{meta.validityDays} วัน</strong>
                  </span>
                </div>
              </div>

              {/* Project & Client Information Box */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-5 text-[11px]">
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
                  <div className="text-slate-700 font-semibold text-amber-700">
                    <strong>ราคาเฉลี่ยสุทธิ:</strong> ฿{costPerSqm.toLocaleString()} บาท / ตร.ม.
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="overflow-x-auto mb-5">
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="border-y-2 border-slate-800 bg-slate-100 text-slate-900 font-bold">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-2">หมวดหมู่งาน / รายการก่อสร้าง</th>
                      <th className="py-2 px-2 w-16 text-right">ปริมาณ</th>
                      <th className="py-2 px-2 w-12 text-center">หน่วย</th>
                      <th className="py-2 px-2 w-20 text-right">ค่าวัสดุ (฿)</th>
                      <th className="py-2 px-2 w-20 text-right">ค่าแรง (฿)</th>
                      <th className="py-2 px-2 w-24 text-right">รวมเงิน (฿)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((catKey, catIdx) => {
                      const catItems = items.filter(i => i.category === catKey);
                      if (catItems.length === 0) return null;
                      const catMat = catItems.reduce((acc, cur) => acc + (cur.quantity * cur.materialUnitPrice * (1 + cur.wastePercent / 100)), 0);
                      const catLab = catItems.reduce((acc, cur) => acc + (cur.quantity * cur.laborUnitPrice), 0);
                      const catTotal = catMat + catLab;
                      const catTitle = CATEGORY_LABELS[catKey]?.title || catKey;

                      return (
                        <React.Fragment key={catKey}>
                          {/* Category Header Row */}
                          <tr className="bg-slate-100/70 border-t border-slate-300 font-bold text-slate-900 break-inside-avoid">
                            <td className="py-1 px-2 text-center">{catIdx + 1}</td>
                            <td colSpan={5} className="py-1 px-2 text-slate-800">
                              {catTitle} ({catItems.length} รายการ)
                            </td>
                            <td className="py-1 px-2 text-right font-mono">
                              ฿{Math.round(catTotal).toLocaleString()}
                            </td>
                          </tr>
                          {/* Individual items under this category */}
                          {catItems.map((item, itemIdx) => {
                            const mat = item.quantity * item.materialUnitPrice * (1 + item.wastePercent / 100);
                            const lab = item.quantity * item.laborUnitPrice;
                            const line = mat + lab;

                            return (
                              <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50/50 break-inside-avoid">
                                <td className="py-1 px-2 text-center text-slate-400 font-mono text-[9px]">
                                  {catIdx + 1}.{itemIdx + 1}
                                </td>
                                <td className="py-1 px-2">
                                  <div className="font-medium text-slate-900">{item.name}</div>
                                  <div className="text-[9.5px] text-slate-500">{item.spec}</div>
                                </td>
                                <td className="py-1 px-2 text-right font-mono">{item.quantity}</td>
                                <td className="py-1 px-2 text-center text-slate-600">{item.unit}</td>
                                <td className="py-1 px-2 text-right font-mono text-slate-700">
                                  ฿{Math.round(mat).toLocaleString()}
                                </td>
                                <td className="py-1 px-2 text-right font-mono text-slate-700">
                                  ฿{Math.round(lab).toLocaleString()}
                                </td>
                                <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">
                                  ฿{Math.round(line).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
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
                      {formattedMilestonesText}
                    </pre>
                  </div>
                  <div>
                    <strong className="text-slate-800 block mb-0.5">การรับประกัน:</strong>
                    <div className="text-[9.5px]">{meta.warrantyTerms}</div>
                  </div>
                </div>

                {/* Totals Table */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">รวมค่าวัสดุก่อสร้าง (Total Material):</span>
                    <span className="font-mono font-semibold">฿{summary.totalMaterial.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">รวมค่าแรงงานช่าง (Total Labor):</span>
                    <span className="font-mono font-semibold">฿{summary.totalLabor.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-800 font-bold">ต้นทุนตรง (Direct Cost):</span>
                    <span className="font-mono font-bold">฿{summary.directCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                    <span>ค่าดำเนินการและกำไร ({overheadPercent}%):</span>
                    <span className="font-mono">฿{summary.overheadCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                    <span>ภาษีมูลค่าเพิ่ม VAT ({vatPercent}%):</span>
                    <span className="font-mono">฿{summary.vatAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-y-2 border-slate-900 bg-slate-100 px-2 rounded mt-1">
                    <span className="font-black text-slate-900 text-sm">ยอดเงินสุทธิรวมทั้งสิ้น:</span>
                    <span className="font-mono font-black text-base text-slate-900">
                      ฿{summary.grandTotal.toLocaleString()}
                    </span>
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
