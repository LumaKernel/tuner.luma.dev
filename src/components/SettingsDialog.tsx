import { useCallback, useMemo } from "react";
import type { WritableDraft } from "immer";
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
import { Switch } from "@/components/ui/switch";
import { getSupportedFormats } from "@/utils/audioConverter";
import {
  type Settings,
  type Notation,
  type Accidental,
  type AudioFormat,
  AUDIO_FORMAT_LABELS,
} from "@/types";

type SettingsDialogProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly settings: Settings;
  readonly onSettingsChange: (
    updater: (draft: WritableDraft<Settings>) => void,
  ) => void;
};

export function SettingsDialog({
  open,
  onClose,
  settings,
  onSettingsChange,
}: SettingsDialogProps) {
  const handleNotationChange = useCallback(
    (notation: Notation) => {
      onSettingsChange((draft) => {
        draft.notation = notation;
      });
    },
    [onSettingsChange],
  );

  const handleAccidentalChange = useCallback(
    (accidental: Accidental) => {
      onSettingsChange((draft) => {
        draft.accidental = accidental;
      });
    },
    [onSettingsChange],
  );

  const handleAutoStartChange = useCallback(
    (autoStart: boolean) => {
      onSettingsChange((draft) => {
        draft.autoStart = autoStart;
      });
    },
    [onSettingsChange],
  );

  const handleAudioFormatChange = useCallback(
    (audioFormat: AudioFormat) => {
      onSettingsChange((draft) => {
        draft.audioFormat = audioFormat;
      });
    },
    [onSettingsChange],
  );

  const supportedFormats = useMemo(() => getSupportedFormats(), []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notation */}
          <div className="space-y-3">
            <Label>表記法</Label>
            <RadioGroup
              value={settings.notation}
              onValueChange={(value) => {
                handleNotationChange(value as Notation);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="letter" id="notation-letter" />
                <Label htmlFor="notation-letter" className="cursor-pointer">
                  CDEFGAB
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="solfege" id="notation-solfege" />
                <Label htmlFor="notation-solfege" className="cursor-pointer">
                  ドレミ
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Accidental */}
          <div className="space-y-3">
            <Label>変化記号</Label>
            <RadioGroup
              value={settings.accidental}
              onValueChange={(value) => {
                handleAccidentalChange(value as Accidental);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sharp" id="accidental-sharp" />
                <Label htmlFor="accidental-sharp" className="cursor-pointer">
                  ♯ シャープ
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="flat" id="accidental-flat" />
                <Label htmlFor="accidental-flat" className="cursor-pointer">
                  ♭ フラット
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Auto Start */}
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-start-setting">次回から自動で開始する</Label>
            <Switch
              id="auto-start-setting"
              checked={settings.autoStart}
              onCheckedChange={handleAutoStartChange}
            />
          </div>

          {/* Audio Format */}
          <div className="space-y-3">
            <Label>保存フォーマット</Label>
            <Select
              value={settings.audioFormat}
              onValueChange={(value) => {
                handleAudioFormatChange(value as AudioFormat);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedFormats.map((format) => (
                  <SelectItem key={format} value={format}>
                    {AUDIO_FORMAT_LABELS[format]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              ダウンロード時のデフォルト形式を指定します
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
