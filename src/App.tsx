import { useState, useCallback, useEffect, useRef } from "react";
import { ListMusic, Menu, Settings } from "lucide-react";
import { toast } from "sonner";

// GitHub icon from Simple Icons (lucide-react deprecated brand icons)
function GitHubIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
import { TunerDisplay } from "./components/TunerDisplay";
import { ControlPanel } from "./components/ControlPanel";
import { PitchInfo } from "./components/PitchInfo";
import { SettingsDialog } from "./components/SettingsDialog";
import { RecordingList } from "./components/RecordingList";
import { StartOverlay } from "./components/StartOverlay";
import { VolumeLevel } from "./components/VolumeLevel";
import { AudioToolsPanel } from "./components/AudioToolsPanel";
import { ModeToggle } from "./components/mode-toggle";
import { ThemeProvider } from "./components/theme-provider";
import { Button } from "./components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";
import { Toaster } from "./components/ui/sonner";
import { useAudioInput } from "./hooks/useAudioInput";
import { usePitchDetection } from "./hooks/usePitchDetection";
import { useVolumeLevel } from "./hooks/useVolumeLevel";
import { useRecordingBuffer } from "./hooks/useRecordingBuffer";
import { useRecordingStorage } from "./hooks/useRecordingStorage";
import { useMicrophoneDevices } from "./hooks/useMicrophoneDevices";
import { useSettings, SettingsProvider } from "./hooks/useSettings";
import {
  useMicSelectionState,
  MicSelectionStateProvider,
} from "./hooks/useMicSelectionState";
import { selectMicrophone, recordMicSelection } from "./lib/micAutoSelect";

function TunerApp() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecordingsOpen, setIsRecordingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const settings = useSettings();
  const micSelection = useMicSelectionState();

  const { devices, isLoading, error, refreshDevices } = useMicrophoneDevices();
  const { isActive, startAudio, audioData, stereoData, sampleRate, stream } =
    useAudioInput();

  const {
    currentPitch,
    pitchHistory,
    timestamp: pitchTimestamp,
  } = usePitchDetection(audioData, sampleRate, {
    noiseGateThreshold: settings.state.advanced.noiseGateThreshold,
  });

  const volumeLevel = useVolumeLevel(stereoData);

  const { saveRecording } = useRecordingBuffer(
    stream,
    settings.state.recordingDuration,
  );

  const {
    recordings,
    refresh,
    deleteRecording,
    downloadRecording,
    playRecording,
    stopPlayback,
    seek,
    playingId,
    playbackTime,
    playbackDuration,
    isConverting,
  } = useRecordingStorage();

  // Track if we've initialized device selection
  const initializedRef = useRef(false);

  // Get available device IDs for auto-selection
  const availableDeviceIds = devices.map((d) => d.deviceId);

  // Select device using auto-selection logic when devices are loaded
  if (
    devices.length > 0 &&
    selectedDeviceId === "" &&
    !initializedRef.current
  ) {
    initializedRef.current = true;
    const autoSelected = selectMicrophone(
      availableDeviceIds,
      micSelection.state,
      devices[0]?.deviceId ?? null,
    );
    if (autoSelected !== null) {
      setSelectedDeviceId(autoSelected);
    }
  }

  // Handle device change while active - restart audio with new device
  // This is for explicit user selection, so record it
  const handleDeviceChange = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      // Record explicit selection
      micSelection.update((draft) => {
        const newState = recordMicSelection(
          {
            environmentSelections: draft.environmentSelections,
            recentSelections: [...draft.recentSelections],
          },
          availableDeviceIds,
          deviceId,
        );
        draft.environmentSelections = newState.environmentSelections;
        draft.recentSelections = newState.recentSelections as string[];
      });
      if (isActive) {
        void startAudio(deviceId);
      }
    },
    [isActive, startAudio, micSelection, availableDeviceIds],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const id = await saveRecording();
      if (id) {
        toast.success("録音を保存しました。録音一覧から確認してください。");
      } else {
        toast.error("保存するデータがありません");
      }
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }, [saveRecording]);

  const handleStart = useCallback(() => {
    void startAudio(selectedDeviceId || undefined);
  }, [startAudio, selectedDeviceId]);

  const handleOpenRecordings = useCallback(() => {
    setIsRecordingsOpen(true);
    void refresh();
  }, [refresh]);

  const handleDownload = useCallback(
    async (id: string, format: Parameters<typeof downloadRecording>[1]) => {
      try {
        await downloadRecording(id, format);
        toast.success("ダウンロードを開始しました");
      } catch {
        toast.error("ダウンロードに失敗しました");
      }
    },
    [downloadRecording],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteRecording(id);
        toast.success("削除しました");
      } catch {
        toast.error("削除に失敗しました");
      }
    },
    [deleteRecording],
  );

  const handleAutoStartChange = useCallback(
    (autoStart: boolean) => {
      settings.update((draft) => {
        draft.autoStart = autoStart;
      });
    },
    [settings],
  );

  // Track if we've attempted auto-start
  const autoStartAttemptedRef = useRef(false);
  // Capture autoStart setting at mount time (don't react to changes)
  const initialAutoStartRef = useRef(settings.state.autoStart);

  // Load devices on mount
  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  // Auto-start only on initial page load (not when checkbox is changed)
  useEffect(() => {
    if (
      initialAutoStartRef.current &&
      devices.length > 0 &&
      selectedDeviceId !== "" &&
      !isActive &&
      !autoStartAttemptedRef.current
    ) {
      autoStartAttemptedRef.current = true;
      void startAudio(selectedDeviceId);
    }
  }, [devices.length, selectedDeviceId, isActive, startAudio]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">tuner.luma.dev</h1>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleOpenRecordings}>
              <ListMusic />
              録音一覧
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsSettingsOpen(true);
              }}
            >
              <Settings />
              設定
            </Button>
            <ModeToggle />
            <Button variant="ghost" size="icon" asChild>
              <a
                href="https://github.com/LumaKernel/tuner.luma.dev"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <GitHubIcon className="h-[1.2rem] w-[1.2rem]" />
              </a>
            </Button>
          </div>

          {/* Mobile menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="メニュー">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>メニュー</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-4">
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    handleOpenRecordings();
                    setIsMenuOpen(false);
                  }}
                >
                  <ListMusic className="mr-2 h-4 w-4" />
                  録音一覧
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  設定
                </Button>
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-sm">テーマ</span>
                  <ModeToggle />
                </div>
                <Button variant="ghost" className="justify-start" asChild>
                  <a
                    href="https://github.com/LumaKernel/tuner.luma.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GitHubIcon className="mr-2 h-4 w-4" />
                    GitHub
                  </a>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4 max-w-4xl mx-auto w-full">
        {isActive && (
          <>
            <PitchInfo
              pitch={currentPitch}
              notation={settings.state.notation}
              accidental={settings.state.accidental}
              advancedSettings={settings.state.advanced}
            />
            <VolumeLevel volume={volumeLevel} />
          </>
        )}

        <div className="relative flex-1 min-h-[300px] md:min-h-[400px]">
          <TunerDisplay
            pitchHistory={pitchHistory}
            notation={settings.state.notation}
            accidental={settings.state.accidental}
            now={pitchTimestamp}
          />
          {!isActive && (
            <StartOverlay
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onDeviceChange={handleDeviceChange}
              isLoading={isLoading}
              error={error}
              onRefreshDevices={refreshDevices}
              onStart={handleStart}
              autoStart={settings.state.autoStart}
              onAutoStartChange={handleAutoStartChange}
            />
          )}
        </div>

        {isActive && (
          <>
            <ControlPanel
              onSave={handleSave}
              isSaving={isSaving}
              recordingDuration={settings.state.recordingDuration}
              onDurationChange={(duration) => {
                settings.update((draft) => {
                  draft.recordingDuration = duration;
                });
              }}
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onDeviceChange={handleDeviceChange}
              isDevicesLoading={isLoading}
            />
            <AudioToolsPanel
              notation={settings.state.notation}
              accidental={settings.state.accidental}
              advancedSettings={settings.state.advanced}
            />
          </>
        )}
      </main>

      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
        }}
        settings={settings.state}
        onSettingsChange={settings.update}
      />

      <RecordingList
        open={isRecordingsOpen}
        onClose={() => {
          stopPlayback();
          setIsRecordingsOpen(false);
        }}
        recordings={recordings}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onPlay={playRecording}
        onStop={stopPlayback}
        onSeek={seek}
        playingId={playingId}
        playbackTime={playbackTime}
        playbackDuration={playbackDuration}
        isConverting={isConverting}
        defaultFormat={settings.state.audioFormat}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="tuner-ui-theme">
      <SettingsProvider>
        <MicSelectionStateProvider>
          <TunerApp />
          <Toaster position="bottom-center" />
        </MicSelectionStateProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
