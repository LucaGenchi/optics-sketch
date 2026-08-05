# Hahn et al. 2020: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: Rapid Assembly of Small Materials Building Blocks (Voxels) into Large Functional 3D Metamaterials
- Citation: V. Hahn et al., Advanced Functional Materials 30, 1907795 (2020)
- DOI: https://doi.org/10.1002/adfm.201907795
- PDF used: https://d-nb.info/1259433633/34
- PDF status: accessible repository PDF
- Figure/methods anchor: Fig. 2, PDF page 5 (system schematic)

## Direct paper evidence

- 790 nm Ti:sapphire source, 2.8 W, 80 MHz, and 90 fs at source output.
- AOM, two-prism compressor, 3×3 DOE, DCT, PBS, relay, GX/GY galvos, quarter-wave plate, 40× NA 1.4 objective, and XY/Z stage.
- Nine foci and 2.8 kHz peak galvo operation.

## Inferred or diagram-only choices

- Fold flattening and pass-through representations for the compressor, DOE, DCT, PBS, and scan pair.

## Unknowns retained

- Delivered pulse duration/power at every focus and full relay prescriptions.

## OpticalSetup mapping

- `hahn-2020-source`: 790 nm · 90 fs · 80 MHz · 2.8 W → `laser` (qualitative pulsed source)
- `hahn-2020-train-1`: AOM ~1 MHz → `aom` (qualitative native element)
- `hahn-2020-train-2`: N-SF10 prism compressor pair → `box` (diagram-only pass-through)
- `hahn-2020-train-3`: 3×3 DOE → `box` (diagram-only pass-through)
- `hahn-2020-train-4`: DCT + PBS → `box` (diagram-only pass-through)
- `hahn-2020-train-5`: GX/GY galvos 2.8 kHz → `box` (diagram-only pass-through)
- `hahn-2020-focus`: 40× NA 1.4 objective → `objective` (qualitative thin-lens objective surrogate)
- `hahn-2020-sample-stage`: IP-L · XY + Z piezo → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- The 3×3 DOE is represented as one chief ray; pulse compression and diffractive splitting are annotations.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: yes, one qualitative chief ray
- Overall generated check: PASS
