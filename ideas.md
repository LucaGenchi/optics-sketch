# Ideas

## Pulsed-beam component showcase

Create a built-in example that feels like a living optical table rather than a
wordmark: visible wavelength-coloured pulse packets travel through a generous,
branching layout and make the range of available components legible at a glance.

- Start with one or more pulsed sources, ideally including a supercontinuum
  source, so the canvas is animated even before a component is selected.
- Use mirrors and beamsplitters to fold and split the paths, with distinct
  branches showcasing lenses/objectives, filters/dichroics, polarization
  elements, dispersive optics, wavefront shapers, modulators, delay lines,
  nonlinear crystals, fibres, samples, and detectors.
- Make each branch spatially calm and inspectable; the whole piece should read
  as a component panorama, not as an attempt to pack every item into a single
  physically credible laboratory instrument.
- Let the normal qualitative tracer explain each local interaction. Where a
  component needs configuration or is intentionally diagram-only, make that
  status explicit rather than inventing optical behaviour for the showcase.
- Include a focused regression test for finite trace/export output and for the
  intended collection of component families. Verify packet motion and the
  desktop/near-1024 px layout in the browser.
