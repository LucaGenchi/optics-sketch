# Reconstruction contract

Use this contract to separate what a paper says from what a scene happens to show. Write the evidence ledger and contract before building the final scene.

## Evidence ledger

Each evidence item needs a stable ID, an atomic claim, a precise source locator, and one status:

- `direct`: stated or visibly unambiguous in the target paper.
- `referenced`: established in a cited instrument paper, supplement, thesis, or dataset.
- `inferred`: a defensible reconstruction needed to connect incomplete evidence.
- `unknown`: unresolved; do not use it to pass a physical check.

Prefer one claim per item. Record figure panel and page for visual evidence, plus section, equation, or quotation locator for text. A URL or DOI alone is not a sufficient locator when the source is long.

## Component mappings

Record each paper component with:

```json
{
  "paperComponent": "mechanical delay line",
  "sceneId": "stokes-delay",
  "sceneType": "delayline",
  "status": "exact",
  "evidence": ["timing-path"],
  "note": "Adds 40 mm optical path without steering"
}
```

Mapping status is one of `exact`, `qualitative`, `diagram`, or `missing`. A mapping can be visually exact but physically qualitative; use the less confident status.

## Contract shape

```json
{
  "schemaVersion": 1,
  "paper": {
    "title": "Paper title",
    "figure": "Figure 1b",
    "locator": "local path, DOI, or stable URL"
  },
  "measurementStory": "Pump and Stokes pulses overlap at the sample; the downstream short-pass rejects Stokes and the single-point detector reads pump modulation.",
  "evidence": [
    {
      "id": "pulse-overlap",
      "claim": "Pump and Stokes pulses overlap at the sample",
      "source": "Instrument paper, Methods p. 3, synchronization paragraph",
      "status": "referenced"
    }
  ],
  "allowManualBeams": false,
  "componentMappings": [],
  "checks": []
}
```

The validator requires `schemaVersion`, `paper.title`, `measurementStory`, at least one evidence item, and at least one check. Every check needs a non-empty `evidence` array containing known evidence IDs. A check citing `unknown` evidence fails the evidence gate before tracing.

## Check types

### Element configuration

Confirm that an evidence-bearing component exists with the expected type and selected parameters.

```json
{
  "kind": "element",
  "id": "stokes-delay",
  "type": "delayline",
  "params": { "delayMm": 40 },
  "evidence": ["timing-path"]
}
```

### Source reaches target

Trace one source while suppressing the other source elements, then measure the nearest traced segment to the target center.

```json
{
  "kind": "source_reaches",
  "source": "pump",
  "target": "sample",
  "toleranceMm": 2,
  "evidence": ["pump-path"]
}
```

Choose a tolerance that reflects the scene geometry, not laboratory alignment accuracy. OpticalSetup coordinates are diagram millimetres and the model is qualitative.

### Pulse overlap

Compare source-specific pulse arrival times at the target using emission phase plus optical path divided by the speed of light.

```json
{
  "kind": "pulse_overlap",
  "sources": ["pump", "stokes"],
  "target": "sample",
  "toleranceMm": 2,
  "maxDifferencePs": 0.01,
  "evidence": ["pulse-overlap"]
}
```

Do not use this check to imply dispersion, group-delay calibration, or pulse-envelope physics that OpticalSetup does not model.

### Detector result

Trace the full scene and check whether the qualitative detector has signal and, optionally, a weighted central wavelength in a range.

```json
{
  "kind": "detector",
  "detector": "photodetector",
  "signal": "positive",
  "wavelengthNm": { "min": 795, "max": 805 },
  "evidence": ["detected-band"]
}
```

Set `signal` to `none` to require no active hit. This is a qualitative ray signal, not calibrated power or noise performance.

### Source-specific detector result

Trace only one source and check its contribution to a detector. Use this to distinguish desired transmission from rejected pump, Stokes, fluorescence, or background paths.

```json
{
  "kind": "detector_source",
  "detector": "photodetector",
  "source": "stokes",
  "expect": "none",
  "evidence": ["stokes-rejection"]
}
```

`expect` accepts `positive` or `none`. A positive check can also include `wavelengthNm`.

## Acceptance rule

A reconstruction is physically contract-valid only when:

1. the evidence gate has no errors;
2. traced output contains no non-finite geometry or optical path lengths;
3. no unapproved manual beams are present;
4. every physical check passes;
5. warnings for configurable or diagram-only elements are disclosed;
6. a human visual inspection confirms the intended topology and labels.

Passing this contract does not establish laboratory equivalence, calibrated optical performance, or reproducibility outside the behavior explicitly modeled by OpticalSetup.
