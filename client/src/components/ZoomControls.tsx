import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Maximize2 } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  scrollPosition: number;
  totalDuration: number;
  visibleDuration: number;
  onZoomChange: (value: number) => void;
  onScrollChange: (value: number) => void;
  onFitToScreen: () => void;
  disabled?: boolean;
}

export function ZoomControls({
  zoom,
  scrollPosition,
  totalDuration,
  visibleDuration,
  onZoomChange,
  onScrollChange,
  onFitToScreen,
  disabled = false,
}: ZoomControlsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTime = scrollPosition * totalDuration;
  const endTime = Math.min(startTime + visibleDuration, totalDuration);

  return (
    <div className="flex items-center h-full px-6 gap-4">
      {/* Zoom Slider */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Zoom
        </span>
        <Slider
          value={[zoom]}
          onValueChange={(values) => onZoomChange(values[0])}
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          className="flex-1"
          data-testid="slider-zoom"
        />
      </div>

      {/* Range Display */}
      {totalDuration > 0 && (
        <div className="text-sm font-mono text-muted-foreground">
          Showing {formatTime(startTime)} - {formatTime(endTime)} of {formatTime(totalDuration)}
        </div>
      )}

      {/* Fit to Screen Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={onFitToScreen}
        disabled={disabled}
        className="gap-2"
        data-testid="button-fit-screen"
      >
        <Maximize2 className="h-4 w-4" />
        Fit to Screen
      </Button>

      {/* Scroll Position (if zoomed in) */}
      {zoom < 100 && totalDuration > 0 && (
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs font-medium text-muted-foreground">Scroll</span>
          <Slider
            value={[scrollPosition * 100]}
            onValueChange={(values) => onScrollChange(values[0] / 100)}
            min={0}
            max={100}
            step={1}
            disabled={disabled}
            className="w-32"
            data-testid="slider-scroll"
          />
        </div>
      )}
    </div>
  );
}
