import { useCallback } from "react";
import type { Settings, Notation, Accidental } from "@/types";
import { getBaseNoteDisplay, BASE_NOTE_OPTIONS } from "@/lib/noteUtils";

interface SettingsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly settings: Settings;
  readonly onSettingsChange: (updater: (draft: Settings) => void) => void;
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-zinc-900 rounded-lg border border-zinc-800 p-6 w-full max-w-md mx-4 shadow-xl">
        <h2 className="text-xl font-bold mb-6">設定</h2>

        {/* Notation */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            表記法
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleNotationChange("letter")}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                settings.notation === "letter"
                  ? "bg-green-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              CDEFGAB
            </button>
            <button
              onClick={() => handleNotationChange("solfege")}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                settings.notation === "solfege"
                  ? "bg-green-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              ドレミ
            </button>
          </div>
        </div>

        {/* Accidental */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            変化記号
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleAccidentalChange("sharp")}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                settings.accidental === "sharp"
                  ? "bg-green-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              ♯ シャープ
            </button>
            <button
              onClick={() => handleAccidentalChange("flat")}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                settings.accidental === "flat"
                  ? "bg-green-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              ♭ フラット
            </button>
          </div>
        </div>

        {/* Movable Do */}
        {settings.notation === "solfege" && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                移動ド
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleMovableDoChange(false)}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                    !settings.movableDo
                      ? "bg-green-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  固定ド
                </button>
                <button
                  onClick={() => handleMovableDoChange(true)}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                    settings.movableDo
                      ? "bg-green-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  移動ド
                </button>
              </div>
            </div>

            {/* Base Note (only for movable do) */}
            {settings.movableDo && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  基準音 (ド = ?)
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {BASE_NOTE_OPTIONS.map((note) => (
                    <button
                      key={note}
                      onClick={() => handleBaseNoteChange(note)}
                      className={`py-2 px-2 rounded text-sm transition-colors ${
                        settings.baseNote === note
                          ? "bg-green-600 text-white"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      {getBaseNoteDisplay(note, settings.accidental)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
