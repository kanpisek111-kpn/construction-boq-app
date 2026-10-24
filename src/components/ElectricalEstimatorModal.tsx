import React, { useState, useMemo } from 'react';
import { ElectricalCircuitConfig, BOQItem, WireCrossSection, WireType } from '../types';
import { getDefaultElectricalCircuits, WIRE_PRICE_STANDARDS } from '../constants';
import { calculateElectricalSystem } from '../services/calculator';

interface ElectricalEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToBOQ: (newItems: BOQItem[]) => void;
  currentHouseAreaSqm: number;
}

export const ElectricalEstimatorModal: React.FC<ElectricalEstimatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToBOQ,
  currentHouseAreaSqm
}) => {
  const [circuits, setCircuits] = useState<ElectricalCircuitConfig[]>(() => 
    getDefaultElectricalCircuits(currentHouseAreaSqm || 120)
  );
  const [activeTab, setActiveTab] = useState<'circuits' | 'wire_summary' | 'panel_standard'>('circuits');

  // คำนวณผลลัพธ์ระบบสายไฟและอุปกรณ์
  const result = useMemo(() => {
    return calculateElectricalSystem(circuits);
  }, [circuits]);

  if (!isOpen) return null;

  // ปรับแก้จำนวนจุดหรือระยะทาง
  const handleUpdateCircuit = (id: string, updated: Partial<ElectricalCircuitConfig>) => {
    setCircuits(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  };

  const handleAddCircuit = () => {
    const newCir: ElectricalCircuitConfig = {
      id: `cir-custom-${Date.now()}`,
      circuitType: 'receptacle',
      name: 'วงจรเต้ารับไฟฟ้าเพิ่มเติม (Custom Circuit)',
      pointsCount: 4,
      avgDistanceM: 15,
      wireType: 'THW',
      phaseWiresSize: '2.5',
      groundWireSize: '2.5',
      conduitType: 'pvc_white',
      breakerRatingA: 16,
      notes: 'ร้อยท่อ PVC ขาว 16 มม.'
    };
    setCircuits(prev => [...prev, newCir]);
  };

  const handleDeleteCircuit = (id: string) => {
    setCircuits(prev => prev.filter(c => c.id !== id));
  };

  // นำผลลัพธ์สายไฟและอุปกรณ์ระบบไฟฟ้าเข้าสู่ BOQ
  const handleApply = () => {
    const timestamp = Date.now();
    const newItems: BOQItem[] = [];

    // 1. ตู้คอนซูเมอร์ยูนิตและเบรกเกอร์
    newItems.push({
      id: `elec-gen-panel-${timestamp}`,
      category: 'electrical',
      name: `ตู้คอนซูเมอร์ยูนิต ${result.panelSummary.recommendedSlots} ช่อง เมน ${result.panelSummary.mainBreakerAmp}A พร้อมลูกย่อย & RCBO กันดูด`,
      spec: `เมน 2P ${result.panelSummary.mainBreakerAmp}A + ลูกเบรกเกอร์ ${circuits.length} วงจร + RCBO สำหรับน้ำอุ่น ${result.panelSummary.rcboCount} ตัว + แท่งกราวด์ 5/8" x 2.4 ม.`,
      quantity: 1,
      unit: 'ชุด',
      materialUnitPrice: 3800 + (result.panelSummary.recommendedSlots * 190) + (result.panelSummary.rcboCount * 650),
      laborUnitPrice: 2500,
      wastePercent: 0,
      basePerSqm: 1 / (currentHouseAreaSqm || 120)
    });

    // 2. สายไฟแต่ละขนาดตามมาตรฐาน วสท. (1.5, 2.5, 4, 6, 10, 16 sq.mm.)
    result.wireSummary.forEach((w, idx) => {
      newItems.push({
        id: `elec-gen-wire-${w.wireSize}-${timestamp + idx + 1}`,
        category: 'electrical',
        name: `สายไฟทองแดง ${w.wireType} ขนาด ${w.wireSize} sq.mm. (${w.standardPurpose.split(',')[0]})`,
        spec: `มาตรฐาน มอก. 11-2553 รวมระยะ ${w.totalOrderM} ม. (~สั่ง ${w.coils100m} ขด ม้วนละ 100ม. เผื่อ ${w.wastePercent}%) ${w.standardPurpose}`,
        quantity: w.totalOrderM,
        unit: 'ม.',
        materialUnitPrice: w.estPricePerM,
        laborUnitPrice: w.wireSize === '1.5' ? 6.5 : w.wireSize === '2.5' ? 7.5 : w.wireSize === '4' ? 9.5 : w.wireSize === '6' ? 12 : 16,
        wastePercent: w.wastePercent,
        basePerSqm: w.totalOrderM / (currentHouseAreaSqm || 120)
      });
    });

    // 3. ท่อร้อยสายไฟ uPVC ขาว
    if (result.conduitSummary.conduitPipes3m > 0) {
      newItems.push({
        id: `elec-gen-conduit-${timestamp + 10}`,
        category: 'electrical',
        name: `ท่อร้อยสายไฟ uPVC สีขาว Ø 16-20 มม. (ดัดเย็น ไม่ลามไฟ มอก. 216-2524)`,
        spec: `ความยาวรวม ${result.conduitSummary.totalLengthM} ม. (~สั่ง ${result.conduitSummary.conduitPipes3m} ท่อน ยาว 2.92ม.) พร้อมกล่องพักสาย ${result.conduitSummary.fittingJunctionBoxes} จุด`,
        quantity: result.conduitSummary.conduitPipes3m,
        unit: 'ท่อน',
        materialUnitPrice: 48,
        laborUnitPrice: 35,
        wastePercent: 5,
        basePerSqm: result.conduitSummary.conduitPipes3m / (currentHouseAreaSqm || 120)
      });
    }

    onApplyToBOQ(newItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-md">
              <span className="material-symbols-outlined text-2xl font-bold">bolt</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                เครื่องคำนวณสายไฟและวงจรไฟฟ้าตามมาตรฐาน วสท. & การไฟฟ้า
              </h2>
              <p className="text-xs text-slate-400">
                คำนวณขนาดสายไฟ (1.5, 2.5, 4, 6, 10, 16 ตร.มม.) จำนวนขด (100ม.) ท่อร้อยสาย uPVC และตู้คอนซูเมอร์ยูนิต
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

        {/* Top Summary Banner */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">สายไฟรวมทุกขนาด</span>
            <span className="text-base font-bold font-mono text-amber-400">
              {result.wireSummary.reduce((a, b) => a + b.totalOrderM, 0).toLocaleString()} ม.
            </span>
            <span className="text-[10px] text-slate-500 block">
              (~{result.wireSummary.reduce((a, b) => a + b.coils100m, 0)} ขด ม้วนละ 100ม.)
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">ท่อร้อยสาย uPVC ขาว</span>
            <span className="text-base font-bold font-mono text-cyan-400">
              {result.conduitSummary.conduitPipes3m} ท่อน
            </span>
            <span className="text-[10px] text-slate-500 block">
              ({result.conduitSummary.totalLengthM} เมตร)
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">ตู้คอนซูเมอร์แนะนำ</span>
            <span className="text-base font-bold font-mono text-emerald-400">
              {result.panelSummary.recommendedSlots} ช่อง ({result.panelSummary.mainBreakerAmp}A)
            </span>
            <span className="text-[10px] text-slate-500 block">
              RCBO กันดูด {result.panelSummary.rcboCount} ตัว
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30">
            <span className="text-[10px] text-amber-300 font-bold block">งบค่าสายและอุปกรณ์</span>
            <span className="text-base font-black font-mono text-amber-400">
              ฿{(result.totalMaterialCost + result.totalLaborCost).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              (ของ ฿{result.totalMaterialCost.toLocaleString()} | แรง ฿{result.totalLaborCost.toLocaleString()})
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('circuits')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'circuits' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              <span>1. รายการวงจรย่อยในบ้าน ({circuits.length} วงจร)</span>
            </button>
            <button
              onClick={() => setActiveTab('wire_summary')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'wire_summary' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">cable</span>
              <span>2. สรุปความยาวสายไฟและจำนวนขด</span>
            </button>
            <button
              onClick={() => setActiveTab('panel_standard')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'panel_standard' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span>3. ตารางมาตรฐานขนาดสายไฟ วสท.</span>
            </button>
          </div>
          <button
            onClick={handleAddCircuit}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/40 text-xs font-semibold flex items-center gap-1 transition"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>เพิ่มวงจรย่อย</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: วงจรย่อยในบ้าน (Circuits Config) */}
          {activeTab === 'circuits' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>ปรับตั้งจำนวนจุดติดตั้งและระยะเดินสายเฉลี่ย ระบบจะคำนวณความยาวสายไฟ THW/VAF และขนาดท่อให้ทันที:</span>
                <span className="text-[11px] font-mono text-amber-400 font-semibold">* 1 เฟส เดินสาย Line + Neutral (x2) พร้อมสายดิน Ground</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {circuits.map((cir, idx) => {
                  const runDistanceM = cir.pointsCount * cir.avgDistanceM;
                  const totalPhaseWireM = runDistanceM * 2;
                  const wireSpec = WIRE_PRICE_STANDARDS[cir.phaseWiresSize];

                  return (
                    <div 
                      key={cir.id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                    >
                      {/* Left info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-slate-500 text-[11px]">#{idx + 1}</span>
                          <span className="font-bold text-white text-sm">{cir.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 font-mono">
                            สาย {cir.wireType} {cir.phaseWiresSize} sq.mm.
                          </span>
                          {cir.groundWireSize && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                              กราวด์ G {cir.groundWireSize} sq.mm.
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                            เบรกเกอร์ {cir.breakerRatingA}A
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{cir.notes}</p>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                          มาตรฐาน วสท.: พิกัดกระแสปลอดภัย {wireSpec?.nominalAmps}A • ใช้เบรกเกอร์สูงสุดไม่เกิน {wireSpec?.recommendedBreaker}A
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        {/* จำนวนจุด */}
                        <div className="flex flex-col items-center bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400">จำนวนจุด</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={cir.pointsCount}
                              onChange={(e) => handleUpdateCircuit(cir.id, { pointsCount: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-12 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500">จุด</span>
                          </div>
                        </div>

                        {/* ระยะเฉลี่ยต่อจุด */}
                        <div className="flex flex-col items-center bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400">ระยะเดินสาย/จุด</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              step="0.5"
                              value={cir.avgDistanceM}
                              onChange={(e) => handleUpdateCircuit(cir.id, { avgDistanceM: Math.max(1, parseFloat(e.target.value) || 1) })}
                              className="w-12 bg-transparent text-center font-mono font-bold text-amber-400 text-xs focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500">ม.</span>
                          </div>
                        </div>

                        {/* ขนาดสายไฟ */}
                        <div className="flex flex-col items-center bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400">ขนาดสาย (ตร.มม.)</span>
                          <select
                            value={cir.phaseWiresSize}
                            onChange={(e) => handleUpdateCircuit(cir.id, { phaseWiresSize: e.target.value as WireCrossSection })}
                            className="bg-transparent text-white font-mono font-bold text-xs focus:outline-none mt-0.5"
                          >
                            <option value="1.5">1.5 sq.mm.</option>
                            <option value="2.5">2.5 sq.mm.</option>
                            <option value="4">4 sq.mm.</option>
                            <option value="6">6 sq.mm.</option>
                            <option value="10">10 sq.mm.</option>
                            <option value="16">16 sq.mm.</option>
                            <option value="25">25 sq.mm.</option>
                            <option value="35">35 sq.mm.</option>
                          </select>
                        </div>

                        {/* ความยาวสายรวม */}
                        <div className="text-right pl-2 font-mono">
                          <span className="text-xs font-bold text-cyan-300 block">
                            ~{totalPhaseWireM} ม. (L+N)
                          </span>
                          {cir.groundWireSize && (
                            <span className="text-[10px] text-emerald-400 block">
                              + G {runDistanceM} ม.
                            </span>
                          )}
                        </div>

                        {/* ปุ่มลบ */}
                        {circuits.length > 1 && (
                          <button
                            onClick={() => handleDeleteCircuit(cir.id)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                            title="ลบวงจรนี้"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: สรุปความยาวสายไฟและจำนวนขด (Wire Summary) */}
          {activeTab === 'wire_summary' && (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                <span>
                  💡 <strong>มาตรฐานสั่งซื้อสายไฟ:</strong> สายไฟแกนเดี่ยว THW และ VAF ขายยกขด (ม้วนละ 100 เมตร) โดยระบบคำนวณเผื่อเลี้ยวหักมุม 10% ให้เรียบร้อย
                </span>
                <span className="font-mono font-bold">1 ขด = 100 เมตร</span>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] text-slate-400 uppercase font-mono">
                      <th className="py-2.5 px-3">ขนาดสายไฟ</th>
                      <th className="py-2.5 px-3">ชนิดสาย</th>
                      <th className="py-2.5 px-3 text-right">ความยาวสุทธิ</th>
                      <th className="py-2.5 px-3 text-center">เผื่อเศษ%</th>
                      <th className="py-2.5 px-3 text-right font-bold text-amber-400">สั่งจริง (ม.)</th>
                      <th className="py-2.5 px-3 text-center font-bold text-cyan-300">จำนวนขด (100ม.)</th>
                      <th className="py-2.5 px-3 text-right">ราคา/เมตร</th>
                      <th className="py-2.5 px-3 text-right font-bold text-white">งบรวม (฿)</th>
                      <th className="py-2.5 px-3 min-w-[200px]">วัตถุประสงค์ตามมาตรฐาน วสท.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {result.wireSummary.map((w, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-white">
                          {w.wireSize} sq.mm.
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                            {w.wireType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {w.totalLengthM.toLocaleString()} ม.
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-amber-400">
                          +{w.wastePercent}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-amber-300 text-sm">
                          {w.totalOrderM.toLocaleString()} ม.
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-cyan-300">
                          <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                            {w.coils100m} ขด
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          ฿{w.estPricePerM.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                          ฿{w.totalCost.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">
                          {w.standardPurpose}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ท่อร้อยสายไฟและตู้ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-cyan-400">hardware</span>
                    อุปกรณ์ท่อร้อยสายไฟ uPVC
                  </span>
                  <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-slate-850">
                    <span>ท่อ uPVC ขาว 16-20 มม. (ยาว 2.92 ม./ท่อน):</span>
                    <strong className="font-mono text-cyan-300">{result.conduitSummary.conduitPipes3m} ท่อน</strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-slate-850">
                    <span>กล่องพักสาย Handy / Square box:</span>
                    <strong className="font-mono text-white">{result.conduitSummary.fittingJunctionBoxes} จุด</strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 pt-1">
                    <span>ประมาณการงบท่อและอุปกรณ์:</span>
                    <strong className="font-mono text-amber-400">฿{result.conduitSummary.estCost.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-emerald-400">electrical_services</span>
                    ตู้คอนซูเมอร์ยูนิตและเบรกเกอร์
                  </span>
                  <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-slate-850">
                    <span>ตู้คอนซูเมอร์ที่แนะนำ:</span>
                    <strong className="font-mono text-emerald-300">{result.panelSummary.recommendedSlots} ช่อง (เมน {result.panelSummary.mainBreakerAmp}A)</strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-slate-850">
                    <span>ตัวตัดไฟดูด RCBO สำหรับจุดเปียกชื้น:</span>
                    <strong className="font-mono text-amber-400">{result.panelSummary.rcboCount} ตัว (ห้องน้ำ/น้ำอุ่น)</strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300 pt-1">
                    <span>แท่งหลักดินทองแดง (Ground Rod):</span>
                    <strong className="font-mono text-white">5/8" x 2.40 ม. (มอก.)</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ตารางมาตรฐานขนาดสายไฟ วสท. (Reference Table) */}
          {activeTab === 'panel_standard' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 leading-relaxed">
                <h4 className="font-bold text-amber-400 text-sm mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">verified</span>
                  ตารางเทียบขนาดสายไฟ พิกัดกระแส และขนาดเบรกเกอร์ตามมาตรฐาน วสท. (EIT Standard)
                </h4>
                <p className="text-[11px] text-slate-400">
                  สายไฟทุกเส้นต้องได้รับมาตรฐาน มอก. 11-2553 และทนแรงดันได้ 450/750V เพื่อความปลอดภัยจากไฟไหม้และไฟรั่ว
                </p>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900 text-[11px] text-slate-400 uppercase font-mono">
                      <th className="py-2.5 px-3">ขนาดสายไฟ (sq.mm.)</th>
                      <th className="py-2.5 px-3 text-center">พิกัดกระแสท่อร้อยสาย</th>
                      <th className="py-2.5 px-3 text-center font-bold text-amber-400">เบรกเกอร์สูงสุด (A)</th>
                      <th className="py-2.5 px-3">การใช้งานที่ถูกต้องตามมาตรฐาน</th>
                      <th className="py-2.5 px-3 text-right">ราคาเฉลี่ย (บาท/ม.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {Object.entries(WIRE_PRICE_STANDARDS).map(([size, info]) => (
                      <tr key={size} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-white text-sm">
                          {size} sq.mm.
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-cyan-300">
                          {info.nominalAmps} A
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300">
                          {info.recommendedBreaker} A
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {info.purposeTh}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          THW ~฿{info.thwPricePerM} / VAF ~฿{info.vafPricePerM}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-slate-400">
            ระบบคำนวณแยกขนาดสายไฟและจำนวนขด 100ม. อัตโนมัติ พร้อมนำเข้าหมวดงานระบบไฟฟ้าในตาราง BOQ ทันที
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">playlist_add</span>
              นำผลคำนวณสายไฟเข้า BOQ ทันที
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
