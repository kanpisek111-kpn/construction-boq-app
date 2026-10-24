import React, { useState } from 'react';
import { Flow } from 'flow-sdk';
import { PlanAnalysisResult, BOQItem, ConstructionCategory } from '../types';
interface PlanAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMergeItems: (newItems: BOQItem[]) => void;
  onUpdateHouseArea?: (newArea: number) => void;
}
const safeToLocaleString = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString();
};
export const PlanAnalyzerModal: React.FC<PlanAnalyzerModalProps> = ({ 
  isOpen, 
  onClose, 
  onMergeItems,
  onUpdateHouseArea 
}) => {
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<PlanAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;
  const handlePickPlanImage = async () => {
    try {
      const media = await Flow.media.select({ filter: 'image' });
      setSelectedImage({
        base64: media.base64,
        mimeType: media.mimeType,
        name: media.name || 'แบบแปลนบ้าน',
      });
      setAnalysisResult(null);
      setError(null);
    } catch (e) {
      console.error(e);
    }
  };
  const handleAnalyzeWithAI = async () => {
    if (!selectedImage) return;
    setAnalyzing(true);
    setError(null);
    const systemPrompt = `คุณคือวิศวกรโยธาและผู้เชี่ยวชาญการถอดแบบก่อสร้างบ้าน (Cost Estimator & BOQ Expert) ชั้นนำของไทย
เมื่อได้รับภาพแบบแปลนบ้าน (Floor Plan, Architectural Drawing, หรือ Elevation) ให้คุณวิเคราะห์องค์ประกอบอาคารอย่างละเอียดตามมาตรฐานงานช่างไทย:
1. ประมาณการขนาดพื้นที่ใช้สอยรวม (ตร.ม.), ความกว้างxยาวของผัง (เมตร)
2. จำนวนเสา คาน ผนังก่ออิฐ พื้นที่หลังคา
3. ถอดรายการวัสดุสำคัญและปริมาณงาน (Quantity Takeoff) พร้อมระบุราคาค่าวัสดุและค่าแรงตามราคากลางท้องตลาดประเทศไทยปัจจุบัน
คุณต้องตอบกลับเป็น JSON แท้ๆ เท่านั้น โดยไม่มี markdown formatting ปิดท้าย (ไม่มี \`\`\`json) โครงสร้างดังนี้:
{
  "floorAreaSqm": number,
  "footprintWidthM": number,
  "footprintLengthM": number,
  "estimatedColumnsCount": number,
  "estimatedBeamsLengthM": number,
  "wallAreaSqm": number,
  "roofTypeSuggested": "string เช่น ทรงจั่ว, ปั้นหยา, โมเดิร์นหมาแหงน",
  "roofPitchDeg": number,
  "detailedNotes": ["ข้อสังเกต 1", "ข้อสังเกต 2", "คำแนะนำฐานราก"],
  "suggestedItems": [
    {
      "category": "preparation | structure | roof | masonry_wall | doors_windows | finishes | sanitary | electrical",
      "name": "string",
      "spec": "string",
      "quantity": number,
      "unit": "ตร.ม. | ลบ.ม. | กก. | ม. | ชุด | จุด",
      "materialUnitPrice": number,
      "laborUnitPrice": number
    }
  ]
}`;
    try {
      const { text } = await Flow.generate.text(
        'จงวิเคราะห์ภาพแปลนบ้านนี้อย่างละเอียด ถอดพื้นที่ใช้สอยรวม (ตร.ม.) โครงสร้าง ผนัง หลังคา ประตูหน้าต่าง และแปลงเป็น BOQ ทั้งค่าวัสดุและค่าแรง',
        {
          images: [{ base64: selectedImage.base64, mimeType: selectedImage.mimeType }],
          systemInstruction: systemPrompt,
          thinkingLevel: 'high'
        }
      );
      // Sanitize JSON
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
      else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
      cleaned = cleaned.trim();
      const parsed: PlanAnalysisResult = JSON.parse(cleaned);
      setAnalysisResult(parsed);
    } catch (err: any) {
      console.error(err);
      setError('ไม่สามารถวิเคราะห์แบบได้ หรือผลลัพธ์รูปแบบไม่ตรง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setAnalyzing(false);
    }
  };
  const handleApplyToBOQ = () => {
    if (!analysisResult?.suggestedItems) return;
    const area = analysisResult.floorAreaSqm || 120;
    if (onUpdateHouseArea && analysisResult.floorAreaSqm && analysisResult.floorAreaSqm > 0) {
      onUpdateHouseArea(Math.round(analysisResult.floorAreaSqm));
    }
    const newBoqItems: BOQItem[] = analysisResult.suggestedItems.map((item, idx) => ({
      id: `ai-plan-${Date.now()}-${idx}`,
      category: item.category as ConstructionCategory,
      name: item.name || 'รายการวัสดุ',
      spec: item.spec || '',
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'หน่วย',
      materialUnitPrice: Number(item.materialUnitPrice) || 0,
      laborUnitPrice: Number(item.laborUnitPrice) || 0,
      wastePercent: ['structure', 'masonry_wall', 'finishes'].includes(item.category) ? 5 : 0,
      basePerSqm: (Number(item.quantity) || 1) / area,
    }));
    onMergeItems(newBoqItems);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-400 text-2xl">architecture</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">AI ถอดแบบแปลนบ้าน & ปริมาณวัสดุตาม ตร.ม.</h2>
              <p className="text-xs text-slate-400">วิเคราะห์ภาพแปลนพื้น คาน เสา ผนัง และหลังคา ออกมาเป็นตาราง BOQ พร้อมคำนวณพื้นที่ ตร.ม.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Upload & Preview Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="flex flex-col gap-3">
              <div 
                onClick={handlePickPlanImage}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-400 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/40 hover:bg-indigo-950/10 transition group"
              >
                <span className="material-symbols-outlined text-4xl text-slate-500 group-hover:text-indigo-400 mb-2 transition">
                  add_photo_alternate
                </span>
                <span className="text-xs font-semibold text-slate-300">คลิกเพื่อเลือกภาพแปลนบ้าน / พิมพ์เขียว</span>
                <span className="text-[10px] text-slate-500 mt-1">รองรับไฟล์ JPG, PNG หรือภาพถ่ายผังจากเอกสารก่อสร้าง</span>
              </div>
              {selectedImage && (
                <button
                  onClick={handleAnalyzeWithAI}
                  disabled={analyzing}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95"
                >
                  {analyzing ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>AI กำลังวิเคราะห์สัดส่วนแปลนและคำนวณปริมาณ...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      <span>วิเคราะห์แปลนและสร้างรายการ BOQ</span>
                    </>
                  )}
                </button>
              )}
            </div>
            {/* Preview Box */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 flex items-center justify-center min-h-[180px] overflow-hidden relative">
              {selectedImage ? (
                <img 
                  src={`data:${selectedImage.mimeType};base64,${selectedImage.base64}`} 
                  alt="แบบแปลน" 
                  className="max-h-56 max-w-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center text-slate-600 text-xs flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-2xl">crop_original</span>
                  <span>ยังไม่ได้เลือกภาพแปลน</span>
                </div>
              )}
            </div>
          </div>
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{error}</span>
            </div>
          )}
          {/* Analysis Result Display */}
          {analysisResult && (
            <div className="flex flex-col gap-4 animate-in fade-in">
              <div className="bg-slate-850 p-4 rounded-xl border border-slate-700">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">analytics</span> สรุปมิติทางกายภาพที่ตรวจพบ
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">พื้นที่ใช้สอยตรวจพบ</span>
                    <span className="font-mono font-bold text-base text-amber-400">{analysisResult.floorAreaSqm} ตร.ม.</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">ขนาดผัง กว้าง x ยาว</span>
                    <span className="font-mono font-bold text-base text-cyan-400">{analysisResult.footprintWidthM} x {analysisResult.footprintLengthM} ม.</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">จำนวนเสาที่คาดการณ์</span>
                    <span className="font-mono font-bold text-base text-emerald-400">{analysisResult.estimatedColumnsCount} ต้น</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">ทรงหลังคาที่แนะนำ</span>
                    <span className="font-medium text-xs text-white">{analysisResult.roofTypeSuggested}</span>
                  </div>
                </div>
                {analysisResult.detailedNotes && analysisResult.detailedNotes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">คำแนะนำทางวิศวกรรม:</span>
                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                      {analysisResult.detailedNotes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {/* Items List */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-200">
                    รายการ BOQ ที่ถอดแบบได้ ({analysisResult.suggestedItems.length} รายการ)
                  </span>
                  <span className="text-[10px] text-slate-400">แยกราคาของ & แรงตามสถิติงานไทย</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-850 text-xs">
                  {analysisResult.suggestedItems.map((item, i) => (
                    <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-900/50">
                      <div className="flex flex-col gap-0.5 pr-2">
                        <span className="font-medium text-white">{item.name}</span>
                        <span className="text-[11px] text-slate-400">{item.spec}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-semibold text-amber-400">
                          {item.quantity} {item.unit}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          วัสดุ ฿{safeToLocaleString(item.materialUnitPrice)} | แรง ฿{safeToLocaleString(item.laborUnitPrice)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            {analysisResult ? `พร้อมนำรายการ ${analysisResult.suggestedItems.length} รายการเข้าตารางหลัก (ปรับขนาดบ้านเป็น ${analysisResult.floorAreaSqm} ตร.ม.)` : 'โปรดเลือกรูปแปลนเพื่อเริ่มวิเคราะห์'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              ปิด
            </button>
            {analysisResult && (
              <button
                onClick={handleApplyToBOQ}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">playlist_add</span>
                รวมเข้ากับ BOQ ปัจจุบัน
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};