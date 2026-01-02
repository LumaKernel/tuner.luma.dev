import { useState, useCallback, useRef, useEffect } from "react";

type MetronomeState = {
  readonly isPlaying: boolean;
  readonly bpm: number;
  readonly volume: number;
  readonly beat: number; // Current beat (0-based, updates on each tick)
  readonly setBpm: (bpm: number) => void;
  readonly setVolume: (volume: number) => void;
  readonly start: () => void;
  readonly stop: () => void;
  readonly toggle: () => void;
};

type AudioResources = {
  readonly audioContext: AudioContext;
  nextNoteTime: number;
  schedulerTimerId: number | null;
};

// How far ahead to schedule audio (seconds)
const SCHEDULE_AHEAD_TIME = 0.1;
// How often to call the scheduler (milliseconds)
const SCHEDULER_INTERVAL = 25;

export function useMetronome(
  initialBpm = 120,
  initialVolume = 0.5,
): MetronomeState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(initialBpm);
  const [volume, setVolumeState] = useState(initialVolume);
  const [beat, setBeat] = useState(0);

  const resourcesRef = useRef<AudioResources | null>(null);
  const bpmRef = useRef(bpm);
  const volumeRef = useRef(volume);
  const beatRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const playClick = useCallback((audioContext: AudioContext, time: number) => {
    // Create a short click sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // High frequency for distinct click
    oscillator.frequency.setValueAtTime(1000, time);
    oscillator.type = "sine";

    // Very short envelope for click sound
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volumeRef.current, time + 0.001);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    oscillator.start(time);
    oscillator.stop(time + 0.05);
  }, []);

  const scheduler = useCallback(() => {
    const resources = resourcesRef.current;
    if (!resources) return;

    const { audioContext } = resources;
    const secondsPerBeat = 60.0 / bpmRef.current;

    // Schedule all notes that need to be played before the next interval
    while (
      resources.nextNoteTime <
      audioContext.currentTime + SCHEDULE_AHEAD_TIME
    ) {
      playClick(audioContext, resources.nextNoteTime);

      // Update beat counter
      beatRef.current = (beatRef.current + 1) % 4;
      setBeat(beatRef.current);

      // Advance to next beat
      resources.nextNoteTime += secondsPerBeat;
    }
  }, [playClick]);

  const stop = useCallback(() => {
    const resources = resourcesRef.current;
    if (!resources) return;

    if (resources.schedulerTimerId !== null) {
      clearInterval(resources.schedulerTimerId);
    }

    void resources.audioContext.close();
    resourcesRef.current = null;
    beatRef.current = 0;
    setBeat(0);
    setIsPlaying(false);
  }, []);

  const start = useCallback(() => {
    // Stop any existing metronome
    if (resourcesRef.current) {
      if (resourcesRef.current.schedulerTimerId !== null) {
        clearInterval(resourcesRef.current.schedulerTimerId);
      }
      void resourcesRef.current.audioContext.close();
      resourcesRef.current = null;
    }

    const audioContext = new AudioContext();

    const resources: AudioResources = {
      audioContext,
      nextNoteTime: audioContext.currentTime,
      schedulerTimerId: null,
    };

    resourcesRef.current = resources;
    beatRef.current = 0;

    // Start the scheduler
    resources.schedulerTimerId = window.setInterval(
      scheduler,
      SCHEDULER_INTERVAL,
    );

    setIsPlaying(true);
  }, [scheduler]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  const setBpm = useCallback((newBpm: number) => {
    setBpmState(Math.max(20, Math.min(300, newBpm)));
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const resources = resourcesRef.current;
      if (resources) {
        if (resources.schedulerTimerId !== null) {
          clearInterval(resources.schedulerTimerId);
        }
        void resources.audioContext.close();
      }
    };
  }, []);

  return {
    isPlaying,
    bpm,
    volume,
    beat,
    setBpm,
    setVolume,
    start,
    stop,
    toggle,
  };
}
