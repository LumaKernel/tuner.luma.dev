import { useState, useCallback, useRef } from "react";

const BUFFER_SIZE = 2048;

interface AudioInputState {
  readonly isActive: boolean;
  readonly audioData: Float32Array | null;
  readonly sampleRate: number;
  readonly startAudio: (deviceId?: string) => Promise<void>;
}

// Audio resources that need cleanup
interface AudioResources {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  stream: MediaStream;
  dataArray: Float32Array<ArrayBuffer>;
  animationFrameId: number | null;
}

export function useAudioInput(): AudioInputState {
  const [isActive, setIsActive] = useState(false);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [sampleRate, setSampleRate] = useState(44100);

  const resourcesRef = useRef<AudioResources | null>(null);

  const stopAudio = useCallback(() => {
    const resources = resourcesRef.current;
    if (!resources) return;

    if (resources.animationFrameId !== null) {
      cancelAnimationFrame(resources.animationFrameId);
    }

    resources.stream.getTracks().forEach((track) => track.stop());
    resources.audioContext.close();

    resourcesRef.current = null;
    setIsActive(false);
    setAudioData(null);
  }, []);

  const startAudio = useCallback(async (deviceId?: string) => {
    // Stop any existing audio first
    stopAudio();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = BUFFER_SIZE;
    analyser.smoothingTimeConstant = 0;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Float32Array(analyser.fftSize);

    const resources: AudioResources = {
      audioContext,
      analyser,
      stream,
      dataArray,
      animationFrameId: null,
    };

    resourcesRef.current = resources;
    setSampleRate(audioContext.sampleRate);
    setIsActive(true);

    // Start audio processing loop
    const processAudio = () => {
      const currentResources = resourcesRef.current;
      if (!currentResources) return;

      currentResources.analyser.getFloatTimeDomainData(currentResources.dataArray);

      // Create a copy of the data
      const copy = new Float32Array(currentResources.dataArray.length);
      copy.set(currentResources.dataArray);
      setAudioData(copy);

      currentResources.animationFrameId = requestAnimationFrame(processAudio);
    };

    processAudio();
  }, [stopAudio]);

  return {
    isActive,
    audioData,
    sampleRate,
    startAudio,
  };
}
