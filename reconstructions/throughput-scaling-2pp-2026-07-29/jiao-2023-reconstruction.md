# Jiao et al. 2023: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: Acousto-optic scanning spatial-switching multiphoton lithography
- Citation: B. Jiao et al., International Journal of Extreme Manufacturing 5, 035008 (2023)
- DOI: https://doi.org/10.1088/2631-7990/ace0a7
- PDF used: https://www.ijemnet.com/en/article/pdf/preview/10.1088/2631-7990/ace0a7.pdf
- PDF status: accessible publisher-platform PDF
- Figure/methods anchor: Fig. 1, PDF page 3 (system schematic)

## Direct paper evidence

- 517 nm femtosecond source, 250 fs, 45 MHz, and 6.5 W.
- Prism precompensation, 2 MHz AOM switch, angular-dispersion prism, two-axis AOD, compensation relay, DOE, DMD switch, 100× NA 1.4 objective, and stage.
- Eight-focus acousto-optic spatial-switching architecture.

## Inferred or diagram-only choices

- All three-dimensional folds are flattened into the reported order.

## Unknowns retained

- Complete focal-length inventory and delivered power at every focus.

## OpticalSetup mapping

- `jiao-2023-source`: 517 nm · 250 fs · 45 MHz · 6.5 W → `laser` (qualitative pulsed source)
- `jiao-2023-train-1`: P1/P2 prism precompensation → `box` (diagram-only pass-through)
- `jiao-2023-train-2`: AOM switch 2 MHz → `aom` (qualitative native element)
- `jiao-2023-train-3`: P3 angular dispersion → `box` (diagram-only pass-through)
- `jiao-2023-train-4`: two-axis AOD → `box` (diagram-only pass-through)
- `jiao-2023-train-5`: Kepler + cyl. compensation → `box` (diagram-only pass-through)
- `jiao-2023-train-6`: DOE · 8 beams → `box` (diagram-only pass-through)
- `jiao-2023-train-7`: DMD switch → `box` (diagram-only pass-through)
- `jiao-2023-focus`: 100× NA 1.4 objective → `objective` (qualitative thin-lens objective surrogate)
- `jiao-2023-sample-stage`: resin on XYZ stage → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- Acousto-optic swept-wavefront correction and the eight-focus DMD switching pattern are diagram-only.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: yes, one qualitative chief ray
- Overall generated check: PASS
