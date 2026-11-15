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

const STORAGE_KEY = 'construction_boq_auth_session_v1';
const GENERATED_KEYS_STORAGE_KEY = 'construction_boq_owner_keys_v1';
const REVOKED_KEYS_STORAGE_KEY = 'construction_boq_revoked_keys_v1';

// Hardcoded blacklist in code (can add known violators directly here)
const HARDCODED_REVOKED_KEYS: string[] = [];

// Master Passwords for System Owner (เจ้าของระบบ ปลดล็อก 100%)
const OWNER_PASSWORDS = [
  'OWNER-BOQ-2026',
  'admin8888',
  'admin999',
  'kanpisek111',
  'boqpro888',
  'boq-owner-vip'
];

// Preset Demo Keys (For owner testing only)
export const PRESET_DEMO_KEYS = [
  { key: 'START-DEMO-2026', tier: 'starter' as const, label: '🟢 สิทธิ์ทดสอบ Starter' },
  { key: 'PRO-DEMO-2026', tier: 'pro' as const, label: '⭐ สิทธิ์ทดสอบ Pro' },
  { key: 'VIP-DEMO-2026', tier: 'vip' as const, label: '💎 สิทธิ์ทดสอบ VIP Corporate' }
];

// Legacy presets for backwards compatibility
const LEGACY_PRESET_KEYS: { [key: string]: { tier: LicenseTier; label: string } } = {
  'PRO-START-2026': { tier: 'pro', label: '⭐ สมาชิกแพ็กเกจ Pro ตลอดชีพ' },
  'PRO-VIP-8888': { tier: 'pro', label: '⭐ สมาชิกแพ็กเกจ Pro ตลอดชีพ' },
  'ENT-CORP-2026': { tier: 'vip', label: '💎 สมาชิกแพ็กเกจ VIP Corporate' },
  'ENT-VIP-9999': { tier: 'vip', label: '💎 สมาชิกแพ็กเกจ VIP Corporate' }
};

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

export function revokeKey(key: string): void {
  try {
    const clean = key.trim().toUpperCase();
    if (!clean) return;
    const list = getStoredRevokedKeys();
    if (!list.includes(clean)) {
      list.unshift(clean);
      localStorage.setItem(REVOKED_KEYS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function unrevokeKey(key: string): void {
  try {
    const clean = key.trim().toUpperCase();
    const list = getStoredRevokedKeys().filter(k => k !== clean);
    localStorage.setItem(REVOKED_KEYS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function isKeyRevoked(key: string): boolean {
  if (!key) return false;
  const clean = key.trim().toUpperCase();
  const list = getStoredRevokedKeys();
  return list.some(k => k === clean);
}

// Sync with remote blacklist.json
export async function syncRemoteBlacklist(): Promise<string[]> {
  try {
    const res = await fetch(`./blacklist.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.revokedKeys)) {
        const current = getStoredRevokedKeys();
        const merged = Array.from(new Set([...current, ...data.revokedKeys.map((k: string) => k.toUpperCase().trim())]));
        localStorage.setItem(REVOKED_KEYS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    // Offline / network fallback
  }
  return getStoredRevokedKeys();
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

  // 1. Check Owner Master Passwords
  if (OWNER_PASSWORDS.some(pass => pass.toUpperCase() === clean)) {
    return {
      valid: true,
      tier: 'owner',
      label: '👑 เจ้าของระบบ (Owner Master)'
    };
  }

  // 2. Check Preset Demo Keys (For owner testing)
  const matchedDemo = PRESET_DEMO_KEYS.find(k => k.key.toUpperCase() === clean);
  if (matchedDemo) {
    return {
      valid: true,
      tier: matchedDemo.tier,
      label: matchedDemo.label
    };
  }

  // 3. Check Legacy Preset Keys
  if (LEGACY_PRESET_KEYS[clean]) {
    return {
      valid: true,
      tier: LEGACY_PRESET_KEYS[clean].tier,
      label: LEGACY_PRESET_KEYS[clean].label
    };
  }

  // 4. Check dynamic owner-generated keys in localStorage
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
    | 'actual_cost_tracker',
  tier: LicenseTier
): boolean {
  if (tier === 'owner' || tier === 'vip' || tier === 'enterprise') {
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
