import { useState, useEffect, useCallback } from 'react';
import { isPro, activateLicense, validateLicense, deactivateLicense, getLicenseState } from '@/lib/proLicense';

export function useProStatus() {
  const [isProUser, setIsProUser] = useState(() => isPro());
  const [isActivating, setIsActivating] = useState(false);

  // Re-validate stored license in the background on mount and periodically
  useEffect(() => {
    const state = getLicenseState();
    if (!state.licenseKey) return;

    const doValidation = () => {
      validateLicense().then((result) => {
        setIsProUser(result.success);
      }).catch(() => {
        // Network/parse error — trust stored state
      });
    };

    doValidation();

    // Re-validate every 15 minutes to catch revoked licenses and deter tampering
    const intervalId = setInterval(doValidation, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

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
