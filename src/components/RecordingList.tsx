import { useMemo } from "react";
import {
  Download,
  Trash2,
  Play,
  Square,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import {
  type RecordingMeta,
  type AudioFormat,
  AUDIO_FORMAT_LABELS,
} from "@/types";
import { getSupportedFormats } from "@/utils/audioConverter";

type RecordingListProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly recordings: readonly RecordingMeta[];
  readonly onDelete: (id: string) => void;
  readonly onDownload: (id: string, format: AudioFormat) => void;
  readonly onPlay: (id: string) => void;
  readonly onStop: () => void;
  readonly onSeek: (time: number) => void;
  readonly playingId: string | null;
  readonly playbackTime: number;
  readonly playbackDuration: number;
  readonly isConverting: boolean;
  readonly defaultFormat: AudioFormat;
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  // Handle Infinity/NaN (WebM from MediaRecorder often lacks duration metadata)
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const remaining = expiresAt - now;

  if (remaining < 0) return "期限切れ";

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
  );

  if (days > 0) return `あと${days}日`;
  if (hours > 0) return `あと${hours}時間`;
  return "まもなく期限切れ";
}

export function RecordingList({
  open,
  onClose,
  recordings,
  onDelete,
  onDownload,
  onPlay,
  onStop,
  onSeek,
  playingId,
  playbackTime,
  playbackDuration,
  isConverting,
  defaultFormat,
}: RecordingListProps) {
  const supportedFormats = useMemo(() => getSupportedFormats(), []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>録音一覧</DialogTitle>
          <DialogDescription>
            録音は7日間保存されます。期限が切れると自動的に削除されます。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {recordings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              録音がありません
            </div>
          ) : (
            <div className="space-y-2">
              {recordings.map((recording) => {
                const isPlaying = playingId === recording.id;
                return (
                  <div
                    key={recording.id}
                    className="bg-muted rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {formatDate(recording.createdAt)}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>{formatDuration(recording.duration)}</span>
                          <span className="text-yellow-500">
                            {formatTimeRemaining(recording.expiresAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {isPlaying ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={onStop}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              onPlay(recording.id);
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <div className="flex">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isConverting}
                            onClick={() => {
                              onDownload(recording.id, defaultFormat);
                            }}
                            className="rounded-r-none border-r border-border/50"
                          >
                            {isConverting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={isConverting}
                                className="rounded-l-none px-1.5"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {supportedFormats.map((format) => (
                                <DropdownMenuItem
                                  key={format}
                                  onClick={() => {
                                    onDownload(recording.id, format);
                                  }}
                                >
                                  {AUDIO_FORMAT_LABELS[format]}
                                  {format === defaultFormat && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (デフォルト)
                                    </span>
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            onDelete(recording.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {formatDuration(isPlaying ? playbackTime : 0)}
                      </span>
                      <Slider
                        min={0}
                        max={
                          isPlaying && Number.isFinite(playbackDuration)
                            ? playbackDuration
                            : recording.duration
                        }
                        step={0.1}
                        value={[isPlaying ? playbackTime : 0]}
                        onValueChange={([value]) => {
                          onSeek(value);
                        }}
                        disabled={!isPlaying}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-10">
                        {formatDuration(
                          isPlaying && Number.isFinite(playbackDuration)
                            ? playbackDuration
                            : recording.duration,
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
