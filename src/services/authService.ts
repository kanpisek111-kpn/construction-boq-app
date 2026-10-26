// =====================================================================
// AUTH & LICENSE SERVICE FOR CONSTRUCTION BOQ APP
// =====================================================================

export type LicenseTier = 'locked' | 'demo' | 'pro' | 'enterprise' | 'owner';

export interface LicenseSession {
  tier: LicenseTier;
  keyOrPass: string;
  activatedAt: string;
  userLabel: string;
}

const STORAGE_KEY = 'construction_boq_auth_session_v1';
const GENERATED_KEYS_STORAGE_KEY = 'construction_boq_owner_keys_v1';

// Master Passwords for System Owner (เจ้าของระบบ ปลดล็อก 100%)
const OWNER_PASSWORDS = [
  'OWNER-BOQ-2026',
  'admin999',
  'kanpisek111',
  'boqpro888',
  'boq-owner-vip'
];

// Preset VIP Keys
const PRESET_PRO_KEYS = [
  'PRO-START-2026',
  'PRO-VIP-8888',
  'PRO-BUILDER-99',
  'PRO-BOQ-SMART',
  'PRO-KEY-7777'
];

const PRESET_ENT_KEYS = [
  'ENT-CORP-2026',
  'ENT-VIP-9999',
  'ENT-ENTERPRISE-1'
];

export function getStoredGeneratedKeys(): { key: string; tier: 'pro' | 'enterprise'; createdAt: string }[] {
  try {
    const raw = localStorage.getItem(GENERATED_KEYS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGeneratedKey(key: string, tier: 'pro' | 'enterprise'): void {
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

export function validatePasscodeOrKey(input: string): { valid: boolean; tier: LicenseTier; label: string } {
  const clean = input.trim();
  if (!clean) {
    return { valid: false, tier: 'locked', label: '' };
  }

  // 1. Check Owner Master Passwords
  if (OWNER_PASSWORDS.some(pass => pass.toLowerCase() === clean.toLowerCase())) {
    return {
      valid: true,
      tier: 'owner',
      label: '👑 เจ้าของระบบ (Owner Master)'
    };
  }

  // 2. Check Preset Pro Keys
  if (PRESET_PRO_KEYS.some(k => k.toLowerCase() === clean.toLowerCase())) {
    return {
      valid: true,
      tier: 'pro',
      label: '⭐ สมาชิกแพ็กเกจ Pro ตลอดชีพ'
    };
  }

  // 3. Check Preset Enterprise Keys
  if (PRESET_ENT_KEYS.some(k => k.toLowerCase() === clean.toLowerCase())) {
    return {
      valid: true,
      tier: 'enterprise',
      label: '🏢 สมาชิกแพ็กเกจ Enterprise'
    };
  }

  // 4. Check dynamic owner-generated keys in localStorage
  const stored = getStoredGeneratedKeys();
  const matchedStored = stored.find(item => item.key.toLowerCase() === clean.toLowerCase());
  if (matchedStored) {
    return {
      valid: true,
      tier: matchedStored.tier,
      label: matchedStored.tier === 'enterprise' ? '🏢 สมาชิกแพ็กเกจ Enterprise' : '⭐ สมาชิกแพ็กเกจ Pro ตลอดชีพ'
    };
  }

  // 5. Check Algorithmic Key Patterns:
  // PRO-xxxx-xxxx or ENT-xxxx-xxxx (8 hex/alphanumeric chars)
  const proRegex = /^PRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
  if (proRegex.test(clean)) {
    return {
      valid: true,
      tier: 'pro',
      label: '⭐ สมาชิกแพ็กเกจ Pro'
    };
  }

  const entRegex = /^ENT-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
  if (entRegex.test(clean)) {
    return {
      valid: true,
      tier: 'enterprise',
      label: '🏢 สมาชิกแพ็กเกจ Enterprise'
    };
  }

  return { valid: false, tier: 'locked', label: '' };
}

// Generate new random key for customers
export function generateRandomLicenseKey(tier: 'pro' | 'enterprise'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const seg2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const prefix = tier === 'enterprise' ? 'ENT' : 'PRO';
  const key = `${prefix}-${seg1}-${seg2}`;
  saveGeneratedKey(key, tier);
  return key;
}

// Permission Checker
export function canAccessFeature(
  feature: 
    | 'export_quotation'
    | 'export_excel'
    | 'export_csv'
    | 'gantt_schedule'
    | 'actual_cost_tracker'
    | 'site_procurement'
    | 'milestones_manager'
    | 'cost_analytics'
    | 'ai_sanity_check'
    | 'plan_analyzer'
    | 'advanced_calculators'
    | 'multi_projects',
  tier: LicenseTier
): boolean {
  if (tier === 'owner' || tier === 'enterprise') {
    return true; // Unlocked 100%
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
        return true;
      case 'gantt_schedule':
      case 'actual_cost_tracker':
      case 'site_procurement':
      case 'ai_sanity_check':
      case 'plan_analyzer':
        return true; // Pro has access, or you can limit to Enterprise if desired
      default:
        return true;
    }
  }

  // Demo Tier: Everything above is LOCKED
  return false;
}
