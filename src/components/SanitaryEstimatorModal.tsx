import React, { useState, useMemo } from 'react';
import { SanitaryCalcParams, BOQItem } from '../types';
import { calculateSanitarySystem } from '../services/calculator';

interface SanitaryEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToBOQ: (newItems: BOQItem[]) => void;
  currentHouseAreaSqm: number;
}

export const SanitaryEstimatorModal: React.FC<SanitaryEstimatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToBOQ,
  currentHouseAreaSqm = 120
}) => {
  const [bathroomCount, setBathroomCount] = useState<number>(2);
  const [kitchenCount, setKitchenCount] = useState<number>(1);
  const [washingYardCount, setWashingYardCount] = useState<number>(1);
  const [pipeTypeWater, setPipeTypeWater] = useState<'ppr_green' | 'pvc_blue_8.5' | 'pvc_blue_13.5'>('ppr_green');
  const [septicTankLiters, setSepticTankLiters] = useState<1000 | 1600 | 2000>(1600);
  const [greaseTrapLiters, setGreaseTrapLiters] = useState<15 | 30 | 50 | 100>(30);
  const [includeWaterPumpAndTank, setIncludeWaterPumpAndTank] = useState<boolean>(true);
  const [waterTankLiters, setWaterTankLiters] = useState<1000 | 1500 | 2000>(1500);
  const [waterPumpWatt, setWaterPumpWatt] = useState<150 | 200 | 250 | 300>(250);

  const result = useMemo(() => {
    const params: SanitaryCalcParams = {
      bathroomCount,
      kitchenCount,
      washingYardCount,
      pipeTypeWater,
      septicTankLiters,
      greaseTrapLiters,
      includeWaterPumpAndTank,
      waterTankLiters,
      waterPumpWatt
    };
    return calculateSanitarySystem(params);
  }, [bathroomCount, kitchenCount, washingYardCount, pipeTypeWater, septicTankLiters, greaseTrapLiters, includeWaterPumpAndTank, waterTankLiters, waterPumpWatt]);

  if (!isOpen) return null;

  const handleApply = () => {
    const timestamp = Date.now();
    const newItems: BOQItem[] = [];

    const pipeName = pipeTypeWater === 'ppr_green' 
      ? 'ท่อน้ำดี PPR สีเขียว เชื่อมด้วยความร้อน (ไร้กาว ไม่รั่วซึมตลอดชีพ)' 
      : pipeTypeWater === 'pvc_blue_13.5'
      ? 'ท่อน้ำดี PVC สีฟ้า ชั้น 13.5 หนาพิเศษ มอก. 17-2532'
      : 'ท่อน้ำดี PVC สีฟ้า ชั้น 8.5 มอก. 17-2532';

    // 1. ท่อน้ำดี
    newItems.push({
      id: `san-water-${timestamp}`,
      category: 'sanitary',
      name: pipeName,
      spec: `สำหรับ ${bathroomCount} ห้องน้ำ + ครัว + ซักล้าง (สั่งท่อ 4ม. รวม ${result.coldWaterPipePipes4m} ท่อน พร้อมข้องอ สามทาง ข้อต่อเกลียวทองเหลือง)`,
      quantity: result.coldWaterPipePipes4m,
      unit: 'ท่อน',
      materialUnitPrice: pipeTypeWater === 'ppr_green' ? 240 : pipeTypeWater === 'pvc_blue_13.5' ? 140 : 105,
      laborUnitPrice: 65,
      wastePercent: 5,
      basePerSqm: result.coldWaterPipePipes4m / (currentHouseAreaSqm || 120)
    });

    // 2. ท่อน้ำทิ้ง & ท่อโสโครก PVC
    newItems.push({
      id: `san-drain-${timestamp + 1}`,
      category: 'sanitary',
      name: 'ท่อน้ำทิ้ง 2"-3" & ท่อโสโครก 4" PVC ชั้น 8.5 ตราช้าง มอก.',
      spec: `ท่อน้ำทิ้ง ${result.wasteWaterPipes4m} ท่อน + ท่อส้วมโสโครก 4" ${result.soilPipes4m} ท่อน + ท่ออากาศ ${result.ventPipes4m} ท่อน พร้อมกาวประสานท่อและ Floor Drain`,
      quantity: result.wasteWaterPipes4m + result.soilPipes4m + result.ventPipes4m,
      unit: 'ท่อน',
      materialUnitPrice: 260,
      laborUnitPrice: 95,
      wastePercent: 5,
      basePerSqm: (result.wasteWaterPipes4m + result.soilPipes4m) / (currentHouseAreaSqm || 120)
    });

    // 3. ถังบำบัดน้ำเสียสำเร็จรูป
    newItems.push({
      id: `san-septic-${timestamp + 2}`,
      category: 'sanitary',
      name: `ถังบำบัดน้ำเสียสำเร็จรูปไร้อากาศ (Septic Tank) ขนาด ${septicTankLiters} ลิตร`,
      spec: 'ถังโพลีเอทิลีน มอก. พร้อมหัวเชื้อจุลินทรีย์ ขุดฝังดิน เทฐานราก คสล. รองก้นถังหนา 15 ซม.',
      quantity: 1,
      unit: 'ชุด',
      materialUnitPrice: septicTankLiters === 2000 ? 8900 : septicTankLiters === 1600 ? 7400 : 5800,
      laborUnitPrice: 2500,
      wastePercent: 0,
      basePerSqm: 1 / (currentHouseAreaSqm || 120)
    });

    // 4. ถังดักไขมันใต้ซิงค์ครัว
    newItems.push({
      id: `san-grease-${timestamp + 3}`,
      category: 'sanitary',
      name: `ถังดักไขมันสำเร็จรูป (Grease Trap) ขนาด ${greaseTrapLiters} ลิตร`,
      spec: 'ติดตั้งใต้ซิงค์ล้างจานในห้องครัว ดักจับคราบไขมันเศษอาหารก่อนลงท่อสาธารณะ',
      quantity: result.greaseTrapQty,
      unit: 'ชุด',
      materialUnitPrice: greaseTrapLiters >= 50 ? 2800 : 1650,
      laborUnitPrice: 650,
      wastePercent: 0,
      basePerSqm: result.greaseTrapQty / (currentHouseAreaSqm || 120)
    });

    // 5. ปั๊มน้ำและถังเก็บน้ำบนดิน
    if (includeWaterPumpAndTank) {
      newItems.push({
        id: `san-tank-pump-${timestamp + 4}`,
        category: 'sanitary',
        name: `ถังเก็บน้ำบนดิน Antibac ${waterTankLiters} ลิตร + ปั๊มน้ำอัตโนมัติแรงดันคงที่ ${waterPumpWatt}W`,
        spec: 'ถังโพลีเมอร์เกรด มอก. สะอาดไร้ตะไคร่ + ปั๊มน้ำอินเวอร์เตอร์/แรงดันคงที่ พร้อมระบบบายพาส (Bypass) เช็ควาล์ว',
        quantity: 1,
        unit: 'ชุด',
        materialUnitPrice: (waterTankLiters === 2000 ? 7200 : 5900) + (waterPumpWatt >= 250 ? 6900 : 5400) + 1200,
        laborUnitPrice: 2500,
        wastePercent: 0,
        basePerSqm: 1 / (currentHouseAreaSqm || 120)
      });
    }

    onApplyToBOQ(newItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-2xl font-bold">plumbing</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                เครื่องคำนวณระบบสุขาภิบาล ท่อประปา PPR/PVC & ถังบำบัด
              </h2>
              <p className="text-xs text-slate-400">
                คำนวณจำนวนท่อน้ำดี ท่อน้ำทิ้ง ท่อส้วม ถังบำบัดน้ำเสีย ถังดักไขมัน และถังเก็บน้ำ+ปั๊มน้ำอัตโนมัติ
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Controls Column (6 cols) */}
          <div className="md:col-span-6 flex flex-col gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">tune</span> 1. กำหนดจำนวนห้องและระบบท่อ
            </span>

            {/* จำนวนห้องน้ำ ครัว ซักล้าง */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ห้องน้ำ (ห้อง)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={bathroomCount}
                  onChange={(e) => setBathroomCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ห้องครัว (ห้อง)</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={kitchenCount}
                  onChange={(e) => setKitchenCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ลานซักล้าง (จุด)</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={washingYardCount}
                  onChange={(e) => setWashingYardCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center"
                />
              </div>
            </div>

            {/* ชนิดท่อน้ำดี */}
            <div>
              <label className="text-[11px] text-slate-300 block mb-1 font-medium">ชนิดท่อจ่ายน้ำประปา (Cold Water Pipe):</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ppr_green', label: 'ท่อ PPR เขียว', sub: 'ไร้กาว ไม่รั่วซึม' },
                  { id: 'pvc_blue_13.5', label: 'PVC หนา 13.5', sub: 'ทนแรงดันสูง' },
                  { id: 'pvc_blue_8.5', label: 'PVC หนา 8.5', sub: 'มาตรฐานทั่วไป' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPipeTypeWater(p.id as any)}
                    className={`p-2 rounded-lg border text-center transition ${
                      pipeTypeWater === p.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs">{p.label}</div>
                    <div className="text-[9px] opacity-75">{p.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ขนาดถังบำบัดน้ำเสีย & ดักไขมัน */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ถังบำบัดน้ำเสีย (Septic):</label>
                <select
                  value={septicTankLiters}
                  onChange={(e) => setSepticTankLiters(parseInt(e.target.value) as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value={1000}>1,000 ลิตร (3-4 คน)</option>
                  <option value={1600}>1,600 ลิตร (5-7 คน - แนะนำ)</option>
                  <option value={2000}>2,000 ลิตร (8-10 คน)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">ถังดักไขมันใต้ซิงค์:</label>
                <select
                  value={greaseTrapLiters}
                  onChange={(e) => setGreaseTrapLiters(parseInt(e.target.value) as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value={15}>15 ลิตร (กะทัดรัด)</option>
                  <option value={30}>30 ลิตร (มาตรฐานครัวไทย)</option>
                  <option value={50}>50 ลิตร (ครัวหนัก)</option>
                </select>
              </div>
            </div>

            {/* สวิตช์ถังเก็บน้ำ & ปั๊มน้ำ */}
            <div className="pt-2 border-t border-slate-850 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-cyan-400">water_drop</span>
                  รวมถังเก็บน้ำบนดิน & ปั๊มน้ำแรงดันคงที่
                </span>
                <input
                  type="checkbox"
                  checked={includeWaterPumpAndTank}
                  onChange={(e) => setIncludeWaterPumpAndTank(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer rounded"
                />
              </div>

              {includeWaterPumpAndTank && (
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">ถังเก็บน้ำบนดิน:</label>
                    <select
                      value={waterTankLiters}
                      onChange={(e) => setWaterTankLiters(parseInt(e.target.value) as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value={1000}>1,000 ลิตร</option>
                      <option value={1500}>1,500 ลิตร (มาตรฐาน)</option>
                      <option value={2000}>2,000 ลิตร (หลังใหญ่)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">กำลังมอเตอร์ปั๊มน้ำ:</label>
                    <select
                      value={waterPumpWatt}
                      onChange={(e) => setWaterPumpWatt(parseInt(e.target.value) as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value={150}>150W (บ้าน 1 ชั้น 1-2 ห้องน้ำ)</option>
                      <option value={200}>200W (บ้าน 1-2 ชั้น)</option>
                      <option value={250}>250W (แรงดันคงที่สม่ำเสมอ)</option>
                      <option value={300}>300W (เรนชาวเวอร์พร้อมกัน)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Column (6 cols) */}
          <div className="md:col-span-6 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>สรุปรายการท่อและอุปกรณ์สั่งซื้อจริง</span>
              <span className="text-[10px] text-slate-400 font-mono">ท่อ PVC/PPR ยาว 4.0 ม./ท่อน</span>
            </span>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5 text-xs">
              
              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">ท่อน้ำดีประปา ({pipeTypeWater === 'ppr_green' ? 'PPR' : 'PVC'}):</span>
                  <span className="text-[10px] text-slate-400">ขนาด 1/2" - 3/4" ทนแรงดัน</span>
                </div>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {result.coldWaterPipePipes4m} ท่อน (ยาว 4ม.)
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">ท่อน้ำทิ้ง 2" (PVC ฟ้า 8.5):</span>
                  <span className="text-[10px] text-slate-400">จากอ่างล้างหน้า ฟลอร์เดรน ซิงค์ครัว</span>
                </div>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {result.wasteWaterPipes4m} ท่อน
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">ท่อโสโครก 4" (PVC ฟ้า 8.5):</span>
                  <span className="text-[10px] text-slate-400">จากโถสุขภัณฑ์ลงสู่ถังบำบัด</span>
                </div>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {result.soilPipes4m} ท่อน
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">ท่ออากาศระบายแก๊ส (Vent pipe 1-1/2"):</span>
                  <span className="text-[10px] text-slate-400">ป้องกันส้วมตันและระบายอากาศ</span>
                </div>
                <span className="font-mono font-bold text-slate-300 text-sm">
                  {result.ventPipes4m} ท่อน
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-850">
                <div>
                  <span className="font-semibold text-white block">ถังบำบัดน้ำเสีย & ถังดักไขมัน:</span>
                  <span className="text-[10px] text-slate-400">ถังบำบัด {septicTankLiters}L + ดักไขมัน {greaseTrapLiters}L</span>
                </div>
                <span className="font-mono font-bold text-emerald-300 text-sm">
                  ครบ 2 ชุด
                </span>
              </div>

              {includeWaterPumpAndTank && (
                <div className="flex justify-between items-center py-1 border-b border-slate-850 bg-cyan-950/20 px-2 rounded">
                  <div>
                    <span className="font-semibold text-cyan-300 block">ถังน้ำบนดิน + ปั๊มน้ำอัตโนมัติ:</span>
                    <span className="text-[10px] text-slate-400">ถัง {waterTankLiters}L + ปั๊ม {waterPumpWatt}W</span>
                  </div>
                  <span className="font-mono font-bold text-cyan-200 text-sm">
                    1 ชุดระบบ
                  </span>
                </div>
              )}

              {/* สรุปงบประมาณรวม */}
              <div className="mt-2 p-3 rounded-lg bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border border-cyan-500/30 flex justify-between items-center">
                <div>
                  <span className="text-[11px] text-cyan-300 font-bold block">งบรวมงานระบบสุขาภิบาลและประปา</span>
                  <span className="text-[10px] text-slate-400">
                    ค่าวัสดุ ฿{result.totalMaterialCost.toLocaleString()} | ค่าแรงช่าง ฿{result.totalLaborCost.toLocaleString()}
                  </span>
                </div>
                <span className="text-base font-black font-mono text-cyan-400">
                  ฿{(result.totalMaterialCost + result.totalLaborCost).toLocaleString()}
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
          <p className="text-xs text-slate-400">
            ระบบจะอัปเดตท่อน้ำดี PPR/PVC ท่อน้ำทิ้ง ถังบำบัด และปั๊มน้ำเข้าหมวดงานสุขาภิบาลในตาราง BOQ ทันที
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">add_task</span>
              นำเข้าตาราง BOQ ทันที
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
