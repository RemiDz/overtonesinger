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
  const draggingRef = useRef<"low" | "high" | null>(null);

  // Keep ref in sync for use in native event listeners
  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  // Block ALL touch scrolling/pull-to-refresh while dragging.
  // Must be a native listener with { passive: false } — React's
  // synthetic onTouchMove cannot call preventDefault() in modern browsers.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const blockTouch = (e: TouchEvent) => {
      if (draggingRef.current) {
        e.preventDefault();
      }
    };

    el.addEventListener("touchmove", blockTouch, { passive: false });
    return () => el.removeEventListener("touchmove", blockTouch);
  }, [enabled]);

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
      e.preventDefault();
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

  const formatFreq = (f: number) =>
    f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${Math.round(f)}`;

  // Larger touch target on mobile (32px vs 16px)
  const handleHeight = 32;
  const halfHandle = handleHeight / 2;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        zIndex: 20,
        // Allow pointer events on the whole container while dragging
        // so the finger can move freely without leaving the handle
        pointerEvents: dragging ? "auto" : "none",
        touchAction: "none",
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Dimmed region above the high-frequency handle (muted highs) */}
      <div
        className="absolute"
        style={{
          left: padding.left,
          top: padding.top,
          right: padding.right,
          height: Math.max(0, highY - padding.top),
          background: "rgba(0, 0, 0, 0.55)",
          pointerEvents: "none",
        }}
      />

      {/* Dimmed region below the low-frequency handle (muted lows) */}
      <div
        className="absolute"
        style={{
          left: padding.left,
          top: lowY,
          right: padding.right,
          height: Math.max(0, padding.top + chartHeight - lowY),
          background: "rgba(0, 0, 0, 0.55)",
          pointerEvents: "none",
        }}
      />

      {/* High frequency handle (top of band) */}
      <div
        className="absolute"
        style={{
          left: padding.left,
          right: padding.right,
          top: highY - halfHandle,
          height: handleHeight,
          cursor: "ns-resize",
          pointerEvents: "auto",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown("high")}
      >
        <div
          className="w-full h-[2px] absolute top-1/2 -translate-y-1/2"
          style={{ background: "rgba(0, 200, 255, 0.8)" }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium select-none"
          style={{
            right: 0,
            background: "rgba(0, 200, 255, 0.9)",
            color: "#000",
            touchAction: "none",
          }}
        >
          ▼ {formatFreq(filterBand.highFreq)} Hz
        </div>
      </div>

      {/* Low frequency handle (bottom of band) */}
      <div
        className="absolute"
        style={{
          left: padding.left,
          right: padding.right,
          top: lowY - halfHandle,
          height: handleHeight,
          cursor: "ns-resize",
          pointerEvents: "auto",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown("low")}
      >
        <div
          className="w-full h-[2px] absolute top-1/2 -translate-y-1/2"
          style={{ background: "rgba(255, 180, 0, 0.8)" }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium select-none"
          style={{
            right: 0,
            background: "rgba(255, 180, 0, 0.9)",
            color: "#000",
            touchAction: "none",
          }}
        >
          ▲ {formatFreq(filterBand.lowFreq)} Hz
        </div>
      </div>
    </div>
  );
}
