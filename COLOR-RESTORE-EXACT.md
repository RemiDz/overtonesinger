# Color Palette Restore — Exact Original Code from Git History

**Purpose:** Replace the current broken color palette with the **exact original code** recovered from git commit `0016966`. This is the function that was accidentally deleted in commit `a863fd2` ("fix: 9 bugs"), which caused BUG-01.

**File:** `client/src/components/SpectrogramCanvas.tsx`

---

## Replace `magnitudeToColorRGBFromScaled` with the exact original

**Find the entire `magnitudeToColorRGBFromScaled` function (whatever version is currently there) and replace it with this — the original code verbatim from the git history:**

```typescript
    const magnitudeToColorRGBFromScaled = (
      scaled: number,
    ): { r: number; g: number; b: number } => {
      const clamped = Math.max(0, Math.min(1, scaled));

      switch (colorScheme) {
        case "warm":
          if (clamped < 0.25) {
            const t = clamped / 0.25;
            return { r: Math.floor(80 + t * 100), g: Math.floor(40 * t), b: 0 };
          } else if (clamped < 0.6) {
            const t = (clamped - 0.25) / 0.35;
            return { r: Math.floor(180 + t * 75), g: Math.floor(40 + t * 120), b: 0 };
          } else {
            const t = (clamped - 0.6) / 0.4;
            return { r: 255, g: Math.floor(160 + t * 95), b: Math.floor(t * 100) };
          }

        case "cool":
          if (clamped < 0.25) {
            const t = clamped / 0.25;
            return { r: 0, g: Math.floor(50 * t), b: Math.floor(100 + t * 155) };
          } else if (clamped < 0.6) {
            const t = (clamped - 0.25) / 0.35;
            return { r: 0, g: Math.floor(50 + t * 155), b: Math.floor(200 - t * 50) };
          } else {
            const t = (clamped - 0.6) / 0.4;
            return { r: Math.floor(t * 100), g: Math.floor(205 + t * 50), b: Math.floor(150 + t * 105) };
          }

        case "monochrome":
          const gray = Math.floor(clamped * 255);
          return { r: gray, g: gray, b: gray };

        case "default":
        default:
          if (clamped < 0.2) {
            const t = clamped / 0.2;
            return { r: 0, g: 0, b: Math.floor(128 + t * 127) };
          } else if (clamped < 0.5) {
            const t = (clamped - 0.2) / 0.3;
            return { r: 0, g: Math.floor(t * 255), b: 255 };
          } else if (clamped < 0.8) {
            const t = (clamped - 0.5) / 0.3;
            return { r: Math.floor(t * 255), g: 255, b: Math.floor(255 - t * 255) };
          } else {
            const t = (clamped - 0.8) / 0.2;
            return { r: 255, g: Math.floor(255 - t * 100), b: 0 };
          }
      }
    };
```

**That's it. One function replacement. No other changes needed.**

**Verify:** Run `npm run build`. Record audio and confirm the spectrogram looks identical to the original — black → deep blue → cyan → yellow → orange/amber.
