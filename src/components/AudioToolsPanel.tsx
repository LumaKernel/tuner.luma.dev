import { useState, useCallback, useMemo, memo } from "react";
import {
  Volume2,
  Play,
  Square,
  RotateCcw,
  ChevronDown,
  ChevronUp,
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
import {
  BPM_MIN,
  BPM_MAX,
  BPM_DEFAULT,
  BPM_SLIDER_MAX,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xs">
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

export const AudioToolsPanel = memo(function AudioToolsPanel({
  notation,
  accidental,
  advancedSettings,
}: AudioToolsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMidi, setSelectedMidi] = useState(MIDI_A4);
  const [isBpmModalOpen, setIsBpmModalOpen] = useState(false);

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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
