import { Slider } from '@/components/ui/slider';
import type { LucideIcon } from 'lucide-react';

interface SliderControlProps {
  icon: LucideIcon;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  className?: string;
  'data-testid'?: string;
}

export function SliderControl({
  icon: Icon,
  value,
  onChange,
  min,
  max,
  className = '',
  'data-testid': testId,
}: SliderControlProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-mono text-foreground">
          {Math.round(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={min}
        max={max}
        step={1}
        className="w-full"
        data-testid={testId}
      />
    </div>
  );
}
