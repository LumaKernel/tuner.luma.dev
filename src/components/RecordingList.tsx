import type { RecordingMeta } from "@/types";

interface RecordingListProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly recordings: readonly RecordingMeta[];
  readonly onDelete: (id: string) => void;
  readonly onDownload: (id: string) => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
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
    (remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
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
}: RecordingListProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-zinc-900 rounded-lg border border-zinc-800 p-6 w-full max-w-lg mx-4 shadow-xl max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4">録音一覧</h2>

        <p className="text-sm text-zinc-500 mb-4">
          録音は7日間保存されます。期限が切れると自動的に削除されます。
        </p>

        <div className="flex-1 overflow-y-auto">
          {recordings.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              録音がありません
            </div>
          ) : (
            <div className="space-y-2">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {formatDate(recording.createdAt)}
                    </div>
                    <div className="flex gap-3 text-xs text-zinc-500">
                      <span>{formatDuration(recording.duration)}</span>
                      <span className="text-yellow-600">
                        {formatTimeRemaining(recording.expiresAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onDownload(recording.id)}
                      className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      DL
                    </button>
                    <button
                      onClick={() => onDelete(recording.id)}
                      className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
