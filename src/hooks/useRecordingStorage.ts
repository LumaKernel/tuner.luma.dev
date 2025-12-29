import { useState, useEffect, useCallback } from "react";
import { get, set, del } from "idb-keyval";
import type { Recording, RecordingMeta } from "@/types";

const LIST_KEY = "recording-list";

function createWavBlob(audioData: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioData.length * bytesPerSample;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Audio data
  let offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

interface RecordingStorageResult {
  readonly recordings: readonly RecordingMeta[];
  readonly isLoading: boolean;
  readonly loadRecording: (id: string) => Promise<Recording | null>;
  readonly deleteRecording: (id: string) => Promise<void>;
  readonly downloadRecording: (id: string) => Promise<void>;
  readonly playRecording: (id: string) => Promise<void>;
}

export function useRecordingStorage(): RecordingStorageResult {
  const [recordings, setRecordings] = useState<readonly RecordingMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cleanupExpired = useCallback(async () => {
    const now = Date.now();
    const list = ((await get(LIST_KEY)) as string[] | undefined) ?? [];
    const validIds: string[] = [];
    const expiredIds: string[] = [];

    for (const id of list) {
      const recording = (await get(`recording-${id}`)) as Recording | undefined;
      if (recording && recording.expiresAt > now) {
        validIds.push(id);
      } else {
        expiredIds.push(id);
      }
    }

    // Delete expired recordings
    for (const id of expiredIds) {
      await del(`recording-${id}`);
    }

    if (expiredIds.length > 0) {
      await set(LIST_KEY, validIds);
    }

    return validIds;
  }, []);

  const loadRecordingsList = useCallback(async () => {
    setIsLoading(true);
    try {
      const validIds = await cleanupExpired();
      const metas: RecordingMeta[] = [];

      for (const id of validIds) {
        const recording = (await get(`recording-${id}`)) as
          | Recording
          | undefined;
        if (recording) {
          metas.push({
            id: recording.id,
            createdAt: recording.createdAt,
            expiresAt: recording.expiresAt,
            duration: recording.duration,
          });
        }
      }

      metas.sort((a, b) => b.createdAt - a.createdAt);
      setRecordings(metas);
    } catch (error) {
      console.error("Failed to load recordings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [cleanupExpired]);

  useEffect(() => {
    loadRecordingsList();
  }, [loadRecordingsList]);

  const loadRecording = useCallback(
    async (id: string): Promise<Recording | null> => {
      try {
        const recording = (await get(`recording-${id}`)) as
          | Recording
          | undefined;
        return recording ?? null;
      } catch (error) {
        console.error("Failed to load recording:", error);
        return null;
      }
    },
    []
  );

  const deleteRecording = useCallback(
    async (id: string): Promise<void> => {
      try {
        await del(`recording-${id}`);

        const list = ((await get(LIST_KEY)) as string[] | undefined) ?? [];
        const newList = list.filter((item) => item !== id);
        await set(LIST_KEY, newList);

        await loadRecordingsList();
      } catch (error) {
        console.error("Failed to delete recording:", error);
      }
    },
    [loadRecordingsList]
  );

  const downloadRecording = useCallback(async (id: string): Promise<void> => {
    try {
      const recording = (await get(`recording-${id}`)) as Recording | undefined;
      if (!recording) return;

      const blob = createWavBlob(recording.audioData, recording.sampleRate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recording-${new Date(recording.createdAt).toISOString().slice(0, 19).replace(/:/g, "-")}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download recording:", error);
    }
  }, []);

  const playRecording = useCallback(async (id: string): Promise<void> => {
    try {
      const recording = (await get(`recording-${id}`)) as Recording | undefined;
      if (!recording) return;

      const audioContext = new AudioContext();
      const buffer = audioContext.createBuffer(
        1,
        recording.audioData.length,
        recording.sampleRate
      );
      buffer.getChannelData(0).set(recording.audioData);

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (error) {
      console.error("Failed to play recording:", error);
    }
  }, []);

  return {
    recordings,
    isLoading,
    loadRecording,
    deleteRecording,
    downloadRecording,
    playRecording,
  };
}
