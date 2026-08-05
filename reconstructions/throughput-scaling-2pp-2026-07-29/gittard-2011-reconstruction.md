# Gittard et al. 2011: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: Fabrication of microscale medical devices by two-photon polymerization with multiple foci via a spatial light modulator
- Citation: S. D. Gittard et al., Biomedical Optics Express 2, 3167–3178 (2011)
- DOI: https://doi.org/10.1364/BOE.2.003167
- PDF used: https://europepmc.org/api/getPdf?pmcid=PMC3207384
- PDF status: accessible full article
- Figure/methods anchor: Fig. 1, PDF page 7 (full optical train)
- Source-value qualification: The app uses 150 fs as the reported upper-bound trace value.

## Direct paper evidence

- 780 nm Ti:sapphire source, pulse width under 150 fs, 80 MHz, and 4 W source power.
- Energy control, two-lens expansion, reflective SLM, Fourier-plane stop, camera branch, galvo scanner, objective/sample stack, and XYZ stage.
- A 4×4 focus pattern is used for one fabrication example; the paper also reports six-by-six hologram capability.

## Inferred or diagram-only choices

- The readable left-to-right placement flattens the paper’s folded microscope train.

## Unknowns retained

- Relay focal lengths, split ratio, SLM diffraction efficiency, scanner model, and delivered sample power.

## OpticalSetup mapping

- `gittard-2011-source`: 780 nm · <150 fs · 80 MHz · 4 W → `laser` (qualitative pulsed source)
- `gittard-2011-train-1`: LC energy control + PBS → `box` (diagram-only pass-through)
- `gittard-2011-train-2`: 2× Galilean expander → `telescope` (qualitative native element)
- `gittard-2011-train-3`: reflective SLM multi-focus → `box` (diagram-only pass-through)
- `gittard-2011-train-4`: Fourier stop + camera branch → `box` (diagram-only pass-through)
- `gittard-2011-train-5`: galvo scanner → `box` (diagram-only pass-through)
- `gittard-2011-focus`: 100× NA 1.4 / 20× NA 0.4 → `objective` (qualitative thin-lens objective surrogate)
- `gittard-2011-sample-stage`: Ormocer on XYZ stage → `stage` (qualitative resin hit / voxel marker only)

## Limitations

- The SLM and Fourier train are diagram-only pass-through boxes; the live ray is one representative chief ray, not the multi-focus array.
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: yes
- No manual beam overlays: yes
- Finite trace/export geometry: yes
- Source-to-sample trace: yes, one qualitative chief ray
- Overall generated check: PASS
