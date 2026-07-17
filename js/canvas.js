// SVG canvas: rendering + pointer interactions (select, move, rotate, pan, zoom,
// element placement, manual beam drawing/editing).

import { state, changed, pushUndo, findSelected } from './state.js';
import { registry, getSize, getVisualBounds, createElement, labelSVG } from './elements.js';
import { traceScene } from './raytrace.js';
import { pulseMarkers } from './pulses.js';
import { toLocal, toWorld, distToSegment, distinctPoints, manualBeamSVG } from './util.js';

let svg, viewport, gridLayer, beamLayer, pulseLayer, manualLayer, elementLayer, overlayLayer;
let statusEl;
let pulseTracks = [];
let pulseFrame = null;
const pulsePlayback = { playing: true, timeNs: 0, speedNsPerSecond: 10, mode: 'schematic', lastFrameMs: null };
export let onSelectionChange = () => { };
export function setSelectionCallback(fn) { onSelectionChange = fn; }

const HOLE_PITCH = 25; // optical table hole spacing, mm

export function initCanvas(svgElement, statusElement) {
  svg = svgElement;
  statusEl = statusElement;
  svg.innerHTML = `
    <defs>
      <pattern id="holes" width="${HOLE_PITCH}" height="${HOLE_PITCH}" patternUnits="userSpaceOnUse">
        <circle cx="${HOLE_PITCH / 2}" cy="${HOLE_PITCH / 2}" r="1.6" fill="#d3d8de"/>
      </pattern>
    </defs>
    <g id="viewport">
      <g id="gridLayer"></g>
      <g id="beamLayer"></g>
      <g id="pulseLayer" pointer-events="none"></g>
      <g id="manualLayer"></g>
      <g id="elementLayer"></g>
      <g id="overlayLayer"></g>
    </g>`;
  viewport = svg.querySelector('#viewport');
  gridLayer = svg.querySelector('#gridLayer');
  beamLayer = svg.querySelector('#beamLayer');
  pulseLayer = svg.querySelector('#pulseLayer');
  manualLayer = svg.querySelector('#manualLayer');
  elementLayer = svg.querySelector('#elementLayer');
  overlayLayer = svg.querySelector('#overlayLayer');
  bindPointer();
  bindWheel();
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) pulsePlayback.playing = false;
  document.addEventListener('visibilitychange', () => { pulsePlayback.lastFrameMs = null; });
}

// ---------- coordinates ----------
export function screenToWorld(sx, sy) {
  const r = svg.getBoundingClientRect();
  const v = state.view;
  return { x: (sx - r.left - v.x) / v.z, y: (sy - r.top - v.y) / v.z };
}

function snapPos(v) {
  if (!state.snap) return v;
  const g = 5;
  return Math.round(v / g) * g;
}

// ---------- rendering ----------
export function renderAll() {
  const v = state.view;
  viewport.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.z})`);
  renderGrid();
  renderBeams();
  renderManual();
  renderElements();
  renderOverlay();
}

function renderGrid() {
  if (!state.showGrid) { gridLayer.innerHTML = ''; return; }
  const r = svg.getBoundingClientRect(), v = state.view;
  const x0 = Math.floor((-v.x / v.z) / HOLE_PITCH - 1) * HOLE_PITCH;
  const y0 = Math.floor((-v.y / v.z) / HOLE_PITCH - 1) * HOLE_PITCH;
  const w = r.width / v.z + 2 * HOLE_PITCH, h = r.height / v.z + 2 * HOLE_PITCH;
  gridLayer.innerHTML = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#holes)"/>`;
}

function ptsAttr(pts) { return pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '); }

function renderBeams() {
  const scene = traceScene(state.elements, state.beams);
  const drawables = scene.drawables;
  pulseTracks = scene.pulseTracks;
  let s = '';
  for (const d of drawables) {
    if (d.type === 'poly') {
      s += `<polygon points="${ptsAttr(d.pts)}" fill="${d.color}" opacity="${d.opacity}" stroke="none"/>`;
    } else if (d.type === 'dots') {
      s += `<g fill="${d.color}">` + d.dots.map(o => `<circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="${o.r.toFixed(2)}" opacity="${o.o.toFixed(2)}"/>`).join('') + `</g>`;
    } else {
      s += `<polyline points="${ptsAttr(d.pts)}" fill="none" stroke="${d.color}" stroke-width="${d.w}" opacity="${d.opacity}" stroke-linejoin="round" stroke-linecap="round" ${d.dash ? `stroke-dasharray="${d.dash === true ? '6 4' : d.dash}"` : ''}/>`;
    }
  }
  beamLayer.innerHTML = s;
  renderPulseLayer();
  syncPulseAnimation();
  notifyPulseState();
}

function notifyPulseState() {
  document.dispatchEvent(new CustomEvent('optics:pulsestate', { detail: getPulsePlayback() }));
}

function renderPulseLayer() {
  if (!pulseLayer) return;
  if (!pulseTracks.length) { pulseLayer.innerHTML = ''; return; }
  const z = state.view.z || 1;
  let s = '';
  for (const track of pulseTracks) {
    for (const marker of pulseMarkers(track, pulsePlayback.timeNs, { mode: pulsePlayback.mode })) {
      const physicalMin = 9 / z;
      const width = pulsePlayback.mode === 'physical' ? Math.max(marker.widthMm, physicalMin) : marker.widthMm;
      const rx = Math.max(2 / z, width / 2);
      const ry = Math.max(2.2 / z, Math.min(5 / z, 2.5 / z + 1.4 * Math.sqrt(Math.max(0, track.intensity || 0)) / z));
      const opacity = Math.max(0.35, Math.min(0.95, 0.45 + 0.45 * (track.intensity || 0)));
      s += `<g transform="translate(${marker.x.toFixed(2)} ${marker.y.toFixed(2)}) rotate(${marker.angle.toFixed(2)})">` +
        `<ellipse rx="${(rx * 1.65).toFixed(2)}" ry="${(ry * 1.8).toFixed(2)}" fill="${track.color}" opacity="${(opacity * 0.18).toFixed(2)}"/>` +
        `<ellipse rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="${track.color}" opacity="${opacity.toFixed(2)}"/>` +
        `<ellipse rx="${Math.max(1 / z, rx * 0.32).toFixed(2)}" ry="${Math.max(0.8 / z, ry * 0.45).toFixed(2)}" fill="#fff" opacity="0.82"/>` +
        `</g>`;
    }
  }
  pulseLayer.innerHTML = s;
}

function animatePulses(nowMs) {
  pulseFrame = null;
  if (!pulsePlayback.playing || !pulseTracks.length) return;
  if (pulsePlayback.lastFrameMs !== null) {
    const elapsedSeconds = Math.min(0.05, Math.max(0, (nowMs - pulsePlayback.lastFrameMs) / 1000));
    pulsePlayback.timeNs += elapsedSeconds * pulsePlayback.speedNsPerSecond;
  }
  pulsePlayback.lastFrameMs = nowMs;
  renderPulseLayer();
  pulseFrame = requestAnimationFrame(animatePulses);
}

function syncPulseAnimation() {
  if (pulsePlayback.playing && pulseTracks.length) {
    if (pulseFrame === null) pulseFrame = requestAnimationFrame(animatePulses);
  } else if (pulseFrame !== null) {
    cancelAnimationFrame(pulseFrame);
    pulseFrame = null;
    pulsePlayback.lastFrameMs = null;
  }
}

export function getPulsePlayback() {
  return { ...pulsePlayback, hasPulses: pulseTracks.length > 0 };
}

export function setPulsePlaying(playing) {
  pulsePlayback.playing = !!playing;
  pulsePlayback.lastFrameMs = null;
  syncPulseAnimation();
  notifyPulseState();
}

export function setPulseSpeed(speedNsPerSecond) {
  if (Number.isFinite(speedNsPerSecond)) pulsePlayback.speedNsPerSecond = Math.min(1000, Math.max(0.1, speedNsPerSecond));
  pulsePlayback.lastFrameMs = null;
  notifyPulseState();
}

export function setPulseDisplayMode(mode) {
  pulsePlayback.mode = mode === 'physical' ? 'physical' : 'schematic';
  renderPulseLayer();
  notifyPulseState();
}

export function resetPulseTime() {
  pulsePlayback.timeNs = 0;
  pulsePlayback.lastFrameMs = null;
  renderPulseLayer();
  notifyPulseState();
}

function renderManual() {
  let s = '';
  for (const b of state.beams) s += manualBeamSVG(b);
  // in-progress beam / fiber
  if (drawing) {
    const c = drawing.kindType === 'fiber' ? '#c98f00' : '#e02020';
    const pts = [...drawing.pts];
    if (drawing.cursor) pts.push(drawing.cursor);
    if (pts.length > 1) s += `<polyline points="${ptsAttr(pts)}" fill="none" stroke="${c}" stroke-width="2" opacity="0.6" stroke-dasharray="4 4"/>`;
    for (const p of drawing.pts) s += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${c}"/>`;
  }
  manualLayer.innerHTML = s;
}

function renderElements() {
  let s = '';
  for (const el of state.elements) {
    const def = registry[el.type];
    if (!def) continue;
    s += `<g transform="translate(${el.x} ${el.y}) rotate(${el.rot || 0})">${def.svg(el)}</g>`;
    s += labelSVG(el);
  }
  // placement ghost
  if (placing && placing.pos) {
    const el = placing.el;
    s += `<g transform="translate(${placing.pos.x} ${placing.pos.y}) rotate(${el.rot || 0})" opacity="0.5">${registry[el.type].svg(el)}</g>`;
  }
  elementLayer.innerHTML = s;
}

// focal points of a focusing element, in local coordinates
function focalPoints(el) {
  const p = el.params;
  switch (el.type) {
    case 'lens': case 'lensc': return [{ x: p.f, y: 0 }, { x: -p.f, y: 0 }];
    case 'objective': return [{ x: -16 - p.f, y: 0 }];
    case 'cmirror': case 'cmirrorx': case 'oap': return [{ x: -p.f, y: 0 }];
    case 'telescope': {
      const s = Math.max(5, p.f1 + p.f2);
      return [{ x: -s / 2 + p.f1, y: 0 }, { x: -s / 2 - p.f1, y: 0 }, { x: s / 2 + p.f2, y: 0 }];
    }
    case 'microscope': return [
      { x: -25 - p.objectiveF, y: 0 }, { x: -25 + p.objectiveF, y: 0 },
      { x: 25 - p.tubeF, y: 0 }, { x: 25 + p.tubeF, y: 0 },
    ];
    default: return null;
  }
}

function focalMarkSVG(el, z) {
  const pts = focalPoints(el);
  if (!pts) return '';
  const r = 4.5 / z, lw = 1.3 / z;
  let s = '';
  for (const q of pts) {
    const w = toWorld(el, q.x, q.y);
    s += `<g stroke="#f59e0b" stroke-width="${lw}">` +
      `<line x1="${w.x - r}" y1="${w.y - r}" x2="${w.x + r}" y2="${w.y + r}"/>` +
      `<line x1="${w.x - r}" y1="${w.y + r}" x2="${w.x + r}" y2="${w.y - r}"/></g>` +
      `<text x="${w.x + r + 2 / z}" y="${w.y - 2 / z}" font-size="${10 / z}" fill="#f59e0b" font-style="italic">f</text>`;
  }
  return s;
}

function renderOverlay() {
  const sel = findSelected();
  let s = '';
  const z = state.view.z;
  // focal-point markers: all focusing elements when the flag is on,
  // otherwise only the selected element and the placement ghost
  if (state.showFocal) {
    for (const el of state.elements) s += focalMarkSVG(el, z);
  } else if (sel && state.selection.kind === 'element') {
    s += focalMarkSVG(sel, z);
  }
  if (placing && placing.pos) {
    s += focalMarkSVG({ ...placing.el, x: placing.pos.x, y: placing.pos.y }, z);
  }
  // marquee rectangle while shift-dragging
  if (drag && drag.mode === 'marquee') {
    const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1);
    s += `<rect x="${x}" y="${y}" width="${Math.abs(drag.x1 - drag.x0)}" height="${Math.abs(drag.y1 - drag.y0)}" fill="rgba(47,111,237,0.08)" stroke="#2f6fed" stroke-width="${1 / z}" stroke-dasharray="${4 / z} ${3 / z}"/>`;
  }
  // multi-selection: dashed box on each member
  if (state.selection?.kind === 'multi') {
    for (const id of state.selection.els) {
      const el = state.elements.find(q => q.id === id);
      if (!el) continue;
      const sz = getSize(el);
      s += `<g transform="translate(${el.x} ${el.y}) rotate(${el.rot || 0})">` +
        `<rect x="${-sz.w / 2 - 5}" y="${-sz.h / 2 - 5}" width="${sz.w + 10}" height="${sz.h + 10}" fill="none" stroke="#2f6fed" stroke-width="${1.2 / z}" stroke-dasharray="${4 / z} ${3 / z}"/></g>`;
    }
    for (const id of state.selection.beams) {
      const b = state.beams.find(q => q.id === id);
      if (b) s += `<polyline points="${ptsAttr(b.pts)}" fill="none" stroke="#2f6fed" stroke-width="${1.2 / z}" stroke-dasharray="${4 / z} ${3 / z}"/>`;
    }
  }
  if (sel && state.selection.kind === 'element') {
    const sz = getSize(sel);
    const hw = sz.w / 2 + 6, hh = sz.h / 2 + 6;
    s += `<g transform="translate(${sel.x} ${sel.y}) rotate(${sel.rot || 0})">` +
      `<rect x="${-hw}" y="${-hh}" width="${2 * hw}" height="${2 * hh}" fill="none" stroke="#2f6fed" stroke-width="${1.2 / z}" stroke-dasharray="${4 / z} ${3 / z}"/>` +
      `<line x1="0" y1="${-hh}" x2="0" y2="${-hh - 18 / z}" stroke="#2f6fed" stroke-width="${1.2 / z}"/>` +
      `<circle id="rotHandle" cx="0" cy="${-hh - 22 / z}" r="${5 / z}" fill="#fff" stroke="#2f6fed" stroke-width="${1.5 / z}"/>` +
      `</g>`;
  } else if (sel && state.selection.kind === 'beam') {
    s += `<polyline points="${ptsAttr(sel.pts)}" fill="none" stroke="#2f6fed" stroke-width="${1 / z}" stroke-dasharray="${4 / z} ${3 / z}"/>`;
    sel.pts.forEach((p, i) => {
      s += `<circle data-vtx="${i}" cx="${p.x}" cy="${p.y}" r="${4.5 / z}" fill="#fff" stroke="#2f6fed" stroke-width="${1.5 / z}"/>`;
    });
    if (sel.kind === 'fiber') {
      const a = sel.pts[0], b = sel.pts[sel.pts.length - 1];
      s += `<text x="${a.x + 9 / z}" y="${a.y - 9 / z}" font-size="${12 / z}" font-weight="700" fill="#2f6fed">A</text>`;
      s += `<text x="${b.x + 9 / z}" y="${b.y - 9 / z}" font-size="${12 / z}" font-weight="700" fill="#2f6fed">B</text>`;
    }
  }
  overlayLayer.innerHTML = s;
}

// ---------- hit testing ----------
function hitElement(w) {
  for (let i = state.elements.length - 1; i >= 0; i--) {
    const el = state.elements[i];
    const sz = getSize(el);
    const l = toLocal(el, w.x, w.y);
    if (Math.abs(l.x) <= sz.w / 2 + 4 && Math.abs(l.y) <= sz.h / 2 + 4) return el;
  }
  return null;
}

function hitBeam(w) {
  const tol = 6 / state.view.z;
  for (let i = state.beams.length - 1; i >= 0; i--) {
    const b = state.beams[i];
    for (let j = 0; j < b.pts.length - 1; j++) {
      if (distToSegment(w, b.pts[j], b.pts[j + 1]) < tol + b.width / 2) return b;
    }
  }
  return null;
}

function hitVertex(sel, w) {
  if (!sel || state.selection.kind !== 'beam') return -1;
  const tol = 8 / state.view.z;
  for (let i = 0; i < sel.pts.length; i++) {
    if (Math.hypot(sel.pts[i].x - w.x, sel.pts[i].y - w.y) < tol) return i;
  }
  return -1;
}

function hitRotHandle(sel, w) {
  if (!sel || state.selection.kind !== 'element') return false;
  const sz = getSize(sel);
  const l = toLocal(sel, w.x, w.y);
  const hy = -(sz.h / 2 + 6) - 22 / state.view.z;
  return Math.hypot(l.x, l.y - hy) < 9 / state.view.z;
}

// ---------- interactions ----------
let drag = null;     // {mode, ...}
let drawing = null;  // manual beam in progress {pts:[], cursor}
let placing = null;  // {el, pos}
let spaceDown = false;

function notifyTool(detail = { mode: 'select' }) {
  document.dispatchEvent(new CustomEvent('optics:toolchange', { detail }));
}

export function startPlacing(type) {
  drawing = null;
  placing = { el: createElement(type), pos: null };
  state.tool = 'place:' + type;
  setStatus('');
  notifyTool({ mode: 'place', type, label: registry[type].label });
  renderAll();
}

export function startBeamTool(kind = 'beam') {
  placing = null;
  state.tool = 'beam';
  drawing = { pts: [], cursor: null, kindType: kind };
  setStatus('');
  notifyTool({ mode: kind, label: kind === 'fiber' ? 'Optical fiber' : 'Manual beam' });
  renderAll();
}

export function cancelTool() {
  placing = null; drawing = null;
  state.tool = 'select';
  setStatus('');
  notifyTool();
  renderAll();
}

export function isPlacing() { return !!placing; }
export function rotatePlacing(deg) {
  if (placing) {
    placing.el.rot = ((((placing.el.rot || 0) + deg) % 360) + 360) % 360;
    renderAll();
  }
}

export function finishBeam() {
  const pts = distinctPoints(drawing?.pts);
  if (drawing && pts.length >= 2) {
    pushUndo();
    const isFiber = drawing.kindType === 'fiber';
    const beam = isFiber
      ? {
        id: 'b' + Math.random().toString(36).slice(2, 9), kind: 'fiber', pts, color: '#e8a800', width: 4, propagate: false,
        inputNA: 0.22, groupIndex: 1.468, lossDbPerM: 0.2,
        out0: { mode: 'diverge', na: 0.12, focal: 20, dia: 6 },
        out1: { mode: 'diverge', na: 0.12, focal: 20, dia: 6 },
      }
      : { id: 'b' + Math.random().toString(36).slice(2, 9), kind: 'beam', pts, color: '#e02020', width: 2, dash: false, arrow: true };
    state.beams.push(beam);
    state.selection = { kind: 'beam', id: beam.id };
    drawing = null; state.tool = 'select';
    setStatus('');
    notifyTool();
    changed(); onSelectionChange();
  } else {
    cancelTool();
  }
}

function setStatus(t) { if (statusEl) statusEl.textContent = t; }

function bindPointer() {
  svg.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  svg.addEventListener('dblclick', e => {
    if (state.tool === 'beam' && drawing) { e.preventDefault(); finishBeam(); }
  });
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && (e.target === document.body || e.target === svg)) {
      spaceDown = true; svg.style.cursor = 'grab'; e.preventDefault();
    }
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space') { spaceDown = false; svg.style.cursor = ''; } });
  window.addEventListener('blur', () => { spaceDown = false; svg.style.cursor = ''; });
}

function onDown(e) {
  svg.focus({ preventScroll: true });
  if (e.button === 1 || spaceDown) {
    drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, vx: state.view.x, vy: state.view.y };
    svg.setPointerCapture(e.pointerId);
    return;
  }
  if (e.button !== 0) return;
  const w = screenToWorld(e.clientX, e.clientY);

  if (placing) {
    pushUndo();
    const el = placing.el;
    el.x = snapPos(w.x); el.y = snapPos(w.y);
    state.elements.push(el);
    state.selection = { kind: 'element', id: el.id };
    const type = el.type;
    placing = e.shiftKey ? { el: createElement(type), pos: { x: snapPos(w.x), y: snapPos(w.y) } } : null;
    if (!placing) { state.tool = 'select'; setStatus(''); notifyTool(); }
    changed(); onSelectionChange();
    return;
  }

  if (state.tool === 'beam') {
    const p = { x: snapPos(w.x), y: snapPos(w.y) };
    const prev = drawing.pts[drawing.pts.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 1e-6) drawing.pts.push(p);
    renderAll();
    return;
  }

  // shift interactions: toggle membership on objects, marquee on empty space
  if (e.shiftKey) {
    const elHit = hitElement(w);
    const bHit = elHit ? null : hitBeam(w);
    if (elHit || bHit) {
      const s = state.selection;
      let els = [], bms = [];
      if (s?.kind === 'multi') { els = [...s.els]; bms = [...s.beams]; }
      else if (s?.kind === 'element') els = [s.id];
      else if (s?.kind === 'beam') bms = [s.id];
      const list = elHit ? els : bms, id = (elHit || bHit).id;
      const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1); else list.push(id);
      state.selection = els.length + bms.length > 1 ? { kind: 'multi', els, beams: bms }
        : els.length ? { kind: 'element', id: els[0] }
          : bms.length ? { kind: 'beam', id: bms[0] } : null;
      renderAll(); onSelectionChange();
      return;
    }
    drag = { mode: 'marquee', x0: w.x, y0: w.y, x1: w.x, y1: w.y };
    svg.setPointerCapture(e.pointerId);
    return;
  }

  // group drag: clicking any member of a multi-selection moves the whole group
  const msel = state.selection;
  if (msel?.kind === 'multi') {
    const elHit = hitElement(w);
    const bHit = elHit ? null : hitBeam(w);
    if ((elHit && msel.els.includes(elHit.id)) || (bHit && msel.beams.includes(bHit.id))) {
      drag = {
        mode: 'movemulti', sx: w.x, sy: w.y, moved: false,
        items: msel.els.map(id => state.elements.find(q => q.id === id)).filter(Boolean).map(t => ({ el: t, x0: t.x, y0: t.y })),
        bitems: msel.beams.map(id => state.beams.find(q => q.id === id)).filter(Boolean).map(t => ({ b: t, pts0: t.pts.map(p => ({ ...p })) })),
      };
      svg.setPointerCapture(e.pointerId);
      return;
    }
  }

  const sel = findSelected();
  // rotation handle?
  if (hitRotHandle(sel, w)) {
    drag = { mode: 'rotate', el: sel, moved: false };
    svg.setPointerCapture(e.pointerId);
    return;
  }
  // beam vertex?
  const vi = hitVertex(sel, w);
  if (vi >= 0) {
    drag = { mode: 'vertex', beam: sel, i: vi, moved: false };
    svg.setPointerCapture(e.pointerId);
    return;
  }
  // element?
  const el = hitElement(w);
  if (el) {
    state.selection = { kind: 'element', id: el.id };
    drag = { mode: 'move', el, ox: el.x - w.x, oy: el.y - w.y, moved: false };
    svg.setPointerCapture(e.pointerId);
    renderAll(); onSelectionChange();
    return;
  }
  // manual beam?
  const b = hitBeam(w);
  if (b) {
    state.selection = { kind: 'beam', id: b.id };
    drag = { mode: 'movebeam', beam: b, lx: w.x, ly: w.y, moved: false };
    svg.setPointerCapture(e.pointerId);
    renderAll(); onSelectionChange();
    return;
  }
  // empty space: deselect + pan
  if (state.selection) { state.selection = null; renderAll(); onSelectionChange(); }
  drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, vx: state.view.x, vy: state.view.y };
  svg.setPointerCapture(e.pointerId);
}

function onMove(e) {
  const w = screenToWorld(e.clientX, e.clientY);
  if (statusEl && !drag && !placing && state.tool === 'select') {
    statusEl.textContent = `x ${Math.round(w.x)} mm,  y ${Math.round(w.y)} mm`;
  }
  if (placing) { placing.pos = { x: snapPos(w.x), y: snapPos(w.y) }; renderElements(); return; }
  if (drawing) { drawing.cursor = { x: snapPos(w.x), y: snapPos(w.y) }; renderManual(); return; }
  if (!drag) return;

  if (drag.mode === 'pan') {
    state.view.x = drag.vx + (e.clientX - drag.sx);
    state.view.y = drag.vy + (e.clientY - drag.sy);
    renderAll();
  } else if (drag.mode === 'move') {
    const x = snapPos(w.x + drag.ox), y = snapPos(w.y + drag.oy);
    if (x === drag.el.x && y === drag.el.y) return;
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    drag.el.x = x;
    drag.el.y = y;
    renderAll();
  } else if (drag.mode === 'rotate') {
    let a = Math.atan2(w.y - drag.el.y, w.x - drag.el.x) * 180 / Math.PI + 90;
    if (!e.shiftKey) a = Math.round(a / 5) * 5;
    a = ((a % 360) + 360) % 360;
    if (a === drag.el.rot) return;
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    drag.el.rot = a;
    renderAll();
  } else if (drag.mode === 'marquee') {
    drag.x1 = w.x; drag.y1 = w.y;
    renderAll();
  } else if (drag.mode === 'movemulti') {
    const dx = snapPos(w.x - drag.sx), dy = snapPos(w.y - drag.sy);
    if (dx === drag.dx && dy === drag.dy) return;
    if (!drag.moved && dx === 0 && dy === 0) return;
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    drag.dx = dx; drag.dy = dy;
    for (const it of drag.items) { it.el.x = it.x0 + dx; it.el.y = it.y0 + dy; }
    for (const it of drag.bitems) {
      it.b.pts.forEach((p, i) => { p.x = it.pts0[i].x + dx; p.y = it.pts0[i].y + dy; });
    }
    renderAll();
  } else if (drag.mode === 'vertex') {
    const p = { x: snapPos(w.x), y: snapPos(w.y) };
    const old = drag.beam.pts[drag.i];
    if (p.x === old.x && p.y === old.y) return;
    const before = drag.beam.pts[drag.i - 1], after = drag.beam.pts[drag.i + 1];
    if ((before && Math.hypot(p.x - before.x, p.y - before.y) <= 1e-6)
      || (after && Math.hypot(p.x - after.x, p.y - after.y) <= 1e-6)) return;
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    drag.beam.pts[drag.i] = p;
    renderAll();
  } else if (drag.mode === 'movebeam') {
    const dx = w.x - drag.lx, dy = w.y - drag.ly;
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      if (!drag.moved) { pushUndo(); drag.moved = true; }
      for (const p of drag.beam.pts) { p.x += dx; p.y += dy; }
      drag.lx = w.x; drag.ly = w.y;
      renderAll();
    }
  }
}

function onUp(e) {
  if (!drag) return;
  if (e.type === 'pointercancel') {
    const wasChange = drag.moved === true && ['move', 'rotate', 'vertex', 'movebeam', 'movemulti'].includes(drag.mode);
    drag = null;
    renderAll();
    if (wasChange) { changed(); onSelectionChange(); }
    return;
  }
  if (drag.mode === 'marquee') {
    const x0 = Math.min(drag.x0, drag.x1), x1 = Math.max(drag.x0, drag.x1);
    const y0 = Math.min(drag.y0, drag.y1), y1 = Math.max(drag.y0, drag.y1);
    const inside = p => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
    const els = state.elements.filter(el => inside(el)).map(el => el.id);
    const bms = state.beams.filter(b => b.pts.some(inside)).map(b => b.id);
    state.selection = els.length + bms.length > 1 ? { kind: 'multi', els, beams: bms }
      : els.length ? { kind: 'element', id: els[0] }
        : bms.length ? { kind: 'beam', id: bms[0] } : null;
    drag = null;
    renderAll(); onSelectionChange();
    return;
  }
  const wasChange = drag.moved === true && ['move', 'rotate', 'vertex', 'movebeam', 'movemulti'].includes(drag.mode);
  drag = null;
  if (wasChange) { changed(); onSelectionChange(); }
}

function bindWheel() {
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const v = state.view;
    if (e.ctrlKey || e.metaKey) {
      const r = svg.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const factor = Math.exp(-e.deltaY * 0.012);
      const z2 = Math.min(8, Math.max(0.15, v.z * factor));
      v.x = mx - (mx - v.x) * (z2 / v.z);
      v.y = my - (my - v.y) * (z2 / v.z);
      v.z = z2;
    } else {
      v.x -= e.deltaX;
      v.y -= e.deltaY;
    }
    renderAll();
  }, { passive: false });
}

export function zoomBy(factor) {
  const r = svg.getBoundingClientRect();
  const v = state.view;
  const mx = r.width / 2, my = r.height / 2;
  const z2 = Math.min(8, Math.max(0.15, v.z * factor));
  v.x = mx - (mx - v.x) * (z2 / v.z);
  v.y = my - (my - v.y) * (z2 / v.z);
  v.z = z2;
  renderAll();
}

export function zoomFit() {
  // if the canvas hasn't been laid out yet, retry on the next frame
  const rect = svg.getBoundingClientRect();
  if (rect.width < 50 || rect.height < 50) { requestAnimationFrame(zoomFit); return; }
  const pts = [];
  for (const el of state.elements) {
    const b = getVisualBounds(el);
    if (b) pts.push({ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y1 });
  }
  for (const b of state.beams) pts.push(...b.pts);
  if (!pts.length) { state.view = { x: 60, y: 40, z: 1 }; renderAll(); return; }
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.min(...xs) - 40, x1 = Math.max(...xs) + 40;
  const y0 = Math.min(...ys) - 40, y1 = Math.max(...ys) + 40;
  const r = svg.getBoundingClientRect();
  const z = Math.min(8, Math.max(0.15, Math.min(r.width / (x1 - x0), r.height / (y1 - y0))));
  state.view = { x: (r.width - (x0 + x1) * z) / 2, y: (r.height - (y0 + y1) * z) / 2, z };
  renderAll();
}
