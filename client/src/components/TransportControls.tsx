import { Circle, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecordingState } from '@shared/schema';

interface TransportControlsProps {
  recordingState: RecordingState;
  onRecord: () => void;
  onPlay: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function TransportControls({
  recordingState,
  onRecord,
  onPlay,
  onStop,
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
    </div>
  );
}
