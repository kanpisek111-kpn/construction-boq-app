import React, { useState } from 'react';
import { LicenseTier, validatePasscodeOrKey, saveSession } from '../services/authService';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  currentTier?: LicenseTier;
  onUnlocked: (tier: LicenseTier, label: string) => void;
  salesPageUrl?: string;
}

export const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  featureName,
  currentTier = 'demo',
  onUnlocked,
  salesPageUrl = 'https://kanpisek111-kpn.github.io/construction-boq-salespage/'
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isStarterUser = currentTier === 'starter';
  const isProUser = currentTier === 'pro';

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่านหรือ License Key');
      return;
    }

    const res = validatePasscodeOrKey(keyInput.trim());
    if (res.valid) {
      if (isProUser && res.tier === 'pro') {
        setErrorMsg('⚠️ คุณเปิดใช้งานแพ็กเกจ Pro อยู่แล้ว ฟังก์ชันนี้ต้องใช้รหัส VIP (VIP-xxxx-xxxx) หรือรหัสเจ้าของระบบ');
        return;
      }
      if (isStarterUser && res.tier === 'starter') {
        setErrorMsg('⚠️ คุณเปิดใช้งานแพ็กเกจ Starter อยู่แล้ว ฟังก์ชันนี้ต้องใช้รหัส Pro หรือ VIP');
        return;
      }

      saveSession({
        tier: res.tier,
        keyOrPass: keyInput.trim(),
        activatedAt: new Date().toISOString(),
        userLabel: res.label
      });
      onUnlocked(res.tier, res.label);
      onClose();
    } else {
      setErrorMsg('❌ รหัสผ่านหรือ License Key ไม่ถูกต้อง');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-2xl p-6 text-slate-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-3xl">
              {isProUser ? 'workspace_premium' : isStarterUser ? 'stars' : 'lock'}
            </span>
          </div>
          
          {isProUser ? (
            <span className="px-3 py-1 rounded-full text-xs font-prompt font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
              ⭐ สมาชิกแพ็กเกจ Pro Contractor (ปัจจุบัน)
            </span>
          ) : isStarterUser ? (
            <span className="px-3 py-1 rounded-full text-xs font-prompt font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              🟢 สมาชิกแพ็กเกจ Starter (ปัจจุบัน)
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-prompt font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              โหมดทดลองใช้ฟรี (Demo)
            </span>
          )}

          <h3 className="text-lg font-bold font-prompt text-white mt-2">
            ฟังก์ชัน "{featureName}"
          </h3>
          <p className="text-xs text-slate-400 font-sarabun mt-1">
            {isProUser
              ? 'สงวนสิทธิ์สำหรับแพ็กเกจ VIP Corporate (ปลดล็อก AI และคุมต้นทุนจริงเต็ม 100%)'
              : isStarterUser
              ? 'สงวนสิทธิ์สำหรับผู้ถือสิทธิ์แพ็กเกจ Pro Contractor และ VIP Corporate'
              : 'สงวนสิทธิ์สำหรับผู้ถือสิทธิ์แพ็กเกจ Starter, Pro หรือ VIP Corporate'}
          </p>
        </div>

        {/* Value Proposition depending on Tier */}
        {isProUser ? (
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-indigo-500/40 mb-4 text-xs font-sarabun text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-prompt font-bold text-indigo-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                <span>อัปเกรดเป็น VIP Corporate:</span>
              </span>
              <span className="font-prompt font-extrabold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-400/30 text-xs">
                ฿2,990 (ตลอดชีพ)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>📸 <strong>AI สแกนแปลนบ้าน</strong> (Gemini AI Takeoff วิเคราะห์แบบภาพถ่าย)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>🤖 <strong>AI ตรวจสอบความถูกต้อง BOQ</strong> ตามมาตรฐาน วสท.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>📊 <strong>ระบบคุมต้นทุนจริง & กำไรหน้างาน</strong> (Actual Cost Tracker)</span>
            </div>
            <div className="pt-1.5 border-t border-slate-700/60 text-[11px] text-indigo-300 font-prompt">
              💡 สมาชิก Pro ทัก LINE เพื่อชำระส่วนต่างอัปเกรดเพียง ฿1,500
            </div>
          </div>
        ) : isStarterUser ? (
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-amber-500/40 mb-4 text-xs font-sarabun text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-prompt font-bold text-amber-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">stars</span>
                <span>อัปเกรดเป็น Pro Contractor:</span>
              </span>
              <span className="font-prompt font-extrabold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30 text-xs">
                ฿1,490 (ตลอดชีพ)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">✓</span>
              <span><strong>Dashboard หลายโครงการ (Multi-Projects)</strong> บันทึกไม่จำกัด</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">✓</span>
              <span><strong>ระบบสั่งซื้อวัสดุหน้างาน (Jobsite PO)</strong> รวมยอดตัดของเข้าไซต์</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">✓</span>
              <span><strong>แผนงานก่อสร้าง Gantt Chart</strong> ควบคุมระยะเวลาและส่งมอบ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">✓</span>
              <span><strong>สำรอง / เปิดไฟล์โครงการ (.json)</strong> และใส่โลโก้ชื่อบริษัทตัวเอง</span>
            </div>
            <div className="pt-1.5 border-t border-slate-700/60 text-[11px] text-amber-300 font-prompt">
              💡 สมาชิก Starter ชำระส่วนต่างอัปเกรดเป็น Pro เพียง ฿600
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 mb-4 text-xs font-sarabun text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-prompt font-bold text-emerald-400 flex items-center gap-1.5">
                <span>🟢 Starter:</span>
              </span>
              <span className="font-prompt font-extrabold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/30 text-xs">
                ฿890 ตลอดชีพ
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-prompt font-bold text-amber-400 flex items-center gap-1.5">
                <span>⭐ Pro Contractor (ยอดนิยม):</span>
              </span>
              <span className="font-prompt font-extrabold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30 text-xs">
                ฿1,490 ตลอดชีพ
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-prompt font-bold text-indigo-400 flex items-center gap-1.5">
                <span>💎 VIP Corporate (ครบ 100%):</span>
              </span>
              <span className="font-prompt font-extrabold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-400/30 text-xs">
                ฿2,990 ตลอดชีพ
              </span>
            </div>
          </div>
        )}

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-3 mb-4">
          <div>
            <label className="block text-[11px] font-prompt font-medium text-slate-300 mb-1">
              มีรหัส License Key แล้ว? กรอกที่นี่:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="PRO-xxxx-xxxx หรือ VIP-xxxx-xxxx"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-prompt font-bold text-xs px-3.5 py-2 rounded-lg transition"
              >
                ปลดล็อก
              </button>
            </div>
            {errorMsg && <p className="text-red-400 text-[11px] mt-1">{errorMsg}</p>}
          </div>
        </form>

        {/* CTA to Sales Page */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <a
            href={salesPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-prompt font-bold text-xs shadow-md transition"
          >
            <span>ดูรายละเอียดแพ็กเกจ & โปรโมชั่นบนหน้าเว็บ</span>
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
          <a
            href="https://line.me/R/ti/p/@003iwzqt"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#06C755]/20 hover:bg-[#06C755]/30 border border-[#06C755]/40 text-[#06C755] hover:text-white font-prompt font-semibold text-xs transition"
          >
            <span>💬 สั่งซื้อ / ขออัปเกรดผ่าน LINE (@003iwzqt)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
