# Bückmann et al. 2014: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: An elasto-mechanical unfeelability cloak made of pentamode metamaterials
- Citation: T. Bückmann et al., Nature Communications 5, 4130 (2014)
- DOI: https://doi.org/10.1038/ncomms5130
- PDF used: https://www.nature.com/articles/ncomms5130.pdf
- PDF status: accessible publisher PDF
- Figure/methods anchor: No optical-train figure; reconstruction is methods-derived

## Direct paper evidence

- Frequency-doubled erbium-fibre source centered at 780 nm with about 90 fs pulses.
- Galvanometric scanning, mechanical stages, 25× NA 0.8 dip-in objective, IP-S resist, eight stitched fields, and 5 cm/s scan speed.

## Inferred or diagram-only choices

- Left-to-right ordering of conditioning, scanners, relay, objective, and stage.

## Unknowns retained

- Repetition rate, power/polarization conditioning, relay design, scanner model, and delivered power.

## OpticalSetup mapping

- `buckmann-2014-source-diagram`: 780 nm · ~90 fs · repetition rate not reported → `box` (diagram-only; no emitted ray)
- `buckmann-2014-train-1`: power / beam conditioning unknown → `box` (diagram-only pass-through)
- `buckmann-2014-train-2`: XY galvos → `box` (diagram-only pass-through)
- `buckmann-2014-train-3`: scan relay unreported → `box` (diagram-only pass-through)
- `buckmann-2014-focus`: 25× NA 0.8 dip-in objective → `objective` (qualitative thin-lens objective surrogate)
- `buckmann-2014-sample-stage`: IP-S · stitched fields → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- The paper contains fabrication and mechanics figures but no apparatus schematic.
- The source stays diagram-only because the pulse repetition rate is not reported.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: not claimed; source parameters are incomplete
- Overall generated check: PASS
