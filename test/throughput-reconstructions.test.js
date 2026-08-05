import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { registry } from '../sketch/js/elements.js';
import { traceScene } from '../sketch/js/raytrace.js';
import { parseSketch } from '../sketch/js/state.js';

const ROOT = fileURLToPath(new URL(
  '../reconstructions/throughput-scaling-2pp-2026-07-29/',
  import.meta.url,
));

async function json(name) {
  return JSON.parse(await readFile(`${ROOT}/${name}`, 'utf8'));
}

function finiteTrace(trace) {
  const points = trace.drawables.flatMap(drawable => [
    ...(Array.isArray(drawable.pts) ? drawable.pts : []),
    ...(Array.isArray(drawable.dots) ? drawable.dots : []),
  ]);
  return points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y));
}

test('throughput reference inventory keeps the bounded source universe explicit', async () => {
  const index = await json('index.json');
  assert.equal(index.plottedPoints, 18);
  assert.equal(index.distinctFabricationReferences, 17);
  assert.equal(index.includedSetups, 14);
  assert.equal(index.tracedSetups, 9);
  assert.equal(index.diagramOnlySources, 5);
  assert.equal(index.records.length, 14);
  assert.equal(index.excludedReferences.length, 3);
  assert.deepEqual(
    index.excludedReferences.map(item => item.key).sort(),
    ['dong-2007', 'yan-2015', 'yang-2015'],
  );
  assert.equal(new Set(index.records.map(item => item.key)).size, 14);
  assert.equal(index.records.filter(item => item.key === 'gu-2025').length, 1);
  assert.equal(index.records.find(item => item.key === 'gu-2025').supplementBacked, true);
  assert.equal(
    index.records.find(item => item.key === 'nanoscribe-gt-datasheet').pdfStatus.includes('2016'),
    true,
  );
});

test('every generated setup parses, traces finitely, and matches its evidence contract', async () => {
  const index = await json('index.json');
  for (const entry of index.records) {
    const raw = await json(entry.sceneFile);
    const scene = parseSketch(raw, registry);
    const contract = await json(entry.contractFile);
    const checks = await json(entry.checksFile);
    const preview = await readFile(`${ROOT}/${entry.previewFile}`, 'utf8');

    assert.equal(scene.beams.length, 0, `${entry.key}: no manual beam overlays`);
    assert.equal(
      scene.elements.every(element => Boolean(registry[element.type])),
      true,
      `${entry.key}: registry types`,
    );
    assert.equal(
      scene.elements.every(element =>
        Number.isFinite(element.x) && Number.isFinite(element.y) && Number.isFinite(element.rot)),
      true,
      `${entry.key}: finite element transforms`,
    );
    assert.equal(contract.sceneFile, entry.sceneFile);
    assert.equal(contract.componentMappings.length > 2, true);
    assert.equal(contract.evidence.direct.length > 0, true);
    assert.equal(contract.evidence.unknown.length > 0, true);
    assert.equal(checks.passed, true, `${entry.key}: generated checks`);
    assert.equal(checks.noManualBeams, true);
    assert.match(preview, /^<svg /);
    assert.doesNotMatch(preview, /\b(?:NaN|Infinity|-Infinity)\b/);

    const trace = traceScene(scene.elements, scene.beams);
    assert.equal(finiteTrace(trace), true, `${entry.key}: finite trace`);
    const sourceCount = scene.elements.filter(element => registry[element.type]?.source).length;
    if (checks.sourceMode === 'traced') {
      assert.equal(sourceCount, 1, `${entry.key}: one qualified source`);
      assert.equal(
        trace.signalHits.some(hit => hit.stageId === `${entry.key}-sample-stage`),
        true,
        `${entry.key}: chief ray reaches resin stage`,
      );
    } else {
      assert.equal(sourceCount, 0, `${entry.key}: incomplete source stays diagram-only`);
      assert.equal(checks.sourceToSample, null);
    }
  }
});
