import { useState, memo } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MicrophoneSelector } from "./MicrophoneSelector";
import type { AudioDevice } from "@/hooks/useMicrophoneDevices";

type ControlPanelProps = {
  readonly onSave: () => void;
  readonly isSaving?: boolean;
  readonly recordingDuration: number;
  readonly onDurationChange: (duration: number) => void;
  readonly devices: readonly AudioDevice[];
  readonly selectedDeviceId: string;
  readonly onDeviceChange: (deviceId: string) => void;
  readonly isDevicesLoading: boolean;
};

type DurationOption = "30" | "60" | "120" | "custom";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}秒`;
  }
  if (secs === 0) {
    return `${mins}分`;
  }
  return `${mins}分${secs}秒`;
}

function getDurationOption(duration: number): DurationOption {
  if (duration === 30) return "30";
  if (duration === 60) return "60";
  if (duration === 120) return "120";
  return "custom";
}

export const ControlPanel = memo(function ControlPanel({
  onSave,
  isSaving = false,
  recordingDuration,
  onDurationChange,
  devices,
  selectedDeviceId,
  onDeviceChange,
  isDevicesLoading,
}: ControlPanelProps) {
  // Track whether user has explicitly selected custom mode
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Derive option from recordingDuration prop (pure computation during render)
  const derivedOption = getDurationOption(recordingDuration);
  const option: DurationOption = isCustomMode ? "custom" : derivedOption;

  // Derive custom input values directly from recordingDuration (controlled inputs)
  const customMinutes = Math.floor(recordingDuration / 60);
  const customSeconds = recordingDuration % 60;

  const handleOptionChange = (value: DurationOption) => {
    if (value === "custom") {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
      onDurationChange(parseInt(value, 10));
    }
  };

  const handleCustomMinutesChange = (value: string) => {
    const mins = Math.max(0, Math.min(59, parseInt(value, 10) || 0));
    const newDuration = mins * 60 + customSeconds;
    if (newDuration > 0) {
      onDurationChange(newDuration);
    }
  };

  const handleCustomSecondsChange = (value: string) => {
    const secs = Math.max(0, Math.min(59, parseInt(value, 10) || 0));
    const newDuration = customMinutes * 60 + secs;
    if (newDuration > 0) {
      onDurationChange(newDuration);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 flex-wrap justify-center">
        <MicrophoneSelector
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onDeviceChange={onDeviceChange}
          isLoading={isDevicesLoading}
          compact
        />

        <div className="flex items-center gap-2">
          <Select value={option} onValueChange={handleOptionChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30秒</SelectItem>
              <SelectItem value="60">1分</SelectItem>
              <SelectItem value="120">2分</SelectItem>
              <SelectItem value="custom">カスタム</SelectItem>
            </SelectContent>
          </Select>

          {option === "custom" && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="59"
                value={customMinutes}
                onChange={(e) => {
                  handleCustomMinutesChange(e.target.value);
                }}
                className="w-12 h-9 px-2 text-sm text-center rounded-md border border-input bg-transparent shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
              />
              <span className="text-sm text-muted-foreground">分</span>
              <input
                type="number"
                min="0"
                max="59"
                value={customSeconds}
                onChange={(e) => {
                  handleCustomSecondsChange(e.target.value);
                }}
                className="w-12 h-9 px-2 text-sm text-center rounded-md border border-input bg-transparent shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
              />
              <span className="text-sm text-muted-foreground">秒</span>
            </div>
          )}
        </div>
      </div>

      <Button onClick={onSave} size="lg" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
        {isSaving ? "保存中..." : `保存 (${formatDuration(recordingDuration)})`}
      </Button>
    </div>
  );
});
