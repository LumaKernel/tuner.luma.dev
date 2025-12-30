import { useState, useCallback, useEffect, useRef } from "react";
import { ListMusic, Settings } from "lucide-react";
import { TunerDisplay } from "./components/TunerDisplay";
import { ControlPanel } from "./components/ControlPanel";
import { PitchInfo } from "./components/PitchInfo";
import { SettingsDialog } from "./components/SettingsDialog";
import { RecordingList } from "./components/RecordingList";
import { StartOverlay } from "./components/StartOverlay";
import { MicrophoneSelector } from "./components/MicrophoneSelector";
import { VolumeLevel } from "./components/VolumeLevel";
import { ModeToggle } from "./components/mode-toggle";
import { ThemeProvider } from "./components/theme-provider";
import { Button } from "./components/ui/button";
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
  const settings = useSettings();

  const { devices, isLoading, error, refreshDevices } = useMicrophoneDevices();
  const { isActive, startAudio, audioData, stereoData, sampleRate } =
    useAudioInput();

  const { currentPitch, pitchHistory } = usePitchDetection(
    audioData,
    sampleRate
  );

  const volumeLevel = useVolumeLevel(stereoData);

  const { saveRecording } = useRecordingBuffer(audioData, sampleRate);

  const { recordings, refresh, deleteRecording, downloadRecording } =
    useRecordingStorage();

  // Track if we've initialized device selection
  const initializedRef = useRef(false);

  // Select first device when devices are loaded
  if (devices.length > 0 && selectedDeviceId === "" && !initializedRef.current) {
    initializedRef.current = true;
    setSelectedDeviceId(devices[0].deviceId);
  }

  // Handle device change while active - restart audio with new device
  const handleDeviceChange = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      if (isActive) {
        startAudio(deviceId);
      }
    },
    [isActive, startAudio]
  );

  const handleSave = useCallback(() => {
    saveRecording();
  }, [saveRecording]);

  const handleStart = useCallback(() => {
    startAudio(selectedDeviceId || undefined);
  }, [startAudio, selectedDeviceId]);

  const handleOpenRecordings = useCallback(() => {
    setIsRecordingsOpen(true);
    refresh();
  }, [refresh]);

  // Load devices on mount
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Tuner</h1>
          <div className="flex items-center gap-2">
            {isActive && (
              <MicrophoneSelector
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onDeviceChange={handleDeviceChange}
                isLoading={isLoading}
                compact
              />
            )}
            <Button variant="ghost" size="sm" onClick={handleOpenRecordings}>
              <ListMusic />
              録音一覧
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
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
              movableDo={settings.state.movableDo}
              baseNote={settings.state.baseNote}
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
            />
          )}
        </div>

        {isActive && <ControlPanel onSave={handleSave} />}
      </main>

      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings.state}
        onSettingsChange={settings.update}
      />

      <RecordingList
        open={isRecordingsOpen}
        onClose={() => setIsRecordingsOpen(false)}
        recordings={recordings}
        onDelete={deleteRecording}
        onDownload={downloadRecording}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="tuner-ui-theme">
      <SettingsProvider>
        <TunerApp />
      </SettingsProvider>
    </ThemeProvider>
  );
}
