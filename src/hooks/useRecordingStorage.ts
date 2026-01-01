import { useState, useCallback, useRef, useEffect } from "react";
import { get, set, del } from "idb-keyval";
import type { Recording, RecordingMeta, AudioFormat } from "@/types";
import { convertAudioBlob } from "@/utils/audioConverter";

const LIST_KEY = "recording-list";

type RecordingStorageResult = {
  readonly recordings: readonly RecordingMeta[];
  readonly isLoading: boolean;
  readonly isConverting: boolean;
  readonly refresh: () => Promise<void>;
  readonly loadRecording: (id: string) => Promise<Recording | null>;
  readonly deleteRecording: (id: string) => Promise<void>;
  readonly downloadRecording: (
    id: string,
    format?: AudioFormat,
  ) => Promise<void>;
  readonly playRecording: (id: string) => Promise<void>;
  readonly stopPlayback: () => void;
  readonly seek: (time: number) => void;
  readonly playingId: string | null;
  readonly playbackTime: number;
  readonly playbackDuration: number;
};

export function useRecordingStorage(): RecordingStorageResult {
  const [recordings, setRecordings] = useState<readonly RecordingMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  // HTML5 Audio-based playback refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const cleanupPlayback = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlayingId(null);
    setPlaybackTime(0);
    setPlaybackDuration(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPlayback();
    };
  }, [cleanupPlayback]);

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

  const deleteRecording = useCallback(
    async (id: string): Promise<void> => {
      try {
        // Stop playback if deleting the currently playing recording
        if (playingId === id) {
          cleanupPlayback();
        }

        await del(`recording-${id}`);

        const list = (await get<string[]>(LIST_KEY)) ?? [];
        const newList = list.filter((item) => item !== id);
        await set(LIST_KEY, newList);

        setRecordings((current) => current.filter((r) => r.id !== id));
      } catch (error) {
        console.error("Failed to delete recording:", error);
      }
    },
    [playingId, cleanupPlayback],
  );

  const downloadRecording = useCallback(
    async (id: string, format: AudioFormat = "auto"): Promise<void> => {
      try {
        const recording = await get<Recording>(`recording-${id}`);
        if (!recording) return;

        setIsConverting(true);

        const { blob, extension } = await convertAudioBlob(
          recording.audioBlob,
          format,
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recording-${new Date(recording.createdAt).toISOString().slice(0, 19).replace(/:/g, "-")}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to download recording:", error);
      } finally {
        setIsConverting(false);
      }
    },
    [],
  );

  const playRecording = useCallback(
    async (id: string): Promise<void> => {
      try {
        // Stop any current playback
        cleanupPlayback();

        const recording = await get<Recording>(`recording-${id}`);
        if (!recording) return;

        // Create object URL from blob
        const url = URL.createObjectURL(recording.audioBlob);
        objectUrlRef.current = url;

        // Create HTML5 Audio element for playback
        // This is more robust than decodeAudioData for WebM/Opus formats
        const audio = new Audio(url);
        audioRef.current = audio;

        // Wait for metadata to load to get duration
        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => {
            setPlaybackDuration(audio.duration);
            resolve();
          };
          audio.onerror = () => {
            reject(new Error("Failed to load audio"));
          };
        });

        setPlayingId(id);

        // Handle playback end
        audio.onended = () => {
          cleanupPlayback();
        };

        // Start playback
        await audio.play();

        // Update playback time using requestAnimationFrame
        const updateTime = () => {
          if (!audioRef.current) return;

          setPlaybackTime(audioRef.current.currentTime);

          if (!audioRef.current.paused && !audioRef.current.ended) {
            animationFrameRef.current = requestAnimationFrame(updateTime);
          }
        };
        animationFrameRef.current = requestAnimationFrame(updateTime);
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

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;

    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(time, audioRef.current.duration));
    audioRef.current.currentTime = clampedTime;
    setPlaybackTime(clampedTime);
  }, []);

  return {
    recordings,
    isLoading,
    isConverting,
    refresh,
    loadRecording,
    deleteRecording,
    downloadRecording,
    playRecording,
    stopPlayback,
    seek,
    playingId,
    playbackTime,
    playbackDuration,
  };
}
