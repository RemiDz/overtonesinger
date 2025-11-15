import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { SpectrogramData, ViewportSettings, IntensityScaleMode, ColorScheme } from '@shared/schema';

interface SpectrogramCanvasProps {
  spectrogramData: SpectrogramData | null;
  viewportSettings: ViewportSettings;
  currentTime: number;
  isRecording: boolean;
  isPlaying?: boolean;
  playbackTime?: number;
  brightness?: number;
  declutterAmount: number;
  showFrequencyMarkers?: boolean;
  intensityScale?: IntensityScaleMode;
  intensityBoost?: number;
  minFrequency?: number;
  maxFrequency?: number;
  colorScheme?: ColorScheme;
  sampleRate?: number;
}

export interface SpectrogramCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

export const SpectrogramCanvas = forwardRef<SpectrogramCanvasHandle, SpectrogramCanvasProps>(
  ({ spectrogramData, viewportSettings, currentTime, isRecording, isPlaying = false, playbackTime = 0, brightness = 100, declutterAmount, showFrequencyMarkers = true, intensityScale = 'logarithmic', intensityBoost = 100, minFrequency = 50, maxFrequency = 5000, colorScheme = 'default', sampleRate = 48000 }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

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
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    drawSpectrogram(ctx, dimensions.width, dimensions.height);
  }, [spectrogramData, viewportSettings, currentTime, dimensions, brightness, declutterAmount, mousePos, isPlaying, playbackTime, showFrequencyMarkers, intensityScale, intensityBoost, minFrequency, maxFrequency, colorScheme]);

  const drawSpectrogram = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const padding = { top: 12, right: 8, bottom: 24, left: 32 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const computedStyle = getComputedStyle(document.documentElement);
    const bgColor = computedStyle.getPropertyValue('--background');
    ctx.fillStyle = `hsl(${bgColor})`;
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

    if (!spectrogramData || spectrogramData.frequencies.length === 0) {
      drawEmptyState(ctx, width, height, padding);
      return;
    }

    drawGrid(ctx, padding, chartWidth, chartHeight);
    drawAxes(ctx, padding, chartWidth, chartHeight);
    drawSpectrogramData(ctx, padding, chartWidth, chartHeight);
    drawFrequencyScale(ctx, padding, chartWidth, chartHeight);
    
    if (showFrequencyMarkers) {
      drawFrequencyMarkers(ctx, padding, chartWidth, chartHeight);
    }
    
    if (isPlaying) {
      drawPlaybackIndicator(ctx, padding, chartWidth, chartHeight);
    }
    
    if (mousePos) {
      drawCrosshair(ctx, padding, chartWidth, chartHeight);
    }

    if (isRecording) {
      drawRecordingIndicator(ctx, width, height);
    }
  };

  const drawEmptyState = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    padding: { top: number; right: number; bottom: number; left: number }
  ) => {
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    drawGrid(ctx, padding, chartWidth, chartHeight);
    drawAxes(ctx, padding, chartWidth, chartHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Press Record to start capturing audio',
      padding.left + chartWidth / 2,
      padding.top + chartHeight / 2
    );
  };

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number
  ) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    const numVerticalLines = 10;
    for (let i = 0; i <= numVerticalLines; i++) {
      const x = padding.left + (chartWidth * i) / numVerticalLines;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    const generateFreqSteps = () => {
      const steps = [];
      const range = maxFrequency - minFrequency;
      if (range <= 1000) {
        for (let f = Math.ceil(minFrequency / 100) * 100; f <= maxFrequency; f += 100) {
          steps.push(f);
        }
      } else if (range <= 5000) {
        for (let f = Math.ceil(minFrequency / 500) * 500; f <= maxFrequency; f += 500) {
          steps.push(f);
        }
      } else {
        for (let f = Math.ceil(minFrequency / 1000) * 1000; f <= maxFrequency; f += 1000) {
          steps.push(f);
        }
      }
      return steps.slice(0, 8);
    };

    const freqSteps = generateFreqSteps();
    freqSteps.forEach(freq => {
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
      for (let f = Math.ceil(minFrequency / 100) * 100; f <= maxFrequency; f += 100) {
        steps.push(f);
      }
    } else if (range <= 5000) {
      for (let f = Math.ceil(minFrequency / 500) * 500; f <= maxFrequency; f += 500) {
        steps.push(f);
      }
    } else {
      for (let f = Math.ceil(minFrequency / 1000) * 1000; f <= maxFrequency; f += 1000) {
        steps.push(f);
      }
    }
    return steps.slice(0, 8);
  };

  const drawAxes = (
    ctx: CanvasRenderingContext2D,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number
  ) => {
    const computedStyle = getComputedStyle(document.documentElement);
    const fgColor = computedStyle.getPropertyValue('--foreground');
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    ctx.fillStyle = `hsl(${fgColor})`;
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const numTimeLabels = 10;
    
    const totalDuration = spectrogramData?.timeStamps[spectrogramData.timeStamps.length - 1] || 10;
    const zoomPercent = Math.max(1, Math.min(100, viewportSettings.zoom));
    const visibleDuration = totalDuration * (zoomPercent / 100);
    const scrollableRange = Math.max(0, totalDuration - visibleDuration);
    const startTime = viewportSettings.scrollPosition * scrollableRange;
    
    for (let i = 0; i <= numTimeLabels; i++) {
      const x = padding.left + (chartWidth * i) / numTimeLabels;
      const time = startTime + (visibleDuration * i) / numTimeLabels;
      ctx.fillText(`${time.toFixed(1)}s`, x, padding.top + chartHeight + 8);
    }

    ctx.save();
    ctx.translate(16, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Frequency (Hz)', 0, 0);
    ctx.restore();
  };

  const drawFrequencyScale = (
    ctx: CanvasRenderingContext2D,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number
  ) => {
    const freqLabels = generateFreqSteps();
    const computedStyle = getComputedStyle(document.documentElement);
    const fgColor = computedStyle.getPropertyValue('--foreground');
    
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `hsl(${fgColor})`;

    freqLabels.forEach(freq => {
      const y = freqToY(freq, padding.top, chartHeight);
      const label = `${freq >= 1000 ? freq / 1000 + 'k' : freq}`;
      
      const labelX = padding.left - 8;
      
      ctx.fillText(label, labelX, y);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
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
    chartHeight: number
  ) => {
    if (!spectrogramData) return;

    const { frequencies, timeStamps } = spectrogramData;
    if (frequencies.length === 0) return;

    const totalDuration = timeStamps[timeStamps.length - 1] || 1;
    
    const zoomPercent = Math.max(1, Math.min(100, viewportSettings.zoom));
    const visibleDuration = totalDuration * (zoomPercent / 100);
    
    const scrollableRange = Math.max(0, totalDuration - visibleDuration);
    const startTime = viewportSettings.scrollPosition * scrollableRange;
    const endTime = startTime + visibleDuration;

    const visibleIndices = frequencies
      .map((_, idx) => ({ idx, time: timeStamps[idx] }))
      .filter(({ time }) => time >= startTime && time <= endTime)
      .map(({ idx }) => idx);

    if (visibleIndices.length === 0) return;

    const declutterThreshold = declutterAmount / 100;
    const idealBarWidth = chartWidth / visibleIndices.length;
    const barWidth = Math.max(1.5, idealBarWidth * 1.1);

    visibleIndices.forEach((timeIndex) => {
      const time = timeStamps[timeIndex];
      const normalizedTime = (time - startTime) / visibleDuration;
      const x = padding.left + normalizedTime * chartWidth;

      const freqData = frequencies[timeIndex];
      const processedMagnitudes = applyDeclutter(freqData, declutterThreshold);
      
      const nyquistFreq = sampleRate / 2;

      for (let freqIndex = 0; freqIndex < processedMagnitudes.length - 1; freqIndex++) {
        const magnitude = processedMagnitudes[freqIndex];
        if (magnitude === 0) continue;

        const freq1 = (freqIndex / freqData.length) * nyquistFreq;
        const freq2 = ((freqIndex + 1) / freqData.length) * nyquistFreq;
        
        if (freq1 > maxFrequency || freq2 < minFrequency) continue;

        const y1 = freqToY(Math.max(freq1, minFrequency), padding.top, chartHeight);
        const y2 = freqToY(Math.min(freq2, maxFrequency), padding.top, chartHeight);
        
        const barHeight = Math.abs(y2 - y1);
        
        const color = magnitudeToColor(magnitude);
        ctx.fillStyle = color;
        ctx.fillRect(x, Math.min(y1, y2), barWidth, Math.max(barHeight, 1));
      }
    });
  };

  const applyDeclutter = (magnitudes: number[], threshold: number): number[] => {
    if (threshold === 0) return magnitudes;

    const maxMagnitude = Math.max(...magnitudes);
    
    const noiseGateThreshold = maxMagnitude * threshold;
    
    const result = magnitudes.map(mag => {
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
      case 'linear':
        scaled = Math.max(0, Math.min(1, scaled));
        break;
      
      case 'logarithmic':
        if (scaled <= 0) {
          scaled = 0;
        } else {
          const logScaled = Math.log10(1 + scaled * 9) / Math.log10(10);
          scaled = Math.max(0, Math.min(1, logScaled));
        }
        break;
      
      case 'power':
        const powered = Math.pow(scaled, 0.5);
        scaled = Math.max(0, Math.min(1, powered));
        break;
      
      default:
        scaled = Math.max(0, Math.min(1, scaled));
    }

    const brightnessMultiplier = brightness / 100;
    return Math.max(0, Math.min(1, scaled * brightnessMultiplier));
  };

  const magnitudeToColor = (magnitude: number): string => {
    const scaled = applyIntensityScaling(magnitude);
    const clamped = Math.max(0, Math.min(1, scaled));
    
    switch (colorScheme) {
      case 'warm':
        if (clamped < 0.25) {
          const t = clamped / 0.25;
          return `rgba(${Math.floor(80 + t * 100)}, ${Math.floor(40 * t)}, 0, ${t * 0.6})`;
        } else if (clamped < 0.6) {
          const t = (clamped - 0.25) / 0.35;
          return `rgba(${Math.floor(180 + t * 75)}, ${Math.floor(40 + t * 120)}, 0, ${0.6 + t * 0.3})`;
        } else {
          const t = (clamped - 0.6) / 0.4;
          return `rgba(255, ${Math.floor(160 + t * 95)}, ${Math.floor(t * 100)}, ${0.9 + t * 0.1})`;
        }
      
      case 'cool':
        if (clamped < 0.25) {
          const t = clamped / 0.25;
          return `rgba(0, ${Math.floor(50 * t)}, ${Math.floor(100 + t * 155)}, ${t * 0.6})`;
        } else if (clamped < 0.6) {
          const t = (clamped - 0.25) / 0.35;
          return `rgba(0, ${Math.floor(50 + t * 155)}, ${Math.floor(200 - t * 50)}, ${0.6 + t * 0.3})`;
        } else {
          const t = (clamped - 0.6) / 0.4;
          return `rgba(${Math.floor(t * 100)}, ${Math.floor(205 + t * 50)}, ${Math.floor(150 + t * 105)}, ${0.9 + t * 0.1})`;
        }
      
      case 'monochrome':
        const gray = Math.floor(clamped * 255);
        return `rgba(${gray}, ${gray}, ${gray}, ${clamped * 0.9 + 0.1})`;
      
      case 'default':
      default:
        if (clamped < 0.2) {
          const t = clamped / 0.2;
          return `rgba(0, 0, ${Math.floor(128 + t * 127)}, ${t * 0.5})`;
        } else if (clamped < 0.5) {
          const t = (clamped - 0.2) / 0.3;
          return `rgba(0, ${Math.floor(t * 255)}, 255, ${0.5 + t * 0.3})`;
        } else if (clamped < 0.8) {
          const t = (clamped - 0.5) / 0.3;
          return `rgba(${Math.floor(t * 255)}, 255, ${Math.floor(255 - t * 255)}, ${0.8 + t * 0.15})`;
        } else {
          const t = (clamped - 0.8) / 0.2;
          return `rgba(255, ${Math.floor(255 - t * 100)}, 0, ${0.95 + t * 0.05})`;
        }
    }
  };

  const drawCrosshair = (
    ctx: CanvasRenderingContext2D,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number
  ) => {
    if (!mousePos) return;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
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
    chartHeight: number
  ) => {
    if (!spectrogramData || spectrogramData.frequencies.length === 0) return;

    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--primary');

    const logMin = Math.log10(minFrequency);
    const logMax = Math.log10(maxFrequency);

    const detectedHarmonics = detectDominantFrequencies(spectrogramData.frequencies);
    
    detectedHarmonics.forEach(({ fundamental, harmonics, strength }) => {
      if (strength < 0.3) return;

      harmonics.forEach(({ freq, strength: harmonicStrength }, index) => {
        if (freq < minFrequency || freq > maxFrequency) return;

        const logFreq = Math.log10(freq);
        const normalizedY = 1 - (logFreq - logMin) / (logMax - logMin);
        const y = padding.top + normalizedY * chartHeight;

        const isFundamental = index === 0;
        const alpha = Math.min(0.7, harmonicStrength * (isFundamental ? 1.5 : 1.2));

        ctx.strokeStyle = `hsl(${primaryColor} / ${alpha})`;
        ctx.lineWidth = isFundamental ? 2 : 1.5;
        ctx.setLineDash(isFundamental ? [8, 4] : [4, 2]);

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        if (isFundamental) {
          ctx.fillStyle = `hsl(${primaryColor} / ${Math.min(0.9, alpha + 0.2)})`;
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.round(freq)}Hz`, padding.left - 4, y - 2);
        }
      });
    });

    ctx.setLineDash([]);
  };

  const detectDominantFrequencies = (frequencies: number[][]): Array<{ fundamental: number; harmonics: Array<{ freq: number; strength: number }>; strength: number }> => {
    if (frequencies.length === 0) return [];

    const numBins = frequencies[0].length;
    const nyquistFreq = sampleRate / 2;
    const binToFreq = (bin: number) => (bin / numBins) * nyquistFreq;
    const freqToBin = (freq: number) => Math.round((freq / nyquistFreq) * numBins);

    const totalDuration = spectrogramData?.timeStamps[spectrogramData.timeStamps.length - 1] || 1;
    const zoomPercent = Math.max(1, Math.min(100, viewportSettings.zoom));
    const visibleDuration = totalDuration * (zoomPercent / 100);
    const scrollableRange = Math.max(0, totalDuration - visibleDuration);
    const startTime = viewportSettings.scrollPosition * scrollableRange;
    const endTime = startTime + visibleDuration;

    const visibleFrames = frequencies.filter((_, idx) => {
      const time = spectrogramData?.timeStamps[idx] || 0;
      return time >= startTime && time <= endTime;
    });

    if (visibleFrames.length === 0) return [];

    const averageMagnitudes = new Float32Array(numBins);
    visibleFrames.forEach(frame => {
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
        averageMagnitudes[i] > 0.15
      ) {
        const freq = binToFreq(i);
        if (freq >= 80 && freq <= 1200) {
          peaks.push({ bin: i, freq, magnitude: averageMagnitudes[i] });
        }
      }
    }

    peaks.sort((a, b) => b.magnitude - a.magnitude);
    const topPeaks = peaks.slice(0, 3);

    const harmonicSeries: Array<{ fundamental: number; harmonics: Array<{ freq: number; strength: number }>; strength: number }> = [];

    topPeaks.forEach(peak => {
      const fundamental = peak.freq;
      const harmonics: Array<{ freq: number; strength: number }> = [
        { freq: fundamental, strength: peak.magnitude }
      ];
      
      for (let n = 2; n <= 8; n++) {
        const expectedHarmonic = fundamental * n;
        if (expectedHarmonic > sampleRate / 2) break;

        const expectedBin = freqToBin(expectedHarmonic);
        const tolerance = 3;
        
        let maxMag = 0;
        let bestBin = expectedBin;
        for (let b = expectedBin - tolerance; b <= expectedBin + tolerance; b++) {
          if (b >= 0 && b < averageMagnitudes.length) {
            if (averageMagnitudes[b] > maxMag) {
              maxMag = averageMagnitudes[b];
              bestBin = b;
            }
          }
        }

        if (maxMag > 0.08) {
          const actualFreq = binToFreq(bestBin);
          harmonics.push({ freq: actualFreq, strength: maxMag });
        }
      }

      if (harmonics.length >= 3) {
        harmonicSeries.push({
          fundamental,
          harmonics,
          strength: Math.min(1, peak.magnitude * 1.5)
        });
      }
    });

    return harmonicSeries;
  };

  const drawPlaybackIndicator = (
    ctx: CanvasRenderingContext2D,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number
  ) => {
    if (!spectrogramData) return;

    const totalDuration = spectrogramData.timeStamps[spectrogramData.timeStamps.length - 1] || 1;
    const zoomPercent = Math.max(1, Math.min(100, viewportSettings.zoom));
    const visibleDuration = totalDuration * (zoomPercent / 100);
    const scrollableRange = Math.max(0, totalDuration - visibleDuration);
    const startTime = viewportSettings.scrollPosition * scrollableRange;
    const endTime = startTime + visibleDuration;

    if (playbackTime < startTime || playbackTime > endTime) return;

    const normalizedTime = (playbackTime - startTime) / visibleDuration;
    const x = padding.left + normalizedTime * chartWidth;

    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--primary');
    
    ctx.strokeStyle = `hsl(${primaryColor})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.stroke();

    ctx.fillStyle = `hsl(${primaryColor})`;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x - 5, padding.top - 8);
    ctx.lineTo(x + 5, padding.top - 8);
    ctx.closePath();
    ctx.fill();
  };

  const drawRecordingIndicator = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const computedStyle = getComputedStyle(document.documentElement);
    const destructiveColor = computedStyle.getPropertyValue('--destructive');
    const fgColor = computedStyle.getPropertyValue('--foreground');
    
    ctx.fillStyle = `hsl(${destructiveColor})`;
    ctx.beginPath();
    ctx.arc(width - 24, 24, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsl(${fgColor})`;
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('REC', width - 36, 24);
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
    <div ref={containerRef} className="w-full h-full bg-background">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        data-testid="canvas-spectrogram"
      />
    </div>
  );
});
