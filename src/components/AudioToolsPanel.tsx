import { useState, useCallback, useMemo, memo } from "react";
import {
  Volume2,
  Play,
  Square,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useReferenceSound,
  type WaveformType,
  WAVEFORM_LABELS,
} from "@/hooks/useReferenceSound";
import { useMetronomeControl, useMetronomeBeat } from "@/hooks/useMetronome";
import {
  midiToFrequency,
  getNoteNames,
  type TuningOptions,
} from "@/lib/noteUtils";
import type { Notation, Accidental, AdvancedSettings } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import {
  BPM_MIN,
  BPM_MAX,
  BPM_DEFAULT,
  BPM_SLIDER_MAX,
  BPM_PRESETS_DEFAULT,
  VOLUME_MIN,
  VOLUME_MAX,
  VOLUME_STEP,
  VOLUME_DEFAULT_REFERENCE,
  VOLUME_DEFAULT_METRONOME,
  MIDI_NOTES_PER_OCTAVE,
  MIDI_C2,
  MIDI_A4,
  MIDI_OCTAVE_OFFSET,
  NOTE_RANGE_COUNT,
  METRONOME_BEATS_PER_MEASURE,
} from "@/constants/audio";

type AudioToolsPanelProps = {
  readonly notation: Notation;
  readonly accidental: Accidental;
  readonly advancedSettings: AdvancedSettings;
};

// Generate note options (C2 to C7)
const NOTE_OPTIONS = Array.from({ length: NOTE_RANGE_COUNT }, (_, i) => {
  const midi = MIDI_C2 + i;
  return {
    midi,
    octave: Math.floor(midi / MIDI_NOTES_PER_OCTAVE) - MIDI_OCTAVE_OFFSET,
    noteIndex: midi % MIDI_NOTES_PER_OCTAVE,
  };
});

/**
 * Beat indicator component - only re-renders on beat changes.
 */
const MetronomeBeatIndicator = memo(function MetronomeBeatIndicator() {
  const beat = useMetronomeBeat();
  return (
    <div className="flex gap-1">
      {Array.from({ length: METRONOME_BEATS_PER_MEASURE }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            beat === i ? "bg-green-500" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
});

/**
 * BPM input modal for precise BPM entry with decimal support.
 */
type BpmInputModalProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly currentBpm: number;
  readonly onBpmChange: (bpm: number) => void;
};

// BPM adjustment steps
const BPM_STEPS = [100, 10, 1, 0.1, 0.01] as const;

const BpmInputModal = memo(function BpmInputModal({
  open,
  onClose,
  currentBpm,
  onBpmChange,
}: BpmInputModalProps) {
  const [inputValue, setInputValue] = useState(() => currentBpm.toString());

  // Reset input value when modal opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setInputValue(currentBpm.toString());
      } else {
        onClose();
      }
    },
    [currentBpm, onClose],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    [],
  );

  const handleAdjust = useCallback(
    (delta: number) => {
      const current = parseFloat(inputValue);
      if (Number.isNaN(current)) return;

      const newValue = Math.max(BPM_MIN, Math.min(BPM_MAX, current + delta));
      // Round to avoid floating point errors
      const rounded =
        Math.abs(delta) < 1
          ? Math.round(newValue * 100) / 100
          : Math.round(newValue * 10) / 10;
      setInputValue(rounded.toString());
    },
    [inputValue],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const parsed = parseFloat(inputValue);
      if (!Number.isNaN(parsed) && parsed >= BPM_MIN && parsed <= BPM_MAX) {
        onBpmChange(parsed);
        onClose();
      }
    },
    [inputValue, onBpmChange, onClose],
  );

  const isValid = useMemo(() => {
    const parsed = parseFloat(inputValue);
    return !Number.isNaN(parsed) && parsed >= BPM_MIN && parsed <= BPM_MAX;
  }, [inputValue]);

  const currentParsed = parseFloat(inputValue);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>BPM設定</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bpm-input">
              BPM ({BPM_MIN}〜{BPM_MAX})
            </Label>
            <Input
              id="bpm-input"
              type="number"
              min={BPM_MIN}
              max={BPM_MAX}
              step="any"
              value={inputValue}
              onChange={handleInputChange}
              className="text-center text-lg"
              autoFocus
            />
          </div>

          {/* Adjustment buttons */}
          <div className="space-y-2">
            {/* Plus buttons */}
            <div className="flex gap-1">
              {BPM_STEPS.map((step) => (
                <Button
                  key={`plus-${step}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleAdjust(step)}
                  disabled={
                    Number.isNaN(currentParsed) ||
                    currentParsed + step > BPM_MAX
                  }
                >
                  +{step}
                </Button>
              ))}
            </div>
            {/* Minus buttons */}
            <div className="flex gap-1">
              {BPM_STEPS.map((step) => (
                <Button
                  key={`minus-${step}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleAdjust(-step)}
                  disabled={
                    Number.isNaN(currentParsed) ||
                    currentParsed - step < BPM_MIN
                  }
                >
                  -{step}
                </Button>
              ))}
            </div>
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
      </DialogContent>
    </Dialog>
  );
});

/**
 * BPM presets settings modal for customizing preset values.
 * Fixed number of presets (6), only values can be changed.
 */
type BpmPresetsSettingsModalProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly presets: readonly number[];
  readonly onPresetsChange: (presets: readonly number[]) => void;
};

const BpmPresetsSettingsModal = memo(function BpmPresetsSettingsModal({
  open,
  onClose,
  presets,
  onPresetsChange,
}: BpmPresetsSettingsModalProps) {
  const [editingValues, setEditingValues] = useState<readonly string[]>([]);

  // Reset editing state when modal opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setEditingValues(presets.map(String));
      } else {
        onClose();
      }
    },
    [presets, onClose],
  );

  const handleValueChange = useCallback((index: number, value: string) => {
    setEditingValues((current) => {
      const newValues = [...current];
      newValues[index] = value;
      return newValues;
    });
  }, []);

  const handleResetToDefault = useCallback(() => {
    setEditingValues(BPM_PRESETS_DEFAULT.map(String));
  }, []);

  const handleSave = useCallback(() => {
    const parsedPresets = editingValues
      .map((v) => {
        const parsed = parseFloat(v);
        if (Number.isNaN(parsed)) return BPM_DEFAULT;
        // Clamp to valid range and round
        const clamped = Math.max(BPM_MIN, Math.min(BPM_MAX, parsed));
        return Math.round(clamped * 100) / 100;
      })
      .sort((a, b) => a - b);
    onPresetsChange(parsedPresets);
    onClose();
  }, [editingValues, onPresetsChange, onClose]);

  // Check if all values are valid
  const allValid = useMemo(() => {
    return editingValues.every((v) => {
      const parsed = parseFloat(v);
      return !Number.isNaN(parsed) && parsed >= BPM_MIN && parsed <= BPM_MAX;
    });
  }, [editingValues]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>BPMプリセット設定</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Preset inputs */}
          <div className="space-y-2">
            <Label>
              プリセット値 ({BPM_MIN}〜{BPM_MAX})
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {editingValues.map((value, index) => (
                <Input
                  key={index}
                  type="number"
                  min={BPM_MIN}
                  max={BPM_MAX}
                  step="any"
                  value={value}
                  onChange={(e) => handleValueChange(index, e.target.value)}
                  className="text-center font-mono"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              保存時に自動でソートされます
            </p>
          </div>

          {/* Actions */}
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
            <Button
              type="button"
              className="flex-1"
              onClick={handleSave}
              disabled={!allValid}
            >
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

/**
 * BPM preset buttons component.
 */
type BpmPresetButtonsProps = {
  readonly presets: readonly number[];
  readonly currentBpm: number;
  readonly onBpmSelect: (bpm: number) => void;
  readonly onSettingsClick: () => void;
};

const BpmPresetButtons = memo(function BpmPresetButtons({
  presets,
  currentBpm,
  onBpmSelect,
  onSettingsClick,
}: BpmPresetButtonsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {presets.map((preset, index) => (
        <Button
          key={index}
          variant={preset === currentBpm ? "default" : "outline"}
          size="sm"
          className="h-7 px-2 text-xs font-mono"
          onClick={() => onBpmSelect(preset)}
        >
          {Number.isInteger(preset) ? preset : preset.toFixed(1)}
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

export const AudioToolsPanel = memo(function AudioToolsPanel({
  notation,
  accidental,
  advancedSettings,
}: AudioToolsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMidi, setSelectedMidi] = useState(MIDI_A4);
  const [isBpmModalOpen, setIsBpmModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);

  // Get BPM presets from settings
  const { state: settings, update: updateSettings } = useSettings();

  const tuningOptions: TuningOptions = useMemo(
    () => ({
      referenceFrequency: advancedSettings.referenceFrequency,
      temperament: advancedSettings.temperament,
      transposition: advancedSettings.transposition,
    }),
    [advancedSettings],
  );

  const referenceFrequency = useMemo(
    () => midiToFrequency(selectedMidi, tuningOptions),
    [selectedMidi, tuningOptions],
  );

  const referenceSound = useReferenceSound(
    referenceFrequency,
    "sine",
    VOLUME_DEFAULT_REFERENCE,
  );
  const metronome = useMetronomeControl();

  // Update oscillator frequency when note or tuning changes
  const handleNoteChange = useCallback(
    (midiStr: string) => {
      const midi = parseInt(midiStr, 10);
      setSelectedMidi(midi);
      const freq = midiToFrequency(midi, tuningOptions);
      referenceSound.setFrequency(freq);
    },
    [referenceSound, tuningOptions],
  );

  const handleWaveformChange = useCallback(
    (waveform: WaveformType) => {
      referenceSound.setWaveform(waveform);
    },
    [referenceSound],
  );

  const handleReferenceVolumeChange = useCallback(
    (values: readonly number[]) => {
      const vol = values[0];
      if (vol !== undefined) {
        referenceSound.setVolume(vol);
      }
    },
    [referenceSound],
  );

  const handleMetronomeVolumeChange = useCallback(
    (values: readonly number[]) => {
      const vol = values[0];
      if (vol !== undefined) {
        metronome.setVolume(vol);
      }
    },
    [metronome],
  );

  const handleBpmChange = useCallback(
    (values: readonly number[]) => {
      const bpm = values[0];
      if (bpm !== undefined) {
        metronome.setBpm(bpm);
      }
    },
    [metronome],
  );

  const resetReferenceVolume = useCallback(() => {
    referenceSound.setVolume(VOLUME_DEFAULT_REFERENCE);
  }, [referenceSound]);

  const resetMetronomeVolume = useCallback(() => {
    metronome.setVolume(VOLUME_DEFAULT_METRONOME);
  }, [metronome]);

  const resetBpm = useCallback(() => {
    metronome.setBpm(BPM_DEFAULT);
  }, [metronome]);

  const handlePresetsChange = useCallback(
    (presets: readonly number[]) => {
      updateSettings((draft) => {
        draft.bpmPresets = [...presets];
      });
    },
    [updateSettings],
  );

  const noteNames = useMemo(
    () => getNoteNames(notation, accidental),
    [notation, accidental],
  );

  const getNoteLabel = useCallback(
    (midi: number) => {
      const noteIndex = midi % MIDI_NOTES_PER_OCTAVE;
      const octave =
        Math.floor(midi / MIDI_NOTES_PER_OCTAVE) - MIDI_OCTAVE_OFFSET;
      return `${noteNames[noteIndex]}${octave}`;
    },
    [noteNames],
  );

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Header with toggle */}
        <button
          type="button"
          className="w-full flex items-center justify-between text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <span className="font-medium">音声ツール</span>
            {(referenceSound.isPlaying || metronome.isPlaying) && (
              <span className="text-xs text-green-500">(再生中)</span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-6">
            {/* Reference Sound Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">リファレンス音</Label>
                <Button
                  variant={referenceSound.isPlaying ? "destructive" : "default"}
                  size="sm"
                  onClick={referenceSound.toggle}
                >
                  {referenceSound.isPlaying ? (
                    <>
                      <Square className="h-3 w-3 mr-1" />
                      停止
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      再生
                    </>
                  )}
                </Button>
              </div>

              {/* Note Selection */}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-12">音程</Label>
                <Select
                  value={selectedMidi.toString()}
                  onValueChange={handleNoteChange}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {NOTE_OPTIONS.map(({ midi }) => (
                      <SelectItem key={midi} value={midi.toString()}>
                        {getNoteLabel(midi)} (
                        {midiToFrequency(midi, tuningOptions).toFixed(1)} Hz)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Waveform Selection */}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-12">波形</Label>
                <Select
                  value={referenceSound.waveform}
                  onValueChange={(value) =>
                    handleWaveformChange(value as WaveformType)
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(WAVEFORM_LABELS) as readonly (readonly [
                        WaveformType,
                        string,
                      ])[]
                    ).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-12">音量</Label>
                <Slider
                  value={[referenceSound.volume]}
                  onValueChange={handleReferenceVolumeChange}
                  min={VOLUME_MIN}
                  max={VOLUME_MAX}
                  step={VOLUME_STEP}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-10 text-right">
                  {Math.round(referenceSound.volume * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetReferenceVolume}
                  className="h-6 w-6 p-0"
                  disabled={referenceSound.volume === VOLUME_DEFAULT_REFERENCE}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Metronome Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">メトロノーム</Label>
                  {metronome.isPlaying && <MetronomeBeatIndicator />}
                </div>
                <Button
                  variant={metronome.isPlaying ? "destructive" : "default"}
                  size="sm"
                  onClick={metronome.toggle}
                >
                  {metronome.isPlaying ? (
                    <>
                      <Square className="h-3 w-3 mr-1" />
                      停止
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      開始
                    </>
                  )}
                </Button>
              </div>

              {/* BPM */}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-12">BPM</Label>
                <Slider
                  value={[metronome.bpm]}
                  onValueChange={handleBpmChange}
                  min={BPM_MIN}
                  max={BPM_SLIDER_MAX}
                  step={1}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBpmModalOpen(true)}
                  className="h-6 w-12 px-1 text-xs font-mono"
                >
                  {Number.isInteger(metronome.bpm)
                    ? metronome.bpm
                    : metronome.bpm.toFixed(1)}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetBpm}
                  className="h-6 w-6 p-0"
                  disabled={metronome.bpm === BPM_DEFAULT}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>

              {/* BPM Input Modal */}
              <BpmInputModal
                open={isBpmModalOpen}
                onClose={() => setIsBpmModalOpen(false)}
                currentBpm={metronome.bpm}
                onBpmChange={metronome.setBpm}
              />

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-12">音量</Label>
                <Slider
                  value={[metronome.volume]}
                  onValueChange={handleMetronomeVolumeChange}
                  min={VOLUME_MIN}
                  max={VOLUME_MAX}
                  step={VOLUME_STEP}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-10 text-right">
                  {Math.round(metronome.volume * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetMetronomeVolume}
                  className="h-6 w-6 p-0"
                  disabled={metronome.volume === VOLUME_DEFAULT_METRONOME}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>

              {/* BPM Presets */}
              <BpmPresetButtons
                presets={settings.bpmPresets}
                currentBpm={metronome.bpm}
                onBpmSelect={metronome.setBpm}
                onSettingsClick={() => setIsPresetsModalOpen(true)}
              />

              {/* BPM Presets Settings Modal */}
              <BpmPresetsSettingsModal
                open={isPresetsModalOpen}
                onClose={() => setIsPresetsModalOpen(false)}
                presets={settings.bpmPresets}
                onPresetsChange={handlePresetsChange}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
