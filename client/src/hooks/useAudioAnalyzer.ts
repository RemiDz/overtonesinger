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
  const highpassFilterRef = useRef<BiquadFilterNode | null>(null);
  const highpassFilter2Ref = useRef<BiquadFilterNode | null>(null);
  const lowpassFilterRef = useRef<BiquadFilterNode | null>(null);
  const lowpassFilter2Ref = useRef<BiquadFilterNode | null>(null);

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

      if (filterBand && (filterBand.lowFreq > 20 || filterBand.highFreq < settings.sampleRate / 2 - 100)) {
        // Stacked 2nd-order highpass filters (4th-order total = steep rolloff)
        if (filterBand.lowFreq > 20) {
          const hp1 = audioContext.createBiquadFilter();
          hp1.type = 'highpass';
          hp1.frequency.value = filterBand.lowFreq;
          hp1.Q.value = 0.707;

          const hp2 = audioContext.createBiquadFilter();
          hp2.type = 'highpass';
          hp2.frequency.value = filterBand.lowFreq;
          hp2.Q.value = 0.707;

          lastNode.connect(hp1);
          hp1.connect(hp2);
          lastNode = hp2;

          highpassFilterRef.current = hp1;
          highpassFilter2Ref.current = hp2;
        }

        // Stacked 2nd-order lowpass filters (4th-order total)
        if (filterBand.highFreq < settings.sampleRate / 2 - 100) {
          const lp1 = audioContext.createBiquadFilter();
          lp1.type = 'lowpass';
          lp1.frequency.value = filterBand.highFreq;
          lp1.Q.value = 0.707;

          const lp2 = audioContext.createBiquadFilter();
          lp2.type = 'lowpass';
          lp2.frequency.value = filterBand.highFreq;
          lp2.Q.value = 0.707;

          lastNode.connect(lp1);
          lp1.connect(lp2);
          lastNode = lp2;

          lowpassFilterRef.current = lp1;
          lowpassFilter2Ref.current = lp2;
        }
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
        highpassFilterRef.current = null;
        highpassFilter2Ref.current = null;
        lowpassFilterRef.current = null;
        lowpassFilter2Ref.current = null;
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
    
    if (highpassFilterRef.current && highpassFilter2Ref.current) {
      highpassFilterRef.current.frequency.setTargetAtTime(filterBand.lowFreq, now, 0.02);
      highpassFilter2Ref.current.frequency.setTargetAtTime(filterBand.lowFreq, now, 0.02);
    }
    if (lowpassFilterRef.current && lowpassFilter2Ref.current) {
      lowpassFilterRef.current.frequency.setTargetAtTime(filterBand.highFreq, now, 0.02);
      lowpassFilter2Ref.current.frequency.setTargetAtTime(filterBand.highFreq, now, 0.02);
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
