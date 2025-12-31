export type Notation = "letter" | "solfege";
export type Accidental = "sharp" | "flat";

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
