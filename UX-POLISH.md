# UX Polish — Label Redesign & Color Palette Rework

**Purpose:** Replace the current harmonic label approach and color palette with a design appropriate for a paid sound healing tool. The previous LABEL-FIXES.md changes should be fully reverted before applying these fixes.

**Pre-requisite:** Revert all changes from LABEL-FIXES.md (FIX-A, FIX-B, FIX-C, FIX-D). The starting point should be the codebase as it was after the original FIXES.md was applied, before LABEL-FIXES.md.

**File:** `client/src/components/SpectrogramCanvas.tsx`

---

## UX-01: Rework the default color palette for sound healing context

**Problem:** The current default color scheme ramps aggressively into red for the top 25% of intensity. Red is associated with stress and alarm — completely wrong for a sound healing practice tool. The fundamental frequency band shows as a wall of fire-engine red, which is visually harsh and unpleasant during extended practice sessions.

**Design intent:** The default palette should feel meditative and warm. Deep indigo for silence, flowing through teal and green into warm amber/gold at high intensity. Bright white-gold only at absolute peak. No harsh red at all in the default scheme.

**Find the `magnitudeToColorRGBFromScaled` function (added in FIXES.md FIX-01) and replace the entire function with:**

```typescript
    const magnitudeToColorRGBFromScaled = (
      scaled: number,
    ): { r: number; g: number; b: number } => {
      const clamped = Math.max(0, Math.min(1, scaled));

      switch (colorScheme) {
        case "warm": {
          // Warm scheme: deep brown → burnt orange → amber → bright gold
          if (clamped < 0.25) {
            const t = clamped / 0.25;
            return {
              r: Math.floor(40 + t * 60),
              g: Math.floor(t * 25),
              b: Math.floor(t * 5),
            };
          } else if (clamped < 0.5) {
            const t = (clamped - 0.25) / 0.25;
            return {
              r: Math.floor(100 + t * 80),
              g: Math.floor(25 + t * 55),
              b: Math.floor(5 + t * 5),
            };
          } else if (clamped < 0.75) {
            const t = (clamped - 0.5) / 0.25;
            return {
              r: Math.floor(180 + t * 55),
              g: Math.floor(80 + t * 100),
              b: Math.floor(10 + t * 15),
            };
          } else {
            const t = (clamped - 0.75) / 0.25;
            return {
              r: Math.floor(235 + t * 20),
              g: Math.floor(180 + t * 60),
              b: Math.floor(25 + t * 100),
            };
          }
        }
        case "cool": {
          // Cool scheme: deep navy → blue → cyan → bright mint
          if (clamped < 0.25) {
            const t = clamped / 0.25;
            return {
              r: Math.floor(t * 10),
              g: Math.floor(t * 30),
              b: Math.floor(30 + t * 70),
            };
          } else if (clamped < 0.5) {
            const t = (clamped - 0.25) / 0.25;
            return {
              r: Math.floor(10 + t * 10),
              g: Math.floor(30 + t * 100),
              b: Math.floor(100 + t * 80),
            };
          } else if (clamped < 0.75) {
            const t = (clamped - 0.5) / 0.25;
            return {
              r: Math.floor(20 + t * 60),
              g: Math.floor(130 + t * 90),
              b: Math.floor(180 + t * 40),
            };
          } else {
            const t = (clamped - 0.75) / 0.25;
            return {
              r: Math.floor(80 + t * 120),
              g: Math.floor(220 + t * 35),
              b: Math.floor(220 + t * 35),
            };
          }
        }
        case "monochrome": {
          const v = Math.floor(clamped * 255);
          return { r: v, g: v, b: v };
        }
        default: {
          // Default scheme: deep indigo → teal → green → amber/gold → white-gold
          // Designed for extended sound healing practice — no harsh red
          if (clamped < 0.2) {
            // Silence → deep indigo
            const t = clamped / 0.2;
            return {
              r: Math.floor(t * 20),
              g: Math.floor(t * 10),
              b: Math.floor(30 + t * 60),
            };
          } else if (clamped < 0.4) {
            // Low → teal
            const t = (clamped - 0.2) / 0.2;
            return {
              r: Math.floor(20 - t * 10),
              g: Math.floor(10 + t * 110),
              b: Math.floor(90 + t * 70),
            };
          } else if (clamped < 0.6) {
            // Medium → green
            const t = (clamped - 0.4) / 0.2;
            return {
              r: Math.floor(10 + t * 80),
              g: Math.floor(120 + t * 80),
              b: Math.floor(160 - t * 100),
            };
          } else if (clamped < 0.8) {
            // Strong → warm amber/gold
            const t = (clamped - 0.6) / 0.2;
            return {
              r: Math.floor(90 + t * 145),
              g: Math.floor(200 - t * 20),
              b: Math.floor(60 - t * 40),
            };
          } else {
            // Peak → bright white-gold
            const t = (clamped - 0.8) / 0.2;
            return {
              r: Math.floor(235 + t * 20),
              g: Math.floor(180 + t * 65),
              b: Math.floor(20 + t * 160),
            };
          }
        }
      }
    };
```

**Verify:** Run `npm run build`. Record audio — the fundamental band should glow in warm amber/gold tones rather than harsh red. Quiet regions should be deep indigo/teal. The overall feel should be calming and meditative. Cycle through all four schemes (default, warm, cool, monochrome) and confirm each looks intentional and distinct.

---

## UX-02: Redesign harmonic labels for mobile readability

**Problem:** The current labels try to show too much ("H1 Fund. 131", "H5 M3 655") in tiny text overlaid directly on the spectrogram. On mobile this is unreadable regardless of background treatment. Adding pill backgrounds just made them take up more space while still being too small to read.

**Design intent:** On mobile, what matters is *which harmonic number* the singer is producing. The interval name and Hz value are secondary — useful for study but not during live practice. Move labels to compact right-edge badges that stay out of the spectrogram data. The harmonic line itself already shows *where* on the frequency axis it sits.

**Find the entire `filteredMarkers.forEach(...)` block inside `drawFrequencyMarkers` and replace it.**

Find:
```typescript
      filteredMarkers.forEach(({ freq, y, isFundamental, alpha, harmonicIndex }) => {
        ctx.strokeStyle = `hsl(${primaryColor} / ${alpha})`;
        ctx.lineWidth = isFundamental ? 2 : 1.5;
        ctx.setLineDash(isFundamental ? [8, 4] : [4, 2]);

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // Build label: "H1 Fund. 131Hz" or "H3 5th 393Hz"
        const intervalName = HARMONIC_LABELS[harmonicIndex] || "";
        const hzLabel = `${Math.round(freq)}`;
        const label = `H${harmonicIndex} ${intervalName} ${hzLabel}`;

        ctx.fillStyle = `hsl(${primaryColor} / ${Math.min(0.9, alpha + 0.2)})`;
        ctx.font = isFundamental
          ? "bold 11px Inter, sans-serif"
          : "10px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, 2, y - 2);
      });
```

Replace with:
```typescript
      filteredMarkers.forEach(({ freq, y, isFundamental, alpha, harmonicIndex }) => {
        // Harmonic line across the spectrogram
        ctx.strokeStyle = `hsl(${primaryColor} / ${alpha * 0.6})`;
        ctx.lineWidth = isFundamental ? 1.5 : 1;
        ctx.setLineDash(isFundamental ? [6, 4] : [3, 3]);

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // Compact right-edge badge: "H1" or "H5"
        // Fundamental gets a slightly larger badge with Hz value
        const shortLabel = `H${harmonicIndex}`;
        const badgeFont = isFundamental ? "bold 10px Inter, sans-serif" : "9px Inter, sans-serif";
        ctx.font = badgeFont;

        const badgeText = isFundamental
          ? `${shortLabel} ${Math.round(freq)}`
          : shortLabel;

        const textWidth = ctx.measureText(badgeText).width;
        const badgePadH = 4;
        const badgePadV = 2;
        const badgeH = (isFundamental ? 12 : 10) + badgePadV * 2;
        const badgeW = textWidth + badgePadH * 2;
        const badgeX = padding.left + chartWidth - badgeW - 2;
        const badgeY = y - badgeH / 2;

        // Badge background
        ctx.fillStyle = isFundamental ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.65)";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
        ctx.fill();

        // Badge border
        ctx.strokeStyle = `hsl(${primaryColor} / ${isFundamental ? 0.6 : 0.3})`;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
        ctx.stroke();

        // Badge text
        ctx.fillStyle = isFundamental
          ? `hsl(${primaryColor} / 1.0)`
          : `hsl(${primaryColor} / ${Math.min(0.9, alpha + 0.3)})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
      });
```

**Verify:** Run `npm run build`. Record audio with harmonics visible:
- Each harmonic line should have a small badge pinned to the right edge
- Fundamental shows "H1 211" (with Hz), all others show just "H2", "H3", etc.
- Badges should be clearly readable against any spectrogram color
- The spectrogram data is not obscured — badges sit at the edge, lines are subtle
- No content pushed left or creating blank gaps

---

## UX-03: Clean up the target guide label

**Problem:** The target guide label ("→ H5 M3 655Hz") is also overlaid text that can be hard to read.

**Find the target label section inside `drawTargetGuide`:**

```typescript
      // Target label on right side
      const intervalName = HARMONIC_LABELS[targetHarmonic] || "";
      const label = `→ H${targetHarmonic} ${intervalName} ${Math.round(targetFreq)}Hz`;
      ctx.fillStyle = guideColor;
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(label, padding.left + chartWidth - 4, targetY - 8);

      // Hit indicator
      if (isHitting) {
        ctx.fillStyle = "rgba(0, 255, 120, 0.9)";
        ctx.font = "bold 12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("✓", padding.left + chartWidth - 60, targetY - 8);
      }
```

**Replace with:**

```typescript
      // Target badge on right side — compact with dark background
      const intervalName = HARMONIC_LABELS[targetHarmonic] || "";
      const targetLabel = isHitting
        ? `✓ H${targetHarmonic} ${intervalName}`
        : `→ H${targetHarmonic} ${intervalName}`;

      ctx.font = "bold 10px Inter, sans-serif";
      const targetTextWidth = ctx.measureText(targetLabel).width;
      const tBadgePadH = 5;
      const tBadgePadV = 3;
      const tBadgeW = targetTextWidth + tBadgePadH * 2;
      const tBadgeH = 14 + tBadgePadV * 2;
      const tBadgeX = padding.left + chartWidth - tBadgeW - 2;
      const tBadgeY = targetY - 12 - tBadgeH;

      // Badge background
      ctx.fillStyle = isHitting ? "rgba(0, 40, 20, 0.85)" : "rgba(0, 0, 0, 0.75)";
      ctx.beginPath();
      ctx.roundRect(tBadgeX, tBadgeY, tBadgeW, tBadgeH, 4);
      ctx.fill();

      // Badge border
      ctx.strokeStyle = isHitting ? "rgba(0, 255, 120, 0.5)" : "rgba(255, 200, 0, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.roundRect(tBadgeX, tBadgeY, tBadgeW, tBadgeH, 4);
      ctx.stroke();

      // Badge text
      ctx.fillStyle = guideColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(targetLabel, tBadgeX + tBadgeW / 2, tBadgeY + tBadgeH / 2);
```

**Verify:** Run `npm run build`. Enable a target harmonic and record. The target should show as a clean badge above the target line. When hitting the harmonic, it should show "✓ H5 M3" in green with a subtle green-tinted background. No separate floating checkmark.

---

## UX-04: Soften the harmonic detection lines

**Problem:** The current harmonic marker lines are too prominent, drawing attention away from the actual spectrogram data. For a paid tool the data visualisation should be the hero, with markers being subtle guides.

This is already partially addressed in UX-02 above (thinner lines, lower alpha). However, the line dash pattern also needs updating for the fundamental to feel less "technical" and more refined.

**No separate code change needed** — UX-02 already applies:
- Reduced line width: fundamental 1.5px (was 2), overtones 1px (was 1.5)
- Lower alpha: multiplied by 0.6
- Softer dash pattern: [6, 4] for fundamental, [3, 3] for overtones

**Verify:** After UX-02, the lines should feel like gentle guides rather than aggressive overlays.

---

## Final Verification Checklist

After all fixes:

1. `npm run build` — zero errors
2. On a phone, record overtone singing and verify:
   - [ ] Default color scheme: deep indigo → teal → green → amber/gold → white-gold at peaks
   - [ ] No harsh red in the default scheme
   - [ ] Fundamental band glows warm amber/gold, not fire-engine red
   - [ ] Warm scheme: browns → orange → amber → gold
   - [ ] Cool scheme: navy → blue → cyan → mint
   - [ ] Monochrome: clean black → white gradient
   - [ ] Harmonic badges are small, right-aligned, clearly readable
   - [ ] Fundamental badge shows "H1 [freq]", others show just "H2", "H3", etc.
   - [ ] No wasted screen space or gaps on the left edge
   - [ ] Harmonic lines are subtle, not overpowering the data
   - [ ] Target guide (when enabled) shows as a clean badge
   - [ ] Overall feel is calm, professional, and meditative — worthy of a paid tool
3. Compare before/after on both phone and desktop to confirm improvement
