import { exportBOQToExcel } from '../services/excelExporter';
import React, { useState } from 'react';
import { BOQItem, QuotationMeta, ConstructionCategory } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { computeBOQSummary } from '../services/calculator';

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
  onUpdateMeta
}) => {
  const [meta, setMeta] = useState<QuotationMeta>(quotationMeta);
  const [showMetaEdit, setShowMetaEdit] = useState<boolean>(false);

  if (!isOpen) return null;

  const summary = computeBOQSummary(items, overheadPercent, vatPercent);
  const costPerSqm = houseAreaSqm > 0 ? Math.round(summary.grandTotal / houseAreaSqm) : 0;

  const handleSaveMeta = () => {
    onUpdateMeta(meta);
    setShowMetaEdit(false);
  };

  const handlePrint = () => {
    window.print();
  };

  // Group items by category for professional layout
  const categories: ConstructionCategory[] = Object.keys(CATEGORY_LABELS) as ConstructionCategory[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      
      {/* Container */}
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden text-slate-100 my-auto">
        
        {/* Header - Not printed */}
        <div className="print:hidden flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-md">
              <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                ใบเสนอราคาและประมาณการค่าก่อสร้าง (Quotation / Cost Estimate)
              </h2>
              <p className="text-[11px] text-slate-400">
                พร้อมพิมพ์ออกเครื่องพิมพ์ หรือเลือกปลายทางเป็น "Save as PDF" เพื่อส่งให้ลูกค้าทันที
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMetaEdit(!showMetaEdit)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
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
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>พิมพ์ / บันทึกเป็น PDF</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Metadata Editor Drawer (Optional) */}
        {showMetaEdit && (
          <div className="print:hidden p-4 bg-slate-950/90 border-b border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs shrink-0 animate-in fade-in">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">เลขที่ใบเสนอราคา:</label>
              <input
                type="text"
                value={meta.quotationNumber}
                onChange={(e) => setMeta({ ...meta, quotationNumber: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">วันที่ออกเอกสาร:</label>
              <input
                type="date"
                value={meta.issueDate}
                onChange={(e) => setMeta({ ...meta, issueDate: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">กำหนดยืนราคา (วัน):</label>
              <input
                type="number"
                value={meta.validityDays}
                onChange={(e) => setMeta({ ...meta, validityDays: parseInt(e.target.value) || 30 })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">ชื่อลูกค้า / ผู้ว่าจ้าง:</label>
              <input
                type="text"
                value={meta.customerName}
                onChange={(e) => setMeta({ ...meta, customerName: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">เบอร์โทรลูกค้า:</label>
              <input
                type="text"
                value={meta.customerPhone}
                onChange={(e) => setMeta({ ...meta, customerPhone: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">สถานที่ก่อสร้าง:</label>
              <input
                type="text"
                value={meta.customerAddress}
                onChange={(e) => setMeta({ ...meta, customerAddress: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">ชื่อผู้รับเหมา / บริษัท:</label>
              <input
                type="text"
                value={meta.contractorName}
                onChange={(e) => setMeta({ ...meta, contractorName: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">เบอร์โทรผู้รับเหมา:</label>
              <input
                type="text"
                value={meta.contractorPhone}
                onChange={(e) => setMeta({ ...meta, contractorPhone: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
              />
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
            style={{ minHeight: '1100px' }}
          >
            
            {/* Document Header */}
            <div>
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-5">
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
                          <tr className="bg-slate-100/70 border-t border-slate-300 font-bold text-slate-900">
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
                              <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50/50">
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
              <div className="grid grid-cols-2 gap-6 pt-2 border-t-2 border-slate-900">
                
                {/* Terms and Conditions */}
                <div className="text-[10px] text-slate-600 flex flex-col gap-2">
                  <div>
                    <strong className="text-slate-800 block mb-0.5">เงื่อนไขการแบ่งงวดชำระเงิน:</strong>
                    <pre className="font-sans whitespace-pre-wrap leading-relaxed text-[9.5px] bg-slate-50 p-2 rounded border border-slate-200">
                      {meta.paymentTerms}
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
            <div className="grid grid-cols-2 gap-12 mt-12 pt-6 border-t border-slate-300 text-center text-xs text-slate-700">
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
          <span>💡 เคล็ดลับ: ในหน้าต่างพิมพ์ ให้เลือกปลายทางเป็น "Save as PDF" หรือ "บันทึกเป็น PDF"</span>
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
              <span>พิมพ์เอกสาร / บันทึก PDF</span>
            </button>
          </div>
        </div>

      </div>

      {/* Embedded print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #quotation-print-area, #quotation-print-area * {
            visibility: visible;
          }
          #quotation-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            padding: 15mm !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

    </div>
  );
};
