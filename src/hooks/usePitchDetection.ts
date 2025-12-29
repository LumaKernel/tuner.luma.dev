import { useRef, useMemo } from "react";
import type { PitchData, PitchHistoryEntry } from "@/types";

const HISTORY_DURATION_MS = 30000;
const MIN_FREQUENCY = 60;
const MAX_FREQUENCY = 2000;

// WASM module state - initialized lazily on first use
let wasmModule: typeof import("@/wasm/pkg/pitch_detector") | null = null;
let wasmInitPromise: Promise<void> | null = null;

function ensureWasmInit(): void {
  if (wasmModule || wasmInitPromise) return;

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
}

// Trigger WASM init immediately when module loads
ensureWasmInit();

// JavaScript fallback: YIN algorithm implementation
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
  // Ref to accumulate history across renders
  const historyRef = useRef<PitchHistoryEntry[]>([]);
  const lastProcessedRef = useRef<Float32Array | null>(null);

  // Process new audio data if it's different from last processed
  // This runs during render, which is fine for pure computation
  const now = Date.now();

  if (audioData && audioData !== lastProcessedRef.current && audioData.length > 0) {
    lastProcessedRef.current = audioData;

    const rms = getRMS(audioData);
    if (rms >= 0.01) {
      const frequency = detectPitch(audioData, sampleRate);
      if (frequency > 0) {
        historyRef.current.push({
          frequency,
          timestamp: now,
        });
      }
    }
  }

  // Filter history during render (pure computation)
  const cutoff = now - HISTORY_DURATION_MS;
  const filteredHistory = historyRef.current.filter(
    (entry) => entry.timestamp > cutoff
  );

  // Update ref if filtering removed items (to prevent memory leak)
  if (filteredHistory.length !== historyRef.current.length) {
    historyRef.current = filteredHistory;
  }

  // Derive current pitch from latest history entry
  const currentPitch = useMemo((): PitchData => {
    const lastEntry = filteredHistory[filteredHistory.length - 1];
    if (lastEntry && now - lastEntry.timestamp < 200) {
      return {
        frequency: lastEntry.frequency,
        note: null,
        cents: 0,
        timestamp: lastEntry.timestamp,
      };
    }
    return {
      frequency: null,
      note: null,
      cents: 0,
      timestamp: now,
    };
  }, [filteredHistory, now]);

  return { currentPitch, pitchHistory: filteredHistory };
}
