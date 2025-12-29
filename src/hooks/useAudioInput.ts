import { useState, useCallback, useRef, useEffect } from "react";

const BUFFER_SIZE = 2048;

interface AudioInputState {
  readonly isActive: boolean;
  readonly audioData: Float32Array | null;
  readonly sampleRate: number;
  readonly startAudio: () => Promise<void>;
  readonly stopAudio: () => void;
}

export function useAudioInput(): AudioInputState {
  const [isActive, setIsActive] = useState(false);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [sampleRate, setSampleRate] = useState(44100);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  const processAudio = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
    // Create a copy of the data
    const copy = new Float32Array(dataArrayRef.current.length);
    copy.set(dataArrayRef.current);
    setAudioData(copy);

    animationFrameRef.current = requestAnimationFrame(processAudio);
  }, []);

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
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

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      streamRef.current = stream;
      dataArrayRef.current = new Float32Array(analyser.fftSize);

      setSampleRate(audioContext.sampleRate);
      setIsActive(true);

      processAudio();
    } catch (error) {
      console.error("Failed to start audio:", error);
      throw error;
    }
  }, [processAudio]);

  const stopAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;

    setIsActive(false);
    setAudioData(null);
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return {
    isActive,
    audioData,
    sampleRate,
    startAudio,
    stopAudio,
  };
}
