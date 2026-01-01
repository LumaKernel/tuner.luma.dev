import { useRef, useCallback, useEffect } from "react";
import { get, set } from "idb-keyval";
import type { Recording, PitchHistoryEntry } from "@/types";

const EXPIRATION_DAYS = 7;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Convert Float32Array samples to WAV Blob
function samplesToWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // WAV header
  writeString(0, "RIFF");
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Write audio data
  let offset = 44;
  for (const sample of samples) {
    const clampedSample = Math.max(-1, Math.min(1, sample));
    const intSample = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

type RecordingBufferResult = {
  readonly saveRecording: () => Promise<string | null>;
};

export function useRecordingBuffer(
  stream: MediaStream | null,
  bufferDurationSeconds: number,
): RecordingBufferResult {
  // Web Audio API refs for PCM capture
  // Note: ScriptProcessorNode is deprecated but AudioWorkletNode requires a separate
  // worker file. For simplicity, we use ScriptProcessorNode for now.
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Ring buffer of PCM samples
  const ringBufferRef = useRef<Float32Array[]>([]);
  const totalSamplesRef = useRef<number>(0);
  const sampleRateRef = useRef<number>(44100);
  const maxSamplesRef = useRef<number>(0);

  const pitchHistoryRef = useRef<readonly PitchHistoryEntry[]>([]);

  // Setup Web Audio API capture when stream changes
  useEffect(() => {
    if (!stream) {
      // Cleanup when stream is removed
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
      ringBufferRef.current = [];
      totalSamplesRef.current = 0;
      return;
    }

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    sampleRateRef.current = audioContext.sampleRate;
    maxSamplesRef.current = bufferDurationSeconds * audioContext.sampleRate;

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    // ScriptProcessorNode is deprecated but AudioWorkletNode requires more setup
    // Using 4096 buffer size for balance between latency and performance
    const bufferSize = 4096;
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    processorRef.current = processor;

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    processor.onaudioprocess = (e) => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const inputData = e.inputBuffer.getChannelData(0);
      // Copy the data (inputData is reused by the browser)
      const copy = new Float32Array(inputData.length);
      copy.set(inputData);

      ringBufferRef.current.push(copy);
      totalSamplesRef.current += copy.length;

      // Trim old samples to maintain buffer duration
      while (
        totalSamplesRef.current > maxSamplesRef.current &&
        ringBufferRef.current.length > 0
      ) {
        const removed = ringBufferRef.current.shift();
        if (removed) {
          totalSamplesRef.current -= removed.length;
        }
      }
    };

    source.connect(processor);
    // Connect to destination (required for ScriptProcessorNode to work)
    // Use a gain node with 0 volume to prevent audio feedback
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    return () => {
      processor.disconnect();
      silentGain.disconnect();
      source.disconnect();
      void audioContext.close();
    };
  }, [stream, bufferDurationSeconds]);

  const saveRecording = useCallback(async (): Promise<string | null> => {
    const chunks = ringBufferRef.current;
    if (chunks.length === 0) {
      return null;
    }

    // Concatenate all samples from ring buffer
    const totalLength = chunks.reduce((acc, arr) => acc + arr.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const arr of chunks) {
      combined.set(arr, offset);
      offset += arr.length;
    }

    // Create WAV blob
    const audioBlob = samplesToWav(combined, sampleRateRef.current);

    const now = Date.now();
    const id = generateId();

    // Calculate actual duration from samples
    const duration = totalLength / sampleRateRef.current;

    const recording: Recording = {
      id,
      createdAt: now,
      expiresAt: now + EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
      duration,
      mimeType: "audio/wav",
      audioBlob,
      pitchData: pitchHistoryRef.current,
    };

    try {
      await set(`recording-${id}`, recording);

      // Update recording list
      const listKey = "recording-list";
      const existingList = await get<string[]>(listKey);
      const list = existingList ?? [];
      list.push(id);
      await set(listKey, list);

      return id;
    } catch (error) {
      console.error("Failed to save recording:", error);
      return null;
    }
  }, []);

  return { saveRecording };
}
