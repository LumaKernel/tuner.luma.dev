import {
  DURATION_MIN,
  DURATION_MAX,
  DURATION_PRESET_COUNT,
  DURATION_PRESETS_DEFAULT,
} from "@/constants/audio";

export function isValidDuration(seconds: number): boolean {
  return (
    Number.isFinite(seconds) &&
    Number.isInteger(seconds) &&
    seconds >= DURATION_MIN &&
    seconds <= DURATION_MAX
  );
}

export function formatDurationShort(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}秒`;
  }
  if (secs === 0) {
    return `${mins}分`;
  }
  return `${mins}分${secs}秒`;
}

export function sanitizeDurationPresets(
  parsed: unknown,
): readonly number[] {
  if (!Array.isArray(parsed)) {
    return DURATION_PRESETS_DEFAULT;
  }

  const validPresets = parsed
    .filter((v): v is number => typeof v === "number" && isValidDuration(v))
    .slice(0, DURATION_PRESET_COUNT);

  return validPresets.length === DURATION_PRESET_COUNT
    ? validPresets
    : DURATION_PRESETS_DEFAULT;
}
