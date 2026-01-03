import { useRef, useEffect, useSyncExternalStore } from "react";
import {
  BPM_MIN,
  BPM_MAX,
  BPM_DEFAULT,
  VOLUME_MIN,
  VOLUME_MAX,
  VOLUME_DEFAULT_METRONOME,
  METRONOME_SCHEDULE_AHEAD_TIME,
  METRONOME_SCHEDULER_INTERVAL,
  METRONOME_CLICK_FREQUENCY,
  METRONOME_CLICK_ATTACK,
  METRONOME_CLICK_DECAY,
  METRONOME_BEATS_PER_MEASURE,
} from "@/constants/audio";

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
// Store Implementation
// ============================================================================

// Store state
let controlState: MetronomeControlState = {
  isPlaying: false,
  bpm: BPM_DEFAULT,
  volume: VOLUME_DEFAULT_METRONOME,
};
let beat = 0;
let resources: AudioResources | null = null;

// Muted state (external control, not part of controlState to avoid unnecessary re-renders)
let mutedState = false;

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
  // Skip audio if muted (but still schedule for timing)
  if (mutedState) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(METRONOME_CLICK_FREQUENCY, time);
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0, time);
  gainNode.gain.linearRampToValueAtTime(
    controlState.volume,
    time + METRONOME_CLICK_ATTACK,
  );
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    time + METRONOME_CLICK_DECAY,
  );

  oscillator.start(time);
  oscillator.stop(time + METRONOME_CLICK_DECAY);
}

function scheduler(): void {
  if (!resources) return;

  const { audioContext } = resources;
  const secondsPerBeat = 60.0 / controlState.bpm;

  while (
    resources.nextNoteTime <
    audioContext.currentTime + METRONOME_SCHEDULE_AHEAD_TIME
  ) {
    playClick(audioContext, resources.nextNoteTime);

    // Update beat counter
    const newBeat = (beat + 1) % METRONOME_BEATS_PER_MEASURE;
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
    METRONOME_SCHEDULER_INTERVAL,
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
  updateControlState({ bpm: Math.max(BPM_MIN, Math.min(BPM_MAX, newBpm)) });
}

function setVolume(newVolume: number): void {
  updateControlState({
    volume: Math.max(VOLUME_MIN, Math.min(VOLUME_MAX, newVolume)),
  });
}

function setMuted(muted: boolean): void {
  mutedState = muted;
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
  bpm: BPM_DEFAULT,
  volume: VOLUME_DEFAULT_METRONOME,
};

/**
 * Hook to subscribe to metronome control state (isPlaying, bpm, volume).
 * Only re-renders when these values change.
 */
export function useMetronomeControl(): MetronomeControlState & {
  readonly setBpm: (bpm: number) => void;
  readonly setVolume: (volume: number) => void;
  readonly setMuted: (muted: boolean) => void;
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
    setMuted,
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
  initialBpm = BPM_DEFAULT,
  initialVolume = VOLUME_DEFAULT_METRONOME,
): {
  readonly isPlaying: boolean;
  readonly bpm: number;
  readonly volume: number;
  readonly beat: number;
  readonly setBpm: (bpm: number) => void;
  readonly setVolume: (volume: number) => void;
  readonly setMuted: (muted: boolean) => void;
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
