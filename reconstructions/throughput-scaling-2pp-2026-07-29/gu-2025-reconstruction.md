# Gu et al. 2025: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: 3D nanolithography with metalens arrays and spatially adaptive illumination
- Citation: S. Gu et al., Nature (2025), DOI 10.1038/s41586-025-09842-x
- DOI: https://doi.org/10.1038/s41586-025-09842-x
- PDF used: https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41586-025-09842-x/MediaObjects/41586_2025_9842_MOESM1_ESM.pdf
- PDF status: official supplementary-information PDF; main article PDF was not openly accessible
- Figure/methods anchor: Extended Data Fig. 2 on the article page; quantitative support in the official SI PDF
- Main-PDF boundary: this scene is backed by the official supplementary PDF and article figure, not an open main-article PDF.

## Direct paper evidence

- Official supplementary information reports 800 nm center wavelength, 20 nm FWHM, 7 W, and 1 kHz for the current system.
- SLM-based spatially adaptive illumination, beam expansion, metalens array, three-axis stage with two-axis tip/tilt, alignment microscope, and confocal distance sensor.
- The explorer’s N=2,500 and N=129,500 points refer to the same apparatus; one setup covers both.

## Inferred or diagram-only choices

- The OpticalSetup objective icon is explicitly a single-chief-ray focusing surrogate for the metalens array.
- Readable ordering of the polarization-control and alignment branches.

## Unknowns retained

- Current-system pulse duration and a lawful open main-article PDF.

## OpticalSetup mapping

- `gu-2025-source-diagram`: 800 nm · 20 nm FWHM · 7 W · 1 kHz · duration not reported → `box` (diagram-only; no emitted ray)
- `gu-2025-train-1`: HWP/PBS power control → `box` (diagram-only pass-through)
- `gu-2025-train-2`: SLM phase-to- amplitude control → `box` (diagram-only pass-through)
- `gu-2025-train-3`: beam expander → `telescope` (qualitative native element)
- `gu-2025-train-4`: metalens array 2,500–129,500 sites → `box` (diagram-only pass-through)
- `gu-2025-train-5`: alignment microscope + confocal sensor → `box` (diagram-only pass-through)
- `gu-2025-focus`: metalens focus surrogate → `objective` (single-chief-ray focusing surrogate for metalens array)
- `gu-2025-sample-stage`: resist · XYZ + tip/tilt → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- This reconstruction is supplement-backed; the main article PDF was not openly accessible.
- The source stays diagram-only so an unreported pulse duration is not silently invented.
- Metalens diffraction, 2,500/129,500 simultaneous foci, spatial calibration, and dose are not simulated.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: not claimed; source parameters are incomplete
- Overall generated check: PASS
