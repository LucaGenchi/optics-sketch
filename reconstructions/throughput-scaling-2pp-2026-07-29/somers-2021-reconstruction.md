# Somers et al. 2021: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: Rapid, continuous projection multi-photon 3D printing enabled by spatiotemporal focusing of femtosecond pulses
- Citation: P. Somers et al., Light: Science & Applications 10, 199 (2021)
- DOI: https://doi.org/10.1038/s41377-021-00645-z
- PDF used: https://www.nature.com/articles/s41377-021-00645-z.pdf
- PDF status: accessible publisher PDF
- Figure/methods anchor: Fig. 1, PDF page 2 (system schematic)

## Direct paper evidence

- 800 nm, 65 fs, 5 kHz, approximately 22 nm bandwidth regenerative amplifier.
- πShaper, L1/L2 expansion, DMD, L3 collection, 100× NA 1.49 objective, and three-axis stage.
- DMD patterns up to 4 kHz provide continuous layer-by-layer projection.

## Inferred or diagram-only choices

- Flattened fold geometry and representative trace focal lengths.

## Unknowns retained

- A single delivered average power for the plotted result and exact complete relay coatings.

## OpticalSetup mapping

- `somers-2021-source`: 800 nm · 65 fs · 5 kHz · ~22 nm band → `laser` (qualitative pulsed source)
- `somers-2021-train-1`: πShaper → `box` (diagram-only pass-through)
- `somers-2021-train-2`: L1/L2 expansion 100/150 mm → `telescope` (qualitative native element)
- `somers-2021-train-3`: DMD ≤4 kHz patterns → `box` (diagram-only pass-through)
- `somers-2021-train-4`: L3 · 300 mm → `lens` (qualitative native element)
- `somers-2021-train-5`: projection plane → `box` (diagram-only pass-through)
- `somers-2021-focus`: 100× NA 1.49 objective → `objective` (qualitative thin-lens objective surrogate)
- `somers-2021-sample-stage`: PETA resin · 3-axis stage → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- Spatiotemporal focusing, DMD diffraction, and 2D projected dose are not simulated.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: yes, one qualitative chief ray
- Overall generated check: PASS
