#!/usr/bin/env node

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement, registry } from '../sketch/js/elements.js';
import { buildSVG } from '../sketch/js/export.js';
import { traceScene } from '../sketch/js/raytrace.js';
import { parseSketch, state } from '../sketch/js/state.js';

const OUTPUT_DIR = fileURLToPath(new URL(
  '../reconstructions/throughput-scaling-2pp-2026-07-29/',
  import.meta.url,
));

const EXPLORER_URL =
  'https://andreabertoncini.com/blog/throughput-scaling-two-photon-polymerization/explore';
const DATA_URL =
  'https://andreabertoncini.com/images/throughput-scaling/2pp-throughput-literature-data.json';
const BENCHMARK_URL = 'https://3dprintingspeed.aph.kit.edu/benchmark.csv';

const excluded = [
  {
    key: 'dong-2007',
    explorerLabel: 'Dong et al. (2007)',
    result: 'excluded',
    reason: 'The explorer citation combines Dong et al., APL 91, 124103 with DOI 10.1063/1.2535504, which belongs to a different Tan et al. paper. The corrected Dong DOI is 10.1063/1.2789661, but no lawful full PDF was found.',
    links: [
      'https://doi.org/10.1063/1.2535504',
      'https://doi.org/10.1063/1.2789661',
    ],
  },
  {
    key: 'yang-2015',
    explorerLabel: 'Yang et al. (2015)',
    result: 'excluded',
    reason: 'A publisher record was found, but no accessible lawful full PDF was found during the bounded search.',
    links: ['https://doi.org/10.1016/j.optlaseng.2015.02.006'],
  },
  {
    key: 'yan-2015',
    explorerLabel: 'Yan et al. (2015)',
    result: 'excluded',
    reason: 'Publisher and repository landing pages were found, but no accessible lawful full PDF was found during the bounded search.',
    links: ['https://doi.org/10.1088/2040-8978/17/7/075803'],
  },
];

const records = [
  {
    key: 'fischer-2011',
    short: 'Fischer & Wegener 2011',
    title: 'Three-dimensional direct laser writing inspired by stimulated-emission-depletion microscopy',
    citation: 'J. Fischer and M. Wegener, Optical Materials Express 1, 614–624 (2011)',
    doi: '10.1364/OME.1.000614',
    pdfUrl: 'https://arxiv.org/pdf/1105.5703',
    pdfStatus: 'accessible author manuscript',
    figure: 'Fig. 2, PDF page 7 (focus profiles; not a complete train)',
    source: null,
    sourceLabel: '810 nm fs excitation · duration/rate not reported',
    sourceCanvasLabel: '810 nm fs excitation',
    chain: [
      box('AOM\n4 kHz, 3%'),
      native('qwp', 'circular pol.\nQWP inferred', { a: 45 }),
      box('532 nm CW branch\nAOM + SU-8 mask'),
      box('pupil relay\ninferred'),
      box('532/810 combiner\ninferred'),
    ],
    focusLabel: 'NA 1.4 objective',
    sampleLabel: 'DETC resist · 100 µm/s',
    direct: [
      '810 nm femtosecond excitation and 532 nm continuous-wave depletion beams, both circularly polarized.',
      'Both beams are chopped at 4 kHz with 3% duty; the depletion arm contains a 430 nm SU-8 phase mask imaged to the objective pupil.',
      'Leica HCX PL APO NA 1.4 objective, DETC resist formulation, and 100 µm/s scan speed.',
    ],
    inferred: [
      'Quarter-wave plates, dichroic combiner, pupil-relay layout, and all 2D folds.',
      'The source is a diagram-only box because pulse duration and repetition rate are not reported.',
    ],
    unknown: ['Full optical train, relay focal lengths, delivered powers, and scan actuator.'],
    limitations: [
      'The PDF figure shows focal distributions rather than the complete apparatus.',
      'OpticalSetup does not model STED depletion photochemistry or the phase mask’s three-dimensional focal shaping.',
      'The paper’s 3% AOM duty is below the app’s current 5% inspector minimum, so it remains an annotation.',
    ],
  },
  {
    key: 'gittard-2011',
    short: 'Gittard et al. 2011',
    title: 'Fabrication of microscale medical devices by two-photon polymerization with multiple foci via a spatial light modulator',
    citation: 'S. D. Gittard et al., Biomedical Optics Express 2, 3167–3178 (2011)',
    doi: '10.1364/BOE.2.003167',
    pdfUrl: 'https://europepmc.org/api/getPdf?pmcid=PMC3207384',
    pdfStatus: 'accessible full article',
    figure: 'Fig. 1, PDF page 7 (full optical train)',
    source: { wavelength: 780, pulseWidthFs: 150, repRateMHz: 80, avgPowerW: 4 },
    sourceLabel: '780 nm · <150 fs · 80 MHz · 4 W',
    sourceQualifier: 'The app uses 150 fs as the reported upper-bound trace value.',
    chain: [
      box('LC energy\ncontrol + PBS'),
      native('telescope', '2× Galilean\nexpander', { f1: 45, f2: 90, dia: 32 }),
      box('reflective SLM\nmulti-focus'),
      box('Fourier stop\n+ camera branch'),
      box('galvo scanner'),
    ],
    focusLabel: '100× NA 1.4 / 20× NA 0.4',
    sampleLabel: 'Ormocer on XYZ stage',
    direct: [
      '780 nm Ti:sapphire source, pulse width under 150 fs, 80 MHz, and 4 W source power.',
      'Energy control, two-lens expansion, reflective SLM, Fourier-plane stop, camera branch, galvo scanner, objective/sample stack, and XYZ stage.',
      'A 4×4 focus pattern is used for one fabrication example; the paper also reports six-by-six hologram capability.',
    ],
    inferred: ['The readable left-to-right placement flattens the paper’s folded microscope train.'],
    unknown: ['Relay focal lengths, split ratio, SLM diffraction efficiency, scanner model, and delivered sample power.'],
    limitations: [
      'The SLM and Fourier train are diagram-only pass-through boxes; the live ray is one representative chief ray, not the multi-focus array.',
    ],
  },
  {
    key: 'buckmann-2014',
    short: 'Bückmann et al. 2014',
    title: 'An elasto-mechanical unfeelability cloak made of pentamode metamaterials',
    citation: 'T. Bückmann et al., Nature Communications 5, 4130 (2014)',
    doi: '10.1038/ncomms5130',
    pdfUrl: 'https://www.nature.com/articles/ncomms5130.pdf',
    pdfStatus: 'accessible publisher PDF',
    figure: 'No optical-train figure; reconstruction is methods-derived',
    source: null,
    sourceLabel: '780 nm · ~90 fs · repetition rate not reported',
    sourceCanvasLabel: '780 nm · ~90 fs source',
    chain: [
      box('power / beam\nconditioning unknown'),
      box('XY galvos'),
      box('scan relay\nunreported'),
    ],
    focusLabel: '25× NA 0.8 dip-in objective',
    sampleLabel: 'IP-S · stitched fields',
    direct: [
      'Frequency-doubled erbium-fibre source centered at 780 nm with about 90 fs pulses.',
      'Galvanometric scanning, mechanical stages, 25× NA 0.8 dip-in objective, IP-S resist, eight stitched fields, and 5 cm/s scan speed.',
    ],
    inferred: ['Left-to-right ordering of conditioning, scanners, relay, objective, and stage.'],
    unknown: ['Repetition rate, power/polarization conditioning, relay design, scanner model, and delivered power.'],
    limitations: [
      'The paper contains fabrication and mechanics figures but no apparatus schematic.',
      'The source stays diagram-only because the pulse repetition rate is not reported.',
    ],
  },
  {
    key: 'nanoscribe-gt-datasheet',
    short: 'Nanoscribe GT data sheet',
    title: 'Data Sheet — Photonic Professional GT',
    citation: 'Nanoscribe Photonic Professional GT data sheet, revision DS/GT/V04_2016',
    doi: null,
    pdfUrl: 'https://mdpi-res.com/d_attachment/polymers/polymers-10-00011/article_deploy/polymers-10-00011-s001.pdf?version=1513942821',
    pdfStatus: 'accessible mirrored product data sheet; 2016 revision',
    figure: 'Page 1, “SYSTEM & COMPONENTS” product image',
    source: null,
    sourceLabel: 'NIR fs fibre laser · wavelength/timing not disclosed',
    sourceCanvasLabel: 'NIR fs fibre source',
    chain: [
      box('beam conditioning\nnot disclosed'),
      box('galvo scanner'),
      box('motorized XY\n+ XYZ piezo'),
      box('camera / autofocus'),
    ],
    focusLabel: 'interchangeable objectives',
    sampleLabel: 'photoresist platform',
    direct: [
      'NIR femtosecond fibre laser, galvo scanner, motorized XY stage, XYZ piezo stage, objectives, and camera.',
    ],
    inferred: ['Readable subsystem order and a generic objective-to-resist endpoint.'],
    unknown: ['Laser wavelength, pulse duration, repetition rate, power, relay optics, objective model, and sample parameters.'],
    limitations: [
      'This is revision DS/GT/V04_2016, not a verified copy of the explorer’s 2014-era sheet.',
      'The source remains diagram-only because the data sheet does not disclose numerical laser parameters.',
    ],
  },
  {
    key: 'pearre-2018',
    short: 'Pearre et al. 2018',
    title: 'Fast Micron-Scale 3D Printing with a Resonant-Scanning Two-Photon Microscope',
    citation: 'B. W. Pearre et al., arXiv:1803.07135 (2018)',
    doi: null,
    pdfUrl: 'https://arxiv.org/pdf/1803.07135',
    pdfStatus: 'accessible author manuscript',
    figure: 'Fig. 1, PDF page 3 (system schematic)',
    source: { wavelength: 780, pulseWidthFs: 120, repRateMHz: 80, avgPowerW: 0.8 },
    sourceLabel: '780 nm typical · ~120 fs · 80 MHz',
    sourceQualifier: '0.8 W is a bounded trace value within the reported 0.6–1.0 W operating range.',
    chain: [
      box('Pockels cell\n3.33 MHz'),
      native('telescope', '2× Galilean\nexpander', { f1: 45, f2: 90, dia: 32 }),
      box('X resonant scanner\n7.91 kHz'),
      box('Y galvo'),
      box('objective Z piezo\n+ PMT branch'),
    ],
    focusLabel: '25× NA 0.8 immersion objective',
    sampleLabel: 'IP-Dip on print stage',
    direct: [
      'Tunable Ti:sapphire source, usually 780 nm, about 120 fs, 80 MHz, and 600–1000 mW.',
      '3.33 MHz Pockels-cell modulation, 2× Galilean expander, 7.91 kHz resonant X scanner, Y galvo, 25× NA 0.8 objective, Z piezo, and PMT branch.',
    ],
    inferred: ['The operating-range midpoint is not used; 0.8 W is explicitly only a bounded representative trace value.'],
    unknown: ['Exact operating power for every build and complete scanner-relay prescriptions.'],
    limitations: [
      'The resonant scanner is a diagram-only box because OpticalSetup’s animated galvo control is capped at 5 kHz.',
    ],
  },
  {
    key: 'geng-2019',
    short: 'Geng et al. 2019',
    title: 'Ultrafast multi-focus 3-D nano-fabrication based on two-photon polymerization',
    citation: 'Q. Geng et al., Nature Communications 10, 2179 (2019)',
    doi: '10.1038/s41467-019-10249-2',
    pdfUrl: 'https://www.nature.com/articles/s41467-019-10249-2.pdf',
    pdfStatus: 'accessible publisher PDF',
    figure: 'Fig. 1, PDF page 2 (system schematic)',
    source: null,
    sourceLabel: '800 nm · 200 fs · 3.3 W · repetition rate not reported',
    sourceCanvasLabel: '800 nm · 200 fs · 3.3 W',
    chain: [
      native('telescope', '4f L1/L2\n100/250 mm', { f1: 40, f2: 100, dia: 34 }),
      box('1200 lines/mm\ngrating + M1'),
      box('reflective DMD\n≤22.7 kHz'),
      box('spatial filter'),
      native('telescope', 'L3/L4 relay\n200/200 mm', { f1: 60, f2: 60, dia: 34 }),
    ],
    focusLabel: '40× NA 1.3 objective',
    sampleLabel: 'IP-Dip on XYZ stage',
    direct: [
      'Tunable Ti:sapphire source set to 800 nm, 200 fs, and 3.3 W.',
      'L1/L2 4f expansion, 1200 lines/mm grating with mirror, reflective DMD, spatial filter, L3/L4 relay, 40× NA 1.3 objective, and XYZ stage.',
      'The DMD system produces one to tens of foci with refresh rates up to 22.7 kHz.',
    ],
    inferred: ['The source stays diagram-only because the repetition rate is not stated in the extracted apparatus paragraph.'],
    unknown: ['Exact DMD operating pattern, delivered power per focus, and every fold mirror.'],
    limitations: [
      'The DMD/grating section is diagram-only.',
      'No emitted ray is claimed because completing the pulsed-source schema would require inventing an unreported repetition rate.',
    ],
  },
  {
    key: 'saha-2019',
    short: 'Saha et al. 2019',
    title: 'Scalable submicrometer additive manufacturing',
    citation: 'S. K. Saha et al., Science 366, 105–109 (2019)',
    doi: '10.1126/science.aax8760',
    pdfUrl: 'https://liuchao-jin.github.io/files/essay/saha2019scalable.pdf',
    pdfStatus: 'accessible article mirror',
    figure: 'Fig. 1B, PDF page 1 (system schematic)',
    source: { wavelength: 800, pulseWidthFs: 35, repRateMHz: 0.001 },
    sourceLabel: '800 nm · nominal 35 fs · 1 kHz',
    chain: [
      box('DMD\nmask + grating'),
      native('lens', 'L1 collimator', { f: 55, aperture: 34 }),
      box('parallel focal\npattern'),
      box('motion-stage\nsynchronization'),
    ],
    focusLabel: '60× NA 1.25 objective',
    sampleLabel: 'resist on motion stage',
    direct: [
      'Femtosecond source, DMD used as both pattern mask and dispersive element, collimating lens, objective, and moving resist stage.',
      '800 nm, nominal 35 fs, 1 kHz, and 60× NA 1.25 objective in the reported fabrication configuration.',
    ],
    inferred: ['Flattened DMD-to-objective fold.'],
    unknown: ['Single delivered operating power for the plotted throughput point and complete relay prescription.'],
    limitations: ['DMD temporal/spatial focusing and parallel pixels are not simulated; the live beam is one chief ray.'],
  },
  {
    key: 'hahn-2020',
    short: 'Hahn et al. 2020',
    title: 'Rapid Assembly of Small Materials Building Blocks (Voxels) into Large Functional 3D Metamaterials',
    citation: 'V. Hahn et al., Advanced Functional Materials 30, 1907795 (2020)',
    doi: '10.1002/adfm.201907795',
    pdfUrl: 'https://d-nb.info/1259433633/34',
    pdfStatus: 'accessible repository PDF',
    figure: 'Fig. 2, PDF page 5 (system schematic)',
    source: { wavelength: 790, pulseWidthFs: 90, repRateMHz: 80, avgPowerW: 2.8 },
    sourceLabel: '790 nm · 90 fs · 80 MHz · 2.8 W',
    chain: [
      native('aom', 'AOM\n~1 MHz', { deflect: 0, rfMHz: 80 }),
      box('N-SF10 prism\ncompressor pair'),
      box('3×3 DOE'),
      box('DCT + PBS'),
      box('GX/GY galvos\n2.8 kHz'),
    ],
    focusLabel: '40× NA 1.4 objective',
    sampleLabel: 'IP-L · XY + Z piezo',
    direct: [
      '790 nm Ti:sapphire source, 2.8 W, 80 MHz, and 90 fs at source output.',
      'AOM, two-prism compressor, 3×3 DOE, DCT, PBS, relay, GX/GY galvos, quarter-wave plate, 40× NA 1.4 objective, and XY/Z stage.',
      'Nine foci and 2.8 kHz peak galvo operation.',
    ],
    inferred: ['Fold flattening and pass-through representations for the compressor, DOE, DCT, PBS, and scan pair.'],
    unknown: ['Delivered pulse duration/power at every focus and full relay prescriptions.'],
    limitations: ['The 3×3 DOE is represented as one chief ray; pulse compression and diffractive splitting are annotations.'],
  },
  {
    key: 'somers-2021',
    short: 'Somers et al. 2021',
    title: 'Rapid, continuous projection multi-photon 3D printing enabled by spatiotemporal focusing of femtosecond pulses',
    citation: 'P. Somers et al., Light: Science & Applications 10, 199 (2021)',
    doi: '10.1038/s41377-021-00645-z',
    pdfUrl: 'https://www.nature.com/articles/s41377-021-00645-z.pdf',
    pdfStatus: 'accessible publisher PDF',
    figure: 'Fig. 1, PDF page 2 (system schematic)',
    source: { wavelength: 800, pulseWidthFs: 65, repRateMHz: 0.005, bandwidth: 22 },
    sourceLabel: '800 nm · 65 fs · 5 kHz · ~22 nm band',
    chain: [
      box('πShaper'),
      native('telescope', 'L1/L2 expansion\n100/150 mm', { f1: 50, f2: 75, dia: 34 }),
      box('DMD\n≤4 kHz patterns'),
      native('lens', 'L3 · 300 mm', { f: 70, aperture: 36 }),
      box('projection plane'),
    ],
    focusLabel: '100× NA 1.49 objective',
    sampleLabel: 'PETA resin · 3-axis stage',
    direct: [
      '800 nm, 65 fs, 5 kHz, approximately 22 nm bandwidth regenerative amplifier.',
      'πShaper, L1/L2 expansion, DMD, L3 collection, 100× NA 1.49 objective, and three-axis stage.',
      'DMD patterns up to 4 kHz provide continuous layer-by-layer projection.',
    ],
    inferred: ['Flattened fold geometry and representative trace focal lengths.'],
    unknown: ['A single delivered average power for the plotted result and exact complete relay coatings.'],
    limitations: ['Spatiotemporal focusing, DMD diffraction, and 2D projected dose are not simulated.'],
  },
  {
    key: 'ouyang-2023',
    short: 'Ouyang et al. 2023',
    title: 'Ultrafast 3D nanofabrication via digital holography',
    citation: 'W. Ouyang et al., Nature Communications 14, 1716 (2023)',
    doi: '10.1038/s41467-023-37163-y',
    pdfUrl: 'https://www.nature.com/articles/s41467-023-37163-y.pdf',
    pdfStatus: 'accessible publisher PDF',
    figure: 'Fig. 1a, PDF page 2 (system schematic)',
    source: { wavelength: 800, pulseWidthFs: 100, repRateMHz: 0.001, avgPowerW: 4 },
    sourceLabel: '800 nm · 100 fs · 1 kHz · 4 W',
    chain: [
      box('600 lines/mm\ngrating'),
      native('telescope', 'L1/L2 4f\n225/250 mm', { f1: 54, f2: 60, dia: 34 }),
      box('DMD hologram\npulse-synchronized'),
      box('L3 + spatial\nfilter'),
      box('L4 + dichroic\n+ L5 relay'),
    ],
    focusLabel: 'objective L5',
    sampleLabel: 'FTO/resin · 6-axis stage',
    direct: [
      '800 nm Ti:sapphire amplifier, 1 kHz, 100 fs, and 4 W.',
      '600 lines/mm grating, L1/L2 dispersion precompensation, DMD hologram, Fourier lens and spatial filter, relay/dichroic, objective, and six-axis stage.',
      'Up to 2,000 individually programmable foci and single-pulse fabrication.',
    ],
    inferred: ['Readable linearization of the folded holographic train.'],
    unknown: ['Objective focal length/NA in the main schematic and per-focus delivered power for each result.'],
    limitations: ['The DMD hologram, 2,000-focus array, and pulse-synchronized exposure are not simulated.'],
  },
  {
    key: 'jiao-2023',
    short: 'Jiao et al. 2023',
    title: 'Acousto-optic scanning spatial-switching multiphoton lithography',
    citation: 'B. Jiao et al., International Journal of Extreme Manufacturing 5, 035008 (2023)',
    doi: '10.1088/2631-7990/ace0a7',
    pdfUrl: 'https://www.ijemnet.com/en/article/pdf/preview/10.1088/2631-7990/ace0a7.pdf',
    pdfStatus: 'accessible publisher-platform PDF',
    figure: 'Fig. 1, PDF page 3 (system schematic)',
    source: { wavelength: 517, pulseWidthFs: 250, repRateMHz: 45, avgPowerW: 6.5 },
    sourceLabel: '517 nm · 250 fs · 45 MHz · 6.5 W',
    chain: [
      box('P1/P2 prism\nprecompensation'),
      native('aom', 'AOM switch\n2 MHz', { deflect: 0, modulate: false, modFreqMHz: 2 }),
      box('P3 angular\ndispersion'),
      box('two-axis AOD'),
      box('Kepler + cyl.\ncompensation'),
      box('DOE · 8 beams'),
      box('DMD switch'),
    ],
    focusLabel: '100× NA 1.4 objective',
    sampleLabel: 'resin on XYZ stage',
    direct: [
      '517 nm femtosecond source, 250 fs, 45 MHz, and 6.5 W.',
      'Prism precompensation, 2 MHz AOM switch, angular-dispersion prism, two-axis AOD, compensation relay, DOE, DMD switch, 100× NA 1.4 objective, and stage.',
      'Eight-focus acousto-optic spatial-switching architecture.',
    ],
    inferred: ['All three-dimensional folds are flattened into the reported order.'],
    unknown: ['Complete focal-length inventory and delivered power at every focus.'],
    limitations: ['Acousto-optic swept-wavefront correction and the eight-focus DMD switching pattern are diagram-only.'],
  },
  {
    key: 'zhang-2024',
    short: 'Zhang et al. 2024',
    title: 'High-Throughput Two-Photon 3D Printing Enabled by Holographic Multi-Foci High-Speed Scanning',
    citation: 'L. Zhang et al., Nano Letters 24, 2671–2679 (2024)',
    doi: '10.1021/acs.nanolett.4c00505',
    pdfUrl: 'https://mane.ustc.edu.cn/_upload/article/files/87/1e/a51f62f74e9d807ff2eb58cf86a2/3b90a55f-f7a8-4bac-8cbb-0305af0aee96.pdf',
    pdfStatus: 'accessible institutional PDF',
    figure: 'Fig. 1a, PDF page 2 (system schematic)',
    source: { wavelength: 1030, pulseWidthFs: 400, repRateMHz: 1, avgPowerW: 10 },
    sourceLabel: '1030 nm · 400 fs · 1 MHz · max 10 W',
    sourceQualifier: '10 W is the reported source maximum, not a claim of delivered sample power.',
    chain: [
      native('aom', 'AOM', { deflect: 0 }),
      box('HWP/PBS\nenergy control'),
      native('telescope', 'beam expander\n+ iris', { f1: 45, f2: 90, dia: 34 }),
      box('reflective\nLCoS-SLM'),
      box('4f relays +\ngalvo pair'),
      box('CCD branch'),
    ],
    focusLabel: '60× NA 1.35 oil objective',
    sampleLabel: 'resist · piezo Z',
    direct: [
      '1030 nm femtosecond fibre source, 1 MHz, 400 fs, and 10 W maximum.',
      'AOM, HWP/PBS energy control, beam expander and iris, reflective LCoS-SLM, two 4f relays with galvanometers, 60× NA 1.35 objective, piezo Z, and CCD branch.',
      'More than 400 holographic foci are demonstrated.',
    ],
    inferred: ['Fold flattening and representative telescope/objective trace parameters.'],
    unknown: ['Delivered power per focus and exact operating power for every printed structure.'],
    limitations: ['Holographic focus synthesis, zero-order suppression, and multi-focus galvo scanning are diagram-only.'],
  },
  {
    key: 'kiefer-2024',
    short: 'Kiefer et al. 2024',
    title: 'A multi-photon (7 × 7)-focus 3D laser printer based on a 3D-printed diffractive optical element and a 3D-printed multi-lens array',
    citation: 'P. Kiefer et al., Light: Advanced Manufacturing 4, 3 (2024)',
    doi: '10.37188/lam.2024.003',
    pdfUrl: 'https://www.light-am.com/article/pdf/preview/LAM2023080053.pdf',
    pdfStatus: 'accessible publisher PDF',
    figure: 'Fig. 2, PDF page 4 (system schematic)',
    source: { wavelength: 790, pulseWidthFs: 140, repRateMHz: 80, avgPowerW: 3.7 },
    sourceLabel: '790 nm · 140 fs · 80 MHz · 3.7 W',
    chain: [
      native('telescope', 'L1/L2\n1.25×', { f1: 48, f2: 60, dia: 34 }),
      native('aom', 'AOM', { deflect: 0 }),
      native('telescope', 'L3/L4\n1.60×', { f1: 50, f2: 80, dia: 34 }),
      box('DOE · 7×7'),
      box('L5/L6/L7 relay'),
      box('MLA · 7×7'),
      box('GX/GY galvos'),
    ],
    focusLabel: '40× NA 1.4 objective',
    sampleLabel: 'XY + Z piezo stage',
    direct: [
      '790 nm Ti:sapphire source, 3.7 W, 80 MHz, and 140 fs.',
      'Three telescope/relay groups, AOM, 7×7 DOE, 7×7 microlens array, scan relays, GX/GY galvos, 40× NA 1.4 objective, and XY/Z stage.',
      'Forty-nine foci with 60 µm focus spacing.',
    ],
    inferred: ['Linearization of the folded relay and compact trace focal lengths preserving magnification ordering only.'],
    unknown: ['Delivered power per focus and full coating/calibration data.'],
    limitations: ['The DOE/MLA pair is diagram-only; the live trace does not create 49 beamlets.'],
  },
  {
    key: 'gu-2025',
    short: 'Gu et al. 2025',
    title: '3D nanolithography with metalens arrays and spatially adaptive illumination',
    citation: 'S. Gu et al., Nature (2025), DOI 10.1038/s41586-025-09842-x',
    doi: '10.1038/s41586-025-09842-x',
    pdfUrl: 'https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41586-025-09842-x/MediaObjects/41586_2025_9842_MOESM1_ESM.pdf',
    pdfStatus: 'official supplementary-information PDF; main article PDF was not openly accessible',
    figure: 'Extended Data Fig. 2 on the article page; quantitative support in the official SI PDF',
    source: null,
    sourceLabel: '800 nm · 20 nm FWHM · 7 W · 1 kHz · duration not reported',
    sourceCanvasLabel: '800 nm · 7 W · 1 kHz',
    chain: [
      box('HWP/PBS\npower control'),
      box('SLM phase-to-\namplitude control'),
      native('telescope', 'beam expander', { f1: 45, f2: 90, dia: 36 }),
      box('metalens array\n2,500–129,500 sites'),
      box('alignment microscope\n+ confocal sensor'),
    ],
    focusLabel: 'metalens focus surrogate',
    sampleLabel: 'resist · XYZ + tip/tilt',
    direct: [
      'Official supplementary information reports 800 nm center wavelength, 20 nm FWHM, 7 W, and 1 kHz for the current system.',
      'SLM-based spatially adaptive illumination, beam expansion, metalens array, three-axis stage with two-axis tip/tilt, alignment microscope, and confocal distance sensor.',
      'The explorer’s N=2,500 and N=129,500 points refer to the same apparatus; one setup covers both.',
    ],
    inferred: [
      'The OpticalSetup objective icon is explicitly a single-chief-ray focusing surrogate for the metalens array.',
      'Readable ordering of the polarization-control and alignment branches.',
    ],
    unknown: ['Current-system pulse duration and a lawful open main-article PDF.'],
    limitations: [
      'This reconstruction is supplement-backed; the main article PDF was not openly accessible.',
      'The source stays diagram-only so an unreported pulse duration is not silently invented.',
      'Metalens diffraction, 2,500/129,500 simultaneous foci, spatial calibration, and dose are not simulated.',
    ],
    supplementBacked: true,
  },
];

function box(label, params = {}) {
  return { type: 'box', label, params: { behavior: 'pass', fill: '#eef2f7', ...params }, diagramOnly: true };
}

function native(type, label, params = {}) {
  return { type, label, params, diagramOnly: false };
}

function element(id, type, x, y, options = {}) {
  const out = createElement(type, x, y);
  out.id = id;
  out.rot = options.rot || 0;
  out.label = options.label || '';
  out.showLabel = options.showLabel ?? Boolean(options.label);
  if (options.labelPos) out.labelPos = options.labelPos;
  Object.assign(out.params, options.params || {});
  return out;
}

function text(id, x, y, value, fontSize = 12, fill = '#334155') {
  return element(id, 'textlabel', x, y, {
    params: { text: value, fontSize, fill },
  });
}

function wrapWords(value, max = 116) {
  const words = value.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (current && `${current} ${word}`.length > max) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildScene(record) {
  const elements = [
    element(`${record.key}-frame`, 'figureframe', 550, 300, {
      params: { w: 1060, h: 540, background: 'white' },
    }),
    text(`${record.key}-title`, 550, 58, record.title, 18, '#172033'),
    text(`${record.key}-citation`, 550, 87, record.citation, 11, '#475569'),
    text(`${record.key}-figure`, 550, 111, record.figure, 10, '#64748b'),
  ];

  const y = 310;
  const stageX = 960;
  const objectiveX = 904;
  const sourceX = 145;
  const sourceKnown = Boolean(record.source);

  if (sourceKnown) {
    const sourceParams = {
      wavelength: record.source.wavelength,
      avgPowerW: record.source.avgPowerW ?? 0,
      beamMode: 'line',
      bwMode: record.source.bandwidth ? 'band' : 'mono',
      bandwidth: record.source.bandwidth ?? 40,
      temporalMode: 'pulsed',
      repRateMHz: record.source.repRateMHz,
      pulseWidthFs: record.source.pulseWidthFs,
    };
    elements.push(element(`${record.key}-source`, 'laser', sourceX, y, {
      label: record.sourceLabel,
      labelPos: 't',
      params: sourceParams,
    }));
  } else {
    elements.push(element(`${record.key}-source-diagram`, 'box', sourceX, y, {
      label: 'diagram-only source · timing incomplete',
      labelPos: 't',
      params: {
        text: record.sourceCanvasLabel,
        w: 170,
        h: 54,
        behavior: 'pass',
        fill: '#fff4d6',
      },
    }));
  }

  const start = sourceKnown ? 250 : 290;
  const end = 820;
  const gap = record.chain.length > 1 ? (end - start) / (record.chain.length - 1) : 0;
  const mappings = [];
  record.chain.forEach((spec, index) => {
    const x = start + gap * index;
    const id = `${record.key}-train-${index + 1}`;
    const params = spec.type === 'box'
      ? { text: spec.label, w: Math.min(108, Math.max(72, spec.label.length * 2.25)), h: 48, ...spec.params }
      : spec.params;
    elements.push(element(id, spec.type, x, y, {
      label: spec.type === 'box' ? '' : spec.label,
      labelPos: index % 2 ? 'b' : 't',
      params,
    }));
    mappings.push({
      id,
      paperComponent: spec.label.replace(/\n/g, ' '),
      registryType: spec.type,
      simulationStatus: spec.diagramOnly ? 'diagram-only pass-through' : 'qualitative native element',
    });
  });

  elements.push(element(`${record.key}-focus`, 'objective', objectiveX, y, {
    label: record.focusLabel,
    labelPos: 't',
    params: { f: 40, aperture: 46, transEff: 100 },
  }));
  elements.push(element(`${record.key}-sample-stage`, 'stage', stageX, y, {
    label: record.sampleLabel,
    labelPos: 'b',
    params: {
      pzMode: 'static',
      containsSample: true,
      aperture: 48,
      sampleKind: 'resin',
      showMaterialLabel: true,
      showSignalSpot: true,
      voxelPreview: sourceKnown,
      voxelSize: 0.8,
    },
  }));

  const limitations = record.limitations.join(' ');
  const noteLines = wrapWords(limitations, 120).slice(0, 3);
  noteLines.forEach((line, index) => {
    elements.push(text(`${record.key}-limitation-${index + 1}`, 550, 438 + index * 18, line, 10, '#7c2d12'));
  });
  elements.push(text(
    `${record.key}-scope`,
    550,
    505,
    'Qualitative chief ray only · diagram boxes do not claim simulated multi-focus, diffraction, dose, cure, or throughput',
    10,
    '#475569',
  ));

  const raw = {
    app: 'optics2d',
    version: 1,
    elements,
    beams: [],
  };
  const parsed = parseSketch(raw, registry);
  return {
    raw: { ...raw, elements: parsed.elements, beams: parsed.beams },
    mappings: [
      {
        id: sourceKnown ? `${record.key}-source` : `${record.key}-source-diagram`,
        paperComponent: record.sourceLabel,
        registryType: sourceKnown ? 'laser' : 'box',
        simulationStatus: sourceKnown ? 'qualitative pulsed source' : 'diagram-only; no emitted ray',
      },
      ...mappings,
      {
        id: `${record.key}-focus`,
        paperComponent: record.focusLabel,
        registryType: 'objective',
        simulationStatus: record.key === 'gu-2025'
          ? 'single-chief-ray focusing surrogate for metalens array'
          : 'qualitative thin-lens objective surrogate',
      },
      {
        id: `${record.key}-sample-stage`,
        paperComponent: record.sampleLabel,
        registryType: 'stage',
        simulationStatus: 'qualitative resin hit / voxel marker only',
      },
    ],
  };
}

function finiteTrace(trace) {
  const points = [];
  for (const drawable of trace.drawables) {
    if (Array.isArray(drawable.pts)) points.push(...drawable.pts);
    if (Array.isArray(drawable.dots)) points.push(...drawable.dots);
  }
  return points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function markdownFor(record, contract, checks) {
  const bullets = values => values.map(value => `- ${value}`).join('\n');
  return `# ${record.short}: OpticalSetup reconstruction

This loadable scene reconstructs the reported fabrication train from the PDF evidence below. It is an evidence-led, readable 2D chief-ray diagram, not a calibrated optical design or throughput reproduction.

## Source

- Article: ${record.title}
- Citation: ${record.citation}
${record.doi ? `- DOI: https://doi.org/${record.doi}\n` : ''}- PDF used: ${record.pdfUrl}
- PDF status: ${record.pdfStatus}
- Figure/methods anchor: ${record.figure}
${record.sourceQualifier ? `- Source-value qualification: ${record.sourceQualifier}\n` : ''}${record.sourceRepRateStatus ? `- Repetition-rate status: ${record.sourceRepRateStatus}\n` : ''}${record.supplementBacked ? '- Main-PDF boundary: this scene is backed by the official supplementary PDF and article figure, not an open main-article PDF.\n' : ''}
## Direct paper evidence

${bullets(record.direct)}

## Inferred or diagram-only choices

${bullets(record.inferred)}

## Unknowns retained

${bullets(record.unknown)}

## OpticalSetup mapping

${contract.componentMappings.map(item => `- \`${item.id}\`: ${item.paperComponent} → \`${item.registryType}\` (${item.simulationStatus})`).join('\n')}

## Limitations

${bullets(record.limitations)}
- OpticalSetup's 2PP preview records qualitative pulsed arrivals at the sample plane. It does not calculate multi-focus wave optics, two-photon absorption, threshold dose, cure kinetics, voxel overlap, fabrication time, or throughput.

## Validation

- File parsed through the current component registry: ${checks.registryNormalized ? 'yes' : 'no'}
- No manual beam overlays: ${checks.noManualBeams ? 'yes' : 'no'}
- Finite trace/export geometry: ${checks.finiteTrace && checks.finiteSvg ? 'yes' : 'no'}
- Source-to-sample trace: ${checks.sourceMode === 'diagram-only' ? 'not claimed; source parameters are incomplete' : checks.sourceToSample ? 'yes, one qualitative chief ray' : 'no'}
- Overall generated check: ${checks.passed ? 'PASS' : 'FAIL'}
`;
}

function contractFor(record, sceneFile, mappings) {
  return {
    schema: 1,
    kind: 'opticalsetup-paper-reconstruction-contract',
    sceneFile,
    explorer: EXPLORER_URL,
    source: {
      title: record.title,
      citation: record.citation,
      doi: record.doi,
      pdfUrl: record.pdfUrl,
      pdfStatus: record.pdfStatus,
      figureOrMethodsAnchor: record.figure,
      supplementBacked: Boolean(record.supplementBacked),
    },
    evidence: {
      direct: record.direct,
      inferredOrDiagramOnly: record.inferred,
      unknown: record.unknown,
    },
    componentMappings: mappings,
    limitations: record.limitations,
    globalLimitations: [
      'Coordinates, trace focal lengths, and flattened folds are diagram choices unless explicitly stated as paper evidence.',
      'Diagram-only custom boxes use pass-through behavior and do not absorb or redirect rays.',
      'One chief ray never represents the number, power uniformity, wavefront, or dose of a parallel focus array.',
      'The resin-stage preview is not a two-photon polymerization or throughput model.',
    ],
  };
}

function readme(recordsWithChecks) {
  const tracedCount = recordsWithChecks.filter(({ checks }) => checks.sourceMode === 'traced').length;
  const diagramOnlyCount = recordsWithChecks.length - tracedCount;
  const includedRows = recordsWithChecks.map(({ record, checks }) => {
    const status = record.supplementBacked
      ? 'included · official SI'
      : record.key === 'nanoscribe-gt-datasheet'
        ? 'included · 2016 revision'
        : 'included';
    return `| ${record.short} | ${status} | [PDF](${record.pdfUrl}) | ${checks.sourceMode === 'traced' ? 'chief ray reaches resin stage' : 'diagram-only source'} |`;
  });
  const excludedRows = excluded.map(item =>
    `| ${item.explorerLabel} | excluded | ${item.links.map((link, i) => `[link ${i + 1}](${link})`).join(', ')} | ${item.reason} |`);

  return `# Throughput-scaling 2PP reference reconstructions

This directory contains one loadable OpticalSetup scene for every fabrication reference in the [throughput-scaling explorer](${EXPLORER_URL}) for which a usable PDF was found in a bounded search. The explorer has 18 plotted points but 17 distinct fabrication references: the two Gu et al. points share one apparatus and therefore one setup.

## Result

- 14 loadable \`.opticalsetup.json\` scenes.
- ${tracedCount} scenes have enough reported source timing to emit one qualitative chief ray to a resin stage.
- ${diagramOnlyCount} scenes retain a diagram-only source rather than inventing missing timing data.
- 3 distinct references are excluded with the failed/mismatched PDF outcome preserved below.
- No scene is added to the in-app Examples menu; these remain reviewable research reconstructions.

| Reference | outcome | PDF evidence | trace boundary |
|---|---|---|---|
${includedRows.join('\n')}

## Excluded references

| Reference | outcome | links checked | reason |
|---|---|---|---|
${excludedRows.join('\n')}

## Artifact set

For each included reference:

- \`<key>.opticalsetup.json\` — loadable scene.
- \`<key>-preview.svg\` — deterministic white-background export.
- \`<key>-contract.json\` — evidence ledger, paper-to-registry mapping, unknowns, and limitations.
- \`<key>-checks.json\` — generated parse/trace/export checks.
- \`<key>-reconstruction.md\` — human-readable source and reconstruction notes.

\`index.json\` is the machine-readable inventory. Regenerate everything with:

\`\`\`bash
node tools/build-throughput-reconstructions.mjs
\`\`\`

## Evidence and simulation boundary

The PDF is semantic authority; extracted text was used only for navigation. Apparatus figures and the relevant methods were visually inspected before scene authoring. A straight readable path is used where the source figure is folded or three-dimensional. Custom boxes are deliberately diagram-only and have pass-through behavior.

The scenes do not reproduce the explorer's throughput values. OpticalSetup performs qualitative 2D geometric ray tracing; it does not simulate SLM/DMD/DOE/metalens diffraction, coherent phase, temporal focusing, multi-focus power balance, resin thresholds, curing, three-dimensional scan calibration, fabrication time, or throughput.

The source universe was cross-checked against the explorer's [JSON data](${DATA_URL}) and the upstream [KIT benchmark CSV](${BENCHMARK_URL}).
`;
}

async function build() {
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const inventory = [];
  const recordsWithChecks = [];

  for (const record of records) {
    const { raw, mappings } = buildScene(record);
    const sceneFile = `${record.key}.opticalsetup.json`;
    const contractFile = `${record.key}-contract.json`;
    const checksFile = `${record.key}-checks.json`;
    const previewFile = `${record.key}-preview.svg`;
    const notesFile = `${record.key}-reconstruction.md`;

    const trace = traceScene(raw.elements, raw.beams);
    state.elements = raw.elements;
    state.beams = raw.beams;
    const svg = buildSVG({ whiteBg: true });
    const sourceMode = record.source ? 'traced' : 'diagram-only';
    const sourceToSample = sourceMode === 'diagram-only'
      ? null
      : trace.signalHits.some(hit => hit.stageId === `${record.key}-sample-stage`);

    const checks = {
      schema: 1,
      kind: 'opticalsetup-paper-reconstruction-checks',
      sceneFile,
      registryNormalized: raw.elements.every(item => Boolean(registry[item.type])),
      noManualBeams: raw.beams.length === 0,
      finiteElements: raw.elements.every(item =>
        Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.rot)),
      finiteTrace: finiteTrace(trace),
      finiteSvg: !/\b(?:NaN|Infinity|-Infinity)\b/.test(svg),
      sourceMode,
      sourceToSample,
      sourceCount: raw.elements.filter(item => registry[item.type]?.source).length,
      stageHitCount: trace.signalHits.filter(hit => hit.stageId === `${record.key}-sample-stage`).length,
      manualBeamCount: raw.beams.length,
      elementCount: raw.elements.length,
    };
    checks.passed = checks.registryNormalized
      && checks.noManualBeams
      && checks.finiteElements
      && checks.finiteTrace
      && checks.finiteSvg
      && (sourceMode === 'diagram-only' || sourceToSample);

    const contract = contractFor(record, sceneFile, mappings);
    await writeFile(`${OUTPUT_DIR}/${sceneFile}`, `${JSON.stringify(raw, null, 2)}\n`);
    await writeFile(`${OUTPUT_DIR}/${contractFile}`, `${JSON.stringify(contract, null, 2)}\n`);
    await writeFile(`${OUTPUT_DIR}/${checksFile}`, `${JSON.stringify(checks, null, 2)}\n`);
    await writeFile(`${OUTPUT_DIR}/${previewFile}`, `${svg}\n`);
    await writeFile(`${OUTPUT_DIR}/${notesFile}`, markdownFor(record, contract, checks));

    inventory.push({
      key: record.key,
      title: record.title,
      citation: record.citation,
      doi: record.doi,
      pdfUrl: record.pdfUrl,
      pdfStatus: record.pdfStatus,
      sceneFile,
      contractFile,
      checksFile,
      previewFile,
      notesFile,
      checksPassed: checks.passed,
      sourceMode,
      supplementBacked: Boolean(record.supplementBacked),
    });
    recordsWithChecks.push({ record, checks });
  }

  const index = {
    schema: 1,
    kind: 'opticalsetup-throughput-scaling-reconstruction-index',
    generatedOn: '2026-07-29',
    explorer: EXPLORER_URL,
    distinctFabricationReferences: 17,
    plottedPoints: 18,
    includedSetups: inventory.length,
    tracedSetups: inventory.filter(item => item.sourceMode === 'traced').length,
    diagramOnlySources: inventory.filter(item => item.sourceMode === 'diagram-only').length,
    excludedReferences: excluded,
    records: inventory,
  };
  await writeFile(`${OUTPUT_DIR}/index.json`, `${JSON.stringify(index, null, 2)}\n`);
  await writeFile(`${OUTPUT_DIR}/README.md`, readme(recordsWithChecks));

  const failed = inventory.filter(item => !item.checksPassed);
  if (failed.length) {
    throw new Error(`Generated reconstructions failed checks: ${failed.map(item => item.key).join(', ')}`);
  }
  process.stdout.write(`Generated ${inventory.length} reconstructions in ${OUTPUT_DIR}\n`);
}

await build();
