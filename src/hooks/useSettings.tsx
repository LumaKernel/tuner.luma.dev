import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { produce, type WritableDraft } from "immer";
import type { Settings } from "@/types";

const STORAGE_KEY = "tuner-settings";

const defaultSettings: Settings = {
  notation: "letter",
  accidental: "sharp",
  recordingDuration: 30,
  autoStart: false,
  audioFormat: "wav",
};

// Validate and sanitize loaded settings
function sanitizeSettings(parsed: unknown): Settings {
  if (typeof parsed !== "object" || parsed === null) {
    return defaultSettings;
  }

  const obj = parsed as Record<string, unknown>;

  return {
    notation:
      obj.notation === "letter" || obj.notation === "solfege"
        ? obj.notation
        : defaultSettings.notation,
    accidental:
      obj.accidental === "sharp" || obj.accidental === "flat"
        ? obj.accidental
        : defaultSettings.accidental,
    recordingDuration:
      typeof obj.recordingDuration === "number" && obj.recordingDuration > 0
        ? obj.recordingDuration
        : defaultSettings.recordingDuration,
    autoStart:
      typeof obj.autoStart === "boolean"
        ? obj.autoStart
        : defaultSettings.autoStart,
    audioFormat:
      obj.audioFormat === "wav" || obj.audioFormat === "mp3"
        ? obj.audioFormat
        : defaultSettings.audioFormat,
  };
}

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      return sanitizeSettings(parsed);
    }
  } catch {
    // Ignore parse errors
  }
  return defaultSettings;
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

type SettingsContextValue = {
  readonly state: Settings;
  readonly update: (updater: (draft: WritableDraft<Settings>) => void) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

type SettingsProviderProps = {
  readonly children: ReactNode;
};

export function SettingsProvider({ children }: SettingsProviderProps) {
  // Load settings lazily on first render
  const [state, setState] = useState<Settings>(loadSettings);

  const update = useCallback(
    (updater: (draft: WritableDraft<Settings>) => void) => {
      setState((current) => {
        const next = produce(current, updater);
        // Save immediately when updating - no need for useEffect
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  const value: SettingsContextValue = { state, update };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
