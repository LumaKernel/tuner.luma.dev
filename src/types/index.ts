export type Notation = "letter" | "solfege";
export type Accidental = "sharp" | "flat";

// Download audio format
// Note: Recording is always saved as WAV internally.
export type AudioFormat = "wav" | "mp3";

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

export type Settings = {
  readonly notation: Notation;
  readonly accidental: Accidental;
  readonly recordingDuration: number; // seconds (30, 60, 120, or custom)
  readonly autoStart: boolean; // 次回から自動で開始する
  readonly audioFormat: AudioFormat; // 保存・ダウンロード形式
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
