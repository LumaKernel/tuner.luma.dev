import { useState, useCallback } from "react";
import { TunerDisplay } from "./components/TunerDisplay";
import { ControlPanel } from "./components/ControlPanel";
import { PitchInfo } from "./components/PitchInfo";
import { SettingsDialog } from "./components/SettingsDialog";
import { RecordingList } from "./components/RecordingList";
import { StartOverlay } from "./components/StartOverlay";
import { useAudioInput } from "./hooks/useAudioInput";
import { usePitchDetection } from "./hooks/usePitchDetection";
import { useRecordingBuffer } from "./hooks/useRecordingBuffer";
import { useRecordingStorage } from "./hooks/useRecordingStorage";
import { useSettings, SettingsProvider } from "./hooks/useSettings";

function TunerApp() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecordingsOpen, setIsRecordingsOpen] = useState(false);
  const settings = useSettings();

  const { isActive, startAudio, audioData, sampleRate } = useAudioInput();

  const { currentPitch, pitchHistory } = usePitchDetection(
    audioData,
    sampleRate
  );

  const { saveRecording } = useRecordingBuffer(audioData, sampleRate);

  const { recordings, refresh, deleteRecording, downloadRecording } =
    useRecordingStorage();

  const handleSave = useCallback(() => {
    saveRecording();
  }, [saveRecording]);

  const handleStart = useCallback(
    (deviceId?: string) => {
      startAudio(deviceId);
    },
    [startAudio]
  );

  const handleOpenRecordings = useCallback(() => {
    setIsRecordingsOpen(true);
    refresh(); // Load recordings when dialog opens
  }, [refresh]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="p-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Tuner</h1>
          <div className="flex gap-2">
            <button
              onClick={handleOpenRecordings}
              className="px-3 py-1.5 text-sm rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              録音一覧
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1.5 text-sm rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              設定
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4 max-w-4xl mx-auto w-full">
        {isActive && (
          <PitchInfo
            pitch={currentPitch}
            notation={settings.state.notation}
            accidental={settings.state.accidental}
            movableDo={settings.state.movableDo}
            baseNote={settings.state.baseNote}
          />
        )}

        <div className="relative flex-1 min-h-[300px] md:min-h-[400px]">
          <TunerDisplay
            pitchHistory={pitchHistory}
            notation={settings.state.notation}
            accidental={settings.state.accidental}
          />
          {!isActive && <StartOverlay onStart={handleStart} />}
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
    <SettingsProvider>
      <TunerApp />
    </SettingsProvider>
  );
}
