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
  audioCodec: "auto",
};

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<Settings>;
      return { ...defaultSettings, ...parsed };
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
