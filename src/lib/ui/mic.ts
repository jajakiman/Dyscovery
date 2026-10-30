// ponytail: fixed RMS threshold; calibrate per device (noise floor sampling) if quiet readers get flagged.
export const SILENCE_RMS = 0.02;
export const MIN_RECORDING_MS = 1000;
export const SILENCE_WARN_MS = 4000;

export function rms(samples: Float32Array) {
  let sum = 0;
  for (const v of samples) sum += v * v;
  return samples.length ? Math.sqrt(sum / samples.length) : 0;
}

export function micVerdict(durationMs: number, peak: number): "ok" | "short" | "silent" {
  if (durationMs < MIN_RECORDING_MS) return "short";
  return peak < SILENCE_RMS ? "silent" : "ok";
}
