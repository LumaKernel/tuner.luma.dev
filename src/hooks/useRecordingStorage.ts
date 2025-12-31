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

// Decode audio blob to AudioBuffer
async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    return await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    await audioContext.close();
  }
}

export function useRecordingStorage(): RecordingStorageResult {
  const [recordings, setRecordings] = useState<readonly RecordingMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  // AudioContext-based playback refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0); // AudioContext time when playback started
  const startOffsetRef = useRef<number>(0); // Offset in seconds when playback started
  const animationFrameRef = useRef<number | null>(null);

  const cleanupPlayback = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Already stopped
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioBufferRef.current = null;
    startTimeRef.current = 0;
    startOffsetRef.current = 0;
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

  // Start playback from a specific offset using AudioBufferSourceNode
  const startPlaybackFromOffset = useCallback(
    (audioBuffer: AudioBuffer, offset: number) => {
      if (!audioContextRef.current) return;

      // Stop existing source if any
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch {
          // Already stopped
        }
        sourceNodeRef.current.disconnect();
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      sourceNodeRef.current = source;

      // Track when playback started
      startTimeRef.current = audioContextRef.current.currentTime;
      startOffsetRef.current = offset;

      source.onended = () => {
        // Only cleanup if playback finished naturally (not stopped/seeked)
        const currentTime =
          startOffsetRef.current +
          ((audioContextRef.current?.currentTime ?? 0) - startTimeRef.current);
        if (currentTime >= audioBuffer.duration - 0.1) {
          cleanupPlayback();
        }
      };

      // Start playback from offset
      source.start(0, offset);

      // Update playback time using requestAnimationFrame
      const updateTime = () => {
        if (!audioContextRef.current || !audioBufferRef.current) return;

        const currentTime =
          startOffsetRef.current +
          (audioContextRef.current.currentTime - startTimeRef.current);
        const clampedTime = Math.min(
          currentTime,
          audioBufferRef.current.duration,
        );
        setPlaybackTime(clampedTime);

        if (clampedTime < audioBufferRef.current.duration) {
          animationFrameRef.current = requestAnimationFrame(updateTime);
        }
      };
      animationFrameRef.current = requestAnimationFrame(updateTime);
    },
    [cleanupPlayback],
  );

  const playRecording = useCallback(
    async (id: string): Promise<void> => {
      try {
        // Stop any current playback
        cleanupPlayback();

        const recording = await get<Recording>(`recording-${id}`);
        if (!recording) return;

        // Decode audio blob to AudioBuffer
        const audioBuffer = await decodeAudioBlob(recording.audioBlob);
        audioBufferRef.current = audioBuffer;

        // Create AudioContext for playback
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        setPlayingId(id);
        setPlaybackDuration(audioBuffer.duration);

        // Start playback from beginning
        startPlaybackFromOffset(audioBuffer, 0);
      } catch (error) {
        console.error("Failed to play recording:", error);
        cleanupPlayback();
      }
    },
    [cleanupPlayback, startPlaybackFromOffset],
  );

  const stopPlayback = useCallback(() => {
    cleanupPlayback();
  }, [cleanupPlayback]);

  const seek = useCallback(
    (time: number) => {
      if (!audioContextRef.current || !audioBufferRef.current) return;

      // Cancel current animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Clamp time to valid range
      const clampedTime = Math.max(
        0,
        Math.min(time, audioBufferRef.current.duration),
      );

      // Restart playback from new position
      startPlaybackFromOffset(audioBufferRef.current, clampedTime);
      setPlaybackTime(clampedTime);
    },
    [startPlaybackFromOffset],
  );

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
