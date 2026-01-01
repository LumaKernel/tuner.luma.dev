import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { produce, type WritableDraft } from "immer";
import {
  type MicSelectionState,
  createEmptyMicSelectionState,
  sanitizeMicSelectionState,
} from "@/lib/micAutoSelect";

const STORAGE_KEY = "tuner-mic-selection";

function loadMicSelectionState(): MicSelectionState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      return sanitizeMicSelectionState(parsed);
    }
  } catch {
    // Ignore parse errors
  }
  return createEmptyMicSelectionState();
}

function saveMicSelectionState(state: MicSelectionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

type MicSelectionStateContextValue = {
  readonly state: MicSelectionState;
  readonly update: (
    updater: (draft: WritableDraft<MicSelectionState>) => void,
  ) => void;
};

const MicSelectionStateContext =
  createContext<MicSelectionStateContextValue | null>(null);

type MicSelectionStateProviderProps = {
  readonly children: ReactNode;
};

export function MicSelectionStateProvider({
  children,
}: MicSelectionStateProviderProps) {
  const [state, setState] = useState<MicSelectionState>(loadMicSelectionState);

  const update = useCallback(
    (updater: (draft: WritableDraft<MicSelectionState>) => void) => {
      setState((current) => {
        const next = produce(current, updater);
        saveMicSelectionState(next);
        return next;
      });
    },
    [],
  );

  const value: MicSelectionStateContextValue = { state, update };

  return (
    <MicSelectionStateContext.Provider value={value}>
      {children}
    </MicSelectionStateContext.Provider>
  );
}

export function useMicSelectionState(): MicSelectionStateContextValue {
  const context = useContext(MicSelectionStateContext);
  if (!context) {
    throw new Error(
      "useMicSelectionState must be used within a MicSelectionStateProvider",
    );
  }
  return context;
}
