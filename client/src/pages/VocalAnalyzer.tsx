import { useState, useRef, useEffect } from 'react';
import { SpectrogramCanvas, type SpectrogramCanvasHandle } from '@/components/SpectrogramCanvas';
import { TransportControls } from '@/components/TransportControls';
import { SliderControl } from '@/components/SliderControl';
import { ZoomControls } from '@/components/ZoomControls';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useToast } from '@/hooks/use-toast';
import { exportToWAV, downloadBlob, exportCanvasToPNG } from '@/lib/audioExport';
import { createVideoExportRecorder, downloadVideoBlob } from '@/lib/videoExport';
import { convertWebMToMP4 } from '@/lib/ffmpegConverter';
import { Sun, Contrast, Palette, Activity, Heart, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { RecordingState, AudioSettings, ViewportSettings, IntensityScaleMode, ColorScheme, FFTSize } from '@shared/schema';

export default function VocalAnalyzer() {
  const { toast } = useToast();
  const spectrogramCanvasRef = useRef<SpectrogramCanvasHandle>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    microphoneGain: 100,
    brightness: 137,
    declutterAmount: 0,
    sharpness: 50,
    sampleRate: 48000,
    fftSize: 4096,
    intensityScale: 'power',
    intensityBoost: 100,
    minFrequency: 60,
    maxFrequency: 8000,
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
    audioContext,
  } = useAudioAnalyzer(audioSettings);

  useEffect(() => {
    if (spectrogramData && spectrogramData.frequencies.length > 0) {
      const frequencies = spectrogramData.frequencies;
      const numBins = frequencies[0].length;
      const nyquistFreq = sampleRate / 2;
      const binToFreq = (bin: number) => (bin / numBins) * nyquistFreq;

      const averageMagnitudes = new Float32Array(numBins);
      frequencies.forEach(frame => {
        frame.forEach((mag, i) => {
          averageMagnitudes[i] += mag;
        });
      });
      averageMagnitudes.forEach((_, i) => {
        averageMagnitudes[i] /= frequencies.length;
      });

      let minDetectedFreq = Infinity;
      let maxDetectedFreq = 0;

      for (let i = 0; i < averageMagnitudes.length; i++) {
        if (averageMagnitudes[i] > 0.1) {
          const freq = binToFreq(i);
          if (freq >= 60 && freq <= 8000) {
            minDetectedFreq = Math.min(minDetectedFreq, freq);
            maxDetectedFreq = Math.max(maxDetectedFreq, freq);
          }
        }
      }

      if (minDetectedFreq !== Infinity && maxDetectedFreq > 0) {
        const newMin = Math.max(60, Math.floor(minDetectedFreq - 10));
        const newMax = Math.max(3000, Math.min(8000, Math.ceil(maxDetectedFreq + 100)));
        
        setAudioSettings(prev => ({
          ...prev,
          minFrequency: newMin,
          maxFrequency: newMax,
        }));
      }
    }
  }, [spectrogramData, sampleRate]);

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
    setViewportSettings({
      zoom: 100,
      scrollPosition: 0,
      visibleDuration: 10,
    });
  };

  const handleBrightnessChange = (value: number) => {
    setAudioSettings(prev => ({ ...prev, brightness: value }));
  };

  const handleDeclutterChange = (value: number) => {
    setAudioSettings(prev => ({ ...prev, declutterAmount: value }));
  };

  const handleSharpnessChange = (value: number) => {
    setAudioSettings(prev => ({ ...prev, sharpness: value }));
  };

  const handleIntensityScaleChange = (value: IntensityScaleMode) => {
    setAudioSettings(prev => ({ ...prev, intensityScale: value }));
  };

  const handleIntensityBoostChange = (value: number) => {
    setAudioSettings(prev => ({ ...prev, intensityBoost: value }));
  };

  const handleFFTSizeChange = (value: FFTSize) => {
    setAudioSettings(prev => ({ ...prev, fftSize: value }));
  };

  const handleColorSchemeChange = (value: ColorScheme) => {
    setAudioSettings(prev => ({ ...prev, colorScheme: value }));
  };

  const cycleColorScheme = () => {
    const schemes: ColorScheme[] = ['default', 'warm', 'cool', 'monochrome'];
    const currentIndex = schemes.indexOf(audioSettings.colorScheme);
    const nextIndex = (currentIndex + 1) % schemes.length;
    setAudioSettings(prev => ({ ...prev, colorScheme: schemes[nextIndex] }));
  };

  const cycleIntensityScale = () => {
    const scales: IntensityScaleMode[] = ['linear', 'logarithmic', 'power'];
    const currentIndex = scales.indexOf(audioSettings.intensityScale);
    const nextIndex = (currentIndex + 1) % scales.length;
    setAudioSettings(prev => ({ ...prev, intensityScale: scales[nextIndex] }));
  };

  const getColorSchemeLabel = () => {
    const labels = {
      default: 'Default',
      warm: 'Warm',
      cool: 'Cool',
      monochrome: 'Mono'
    };
    return labels[audioSettings.colorScheme];
  };

  const getIntensityScaleLabel = () => {
    const labels = {
      linear: 'Linear',
      logarithmic: 'Log',
      power: 'Power'
    };
    return labels[audioSettings.intensityScale];
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

  const handleExportVideo = async () => {
    const canvas = spectrogramCanvasRef.current?.getCanvas();
    if (!canvas || !audioBuffer || !audioContext) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'No recording or canvas available',
      });
      return;
    }

    setIsExportingVideo(true);
    let videoRecorder: ReturnType<typeof createVideoExportRecorder> | null = null;
    
    try {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      toast({
        title: 'Exporting Video',
        description: 'Recording video with synchronized audio...',
      });

      videoRecorder = createVideoExportRecorder({
        canvas,
        audioContext,
        fps: 30,
        videoBitsPerSecond: 2500000,
      });

      videoRecorder.start();

      setRecordingState('playing');
      setPlaybackTime(0);

      const playbackPromise = new Promise<void>((resolve) => {
        playRecording(
          (time) => setPlaybackTime(time),
          () => {
            setRecordingState('stopped');
            setPlaybackTime(0);
            resolve();
          },
          videoRecorder!.audioStreamDestination
        );
      });

      await Promise.race([
        playbackPromise.then(() => videoRecorder!.stop()),
        videoRecorder.recordingPromise.then(() => {
          throw new Error('Recording stopped unexpectedly before playback completed');
        }),
      ]);

      const webmBlob = await videoRecorder.recordingPromise;

      toast({
        title: 'Converting to MP4',
        description: 'Converting video for mobile compatibility...',
      });

      setConversionProgress(0);
      const mp4Blob = await convertWebMToMP4(webmBlob, {
        onProgress: (progress) => {
          setConversionProgress(progress);
        },
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const baseFilename = `spectrogram-${timestamp}`;
      downloadVideoBlob(mp4Blob, baseFilename, 'mp4');

      toast({
        title: 'Export Successful',
        description: `Video downloaded as ${baseFilename}.mp4 (mobile-friendly format)`,
      });
    } catch (err) {
      console.error('Video export error:', err);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export video file',
      });
    } finally {
      if (videoRecorder) {
        videoRecorder.cleanup();
      }
      setIsExportingVideo(false);
      if (recordingState === 'playing') {
        stopPlayback();
        setRecordingState('stopped');
        setPlaybackTime(0);
      }
    }
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
            onExportVideo={handleExportVideo}
            hasRecording={!!audioBuffer}
            disabled={isProcessing}
            isExportingVideo={isExportingVideo}
          />
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-sm font-medium text-muted-foreground">
              {getStatusText()}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open('https://www.paypal.com/donate/?hosted_button_id=ABRWM7GB438R4', '_blank', 'noopener,noreferrer')}
                  data-testid="button-donate"
                  className="text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-500"
                >
                  <Heart className="h-4 w-4 fill-current" />
                  <span className="sr-only">Donate</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Support this project</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Settings Controls Row */}
      <div className="flex-none border-b border-border bg-card">
        <div className="flex items-center justify-center px-2 sm:px-4 py-1.5 gap-2 sm:gap-4">
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
          <SliderControl
            icon={Focus}
            value={audioSettings.sharpness}
            onChange={handleSharpnessChange}
            min={0}
            max={100}
            className="flex-1 min-w-0 max-w-32"
            data-testid="slider-sharpness"
          />
          <div className="flex-shrink-0 flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={cycleColorScheme}
                  data-testid="button-color-scheme"
                  className={audioSettings.colorScheme === 'default' ? 'relative text-[#00a8ff] dark:text-[#00a8ff]' : 'relative'}
                >
                  <Palette className="h-4 w-4" />
                  <span className="sr-only">Color Scheme: {getColorSchemeLabel()}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Color: {getColorSchemeLabel()}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={cycleIntensityScale}
                  data-testid="button-intensity-scale"
                  className={audioSettings.intensityScale === 'power' ? 'relative text-[#00a8ff] dark:text-[#00a8ff]' : 'relative'}
                >
                  <Activity className="h-4 w-4" />
                  <span className="sr-only">Intensity Scale: {getIntensityScaleLabel()}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Intensity: {getIntensityScaleLabel()}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Spectrogram Chart - Full Width */}
      <div className="flex-1 overflow-hidden w-full relative">
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
          sharpness={audioSettings.sharpness}
          intensityScale={audioSettings.intensityScale}
          intensityBoost={audioSettings.intensityBoost}
          minFrequency={audioSettings.minFrequency}
          maxFrequency={audioSettings.maxFrequency}
          colorScheme={audioSettings.colorScheme}
          sampleRate={sampleRate}
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
