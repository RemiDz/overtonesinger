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
    <div className="w-full px-2 sm:px-4 py-1.5">
      {/* Top Row: Zoom Slider and Fit Button */}
      <div className="flex items-center gap-2 sm:gap-4 mb-1.5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            Zoom
          </span>
          <Slider
            value={[100 - zoom]}
            onValueChange={(values) => onZoomChange(100 - values[0])}
            min={0}
            max={100}
            step={1}
            disabled={disabled}
            className="flex-1"
            data-testid="slider-zoom"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onFitToScreen}
          disabled={disabled}
          className="gap-2 flex-shrink-0"
          data-testid="button-fit-screen"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="hidden sm:inline">Fit to Screen</span>
          <span className="sm:hidden">Fit</span>
        </Button>
      </div>

      {/* Bottom Row: Scroll Slider and Time Display */}
      {totalDuration > 0 && (
        <div className="flex items-center gap-2 sm:gap-4">
          {zoom < 100 && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Scroll
              </span>
              <Slider
                value={[scrollPosition * 100]}
                onValueChange={(values) => onScrollChange(values[0] / 100)}
                min={0}
                max={100}
                step={1}
                disabled={disabled}
                className="flex-1"
                data-testid="slider-scroll"
              />
            </div>
          )}
          <div className="text-xs font-mono text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatTime(startTime)} - {formatTime(endTime)} / {formatTime(totalDuration)}
          </div>
        </div>
      )}
    </div>
  );
}
