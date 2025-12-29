import { useState, useCallback } from "react";
import { TunerDisplay } from "./components/TunerDisplay";
import { ControlPanel } from "./components/ControlPanel";
import { PitchInfo } from "./components/PitchInfo";
import { SettingsDialog } from "./components/SettingsDialog";
import { RecordingList } from "./components/RecordingList";
import { useAudioInput } from "./hooks/useAudioInput";
import { usePitchDetection } from "./hooks/usePitchDetection";
import { useRecordingBuffer } from "./hooks/useRecordingBuffer";
import { useRecordingStorage } from "./hooks/useRecordingStorage";
import { useSettings, SettingsProvider } from "./hooks/useSettings";

function TunerApp() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecordingsOpen, setIsRecordingsOpen] = useState(false);
  const settings = useSettings();

  const { isActive, startAudio, stopAudio, audioData, sampleRate } =
    useAudioInput();

  const { currentPitch, pitchHistory } = usePitchDetection(
    audioData,
    sampleRate
  );

  const { saveRecording } = useRecordingBuffer(audioData, sampleRate);

  const { recordings, deleteRecording, downloadRecording } =
    useRecordingStorage();

  const handleSave = useCallback(() => {
    saveRecording();
  }, [saveRecording]);

  const handleToggleAudio = useCallback(() => {
    if (isActive) {
      stopAudio();
    } else {
      startAudio();
    }
  }, [isActive, startAudio, stopAudio]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="p-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Tuner</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setIsRecordingsOpen(true)}
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
        <PitchInfo
          pitch={currentPitch}
          notation={settings.state.notation}
          accidental={settings.state.accidental}
          movableDo={settings.state.movableDo}
          baseNote={settings.state.baseNote}
        />

        <TunerDisplay
          pitchHistory={pitchHistory}
          notation={settings.state.notation}
          accidental={settings.state.accidental}
        />

        <ControlPanel
          isActive={isActive}
          onToggle={handleToggleAudio}
          onSave={handleSave}
        />
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
