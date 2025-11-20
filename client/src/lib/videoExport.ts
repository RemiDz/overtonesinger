export interface VideoExportOptions {
  canvas: HTMLCanvasElement;
  audioBlob: Blob;
  duration: number;
  fps?: number;
  videoBitsPerSecond?: number;
}

export interface VideoExportProgress {
  stage: 'preparing' | 'recording' | 'processing' | 'complete';
  progress: number;
}

export async function exportSpectrogramVideo(
  options: VideoExportOptions,
  onProgress?: (progress: VideoExportProgress) => void
): Promise<Blob> {
  const { canvas, audioBlob, duration, fps = 30, videoBitsPerSecond = 2500000 } = options;

  onProgress?.({ stage: 'preparing', progress: 0 });

  const canvasStream = canvas.captureStream(fps);
  
  const audioContext = new AudioContext();
  const audioArrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
  
  const mediaStreamDestination = audioContext.createMediaStreamDestination();
  const audioSource = audioContext.createBufferSource();
  audioSource.buffer = audioBuffer;
  audioSource.connect(mediaStreamDestination);
  
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...mediaStreamDestination.stream.getAudioTracks()
  ]);

  const mimeType = getSupportedMimeType();
  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond
  });

  const chunks: Blob[] = [];
  
  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      onProgress?.({ stage: 'processing', progress: 90 });
      
      const videoBlob = new Blob(chunks, { type: mimeType });
      
      audioContext.close();
      
      onProgress?.({ stage: 'complete', progress: 100 });
      resolve(videoBlob);
    };

    mediaRecorder.onerror = (event) => {
      audioContext.close();
      reject(new Error('MediaRecorder error: ' + event));
    };

    onProgress?.({ stage: 'recording', progress: 10 });
    
    mediaRecorder.start(100);
    audioSource.start(0);
    
    const startTime = performance.now();
    const checkProgress = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(80, 10 + (elapsed / duration) * 70);
      onProgress?.({ stage: 'recording', progress });
      
      if (elapsed < duration) {
        requestAnimationFrame(checkProgress);
      }
    };
    checkProgress();
    
    setTimeout(() => {
      mediaRecorder.stop();
      audioSource.stop();
      canvasStream.getTracks().forEach(track => track.stop());
    }, duration * 1000 + 100);
  });
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
