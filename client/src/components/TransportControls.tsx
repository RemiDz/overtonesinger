import { Circle, Play, Square, Download, Image, RotateCcw, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecordingState } from '@shared/schema';

interface TransportControlsProps {
  recordingState: RecordingState;
  onRecord: () => void;
  onPlay: () => void;
  onStop: () => void;
  onReset: () => void;
  onExportWAV?: () => void;
  onExportPNG?: () => void;
  onAutoAdjust?: () => void;
  isAutoAdjusted?: boolean;
  hasRecording?: boolean;
  disabled?: boolean;
}

export function TransportControls({
  recordingState,
  onRecord,
  onPlay,
  onStop,
  onReset,
  onExportWAV,
  onExportPNG,
  onAutoAdjust,
  isAutoAdjusted = false,
  hasRecording = false,
  disabled = false,
}: TransportControlsProps) {
  const isRecording = recordingState === 'recording';
  const isPlaying = recordingState === 'playing';
  const canPlay = recordingState === 'stopped';
  const canStop = isRecording || isPlaying;

  return (
    <div className="flex items-center gap-3">
      {/* Record Button */}
      <Button
        size="icon"
        variant={isRecording ? 'default' : 'outline'}
        onClick={onRecord}
        disabled={disabled || isPlaying || isRecording}
        className={`w-10 h-10 rounded-full ${isRecording ? 'animate-pulse' : ''}`}
        aria-label="Record"
        data-testid="button-record"
      >
        <Circle className={`h-5 w-5 ${isRecording ? 'fill-current' : ''}`} />
      </Button>

      {/* Play Button */}
      <Button
        size="icon"
        variant={isPlaying ? 'default' : 'outline'}
        onClick={onPlay}
        disabled={disabled || !canPlay}
        className="w-10 h-10 rounded-full"
        aria-label="Play"
        data-testid="button-play"
      >
        <Play className={`h-5 w-5 ${isPlaying ? 'fill-current' : ''}`} />
      </Button>

      {/* Stop Button */}
      <Button
        size="icon"
        variant="outline"
        onClick={onStop}
        disabled={disabled || !canStop}
        className="w-10 h-10 rounded-full"
        aria-label="Stop"
        data-testid="button-stop"
      >
        <Square className="h-4 w-4 fill-current" />
      </Button>

      {/* Reset Button */}
      <Button
        size="icon"
        variant="outline"
        onClick={onReset}
        disabled={disabled || isRecording || isPlaying}
        className="w-10 h-10 rounded-full"
        aria-label="New Session"
        data-testid="button-reset"
      >
        <RotateCcw className="h-5 w-5" />
      </Button>

      {hasRecording && (
        <>
          <div className="w-px h-8 bg-border mx-1" />
          
          <Button
            size="icon"
            variant={isAutoAdjusted ? 'default' : 'outline'}
            onClick={onAutoAdjust}
            disabled={disabled || isRecording || isPlaying}
            className={`w-10 h-10 rounded-full ${isAutoAdjusted ? '' : 'hover:bg-primary/10 hover:text-primary'}`}
            aria-label={isAutoAdjusted ? "Restore Original Settings" : "Auto-Adjust for Overtones"}
            data-testid="button-auto-adjust"
          >
            <Wand2 className="h-5 w-5" />
          </Button>
          
          <Button
            size="icon"
            variant="outline"
            onClick={onExportWAV}
            disabled={disabled || isRecording || isPlaying}
            className="w-10 h-10 rounded-full"
            aria-label="Export WAV"
            data-testid="button-export-wav"
          >
            <Download className="h-5 w-5" />
          </Button>

          <Button
            size="icon"
            variant="outline"
            onClick={onExportPNG}
            disabled={disabled}
            className="w-10 h-10 rounded-full"
            aria-label="Export PNG"
            data-testid="button-export-png"
          >
            <Image className="h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  );
}
