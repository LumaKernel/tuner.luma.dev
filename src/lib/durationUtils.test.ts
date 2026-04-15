import { describe, it, expect } from "vitest";
import {
  isValidDuration,
  formatDurationShort,
  sanitizeDurationPresets,
} from "./durationUtils";
import {
  DURATION_MIN,
  DURATION_MAX,
  DURATION_PRESETS_DEFAULT,
} from "@/constants/audio";

describe("isValidDuration", () => {
  it("accepts valid durations within range", () => {
    expect(isValidDuration(1)).toBe(true);
    expect(isValidDuration(30)).toBe(true);
    expect(isValidDuration(600)).toBe(true);
  });

  it("rejects durations below minimum", () => {
    expect(isValidDuration(0)).toBe(false);
    expect(isValidDuration(-1)).toBe(false);
  });

  it("rejects durations above maximum", () => {
    expect(isValidDuration(601)).toBe(false);
    expect(isValidDuration(9999)).toBe(false);
  });

  it("rejects non-integer values", () => {
    expect(isValidDuration(30.5)).toBe(false);
    expect(isValidDuration(0.1)).toBe(false);
  });

  it("rejects non-finite values", () => {
    expect(isValidDuration(NaN)).toBe(false);
    expect(isValidDuration(Infinity)).toBe(false);
    expect(isValidDuration(-Infinity)).toBe(false);
  });

  it("accepts boundary values", () => {
    expect(isValidDuration(DURATION_MIN)).toBe(true);
    expect(isValidDuration(DURATION_MAX)).toBe(true);
  });
});

describe("formatDurationShort", () => {
  it("formats seconds only", () => {
    expect(formatDurationShort(30)).toBe("30秒");
    expect(formatDurationShort(15)).toBe("15秒");
  });

  it("formats minutes only", () => {
    expect(formatDurationShort(60)).toBe("1分");
    expect(formatDurationShort(120)).toBe("2分");
    expect(formatDurationShort(180)).toBe("3分");
  });

  it("formats minutes and seconds", () => {
    expect(formatDurationShort(90)).toBe("1分30秒");
    expect(formatDurationShort(75)).toBe("1分15秒");
  });
});

describe("sanitizeDurationPresets", () => {
  it("returns defaults for non-array input", () => {
    expect(sanitizeDurationPresets(null)).toEqual(DURATION_PRESETS_DEFAULT);
    expect(sanitizeDurationPresets(undefined)).toEqual(
      DURATION_PRESETS_DEFAULT,
    );
    expect(sanitizeDurationPresets("foo")).toEqual(DURATION_PRESETS_DEFAULT);
    expect(sanitizeDurationPresets(42)).toEqual(DURATION_PRESETS_DEFAULT);
  });

  it("returns defaults for wrong count", () => {
    expect(sanitizeDurationPresets([30, 60])).toEqual(
      DURATION_PRESETS_DEFAULT,
    );
    expect(sanitizeDurationPresets([])).toEqual(DURATION_PRESETS_DEFAULT);
  });

  it("returns defaults when values are invalid", () => {
    expect(sanitizeDurationPresets([0, 30, 60, 90, 120, 180])).toEqual(
      DURATION_PRESETS_DEFAULT,
    );
    expect(
      sanitizeDurationPresets(["a", "b", "c", "d", "e", "f"]),
    ).toEqual(DURATION_PRESETS_DEFAULT);
  });

  it("accepts valid preset arrays", () => {
    const presets = [10, 20, 30, 60, 120, 300];
    expect(sanitizeDurationPresets(presets)).toEqual(presets);
  });

  it("filters invalid values and falls back if count wrong", () => {
    // 7 values → sliced to 6, all valid
    expect(
      sanitizeDurationPresets([10, 20, 30, 60, 120, 300, 400]),
    ).toEqual([10, 20, 30, 60, 120, 300]);
  });

  it("rejects non-integer durations", () => {
    expect(
      sanitizeDurationPresets([30.5, 60, 90, 120, 180, 240]),
    ).toEqual(DURATION_PRESETS_DEFAULT);
  });
});
