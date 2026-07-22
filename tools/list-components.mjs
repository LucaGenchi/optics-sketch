#!/usr/bin/env node

import { componentCatalog } from './opticalsetup-toolkit.mjs';

const args = process.argv.slice(2);
const includeHidden = args.includes('--all');
const query = args.filter(arg => arg !== '--all').join(' ');

console.log(JSON.stringify(componentCatalog(query, { includeHidden }), null, 2));
