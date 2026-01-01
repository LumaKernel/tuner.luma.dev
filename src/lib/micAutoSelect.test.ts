import { describe, it, expect } from "vitest";
import {
  createEnvironmentKey,
  parseEnvironmentKey,
  isSameEnvironment,
  selectMicrophone,
  recordMicSelection,
  createEmptyMicSelectionState,
  sanitizeMicSelectionState,
  type MicSelectionState,
} from "./micAutoSelect";

describe("createEnvironmentKey", () => {
  it("should create a consistent key regardless of order", () => {
    const key1 = createEnvironmentKey(["a", "b", "c"]);
    const key2 = createEnvironmentKey(["c", "a", "b"]);
    const key3 = createEnvironmentKey(["b", "c", "a"]);

    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
  });

  it("should create different keys for different device sets", () => {
    const key1 = createEnvironmentKey(["a", "b"]);
    const key2 = createEnvironmentKey(["a", "b", "c"]);

    expect(key1).not.toBe(key2);
  });

  it("should handle empty array", () => {
    const key = createEnvironmentKey([]);
    expect(key).toBe("[]");
  });
});

describe("parseEnvironmentKey", () => {
  it("should parse environment key back to array", () => {
    const original = ["a", "b", "c"];
    const key = createEnvironmentKey(original);
    const parsed = parseEnvironmentKey(key);

    // Should be sorted
    expect(parsed).toEqual(["a", "b", "c"]);
  });
});

describe("isSameEnvironment", () => {
  it("should return true for same devices in different order", () => {
    expect(isSameEnvironment(["a", "b", "c"], ["c", "b", "a"])).toBe(true);
  });

  it("should return false for different devices", () => {
    expect(isSameEnvironment(["a", "b"], ["a", "b", "c"])).toBe(false);
  });

  it("should return true for empty arrays", () => {
    expect(isSameEnvironment([], [])).toBe(true);
  });
});

describe("selectMicrophone", () => {
  const emptyState = createEmptyMicSelectionState();

  describe("when no devices available", () => {
    it("should return null", () => {
      const result = selectMicrophone([], emptyState, "fallback");
      expect(result).toBe(null);
    });
  });

  describe("priority 1: environment selection", () => {
    it("should select from environment selection if available", () => {
      const availableDevices = ["mic1", "mic2", "mic3"];
      const envKey = createEnvironmentKey(availableDevices);
      const state: MicSelectionState = {
        environmentSelections: { [envKey]: "mic2" },
        recentSelections: ["mic3"],
      };

      const result = selectMicrophone(availableDevices, state, "mic1");
      expect(result).toBe("mic2");
    });

    it("should skip environment selection if device no longer available", () => {
      const availableDevices = ["mic1", "mic3"];
      const envKey = createEnvironmentKey(["mic1", "mic2", "mic3"]); // Different environment
      const state: MicSelectionState = {
        environmentSelections: { [envKey]: "mic2" },
        recentSelections: [],
      };

      const result = selectMicrophone(availableDevices, state, "mic1");
      expect(result).toBe("mic1"); // Falls back to first device
    });
  });

  describe("priority 2: recent selections", () => {
    it("should select from recent if no environment match", () => {
      const availableDevices = ["mic1", "mic2", "mic3"];
      const state: MicSelectionState = {
        environmentSelections: {},
        recentSelections: ["mic4", "mic2", "mic1"], // mic4 not available
      };

      const result = selectMicrophone(availableDevices, state, "mic1");
      expect(result).toBe("mic2"); // First available in recent list
    });

    it("should check recent selections in order", () => {
      const availableDevices = ["mic1", "mic2", "mic3"];
      const state: MicSelectionState = {
        environmentSelections: {},
        recentSelections: ["mic3", "mic2", "mic1"],
      };

      const result = selectMicrophone(availableDevices, state, "mic1");
      expect(result).toBe("mic3"); // Most recent that's available
    });
  });

  describe("priority 3: fallback", () => {
    it("should use fallback when no matches found", () => {
      const availableDevices = ["mic1", "mic2", "mic3"];
      const state: MicSelectionState = {
        environmentSelections: {},
        recentSelections: ["mic4", "mic5"], // None available
      };

      const result = selectMicrophone(availableDevices, state, "mic2");
      expect(result).toBe("mic2");
    });

    it("should use first device if fallback not available", () => {
      const availableDevices = ["mic1", "mic2", "mic3"];
      const result = selectMicrophone(availableDevices, emptyState, "mic99");
      expect(result).toBe("mic1");
    });

    it("should use first device if fallback is null", () => {
      const availableDevices = ["mic1", "mic2", "mic3"];
      const result = selectMicrophone(availableDevices, emptyState, null);
      expect(result).toBe("mic1");
    });
  });
});

describe("recordMicSelection", () => {
  it("should record environment selection", () => {
    const state = createEmptyMicSelectionState();
    const availableDevices = ["mic1", "mic2", "mic3"];
    const envKey = createEnvironmentKey(availableDevices);

    const newState = recordMicSelection(state, availableDevices, "mic2");

    expect(newState.environmentSelections[envKey]).toBe("mic2");
  });

  it("should add to recent selections", () => {
    const state = createEmptyMicSelectionState();
    const availableDevices = ["mic1", "mic2"];

    const newState = recordMicSelection(state, availableDevices, "mic2");

    expect(newState.recentSelections).toEqual(["mic2"]);
  });

  it("should move existing selection to front of recent list", () => {
    const state: MicSelectionState = {
      environmentSelections: {},
      recentSelections: ["mic1", "mic2", "mic3"],
    };

    const newState = recordMicSelection(
      state,
      ["mic1", "mic2", "mic3"],
      "mic3",
    );

    expect(newState.recentSelections).toEqual(["mic3", "mic1", "mic2"]);
  });

  it("should limit recent selections to max count", () => {
    const state: MicSelectionState = {
      environmentSelections: {},
      recentSelections: ["m1", "m2", "m3", "m4", "m5"],
    };

    const newState = recordMicSelection(
      state,
      ["m1", "m2", "m3", "m4", "m5", "m6"],
      "m6",
      3,
    );

    expect(newState.recentSelections).toEqual(["m6", "m1", "m2"]);
    expect(newState.recentSelections.length).toBe(3);
  });

  it("should update environment selection for same environment", () => {
    const availableDevices = ["mic1", "mic2"];
    const envKey = createEnvironmentKey(availableDevices);

    const state1 = recordMicSelection(
      createEmptyMicSelectionState(),
      availableDevices,
      "mic1",
    );
    expect(state1.environmentSelections[envKey]).toBe("mic1");

    const state2 = recordMicSelection(state1, availableDevices, "mic2");
    expect(state2.environmentSelections[envKey]).toBe("mic2");
  });
});

describe("sanitizeMicSelectionState", () => {
  it("should return empty state for null", () => {
    const result = sanitizeMicSelectionState(null);
    expect(result).toEqual(createEmptyMicSelectionState());
  });

  it("should return empty state for non-object", () => {
    expect(sanitizeMicSelectionState("string")).toEqual(
      createEmptyMicSelectionState(),
    );
    expect(sanitizeMicSelectionState(123)).toEqual(
      createEmptyMicSelectionState(),
    );
  });

  it("should preserve valid data", () => {
    const envKey = createEnvironmentKey(["a", "b"]);
    const validData = {
      environmentSelections: { [envKey]: "a" },
      recentSelections: ["a", "b"],
    };

    const result = sanitizeMicSelectionState(validData);
    expect(result.environmentSelections).toEqual({ [envKey]: "a" });
    expect(result.recentSelections).toEqual(["a", "b"]);
  });

  it("should filter out non-string values in environmentSelections", () => {
    const invalidData = {
      environmentSelections: {
        '["a"]': "valid",
        '["b"]': 123,
        '["c"]': null,
      },
      recentSelections: [],
    };

    const result = sanitizeMicSelectionState(invalidData);
    expect(result.environmentSelections).toEqual({ '["a"]': "valid" });
  });

  it("should filter out non-string values in recentSelections", () => {
    const invalidData = {
      environmentSelections: {},
      recentSelections: ["valid", 123, null, "also-valid", undefined],
    };

    const result = sanitizeMicSelectionState(invalidData);
    expect(result.recentSelections).toEqual(["valid", "also-valid"]);
  });

  it("should handle missing fields", () => {
    const result = sanitizeMicSelectionState({});
    expect(result.environmentSelections).toEqual({});
    expect(result.recentSelections).toEqual([]);
  });
});
