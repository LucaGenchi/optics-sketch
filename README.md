# Optics Sketch

A 2D optical-setup sketch builder for scientific illustrations, with live ray tracing.

**➡ Try it in your browser: https://lucagenchi.github.io/optics-sketch/**

Search or browse optical elements, select one, and place it on a virtual optical table
(top view). Set its parameters
(focal lengths, wavelengths, transmission bands, angles...), and the beam paths are
ray-traced live: mirrors fold, lenses focus, dichroics split by wavelength, gratings
and prisms disperse, samples fluoresce, fibers re-emit. Export publication-ready
figures as SVG or PNG.

## Highlights

- **Element palette**: lasers (line or sized beam, monochromatic / broadband /
  supercontinuum), mirrors (flat with reflectivity, convex/concave, true parabolic,
  galvo), lenses, telescopes, objectives, dichroics, filters, beamsplitters,
  polarization optics (polarizers, waveplates, PBS, isolator), gratings, prisms,
  diffusers, wavefront shapers (SLM, DMD, deformable mirror) with composable
  optical functions, modulators (AOM/EOM/chopper), nonlinear crystals (SHG, THG,
  supercontinuum, OPO), fibers with per-end output specs, detectors, a focusing
  human eye, and free annotations (arrows, labels, beam probes).
- **Honest capability states**: the component library and inspector distinguish
  simulated elements, elements that need setup, and diagram-only placeholders.
- **Qualitative detector readouts**: photodetectors, PMTs, and cameras report
  relative ray signal, spectrum, polarization, and spot span at their front face.
- **Physics that responds**: thin-lens/paraxial transfer, spectral band arithmetic at
  filters, Malus's law, grating equation, Cauchy prism dispersion, cavity round trips
  with partial mirrors, image formation with magnification (arrow / letter F / tree
  objects and their computed images).
- **Examples menu**: pedagogical image-formation setups (telescope, microscope,
  camera + depth of field, Scheimpflug, vignetting...) and laboratory sketches
  (Michelson, Mach–Zehnder, laser cavity, OPO...).
- **Sharing**: sketches save/load as `.json` files; figures export as SVG/PNG.

## Feedback

Use the app, then send your exported `.json` sketch and notes to Luca. The canvas
autosaves in your own browser, so you can't break anything for anyone else.

## Run locally

No build step — plain HTML/JS/SVG:

```bash
node serve.mjs        # serves on http://localhost:5182
npm test              # runs the regression suite
```

(Any static file server works; ES modules require http(s), not file://.)
