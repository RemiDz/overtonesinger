import { Circle, Play, Square, Download, Image, RotateCcw, Video, Repeat, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { RecordingState } from '@shared/schema';

interface TransportControlsProps {
  recordingState: RecordingState;
  onRecord: () => void;
  onPlay: () => void;
  onStop: () => void;
  onReset: () => void;
  onExportWAV?: () => void;
  onExportPNG?: () => void;
  onExportVideo?: () => void;
  hasRecording?: boolean;
  disabled?: boolean;
  isExportingVideo?: boolean;
  loopEnabled?: boolean;
  onToggleLoop?: () => void;
  isPro?: boolean;
}

export function TransportControls({
  recordingState,
  onRecord,
  onPlay,
  onStop,
  onReset,
  onExportWAV,
  onExportPNG,
  onExportVideo,
  hasRecording = false,
  disabled = false,
  isExportingVideo = false,
  loopEnabled = false,
  onToggleLoop,
  isPro = false,
}: TransportControlsProps) {
  const isRecording = recordingState === 'recording';
  const isPlaying = recordingState === 'playing';
  const canPlay = recordingState === 'stopped';
  const canStop = isRecording || isPlaying;

  return (
    <div className="flex items-center gap-1 sm:gap-3">
      {/* Record Button */}
      <Button
        size="icon"
        variant={isRecording ? 'default' : 'outline'}
        onClick={onRecord}
        disabled={disabled || isPlaying || isRecording}
        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${isRecording ? 'animate-pulse' : ''}`}
        aria-label="Record"
        data-testid="button-record"
      >
        <Circle className={`h-4 w-4 sm:h-5 sm:w-5 ${isRecording ? 'fill-current' : ''}`} />
      </Button>

      {/* Play Button */}
      <Button
        size="icon"
        variant={isPlaying ? 'default' : 'outline'}
        onClick={onPlay}
        disabled={disabled || !canPlay}
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
        aria-label="Play"
        data-testid="button-play"
      >
        <Play className={`h-4 w-4 sm:h-5 sm:w-5 ${isPlaying ? 'fill-current' : ''}`} />
      </Button>

      {/* Loop Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant={loopEnabled ? 'default' : 'outline'}
            onClick={onToggleLoop}
            disabled={disabled || isRecording}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full relative ${!isPro ? 'opacity-70' : ''}`}
            aria-label={isPro ? (loopEnabled ? 'Disable loop' : 'Enable loop') : 'Loop (Pro)'}
            data-testid="button-loop"
          >
            <Repeat className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loopEnabled ? 'text-primary-foreground' : ''}`} />
            {!isPro && <Lock className="h-2.5 w-2.5 absolute top-0.5 right-0.5 text-amber-400" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isPro ? (loopEnabled ? 'Disable loop' : 'Enable loop') : 'Loop (Pro)'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Stop Button */}
      <Button
        size="icon"
        variant="outline"
        onClick={onStop}
        disabled={disabled || !canStop}
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
        aria-label="Stop"
        data-testid="button-stop"
      >
        <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
      </Button>

      {/* Reset Button */}
      <Button
        size="icon"
        variant="outline"
        onClick={onReset}
        disabled={disabled || isRecording || isPlaying}
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
        aria-label="New Session"
        data-testid="button-reset"
      >
        <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>

      {hasRecording && (
        <>
          <div className="w-px h-6 sm:h-8 bg-border mx-0.5 sm:mx-1" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={onExportWAV}
                disabled={disabled || isRecording || isPlaying}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full relative ${!isPro ? 'opacity-70' : ''}`}
                aria-label={isPro ? 'Export WAV' : 'Export WAV (Pro)'}
                data-testid="button-export-wav"
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                {!isPro && <Lock className="h-2.5 w-2.5 absolute top-0.5 right-0.5 text-amber-400" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPro ? 'Export WAV' : 'Export WAV (Pro)'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={onExportPNG}
                disabled={disabled || isRecording || isPlaying}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full relative ${!isPro ? 'opacity-70' : ''}`}
                aria-label={isPro ? 'Export PNG' : 'Export PNG (Pro)'}
                data-testid="button-export-png"
              >
                <Image className="h-4 w-4 sm:h-5 sm:w-5" />
                {!isPro && <Lock className="h-2.5 w-2.5 absolute top-0.5 right-0.5 text-amber-400" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPro ? 'Export PNG' : 'Export PNG (Pro)'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={onExportVideo}
                disabled={disabled || isRecording || isPlaying || isExportingVideo}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full relative ${!isPro ? 'opacity-70' : ''}`}
                aria-label={isPro ? 'Export Video' : 'Export Video (Pro)'}
                data-testid="button-export-video"
              >
                <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                {!isPro && <Lock className="h-2.5 w-2.5 absolute top-0.5 right-0.5 text-amber-400" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPro ? 'Export Video' : 'Export Video (Pro)'}</p>
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
