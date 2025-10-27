import { useState, useRef, useEffect } from 'react';
import { SpectrogramCanvas } from '@/components/SpectrogramCanvas';
import { TransportControls } from '@/components/TransportControls';
import { SliderControl } from '@/components/SliderControl';
import { ZoomControls } from '@/components/ZoomControls';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useToast } from '@/hooks/use-toast';
import type { RecordingState, AudioSettings, ViewportSettings } from '@shared/schema';

export default function VocalAnalyzer() {
  const { toast } = useToast();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    microphoneGain: 100,
    declutterAmount: 0,
    sampleRate: 48000,
    fftSize: 2048,
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
    spectrogramData,
    audioBuffer,
    isProcessing,
    error,
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
      playRecording();
      setRecordingState('playing');
    }
  };

  const handleStop = () => {
    if (recordingState === 'recording') {
      const duration = stopRecording();
      setRecordingState('stopped');
      setTotalDuration(duration);
      setViewportSettings(prev => ({ ...prev, zoom: 100 }));
    } else if (recordingState === 'playing') {
      stopPlayback();
      setRecordingState('stopped');
    }
  };

  const handleGainChange = (value: number) => {
    setAudioSettings(prev => ({ ...prev, microphoneGain: value }));
  };

  const handleDeclutterChange = (value: number) => {
    setAudioSettings(prev => ({ ...prev, declutterAmount: value }));
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
      {/* Top Control Bar */}
      <div className="flex-none h-16 border-b border-border bg-card">
        <div className="flex items-center justify-between h-full px-6 gap-6">
          {/* Left: Transport Controls */}
          <div className="flex items-center gap-4">
            <TransportControls
              recordingState={recordingState}
              onRecord={handleRecord}
              onPlay={handlePlay}
              onStop={handleStop}
              disabled={isProcessing}
            />
            <div className="text-sm font-medium text-muted-foreground ml-2">
              {getStatusText()}
            </div>
          </div>

          {/* Right: Sliders */}
          <div className="flex items-center gap-6">
            <SliderControl
              label="Gain"
              value={audioSettings.microphoneGain}
              onChange={handleGainChange}
              min={0}
              max={200}
              className="w-32"
              data-testid="slider-gain"
            />
            <SliderControl
              label="Declutter"
              value={audioSettings.declutterAmount}
              onChange={handleDeclutterChange}
              min={0}
              max={100}
              className="w-40"
              data-testid="slider-declutter"
            />
          </div>
        </div>
      </div>

      {/* Spectrogram Chart */}
      <div className="flex-1 overflow-hidden">
        <SpectrogramCanvas
          spectrogramData={spectrogramData}
          viewportSettings={viewportSettings}
          currentTime={currentTime}
          isRecording={recordingState === 'recording'}
          declutterAmount={audioSettings.declutterAmount}
        />
      </div>

      {/* Zoom Controls Bar */}
      <div className="flex-none h-12 border-t border-border bg-card">
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
