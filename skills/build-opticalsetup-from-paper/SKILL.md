---
name: build-opticalsetup-from-paper
description: Reconstruct an optical experiment from a scientific paper PDF as a loadable, evidence-backed OpticalSetup scene. Use when asked to replicate, redraw, understand, or validate a paper's optics setup; extract a setup figure and its caption; connect the figure to methods, supplements, or cited instrument papers; map the apparatus to OpticalSetup components; and verify beam paths, pulse timing, or detector behavior without inventing unsupported physics.
---

# Build OpticalSetup from Paper

Turn a paper's apparatus into a loadable OpticalSetup JSON scene while keeping every important choice traceable to the paper. Treat the figure as topology, the prose as the operating contract, and the live component registry as the implementation boundary.

Read [references/reconstruction-contract.md](references/reconstruction-contract.md) before drafting the scene or validation contract.

## Non-negotiable gates

- Do not build from the setup figure alone.
- Do not use extracted PDF text as a substitute for visually inspecting the rendered figure.
- Follow any sentence such as “the setup is described in Ref. N” into that cited paper, supplement, or thesis before declaring the evidence complete.
- Do not relabel a semantically different component to make the diagram look correct.
- Do not draw manual beams merely to hide a broken optical path. Use traced components; allow a manual beam only when the contract explicitly identifies it as diagram-only.
- Do not add a missing component or new physics to the app without explicit user approval.
- Validate paper claims against an evidence contract written before the scene. A test derived only from the finished scene can ratify a hallucination.
- Describe OpticalSetup results as qualitative unless the app contains an explicitly calibrated model.

## 1. Establish the task boundary

Locate the OpticalSetup repository and read its `README.md` and `AGENTS.md`. Inspect `git status --short --branch` before changing anything. Preserve unrelated work.

Default to creating these artifacts without changing application code:

1. `<slug>-source-figure.png` — extracted or cropped setup panel with its paper/page provenance recorded in the reconstruction notes.
2. `<slug>.opticalsetup.json` — loadable scene.
3. `<slug>-reconstruction.md` — measurement story, evidence ledger, mappings, assumptions, and limitations.
4. `<slug>-contract.json` — machine-checkable evidence and physics contract.
5. `<slug>-checks.json` — validator output.

Only edit built-in examples, components, or ray physics when the user explicitly requests an app extension.

## 2. Read the paper as visual and textual evidence

Identify the PDF locally or retrieve it from the publisher, DOI record, author archive, or another primary source when browsing is available. Record the exact source. Work in a temporary directory for rendered pages.

Use PDF tools in this order:

1. Run `pdfinfo` to confirm page count and metadata.
2. Run `pdftotext -layout` and search for figure numbers, “setup”, “experimental”, “methods”, component abbreviations, wavelengths, pulse durations, repetition rates, modulation, delay, collection, and detection.
3. Render the relevant page at high resolution with `pdftoppm -png -r 200` or higher.
4. Inspect the rendered page image and crop the setup panel to `<slug>-source-figure.png` when necessary.
5. Read the figure caption, surrounding paragraphs, methods, supplements, and every cited source that carries apparatus details.

Record page, figure/panel, section, and cited-paper locators. Mark each claim as `direct`, `referenced`, `inferred`, or `unknown`. Never silently promote an inference to a paper fact.

## 3. Write the measurement story before the layout

Explain the experiment in plain language:

- What physical quantity is measured?
- Which source, pump, probe, reference, or local-oscillator paths exist?
- What must overlap in space, time, wavelength, polarization, or angle?
- What is scanned or modulated, and at what rate?
- What reaches the sample?
- What is collected, filtered, rejected, and detected?
- Which behavior is essential to the paper's result, and which hardware is only packaging or alignment?

If this story is incomplete, continue reading. Do not place components yet.

## 4. Map the apparatus to the live registry

Query the current component registry rather than relying on memory:

```bash
node tools/list-components.mjs
node tools/list-components.mjs delay
node tools/list-components.mjs detector
```

For every paper component, assign one mapping status:

- `exact` — the live component and modeled behavior match the needed role.
- `qualitative` — the component represents the role but omits relevant calibrated physics.
- `diagram` — visual context only and incapable of affecting traced rays.
- `missing` — no honest representation exists.

Prefer omission plus a disclosed limitation over a misleading substitute. If a `missing` component is essential to the topology or measurement story, stop and ask whether to extend OpticalSetup or make an explicitly diagram-only approximation.

## 5. Draft the evidence contract and scene specification

Write the evidence ledger and `<slug>-contract.json` first, following the linked contract reference. Every physical check must cite evidence IDs, and `unknown` evidence cannot drive a passing check.

Then write a compact scene specification:

```json
{
  "elements": [
    {
      "id": "pump",
      "type": "laser",
      "x": 70,
      "y": 300,
      "rot": 0,
      "label": "pump 800 nm",
      "showLabel": true,
      "labelPos": "t",
      "params": { "wavelength": 800, "temporalMode": "pulsed" }
    }
  ],
  "beams": []
}
```

Use stable, descriptive IDs because contract checks refer to them. Lay out the actual path topology first; add labels and annotations only after traced paths work.

## 6. Build and validate

Build the loadable file through the registry-aware normalizer:

```bash
node tools/build-scene.mjs <slug>-spec.json <slug>.opticalsetup.json
node tools/validate-scene.mjs <slug>.opticalsetup.json <slug>-contract.json > <slug>-checks.json
```

The builder rejects unknown components, unknown parameters, non-finite geometry, duplicate IDs, and evidence-backed values that the app would silently clamp or replace. The validator checks finite traces, manual-beam policy, cited evidence, element configuration, source reach, pulse overlap, detector spectrum, and source-specific detector rejection.

Fix the scene or downgrade the claim when a check fails. Do not loosen tolerances solely to obtain a pass.

## 7. Inspect the result in the real app

Run `node serve.mjs`, load the generated JSON in `http://localhost:5182/sketch/`, and inspect the scene at desktop width and near 1024 px. Confirm:

- traced beams follow the figure's topology;
- paths reach the intended sample and detector faces;
- labels do not hide important components;
- the inspector shows the intended parameters and capability states;
- detector readouts support the measurement story;
- the browser console has no errors.

Render or export a preview when useful, but keep the loadable JSON as the primary deliverable.

## 8. Report evidence boundaries

Hand off the five artifacts with a concise summary of:

- evidence used, including cited setup papers;
- checks that passed and failed;
- exact, qualitative, diagram-only, missing, and omitted mappings;
- unresolved ambiguities;
- OpticalSetup physics limitations that matter for interpreting the scene.

Do not call a visually faithful diagram a physically validated reconstruction unless the contract checks also pass.
