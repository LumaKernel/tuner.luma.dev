export type Notation = "letter" | "solfege";
export type Accidental = "sharp" | "flat";

// Download audio format
// Note: Recording is always saved as WAV internally.
export type AudioFormat = "wav" | "mp3";

// Temperament (tuning system)
export type Temperament = "equal" | "just";

// Transposition for wind instruments (semitones offset from concert pitch)
export type Transposition =
  | "C" // Concert pitch (0)
  | "Bb" // B♭ instruments (-2)
  | "Eb" // E♭ instruments (+3)
  | "F" // F instruments (-5)
  | "G" // G instruments (+5)
  | "A"; // A instruments (+3)

export const TRANSPOSITION_SEMITONES: Record<Transposition, number> = {
  C: 0,
  Bb: -2,
  Eb: 3,
  F: -5,
  G: 5,
  A: 3,
};

export const TRANSPOSITION_LABELS: Record<Transposition, string> = {
  C: "C（実音）",
  Bb: "B♭（クラリネット、トランペット等）",
  Eb: "E♭（アルトサックス等）",
  F: "F（ホルン等）",
  G: "G（アルトフルート等）",
  A: "A（クラリネットA管等）",
};

export const TEMPERAMENT_LABELS: Record<Temperament, string> = {
  equal: "平均律",
  just: "純正律（C Major）",
};

export const AUDIO_FORMAT_LABELS: Record<AudioFormat, string> = {
  wav: "WAV（無圧縮）",
  mp3: "MP3",
};

// File extensions for each format
export const AUDIO_FORMAT_EXTENSIONS: Record<AudioFormat, string> = {
  wav: "wav",
  mp3: "mp3",
};

export type PitchData = {
  readonly frequency: number | null;
  readonly note: string | null;
  readonly cents: number;
  readonly timestamp: number;
};

export type PitchHistoryEntry = {
  readonly frequency: number;
  readonly timestamp: number;
};

// Advanced settings with default values
export type AdvancedSettings = {
  readonly referenceFrequency: number; // A4 frequency (default: 440Hz)
  readonly transposition: Transposition; // For wind instruments (default: C)
  readonly centThreshold: number; // ± cents to consider "in tune" (default: 5)
  readonly temperament: Temperament; // Tuning system (default: equal)
  readonly noiseGateThreshold: number; // RMS threshold (default: 0.01, range: 0.001-0.1)
};

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  referenceFrequency: 440,
  transposition: "C",
  centThreshold: 5,
  temperament: "equal",
  noiseGateThreshold: 0.01,
};

export type Settings = {
  readonly notation: Notation;
  readonly accidental: Accidental;
  readonly recordingDuration: number; // seconds (30, 60, 120, or custom)
  readonly autoStart: boolean; // 次回から自動で開始する
  readonly audioFormat: AudioFormat; // 保存・ダウンロード形式
  readonly advanced: AdvancedSettings; // 高度な設定
};

export type Recording = {
  readonly id: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly duration: number;
  readonly mimeType: string;
  readonly audioBlob: Blob;
  readonly pitchData: readonly PitchHistoryEntry[];
};

export type RecordingMeta = {
  readonly id: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly duration: number;
};
