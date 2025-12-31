export type Notation = "letter" | "solfege";
export type Accidental = "sharp" | "flat";

// Unified audio format for both recording and download
export type AudioFormat =
  | "auto" // Browser's best supported format
  | "webm-opus" // audio/webm;codecs=opus
  | "webm" // audio/webm
  | "ogg-opus" // audio/ogg;codecs=opus
  | "mp4" // audio/mp4
  | "wav" // Converted from recording
  | "mp3"; // Converted from recording

export const AUDIO_FORMAT_LABELS: Record<AudioFormat, string> = {
  auto: "自動（ブラウザ推奨形式）",
  "webm-opus": "WebM (Opus)",
  webm: "WebM",
  "ogg-opus": "Ogg (Opus)",
  mp4: "MP4 (AAC)",
  wav: "WAV（無圧縮）",
  mp3: "MP3",
};

// Map AudioFormat to MIME type (for MediaRecorder)
export const AUDIO_FORMAT_MIME_TYPES: Partial<Record<AudioFormat, string>> = {
  "webm-opus": "audio/webm;codecs=opus",
  webm: "audio/webm",
  "ogg-opus": "audio/ogg;codecs=opus",
  mp4: "audio/mp4",
};

// File extensions for each format
export const AUDIO_FORMAT_EXTENSIONS: Record<AudioFormat, string> = {
  auto: "webm",
  "webm-opus": "webm",
  webm: "webm",
  "ogg-opus": "ogg",
  mp4: "m4a",
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
