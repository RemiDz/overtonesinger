# Color Palette Restore — Match Original Spectrogram Colors

**Purpose:** Replace the current broken color palette with one that matches the original app's look exactly. The original used a classic spectrogram heatmap: black → deep blue → cyan → yellow → bright orange/amber.

**Reference:** The user's screenshot of the original palette is the source of truth.

**File:** `client/src/components/SpectrogramCanvas.tsx`

---

## COLOR-01: Replace `magnitudeToColorRGBFromScaled` with the original palette

**Find the entire `magnitudeToColorRGBFromScaled` function and replace it with:**

```typescript
    const magnitudeToColorRGBFromScaled = (
      scaled: number,
    ): { r: number; g: number; b: number } => {
      const clamped = Math.max(0, Math.min(1, scaled));

      switch (colorScheme) {
        case "warm": {
          // Warm: black → dark red → orange → gold → bright yellow
          if (clamped < 0.25) {
            const t = clamped / 0.25;
            return {
              r: Math.floor(t * 120),
              g: Math.floor(t * 10),
              b: Math.floor(t * 5),
            };
          } else if (clamped < 0.5) {
            const t = (clamped - 0.25) / 0.25;
            return {
              r: Math.floor(120 + t * 80),
              g: Math.floor(10 + t * 60),
              b: Math.floor(5),
            };
          } else if (clamped < 0.75) {
            const t = (clamped - 0.5) / 0.25;
            return {
              r: Math.floor(200 + t * 40),
              g: Math.floor(70 + t * 110),
              b: Math.floor(5 + t * 10),
            };
          } else {
            const t = (clamped - 0.75) / 0.25;
            return {
              r: Math.floor(240 + t * 15),
              g: Math.floor(180 + t * 70),
              b: Math.floor(15 + t * 60),
            };
          }
        }
        case "cool": {
          // Cool: black → dark indigo → blue → cyan → bright white-cyan
          if (clamped < 0.25) {
            const t = clamped / 0.25;
            return {
              r: Math.floor(t * 15),
              g: Math.floor(t * 10),
              b: Math.floor(t * 80),
            };
          } else if (clamped < 0.5) {
            const t = (clamped - 0.25) / 0.25;
            return {
              r: Math.floor(15 - t * 10),
              g: Math.floor(10 + t * 80),
              b: Math.floor(80 + t * 100),
            };
          } else if (clamped < 0.75) {
            const t = (clamped - 0.5) / 0.25;
            return {
              r: Math.floor(5 + t * 40),
              g: Math.floor(90 + t * 120),
              b: Math.floor(180 + t * 50),
            };
          } else {
            const t = (clamped - 0.75) / 0.25;
            return {
              r: Math.floor(45 + t * 180),
              g: Math.floor(210 + t * 45),
              b: Math.floor(230 + t * 25),
            };
          }
        }
        case "monochrome": {
          const v = Math.floor(clamped * 255);
          return { r: v, g: v, b: v };
        }
        default: {
          // Default: black → deep blue → cyan/teal → yellow → orange/amber
          // Matches the original Overtone Singer spectrogram look
          if (clamped < 0.2) {
            // Black to deep blue
            const t = clamped / 0.2;
            return {
              r: 0,
              g: Math.floor(t * 20),
              b: Math.floor(t * 100),
            };
          } else if (clamped < 0.4) {
            // Deep blue to cyan/teal
            const t = (clamped - 0.2) / 0.2;
            return {
              r: 0,
              g: Math.floor(20 + t * 150),
              b: Math.floor(100 + t * 60),
            };
          } else if (clamped < 0.6) {
            // Cyan/teal to yellow-green
            const t = (clamped - 0.4) / 0.2;
            return {
              r: Math.floor(t * 180),
              g: Math.floor(170 + t * 60),
              b: Math.floor(160 - t * 130),
            };
          } else if (clamped < 0.8) {
            // Yellow-green to bright yellow
            const t = (clamped - 0.6) / 0.2;
            return {
              r: Math.floor(180 + t * 70),
              g: Math.floor(230 + t * 20),
              b: Math.floor(30 - t * 20),
            };
          } else {
            // Bright yellow to orange/amber
            const t = (clamped - 0.8) / 0.2;
            return {
              r: Math.floor(250 + t * 5),
              g: Math.floor(250 - t * 80),
              b: Math.floor(10 + t * 10),
            };
          }
        }
      }
    };
```

**Verify:** Run `npm run build`. Record audio and compare directly to the original screenshot:
- [ ] Silence/quiet regions: black with subtle deep blue
- [ ] Low intensity: blue tones
- [ ] Mid intensity: cyan/teal transitioning to yellow
- [ ] High intensity: bright yellow
- [ ] Peak intensity: orange/amber (NOT red)
- [ ] Fundamental band should glow bright yellow/amber, matching the original
- [ ] Upper harmonics should show as yellow streaks against dark blue/black
- [ ] Overall feel matches the original screenshot exactly

Also verify the other schemes look good:
- [ ] Warm: dark → red → orange → gold → bright yellow
- [ ] Cool: dark → indigo → blue → cyan → white-cyan
- [ ] Monochrome: clean black → white
