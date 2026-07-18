import test from 'node:test';
import assert from 'node:assert/strict';

import { qrMatrix, qrSVG, qrTargetForGeneration, RICKROLL_URL } from '../js/qr.js';

test('QR matrices are square, deterministic, and include three finder patterns', () => {
  const first = qrMatrix('https://example.org/#scene=test');
  const second = qrMatrix('https://example.org/#scene=test');
  assert.deepEqual(first, second);
  assert.ok(first.length >= 21);
  assert.ok(first.every(row => row.length === first.length));
  for (const [x, y] of [[3, 3], [first.length - 4, 3], [3, first.length - 4]]) {
    assert.equal(first[y][x], true);
    assert.equal(first[y - 2][x], false);
  }
});

test('QR SVG has a quiet zone and no embedded remote image', () => {
  const svg = qrSVG('https://example.org/optics');
  assert.match(svg, /^<svg/);
  assert.match(svg, /viewBox="0 0 33 33"/);
  assert.doesNotMatch(svg, /<image|href=/);
});

test('long self-contained setup URLs fit while oversized inputs fail clearly', () => {
  const svg = qrSVG(`https://example.org/#scene=${'a'.repeat(1800)}`);
  assert.match(svg, /<path/);
  assert.throws(() => qrMatrix('x'.repeat(4000)), /too long/i);
});

test('only each fortieth generated QR uses the visible Rickroll easter egg', () => {
  const setup = 'https://example.org/#scene=correct';
  assert.deepEqual(qrTargetForGeneration(setup, 39), { target: setup, easterEgg: false });
  assert.deepEqual(qrTargetForGeneration(setup, 40), { target: RICKROLL_URL, easterEgg: true });
  assert.deepEqual(qrTargetForGeneration(setup, 41), { target: setup, easterEgg: false });
  assert.deepEqual(qrTargetForGeneration(setup, 80), { target: RICKROLL_URL, easterEgg: true });
});
