// Audio Analysis Data Types
export interface AudioRecording {
  id: string;
  audioBuffer: Float32Array;
  spectrogramData: SpectrogramData;
  sampleRate: number;
  duration: number;
  timestamp: number;
}

export interface SpectrogramData {
  frequencies: number[][];  // 2D array [time][frequency]
  timeStamps: number[];     // Time points in seconds
  minFreq: number;          // 0 Hz
  maxFreq: number;          // 5000 Hz
  fftSize: number;          // FFT window size
}

export interface AudioSettings {
  microphoneGain: number;   // 0-100%
  declutterAmount: number;  // 0-100
  sampleRate: number;       // 48000 Hz
  fftSize: number;          // FFT window size (e.g., 2048)
}

export type RecordingState = 'idle' | 'recording' | 'playing' | 'stopped';

export interface ViewportSettings {
  zoom: number;             // 0-100, where 100 is fully zoomed out
  scrollPosition: number;   // 0-1, position in the recording
  visibleDuration: number;  // Seconds visible in viewport
}
