import { useRef, useEffect, useSyncExternalStore } from "react";

// ============================================================================
// Types
// ============================================================================

type MetronomeControlState = {
  readonly isPlaying: boolean;
  readonly bpm: number;
  readonly volume: number;
};

type AudioResources = {
  readonly audioContext: AudioContext;
  nextNoteTime: number;
  schedulerTimerId: number | null;
};

// ============================================================================
// Constants
// ============================================================================

// How far ahead to schedule audio (seconds)
const SCHEDULE_AHEAD_TIME = 0.1;
// How often to call the scheduler (milliseconds)
const SCHEDULER_INTERVAL = 25;

// ============================================================================
// Store Implementation
// ============================================================================

// Store state
let controlState: MetronomeControlState = {
  isPlaying: false,
  bpm: 120,
  volume: 0.5,
};
let beat = 0;
let resources: AudioResources | null = null;

// Cached snapshots
let controlSnapshot: MetronomeControlState = controlState;

// Listeners
type ListenerSet = Set<() => void>;
const controlListeners: ListenerSet = new Set();
const beatListeners: ListenerSet = new Set();

function notifyListeners(listeners: ListenerSet): void {
  listeners.forEach((listener) => listener());
}

function updateControlState(partial: Partial<MetronomeControlState>): void {
  controlState = { ...controlState, ...partial };
  controlSnapshot = controlState;
  notifyListeners(controlListeners);
}

function updateBeat(newBeat: number): void {
  beat = newBeat;
  notifyListeners(beatListeners);
}

// ============================================================================
// Audio Functions
// ============================================================================

function playClick(audioContext: AudioContext, time: number): void {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(1000, time);
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0, time);
  gainNode.gain.linearRampToValueAtTime(controlState.volume, time + 0.001);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  oscillator.start(time);
  oscillator.stop(time + 0.05);
}

function scheduler(): void {
  if (!resources) return;

  const { audioContext } = resources;
  const secondsPerBeat = 60.0 / controlState.bpm;

  while (
    resources.nextNoteTime <
    audioContext.currentTime + SCHEDULE_AHEAD_TIME
  ) {
    playClick(audioContext, resources.nextNoteTime);

    // Update beat counter
    const newBeat = (beat + 1) % 4;
    updateBeat(newBeat);

    // Advance to next beat
    resources.nextNoteTime += secondsPerBeat;
  }
}

// ============================================================================
// Public API
// ============================================================================

function startMetronome(): void {
  // Stop any existing metronome
  if (resources) {
    if (resources.schedulerTimerId !== null) {
      clearInterval(resources.schedulerTimerId);
    }
    void resources.audioContext.close();
    resources = null;
  }

  const audioContext = new AudioContext();

  resources = {
    audioContext,
    nextNoteTime: audioContext.currentTime,
    schedulerTimerId: null,
  };

  updateBeat(0);

  // Start the scheduler
  resources.schedulerTimerId = window.setInterval(
    scheduler,
    SCHEDULER_INTERVAL,
  );

  updateControlState({ isPlaying: true });
}

function stopMetronome(): void {
  if (!resources) return;

  if (resources.schedulerTimerId !== null) {
    clearInterval(resources.schedulerTimerId);
  }

  void resources.audioContext.close();
  resources = null;
  updateBeat(0);
  updateControlState({ isPlaying: false });
}

function toggleMetronome(): void {
  if (controlState.isPlaying) {
    stopMetronome();
  } else {
    startMetronome();
  }
}

function setBpm(newBpm: number): void {
  updateControlState({ bpm: Math.max(20, Math.min(999, newBpm)) });
}

function setVolume(newVolume: number): void {
  updateControlState({ volume: Math.max(0, Math.min(1, newVolume)) });
}

// ============================================================================
// Subscription Functions
// ============================================================================

function subscribeControl(listener: () => void): () => void {
  controlListeners.add(listener);
  return () => controlListeners.delete(listener);
}

function subscribeBeat(listener: () => void): () => void {
  beatListeners.add(listener);
  return () => beatListeners.delete(listener);
}

// ============================================================================
// React Hooks
// ============================================================================

const DEFAULT_CONTROL_STATE: MetronomeControlState = {
  isPlaying: false,
  bpm: 120,
  volume: 0.5,
};

/**
 * Hook to subscribe to metronome control state (isPlaying, bpm, volume).
 * Only re-renders when these values change.
 */
export function useMetronomeControl(): MetronomeControlState & {
  readonly setBpm: (bpm: number) => void;
  readonly setVolume: (volume: number) => void;
  readonly start: () => void;
  readonly stop: () => void;
  readonly toggle: () => void;
} {
  const state = useSyncExternalStore(
    subscribeControl,
    () => controlSnapshot,
    () => DEFAULT_CONTROL_STATE,
  );

  return {
    ...state,
    setBpm,
    setVolume,
    start: startMetronome,
    stop: stopMetronome,
    toggle: toggleMetronome,
  };
}

/**
 * Hook to subscribe to metronome beat only.
 * Re-renders on every beat when playing.
 */
export function useMetronomeBeat(): number {
  return useSyncExternalStore(
    subscribeBeat,
    () => beat,
    () => 0,
  );
}

/**
 * Combined hook for backward compatibility.
 * Note: This will re-render on every beat, so prefer using
 * useMetronomeControl + useMetronomeBeat separately.
 */
export function useMetronome(
  initialBpm = 120,
  initialVolume = 0.5,
): {
  readonly isPlaying: boolean;
  readonly bpm: number;
  readonly volume: number;
  readonly beat: number;
  readonly setBpm: (bpm: number) => void;
  readonly setVolume: (volume: number) => void;
  readonly start: () => void;
  readonly stop: () => void;
  readonly toggle: () => void;
} {
  const initializedRef = useRef(false);

  // Initialize with provided values on first use
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (controlState.bpm !== initialBpm) {
        setBpm(initialBpm);
      }
      if (controlState.volume !== initialVolume) {
        setVolume(initialVolume);
      }
    }
  }, [initialBpm, initialVolume]);

  const control = useMetronomeControl();
  const currentBeat = useMetronomeBeat();

  // Cleanup on unmount
  const cleanupRef = useRef(false);
  useEffect(() => {
    cleanupRef.current = true;
    return () => {
      if (cleanupRef.current && resources) {
        stopMetronome();
      }
    };
  }, []);

  return {
    ...control,
    beat: currentBeat,
  };
}
