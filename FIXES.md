# Overtone Singer — Bug Fix Instructions

**Purpose:** This document contains 17 bug fixes to be applied sequentially to the Overtone Singer codebase. Apply each fix one at a time, verify it compiles/works, then move to the next.

**Repo:** GitHub Pages React app (Vite + TypeScript)  
**Build command:** `npm run build`  
**Dev command:** `npm run dev`

---

## FIX-01: Add missing `magnitudeToColorRGBFromScaled()` function [CRITICAL]

**File:** `client/src/components/SpectrogramCanvas.tsx`

**Problem:** The function `magnitudeToColorRGBFromScaled()` is called on lines 562 and 672 but is never defined. The app crashes with a `ReferenceError` when rendering any spectrogram data.

**Action:** Find the existing `applyIntensityScaling` function and add the new function immediately after it. The new function must be placed inside the `forwardRef` closure so it has access to the `colorScheme` prop.

**Find this block:**
```typescript
    const applyIntensityScaling = (magnitude: number): number => {
      const boost = intensityBoost / 100;
      let scaled = magnitude * boost;

      switch (intensityScale) {
        case "linear":
          scaled = Math.max(0, Math.min(1, scaled));
          break;

        case "logarithmic":
          if (scaled <= 0) {
            scaled = 0;
          } else {
            const logScaled = Math.log10(1 + scaled * 9) / Math.log10(10);
            scaled = Math.max(0, Math.min(1, logScaled));
          }
          break;

        case "power":
          const powered = Math.pow(scaled, 0.5);
          scaled = Math.max(0, Math.min(1, powered));
          break;

        default:
          scaled = Math.max(0, Math.min(1, scaled));
      }

      const brightnessMultiplier = brightness / 100;
      return Math.max(0, Math.min(1, scaled * brightnessMultiplier));
    };
```

**Replace with:**
```typescript
    const applyIntensityScaling = (magnitude: number): number => {
      const boost = intensityBoost / 100;
      let scaled = magnitude * boost;

      switch (intensityScale) {
        case "linear":
          scaled = Math.max(0, Math.min(1, scaled));
          break;

        case "logarithmic":
          if (scaled <= 0) {
            scaled = 0;
          } else {
            const logScaled = Math.log10(1 + scaled * 9) / Math.log10(10);
            scaled = Math.max(0, Math.min(1, logScaled));
          }
          break;

        case "power":
          const powered = Math.pow(scaled, 0.5);
          scaled = Math.max(0, Math.min(1, powered));
          break;

        default:
          scaled = Math.max(0, Math.min(1, scaled));
      }

      const brightnessMultiplier = brightness / 100;
      return Math.max(0, Math.min(1, scaled * brightnessMultiplier));
    };

    const magnitudeToColorRGBFromScaled = (
      scaled: number,
    ): { r: number; g: number; b: number } => {
      const clamped = Math.max(0, Math.min(1, scaled));

      switch (colorScheme) {
        case "warm": {
          const r = Math.floor(Math.min(255, clamped * 3 * 255));
          const g = Math.floor(
            Math.min(255, Math.max(0, (clamped - 0.33) * 3) * 255),
          );
          const b = Math.floor(
            Math.min(255, Math.max(0, (clamped - 0.66) * 3) * 200),
          );
          return { r, g, b };
        }
        case "cool": {
          const r = Math.floor(Math.max(0, (clamped - 0.66) * 3) * 200);
          const g = Math.floor(
            Math.min(255, Math.max(0, (clamped - 0.33) * 3) * 255),
          );
          const b = Math.floor(Math.min(255, clamped * 2 * 255));
          return { r, g, b };
        }
        case "monochrome": {
          const v = Math.floor(clamped * 255);
          return { r: v, g: v, b: v };
        }
        default: {
          // 'default' — blue → cyan → yellow → red
          if (clamped < 0.25) {
            const t = clamped / 0.25;
            return {
              r: 0,
              g: Math.floor(t * 150),
              b: Math.floor(80 + t * 175),
            };
          } else if (clamped < 0.5) {
            const t = (clamped - 0.25) / 0.25;
            return {
              r: 0,
              g: Math.floor(150 + t * 105),
              b: Math.floor(255 - t * 55),
            };
          } else if (clamped < 0.75) {
            const t = (clamped - 0.5) / 0.25;
            return {
              r: Math.floor(t * 255),
              g: 255,
              b: Math.floor(200 - t * 200),
            };
          } else {
            const t = (clamped - 0.75) / 0.25;
            return {
              r: 255,
              g: Math.floor(255 - t * 255),
              b: 0,
            };
          }
        }
      }
    };
```

**Verify:** Run `npm run build`. The build should succeed. Run `npm run dev`, record audio — you should see a colorful spectrogram rendering without any console errors.

---

## FIX-02: Fix favicon 404 on GitHub Pages

**File:** `client/index.html`

**Problem:** Favicon uses absolute root path `/favicon.png` which 404s on GitHub Pages because the app is served from `/overtonesinger/`.

**Find:**
```html
<link rel="icon" type="image/png" href="/favicon.png" />
```

**Replace with:**
```html
<link rel="icon" type="image/png" href="favicon.png" />
```

**Verify:** Run `npm run build`, check that `dist/favicon.png` exists. After deployment, the favicon should appear in the browser tab.

---

## FIX-03: Fix `Math.max()` stack overflow in `applyDeclutter()`

**File:** `client/src/components/SpectrogramCanvas.tsx`

**Problem:** `Math.max(...magnitudes)` spreads the entire frequency array as function arguments. With FFT size 32768 (16384 bins), this exceeds the call stack limit and crashes the app.

**Find:**
```typescript
    const applyDeclutter = (
      magnitudes: number[],
      threshold: number,
    ): number[] => {
      if (threshold === 0) return magnitudes;

      const maxMagnitude = Math.max(...magnitudes);

      const noiseGateThreshold = maxMagnitude * threshold;

      const result = magnitudes.map((mag) => {
        if (mag < noiseGateThreshold) {
          return 0;
        }
        return mag;
      });

      return result;
    };
```

**Replace with:**
```typescript
    const applyDeclutter = (
      magnitudes: number[],
      threshold: number,
    ): number[] => {
      if (threshold === 0) return magnitudes;

      let maxMagnitude = 0;
      for (let i = 0; i < magnitudes.length; i++) {
        if (magnitudes[i] > maxMagnitude) maxMagnitude = magnitudes[i];
      }

      const noiseGateThreshold = maxMagnitude * threshold;

      const result = magnitudes.map((mag) => {
        if (mag < noiseGateThreshold) {
          return 0;
        }
        return mag;
      });

      return result;
    };
```

**Verify:** Run `npm run build`. In the app, set FFT size to 32768 via Advanced Settings, set declutter/contrast slider above 0, and record — it should not crash.

---

## FIX-04: Eliminate double computation of `detectDominantFrequencies()`

**File:** `client/src/components/SpectrogramCanvas.tsx`

**Problem:** `detectDominantFrequencies()` is an expensive function that iterates all visible frames, computes averages, finds peaks, and does harmonic matching. It is called once in `drawFrequencyMarkers()` and again identically in `drawTargetGuide()` — wasting half the computation budget.

**Action Step 1:** Change `drawFrequencyMarkers` to accept and return the detected harmonics.

**Find:**
```typescript
    const drawFrequencyMarkers = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      chartWidth: number,
      chartHeight: number,
    ) => {
      if (!spectrogramData || spectrogramData.frequencies.length === 0) return;

      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor = computedStyle.getPropertyValue("--primary");

      const logMin = Math.log10(minFrequency);
      const logMax = Math.log10(maxFrequency);

      const detectedHarmonics = detectDominantFrequencies(
        spectrogramData.frequencies,
      );
```

**Replace with:**
```typescript
    const drawFrequencyMarkers = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      chartWidth: number,
      chartHeight: number,
      precomputedHarmonics?: ReturnType<typeof detectDominantFrequencies>,
    ) => {
      if (!spectrogramData || spectrogramData.frequencies.length === 0) return;

      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor = computedStyle.getPropertyValue("--primary");

      const logMin = Math.log10(minFrequency);
      const logMax = Math.log10(maxFrequency);

      const detectedHarmonics = precomputedHarmonics ?? detectDominantFrequencies(
        spectrogramData.frequencies,
      );
```

**Action Step 2:** Change `drawTargetGuide` to accept pre-computed harmonics.

**Find:**
```typescript
    const drawTargetGuide = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      chartWidth: number,
      chartHeight: number,
    ) => {
      if (!targetHarmonic || !spectrogramData || spectrogramData.frequencies.length === 0) return;

      const detectedHarmonics = detectDominantFrequencies(spectrogramData.frequencies);
      if (detectedHarmonics.length === 0) return;
```

**Replace with:**
```typescript
    const drawTargetGuide = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      chartWidth: number,
      chartHeight: number,
      precomputedHarmonics?: ReturnType<typeof detectDominantFrequencies>,
    ) => {
      if (!targetHarmonic || !spectrogramData || spectrogramData.frequencies.length === 0) return;

      const detectedHarmonics = precomputedHarmonics ?? detectDominantFrequencies(spectrogramData.frequencies);
      if (detectedHarmonics.length === 0) return;
```

**Action Step 3:** In `drawSpectrogram()`, compute once and pass to both.

**Find:**
```typescript
      if (showFrequencyMarkers) {
        const overtoneCount =
          drawFrequencyMarkers(ctx, padding, chartWidth, chartHeight) || 0;

        if (isRecording) {
          if (overtoneCount > currentOvertoneCount) {
            setCurrentOvertoneCount(overtoneCount);
          }
        } else {
          setCurrentOvertoneCount(overtoneCount);
        }

        if (overtoneCount > maxOvertoneCount) {
          setMaxOvertoneCount(overtoneCount);
        }
      }

      // drawOvertoneCounter(ctx, padding, currentOvertoneCount, maxOvertoneCount);

      if (targetHarmonic && showFrequencyMarkers) {
        drawTargetGuide(ctx, padding, chartWidth, chartHeight);
      }
```

**Replace with:**
```typescript
      // Pre-compute harmonic detection once for both markers and target guide
      const detectedHarmonics = showFrequencyMarkers && spectrogramData && spectrogramData.frequencies.length > 0
        ? detectDominantFrequencies(spectrogramData.frequencies)
        : [];

      if (showFrequencyMarkers) {
        const overtoneCount =
          drawFrequencyMarkers(ctx, padding, chartWidth, chartHeight, detectedHarmonics) || 0;

        if (isRecording) {
          if (overtoneCount > currentOvertoneCount) {
            setCurrentOvertoneCount(overtoneCount);
          }
        } else {
          setCurrentOvertoneCount(overtoneCount);
        }

        if (overtoneCount > maxOvertoneCount) {
          setMaxOvertoneCount(overtoneCount);
        }
      }

      if (targetHarmonic && showFrequencyMarkers) {
        drawTargetGuide(ctx, padding, chartWidth, chartHeight, detectedHarmonics);
      }
```

**Verify:** Run `npm run build`. Record audio with harmonic target enabled — markers and target guide should still render correctly, but performance should be noticeably smoother.

---

## FIX-05: Replace overtone counter state with refs to prevent re-render cascade

**File:** `client/src/components/SpectrogramCanvas.tsx`

**Problem:** `setCurrentOvertoneCount()` and `setMaxOvertoneCount()` are called from inside the canvas drawing `useEffect`, causing React to schedule new renders during the drawing loop. At 60fps during recording, this creates cascading unnecessary re-renders.

**Action Step 1:** Find the state declarations and replace with refs.

**Find:**
```typescript
    const [currentOvertoneCount, setCurrentOvertoneCount] = useState(0);
    const [maxOvertoneCount, setMaxOvertoneCount] = useState(0);
```

**Replace with:**
```typescript
    const currentOvertoneCountRef = useRef(0);
    const maxOvertoneCountRef = useRef(0);
```

**Action Step 2:** Update the reset effect.

**Find:**
```typescript
    useEffect(() => {
      if (!spectrogramData || spectrogramData.frequencies.length === 0) {
        setCurrentOvertoneCount(0);
        setMaxOvertoneCount(0);
      }
    }, [spectrogramData]);
```

**Replace with:**
```typescript
    useEffect(() => {
      if (!spectrogramData || spectrogramData.frequencies.length === 0) {
        currentOvertoneCountRef.current = 0;
        maxOvertoneCountRef.current = 0;
      }
    }, [spectrogramData]);
```

**Action Step 3:** Update the overtone counting logic in `drawSpectrogram()`. Find the block that was updated in FIX-04 (the section after `if (showFrequencyMarkers) {`).

**Find the overtone counting part inside `if (showFrequencyMarkers)`:**
```typescript
        const overtoneCount =
          drawFrequencyMarkers(ctx, padding, chartWidth, chartHeight, detectedHarmonics) || 0;

        if (isRecording) {
          if (overtoneCount > currentOvertoneCount) {
            setCurrentOvertoneCount(overtoneCount);
          }
        } else {
          setCurrentOvertoneCount(overtoneCount);
        }

        if (overtoneCount > maxOvertoneCount) {
          setMaxOvertoneCount(overtoneCount);
        }
```

**Replace with:**
```typescript
        const overtoneCount =
          drawFrequencyMarkers(ctx, padding, chartWidth, chartHeight, detectedHarmonics) || 0;

        if (isRecording) {
          if (overtoneCount > currentOvertoneCountRef.current) {
            currentOvertoneCountRef.current = overtoneCount;
          }
        } else {
          currentOvertoneCountRef.current = overtoneCount;
        }

        if (overtoneCount > maxOvertoneCountRef.current) {
          maxOvertoneCountRef.current = overtoneCount;
        }
```

**Action Step 4:** Update the `drawOvertoneCounter` call.

**Find:**
```typescript
      drawOvertoneCounter(ctx, padding, currentOvertoneCount, maxOvertoneCount);
```

**Replace with:**
```typescript
      drawOvertoneCounter(ctx, padding, currentOvertoneCountRef.current, maxOvertoneCountRef.current);
```

**Action Step 5:** Remove `currentOvertoneCount` and `maxOvertoneCount` from the useEffect dependency array (if they're listed — they shouldn't be since they were state variables read inside the draw function, but check).

**Verify:** Run `npm run build`. Record audio — the overtone counter in the top-left should still display and update. Use React DevTools Profiler to confirm fewer re-renders during recording.

---

## FIX-06: Cache `getComputedStyle()` calls per frame

**File:** `client/src/components/SpectrogramCanvas.tsx`

**Problem:** `getComputedStyle(document.documentElement)` is called 4–5 times per canvas draw frame across `drawSpectrogram()`, `drawAxes()`, `drawFrequencyScale()`, `drawPlaybackIndicator()`, and `drawRecordingIndicator()`. Each call forces a style recalculation.

**Action:** At the very top of `drawSpectrogram()`, compute all colors once and pass them to sub-functions. This is a larger refactor, so here's the minimal fix — cache at the top of `drawSpectrogram` and reuse.

**Find the start of `drawSpectrogram`:**
```typescript
    const drawSpectrogram = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
    ) => {
      const padding = { top: 12, right: 8, bottom: 24, left: 26 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      const computedStyle = getComputedStyle(document.documentElement);
      const bgColor = computedStyle.getPropertyValue("--background");
      ctx.fillStyle = `hsl(${bgColor})`;
```

**Replace with:**
```typescript
    const drawSpectrogram = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
    ) => {
      const padding = { top: 12, right: 8, bottom: 24, left: 26 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      // Cache computed style once per frame to avoid repeated forced style recalculations
      const computedStyle = getComputedStyle(document.documentElement);
      const cachedColors = {
        bg: `hsl(${computedStyle.getPropertyValue("--background")})`,
        fg: `hsl(${computedStyle.getPropertyValue("--foreground")})`,
        primary: computedStyle.getPropertyValue("--primary"),
        destructive: computedStyle.getPropertyValue("--destructive"),
      };
      ctx.fillStyle = cachedColors.bg;
```

Then update each sub-function to use `cachedColors` instead of calling `getComputedStyle` again. Specifically:

**In `drawAxes` — find:**
```typescript
      const computedStyle = getComputedStyle(document.documentElement);
      const fgColor = computedStyle.getPropertyValue("--foreground");
```
Add `cachedColors` as a parameter to `drawAxes` and replace those two lines with usage of `cachedColors.fg`.

**In `drawFrequencyScale` — find:**
```typescript
      const computedStyle = getComputedStyle(document.documentElement);
      const fgColor = computedStyle.getPropertyValue("--foreground");
```
Same approach — use `cachedColors.fg`.

**In `drawPlaybackIndicator` — find:**
```typescript
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor = computedStyle.getPropertyValue("--primary");
```
Use `cachedColors.primary`.

**In `drawRecordingIndicator` — find:**
```typescript
      const computedStyle = getComputedStyle(document.documentElement);
      const destructiveColor = computedStyle.getPropertyValue("--destructive");
      const fgColor = computedStyle.getPropertyValue("--foreground");
```
Use `cachedColors.destructive` and `cachedColors.fg`.

**In `drawFrequencyMarkers` — find:**
```typescript
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor = computedStyle.getPropertyValue("--primary");
```
Use `cachedColors.primary`.

**Note:** The simplest approach is to add `cachedColors` as a module-level variable set at the start of `drawSpectrogram`, or pass it as a parameter to each sub-function. Choose whichever keeps the code cleanest.

**Verify:** Run `npm run build`. Visual output should be identical. Performance should improve during recording (fewer layout thrashes).

---

## FIX-07: Fix spectrogram blurriness on Retina/HiDPI displays

**File:** `client/src/components/SpectrogramCanvas.tsx`

**Problem:** The main canvas applies `devicePixelRatio` scaling, but the offscreen canvas (where spectrogram pixel data is rendered) uses CSS pixel dimensions. When drawn onto the DPR-scaled main canvas, the image is stretched and appears blurry on Retina screens.

**Find in `drawSpectrogramData`:**
```typescript
      const offscreenWidth = chartWidth;
      const offscreenHeight = chartHeight;
```

**Replace with:**
```typescript
      const dpr = window.devicePixelRatio || 1;
      const offscreenWidth = Math.floor(chartWidth * dpr);
      const offscreenHeight = Math.floor(chartHeight * dpr);
```

**Verify:** Run `npm run build`. On a Retina/HiDPI display, the spectrogram should look sharp rather than blurry. On a 1x display, there should be no visible difference.

---

## FIX-08: Cap spectrogram frame accumulation to prevent memory exhaustion

**File:** `client/src/hooks/useAudioAnalyzer.ts`

**Problem:** Every animation frame (~60fps) pushes a new frequency array into `spectrogramFramesRef`. A 5-minute recording accumulates ~18,000 frames × 2048+ floats ≈ 295MB, which crashes mobile browsers.

**Find in `processAudioFrame`:**
```typescript
  const processAudioFrame = useCallback(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzer.getByteFrequencyData(dataArray);

    const normalizedData = new Float32Array(bufferLength);
    for (let i = 0; i < bufferLength; i++) {
      normalizedData[i] = dataArray[i] / 255;
    }

    const currentTime = (Date.now() - startTimeRef.current) / 1000;
    
    spectrogramFramesRef.current.frequencies.push(Array.from(normalizedData));
    spectrogramFramesRef.current.timeStamps.push(currentTime);

    setSpectrogramData(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        frequencies: spectrogramFramesRef.current.frequencies,
        timeStamps: spectrogramFramesRef.current.timeStamps,
      };
    });

    animationFrameRef.current = requestAnimationFrame(processAudioFrame);
  }, []);
```

**Replace with:**
```typescript
  // Maximum number of spectrogram frames to retain in memory.
  // At ~60fps: 18000 frames ≈ 5 minutes of data.
  // Beyond this limit older frames are dropped to prevent memory exhaustion.
  const MAX_SPECTROGRAM_FRAMES = 18000;

  const processAudioFrame = useCallback(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzer.getByteFrequencyData(dataArray);

    const normalizedData = new Float32Array(bufferLength);
    for (let i = 0; i < bufferLength; i++) {
      normalizedData[i] = dataArray[i] / 255;
    }

    const currentTime = (Date.now() - startTimeRef.current) / 1000;
    
    spectrogramFramesRef.current.frequencies.push(Array.from(normalizedData));
    spectrogramFramesRef.current.timeStamps.push(currentTime);

    // Evict oldest frames when exceeding the memory cap
    if (spectrogramFramesRef.current.frequencies.length > MAX_SPECTROGRAM_FRAMES) {
      const excess = spectrogramFramesRef.current.frequencies.length - MAX_SPECTROGRAM_FRAMES;
      spectrogramFramesRef.current.frequencies.splice(0, excess);
      spectrogramFramesRef.current.timeStamps.splice(0, excess);
    }

    setSpectrogramData(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        frequencies: spectrogramFramesRef.current.frequencies,
        timeStamps: spectrogramFramesRef.current.timeStamps,
      };
    });

    animationFrameRef.current = requestAnimationFrame(processAudioFrame);
  }, []);
```

**Verify:** Run `npm run build`. Record for several minutes — the browser tab should not crash or become excessively slow. Memory usage in DevTools should plateau around 300MB instead of growing without bound.

---

## FIX-09: Add deprecation warning comment for ScriptProcessorNode

**File:** `client/src/hooks/useAudioAnalyzer.ts`

**Problem:** `createScriptProcessor()` is deprecated and will eventually be removed from browsers. Full migration to AudioWorklet is a larger refactor, so for now we add a TODO and future-proof comment.

**Find:**
```typescript
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
```

**Replace with:**
```typescript
      // TODO: Migrate to AudioWorkletNode — ScriptProcessorNode is deprecated.
      // AudioWorklet runs off the main thread, improving both audio quality and UI performance.
      // See: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
```

**Verify:** Build still succeeds. This is a comment-only change.

---

## FIX-10: Harden license validation against localStorage tampering

**File:** `client/src/lib/proLicense.ts`

**Problem:** Users can bypass the license by manually setting `localStorage` with `isActive: true`. The background re-validation on mount only runs once and can be avoided by staying on the page.

**Find the `getLicenseState` function:**
```typescript
export function getLicenseState(): LicenseState {
  if (cachedState) return cachedState;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedState = JSON.parse(stored);
      return cachedState!;
    }
  } catch {}
  cachedState = { isActive: false, licenseKey: null, instanceId: null, activatedAt: null };
  return cachedState;
}
```

**Replace with:**
```typescript
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
```

**Then, in `client/src/hooks/useProStatus.ts`, add periodic re-validation.**

**Find:**
```typescript
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
```

**Replace with:**
```typescript
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
```

**Verify:** Run `npm run build`. Test license activation still works. Try the localStorage hack — it should fail because of the integrity check (no valid `licenseKey` = `isActive` gets reset to false).

---

## FIX-11: Remove debug console.log from license module

**File:** `client/src/lib/proLicense.ts`

**Problem:** License API responses are logged to the console, exposing instance IDs and validation details to anyone with DevTools open.

**Find (in `activateLicense`):**
```typescript
    console.log('License activation response:', data);
```

**Replace with:**
```typescript
    // Debug logging removed for production
```

**Find (in `validateLicense`):**
```typescript
    console.log('License validation response:', data);
```

**Replace with:**
```typescript
    // Debug logging removed for production
```

**Verify:** Run `npm run build`. Activate a license key — no API response data should appear in the browser console.

---

## FIX-12: Add rate-limiting note for the Cloudflare Worker

**File:** `client/src/lib/proLicense.ts`

**Problem:** The API base URL is exposed in client code. This is inherent to client-side apps, but should be documented.

**Find:**
```typescript
const API_BASE = 'https://overtone-license.nuoroda.workers.dev';
```

**Replace with:**
```typescript
// NOTE: This endpoint is publicly visible in client bundles by design.
// The Cloudflare Worker MUST enforce rate limiting (e.g., 5 requests/min/IP)
// and input validation to prevent abuse.
const API_BASE = 'https://overtone-license.nuoroda.workers.dev';
```

**Verify:** Build succeeds. This is a comment-only change. **Separately, ensure the Cloudflare Worker has rate limiting configured.**

---

## FIX-13: Remove unused dependencies

**File:** `package.json`

**Problem:** Several dependencies are never imported, inflating the bundle size.

**Action:** Run these commands from the project root:

```bash
npm uninstall framer-motion zod
```

**Note:** `@tanstack/react-query` and `wouter` are technically used (Provider is mounted, Router is configured) even though there are no actual queries or multiple routes. You can remove them too if you want a leaner bundle, but it requires removing the corresponding code in `App.tsx` and `queryClient.ts`. That's optional.

**Verify:** Run `npm run build`. The build should succeed. Check the bundle size in `dist/assets/` — it should be noticeably smaller.

---

## FIX-14: Remove dead `magnitudeToColor()` function

**File:** `client/src/components/SpectrogramCanvas.tsx`

**Problem:** `magnitudeToColor()` is defined but never called anywhere. It's dead code.

**Find and delete this entire block:**
```typescript
    const magnitudeToColor = (magnitude: number): string => {
      const scaled = applyIntensityScaling(magnitude);
      const color = magnitudeToColorRGBFromScaled(scaled);
      const clamped = Math.max(0, Math.min(1, scaled));

      const alpha = clamped * 0.9 + 0.1;
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    };
```

**Verify:** Run `npm run build`. Build should succeed.

---

## FIX-15: Remove unused server-side API patterns from queryClient

**File:** `client/src/lib/queryClient.ts`

**Problem:** Contains `apiRequest()` with credentials and error handling for a server-backed app, but this is a static GitHub Pages site with no backend.

**Replace the entire file contents with:**
```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

**Verify:** Run `npm run build`. The app should work exactly as before.

---

## FIX-16: Delete unused `AdvancedSettings` and `IntensitySettings` components

**File:** `client/src/components/AdvancedSettings.tsx`  
**File:** `client/src/components/IntensitySettings.tsx`

**Problem:** These components are never rendered. Their functionality has been replaced by the inline icon buttons in the settings row of `VocalAnalyzer.tsx`.

**Action:** Delete both files:
```bash
rm client/src/components/AdvancedSettings.tsx
rm client/src/components/IntensitySettings.tsx
```

**Verify:** Run `npm run build`. The build should succeed with no missing import errors (confirming nothing references these files).

---

## FIX-17: Delete unused `FrequencyLabels` component

**File:** `client/src/components/FrequencyLabels.tsx`

**Problem:** This component duplicates frequency label logic that already exists in `SpectrogramCanvas.tsx`'s `drawFrequencyScale()`. It is never imported or rendered.

**Action:** Delete the file:
```bash
rm client/src/components/FrequencyLabels.tsx
```

**Verify:** Run `npm run build`. Build should succeed.

---

## Final Verification Checklist

After all 17 fixes are applied:

1. `npm run build` — should complete with zero errors
2. `npm run dev` — open in browser, record audio, verify:
   - [ ] Spectrogram renders with correct colors (FIX-01)
   - [ ] All four color schemes work: default, warm, cool, monochrome (FIX-01)
   - [ ] No console errors during recording or playback
   - [ ] Declutter slider works at all FFT sizes including 32768 (FIX-03)
   - [ ] Harmonic markers and target guide render correctly (FIX-04)
   - [ ] Overtone counter updates in top-left corner (FIX-05)
   - [ ] Recording for 2+ minutes doesn't cause excessive memory growth (FIX-08)
   - [ ] License activation still works with a valid key (FIX-10, FIX-11)
   - [ ] No API responses logged to console (FIX-11)
3. Deploy to GitHub Pages and verify:
   - [ ] Favicon appears in browser tab (FIX-02)
   - [ ] App loads and functions correctly at the `/overtonesinger/` path
