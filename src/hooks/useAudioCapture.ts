import { useSyncExternalStore, useCallback, useRef, useEffect } from "react";
import type { PitchData, PitchHistoryEntry } from "@/types";
import type * as PitchDetectorModule from "@/wasm/pkg/pitch_detector";

// ============================================================================
// Constants
// ============================================================================

const BUFFER_SIZE = 2048;
const HISTORY_DURATION_MS = 30000;
const MIN_FREQUENCY = 60;
const MAX_FREQUENCY = 2000;

// ============================================================================
// Types
// ============================================================================

type StereoAudioData = {
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly mono: Float32Array;
};

type ChannelVolume = {
  readonly rms: number;
  readonly dB: number;
  readonly peak: number;
  readonly peakDb: number;
};

type VolumeLevelData = {
  readonly left: ChannelVolume;
  readonly right: ChannelVolume;
  readonly mono: ChannelVolume;
  readonly isStereo: boolean;
};

type AudioCaptureState = {
  readonly isActive: boolean;
  readonly sampleRate: number;
  readonly stream: MediaStream | null;
  // High-frequency data (updated every frame)
  readonly currentPitch: PitchData;
  readonly pitchHistory: readonly PitchHistoryEntry[];
  readonly pitchTimestamp: number;
  readonly volumeLevel: VolumeLevelData;
};

type AudioResources = {
  readonly audioContext: AudioContext;
  readonly analyser: AnalyserNode;
  readonly leftAnalyser: AnalyserNode;
  readonly rightAnalyser: AnalyserNode;
  readonly stream: MediaStream;
  readonly dataArray: Float32Array<ArrayBuffer>;
  readonly leftDataArray: Float32Array<ArrayBuffer>;
  readonly rightDataArray: Float32Array<ArrayBuffer>;
  animationFrameId: number | null;
};

// ============================================================================
// WASM Module Management
// ============================================================================

let wasmModule: typeof PitchDetectorModule | null = null;
let wasmInitPromise: Promise<void> | null = null;

function ensureWasmInit(): void {
  if (wasmModule || wasmInitPromise) return;

  wasmInitPromise = (async () => {
    try {
      const module: typeof PitchDetectorModule =
        await import("@/wasm/pkg/pitch_detector");
      await module.default();
      module.init_panic_hook();
      wasmModule = module;
      console.log("WASM pitch detector initialized");
    } catch (error) {
      console.warn("Failed to load WASM, using JavaScript fallback:", error);
    }
  })();
}

// Trigger WASM init immediately when module loads
ensureWasmInit();

// ============================================================================
// Pitch Detection (JS Fallback)
// ============================================================================

function detectPitchJS(buffer: Float32Array, sampleRate: number): number {
  const threshold = 0.1;
  const bufferSize = buffer.length;
  const halfBufferSize = Math.floor(bufferSize / 2);

  const difference = new Float32Array(halfBufferSize);
  for (let tau = 0; tau < halfBufferSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfBufferSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    difference[tau] = sum;
  }

  const cmndf = new Float32Array(halfBufferSize);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfBufferSize; tau++) {
    runningSum += difference[tau];
    cmndf[tau] = (difference[tau] * tau) / runningSum;
  }

  let tauEstimate = -1;
  for (let tau = 2; tau < halfBufferSize; tau++) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 < halfBufferSize && cmndf[tau + 1] < cmndf[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) {
    return -1;
  }

  let betterTau: number;
  const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1;
  const x2 = tauEstimate + 1 < halfBufferSize ? tauEstimate + 1 : tauEstimate;

  if (x0 === tauEstimate) {
    betterTau = cmndf[tauEstimate] <= cmndf[x2] ? tauEstimate : x2;
  } else if (x2 === tauEstimate) {
    betterTau = cmndf[tauEstimate] <= cmndf[x0] ? tauEstimate : x0;
  } else {
    const s0 = cmndf[x0];
    const s1 = cmndf[tauEstimate];
    const s2 = cmndf[x2];
    betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }

  const frequency = sampleRate / betterTau;

  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) {
    return -1;
  }

  return frequency;
}

function detectPitch(buffer: Float32Array, sampleRate: number): number {
  if (wasmModule) {
    return wasmModule.detect_pitch(buffer, sampleRate);
  }
  return detectPitchJS(buffer, sampleRate);
}

function getRMS(buffer: Float32Array): number {
  if (wasmModule) {
    return wasmModule.calculate_rms(buffer);
  }
  let sum = 0;
  for (const value of buffer) {
    sum += value * value;
  }
  return Math.sqrt(sum / buffer.length);
}

// ============================================================================
// Volume Level Calculation
// ============================================================================

function calculateChannelVolume(data: Float32Array): ChannelVolume {
  let sum = 0;
  let peak = 0;
  for (const value of data) {
    sum += value * value;
    const abs = Math.abs(value);
    if (abs > peak) peak = abs;
  }
  const rms = Math.sqrt(sum / data.length);
  const dB = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
  return { rms, dB, peak, peakDb };
}

function calculateVolumeLevel(stereoData: StereoAudioData): VolumeLevelData {
  const left = calculateChannelVolume(stereoData.left);
  const right = calculateChannelVolume(stereoData.right);
  const mono = calculateChannelVolume(stereoData.mono);

  // Check if actually stereo by comparing samples
  let isStereo = false;
  const checkSamples = Math.min(100, stereoData.left.length);
  for (let i = 0; i < checkSamples; i += 10) {
    if (Math.abs(stereoData.left[i] - stereoData.right[i]) > 0.001) {
      isStereo = true;
      break;
    }
  }

  return { left, right, mono, isStereo };
}

const DEFAULT_VOLUME: VolumeLevelData = {
  left: { rms: 0, dB: -Infinity, peak: 0, peakDb: -Infinity },
  right: { rms: 0, dB: -Infinity, peak: 0, peakDb: -Infinity },
  mono: { rms: 0, dB: -Infinity, peak: 0, peakDb: -Infinity },
  isStereo: false,
};

// ============================================================================
// Store Implementation
// ============================================================================

const DEFAULT_PITCH: PitchData = {
  frequency: null,
  note: null,
  cents: 0,
  timestamp: Date.now(),
};

const createInitialState = (): AudioCaptureState => ({
  isActive: false,
  sampleRate: 44100,
  stream: null,
  currentPitch: DEFAULT_PITCH,
  pitchHistory: [],
  pitchTimestamp: Date.now(),
  volumeLevel: DEFAULT_VOLUME,
});

// Store instance (singleton)
let state: AudioCaptureState = createInitialState();
let resources: AudioResources | null = null;
let pitchHistory: PitchHistoryEntry[] = [];
let noiseGateThreshold = 0.01;

// Listener management - separate listeners for different data
type ListenerSet = Set<() => void>;
const isActiveListeners: ListenerSet = new Set();
const pitchListeners: ListenerSet = new Set();
const volumeListeners: ListenerSet = new Set();
const streamListeners: ListenerSet = new Set();

function notifyListeners(listeners: ListenerSet): void {
  listeners.forEach((listener) => listener());
}

function updateState(partial: Partial<AudioCaptureState>): void {
  const prev = state;
  state = { ...state, ...partial };

  // Notify only relevant listeners
  if (partial.isActive !== undefined && partial.isActive !== prev.isActive) {
    notifyListeners(isActiveListeners);
  }
  if (
    partial.currentPitch !== undefined ||
    partial.pitchHistory !== undefined ||
    partial.pitchTimestamp !== undefined
  ) {
    notifyListeners(pitchListeners);
  }
  if (partial.volumeLevel !== undefined) {
    notifyListeners(volumeListeners);
  }
  if (partial.stream !== undefined) {
    notifyListeners(streamListeners);
  }
}

// ============================================================================
// Audio Processing Loop
// ============================================================================

function processAudio(): void {
  if (!resources) return;

  const now = Date.now();

  // Get mono data for pitch detection
  resources.analyser.getFloatTimeDomainData(resources.dataArray);

  // Get stereo data for volume display
  resources.leftAnalyser.getFloatTimeDomainData(resources.leftDataArray);
  resources.rightAnalyser.getFloatTimeDomainData(resources.rightDataArray);

  // Create copies for processing
  const monoData = new Float32Array(resources.dataArray.length);
  monoData.set(resources.dataArray);

  const leftData = new Float32Array(resources.leftDataArray.length);
  leftData.set(resources.leftDataArray);

  const rightData = new Float32Array(resources.rightDataArray.length);
  rightData.set(resources.rightDataArray);

  // Process pitch
  const rms = getRMS(monoData);
  if (rms >= noiseGateThreshold) {
    const frequency = detectPitch(monoData, state.sampleRate);
    if (frequency > 0) {
      pitchHistory = [...pitchHistory, { frequency, timestamp: now }];
    }
  }

  // Filter old entries
  const cutoff = now - HISTORY_DURATION_MS;
  pitchHistory = pitchHistory.filter((entry) => entry.timestamp > cutoff);

  // Derive current pitch
  const lastEntry = pitchHistory[pitchHistory.length - 1];
  const currentPitch: PitchData =
    lastEntry && now - lastEntry.timestamp < 200
      ? {
          frequency: lastEntry.frequency,
          note: null,
          cents: 0,
          timestamp: lastEntry.timestamp,
        }
      : {
          frequency: null,
          note: null,
          cents: 0,
          timestamp: now,
        };

  // Calculate volume
  const volumeLevel = calculateVolumeLevel({
    left: leftData,
    right: rightData,
    mono: monoData,
  });

  // Update state (this will notify listeners)
  updateState({
    currentPitch,
    pitchHistory: [...pitchHistory],
    pitchTimestamp: now,
    volumeLevel,
  });

  resources.animationFrameId = requestAnimationFrame(processAudio);
}

// ============================================================================
// Public API
// ============================================================================

async function startAudio(deviceId?: string): Promise<void> {
  // Stop any existing audio first
  stopAudio();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 2,
    },
  });

  const audioContext = new AudioContext();

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = BUFFER_SIZE;
  analyser.smoothingTimeConstant = 0;

  const leftAnalyser = audioContext.createAnalyser();
  leftAnalyser.fftSize = BUFFER_SIZE;
  leftAnalyser.smoothingTimeConstant = 0.3;

  const rightAnalyser = audioContext.createAnalyser();
  rightAnalyser.fftSize = BUFFER_SIZE;
  rightAnalyser.smoothingTimeConstant = 0.3;

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  const channelSplitter = audioContext.createChannelSplitter(2);
  source.connect(channelSplitter);
  channelSplitter.connect(leftAnalyser, 0);
  channelSplitter.connect(rightAnalyser, 1);

  resources = {
    audioContext,
    analyser,
    leftAnalyser,
    rightAnalyser,
    stream,
    dataArray: new Float32Array(analyser.fftSize),
    leftDataArray: new Float32Array(leftAnalyser.fftSize),
    rightDataArray: new Float32Array(rightAnalyser.fftSize),
    animationFrameId: null,
  };

  // Reset pitch history
  pitchHistory = [];

  updateState({
    isActive: true,
    sampleRate: audioContext.sampleRate,
    stream,
    currentPitch: DEFAULT_PITCH,
    pitchHistory: [],
    pitchTimestamp: Date.now(),
    volumeLevel: DEFAULT_VOLUME,
  });

  processAudio();
}

function stopAudio(): void {
  if (!resources) return;

  if (resources.animationFrameId !== null) {
    cancelAnimationFrame(resources.animationFrameId);
  }

  resources.stream.getTracks().forEach((track) => track.stop());
  void resources.audioContext.close();

  resources = null;
  pitchHistory = [];

  updateState({
    isActive: false,
    stream: null,
    currentPitch: DEFAULT_PITCH,
    pitchHistory: [],
    pitchTimestamp: Date.now(),
    volumeLevel: DEFAULT_VOLUME,
  });
}

function setNoiseGateThreshold(threshold: number): void {
  noiseGateThreshold = threshold;
}

// ============================================================================
// Subscription Functions
// ============================================================================

function subscribeIsActive(listener: () => void): () => void {
  isActiveListeners.add(listener);
  return () => isActiveListeners.delete(listener);
}

function subscribePitch(listener: () => void): () => void {
  pitchListeners.add(listener);
  return () => pitchListeners.delete(listener);
}

function subscribeVolume(listener: () => void): () => void {
  volumeListeners.add(listener);
  return () => volumeListeners.delete(listener);
}

function subscribeStream(listener: () => void): () => void {
  streamListeners.add(listener);
  return () => streamListeners.delete(listener);
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to subscribe to isActive state only.
 * Only re-renders when isActive changes.
 */
export function useIsActive(): boolean {
  return useSyncExternalStore(
    subscribeIsActive,
    () => state.isActive,
    () => false,
  );
}

/**
 * Hook to subscribe to pitch data only.
 * Re-renders every frame when active.
 */
export function usePitchData(): {
  readonly currentPitch: PitchData;
  readonly pitchHistory: readonly PitchHistoryEntry[];
  readonly timestamp: number;
} {
  return useSyncExternalStore(
    subscribePitch,
    () => ({
      currentPitch: state.currentPitch,
      pitchHistory: state.pitchHistory,
      timestamp: state.pitchTimestamp,
    }),
    () => ({
      currentPitch: DEFAULT_PITCH,
      pitchHistory: [],
      timestamp: Date.now(),
    }),
  );
}

/**
 * Hook to subscribe to volume data only.
 * Re-renders every frame when active.
 */
export function useVolumeLevelData(): VolumeLevelData {
  return useSyncExternalStore(
    subscribeVolume,
    () => state.volumeLevel,
    () => DEFAULT_VOLUME,
  );
}

/**
 * Hook to get stream for recording buffer.
 * Only re-renders when stream changes.
 */
export function useAudioStream(): MediaStream | null {
  return useSyncExternalStore(
    subscribeStream,
    () => state.stream,
    () => null,
  );
}

/**
 * Hook to get audio control functions.
 * Does not cause re-renders.
 */
export function useAudioControls(): {
  readonly startAudio: (deviceId?: string) => Promise<void>;
  readonly stopAudio: () => void;
} {
  return {
    startAudio,
    stopAudio,
  };
}

/**
 * Hook to set noise gate threshold.
 * Should be called when settings change.
 */
export function useNoiseGateEffect(threshold: number): void {
  const thresholdRef = useRef(threshold);

  useEffect(() => {
    if (thresholdRef.current !== threshold) {
      thresholdRef.current = threshold;
      setNoiseGateThreshold(threshold);
    }
  }, [threshold]);

  // Set initial value
  useEffect(() => {
    setNoiseGateThreshold(threshold);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Combined hook for components that need to start audio.
 * Returns isActive and startAudio function.
 */
export function useAudioStart(): {
  readonly isActive: boolean;
  readonly startAudio: (deviceId?: string) => Promise<void>;
} {
  const isActive = useIsActive();
  const startAudioFn = useCallback(
    (deviceId?: string) => startAudio(deviceId),
    [],
  );
  return { isActive, startAudio: startAudioFn };
}
