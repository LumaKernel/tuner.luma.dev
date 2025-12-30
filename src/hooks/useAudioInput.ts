import { useState, useCallback, useRef } from "react";

const BUFFER_SIZE = 2048;

type StereoAudioData = {
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly mono: Float32Array;
};

type AudioInputState = {
  readonly isActive: boolean;
  readonly audioData: Float32Array | null;
  readonly stereoData: StereoAudioData | null;
  readonly sampleRate: number;
  readonly startAudio: (deviceId?: string) => Promise<void>;
};

// Audio resources that need cleanup
type AudioResources = {
  readonly audioContext: AudioContext;
  readonly analyser: AnalyserNode;
  readonly leftAnalyser: AnalyserNode;
  readonly rightAnalyser: AnalyserNode;
  readonly stream: MediaStream;
  readonly dataArray: Float32Array<ArrayBuffer>;
  readonly leftDataArray: Float32Array<ArrayBuffer>;
  readonly rightDataArray: Float32Array<ArrayBuffer>;
  animationFrameId: number | null;
};

export function useAudioInput(): AudioInputState {
  const [isActive, setIsActive] = useState(false);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [stereoData, setStereoData] = useState<StereoAudioData | null>(null);
  const [sampleRate, setSampleRate] = useState(44100);

  const resourcesRef = useRef<AudioResources | null>(null);

  const stopAudio = useCallback(() => {
    const resources = resourcesRef.current;
    if (!resources) return;

    if (resources.animationFrameId !== null) {
      cancelAnimationFrame(resources.animationFrameId);
    }

    resources.stream.getTracks().forEach((track) => {
      track.stop();
    });
    void resources.audioContext.close();

    resourcesRef.current = null;
    setIsActive(false);
    setAudioData(null);
    setStereoData(null);
  }, []);

  const startAudio = useCallback(
    async (deviceId?: string) => {
      // Stop any existing audio first
      stopAudio();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2, // Request stereo input
        },
      });

      const audioContext = new AudioContext();

      // Main analyser for pitch detection (mono)
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = BUFFER_SIZE;
      analyser.smoothingTimeConstant = 0;

      // Create analysers for left and right channels
      const leftAnalyser = audioContext.createAnalyser();
      leftAnalyser.fftSize = BUFFER_SIZE;
      leftAnalyser.smoothingTimeConstant = 0.3; // Smooth for visual display

      const rightAnalyser = audioContext.createAnalyser();
      rightAnalyser.fftSize = BUFFER_SIZE;
      rightAnalyser.smoothingTimeConstant = 0.3;

      const source = audioContext.createMediaStreamSource(stream);

      // Connect source to mono analyser
      source.connect(analyser);

      // Create channel splitter for stereo analysis
      const channelSplitter = audioContext.createChannelSplitter(2);
      source.connect(channelSplitter);
      channelSplitter.connect(leftAnalyser, 0);
      channelSplitter.connect(rightAnalyser, 1);

      const dataArray = new Float32Array(analyser.fftSize);
      const leftDataArray = new Float32Array(leftAnalyser.fftSize);
      const rightDataArray = new Float32Array(rightAnalyser.fftSize);

      const resources: AudioResources = {
        audioContext,
        analyser,
        leftAnalyser,
        rightAnalyser,
        stream,
        dataArray,
        leftDataArray,
        rightDataArray,
        animationFrameId: null,
      };

      resourcesRef.current = resources;
      setSampleRate(audioContext.sampleRate);
      setIsActive(true);

      // Start audio processing loop
      const processAudio = () => {
        const currentResources = resourcesRef.current;
        if (!currentResources) return;

        // Get mono data for pitch detection
        currentResources.analyser.getFloatTimeDomainData(
          currentResources.dataArray,
        );

        // Get stereo data for volume display
        currentResources.leftAnalyser.getFloatTimeDomainData(
          currentResources.leftDataArray,
        );
        currentResources.rightAnalyser.getFloatTimeDomainData(
          currentResources.rightDataArray,
        );

        // Create copies of the data
        const monoCopy = new Float32Array(currentResources.dataArray.length);
        monoCopy.set(currentResources.dataArray);
        setAudioData(monoCopy);

        const leftCopy = new Float32Array(
          currentResources.leftDataArray.length,
        );
        leftCopy.set(currentResources.leftDataArray);

        const rightCopy = new Float32Array(
          currentResources.rightDataArray.length,
        );
        rightCopy.set(currentResources.rightDataArray);

        setStereoData({
          left: leftCopy,
          right: rightCopy,
          mono: monoCopy,
        });

        currentResources.animationFrameId = requestAnimationFrame(processAudio);
      };

      processAudio();
    },
    [stopAudio],
  );

  return {
    isActive,
    audioData,
    stereoData,
    sampleRate,
    startAudio,
  };
}
