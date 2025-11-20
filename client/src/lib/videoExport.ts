export interface VideoExportRecorder {
  audioStreamDestination: MediaStreamAudioDestinationNode;
  recordingPromise: Promise<Blob>;
  start: () => void;
  stop: () => void;
  cleanup: () => void;
}

export interface VideoExportOptions {
  canvas: HTMLCanvasElement;
  audioContext: AudioContext;
  fps?: number;
  videoBitsPerSecond?: number;
}

export function createVideoExportRecorder(
  options: VideoExportOptions
): VideoExportRecorder {
  const { canvas, audioContext, fps = 30, videoBitsPerSecond = 2500000 } = options;

  const canvasStream = canvas.captureStream(fps);
  const audioStreamDestination = audioContext.createMediaStreamDestination();
  
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioStreamDestination.stream.getAudioTracks()
  ]);

  const mimeType = getSupportedMimeType();
  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond
  });

  const chunks: Blob[] = [];
  let resolveRecording: ((blob: Blob) => void) | null = null;
  let rejectRecording: ((error: Error) => void) | null = null;

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    resolveRecording = resolve;
    rejectRecording = reject;
  });

  const handleDataAvailable = (event: BlobEvent) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const handleStop = () => {
    mediaRecorder.removeEventListener('dataavailable', handleDataAvailable);
    mediaRecorder.removeEventListener('stop', handleStop);
    mediaRecorder.removeEventListener('error', handleError);
    
    const videoBlob = new Blob(chunks, { type: mimeType });
    resolveRecording?.(videoBlob);
  };

  const handleError = (event: Event) => {
    mediaRecorder.removeEventListener('dataavailable', handleDataAvailable);
    mediaRecorder.removeEventListener('stop', handleStop);
    mediaRecorder.removeEventListener('error', handleError);
    
    rejectRecording?.(new Error('MediaRecorder error: ' + (event as any).error?.message || 'Unknown error'));
  };

  mediaRecorder.addEventListener('dataavailable', handleDataAvailable);
  mediaRecorder.addEventListener('stop', handleStop);
  mediaRecorder.addEventListener('error', handleError);

  return {
    audioStreamDestination,
    recordingPromise,
    start: () => {
      mediaRecorder.start(100);
    },
    stop: () => {
      try {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      } catch (err) {
        rejectRecording?.(err as Error);
      }
    },
    cleanup: () => {
      try {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        mediaRecorder.removeEventListener('dataavailable', handleDataAvailable);
        mediaRecorder.removeEventListener('stop', handleStop);
        mediaRecorder.removeEventListener('error', handleError);
        audioStreamDestination.disconnect();
        canvasStream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
  };
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  
  return 'video/webm';
}

export function downloadVideoBlob(blob: Blob, filename: string = 'spectrogram-recording.webm') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
