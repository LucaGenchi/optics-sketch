# Saha et al. 2019: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: Scalable submicrometer additive manufacturing
- Citation: S. K. Saha et al., Science 366, 105–109 (2019)
- DOI: https://doi.org/10.1126/science.aax8760
- PDF used: https://liuchao-jin.github.io/files/essay/saha2019scalable.pdf
- PDF status: accessible article mirror
- Figure/methods anchor: Fig. 1B, PDF page 1 (system schematic)

## Direct paper evidence

- Femtosecond source, DMD used as both pattern mask and dispersive element, collimating lens, objective, and moving resist stage.
- 800 nm, nominal 35 fs, 1 kHz, and 60× NA 1.25 objective in the reported fabrication configuration.

## Inferred or diagram-only choices

- Flattened DMD-to-objective fold.

## Unknowns retained

- Single delivered operating power for the plotted throughput point and complete relay prescription.

## OpticalSetup mapping

- `saha-2019-source`: 800 nm · nominal 35 fs · 1 kHz → `laser` (qualitative pulsed source)
- `saha-2019-train-1`: DMD mask + grating → `box` (diagram-only pass-through)
- `saha-2019-train-2`: L1 collimator → `lens` (qualitative native element)
- `saha-2019-train-3`: parallel focal pattern → `box` (diagram-only pass-through)
- `saha-2019-train-4`: motion-stage synchronization → `box` (diagram-only pass-through)
- `saha-2019-focus`: 60× NA 1.25 objective → `objective` (qualitative thin-lens objective surrogate)
- `saha-2019-sample-stage`: resist on motion stage → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- DMD temporal/spatial focusing and parallel pixels are not simulated; the live beam is one chief ray.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: yes, one qualitative chief ray
- Overall generated check: PASS
