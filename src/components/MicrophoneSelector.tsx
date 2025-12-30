import { Mic } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
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
    <div className={compact ? "flex items-center gap-2" : "w-full space-y-2"}>
      {!compact && <Label>マイク選択</Label>}
      <div className="flex items-center gap-2">
        {compact && <Mic className="w-4 h-4 text-muted-foreground" />}
        <Select value={selectedDeviceId} onValueChange={onDeviceChange}>
          <SelectTrigger
            size={compact ? "sm" : "default"}
            className={compact ? "w-auto" : "w-full"}
          >
            <SelectValue placeholder="マイクを選択" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
