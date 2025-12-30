import { useCallback } from "react";
import type { WritableDraft } from "immer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Settings, Notation, Accidental } from "@/types";
import { getBaseNoteDisplay, BASE_NOTE_OPTIONS } from "@/lib/noteUtils";

interface SettingsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly settings: Settings;
  readonly onSettingsChange: (
    updater: (draft: WritableDraft<Settings>) => void
  ) => void;
}

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
    [onSettingsChange]
  );

  const handleAccidentalChange = useCallback(
    (accidental: Accidental) => {
      onSettingsChange((draft) => {
        draft.accidental = accidental;
      });
    },
    [onSettingsChange]
  );

  const handleMovableDoChange = useCallback(
    (movableDo: boolean) => {
      onSettingsChange((draft) => {
        draft.movableDo = movableDo;
      });
    },
    [onSettingsChange]
  );

  const handleBaseNoteChange = useCallback(
    (baseNote: number) => {
      onSettingsChange((draft) => {
        draft.baseNote = baseNote;
      });
    },
    [onSettingsChange]
  );

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
              onValueChange={(value) => handleNotationChange(value as Notation)}
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
              onValueChange={(value) =>
                handleAccidentalChange(value as Accidental)
              }
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

          {/* Movable Do */}
          <div className="flex items-center justify-between">
            <Label htmlFor="movable-do">移動ド</Label>
            <Switch
              id="movable-do"
              checked={settings.movableDo}
              onCheckedChange={handleMovableDoChange}
            />
          </div>

          {/* Base Note (only for movable do) */}
          {settings.movableDo && (
            <div className="space-y-3">
              <Label>基準音 (ド = ?)</Label>
              <div className="grid grid-cols-6 gap-1">
                {BASE_NOTE_OPTIONS.map((note) => (
                  <Button
                    key={note}
                    variant={
                      settings.baseNote === note ? "default" : "secondary"
                    }
                    size="sm"
                    onClick={() => handleBaseNoteChange(note)}
                    className="text-xs"
                  >
                    {getBaseNoteDisplay(note, settings.notation, settings.accidental)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
