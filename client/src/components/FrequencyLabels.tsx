interface FrequencyLabelsProps {
  minFrequency: number;
  maxFrequency: number;
}

export function FrequencyLabels({ minFrequency, maxFrequency }: FrequencyLabelsProps) {
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

  const freqToYPercent = (freq: number): number => {
    const logMin = Math.log10(minFrequency);
    const logMax = Math.log10(maxFrequency);
    const logFreq = Math.log10(Math.max(freq, minFrequency));
    const normalized = (logFreq - logMin) / (logMax - logMin);
    
    const paddingTopPercent = 1.5;
    const paddingBottomPercent = 3;
    const availablePercent = 100 - paddingTopPercent - paddingBottomPercent;
    
    return paddingTopPercent + availablePercent * (1 - normalized);
  };

  const freqSteps = generateFreqSteps();

  return (
    <div className="relative w-12 h-full pointer-events-none flex-shrink-0">
      {freqSteps.map(freq => {
        const yPercent = freqToYPercent(freq);
        const label = freq >= 1000 ? `${freq / 1000}k` : freq.toString();
        
        return (
          <div
            key={freq}
            className="absolute right-2 text-xs text-foreground font-medium"
            style={{
              top: `${yPercent}%`,
              transform: 'translateY(-50%)',
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
