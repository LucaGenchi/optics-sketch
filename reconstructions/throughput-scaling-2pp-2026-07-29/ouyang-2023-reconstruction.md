# Ouyang et al. 2023: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: Ultrafast 3D nanofabrication via digital holography
- Citation: W. Ouyang et al., Nature Communications 14, 1716 (2023)
- DOI: https://doi.org/10.1038/s41467-023-37163-y
- PDF used: https://www.nature.com/articles/s41467-023-37163-y.pdf
- PDF status: accessible publisher PDF
- Figure/methods anchor: Fig. 1a, PDF page 2 (system schematic)

## Direct paper evidence

- 800 nm Ti:sapphire amplifier, 1 kHz, 100 fs, and 4 W.
- 600 lines/mm grating, L1/L2 dispersion precompensation, DMD hologram, Fourier lens and spatial filter, relay/dichroic, objective, and six-axis stage.
- Up to 2,000 individually programmable foci and single-pulse fabrication.

## Inferred or diagram-only choices

- Readable linearization of the folded holographic train.

## Unknowns retained

- Objective focal length/NA in the main schematic and per-focus delivered power for each result.

## OpticalSetup mapping

- `ouyang-2023-source`: 800 nm · 100 fs · 1 kHz · 4 W → `laser` (qualitative pulsed source)
- `ouyang-2023-train-1`: 600 lines/mm grating → `box` (diagram-only pass-through)
- `ouyang-2023-train-2`: L1/L2 4f 225/250 mm → `telescope` (qualitative native element)
- `ouyang-2023-train-3`: DMD hologram pulse-synchronized → `box` (diagram-only pass-through)
- `ouyang-2023-train-4`: L3 + spatial filter → `box` (diagram-only pass-through)
- `ouyang-2023-train-5`: L4 + dichroic + L5 relay → `box` (diagram-only pass-through)
- `ouyang-2023-focus`: objective L5 → `objective` (qualitative thin-lens objective surrogate)
- `ouyang-2023-sample-stage`: FTO/resin · 6-axis stage → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- The DMD hologram, 2,000-focus array, and pulse-synchronized exposure are not simulated.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: yes, one qualitative chief ray
- Overall generated check: PASS
