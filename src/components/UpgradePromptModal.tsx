import React, { useState } from 'react';
import { LicenseTier, validatePasscodeOrKey, saveSession } from '../services/authService';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  onUnlocked: (tier: LicenseTier, label: string) => void;
  salesPageUrl?: string;
}

export const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  featureName,
  onUnlocked,
  salesPageUrl = 'https://kanpisek111-kpn.github.io/construction-boq-salespage/'
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่านหรือ License Key');
      return;
    }

    const res = validatePasscodeOrKey(keyInput.trim());
    if (res.valid) {
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
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-prompt font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
            โหมดทดลองใช้ฟรี (Demo)
          </span>
          <h3 className="text-lg font-bold font-prompt text-white mt-2">
            ฟังก์ชัน "{featureName}"
          </h3>
          <p className="text-xs text-slate-400 font-sarabun mt-1">
            สงวนสิทธิ์การใช้งานสำหรับผู้ถือสิทธิ์แพ็กเกจ Pro และ Enterprise
          </p>
        </div>

        {/* Value Proposition */}
        <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 mb-4 text-xs font-sarabun text-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-prompt font-bold text-amber-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">stars</span>
              <span>อัปเกรดเป็น Pro Lifetime:</span>
            </span>
            <span className="font-prompt font-extrabold text-white bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30 text-xs">
              ฿790 (ตลอดชีพ)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>ออกเอกสารใบเสนอราคา (Quotation PDF) และ Export Excel / CSV</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>ปลดล็อกระบบบริหารงวดงานและเครื่องคิดเลขเจาะลึก 11 หมวดงาน</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>สร้างและบันทึกโครงการได้ไม่จำกัดตลอดอายุการใช้งาน</span>
          </div>
          <div className="pt-1.5 border-t border-slate-700/60 text-[11px] text-amber-300 font-prompt">
            🎁 รับฟรี! เทมเพลตสัญญาช่าง + ตารางราคากลาง 2026 (มูลค่า 4,500.-)
          </div>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-3 mb-4">
          <div>
            <label className="block text-[11px] font-prompt font-medium text-slate-300 mb-1">
              มีรหัสผ่านหรือ License Key แล้ว? กรอกที่นี่:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="PRO-xxxx-xxxx หรือรหัสผ่าน"
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
            <span>⚡ สั่งซื้อสิทธิ์ Pro ฿790 & รับโบนัสทันที</span>
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
          <a
            href="https://line.me/R/ti/p/@003iwzqt"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#06C755]/20 hover:bg-[#06C755]/30 border border-[#06C755]/40 text-[#06C755] hover:text-white font-prompt font-semibold text-xs transition"
          >
            <span>💬 สั่งซื้อหรือแจ้งโอนผ่าน LINE (@003iwzqt)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
