export type Notation = "letter" | "solfege";
export type Accidental = "sharp" | "flat";

// Audio codec options for recording
export type AudioCodec =
  | "audio/webm;codecs=opus"
  | "audio/webm"
  | "audio/ogg;codecs=opus"
  | "audio/mp4"
  | "auto";

export const AUDIO_CODEC_LABELS: Record<AudioCodec, string> = {
  auto: "自動（推奨）",
  "audio/webm;codecs=opus": "WebM (Opus)",
  "audio/webm": "WebM",
  "audio/ogg;codecs=opus": "Ogg (Opus)",
  "audio/mp4": "MP4 (AAC)",
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
  readonly audioCodec: AudioCodec; // 録音コーデック
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
