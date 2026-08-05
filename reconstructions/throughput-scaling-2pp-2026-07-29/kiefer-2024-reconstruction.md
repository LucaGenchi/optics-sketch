# Kiefer et al. 2024: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: A multi-photon (7 × 7)-focus 3D laser printer based on a 3D-printed diffractive optical element and a 3D-printed multi-lens array
- Citation: P. Kiefer et al., Light: Advanced Manufacturing 4, 3 (2024)
- DOI: https://doi.org/10.37188/lam.2024.003
- PDF used: https://www.light-am.com/article/pdf/preview/LAM2023080053.pdf
- PDF status: accessible publisher PDF
- Figure/methods anchor: Fig. 2, PDF page 4 (system schematic)

## Direct paper evidence

- 790 nm Ti:sapphire source, 3.7 W, 80 MHz, and 140 fs.
- Three telescope/relay groups, AOM, 7×7 DOE, 7×7 microlens array, scan relays, GX/GY galvos, 40× NA 1.4 objective, and XY/Z stage.
- Forty-nine foci with 60 µm focus spacing.

## Inferred or diagram-only choices

- Linearization of the folded relay and compact trace focal lengths preserving magnification ordering only.

## Unknowns retained

- Delivered power per focus and full coating/calibration data.

## OpticalSetup mapping

- `kiefer-2024-source`: 790 nm · 140 fs · 80 MHz · 3.7 W → `laser` (qualitative pulsed source)
- `kiefer-2024-train-1`: L1/L2 1.25× → `telescope` (qualitative native element)
- `kiefer-2024-train-2`: AOM → `aom` (qualitative native element)
- `kiefer-2024-train-3`: L3/L4 1.60× → `telescope` (qualitative native element)
- `kiefer-2024-train-4`: DOE · 7×7 → `box` (diagram-only pass-through)
- `kiefer-2024-train-5`: L5/L6/L7 relay → `box` (diagram-only pass-through)
- `kiefer-2024-train-6`: MLA · 7×7 → `box` (diagram-only pass-through)
- `kiefer-2024-train-7`: GX/GY galvos → `box` (diagram-only pass-through)
- `kiefer-2024-focus`: 40× NA 1.4 objective → `objective` (qualitative thin-lens objective surrogate)
- `kiefer-2024-sample-stage`: XY + Z piezo stage → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- The DOE/MLA pair is diagram-only; the live trace does not create 49 beamlets.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: yes, one qualitative chief ray
- Overall generated check: PASS
