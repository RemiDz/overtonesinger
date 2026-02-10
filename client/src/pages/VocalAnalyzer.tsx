import { useState, useRef, useEffect, useCallback } from 'react';
import { SpectrogramCanvas, type SpectrogramCanvasHandle } from '@/components/SpectrogramCanvas';
import { TransportControls } from '@/components/TransportControls';
import { SliderControl } from '@/components/SliderControl';
import { ZoomControls } from '@/components/ZoomControls';
import { FrequencyBandFilter, type FilterBand } from '@/components/FrequencyBandFilter';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useProStatus } from '@/hooks/useProStatus';
import { useToast } from '@/hooks/use-toast';
import { exportToWAV, exportCanvasToPNG } from '@/lib/audioExport';
import { createVideoExportRecorder, downloadVideoBlob } from '@/lib/videoExport';
import { convertWebMToMP4, isFFmpegAvailable } from '@/lib/ffmpegConverter';
import { Sun, Contrast, Palette, Activity, Focus, Target, Maximize, Minimize, Star, Lock, Check, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { RecordingState, AudioSettings, ViewportSettings, IntensityScaleMode, ColorScheme, FFTSize } from '@shared/schema';

export default function VocalAnalyzer() {
  const { toast } = useToast();
  const { isPro: isProUser, isActivating, activate, deactivate } = useProStatus();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const spectrogramCanvasRef = useRef<SpectrogramCanvasHandle>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const recordingStateRef = useRef<RecordingState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [targetHarmonic, setTargetHarmonic] = useState<number | null>(null);
  const [filterBand, setFilterBand] = useState<FilterBand>({ lowFreq: 60, highFreq: 8000 });
  const [loopPlayback, setLoopPlayback] = useState(false);
  const loopPlaybackRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSessionLimitModal, setShowSessionLimitModal] = useState(false);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Free session time limit: 5 minutes (300 seconds)
  const FREE_SESSION_LIMIT_MS = 5 * 60 * 1000;

  // Helper that keeps the ref in sync with state for use in async closures
  const updateRecordingState = useCallback((state: RecordingState) => {
    recordingStateRef.current = state;
    setRecordingState(state);
  }, []);
  
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
    updatePlaybackFilter,
    reset,
    spectrogramData,
    audioBuffer,
    isProcessing,
    error,
    sampleRate,
    audioContext,
    getAudioContext,
  } = useAudioAnalyzer(audioSettings);

  // Sync filter band bounds when the displayed frequency range changes
  useEffect(() => {
    setFilterBand(prev => ({
      lowFreq: Math.max(prev.lowFreq, audioSettings.minFrequency),
      highFreq: Math.min(prev.highFreq, audioSettings.maxFrequency),
    }));
  }, [audioSettings.minFrequency, audioSettings.maxFrequency]);

  // Debounced auto-frequency adjustment — only recalculates once per second
  // instead of every animation frame (~60fps) to avoid excessive re-renders
  const freqAdjustTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (freqAdjustTimerRef.current) {
        clearTimeout(freqAdjustTimerRef.current);
        freqAdjustTimerRef.current = null;
      }
    };
  }, []);
  
  useEffect(() => {
    if (!spectrogramData || spectrogramData.frequencies.length === 0) return;

    // Clear any pending debounce timer
    if (freqAdjustTimerRef.current) {
      clearTimeout(freqAdjustTimerRef.current);
    }

    freqAdjustTimerRef.current = setTimeout(() => {
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
    }, 1000);

    return () => {
      if (freqAdjustTimerRef.current) {
        clearTimeout(freqAdjustTimerRef.current);
      }
    };
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

  // Clear the session timer when it's no longer needed
  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const handleRecord = async () => {
    if (recordingState === 'idle' || recordingState === 'stopped') {
      try {
        await startRecording();
        updateRecordingState('recording');
        setCurrentTime(0);
        setTotalDuration(0);

        // Start session timer for free users
        if (!isProUser) {
          clearSessionTimer();
          sessionTimerRef.current = setTimeout(() => {
            // Auto-stop recording at the limit
            const duration = stopRecording();
            updateRecordingState('stopped');
            setTotalDuration(duration);
            setViewportSettings({
              zoom: 100,
              scrollPosition: 0,
              visibleDuration: duration || 10,
            });
            setShowSessionLimitModal(true);
          }, FREE_SESSION_LIMIT_MS);
        }
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Recording Failed',
          description: err instanceof Error ? err.message : 'Could not access microphone',
        });
      }
    }
  };

  const handlePlay = useCallback(() => {
    if ((recordingState === 'stopped' || recordingStateRef.current === 'stopped') && audioBuffer) {
      setPlaybackTime(0);

      // Always pass the filter band — the audio engine skips filters
      // when the band covers the full audible range already
      const onEnd = () => {
        if (loopPlaybackRef.current) {
          setPlaybackTime(0);
          playRecording(
            (time) => setPlaybackTime(time),
            onEnd,
            undefined,
            filterBand
          );
        } else {
          updateRecordingState('stopped');
          setPlaybackTime(0);
        }
      };

      playRecording(
        (time) => setPlaybackTime(time),
        onEnd,
        undefined,
        filterBand
      );
      updateRecordingState('playing');
    }
  }, [recordingState, audioBuffer, playRecording, filterBand, updateRecordingState]);

  const handleStop = () => {
    if (recordingState === 'recording') {
      clearSessionTimer();
      const duration = stopRecording();
      updateRecordingState('stopped');
      setTotalDuration(duration);
      setViewportSettings({
        zoom: 100,
        scrollPosition: 0,
        visibleDuration: duration || 10,
      });
    } else if (recordingState === 'playing') {
      // Fully disable loop so the onended callback cannot restart playback
      loopPlaybackRef.current = false;
      setLoopPlayback(false);
      stopPlayback();
      updateRecordingState('stopped');
      setPlaybackTime(0);
    }
  };

  const handleReset = () => {
    clearSessionTimer();
    reset();
    updateRecordingState('idle');
    setCurrentTime(0);
    setPlaybackTime(0);
    setTotalDuration(0);
    setFilterBand({ lowFreq: 60, highFreq: 8000 });
    setTargetHarmonic(null);
    setLoopPlayback(false);
    loopPlaybackRef.current = false;
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
    if (!isProUser) {
      // Free users only get the default scheme — show upgrade modal
      setShowUpgradeModal(true);
      return;
    }
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

  const cycleTargetHarmonic = () => {
    if (!isProUser) {
      setShowUpgradeModal(true);
      return;
    }
    // Cycle: off → H2 → H3 → H4 → H5 → H6 → H7 → H8 → off
    if (targetHarmonic === null) {
      setTargetHarmonic(2);
    } else if (targetHarmonic >= 8) {
      setTargetHarmonic(null);
    } else {
      setTargetHarmonic(targetHarmonic + 1);
    }
  };

  const handleFilterChange = useCallback((band: FilterBand) => {
    setFilterBand(band);
    if (recordingState === 'playing') {
      updatePlaybackFilter(band);
    }
  }, [recordingState, updatePlaybackFilter]);

  const toggleLoop = () => {
    if (!isProUser) {
      setShowUpgradeModal(true);
      return;
    }
    const next = !loopPlayback;
    setLoopPlayback(next);
    loopPlaybackRef.current = next;
  };

  const toggleFullscreen = useCallback(() => {
    const doc = document as any;
    const el = document.documentElement as any;

    // Detect iOS iPhone (no Fullscreen API support)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isIPhone = /iPhone|iPod/.test(navigator.userAgent);

    const isFs = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (!isFs) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        req.call(el).catch(() => {
          // Fullscreen request failed — likely iOS iPhone
          if (isIPhone) {
            toast({
              title: 'Fullscreen on iPhone',
              description: 'Tap the share button → "Add to Home Screen" to run fullscreen.',
              duration: 6000,
            });
          }
        });
      } else if (isIOS) {
        // No fullscreen API at all
        toast({
          title: 'Fullscreen on iPhone',
          description: 'Tap the share button → "Add to Home Screen" to run fullscreen.',
          duration: 6000,
        });
      }
    } else {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (exit) exit.call(doc).catch(() => {});
    }
  }, [toast]);

  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

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

  const handleExportWAV = async () => {
    if (!isProUser) {
      setShowUpgradeModal(true);
      return;
    }
    if (!audioBuffer) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'No recording available to export',
      });
      return;
    }

    try {
      const { shareOrDownload } = await import('@/lib/shareUtils');
      const wavBlob = exportToWAV(audioBuffer, sampleRate);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const result = await shareOrDownload(wavBlob, `vocal-recording-${timestamp}.wav`);
      toast({
        title: 'Export Successful',
        description: result === 'shared' ? 'WAV file shared' : 'WAV file downloaded',
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export WAV file',
      });
    }
  };

  const handleExportPNG = async () => {
    if (!isProUser) {
      setShowUpgradeModal(true);
      return;
    }
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
      const result = await exportCanvasToPNG(canvas, `spectrogram-${timestamp}.png`);
      toast({
        title: 'Export Successful',
        description: result === 'shared' ? 'PNG image shared' : 'PNG image downloaded',
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export PNG image',
      });
    }
  };

  const handleExportVideo = async () => {
    if (!isProUser) {
      setShowUpgradeModal(true);
      return;
    }
    const canvas = spectrogramCanvasRef.current?.getCanvas();
    const currentAudioContext = getAudioContext();
    if (!canvas || !audioBuffer || !currentAudioContext) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'No recording or canvas available',
      });
      return;
    }

    setIsExportingVideo(true);
    setConversionProgress(0);
    let videoRecorder: ReturnType<typeof createVideoExportRecorder> | null = null;
    
    try {
      if (currentAudioContext.state === 'suspended') {
        await currentAudioContext.resume();
      }

      toast({
        title: 'Exporting Video',
        description: 'Recording video with synchronized audio...',
      });

      videoRecorder = createVideoExportRecorder({
        canvas,
        audioContext: currentAudioContext,
        fps: 30,
        videoBitsPerSecond: 2500000,
      });

      videoRecorder.start();

      updateRecordingState('playing');
      setPlaybackTime(0);

      const playbackPromise = new Promise<void>((resolve) => {
        playRecording(
          (time) => setPlaybackTime(time),
          () => {
            updateRecordingState('stopped');
            setPlaybackTime(0);
            resolve();
          },
          videoRecorder!.audioStreamDestination
        );
      });

      // Wait for playback to finish, then stop the recorder.
      // Also monitor the recorder in case it errors out early.
      let recordingStopped = false;
      const recorderEarlyStop = videoRecorder.recordingPromise.then(() => {
        recordingStopped = true;
      });

      await Promise.race([
        playbackPromise.then(() => {
          if (!recordingStopped) {
            videoRecorder!.stop();
          }
        }),
        recorderEarlyStop.then(() => {
          // Recorder stopped before playback finished — stop playback too
          stopPlayback();
          updateRecordingState('stopped');
          setPlaybackTime(0);
        }),
      ]);

      const videoBlob = await videoRecorder.recordingPromise;
      const { mimeTypeInfo } = videoRecorder;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const baseFilename = `spectrogram-${timestamp}`;

      // If the recorder already produced a mobile-friendly format (MP4),
      // download directly — no FFmpeg conversion needed
      if (mimeTypeInfo.isMobileFriendly) {
        const result = await downloadVideoBlob(videoBlob, baseFilename, mimeTypeInfo.extension);
        toast({
          title: 'Export Successful',
          description: result === 'shared'
            ? `Video shared as ${baseFilename}.${mimeTypeInfo.extension}`
            : `Video downloaded as ${baseFilename}.${mimeTypeInfo.extension}`,
        });
        return;
      }

      // Recorder produced WebM — try converting to MP4 for mobile compatibility
      if (!isFFmpegAvailable()) {
        const result = await downloadVideoBlob(videoBlob, baseFilename, mimeTypeInfo.extension);
        
        toast({
          title: `Video Export (${mimeTypeInfo.extension.toUpperCase()})`,
          description: result === 'shared'
            ? `Shared as ${baseFilename}.${mimeTypeInfo.extension}.`
            : `Downloaded as ${baseFilename}.${mimeTypeInfo.extension}. MP4 conversion unavailable (requires cross-origin isolation). ${mimeTypeInfo.extension === 'webm' ? 'WebM may not play on mobile devices.' : ''}`,
          duration: 10000,
        });
        return;
      }

      try {
        toast({
          title: 'Converting to MP4',
          description: 'Converting video for mobile compatibility...',
        });

        setConversionProgress(0);
        const mp4Blob = await convertWebMToMP4(videoBlob, {
          onProgress: (progress) => {
            setConversionProgress(progress);
          },
        });

        const result = await downloadVideoBlob(mp4Blob, baseFilename, 'mp4');

        toast({
          title: 'Export Successful',
          description: result === 'shared'
            ? `Video shared as ${baseFilename}.mp4 (mobile-friendly format)`
            : `Video downloaded as ${baseFilename}.mp4 (mobile-friendly format)`,
        });
      } catch (conversionError) {
        console.error('Video conversion failed:', conversionError);
        
        const fallbackResult = await downloadVideoBlob(videoBlob, baseFilename, mimeTypeInfo.extension);
        
        toast({
          title: `Video Export (${mimeTypeInfo.extension.toUpperCase()})`,
          description: fallbackResult === 'shared'
            ? `Shared as ${baseFilename}.${mimeTypeInfo.extension}. MP4 conversion failed.`
            : `Downloaded as ${baseFilename}.${mimeTypeInfo.extension}. MP4 conversion failed. WebM may not play on mobile devices.`,
          duration: 8000,
        });
      }
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
      setConversionProgress(0);
      // Use ref instead of state to avoid stale closure — recordingState
      // captured at render time would not reflect updates made during async export
      if (recordingStateRef.current === 'playing') {
        stopPlayback();
        updateRecordingState('stopped');
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
      <div className="flex-none border-b border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-1 sm:px-4 py-1.5 gap-1 sm:gap-4">
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
            loopEnabled={loopPlayback}
            onToggleLoop={toggleLoop}
            isPro={isProUser}
          />
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className="text-sm font-medium text-muted-foreground hidden sm:block">
              {getStatusText()}
            </div>
            {/* Pro Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isProUser ? 'outline' : 'default'}
                  size="icon"
                  onClick={() => !isProUser && setShowUpgradeModal(true)}
                  data-testid="button-pro"
                  className={`h-8 w-8 sm:h-10 sm:w-10 ${
                    isProUser
                      ? 'text-amber-400 border-amber-400/30 hover:text-amber-300'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0'
                  }`}
                >
                  {isProUser ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Star className="h-4 w-4 fill-current" />
                  )}
                  <span className="sr-only">{isProUser ? 'Pro Active' : 'Upgrade to Pro'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isProUser ? 'Pro Active' : 'Upgrade to Pro'}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFullscreen}
                  data-testid="button-fullscreen"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                >
                  {isFullscreen
                    ? <Minimize className="h-4 w-4" />
                    : <Maximize className="h-4 w-4" />}
                  <span className="sr-only">{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</p>
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
                  className={`${audioSettings.colorScheme === 'default' ? 'relative text-[#00a8ff] dark:text-[#00a8ff]' : 'relative'} ${!isProUser ? 'opacity-70' : ''}`}
                >
                  <Palette className="h-4 w-4" />
                  {!isProUser && <Lock className="h-2.5 w-2.5 absolute top-0.5 right-0.5 text-amber-400" />}
                  <span className="sr-only">Color Scheme: {getColorSchemeLabel()}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isProUser ? `Color: ${getColorSchemeLabel()}` : 'Color Schemes (Pro)'}</p>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={cycleTargetHarmonic}
                  data-testid="button-target-harmonic"
                  className={`${targetHarmonic !== null ? 'relative text-[#ffc800] dark:text-[#ffc800]' : 'relative'} ${!isProUser ? 'opacity-70' : ''}`}
                >
                  <Target className="h-4 w-4" />
                  {!isProUser && <Lock className="h-2.5 w-2.5 absolute top-0.5 right-0.5 text-amber-400" />}
                  <span className="sr-only">Target: {targetHarmonic ? `H${targetHarmonic}` : 'Off'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isProUser ? `Target: ${targetHarmonic ? `H${targetHarmonic}` : 'Off'}` : 'Harmonic Target (Pro)'}</p>
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
          targetHarmonic={targetHarmonic}
          showFrequencyMarkers={isProUser}
        />
        <FrequencyBandFilter
          enabled={true}
          minFrequency={audioSettings.minFrequency}
          maxFrequency={audioSettings.maxFrequency}
          filterBand={filterBand}
          onFilterChange={handleFilterChange}
          padding={{ top: 12, right: 8, bottom: 24, left: 26 }}
          isPro={isProUser}
          onUpgradeClick={() => setShowUpgradeModal(true)}
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

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onActivate={activate}
        isActivating={isActivating}
      />

      {/* Session Limit Modal */}
      {showSessionLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSessionLimitModal(false)}
          />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-4">
                <Timer className="h-6 w-6 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">Free session limit reached</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Free sessions are limited to 5 minutes. Upgrade to Pro for unlimited session length.
              </p>
              <Button
                className="w-full h-11 text-base font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 mb-3"
                onClick={() => {
                  setShowSessionLimitModal(false);
                  setShowUpgradeModal(true);
                }}
              >
                <Star className="h-4 w-4 mr-2 fill-current" />
                Upgrade to Pro
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowSessionLimitModal(false)}
              >
                Continue with free version
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
