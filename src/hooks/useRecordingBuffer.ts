import { useRef, useCallback } from "react";
import { get, set } from "idb-keyval";
import type { Recording, PitchHistoryEntry } from "@/types";

const EXPIRATION_DAYS = 7;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface RecordingBufferResult {
  readonly saveRecording: () => Promise<string | null>;
}

export function useRecordingBuffer(
  audioData: Float32Array | null,
  sampleRate: number,
  bufferDurationSeconds: number
): RecordingBufferResult {
  const audioBufferRef = useRef<Float32Array[]>([]);
  const pitchHistoryRef = useRef<PitchHistoryEntry[]>([]);
  const lastProcessedRef = useRef<Float32Array | null>(null);

  const maxSamples = sampleRate * bufferDurationSeconds;

  // Accumulate audio data during render (if new data)
  if (audioData && audioData !== lastProcessedRef.current) {
    lastProcessedRef.current = audioData;
    audioBufferRef.current.push(new Float32Array(audioData));

    // Trim oldest chunks if exceeding max
    let totalSamples = 0;
    for (const chunk of audioBufferRef.current) {
      totalSamples += chunk.length;
    }

    while (totalSamples > maxSamples && audioBufferRef.current.length > 1) {
      const removed = audioBufferRef.current.shift();
      if (removed) {
        totalSamples -= removed.length;
      }
    }
  }

  const saveRecording = useCallback(async (): Promise<string | null> => {
    if (audioBufferRef.current.length === 0) {
      return null;
    }

    // Concatenate all audio chunks
    let totalLength = 0;
    for (const chunk of audioBufferRef.current) {
      totalLength += chunk.length;
    }

    const combinedAudio = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioBufferRef.current) {
      combinedAudio.set(chunk, offset);
      offset += chunk.length;
    }

    const now = Date.now();
    const id = generateId();
    const duration = totalLength / sampleRate;

    const recording: Recording = {
      id,
      createdAt: now,
      expiresAt: now + EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
      duration,
      sampleRate,
      audioData: combinedAudio,
      pitchData: [...pitchHistoryRef.current],
    };

    try {
      await set(`recording-${id}`, recording);

      // Update recording list
      const listKey = "recording-list";
      const existingList = (await get(listKey)) as string[] | undefined;
      const list = existingList ?? [];
      list.push(id);
      await set(listKey, list);

      return id;
    } catch (error) {
      console.error("Failed to save recording:", error);
      return null;
    }
  }, [sampleRate]);

  return { saveRecording };
}
