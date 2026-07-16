// App state, undo/redo, autosave.

export const state = {
  elements: [],   // optical elements
  beams: [],      // manual beams: {id, kind:'beam', pts:[{x,y}], color, width, dash, arrow}
  selection: null, // {kind:'element'|'beam', id}
  view: { x: 60, y: 40, z: 1 },
  showGrid: true,
  snap: true,
  showFocal: true,
  tool: 'select', // 'select' | 'beam' | 'place:<type>'
};

const undoStack = [], redoStack = [];
const listeners = [];
const AUTOSAVE_KEY = 'optics2d-autosave-v1';

export function onChange(fn) { listeners.push(fn); }

export function changed() {
  try { localStorage.setItem(AUTOSAVE_KEY, serialize()); } catch (e) { /* ignore */ }
  for (const fn of listeners) fn();
}

function snapshot() {
  return JSON.stringify({ elements: state.elements, beams: state.beams });
}

export function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 100) undoStack.shift();
  redoStack.length = 0;
}

function restore(snap) {
  const d = JSON.parse(snap);
  state.elements = d.elements;
  state.beams = d.beams;
  const sel = state.selection;
  if (sel && !findSelected()) state.selection = null;
  changed();
}

export function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
}

export function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
}

export function findSelected() {
  const s = state.selection;
  if (!s) return null;
  if (s.kind === 'multi') return null;
  if (s.kind === 'element') return state.elements.find(e => e.id === s.id) || null;
  return state.beams.find(b => b.id === s.id) || null;
}

export function serialize() {
  return JSON.stringify({ app: 'optics2d', version: 1, elements: state.elements, beams: state.beams }, null, 1);
}

export function deserialize(text) {
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.elements)) throw new Error('Not a valid optics sketch file');
  state.elements = d.elements;
  state.beams = d.beams || [];
  state.selection = null;
  undoStack.length = 0; redoStack.length = 0;
  changed();
}

export function loadAutosave() {
  try {
    const t = localStorage.getItem(AUTOSAVE_KEY);
    if (t) { const d = JSON.parse(t); state.elements = d.elements || []; state.beams = d.beams || []; return true; }
  } catch (e) { /* ignore */ }
  return false;
}
