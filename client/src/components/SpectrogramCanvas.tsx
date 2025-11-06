import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { SpectrogramData, ViewportSettings } from '@shared/schema';

interface SpectrogramCanvasProps {
  spectrogramData: SpectrogramData | null;
  viewportSettings: ViewportSettings;
  currentTime: number;
  isRecording: boolean;
  isPlaying?: boolean;
  playbackTime?: number;
  declutterAmount: number;
  showFrequencyMarkers?: boolean;
}

export interface SpectrogramCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

export const SpectrogramCanvas = forwardRef<SpectrogramCanvasHandle, SpectrogramCanvasProps>(
  ({ spectrogramData, viewportSettings, currentTime, isRecording, isPlaying = false, playbackTime = 0, declutterAmount, showFrequencyMarkers = true }, ref) => {
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
  }, [spectrogramData, viewportSettings, currentTime, dimensions, declutterAmount, mousePos, isPlaying, playbackTime, showFrequencyMarkers]);

  const drawSpectrogram = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const padding = { top: 32, right: 32, bottom: 48, left: 64 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = 'hsl(var(--background))';
    ctx.fillRect(0, 0, width, height);

    if (!spectrogramData || spectrogramData.frequencies.length === 0) {
      drawEmptyState(ctx, width, height, padding);
      return;
    }

    drawGrid(ctx, padding, chartWidth, chartHeight);
    drawAxes(ctx, padding, chartWidth, chartHeight);
    drawSpectrogramData(ctx, padding, chartWidth, chartHeight);
    
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

    ctx.fillStyle = 'hsl(var(--muted-foreground))';
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
    ctx.strokeStyle = 'hsl(var(--border))';
    ctx.lineWidth = 1;

    const numVerticalLines = 10;
    for (let i = 0; i <= numVerticalLines; i++) {
      const x = padding.left + (chartWidth * i) / numVerticalLines;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    const freqSteps = [100, 200, 500, 1000, 2000, 5000];
    freqSteps.forEach(freq => {
      const y = freqToY(freq, padding.top, chartHeight);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    });
  };

  const freqToY = (freq: number, yStart: number, height: number): number => {
    const minFreq = 20;
    const maxFreq = 5000;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logFreq = Math.log10(Math.max(freq, minFreq));
    const normalized = (logFreq - logMin) / (logMax - logMin);
    return yStart + height * (1 - normalized);
  };

  const drawAxes = (
    ctx: CanvasRenderingContext2D,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number
  ) => {
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const freqLabels = [100, 200, 500, 1000, 2000, 5000];
    freqLabels.forEach(freq => {
      const y = freqToY(freq, padding.top, chartHeight);
      ctx.fillText(`${freq >= 1000 ? freq / 1000 + 'k' : freq} Hz`, padding.left - 8, y);
    });

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

    const totalHeight = padding.top + chartHeight + padding.bottom;
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Time (seconds)', padding.left + chartWidth / 2, totalHeight - 16);
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

    visibleIndices.forEach((timeIndex) => {
      const time = timeStamps[timeIndex];
      const normalizedTime = (time - startTime) / visibleDuration;
      const x = padding.left + normalizedTime * chartWidth;

      const freqData = frequencies[timeIndex];
      
      const processedMagnitudes = applyDeclutter(freqData, declutterThreshold);

      processedMagnitudes.forEach((magnitude, freqIndex) => {
        const freq = (freqIndex / freqData.length) * 5000;
        if (freq > 5000) return;

        const y = freqToY(freq, padding.top, chartHeight);
        
        const color = magnitudeToColor(magnitude);
        ctx.fillStyle = color;
        const barWidth = Math.max(1, chartWidth / visibleIndices.length);
        ctx.fillRect(x, y, barWidth, 2);
      });
    });
  };

  const applyDeclutter = (magnitudes: number[], threshold: number): number[] => {
    if (threshold === 0) return magnitudes;

    const result = new Float32Array(magnitudes.length);
    const windowSize = 3;

    for (let i = 0; i < magnitudes.length; i++) {
      let localMax = magnitudes[i];
      
      for (let j = Math.max(0, i - windowSize); j <= Math.min(magnitudes.length - 1, i + windowSize); j++) {
        localMax = Math.max(localMax, magnitudes[j]);
      }

      const isPeak = magnitudes[i] >= localMax * 0.9;
      
      if (isPeak) {
        result[i] = magnitudes[i];
      } else {
        const suppression = threshold * 0.8;
        result[i] = Math.max(0, magnitudes[i] - suppression);
      }
    }

    return Array.from(result);
  };

  const magnitudeToColor = (magnitude: number): string => {
    const clamped = Math.max(0, Math.min(1, magnitude));
    
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
  };

  const drawCrosshair = (
    ctx: CanvasRenderingContext2D,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number
  ) => {
    if (!mousePos) return;

    ctx.strokeStyle = 'hsl(var(--primary) / 0.5)';
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

    const staticMarkers = [
      { freq: 110, label: 'A2' },
      { freq: 220, label: 'A3' },
      { freq: 440, label: 'A4' },
      { freq: 880, label: 'A5' },
      { freq: 1760, label: 'A6' },
      { freq: 1000, label: '1k' },
      { freq: 2000, label: '2k' },
      { freq: 3000, label: '3k' },
      { freq: 4000, label: '4k' },
    ];

    const minFreq = 20;
    const maxFreq = 5000;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);

    staticMarkers.forEach(({ freq, label }) => {
      if (freq < minFreq || freq > maxFreq) return;

      const logFreq = Math.log10(freq);
      const normalizedY = 1 - (logFreq - logMin) / (logMax - logMin);
      const y = padding.top + normalizedY * chartHeight;

      ctx.strokeStyle = 'hsl(var(--muted-foreground) / 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      ctx.fillStyle = 'hsl(var(--muted-foreground) / 0.5)';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, padding.left - 4, y);
    });

    const detectedHarmonics = detectDominantFrequencies(spectrogramData.frequencies);
    
    detectedHarmonics.forEach(({ fundamental, harmonics, strength }) => {
      if (strength < 0.3) return;

      harmonics.forEach(({ freq, strength: harmonicStrength }, index) => {
        if (freq < minFreq || freq > maxFreq) return;

        const logFreq = Math.log10(freq);
        const normalizedY = 1 - (logFreq - logMin) / (logMax - logMin);
        const y = padding.top + normalizedY * chartHeight;

        const isFundamental = index === 0;
        const alpha = Math.min(0.7, harmonicStrength * (isFundamental ? 1.5 : 1.2));

        ctx.strokeStyle = `hsl(var(--primary) / ${alpha})`;
        ctx.lineWidth = isFundamental ? 2 : 1.5;
        ctx.setLineDash(isFundamental ? [8, 4] : [4, 2]);

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        if (isFundamental) {
          ctx.fillStyle = `hsl(var(--primary) / ${Math.min(0.9, alpha + 0.2)})`;
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.round(freq)}Hz (F0)`, padding.left + 8, y - 2);
        }
      });
    });

    ctx.setLineDash([]);
  };

  const detectDominantFrequencies = (frequencies: number[][]): Array<{ fundamental: number; harmonics: Array<{ freq: number; strength: number }>; strength: number }> => {
    if (frequencies.length === 0) return [];

    const maxFreq = 5000;
    const numBins = frequencies[0].length;
    const binToFreq = (bin: number) => (bin / numBins) * maxFreq;
    const freqToBin = (freq: number) => Math.round((freq / maxFreq) * numBins);

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
        if (expectedHarmonic > maxFreq) break;

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

    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.stroke();

    ctx.fillStyle = 'hsl(var(--primary))';
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x - 5, padding.top - 8);
    ctx.lineTo(x + 5, padding.top - 8);
    ctx.closePath();
    ctx.fill();
  };

  const drawRecordingIndicator = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = 'hsl(var(--destructive))';
    ctx.beginPath();
    ctx.arc(width - 24, 24, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'hsl(var(--foreground))';
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
    <div ref={containerRef} className="w-full h-full p-8 bg-background">
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
