// =====================================================================
// AUTH & LICENSE SERVICE FOR CONSTRUCTION BOQ APP (3-TIER + OWNER)
// WITH REVOCATION / BLACKLIST ENFORCEMENT
// =====================================================================

export type LicenseTier = 'locked' | 'demo' | 'starter' | 'pro' | 'vip' | 'owner' | 'enterprise';

export interface LicenseSession {
  tier: LicenseTier;
  keyOrPass: string;
  activatedAt: string;
  userLabel: string;
}

export interface ValidationResult {
  valid: boolean;
  tier: LicenseTier;
  label: string;
  isRevoked?: boolean;
  errorMessage?: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'desktop' | 'mobile';
  platform: string;
  boundAt: string;
}

export interface KeyDeviceBinding {
  key: string;
  tier: LicenseTier;
  desktop?: DeviceInfo;
  mobile?: DeviceInfo;
  updatedAt: string;
}

export interface DeviceValidationResult {
  allowed: boolean;
  isDeviceLimitExceeded?: boolean;
  deviceType?: 'desktop' | 'mobile';
  errorMessage?: string;
  binding?: KeyDeviceBinding;
}

const STORAGE_KEY = 'construction_boq_auth_session_v1';
const GENERATED_KEYS_STORAGE_KEY = 'construction_boq_owner_keys_v1';
const REVOKED_KEYS_STORAGE_KEY = 'construction_boq_revoked_keys_v1';
const DEVICE_ID_KEY = 'construction_boq_device_id_v2';
const DEVICE_BINDINGS_STORAGE_KEY = 'construction_boq_device_bindings_v2';
const CLOUD_SYNC_ENDPOINT = 'https://kvdb.io/4y9qEw9gRk5y9j2K8V3M2A';
const CLOUD_BLACKLIST_KEY = 'boq_blacklist_global';

// Hardcoded blacklist in code (can add known violators directly here)
const HARDCODED_REVOKED_KEYS: string[] = [];

// =====================================================================
// OWNER PASSCODE CRYPTOGRAPHIC VERIFICATION (SHA-256)
// ไม่เก็บรหัสผ่าน Owner แบบ Plaintext ในซอร์สโค้ดหรือ JS Bundle
// =====================================================================

// Fallback SHA-256 Hash สำหรับเจ้าของระบบ (ป้องกันการล็อกตัวเองออกแม้ยังไม่ได้ตั้งค่า Secret บน GitHub)
// ค่านี้คือ SHA-256 Hash แบบทางเดียว ไม่สามารถย้อนกลับเป็นรหัสผ่านเดิมได้
const DEFAULT_OWNER_PASSCODE_HASH = '2bedcfc96edf34e5bd796481aeef4b2a654a4dd85d6bf1fdd6c33ebeea4bf5d9';

/**
 * คำนวณ SHA-256 Hash ของข้อความ (รองรับ UTF-8 / ทุกภาษาและอักขระพิเศษ)
 * ทำงานได้ทั้งบน HTTPS, HTTP และ Localhost โดยไม่ต้องพึ่งพา Web Crypto API
 */
export function computeSha256(input: string): string {
  const utf8 = unescape(encodeURIComponent(input));
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const words: number[] = [];
  const asciiBitLength = utf8.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let workingHash = hash.slice(0, 8);
  let ascii = utf8 + '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = ((asciiBitLength / maxWord) | 0);
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = workingHash;
    workingHash = workingHash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = workingHash[0];
      const e = workingHash[4];
      const temp1 =
        workingHash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & workingHash[5]) ^ (~e & workingHash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & workingHash[1]) ^ (a & workingHash[2]) ^ (workingHash[1] & workingHash[2]));

      workingHash = [(temp1 + temp2) | 0].concat(workingHash);
      workingHash[4] = (workingHash[4] + temp1) | 0;
    }
    for (let i = 0; i < 8; i++) {
      workingHash[i] = (workingHash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let i2 = 3; i2 >= 0; i2--) {
      const b = (workingHash[i] >> (8 * i2)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result.toLowerCase();
}

/**
 * รวบรวมรายการ SHA-256 Hashes ที่ได้รับอนุญาตสำหรับสิทธิ์ Owner
 * 1. อ่านจาก VITE_OWNER_PASSCODE_HASH (รองรับคั่นด้วยจุลภาคหลายรหัส)
 * 2. อ่านจาก VITE_OWNER_PASSCODE (หากมีระบุใน env จะแปลงเป็น SHA-256 ทันที)
 * 3. มี DEFAULT_OWNER_PASSCODE_HASH เป็น fallback เสมอ
 */
function getAuthorizedOwnerHashes(): Set<string> {
  const hashes = new Set<string>();

  // 1. เพิ่มค่า Fallback Hash เริ่มต้นเสมอ
  hashes.add(DEFAULT_OWNER_PASSCODE_HASH.toLowerCase().trim());

  // 2. ตรวจสอบ VITE_OWNER_PASSCODE_HASH จาก build environment
  const envHash = typeof import.meta !== 'undefined' && import.meta?.env?.VITE_OWNER_PASSCODE_HASH;
  if (typeof envHash === 'string' && envHash.trim()) {
    envHash.split(',').forEach(h => {
      const cleanH = h.trim().toLowerCase();
      if (cleanH) hashes.add(cleanH);
    });
  }

  // 3. หากมี VITE_OWNER_PASSCODE ใน env ให้แปลงเป็น SHA-256 แล้วเพิ่มเข้าชุดตรวจสอบ
  const envPasscode = typeof import.meta !== 'undefined' && import.meta?.env?.VITE_OWNER_PASSCODE;
  if (typeof envPasscode === 'string' && envPasscode.trim()) {
    hashes.add(computeSha256(envPasscode.trim()));
    hashes.add(computeSha256(envPasscode.trim().toUpperCase()));
  }

  return hashes;
}

const AUTHORIZED_OWNER_HASHES = getAuthorizedOwnerHashes();

/**
 * ตรวจสอบว่ารหัสผ่านที่ส่งมา ตรงกับ Owner SHA-256 Hash หรือไม่
 */
export function isOwnerPasscode(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  const hashRaw = computeSha256(trimmed);
  const hashUpper = computeSha256(trimmed.toUpperCase());
  return AUTHORIZED_OWNER_HASHES.has(hashRaw) || AUTHORIZED_OWNER_HASHES.has(hashUpper);
}

// =====================================================================
// REVOCATION & BLACKLIST MANAGEMENT
// =====================================================================

export function getStoredRevokedKeys(): string[] {
  try {
    const raw = localStorage.getItem(REVOKED_KEYS_STORAGE_KEY);
    const local: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set<string>([...HARDCODED_REVOKED_KEYS, ...local].map(k => k.trim().toUpperCase()));
    return Array.from(set);
  } catch {
    return HARDCODED_REVOKED_KEYS;
  }
}

export async function syncBlacklistToCloud(list: string[]): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    await fetch(`${CLOUD_SYNC_ENDPOINT}/${CLOUD_BLACKLIST_KEY}`, {
      method: 'POST',
      body: JSON.stringify(list),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch {}
}

export function revokeKey(key: string): void {
  try {
    const clean = key.trim().toUpperCase();
    if (!clean) return;
    const list = getStoredRevokedKeys();
    if (!list.includes(clean)) {
      list.unshift(clean);
      localStorage.setItem(REVOKED_KEYS_STORAGE_KEY, JSON.stringify(list));
      syncBlacklistToCloud(list);
    }
  } catch {}
}

export function unrevokeKey(key: string): void {
  try {
    const clean = key.trim().toUpperCase();
    const list = getStoredRevokedKeys().filter(k => k !== clean);
    localStorage.setItem(REVOKED_KEYS_STORAGE_KEY, JSON.stringify(list));
    syncBlacklistToCloud(list);
  } catch {}
}

export function isKeyRevoked(key: string): boolean {
  if (!key) return false;
  const clean = key.trim().toUpperCase();
  const list = getStoredRevokedKeys();
  return list.some(k => k === clean);
}

// Sync with remote blacklist.json & cloud kvdb
export async function syncRemoteBlacklist(): Promise<string[]> {
  const current = getStoredRevokedKeys();
  const fileKeys: string[] = [];
  const cloudKeys: string[] = [];
  let isCloudSuccess = false;

  // 1. Fetch from ./blacklist.json
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`./blacklist.json?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.revokedKeys)) {
        data.revokedKeys.forEach((k: string) => {
          if (typeof k === 'string' && k.trim()) {
            fileKeys.push(k.toUpperCase().trim());
          }
        });
      }
    }
  } catch (err) {
    // Offline / file fallback
  }

  // 2. Fetch from CLOUD_SYNC_ENDPOINT (boq_blacklist_global)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${CLOUD_SYNC_ENDPOINT}/${CLOUD_BLACKLIST_KEY}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const cloudData = await res.json();
      if (Array.isArray(cloudData)) {
        cloudData.forEach((k: string) => {
          if (typeof k === 'string' && k.trim()) {
            cloudKeys.push(k.toUpperCase().trim());
          }
        });
        isCloudSuccess = true;
      }
    }
  } catch (err) {
    // Offline / cloud fetch fallback
  }

  // หากดึงข้อมูลจาก Cloud สำเร็จ ให้ใช้ Cloud + blacklist.json + HARDCODED_REVOKED_KEYS
  // เพื่อให้การ "ปลดแบน" (unrevokeKey) มีผลปลดล็อกข้ามเครื่องลูกค้าได้จริง (ไม่ถูก localStorage ตัวเก่าดึงกลับมา)
  // หากดึง Cloud ไม่สำเร็จ (ออฟไลน์) จึงค่อยใช้ current จาก localStorage ร่วมด้วย
  const baseList = isCloudSuccess
    ? [...cloudKeys, ...fileKeys, ...HARDCODED_REVOKED_KEYS]
    : [...current, ...fileKeys, ...cloudKeys, ...HARDCODED_REVOKED_KEYS];

  const merged = Array.from(new Set(baseList.map(k => k.trim().toUpperCase())));
  try {
    localStorage.setItem(REVOKED_KEYS_STORAGE_KEY, JSON.stringify(merged));
  } catch {}
  return merged;
}

// Check if currently active session was revoked
export function checkAndEnforceSessionRevocation(): boolean {
  const session = getCurrentSession();
  if (session.tier !== 'locked' && session.tier !== 'demo' && session.tier !== 'owner') {
    if (session.keyOrPass && isKeyRevoked(session.keyOrPass)) {
      logout();
      return true;
    }
  }
  return false;
}

// =====================================================================
// DEVICE BINDING & QUOTA MANAGEMENT (1 PC + 1 MOBILE PER KEY, OWNER EXEMPT)
// =====================================================================

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      const rand = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      id = `dev-${Date.now().toString(36)}-${rand}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'dev-temp-' + Math.random().toString(36).substring(2, 10);
  }
}

export function getDeviceType(): 'desktop' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = (navigator.userAgent || '').toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|crios/i.test(ua);
  const isTouchAndSmall = (window.innerWidth <= 820) && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
  return (isMobileUA || isTouchAndSmall) ? 'mobile' : 'desktop';
}

export function getDevicePlatformName(): string {
  if (typeof window === 'undefined') return 'ทั่วไป';
  const ua = navigator.userAgent || '';
  if (/iPhone/i.test(ua)) return 'iPhone (iOS)';
  if (/iPad/i.test(ua)) return 'iPad (iOS)';
  if (/Android/i.test(ua)) return 'Android สมาร์ทโฟน/แท็บเล็ต';
  if (/Mac/i.test(ua)) return 'Mac (คอมพิวเตอร์)';
  if (/Windows/i.test(ua)) return 'Windows PC/โน้ตบุ๊ก';
  if (/Linux/i.test(ua)) return 'Linux PC';
  return getDeviceType() === 'mobile' ? 'โทรศัพท์มือถือ' : 'คอมพิวเตอร์';
}

export function getLocalDeviceBindings(): Record<string, KeyDeviceBinding> {
  try {
    const raw = localStorage.getItem(DEVICE_BINDINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalDeviceBinding(binding: KeyDeviceBinding): void {
  try {
    const all = getLocalDeviceBindings();
    all[binding.key.toUpperCase()] = binding;
    localStorage.setItem(DEVICE_BINDINGS_STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function getKeyBinding(key: string): KeyDeviceBinding | null {
  if (!key) return null;
  const all = getLocalDeviceBindings();
  return all[key.trim().toUpperCase()] || null;
}

export async function fetchRemoteKeyBinding(cleanKey: string): Promise<KeyDeviceBinding | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${CLOUD_SYNC_ENDPOINT}/boq_dev_${encodeURIComponent(cleanKey)}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.key) {
        saveLocalDeviceBinding(data);
        return data;
      }
    }
  } catch {
    // Fallback to local
  }
  return getKeyBinding(cleanKey);
}

export async function saveRemoteKeyBinding(binding: KeyDeviceBinding): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    await fetch(`${CLOUD_SYNC_ENDPOINT}/boq_dev_${encodeURIComponent(binding.key.toUpperCase())}`, {
      method: 'POST',
      body: JSON.stringify(binding),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch {
    // Offline / fallback
  }
}

/**
 * Validates device quota:
 * - Owner: Unlimited devices on both PC & mobile (100% exempt)
 * - Customer: Strictly 1 Computer (Desktop/Laptop) and 1 Mobile device (Phone/Tablet)
 * - If exceeded: blocks immediately ("เด้งออกเลย")
 */
export async function validateAndEnforceDeviceQuota(
  key: string, 
  tier: LicenseTier
): Promise<DeviceValidationResult> {
  // 1. OWNER IS 100% EXEMPT (ไม่จำกัดจำนวนเครื่อง)
  if (tier === 'owner') {
    return { allowed: true };
  }

  // 2. Demo or Locked tiers do not consume quota
  if (tier === 'locked' || tier === 'demo') {
    return { allowed: true };
  }

  const cleanKey = key.trim().toUpperCase();
  if (!cleanKey) {
    return { allowed: false, errorMessage: 'ไม่พบ License Key' };
  }

  const currentDeviceId = getOrCreateDeviceId();
  const currentDeviceType = getDeviceType();
  const currentPlatform = getDevicePlatformName();

  // Try to sync with remote binding
  let binding = await fetchRemoteKeyBinding(cleanKey);
  if (!binding) {
    binding = getKeyBinding(cleanKey);
  }

  // If existing binding is found, check slot for current device type
  if (binding) {
    if (currentDeviceType === 'desktop') {
      if (binding.desktop && binding.desktop.deviceId && binding.desktop.deviceId !== currentDeviceId) {
        return {
          allowed: false,
          isDeviceLimitExceeded: true,
          deviceType: 'desktop',
          errorMessage: `❌ สิทธิ์อุปกรณ์เกินกำหนด! รหัสนี้ถูกเปิดใช้งานบนคอมพิวเตอร์เครื่องอื่นแล้ว (${binding.desktop.platform || 'PC อื่น'}) \n(สิทธิ์อนุญาต: 1 คอมพิวเตอร์ + 1 มือถือเท่านั้น) \nหากต้องการใช้งานเพิ่ม กรุณาสั่งซื้อแพ็กเกจใหม่ ติดต่อ LINE: @003iwzqt`,
          binding
        };
      }
    } else if (currentDeviceType === 'mobile') {
      if (binding.mobile && binding.mobile.deviceId && binding.mobile.deviceId !== currentDeviceId) {
        return {
          allowed: false,
          isDeviceLimitExceeded: true,
          deviceType: 'mobile',
          errorMessage: `❌ สิทธิ์อุปกรณ์เกินกำหนด! รหัสนี้ถูกเปิดใช้งานบนโทรศัพท์มือถือเครื่องอื่นแล้ว (${binding.mobile.platform || 'มือถืออื่น'}) \n(สิทธิ์อนุญาต: 1 คอมพิวเตอร์ + 1 มือถือเท่านั้น) \nหากต้องการใช้งานเพิ่ม กรุณาสั่งซื้อแพ็กเกจใหม่ ติดต่อ LINE: @003iwzqt`,
          binding
        };
      }
    }
  }

  // Slot is available or already bound to this device -> Bind / Update
  const updatedBinding: KeyDeviceBinding = binding ? { ...binding } : {
    key: cleanKey,
    tier,
    updatedAt: new Date().toISOString()
  };

  const nowIso = new Date().toISOString();
  if (currentDeviceType === 'desktop') {
    updatedBinding.desktop = {
      deviceId: currentDeviceId,
      deviceType: 'desktop',
      platform: currentPlatform,
      boundAt: updatedBinding.desktop?.deviceId === currentDeviceId ? (updatedBinding.desktop.boundAt || nowIso) : nowIso
    };
  } else {
    updatedBinding.mobile = {
      deviceId: currentDeviceId,
      deviceType: 'mobile',
      platform: currentPlatform,
      boundAt: updatedBinding.mobile?.deviceId === currentDeviceId ? (updatedBinding.mobile.boundAt || nowIso) : nowIso
    };
  }
  updatedBinding.updatedAt = nowIso;

  // Persist locally and in remote cloud
  saveLocalDeviceBinding(updatedBinding);
  saveRemoteKeyBinding(updatedBinding).catch(() => {});

  return {
    allowed: true,
    binding: updatedBinding
  };
}

/**
 * Owner reset tool: Clears bound devices for a specific key
 */
export async function resetKeyDevices(key: string): Promise<void> {
  const cleanKey = key.trim().toUpperCase();
  if (!cleanKey) return;

  const all = getLocalDeviceBindings();
  if (all[cleanKey]) {
    delete all[cleanKey].desktop;
    delete all[cleanKey].mobile;
    all[cleanKey].updatedAt = new Date().toISOString();
    localStorage.setItem(DEVICE_BINDINGS_STORAGE_KEY, JSON.stringify(all));
  } else {
    all[cleanKey] = {
      key: cleanKey,
      tier: 'pro',
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(DEVICE_BINDINGS_STORAGE_KEY, JSON.stringify(all));
  }

  // Sync reset to remote
  try {
    await fetch(`${CLOUD_SYNC_ENDPOINT}/boq_dev_${encodeURIComponent(cleanKey)}`, {
      method: 'POST',
      body: JSON.stringify(all[cleanKey])
    });
  } catch {}
}

// =====================================================================
// ALGORITHMIC CHECKSUM FOR LICENSE KEYS (PREVENTS BRUTE FORCE)
// Format: PREFIX-XXXX-CCCC
// =====================================================================
const CHECKSUM_SALT = 'BOQ2026_KPN_SECURE_SALT_v2';
const BASE32_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function computeKeyChecksum(prefix: string, seed: string): string {
  const p = prefix.trim().toUpperCase();
  const s = seed.trim().toUpperCase();
  const raw = `${p}:${s}:${CHECKSUM_SALT}`;
  
  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash = hash >>> 0;

  let checksum = '';
  for (let i = 0; i < 4; i++) {
    const idx = (hash >>> (i * 7)) % BASE32_ALPHABET.length;
    checksum += BASE32_ALPHABET[idx];
  }
  return checksum;
}

export function generateChecksumLicenseKey(tier: 'starter' | 'pro' | 'vip'): string {
  const prefixMap: Record<string, string> = {
    starter: 'START',
    pro: 'PRO',
    vip: 'VIP'
  };
  const prefix = prefixMap[tier] || 'PRO';

  // Generate 4-char random seed
  let seed = '';
  for (let i = 0; i < 4; i++) {
    seed += BASE32_ALPHABET[Math.floor(Math.random() * BASE32_ALPHABET.length)];
  }

  const checksum = computeKeyChecksum(prefix, seed);
  const key = `${prefix}-${seed}-${checksum}`;

  saveGeneratedKey(key, tier);
  return key;
}

export function getStoredGeneratedKeys(): { key: string; tier: 'starter' | 'pro' | 'vip'; createdAt: string }[] {
  try {
    const raw = localStorage.getItem(GENERATED_KEYS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGeneratedKey(key: string, tier: 'starter' | 'pro' | 'vip'): void {
  try {
    const list = getStoredGeneratedKeys();
    list.unshift({ key, tier, createdAt: new Date().toISOString() });
    localStorage.setItem(GENERATED_KEYS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function getCurrentSession(): LicenseSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LicenseSession;
      if (parsed && parsed.tier) {
        if (parsed.tier === ('enterprise' as any)) {
          parsed.tier = 'vip';
        }
        return parsed;
      }
    }
  } catch {}
  return {
    tier: 'locked',
    keyOrPass: '',
    activatedAt: '',
    userLabel: 'ยังไม่ได้ยืนยันสิทธิ์'
  };
}

export function saveSession(session: LicenseSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {}
}

export function logout(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function validatePasscodeOrKey(input: string): ValidationResult {
  const clean = input.trim().toUpperCase();
  if (!clean) {
    return { valid: false, tier: 'locked', label: '' };
  }

  // 0. CHECK BLACKLIST FIRST: If key is revoked, immediately reject!
  if (isKeyRevoked(clean)) {
    return {
      valid: false,
      tier: 'locked',
      label: '',
      isRevoked: true,
      errorMessage: '❌ รหัสนี้ถูกระงับสิทธิ์การใช้งาน เนื่องจากตรวจพบการละเมิดเงื่อนไข กรุณาติดต่อ LINE: @003iwzqt'
    };
  }

  // 1. Check Owner Master Passwords via Cryptographic Hash (SHA-256)
  if (isOwnerPasscode(clean)) {
    return {
      valid: true,
      tier: 'owner',
      label: '👑 เจ้าของระบบ (Owner Master)'
    };
  }

  // 2. Check dynamic owner-generated keys in localStorage
  const stored = getStoredGeneratedKeys();
  const matchedStored = stored.find(item => item.key.toUpperCase() === clean);
  if (matchedStored) {
    const labelMap: Record<string, string> = {
      starter: '🟢 สมาชิกแพ็กเกจ Starter ตลอดชีพ',
      pro: '⭐ สมาชิกแพ็กเกจ Pro Contractor ตลอดชีพ',
      vip: '💎 สมาชิกแพ็กเกจ VIP Corporate ตลอดชีพ'
    };
    return {
      valid: true,
      tier: matchedStored.tier,
      label: labelMap[matchedStored.tier] || '⭐ สมาชิกแพ็กเกจ'
    };
  }

  // 5. Algorithmic Checksum Verification
  const checksumPattern = /^(START|PRO|VIP|ENT)-([A-Z0-9]{4})-([A-Z0-9]{4})$/;
  const match = clean.match(checksumPattern);
  if (match) {
    const prefix = match[1];
    const seed = match[2];
    const providedChecksum = match[3];

    // Compute expected checksum
    const normalizedPrefix = prefix === 'ENT' ? 'VIP' : prefix;
    const expectedChecksum = computeKeyChecksum(normalizedPrefix, seed);

    if (providedChecksum === expectedChecksum) {
      if (normalizedPrefix === 'START') {
        return {
          valid: true,
          tier: 'starter',
          label: '🟢 สมาชิกแพ็กเกจ Starter ตลอดชีพ'
        };
      }
      if (normalizedPrefix === 'PRO') {
        return {
          valid: true,
          tier: 'pro',
          label: '⭐ สมาชิกแพ็กเกจ Pro Contractor ตลอดชีพ'
        };
      }
      if (normalizedPrefix === 'VIP') {
        return {
          valid: true,
          tier: 'vip',
          label: '💎 สมาชิกแพ็กเกจ VIP Corporate ตลอดชีพ'
        };
      }
    }
  }

  return { valid: false, tier: 'locked', label: '' };
}

// Permission Checker
export function canAccessFeature(
  feature: 
    | 'export_quotation'
    | 'export_excel'
    | 'export_csv'
    | 'milestones_manager'
    | 'cost_analytics'
    | 'advanced_calculators'
    | 'multi_projects'
    | 'site_procurement'
    | 'gantt_schedule'
    | 'project_files_json'
    | 'white_label_branding'
    | 'ai_sanity_check'
    | 'plan_analyzer'
    | 'actual_cost_tracker'
    | 'price_book',
  tier: LicenseTier
): boolean {
  if (tier === 'owner' || tier === 'vip' || tier === 'enterprise') {
    return true;
  }

  // ฐานราคาภูมิภาคและคลังราคาเปิดให้ทุกระดับเข้าดูและเลือกโซนได้ (โหมด Demo จะแจ้งเตือนเมื่อดึงลง BOQ)
  if (feature === 'price_book') {
    return true;
  }

  if (tier === 'pro') {
    switch (feature) {
      case 'export_quotation':
      case 'export_excel':
      case 'export_csv':
      case 'milestones_manager':
      case 'cost_analytics':
      case 'advanced_calculators':
      case 'multi_projects':
      case 'site_procurement':
      case 'gantt_schedule':
      case 'project_files_json':
      case 'white_label_branding':
        return true;
      case 'actual_cost_tracker':
      case 'ai_sanity_check':
      case 'plan_analyzer':
        return false;
      default:
        return false;
    }
  }

  if (tier === 'starter') {
    switch (feature) {
      case 'export_quotation':
      case 'export_excel':
      case 'export_csv':
      case 'milestones_manager':
      case 'cost_analytics':
      case 'advanced_calculators':
        return true;
      case 'multi_projects':
      case 'site_procurement':
      case 'gantt_schedule':
      case 'project_files_json':
      case 'white_label_branding':
      case 'actual_cost_tracker':
      case 'ai_sanity_check':
      case 'plan_analyzer':
        return false;
      default:
        return false;
    }
  }

  return false;
}
