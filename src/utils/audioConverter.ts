import { Mp3Encoder } from "@breezystack/lamejs";
import {
  type AudioFormat,
  AUDIO_FORMAT_EXTENSIONS,
  AUDIO_FORMAT_MIME_TYPES,
} from "@/types";

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

// Convert AudioBuffer to MP3 Blob
function audioBufferToMp3(buffer: AudioBuffer): Blob {
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

// Check if format requires conversion (not directly supported by MediaRecorder)
function requiresConversion(format: AudioFormat): boolean {
  return format === "wav" || format === "mp3";
}

// Get extension from blob's MIME type
function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp3") || mimeType.includes("mpeg")) return "mp3";
  return "audio";
}

// Convert audio blob to specified format
export async function convertAudioBlob(
  blob: Blob,
  format: AudioFormat,
): Promise<{ readonly blob: Blob; readonly extension: string }> {
  // For "auto" or native formats that match the blob, return as-is
  if (format === "auto" || !requiresConversion(format)) {
    // Check if the format matches the blob's type
    const mimeType = AUDIO_FORMAT_MIME_TYPES[format];
    if (
      format === "auto" ||
      blob.type === mimeType ||
      blob.type.includes(format.replace("-opus", ""))
    ) {
      return {
        blob,
        extension: getExtensionFromMimeType(blob.type),
      };
    }
    // For native formats that don't match, still return original
    // (conversion between native formats not supported)
    return {
      blob,
      extension: getExtensionFromMimeType(blob.type),
    };
  }

  // Decode the original audio for conversion
  const audioBuffer = await decodeAudioBlob(blob);

  if (format === "wav") {
    return {
      blob: audioBufferToWav(audioBuffer),
      extension: AUDIO_FORMAT_EXTENSIONS.wav,
    };
  }

  if (format === "mp3") {
    return {
      blob: audioBufferToMp3(audioBuffer),
      extension: AUDIO_FORMAT_EXTENSIONS.mp3,
    };
  }

  // Fallback
  return { blob, extension: getExtensionFromMimeType(blob.type) };
}

// Get list of supported formats for the current browser
export function getSupportedFormats(): readonly AudioFormat[] {
  const formats: AudioFormat[] = ["auto"];

  // Check MediaRecorder support for native formats
  const nativeFormats: readonly AudioFormat[] = [
    "webm-opus",
    "webm",
    "ogg-opus",
    "mp4",
  ];

  for (const format of nativeFormats) {
    const mimeType = AUDIO_FORMAT_MIME_TYPES[format];
    if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
      formats.push(format);
    }
  }

  // WAV and MP3 are always available (converted from any format)
  formats.push("wav", "mp3");

  return formats;
}
