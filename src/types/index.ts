export type Notation = "letter" | "solfege";
export type Accidental = "sharp" | "flat";

export interface PitchData {
  readonly frequency: number | null;
  readonly note: string | null;
  readonly cents: number;
  readonly timestamp: number;
}

export interface PitchHistoryEntry {
  readonly frequency: number;
  readonly timestamp: number;
}

export interface Settings {
  notation: Notation;
  accidental: Accidental;
  movableDo: boolean;
  baseNote: number; // 0-11 (C=0, C#=1, ..., B=11)
}

export interface Recording {
  readonly id: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly duration: number;
  readonly sampleRate: number;
  readonly audioData: Float32Array;
  readonly pitchData: readonly PitchHistoryEntry[];
}

export interface RecordingMeta {
  readonly id: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly duration: number;
}
