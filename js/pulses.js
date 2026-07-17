// Pure helpers for pulse timing and canvas-only packet visualization.
// Optical path lengths are expressed in millimetres and time in nanoseconds.

export const C_MM_PER_NS = 299.792458;

const positiveMod = (value, modulus) => ((value % modulus) + modulus) % modulus;

function gateOpen(gate, emissionTimeNs) {
  if (!Number.isFinite(gate?.opl) || !Number.isFinite(emissionTimeNs)) return true;
  const frequencyMHz = Math.min(1e6, Math.max(0.000001, gate.frequencyMHz || 1));
  const periodNs = 1000 / frequencyMHz;
  const duty = Math.min(1, Math.max(0, gate.duty ?? 0.5));
  const arrivalNs = emissionTimeNs + gate.opl / C_MM_PER_NS;
  return positiveMod(arrivalNs - (gate.phaseNs || 0), periodNs) < periodNs * duty;
}

// Average passage of a discrete pulse train through every temporal gate on its
// path. Sampling emitted pulses (rather than multiplying gate duties) preserves
// phase relationships: aligned gates pass together and opposed gates extinguish.
export function pulseGateTransmission(pulse, sampleCount = 4096) {
  const gates = Array.isArray(pulse?.gates) ? pulse.gates.filter(g => Number.isFinite(g?.opl)) : [];
  if (!gates.length) return 1;
  const repRateMHz = Math.min(1e6, Math.max(0.001, pulse.repRateMHz || 80));
  const periodNs = 1000 / repRateMHz;
  const phaseNs = Number.isFinite(pulse.phaseNs) ? pulse.phaseNs : 0;
  const slowestGatePeriodNs = Math.max(...gates.map(g => 1000 / Math.min(1e6, Math.max(0.000001, g.frequencyMHz || 1))));
  const pulsesPerSlowCycle = Math.max(1, Math.ceil(slowestGatePeriodNs / periodNs));
  const slowCycleSamples = pulsesPerSlowCycle * 64;
  const count = Math.min(16384, Math.max(64, Math.round(sampleCount) || 4096, slowCycleSamples));
  const sampledPulseSpan = Math.max(count, slowCycleSamples);
  let passed = 0;
  for (let i = 0; i < count; i++) {
    // When a gate cycle contains more pulses than the bounded sample count,
    // distribute integer pulse indices across 64 slow cycles instead of only
    // examining the tiny initial fraction of the waveform.
    const k = sampledPulseSpan === count ? i : Math.floor(i * sampledPulseSpan / count);
    const emissionTimeNs = phaseNs + k * periodNs;
    if (gates.every(gate => gateOpen(gate, emissionTimeNs))) passed++;
  }
  return passed / count;
}

function finiteTrack(track) {
  return track && Array.isArray(track.pts) && Array.isArray(track.opls)
    && track.pts.length >= 2 && track.pts.length === track.opls.length
    && track.pts.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    && track.opls.every(Number.isFinite);
}

// Interpolate a world-space point at an absolute optical path length.
export function pointAtOpticalPath(track, target) {
  if (!finiteTrack(track) || !Number.isFinite(target)) return null;
  const opls = track.opls;
  if (target < opls[0] - 1e-9 || target > opls.at(-1) + 1e-9) return null;
  for (let i = 0; i < opls.length - 1; i++) {
    const a = opls[i], b = opls[i + 1];
    if (target > b + 1e-9) continue;
    const span = b - a;
    const t = span > 1e-12 ? Math.min(1, Math.max(0, (target - a) / span)) : 0;
    const p = track.pts[i], q = track.pts[i + 1];
    const dx = q.x - p.x, dy = q.y - p.y;
    return {
      x: p.x + dx * t,
      y: p.y + dy * t,
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
    };
  }
  return null;
}

// Packet centres visible on one traced path at the requested simulation time.
// In physical mode, spacing and packet length use cT and c*tau. Schematic mode
// intentionally uses a fixed workbench-scale spacing while detector timing
// remains physical; the UI labels that distinction explicitly.
export function pulseMarkers(track, timeNs, {
  mode = 'schematic',
  schematicSpacingMm = 140,
  schematicWidthMm = 12,
  maxMarkers = 80,
} = {}) {
  if (!finiteTrack(track) || !track.pulse || !Number.isFinite(timeNs)) return [];
  const repRateMHz = Math.min(1e6, Math.max(0.001, track.pulse.repRateMHz || 80));
  const pulseWidthFs = Math.min(1e9, Math.max(1, track.pulse.pulseWidthFs || 100));
  const periodNs = 1000 / repRateMHz;
  const physical = mode === 'physical';
  const spacing = physical ? C_MM_PER_NS * periodNs : Math.max(20, schematicSpacingMm);
  const speed = physical ? C_MM_PER_NS : spacing / periodNs;
  const width = physical ? C_MM_PER_NS * pulseWidthFs * 1e-6 : Math.max(2, schematicWidthMm);
  const phaseNs = Number.isFinite(track.pulse.phaseNs) ? track.pulse.phaseNs : 0;
  const phase = positiveMod((timeNs - phaseNs) * speed, spacing);
  const lo = track.opls[0], hi = track.opls.at(-1);
  const k0 = Math.ceil((lo - phase) / spacing);
  const k1 = Math.floor((hi - phase) / spacing);
  const count = Math.max(0, k1 - k0 + 1);
  // Extremely dense physical trains are sampled across the whole path. Keeping
  // only the last packets makes the visible workbench look empty near the source.
  const stride = count > maxMarkers ? Math.ceil(count / maxMarkers) : 1;
  const markers = [];
  for (let k = k0; k <= k1 && markers.length < maxMarkers; k += stride) {
    const opl = phase + k * spacing;
    const emissionTimeNs = timeNs - opl / speed;
    const blocked = (track.pulse.gates || []).some(gate => opl >= gate.opl && !gateOpen(gate, emissionTimeNs));
    if (blocked) continue;
    const point = pointAtOpticalPath(track, opl);
    if (point) markers.push({ ...point, opl, widthMm: width, physicalWidthMm: C_MM_PER_NS * pulseWidthFs * 1e-6 });
  }
  return markers;
}
