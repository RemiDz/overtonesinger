# Harmonic Label Readability Fix

**Purpose:** Improve readability of harmonic marker labels (H1, H2, H3...) on the spectrogram, which are currently unreadable against bright red/yellow frequency data on mobile devices.

**File:** `client/src/components/SpectrogramCanvas.tsx`

---

## FIX-A: Add dark pill backgrounds behind harmonic labels

**Problem:** The harmonic labels ("H1 Fund. 131", "H2 Oct 262", etc.) are rendered as semi-transparent text directly on the spectrogram. Against hot (red/yellow) regions they disappear completely. The overtone counter box already uses a dark rounded-rect background which works great — apply the same treatment to harmonic labels.

**Find this block inside `drawFrequencyMarkers` (the section that draws each label):**

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

**Replace with:**

```typescript
      filteredMarkers.forEach(({ freq, y, isFundamental, alpha, harmonicIndex }) => {
        ctx.strokeStyle = `hsl(${primaryColor} / ${alpha})`;
        ctx.lineWidth = isFundamental ? 2 : 1.5;
        ctx.setLineDash(isFundamental ? [8, 4] : [4, 2]);

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // Build label: "H1 Fund. 131" or "H3 5th 393"
        const intervalName = HARMONIC_LABELS[harmonicIndex] || "";
        const hzLabel = `${Math.round(freq)}`;
        const label = `H${harmonicIndex} ${intervalName} ${hzLabel}`;

        ctx.font = isFundamental
          ? "bold 11px Inter, sans-serif"
          : "10px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        // Measure label so we can draw a fitted dark pill behind it
        const labelX = padding.left + 4;
        const labelY = y - 2;
        const textWidth = ctx.measureText(label).width;
        const pillPadH = 4;
        const pillPadV = 3;
        const pillX = labelX - pillPadH;
        const pillY = labelY - 6 - pillPadV;
        const pillW = textWidth + pillPadH * 2;
        const pillH = 12 + pillPadV * 2;

        // Dark pill background
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 3);
        ctx.fill();

        // Label text
        ctx.fillStyle = isFundamental
          ? `hsl(${primaryColor} / 1.0)`
          : `hsl(${primaryColor} / ${Math.min(0.95, alpha + 0.3)})`;
        ctx.fillText(label, labelX, labelY);
      });
```

**Verify:** Run `npm run build`. Record audio with harmonics visible — each label should sit inside a small dark rounded box, clearly readable even against bright red/yellow spectrogram regions.

---

## FIX-B: Dim the left-edge frequency scale labels when harmonic markers are active

**Problem:** The Y-axis frequency labels (500, 1k, 1.5k, 2k, 3k) and the harmonic labels (H1, H2, H3...) both sit on the left side of the chart, competing for visual attention. When harmonic detection is active, the Hz scale becomes secondary information.

**Find this block inside `drawFrequencyScale`:**

```typescript
      ctx.fillStyle = cachedColors.fg;
```

**Note:** The exact line may be `ctx.fillStyle = cachedColors.fg;` or ``ctx.fillStyle = `hsl(${fgColor})`;`` depending on how FIX-06 was applied. Find whichever is used for the frequency label fill color.

**Replace with:**

```typescript
      ctx.fillStyle = showFrequencyMarkers
        ? "rgba(255, 255, 255, 0.3)"
        : cachedColors.fg;
```

**Important:** `drawFrequencyScale` needs access to the `showFrequencyMarkers` prop for this to work. If it doesn't already have it, you'll need to either:
- Pass it as a parameter from `drawSpectrogram()`, or
- Since `showFrequencyMarkers` is already in the component's closure scope, just reference it directly (it's available as a prop to the component)

Since all the draw functions are defined inside the component's `forwardRef` closure, `showFrequencyMarkers` should already be accessible. Confirm it works by checking that the function can read the prop without passing it explicitly.

**Verify:** Run `npm run build`. Record audio — the left-side Hz labels (500, 1k, etc.) should appear dimmer when harmonic markers are showing, making the H1/H2/H3 labels stand out as the primary reference.

---

## FIX-C: Also add pill background to the target guide label

**Problem:** The target harmonic guide label (e.g. "→ H5 M3 655Hz") has the same readability issue — it's rendered as bare text on the right side of the spectrogram.

**Find this block inside `drawTargetGuide`:**

```typescript
      // Target label on right side
      const intervalName = HARMONIC_LABELS[targetHarmonic] || "";
      const label = `→ H${targetHarmonic} ${intervalName} ${Math.round(targetFreq)}Hz`;
      ctx.fillStyle = guideColor;
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(label, padding.left + chartWidth - 4, targetY - 8);
```

**Replace with:**

```typescript
      // Target label on right side
      const intervalName = HARMONIC_LABELS[targetHarmonic] || "";
      const label = `→ H${targetHarmonic} ${intervalName} ${Math.round(targetFreq)}Hz`;
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      // Dark pill behind target label
      const targetLabelX = padding.left + chartWidth - 4;
      const targetLabelY = targetY - 8;
      const targetTextWidth = ctx.measureText(label).width;
      const tPadH = 5;
      const tPadV = 3;
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.beginPath();
      ctx.roundRect(
        targetLabelX - targetTextWidth - tPadH,
        targetLabelY - 6 - tPadV,
        targetTextWidth + tPadH * 2,
        12 + tPadV * 2,
        3,
      );
      ctx.fill();

      ctx.fillStyle = guideColor;
      ctx.fillText(label, targetLabelX, targetLabelY);
```

**Verify:** Run `npm run build`. Enable a target harmonic (H2–H8) and record — the target label on the right side should have a dark background behind it.

---

## FIX-D: Add pill background to the target hit indicator

**Problem:** The "✓" checkmark when hitting a target harmonic is also bare text.

**Find this block inside `drawTargetGuide`:**

```typescript
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
      // Hit indicator
      if (isHitting) {
        const checkX = padding.left + chartWidth - 60;
        const checkY = targetY - 8;
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.beginPath();
        ctx.roundRect(checkX - 9, checkY - 9, 18, 18, 3);
        ctx.fill();
        ctx.fillStyle = "rgba(0, 255, 120, 0.9)";
        ctx.font = "bold 12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✓", checkX, checkY);
      }
```

**Verify:** Run `npm run build`. Hit a target harmonic while recording — the green checkmark should sit inside a small dark box.

---

## Final Verification

After all four fixes:

1. `npm run build` — zero errors
2. Record overtone singing on a phone and check:
   - [ ] H1–H10+ labels are readable against all spectrogram colors
   - [ ] Each label has a dark rounded pill behind it
   - [ ] Left-side Hz labels (500, 1k, 2k...) are dimmer, not competing with harmonic labels
   - [ ] Target guide label (when enabled) has a dark pill background
   - [ ] Hit checkmark has a dark background
   - [ ] Overall visual hierarchy: overtone counter > harmonic labels > target guide > Hz scale
