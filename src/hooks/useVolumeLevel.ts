import { useMemo } from "react";

interface StereoAudioData {
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly mono: Float32Array;
}

interface ChannelVolume {
  readonly rms: number;
  readonly dB: number;
  readonly peak: number;
  readonly peakDb: number;
}

interface VolumeLevel {
  readonly left: ChannelVolume;
  readonly right: ChannelVolume;
  readonly mono: ChannelVolume;
  readonly isStereo: boolean;
}

const MIN_DB = -60;

function calculateRMS(buffer: Float32Array): number {
  if (buffer.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

function calculatePeak(buffer: Float32Array): number {
  if (buffer.length === 0) return 0;
  let max = 0;
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i]);
    if (abs > max) max = abs;
  }
  return max;
}

function toDecibels(value: number): number {
  if (value <= 0) return MIN_DB;
  const db = 20 * Math.log10(value);
  return Math.max(MIN_DB, db);
}

function calculateChannelVolume(buffer: Float32Array): ChannelVolume {
  const rms = calculateRMS(buffer);
  const peak = calculatePeak(buffer);
  return {
    rms,
    dB: toDecibels(rms),
    peak,
    peakDb: toDecibels(peak),
  };
}

function arraysEqual(a: Float32Array, b: Float32Array): boolean {
  if (a.length !== b.length) return false;
  // サンプリングで比較（パフォーマンスのため）
  const step = Math.max(1, Math.floor(a.length / 10));
  for (let i = 0; i < a.length; i += step) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function useVolumeLevel(
  stereoData: StereoAudioData | null
): VolumeLevel | null {
  return useMemo(() => {
    if (!stereoData) return null;

    const left = calculateChannelVolume(stereoData.left);
    const right = calculateChannelVolume(stereoData.right);
    const mono = calculateChannelVolume(stereoData.mono);

    // モノラル入力の場合、左右が同じになる
    const isStereo = !arraysEqual(stereoData.left, stereoData.right);

    return {
      left,
      right,
      mono,
      isStereo,
    };
  }, [stereoData]);
}
