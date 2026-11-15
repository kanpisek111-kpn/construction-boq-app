import React, { useState } from 'react';
import { 
  LicenseTier, 
  validatePasscodeOrKey, 
  saveSession, 
  generateChecksumLicenseKey, 
  getStoredGeneratedKeys,
  PRESET_DEMO_KEYS,
  getStoredRevokedKeys,
  revokeKey,
  unrevokeKey,
  isKeyRevoked,
  validateAndEnforceDeviceQuota,
  resetKeyDevices,
  getKeyBinding,
  getLocalDeviceBindings
} from '../services/authService';

interface AccessLockModalProps {
  isOpen: boolean;
  onSuccess: (tier: LicenseTier, label: string, keyOrPass?: string) => void;
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPass = passcode.trim();
    if (!cleanPass) {
      setErrorMsg('กรุณากรอกรหัสผ่านหรือ License Key');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const result = validatePasscodeOrKey(cleanPass);
      if (result.valid) {
        // Enforce Device Quota (1 PC + 1 Mobile per key, Owner exempt)
        const deviceCheck = await validateAndEnforceDeviceQuota(cleanPass, result.tier);
        if (!deviceCheck.allowed) {
          setErrorMsg(
            deviceCheck.errorMessage || 
            '❌ สิทธิ์อุปกรณ์เกินกำหนด (อนุญาต 1 คอมพิวเตอร์ + 1 โทรศัพท์มือถือ) หากต้องการใช้งานเพิ่ม กรุณาสั่งซื้อแพ็กเกจใหม่ ติดต่อ LINE: @003iwzqt'
          );
          setIsSubmitting(false);
          return;
        }

        saveSession({
          tier: result.tier,
          keyOrPass: cleanPass,
          activatedAt: new Date().toISOString(),
          userLabel: result.label
        });
        onSuccess(result.tier, result.label, cleanPass);
        setPasscode('');
        if (onClose) onClose();
      } else if (result.isRevoked) {
        setErrorMsg(result.errorMessage || '❌ รหัสนี้ถูกระงับสิทธิ์การใช้งาน เนื่องจากตรวจพบการละเมิดเงื่อนไข กรุณาติดต่อ LINE: @003iwzqt');
      } else {
        setErrorMsg('❌ รหัสผ่านหรือ License Key ไม่ถูกต้อง กรุณาตรวจสอบใหม่อีกครั้ง');
      }
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
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

        {/* Form - Clean & Secure (No default password hints leaked to public) */}
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
                placeholder="กรอก License Key หรือรหัสผ่านของคุณ"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                autoFocus
              />
              <span className="absolute right-3 top-3 text-slate-500 material-symbols-outlined text-lg">
                key
              </span>
            </div>
            {errorMsg && (
              <p className="text-red-400 text-xs mt-1.5 font-sarabun bg-red-950/40 p-2 rounded-lg border border-red-500/30">
                {errorMsg}
              </p>
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
// OWNER KEY GENERATOR & MANAGEMENT MODAL (WITH REVOCATION & BLACKLIST)
// =====================================================================
interface OwnerKeyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OwnerKeyManagerModal: React.FC<OwnerKeyManagerModalProps> = ({ isOpen, onClose }) => {
  const [selectedTier, setSelectedTier] = useState<'starter' | 'pro' | 'vip'>('pro');
  const [createdKey, setCreatedKey] = useState<string>('');
  const [copyToast, setCopyToast] = useState(false);
  const [keyList, setKeyList] = useState(getStoredGeneratedKeys());
  
  // Revocation / Blacklist States
  const [keyToRevokeInput, setKeyToRevokeInput] = useState('');
  const [revokedList, setRevokedList] = useState<string[]>(getStoredRevokedKeys());
  
  // Device Quota & Binding States
  const [keyToResetInput, setKeyToResetInput] = useState('');
  const [deviceBindings, setDeviceBindings] = useState<Record<string, any>>(getLocalDeviceBindings());
  
  const [actionNotice, setActionNotice] = useState<string>('');

  if (!isOpen) return null;

  const handleGenerate = () => {
    const key = generateChecksumLicenseKey(selectedTier);
    setCreatedKey(key);
    setKeyList(getStoredGeneratedKeys());
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const handleRevokeSpecificKey = (targetKey?: string) => {
    const key = (targetKey || keyToRevokeInput).trim().toUpperCase();
    if (!key) return;
    revokeKey(key);
    setRevokedList(getStoredRevokedKeys());
    setKeyToRevokeInput('');
    setActionNotice(`🚫 ระงับสิทธิ์รหัส ${key} สำเร็จแล้ว!`);
    setTimeout(() => setActionNotice(''), 3000);
  };

  const handleUnrevokeSpecificKey = (key: string) => {
    unrevokeKey(key);
    setRevokedList(getStoredRevokedKeys());
    setActionNotice(`✓ ปลดล็อครหัส ${key} เรียบร้อยแล้ว`);
    setTimeout(() => setActionNotice(''), 3000);
  };

  const handleResetDevices = async (targetKey?: string) => {
    const key = (targetKey || keyToResetInput).trim().toUpperCase();
    if (!key) return;
    await resetKeyDevices(key);
    setDeviceBindings(getLocalDeviceBindings());
    setKeyToResetInput('');
    setActionNotice(`🔄 ล้างสิทธิ์อุปกรณ์สำหรับรหัส ${key} เรียบร้อยแล้ว ลูกค้าสามารถผูกคอมและมือถือเครื่องใหม่ได้ทันที`);
    setTimeout(() => setActionNotice(''), 4000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl p-6 text-slate-100 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            👑
          </div>
          <div>
            <h3 className="font-prompt font-bold text-lg text-white">ระบบจัดการ License Key & บัญชีดำ (เจ้าของ)</h3>
            <p className="text-xs text-amber-400">สร้างรหัสลูกค้า และสั่งระงับสิทธิ์ผู้ละเมิดได้ทันที</p>
          </div>
        </div>

        {actionNotice && (
          <div className="mb-3 py-2 px-3 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300 text-xs font-prompt flex items-center justify-between">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice('')} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {/* Generator Controls */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
            <label className="block text-xs font-prompt font-semibold text-slate-300">
              เลือกประเภทแพ็กเกจที่ต้องการสร้าง:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTier('starter')}
                className={`py-2 px-2 rounded-lg text-xs font-prompt font-semibold border transition text-center ${
                  selectedTier === 'starter'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-bold'
                    : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-650'
                }`}
              >
                🟢 Starter (฿890)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier('pro')}
                className={`py-2 px-2 rounded-lg text-xs font-prompt font-semibold border transition text-center ${
                  selectedTier === 'pro'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                    : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-650'
                }`}
              >
                ⭐ Pro (฿1,490)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier('vip')}
                className={`py-2 px-2 rounded-lg text-xs font-prompt font-semibold border transition text-center ${
                  selectedTier === 'vip'
                    ? 'bg-indigo-500 text-white border-indigo-400 shadow-md font-bold'
                    : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-650'
                }`}
              >
                💎 VIP (฿2,990)
              </button>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-prompt font-bold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>กดสร้าง License Key ทันที (พร้อม Checksum)</span>
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

          {/* 🚫 REVOKE & BLACKLIST TOOL (DEDICATED FOR BANNING VIOLATORS) */}
          <div className="bg-rose-950/30 p-4 rounded-xl border border-rose-500/40 space-y-3">
            <div className="flex items-center gap-2 text-rose-300 font-prompt font-bold text-xs">
              <span className="material-symbols-outlined text-base text-rose-400">block</span>
              <span>ระบบระงับสิทธิ์ / แบนรหัสผู้ละเมิด (Key Revocation & Blacklist)</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sarabun">
              เมื่อมีลูกค้าขอคืนเงิน หรือตรวจพบรหัสถูกนำไปแจกต่อ กรอกรหัสเพื่อระงับสิทธิ์ทันที ผู้ใช้รหัสนี้จะถูกบล็อกและตัดสิทธิ์อัตโนมัติ:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyToRevokeInput}
                onChange={(e) => setKeyToRevokeInput(e.target.value)}
                placeholder="กรอกรหัสที่ต้องการแบน เช่น PRO-xxxx-xxxx"
                className="flex-1 bg-slate-950 border border-rose-500/40 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-400"
              />
              <button
                type="button"
                onClick={() => handleRevokeSpecificKey()}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-prompt font-bold text-xs rounded-lg transition flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">do_not_disturb_on</span>
                <span>แบนรหัสนี้</span>
              </button>
            </div>

            {/* Currently Revoked Keys */}
            {revokedList.length > 0 && (
              <div className="pt-2 border-t border-rose-500/20">
                <span className="text-[11px] text-rose-300 font-prompt font-semibold block mb-1.5">
                  บัญชีดำรหัสที่ถูกระงับสิทธิ์ในขณะนี้ ({revokedList.length} รหัส):
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 text-xs font-mono">
                  {revokedList.map((bKey, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-rose-950/60 px-2.5 py-1.5 rounded border border-rose-500/30">
                      <span className="line-through text-rose-300 font-bold">{bKey}</span>
                      <button
                        type="button"
                        onClick={() => handleUnrevokeSpecificKey(bKey)}
                        className="text-[11px] text-slate-300 hover:text-emerald-300 underline font-prompt"
                      >
                        ปลดบล็อก
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 💻📱 DEVICE BINDING & QUOTA MANAGEMENT (1 PC + 1 MOBILE) */}
          <div className="bg-sky-950/30 p-4 rounded-xl border border-sky-500/40 space-y-3">
            <div className="flex items-center gap-2 text-sky-300 font-prompt font-bold text-xs">
              <span className="material-symbols-outlined text-base text-sky-400">devices</span>
              <span>ระบบตรวจสอบ & รีเซ็ตสิทธิ์อุปกรณ์ (1 คอมพิวเตอร์ + 1 โทรศัพท์มือถือ)</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sarabun">
              แต่ละรหัสลูกค้าจำกัด 1 คอมพิวเตอร์ และ 1 โทรศัพท์มือถือ (เจ้าของระบบใช้งานได้ไม่จำกัดเครื่อง) หากลูกค้าเปลี่ยนเครื่องใหม่ เจ้าของสามารถกรอกรหัสแล้วกด "รีเซ็ตเครื่อง" เพื่อให้ลูกค้าล็อกอินเครื่องใหม่ได้ทันที:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyToResetInput}
                onChange={(e) => setKeyToResetInput(e.target.value)}
                placeholder="กรอกรหัสที่ต้องการรีเซ็ตเครื่อง เช่น PRO-xxxx-xxxx"
                className="flex-1 bg-slate-950 border border-sky-500/40 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={() => handleResetDevices()}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-prompt font-bold text-xs rounded-lg transition flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span>รีเซ็ตเครื่อง</span>
              </button>
            </div>
          </div>

          {/* Preset Demo Keys for Owner to Test */}
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/80">
            <div className="text-xs font-prompt font-semibold text-amber-300 mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">key</span>
              <span>รหัสตัวอย่างสำหรับเจ้าของทดสอบระบบ:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_DEMO_KEYS.map((k, i) => (
                <div key={i} className="bg-slate-900/90 p-2 rounded-lg border border-slate-700 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-prompt">{k.label}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs text-white font-bold">{k.key}</span>
                    <button
                      onClick={() => handleCopy(k.key)}
                      className="text-amber-400 hover:text-white text-[10px] font-prompt underline"
                    >
                      คัดลอก
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History / Stored Keys with Quick Ban & Reset Devices */}
          <div>
            <h4 className="text-xs font-prompt font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>ประวัติ License Key ที่สร้างแล้วในเครื่องนี้ ({keyList.length})</span>
            </h4>
            <div className="max-h-56 overflow-y-auto space-y-2 text-xs">
              {keyList.length === 0 ? (
                <div className="text-slate-500 text-center py-4 font-sarabun">ยังไม่มีประวัติการสร้าง Key</div>
              ) : (
                keyList.map((item, idx) => {
                  const isRevoked = isKeyRevoked(item.key);
                  const binding = deviceBindings[item.key.toUpperCase()] || getKeyBinding(item.key);
                  const hasDesktop = !!(binding?.desktop?.deviceId);
                  const hasMobile = !!(binding?.mobile?.deviceId);
                  return (
                    <div key={idx} className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold font-mono text-xs ${isRevoked ? 'line-through text-rose-400' : 'text-white'}`}>
                            {item.key}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-semibold ${
                            item.tier === 'starter' ? 'bg-emerald-900/80 text-emerald-300' :
                            item.tier === 'vip' ? 'bg-indigo-900/80 text-indigo-300' :
                            'bg-amber-900/80 text-amber-300'
                          }`}>
                            {item.tier}
                          </span>
                          {isRevoked && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-300 font-prompt">
                              ถูกระงับสิทธิ์
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-sarabun">
                          <span className={`inline-flex items-center gap-1 ${hasDesktop ? 'text-sky-300 font-medium' : 'text-slate-500'}`}>
                            💻 {hasDesktop ? (binding?.desktop?.platform || 'คอมพิวเตอร์') : 'คอมพิวเตอร์ (ว่าง)'}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className={`inline-flex items-center gap-1 ${hasMobile ? 'text-emerald-300 font-medium' : 'text-slate-500'}`}>
                            📱 {hasMobile ? (binding?.mobile?.platform || 'มือถือ') : 'มือถือ (ว่าง)'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleCopy(item.key)}
                          className="text-amber-400 hover:text-amber-300 text-[11px] font-prompt px-2 py-1 rounded bg-slate-700/50"
                        >
                          คัดลอก
                        </button>
                        <button
                          onClick={() => handleResetDevices(item.key)}
                          title="ล้างเครื่องที่ผูกไว้ เพื่อให้ลูกค้านำไปใช้กับเครื่องใหม่ได้"
                          className="text-sky-300 hover:text-sky-200 text-[11px] font-prompt px-2 py-1 rounded bg-sky-950/80 border border-sky-500/30 flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[13px]">restart_alt</span>
                          <span>รีเซ็ตเครื่อง</span>
                        </button>
                        {isRevoked ? (
                          <button
                            onClick={() => handleUnrevokeSpecificKey(item.key)}
                            className="text-emerald-400 hover:text-emerald-300 text-[11px] font-prompt px-2 py-1 rounded bg-emerald-950/80 border border-emerald-500/30"
                          >
                            ปลดแบน
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevokeSpecificKey(item.key)}
                            className="text-rose-400 hover:text-rose-300 text-[11px] font-prompt px-2 py-1 rounded bg-rose-950/80 border border-rose-500/30"
                          >
                            🚫 แบน
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
