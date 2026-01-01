import { useCallback } from "react";
import type { WritableDraft } from "immer";
import { RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  type Settings,
  type Transposition,
  type Temperament,
  TRANSPOSITION_LABELS,
  TEMPERAMENT_LABELS,
  DEFAULT_ADVANCED_SETTINGS,
} from "@/types";

type AdvancedSettingsDialogProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly settings: Settings;
  readonly onSettingsChange: (
    updater: (draft: WritableDraft<Settings>) => void,
  ) => void;
};

// Reference frequency presets
const FREQUENCY_PRESETS = [
  { value: 415, label: "415 Hz（バロック）" },
  { value: 440, label: "440 Hz（標準）" },
  { value: 442, label: "442 Hz（オーケストラ）" },
  { value: 443, label: "443 Hz" },
  { value: 444, label: "444 Hz" },
] as const;

export function AdvancedSettingsDialog({
  open,
  onClose,
  settings,
  onSettingsChange,
}: AdvancedSettingsDialogProps) {
  const { advanced } = settings;

  const handleReferenceFrequencyChange = useCallback(
    (values: readonly number[]) => {
      const frequency = values[0];
      if (frequency === undefined) return;
      onSettingsChange((draft) => {
        draft.advanced.referenceFrequency = frequency;
      });
    },
    [onSettingsChange],
  );

  const handleReferenceFrequencyPreset = useCallback(
    (frequency: number) => {
      onSettingsChange((draft) => {
        draft.advanced.referenceFrequency = frequency;
      });
    },
    [onSettingsChange],
  );

  const handleTranspositionChange = useCallback(
    (transposition: Transposition) => {
      onSettingsChange((draft) => {
        draft.advanced.transposition = transposition;
      });
    },
    [onSettingsChange],
  );

  const handleCentThresholdChange = useCallback(
    (values: readonly number[]) => {
      const threshold = values[0];
      if (threshold === undefined) return;
      onSettingsChange((draft) => {
        draft.advanced.centThreshold = threshold;
      });
    },
    [onSettingsChange],
  );

  const handleTemperamentChange = useCallback(
    (temperament: Temperament) => {
      onSettingsChange((draft) => {
        draft.advanced.temperament = temperament;
      });
    },
    [onSettingsChange],
  );

  const handleNoiseGateChange = useCallback(
    (values: readonly number[]) => {
      const threshold = values[0];
      if (threshold === undefined) return;
      // Convert from slider value (1-100) to actual threshold (0.001-0.1)
      const actualThreshold = threshold / 1000;
      onSettingsChange((draft) => {
        draft.advanced.noiseGateThreshold = actualThreshold;
      });
    },
    [onSettingsChange],
  );

  const resetReferenceFrequency = useCallback(() => {
    onSettingsChange((draft) => {
      draft.advanced.referenceFrequency =
        DEFAULT_ADVANCED_SETTINGS.referenceFrequency;
    });
  }, [onSettingsChange]);

  const resetCentThreshold = useCallback(() => {
    onSettingsChange((draft) => {
      draft.advanced.centThreshold = DEFAULT_ADVANCED_SETTINGS.centThreshold;
    });
  }, [onSettingsChange]);

  const resetNoiseGate = useCallback(() => {
    onSettingsChange((draft) => {
      draft.advanced.noiseGateThreshold =
        DEFAULT_ADVANCED_SETTINGS.noiseGateThreshold;
    });
  }, [onSettingsChange]);

  // Convert noise gate threshold to slider value (0.001-0.1 -> 1-100)
  const noiseGateSliderValue = Math.round(advanced.noiseGateThreshold * 1000);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>高度な設定</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reference Frequency (A4) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>基準周波数 (A4)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetReferenceFrequency}
                className="h-6 px-2 text-xs"
                disabled={
                  advanced.referenceFrequency ===
                  DEFAULT_ADVANCED_SETTINGS.referenceFrequency
                }
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                リセット
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[advanced.referenceFrequency]}
                onValueChange={handleReferenceFrequencyChange}
                min={400}
                max={480}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-mono w-16 text-right">
                {advanced.referenceFrequency} Hz
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {FREQUENCY_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={
                    advanced.referenceFrequency === preset.value
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleReferenceFrequencyPreset(preset.value)}
                  className="text-xs h-7"
                >
                  {preset.value}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              440Hz が標準、オーケストラでは 442Hz が一般的です
            </p>
          </div>

          {/* Transposition */}
          <div className="space-y-3">
            <Label>移調設定</Label>
            <Select
              value={advanced.transposition}
              onValueChange={(value) =>
                handleTranspositionChange(value as Transposition)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(TRANSPOSITION_LABELS) as readonly (readonly [
                    Transposition,
                    string,
                  ])[]
                ).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              移調楽器用に表示される音名をシフトします
            </p>
          </div>

          {/* Cent Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>セント閾値</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetCentThreshold}
                className="h-6 px-2 text-xs"
                disabled={
                  advanced.centThreshold ===
                  DEFAULT_ADVANCED_SETTINGS.centThreshold
                }
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                リセット
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[advanced.centThreshold]}
                onValueChange={handleCentThresholdChange}
                min={1}
                max={50}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-mono w-20 text-right">
                ±{advanced.centThreshold} cents
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              この範囲内なら「合っている」と判定します（緑色表示）
            </p>
          </div>

          {/* Temperament */}
          <div className="space-y-3">
            <Label>調律方式</Label>
            <RadioGroup
              value={advanced.temperament}
              onValueChange={(value) =>
                handleTemperamentChange(value as Temperament)
              }
              className="flex flex-col gap-2"
            >
              {(
                Object.entries(TEMPERAMENT_LABELS) as readonly (readonly [
                  Temperament,
                  string,
                ])[]
              ).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={`temperament-${key}`} />
                  <Label
                    htmlFor={`temperament-${key}`}
                    className="cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              純正律は和音を純粋に響かせるための調律方式です
            </p>
          </div>

          {/* Noise Gate Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>ノイズゲート閾値</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetNoiseGate}
                className="h-6 px-2 text-xs"
                disabled={
                  advanced.noiseGateThreshold ===
                  DEFAULT_ADVANCED_SETTINGS.noiseGateThreshold
                }
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                リセット
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[noiseGateSliderValue]}
                onValueChange={handleNoiseGateChange}
                min={1}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-mono w-12 text-right">
                {noiseGateSliderValue}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              音量がこの値以下の場合はピッチ検出を行いません（値が大きいほど感度が低くなります）
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
