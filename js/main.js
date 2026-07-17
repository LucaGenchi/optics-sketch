// App bootstrap: palette, toolbar, keyboard shortcuts.

import { state, changed, onChange, pushUndo, undo, redo, canUndo, canRedo, findSelected, serialize, parseSketch, replaceScene, loadAutosave } from './state.js';
import { registry, categories, createElement, getElementMeta } from './elements.js';
import { initCanvas, renderAll, startPlacing, startBeamTool, cancelTool, isPlacing, rotatePlacing, finishBeam, zoomBy, zoomFit, setSelectionCallback } from './canvas.js';
import { initInspector, renderInspector, refreshMeasurements } from './inspector.js';
import { exportSVG, exportPNG } from './export.js';
import { examples } from './examples.js';
import { download, esc } from './util.js';

const $ = id => document.getElementById(id);

// ---------- palette ----------
function buildPalette() {
  const pal = $('palette');
  let h = `<div class="library-head">
    <div class="library-title-row"><span class="library-title">Component library</span><span id="libraryCount" class="library-count"></span></div>
    <div class="palette-search-wrap"><input id="paletteSearch" type="search" placeholder="Search components…" autocomplete="off" aria-label="Search components"><span class="search-shortcut">/</span></div>
    <div class="capability-legend" aria-label="Component capability legend">
      <span><i class="cap-dot simulated"></i>Simulated</span>
      <span><i class="cap-dot configurable"></i>Setup</span>
      <span><i class="cap-dot diagram"></i>Diagram</span>
    </div>
  </div><div id="paletteGroups">`;
  let total = 0;
  const initiallyOpen = new Set(['Sources', 'Mirrors', 'Lenses']);
  for (const cat of categories) {
    const entries = Object.entries(registry).filter(([, def]) => def.category === cat);
    if (!entries.length) continue;
    h += `<details class="palette-group" data-category="${esc(cat)}" ${initiallyOpen.has(cat) ? 'open' : ''}>
      <summary>${esc(cat)}<span class="group-count">${entries.length}</span></summary><div class="catlist">`;
    for (const [type, def] of entries) {
      const el = createElement(type);
      const sz = typeof def.size === 'function' ? def.size(el) : (def.size_ ? def.size_(el) : def.size);
      const vb = Math.max(sz.w, sz.h) + 12;
      const meta = getElementMeta(type, el.params);
      const search = `${def.label} ${cat} ${meta.status} ${meta.description}`.toLowerCase();
      h += `<button type="button" class="palitem" data-type="${type}" data-search="${esc(search)}" title="${esc(meta.description)}">
        <svg viewBox="${-vb / 2} ${-vb / 2} ${vb} ${vb}">${def.svg(el)}</svg>
        <span class="pal-copy"><span class="pal-label">${esc(def.label)}</span><span class="pal-desc">${esc(meta.description)}</span></span>
        <i class="cap-dot ${meta.tier}" title="${esc(meta.status)}" aria-label="${esc(meta.status)}"></i></button>`;
      total++;
    }
    h += `</div></details>`;
  }
  h += `</div><div id="paletteEmpty" class="palette-empty">No matching component.<br>Try a device, behavior, or category.</div>`;
  pal.innerHTML = h;
  $('libraryCount').textContent = `${total} components`;
  pal.querySelectorAll('.palitem').forEach(item => {
    item.addEventListener('click', () => startPlacing(item.dataset.type));
  });

  const search = $('paletteSearch');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    let visible = 0;
    pal.querySelectorAll('.palette-group').forEach(group => {
      let groupVisible = 0;
      group.querySelectorAll('.palitem').forEach(item => {
        const haystack = item.dataset.search;
        const words = haystack.split(/[^a-z0-9λ]+/).filter(Boolean);
        const match = !q || terms.every(term => term.length <= 3 ? words.includes(term) : haystack.includes(term));
        item.hidden = !match;
        if (match) { visible++; groupVisible++; }
      });
      group.hidden = groupVisible === 0;
      if (q && groupVisible) group.open = true;
    });
    $('libraryCount').textContent = q ? `${visible} of ${total}` : `${total} components`;
    $('paletteEmpty').classList.toggle('is-visible', visible === 0);
  });
}

function syncToolMode(detail = { mode: 'select' }) {
  const active = detail.mode !== 'select';
  const mode = $('toolMode');
  const canvas = $('canvas');
  canvas.classList.toggle('tool-active', active);
  mode.classList.toggle('is-visible', active);
  document.querySelectorAll('.palitem').forEach(item => item.classList.toggle('is-active', detail.mode === 'place' && item.dataset.type === detail.type));
  $('btnBeam').classList.toggle('active', detail.mode === 'beam');
  $('btnFiber').classList.toggle('active', detail.mode === 'fiber');
  if (!active) { mode.textContent = ''; return; }
  mode.textContent = detail.mode === 'place'
    ? `Place ${detail.label} · click to drop · R rotate · Shift keeps placing · Esc cancels`
    : `${detail.label} · click waypoints · double-click or Enter finishes · Esc cancels`;
}

// ---------- selection / deletion ----------
function deleteSelected() {
  const s = state.selection;
  if (s?.kind === 'multi') {
    pushUndo();
    state.elements = state.elements.filter(e => !s.els.includes(e.id));
    state.beams = state.beams.filter(b => !s.beams.includes(b.id));
    state.selection = null;
    changed();
    renderInspector();
    return;
  }
  const sel = findSelected();
  if (!sel) return;
  pushUndo();
  if (state.selection.kind === 'element') state.elements = state.elements.filter(e => e.id !== sel.id);
  else state.beams = state.beams.filter(b => b.id !== sel.id);
  state.selection = null;
  changed();
  renderInspector();
}

const newId = pre => pre + Math.random().toString(36).slice(2, 9);

function duplicateSelected() {
  const s = state.selection;
  if (s?.kind === 'multi') {
    pushUndo();
    const els = [], bms = [];
    for (const id of s.els) {
      const src = state.elements.find(e => e.id === id);
      if (!src) continue;
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = newId('e'); copy.x += 30; copy.y += 30;
      state.elements.push(copy); els.push(copy.id);
    }
    for (const id of s.beams) {
      const src = state.beams.find(b => b.id === id);
      if (!src) continue;
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = newId('b');
      for (const p of copy.pts) { p.x += 30; p.y += 30; }
      state.beams.push(copy); bms.push(copy.id);
    }
    state.selection = { kind: 'multi', els, beams: bms };
    changed();
    renderInspector();
    return;
  }
  const sel = findSelected();
  if (!sel) return;
  pushUndo();
  const copy = JSON.parse(JSON.stringify(sel));
  if (state.selection.kind === 'element') {
    copy.id = newId('e');
    copy.x += 30; copy.y += 30;
    state.elements.push(copy);
    state.selection = { kind: 'element', id: copy.id };
  } else {
    copy.id = newId('b');
    for (const p of copy.pts) { p.x += 30; p.y += 30; }
    state.beams.push(copy);
    state.selection = { kind: 'beam', id: copy.id };
  }
  changed();
  renderInspector();
}

function rotateSelected(deg) {
  if (isPlacing()) { rotatePlacing(deg); return; }
  const sel = findSelected();
  if (!sel || state.selection.kind !== 'element') return;
  pushUndo();
  sel.rot = (((sel.rot || 0) + deg) % 360 + 360) % 360;
  changed();
  renderInspector();
}

function nudgeSelected(dx, dy) {
  const s = state.selection;
  if (s?.kind === 'multi') {
    pushUndo();
    for (const id of s.els) {
      const el = state.elements.find(e => e.id === id);
      if (el) { el.x += dx; el.y += dy; }
    }
    for (const id of s.beams) {
      const b = state.beams.find(q => q.id === id);
      if (b) for (const p of b.pts) { p.x += dx; p.y += dy; }
    }
    changed();
    return;
  }
  const sel = findSelected();
  if (!sel) return;
  pushUndo();
  if (state.selection.kind === 'element') { sel.x += dx; sel.y += dy; }
  else for (const p of sel.pts) { p.x += dx; p.y += dy; }
  changed();
}

// ---------- keyboard ----------
function bindKeys() {
  window.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    const meta = e.metaKey || e.ctrlKey;

    if (e.key === '/') { e.preventDefault(); $('paletteSearch')?.focus(); return; }

    if (meta && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); renderInspector(); return; }
    if (meta && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return; }
    if (e.key === 'Escape') {
      cancelTool();
      if (state.selection) { state.selection = null; renderAll(); renderInspector(); }
      return;
    }
    if (e.key === 'Enter' && state.tool === 'beam') { finishBeam(); renderInspector(); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); deleteSelected(); return; }
    if (e.key === 'r' || e.key === 'R') { rotateSelected(e.shiftKey ? -45 : 45); return; }
    if (e.key.toLowerCase() === 'q') { rotateSelected(-5); return; }
    if (e.key.toLowerCase() === 'e') { rotateSelected(5); return; }
    const step = e.shiftKey ? 25 : 1;
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeSelected(-step, 0); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nudgeSelected(step, 0); }
    if (e.key === 'ArrowUp') { e.preventDefault(); nudgeSelected(0, -step); }
    if (e.key === 'ArrowDown') { e.preventDefault(); nudgeSelected(0, step); }
  });
}

// ---------- examples dropdown ----------
function bindExamples() {
  const sel = $('exampleSel');
  const groups = new Map(); // group label -> <optgroup>
  examples.forEach((ex, i) => {
    let og = groups.get(ex.group);
    if (!og) {
      og = document.createElement('optgroup');
      og.label = ex.group || 'Examples';
      sel.appendChild(og);
      groups.set(ex.group, og);
    }
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = ex.name;
    og.appendChild(o);
  });
  sel.addEventListener('change', () => {
    const i = sel.value;
    sel.value = ''; // reset so the same example can be re-chosen later
    if (i === '') return;
    const ex = examples[+i];
    if (hasScene() && !confirm(`Load example “${ex.name}”? This replaces the current sketch (Undo brings it back).`)) return;
    pushUndo();
    cancelTool();
    const scene = ex.build();
    replaceScene({ elements: scene.elements, beams: scene.beams || [] });
    renderInspector();
    zoomFit();
  });
}

// ---------- toolbar ----------
const hasScene = () => state.elements.length > 0 || state.beams.length > 0;

function syncToolbar() {
  $('btnUndo').disabled = !canUndo();
  $('btnRedo').disabled = !canRedo();
  for (const [id, pressed] of [['btnGrid', state.showGrid], ['btnSnap', state.snap], ['btnFocal', state.showFocal]]) {
    const button = $(id);
    button.classList.toggle('active', pressed);
    button.setAttribute('aria-pressed', String(pressed));
  }
}

function bindToolbar() {
  $('btnNew').addEventListener('click', () => {
    if (!hasScene()) { cancelTool(); return; }
    if (!confirm('Clear the current sketch? (Undo brings it back.)')) return;
    pushUndo();
    cancelTool();
    state.elements = []; state.beams = []; state.selection = null;
    changed(); renderInspector();
  });
  $('btnOpen').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const scene = parseSketch(await f.text(), registry);
      if (hasScene() && !confirm(`Open “${f.name}”? This replaces the current sketch (Undo brings it back).`)) return;
      pushUndo();
      cancelTool();
      replaceScene(scene);
      renderInspector(); zoomFit();
    } catch (err) {
      alert('Could not open file: ' + err.message);
    } finally {
      e.target.value = '';
    }
  });
  $('btnSave').addEventListener('click', () => download('optical-setup.json', serialize(), 'application/json'));
  $('btnSVG').addEventListener('click', exportSVG);
  $('btnPNG').addEventListener('click', () => exportPNG(3));
  $('btnUndo').addEventListener('click', () => { undo(); renderInspector(); });
  $('btnRedo').addEventListener('click', () => { redo(); renderInspector(); });
  $('btnBeam').addEventListener('click', () => startBeamTool('beam'));
  $('btnFiber').addEventListener('click', () => startBeamTool('fiber'));
  $('btnGrid').addEventListener('click', () => { state.showGrid = !state.showGrid; syncToolbar(); renderAll(); });
  $('btnSnap').addEventListener('click', () => { state.snap = !state.snap; syncToolbar(); });
  $('btnFocal').addEventListener('click', () => { state.showFocal = !state.showFocal; syncToolbar(); renderAll(); });
  $('btnZoomIn').addEventListener('click', () => zoomBy(1.25));
  $('btnZoomOut').addEventListener('click', () => zoomBy(0.8));
  $('btnZoomFit').addEventListener('click', zoomFit);
}

// inspector panel buttons dispatch these
document.addEventListener('optics:delete', deleteSelected);
document.addEventListener('optics:duplicate', duplicateSelected);
document.addEventListener('optics:toolchange', e => syncToolMode(e.detail));

// ---------- boot ----------
window.addEventListener('DOMContentLoaded', () => {
  initCanvas($('canvas'), $('status'));
  initInspector($('inspector'));
  buildPalette();
  syncToolMode();
  bindToolbar();
  bindExamples();
  bindKeys();
  setSelectionCallback(renderInspector);
  onChange(() => { renderAll(); syncToolbar(); refreshMeasurements(); });

  if (!loadAutosave(registry)) {
    // starter scene: laser -> lens -> beamsplitter -> two detection arms
    const mk = (t, x, y, rot = 0, params = {}, label = '') => {
      const e = createElement(t, x, y); e.rot = rot; Object.assign(e.params, params);
      if (label) { e.label = label; e.showLabel = true; }
      return e;
    };
    state.elements.push(
      mk('laser', 75, 200, 0, { wavelength: 488 }, 'Laser 488 nm'),
      mk('lens', 275, 200, 0, { f: 150 }, 'f = 150 mm'),
      mk('bs', 425, 200, 0),
      mk('mirror', 625, 200, 135),
      mk('filter', 625, 330, 90, { ftype: 'bandpass', center: 488, band: 20 }),
      mk('detector', 625, 430, 90, {}, 'PD'),
      mk('dichroic', 425, 75, 45, { dtype: 'longpass', cutoff: 550 }),
      mk('pmt', 600, 75, 0, {}, 'PMT'),
    );
  }
  renderAll();
  renderInspector();
  syncToolbar();
  window.addEventListener('resize', renderAll);
});
