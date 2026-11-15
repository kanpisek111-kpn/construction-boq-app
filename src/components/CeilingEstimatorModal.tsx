import React, { useState, useMemo, useEffect } from 'react';
import { BOQItem, CeilingBoardType, CeilingDesignType, CeilingCalculationResult } from '../types';
import { calculateCeilingMaterials } from '../services/calculator';

interface CeilingEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToBOQ: (newItems: BOQItem[]) => void;
  currentHouseAreaSqm: number;
}

export const CeilingEstimatorModal: React.FC<CeilingEstimatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToBOQ,
  currentHouseAreaSqm = 120
}) => {
  // ค่าเริ่มต้นพื้นที่ฝ้าเพดาน (ปกติบ้าน 1 ชั้น ~ เท่ากับพื้นที่ใช้สอย หรือเพิ่ม 5% เผื่อชายคา/ระเบียง)
  const defaultCeilingArea = Math.round(currentHouseAreaSqm * 1.05);

  const [ceilingAreaSqm, setCeilingAreaSqm] = useState<number>(defaultCeilingArea);
  const [boardType, setBoardType] = useState<CeilingBoardType>('gypsum_standard_9mm');
  const [designType, setDesignType] = useState<CeilingDesignType>('flat_flush');
  const [covePerimeterM, setCovePerimeterM] = useState<number>(24); // เส้นรอบรูปฝ้าหลุมซ่อนไฟ (ม.)
  const [materialUnitPrice, setMaterialUnitPrice] = useState<number>(185); // ราคาต่อ ตร.ม. ใน BOQ
  const [laborUnitPrice, setLaborUnitPrice] = useState<number>(95);

  useEffect(() => {
    if (isOpen) {
      setCeilingAreaSqm(Math.round(currentHouseAreaSqm * 1.05));
    }
  }, [isOpen, currentHouseAreaSqm]);

  // คำนวณปริมาณวัสดุและอุปกรณ์ C-Line แบบเรียลไทม์
  const result: CeilingCalculationResult = useMemo(() => {
    return calculateCeilingMaterials(ceilingAreaSqm, boardType, designType, covePerimeterM);
  }, [ceilingAreaSqm, boardType, designType, covePerimeterM]);

  if (!isOpen) return null;

  // ส่งผลลัพธ์เข้าสู่รายการ BOQ
  const handleApply = () => {
    const timestamp = Date.now();
    const boardName = boardType === 'gypsum_standard_9mm'
      ? 'แผ่นยิปซัมบอร์ดมาตรฐาน 9 มม. (ขอบลาด)'
      : boardType === 'gypsum_moisture_9mm'
      ? 'แผ่นยิปซัมบอร์ดทนชื้น (MoistShield) 9 มม.'
      : 'แผ่นไฟเบอร์ซีเมนต์/สมาร์ทบอร์ด 6 มม.';

    const designName = designType === 'flat_flush'
      ? 'ฝ้าเพดานฉาบเรียบโครงคร่าว C-Line'
      : designType === 'cove_stepped'
      ? 'ฝ้าเพดานหลุมซ่อนไฟ/เล่นระดับ โครงคร่าว C-Line'
      : 'ฝ้าเพดานทีบาร์ (T-Bar Grid)';

    const specText = `${boardName} โครงคร่าว C-Line ชุบสังกะสี มอก. เบอร์ 24 หนา 0.52 มม. โครงหลัก @1.00 ม. โครงซอย @0.40 ม. พร้อมฉากริม ผ้ารอยต่อ และปูนฉาบ 3 เที่ยวขัดเรียบ [อุปกรณ์ประเมิน: C-Line ${result.cLineTotalBars} ท่อน, ฉากริม ${result.wallAngleBars} ท่อน, ยิปซัม ${result.gypsumSheets} แผ่น, ปูนฉาบ ${result.jointCompoundBags} ถุง, ผ้าเทป ${result.jointTapeRolls} ม้วน, สกรู ${result.drywallScrewsBoxes} กล่อง, ลวดแขวน ${result.hangerSets} ชุด]`;

    const qty = Math.round(ceilingAreaSqm * 10) / 10;
    const newItems: BOQItem[] = [
      {
        id: `fin-ceiling-${timestamp}`,
        category: 'finishes',
        name: `งาน${designName} (${boardName})`,
        spec: specText,
        quantity: qty,
        unit: 'ตร.ม.',
        materialUnitPrice: materialUnitPrice || 185,
        laborUnitPrice: laborUnitPrice || (designType === 'cove_stepped' ? 140 : designType === 'tbar_grid' ? 85 : 95),
        wastePercent: 5,
        basePerSqm: qty / Math.max(1, currentHouseAreaSqm || 120),
      }
    ];

    onApplyToBOQ(newItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-950 via-slate-900 to-cyan-950 border-b border-teal-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <span className="material-symbols-outlined text-2xl">grid_view</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                คำนวณงานฝ้าเพดาน & ถอดอุปกรณ์ C-Line ครบชุด
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono">
                  SCG / Gyproc Standard
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                ถอดจำนวนแผ่นยิปซัม, โครง C-Line, ฉากริม, ปูนฉาบ, ผ้าเทป, สกรู และชุดแขวนลวดปรับระดับอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5 text-xs text-slate-300">
          {/* Section 1: ตัวเลือกการออกแบบและขนาดพื้นที่ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* พื้นที่ฝ้าเพดาน */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
              <label className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">square_foot</span>
                พื้นที่ฝ้าเพดานรวม (ตร.ม.)
              </label>
              <div className="relative mt-1">
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={ceilingAreaSqm}
                  onChange={(e) => setCeilingAreaSqm(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-teal-500/40 rounded-lg px-3 py-2 text-base font-bold text-white font-mono focus:outline-none focus:border-teal-400"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">ตร.ม.</span>
              </div>
              <div className="flex gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setCeilingAreaSqm(Math.round(currentHouseAreaSqm * 1.0))}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                >
                  เท่าตัวบ้าน ({currentHouseAreaSqm} ม²)
                </button>
                <button
                  type="button"
                  onClick={() => setCeilingAreaSqm(Math.round(currentHouseAreaSqm * 1.08))}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-teal-300"
                >
                  +ชายคา 8%
                </button>
              </div>
            </div>

            {/* ชนิดแผ่นฝ้า */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
              <label className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">layers</span>
                ชนิดของแผ่นฝ้าเพดาน
              </label>
              <select
                value={boardType}
                onChange={(e) => {
                  const val = e.target.value as CeilingBoardType;
                  setBoardType(val);
                  if (val === 'gypsum_moisture_9mm') setMaterialUnitPrice(230);
                  else if (val === 'smartboard_6mm') setMaterialUnitPrice(210);
                  else setMaterialUnitPrice(185);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-teal-400 mt-1"
              >
                <option value="gypsum_standard_9mm">แผ่นยิปซัม 9 มม. ขอบลาด (ห้องทั่วไป)</option>
                <option value="gypsum_moisture_9mm">แผ่นยิปซัมทนชื้น 9 มม. (ห้องน้ำ/ระเบียง)</option>
                <option value="smartboard_6mm">สมาร์ทบอร์ด 6 มม. (ภายนอก/กันปลวก)</option>
              </select>
              <span className="text-[10px] text-slate-500">
                ขนาดแผ่นมาตรฐาน 1.20 × 2.40 ม. (2.88 ตร.ม./แผ่น)
              </span>
            </div>

            {/* รูปแบบดีไซน์ฝ้า */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
              <label className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">design_services</span>
                รูปแบบการติดตั้ง
              </label>
              <select
                value={designType}
                onChange={(e) => {
                  const val = e.target.value as CeilingDesignType;
                  setDesignType(val);
                  if (val === 'cove_stepped') setLaborUnitPrice(140);
                  else if (val === 'tbar_grid') setLaborUnitPrice(85);
                  else setLaborUnitPrice(95);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-teal-400 mt-1"
              >
                <option value="flat_flush">ฝ้าเพดานฉาบเรียบมาตรฐาน</option>
                <option value="cove_stepped">ฝ้าหลุมซ่อนไฟ / เล่นระดับ (Cove)</option>
                <option value="tbar_grid">ฝ้าทีบาร์ 60x60 ซม. (T-Bar Grid)</option>
              </select>
              {designType === 'cove_stepped' && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-amber-300">ความยาวแนวหลุม:</span>
                  <input
                    type="number"
                    min="1"
                    value={covePerimeterM}
                    onChange={(e) => setCovePerimeterM(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-16 bg-slate-900 border border-amber-500/40 rounded px-2 py-0.5 text-xs text-amber-300 font-mono text-center"
                  />
                  <span className="text-[10px] text-slate-400">ม.</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: ตารางสรุปรายการถอดวัสดุอุปกรณ์ (Takeoff Breakdown) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-teal-500/30 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">inventory_2</span>
                <span className="font-bold text-sm text-white">
                  รายการอุปกรณ์ที่ต้องสั่งซื้อจริง (Bill of Materials Takeoff)
                </span>
              </div>
              <span className="text-xs font-mono text-teal-300 bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-500/40">
                คำนวณสำหรับพื้นที่ {ceilingAreaSqm} ตร.ม. (เผื่อเศษ 5%)
              </span>
            </div>

            {/* Cards Grid 7 รายการหลัก */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-1 font-sans">
              {/* 1. แผ่นยิปซัม */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">1. แผ่นยิปซัม 1.20x2.40ม.</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-amber-400 font-mono">{result.gypsumSheets}</span>
                  <span className="text-xs text-slate-400">แผ่น</span>
                </div>
                <span className="text-[9px] text-slate-500 mt-1">2.88 ตร.ม./แผ่น เผื่อตัด 5%</span>
              </div>

              {/* 2. โครง C-Line รวม */}
              <div className="p-3 rounded-lg bg-slate-900 border border-teal-500/40 bg-teal-950/10 flex flex-col">
                <span className="text-[10px] text-teal-300 font-bold flex items-center justify-between">
                  <span>2. โครงคร่าว C-Line (4.0ม.)</span>
                  <span className="text-[9px] bg-teal-500/20 px-1 rounded">หนา 0.52มม.</span>
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-teal-300 font-mono">{result.cLineTotalBars}</span>
                  <span className="text-xs text-slate-400">ท่อน</span>
                </div>
                <span className="text-[9px] text-slate-400 mt-1">
                  (หลัก {result.cLineMainBars} ท่อน + ซอย {result.cLineCrossBars} ท่อน)
                </span>
              </div>

              {/* 3. ฉากริมผนัง */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">3. ฉากริม Wall Angle (2.4ม.)</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-white font-mono">{result.wallAngleBars}</span>
                  <span className="text-xs text-slate-400">ท่อน</span>
                </div>
                <span className="text-[9px] text-slate-500 mt-1">ยึดรอบแนวผนังห้อง</span>
              </div>

              {/* 4. ปูนฉาบรอยต่อ */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">4. ปูนฉาบรอยต่อยิปซัม</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-cyan-400 font-mono">{result.jointCompoundBags}</span>
                  <span className="text-xs text-slate-400">ถุงใหญ่ (25 กก.)</span>
                </div>
                <span className="text-[9px] text-slate-500 mt-1">ฉาบ 3 เที่ยวและหัวสกรู</span>
              </div>

              {/* 5. ผ้าเทปรอยต่อ */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">5. ผ้าเทปผ้ารอยต่อ (90ม.)</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-white font-mono">{result.jointTapeRolls}</span>
                  <span className="text-xs text-slate-400">ม้วน</span>
                </div>
                <span className="text-[9px] text-slate-500 mt-1">เทปไฟเบอร์/กระดาษกันร้าว</span>
              </div>

              {/* 6. สกรูยิงยิปซัม 1 นิ้ว */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">6. สกรูยิงยิปซัม 1 นิ้ว</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-amber-400 font-mono">{result.drywallScrewsBoxes}</span>
                  <span className="text-xs text-slate-400">กล่อง (1,000 ตัว)</span>
                </div>
                <span className="text-[9px] text-slate-500 mt-1">ยิงยึดยิปซัมเข้าโครงคร่าว</span>
              </div>

              {/* 7. ชุดแขวนลวดปรับระดับ */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">7. ชุดแขวนลวดปรับระดับ</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-teal-400 font-mono">{result.hangerSets}</span>
                  <span className="text-xs text-slate-400">ชุด</span>
                </div>
                <span className="text-[9px] text-slate-500 mt-1">ลวดแขวน + สปริง + พุกดร็อปอิน</span>
              </div>

              {/* 8. ขอล็อค & ข้อต่อ */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">8. ขอล็อค & ข้อต่อ C-Line</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-base font-bold text-slate-200 font-mono">
                    {result.lockingKeys} / {result.jointClips}
                  </span>
                  <span className="text-xs text-slate-400">ตัว</span>
                </div>
                <span className="text-[9px] text-slate-500 mt-1">ขอล็อคจุดตัด + ข้อต่อท่อน</span>
              </div>
            </div>
          </div>

          {/* Section 3: ตั้งราคาต่อ ตร.ม. สำหรับลงใน BOQ */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-200">
              ตั้งราคาประมาณการต่อหน่วยสำหรับบันทึกลงใน BOQ (หมวด 6. งานตกแต่งผิวและฝ้าเพดาน)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">ค่าวัสดุ / ตร.ม. (บาท)</label>
                <input
                  type="number"
                  value={materialUnitPrice}
                  onChange={(e) => setMaterialUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">ค่าแรงช่าง / ตร.ม. (บาท)</label>
                <input
                  type="number"
                  value={laborUnitPrice}
                  onChange={(e) => setLaborUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold"
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-500/30 flex items-center justify-between">
                  <span className="text-[11px] text-teal-300 font-medium">รวมทั้งสิ้น:</span>
                  <span className="text-sm font-bold font-mono text-white">
                    ฿{Math.round(ceilingAreaSqm * (materialUnitPrice + laborUnitPrice)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            ยอดรวมใน BOQ: <strong className="text-amber-400 font-mono">฿{Math.round(ceilingAreaSqm * (materialUnitPrice + laborUnitPrice)).toLocaleString()}</strong> บาท
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-teal-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm font-black">check_circle</span>
              <span>บันทึกลงใน BOQ & รายการสั่งของ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
