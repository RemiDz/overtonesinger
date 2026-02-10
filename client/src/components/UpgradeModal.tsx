import { useState, useEffect } from 'react';
import { X, Star, Check, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHECKOUT_URL = 'https://overtonesinger.lemonsqueezy.com/checkout/buy/1a0259a4-5c30-4ccb-82ff-8a8c4b011156';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onActivate: (key: string) => Promise<{ success: boolean; error?: string }>;
  isActivating: boolean;
}

export function UpgradeModal({ open, onClose, onActivate, isActivating }: UpgradeModalProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal reopens
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
      setLicenseKey('');
    }
  }, [open]);

  if (!open) return null;

  const handleActivate = async () => {
    const trimmedKey = licenseKey.trim();
    if (!trimmedKey) {
      setError('Please enter a license key');
      return;
    }

    setError(null);
    const result = await onActivate(trimmedKey);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setLicenseKey('');
      }, 1500);
    } else {
      setError(result.error || 'Activation failed');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isActivating) {
      handleActivate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pt-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-3">
              <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
              <h2 className="text-xl font-bold text-foreground">Overtone Singer Pro</h2>
            </div>
            <p className="text-sm text-muted-foreground">Unlock premium features</p>
          </div>

          {/* Feature list */}
          <div className="space-y-2.5 mb-6">
            {[
              'Unlimited session length',
              'Repeat/loop playback',
              'Frequency band isolation',
              'Harmonic overtone overlay',
              'High-res PNG export',
              'Video & WAV recording export',
              'Advanced color schemes',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-sm text-foreground/90">
                <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Buy button */}
          <Button
            className="w-full h-11 text-base font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 mb-6"
            onClick={() => window.open(CHECKOUT_URL, '_blank', 'noopener,noreferrer')}
          >
            Buy Pro — $6.99
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">Already purchased?</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* License key input */}
          {success ? (
            <div className="flex items-center justify-center gap-2 py-3 text-emerald-400 font-medium">
              <Check className="h-5 w-5" />
              <span>Pro activated!</span>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => {
                  setLicenseKey(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter license key..."
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                disabled={isActivating}
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <Button
                variant="outline"
                className="w-full h-10"
                onClick={handleActivate}
                disabled={isActivating || !licenseKey.trim()}
              >
                {isActivating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Small lock badge component for indicating locked features
export function ProBadge({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-400/80 hover:text-amber-400 transition-colors"
      title="Pro feature"
    >
      <Lock className="h-3 w-3" />
    </button>
  );
}
