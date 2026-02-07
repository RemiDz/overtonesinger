import { useState, useRef, useCallback, useEffect } from "react";

export interface FilterBand {
  lowFreq: number;
  highFreq: number;
}

interface FrequencyBandFilterProps {
  enabled: boolean;
  minFrequency: number;
  maxFrequency: number;
  filterBand: FilterBand;
  onFilterChange: (band: FilterBand) => void;
  /** Padding matching the spectrogram chart area */
  padding: { top: number; right: number; bottom: number; left: number };
}

/**
 * Overlay component that renders draggable frequency band handles
 * on top of the spectrogram canvas. The area outside the band is dimmed.
 */
export function FrequencyBandFilter({
  enabled,
  minFrequency,
  maxFrequency,
  filterBand,
  onFilterChange,
  padding,
}: FrequencyBandFilterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"low" | "high" | null>(null);

  // Convert frequency to Y position (logarithmic scale, matching spectrogram)
  const freqToY = useCallback(
    (freq: number, chartHeight: number): number => {
      const logMin = Math.log(minFrequency);
      const logMax = Math.log(maxFrequency);
      const logFreq = Math.log(Math.max(freq, minFrequency));
      const normalized = (logFreq - logMin) / (logMax - logMin);
      return padding.top + chartHeight * (1 - normalized);
    },
    [minFrequency, maxFrequency, padding.top],
  );

  // Convert Y position to frequency (inverse log scale)
  const yToFreq = useCallback(
    (y: number, chartHeight: number): number => {
      const normalized = 1 - (y - padding.top) / chartHeight;
      const logMin = Math.log(minFrequency);
      const logMax = Math.log(maxFrequency);
      const logFreq = logMin + normalized * (logMax - logMin);
      return Math.exp(logFreq);
    },
    [minFrequency, maxFrequency, padding.top],
  );

  const getChartHeight = useCallback(() => {
    if (!containerRef.current) return 400;
    return containerRef.current.clientHeight - padding.top - padding.bottom;
  }, [padding]);

  const handlePointerDown = useCallback(
    (handle: "low" | "high") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const chartHeight = getChartHeight();
      const clampedY = Math.max(padding.top, Math.min(padding.top + chartHeight, y));
      const freq = yToFreq(clampedY, chartHeight);

      if (dragging === "low") {
        const clamped = Math.max(minFrequency, Math.min(freq, filterBand.highFreq - 50));
        onFilterChange({ ...filterBand, lowFreq: Math.round(clamped) });
      } else {
        const clamped = Math.min(maxFrequency, Math.max(freq, filterBand.lowFreq + 50));
        onFilterChange({ ...filterBand, highFreq: Math.round(clamped) });
      }
    },
    [dragging, filterBand, onFilterChange, yToFreq, getChartHeight, minFrequency, maxFrequency, padding.top],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  if (!enabled) return null;

  const chartHeight = containerRef.current
    ? containerRef.current.clientHeight - padding.top - padding.bottom
    : 400;

  const lowY = freqToY(filterBand.lowFreq, chartHeight);
  const highY = freqToY(filterBand.highFreq, chartHeight);

  const formatFreq = (f: number) => (f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${Math.round(f)}`);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dimmed region above the high-frequency handle (muted highs) */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: padding.left,
          top: padding.top,
          right: padding.right,
          height: Math.max(0, highY - padding.top),
          background: "rgba(0, 0, 0, 0.55)",
        }}
      />

      {/* Dimmed region below the low-frequency handle (muted lows) */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: padding.left,
          top: lowY,
          right: padding.right,
          height: Math.max(0, padding.top + chartHeight - lowY),
          background: "rgba(0, 0, 0, 0.55)",
        }}
      />

      {/* High frequency handle (top of band) — drag down to lower the ceiling */}
      <div
        className="absolute pointer-events-auto cursor-ns-resize"
        style={{
          left: padding.left,
          right: padding.right,
          top: highY - 8,
          height: 16,
        }}
        onPointerDown={handlePointerDown("high")}
      >
        <div
          className="w-full h-[2px] absolute top-1/2 -translate-y-1/2"
          style={{ background: "rgba(0, 200, 255, 0.8)" }}
        />
        {/* Handle grip */}
        <div
          className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium select-none"
          style={{
            right: 0,
            background: "rgba(0, 200, 255, 0.9)",
            color: "#000",
          }}
        >
          ▼ {formatFreq(filterBand.highFreq)} Hz
        </div>
      </div>

      {/* Low frequency handle (bottom of band) — drag up to raise the floor */}
      <div
        className="absolute pointer-events-auto cursor-ns-resize"
        style={{
          left: padding.left,
          right: padding.right,
          top: lowY - 8,
          height: 16,
        }}
        onPointerDown={handlePointerDown("low")}
      >
        <div
          className="w-full h-[2px] absolute top-1/2 -translate-y-1/2"
          style={{ background: "rgba(255, 180, 0, 0.8)" }}
        />
        {/* Handle grip */}
        <div
          className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium select-none"
          style={{
            right: 0,
            background: "rgba(255, 180, 0, 0.9)",
            color: "#000",
          }}
        >
          ▲ {formatFreq(filterBand.lowFreq)} Hz
        </div>
      </div>
    </div>
  );
}
