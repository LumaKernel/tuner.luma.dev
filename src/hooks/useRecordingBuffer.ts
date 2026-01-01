import { useRef, useCallback, useEffect } from "react";
import { get, set } from "idb-keyval";
import type { Recording, PitchHistoryEntry, AudioFormat } from "@/types";
import { AUDIO_FORMAT_MIME_TYPES } from "@/types";

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

// Get the best supported MIME type for MediaRecorder
// Note: MediaRecorder only supports native browser formats, not wav/mp3
function getBestMimeType(): string {
  for (const type of CODEC_PRIORITY) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

// Get MIME type for format (for native formats only)
function getMimeTypeForFormat(format: AudioFormat): string | null {
  if (format === "auto" || format === "wav" || format === "mp3") {
    return null; // Use auto-selection
  }
  const mimeType = AUDIO_FORMAT_MIME_TYPES[format];
  if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
    return mimeType;
  }
  return null; // Fallback to auto
}

type RecordingBufferResult = {
  readonly saveRecording: () => Promise<string | null>;
};

export function useRecordingBuffer(
  stream: MediaStream | null,
  bufferDurationSeconds: number,
  _audioFormat: AudioFormat = "auto", // Format preference (used for download, not recording)
): RecordingBufferResult {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkTimestampsRef = useRef<number[]>([]);
  const mimeTypeRef = useRef<string>("");
  const pitchHistoryRef = useRef<readonly PitchHistoryEntry[]>([]);

  // Setup MediaRecorder when stream changes
  // Always use best browser-supported format for recording
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

    // Try to use format-specific MIME type, fallback to best available
    const mimeType = getMimeTypeForFormat(_audioFormat) ?? getBestMimeType();
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
        // IMPORTANT: Keep the first chunk as it contains the container header (webm/ogg/mp4)
        // Without the header, the resulting blob cannot be decoded
        const now = Date.now();
        const cutoffTime = now - bufferDurationSeconds * 1000;
        while (
          chunkTimestampsRef.current.length > 1 && // Keep at least 1 chunk (header)
          chunkTimestampsRef.current[1] < cutoffTime // Check second chunk, not first
        ) {
          // Remove the second chunk, keeping the first (header) intact
          chunksRef.current.splice(1, 1);
          chunkTimestampsRef.current.splice(1, 1);
        }
      }
    };

    recorder.start(CHUNK_INTERVAL_MS);

    return () => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    };
  }, [stream, bufferDurationSeconds, _audioFormat]);

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
