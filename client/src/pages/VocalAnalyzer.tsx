import { useState, useRef, useEffect } from 'react';
import { SpectrogramCanvas, type SpectrogramCanvasHandle } from '@/components/SpectrogramCanvas';
import { TransportControls } from '@/components/TransportControls';
import { SliderControl } from '@/components/SliderControl';
import { ZoomControls } from '@/components/ZoomControls';
import { AdvancedSettings } from '@/components/AdvancedSettings';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useToast } from '@/hooks/use-toast';
import { exportToWAV, downloadBlob, exportCanvasToPNG } from '@/lib/audioExport';
import { Volume2, Sun, Contrast } from 'lucide-react';
import type { RecordingState, AudioSettings, ViewportSettings, IntensityScaleMode, ColorScheme, FFTSize } from '@shared/schema';

export default function VocalAnalyzer() {
  const { toast } = useToast();
  const spectrogramCanvasRef = useRef<SpectrogramCanvasHandle>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isAutoAdjusted, setIsAutoAdjusted] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<{ brightness: number; declutterAmount: number } | null>(null);
  
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    microphoneGain: 154,
    brightness: 137,
    declutterAmount: 0,
    sampleRate: 48000,
    fftSize: 4096,
    intensityScale: 'power',
    intensityBoost: 100,
    minFrequency: 50,
    maxFrequency: 4000,
    colorScheme: 'default',
  });

  const [viewportSettings, setViewportSettings] = useState<ViewportSettings>({
    zoom: 100,
    scrollPosition: 0,
    visibleDuration: 10,
  });

  const {
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
    reset,
    spectrogramData,
    audioBuffer,
    isProcessing,
    error,
    sampleRate,
  } = useAudioAnalyzer(audioSettings);

  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Audio Error',
        description: error,
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (recordingState === 'recording' && spectrogramData) {
      const currentDuration = spectrogramData.timeStamps[spectrogramData.timeStamps.length - 1] || 0;
      setCurrentTime(currentDuration);
      setTotalDuration(currentDuration);
      
      const liveWindowDuration = 10;
      
      if (currentDuration <= liveWindowDuration) {
        setViewportSettings({
          zoom: 100,
          scrollPosition: 0,
          visibleDuration: liveWindowDuration,
        });
      } else {
        const zoomPercent = (liveWindowDuration / currentDuration) * 100;
        const scrollPosition = 1;
        
        setViewportSettings({
          zoom: zoomPercent,
          scrollPosition: scrollPosition,
          visibleDuration: liveWindowDuration,
        });
      }
    }
  }, [recordingState, spectrogramData]);

  const handleRecord = async () => {
    if (recordingState === 'idle' || recordingState === 'stopped') {
      try {
        await startRecording();
        setRecordingState('recording');
        setCurrentTime(0);
        setTotalDuration(0);
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Recording Failed',
          description: err instanceof Error ? err.message : 'Could not access microphone',
        });
      }
    }
  };

  const handlePlay = () => {
    if (recordingState === 'stopped' && audioBuffer) {
      setPlaybackTime(0);
      playRecording(
        (time) => setPlaybackTime(time),
        () => {
          setRecordingState('stopped');
          setPlaybackTime(0);
        }
      );
      setRecordingState('playing');
    }
  };

  const handleStop = () => {
    if (recordingState === 'recording') {
      const duration = stopRecording();
      setRecordingState('stopped');
      setTotalDuration(duration);
      setViewportSettings({
        zoom: 100,
        scrollPosition: 0,
        visibleDuration: duration || 10,
      });
    } else if (recordingState === 'playing') {
      stopPlayback();
      setRecordingState('stopped');
      setPlaybackTime(0);
    }
  };

  const handleReset = () => {
    reset();
    setRecordingState('idle');
    setCurrentTime(0);
    setPlaybackTime(0);
    setTotalDuration(0);
    setIsAutoAdjusted(false);
    setOriginalSettings(null);
    setViewportSettings({
      zoom: 100,
      scrollPosition: 0,
      visibleDuration: 10,
    });
  };

  const handleGainChange = (value: number) => {
    setAudioSettings(prev => ({ ...prev, microphoneGain: value }));
  };

  const handleBrightnessChange = (value: number) => {
    setAudioSettings(prev => ({ ...prev, brightness: value }));
  };

  const handleDeclutterChange = (value: number) => {
    setAudioSettings(prev => ({ ...prev, declutterAmount: value }));
  };

  const handleIntensityScaleChange = (value: IntensityScaleMode) => {
    setAudioSettings(prev => ({ ...prev, intensityScale: value }));
  };

  const handleIntensityBoostChange = (value: number) => {
    setAudioSettings(prev => ({ ...prev, intensityBoost: value }));
  };

  const handleFrequencyRangeChange = (min: number, max: number) => {
    setAudioSettings(prev => ({ ...prev, minFrequency: min, maxFrequency: max }));
  };

  const handleFFTSizeChange = (value: FFTSize) => {
    setAudioSettings(prev => ({ ...prev, fftSize: value }));
  };

  const handleColorSchemeChange = (value: ColorScheme) => {
    setAudioSettings(prev => ({ ...prev, colorScheme: value }));
  };

  const handleZoomChange = (value: number) => {
    setViewportSettings(prev => ({ ...prev, zoom: value }));
  };

  const handleScrollChange = (value: number) => {
    setViewportSettings(prev => ({ ...prev, scrollPosition: value }));
  };

  const handleFitToScreen = () => {
    setViewportSettings({
      zoom: 100,
      scrollPosition: 0,
      visibleDuration: totalDuration || 10,
    });
  };

  const handleExportWAV = () => {
    if (!audioBuffer) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'No recording available to export',
      });
      return;
    }

    try {
      const wavBlob = exportToWAV(audioBuffer, sampleRate);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      downloadBlob(wavBlob, `vocal-recording-${timestamp}.wav`);
      toast({
        title: 'Export Successful',
        description: 'WAV file downloaded',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export WAV file',
      });
    }
  };

  const handleExportPNG = () => {
    const canvas = spectrogramCanvasRef.current?.getCanvas();
    if (!canvas) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Canvas not available',
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      exportCanvasToPNG(canvas, `spectrogram-${timestamp}.png`);
      toast({
        title: 'Export Successful',
        description: 'PNG image downloaded',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export PNG image',
      });
    }
  };

  const handleAutoAdjust = () => {
    if (isAutoAdjusted && originalSettings) {
      setAudioSettings(prev => ({
        ...prev,
        brightness: originalSettings.brightness,
        declutterAmount: originalSettings.declutterAmount,
      }));
      setIsAutoAdjusted(false);
      toast({
        title: 'Original Settings Restored',
        description: `Brightness: ${originalSettings.brightness}%, Sharpness: ${originalSettings.declutterAmount}`,
      });
      return;
    }

    if (!spectrogramData || spectrogramData.frequencies.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Auto-Adjust Failed',
        description: 'No spectrogram data available',
      });
      return;
    }

    setOriginalSettings({
      brightness: audioSettings.brightness,
      declutterAmount: audioSettings.declutterAmount,
    });

    let sumIntensity = 0;
    let maxIntensity = 0;
    let count = 0;

    for (const timeSlice of spectrogramData.frequencies) {
      for (const intensity of timeSlice) {
        sumIntensity += intensity;
        maxIntensity = Math.max(maxIntensity, intensity);
        count++;
      }
    }

    const avgIntensity = count > 0 ? sumIntensity / count : 0;
    
    let optimalBrightness = 150;
    if (avgIntensity < 0.2) {
      optimalBrightness = 180;
    } else if (avgIntensity < 0.4) {
      optimalBrightness = 160;
    } else if (avgIntensity > 0.7) {
      optimalBrightness = 120;
    }

    const optimalSharpness = Math.round(avgIntensity * 50 + 15);

    setAudioSettings(prev => ({
      ...prev,
      brightness: optimalBrightness,
      declutterAmount: Math.min(optimalSharpness, 60),
    }));

    setIsAutoAdjusted(true);

    toast({
      title: 'Auto-Adjusted',
      description: `Optimized for overtone visibility (Brightness: ${optimalBrightness}%, Sharpness: ${Math.min(optimalSharpness, 60)})`,
    });
  };

  const getStatusText = () => {
    if (isProcessing) return 'Processing...';
    switch (recordingState) {
      case 'recording': return 'Recording...';
      case 'playing': return 'Playing';
      case 'stopped': return 'Ready';
      default: return 'Ready';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Transport Controls Row */}
      <div className="flex-none border-b border-border bg-card">
        <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 gap-2 sm:gap-4">
          <TransportControls
            recordingState={recordingState}
            onRecord={handleRecord}
            onPlay={handlePlay}
            onStop={handleStop}
            onReset={handleReset}
            onExportWAV={handleExportWAV}
            onExportPNG={handleExportPNG}
            onAutoAdjust={handleAutoAdjust}
            isAutoAdjusted={isAutoAdjusted}
            hasRecording={!!audioBuffer}
            disabled={isProcessing}
          />
          <div className="text-sm font-medium text-muted-foreground">
            {getStatusText()}
          </div>
        </div>
      </div>

      {/* Settings Controls Row */}
      <div className="flex-none border-b border-border bg-card">
        <div className="flex items-center justify-center px-2 sm:px-4 py-1.5 gap-2 sm:gap-4">
          <SliderControl
            icon={Volume2}
            value={audioSettings.microphoneGain}
            onChange={handleGainChange}
            min={0}
            max={200}
            className="flex-1 min-w-0 max-w-32"
            data-testid="slider-gain"
          />
          <SliderControl
            icon={Sun}
            value={audioSettings.brightness}
            onChange={handleBrightnessChange}
            min={0}
            max={200}
            className="flex-1 min-w-0 max-w-32"
            data-testid="slider-brightness"
          />
          <SliderControl
            icon={Contrast}
            value={audioSettings.declutterAmount}
            onChange={handleDeclutterChange}
            min={0}
            max={100}
            className="flex-1 min-w-0 max-w-32"
            data-testid="slider-declutter"
          />
          <div className="flex-shrink-0">
            <AdvancedSettings
              intensityScale={audioSettings.intensityScale}
              intensityBoost={audioSettings.intensityBoost}
              minFrequency={audioSettings.minFrequency}
              maxFrequency={audioSettings.maxFrequency}
              fftSize={audioSettings.fftSize}
              colorScheme={audioSettings.colorScheme}
              onIntensityScaleChange={handleIntensityScaleChange}
              onIntensityBoostChange={handleIntensityBoostChange}
              onFrequencyRangeChange={handleFrequencyRangeChange}
              onFFTSizeChange={handleFFTSizeChange}
              onColorSchemeChange={handleColorSchemeChange}
            />
          </div>
        </div>
      </div>

      {/* Spectrogram Chart - Full Width */}
      <div className="flex-1 overflow-hidden w-full">
        <SpectrogramCanvas
          ref={spectrogramCanvasRef}
          spectrogramData={spectrogramData}
          viewportSettings={viewportSettings}
          currentTime={currentTime}
          isRecording={recordingState === 'recording'}
          isPlaying={recordingState === 'playing'}
          playbackTime={playbackTime}
          brightness={audioSettings.brightness}
          declutterAmount={audioSettings.declutterAmount}
          intensityScale={audioSettings.intensityScale}
          intensityBoost={audioSettings.intensityBoost}
          minFrequency={audioSettings.minFrequency}
          maxFrequency={audioSettings.maxFrequency}
          colorScheme={audioSettings.colorScheme}
        />
      </div>

      {/* Zoom Controls Row */}
      <div className="flex-none border-t border-border bg-card">
        <ZoomControls
          zoom={viewportSettings.zoom}
          scrollPosition={viewportSettings.scrollPosition}
          totalDuration={totalDuration}
          visibleDuration={viewportSettings.visibleDuration}
          onZoomChange={handleZoomChange}
          onScrollChange={handleScrollChange}
          onFitToScreen={handleFitToScreen}
          disabled={recordingState === 'idle'}
        />
      </div>
    </div>
  );
}
