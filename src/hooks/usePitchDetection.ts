import { useState, useEffect, useRef, useCallback } from "react";
import type { PitchData, PitchHistoryEntry } from "@/types";

const HISTORY_DURATION_MS = 30000;
const MIN_FREQUENCY = 60;
const MAX_FREQUENCY = 2000;

// WASM module state
let wasmModule: typeof import("@/wasm/pkg/pitch_detector") | null = null;
let wasmInitPromise: Promise<void> | null = null;

async function initWasm(): Promise<void> {
  if (wasmModule) return;
  if (wasmInitPromise) return wasmInitPromise;

  wasmInitPromise = (async () => {
    try {
      const module = await import("@/wasm/pkg/pitch_detector");
      await module.default();
      module.init_panic_hook();
      wasmModule = module;
      console.log("WASM pitch detector initialized");
    } catch (error) {
      console.warn("Failed to load WASM, using JavaScript fallback:", error);
    }
  })();

  return wasmInitPromise;
}

// JavaScript fallback: YIN algorithm implementation
function detectPitchJS(buffer: Float32Array, sampleRate: number): number {
  const threshold = 0.1;
  const bufferSize = buffer.length;
  const halfBufferSize = Math.floor(bufferSize / 2);

  // Step 1: Calculate difference function
  const difference = new Float32Array(halfBufferSize);
  for (let tau = 0; tau < halfBufferSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfBufferSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    difference[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference function
  const cmndf = new Float32Array(halfBufferSize);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfBufferSize; tau++) {
    runningSum += difference[tau];
    cmndf[tau] = (difference[tau] * tau) / runningSum;
  }

  // Step 3: Absolute threshold
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

  // Step 4: Parabolic interpolation
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
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

interface PitchDetectionResult {
  readonly currentPitch: PitchData;
  readonly pitchHistory: readonly PitchHistoryEntry[];
}

export function usePitchDetection(
  audioData: Float32Array | null,
  sampleRate: number
): PitchDetectionResult {
  const [currentPitch, setCurrentPitch] = useState<PitchData>({
    frequency: null,
    note: null,
    cents: 0,
    timestamp: Date.now(),
  });

  const [pitchHistory, setPitchHistory] = useState<readonly PitchHistoryEntry[]>(
    []
  );

  const historyRef = useRef<PitchHistoryEntry[]>([]);

  // Initialize WASM on mount
  useEffect(() => {
    initWasm();
  }, []);

  const cleanupHistory = useCallback(() => {
    const now = Date.now();
    const cutoff = now - HISTORY_DURATION_MS;
    historyRef.current = historyRef.current.filter(
      (entry) => entry.timestamp > cutoff
    );
    setPitchHistory([...historyRef.current]);
  }, []);

  useEffect(() => {
    if (!audioData || audioData.length === 0) {
      return;
    }

    const rms = getRMS(audioData);
    if (rms < 0.01) {
      setCurrentPitch({
        frequency: null,
        note: null,
        cents: 0,
        timestamp: Date.now(),
      });
      return;
    }

    const frequency = detectPitch(audioData, sampleRate);
    const now = Date.now();

    if (frequency > 0) {
      const entry: PitchHistoryEntry = {
        frequency,
        timestamp: now,
      };

      historyRef.current.push(entry);
      cleanupHistory();

      setCurrentPitch({
        frequency,
        note: null,
        cents: 0,
        timestamp: now,
      });
    } else {
      setCurrentPitch({
        frequency: null,
        note: null,
        cents: 0,
        timestamp: now,
      });
    }
  }, [audioData, sampleRate, cleanupHistory]);

  useEffect(() => {
    const interval = setInterval(cleanupHistory, 1000);
    return () => clearInterval(interval);
  }, [cleanupHistory]);

  return { currentPitch, pitchHistory };
}
