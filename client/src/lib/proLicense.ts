// Pro License Management Module
// Integrates with LemonSqueezy license key validation API

interface LicenseState {
  isActive: boolean;
  licenseKey: string | null;
  instanceId: string | null;
}

const STORAGE_KEY = 'overtone_singer_pro';

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
  cachedState = { isActive: false, licenseKey: null, instanceId: null };
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
  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        license_key: licenseKey,
        instance_name: 'Overtone Singer Web',
      }),
    });

    const data = await response.json();
    console.log('License activation response:', data);

    if (data.valid || data.activated) {
      saveLicenseState({
        isActive: true,
        licenseKey: licenseKey,
        instanceId: data.instance?.id || null,
      });
      return { success: true };
    } else {
      // Key might already be activated — try validating instead
      if (data.error === 'license key has already been activated') {
        return await validateLicense(licenseKey);
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

    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams(body),
    });

    const data = await response.json();
    console.log('License validation response:', data);

    if (data.valid) {
      saveLicenseState({
        isActive: true,
        licenseKey: key,
        instanceId: data.instance?.id || state.instanceId,
      });
      return { success: true };
    } else {
      saveLicenseState({ isActive: false, licenseKey: null, instanceId: null });
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
