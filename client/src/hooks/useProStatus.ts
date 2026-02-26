// TEMP: All features unlocked — re-enable Pro gating later
import { useState, useEffect, useCallback } from 'react';
import { isPro, activateLicense, validateLicense, deactivateLicense, getLicenseState } from '@/lib/proLicense';

export function useProStatus() {
  // TEMP: All features unlocked — re-enable Pro gating later
  const [isProUser, setIsProUser] = useState(true);
  const [isActivating, setIsActivating] = useState(false);

  /* TEMP: Skipping license validation — all features unlocked
  // Re-validate stored license in the background on mount
  useEffect(() => {
    const state = getLicenseState();
    if (state.licenseKey) {
      validateLicense().then((result) => {
        setIsProUser(result.success);
      }).catch(() => {
        // Network/parse error — trust stored state
      });
    }
  }, []);
  */

  const activate = useCallback(async (licenseKey: string): Promise<{ success: boolean; error?: string }> => {
    setIsActivating(true);
    try {
      const result = await activateLicense(licenseKey);
      if (result.success) {
        setIsProUser(true);
      }
      return result;
    } finally {
      setIsActivating(false);
    }
  }, []);

  const deactivate = useCallback(() => {
    deactivateLicense();
    setIsProUser(false);
  }, []);

  return {
    isPro: isProUser,
    isActivating,
    activate,
    deactivate,
  };
}
