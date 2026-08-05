# Nanoscribe GT data sheet: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: Data Sheet — Photonic Professional GT
- Citation: Nanoscribe Photonic Professional GT data sheet, revision DS/GT/V04_2016
- PDF used: https://mdpi-res.com/d_attachment/polymers/polymers-10-00011/article_deploy/polymers-10-00011-s001.pdf?version=1513942821
- PDF status: accessible mirrored product data sheet; 2016 revision
- Figure/methods anchor: Page 1, “SYSTEM & COMPONENTS” product image

## Direct paper evidence

- NIR femtosecond fibre laser, galvo scanner, motorized XY stage, XYZ piezo stage, objectives, and camera.

## Inferred or diagram-only choices

- Readable subsystem order and a generic objective-to-resist endpoint.

## Unknowns retained

- Laser wavelength, pulse duration, repetition rate, power, relay optics, objective model, and sample parameters.

## OpticalSetup mapping

- `nanoscribe-gt-datasheet-source-diagram`: NIR fs fibre laser · wavelength/timing not disclosed → `box` (diagram-only; no emitted ray)
- `nanoscribe-gt-datasheet-train-1`: beam conditioning not disclosed → `box` (diagram-only pass-through)
- `nanoscribe-gt-datasheet-train-2`: galvo scanner → `box` (diagram-only pass-through)
- `nanoscribe-gt-datasheet-train-3`: motorized XY + XYZ piezo → `box` (diagram-only pass-through)
- `nanoscribe-gt-datasheet-train-4`: camera / autofocus → `box` (diagram-only pass-through)
- `nanoscribe-gt-datasheet-focus`: interchangeable objectives → `objective` (qualitative thin-lens objective surrogate)
- `nanoscribe-gt-datasheet-sample-stage`: photoresist platform → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- This is revision DS/GT/V04_2016, not a verified copy of the explorer’s 2014-era sheet.
- The source remains diagram-only because the data sheet does not disclose numerical laser parameters.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: not claimed; source parameters are incomplete
- Overall generated check: PASS
