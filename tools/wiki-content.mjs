// Structured content for the OpticalSetup wiki. One entry per flagship
// component. `tools/build-wiki.mjs` turns this into static pages, pulling
// the live icon and current defaults straight from the component registry
// so the wiki can never silently drift from what the app actually ships.
//
// Every claim under `inOpticalSetup` must be verified against the actual
// implementation (js/raytrace.js, js/polarization.js) before it's written
// here — see the physics verification pass in the branch's history.

export const wikiEntries = [
  {
    type: 'laser',
    title: 'Laser',
    category: 'Sources',
    realWorld: {
      html: `
        <p>A laser produces light by stimulated emission inside a resonant cavity: a gain
        medium bounded by two mirrors amplifies a specific wavelength every round trip,
        while losses (mirror transmission, absorption, scattering) drain it. Above
        threshold — the pump rate at which round-trip gain first equals round-trip loss —
        the cavity sustains a stable, highly monochromatic, spatially coherent beam.</p>
        <p>The output isn't a perfectly parallel ray bundle: real laser beams are Gaussian
        and diverge with propagation. For a beam with waist radius <span class="w">w₀</span>,
        the far-field half-angle divergence is</p>`,
      formulas: [
        { tex: '\\theta \\approx \\frac{\\lambda}{\\pi w_0}', caption: 'Far-field divergence half-angle of a Gaussian beam (small-angle, TEM₀₀ mode).' },
        { tex: 'E_{\\text{photon}} = \\frac{hc}{\\lambda}', caption: 'Photon energy — why shorter wavelengths (blue, UV) carry more energy per photon than longer ones (red, IR).' },
      ],
    },
    inOpticalSetup: {
      html: `
        <p>The Laser element emits either a single collimated ray or, in <em>Beam with
        size</em> mode, a fan of 25 parallel rays sampling a finite beam width — this is
        what lets the tracer show a lens actually focusing a beam of nonzero extent,
        rather than a single infinitesimal ray that can never miss an aperture.</p>
        <p>Spectrum is monochromatic, broadband (a symmetric bandwidth around the center
        wavelength), or supercontinuum (a fixed 430–870&nbsp;nm white-light band) — dispersive
        elements downstream (prisms, gratings) sample this band at several discrete
        wavelengths and fan them out individually. Pulsed mode adds a repetition rate and
        pulse duration that drive the timing overlay; polarization is set directly as a
        Stokes vector rather than emerging from a modeled cavity.</p>`,
      formulas: [],
      limitations: `<p>There is no modeled gain medium, cavity round trip, or threshold —
        wavelength, spectrum, polarization, and pulse timing are configured directly as
        source parameters, not derived from first principles. Divergence and M² are not
        modeled: a collimated beam stays perfectly parallel over any distance.</p>`,
    },
    related: ['sclaser', 'pointsource', 'mirror'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Lasers', url: 'https://www.rp-photonics.com/lasers.html' },
    ],
  },

  {
    type: 'mirror',
    title: 'Mirror',
    category: 'Mirrors',
    realWorld: {
      html: `
        <p>Reflection at a smooth interface follows the law of reflection: the angle of
        incidence equals the angle of reflection, both measured from the surface normal,
        with the incident and reflected rays in the same plane. In vector form, an
        incident direction <span class="w">d̂</span> reflecting off a surface with unit
        normal <span class="w">n̂</span> becomes:</p>`,
      formulas: [
        { tex: "\\hat{d}' = \\hat{d} - 2(\\hat{d}\\cdot\\hat{n})\\,\\hat{n}", caption: 'Vector form of the law of reflection.' },
        { tex: 'R = \\left(\\frac{n_1 - n_2}{n_1 + n_2}\\right)^{2}', caption: 'Fresnel reflectance at normal incidence for an uncoated dielectric interface — real mirrors instead use a metal or multilayer dielectric coating engineered for R close to 1 (or a deliberately partial value for an output coupler).' },
      ],
    },
    inOpticalSetup: {
      html: `
        <p>OpticalSetup implements the exact vector law of reflection shown above — the
        mirror surface's normal is computed from its two drawn endpoints, so rotating or
        resizing a mirror changes the reflected direction correctly at any angle.
        Reflectivity is a single configurable percentage: at 100% every ray reflects; below
        that, each incident ray splits into a reflected branch carrying fraction
        <span class="w">R</span> of the intensity and a transmitted branch carrying
        <span class="w">1 − R</span>, which is how a partially-reflective cavity mirror or
        output coupler is modeled.</p>`,
      formulas: [],
      limitations: `<p>Reflectivity is a single flat number: real coatings vary with angle
        of incidence and polarization (s- vs p-plane), and a metal mirror's reflectance
        varies with wavelength. None of that is modeled — <span class="w">R</span> is
        constant regardless of incidence angle, polarization, or color.</p>`,
    },
    related: ['cmirror', 'cmirrorx', 'oap', 'galvo', 'bs'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Mirrors', url: 'https://www.rp-photonics.com/mirrors.html' },
    ],
  },

  {
    type: 'lens',
    title: 'Convex lens',
    category: 'Lenses',
    realWorld: {
      html: `
        <p>A thin lens bends light by refraction at its two curved surfaces. In the
        paraxial approximation — rays close to the optical axis, at small angles — those
        two refractions collapse into a single relationship between object distance
        <span class="w">dₒ</span>, image distance <span class="w">dᵢ</span>, and focal
        length <span class="w">f</span>:</p>`,
      formulas: [
        { tex: '\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}', caption: 'The thin-lens equation.' },
        { tex: 'm = -\\frac{d_i}{d_o}', caption: 'Transverse magnification — negative sign means an inverted image for a real image from a positive lens.' },
      ],
    },
    inOpticalSetup: {
      html: `
        <p>Rather than tracing the thin-lens equation for one axial object point at a
        time, OpticalSetup applies the equivalent <strong>paraxial ray-transfer
        relation</strong> to every individual ray that crosses the lens plane. For a ray
        crossing at height <span class="w">h</span> from the optical axis with incoming
        slope <span class="w">u</span> (the ratio of its transverse to axial direction
        components), the outgoing slope is:</p>`,
      formulas: [
        { tex: "u' = u - \\frac{h}{f}", caption: 'Paraxial ray-transfer equation for a thin lens — the same physics as the lens equation above, applied per-ray so any bundle of rays (not just one object point) focuses correctly.' },
      ],
      limitations: `<p>This is genuine paraxial optics, not a hand-wavy "bend toward
        focus": a beam of parallel rays offset from the axis really does converge at the
        back focal point, and an object arrow really does form an inverted, magnified, or
        demagnified image at the position the lens equation predicts. What's missing is
        everything paraxial theory leaves out by construction — spherical and chromatic
        aberration, finite lens thickness, and any behavior for rays far from the axis or
        at large angles.</p>`,
    },
    related: ['lensc', 'telescope', 'objective', 'cmirror'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Lenses', url: 'https://www.rp-photonics.com/lenses.html' },
    ],
  },

  {
    type: 'prism',
    title: 'Prism',
    category: 'Dispersive & Apertures',
    realWorld: {
      html: `
        <p>A prism disperses light because its refractive index depends on wavelength.
        Each face refracts according to Snell's law:</p>`,
      formulas: [
        { tex: 'n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2', caption: "Snell's law at each face." },
      ],
      html2: `
        <p>Since <span class="w">n</span> itself varies with <span class="w">λ</span>,
        different colors refract by different amounts and separate — this is why white
        light fans into a rainbow. Real optical glass is characterized by a Sellmeier
        equation, a sum of resonance terms fit to measured data, not a single simple
        formula.</p>`,
    },
    inOpticalSetup: {
      html: `
        <p>Each face is a genuine refracting boundary — incident rays bend by real vector
        Snell's law, and a ray that exceeds the critical angle undergoes total internal
        reflection instead of exiting, exactly as a real prism does. For dispersion,
        broadband and supercontinuum beams are sampled at several discrete wavelengths
        across their band, and each sample refracts with its own wavelength-dependent
        index, so the beam visibly fans into a spectrum.</p>`,
      formulas: [
        { tex: 'n(\\lambda) = 1.5046 + \\frac{4680}{\\lambda^{2}} \\quad (\\lambda \\text{ in nm})', caption: 'The dispersion curve used for the built-in "BK7-like" glass — a compact two-term approximation, not the real 3-term BK7 Sellmeier equation.' },
      ],
      limitations: `<p>The dispersion formula above is a deliberately simplified stand-in
        for real BK7 glass, tuned to give the right qualitative shape (more bending at
        blue wavelengths, less at red) rather than matching a real glass catalog to
        several decimal places. Only one glass "family" is modeled; there's no coating,
        absorption, or surface-quality loss beyond the configured per-face transmission.</p>`,
    },
    related: ['grating', 'glassrod', 'freeglass', 'dichroic'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Prisms', url: 'https://www.rp-photonics.com/prisms.html' },
    ],
  },

  {
    type: 'grating',
    title: 'Diffraction grating',
    category: 'Dispersive & Apertures',
    realWorld: {
      html: `
        <p>A diffraction grating is a surface ruled with closely, evenly spaced lines
        (period <span class="w">d</span>). Light diffracting from it interferes
        constructively only at angles satisfying the grating equation:</p>`,
      formulas: [
        { tex: 'd\\,(\\sin\\theta_i + \\sin\\theta_m) = m\\lambda', caption: 'The grating equation: incidence angle θᵢ, diffraction angle θₘ, integer order m, line spacing d.' },
      ],
      html2: `<p>Because the equation depends on <span class="w">λ</span>, each nonzero
        order spreads white light into a spectrum — the same effect a prism produces
        through dispersion, but from interference rather than refractive-index variation.</p>`,
    },
    inOpticalSetup: {
      html: `
        <p>This is one of the few components where OpticalSetup implements the textbook
        formula directly and exactly, solving the grating equation per sampled wavelength
        for every configured diffraction order, in either reflective or transmissive
        mode. Orders where the equation has no real solution (<span class="w">|sinθₘ| &gt;
        1</span>) are simply dropped, matching a real grating's behavior of only lighting
        up the orders that geometrically exist.</p>`,
      formulas: [],
      limitations: `<p>Diffraction efficiency is split evenly across the configured
        orders rather than computed from the groove profile (a real blazed grating
        concentrates most of the light into one order by design) — order existence and
        angle are exact, relative brightness between orders is not.</p>`,
    },
    related: ['prism', 'dmd', 'slm'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Diffraction Gratings', url: 'https://www.rp-photonics.com/diffraction_gratings.html' },
    ],
  },

  {
    type: 'bs',
    title: 'Beamsplitter',
    category: 'Filters & Splitters',
    realWorld: {
      html: `
        <p>A beamsplitter divides an incident beam into a transmitted and a reflected
        branch, typically using a thin dielectric or metallic coating on a glass cube or
        plate. Real coatings are rarely perfectly neutral: the reflect/transmit ratio
        usually depends on both wavelength and polarization, since s- and p-polarized
        light reflect differently off any dielectric interface away from normal
        incidence.</p>`,
    },
    inOpticalSetup: {
      html: `
        <p>The beamsplitter is modeled as an ideal, polarization-independent divider: a
        single configurable ratio sets what fraction of each incident ray's intensity
        continues straight through versus reflects at the drawn diagonal, with no
        wavelength or angle dependence.</p>`,
      formulas: [
        { tex: 'I_T = rI_0, \\qquad I_R = (1-r)I_0', caption: 'Transmitted and reflected intensity for split ratio r.' },
      ],
      limitations: `<p>A real 50/50 cube is rarely exactly 50/50 across the visible
        spectrum, and its ratio shifts with polarization — none of that is modeled here.
        For a splitter whose two outputs are cleanly separated by polarization state
        rather than a fixed ratio, see the Polarizing BS instead.</p>`,
    },
    related: ['pbs', 'dichroic', 'mirror'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Beam Splitters', url: 'https://www.rp-photonics.com/beam_splitters.html' },
    ],
  },

  {
    type: 'polarizer',
    title: 'Polarizer',
    category: 'Polarization',
    realWorld: {
      html: `
        <p>An ideal linear polarizer transmits only the field component parallel to its
        transmission axis. For fully polarized light arriving at angle
        <span class="w">θ</span> to that axis, the classic form of Malus's law gives the
        transmitted intensity:</p>`,
      formulas: [
        { tex: 'I = I_0 \\cos^{2}\\theta', caption: "Malus's law for fully (linearly) polarized input." },
      ],
      html2: `<p>That scalar formula only covers fully linearly polarized light, though —
        it says nothing about partially polarized, unpolarized, or elliptically
        polarized input, which is most real light sources.</p>`,
    },
    inOpticalSetup: {
      html: `
        <p>Polarization state throughout OpticalSetup is tracked as a full normalized
        Stokes vector <span class="w">(s₁, s₂, s₃)</span>, not a single angle — so a
        polarizer's transmission is computed with the general form of Malus's law, which
        reduces to the scalar equation above for fully linear light but also gives the
        correct partial transmission for unpolarized, partially polarized, or circular
        input:</p>`,
      formulas: [
        { tex: 'T = \\tfrac{1}{2}\\left(1 + s_1\\cos 2\\theta + s_2\\sin 2\\theta\\right)', caption: "The Stokes-vector form of Malus's law that OpticalSetup evaluates at every polarizer." },
      ],
      limitations: `<p>The polarizer is ideal — perfect extinction on the blocked axis,
        no wavelength dependence, no insertion loss on the transmission axis.</p>`,
    },
    related: ['hwp', 'qwp', 'pbs', 'eom'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Polarizers', url: 'https://www.rp-photonics.com/polarizers.html' },
    ],
  },

  {
    type: 'aom',
    title: 'Acousto-optic modulator (AOM)',
    category: 'Modulators',
    realWorld: {
      html: `
        <p>An AOM diffracts light off a traveling sound wave launched into a crystal by a
        piezoelectric transducer driven at an RF frequency. In the Bragg regime, light
        incident at the Bragg angle diffracts efficiently into a single order, shifted in
        frequency by exactly the drive frequency (up-shifted or down-shifted depending on
        propagation direction relative to the sound wave):</p>`,
      formulas: [
        { tex: '\\sin\\theta_B = \\frac{\\lambda}{2\\Lambda}, \\qquad \\Lambda = \\frac{v_s}{f_{RF}}', caption: 'Bragg angle, set by the acoustic wavelength Λ (sound velocity vₛ over drive frequency).' },
        { tex: 'f_{\\text{out}} = f_{\\text{in}} \\pm f_{RF}', caption: 'The diffracted beam is frequency-shifted by exactly the RF drive frequency.' },
      ],
    },
    inOpticalSetup: {
      html: `
        <p>The frequency shift is modeled exactly: the diffracted ray's optical frequency
        is genuinely shifted by the configured RF frequency, then converted back to a
        wavelength, which is what makes an AOM in a pulse-timing setup actually change
        color. Deflection and diffraction efficiency, though, are direct configurable
        parameters rather than quantities derived from crystal or drive properties.
        Gating support (square or graded sinusoidal) lets the modeled RF drive turn on
        and off in time, which the pulse-timing overlay reads as a temporal gate on the
        beam.</p>`,
      formulas: [],
      limitations: `<p>Deflection angle and diffraction efficiency are set directly by
        you, not derived from the Bragg condition, RF power, or interaction length — this
        is a schematic acousto-optic model, not a Bragg-cell simulator. Only the frequency
        shift is first-principles physics.</p>`,
    },
    related: ['aotf', 'eom', 'chopper', 'delayline'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Acousto-optic Modulators', url: 'https://www.rp-photonics.com/acousto_optic_modulators.html' },
    ],
  },

  {
    type: 'detector',
    title: 'Photodetector',
    category: 'Detectors',
    realWorld: {
      html: `
        <p>A real photodetector converts incident optical power to an electrical
        photocurrent with some responsivity <span class="w">R</span> (amps per watt),
        set by the detector's quantum efficiency <span class="w">η</span> — the fraction
        of incident photons that produce a collected charge carrier:</p>`,
      formulas: [
        { tex: 'R = \\frac{\\eta e}{h\\nu} \\quad [\\text{A/W}]', caption: 'Responsivity of an ideal photodetector at optical frequency ν.' },
      ],
    },
    inOpticalSetup: {
      html: `
        <p>The detector reports a <em>qualitative</em> relative signal — the sum of every
        ray's intensity reaching its front face — plus the spectrum, polarization state,
        and spot extent of whatever light arrives, all read directly off the traced rays.
        This is genuinely useful for seeing <em>whether</em> light reaches a detector,
        roughly how strong it is relative to other configurations, and what its spectral
        or polarization content is.</p>`,
      formulas: [],
      limitations: `<p>The reported signal is not calibrated to any real unit — there is
        no watts-in, amps-out responsivity curve, no dark current, no saturation physics
        beyond what's explicitly modeled on the PMT variant. Treat the number as relative,
        not absolute.</p>`,
    },
    related: ['pmt', 'camera', 'eye'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Photodetectors', url: 'https://www.rp-photonics.com/photodetectors.html' },
    ],
  },

  {
    type: 'dichroic',
    title: 'Dichroic mirror',
    category: 'Filters & Splitters',
    realWorld: {
      html: `
        <p>A dichroic mirror is a multilayer thin-film coating engineered so
        constructive and destructive interference between the layers reflects one band
        of wavelengths while transmitting another. The transmission spectrum
        <span class="w">T(λ)</span> it produces depends on the full layer stack — there's
        no single closed-form equation, and real coatings have a finite-width transition
        (not a hard cutoff) that also shifts with the angle of incidence.</p>`,
    },
    inOpticalSetup: {
      html: `
        <p>OpticalSetup models the idealized target behavior a dichroic coating is
        designed to approximate: a hard-edged passband. Longpass, shortpass, and bandpass
        variants each define a wavelength range that transmits completely, reflecting
        everything else. For a broadband beam, the transmitted and reflected branches
        each carry the actual spectral overlap between the beam's band and the passband —
        so a supercontinuum beam through a longpass dichroic correctly comes out
        color-shifted on both branches, not just dimmed.</p>`,
      formulas: [
        { tex: 'T(\\lambda) = \\begin{cases} 1 & \\lambda \\in \\text{passband} \\\\ 0 & \\text{otherwise} \\end{cases}', caption: 'The ideal step-function transmission OpticalSetup evaluates, versus a real coating\'s smooth, angle-dependent roll-off.' },
      ],
      limitations: `<p>No thin-film interference is modeled, the cutoff is a hard edge
        rather than a smooth transition, and — unlike a real coating, whose cutoff
        wavelength shifts at non-normal incidence — the configured cutoff is fixed
        regardless of the angle the dichroic is drawn at.</p>`,
    },
    related: ['filter', 'bs', 'prism'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Dichroic Mirrors', url: 'https://www.rp-photonics.com/dichroic_mirrors.html' },
    ],
  },

  {
    type: 'cmirrorx',
    title: 'Convex mirror',
    category: 'Mirrors',
    realWorld: {
      html: `
        <p>A convex (diverging) spherical mirror bulges toward the incoming light and
        spreads a reflected beam out rather than focusing it. It obeys the same mirror
        equation as a concave mirror, but with a negative focal length — object rays
        reflect as if diverging from a virtual focus behind the mirror, forming an
        upright, reduced virtual image. This is the geometry behind car passenger-side
        mirrors and wide-field security mirrors, both chosen for their expanded field of
        view rather than any focusing power.</p>`,
      formulas: [
        { tex: 'f = \\frac{R}{2} < 0, \\qquad \\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}', caption: 'Same mirror equation as the concave case, with f negative by convention.' },
      ],
    },
    inOpticalSetup: {
      html: `
        <p>Identical implementation to the <a href="../cmirror/">concave mirror</a> —
        exact vector reflection off the drawn line, followed by the lens-style paraxial
        correction <span class="w">u' = u − h/f</span> — just with a negative focal
        length, which is why the reflected beam here visibly spreads instead of
        converging.</p>`,
      formulas: [],
      limitations: `<p>Same caveat as the concave mirror: the curvature drawn in the icon
        is cosmetic, the correction is exact at every ray height (no spherical
        aberration), and there's no wavelength- or angle-dependent reflectivity.</p>`,
    },
    related: ['cmirror', 'mirror', 'oap'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Mirrors', url: 'https://www.rp-photonics.com/mirrors.html' },
    ],
  },

  {
    type: 'cmirror',
    title: 'Concave mirror',
    category: 'Mirrors',
    realWorld: {
      html: `
        <p>A concave (converging) spherical mirror focuses light by reflection the same
        way a lens focuses it by refraction. For a mirror of radius of curvature
        <span class="w">R</span>, the paraxial focal length is half the radius, and object
        and image distances obey the same mirror equation as a lens:</p>`,
      formulas: [
        { tex: 'f = \\frac{R}{2}', caption: 'Paraxial focal length from the radius of curvature.' },
        { tex: '\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}, \\qquad m = -\\frac{d_i}{d_o}', caption: 'The mirror equation and transverse magnification — identical in form to the thin-lens equation.' },
      ],
      html2: `
        <p>That formula is only exact for rays close to the axis. A real sphere brings
        marginal (off-axis) rays to a focus slightly closer to the mirror than paraxial
        rays — spherical aberration — which is why fast astronomical mirrors are ground as
        parabolas instead (see the parabolic mirror page).</p>`,
    },
    inOpticalSetup: {
      html: `
        <p>OpticalSetup reflects each ray off the mirror's drawn line using the exact
        vector law of reflection, then applies the same paraxial ray-transfer correction
        used by the <a href="../lens/">lens</a> element — <span class="w">u' = u −
        h/f</span> — to the reflected direction. The visible curvature in the icon is
        cosmetic; the ray/surface interaction happens against the flat line, with focusing
        added afterward as a per-ray angular correction.</p>`,
      formulas: [],
      limitations: `<p>Because the paraxial correction is applied exactly at every ray
        height rather than being derived from a real curved surface, this mirror has
        <em>no</em> spherical aberration at any aperture — every parallel ray converges
        exactly to the focal point regardless of how far it is from the axis. A real
        spherical mirror this fast would show visible aberration; this one won't. For a
        mirror whose curvature is actually ray-traced, see the parabolic mirror.</p>`,
    },
    related: ['cmirrorx', 'mirror', 'oap'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Mirrors', url: 'https://www.rp-photonics.com/mirrors.html' },
    ],
  },

  {
    type: 'oap',
    title: 'Parabolic mirror',
    category: 'Mirrors',
    realWorld: {
      html: `
        <p>A parabola has an exact geometric property a sphere only approximates: every
        ray traveling parallel to its axis, at <em>any</em> distance from that axis,
        reflects through a single focus. There is no spherical aberration to correct for,
        which is why fast telescope primaries, off-axis paraboloid (OAP) mirrors in
        ultrafast laser labs, and satellite dishes are all parabolic rather than
        spherical. In this 2D side view, the mirror profile is the parabola with vertex at
        the origin and focus a distance <span class="w">f</span> behind it:</p>`,
      formulas: [
        { tex: 'x = -\\frac{y^{2}}{4f}', caption: 'The parabola profile traced by the mirror, opening toward the incoming beam.' },
      ],
    },
    inOpticalSetup: {
      html: `
        <p>Unlike the concave and convex mirrors, which reflect off a single flat line
        and add focusing as a separate paraxial correction, the parabolic mirror is
        <strong>traced as its real geometric curve</strong> — split into a chain of short
        flat segments, each obeying the exact vector law of reflection. A collimated beam
        genuinely converges to the focus through real reflection geometry at every ray
        height, with no paraxial approximation involved.</p>`,
      formulas: [],
      limitations: `<p>This is closer to first-principles optics than most elements in the
        library, but it's still a 2D on-axis cross-section — a real OAP is typically an
        off-axis section of a 3D paraboloid, which this side view can't represent. The
        curve is also faceted into a finite number of straight segments rather than
        perfectly smooth; the segment count scales with size and focal length to keep
        faceting error negligible for realistic apertures, but an extremely fast mirror
        sampled too coarsely could show it.</p>`,
    },
    related: ['cmirror', 'cmirrorx', 'mirror'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Mirrors', url: 'https://www.rp-photonics.com/mirrors.html' },
    ],
  },

  {
    type: 'galvo',
    title: 'Galvo mirror',
    category: 'Mirrors',
    realWorld: {
      html: `
        <p>A galvanometer scanner ("galvo") is a small mirror mounted on a limited-rotation
        motor, used to steer a beam electronically instead of by hand — the core
        building block of laser scanning microscopes, laser marking and cutting systems,
        LiDAR, and laser light shows. Because reflection doubles an angle change, a small
        mechanical rotation produces twice as much angular deflection in the reflected
        beam:</p>`,
      formulas: [
        { tex: '\\theta_{\\text{beam}} = 2\\,\\theta_{\\text{mechanical}}', caption: 'The optical scan angle is always twice the mechanical mirror rotation — the same doubling that applies to any steering mirror.' },
      ],
      html2: `
        <p>Real galvo systems pair two mirrors on perpendicular axes (X and Y) to raster-
        or vector-scan a beam over a 2D field, and their achievable speed is limited by
        the mirror's rotational inertia — large, fast angular steps take longer to settle
        than small ones.</p>`,
    },
    inOpticalSetup: {
      html: `
        <p>The galvo reflects rays with the same exact vector law of reflection as a
        plain mirror, but its surface angle is recomputed every frame from a configurable
        command: <em>Static</em> holds a fixed mechanical angle; <em>Sine</em> and
        <em>Triangle</em> continuously sweep it around that center at a set frequency and
        peak amplitude. In sweep mode the mirror actually rotates and the reflected beam
        visibly sweeps back and forth on its own — this is the one component in the
        library that animates continuously in real time, driven by its own clock rather
        than the pulse-timing playback controls used elsewhere.</p>`,
      formulas: [],
      limitations: `<p>The peak mechanical sweep is capped at 10°, and defaults to a
        modest 1° — enough to demonstrate scanning clearly without the swing dominating a
        sketch. There's no modeled inertia, bandwidth, or settling time: the mirror
        follows the commanded sine or triangle wave instantly and perfectly at any
        frequency, which a real galvo's mechanical response could not do.</p>`,
    },
    related: ['mirror', 'cmirror', 'cmirrorx'],
    resources: [
      { label: 'RP Photonics Encyclopedia — Mirrors', url: 'https://www.rp-photonics.com/mirrors.html' },
      { label: 'RP Photonics Encyclopedia — Laser Beam Delivery', url: 'https://www.rp-photonics.com/laser_beam_delivery.html' },
    ],
  },
];
