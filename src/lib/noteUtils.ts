import type { Notation, Accidental } from "@/types";

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

const A4_FREQUENCY = 440;
const A4_MIDI = 69;

export function frequencyToMidi(frequency: number): number {
  return 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI;
}

export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

export function frequencyToNoteIndex(frequency: number): number {
  const midi = frequencyToMidi(frequency);
  return Math.round(midi) % 12;
}

export function frequencyToCents(frequency: number): number {
  const midi = frequencyToMidi(frequency);
  const nearestMidi = Math.round(midi);
  return Math.round((midi - nearestMidi) * 100);
}

export function frequencyToOctave(frequency: number): number {
  const midi = frequencyToMidi(frequency);
  return Math.floor(Math.round(midi) / 12) - 1;
}

export function getNoteNames(
  notation: Notation,
  accidental: Accidental
): readonly string[] {
  if (notation === "letter") {
    return accidental === "sharp" ? LETTER_NOTES_SHARP : LETTER_NOTES_FLAT;
  }
  return accidental === "sharp" ? SOLFEGE_NOTES_SHARP : SOLFEGE_NOTES_FLAT;
}

export function frequencyToNoteName(
  frequency: number,
  notation: Notation,
  accidental: Accidental
): string {
  const noteIndex = frequencyToNoteIndex(frequency);
  const notes = getNoteNames(notation, accidental);
  const octave = frequencyToOctave(frequency);

  return `${notes[noteIndex]}${octave}`;
}

export function getNoteNameWithoutOctave(
  frequency: number,
  notation: Notation,
  accidental: Accidental
): string {
  const noteIndex = frequencyToNoteIndex(frequency);
  const notes = getNoteNames(notation, accidental);
  return notes[noteIndex];
}
