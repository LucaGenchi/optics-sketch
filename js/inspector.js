// Right-hand inspector: edit properties of the selected element or manual beam.

import { state, changed, pushUndo, findSelected } from './state.js';
import { registry, newShaperLayer, MAX_SHAPER_LAYERS } from './elements.js';
import { esc } from './util.js';

let panel;
let undoArmed = false; // push one undo snapshot per editing session

export function initInspector(el) { panel = el; }

function field(labelText, inputHTML) {
  return `<div class="field"><label>${esc(labelText)}</label>${inputHTML}</div>`;
}

const LAYER_TYPES = [['lensarray', 'Lens array'], ['grating', 'Grating'], ['steer', 'Beam steer'], ['speckle', 'Speckle / diffuser']];

function layersHTML(layers) {
  let h = `<div class="lsechead">Optical function — overlay up to ${MAX_SHAPER_LAYERS} structures</div>`;
  layers.forEach((ly, i) => {
    h += `<div class="layer"><div class="layerrow">
      <select data-li="${i}" data-lk="type">` +
      LAYER_TYPES.map(([v, l]) => `<option value="${v}" ${v === ly.type ? 'selected' : ''}>${l}</option>`).join('') +
      `</select><button class="layerdel" data-ldel="${i}" title="Remove this structure">✕</button></div>`;
    if (ly.type === 'lensarray') {
      h += field('Nr. of lenses (1–8)', `<input type="number" data-li="${i}" data-lk="n" min="1" max="8" step="1" value="${ly.n}">`);
      h += field('Focal length (mm)', `<input type="number" data-li="${i}" data-lk="f" step="5" value="${ly.f}">`);
    } else if (ly.type === 'grating') {
      h += field('Lines / mm', `<input type="number" data-li="${i}" data-lk="lines" min="10" max="3600" step="10" value="${ly.lines}">`);
      h += field('Orders', `<input type="text" data-li="${i}" data-lk="orders" value="${esc(ly.orders)}">`);
    } else if (ly.type === 'speckle') {
      h += field('Divergence (°)', `<input type="number" data-li="${i}" data-lk="div" min="0.5" max="40" step="0.5" value="${ly.div ?? 8}">`);
    } else {
      h += field('Steer angle (°)', `<input type="number" data-li="${i}" data-lk="angle" step="0.5" value="${ly.angle}">`);
    }
    h += `</div>`;
  });
  if (!layers.length) h += `<div class="hint">Flat surface (plain ${''}reflection). Add a structure to shape the wavefront.</div>`;
  if (layers.length < MAX_SHAPER_LAYERS) h += `<button id="layerAdd" class="layeradd">＋ Add structure</button>`;
  return h;
}

export function renderInspector() {
  const sel = findSelected();
  undoArmed = false;
  if (state.selection?.kind === 'multi') {
    const n = state.selection.els.length + state.selection.beams.length;
    panel.innerHTML = `<h3>${n} objects selected</h3>
      <div class="hint">Drag any selected object to move the group.<br>
      Shift-click adds or removes objects.<br>⌫ deletes all · ⌘D duplicates all.</div>
      <div class="btnrow"><button id="inspDup">Duplicate</button><button id="inspDel" class="danger">Delete</button></div>`;
    panel.querySelector('#inspDel').addEventListener('click', () => document.dispatchEvent(new CustomEvent('optics:delete')));
    panel.querySelector('#inspDup').addEventListener('click', () => document.dispatchEvent(new CustomEvent('optics:duplicate')));
    return;
  }
  if (!sel) {
    panel.innerHTML = `<div class="hint">Nothing selected.<br><br>
      Click an element in the palette, then click the canvas to place it.<br><br>
      <b>Shortcuts</b><br>
      R / ⇧R — rotate ±45°<br>
      ⌘D — duplicate · ⌫ — delete<br>
      Arrows — nudge (⇧ = table hole)<br>
      Scroll — pan · ⌘/ctrl-scroll — zoom<br>
      Space-drag — pan</div>`;
    return;
  }

  if (state.selection.kind === 'element') {
    const def = registry[sel.type];
    let h = `<h3>${esc(def.label)}</h3>`;
    h += field('X (mm)', `<input type="number" step="1" data-k="x" value="${Math.round(sel.x * 10) / 10}">`);
    h += field('Y (mm)', `<input type="number" step="1" data-k="y" value="${Math.round(sel.y * 10) / 10}">`);
    h += field('Angle (°)', `<input type="number" step="1" data-k="rot" value="${Math.round((sel.rot || 0) * 10) / 10}">`);
    if (!def.noLabel) {
      h += field('Label', `<input type="text" data-k="label" value="${esc(sel.label || '')}">`);
      h += field('Show label', `<input type="checkbox" data-k="showLabel" ${sel.showLabel ? 'checked' : ''}>`);
      if (sel.showLabel) {
        const lp = sel.labelPos || 'b';
        h += field('Label position', `<select data-k="labelPos">` +
          [['b', 'Below'], ['t', 'Above'], ['l', 'Left'], ['r', 'Right']].map(([v, l]) => `<option value="${v}" ${v === lp ? 'selected' : ''}>${l}</option>`).join('') + `</select>`);
      }
    }
    for (const p of def.params || []) {
      if (p.show && !p.show(sel.params)) continue;
      const v = sel.params[p.key];
      if (p.type === 'number') {
        if (p.negative) {
          // fixed − sign outside the box; the user types the magnitude,
          // the stored value is always negative (e.g. convex mirror f)
          h += field(p.label, `<span class="negsign">−</span><input type="number" data-p="${p.key}" data-neg="1" min="${p.min}" max="${p.max}" step="${p.step}" value="${Math.abs(v)}">`);
        } else {
          h += field(p.label, `<input type="number" data-p="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${v}">`);
        }
      }
      else if (p.type === 'text') h += field(p.label, `<input type="text" data-p="${p.key}" value="${esc(v)}">`);
      else if (p.type === 'checkbox') h += field(p.label, `<input type="checkbox" data-p="${p.key}" ${v ? 'checked' : ''}>`);
      else if (p.type === 'color') h += field(p.label, `<input type="color" data-p="${p.key}" value="${v}">`);
      else if (p.type === 'select') {
        h += field(p.label, `<select data-p="${p.key}">` + p.options.map(([ov, ol]) => `<option value="${ov}" ${ov === v ? 'selected' : ''}>${esc(ol)}</option>`).join('') + `</select>`);
      }
      else if (p.type === 'layers') h += layersHTML(sel.params[p.key] || (sel.params[p.key] = []));
      else if (p.type === 'optsize') {
        const STD = [[12.7, '½″ (12.7 mm)'], [25.4, '1″ (25.4 mm)'], [50.8, '2″ (50.8 mm)']];
        const isStd = STD.some(([s]) => s === v);
        h += field(p.label, `<select data-p="${p.key}" data-optsize="1">` +
          STD.map(([s, l]) => `<option value="${s}" ${v === s ? 'selected' : ''}>${l}</option>`).join('') +
          `<option value="custom" ${!isStd ? 'selected' : ''}>Custom…</option></select>`);
        if (!isStd) h += field('↳ size (mm)', `<input type="number" data-p="${p.key}" min="1" max="500" step="0.5" value="${v}">`);
      }
    }
    h += `<div class="btnrow"><button id="inspDup">Duplicate</button><button id="inspDel" class="danger">Delete</button></div>`;
    panel.innerHTML = h;
  } else {
    const b = sel;
    const isFiber = b.kind === 'fiber';
    let h = `<h3>${isFiber ? 'Optical fiber' : 'Manual beam'}</h3>`;
    h += field('Color', `<input type="color" data-k="color" value="${b.color}">`);
    h += field('Width', `<input type="number" data-k="width" min="0.5" max="20" step="0.5" value="${b.width}">`);
    if (!isFiber) {
      h += field('Dashed', `<input type="checkbox" data-k="dash" ${b.dash ? 'checked' : ''}>`);
      h += field('Arrowhead', `<input type="checkbox" data-k="arrow" ${b.arrow ? 'checked' : ''}>`);
    } else {
      h += field('Beam propagates', `<input type="checkbox" data-k="propagate" ${b.propagate ? 'checked' : ''}>`);
      if (b.propagate) {
        // one output spec per fiber end; migrate legacy single-spec fibers
        for (const end of [0, 1]) {
          if (!b['out' + end]) b['out' + end] = { mode: b.outMode || 'diverge', na: b.na ?? 0.12, focal: b.focal ?? 20, dia: b.outDia ?? 6 };
        }
        for (const end of [0, 1]) {
          const o = b['out' + end];
          h += `<div class="lsechead">Output at end ${end === 0 ? 'A' : 'B'}</div>`;
          h += field('Style', `<select data-fend="${end}" data-fk="mode">
            <option value="diverge" ${o.mode !== 'focus' ? 'selected' : ''}>Diverging (NA)</option>
            <option value="focus" ${o.mode === 'focus' ? 'selected' : ''}>Lensed (focus)</option></select>`);
          if (o.mode !== 'focus') {
            h += field('NA', `<input type="number" data-fend="${end}" data-fk="na" min="0.01" max="0.95" step="0.01" value="${o.na ?? 0.12}">`);
          } else {
            h += field('Focal length (mm)', `<input type="number" data-fend="${end}" data-fk="focal" min="2" max="500" step="1" value="${o.focal ?? 20}">`);
            h += field('Output beam Ø (mm)', `<input type="number" data-fend="${end}" data-fk="dia" min="1" max="30" step="0.5" value="${o.dia ?? 6}">`);
          }
        }
        h += `<div class="hint">Ends A and B are marked on the canvas while the fiber is selected. Light entering one end exits the other with that end's output spec.</div>`;
      } else {
        h += `<div class="hint">Connectors block incoming beams. Enable propagation to relaunch the beam from the other end.</div>`;
      }
    }
    h += `<div class="hint">Drag the round handles on the canvas to reshape ${isFiber ? 'the fiber' : 'the beam'}.</div>`;
    h += `<div class="btnrow"><button id="inspDel" class="danger">Delete</button></div>`;
    panel.innerHTML = h;
  }

  panel.querySelectorAll('input,select').forEach(inp => {
    inp.addEventListener('input', () => applyInput(inp));
    inp.addEventListener('change', () => applyInput(inp, true));
  });
  const del = panel.querySelector('#inspDel');
  if (del) del.addEventListener('click', () => document.dispatchEvent(new CustomEvent('optics:delete')));
  const dup = panel.querySelector('#inspDup');
  if (dup) dup.addEventListener('click', () => document.dispatchEvent(new CustomEvent('optics:duplicate')));
  // wavefront-shaper layer add/remove
  const addBtn = panel.querySelector('#layerAdd');
  if (addBtn) addBtn.addEventListener('click', () => {
    const s = findSelected();
    if (!s) return;
    pushUndo();
    (s.params.layers || (s.params.layers = [])).push(newShaperLayer());
    changed();
    renderInspector();
  });
  panel.querySelectorAll('[data-ldel]').forEach(btn => btn.addEventListener('click', () => {
    const s = findSelected();
    if (!s) return;
    pushUndo();
    s.params.layers.splice(+btn.dataset.ldel, 1);
    changed();
    renderInspector();
  }));
}

function applyInput(inp, rebuild = false) {
  const sel = findSelected();
  if (!sel) return;
  if (!undoArmed) { pushUndo(); undoArmed = true; }
  const key = inp.dataset.k, pkey = inp.dataset.p;
  let val;
  if (inp.type === 'checkbox') val = inp.checked;
  else if (inp.type === 'number') { val = parseFloat(inp.value); if (!isFinite(val)) return; }
  else val = inp.value;
  if (inp.dataset.neg) val = -Math.abs(val); // − sign lives outside the box

  // per-end fiber output fields
  if (inp.dataset.fend !== undefined) {
    const o = sel['out' + inp.dataset.fend];
    if (!o) return;
    o[inp.dataset.fk] = val;
    changed();
    if (rebuild && inp.dataset.fk === 'mode') renderInspector();
    return;
  }

  // standard optic size dropdown (½″ / 1″ / 2″ / custom)
  if (inp.dataset.optsize) {
    if (inp.value === 'custom') {
      // nudge off the standard value so the custom field appears
      const cur = sel.params[pkey];
      if (cur === 12.7 || cur === 25.4 || cur === 50.8) sel.params[pkey] = Math.round(cur);
    } else {
      sel.params[pkey] = parseFloat(inp.value);
    }
    changed();
    if (rebuild) renderInspector();
    return;
  }

  // wavefront-shaper layer fields
  if (inp.dataset.li !== undefined) {
    const layers = sel.params.layers;
    const ly = layers && layers[+inp.dataset.li];
    if (!ly) return;
    ly[inp.dataset.lk] = val;
    changed();
    if (rebuild && inp.dataset.lk === 'type') renderInspector();
    return;
  }

  if (key) sel[key] = val;
  else if (pkey) sel.params[pkey] = val;
  changed();
  if (rebuild && (key === 'propagate' || key === 'outMode' || key === 'showLabel')) { renderInspector(); return; }
  // conditional params (show/hide) need a panel rebuild — only on 'change' to not steal focus
  if (rebuild && ['dtype', 'ftype', 'beamMode', 'autoColor', 'convert', 'bwMode', 'raysMode', 'zeroOrder', 'modulate', 'mode'].includes(pkey)) renderInspector();
}
