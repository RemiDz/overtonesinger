import { Slider } from '@/components/ui/slider';

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  className?: string;
  'data-testid'?: string;
}

export function SliderControl({
  label,
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
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
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
