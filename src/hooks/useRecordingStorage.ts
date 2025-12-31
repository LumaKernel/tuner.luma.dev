import { useState, useCallback, useRef } from "react";
import { get, set, del } from "idb-keyval";
import type { Recording, RecordingMeta } from "@/types";

const LIST_KEY = "recording-list";

// Get file extension from MIME type
function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("wav")) return "wav";
  return "audio";
}

type RecordingStorageResult = {
  readonly recordings: readonly RecordingMeta[];
  readonly isLoading: boolean;
  readonly refresh: () => Promise<void>;
  readonly loadRecording: (id: string) => Promise<Recording | null>;
  readonly deleteRecording: (id: string) => Promise<void>;
  readonly downloadRecording: (id: string) => Promise<void>;
  readonly playRecording: (id: string) => Promise<void>;
  readonly stopPlayback: () => void;
  readonly playingId: string | null;
};

export function useRecordingStorage(): RecordingStorageResult {
  const [recordings, setRecordings] = useState<readonly RecordingMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const cleanupPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const cleanupExpired = useCallback(async () => {
    const now = Date.now();
    const list = (await get<string[]>(LIST_KEY)) ?? [];
    const validIds: string[] = [];
    const expiredIds: string[] = [];

    for (const id of list) {
      const recording = await get<Recording>(`recording-${id}`);
      if (recording && recording.expiresAt > now) {
        validIds.push(id);
      } else {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      await del(`recording-${id}`);
    }

    if (expiredIds.length > 0) {
      await set(LIST_KEY, validIds);
    }

    return validIds;
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const validIds = await cleanupExpired();
      const metas: RecordingMeta[] = [];

      for (const id of validIds) {
        const recording = await get<Recording>(`recording-${id}`);
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

  const loadRecording = useCallback(
    async (id: string): Promise<Recording | null> => {
      try {
        const recording = await get<Recording>(`recording-${id}`);
        return recording ?? null;
      } catch (error) {
        console.error("Failed to load recording:", error);
        return null;
      }
    },
    [],
  );

  const deleteRecording = useCallback(async (id: string): Promise<void> => {
    try {
      await del(`recording-${id}`);

      const list = (await get<string[]>(LIST_KEY)) ?? [];
      const newList = list.filter((item) => item !== id);
      await set(LIST_KEY, newList);

      setRecordings((current) => current.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Failed to delete recording:", error);
    }
  }, []);

  const downloadRecording = useCallback(async (id: string): Promise<void> => {
    try {
      const recording = await get<Recording>(`recording-${id}`);
      if (!recording) return;

      const url = URL.createObjectURL(recording.audioBlob);
      const a = document.createElement("a");
      a.href = url;
      const ext = getExtensionFromMimeType(recording.mimeType);
      a.download = `recording-${new Date(recording.createdAt).toISOString().slice(0, 19).replace(/:/g, "-")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download recording:", error);
    }
  }, []);

  const playRecording = useCallback(
    async (id: string): Promise<void> => {
      try {
        // Stop any current playback
        cleanupPlayback();

        const recording = await get<Recording>(`recording-${id}`);
        if (!recording) return;

        const url = URL.createObjectURL(recording.audioBlob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioElementRef.current = audio;
        setPlayingId(id);

        audio.onended = () => {
          cleanupPlayback();
        };

        audio.onerror = () => {
          console.error("Failed to play recording");
          cleanupPlayback();
        };

        await audio.play();
      } catch (error) {
        console.error("Failed to play recording:", error);
        cleanupPlayback();
      }
    },
    [cleanupPlayback],
  );

  const stopPlayback = useCallback(() => {
    cleanupPlayback();
  }, [cleanupPlayback]);

  return {
    recordings,
    isLoading,
    refresh,
    loadRecording,
    deleteRecording,
    downloadRecording,
    playRecording,
    stopPlayback,
    playingId,
  };
}
