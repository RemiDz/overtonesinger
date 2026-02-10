import { useState, useRef, useCallback, useEffect } from 'react';
import type { AudioSettings, SpectrogramData } from '@shared/schema';

export function useAudioAnalyzer(settings: AudioSettings) {
  const [spectrogramData, setSpectrogramData] = useState<SpectrogramData | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<Float32Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const recordedPCMChunksRef = useRef<Float32Array[]>([]);
  const spectrogramFramesRef = useRef<{ frequencies: number[][]; timeStamps: number[] }>({ frequencies: [], timeStamps: [] });
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const highpassFiltersRef = useRef<BiquadFilterNode[]>([]);
  const lowpassFiltersRef = useRef<BiquadFilterNode[]>([]);

  const cleanupAudioResources = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (playbackAnimationRef.current) {
      cancelAnimationFrame(playbackAnimationRef.current);
      playbackAnimationRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioSourceNodeRef.current) {
      try { audioSourceNodeRef.current.stop(); } catch (_) { /* already stopped */ }
      audioSourceNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyzerRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Clean up any previous audio resources to prevent leaks
      cleanupAudioResources();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: settings.sampleRate,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const audioContext = new AudioContext({ sampleRate: settings.sampleRate });
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = settings.fftSize;
      analyzer.smoothingTimeConstant = 0;

      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = settings.microphoneGain / 100;

      // TODO: Migrate to AudioWorkletNode — ScriptProcessorNode is deprecated.
      // AudioWorklet runs off the main thread, improving both audio quality and UI performance.
      // See: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      
      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmChunk = new Float32Array(inputData.length);
        pcmChunk.set(inputData);
        recordedPCMChunksRef.current.push(pcmChunk);
      };

      source.connect(gainNode);
      gainNode.connect(analyzer);
      gainNode.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;
      mediaStreamRef.current = stream;
      sourceRef.current = source;
      gainNodeRef.current = gainNode;
      scriptProcessorRef.current = scriptProcessor;
      recordedPCMChunksRef.current = [];
      spectrogramFramesRef.current = { frequencies: [], timeStamps: [] };
      startTimeRef.current = Date.now();

      setSpectrogramData({
        frequencies: [],
        timeStamps: [],
        minFreq: 0,
        maxFreq: 5000,
        fftSize: settings.fftSize,
      });

      processAudioFrame();
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      setIsProcessing(false);
      throw err;
    }
  }, [settings, cleanupAudioResources]);

  // Maximum number of spectrogram frames to retain in memory.
  // At ~60fps: 18000 frames ≈ 5 minutes of data.
  // Beyond this limit older frames are dropped to prevent memory exhaustion.
  const MAX_SPECTROGRAM_FRAMES = 18000;

  const processAudioFrame = useCallback(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzer.getByteFrequencyData(dataArray);

    const normalizedData = new Float32Array(bufferLength);
    for (let i = 0; i < bufferLength; i++) {
      normalizedData[i] = dataArray[i] / 255;
    }

    const currentTime = (Date.now() - startTimeRef.current) / 1000;
    
    spectrogramFramesRef.current.frequencies.push(Array.from(normalizedData));
    spectrogramFramesRef.current.timeStamps.push(currentTime);

    // Evict oldest frames when exceeding the memory cap
    if (spectrogramFramesRef.current.frequencies.length > MAX_SPECTROGRAM_FRAMES) {
      const excess = spectrogramFramesRef.current.frequencies.length - MAX_SPECTROGRAM_FRAMES;
      spectrogramFramesRef.current.frequencies.splice(0, excess);
      spectrogramFramesRef.current.timeStamps.splice(0, excess);
    }

    setSpectrogramData(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        frequencies: spectrogramFramesRef.current.frequencies,
        timeStamps: spectrogramFramesRef.current.timeStamps,
      };
    });

    animationFrameRef.current = requestAnimationFrame(processAudioFrame);
  }, []);

  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Note: AudioContext is intentionally kept open for playback

    const duration = (Date.now() - startTimeRef.current) / 1000;

    if (recordedPCMChunksRef.current.length > 0) {
      const totalSamples = recordedPCMChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedBuffer = new Float32Array(totalSamples);
      let offset = 0;
      
      recordedPCMChunksRef.current.forEach(chunk => {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
      });

      let maxAbsValue = 0;
      for (let i = 0; i < combinedBuffer.length; i++) {
        maxAbsValue = Math.max(maxAbsValue, Math.abs(combinedBuffer[i]));
      }
      
      if (maxAbsValue > 0.9) {
        const normalizationFactor = 0.8 / maxAbsValue;
        for (let i = 0; i < combinedBuffer.length; i++) {
          combinedBuffer[i] *= normalizationFactor;
        }
      }

      setAudioBuffer(combinedBuffer);
    }

    return duration;
  }, []);

  const playbackAnimationRef = useRef<number | null>(null);

  const playRecording = useCallback((
    onPlaybackUpdate?: (currentTime: number) => void, 
    onPlaybackEnd?: () => void,
    audioStreamDestination?: MediaStreamAudioDestinationNode,
    filterBand?: { lowFreq: number; highFreq: number } | null
  ) => {
    if (!audioBuffer || !audioContextRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      const audioBufferData = audioContext.createBuffer(
        1,
        audioBuffer.length,
        settings.sampleRate
      );

      audioBufferData.getChannelData(0).set(audioBuffer);

      const source = audioContext.createBufferSource();
      source.buffer = audioBufferData;

      // Build the audio chain: source → [filters] → destination
      let lastNode: AudioNode = source;

      // Always create filter nodes so real-time dragging works during playback.
      // Use 4 cascaded 2nd-order stages = 8th-order Butterworth (~48 dB/octave)
      // for a steep enough rolloff to truly silence strong overtones.
      if (filterBand) {
        const ORDER = 4; // number of cascaded 2nd-order sections

        const hpFilters: BiquadFilterNode[] = [];
        for (let i = 0; i < ORDER; i++) {
          const hp = audioContext.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = filterBand.lowFreq;
          hp.Q.value = 0.707;
          lastNode.connect(hp);
          lastNode = hp;
          hpFilters.push(hp);
        }
        highpassFiltersRef.current = hpFilters;

        const lpFilters: BiquadFilterNode[] = [];
        for (let i = 0; i < ORDER; i++) {
          const lp = audioContext.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = filterBand.highFreq;
          lp.Q.value = 0.707;
          lastNode.connect(lp);
          lastNode = lp;
          lpFilters.push(lp);
        }
        lowpassFiltersRef.current = lpFilters;
      }

      lastNode.connect(audioContext.destination);
      
      if (audioStreamDestination) {
        lastNode.connect(audioStreamDestination);
      }
      
      const playbackStartTime = audioContext.currentTime;
      const duration = audioBuffer.length / settings.sampleRate;
      
      source.start(0);
      audioSourceNodeRef.current = source;

      const updatePlaybackPosition = () => {
        if (!audioSourceNodeRef.current || !audioContextRef.current) return;
        
        const elapsed = audioContextRef.current.currentTime - playbackStartTime;
        if (elapsed < duration && onPlaybackUpdate) {
          onPlaybackUpdate(elapsed);
          playbackAnimationRef.current = requestAnimationFrame(updatePlaybackPosition);
        }
      };

      if (onPlaybackUpdate) {
        playbackAnimationRef.current = requestAnimationFrame(updatePlaybackPosition);
      }

      source.onended = () => {
        audioSourceNodeRef.current = null;
        highpassFiltersRef.current = [];
        lowpassFiltersRef.current = [];
        if (playbackAnimationRef.current) {
          cancelAnimationFrame(playbackAnimationRef.current);
          playbackAnimationRef.current = null;
        }
        if (onPlaybackEnd) {
          onPlaybackEnd();
        }
      };
    } catch (err) {
      setError('Failed to play recording');
    }
  }, [audioBuffer, settings.sampleRate]);

  const updatePlaybackFilter = useCallback((filterBand: { lowFreq: number; highFreq: number } | null) => {
    if (!filterBand) return;
    const now = audioContextRef.current?.currentTime || 0;
    
    for (const hp of highpassFiltersRef.current) {
      hp.frequency.setTargetAtTime(filterBand.lowFreq, now, 0.02);
    }
    for (const lp of lowpassFiltersRef.current) {
      lp.frequency.setTargetAtTime(filterBand.highFreq, now, 0.02);
    }
  }, []);

  const stopPlayback = useCallback(() => {
    if (playbackAnimationRef.current) {
      cancelAnimationFrame(playbackAnimationRef.current);
      playbackAnimationRef.current = null;
    }
    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.stop();
        audioSourceNodeRef.current = null;
      } catch (err) {
        console.error('Error stopping playback:', err);
      }
    }
  }, []);

  const reset = useCallback(() => {
    cleanupAudioResources();
    setSpectrogramData(null);
    setAudioBuffer(null);
    setError(null);
    recordedPCMChunksRef.current = [];
    spectrogramFramesRef.current = { frequencies: [], timeStamps: [] };
  }, [cleanupAudioResources]);

  const getAudioContext = useCallback(() => audioContextRef.current, []);

  // Cleanup all audio resources on unmount
  useEffect(() => {
    return () => {
      cleanupAudioResources();
    };
  }, [cleanupAudioResources]);

  return {
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
    sampleRate: settings.sampleRate,
    audioContext: audioContextRef.current,
    getAudioContext,
  };
}
