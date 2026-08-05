# Throughput-scaling 2PP reference reconstructions

This directory contains one loadable OpticalSetup scene for every fabrication reference in the [throughput-scaling explorer](https://andreabertoncini.com/blog/throughput-scaling-two-photon-polymerization/explore) for which a usable PDF was found in a bounded search. The explorer has 18 plotted points but 17 distinct fabrication references: the two Gu et al. points share one apparatus and therefore one setup.

## Result

- 14 loadable `.opticalsetup.json` scenes.
- 9 scenes have enough reported source timing to emit one qualitative chief ray to a resin stage.
- 5 scenes retain a diagram-only source rather than inventing missing timing data.
- 3 distinct references are excluded with the failed/mismatched PDF outcome preserved below.
- No scene is added to the in-app Examples menu; these remain reviewable research reconstructions.

| Reference | outcome | PDF evidence | trace boundary |
|---|---|---|---|
| Fischer & Wegener 2011 | included | [PDF](https://arxiv.org/pdf/1105.5703) | diagram-only source |
| Gittard et al. 2011 | included | [PDF](https://europepmc.org/api/getPdf?pmcid=PMC3207384) | chief ray reaches resin stage |
| Bückmann et al. 2014 | included | [PDF](https://www.nature.com/articles/ncomms5130.pdf) | diagram-only source |
| Nanoscribe GT data sheet | included · 2016 revision | [PDF](https://mdpi-res.com/d_attachment/polymers/polymers-10-00011/article_deploy/polymers-10-00011-s001.pdf?version=1513942821) | diagram-only source |
| Pearre et al. 2018 | included | [PDF](https://arxiv.org/pdf/1803.07135) | chief ray reaches resin stage |
| Geng et al. 2019 | included | [PDF](https://www.nature.com/articles/s41467-019-10249-2.pdf) | diagram-only source |
| Saha et al. 2019 | included | [PDF](https://liuchao-jin.github.io/files/essay/saha2019scalable.pdf) | chief ray reaches resin stage |
| Hahn et al. 2020 | included | [PDF](https://d-nb.info/1259433633/34) | chief ray reaches resin stage |
| Somers et al. 2021 | included | [PDF](https://www.nature.com/articles/s41377-021-00645-z.pdf) | chief ray reaches resin stage |
| Ouyang et al. 2023 | included | [PDF](https://www.nature.com/articles/s41467-023-37163-y.pdf) | chief ray reaches resin stage |
| Jiao et al. 2023 | included | [PDF](https://www.ijemnet.com/en/article/pdf/preview/10.1088/2631-7990/ace0a7.pdf) | chief ray reaches resin stage |
| Zhang et al. 2024 | included | [PDF](https://mane.ustc.edu.cn/_upload/article/files/87/1e/a51f62f74e9d807ff2eb58cf86a2/3b90a55f-f7a8-4bac-8cbb-0305af0aee96.pdf) | chief ray reaches resin stage |
| Kiefer et al. 2024 | included | [PDF](https://www.light-am.com/article/pdf/preview/LAM2023080053.pdf) | chief ray reaches resin stage |
| Gu et al. 2025 | included · official SI | [PDF](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41586-025-09842-x/MediaObjects/41586_2025_9842_MOESM1_ESM.pdf) | diagram-only source |

## Excluded references

| Reference | outcome | links checked | reason |
|---|---|---|---|
| Dong et al. (2007) | excluded | [link 1](https://doi.org/10.1063/1.2535504), [link 2](https://doi.org/10.1063/1.2789661) | The explorer citation combines Dong et al., APL 91, 124103 with DOI 10.1063/1.2535504, which belongs to a different Tan et al. paper. The corrected Dong DOI is 10.1063/1.2789661, but no lawful full PDF was found. |
| Yang et al. (2015) | excluded | [link 1](https://doi.org/10.1016/j.optlaseng.2015.02.006) | A publisher record was found, but no accessible lawful full PDF was found during the bounded search. |
| Yan et al. (2015) | excluded | [link 1](https://doi.org/10.1088/2040-8978/17/7/075803) | Publisher and repository landing pages were found, but no accessible lawful full PDF was found during the bounded search. |

## Artifact set

For each included reference:

- `<key>.opticalsetup.json` — loadable scene.
- `<key>-preview.svg` — deterministic white-background export.
- `<key>-contract.json` — evidence ledger, paper-to-registry mapping, unknowns, and limitations.
- `<key>-checks.json` — generated parse/trace/export checks.
- `<key>-reconstruction.md` — human-readable source and reconstruction notes.

`index.json` is the machine-readable inventory. Regenerate everything with:

```bash
node tools/build-throughput-reconstructions.mjs
```

## Evidence and simulation boundary

The PDF is semantic authority; extracted text was used only for navigation. Apparatus figures and the relevant methods were visually inspected before scene authoring. A straight readable path is used where the source figure is folded or three-dimensional. Custom boxes are deliberately diagram-only and have pass-through behavior.

The scenes do not reproduce the explorer's throughput values. OpticalSetup performs qualitative 2D geometric ray tracing; it does not simulate SLM/DMD/DOE/metalens diffraction, coherent phase, temporal focusing, multi-focus power balance, resin thresholds, curing, three-dimensional scan calibration, fabrication time, or throughput.

The source universe was cross-checked against the explorer's [JSON data](https://andreabertoncini.com/images/throughput-scaling/2pp-throughput-literature-data.json) and the upstream [KIT benchmark CSV](https://3dprintingspeed.aph.kit.edu/benchmark.csv).
