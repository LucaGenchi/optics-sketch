// 2D ray-tracing engine.
// Builds world-space surfaces from elements, propagates rays from every source,
// and returns drawables: stroked polylines (line-mode / beam edges) and filled
// polygons (beam-mode envelope between the two edge rays).

import { registry, OBJ_SHAPES } from './elements.js';
import { toWorld, rotPt, dot, sub, add, mul, norm, perp, wavelengthToColor, D2R, distToSegment } from './util.js';

// polylines from the most recent traceAll, kept for beam probes
let lastPaths = [];

// sample the beam nearest to (x,y): returns {wl, bw, pol, intensity} or null
export function probeAt(x, y, tol = 16) {
  let best = null, bd = tol;
  const p = { x, y };
  for (const r of lastPaths) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const dd = distToSegment(p, r.pts[i], r.pts[i + 1]);
      if (dd < bd) { bd = dd; best = r; }
    }
  }
  return best ? { wl: best.wl, bw: best.bw || 0, pol: best.pol, intensity: best.intensity } : null;
}

const MAXLEN = 6000, MAX_DEPTH = 60, MIN_INT = 0.02;

function buildSurfaces(elements, beams) {
  const list = [];
  let sid = 0;
  for (const el of elements) {
    const def = registry[el.type];
    if (!def || !def.surfaces) continue;
    for (const s of def.surfaces(el)) {
      list.push({
        id: sid++,
        a: toWorld(el, s.x1, s.y1),
        b: toWorld(el, s.x2, s.y2),
        kind: s.kind, data: s.data || {}, el,
      });
    }
  }
  // fiber connectors: the tip face couples (or blocks) the beam, the body absorbs
  for (const b of beams || []) {
    if (b.kind !== 'fiber' || b.pts.length < 2) continue;
    const W = (b.width || 4) + 6;
    for (const end of [0, 1]) {
      const e = b.pts[end === 0 ? 0 : b.pts.length - 1];
      const q = b.pts[end === 0 ? 1 : b.pts.length - 2];
      const dir = norm(sub(q, e)); // into the cable
      const pn = perp(dir);
      const e2 = add(e, mul(dir, 15));
      const c1 = add(e, mul(pn, W / 2)), c2 = add(e, mul(pn, -W / 2));
      const c3 = add(e2, mul(pn, W / 2)), c4 = add(e2, mul(pn, -W / 2));
      list.push({ id: sid++, a: c1, b: c2, kind: 'fiberin', data: { beam: b, end }, el: null });
      list.push({ id: sid++, a: c1, b: c3, kind: 'absorb', data: {}, el: null });
      list.push({ id: sid++, a: c2, b: c4, kind: 'absorb', data: {}, el: null });
      list.push({ id: sid++, a: c3, b: c4, kind: 'absorb', data: {}, el: null });
    }
  }
  return list;
}

// rays emitted from the far end of a fiber that received light.
// Each end has its own output spec (out0 / out1), so behavior can differ
// between the two connectors and coupling works in both directions.
function fiberEmissionRays(c) {
  const b = c.beam, pts = b.pts;
  const outEnd = c.end === 0 ? 1 : 0;
  const j = outEnd === 0 ? 0 : pts.length - 1;
  const e = pts[j], q = pts[j === 0 ? 1 : j - 1];
  const dir = norm(sub(e, q));       // out of the connector
  const o = add(e, mul(dir, 2));
  const cfg = b['out' + outEnd] || { mode: b.outMode || 'diverge', na: b.na, focal: b.focal, dia: b.outDia };
  const K = 9, rays = [];
  const common = { wl: c.wl, bw: c.bw || 0, speckle: false, intensity: Math.min(1, c.intensity) };
  if (cfg.mode === 'focus') {
    const f = Math.max(2, cfg.focal || 20), ap = Math.max(1, cfg.dia || 6);
    const pn = perp(dir);
    const fp = add(o, mul(dir, f));
    for (let i = 0; i < K; i++) {
      const src = add(o, mul(pn, -ap / 2 + ap * i / (K - 1)));
      const d = norm(sub(fp, src));
      rays.push({ ...common, x: src.x, y: src.y, dx: d.x, dy: d.y, sample: i });
    }
  } else {
    // gaussian-like cone from the fiber core, half-angle asin(NA)
    const half = Math.asin(Math.min(0.95, Math.max(0.01, cfg.na || 0.12)));
    for (let i = 0; i < K; i++) {
      const d = rotv(dir, -half + 2 * half * i / (K - 1));
      rays.push({ ...common, x: o.x, y: o.y, dx: d.x, dy: d.y, sample: i });
    }
  }
  return rays;
}

// slice the envelope strip between polylines A and B into "on" quads
function chopStrip(A, B, period, duty) {
  const lerpP = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const polys = [];
  const n = Math.min(A.length, B.length);
  let phase = 0;
  for (let j = 0; j < n - 1 && polys.length < 300; j++) {
    const a0 = A[j], a1 = A[j + 1], b0 = B[j], b1 = B[j + 1];
    const L = Math.hypot(a1.x - a0.x, a1.y - a0.y);
    if (L < 1e-6) continue;
    let s = 0;
    while (s < L && polys.length < 300) {
      const ip = (phase + s) % period;
      const on = ip < period * duty;
      const segEnd = Math.min(L, s + (on ? period * duty - ip : period - ip));
      if (on) {
        const t0 = s / L, t1 = segEnd / L;
        polys.push([lerpP(a0, a1, t0), lerpP(a0, a1, t1), lerpP(b0, b1, t1), lerpP(b0, b1, t0)]);
      }
      s = segEnd + 1e-6;
    }
    phase = (phase + L) % period;
  }
  return polys;
}

// nearest intersection of ray (p,d) with surfaces, ignoring `skip`
function nearestHit(p, d, surfaces, skip) {
  let best = null;
  for (const s of surfaces) {
    if (s === skip) continue;
    const e = sub(s.b, s.a);
    const den = d.x * e.y - d.y * e.x;
    if (Math.abs(den) < 1e-9) continue;
    const dp = sub(s.a, p);
    const t = (dp.x * e.y - dp.y * e.x) / den;       // distance along ray
    const u = (dp.x * d.y - dp.y * d.x) / den;       // position along segment
    if (t < 0.05 || u < 0 || u > 1) continue;
    if (!best || t < best.t) best = { t, u, surface: s, p: add(p, mul(d, t)) };
  }
  return best;
}

const reflect = (d, n) => sub(d, mul(n, 2 * dot(d, n)));
const rotv = (d, a) => ({ x: d.x * Math.cos(a) - d.y * Math.sin(a), y: d.x * Math.sin(a) + d.y * Math.cos(a) });

// deterministic jitter in [-0.5, 0.5) from integer keys — keeps speckle stable
// across re-renders instead of flickering
function jitter(k1, k2) {
  const h = Math.sin((k1 + 1) * 12.9898 + (k2 + 1) * 78.233) * 43758.5453;
  return h - Math.floor(h) - 0.5;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// speckle grains scattered along a polyline
function speckleDots(pts, width, seed, maxDots = 220) {
  const rng = mulberry32(seed);
  const dots = [];
  for (let i = 0; i < pts.length - 1 && dots.length < maxDots; i++) {
    const a = pts[i], b = pts[i + 1];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 1e-6) continue;
    const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    let step = 3.5;
    for (let s = 2; s < L && dots.length < maxDots; s += step) {
      if (rng() < 0.75) {
        const off = (rng() - 0.5) * width;
        dots.push({
          x: a.x + ux * s - uy * off, y: a.y + uy * s + ux * off,
          r: 0.5 + rng() * 0.9, o: 0.25 + rng() * 0.6,
        });
      }
      step *= 1.015; // grains thin out with distance
    }
  }
  return dots;
}

// parallel copy of a polyline offset by d along the local normal
function offsetPolyline(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const t = norm(sub(b, a)), n = perp(t);
    return { x: p.x + n.x * d, y: p.y + n.y * d };
  });
}

// broadband rays expand into wavelength samples at dispersive elements
function wlSamples(ray) {
  if (!ray.bw) return [ray.wl];
  const K = ray.bw >= 200 ? 9 : 5;
  const lo = ray.wl - ray.bw / 2, hi = ray.wl + ray.bw / 2;
  return Array.from({ length: K }, (_, i) => lo + (hi - lo) * i / (K - 1));
}

const SPECTRUM = t => wavelengthToColor(430 + 250 * Math.min(1, Math.max(0, t)));

// thin-lens (paraxial) bend; also used for curved mirrors after reflection.
// hc offsets the lens center along the surface (for lenslet arrays).
function lensBend(dir, hitP, s, f, hc = 0) {
  const t = norm(sub(s.b, s.a));
  const n = perp(t);
  const sgn = dot(dir, n) >= 0 ? 1 : -1;
  const np = mul(n, sgn);
  const h = dot(sub(hitP, mul(add(s.a, s.b), 0.5)), t) - hc;
  const denom = dot(dir, np);
  if (Math.abs(denom) < 1e-6 || !f) return dir;
  const u = dot(dir, t) / denom;
  const u2 = u - h / f;
  return norm(add(np, mul(t, u2)));
}

function dichroicTransmits(wl, d) {
  if (d.dtype === 'longpass') return wl >= d.cutoff;
  if (d.dtype === 'shortpass') return wl <= d.cutoff;
  return Math.abs(wl - d.center) <= d.band / 2;
}

// transmission passband [lo, hi] of a filter/dichroic
function passbandOf(d) {
  const t = d.dtype || d.ftype;
  if (t === 'longpass') return [d.cutoff, 1e5];
  if (t === 'shortpass') return [0, d.cutoff];
  return [d.center - d.band / 2, d.center + d.band / 2];
}

const bandIntersect = (a, b) => {
  const lo = Math.max(a[0], b[0]), hi = Math.min(a[1], b[1]);
  return lo <= hi ? [lo, hi] : null;
};

// child ray carrying the spectral slice [lo, hi] of a parent broadband ray
function bandChild(ray, d, lo, hi, tag) {
  const nbw = hi - lo < 2 ? 0 : hi - lo;
  return {
    d, wl: (lo + hi) / 2, bw: nbw, tag,
    intensity: ray.intensity * Math.max(0.3, (hi - lo) / ray.bw),
  };
}

// interaction -> array of child rays [{d, wl?, intensity?, tag?}] ; [] = absorbed
function interact(ray, hit) {
  const s = hit.surface, d = { x: ray.dx, y: ray.dy }, k = s.kind, data = s.data;
  const t = norm(sub(s.b, s.a)), n = perp(t);

  switch (k) {
    case 'absorb': return [];
    case 'mirror': {
      // partial reflectivity (cavity mirrors / output couplers): reflect R,
      // transmit 1-R. The transmitted ray leaves the cavity, so multi-bounce
      // growth stays linear in depth, not exponential.
      const R = (data.refl ?? 100) / 100;
      if (R >= 0.995) return [{ d: reflect(d, n) }];
      const out = [];
      if (R > 0.005) out.push({ d: reflect(d, n), intensity: ray.intensity * R, tag: 'R' });
      out.push({ d, intensity: ray.intensity * (1 - R), tag: 'T' });
      return out;
    }
    case 'cmirror': {
      const r = reflect(d, n);
      return [{ d: lensBend(r, hit.p, s, data.f) }];
    }
    case 'lens': return [{ d: lensBend(d, hit.p, s, data.f) }];
    case 'dichroic': {
      if (!ray.bw) return dichroicTransmits(ray.wl, data) ? [{ d }] : [{ d: reflect(d, n) }];
      // broadband: transmit the overlap with the passband, reflect the rest
      const rb = [ray.wl - ray.bw / 2, ray.wl + ray.bw / 2];
      const pb = passbandOf(data);
      const out = [];
      const ix = bandIntersect(rb, pb);
      if (ix && ix[1] - ix[0] > 0.5) out.push(bandChild(ray, d, ix[0], ix[1], 'T'));
      const rd = reflect(d, n);
      if (rb[0] < pb[0] - 0.5) out.push(bandChild(ray, rd, rb[0], Math.min(rb[1], pb[0]), 'R0'));
      if (rb[1] > pb[1] + 0.5) out.push(bandChild(ray, rd, Math.max(rb[0], pb[1]), rb[1], 'R1'));
      return out;
    }
    case 'filter': {
      const f = data;
      if (f.ftype === 'nd') return [{ d, intensity: ray.intensity * f.trans }];
      if (!ray.bw) {
        const pb0 = passbandOf(f);
        return ray.wl >= pb0[0] && ray.wl <= pb0[1] ? [{ d }] : [];
      }
      // broadband: transmitted spectrum = overlap of beam band and passband
      const ix = bandIntersect([ray.wl - ray.bw / 2, ray.wl + ray.bw / 2], passbandOf(f));
      if (!ix || ix[1] - ix[0] < 0.5) return [];
      const c = bandChild(ray, d, ix[0], ix[1], null);
      delete c.tag;
      return [c];
    }
    case 'split': {
      const r = Math.min(1, Math.max(0, data.ratio));
      const out = [];
      if (r > 0.01) out.push({ d, intensity: ray.intensity * r, tag: 'T' });
      if (r < 0.99) out.push({ d: reflect(d, n), intensity: ray.intensity * (1 - r), tag: 'R' });
      return out;
    }
    case 'grating': {
      const si = dot(d, t);                       // sin(incidence), signed
      const sIn = dot(d, n) >= 0 ? 1 : -1;
      const out = [];
      const wls = wlSamples(ray);
      for (const m of data.orders) {
        for (let i = 0; i < wls.length; i++) {
          const sd = si + m * wls[i] / data.d;
          if (Math.abs(sd) > 1) continue;
          const c = Math.sqrt(1 - sd * sd);
          const sOut = data.transmissive ? sIn : -sIn;
          out.push({
            d: norm(add(mul(n, sOut * c), mul(t, sd))),
            wl: wls[i], bw: 0,
            intensity: ray.intensity / (data.orders.length * (m === 0 ? 1 : wls.length)),
            tag: 'm' + m + (wls.length > 1 ? 'w' + i : ''),
          });
          if (m === 0 && wls.length > 1) break; // 0th order is undispersed
        }
      }
      return out;
    }
    case 'prism': {
      // simplified dispersive prism: minimum-deviation angle with a
      // Cauchy glass model n(λ) = 1.5046 + 4680/λ²  (BK7-like)
      const A = (data.apex || 60) * D2R;
      const sgn = dot(d, n) >= 0 ? 1 : -1;
      const out = [];
      const wls = wlSamples(ray);
      for (let i = 0; i < wls.length; i++) {
        const ng = 1.5046 + 4680 / (wls[i] * wls[i]);
        const sa = ng * Math.sin(A / 2);
        const dev = sa < 1 ? 2 * Math.asin(sa) - A : (ng - 1) * A;
        out.push({
          d: rotv(d, -sgn * dev), wl: wls[i], bw: 0,
          intensity: ray.intensity / wls.length,
          tag: wls.length > 1 ? 'p' + i : null,
        });
      }
      return out;
    }
    case 'diffuser': {
      const div = (data.div || 8) * D2R;
      const sid = hit.surface.id;
      if (ray.sample == null) {
        // a single line ray scatters into a small speckled fan
        return [0, 1, 2, 3, 4].map(k => ({
          d: rotv(d, jitter(k * 3 + 1, sid) * div),
          intensity: ray.intensity / 2.5, speckle: true, tag: 'd' + k,
        }));
      }
      return [{ d: rotv(d, jitter(ray.sample, sid) * div), speckle: true }];
    }
    case 'aom': {
      const out = [];
      const a = data.deflect * D2R, c = Math.cos(a), sn = Math.sin(a);
      const chopped = data.chop || undefined;
      out.push({ d: { x: d.x * c - d.y * sn, y: d.x * sn + d.y * c }, intensity: ray.intensity * data.eff, tag: 'd1', chopped });
      if (data.zero) out.push({ d, intensity: ray.intensity * (1 - data.eff), tag: 'd0', chopped });
      return out;
    }
    case 'chop':
      // intensity modulator: beam continues but renders as on/off chunks
      return [{ d, chopped: { period: data.period || 30, duty: data.duty || 0.5 } }];
    case 'polarizer': {
      const a = data.a || 0;
      if (ray.pol === undefined || ray.pol === 'c') return [{ d, intensity: ray.intensity * 0.5, pol: a, tag: 'pol' }];
      const f = Math.cos((a - ray.pol) * D2R) ** 2;
      if (f < 0.02) return [];
      return [{ d, intensity: ray.intensity * f, pol: a, tag: 'pol' }];
    }
    case 'wp': {
      if (ray.pol === undefined) return [{ d }];
      if (data.half) {
        if (ray.pol === 'c') return [{ d }];
        return [{ d, pol: ((2 * data.a - ray.pol) % 180 + 180) % 180 }];
      }
      // quarter-wave plate: linear <-> circular
      if (ray.pol === 'c') return [{ d, pol: ((data.a + 45) % 180 + 180) % 180 }];
      return [{ d, pol: 'c' }];
    }
    case 'pbs': {
      const ft = (ray.pol === undefined || ray.pol === 'c') ? 0.5 : Math.cos(ray.pol * D2R) ** 2;
      const out = [];
      if (ft > 0.02) out.push({ d, intensity: ray.intensity * ft, pol: 0, tag: 'T' });
      if (1 - ft > 0.02) out.push({ d: reflect(d, n), intensity: ray.intensity * (1 - ft), pol: 90, tag: 'R' });
      return out;
    }
    case 'fluor': {
      // fluorescence is isotropic and weak: emitted in all directions from the
      // sample as evanescent rays that fade out unless a lens / objective /
      // fiber tip nearby captures them (the tracer clears `evan` on capture)
      const out = [];
      const emitting = ray.sample == null || ray.sample === 0; // once per beam
      if (data.transmitExc) out.push({ d, tag: emitting ? 'x' : undefined });
      if (emitting) {
        const mid = mul(add(s.a, s.b), 0.5);
        const N = 16;
        for (let i = 0; i < N; i++) {
          const a = i * 2 * Math.PI / N;
          out.push({
            d: { x: Math.cos(a), y: Math.sin(a) }, wl: data.wl, bw: 0, pol: undefined,
            intensity: 0.8, tag: 'f' + i, evan: true, origin: mid,
          });
        }
      }
      return out;
    }
    case 'isolator': {
      const fwd = rotPt(1, 0, (s.el && s.el.rot) || 0);
      return dot(d, fwd) > 0 ? [{ d }] : [];
    }
    case 'shaper': {
      // SLM / DMD / deformable mirror: base reflection (or transmission),
      // then apply each function layer in order. Layers that diffract
      // (grating) can multiply rays; capped to keep tracing bounded.
      const zf = data.zeroOrder && (data.layers || []).length
        ? Math.min(0.95, Math.max(0, data.zeroFrac ?? 0.1)) : 0;
      let rays = [{ d: data.transmissive ? d : reflect(d, n), intensity: ray.intensity * (1 - zf), tag: '' }];
      const L = data.length;
      const mid = mul(add(s.a, s.b), 0.5);
      for (const ly of (data.layers || []).slice(0, 4)) {
        const next = [];
        for (const r of rays) {
          if (ly.type === 'steer') {
            const a = (ly.angle || 0) * D2R, c = Math.cos(a), sn = Math.sin(a);
            next.push({ ...r, d: { x: r.d.x * c - r.d.y * sn, y: r.d.x * sn + r.d.y * c } });
          } else if (ly.type === 'lensarray') {
            const nL = Math.min(8, Math.max(1, Math.round(ly.n || 1)));
            const pitch = L / nL;
            const h = dot(sub(hit.p, mid), t);
            let idx = Math.floor((h + L / 2) / pitch);
            idx = Math.max(0, Math.min(nL - 1, idx));
            const hc = -L / 2 + (idx + 0.5) * pitch;
            // lenslet index goes into the branch signature so beam strips
            // only pair up within the same lenslet
            next.push({ ...r, d: lensBend(r.d, hit.p, s, ly.f, hc), tag: r.tag + 'L' + idx });
          } else if (ly.type === 'grating') {
            const parsed = String(ly.orders ?? '1').split(',').map(v => parseInt(v.trim(), 10)).filter(m => isFinite(m));
            const orders = parsed.length ? parsed : [1];
            const gd = 1e6 / (ly.lines || 600);
            const si = dot(r.d, t);
            const sOut = dot(r.d, n) >= 0 ? 1 : -1;
            const wls = wlSamples(ray);
            for (const m of orders) {
              for (let wi = 0; wi < wls.length; wi++) {
                const sd = si + m * wls[wi] / gd;
                if (Math.abs(sd) > 1) continue;
                const c = Math.sqrt(1 - sd * sd);
                next.push({
                  d: norm(add(mul(n, sOut * c), mul(t, sd))),
                  wl: wls[wi], bw: 0, speckle: r.speckle,
                  intensity: r.intensity / (orders.length * (m === 0 ? 1 : wls.length)),
                  tag: r.tag + 'm' + m + (wls.length > 1 ? 'w' + wi : ''),
                });
                if (m === 0 && wls.length > 1) break;
              }
            }
          } else if (ly.type === 'speckle') {
            const div = (ly.div || 8) * D2R;
            const sid = hit.surface.id;
            if (ray.sample == null) {
              for (let k = 0; k < 5; k++) {
                next.push({ ...r, d: rotv(r.d, jitter(k * 3 + 1, sid) * div), intensity: r.intensity / 2.5, tag: r.tag + 's' + k, speckle: true });
              }
            } else {
              next.push({ ...r, d: rotv(r.d, jitter(ray.sample, sid) * div), speckle: true });
            }
          } else {
            next.push(r);
          }
        }
        rays = next.slice(0, 24);
        if (!rays.length) break;
      }
      const out = rays.map(r => ({
        d: r.d, intensity: r.intensity, tag: r.tag || undefined,
        wl: r.wl, bw: r.bw, speckle: r.speckle || undefined,
      }));
      if (zf > 0) {
        out.push({ d: data.transmissive ? d : reflect(d, n), intensity: ray.intensity * zf, tag: 'z0' });
      }
      return out;
    }
    case 'transmit': {
      if (data.convert === 'opo') {
        // optical parametric down-conversion: pump -> signal + idler,
        // energy conservation 1/lambda_p = 1/lambda_s + 1/lambda_i.
        // Phase-matching is pump-specific: light at any other wavelength
        // (the crystal's own signal/idler bouncing back through on a later
        // cavity round trip) just transmits unconverted — without this
        // guard, resonating signal would re-split on every single pass,
        // branching exponentially and never terminating.
        const pumpWl = data.pumpWl || 532;
        if (Math.abs(ray.wl - pumpWl) > 1) return [{ d }];
        const sig = Math.max(1, data.signalWl || 800);
        const out = [{ d, wl: sig, tag: 's' }];
        const invIdler = 1 / pumpWl - 1 / sig;
        if (invIdler > 1e-9) out.push({ d, wl: 1 / invIdler, tag: 'i' });
        if (data.transmitPump) out.push({ d, tag: 'p' });
        return out;
      }
      let wl = ray.wl, bw;
      if (data.convert === 'shg') wl = ray.wl / 2;
      else if (data.convert === 'thg') wl = ray.wl / 3;
      else if (data.convert === 'custom' || data.convert === 'cars') wl = data.outWl;
      else if (data.convert === 'sc') { wl = 650; bw = 440; } // supercontinuum
      const conv = { d, wl };
      if (bw !== undefined) conv.bw = bw;
      // samples can co-transmit the excitation beam alongside the converted signal
      if (data.transmitExc && wl !== ray.wl) {
        conv.tag = 'c';
        return [conv, { d, tag: 'x' }];
      }
      return [conv];
    }
    default: return [{ d }];
  }
}

// trace all rays of one source; returns finished polylines.
// `couplings` collects light captured by fiber input connectors.
function traceRays(rays0, surfaces, couplings) {
  const done = [];
  const stack = rays0.map(r => ({ ...r, pts: [{ x: r.x, y: r.y }], sig: '', depth: 0, last: null }));
  while (stack.length) {
    const r = stack.pop();
    for (; ;) {
      if (r.depth > MAX_DEPTH || r.intensity < MIN_INT) break;
      const hit = nearestHit({ x: r.x, y: r.y }, { x: r.dx, y: r.dy }, surfaces, r.last);
      if (r.evan) {
        // evanescent (isotropic fluorescence): fades out within a short range
        // unless a lens / objective / fiber tip nearby collects it
        const CAPTURE = 120, EVAN_LEN = 22;
        const captured = hit && hit.t <= CAPTURE
          && (hit.surface.kind === 'lens' || hit.surface.kind === 'fiberin');
        if (!captured) {
          const L = hit ? Math.min(hit.t, EVAN_LEN) : EVAN_LEN;
          r.pts.push({ x: r.x + r.dx * L, y: r.y + r.dy * L });
          r.evanFade = true;
          break;
        }
        r.evan = false; // collected: from here on it behaves like normal light
      }
      if (!hit) {
        r.pts.push({ x: r.x + r.dx * MAXLEN, y: r.y + r.dy * MAXLEN });
        break;
      }
      r.pts.push({ x: hit.p.x, y: hit.p.y });
      if (hit.surface.kind === 'fiberin') {
        const fb = hit.surface.data.beam;
        if (couplings && fb.propagate) {
          couplings.push({ beam: fb, end: hit.surface.data.end, wl: r.wl, bw: r.bw, intensity: r.intensity });
        }
        break; // the connector absorbs the incoming beam either way
      }
      const children = interact(r, hit);
      if (children.length === 0) break;
      const c0 = children[0];
      const single = children.length === 1 && !c0.tag
        && (c0.wl === undefined || c0.wl === r.wl)
        && (c0.bw === undefined || c0.bw === r.bw)
        && !(c0.speckle && !r.speckle)
        && !(c0.chopped && !r.chopped)
        && !('pol' in c0 && c0.pol !== r.pol); // pol change splits so probes read per-segment
      if (single) {
        r.x = hit.p.x; r.y = hit.p.y;
        r.dx = c0.d.x; r.dy = c0.d.y;
        if (c0.intensity !== undefined) r.intensity = c0.intensity;
        if ('pol' in c0) r.pol = c0.pol;
        r.last = hit.surface; r.depth++;
        continue;
      }
      for (const c of children) {
        const ox = c.origin ? c.origin.x : hit.p.x, oy = c.origin ? c.origin.y : hit.p.y;
        stack.push({
          x: ox, y: oy, dx: c.d.x, dy: c.d.y,
          wl: c.wl !== undefined ? c.wl : r.wl,
          bw: c.bw !== undefined ? c.bw : r.bw,
          speckle: c.speckle || r.speckle || false,
          chopped: c.chopped || r.chopped || undefined,
          evan: c.evan || false,
          pol: 'pol' in c ? c.pol : r.pol,
          intensity: c.intensity !== undefined ? c.intensity : r.intensity,
          sample: r.sample,
          pts: [{ x: ox, y: oy }],
          sig: r.sig + '/' + (c.tag || 'w'),
          depth: r.depth + 1, last: hit.surface,
        });
      }
      break;
    }
    done.push(r);
  }
  return done;
}

// turn traced polylines into drawables (strokes / envelope strips / speckle
// grains / rainbow ribbons / chopped chunks)
function assembleDrawables(paths, opts, drawables) {
  const { K, isBeam, fixedColor } = opts;
  const colorOf = r => {
    if (fixedColor) return fixedColor;
    if (r.bw >= 200 && r.sample != null && K > 1) {
      // rainbow across the beam width, spanning the ray's actual band
      return wavelengthToColor(r.wl - r.bw / 2 + r.bw * r.sample / (K - 1));
    }
    return wavelengthToColor(r.wl);
  };
  const opOf = r => Math.max(0.25, Math.min(0.95, 0.35 + 0.6 * r.intensity));
  const dashOf = r => r.chopped
    ? `${(r.chopped.period * r.chopped.duty).toFixed(1)} ${(r.chopped.period * (1 - r.chopped.duty)).toFixed(1)}`
    : undefined;

  const pushRay = (r, w, opacity, thin) => {
    if (r.pts.length < 2) return;
    if (r.evanFade) {
      // evanescent glow: short stroke fading to nothing
      const a = r.pts[r.pts.length - 2], b = r.pts[r.pts.length - 1];
      const col = colorOf(r), S = 4;
      for (let i = 0; i < S; i++) {
        const t0 = i / S, t1 = (i + 1) / S;
        drawables.push({
          type: 'path', color: col, w: 1.8, opacity: 0.5 * (1 - t0) + 0.06,
          pts: [
            { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 },
            { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 },
          ],
        });
      }
      return;
    }
    if (r.speckle) {
      if (thin && r.sample != null && r.sample % 2 === 1) return; // thin out beam speckle
      const seed = (Math.round(Math.abs(r.pts[0].x * 13 + r.pts[0].y * 29)) + (r.sample == null ? r.sig.length * 7 : r.sample) * 101) | 0;
      drawables.push({ type: 'dots', color: colorOf(r), dots: speckleDots(r.pts, thin ? 3 : 4, seed, thin ? 130 : 220) });
      return;
    }
    if (r.bw >= 200 && r.sample == null) {
      // supercontinuum line: rainbow ribbon of offset strokes across the band
      const N = 9;
      for (let k = 0; k < N; k++) {
        drawables.push({ type: 'path', pts: offsetPolyline(r.pts, (k - (N - 1) / 2) * 1.2), color: wavelengthToColor(r.wl - r.bw / 2 + r.bw * k / (N - 1)), w: 1.7, opacity: 0.8, dash: dashOf(r) });
      }
      return;
    }
    drawables.push({ type: 'path', pts: r.pts, color: colorOf(r), w, opacity, dash: dashOf(r) });
  };

  if (!isBeam) {
    for (const r of paths) pushRay(r, 2, opOf(r), false);
    return;
  }
  // beam mode: fill an envelope strip between each pair of adjacent sample
  // rays that share the same interaction history (branch signature).
  const bySample = new Map();
  for (const r of paths) {
    if (r.sample === null || r.sample === undefined || r.pts.length < 2) continue;
    if (!bySample.has(r.sample)) bySample.set(r.sample, []);
    bySample.get(r.sample).push(r);
  }
  for (let i = 0; i < K - 1; i++) {
    const nextBySig = new Map((bySample.get(i + 1) || []).map(r => [r.sig, r]));
    for (const ra of bySample.get(i) || []) {
      if (ra.evanFade) { pushRay(ra, 0, 0, false); continue; } // fading glow, no fill
      if (ra.speckle) { pushRay(ra, 0, 0, true); continue; } // grains, no fill
      const rb = nextBySig.get(ra.sig);
      if (rb && !rb.speckle) {
        const op = 0.28 * Math.max(0.4, ra.intensity);
        if (ra.chopped) {
          for (const q of chopStrip(ra.pts, rb.pts, ra.chopped.period, ra.chopped.duty)) {
            drawables.push({ type: 'poly', pts: q, color: colorOf(ra), opacity: op });
          }
        } else {
          drawables.push({ type: 'poly', pts: ra.pts.concat([...rb.pts].reverse()), color: colorOf(ra), opacity: op });
        }
      }
    }
  }
  // last sample's speckle (loop above covers samples 0..K-2)
  for (const r of bySample.get(K - 1) || []) {
    if (r.speckle) pushRay(r, 0, 0, true);
  }
  // outline strokes on the outer edges of the beam only
  for (const i of [0, K - 1]) {
    for (const r of bySample.get(i) || []) {
      if (!r.speckle && !r.evanFade) drawables.push({ type: 'path', pts: r.pts, color: colorOf(r), w: 1.2, opacity: 0.7, dash: dashOf(r) });
    }
  }
}

// Trace everything -> drawables [{type:'path'|'poly'|'dots', ...}]
export function traceAll(elements, beams = []) {
  const surfaces = buildSurfaces(elements, beams);
  const drawables = [];
  const couplings = [];
  lastPaths = [];

  for (const el of elements) {
    const def = registry[el.type];
    if (!def || !def.source) continue;
    const p = el.params;
    const baseColor = p.autoColor === false && p.color ? p.color : wavelengthToColor(p.wavelength);
    const local = def.source(el);
    const srcBw = p.bwMode === 'band' ? (p.bandwidth || 0) : p.bwMode === 'sc' ? 440 : 0;
    const srcWl = p.bwMode === 'sc' ? 650 : p.wavelength;
    const K = local.length;
    const rays0 = local.map(r => {
      const o = toWorld(el, r.x, r.y);
      const d = rotPt(r.dx, r.dy, el.rot || 0);
      return {
        x: o.x, y: o.y, dx: d.x, dy: d.y, wl: srcWl, bw: srcBw, speckle: false,
        pol: typeof p.pol === 'number' ? p.pol : undefined,
        intensity: 1, sample: r.sample !== undefined ? r.sample : null,
      };
    });
    const paths = traceRays(rays0, surfaces, couplings);
    lastPaths.push(...paths);
    assembleDrawables(paths, {
      K, isBeam: p.beamMode === 'beam',
      fixedColor: p.autoColor === false && p.color ? baseColor : null,
    }, drawables);
  }

  // fibers that received light re-emit at their far end (up to 3 chained hops)
  const emitted = new Set();
  for (let pass = 0; pass < 3 && couplings.length; pass++) {
    const batch = couplings.splice(0, couplings.length);
    for (const c of batch) {
      const key = c.beam.id + ':' + c.end + ':' + Math.round(c.wl || 0);
      if (emitted.has(key)) continue;
      emitted.add(key);
      const rays0 = fiberEmissionRays(c);
      if (!rays0) continue;
      const paths = traceRays(rays0, surfaces, couplings);
      lastPaths.push(...paths);
      assembleDrawables(paths, { K: rays0.length, isBeam: true, fixedColor: null }, drawables);
    }
  }
  // image formation for Object elements: locate the image of the object's
  // base and tip by tracing each through every lens on its axis using real
  // per-surface thin-lens physics (two rays per point, then intersect the
  // outgoing lines). This is correct even when the object sits off the
  // shared lens axis (tilted object planes / Scheimpflug) or exactly at a
  // focal plane, unlike a single local-axis paraxial chain.
  for (const el of elements) {
    const def = registry[el.type];
    if (!def || !def.imaging || !el.params.showImage) continue;
    const pp = el.params;
    const u = rotPt(1, 0, el.rot || 0);       // object's forward axis
    const v = rotPt(0, -1, el.rot || 0);      // object's "up" direction
    const p0 = { x: el.x, y: el.y };
    const h0 = pp.height;
    const tip0 = add(p0, mul(v, h0));

    // lens surfaces crossed by the object's own axis ray, ordered by distance
    const hits = [];
    for (const s of surfaces) {
      if (s.kind !== 'lens') continue;
      const e = sub(s.b, s.a);
      const den = u.x * e.y - u.y * e.x;
      if (Math.abs(den) < 1e-9) continue;
      const dp = sub(s.a, p0);
      const t = (dp.x * e.y - dp.y * e.x) / den;
      const q = (dp.x * u.y - dp.y * u.x) / den;
      if (t > 1 && q >= 0 && q <= 1) hits.push({ t, s });
    }
    hits.sort((a, b) => a.t - b.t);
    if (!hits.length || hits.some(h => !h.s.data.f)) continue;

    // image of any point: trace two independent real rays from it through
    // every lens hit with the same bending physics as live ray tracing
    // (lensBend), then intersect the two outgoing lines. Paraxial transfer
    // is linear, so any two non-parallel starting directions give the exact
    // same image point — u+v (45°-ish) is never parallel to u itself, unlike
    // "aim at the first lens centre" which degenerates for on-axis points.
    const imagePoint = P => {
      const rays = [{ p: P, d: u }, { p: P, d: norm(add(u, v)) }];
      for (const { s } of hits) {
        for (const r of rays) {
          const e = sub(s.b, s.a);
          const den = r.d.x * e.y - r.d.y * e.x;
          if (Math.abs(den) < 1e-9) continue;
          const dp = sub(s.a, r.p);
          const t = (dp.x * e.y - dp.y * e.x) / den;
          const hitP = add(r.p, mul(r.d, t));
          r.p = hitP;
          r.d = lensBend(r.d, hitP, s, s.data.f);
        }
      }
      const [rA, rB] = rays;
      const den2 = rA.d.x * rB.d.y - rA.d.y * rB.d.x;
      if (Math.abs(den2) < 1e-9) return null; // image at infinity
      const dp2 = sub(rB.p, rA.p);
      const tA = (dp2.x * rB.d.y - dp2.y * rB.d.x) / den2;
      const pt = add(rA.p, mul(rA.d, tA));
      return isFinite(pt.x) && isFinite(pt.y) ? pt : null;
    };

    const imgBase = imagePoint(p0);
    const imgTip = imagePoint(tip0);
    if (!imgBase || !imgTip) continue;
    if (Math.hypot(imgBase.x - p0.x, imgBase.y - p0.y) > MAXLEN) continue;

    const m = dot(sub(imgTip, imgBase), v) / h0;
    if (!isFinite(m) || Math.abs(m) < 1e-6) continue;
    const color = pp.autoColor === false && pp.color ? pp.color : wavelengthToColor(pp.wavelength);
    // redraw the object's shape at the image plane, scaled by |m| and
    // vertically flipped when m < 0
    const sh = OBJ_SHAPES[pp.shape] || OBJ_SHAPES.arrow;
    const toWorldPt = (sx, sy) => add(add(imgBase, mul(u, sx * h0 * Math.abs(m))), mul(v, -sy * h0 * m));
    for (const ln of sh.lines) {
      drawables.push({ type: 'path', pts: ln.map(q => toWorldPt(q[0], q[1])), color, w: 2.2, opacity: 0.85, dash: true });
    }
    for (const pg of sh.polys) {
      drawables.push({ type: 'poly', pts: pg.map(q => toWorldPt(q[0], q[1])), color, opacity: 0.85 });
    }
  }

  return drawables;
}
