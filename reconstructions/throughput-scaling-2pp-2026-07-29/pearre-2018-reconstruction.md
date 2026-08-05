# Pearre et al. 2018: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: Fast Micron-Scale 3D Printing with a Resonant-Scanning Two-Photon Microscope
- Citation: B. W. Pearre et al., arXiv:1803.07135 (2018)
- PDF used: https://arxiv.org/pdf/1803.07135
- PDF status: accessible author manuscript
- Figure/methods anchor: Fig. 1, PDF page 3 (system schematic)
- Source-value qualification: 0.8 W is a bounded trace value within the reported 0.6–1.0 W operating range.

## Direct paper evidence

- Tunable Ti:sapphire source, usually 780 nm, about 120 fs, 80 MHz, and 600–1000 mW.
- 3.33 MHz Pockels-cell modulation, 2× Galilean expander, 7.91 kHz resonant X scanner, Y galvo, 25× NA 0.8 objective, Z piezo, and PMT branch.

## Inferred or diagram-only choices

- The operating-range midpoint is not used; 0.8 W is explicitly only a bounded representative trace value.

## Unknowns retained

- Exact operating power for every build and complete scanner-relay prescriptions.

## OpticalSetup mapping

- `pearre-2018-source`: 780 nm typical · ~120 fs · 80 MHz → `laser` (qualitative pulsed source)
- `pearre-2018-train-1`: Pockels cell 3.33 MHz → `box` (diagram-only pass-through)
- `pearre-2018-train-2`: 2× Galilean expander → `telescope` (qualitative native element)
- `pearre-2018-train-3`: X resonant scanner 7.91 kHz → `box` (diagram-only pass-through)
- `pearre-2018-train-4`: Y galvo → `box` (diagram-only pass-through)
- `pearre-2018-train-5`: objective Z piezo + PMT branch → `box` (diagram-only pass-through)
- `pearre-2018-focus`: 25× NA 0.8 immersion objective → `objective` (qualitative thin-lens objective surrogate)
- `pearre-2018-sample-stage`: IP-Dip on print stage → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- The resonant scanner is a diagram-only box because OpticalSetup’s animated galvo control is capped at 5 kHz.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: yes, one qualitative chief ray
- Overall generated check: PASS
