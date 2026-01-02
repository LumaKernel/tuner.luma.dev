// ============================================================================
// BPM Constants
// ============================================================================

export const BPM_MIN = 20;
export const BPM_MAX = 999;
export const BPM_SLIDER_MAX = 300; // Slider uses lower max for usability
export const BPM_DEFAULT = 120;
export const BPM_PRESETS_DEFAULT: readonly number[] = [
  80, 90, 100, 110, 120, 140,
];

// ============================================================================
// Volume Constants
// ============================================================================

export const VOLUME_MIN = 0;
export const VOLUME_MAX = 1;
export const VOLUME_STEP = 0.01;
export const VOLUME_DEFAULT_REFERENCE = 0.3;
export const VOLUME_DEFAULT_METRONOME = 0.5;

// ============================================================================
// MIDI Constants
// ============================================================================

export const MIDI_NOTES_PER_OCTAVE = 12;
export const MIDI_C2 = 36; // C2 MIDI note number
export const MIDI_A4 = 69; // A4 (440Hz reference) MIDI note number
export const MIDI_OCTAVE_OFFSET = 1; // Offset for octave calculation

// ============================================================================
// Metronome Audio Constants
// ============================================================================

export const METRONOME_SCHEDULE_AHEAD_TIME = 0.1; // seconds
export const METRONOME_SCHEDULER_INTERVAL = 25; // milliseconds
export const METRONOME_CLICK_FREQUENCY = 1000; // Hz
export const METRONOME_CLICK_ATTACK = 0.001; // seconds
export const METRONOME_CLICK_DECAY = 0.05; // seconds
export const METRONOME_BEATS_PER_MEASURE = 4;

// ============================================================================
// Audio Capture Constants
// ============================================================================

export const AUDIO_BUFFER_SIZE = 2048;
export const PITCH_HISTORY_DURATION_MS = 30000;
export const PITCH_MIN_FREQUENCY = 60; // Hz
export const PITCH_MAX_FREQUENCY = 2000; // Hz
export const PITCH_DETECTION_THRESHOLD = 0.1;
export const PITCH_TIMEOUT_MS = 200;
export const DEFAULT_SAMPLE_RATE = 44100;
export const DEFAULT_NOISE_GATE_THRESHOLD = 0.01;

// ============================================================================
// Stereo Detection Constants
// ============================================================================

export const STEREO_CHECK_FRAMES = 10;
export const STEREO_SAMPLE_COUNT = 200;
export const STEREO_DETECTION_THRESHOLD = 0.005;
export const STEREO_SAMPLE_INTERVAL = 5;
export const STEREO_DIFF_RATIO = 50; // 1/50 = 2% of samples must differ

// ============================================================================
// Analyser Constants
// ============================================================================

export const ANALYSER_SMOOTHING_STEREO = 0.3;
export const ANALYSER_SMOOTHING_PITCH = 0;

// ============================================================================
// Note Range Constants
// ============================================================================

export const NOTE_RANGE_START = MIDI_C2; // C2
export const NOTE_RANGE_COUNT = 61; // C2 to C7 (61 notes)
