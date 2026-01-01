import { type AudioFormat, AUDIO_FORMAT_EXTENSIONS } from "@/types";

// Decode audio blob to AudioBuffer
async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    return await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    await audioContext.close();
  }
}

// Convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  // Get channel data
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  const numSamples = buffer.length;
  const dataSize = numSamples * blockAlign;
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

  // Write interleaved audio data
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

// Convert Float32Array to Int16Array
function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return int16Array;
}

// Convert AudioBuffer to MP3 Blob (dynamically imports lamejs)
async function audioBufferToMp3(buffer: AudioBuffer): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");

  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const kbps = 128;

  const mp3Encoder = new Mp3Encoder(numChannels, sampleRate, kbps);
  const mp3Data: ArrayBuffer[] = [];

  const left = floatTo16BitPCM(buffer.getChannelData(0));
  const right =
    numChannels > 1 ? floatTo16BitPCM(buffer.getChannelData(1)) : undefined;

  // Encode in chunks
  const chunkSize = 1152;
  for (let i = 0; i < left.length; i += chunkSize) {
    const leftChunk = left.subarray(i, i + chunkSize);
    const rightChunk = right?.subarray(i, i + chunkSize);

    const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      // Copy to new ArrayBuffer for Blob compatibility
      const copy = new ArrayBuffer(mp3buf.length);
      new Int8Array(copy).set(mp3buf);
      mp3Data.push(copy);
    }
  }

  // Flush remaining data
  const mp3buf = mp3Encoder.flush();
  if (mp3buf.length > 0) {
    const copy = new ArrayBuffer(mp3buf.length);
    new Int8Array(copy).set(mp3buf);
    mp3Data.push(copy);
  }

  return new Blob(mp3Data, { type: "audio/mp3" });
}

// Convert audio blob to specified format
export async function convertAudioBlob(
  blob: Blob,
  format: AudioFormat,
): Promise<{ readonly blob: Blob; readonly extension: string }> {
  // WAV: return as-is if already WAV, otherwise decode and convert
  if (format === "wav") {
    if (blob.type === "audio/wav") {
      return { blob, extension: AUDIO_FORMAT_EXTENSIONS.wav };
    }
    const audioBuffer = await decodeAudioBlob(blob);
    return {
      blob: audioBufferToWav(audioBuffer),
      extension: AUDIO_FORMAT_EXTENSIONS.wav,
    };
  }

  // MP3: always decode and encode
  const audioBuffer = await decodeAudioBlob(blob);
  return {
    blob: await audioBufferToMp3(audioBuffer),
    extension: AUDIO_FORMAT_EXTENSIONS.mp3,
  };
}

// Get list of supported formats for download
// Note: Recording is always saved as WAV internally.
// Only WAV and MP3 are available for download conversion.
export function getSupportedFormats(): readonly AudioFormat[] {
  // WAV is the native format, MP3 is converted via lamejs
  return ["wav", "mp3"] as const;
}
