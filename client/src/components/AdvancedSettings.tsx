import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { IntensityScaleMode, ColorScheme, FFTSize } from '@shared/schema';

interface AdvancedSettingsProps {
  intensityScale: IntensityScaleMode;
  intensityBoost: number;
  minFrequency: number;
  maxFrequency: number;
  fftSize: FFTSize;
  colorScheme: ColorScheme;
  onIntensityScaleChange: (value: IntensityScaleMode) => void;
  onIntensityBoostChange: (value: number) => void;
  onFrequencyRangeChange: (min: number, max: number) => void;
  onFFTSizeChange: (value: FFTSize) => void;
  onColorSchemeChange: (value: ColorScheme) => void;
}

export function AdvancedSettings({
  intensityScale,
  intensityBoost,
  minFrequency,
  maxFrequency,
  fftSize,
  colorScheme,
  onIntensityScaleChange,
  onIntensityBoostChange,
  onFrequencyRangeChange,
  onFFTSizeChange,
  onColorSchemeChange,
}: AdvancedSettingsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-testid="button-advanced-settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none [&>button]:hidden" data-testid="dialog-advanced-settings">
        <div className="h-full flex flex-col">
          <DialogHeader className="flex-none px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Advanced Settings</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Customize visualization parameters
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                data-testid="button-close-settings"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="space-y-3">
                <h5 className="text-sm font-medium">Analysis</h5>
                
                <div className="space-y-2">
                  <Label htmlFor="fft-size" className="text-sm">
                    FFT Window Size
                  </Label>
                  <Select
                    value={fftSize.toString()}
                    onValueChange={(value) => onFFTSizeChange(parseInt(value) as FFTSize)}
                  >
                    <SelectTrigger id="fft-size" data-testid="select-fft-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024">1024 (faster, less detail)</SelectItem>
                      <SelectItem value="2048">2048 (balanced)</SelectItem>
                      <SelectItem value="4096">4096 (good detail)</SelectItem>
                      <SelectItem value="8192">8192 (high resolution)</SelectItem>
                      <SelectItem value="16384">16384 (very high resolution)</SelectItem>
                      <SelectItem value="32768">32768 (maximum resolution)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Higher values provide better frequency resolution
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-freq" className="text-sm">
                    Min Frequency: {minFrequency} Hz
                  </Label>
                  <Slider
                    id="min-freq"
                    value={[minFrequency]}
                    onValueChange={(values) => {
                      const newValue = values[0];
                      if (newValue !== undefined && newValue < maxFrequency) {
                        onFrequencyRangeChange(newValue, maxFrequency);
                      }
                    }}
                    min={20}
                    max={1000}
                    step={10}
                    className="w-full"
                    data-testid="slider-min-frequency"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-freq" className="text-sm">
                    Max Frequency: {maxFrequency} Hz
                  </Label>
                  <Slider
                    id="max-freq"
                    value={[maxFrequency]}
                    onValueChange={(values) => {
                      const newValue = values[0];
                      if (newValue !== undefined && newValue > minFrequency) {
                        onFrequencyRangeChange(minFrequency, newValue);
                      }
                    }}
                    min={1000}
                    max={10000}
                    step={100}
                    className="w-full"
                    data-testid="slider-max-frequency"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h5 className="text-sm font-medium">Color & Intensity</h5>

                <div className="space-y-2">
                  <Label htmlFor="color-scheme" className="text-sm">
                    Color Scheme
                  </Label>
                  <Select
                    value={colorScheme}
                    onValueChange={(value) => onColorSchemeChange(value as ColorScheme)}
                  >
                    <SelectTrigger id="color-scheme" data-testid="select-color-scheme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (blue-cyan-yellow-red)</SelectItem>
                      <SelectItem value="warm">Warm (orange-red-yellow)</SelectItem>
                      <SelectItem value="cool">Cool (blue-green-cyan)</SelectItem>
                      <SelectItem value="monochrome">Monochrome (grayscale)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="intensity-scale" className="text-sm">
                    Intensity Scaling
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
                      <SelectItem value="logarithmic">Logarithmic</SelectItem>
                      <SelectItem value="power">Power (√x)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {intensityScale === 'linear' && 'Direct 1:1 mapping'}
                    {intensityScale === 'logarithmic' && 'Emphasizes weak signals'}
                    {intensityScale === 'power' && 'Balanced visibility'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intensity-boost" className="text-sm">
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
