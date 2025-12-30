import { useCallback } from "react";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MicrophoneSelector } from "./MicrophoneSelector";
import type { AudioDevice } from "@/hooks/useMicrophoneDevices";

type StartOverlayProps = {
  readonly devices: readonly AudioDevice[];
  readonly selectedDeviceId: string;
  readonly onDeviceChange: (deviceId: string) => void;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRefreshDevices: () => void;
  readonly onStart: () => void;
  readonly autoStart: boolean;
  readonly onAutoStartChange: (autoStart: boolean) => void;
};

export function StartOverlay({
  devices,
  selectedDeviceId,
  onDeviceChange,
  isLoading,
  error,
  onRefreshDevices,
  onStart,
  autoStart,
  onAutoStartChange,
}: StartOverlayProps) {
  const handleStart = useCallback(() => {
    onStart();
  }, [onStart]);

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg border">
      <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">tuner.luma.dev</h2>
          <p className="text-muted-foreground text-sm">
            マイクを選択して開始してください
          </p>
        </div>

        {error && (
          <div className="w-full p-3 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive text-sm text-center">
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
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>マイクを検出中...</span>
          </div>
        ) : (
          <Button onClick={onRefreshDevices} variant="secondary">
            マイクを検出
          </Button>
        )}

        {devices.length > 0 && (
          <>
            <Button onClick={handleStart} size="lg" className="w-full">
              <Play />
              開始
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-start"
                checked={autoStart}
                onCheckedChange={(checked) => {
                  onAutoStartChange(checked === true);
                }}
              />
              <Label
                htmlFor="auto-start"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                次回から自動で開始する
              </Label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
