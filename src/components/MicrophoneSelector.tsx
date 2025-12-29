import type { AudioDevice } from "@/hooks/useMicrophoneDevices";

interface MicrophoneSelectorProps {
  readonly devices: readonly AudioDevice[];
  readonly selectedDeviceId: string;
  readonly onDeviceChange: (deviceId: string) => void;
  readonly isLoading: boolean;
  readonly compact?: boolean;
}

export function MicrophoneSelector({
  devices,
  selectedDeviceId,
  onDeviceChange,
  isLoading,
  compact = false,
}: MicrophoneSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 text-sm">
        <svg
          className="animate-spin h-4 w-4"
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
        <span>検出中...</span>
      </div>
    );
  }

  if (devices.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "flex items-center gap-2" : "w-full"}>
      {!compact && (
        <label className="block text-sm text-zinc-400 mb-2">マイク選択</label>
      )}
      <div className="flex items-center gap-2">
        {compact && (
          <svg
            className="w-4 h-4 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
        <select
          value={selectedDeviceId}
          onChange={(e) => onDeviceChange(e.target.value)}
          className={`
            ${compact ? "px-2 py-1 text-sm" : "w-full px-4 py-3"}
            rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
          `}
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
