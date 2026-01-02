import { describe, it, expect } from "vitest";
import { adjustBpm, isValidBpm } from "./bpmUtils";
import { BPM_MIN, BPM_MAX } from "@/constants/audio";

describe("adjustBpm", () => {
  describe("basic adjustments", () => {
    it("adds integer delta correctly", () => {
      expect(adjustBpm(120, 1)).toBe(121);
      expect(adjustBpm(120, 10)).toBe(130);
      expect(adjustBpm(120, 100)).toBe(220);
    });

    it("subtracts integer delta correctly", () => {
      expect(adjustBpm(120, -1)).toBe(119);
      expect(adjustBpm(120, -10)).toBe(110);
      expect(adjustBpm(120, -100)).toBe(20);
    });
  });

  describe("decimal precision preservation", () => {
    it("preserves 0.01 precision when adding integers", () => {
      expect(adjustBpm(120.01, 1)).toBe(121.01);
      expect(adjustBpm(120.05, 1)).toBe(121.05);
      expect(adjustBpm(120.99, 1)).toBe(121.99);
    });

    it("preserves 0.01 precision when subtracting integers", () => {
      expect(adjustBpm(120.01, -1)).toBe(119.01);
      expect(adjustBpm(120.05, -1)).toBe(119.05);
      expect(adjustBpm(120.99, -1)).toBe(119.99);
    });

    it("preserves 0.01 precision when adding tens", () => {
      expect(adjustBpm(120.01, 10)).toBe(130.01);
      expect(adjustBpm(120.05, 10)).toBe(130.05);
    });

    it("preserves 0.01 precision when adding hundreds", () => {
      expect(adjustBpm(120.01, 100)).toBe(220.01);
      expect(adjustBpm(120.05, 100)).toBe(220.05);
    });

    it("handles 0.1 adjustments correctly", () => {
      expect(adjustBpm(120, 0.1)).toBe(120.1);
      expect(adjustBpm(120.1, 0.1)).toBe(120.2);
      expect(adjustBpm(120.01, 0.1)).toBe(120.11);
    });

    it("handles 0.01 adjustments correctly", () => {
      expect(adjustBpm(120, 0.01)).toBe(120.01);
      expect(adjustBpm(120.01, 0.01)).toBe(120.02);
      expect(adjustBpm(120.99, 0.01)).toBe(121);
    });
  });

  describe("floating point error prevention", () => {
    it("handles 0.1 + 0.2 floating point issue", () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      // Our function should round to 0.3
      expect(adjustBpm(120.1, 0.2)).toBe(120.3);
    });

    it("handles multiple small adjustments without accumulating errors", () => {
      let value = 120;
      for (let i = 0; i < 10; i++) {
        value = adjustBpm(value, 0.01);
      }
      expect(value).toBe(120.1);
    });

    it("handles subtraction that could cause floating point issues", () => {
      expect(adjustBpm(120.3, -0.1)).toBe(120.2);
      expect(adjustBpm(120.1, -0.1)).toBe(120);
    });
  });

  describe("clamping to valid range", () => {
    it("clamps to minimum when result would be below BPM_MIN", () => {
      expect(adjustBpm(BPM_MIN, -1)).toBe(BPM_MIN);
      expect(adjustBpm(BPM_MIN + 5, -10)).toBe(BPM_MIN);
      expect(adjustBpm(30, -100)).toBe(BPM_MIN);
    });

    it("clamps to maximum when result would be above BPM_MAX", () => {
      expect(adjustBpm(BPM_MAX, 1)).toBe(BPM_MAX);
      expect(adjustBpm(BPM_MAX - 5, 10)).toBe(BPM_MAX);
      expect(adjustBpm(950, 100)).toBe(BPM_MAX);
    });

    it("allows values at exact boundaries", () => {
      expect(adjustBpm(BPM_MIN, 0)).toBe(BPM_MIN);
      expect(adjustBpm(BPM_MAX, 0)).toBe(BPM_MAX);
    });
  });

  describe("edge cases", () => {
    it("handles zero delta", () => {
      expect(adjustBpm(120, 0)).toBe(120);
      expect(adjustBpm(120.05, 0)).toBe(120.05);
    });

    it("handles very small values near minimum", () => {
      expect(adjustBpm(BPM_MIN, 0.01)).toBe(BPM_MIN + 0.01);
      expect(adjustBpm(BPM_MIN + 0.01, -0.01)).toBe(BPM_MIN);
    });

    it("handles values near maximum", () => {
      expect(adjustBpm(BPM_MAX - 0.01, 0.01)).toBe(BPM_MAX);
      expect(adjustBpm(BPM_MAX, -0.01)).toBe(BPM_MAX - 0.01);
    });
  });
});

describe("isValidBpm", () => {
  it("returns true for valid BPM values", () => {
    expect(isValidBpm(120)).toBe(true);
    expect(isValidBpm(BPM_MIN)).toBe(true);
    expect(isValidBpm(BPM_MAX)).toBe(true);
    expect(isValidBpm(120.5)).toBe(true);
    expect(isValidBpm(120.01)).toBe(true);
  });

  it("returns false for values below minimum", () => {
    expect(isValidBpm(BPM_MIN - 1)).toBe(false);
    expect(isValidBpm(0)).toBe(false);
    expect(isValidBpm(-1)).toBe(false);
  });

  it("returns false for values above maximum", () => {
    expect(isValidBpm(BPM_MAX + 1)).toBe(false);
    expect(isValidBpm(1000)).toBe(false);
  });

  it("returns false for NaN", () => {
    expect(isValidBpm(NaN)).toBe(false);
  });
});
