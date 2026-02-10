export interface VideoExportRecorder {
  audioStreamDestination: MediaStreamAudioDestinationNode;
  recordingPromise: Promise<Blob>;
  mimeTypeInfo: MimeTypeInfo;
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

  const mimeTypeInfo = getSupportedMimeType();
  
  // If mimeType is empty, let the browser pick its default format
  const recorderOptions: MediaRecorderOptions = { videoBitsPerSecond };
  if (mimeTypeInfo.mimeType) {
    recorderOptions.mimeType = mimeTypeInfo.mimeType;
  }
  const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);

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
    
    // Use the actual MIME type from the recorder (may differ from requested if browser chose default)
    const actualMimeType = mediaRecorder.mimeType || mimeTypeInfo.mimeType || 'video/webm';
    const videoBlob = new Blob(chunks, { type: actualMimeType });
    resolveRecording?.(videoBlob);
  };

  const handleError = (event: Event) => {
    mediaRecorder.removeEventListener('dataavailable', handleDataAvailable);
    mediaRecorder.removeEventListener('stop', handleStop);
    mediaRecorder.removeEventListener('error', handleError);
    
    rejectRecording?.(new Error('MediaRecorder error: ' + ((event as any).error?.message || 'Unknown error')));
  };

  mediaRecorder.addEventListener('dataavailable', handleDataAvailable);
  mediaRecorder.addEventListener('stop', handleStop);
  mediaRecorder.addEventListener('error', handleError);

  return {
    audioStreamDestination,
    recordingPromise,
    mimeTypeInfo,
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

export interface MimeTypeInfo {
  mimeType: string;
  isMobileFriendly: boolean;
  extension: string;
}

function getSupportedMimeType(): MimeTypeInfo {
  const types = [
    // MP4 variants — mobile-friendly, no conversion needed
    { mimeType: 'video/mp4;codecs=h264,aac', isMobileFriendly: true, extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=avc1,mp4a', isMobileFriendly: true, extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=avc1', isMobileFriendly: true, extension: 'mp4' },
    { mimeType: 'video/mp4', isMobileFriendly: true, extension: 'mp4' },
    // WebM variants — needs FFmpeg conversion for mobile
    { mimeType: 'video/webm;codecs=h264,opus', isMobileFriendly: false, extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', isMobileFriendly: false, extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp9,opus', isMobileFriendly: false, extension: 'webm' },
    { mimeType: 'video/webm', isMobileFriendly: false, extension: 'webm' },
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type.mimeType)) {
      return type;
    }
  }
  
  // No explicit type matched — let the browser use its default format.
  // Safari on iOS defaults to MP4; other browsers typically default to WebM.
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    return { mimeType: '', isMobileFriendly: true, extension: 'mp4' };
  }
  return { mimeType: '', isMobileFriendly: false, extension: 'webm' };
}

export async function downloadVideoBlob(blob: Blob, baseFilename: string, extension: string): Promise<'shared' | 'downloaded'> {
  const { shareOrDownload } = await import('./shareUtils');
  const filename = `${baseFilename}.${extension}`;
  return shareOrDownload(blob, filename);
}
