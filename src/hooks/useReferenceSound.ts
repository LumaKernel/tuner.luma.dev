import { useState, useCallback, useRef, useEffect } from "react";

export type WaveformType = "sine" | "square" | "sawtooth" | "triangle";

export const WAVEFORM_LABELS: Record<WaveformType, string> = {
  sine: "サイン波",
  square: "矩形波",
  sawtooth: "のこぎり波",
  triangle: "三角波",
};

type ReferenceSoundState = {
  readonly isPlaying: boolean;
  readonly frequency: number;
  readonly waveform: WaveformType;
  readonly volume: number;
  readonly setFrequency: (frequency: number) => void;
  readonly setWaveform: (waveform: WaveformType) => void;
  readonly setVolume: (volume: number) => void;
  readonly start: () => void;
  readonly stop: () => void;
  readonly toggle: () => void;
};

type AudioResources = {
  readonly audioContext: AudioContext;
  readonly oscillator: OscillatorNode;
  readonly gainNode: GainNode;
};

export function useReferenceSound(
  initialFrequency = 440,
  initialWaveform: WaveformType = "sine",
  initialVolume = 0.3,
  muted = false,
): ReferenceSoundState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequency, setFrequencyState] = useState(initialFrequency);
  const [waveform, setWaveformState] = useState<WaveformType>(initialWaveform);
  const [volume, setVolumeState] = useState(initialVolume);

  const resourcesRef = useRef<AudioResources | null>(null);

  const stop = useCallback(() => {
    const resources = resourcesRef.current;
    if (!resources) return;

    // Fade out to avoid clicks
    const now = resources.audioContext.currentTime;
    resources.gainNode.gain.setValueAtTime(resources.gainNode.gain.value, now);
    resources.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    // Stop after fade
    setTimeout(() => {
      resources.oscillator.stop();
      void resources.audioContext.close();
      resourcesRef.current = null;
    }, 60);

    setIsPlaying(false);
  }, []);

  const start = useCallback(() => {
    // Stop any existing sound
    if (resourcesRef.current) {
      resourcesRef.current.oscillator.stop();
      void resourcesRef.current.audioContext.close();
      resourcesRef.current = null;
    }

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    // Apply effective volume (0 if muted)
    const effectiveVolume = muted ? 0 : volume;

    // Start with fade in to avoid clicks (use 0.001 minimum for exponential ramp)
    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      Math.max(effectiveVolume, 0.001),
      audioContext.currentTime + 0.05,
    );
    // If muted, immediately set to 0 after the ramp
    if (muted) {
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.05);
    }

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();

    resourcesRef.current = {
      audioContext,
      oscillator,
      gainNode,
    };

    setIsPlaying(true);
  }, [frequency, waveform, volume, muted]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  const setFrequency = useCallback((newFrequency: number) => {
    setFrequencyState(newFrequency);
    const resources = resourcesRef.current;
    if (resources) {
      resources.oscillator.frequency.setValueAtTime(
        newFrequency,
        resources.audioContext.currentTime,
      );
    }
  }, []);

  const setWaveform = useCallback((newWaveform: WaveformType) => {
    setWaveformState(newWaveform);
    const resources = resourcesRef.current;
    if (resources) {
      resources.oscillator.type = newWaveform;
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    // gain is updated via useEffect to avoid duplication
  }, []);

  // Apply volume and muted state changes to gain (single source of truth)
  useEffect(() => {
    const resources = resourcesRef.current;
    if (resources) {
      const effectiveVolume = muted ? 0 : volume;
      resources.gainNode.gain.setValueAtTime(
        effectiveVolume,
        resources.audioContext.currentTime,
      );
    }
  }, [muted, volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const resources = resourcesRef.current;
      if (resources) {
        resources.oscillator.stop();
        void resources.audioContext.close();
      }
    };
  }, []);

  return {
    isPlaying,
    frequency,
    waveform,
    volume,
    setFrequency,
    setWaveform,
    setVolume,
    start,
    stop,
    toggle,
  };
}
