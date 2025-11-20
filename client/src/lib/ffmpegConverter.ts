import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isFFmpegLoaded = false;

export async function loadFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance && isFFmpegLoaded) {
    return ffmpegInstance;
  }

  ffmpegInstance = new FFmpeg();

  ffmpegInstance.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  ffmpegInstance.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress(Math.round(progress * 100));
    }
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  isFFmpegLoaded = true;
  return ffmpegInstance;
}

export interface ConversionOptions {
  onProgress?: (progress: number) => void;
  videoBitrate?: string;
  audioBitrate?: string;
}

export async function convertWebMToMP4(
  webmBlob: Blob,
  options: ConversionOptions = {}
): Promise<Blob> {
  const {
    onProgress,
    videoBitrate = '2500k',
    audioBitrate = '128k'
  } = options;

  const ffmpeg = await loadFFmpeg(onProgress);

  const inputFileName = 'input.webm';
  const outputFileName = 'output.mp4';

  await ffmpeg.writeFile(inputFileName, await fetchFile(webmBlob));

  await ffmpeg.exec([
    '-i', inputFileName,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-b:v', videoBitrate,
    '-c:a', 'aac',
    '-b:a', audioBitrate,
    '-movflags', '+faststart',
    outputFileName
  ]);

  const data = await ffmpeg.readFile(outputFileName);
  
  await ffmpeg.deleteFile(inputFileName);
  await ffmpeg.deleteFile(outputFileName);

  return new Blob([data], { type: 'video/mp4' });
}
