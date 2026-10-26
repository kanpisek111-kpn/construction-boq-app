import React, { useState } from 'react';
import { LicenseTier, validatePasscodeOrKey, saveSession, generateRandomLicenseKey, getStoredGeneratedKeys } from '../services/authService';

interface AccessLockModalProps {
  isOpen: boolean;
  onSuccess: (tier: LicenseTier, label: string) => void;
  onEnterDemo: () => void;
  initialMessage?: string;
  allowClose?: boolean;
  onClose?: () => void;
  salesPageUrl?: string;
}

export const AccessLockModal: React.FC<AccessLockModalProps> = ({
  isOpen,
  onSuccess,
  onEnterDemo,
  initialMessage,
  allowClose = false,
  onClose,
  salesPageUrl = 'https://kanpisek111-kpn.github.io/construction-boq-salespage/'
}) => {
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่านหรือ License Key');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    setTimeout(() => {
      const result = validatePasscodeOrKey(passcode.trim());
      if (result.valid) {
        saveSession({
          tier: result.tier,
          keyOrPass: passcode.trim(),
          activatedAt: new Date().toISOString(),
          userLabel: result.label
        });
        onSuccess(result.tier, result.label);
        setPasscode('');
        if (onClose) onClose();
      } else {
        setErrorMsg('❌ รหัสผ่านหรือ License Key ไม่ถูกต้อง กรุณาตรวจสอบใหม่อีกครั้ง');
      }
      setIsSubmitting(false);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 text-slate-100">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-amber-500/10 blur-2xl pointer-events-none rounded-full"></div>

        {/* Close button if allowed */}
        {allowClose && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}

        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 mb-4">
            <span className="material-symbols-outlined text-3xl font-bold">lock</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-prompt text-white">
            ระบบตรวจสอบสิทธิ์การเข้าใช้งาน
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sarabun">
            Construction BOQ Calculator & Project Milestone Platform
          </p>
          {initialMessage && (
            <div className="mt-3 py-2 px-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-sarabun">
              {initialMessage}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-prompt">
              รหัสผ่าน (Passcode) หรือ License Key
            </label>
            <div className="relative">
              <input
                type="text"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="เช่น OWNER-BOQ-2026 หรือ PRO-xxxx-xxxx"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                autoFocus
              />
              <span className="absolute right-3 top-3 text-slate-500 material-symbols-outlined text-lg">
                key
              </span>
            </div>
            {errorMsg && (
              <p className="text-red-400 text-xs mt-1.5 font-sarabun">{errorMsg}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-prompt py-3 px-4 rounded-xl shadow-md transition transform active:scale-[0.98] flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span className="material-symbols-outlined text-lg">lock_open</span>
            <span>{isSubmitting ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัสผ่านเพื่อเข้าใช้งาน'}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative bg-slate-900 px-3 text-[11px] text-slate-500 font-prompt">
            หรือเลือกตัวเลือกด้านล่าง
          </span>
        </div>

        {/* Actions for Demo and Buy */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onEnterDemo}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-prompt text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base text-cyan-400">visibility</span>
            <span>ทดลองใช้งานแบบเดโม่ฟรี (จำกัดฟังก์ชัน)</span>
          </button>

          <a
            href={salesPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-prompt text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 text-center"
          >
            <span className="material-symbols-outlined text-base">shopping_cart</span>
            <span>ยังไม่มีรหัส? สั่งซื้อสิทธิ์แพ็กเกจ (คลิกที่นี่)</span>
          </a>
        </div>

        {/* Footer Hint */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500 font-sarabun">
          🔒 ระบบจะบันทึกสถานะการล็อกอินในอุปกรณ์นี้อัตโนมัติ ไม่ต้องกรอกซ้ำทุกครั้ง
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// OWNER KEY GENERATOR & MANAGEMENT MODAL
// =====================================================================
interface OwnerKeyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OwnerKeyManagerModal: React.FC<OwnerKeyManagerModalProps> = ({ isOpen, onClose }) => {
  const [selectedTier, setSelectedTier] = useState<'pro' | 'enterprise'>('pro');
  const [createdKey, setCreatedKey] = useState<string>('');
  const [copyToast, setCopyToast] = useState(false);
  const [keyList, setKeyList] = useState(getStoredGeneratedKeys());

  if (!isOpen) return null;

  const handleGenerate = () => {
    const key = generateRandomLicenseKey(selectedTier);
    setCreatedKey(key);
    setKeyList(getStoredGeneratedKeys());
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-2xl p-6 text-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            👑
          </div>
          <div>
            <h3 className="font-prompt font-bold text-lg text-white">ระบบจัดการ License Key สำหรับเจ้าของ</h3>
            <p className="text-xs text-amber-400">สร้างรหัสผ่านส่งให้ลูกค้าที่ชำระเงินเรียบร้อยแล้ว</p>
          </div>
        </div>

        {/* Generator Controls */}
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 mb-5 space-y-3">
          <label className="block text-xs font-prompt font-semibold text-slate-300">
            เลือกประเภทแพ็กเกจที่ต้องการสร้าง:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedTier('pro')}
              className={`py-2 px-3 rounded-lg text-xs font-prompt font-semibold border transition ${
                selectedTier === 'pro'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-650'
              }`}
            >
              ⭐ สมาชิกแพ็กเกจ Pro
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier('enterprise')}
              className={`py-2 px-3 rounded-lg text-xs font-prompt font-semibold border transition ${
                selectedTier === 'enterprise'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-650'
              }`}
            >
              🏢 แพ็กเกจ Enterprise
            </button>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-prompt font-bold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>กดสร้าง License Key ทันที</span>
          </button>

          {createdKey && (
            <div className="mt-3 p-3 bg-slate-900 border-2 border-emerald-500/80 rounded-xl text-center">
              <span className="text-[11px] text-emerald-400 block font-prompt mb-1">
                สร้าง License Key สำเร็จ! คัดลอกส่งให้ลูกค้าได้เลย:
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono font-bold text-lg text-white selection:bg-amber-500">
                  {createdKey}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(createdKey)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-prompt flex items-center gap-1 transition"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  <span>{copyToast ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* History / Stored Keys */}
        <div>
          <h4 className="text-xs font-prompt font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>ประวัติ License Key ที่เคยสร้างในเครื่องนี้ ({keyList.length})</span>
          </h4>
          <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono">
            {keyList.length === 0 ? (
              <div className="text-slate-500 text-center py-4 font-sarabun">ยังไม่มีประวัติการสร้าง Key</div>
            ) : (
              keyList.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded border border-slate-700/60">
                  <div>
                    <span className="text-white font-bold">{item.key}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 uppercase">
                      {item.tier}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(item.key)}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-prompt"
                  >
                    คัดลอก
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
