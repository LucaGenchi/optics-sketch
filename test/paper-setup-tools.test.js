import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { examples } from '../sketch/js/examples.js';
import {
  buildSceneFromSpec,
  componentCatalog,
  validateScene,
} from '../tools/opticalsetup-toolkit.mjs';

const evidence = [
  {
    id: 'source-configuration',
    claim: 'The setup uses synchronized 800 nm pump and 1040 nm Stokes pulse trains',
    source: 'Bertoncini et al. Figure 1b and Laptenok et al. setup description',
    status: 'referenced',
  },
  {
    id: 'sample-overlap',
    claim: 'Pump and Stokes pulses overlap at the sample',
    source: 'Laptenok et al. timing description',
    status: 'referenced',
  },
  {
    id: 'detected-band',
    claim: 'The detector passes pump and rejects Stokes after the sample',
    source: 'Laptenok et al. detection path description',
    status: 'referenced',
  },
];

function srsFixture() {
  const example = examples.find(item => item.name === 'SRS microscope (dual-output excitation)');
  assert.ok(example);
  const scene = example.build();
  const pump = scene.elements.find(element => element.type === 'laser' && element.params.wavelength === 800);
  const stokes = scene.elements.find(element => element.type === 'laser' && element.params.wavelength === 1040);
  const delay = scene.elements.find(element => element.type === 'delayline');
  const sample = scene.elements.find(element => element.type === 'sample');
  const detector = scene.elements.find(element => element.type === 'detector');
  assert.ok(pump && stokes && delay && sample && detector);
  pump.id = 'pump';
  stokes.id = 'stokes';
  delay.id = 'stokes-delay';
  sample.id = 'sample';
  detector.id = 'photodetector';

  const contract = {
    schemaVersion: 1,
    paper: {
      title: '3D printed high-NA catadioptric thin lens for suppression of chromatic aberrations',
      figure: 'Figure 1b',
      locator: 'Bertoncini et al. (2021)',
    },
    measurementStory: 'Synchronized pump and Stokes pulses overlap at the sample; a short-pass filter rejects Stokes and the detector reads pump modulation.',
    evidence,
    allowManualBeams: false,
    checks: [
      { kind: 'element', id: 'pump', type: 'laser', params: { wavelength: 800 }, evidence: ['source-configuration'] },
      { kind: 'element', id: 'stokes-delay', type: 'delayline', params: { delayMm: 40 }, evidence: ['sample-overlap'] },
      { kind: 'source_reaches', source: 'pump', target: 'sample', toleranceMm: 0.01, evidence: ['sample-overlap'] },
      { kind: 'source_reaches', source: 'stokes', target: 'sample', toleranceMm: 0.01, evidence: ['sample-overlap'] },
      { kind: 'pulse_overlap', sources: ['pump', 'stokes'], target: 'sample', toleranceMm: 0.01, maxDifferencePs: 0.001, evidence: ['sample-overlap'] },
      { kind: 'detector', detector: 'photodetector', signal: 'positive', wavelengthNm: { min: 799.9, max: 800.1 }, evidence: ['detected-band'] },
      { kind: 'detector_source', detector: 'photodetector', source: 'pump', expect: 'positive', wavelengthNm: { min: 799.9, max: 800.1 }, evidence: ['detected-band'] },
      { kind: 'detector_source', detector: 'photodetector', source: 'stokes', expect: 'none', evidence: ['detected-band'] },
    ],
  };
  return { scene, contract };
}

test('component catalog is derived from the live registry', () => {
  const timing = componentCatalog('delay');
  assert.ok(timing.some(item => item.type === 'delayline'
    && item.capability.tier === 'simulated'
    && item.params.some(param => param.key === 'delayMm')));
  const modulation = componentCatalog('acousto');
  assert.ok(modulation.some(item => item.type === 'aotf'));
});

test('scene builder fills defaults and preserves stable ids', () => {
  const scene = buildSceneFromSpec({
    elements: [
      { id: 'source', type: 'laser', x: 0, y: 0, params: { wavelength: 532 } },
      { type: 'detector', x: 300, y: 0 },
    ],
  });
  assert.equal(scene.app, 'optics2d');
  assert.equal(scene.version, 1);
  assert.equal(scene.elements[0].id, 'source');
  assert.equal(scene.elements[1].id, 'detector-2');
  assert.equal(scene.elements[0].params.temporalMode, 'cw');
  assert.deepEqual(scene.beams, []);
});

test('scene builder rejects unknown or silently normalized evidence values', () => {
  assert.throws(() => buildSceneFromSpec({
    elements: [{ type: 'pretend-optic', x: 0, y: 0 }],
  }), /unknown type/);
  assert.throws(() => buildSceneFromSpec({
    elements: [{ type: 'laser', x: 0, y: 0, params: { imaginarySetting: 4 } }],
  }), /Unknown parameter/);
  assert.throws(() => buildSceneFromSpec({
    elements: [{ type: 'laser', x: 0, y: 0, params: { wavelength: 50000 } }],
  }), /was normalized/);
});

test('SRS reconstruction passes evidence-linked path, timing, and detector checks', () => {
  const { scene, contract } = srsFixture();
  const result = validateScene(scene, contract);
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.summary.checks, 8);
  assert.equal(result.summary.passed, 8);
});

test('SRS timing check catches the omitted delay-line failure mode', () => {
  const { scene, contract } = srsFixture();
  scene.elements.find(element => element.id === 'stokes-delay').params.delayMm = 0;
  const result = validateScene(scene, contract);
  assert.equal(result.ok, false);
  assert.ok(result.checks.some(check => check.kind === 'pulse_overlap' && !check.pass
    && check.details.differencePs > 100));
});

test('validator refuses unsupported evidence and unapproved manual beams', () => {
  const scene = buildSceneFromSpec({
    elements: [{ id: 'source', type: 'laser', x: 0, y: 0 }],
    beams: [{ kind: 'beam', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }] }],
  });
  const contract = {
    schemaVersion: 1,
    paper: { title: 'Evidence gate fixture' },
    measurementStory: 'A source emits along a diagrammed path.',
    evidence: [{ id: 'unresolved-path', claim: 'The path exists', source: 'Figure ?', status: 'unknown' }],
    checks: [{ kind: 'element', id: 'source', type: 'laser', evidence: ['unresolved-path'] }],
  };
  const result = validateScene(scene, contract);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.includes('unknown evidence')));
  assert.ok(result.errors.some(error => error.includes('manual beam')));
});

test('command-line builder and validator produce a loadable checked scene', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'opticalsetup-paper-skill-'));
  const specPath = join(directory, 'spec.json');
  const scenePath = join(directory, 'scene.opticalsetup.json');
  const contractPath = join(directory, 'contract.json');
  await writeFile(specPath, JSON.stringify({
    elements: [
      { id: 'source', type: 'laser', x: 0, y: 0, params: { wavelength: 532 } },
      { id: 'detector', type: 'detector', x: 300, y: 0 },
    ],
  }));
  await writeFile(contractPath, JSON.stringify({
    schemaVersion: 1,
    paper: { title: 'Synthetic straight-through fixture' },
    measurementStory: 'A 532 nm source reaches a detector.',
    evidence: [{ id: 'straight-path', claim: 'The source reaches the detector', source: 'Synthetic test fixture', status: 'direct' }],
    checks: [
      { kind: 'detector_source', detector: 'detector', source: 'source', expect: 'positive', wavelengthNm: { min: 531.9, max: 532.1 }, evidence: ['straight-path'] },
    ],
  }));

  const build = spawnSync(process.execPath, ['tools/build-scene.mjs', specPath, scenePath], {
    cwd: process.cwd(), encoding: 'utf8',
  });
  assert.equal(build.status, 0, build.stderr);
  const built = JSON.parse(await readFile(scenePath, 'utf8'));
  assert.equal(built.app, 'optics2d');

  const validate = spawnSync(process.execPath, ['tools/validate-scene.mjs', scenePath, contractPath], {
    cwd: process.cwd(), encoding: 'utf8',
  });
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  assert.equal(JSON.parse(validate.stdout).ok, true);
});
