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
import { useMetronome } from "@/hooks/useMetronome";
import {
  midiToFrequency,
  getNoteNames,
  type TuningOptions,
} from "@/lib/noteUtils";
import type { Notation, Accidental, AdvancedSettings } from "@/types";

type AudioToolsPanelProps = {
  readonly notation: Notation;
  readonly accidental: Accidental;
  readonly advancedSettings: AdvancedSettings;
};

// Generate note options (C2 to C7)
const NOTE_OPTIONS = Array.from({ length: 61 }, (_, i) => {
  const midi = 36 + i; // C2 = 36
  return { midi, octave: Math.floor(midi / 12) - 1, noteIndex: midi % 12 };
});

const DEFAULT_REFERENCE_VOLUME = 0.3;
const DEFAULT_METRONOME_VOLUME = 0.5;
const DEFAULT_BPM = 120;

export const AudioToolsPanel = memo(function AudioToolsPanel({
  notation,
  accidental,
  advancedSettings,
}: AudioToolsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMidi, setSelectedMidi] = useState(69); // A4

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
    DEFAULT_REFERENCE_VOLUME,
  );
  const metronome = useMetronome(DEFAULT_BPM, DEFAULT_METRONOME_VOLUME);

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
    referenceSound.setVolume(DEFAULT_REFERENCE_VOLUME);
  }, [referenceSound]);

  const resetMetronomeVolume = useCallback(() => {
    metronome.setVolume(DEFAULT_METRONOME_VOLUME);
  }, [metronome]);

  const resetBpm = useCallback(() => {
    metronome.setBpm(DEFAULT_BPM);
  }, [metronome]);

  const noteNames = useMemo(
    () => getNoteNames(notation, accidental),
    [notation, accidental],
  );

  const getNoteLabel = useCallback(
    (midi: number) => {
      const noteIndex = midi % 12;
      const octave = Math.floor(midi / 12) - 1;
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
                  min={0}
                  max={1}
                  step={0.01}
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
                  disabled={referenceSound.volume === DEFAULT_REFERENCE_VOLUME}
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
                  {metronome.isPlaying && (
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            metronome.beat === i ? "bg-green-500" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  )}
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
                  min={20}
                  max={300}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-10 text-right">
                  {metronome.bpm}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetBpm}
                  className="h-6 w-6 p-0"
                  disabled={metronome.bpm === DEFAULT_BPM}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-12">音量</Label>
                <Slider
                  value={[metronome.volume]}
                  onValueChange={handleMetronomeVolumeChange}
                  min={0}
                  max={1}
                  step={0.01}
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
                  disabled={metronome.volume === DEFAULT_METRONOME_VOLUME}
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
