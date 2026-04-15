import { useState, useCallback, memo } from "react";
import { Save, Loader2, RotateCcw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MicrophoneSelector } from "./MicrophoneSelector";
import type { AudioDevice } from "@/hooks/useMicrophoneDevices";
import { formatDurationShort, isValidDuration } from "@/lib/durationUtils";
import {
  DURATION_PRESETS_DEFAULT,
  DURATION_MIN,
  DURATION_MAX,
} from "@/constants/audio";

type ControlPanelProps = {
  readonly onSave: () => void;
  readonly isSaving?: boolean;
  readonly recordingDuration: number;
  readonly onDurationChange: (duration: number) => void;
  readonly durationPresets: readonly number[];
  readonly onDurationPresetsChange: (presets: readonly number[]) => void;
  readonly devices: readonly AudioDevice[];
  readonly selectedDeviceId: string;
  readonly onDeviceChange: (deviceId: string) => void;
  readonly isDevicesLoading: boolean;
};

// ============================================================================
// Duration Input Modal
// ============================================================================

type DurationInputModalContentProps = {
  readonly initialDuration: number;
  readonly onDurationChange: (duration: number) => void;
  readonly onClose: () => void;
};

const DurationInputModalContent = memo(function DurationInputModalContent({
  initialDuration,
  onDurationChange,
  onClose,
}: DurationInputModalContentProps) {
  const [minutes, setMinutes] = useState(() =>
    Math.floor(initialDuration / 60).toString(),
  );
  const [seconds, setSeconds] = useState(() =>
    (initialDuration % 60).toString(),
  );

  const computedDuration =
    (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
  const isValid = isValidDuration(computedDuration);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isValid) {
        onDurationChange(computedDuration);
        onClose();
      }
    },
    [isValid, computedDuration, onDurationChange, onClose],
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>保存時間設定</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>
            保存時間 ({DURATION_MIN}秒〜{DURATION_MAX / 60}分)
          </Label>
          <div className="flex items-center gap-2 justify-center">
            <Input
              type="number"
              min="0"
              max="10"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-16 text-center text-lg"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">分</span>
            <Input
              type="number"
              min="0"
              max="59"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              className="w-16 text-center text-lg"
            />
            <span className="text-sm text-muted-foreground">秒</span>
          </div>
          {computedDuration > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              = {formatDurationShort(computedDuration)}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            キャンセル
          </Button>
          <Button type="submit" className="flex-1" disabled={!isValid}>
            設定
          </Button>
        </div>
      </form>
    </>
  );
});

type DurationInputModalProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly currentDuration: number;
  readonly onDurationChange: (duration: number) => void;
};

const DurationInputModal = memo(function DurationInputModal({
  open,
  onClose,
  currentDuration,
  onDurationChange,
}: DurationInputModalProps) {
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {open && (
          <DurationInputModalContent
            initialDuration={currentDuration}
            onDurationChange={onDurationChange}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
});

// ============================================================================
// Duration Presets Settings Modal
// ============================================================================

type DurationPresetsSettingsModalContentProps = {
  readonly initialPresets: readonly number[];
  readonly onPresetsChange: (presets: readonly number[]) => void;
  readonly onClose: () => void;
};

const DurationPresetsSettingsModalContent = memo(
  function DurationPresetsSettingsModalContent({
    initialPresets,
    onPresetsChange,
    onClose,
  }: DurationPresetsSettingsModalContentProps) {
    const [editingPresets, setEditingPresets] = useState<readonly number[]>(
      () => [...initialPresets],
    );
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handlePresetClick = useCallback((index: number) => {
      setEditingIndex(index);
    }, []);

    const handlePresetChange = useCallback(
      (newDuration: number) => {
        setEditingPresets((current) => {
          const newPresets = [...current];
          if (editingIndex !== null) {
            newPresets[editingIndex] = newDuration;
          }
          return newPresets;
        });
        setEditingIndex(null);
      },
      [editingIndex],
    );

    const handleResetToDefault = useCallback(() => {
      setEditingPresets([...DURATION_PRESETS_DEFAULT]);
    }, []);

    const handleSave = useCallback(() => {
      const sortedPresets = [...editingPresets].sort((a, b) => a - b);
      onPresetsChange(sortedPresets);
      onClose();
    }, [editingPresets, onPresetsChange, onClose]);

    const currentEditingDuration =
      editingIndex !== null ? editingPresets[editingIndex] : 30;

    return (
      <>
        <DialogHeader>
          <DialogTitle>保存時間プリセット設定</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>プリセット値（クリックで編集）</Label>
            <div className="grid grid-cols-3 gap-2">
              {editingPresets.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-10 font-mono"
                  onClick={() => handlePresetClick(index)}
                >
                  {formatDurationShort(preset)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              保存時に自動でソートされます
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToDefault}
              className="flex-1"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              初期値に戻す
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              キャンセル
            </Button>
            <Button type="button" className="flex-1" onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>

        <DurationInputModal
          open={editingIndex !== null}
          onClose={() => setEditingIndex(null)}
          currentDuration={currentEditingDuration}
          onDurationChange={handlePresetChange}
        />
      </>
    );
  },
);

type DurationPresetsSettingsModalProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly presets: readonly number[];
  readonly onPresetsChange: (presets: readonly number[]) => void;
};

const DurationPresetsSettingsModal = memo(
  function DurationPresetsSettingsModal({
    open,
    onClose,
    presets,
    onPresetsChange,
  }: DurationPresetsSettingsModalProps) {
    const handleOpenChange = useCallback(
      (isOpen: boolean) => {
        if (!isOpen) {
          onClose();
        }
      },
      [onClose],
    );

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-xs">
          {open && (
            <DurationPresetsSettingsModalContent
              initialPresets={presets}
              onPresetsChange={onPresetsChange}
              onClose={onClose}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  },
);

// ============================================================================
// Duration Preset Buttons
// ============================================================================

type DurationPresetButtonsProps = {
  readonly presets: readonly number[];
  readonly currentDuration: number;
  readonly onDurationSelect: (duration: number) => void;
  readonly onSettingsClick: () => void;
};

const DurationPresetButtons = memo(function DurationPresetButtons({
  presets,
  currentDuration,
  onDurationSelect,
  onSettingsClick,
}: DurationPresetButtonsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {presets.map((preset, index) => (
        <Button
          key={index}
          variant={preset === currentDuration ? "default" : "outline"}
          size="sm"
          className="h-7 px-2 text-xs font-mono"
          onClick={() => onDurationSelect(preset)}
        >
          {formatDurationShort(preset)}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={onSettingsClick}
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
});

// ============================================================================
// Control Panel
// ============================================================================

export const ControlPanel = memo(function ControlPanel({
  onSave,
  isSaving = false,
  recordingDuration,
  onDurationChange,
  durationPresets,
  onDurationPresetsChange,
  devices,
  selectedDeviceId,
  onDeviceChange,
  isDevicesLoading,
}: ControlPanelProps) {
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);

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
      </div>

      {/* Duration Presets */}
      <DurationPresetButtons
        presets={durationPresets}
        currentDuration={recordingDuration}
        onDurationSelect={onDurationChange}
        onSettingsClick={() => setIsPresetsModalOpen(true)}
      />

      {/* Duration Presets Settings Modal */}
      <DurationPresetsSettingsModal
        open={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        presets={durationPresets}
        onPresetsChange={onDurationPresetsChange}
      />

      <Button onClick={onSave} size="lg" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
        {isSaving
          ? "保存中..."
          : `保存 (${formatDurationShort(recordingDuration)})`}
      </Button>
    </div>
  );
});
