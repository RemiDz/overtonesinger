// Pro License Management Module
// Offline UUID-based validation for LemonSqueezy license keys

interface LicenseState {
  isActive: boolean;
  licenseKey: string | null;
  activatedAt: number | null;
}

const STORAGE_KEY = 'overtone_singer_pro';

// UUID v4 format: 8-4-4-4-12 hex characters (case-insensitive)
const UUID_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

// In-memory cache so we don't read localStorage on every render
let cachedState: LicenseState | null = null;

export function getLicenseState(): LicenseState {
  if (cachedState) return cachedState;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedState = JSON.parse(stored);
      return cachedState!;
    }
  } catch {}
  cachedState = { isActive: false, licenseKey: null, activatedAt: null };
  return cachedState;
}

function saveLicenseState(state: LicenseState): void {
  cachedState = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function isPro(): boolean {
  return getLicenseState().isActive;
}

export async function activateLicense(licenseKey: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = licenseKey.trim().toUpperCase();

  if (!trimmed) {
    return { success: false, error: 'Please enter a license key' };
  }

  if (!UUID_REGEX.test(trimmed)) {
    return { success: false, error: 'Invalid license key format' };
  }

  saveLicenseState({
    isActive: true,
    licenseKey: trimmed,
    activatedAt: Date.now(),
  });

  return { success: true };
}

export async function validateLicense(): Promise<{ success: boolean; error?: string }> {
  const state = getLicenseState();

  if (!state.licenseKey) {
    return { success: false, error: 'No license key found' };
  }

  // Validate stored key still matches expected format
  if (!UUID_REGEX.test(state.licenseKey)) {
    saveLicenseState({ isActive: false, licenseKey: null, activatedAt: null });
    return { success: false, error: 'Invalid license key' };
  }

  return { success: state.isActive };
}

export function deactivateLicense(): void {
  cachedState = null;
  localStorage.removeItem(STORAGE_KEY);
}
