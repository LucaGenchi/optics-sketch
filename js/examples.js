// Pre-made educational example setups, loadable from the toolbar dropdown.
// Every scene is dimensioned so the live ray trace demonstrates the physics
// (image distances, afocal spacing, stop clipping, deviation angles...).

import { createElement } from './elements.js';

function mk(type, x, y, rot = 0, params = {}, extra = {}) {
  const e = createElement(type, x, y);
  e.rot = rot;
  Object.assign(e.params, params);
  Object.assign(e, extra);
  return e;
}

// free-text annotation
function tl(text, x, y, fontSize = 11, fill = '#555555') {
  return mk('textlabel', x, y, 0, { text, fontSize, fill });
}

// multi-line annotation: textlabel has no line-break support, so stack
// several single-line labels instead
function tls(lines, x, y, fontSize = 11, fill = '#555555') {
  return lines.map((line, i) => tl(line, x, y + i * (fontSize + 3), fontSize, fill));
}

const bid = () => 'b' + Math.random().toString(36).slice(2, 9);

export const examples = [

  {
    name: 'Keplerian telescope (beam expander)',
    group: 'Camera Obscura — Image Formation & Photography',
    build: () => ({
      elements: [
        tl('Keplerian telescope — afocal: lenses spaced f₁ + f₂, parallel in → parallel out', 420, 100, 14, '#333'),
        mk('laser', 80, 240, 0, { wavelength: 532, beamMode: 'beam', beamWidth: 24 }, { label: 'collimated input, Ø 24 mm', showLabel: true }),
        mk('lens', 300, 240, 0, { f: 150, dia: 50.8 }, { label: 'L1  f = 150 mm', showLabel: true }),
        mk('slit', 450, 240, 0, { gap: 8, length: 50.8 }, { label: 'field stop at shared focus', showLabel: true }),
        mk('lens', 500, 240, 0, { f: 50, dia: 25.4 }, { label: 'L2  f = 50 mm', showLabel: true, labelPos: 't' }),
        tl('output: Ø 8 mm, still collimated (×f₂/f₁)', 680, 190, 11),
        mk('eye', 700, 240, 0, {}, { label: 'relaxed eye focuses it on the retina', showLabel: true }),
      ],
      beams: [],
    }),
  },

  {
    name: 'Compound microscope',
    group: 'Camera Obscura — Image Formation & Photography',
    build: () => ({
      elements: [
        tl('Compound microscope — objective forms a real ×2 intermediate image, eyepiece re-images it to ∞', 430, 140, 14, '#333'),
        mk('objarrow', 120, 260, 0, { height: 6, shape: 'F', raysMode: 'fan', spread: 10, nrays: 3, showImage: true, wavelength: 600 }, { label: 'specimen (dₒ = 60)', showLabel: true }),
        mk('lens', 180, 260, 0, { f: 40, dia: 50.8 }, { label: 'objective  f = 40', showLabel: true }),
        tl('intermediate image (inverted, ×2)', 300, 330, 10),
        mk('lens', 360, 260, 0, { f: 60, dia: 50.8 }, { label: 'eyepiece  f = 60', showLabel: true }),
        tl('collimated bundle at the field angle', 470, 200, 10),
        mk('eye', 500, 253, -11, {}, { label: 'eye', showLabel: true, labelPos: 'r' }),
      ],
      beams: [],
    }),
  },

  {
    name: 'Camera with aperture stop',
    group: 'Camera Obscura — Image Formation & Photography',
    build: () => ({
      elements: [
        tl('Camera — the iris clips marginal rays: f-number, brightness and depth of field', 430, 170, 14, '#333'),
        mk('objarrow', 80, 300, 0, { height: 22, raysMode: 'fan', spread: 20, nrays: 7, showImage: true, wavelength: 620 }, { label: 'object (dₒ = 220)', showLabel: true }),
        mk('slit', 272, 300, 0, { gap: 26, length: 130 }, { label: 'iris (aperture stop)', showLabel: true, labelPos: 't' }),
        mk('lens', 300, 300, 0, { f: 80, dia: 50.8 }, { label: 'f = 80 mm', showLabel: true }),
        mk('camera', 450, 300, 0, { ch: 44 }, { label: 'sensor at image plane (dᵢ ≈ 126)', showLabel: true }),
        tl('outer rays blocked by the stop', 230, 245, 10),
      ],
      beams: [],
    }),
  },

  {
    name: 'Camera: focus & depth of field',
    group: 'Camera Obscura — Image Formation & Photography',
    build: () => ({
      elements: [
        tl('Focus & depth of field — only objects at the focused distance image sharply on the sensor', 450, 150, 14, '#333'),
        mk('objarrow', 80, 300, 0, { height: 20, shape: 'tree', raysMode: 'fan', spread: 16, nrays: 7, showImage: true, wavelength: 620 }, { label: 'in focus (dₒ = 220)', showLabel: true }),
        mk('objarrow', 180, 300, 0, { height: 14, shape: 'arrow', raysMode: 'fan', spread: 16, nrays: 7, showImage: true, wavelength: 470 }, { label: 'too close (dₒ = 120)', showLabel: true, labelPos: 't' }),
        mk('slit', 272, 300, 0, { gap: 26, length: 130 }, { label: 'iris', showLabel: true }),
        mk('lens', 300, 300, 0, { f: 80, dia: 50.8 }, { label: 'f = 80 mm', showLabel: true, labelPos: 'b' }),
        mk('camera', 450, 300, 0, { ch: 50 }, { label: 'sensor', showLabel: true }),
        tl('red rays converge ON the sensor → sharp', 590, 245, 10),
        tl('blue rays would focus behind it (dᵢ = 240) → blur circle on the sensor', 600, 365, 10),
        tl('smaller iris → narrower cones → smaller blur circles → more depth of field', 330, 440, 10),
      ],
      beams: [],
    }),
  },

  {
    name: 'Concave mirror imaging',
    group: 'Camera Obscura — Image Formation & Photography',
    build: () => ({
      elements: [
        tl('Concave mirror — 1/f = 1/dₒ + 1/dᵢ with f = R/2:  dₒ = 300, f = 100  →  dᵢ = 150 (real, inverted)', 430, 170, 14, '#333'),
        mk('objarrow', 200, 300, 0, { height: 18, raysMode: 'fan', spread: 8, nrays: 3, showImage: false, wavelength: 550 }, { label: 'object (dₒ = 300)', showLabel: true }),
        mk('cmirror', 500, 300, 0, { f: 100, length: 76 }, { label: 'concave mirror  f = 100', showLabel: true }),
        tl('rays cross here: real image, ×0.5, inverted (dᵢ = 150)', 350, 370, 10),
        tl('× is the focal point (ƒ marks)', 400, 250, 9, '#b07a10'),
      ],
      beams: [],
    }),
  },

  {
    name: 'Prism dispersion (white light)',
    group: 'The Optics Bench — Laboratory Setups',
    build: () => ({
      elements: [
        tl('Prism dispersion — deviation D(λ) from n(λ): red bends less, blue bends more', 400, 110, 14, '#333'),
        mk('laser', 100, 200, 0, { bwMode: 'sc' }, { label: 'white light (supercontinuum)', showLabel: true }),
        mk('prism', 400, 206, 0, { apex: 55, psize: 50 }, { label: 'prism, apex 55°', showLabel: true, labelPos: 't' }),
        mk('box', 660, 405, 129, { text: '', w: 10, h: 150, behavior: 'block', fill: '#f2f3f5' }, { label: 'screen', showLabel: true, labelPos: 'r' }),
      ],
      beams: [],
    }),
  },

  {
    name: 'Linear laser cavity',
    group: 'The Optics Bench — Laboratory Setups',
    build: () => ({
      elements: [
        tl('Linear laser cavity — geometric cavity path (carrier interference is not simulated)', 420, 190, 14, '#333'),
        mk('mirror', 150, 300, 0, { length: 50.8 }, { label: 'HR mirror (R ≈ 100%)', showLabel: true }),
        mk('box', 400, 300, 0, { text: 'Gain medium', w: 90, h: 34, behavior: 'pass', fill: '#ffe1b0' }, {}),
        mk('mirror', 650, 300, 0, { length: 50.8 }, { label: 'output coupler (R ≈ 95%)', showLabel: true }),
        tl('⇄ counter-propagating cavity paths', 400, 260, 10),
        tl('output beam', 745, 270, 10),
      ],
      beams: [
        { id: bid(), kind: 'beam', pts: [{ x: 160, y: 300 }, { x: 640, y: 300 }], color: '#e02020', width: 3.5, dash: false, arrow: false },
        { id: bid(), kind: 'beam', pts: [{ x: 660, y: 300 }, { x: 830, y: 300 }], color: '#e02020', width: 2.5, dash: false, arrow: true },
      ],
    }),
  },

  {
    name: 'Michelson interferometer',
    group: 'The Optics Bench — Laboratory Setups',
    build: () => ({
      elements: [
        tl('Michelson interferometer — one beam, two arms, recombined at the same beamsplitter', 400, 40, 14, '#333'),
        mk('laser', 100, 300, 0, { wavelength: 633 }, { label: 'laser', showLabel: true }),
        mk('bs', 350, 300, 0, { ratio: 0.5 }, { label: '50/50 beamsplitter', showLabel: true }),
        mk('mirror', 600, 300, 0, { length: 25.4 }, { label: 'M1 (movable ⟷)', showLabel: true }),
        mk('mirror', 350, 120, 90, { length: 25.4 }, { label: 'M2', showLabel: true, labelPos: 't' }),
        mk('detector', 350, 500, 90, {}, { label: 'recombined power detector', showLabel: true }),
        tl('paths recombine here; phase and fringes are outside this tracer', 620, 460, 10),
      ],
      beams: [],
    }),
  },

  {
    name: 'Scheimpflug principle (tilted focus plane)',
    group: 'Camera Obscura — Image Formation & Photography',
    build: () => ({
      elements: [
        tl('Scheimpflug principle — a tilted object plane images to a correspondingly tilted (sharp) image plane', 380, 100, 14, '#333'),
        mk('lens', 500, 250, 0, { f: 80, dia: 90 }, { label: 'lens  f = 80', showLabel: true, labelPos: 'b' }),
        mk('objarrow', 350, 225, 0, { height: 8, shape: 'arrow', raysMode: 'none', showImage: true, wavelength: 520 }, { label: 'near (dₒ = 150)', showLabel: true, labelPos: 't' }),
        mk('objarrow', 300, 250, 0, { height: 8, shape: 'arrow', raysMode: 'none', showImage: true, wavelength: 520 }, { label: 'mid (dₒ = 200)', showLabel: true }),
        mk('objarrow', 250, 275, 0, { height: 8, shape: 'arrow', raysMode: 'none', showImage: true, wavelength: 520 }, { label: 'far (dₒ = 250)', showLabel: true, labelPos: 'b' }),
        tl('tilted object plane', 220, 210, 10),
        tl('tilted image plane — every point is in focus here', 700, 220, 10),
      ],
      beams: [
        { id: bid(), kind: 'beam', pts: [{ x: 350, y: 225 }, { x: 300, y: 250 }, { x: 250, y: 275 }], color: '#a8afb8', width: 1.5, dash: true, arrow: false },
        { id: bid(), kind: 'beam', pts: [{ x: 671.43, y: 278.57 }, { x: 633.33, y: 250 }, { x: 617.65, y: 238.24 }], color: '#a8afb8', width: 1.5, dash: true, arrow: false },
      ],
    }),
  },

  {
    name: 'Geometric vignetting (ray-bundle illustration)',
    group: 'Camera Obscura — Image Formation & Photography',
    build: () => ({
      elements: [
        tl('Geometric vignetting — this illustrates clipped ray bundles; it does not calculate a cos⁴ falloff', 380, 60, 14, '#333'),
        mk('objarrow', 150, 250, 0, { height: 10, raysMode: 'fan', spread: 18, nrays: 7, showImage: false, wavelength: 520 }, { label: 'on-axis point', showLabel: true }),
        mk('objarrow', 150, 150, 15, { height: 10, raysMode: 'fan', spread: 16, nrays: 7, showImage: false, wavelength: 460 }, { label: 'off-axis point (edge of field)', showLabel: true, labelPos: 't' }),
        mk('slit', 380, 250, 0, { gap: 30, length: 130 }, { label: 'aperture stop', showLabel: true, labelPos: 't' }),
        mk('lens', 450, 250, 0, { f: 120, dia: 50.8 }, { label: 'f = 120', showLabel: true, labelPos: 'b' }),
        mk('camera', 650, 250, 0, { ch: 150 }, { label: 'sensor', showLabel: true }),
        tl('on-axis bundle fills the stop symmetrically → full brightness', 470, 300, 10),
        ...tls(['off-axis bundle crosses the stop at an angle and is clipped →', 'fewer sampled rays reach the sensor; no calibrated irradiance law is implied'], 470, 130, 10),
      ],
      beams: [],
    }),
  },

  {
    name: 'Entrance pupil, chief & marginal rays',
    group: 'Camera Obscura — Image Formation & Photography',
    build: () => ({
      elements: [
        tl('Framing — the chief ray (through the stop centre) sets the field of view; marginal rays set the light cone', 360, 60, 14, '#333'),
        mk('lens', 300, 250, 0, { f: 90, dia: 90 }, { label: 'front group', showLabel: true, labelPos: 'b' }),
        mk('slit', 420, 250, 0, { gap: 18, length: 110 }, { label: 'aperture stop (AS)', showLabel: true }),
        mk('lens', 500, 250, 0, { f: 70, dia: 70 }, { label: 'rear group', showLabel: true, labelPos: 'b' }),
        mk('objarrow', 130, 250, 0, { height: 4, raysMode: 'fan', spread: 20, nrays: 7, showImage: false, wavelength: 520 }, { label: 'on-axis point', showLabel: true }),
        mk('objarrow', 130, 195, 12, { height: 4, raysMode: 'fan', spread: 4, nrays: 3, showImage: false, wavelength: 620 }, { label: 'edge-of-field point', showLabel: true, labelPos: 't' }),
        mk('camera', 650, 250, 0, { ch: 60 }, { label: 'image plane', showLabel: true }),
        ...tls(['marginal rays (wide fan): pass the edges of the stop —', 'set the cone angle → f-number, brightness'], 130, 300, 10),
        ...tls(['chief ray (narrow fan): passes through the', 'centre of the stop — sets the angular field of view'], 130, 150, 10),
        ...tls(['the Gaussian image of the AS formed by the', 'front group is the entrance pupil (EP)'], 610, 190, 10),
      ],
      beams: [],
    }),
  },

  {
    name: 'SLR viewfinder (folded optical path)',
    group: 'Camera Obscura — Image Formation & Photography',
    build: () => ({
      elements: [
        tl('SLR viewfinder — the reflex mirror and pentaprism fold the image path up and back to the eye', 330, 40, 14, '#333'),
        mk('laser', 60, 400, 0, { wavelength: 600, beamMode: 'beam', beamWidth: 8 }, { label: 'imaging cone from the scene', showLabel: true }),
        mk('lens', 220, 400, 0, { f: 300, dia: 60 }, { label: 'camera lens', showLabel: true, labelPos: 'b' }),
        mk('mirror', 340, 400, 45, { length: 60 }, { label: 'reflex mirror (45°)', showLabel: true, labelPos: 'r' }),
        ...tls(['focusing screen', '(intermediate image)'], 340, 300, 9),
        mk('mirror', 340, 220, 45, { length: 60 }, { label: 'pentaprism, face 1', showLabel: true, labelPos: 'l' }),
        mk('mirror', 460, 220, 135, { length: 60 }, { label: 'pentaprism, face 2', showLabel: true, labelPos: 't' }),
        mk('lens', 460, 340, 0, { f: 40, dia: 25.4 }, { label: 'ocular', showLabel: true, labelPos: 'r' }),
        mk('eye', 460, 430, 90, {}, { label: 'eye', showLabel: true }),
        ...tls(['real prisms use two internal reflections', 'to also correct left–right orientation —', 'not representable in a 2D side view'], 520, 260, 9),
      ],
      beams: [],
    }),
  },

  {
    name: 'Mach–Zehnder interferometer',
    group: 'The Optics Bench — Laboratory Setups',
    build: () => ({
      elements: [
        tl('Mach–Zehnder interferometer — two separate paths recombine at a second beamsplitter', 450, 80, 14, '#333'),
        mk('laser', 100, 200, 0, { wavelength: 532 }, { label: 'laser', showLabel: true }),
        mk('bs', 300, 200, 90, { ratio: 0.5 }, { label: 'BS1', showLabel: true, labelPos: 't' }),
        mk('box', 460, 200, 0, { text: 'Sample', w: 60, h: 30, behavior: 'pass', fill: '#dfe9ff' }, {}),
        mk('mirror', 600, 200, 135, { length: 25.4 }, { label: 'M1', showLabel: true, labelPos: 'r' }),
        mk('mirror', 300, 400, 135, { length: 25.4 }, { label: 'M2', showLabel: true }),
        mk('bs', 600, 400, 90, { ratio: 0.5 }, { label: 'BS2', showLabel: true }),
        mk('detector', 780, 400, 0, {}, { label: 'output 1', showLabel: true }),
        mk('detector', 600, 560, 90, {}, { label: 'output 2', showLabel: true }),
      ],
      beams: [],
    }),
  },

  {
    name: 'SRS microscope (dual-output excitation)',
    group: 'The Optics Bench — Laboratory Setups',
    build: () => ({
      elements: [
        tl('SRS microscope — synchronized pump + Stokes excitation and single-point detection', 440, 20, 14, '#333'),
        tl('After Bertoncini et al., J. Biophotonics (2021), Fig. 1b main path; printed collector and inset hardware omitted', 440, 40, 9),

        mk('laser', 70, 300, 0, {
          wavelength: 800, beamMode: 'beam', beamWidth: 6,
          temporalMode: 'pulsed', repRateMHz: 80, pulseWidthFs: 100,
        }, { label: 'tunable pump output (800 nm shown)', showLabel: true, labelPos: 't' }),
        mk('aotf', 185, 300, 0, { center: 800, band: 1, deflect: 0, rfMHz: 80, eff: 0.8, aperture: 26 }, {
          label: 'AOTF: scan + 1 nm selection', showLabel: true, labelPos: 'b',
        }),
        mk('lens', 250, 300, 0, { f: 80, dia: 25.4 }, { label: 'pump relay', showLabel: true, labelPos: 't' }),

        mk('laser', 320, 90, 90, {
          wavelength: 1040, beamMode: 'beam', beamWidth: 6,
          temporalMode: 'pulsed', repRateMHz: 80, pulseWidthFs: 100,
        }, { label: 'fixed Stokes output (1040 nm)', showLabel: true, labelPos: 'r' }),
        mk('aom', 320, 175, 90, {
          deflect: 0, rfMHz: 80, zero: false, eff: 0.85,
          modulate: true, modFreqMHz: 5, chopDuty: 0.5,
        }, { label: 'AOM: 5 MHz amplitude modulation', showLabel: true, labelPos: 'r' }),
        mk('filter', 320, 240, 90, { ftype: 'bandpass', center: 1040, band: 1, length: 25.4 }, {
          label: 'Stokes spectral filter', showLabel: true, labelPos: 'r',
        }),

        mk('dichroic', 320, 300, -45, { dtype: 'shortpass', cutoff: 950, length: 35 }, {
          label: 'combiner', showLabel: true, labelPos: 't',
        }),
        mk('galvo', 440, 300, 135, { length: 40, commandAngle: 0, scanMode: 'static' }, {
          label: 'galvo X', showLabel: true, labelPos: 't',
        }),
        mk('galvo', 440, 410, 135, { length: 40, commandAngle: 0, scanMode: 'static' }, {
          label: 'galvo Y', showLabel: true, labelPos: 'l',
        }),
        mk('telescope', 560, 410, 0, { f1: 40, f2: 40, dia: 25.4 }, {
          label: 'scan relay', showLabel: true, labelPos: 'b',
        }),
        mk('objective', 690, 410, 0, { f: 60, aperture: 34 }, {
          label: 'high-NA objective', showLabel: true, labelPos: 't',
        }),
        mk('sample', 735, 410, 0, { mode: 'none', transmitExc: true, transmission: 0.8, aperture: 34 }, {
          label: 'sample', showLabel: true, labelPos: 'b',
        }),
        mk('filter', 785, 410, 0, { ftype: 'bandpass', center: 1040, band: 40, length: 34 }, {
          label: 'Stokes filter', showLabel: true, labelPos: 't',
        }),
        mk('detector', 850, 410, 0, { aperture: 34 }, {
          label: 'single-point photodetector', showLabel: true, labelPos: 'b',
        }),

        ...tls([
          'Two source icons represent the synchronized outputs of one commercial OPO system.',
          'The paper\'s printed collection optic is omitted; the downstream detector path is schematic.',
          'SRS modulation transfer, lock-in electronics and XPM are not simulated by this geometric tracer.',
        ], 430, 520, 9),
      ],
      beams: [],
    }),
  },

  {
    name: 'Optical parametric oscillator (OPO)',
    group: 'The Optics Bench — Laboratory Setups',
    build: () => ({
      elements: [
        tl('Optical parametric oscillator — a pump photon splits into signal + idler: 1/λₚ = 1/λₛ + 1/λᵢ', 380, 60, 14, '#333'),
        mk('laser', 100, 300, 0, { wavelength: 532 }, { label: 'pump  532 nm', showLabel: true }),
        mk('dichroic', 250, 300, 0, { dtype: 'shortpass', cutoff: 600, length: 25.4 }, { label: 'input coupler', showLabel: true, labelPos: 't' }),
        mk('crystal', 400, 300, 0, { convert: 'opo', pumpWl: 532, signalWl: 800, transmitPump: true }, { label: 'PPLN crystal', showLabel: true, labelPos: 't' }),
        mk('dichroic', 550, 300, 0, { dtype: 'longpass', cutoff: 1100, length: 25.4 }, { label: 'output coupler', showLabel: true, labelPos: 't' }),
        mk('detector', 700, 300, 0, {}, { label: 'idler out ≈ 1588 nm', showLabel: true }),
        mk('probe', 475, 300, 0, { prop: 'wl' }),
        ...tls(['HT @ pump, HR @ signal + idler —', 'traps signal in the cavity,', 'recycles residual pump'], 250, 350, 9),
        ...tls(['HR @ pump + signal, HT @ idler —', 'closes the cavity for signal,', 'lets idler (and, in a real device,', 'a small calibrated fraction of', 'signal) leave as useful output'], 550, 350, 9),
        tl('signal (800 nm) resonates back and forth, building up on every pass through the crystal', 400, 220, 10),
      ],
      beams: [],
    }),
  },
];
