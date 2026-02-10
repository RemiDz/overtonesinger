import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import type {
  SpectrogramData,
  ViewportSettings,
  IntensityScaleMode,
  ColorScheme,
} from "@shared/schema";

interface SpectrogramCanvasProps {
  spectrogramData: SpectrogramData | null;
  viewportSettings: ViewportSettings;
  currentTime: number;
  isRecording: boolean;
  isPlaying?: boolean;
  playbackTime?: number;
  brightness?: number;
  declutterAmount: number;
  sharpness?: number;
  showFrequencyMarkers?: boolean;
  intensityScale?: IntensityScaleMode;
  intensityBoost?: number;
  minFrequency?: number;
  maxFrequency?: number;
  colorScheme?: ColorScheme;
  sampleRate?: number;
  targetHarmonic?: number | null;
}

// Musical interval names for the harmonic series
const HARMONIC_LABELS: Record<number, string> = {
  1: "Fund.",
  2: "Oct",
  3: "5th",
  4: "2·Oct",
  5: "M3",
  6: "5th",
  7: "m7",
  8: "3·Oct",
  9: "M2",
  10: "M3",
  11: "TT",
  12: "5th",
  13: "m6",
  14: "m7",
  15: "M7",
  16: "4·Oct",
};

export interface SpectrogramCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

export const SpectrogramCanvas = forwardRef<
  SpectrogramCanvasHandle,
  SpectrogramCanvasProps
>(
  (
    {
      spectrogramData,
      viewportSettings,
      currentTime,
      isRecording,
      isPlaying = false,
      playbackTime = 0,
      brightness = 100,
      declutterAmount,
      sharpness = 50,
      showFrequencyMarkers = true,
      intensityScale = "logarithmic",
      intensityBoost = 100,
      minFrequency = 50,
      maxFrequency = 5000,
      colorScheme = "default",
      sampleRate = 48000,
      targetHarmonic = null,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
    }));
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
      null,
    );
    const currentOvertoneCountRef = useRef(0);
    const maxOvertoneCountRef = useRef(0);

    useEffect(() => {
      if (!spectrogramData || spectrogramData.frequencies.length === 0) {
        currentOvertoneCountRef.current = 0;
        maxOvertoneCountRef.current = 0;
      }
    }, [spectrogramData]);

    useEffect(() => {
      const updateDimensions = () => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };

      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = dimensions.width * dpr;
      canvas.height = dimensions.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      drawSpectrogram(ctx, dimensions.width, dimensions.height);
    }, [
      spectrogramData,
      viewportSettings,
      currentTime,
      dimensions,
      brightness,
      declutterAmount,
      sharpness,
      mousePos,
      isPlaying,
      playbackTime,
      showFrequencyMarkers,
      intensityScale,
      intensityBoost,
      minFrequency,
      maxFrequency,
      colorScheme,
      targetHarmonic,
    ]);

    const getAdjustedTimeline = () => {
      if (!spectrogramData || spectrogramData.frequencies.length === 0) {
        return {
          actualStartTime: 0,
          adjustedDuration: 10,
          firstNonSilentIndex: 0,
        };
      }

      const { frequencies, timeStamps } = spectrogramData;
      const totalDuration = timeStamps[timeStamps.length - 1] || 1;

      let firstNonSilentIndex = 0;

      if (frequencies.length > 0 && frequencies[0].length > 0) {
        const averageMagnitudes = new Float32Array(frequencies[0].length);
        for (let i = 0; i < Math.min(10, frequencies.length); i++) {
          frequencies[i]?.forEach((mag, j) => {
            averageMagnitudes[j] += mag;
          });
        }
        let maxMagnitude = 0;
        for (let i = 0; i < averageMagnitudes.length; i++) {
          maxMagnitude = Math.max(maxMagnitude, averageMagnitudes[i]);
        }
        const noiseMagnitude =
          maxMagnitude / (Math.min(10, frequencies.length) * 10);
        const silenceThreshold = Math.max(noiseMagnitude * 1.5, 0.001);

        for (let i = 0; i < frequencies.length; i++) {
          const hasSignal = frequencies[i]?.some(
            (mag) => mag > silenceThreshold,
          );
          if (hasSignal) {
            firstNonSilentIndex = i;
            break;
          }
        }
      }

      const actualStartTime = timeStamps[firstNonSilentIndex] || 0;
      const adjustedDuration = totalDuration - actualStartTime;

      return { actualStartTime, adjustedDuration, firstNonSilentIndex };
    };

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
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#000000";
      ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

      if (!spectrogramData || spectrogramData.frequencies.length === 0) {
        drawEmptyState(ctx, width, height, padding, cachedColors);
        return;
      }

      drawGrid(ctx, padding, chartWidth, chartHeight);
      drawAxes(ctx, padding, chartWidth, chartHeight, cachedColors);
      drawFrequencyScale(ctx, padding, chartWidth, chartHeight, cachedColors);
      drawSpectrogramData(ctx, padding, chartWidth, chartHeight);

      // Pre-compute harmonic detection once for both markers and target guide
      const detectedHarmonics = showFrequencyMarkers && spectrogramData && spectrogramData.frequencies.length > 0
        ? detectDominantFrequencies(spectrogramData.frequencies)
        : [];

      if (showFrequencyMarkers) {
        const overtoneCount =
          drawFrequencyMarkers(ctx, padding, chartWidth, chartHeight, detectedHarmonics, cachedColors) || 0;

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
      }

      // drawOvertoneCounter(ctx, padding, currentOvertoneCount, maxOvertoneCount);

      if (targetHarmonic && showFrequencyMarkers) {
        drawTargetGuide(ctx, padding, chartWidth, chartHeight, detectedHarmonics);
      }

      drawOvertoneCounter(ctx, padding, currentOvertoneCountRef.current, maxOvertoneCountRef.current);

      if (isPlaying) {
        drawPlaybackIndicator(ctx, padding, chartWidth, chartHeight, cachedColors);
      }

      if (mousePos) {
        drawCrosshair(ctx, padding, chartWidth, chartHeight);
      }

      if (isRecording) {
        drawRecordingIndicator(ctx, width, height, cachedColors);
      }
    };

    const drawEmptyState = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      padding: { top: number; right: number; bottom: number; left: number },
      cachedColors: { bg: string; fg: string; primary: string; destructive: string },
    ) => {
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      drawGrid(ctx, padding, chartWidth, chartHeight);
      drawAxes(ctx, padding, chartWidth, chartHeight, cachedColors);

      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "Press Record to start capturing audio",
        padding.left + chartWidth / 2,
        padding.top + chartHeight / 2,
      );
    };

    const drawGrid = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      chartWidth: number,
      chartHeight: number,
    ) => {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;

      const numVerticalLines = 10;
      for (let i = 0; i <= numVerticalLines; i++) {
        const x = padding.left + (chartWidth * i) / numVerticalLines;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
      }

      const freqSteps = generateFreqSteps();
      freqSteps.forEach((freq) => {
        const y = freqToY(freq, padding.top, chartHeight);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      });
    };

    const freqToY = (freq: number, yStart: number, height: number): number => {
      const logMin = Math.log10(minFrequency);
      const logMax = Math.log10(maxFrequency);
      const logFreq = Math.log10(Math.max(freq, minFrequency));
      const normalized = (logFreq - logMin) / (logMax - logMin);
      return yStart + height * (1 - normalized);
    };

    const generateFreqSteps = () => {
      const steps = [];
      const range = maxFrequency - minFrequency;
      if (range <= 1000) {
        for (
          let f = Math.ceil(minFrequency / 100) * 100;
          f <= maxFrequency;
          f += 100
        ) {
          steps.push(f);
        }
      } else if (range <= 5000) {
        for (
          let f = Math.ceil(minFrequency / 500) * 500;
          f <= maxFrequency;
          f += 500
        ) {
          steps.push(f);
        }
      } else {
        for (
          let f = Math.ceil(minFrequency / 1000) * 1000;
          f <= maxFrequency;
          f += 1000
        ) {
          steps.push(f);
        }
      }
      return steps.slice(0, 8);
    };

    const drawAxes = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      chartWidth: number,
      chartHeight: number,
      cachedColors: { bg: string; fg: string; primary: string; destructive: string },
    ) => {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();

      ctx.fillStyle = cachedColors.fg;
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const numTimeLabels = 10;

      const { actualStartTime, adjustedDuration } = getAdjustedTimeline();

      const zoomPercent = Math.max(1, Math.min(100, viewportSettings.zoom));
      const visibleDuration = adjustedDuration * (zoomPercent / 100);
      const scrollableRange = Math.max(0, adjustedDuration - visibleDuration);
      const startTime =
        actualStartTime + viewportSettings.scrollPosition * scrollableRange;

      for (let i = 0; i <= numTimeLabels; i++) {
        const x = padding.left + (chartWidth * i) / numTimeLabels;
        const time = startTime + (visibleDuration * i) / numTimeLabels;
        ctx.fillText(`${time.toFixed(1)}s`, x, padding.top + chartHeight + 8);
      }
    };

    const drawFrequencyScale = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      chartWidth: number,
      chartHeight: number,
      cachedColors: { bg: string; fg: string; primary: string; destructive: string },
    ) => {
      const freqLabels = generateFreqSteps();

      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = cachedColors.fg;

      freqLabels.forEach((freq) => {
        const y = freqToY(freq, padding.top, chartHeight);
        const label = `${freq >= 1000 ? freq / 1000 + "k" : freq}`;

        const labelX = padding.left - 8;

        ctx.fillText(label, labelX, y);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left - 4, y);
        ctx.lineTo(padding.left, y);
        ctx.stroke();
      });
    };

    const drawSpectrogramData = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      chartWidth: number,
      chartHeight: number,
    ) => {
      if (!spectrogramData) return;

      const { frequencies, timeStamps } = spectrogramData;
      if (frequencies.length === 0) return;

      const { actualStartTime, adjustedDuration } = getAdjustedTimeline();

      const zoomPercent = Math.max(1, Math.min(100, viewportSettings.zoom));
      const visibleDuration = adjustedDuration * (zoomPercent / 100);

      const scrollableRange = Math.max(0, adjustedDuration - visibleDuration);
      const startTime =
        actualStartTime + viewportSettings.scrollPosition * scrollableRange;
      const endTime = startTime + visibleDuration;

      const visibleIndices = frequencies
        .map((_, idx) => ({ idx, time: timeStamps[idx] }))
        .filter(({ time }) => time >= startTime && time <= endTime)
        .map(({ idx }) => idx);

      if (visibleIndices.length === 0) return;

      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement("canvas");
      }

      const offscreenCanvas = offscreenCanvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      const offscreenWidth = Math.floor(chartWidth * dpr);
      const offscreenHeight = Math.floor(chartHeight * dpr);

      if (
        offscreenCanvas.width !== offscreenWidth ||
        offscreenCanvas.height !== offscreenHeight
      ) {
        offscreenCanvas.width = offscreenWidth;
        offscreenCanvas.height = offscreenHeight;
      }

      const offscreenCtx = offscreenCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!offscreenCtx) return;

      offscreenCtx.fillStyle = "#000000";
      offscreenCtx.fillRect(0, 0, offscreenWidth, offscreenHeight);

      const imageData = offscreenCtx.createImageData(
        offscreenWidth,
        offscreenHeight,
      );
      const pixels = imageData.data;

      const declutterThreshold = declutterAmount / 100;
      const nyquistFreq = sampleRate / 2;

      const processedFrames = visibleIndices.map((idx) =>
        applyDeclutter(frequencies[idx], declutterThreshold),
      );

      const rowFreqBinLookup: Array<{
        freq: number;
        freqBin1: number;
        freqBin2: number;
        freqMix: number;
      }> = [];
      const freqDataLength = frequencies[visibleIndices[0]].length;

      for (let y = 0; y < offscreenHeight; y++) {
        const yNorm = y / offscreenHeight;
        const freq = yNormalizedToFreq(yNorm);

        if (freq < minFrequency || freq > maxFrequency) {
          rowFreqBinLookup.push({
            freq,
            freqBin1: -1,
            freqBin2: -1,
            freqMix: 0,
          });
        } else {
          const freqBinFloat = (freq / nyquistFreq) * freqDataLength;
          const freqBin1 = Math.floor(freqBinFloat);
          const freqBin2 = Math.min(freqBin1 + 1, freqDataLength - 1);
          const freqMix = freqBinFloat - freqBin1;
          rowFreqBinLookup.push({ freq, freqBin1, freqBin2, freqMix });
        }
      }

      const interpolationStrength = Math.max(
        0,
        Math.min(1, 1 - sharpness / 100),
      );

      for (let x = 0; x < offscreenWidth; x++) {
        const timeProgress = x / offscreenWidth;
        const timeIndexFloat = timeProgress * (visibleIndices.length - 1);
        const timeIndex1 = Math.floor(timeIndexFloat);
        const timeIndex2 = Math.min(timeIndex1 + 1, visibleIndices.length - 1);
        const timeMix = (timeIndexFloat - timeIndex1) * interpolationStrength;

        const processedMagnitudes1 = processedFrames[timeIndex1];
        const processedMagnitudes2 = processedFrames[timeIndex2];

        for (let y = 0; y < offscreenHeight; y++) {
          const pixelIndex = (y * offscreenWidth + x) * 4;
          const lookup = rowFreqBinLookup[y];

          if (lookup.freqBin1 === -1) {
            pixels[pixelIndex] = 0;
            pixels[pixelIndex + 1] = 0;
            pixels[pixelIndex + 2] = 0;
            pixels[pixelIndex + 3] = 255;
            continue;
          }

          const mag1_1 = processedMagnitudes1[lookup.freqBin1] || 0;
          const mag1_2 = processedMagnitudes1[lookup.freqBin2] || 0;
          const mag2_1 = processedMagnitudes2[lookup.freqBin1] || 0;
          const mag2_2 = processedMagnitudes2[lookup.freqBin2] || 0;

          const freqMix = lookup.freqMix * interpolationStrength;
          const mag1 = mag1_1 * (1 - freqMix) + mag1_2 * freqMix;
          const mag2 = mag2_1 * (1 - freqMix) + mag2_2 * freqMix;
          const magnitude = mag1 * (1 - timeMix) + mag2 * timeMix;

          const scaled = applyIntensityScaling(magnitude);
          const alpha = Math.floor(Math.max(0, Math.min(1, scaled)) * 255);

          const color = magnitudeToColorRGBFromScaled(scaled);

          pixels[pixelIndex] = color.r;
          pixels[pixelIndex + 1] = color.g;
          pixels[pixelIndex + 2] = color.b;
          pixels[pixelIndex + 3] = alpha;
        }
      }

      offscreenCtx.putImageData(imageData, 0, 0);

      ctx.save();
      if (sharpness >= 80) {
        ctx.imageSmoothingEnabled = false;
      } else {
        ctx.imageSmoothingEnabled = true;
        if (sharpness < 33) {
          ctx.imageSmoothingQuality = "high";
        } else if (sharpness < 66) {
          ctx.imageSmoothingQuality = "medium";
        } else {
          ctx.imageSmoothingQuality = "low";
        }
      }
      ctx.drawImage(
        offscreenCanvas,
        0,
        0,
        offscreenWidth,
        offscreenHeight,
        padding.left,
        padding.top,
        chartWidth,
        chartHeight,
      );
      ctx.restore();
    };

    const freqToYNormalized = (freq: number): number => {
      const minLog = Math.log(minFrequency);
      const maxLog = Math.log(maxFrequency);
      const freqLog = Math.log(Math.max(freq, minFrequency));

      const normalizedPosition = (freqLog - minLog) / (maxLog - minLog);
      return 1 - normalizedPosition;
    };

    const yNormalizedToFreq = (yNorm: number): number => {
      const minLog = Math.log(minFrequency);
      const maxLog = Math.log(maxFrequency);
      const normalizedPosition = 1 - yNorm;
      const freqLog = minLog + normalizedPosition * (maxLog - minLog);
      return Math.exp(freqLog);
    };

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

    const drawCrosshair = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      chartWidth: number,
      chartHeight: number,
    ) => {
      if (!mousePos) return;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(mousePos.x, padding.top);
      ctx.lineTo(mousePos.x, padding.top + chartHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding.left, mousePos.y);
      ctx.lineTo(padding.left + chartWidth, mousePos.y);
      ctx.stroke();

      ctx.setLineDash([]);
    };

    const drawFrequencyMarkers = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      chartWidth: number,
      chartHeight: number,
      precomputedHarmonics?: ReturnType<typeof detectDominantFrequencies>,
      cachedColors?: { bg: string; fg: string; primary: string; destructive: string },
    ) => {
      if (!spectrogramData || spectrogramData.frequencies.length === 0) return;

      const primaryColor = cachedColors?.primary ?? getComputedStyle(document.documentElement).getPropertyValue("--primary");

      const logMin = Math.log10(minFrequency);
      const logMax = Math.log10(maxFrequency);

      const detectedHarmonics = precomputedHarmonics ?? detectDominantFrequencies(
        spectrogramData.frequencies,
      );

      const allMarkers: Array<{
        freq: number;
        y: number;
        isFundamental: boolean;
        alpha: number;
        harmonicIndex: number;
      }> = [];

      detectedHarmonics.forEach(({ fundamental, harmonics, strength }) => {
        harmonics.forEach(({ freq, strength: harmonicStrength }, index) => {
          if (freq < minFrequency || freq > maxFrequency) return;

          const logFreq = Math.log10(freq);
          const normalizedY = 1 - (logFreq - logMin) / (logMax - logMin);
          const y = padding.top + normalizedY * chartHeight;

          const isFundamental = index === 0;
          const alpha = Math.min(
            0.7,
            harmonicStrength * (isFundamental ? 1.5 : 1.2),
          );

          allMarkers.push({ freq, y, isFundamental, alpha, harmonicIndex: index + 1 });
        });
      });

      allMarkers.sort((a, b) => a.y - b.y);

      const filteredMarkers: typeof allMarkers = [];
      const minLabelDistance = 18;

      allMarkers.forEach((marker) => {
        const tooClose = filteredMarkers.some(
          (existing) => Math.abs(existing.y - marker.y) < minLabelDistance,
        );
        if (!tooClose) {
          filteredMarkers.push(marker);
        }
      });

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

      ctx.setLineDash([]);

      // Count overtones from the detection result (not filtered markers)
      // to get the true count regardless of what's visible on screen
      const overtoneCount = detectedHarmonics.length > 0
        ? detectedHarmonics[0].harmonics.length - 1  // subtract fundamental
        : 0;
      return overtoneCount;
    };

    const detectDominantFrequencies = (
      frequencies: number[][],
    ): Array<{
      fundamental: number;
      harmonics: Array<{ freq: number; strength: number }>;
      strength: number;
    }> => {
      if (frequencies.length === 0) return [];

      const numBins = frequencies[0].length;
      const nyquistFreq = sampleRate / 2;
      const binToFreq = (bin: number) => (bin / numBins) * nyquistFreq;
      const freqToBin = (freq: number) =>
        Math.round((freq / nyquistFreq) * numBins);

      const { actualStartTime, adjustedDuration } = getAdjustedTimeline();
      const zoomPercent = Math.max(1, Math.min(100, viewportSettings.zoom));
      const visibleDuration = adjustedDuration * (zoomPercent / 100);
      const scrollableRange = Math.max(0, adjustedDuration - visibleDuration);
      const startTime =
        actualStartTime + viewportSettings.scrollPosition * scrollableRange;
      const endTime = startTime + visibleDuration;

      const visibleFrames = frequencies.filter((_, idx) => {
        const time = spectrogramData?.timeStamps[idx] || 0;
        return time >= startTime && time <= endTime;
      });

      if (visibleFrames.length === 0) return [];

      const averageMagnitudes = new Float32Array(numBins);
      visibleFrames.forEach((frame) => {
        frame.forEach((mag, i) => {
          averageMagnitudes[i] += mag;
        });
      });
      averageMagnitudes.forEach((_, i) => {
        averageMagnitudes[i] /= visibleFrames.length;
      });

      const peaks: Array<{ bin: number; freq: number; magnitude: number }> = [];
      for (let i = 2; i < averageMagnitudes.length - 2; i++) {
        if (
          averageMagnitudes[i] > averageMagnitudes[i - 1] &&
          averageMagnitudes[i] > averageMagnitudes[i + 1] &&
          averageMagnitudes[i] > averageMagnitudes[i - 2] &&
          averageMagnitudes[i] > averageMagnitudes[i + 2] &&
          averageMagnitudes[i] > 0.05
        ) {
          const freq = binToFreq(i);
          if (freq >= 60 && freq <= 8000) {
            peaks.push({ bin: i, freq, magnitude: averageMagnitudes[i] });
          }
        }
      }

      if (peaks.length === 0) return [];

      peaks.sort((a, b) => {
        const aScore = a.magnitude * (1 + 1000 / Math.max(a.freq, 100));
        const bScore = b.magnitude * (1 + 1000 / Math.max(b.freq, 100));
        return bScore - aScore;
      });

      const dominantPeak = peaks[0];
      const fundamental = dominantPeak.freq;
      const fundamentalMagnitude = dominantPeak.magnitude;

      const harmonics: Array<{ freq: number; strength: number }> = [
        { freq: fundamental, strength: fundamentalMagnitude },
      ];

      const minHarmonicStrength = fundamentalMagnitude * 0.08;

      for (let n = 2; n <= 16; n++) {
        const expectedHarmonic = fundamental * n;
        if (expectedHarmonic > sampleRate / 2) break;

        const expectedBin = freqToBin(expectedHarmonic);
        const tolerance = 3;

        let maxMag = 0;
        let bestBin = expectedBin;
        for (
          let b = expectedBin - tolerance;
          b <= expectedBin + tolerance;
          b++
        ) {
          if (b >= 0 && b < averageMagnitudes.length) {
            if (averageMagnitudes[b] > maxMag) {
              maxMag = averageMagnitudes[b];
              bestBin = b;
            }
          }
        }

        if (maxMag >= minHarmonicStrength) {
          const actualFreq = binToFreq(bestBin);
          harmonics.push({ freq: actualFreq, strength: maxMag });
        }
      }

      if (harmonics.length >= 2) {
        return [
          {
            fundamental,
            harmonics,
            strength: fundamentalMagnitude,
          },
        ];
      }

      return [];
    };

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

      const { fundamental } = detectedHarmonics[0];
      const targetFreq = fundamental * targetHarmonic;

      if (targetFreq < minFrequency || targetFreq > maxFrequency) return;

      const logMin = Math.log10(minFrequency);
      const logMax = Math.log10(maxFrequency);
      const logFreq = Math.log10(targetFreq);
      const normalizedY = 1 - (logFreq - logMin) / (logMax - logMin);
      const targetY = padding.top + normalizedY * chartHeight;

      // Check if the target harmonic is currently being produced
      const { harmonics } = detectedHarmonics[0];
      const isHitting = harmonics.some(({ freq }) => {
        const ratio = freq / targetFreq;
        return ratio > 0.95 && ratio < 1.05;
      });

      // Draw target line
      const guideColor = isHitting ? "rgba(0, 255, 120, 0.8)" : "rgba(255, 200, 0, 0.6)";
      const glowColor = isHitting ? "rgba(0, 255, 120, 0.15)" : "rgba(255, 200, 0, 0.08)";

      // Glow band around target
      ctx.fillStyle = glowColor;
      const bandHeight = isHitting ? 16 : 10;
      ctx.fillRect(padding.left, targetY - bandHeight / 2, chartWidth, bandHeight);

      // Target line
      ctx.strokeStyle = guideColor;
      ctx.lineWidth = isHitting ? 2.5 : 1.5;
      ctx.setLineDash(isHitting ? [] : [6, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, targetY);
      ctx.lineTo(padding.left + chartWidth, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

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
    };

    const drawPlaybackIndicator = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      chartWidth: number,
      chartHeight: number,
      cachedColors: { bg: string; fg: string; primary: string; destructive: string },
    ) => {
      if (!spectrogramData) return;

      const { actualStartTime, adjustedDuration } = getAdjustedTimeline();
      const zoomPercent = Math.max(1, Math.min(100, viewportSettings.zoom));
      const visibleDuration = adjustedDuration * (zoomPercent / 100);
      const scrollableRange = Math.max(0, adjustedDuration - visibleDuration);
      const startTime =
        actualStartTime + viewportSettings.scrollPosition * scrollableRange;
      const endTime = startTime + visibleDuration;

      if (playbackTime < startTime || playbackTime > endTime) return;

      const normalizedTime = (playbackTime - startTime) / visibleDuration;
      const x = padding.left + normalizedTime * chartWidth;

      ctx.strokeStyle = `hsl(${cachedColors.primary})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();

      ctx.fillStyle = `hsl(${cachedColors.primary})`;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x - 5, padding.top - 8);
      ctx.lineTo(x + 5, padding.top - 8);
      ctx.closePath();
      ctx.fill();
    };

    const drawOvertoneCounter = (
      ctx: CanvasRenderingContext2D,
      padding: { top: number; right: number; bottom: number; left: number },
      current: number,
      max: number,
    ) => {
      if (current === 0 && max === 0) return;

      const x = padding.left + 8;
      const y = padding.top + 8;
      const boxWidth = 120;
      const boxHeight = 40;

      // Semi-transparent background
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, 6);
      ctx.fill();

      // Border
      ctx.strokeStyle = current > 0 ? "rgba(0, 200, 255, 0.5)" : "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, 6);
      ctx.stroke();

      // Overtone count — large number
      const countColor = current >= 4 ? "rgba(0, 255, 120, 0.95)" :
                         current >= 2 ? "rgba(0, 200, 255, 0.95)" :
                         current > 0  ? "rgba(255, 200, 0, 0.95)" :
                                        "rgba(255, 255, 255, 0.5)";
      ctx.fillStyle = countColor;
      ctx.font = "bold 20px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`${current}`, x + 8, y + 6);

      // Label
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText("harmonics", x + 34, y + 8);

      // Max record
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText(`best: ${max}`, x + 34, y + 22);
    };

    const drawRecordingIndicator = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      cachedColors: { bg: string; fg: string; primary: string; destructive: string },
    ) => {
      ctx.fillStyle = `hsl(${cachedColors.destructive})`;
      ctx.beginPath();
      ctx.arc(width - 24, 24, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cachedColors.fg;
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("REC", width - 36, 24);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseLeave = () => {
      setMousePos(null);
    };

    return (
      <div
        ref={containerRef}
        className="w-full h-full bg-background relative z-10"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          data-testid="canvas-spectrogram"
          role="img"
          aria-label="Spectrogram visualization of audio frequencies over time"
        />
      </div>
    );
  },
);
