import test from 'node:test';
import assert from 'node:assert/strict';

import { registry, createElement } from '../sketch/js/elements.js';
import {
  state, parseSketch, deserialize, replaceScene, pushUndo, undo, redo, canUndo, canRedo,
} from '../sketch/js/state.js';

const file = (elements = [], beams = []) => JSON.stringify({ app: 'optics2d', version: 1, elements, beams });

test('sketch loading fills defaults and normalizes unsafe values', () => {
  const raw = createElement('laser', 10, 20);
  raw.rot = -90;
  raw.params = {
    wavelength: 99, beamWidth: 999, color: 'red', temporalMode: 'pulsed',
    repRateMHz: 1e12, pulseWidthFs: 0, pulsePhaseNs: 1e12,
  };
  const scene = parseSketch(file([raw], [{
    id: 'fiber', kind: 'fiber', pts: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 20, y: 0 }],
    width: 99, color: 'invalid', out0: { mode: 'focus', na: 2, focal: 1, dia: 99 },
  }]), registry);

  const laser = scene.elements[0];
  assert.equal(laser.rot, 270);
  assert.equal(laser.params.wavelength, 100);
  assert.equal(laser.params.beamWidth, 60);
  assert.equal(laser.params.color, '#e02020');
  assert.equal(laser.params.autoColor, true);
  assert.equal(laser.params.temporalMode, 'pulsed');
  assert.equal(laser.params.repRateMHz, 1000000);
  assert.equal(laser.params.pulseWidthFs, 1);
  assert.equal(laser.params.pulsePhaseNs, 1000000);

  const fiber = scene.beams[0];
  assert.deepEqual(fiber.pts, [{ x: 0, y: 0 }, { x: 20, y: 0 }]);
  assert.equal(fiber.width, 20);
  assert.equal(fiber.color, '#e8a800');
  assert.equal(fiber.inputNA, 0.22);
  assert.equal(fiber.groupIndex, 1.468);
  assert.equal(fiber.lossDbPerM, 0.2);
  assert.deepEqual(fiber.out0, { mode: 'focus', na: 0.95, focal: 2, dia: 30 });
});

test('sketch loading rejects data that would crash the canvas', () => {
  assert.throws(() => parseSketch('{', registry), SyntaxError);
  assert.throws(() => parseSketch(JSON.stringify({ elements: 'nope' }), registry), /valid optics sketch/);
  assert.throws(() => parseSketch(file([{ type: 'unknown', x: 0, y: 0, params: {} }]), registry), /unknown element/);
  assert.throws(() => parseSketch(file([{ type: '__proto__', x: 0, y: 0, params: {} }]), registry), /unknown element/);
  assert.throws(() => parseSketch(file([{ type: 'laser', x: null, y: 0, params: {} }]), registry), /invalid coordinates/);
  assert.throws(() => parseSketch(file([], [{ kind: 'fiber', pts: [{ x: 0, y: 0 }, { x: 0, y: 0 }] }])), /distinct points/);
  assert.throws(() => parseSketch(JSON.stringify({ app: 'optics2d', version: 2, elements: [] }), registry), /Unsupported sketch version/);
});

test('legacy lasers without temporal fields remain continuous-wave sources', () => {
  const laser = createElement('laser', 0, 0);
  delete laser.params.temporalMode;
  delete laser.params.repRateMHz;
  delete laser.params.pulseWidthFs;
  delete laser.params.pulsePhaseNs;
  const [loaded] = parseSketch(file([laser]), registry).elements;
  assert.equal(loaded.params.temporalMode, 'cw');
  assert.equal(loaded.params.repRateMHz, 80);
  assert.equal(loaded.params.pulseWidthFs, 100);
  assert.equal(loaded.params.pulsePhaseNs, 0);
});

test('legacy lamps retain their monochromatic forward-fan emission', () => {
  const raw = {
    id: 'legacy-lamp', type: 'lamp', x: 10, y: 20, rot: 15,
    params: { wavelength: 532, spread: 40, nrays: 3, autoColor: true, color: '#e8a800' },
  };
  const [loaded] = parseSketch(file([raw]), registry).elements;
  assert.equal(loaded.params.legacyDirectional, true);
  assert.equal(loaded.params.bandwidth, 0);
  assert.equal(loaded.params.packageSize, 34);
  const rays = registry.lamp.source(loaded);
  assert.deepEqual(rays.map(ray => ray.x), [15, 15, 15]);
  assert.ok(rays.every(ray => ray.dx > 0), 'legacy lamp remains a forward fan');
});

test('duplicate object ids are repaired during import', () => {
  const a = createElement('laser', 0, 0);
  const b = createElement('lens', 100, 0);
  b.id = a.id;
  const scene = parseSketch(file([a, b]), registry);
  assert.notEqual(scene.elements[0].id, scene.elements[1].id);
});

test('legacy sample block/pass modes retain their behavior', () => {
  const blocked = createElement('sample', 0, 0);
  blocked.params = { mode: 'block' };
  const passed = createElement('stage', 20, 0);
  passed.params = { mode: 'trans' };
  const scene = parseSketch(file([blocked, passed]), registry);
  assert.deepEqual(scene.elements.map(el => [el.params.mode, el.params.transmitExc]), [
    ['none', false], ['none', true],
  ]);
  assert.equal(scene.elements[1].params.transmission, 1);
});

test('legacy layer-based DMD settings keep their zero-order branch', () => {
  const dmd = createElement('dmd', 100, 0);
  dmd.params = {
    length: 40,
    zeroOrder: true,
    zeroFrac: 0.25,
    layers: [{ type: 'steer', angle: 8 }],
  };
  const [loaded] = parseSketch(file([dmd]), registry).elements;
  assert.equal(loaded.params.zeroOrder, true);
  assert.equal(loaded.params.zeroFrac, 0.25);
  assert.equal(loaded.params.layers.length, 1);
  const data = registry.dmd.surfaces(loaded)[0].data;
  assert.equal(data.zeroOrder, true);
  assert.equal(data.zeroFrac, 0.25);
});

test('scene replacement remains undoable when requested by the caller', () => {
  const first = { elements: [createElement('laser', 0, 0)], beams: [] };
  const second = { elements: [createElement('lens', 100, 0)], beams: [] };
  deserialize(file(first.elements), { definitions: registry, resetHistory: true });
  assert.equal(canUndo(), false);
  pushUndo();
  replaceScene(second);
  assert.equal(canUndo(), true);
  undo();
  assert.equal(state.elements[0].type, 'laser');
  assert.equal(canRedo(), true);
  redo();
  assert.equal(state.elements[0].type, 'lens');
});
