// Pro License Management Module
// Validates LemonSqueezy license keys via Cloudflare Worker proxy

// NOTE: This endpoint is publicly visible in client bundles by design.
// The Cloudflare Worker MUST enforce rate limiting (e.g., 5 requests/min/IP)
// and input validation to prevent abuse.
const API_BASE = 'https://overtone-license.nuoroda.workers.dev';

interface LicenseState {
  isActive: boolean;
  licenseKey: string | null;
  instanceId: string | null;
  activatedAt: number | null;
}

const STORAGE_KEY = 'overtone_singer_pro';

// In-memory cache so we don't read localStorage on every render
let cachedState: LicenseState | null = null;

export function getLicenseState(): LicenseState {
  if (cachedState) return cachedState;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as LicenseState;
      // Basic integrity check: an active license must have a key and activation timestamp
      if (parsed.isActive && (!parsed.licenseKey || !parsed.activatedAt)) {
        cachedState = { isActive: false, licenseKey: null, instanceId: null, activatedAt: null };
        localStorage.removeItem(STORAGE_KEY);
        return cachedState;
      }
      cachedState = parsed;
      return cachedState!;
    }
  } catch {}
  cachedState = { isActive: false, licenseKey: null, instanceId: null, activatedAt: null };
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
  const trimmed = licenseKey.trim();

  if (!trimmed) {
    return { success: false, error: 'Please enter a license key' };
  }

  try {
    const response = await fetch(`${API_BASE}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        license_key: trimmed,
        instance_name: 'Overtone Singer Web',
      }),
    });

    const data = await response.json();
    // Debug logging removed for production

    if (data.valid || data.activated) {
      saveLicenseState({
        isActive: true,
        licenseKey: trimmed,
        instanceId: data.instance?.id || null,
        activatedAt: Date.now(),
      });
      return { success: true };
    } else {
      // Key might already be activated — try validating instead
      if (data.error === 'license key has already been activated') {
        return await validateLicense(trimmed);
      }
      return { success: false, error: data.error || 'Invalid license key' };
    }
  } catch (err) {
    console.error('License activation error:', err);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

export async function validateLicense(licenseKey?: string): Promise<{ success: boolean; error?: string }> {
  const state = getLicenseState();
  const key = licenseKey || state.licenseKey;

  if (!key) return { success: false, error: 'No license key found' };

  try {
    const body: Record<string, string> = { license_key: key };
    if (state.instanceId) {
      body.instance_id = state.instanceId;
    }

    const response = await fetch(`${API_BASE}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams(body),
    });

    const data = await response.json();
    // Debug logging removed for production

    if (data.valid) {
      saveLicenseState({
        isActive: true,
        licenseKey: key,
        instanceId: data.instance?.id || state.instanceId,
        activatedAt: state.activatedAt || Date.now(),
      });
      return { success: true };
    } else {
      saveLicenseState({ isActive: false, licenseKey: null, instanceId: null, activatedAt: null });
      return { success: false, error: 'License key is no longer valid' };
    }
  } catch (err) {
    console.error('License validation error:', err);
    // If offline, trust the stored state
    return { success: state.isActive };
  }
}

export function deactivateLicense(): void {
  cachedState = null;
  localStorage.removeItem(STORAGE_KEY);
}
