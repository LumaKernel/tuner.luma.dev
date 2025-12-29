import { useState, useCallback, useEffect } from "react";
import { useMicrophoneDevices } from "@/hooks/useMicrophoneDevices";

interface StartOverlayProps {
  readonly onStart: (deviceId?: string) => void;
}

export function StartOverlay({ onStart }: StartOverlayProps) {
  const { devices, isLoading, error, refreshDevices } = useMicrophoneDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [hasLoadedDevices, setHasLoadedDevices] = useState(false);

  // Load devices on mount
  useEffect(() => {
    if (!hasLoadedDevices) {
      setHasLoadedDevices(true);
      refreshDevices();
    }
  }, [hasLoadedDevices, refreshDevices]);

  // Select first device when devices are loaded
  useEffect(() => {
    if (devices.length > 0 && selectedDeviceId === "") {
      setSelectedDeviceId(devices[0].deviceId);
    }
  }, [devices, selectedDeviceId]);

  const handleStart = useCallback(() => {
    onStart(selectedDeviceId || undefined);
  }, [onStart, selectedDeviceId]);

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

        {isLoading ? (
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
        ) : devices.length > 0 ? (
          <div className="w-full">
            <label className="block text-sm text-zinc-400 mb-2">
              マイク選択
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <button
            onClick={refreshDevices}
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
