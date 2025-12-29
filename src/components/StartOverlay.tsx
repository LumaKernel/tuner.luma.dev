import { useCallback } from "react";
import { MicrophoneSelector } from "./MicrophoneSelector";
import type { AudioDevice } from "@/hooks/useMicrophoneDevices";

interface StartOverlayProps {
  readonly devices: readonly AudioDevice[];
  readonly selectedDeviceId: string;
  readonly onDeviceChange: (deviceId: string) => void;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRefreshDevices: () => void;
  readonly onStart: () => void;
}

export function StartOverlay({
  devices,
  selectedDeviceId,
  onDeviceChange,
  isLoading,
  error,
  onRefreshDevices,
  onStart,
}: StartOverlayProps) {
  const handleStart = useCallback(() => {
    onStart();
  }, [onStart]);

  return (
    <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
      <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">チューナー</h2>
          <p className="text-zinc-400 text-sm">
            マイクを選択して開始してください
          </p>
        </div>

        {error && (
          <div className="w-full p-3 rounded-lg bg-red-900/50 border border-red-700 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {devices.length > 0 ? (
          <MicrophoneSelector
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onDeviceChange={onDeviceChange}
            isLoading={isLoading}
          />
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-zinc-400">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>マイクを検出中...</span>
          </div>
        ) : (
          <button
            onClick={onRefreshDevices}
            className="px-6 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
          >
            マイクを検出
          </button>
        )}

        {devices.length > 0 && (
          <button
            onClick={handleStart}
            className="w-full px-8 py-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            開始
          </button>
        )}
      </div>
    </div>
  );
}
