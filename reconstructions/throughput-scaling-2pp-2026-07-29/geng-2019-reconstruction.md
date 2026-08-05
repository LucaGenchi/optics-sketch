# Geng et al. 2019: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: Ultrafast multi-focus 3-D nano-fabrication based on two-photon polymerization
- Citation: Q. Geng et al., Nature Communications 10, 2179 (2019)
- DOI: https://doi.org/10.1038/s41467-019-10249-2
- PDF used: https://www.nature.com/articles/s41467-019-10249-2.pdf
- PDF status: accessible publisher PDF
- Figure/methods anchor: Fig. 1, PDF page 2 (system schematic)

## Direct paper evidence

- Tunable Ti:sapphire source set to 800 nm, 200 fs, and 3.3 W.
- L1/L2 4f expansion, 1200 lines/mm grating with mirror, reflective DMD, spatial filter, L3/L4 relay, 40× NA 1.3 objective, and XYZ stage.
- The DMD system produces one to tens of foci with refresh rates up to 22.7 kHz.

## Inferred or diagram-only choices

- The source stays diagram-only because the repetition rate is not stated in the extracted apparatus paragraph.

## Unknowns retained

- Exact DMD operating pattern, delivered power per focus, and every fold mirror.

## OpticalSetup mapping

- `geng-2019-source-diagram`: 800 nm · 200 fs · 3.3 W · repetition rate not reported → `box` (diagram-only; no emitted ray)
- `geng-2019-train-1`: 4f L1/L2 100/250 mm → `telescope` (qualitative native element)
- `geng-2019-train-2`: 1200 lines/mm grating + M1 → `box` (diagram-only pass-through)
- `geng-2019-train-3`: reflective DMD ≤22.7 kHz → `box` (diagram-only pass-through)
- `geng-2019-train-4`: spatial filter → `box` (diagram-only pass-through)
- `geng-2019-train-5`: L3/L4 relay 200/200 mm → `telescope` (qualitative native element)
- `geng-2019-focus`: 40× NA 1.3 objective → `objective` (qualitative thin-lens objective surrogate)
- `geng-2019-sample-stage`: IP-Dip on XYZ stage → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- The DMD/grating section is diagram-only.
- No emitted ray is claimed because completing the pulsed-source schema would require inventing an unreported repetition rate.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: not claimed; source parameters are incomplete
- Overall generated check: PASS
