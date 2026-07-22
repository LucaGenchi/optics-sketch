#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { buildSceneFromSpec } from './opticalsetup-toolkit.mjs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: node tools/build-scene.mjs SPEC.json OUTPUT.opticalsetup.json');
  process.exit(2);
}

try {
  const spec = JSON.parse(await readFile(inputPath, 'utf8'));
  const scene = buildSceneFromSpec(spec);
  await writeFile(outputPath, `${JSON.stringify(scene, null, 2)}\n`);
  console.log(`Wrote ${outputPath} (${scene.elements.length} elements, ${scene.beams.length} connectors)`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
