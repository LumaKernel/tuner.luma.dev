import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { produce } from "immer";
import type { Settings } from "@/types";

const STORAGE_KEY = "tuner-settings";

const defaultSettings: Settings = {
  notation: "letter",
  accidental: "sharp",
  movableDo: false,
  baseNote: 0,
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

interface SettingsContextValue {
  readonly state: Settings;
  readonly update: (updater: (draft: Settings) => void) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  readonly children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [state, setState] = useState<Settings>(loadSettings);

  const update = useCallback((updater: (draft: Settings) => void) => {
    setState((current) => {
      const next = produce(current, updater);
      saveSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    saveSettings(state);
  }, [state]);

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
