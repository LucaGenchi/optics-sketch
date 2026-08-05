# Fischer & Wegener 2011: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: Three-dimensional direct laser writing inspired by stimulated-emission-depletion microscopy
- Citation: J. Fischer and M. Wegener, Optical Materials Express 1, 614–624 (2011)
- DOI: https://doi.org/10.1364/OME.1.000614
- PDF used: https://arxiv.org/pdf/1105.5703
- PDF status: accessible author manuscript
- Figure/methods anchor: Fig. 2, PDF page 7 (focus profiles; not a complete train)

## Direct paper evidence

- 810 nm femtosecond excitation and 532 nm continuous-wave depletion beams, both circularly polarized.
- Both beams are chopped at 4 kHz with 3% duty; the depletion arm contains a 430 nm SU-8 phase mask imaged to the objective pupil.
- Leica HCX PL APO NA 1.4 objective, DETC resist formulation, and 100 µm/s scan speed.

## Inferred or diagram-only choices

- Quarter-wave plates, dichroic combiner, pupil-relay layout, and all 2D folds.
- The source is a diagram-only box because pulse duration and repetition rate are not reported.

## Unknowns retained

- Full optical train, relay focal lengths, delivered powers, and scan actuator.

## OpticalSetup mapping

- `fischer-2011-source-diagram`: 810 nm fs excitation · duration/rate not reported → `box` (diagram-only; no emitted ray)
- `fischer-2011-train-1`: AOM 4 kHz, 3% → `box` (diagram-only pass-through)
- `fischer-2011-train-2`: circular pol. QWP inferred → `qwp` (qualitative native element)
- `fischer-2011-train-3`: 532 nm CW branch AOM + SU-8 mask → `box` (diagram-only pass-through)
- `fischer-2011-train-4`: pupil relay inferred → `box` (diagram-only pass-through)
- `fischer-2011-train-5`: 532/810 combiner inferred → `box` (diagram-only pass-through)
- `fischer-2011-focus`: NA 1.4 objective → `objective` (qualitative thin-lens objective surrogate)
- `fischer-2011-sample-stage`: DETC resist · 100 µm/s → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- The PDF figure shows focal distributions rather than the complete apparatus.
- OpticalSetup does not model STED depletion photochemistry or the phase mask’s three-dimensional focal shaping.
- The paper’s 3% AOM duty is below the app’s current 5% inspector minimum, so it remains an annotation.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: not claimed; source parameters are incomplete
- Overall generated check: PASS
