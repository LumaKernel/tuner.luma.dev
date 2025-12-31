import { useState, useCallback, useEffect, useRef } from "react";
import { ListMusic, Settings } from "lucide-react";
import { toast } from "sonner";
import { TunerDisplay } from "./components/TunerDisplay";
import { ControlPanel } from "./components/ControlPanel";
import { PitchInfo } from "./components/PitchInfo";
import { SettingsDialog } from "./components/SettingsDialog";
import { RecordingList } from "./components/RecordingList";
import { StartOverlay } from "./components/StartOverlay";
import { VolumeLevel } from "./components/VolumeLevel";
import { ModeToggle } from "./components/mode-toggle";
import { ThemeProvider } from "./components/theme-provider";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { useAudioInput } from "./hooks/useAudioInput";
import { usePitchDetection } from "./hooks/usePitchDetection";
import { useVolumeLevel } from "./hooks/useVolumeLevel";
import { useRecordingBuffer } from "./hooks/useRecordingBuffer";
import { useRecordingStorage } from "./hooks/useRecordingStorage";
import { useMicrophoneDevices } from "./hooks/useMicrophoneDevices";
import { useSettings, SettingsProvider } from "./hooks/useSettings";

function TunerApp() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecordingsOpen, setIsRecordingsOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const settings = useSettings();

  const { devices, isLoading, error, refreshDevices } = useMicrophoneDevices();
  const { isActive, startAudio, audioData, stereoData, sampleRate, stream } =
    useAudioInput();

  const { currentPitch, pitchHistory } = usePitchDetection(
    audioData,
    sampleRate,
  );

  const volumeLevel = useVolumeLevel(stereoData);

  const { saveRecording } = useRecordingBuffer(
    stream,
    settings.state.recordingDuration,
    settings.state.audioFormat,
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

  // Select first device when devices are loaded
  if (
    devices.length > 0 &&
    selectedDeviceId === "" &&
    !initializedRef.current
  ) {
    initializedRef.current = true;
    setSelectedDeviceId(devices[0].deviceId);
  }

  // Handle device change while active - restart audio with new device
  const handleDeviceChange = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      if (isActive) {
        void startAudio(deviceId);
      }
    },
    [isActive, startAudio],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const id = await saveRecording();
      if (id) {
        toast.success("録音を保存しました");
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
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4 max-w-4xl mx-auto w-full">
        {isActive && (
          <>
            <PitchInfo
              pitch={currentPitch}
              notation={settings.state.notation}
              accidental={settings.state.accidental}
            />
            <VolumeLevel volume={volumeLevel} />
          </>
        )}

        <div className="relative flex-1 min-h-[300px] md:min-h-[400px]">
          <TunerDisplay
            pitchHistory={pitchHistory}
            notation={settings.state.notation}
            accidental={settings.state.accidental}
          />
          {!isActive && (
            <StartOverlay
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onDeviceChange={setSelectedDeviceId}
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
        <TunerApp />
        <Toaster position="bottom-center" />
      </SettingsProvider>
    </ThemeProvider>
  );
}
