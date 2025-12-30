import { useState, useCallback } from "react";

export type AudioDevice = {
  readonly deviceId: string;
  readonly label: string;
};

type MicrophoneDevicesResult = {
  readonly devices: readonly AudioDevice[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refreshDevices: () => Promise<void>;
};

export function useMicrophoneDevices(): MicrophoneDevicesResult {
  const [devices, setDevices] = useState<readonly AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request permission first - this is required to get device labels
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach((track) => {
        track.stop();
      });

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices
        .filter((device) => device.kind === "audioinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `マイク ${index + 1}`,
        }));

      setDevices(audioInputs);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("マイクへのアクセスが拒否されました");
        } else if (err.name === "NotFoundError") {
          setError("マイクが見つかりません");
        } else {
          setError(`エラー: ${err.message}`);
        }
      } else {
        setError("不明なエラーが発生しました");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    devices,
    isLoading,
    error,
    refreshDevices,
  };
}
