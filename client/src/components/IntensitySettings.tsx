import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import type { IntensityScaleMode } from '@shared/schema';

interface IntensitySettingsProps {
  intensityScale: IntensityScaleMode;
  intensityBoost: number;
  onIntensityScaleChange: (value: IntensityScaleMode) => void;
  onIntensityBoostChange: (value: number) => void;
}

export function IntensitySettings({
  intensityScale,
  intensityBoost,
  onIntensityScaleChange,
  onIntensityBoostChange,
}: IntensitySettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-testid="button-intensity-settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" data-testid="popover-intensity-settings">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Color Intensity</h4>
            <p className="text-xs text-muted-foreground">
              Adjust how magnitude values are mapped to colors
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="intensity-scale" className="text-xs">
                Scaling Mode
              </Label>
              <Select
                value={intensityScale}
                onValueChange={(value) => onIntensityScaleChange(value as IntensityScaleMode)}
              >
                <SelectTrigger id="intensity-scale" data-testid="select-intensity-scale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="logarithmic">Logarithmic (default)</SelectItem>
                  <SelectItem value="power">Power (square root)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {intensityScale === 'linear' && 'Direct 1:1 mapping'}
                {intensityScale === 'logarithmic' && 'Emphasizes weak signals'}
                {intensityScale === 'power' && 'Balanced visibility'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intensity-boost" className="text-xs">
                Brightness: {intensityBoost}%
              </Label>
              <Slider
                id="intensity-boost"
                value={[intensityBoost]}
                onValueChange={(values) => {
                  const newValue = values[0];
                  if (newValue !== undefined) {
                    onIntensityBoostChange(newValue);
                  }
                }}
                min={25}
                max={200}
                step={5}
                className="w-full"
                data-testid="slider-intensity-boost"
              />
              <p className="text-xs text-muted-foreground">
                Multiplier for overall color intensity
              </p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
