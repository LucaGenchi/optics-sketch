#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { validateScene } from './opticalsetup-toolkit.mjs';

const [scenePath, contractPath] = process.argv.slice(2);
if (!scenePath || !contractPath) {
  console.error('Usage: node tools/validate-scene.mjs SCENE.opticalsetup.json CONTRACT.json');
  process.exit(2);
}

try {
  const scene = JSON.parse(await readFile(scenePath, 'utf8'));
  const contract = JSON.parse(await readFile(contractPath, 'utf8'));
  const result = validateScene(scene, contract);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
