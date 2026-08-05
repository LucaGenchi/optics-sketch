# Zhang et al. 2024: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: High-Throughput Two-Photon 3D Printing Enabled by Holographic Multi-Foci High-Speed Scanning
- Citation: L. Zhang et al., Nano Letters 24, 2671–2679 (2024)
- DOI: https://doi.org/10.1021/acs.nanolett.4c00505
- PDF used: https://mane.ustc.edu.cn/_upload/article/files/87/1e/a51f62f74e9d807ff2eb58cf86a2/3b90a55f-f7a8-4bac-8cbb-0305af0aee96.pdf
- PDF status: accessible institutional PDF
- Figure/methods anchor: Fig. 1a, PDF page 2 (system schematic)
- Source-value qualification: 10 W is the reported source maximum, not a claim of delivered sample power.

## Direct paper evidence

- 1030 nm femtosecond fibre source, 1 MHz, 400 fs, and 10 W maximum.
- AOM, HWP/PBS energy control, beam expander and iris, reflective LCoS-SLM, two 4f relays with galvanometers, 60× NA 1.35 objective, piezo Z, and CCD branch.
- More than 400 holographic foci are demonstrated.

## Inferred or diagram-only choices

- Fold flattening and representative telescope/objective trace parameters.

## Unknowns retained

- Delivered power per focus and exact operating power for every printed structure.

## OpticalSetup mapping

- `zhang-2024-source`: 1030 nm · 400 fs · 1 MHz · max 10 W → `laser` (qualitative pulsed source)
- `zhang-2024-train-1`: AOM → `aom` (qualitative native element)
- `zhang-2024-train-2`: HWP/PBS energy control → `box` (diagram-only pass-through)
- `zhang-2024-train-3`: beam expander + iris → `telescope` (qualitative native element)
- `zhang-2024-train-4`: reflective LCoS-SLM → `box` (diagram-only pass-through)
- `zhang-2024-train-5`: 4f relays + galvo pair → `box` (diagram-only pass-through)
- `zhang-2024-train-6`: CCD branch → `box` (diagram-only pass-through)
- `zhang-2024-focus`: 60× NA 1.35 oil objective → `objective` (qualitative thin-lens objective surrogate)
- `zhang-2024-sample-stage`: resist · piezo Z → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- Holographic focus synthesis, zero-order suppression, and multi-focus galvo scanning are diagram-only.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: yes, one qualitative chief ray
- Overall generated check: PASS
