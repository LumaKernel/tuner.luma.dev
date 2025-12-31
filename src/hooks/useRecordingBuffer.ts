import { useRef, useCallback, useEffect } from "react";
import { get, set } from "idb-keyval";
import type { Recording, PitchHistoryEntry, AudioCodec } from "@/types";

const EXPIRATION_DAYS = 7;
const CHUNK_INTERVAL_MS = 1000; // Request data every 1 second

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Priority order for auto codec selection
const CODEC_PRIORITY: readonly string[] = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

// Get the MIME type based on codec setting
function getMimeType(codec: AudioCodec): string {
  if (codec === "auto") {
    for (const type of CODEC_PRIORITY) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  }
  // Check if the specified codec is supported
  if (MediaRecorder.isTypeSupported(codec)) {
    return codec;
  }
  // Fallback to auto if specified codec is not supported
  for (const type of CODEC_PRIORITY) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

// Get list of supported codecs for UI
export function getSupportedCodecs(): readonly AudioCodec[] {
  const supported: AudioCodec[] = ["auto"];
  const codecs: readonly AudioCodec[] = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const codec of codecs) {
    if (MediaRecorder.isTypeSupported(codec)) {
      supported.push(codec);
    }
  }
  return supported;
}

type RecordingBufferResult = {
  readonly saveRecording: () => Promise<string | null>;
};

export function useRecordingBuffer(
  stream: MediaStream | null,
  bufferDurationSeconds: number,
  audioCodec: AudioCodec = "auto",
): RecordingBufferResult {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkTimestampsRef = useRef<number[]>([]);
  const mimeTypeRef = useRef<string>("");
  const pitchHistoryRef = useRef<readonly PitchHistoryEntry[]>([]);

  // Setup MediaRecorder when stream or codec changes
  useEffect(() => {
    if (!stream) {
      // Cleanup when stream is removed
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      chunksRef.current = [];
      chunkTimestampsRef.current = [];
      return;
    }

    const mimeType = getMimeType(audioCodec);
    if (!mimeType) {
      console.error("No supported audio MIME type found");
      return;
    }
    mimeTypeRef.current = mimeType;

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
        chunkTimestampsRef.current.push(Date.now());

        // Trim old chunks to maintain buffer duration
        const now = Date.now();
        const cutoffTime = now - bufferDurationSeconds * 1000;
        while (
          chunkTimestampsRef.current.length > 0 &&
          chunkTimestampsRef.current[0] < cutoffTime
        ) {
          chunksRef.current.shift();
          chunkTimestampsRef.current.shift();
        }
      }
    };

    recorder.start(CHUNK_INTERVAL_MS);

    return () => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    };
  }, [stream, bufferDurationSeconds, audioCodec]);

  const saveRecording = useCallback(async (): Promise<string | null> => {
    if (chunksRef.current.length === 0) {
      return null;
    }

    // Create a blob from all chunks
    const audioBlob = new Blob(chunksRef.current, {
      type: mimeTypeRef.current,
    });

    const now = Date.now();
    const id = generateId();

    // Calculate duration from timestamps
    const firstTimestamp = chunkTimestampsRef.current[0] ?? now;
    const duration = (now - firstTimestamp) / 1000;

    const recording: Recording = {
      id,
      createdAt: now,
      expiresAt: now + EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
      duration,
      mimeType: mimeTypeRef.current,
      audioBlob,
      pitchData: pitchHistoryRef.current,
    };

    try {
      await set(`recording-${id}`, recording);

      // Update recording list
      const listKey = "recording-list";
      const existingList = await get<string[]>(listKey);
      const list = existingList ?? [];
      list.push(id);
      await set(listKey, list);

      return id;
    } catch (error) {
      console.error("Failed to save recording:", error);
      return null;
    }
  }, []);

  return { saveRecording };
}
