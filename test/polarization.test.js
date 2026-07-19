import test from 'node:test';
import assert from 'node:assert/strict';

import { createElement } from '../sketch/js/elements.js';
import { detectorReading, traceAll } from '../sketch/js/raytrace.js';
import { linearStokes, retarder, polarizationDescription } from '../sketch/js/polarization.js';

test('quarter-wave retardance respects fast-axis alignment and handedness', () => {
  const aligned = retarder(linearStokes(0), 0, 90);
  assert.equal(polarizationDescription(aligned), 'Linear 0°');
  const plus = retarder(linearStokes(45), 0, 90);
  const minus = retarder(linearStokes(-45), 0, 90);
  assert.equal(polarizationDescription(plus), 'Right circular');
  assert.equal(polarizationDescription(minus), 'Left circular');
});

test('waveplate integration preserves aligned linear input', () => {
  const laser = createElement('laser', 0, 0);
  laser.params.pol = 0;
  const qwp = createElement('qwp', 150, 0);
  qwp.params.a = 0;
  const detector = createElement('detector', 300, 0);
  traceAll([laser, qwp, detector]);
  assert.equal(detectorReading(detector.id).polarization, 'Linear 0°');
});

test('EOM retardance changes polarization and an analyzer converts it to extinction', () => {
  const laser = createElement('laser', 0, 0);
  laser.params.pol = 45;
  const eom = createElement('eom', 120, 0);
  eom.params.modulate = true;
  eom.params.a = 0;
  eom.params.retardance = 180;
  const analyzer = createElement('polarizer', 220, 0);
  analyzer.params.pangle = 45;
  const detector = createElement('detector', 320, 0);
  traceAll([laser, eom, analyzer, detector]);
  assert.equal(detectorReading(detector.id), null);
});
