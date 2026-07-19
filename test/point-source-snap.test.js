// Regression coverage for the feedback-round-1 features re-applied on top of
// the direct-manipulation branch: unified evanescent point source, hidden
// legacy sources, concave-lens outline, and surface-aware snap anchors.

import test from 'node:test';
import assert from 'node:assert/strict';

import { createElement, registry } from '../sketch/js/elements.js';
import { traceAll } from '../sketch/js/raytrace.js';
import { parseSketch } from '../sketch/js/state.js';

test('point source rays fade evanescently unless a nearby lens collects them', () => {
  const src = createElement('pointsource', 0, 0);
  src.params.nrays = 4;
  src.params.spread = 360;

  const alone = traceAll([src]);
  const maxAlone = Math.max(...alone.filter(d => d.pts).flatMap(d => d.pts.map(p => Math.hypot(p.x, p.y))));
  assert.ok(Math.abs(maxAlone - 110) < 1e-6, `unattended rays fade at 110mm, got ${maxAlone}`);

  const lens = createElement('lens', 100, 0);
  lens.params.f = 50;
  lens.params.dia = 200;
  const collected = traceAll([src, lens]);
  const maxCollected = Math.max(...collected.filter(d => d.pts).flatMap(d => d.pts.map(p => Math.hypot(p.x, p.y))));
  assert.ok(maxCollected > 1000, `lens-collected rays propagate on, got ${maxCollected}`);
});

test('point source emission angle restricts the fan without duplicate full-circle samples', () => {
  const full = registry.pointsource.source({ params: { spread: 360, nrays: 8 } });
  assert.equal(full.length, 8);
  const angles = full.map(r => Math.atan2(r.dy, r.dx).toFixed(6));
  assert.equal(new Set(angles).size, 8, 'no duplicated -180/+180 sample');
  assert.ok(full.every(r => r.evan && r.evanLen === 110));

  const cone = registry.pointsource.source({ params: { spread: 60, nrays: 5 } });
  assert.ok(cone.every(r => Math.abs(Math.atan2(r.dy, r.dx)) <= (30 + 1e-9) * Math.PI / 180));
});

test('legacy led and lamp stay loadable but hidden from the palette', () => {
  assert.ok(registry.led.hidden, 'led is hidden');
  assert.ok(registry.lamp.hidden, 'lamp is hidden');
  assert.ok(!registry.pointsource.hidden, 'pointsource is visible');

  const scene = parseSketch(JSON.stringify({
    app: 'optics2d', version: 1,
    elements: [
      { type: 'led', x: 0, y: 0, params: { wavelength: 470, spread: 30, nrays: 5, autoColor: true } },
      { type: 'lamp', x: 100, y: 0, params: { wavelength: 550, spread: 40, nrays: 3, autoColor: true } },
    ],
  }), registry);
  assert.equal(scene.elements.length, 2);
  // legacy lamp keeps its original forward-fan geometry via the migration flag
  assert.equal(scene.elements[1].params.legacyDirectional, true);
  const rays = registry.lamp.source(scene.elements[1]);
  assert.ok(rays.every(r => r.x === 15 && !r.evan), 'legacy lamp emits its original directional fan');
});

test('concave lens outline curves on the vertical refracting faces', () => {
  const el = createElement('lensc');
  const path = registry.lensc.svg(el);
  // both vertical faces are quadratic curves through the mid-plane (x≈0
  // control points), rather than curves along the top/bottom edges
  const d = path.match(/d="([^"]+)"/)[1];
  assert.match(d, /L [\d.+-]+,[\d.+-]+ Q [\d.+-]+,0 /, 'vertical face uses a Q through y-axis midpoint');
  assert.ok(!/Q [\d.+-]+,[\d.+-]*[1-9][\d.]* [\d.+-]+,-?\d/.test(d.split('Z')[0].split('Q')[0]), 'no top-edge curvature');
});

test('optically active elements carry surface-aware snap anchors', () => {
  const expected = {
    laser: { x: 52, y: 0 },
    objective: { x: -16, y: 0 },
    slm: { x: -9, y: 0 },
    dmd: { x: -9, y: 0 },
    detector: { x: -19, y: 0 },
    pmt: { x: -25, y: 0 },
    camera: { x: -22, y: 0 },
    eye: { x: -15, y: 0 },
  };
  for (const [type, pt] of Object.entries(expected)) {
    assert.deepEqual(registry[type].snapPt, pt, `${type} snapPt`);
  }
  // the supercontinuum laser inherits the laser's exit-aperture anchor
  assert.deepEqual(registry.sclaser.snapPt, { x: 52, y: 0 });
});
