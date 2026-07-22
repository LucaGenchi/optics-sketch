import { createElement, getElementMeta, registry } from '../sketch/js/elements.js';
import { C_MM_PER_NS } from '../sketch/js/pulses.js';
import { detectorReading, traceScene } from '../sketch/js/raytrace.js';
import { parseSketch } from '../sketch/js/state.js';
import { distToSegment } from '../sketch/js/util.js';

const LABEL_POSITIONS = new Set(['b', 't', 'l', 'r']);
const EVIDENCE_STATUSES = new Set(['direct', 'referenced', 'inferred', 'unknown']);
const CHECK_KINDS = new Set([
  'element',
  'source_reaches',
  'pulse_overlap',
  'detector',
  'detector_source',
]);

const record = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const jsonEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stableId(type, index) {
  return `${type}-${index + 1}`;
}

function serializeParam(spec) {
  const param = {
    key: spec.key,
    label: spec.label,
    type: spec.type,
    default: clone(spec.def),
  };
  for (const key of ['min', 'max', 'step', 'negative', 'hidden']) {
    if (spec[key] !== undefined) param[key] = spec[key];
  }
  if (Array.isArray(spec.options)) {
    param.options = spec.options.map(([value, label]) => ({ value, label }));
  }
  return param;
}

export function componentCatalog(query = '', { includeHidden = false } = {}) {
  const needle = String(query).trim().toLowerCase();
  return Object.entries(registry)
    .filter(([, definition]) => includeHidden || !definition.hidden)
    .map(([type, definition]) => {
      const element = createElement(type, 0, 0);
      return {
        type,
        label: definition.label,
        category: definition.category,
        hidden: definition.hidden === true,
        capability: getElementMeta(type, element.params),
        params: (definition.params || []).map(serializeParam),
      };
    })
    .filter(item => !needle || [item.type, item.label, item.category, item.capability.description]
      .some(value => String(value || '').toLowerCase().includes(needle)))
    .sort((a, b) => a.category.localeCompare(b.category)
      || a.label.localeCompare(b.label));
}

function assertElementSpec(raw, index, usedIds) {
  if (!record(raw)) throw new Error(`Element ${index + 1} must be an object`);
  if (typeof raw.type !== 'string' || !registry[raw.type]) {
    throw new Error(`Element ${index + 1} uses unknown type: ${String(raw.type)}`);
  }
  if (!finite(raw.x) || !finite(raw.y)) {
    throw new Error(`Element ${raw.type} needs finite x and y coordinates`);
  }
  if (raw.rot !== undefined && !finite(raw.rot)) {
    throw new Error(`Element ${raw.type} has a non-finite rotation`);
  }
  if (raw.labelPos !== undefined && !LABEL_POSITIONS.has(raw.labelPos)) {
    throw new Error(`Element ${raw.type} has invalid labelPos: ${String(raw.labelPos)}`);
  }
  if (raw.params !== undefined && !record(raw.params)) {
    throw new Error(`Element ${raw.type} params must be an object`);
  }

  const id = raw.id ?? stableId(raw.type, index);
  if (typeof id !== 'string' || !id) throw new Error(`Element ${raw.type} needs a non-empty string id`);
  if (usedIds.has(id)) throw new Error(`Duplicate scene id: ${id}`);
  usedIds.add(id);

  const definition = registry[raw.type];
  const paramKeys = new Set((definition.params || []).map(param => param.key));
  for (const key of Object.keys(raw.params || {})) {
    if (!paramKeys.has(key)) throw new Error(`Unknown parameter ${raw.type}.${key}`);
  }

  const element = createElement(raw.type, raw.x, raw.y);
  element.id = id;
  element.rot = raw.rot ?? 0;
  element.label = typeof raw.label === 'string' ? raw.label : '';
  element.showLabel = raw.showLabel === true;
  if (raw.labelPos) element.labelPos = raw.labelPos;
  Object.assign(element.params, clone(raw.params || {}));
  return element;
}

function assertBeamSpec(raw, index, usedIds) {
  if (!record(raw)) throw new Error(`Connector ${index + 1} must be an object`);
  const id = raw.id ?? `connector-${index + 1}`;
  if (typeof id !== 'string' || !id) throw new Error(`Connector ${index + 1} needs a non-empty string id`);
  if (usedIds.has(id)) throw new Error(`Duplicate scene id: ${id}`);
  usedIds.add(id);
  return { ...clone(raw), id };
}

export function buildSceneFromSpec(spec) {
  if (!record(spec) || !Array.isArray(spec.elements)) {
    throw new Error('Scene spec must be an object with an elements array');
  }
  if (spec.beams !== undefined && !Array.isArray(spec.beams)) {
    throw new Error('Scene spec beams must be an array');
  }

  const usedIds = new Set();
  const rawScene = {
    app: 'optics2d',
    version: 1,
    elements: spec.elements.map((element, index) => assertElementSpec(element, index, usedIds)),
    beams: (spec.beams || []).map((beam, index) => assertBeamSpec(beam, index, usedIds)),
  };
  const normalized = parseSketch(rawScene, registry);

  for (let index = 0; index < spec.elements.length; index++) {
    const requested = spec.elements[index].params || {};
    const actual = normalized.elements[index].params;
    for (const [key, value] of Object.entries(requested)) {
      if (!jsonEqual(actual[key], value)) {
        throw new Error(
          `Parameter ${spec.elements[index].type}.${key} was normalized from ${JSON.stringify(value)} `
          + `to ${JSON.stringify(actual[key])}; correct the evidence-backed value`,
        );
      }
    }
  }

  return { app: 'optics2d', version: 1, ...normalized };
}

function nearestDistance(points, target) {
  if (!Array.isArray(points) || points.length === 0) return Infinity;
  if (points.length === 1) return Math.hypot(points[0].x - target.x, points[0].y - target.y);
  let best = Infinity;
  for (let index = 0; index < points.length - 1; index++) {
    best = Math.min(best, distToSegment(target, points[index], points[index + 1]));
  }
  return best;
}

function nearestTrackArrival(track, target) {
  if (!Array.isArray(track?.pts) || !Array.isArray(track?.opls)
    || track.pts.length !== track.opls.length || track.pts.length < 2) return null;
  let best = null;
  for (let index = 0; index < track.pts.length - 1; index++) {
    const a = track.pts[index], b = track.pts[index + 1];
    const vx = b.x - a.x, vy = b.y - a.y;
    const length2 = vx * vx + vy * vy;
    const fraction = length2 > 1e-18
      ? Math.min(1, Math.max(0, ((target.x - a.x) * vx + (target.y - a.y) * vy) / length2))
      : 0;
    const x = a.x + fraction * vx, y = a.y + fraction * vy;
    const distance = Math.hypot(x - target.x, y - target.y);
    const opl = track.opls[index] + fraction * (track.opls[index + 1] - track.opls[index]);
    if (!best || distance < best.distance) {
      best = {
        distance,
        opl,
        arrivalNs: (track.pulse?.phaseNs || 0) + opl / C_MM_PER_NS,
      };
    }
  }
  return best;
}

function traceForSource(scene, sourceId) {
  const source = scene.elements.find(element => element.id === sourceId);
  if (!source || !registry[source.type]?.source) return null;
  const elements = scene.elements.filter(element => element.id === sourceId || !registry[element.type]?.source);
  return traceScene(elements, scene.beams);
}

function finiteTraceErrors(trace) {
  const errors = [];
  const inspectPoints = (points, label) => {
    if (!Array.isArray(points) || points.some(point => !finite(point?.x) || !finite(point?.y))) {
      errors.push(`${label} contains non-finite geometry`);
    }
  };
  for (const [index, drawable] of (trace.drawables || []).entries()) {
    if (drawable.pts) inspectPoints(drawable.pts, `Drawable ${index + 1}`);
    for (const key of ['w', 'opacity']) {
      if (drawable[key] !== undefined && !finite(drawable[key])) {
        errors.push(`Drawable ${index + 1}.${key} is non-finite`);
      }
    }
  }
  for (const [index, track] of (trace.pulseTracks || []).entries()) {
    inspectPoints(track.pts, `Pulse track ${index + 1}`);
    if (!Array.isArray(track.opls) || track.opls.some(value => !finite(value))) {
      errors.push(`Pulse track ${index + 1} contains non-finite optical path lengths`);
    }
  }
  return errors;
}

function requireString(check, key) {
  if (typeof check[key] !== 'string' || !check[key]) throw new Error(`${check.kind}.${key} must be a non-empty string`);
  return check[key];
}

function findElement(scene, id) {
  return scene.elements.find(element => element.id === id);
}

function pass(kind, message, details = {}) {
  return { kind, pass: true, message, details };
}

function fail(kind, message, details = {}) {
  return { kind, pass: false, message, details };
}

function evaluateElementCheck(scene, check) {
  const id = requireString(check, 'id');
  const element = findElement(scene, id);
  if (!element) return fail(check.kind, `Element ${id} is missing`);
  if (check.type && element.type !== check.type) {
    return fail(check.kind, `${id} is ${element.type}, expected ${check.type}`);
  }
  if (check.params !== undefined && !record(check.params)) {
    throw new Error('element.params must be an object');
  }
  for (const [key, expected] of Object.entries(check.params || {})) {
    if (!jsonEqual(element.params[key], expected)) {
      return fail(check.kind, `${id}.${key} is ${JSON.stringify(element.params[key])}, expected ${JSON.stringify(expected)}`);
    }
  }
  return pass(check.kind, `Element ${id} matches the contract`, { type: element.type });
}

function evaluateSourceReaches(scene, check) {
  const sourceId = requireString(check, 'source');
  const targetId = requireString(check, 'target');
  const target = findElement(scene, targetId);
  if (!target) return fail(check.kind, `Target ${targetId} is missing`);
  const trace = traceForSource(scene, sourceId);
  if (!trace) return fail(check.kind, `Source ${sourceId} is missing or is not an emitting component`);
  if (check.toleranceMm !== undefined && (!finite(check.toleranceMm) || check.toleranceMm < 0)) {
    throw new Error('source_reaches.toleranceMm must be a non-negative finite number');
  }
  const toleranceMm = check.toleranceMm ?? 2;
  const paths = [
    ...trace.drawables.filter(drawable => Array.isArray(drawable.pts)).map(drawable => drawable.pts),
    ...trace.pulseTracks.map(track => track.pts),
  ];
  const distanceMm = Math.min(Infinity, ...paths.map(points => nearestDistance(points, target)));
  return distanceMm <= toleranceMm
    ? pass(check.kind, `${sourceId} reaches ${targetId}`, { distanceMm, toleranceMm })
    : fail(check.kind, `${sourceId} misses ${targetId} by ${distanceMm.toFixed(3)} mm`, { distanceMm, toleranceMm });
}

function evaluatePulseOverlap(scene, check, trace) {
  if (!Array.isArray(check.sources) || check.sources.length < 2
    || check.sources.some(source => typeof source !== 'string' || !source)) {
    throw new Error('pulse_overlap.sources must contain at least two source ids');
  }
  const targetId = requireString(check, 'target');
  const target = findElement(scene, targetId);
  if (!target) return fail(check.kind, `Target ${targetId} is missing`);
  if (check.toleranceMm !== undefined && (!finite(check.toleranceMm) || check.toleranceMm < 0)) {
    throw new Error('pulse_overlap.toleranceMm must be a non-negative finite number');
  }
  if (check.maxDifferencePs !== undefined && (!finite(check.maxDifferencePs) || check.maxDifferencePs < 0)) {
    throw new Error('pulse_overlap.maxDifferencePs must be a non-negative finite number');
  }
  const toleranceMm = check.toleranceMm ?? 2;
  const maxDifferencePs = check.maxDifferencePs ?? 1;
  const arrivals = [];
  for (const sourceId of check.sources) {
    const candidates = trace.pulseTracks
      .filter(track => track.pulse?.sourceId === sourceId)
      .map(track => nearestTrackArrival(track, target))
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);
    const candidate = candidates[0];
    if (!candidate || candidate.distance > toleranceMm) {
      return fail(check.kind, `No pulse from ${sourceId} reaches ${targetId} within ${toleranceMm} mm`);
    }
    arrivals.push({ source: sourceId, arrivalNs: candidate.arrivalNs, distanceMm: candidate.distance });
  }
  const values = arrivals.map(item => item.arrivalNs);
  const differencePs = (Math.max(...values) - Math.min(...values)) * 1000;
  return differencePs <= maxDifferencePs
    ? pass(check.kind, `Pulses overlap at ${targetId} within ${differencePs.toFixed(6)} ps`, { differencePs, maxDifferencePs, arrivals })
    : fail(check.kind, `Pulse mismatch at ${targetId} is ${differencePs.toFixed(6)} ps`, { differencePs, maxDifferencePs, arrivals });
}

function validateReading(check, reading, context) {
  const expectedSignal = check.signal || check.expect || 'positive';
  if (!['positive', 'none'].includes(expectedSignal)) {
    throw new Error(`${check.kind}.${check.kind === 'detector' ? 'signal' : 'expect'} must be positive or none`);
  }
  const hasSignal = Boolean(reading && reading.signal > 1e-12);
  if ((expectedSignal === 'none' && hasSignal) || (expectedSignal !== 'none' && !hasSignal)) {
    return fail(check.kind, expectedSignal === 'none'
      ? `${context} has unexpected signal`
      : `${context} has no signal`, reading || {});
  }
  if (!hasSignal) return pass(check.kind, `${context} has no signal, as expected`);
  if (record(check.wavelengthNm)) {
    const min = finite(check.wavelengthNm.min) ? check.wavelengthNm.min : -Infinity;
    const max = finite(check.wavelengthNm.max) ? check.wavelengthNm.max : Infinity;
    if (min > max) throw new Error(`${check.kind}.wavelengthNm min cannot exceed max`);
    if (reading.wavelength < min || reading.wavelength > max) {
      return fail(check.kind, `${context} reads ${reading.wavelength.toFixed(3)} nm, outside ${min}–${max} nm`, reading);
    }
  }
  return pass(check.kind, `${context} matches the detector contract`, reading);
}

function evaluateDetector(scene, check) {
  const detectorId = requireString(check, 'detector');
  const detector = findElement(scene, detectorId);
  if (!detector) return fail(check.kind, `Detector ${detectorId} is missing`);
  traceScene(scene.elements, scene.beams);
  return validateReading(check, detectorReading(detectorId), `Detector ${detectorId}`);
}

function evaluateDetectorSource(scene, check) {
  const detectorId = requireString(check, 'detector');
  const sourceId = requireString(check, 'source');
  if (!findElement(scene, detectorId)) return fail(check.kind, `Detector ${detectorId} is missing`);
  const trace = traceForSource(scene, sourceId);
  if (!trace) return fail(check.kind, `Source ${sourceId} is missing or is not an emitting component`);
  return validateReading(check, detectorReading(detectorId), `Detector ${detectorId} from ${sourceId}`);
}

function evaluateCheck(scene, check, trace) {
  if (!record(check) || !CHECK_KINDS.has(check.kind)) {
    throw new Error(`Unknown contract check kind: ${String(check?.kind)}`);
  }
  if (check.kind === 'element') return evaluateElementCheck(scene, check);
  if (check.kind === 'source_reaches') return evaluateSourceReaches(scene, check);
  if (check.kind === 'pulse_overlap') return evaluatePulseOverlap(scene, check, trace);
  if (check.kind === 'detector') return evaluateDetector(scene, check);
  return evaluateDetectorSource(scene, check);
}

function validateContract(contract, errors) {
  if (!record(contract)) {
    errors.push('Validation contract must be an object');
    return { evidence: new Map(), checks: [] };
  }
  if (contract.schemaVersion !== 1) errors.push('Contract schemaVersion must be 1');
  if (!record(contract.paper) || typeof contract.paper.title !== 'string' || !contract.paper.title.trim()) {
    errors.push('Contract paper.title is required');
  }
  if (typeof contract.measurementStory !== 'string' || !contract.measurementStory.trim()) {
    errors.push('Contract measurementStory is required');
  }
  if (!Array.isArray(contract.evidence) || contract.evidence.length === 0) {
    errors.push('Contract evidence must contain at least one claim');
  }
  if (!Array.isArray(contract.checks) || contract.checks.length === 0) {
    errors.push('Contract checks must contain at least one physical check');
  }

  const evidence = new Map();
  for (const [index, item] of (contract.evidence || []).entries()) {
    if (!record(item) || typeof item.id !== 'string' || !item.id) {
      errors.push(`Evidence ${index + 1} needs a non-empty id`);
      continue;
    }
    if (evidence.has(item.id)) errors.push(`Duplicate evidence id: ${item.id}`);
    if (typeof item.claim !== 'string' || !item.claim.trim()) errors.push(`Evidence ${item.id} needs a claim`);
    if (typeof item.source !== 'string' || !item.source.trim()) errors.push(`Evidence ${item.id} needs a source locator`);
    if (!EVIDENCE_STATUSES.has(item.status)) errors.push(`Evidence ${item.id} has invalid status: ${String(item.status)}`);
    evidence.set(item.id, item);
  }

  for (const [index, check] of (contract.checks || []).entries()) {
    if (!Array.isArray(check?.evidence) || check.evidence.length === 0) {
      errors.push(`Check ${index + 1} (${String(check?.kind)}) must cite evidence ids`);
      continue;
    }
    for (const id of check.evidence) {
      if (!evidence.has(id)) errors.push(`Check ${index + 1} cites missing evidence: ${String(id)}`);
      else if (evidence.get(id).status === 'unknown') {
        errors.push(`Check ${index + 1} cannot pass from unknown evidence: ${id}`);
      }
    }
  }
  return { evidence, checks: contract.checks || [] };
}

export function validateScene(sceneInput, contractInput) {
  const errors = [];
  const warnings = [];
  let scene;
  try {
    const parsed = parseSketch(sceneInput, registry);
    scene = { app: 'optics2d', version: 1, ...parsed };
  } catch (error) {
    return {
      ok: false,
      errors: [error.message],
      warnings,
      summary: { elements: 0, checks: 0, passed: 0 },
      checks: [],
    };
  }

  const { checks: contractChecks } = validateContract(contractInput, errors);
  const manualBeams = scene.beams.filter(beam => beam.kind === 'beam');
  if (manualBeams.length && contractInput?.allowManualBeams !== true) {
    errors.push(`Scene contains ${manualBeams.length} manual beam(s); use traced optics or explicitly set allowManualBeams`);
  }

  for (const element of scene.elements) {
    const meta = getElementMeta(element.type, element.params);
    if (meta.tier !== 'simulated') {
      warnings.push(`${element.id} (${element.type}) is ${meta.status.toLowerCase()}: ${meta.note || meta.description}`);
    }
  }

  const trace = traceScene(scene.elements, scene.beams);
  errors.push(...finiteTraceErrors(trace));
  const results = [];
  if (errors.length === 0) {
    for (const check of contractChecks) {
      try {
        results.push(evaluateCheck(scene, check, trace));
      } catch (error) {
        results.push(fail(check?.kind || 'invalid', error.message));
      }
    }
  }
  const failedChecks = results.filter(result => !result.pass);
  if (failedChecks.length) errors.push(`${failedChecks.length} physical contract check(s) failed`);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      elements: scene.elements.length,
      connectors: scene.beams.length,
      checks: results.length,
      passed: results.filter(result => result.pass).length,
    },
    checks: results,
  };
}
