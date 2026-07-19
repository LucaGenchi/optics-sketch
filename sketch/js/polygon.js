// Geometry helpers for editable closed polygons. These functions are kept
// independent of the canvas so saved sketches, direct manipulation, and ray
// surfaces all agree on what constitutes a usable optical boundary.

const EPS = 1e-7;
export const MAX_POLYGON_POINTS = 64;

const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const copyPoint = p => ({ x: p.x, y: p.y });

export function polygonArea(points) {
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    twiceArea += a.x * b.y - b.x * a.y;
  }
  return twiceArea / 2;
}

export function polygonBounds(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return {
    x0: Math.min(...xs), x1: Math.max(...xs),
    y0: Math.min(...ys), y1: Math.max(...ys),
  };
}

function orientation(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a, b, p) {
  return Math.abs(orientation(a, b, p)) <= EPS
    && p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS
    && p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS;
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c), o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a), o4 = orientation(c, d, b);
  if (((o1 > EPS && o2 < -EPS) || (o1 < -EPS && o2 > EPS))
      && ((o3 > EPS && o4 < -EPS) || (o3 < -EPS && o4 > EPS))) return true;
  return (Math.abs(o1) <= EPS && onSegment(a, b, c))
    || (Math.abs(o2) <= EPS && onSegment(a, b, d))
    || (Math.abs(o3) <= EPS && onSegment(c, d, a))
    || (Math.abs(o4) <= EPS && onSegment(c, d, b));
}

export function isSimplePolygon(points, { minEdge = 0.25, minArea = 0.5 } = {}) {
  if (!Array.isArray(points) || points.length < 3 || points.length > MAX_POLYGON_POINTS
      || points.some(p => !finitePoint(p))) return false;
  if (Math.abs(polygonArea(points)) < minArea) return false;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    if (Math.hypot(b.x - a.x, b.y - a.y) < minEdge) return false;
  }
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    for (let j = i + 1; j < points.length; j++) {
      if (j === i || j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      const c = points[j], d = points[(j + 1) % points.length];
      if (segmentsIntersect(a, b, c, d)) return false;
    }
  }
  return true;
}

// True when a new open-polyline edge would cross an earlier edge. The closing
// edge is validated separately by isSimplePolygon when construction finishes.
export function canAppendPolygonPoint(points, point, minEdge = 0.25) {
  if (!finitePoint(point) || points.length >= MAX_POLYGON_POINTS) return false;
  if (!points.length) return true;
  const last = points[points.length - 1];
  if (Math.hypot(point.x - last.x, point.y - last.y) < minEdge) return false;
  if (points.length < 2) return true;
  for (let i = 0; i < points.length - 2; i++) {
    if (segmentsIntersect(points[i], points[i + 1], last, point)) return false;
  }
  return true;
}

export function normalizePolygonPoints(value, fallback = [], limit = 5000) {
  const fallbackCopy = () => fallback.map(copyPoint);
  if (!Array.isArray(value)) return fallbackCopy();
  const points = [];
  for (const raw of value.slice(0, MAX_POLYGON_POINTS)) {
    if (!finitePoint(raw)) continue;
    const p = {
      x: Math.min(limit, Math.max(-limit, raw.x)),
      y: Math.min(limit, Math.max(-limit, raw.y)),
    };
    const prev = points[points.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) >= 0.25) points.push(p);
  }
  if (points.length > 2 && Math.hypot(points[0].x - points.at(-1).x, points[0].y - points.at(-1).y) < 0.25) points.pop();
  return isSimplePolygon(points) ? points : fallbackCopy();
}

export function pointInPolygon(point, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    const crosses = ((a.y > point.y) !== (b.y > point.y))
      && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || EPS) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}
