import type { Notation, Accidental, Temperament, Transposition } from "@/types";
import { TRANSPOSITION_SEMITONES } from "@/types";

const LETTER_NOTES_SHARP = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
] as const;

const LETTER_NOTES_FLAT = [
  "C",
  "D♭",
  "D",
  "E♭",
  "E",
  "F",
  "G♭",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
] as const;

const SOLFEGE_NOTES_SHARP = [
  "ド",
  "ド♯",
  "レ",
  "レ♯",
  "ミ",
  "ファ",
  "ファ♯",
  "ソ",
  "ソ♯",
  "ラ",
  "ラ♯",
  "シ",
] as const;

const SOLFEGE_NOTES_FLAT = [
  "ド",
  "レ♭",
  "レ",
  "ミ♭",
  "ミ",
  "ファ",
  "ソ♭",
  "ソ",
  "ラ♭",
  "ラ",
  "シ♭",
  "シ",
] as const;

// Just intonation ratios relative to C (C Major scale)
// Each note's ratio from C, used to calculate the just intonation frequency offset
const JUST_INTONATION_CENTS: readonly number[] = [
  0, // C (unison)
  111.73, // C#/Db (16/15 - minor second)
  203.91, // D (9/8 - major second)
  315.64, // D#/Eb (6/5 - minor third)
  386.31, // E (5/4 - major third)
  498.04, // F (4/3 - perfect fourth)
  590.22, // F#/Gb (45/32 - tritone)
  701.96, // G (3/2 - perfect fifth)
  813.69, // G#/Ab (8/5 - minor sixth)
  884.36, // A (5/3 - major sixth)
  1017.6, // A#/Bb (9/5 - minor seventh)
  1088.27, // B (15/8 - major seventh)
];

const DEFAULT_A4_FREQUENCY = 440;
const A4_MIDI = 69;

export type TuningOptions = {
  readonly referenceFrequency?: number;
  readonly temperament?: Temperament;
  readonly transposition?: Transposition;
};

const DEFAULT_TUNING_OPTIONS: Required<TuningOptions> = {
  referenceFrequency: DEFAULT_A4_FREQUENCY,
  temperament: "equal",
  transposition: "C",
};

function getA4Frequency(options?: TuningOptions): number {
  return (
    options?.referenceFrequency ?? DEFAULT_TUNING_OPTIONS.referenceFrequency
  );
}

function getTranspositionOffset(options?: TuningOptions): number {
  const transposition =
    options?.transposition ?? DEFAULT_TUNING_OPTIONS.transposition;
  return TRANSPOSITION_SEMITONES[transposition];
}

export function frequencyToMidi(
  frequency: number,
  options?: TuningOptions,
): number {
  const a4Frequency = getA4Frequency(options);
  return 12 * Math.log2(frequency / a4Frequency) + A4_MIDI;
}

export function midiToFrequency(midi: number, options?: TuningOptions): number {
  const a4Frequency = getA4Frequency(options);
  return a4Frequency * Math.pow(2, (midi - A4_MIDI) / 12);
}

export function frequencyToNoteIndex(
  frequency: number,
  options?: TuningOptions,
): number {
  const midi = frequencyToMidi(frequency, options);
  const transpositionOffset = getTranspositionOffset(options);
  // Apply transposition offset and ensure positive modulo
  return (((Math.round(midi) + transpositionOffset) % 12) + 12) % 12;
}

export function frequencyToCents(
  frequency: number,
  options?: TuningOptions,
): number {
  const midi = frequencyToMidi(frequency, options);
  const nearestMidi = Math.round(midi);
  let cents = Math.round((midi - nearestMidi) * 100);

  // Apply just intonation adjustment if temperament is "just"
  if (options?.temperament === "just") {
    const noteIndex = ((nearestMidi % 12) + 12) % 12;
    const justCentsOffset = JUST_INTONATION_CENTS[noteIndex] ?? 0;
    // Calculate difference from equal temperament (which is noteIndex * 100 cents)
    const equalCents = noteIndex * 100;
    const justAdjustment = justCentsOffset - equalCents;
    cents = Math.round(cents - justAdjustment);
  }

  return cents;
}

export function frequencyToOctave(
  frequency: number,
  options?: TuningOptions,
): number {
  const midi = frequencyToMidi(frequency, options);
  const transpositionOffset = getTranspositionOffset(options);
  const transposedMidi = Math.round(midi) + transpositionOffset;
  return Math.floor(transposedMidi / 12) - 1;
}

export function getNoteNames(
  notation: Notation,
  accidental: Accidental,
): readonly string[] {
  if (notation === "letter") {
    return accidental === "sharp" ? LETTER_NOTES_SHARP : LETTER_NOTES_FLAT;
  }
  return accidental === "sharp" ? SOLFEGE_NOTES_SHARP : SOLFEGE_NOTES_FLAT;
}

export function frequencyToNoteName(
  frequency: number,
  notation: Notation,
  accidental: Accidental,
  options?: TuningOptions,
): string {
  const noteIndex = frequencyToNoteIndex(frequency, options);
  const notes = getNoteNames(notation, accidental);
  const octave = frequencyToOctave(frequency, options);

  return `${notes[noteIndex]}${octave}`;
}

export function getNoteNameWithoutOctave(
  frequency: number,
  notation: Notation,
  accidental: Accidental,
  options?: TuningOptions,
): string {
  const noteIndex = frequencyToNoteIndex(frequency, options);
  const notes = getNoteNames(notation, accidental);
  return notes[noteIndex];
}
