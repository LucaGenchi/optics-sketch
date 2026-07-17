import test from 'node:test';
import assert from 'node:assert/strict';

import { registry, createElement, getElementMeta, getSize } from '../js/elements.js';
import { examples } from '../js/examples.js';
import { buildSVG, exportPNG, exportSVG } from '../js/export.js';
import { detectorReading, traceAll } from '../js/raytrace.js';
import { state } from '../js/state.js';
import { distinctPoints } from '../js/util.js';

const invalidNumber = /(?:NaN|undefined|Infinity)/;

test('every registered element renders and traces with valid defaults', () => {
  for (const [type, def] of Object.entries(registry)) {
    const el = createElement(type, 100, 100);
    const size = getSize(el);
    assert.ok(Number.isFinite(size.w) && size.w > 0, `${type} width`);
    assert.ok(Number.isFinite(size.h) && size.h > 0, `${type} height`);
    assert.doesNotMatch(def.svg(el), invalidNumber, `${type} SVG`);
    for (const drawable of traceAll([el], [])) {
      for (const p of drawable.pts || drawable.dots || []) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${type} trace point`);
      }
    }
  }
});

test('small custom mirrors never emit NaN hatch coordinates', () => {
  for (const type of ['mirror', 'cmirror', 'cmirrorx']) {
    const el = createElement(type);
    el.params.length = 1;
    assert.doesNotMatch(registry[type].svg(el), invalidNumber);
  }
});

test('dependent geometry stays valid at allowed parameter extremes', () => {
  const slit = createElement('slit');
  slit.params.length = 1;
  slit.params.gap = 60;
  assert.doesNotMatch(registry.slit.svg(slit), /\b(?:width|height|r|rx|ry)="-/);
  assert.deepEqual(registry.slit.surfaces(slit), []);

  const arrow = createElement('arrowann');
  arrow.params.len = 10;
  arrow.params.width = 8;
  const size = getSize(arrow);
  assert.ok(size.h >= 30, 'the hit/export bounds contain the thick arrowhead');
});

test('grating order parsing is deduplicated and bounded', () => {
  const grating = createElement('grating');
  grating.params.orders = [...Array(50).keys(), ...Array(50).keys()].join(',');
  const orders = registry.grating.surfaces(grating)[0].data.orders;
  assert.equal(orders.length, 21);
  assert.equal(new Set(orders).size, orders.length);
});

test('component metadata distinguishes simulated, setup-dependent, and diagram-only elements', () => {
  assert.equal(getElementMeta('lens', createElement('lens').params).tier, 'simulated');
  assert.equal(getElementMeta('glassrod', createElement('glassrod').params).tier, 'diagram');
  const eom = createElement('eom');
  assert.equal(getElementMeta('eom', eom.params).tier, 'configurable');
  eom.params.modulate = true;
  assert.equal(getElementMeta('eom', eom.params).tier, 'simulated');
  assert.deepEqual(registry.microscope.surfaces(createElement('microscope')), []);
});

test('detectors report qualitative signal, spectrum, polarization, and spot span', () => {
  const laser = createElement('laser', 0, 0);
  laser.params.beamMode = 'beam';
  laser.params.beamWidth = 8;
  laser.params.wavelength = 488;
  laser.params.pol = 30;
  const detector = createElement('detector', 250, 0);
  traceAll([laser, detector]);
  const reading = detectorReading(detector.id);
  assert.ok(reading);
  assert.ok(Math.abs(reading.signal - 1) < 1e-9);
  assert.equal(reading.samples, 25);
  assert.equal(Math.round(reading.wavelength), 488);
  assert.equal(reading.polarization, 'Linear 30°');
  assert.ok(reading.spotSpan > 7);

  detector.y = 200;
  traceAll([laser, detector]);
  assert.equal(detectorReading(detector.id), null);
});

test('detector signal follows upstream attenuation', () => {
  const laser = createElement('laser', 0, 0);
  const splitter = createElement('bs', 150, 0);
  splitter.params.ratio = 0.35;
  const detector = createElement('detector', 300, 0);
  traceAll([laser, splitter, detector]);
  assert.ok(Math.abs(detectorReading(detector.id).signal - 0.35) < 1e-9);
});

test('all built-in examples trace and export without invalid geometry', () => {
  for (const example of examples) {
    const scene = example.build();
    state.elements = scene.elements;
    state.beams = scene.beams || [];
    assert.doesNotThrow(() => traceAll(state.elements, state.beams), example.name);
    const svg = buildSVG();
    assert.match(svg, /^<svg /, example.name);
    assert.doesNotMatch(svg, invalidNumber, example.name);
  }
});

test('speckle dot drawables are included in export bounds', () => {
  state.elements = [createElement('laser', 0, 0), createElement('diffuser', 100, 0)];
  state.beams = [];
  const svg = buildSVG();
  assert.match(svg, /<circle /);
  assert.doesNotMatch(svg, invalidNumber);
});

test('invisible blockers bound rays without appearing in the export', () => {
  state.elements = [createElement('laser', 0, 0), createElement('blocker', 1000, 0)];
  state.beams = [];
  const svg = buildSVG();
  const viewBox = svg.match(/viewBox="([^\"]+)"/)[1].split(' ').map(Number);
  assert.ok(viewBox[2] > 900, 'the ray endpoint at the blocker remains in bounds');
  assert.doesNotMatch(svg, /✂/, 'the invisible blocker itself is omitted');
});

test('long labels and probe cards are inside fitted export bounds', () => {
  const laser = createElement('laser', 0, 0);
  laser.label = 'A very long optical source label that must remain fully visible in an exported figure';
  laser.showLabel = true;
  state.elements = [laser, createElement('probe', 200, 0)];
  state.beams = [];
  const svg = buildSVG();
  const viewBox = svg.match(/viewBox="([^\"]+)"/)[1].split(' ').map(Number);
  assert.ok(viewBox[2] > 500, 'label width contributes to export bounds');
  assert.ok(viewBox[3] > 100, 'probe card height contributes to export bounds');
});

test('SVG and PNG exports reach the browser download trigger', async () => {
  state.elements = [createElement('laser', 0, 0), createElement('diffuser', 100, 0)];
  state.beams = [];
  const originals = {
    document: globalThis.document, Image: globalThis.Image, URL: globalThis.URL,
    alert: globalThis.alert, setTimeout: globalThis.setTimeout,
  };
  const downloads = [];
  const canvases = [];
  const context = { scales: [], draws: 0, scale(x, y) { this.scales.push([x, y]); }, drawImage() { this.draws++; } };
  try {
    globalThis.URL = { createObjectURL: () => 'blob:test', revokeObjectURL() {} };
    globalThis.setTimeout = fn => { fn(); return 0; };
    globalThis.alert = message => assert.fail(message);
    globalThis.document = {
      body: { appendChild() {} },
      createElement(tag) {
        if (tag === 'a') return { href: '', download: '', click() { downloads.push(this.download); }, remove() {} };
        if (tag === 'canvas') {
          const canvas = {
            width: 0, height: 0, getContext: () => context,
            toBlob: callback => callback(new Blob(['png'], { type: 'image/png' })),
          };
          canvases.push(canvas);
          return canvas;
        }
        throw new Error(`Unexpected element: ${tag}`);
      },
    };
    globalThis.Image = class {
      set src(_value) { queueMicrotask(() => this.onload()); }
    };

    exportSVG();
    exportPNG(3);
    await Promise.resolve();
    await Promise.resolve();

    assert.deepEqual(downloads, ['optical-setup.svg', 'optical-setup.png']);
    assert.equal(canvases.length, 1);
    assert.ok(canvases[0].width > 0 && canvases[0].height > 0);
    assert.deepEqual(context.scales, [[3, 3]]);
    assert.equal(context.draws, 1);
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test('consecutive duplicate drawing points are removed', () => {
  assert.deepEqual(distinctPoints([
    { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 5 }, { x: 10, y: 5 },
  ]), [{ x: 0, y: 0 }, { x: 10, y: 5 }]);
});

test('legacy fibers with repeated end points cannot create non-finite rays', () => {
  const laser = createElement('laser', 0, 0);
  const fiber = {
    id: 'fiber', kind: 'fiber', color: '#e8a800', width: 4, propagate: true,
    pts: [{ x: 150, y: 0 }, { x: 150, y: 0 }, { x: 250, y: 0 }],
  };
  const drawables = traceAll([laser], [fiber]);
  for (const drawable of drawables) {
    for (const p of drawable.pts || drawable.dots || []) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    }
  }
});
