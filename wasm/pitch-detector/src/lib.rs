use wasm_bindgen::prelude::*;

#[cfg(feature = "console_error_panic_hook")]
use console_error_panic_hook;

const MIN_FREQUENCY: f32 = 60.0;
const MAX_FREQUENCY: f32 = 2000.0;
const DEFAULT_THRESHOLD: f32 = 0.1;

#[wasm_bindgen]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// YIN pitch detection algorithm
/// Returns the detected frequency in Hz, or -1.0 if no pitch detected
#[wasm_bindgen]
pub fn detect_pitch(samples: &[f32], sample_rate: f32) -> f32 {
    detect_pitch_with_threshold(samples, sample_rate, DEFAULT_THRESHOLD)
}

/// YIN pitch detection with custom threshold
#[wasm_bindgen]
pub fn detect_pitch_with_threshold(samples: &[f32], sample_rate: f32, threshold: f32) -> f32 {
    let buffer_size = samples.len();
    if buffer_size < 2 {
        return -1.0;
    }

    let half_buffer_size = buffer_size / 2;

    // Check if signal has enough energy
    let rms = calculate_rms(samples);
    if rms < 0.01 {
        return -1.0;
    }

    // Step 1: Difference function
    let mut difference = vec![0.0f32; half_buffer_size];
    for tau in 0..half_buffer_size {
        let mut sum = 0.0f32;
        for i in 0..half_buffer_size {
            let delta = samples[i] - samples[i + tau];
            sum += delta * delta;
        }
        difference[tau] = sum;
    }

    // Step 2: Cumulative mean normalized difference function (CMNDF)
    let mut cmndf = vec![0.0f32; half_buffer_size];
    cmndf[0] = 1.0;
    let mut running_sum = 0.0f32;

    for tau in 1..half_buffer_size {
        running_sum += difference[tau];
        if running_sum > 0.0 {
            cmndf[tau] = difference[tau] * (tau as f32) / running_sum;
        } else {
            cmndf[tau] = 1.0;
        }
    }

    // Step 3: Absolute threshold - find first tau where CMNDF < threshold
    let mut tau_estimate: Option<usize> = None;
    for tau in 2..half_buffer_size {
        if cmndf[tau] < threshold {
            // Find the local minimum
            let mut min_tau = tau;
            while min_tau + 1 < half_buffer_size && cmndf[min_tau + 1] < cmndf[min_tau] {
                min_tau += 1;
            }
            tau_estimate = Some(min_tau);
            break;
        }
    }

    let tau = match tau_estimate {
        Some(t) => t,
        None => return -1.0,
    };

    // Step 4: Parabolic interpolation for better precision
    let better_tau = if tau > 0 && tau < half_buffer_size - 1 {
        let s0 = cmndf[tau - 1];
        let s1 = cmndf[tau];
        let s2 = cmndf[tau + 1];
        let denominator = 2.0 * s1 - s2 - s0;
        if denominator.abs() > f32::EPSILON {
            (tau as f32) + (s2 - s0) / (2.0 * denominator)
        } else {
            tau as f32
        }
    } else {
        tau as f32
    };

    // Calculate frequency
    let frequency = sample_rate / better_tau;

    // Validate frequency range
    if frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY {
        return -1.0;
    }

    frequency
}

/// Calculate RMS (Root Mean Square) of the signal
#[wasm_bindgen]
pub fn calculate_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }

    let sum: f32 = samples.iter().map(|&x| x * x).sum();
    (sum / samples.len() as f32).sqrt()
}

/// Calculate the clarity/confidence of the pitch detection
/// Returns a value between 0.0 (low confidence) and 1.0 (high confidence)
#[wasm_bindgen]
pub fn get_pitch_clarity(samples: &[f32], sample_rate: f32) -> f32 {
    let buffer_size = samples.len();
    if buffer_size < 2 {
        return 0.0;
    }

    let half_buffer_size = buffer_size / 2;

    // Calculate autocorrelation
    let mut max_correlation = 0.0f32;
    let mut zero_lag_correlation = 0.0f32;

    // Zero-lag correlation (normalization factor)
    for i in 0..half_buffer_size {
        zero_lag_correlation += samples[i] * samples[i];
    }

    if zero_lag_correlation < f32::EPSILON {
        return 0.0;
    }

    // Find max correlation in valid frequency range
    let min_tau = (sample_rate / MAX_FREQUENCY) as usize;
    let max_tau = ((sample_rate / MIN_FREQUENCY) as usize).min(half_buffer_size);

    for tau in min_tau..max_tau {
        let mut correlation = 0.0f32;
        for i in 0..(half_buffer_size - tau) {
            correlation += samples[i] * samples[i + tau];
        }
        if correlation > max_correlation {
            max_correlation = correlation;
        }
    }

    // Normalize and clamp
    (max_correlation / zero_lag_correlation).clamp(0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f32::consts::PI;

    fn generate_sine_wave(frequency: f32, sample_rate: f32, duration_samples: usize) -> Vec<f32> {
        (0..duration_samples)
            .map(|i| (2.0 * PI * frequency * (i as f32) / sample_rate).sin())
            .collect()
    }

    #[test]
    fn test_detect_440hz() {
        let sample_rate = 44100.0;
        let samples = generate_sine_wave(440.0, sample_rate, 2048);
        let detected = detect_pitch(&samples, sample_rate);
        assert!(
            (detected - 440.0).abs() < 5.0,
            "Expected ~440Hz, got {}",
            detected
        );
    }

    #[test]
    fn test_detect_220hz() {
        let sample_rate = 44100.0;
        let samples = generate_sine_wave(220.0, sample_rate, 2048);
        let detected = detect_pitch(&samples, sample_rate);
        assert!(
            (detected - 220.0).abs() < 5.0,
            "Expected ~220Hz, got {}",
            detected
        );
    }

    #[test]
    fn test_silence() {
        let samples = vec![0.0f32; 2048];
        let detected = detect_pitch(&samples, 44100.0);
        assert_eq!(detected, -1.0, "Expected -1.0 for silence");
    }

    #[test]
    fn test_rms() {
        let samples = vec![1.0, -1.0, 1.0, -1.0];
        let rms = calculate_rms(&samples);
        assert!((rms - 1.0).abs() < 0.01);
    }
}
