import { BPM_MIN, BPM_MAX } from "@/constants/audio";

/**
 * Adjust BPM value by delta, clamping to valid range and preserving precision.
 * Always rounds to 2 decimal places to avoid floating point errors.
 *
 * @param current - Current BPM value
 * @param delta - Amount to adjust (positive or negative)
 * @returns Adjusted BPM value, clamped to [BPM_MIN, BPM_MAX] and rounded to 2 decimal places
 */
export function adjustBpm(current: number, delta: number): number {
  const newValue = current + delta;
  const clamped = Math.max(BPM_MIN, Math.min(BPM_MAX, newValue));
  // Round to 2 decimal places to preserve precision and avoid floating point errors
  return Math.round(clamped * 100) / 100;
}

/**
 * Validate if a BPM value is within valid range.
 *
 * @param bpm - BPM value to validate
 * @returns true if valid
 */
export function isValidBpm(bpm: number): boolean {
  return !Number.isNaN(bpm) && bpm >= BPM_MIN && bpm <= BPM_MAX;
}
