import { NCERTBook } from '../types';

export const OFFICIAL_NCERT_PORTAL_BASE = 'https://ncert.nic.in/textbook.php';

export const NCERT_BOOKS_COLLECTION: NCERTBook[] = [
  // =========================================================================
  // CLASS 12 SCIENCE (NEET / JEE / CBSE)
  // =========================================================================
  {
    id: 'ncert-lebo1',
    title: 'NCERT Biology (Class XII)',
    code: 'lebo1',
    classLevel: 'Class 12',
    stream: 'Science',
    subject: 'Biology',
    edition: 'Official NCERT National Curriculum Framework Edition',
    totalChapters: 13,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?lebo1=0-13',
    description: 'The golden standard textbook for NEET UG and Class 12 Boards. Contains word-for-word high-yield concepts for Genetics, Ecology, Reproduction, and Biotechnology.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Sexual Reproduction in Flowering Plants',
        code: 'lebo101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=1-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=1-13',
        summary: 'Microsporogenesis, megasporogenesis, pollen-pistil interaction, outbreeding devices, double fertilization, endosperm and embryo development, apomixis and polyembryony.',
        keyPoints: [
          'Anther structure: Epidermis, endothecium, middle layers, tapetum (nourishes pollen grains, polyploid).',
          'Double fertilization: Syngamy (zygote 2n) + Triple fusion (Primary Endosperm Nucleus 3n).',
          'Apomixis: Seed development without fertilization (Citrus, Asteraceae, grasses).'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Human Reproduction',
        code: 'lebo102',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=2-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=2-13',
        summary: 'Male and female reproductive systems, spermatogenesis, oogenesis, menstrual cycle hormonal regulation, fertilization, cleavage, implantation, and parturition.',
        keyPoints: [
          'Spermatogenesis produces 4 functional spermatozoa; oogenesis yields 1 ovum and polar bodies.',
          'LH surge on day 14 triggers Graafian follicle rupture and ovulation.',
          'Blastocyst implants into the endometrium; trophoblast forms chorionic villi.'
        ]
      },
      {
        chapterNumber: 3,
        title: 'Reproductive Health',
        code: 'lebo103',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=3-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=3-13',
        summary: 'Contraceptive methods, Medical Termination of Pregnancy (MTP Act), STIs, and Assisted Reproductive Technologies (IVF, ZIFT, GIFT, ICSI).',
        keyPoints: [
          'Barrier methods, IUDs (CuT, LNG-20), oral contraceptives (Saheli - centchroman).',
          'ART techniques: IVF-ET, ZIFT (embryo up to 8 blastomeres into fallopian tube), IUT (>8 blastomeres into uterus).'
        ]
      },
      {
        chapterNumber: 4,
        title: 'Principles of Inheritance and Variation',
        code: 'lebo104',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=4-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=4-13',
        summary: 'Mendelian genetics, monohybrid and dihybrid crosses, incomplete dominance, codominance, chromosomal theory, Morgan linkage in Drosophila, sex determination, and genetic disorders.',
        keyPoints: [
          'Mendelian ratios: Monohybrid phenotypic 3:1, genotypic 1:2:1; Dihybrid 9:3:3:1.',
          'Morgan proved physical association of genes on chromosomes (Linkage vs Recombination).',
          'Mendelian disorders: Sickle-cell anemia (GAG to GUG, Glu to Val at 6th beta chain), Hemophilia, Thalassemia.'
        ]
      },
      {
        chapterNumber: 5,
        title: 'Molecular Basis of Inheritance',
        code: 'lebo105',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=5-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=5-13',
        summary: 'DNA structure (Watson & Crick), packaging in nucleosomes, Hershey-Chase experiment, semi-conservative replication (Meselson-Stahl), transcription, genetic code, translation, lac operon, and Human Genome Project.',
        keyPoints: [
          'DNA double helix: antiparallel strands, pitch 3.4 nm, 10 bp per turn, Chargaff rules [A]=[T], [G]=[C].',
          'Meselson & Stahl (1958) used 15N and 14N CsCl gradient centrifugation.',
          'Lac operon: Polycistronic structural genes z (beta-galactosidase), y (permease), a (transacetylase).'
        ]
      },
      {
        chapterNumber: 6,
        title: 'Evolution',
        code: 'lebo106',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=6-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=6-13',
        summary: 'Origin of life (Miller-Urey experiment), evidence for evolution (homologous vs analogous organs, adaptive radiation), Darwin natural selection, Hardy-Weinberg equilibrium, and human evolution.',
        keyPoints: [
          'Miller-Urey sparked CH4, NH3, H2, and H2O vapor at 800 deg C yielding amino acids.',
          'Homologous structures indicate divergent evolution; Analogous indicate convergent evolution.',
          'Hardy-Weinberg: p^2 + 2pq + q^2 = 1 (constant gene frequencies in large random-mating population).'
        ]
      },
      {
        chapterNumber: 7,
        title: 'Human Health and Disease',
        code: 'lebo107',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=7-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=7-13',
        summary: 'Common infectious pathogens (Plasmodium malaria life cycle, Typhoid, Pneumonia), innate and adaptive immunity, antibodies (IgG, IgA, IgM, IgE), AIDS (HIV), Cancer oncogenes, and drug abuse.',
        keyPoints: [
          'Plasmodium: Sporozoites injected by female Anopheles; asexual schizogony in liver/RBCs; gametocytes taken up by mosquito.',
          'Antibody structure: H2L2 connected by disulfide bridges. IgA in colostrum, IgE in allergic reactions.',
          'HIV infects helper T-lymphocytes (CD4+); uses reverse transcriptase enzyme.'
        ]
      },
      {
        chapterNumber: 8,
        title: 'Microbes in Human Welfare',
        code: 'lebo108',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=8-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=8-13',
        summary: 'Microbes in household food processing (LAB, Baker yeast), industrial fermentation (Saccharomyces, statins, cyclosporin A), sewage treatment (BOD reduction), biogas production (Methanobacterium), and biocontrol agents.',
        keyPoints: [
          'Cyclosporin A (immunosuppressant from Trichoderma polysporum); Statins (blood cholesterol lowering from Monascus purpureus).',
          'Sewage treatment: Secondary treatment is biological (aerobic flocs drastically reduce BOD).',
          'Biocontrol: Bacillus thuringiensis (Bt toxin), Trichoderma fungi, Baculoviruses (Nucleopolyhedrovirus).'
        ]
      },
      {
        chapterNumber: 9,
        title: 'Biotechnology: Principles and Processes',
        code: 'lebo109',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=9-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=9-13',
        summary: 'Recombinant DNA technology tools: restriction endonucleases (palindromic sequences), ligases, cloning vectors (pBR322, selectable markers, rop, ori), PCR (denaturation, annealing, extension), and bioreactors.',
        keyPoints: [
          'Restriction enzymes cut DNA at specific palindromic sequences (e.g. EcoRI at 5\'-GAATTC-3\').',
          'pBR322 vector: ampR and tetR selectable markers, insertional inactivation principle.',
          'Polymerase Chain Reaction (PCR): Thermostable Taq polymerase from Thermus aquaticus.'
        ]
      },
      {
        chapterNumber: 10,
        title: 'Biotechnology and its Applications',
        code: 'lebo110',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=10-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=10-13',
        summary: 'Agricultural applications (Bt cotton cry genes, RNA interference in tobacco roots), medical applications (genetically engineered human insulin - Humulin, gene therapy for ADA deficiency), transgenic animals, and biosafety ethics.',
        keyPoints: [
          'Bt toxin cryIAc and cryIIAb control cotton bollworms; cryIAb controls corn borer.',
          'Eli Lilly synthesized two DNA sequences for chains A and B of insulin linked by disulfide bonds.',
          'First clinical gene therapy in 1990 for a 4-year-old girl with Adenosine Deaminase (ADA) deficiency.'
        ]
      },
      {
        chapterNumber: 11,
        title: 'Organisms and Populations',
        code: 'lebo111',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=11-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=11-13',
        summary: 'Organismal adaptations to abiotic factors (temperature, water, light, soil), population attributes (density, birth/death rate, age pyramid), growth models (exponential vs logistic carrying capacity K), and population interactions.',
        keyPoints: [
          'Logistic growth equation: dN/dt = rN((K - N)/K).',
          'Interactions: Mutualism (+/+), Commensalism (+/0), Parasitism (+/-), Predation (+/-), Amensalism (-/0), Competition (-/-).',
          'Gause Competitive Exclusion Principle: Two closely competing species cannot coexist indefinitely.'
        ]
      },
      {
        chapterNumber: 12,
        title: 'Ecosystem',
        code: 'lebo112',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=12-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=12-13',
        summary: 'Ecosystem structure and function, primary and secondary productivity, decomposition stages (fragmentation, leaching, catabolism, humification, mineralization), energy flow (Lindeman 10% law), ecological pyramids, and nutrient cycles.',
        keyPoints: [
          'Net Primary Productivity (NPP) = Gross Primary Productivity (GPP) - Respiration losses (R).',
          'Decomposition is accelerated in warm, moist, oxygen-rich conditions.',
          'Pyramid of energy is always upright; inverted pyramid of biomass occurs in open aquatic ecosystems.'
        ]
      },
      {
        chapterNumber: 13,
        title: 'Biodiversity and Conservation',
        code: 'lebo113',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebo1=13-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebo1=13-13',
        summary: 'Biodiversity patterns (latitudinal gradients, Alexander von Humboldt species-area relationship S=CA^Z), importance of biodiversity (David Tilman plots), threats (The Evil Quartet), in-situ vs ex-situ conservation.',
        keyPoints: [
          'Species-area relationship: log S = log C + Z log A (Z value 0.1 to 0.2 for local areas; 0.6 to 1.2 for continents).',
          'The Evil Quartet: Habitat loss and fragmentation, Over-exploitation, Alien species invasion, Co-extinctions.',
          'Conservation: In-situ (National parks, Sanctuaries, Biosphere reserves); Ex-situ (Botanical gardens, Cryopreservation, Seed banks).'
        ]
      }
    ]
  },
  {
    id: 'ncert-leph1',
    title: 'NCERT Physics Part I & II (Class XII)',
    code: 'leph1',
    classLevel: 'Class 12',
    stream: 'Science',
    subject: 'Physics',
    edition: 'Official NCERT Standard Edition',
    totalChapters: 14,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?leph1=0-8',
    description: 'Comprehensive official NCERT physics textbook for Class 12, NEET UG, and JEE Main. Encompasses Electrostatics, Magnetism, Optics, and Modern Physics.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Electric Charges and Fields',
        code: 'leph101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph1=1-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph1=1-8',
        summary: 'Coulomb’s law, superposition principle, electric field lines, electric dipole in uniform field, Gauss’s theorem and its applications.',
        keyPoints: [
          'Coulomb’s force: F = (1 / 4 pi epsilon_0) * (q1 * q2 / r^2).',
          'Gauss’s law: Flux Phi = Closed-integral(E . dA) = q_enclosed / epsilon_0.',
          'Electric field due to infinite straight wire: E = lambda / (2 pi epsilon_0 r).'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Electrostatic Potential and Capacitance',
        code: 'leph102',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph1=2-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph1=2-8',
        summary: 'Electric potential, equipotential surfaces, potential energy of system of charges, parallel plate capacitor, dielectrics and polarization, energy stored in capacitor.',
        keyPoints: [
          'Potential due to point charge: V = q / (4 pi epsilon_0 r).',
          'Parallel plate capacitor: C = epsilon_0 * A / d; with dielectric: C = K * C_0.',
          'Energy stored: U = 1/2 C V^2 = 1/2 Q^2 / C = 1/2 Q V.'
        ]
      },
      {
        chapterNumber: 3,
        title: 'Current Electricity',
        code: 'leph103',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph1=3-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph1=3-8',
        summary: 'Ohm’s law, drift velocity and mobility, resistivity temperature dependence, Kirchhoff’s circuit rules, Wheatstone bridge, EMF and internal resistance.',
        keyPoints: [
          'Drift velocity: v_d = -e E tau / m; Current I = n A e v_d.',
          'Kirchhoff’s laws: Current law (charge conservation) and Voltage law (energy conservation).',
          'Wheatstone bridge balanced condition: R1 / R2 = R3 / R4.'
        ]
      },
      {
        chapterNumber: 4,
        title: 'Moving Charges and Magnetism',
        code: 'leph104',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph1=4-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph1=4-8',
        summary: 'Biot-Savart law, magnetic field on axis of circular loop, Ampere’s circuital law, solenoid and toroid, Lorentz magnetic force, cyclotron radius, moving coil galvanometer.',
        keyPoints: [
          'Biot-Savart: dB = (mu_0 / 4 pi) * (I dl x r) / r^3.',
          'Lorentz force: F = q(E + v x B); circular orbit radius r = m v / (q B).',
          'Galvanometer into ammeter: shunt S in parallel; into voltmeter: high series resistance R.'
        ]
      },
      {
        chapterNumber: 5,
        title: 'Magnetism and Matter',
        code: 'leph105',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph1=5-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph1=5-8',
        summary: 'Magnetic dipole moment, magnetic field of bar magnet, Gauss’s law for magnetism, magnetic elements of Earth, diamagnetism, paramagnetism, and ferromagnetism.',
        keyPoints: [
          'Gauss’s law for magnetism: Closed-integral(B . dA) = 0 (no isolated magnetic monopoles).',
          'Curie’s law for paramagnetism: chi = C / T.',
          'Ferromagnetic domains and hysteresis loop characteristics.'
        ]
      },
      {
        chapterNumber: 6,
        title: 'Electromagnetic Induction',
        code: 'leph106',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph1=6-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph1=6-8',
        summary: 'Faraday’s laws of induction, Lenz’s law, motional EMF in conductors, eddy currents, self-inductance, mutual inductance, AC generator.',
        keyPoints: [
          'Faraday’s law: Induced emf e = -dPhi / dt (minus sign indicates Lenz’s law conservation of energy).',
          'Motional EMF: e = B * v * l.',
          'Self-inductance of solenoid: L = mu_0 * n^2 * A * l; Energy stored U = 1/2 L I^2.'
        ]
      },
      {
        chapterNumber: 7,
        title: 'Alternating Current',
        code: 'leph107',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph1=7-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph1=7-8',
        summary: 'Peak and RMS current, AC circuits with R, L, C, series LCR resonant circuit, quality factor Q, power in AC circuits and power factor, transformers.',
        keyPoints: [
          'RMS value: I_rms = I_0 / sqrt(2) = 0.707 I_0.',
          'Series LCR resonance frequency: omega_r = 1 / sqrt(L C); Impedance Z = sqrt(R^2 + (X_L - X_C)^2).',
          'Transformer ratio: V_s / V_p = N_s / N_p = I_p / I_s.'
        ]
      },
      {
        chapterNumber: 8,
        title: 'Electromagnetic Waves',
        code: 'leph108',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph1=8-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph1=8-8',
        summary: 'Displacement current, Maxwell’s equations, transverse electromagnetic waves, electromagnetic spectrum from radio to gamma rays and their applications.',
        keyPoints: [
          'Displacement current: I_d = epsilon_0 * (dPhi_E / dt).',
          'Speed of light in vacuum: c = 1 / sqrt(mu_0 * epsilon_0) = E_0 / B_0 = 3 x 10^8 m/s.',
          'EM spectrum order: Radio, Micro, Infrared, Visible, Ultraviolet, X-rays, Gamma rays.'
        ]
      },
      {
        chapterNumber: 9,
        title: 'Ray Optics and Optical Instruments',
        code: 'leph201',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph2=1-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph2=1-6',
        summary: 'Reflection, refraction at spherical surfaces, total internal reflection, lens maker’s formula, prism deviation, compound microscope, and astronomical telescope.',
        keyPoints: [
          'Lens Maker’s Formula: 1/f = (mu - 1) * (1/R1 - 1/R2).',
          'TIR critical angle: sin(i_c) = 1 / mu.',
          'Compound microscope magnifying power: m = -(L / f_o) * (1 + D / f_e).'
        ]
      },
      {
        chapterNumber: 10,
        title: 'Wave Optics',
        code: 'leph202',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph2=2-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph2=2-6',
        summary: 'Huygens’ principle, reflection and refraction proof using wave theory, Young’s double slit interference, fringe width formula, single-slit diffraction.',
        keyPoints: [
          'Huygens: Every point on a wavefront acts as a secondary source of spherical wavelets.',
          'YDSE fringe width: beta = lambda * D / d.',
          'Single slit diffraction minima condition: a * sin(theta) = n * lambda.'
        ]
      },
      {
        chapterNumber: 11,
        title: 'Dual Nature of Radiation and Matter',
        code: 'leph203',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph2=3-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph2=3-6',
        summary: 'Photoelectric effect experiments, Einstein photoelectric equation, stopping potential, work function, de Broglie matter waves, Davisson-Germer experiment.',
        keyPoints: [
          'Einstein equation: K_max = h * nu - phi_0 = e * V_0.',
          'de Broglie wavelength: lambda = h / p = h / (m v) = h / sqrt(2 m q V).',
          'For electron accelerated by V volts: lambda = 1.227 / sqrt(V) nm.'
        ]
      },
      {
        chapterNumber: 12,
        title: 'Atoms',
        code: 'leph204',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph2=4-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph2=4-6',
        summary: 'Alpha particle scattering, Rutherford nuclear model, Bohr model of hydrogen atom, energy levels, Rydberg formula, spectral series (Lyman, Balmer, Paschen).',
        keyPoints: [
          'Bohr angular momentum quantization: m * v * r = n * h / (2 pi).',
          'Hydrogen energy levels: E_n = -13.6 / n^2 eV; Bohr radius r_n = 0.529 * n^2 Angstrom.',
          'Balmer series lines fall in the visible spectrum (n1 = 2, n2 = 3, 4, ...).'
        ]
      },
      {
        chapterNumber: 13,
        title: 'Nuclei',
        code: 'leph205',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph2=5-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph2=5-6',
        summary: 'Nuclear composition, mass defect and binding energy per nucleon curve, nuclear forces, nuclear fission and fusion in stellar cores.',
        keyPoints: [
          'Nuclear radius: R = R_0 * A^(1/3) where R_0 approx 1.2 x 10^-15 m.',
          'Einstein mass-energy equivalence: E = Delta m * c^2 (1 amu approx 931.5 MeV).',
          'Binding energy per nucleon peaks around Fe-56 (~8.75 MeV/nucleon).'
        ]
      },
      {
        chapterNumber: 14,
        title: 'Semiconductor Electronics',
        code: 'leph206',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leph2=6-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leph2=6-6',
        summary: 'Energy bands in solids, intrinsic and extrinsic semiconductors (p-type and n-type), p-n junction diode forward and reverse bias, half and full wave rectifiers.',
        keyPoints: [
          'Intrinsic carrier density: n_e * n_h = n_i^2.',
          'p-n junction: barrier potential and depletion layer formed by diffusion and drift.',
          'Full wave rectifier uses two center-tapped diodes; efficiency up to 81.2%.'
        ]
      }
    ]
  },
  {
    id: 'ncert-lech1',
    title: 'NCERT Chemistry Part I & II (Class XII)',
    code: 'lech1',
    classLevel: 'Class 12',
    stream: 'Science',
    subject: 'Chemistry',
    edition: 'Official NCERT National Curriculum Edition',
    totalChapters: 10,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?lech1=0-5',
    description: 'The definitive NCERT chemistry text covering Solutions, Electrochemistry, Kinetics, Coordination Compounds, and Organic Reaction Mechanisms.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Solutions',
        code: 'lech101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lech1=1-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lech1=1-5',
        summary: 'Henry’s law, Raoult’s law for ideal and non-ideal solutions, colligative properties (elevation of boiling point, depression of freezing point, osmotic pressure), van’t Hoff factor i.',
        keyPoints: [
          'Raoult’s law: P_total = P_A^0 * x_A + P_B^0 * x_B.',
          'Colligative properties: Delta T_b = K_b * m; Delta T_f = K_f * m; pi = i * C * R * T.',
          'Van’t Hoff factor i = normal molar mass / abnormal molar mass.'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Electrochemistry',
        code: 'lech102',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lech1=2-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lech1=2-5',
        summary: 'Galvanic cells, standard hydrogen electrode, Nernst equation, conductance, Kohlrausch’s law of independent migration of ions, Faraday’s laws of electrolysis, batteries.',
        keyPoints: [
          'Nernst equation: E_cell = E^0_cell - (0.0591 / n) * log(Q) at 298 K.',
          'Delta G^0 = -n * F * E^0_cell = -2.303 R T log(K_c).',
          'Kohlrausch’s law: Limiting molar conductivity is sum of individual ionic conductivities.'
        ]
      },
      {
        chapterNumber: 3,
        title: 'Chemical Kinetics',
        code: 'lech103',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lech1=3-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lech1=3-5',
        summary: 'Rate of reaction, order and molecularity, integrated rate equations for zero and first order reactions, half-life period, Arrhenius equation for activation energy.',
        keyPoints: [
          'First order rate law: k = (2.303 / t) * log(a / (a - x)); Half-life t_1/2 = 0.693 / k.',
          'Arrhenius equation: k = A * exp(-E_a / (R T)); log(k2/k1) = (E_a / 2.303 R) * (T2 - T1) / (T1 T2).',
          'Molecularity is always an integer; order can be fractional or zero.'
        ]
      },
      {
        chapterNumber: 4,
        title: 'The d- and f-Block Elements',
        code: 'lech104',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lech1=4-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lech1=4-5',
        summary: 'Electronic configuration, ionization enthalpies, variable oxidation states, catalytic properties, magnetic moments (spin-only formula), lanthanoid contraction, KMnO4 and K2Cr2O7.',
        keyPoints: [
          'Spin-only magnetic moment: mu = sqrt(n * (n + 2)) Bohr Magnetons (BM).',
          'Lanthanoid contraction caused by poor shielding of 4f electrons.',
          'KMnO4 in acidic medium is reduced from Mn(+7) to Mn(+2), equivalent weight = M / 5.'
        ]
      },
      {
        chapterNumber: 5,
        title: 'Coordination Compounds',
        code: 'lech105',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lech1=5-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lech1=5-5',
        summary: 'Werner’s theory, IUPAC nomenclature of coordination complexes, isomerism (structural and stereoisomerism), Valence Bond Theory, and Crystal Field Theory (octahedral and tetrahedral splitting).',
        keyPoints: [
          'Spectrochemical series: strong field ligands (CN-, CO) produce large Delta_o and force pairing.',
          'Crystal field splitting: Octahedral splits into lower t2g (3 orbitals) and higher eg (2 orbitals).',
          'Synergic bonding in metal carbonyls strengthens the M-C bond.'
        ]
      },
      {
        chapterNumber: 6,
        title: 'Haloalkanes and Haloarenes',
        code: 'lech201',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lech2=1-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lech2=1-5',
        summary: 'SN1 and SN2 mechanisms, stereochemical inversion vs racemization, elimination reactions (Zaitsev rule), organometallic Grignard reagents, electrophilic substitution in haloarenes.',
        keyPoints: [
          'SN2: Biomolecular, single-step, backside attack with Walden inversion (reactivity: 1° > 2° > 3°).',
          'SN1: Carbocation intermediate, two steps, racemization (reactivity: 3° > 2° > 1°).',
          'Haloarenes are less reactive towards nucleophilic substitution due to resonance stabilization.'
        ]
      },
      {
        chapterNumber: 7,
        title: 'Alcohols, Phenols and Ethers',
        code: 'lech202',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lech2=2-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lech2=2-5',
        summary: 'Acidic nature of phenols vs alcohols, Lucas test, hydroboration-oxidation, Kolbe’s reaction, Reimer-Tiemann reaction, Williamson ether synthesis.',
        keyPoints: [
          'Reimer-Tiemann: Phenol + CHCl3 + aq NaOH yields Salicylaldehyde.',
          'Kolbe’s reaction: Phenol + NaOH + CO2 at 400 K and 4-7 atm yields Salicylic acid.',
          'Williamson synthesis: R-X + R\'-ONa -> R-O-R\' (best with 1° alkyl halide).'
        ]
      },
      {
        chapterNumber: 8,
        title: 'Aldehydes, Ketones and Carboxylic Acids',
        code: 'lech203',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lech2=3-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lech2=3-5',
        summary: 'Nucleophilic addition reactions, Tollens’ and Fehling’s tests, Aldol condensation, Cannizzaro reaction, Hell-Volhard-Zelinsky (HVZ) reaction, acidity of carboxylic acids.',
        keyPoints: [
          'Aldol: Carbonyl compounds with alpha-hydrogen in dilute alkali undergo aldol addition.',
          'Cannizzaro: Carbonyls without alpha-hydrogen (HCHO, PhCHO) undergo disproportionation in conc. alkali.',
          'Tollens’ test gives silver mirror for aldehydes; Fehling’s gives red Cu2O precipitate.'
        ]
      },
      {
        chapterNumber: 9,
        title: 'Amines',
        code: 'lech204',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lech2=4-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lech2=4-5',
        summary: 'Basicity of aliphatic and aromatic amines, Gabriel phthalimide synthesis, Hoffmann bromamide degradation, carbylamine test, Hinsberg test, and diazonium salts coupling.',
        keyPoints: [
          'Hoffmann bromamide: RCONH2 + Br2 + 4KOH -> RNH2 (primary amine with one less carbon).',
          'Carbylamine test: Primary amines heated with CHCl3 and alc. KOH give foul-smelling isocyanides.',
          'Hinsberg reagent (benzene sulfonyl chloride) distinguishes 1°, 2°, and 3° amines.'
        ]
      },
      {
        chapterNumber: 10,
        title: 'Biomolecules',
        code: 'lech205',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lech2=5-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lech2=5-5',
        summary: 'Monosaccharides (glucose and fructose ring structures, mutarotation), proteins (peptide bond, primary to quaternary structure, denaturation), nucleic acids (DNA/RNA bases), and vitamins.',
        keyPoints: [
          'D-glucose: Haworth pyranose projection, alpha and beta anomers at C1 hemiacetal carbon.',
          'Denaturation disrupts secondary and tertiary structures of proteins, leaving primary intact.',
          'DNA bases: Adenine, Thymine, Guanine, Cytosine; RNA replaces Thymine with Uracil.'
        ]
      }
    ]
  },
  {
    id: 'ncert-lemh1',
    title: 'NCERT Mathematics Part I & II (Class XII)',
    code: 'lemh1',
    classLevel: 'Class 12',
    stream: 'Science',
    subject: 'Mathematics',
    edition: 'Official NCERT Core Curriculum',
    totalChapters: 13,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?lemh1=0-6',
    description: 'Official Class 12 NCERT Mathematics textbook covering Calculus, Vectors, 3D Geometry, Linear Programming, and Probability.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Relations and Functions',
        code: 'lemh101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh1=1-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh1=1-6',
        summary: 'Types of relations (reflexive, symmetric, transitive, equivalence), types of functions (injective, surjective, bijective), and invertible functions.',
        keyPoints: ['Equivalence relation is reflexive, symmetric, and transitive.', 'Bijective function is both one-one and onto.']
      },
      {
        chapterNumber: 2,
        title: 'Inverse Trigonometric Functions',
        code: 'lemh102',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh1=2-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh1=2-6',
        summary: 'Principal value branches, graphs of inverse trigonometric functions, and algebraic evaluation properties.',
        keyPoints: ['Principal branch for sin^-1 is [-pi/2, pi/2]; for cos^-1 is [0, pi]; for tan^-1 is (-pi/2, pi/2).']
      },
      {
        chapterNumber: 3,
        title: 'Matrices',
        code: 'lemh103',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh1=3-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh1=3-6',
        summary: 'Matrix operations, matrix multiplication properties, transpose, symmetric and skew-symmetric matrices, elementary row operations.',
        keyPoints: ['AB != BA in general.', 'A matrix can be uniquely expressed as sum of symmetric and skew-symmetric matrices.']
      },
      {
        chapterNumber: 4,
        title: 'Determinants',
        code: 'lemh104',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh1=4-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh1=4-6',
        summary: 'Minors, cofactors, adjoint and inverse of square matrix, solving systems of linear equations using matrix method (A X = B).',
        keyPoints: ['A^-1 = adj(A) / det(A). System is consistent with unique solution if det(A) != 0.']
      },
      {
        chapterNumber: 5,
        title: 'Continuity and Differentiability',
        code: 'lemh105',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh1=5-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh1=5-6',
        summary: 'Continuity at a point, differentiability, chain rule, derivatives of inverse trigonometric and implicit functions, logarithmic differentiation.',
        keyPoints: ['Every differentiable function is continuous, but converse is not necessarily true.']
      },
      {
        chapterNumber: 6,
        title: 'Application of Derivatives',
        code: 'lemh106',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh1=6-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh1=6-6',
        summary: 'Rate of change of quantities, strictly increasing and decreasing functions, maxima and minima, first and second derivative tests.',
        keyPoints: ['f(x) increasing where f\'(x) >= 0.', 'Local extrema: f\'(c) = 0 and sign of f\'\'(c) determines min/max.']
      },
      {
        chapterNumber: 7,
        title: 'Integrals',
        code: 'lemh201',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh2=1-7',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh2=1-7',
        summary: 'Integration by substitution, partial fractions, integration by parts, fundamental theorem of calculus, properties of definite integrals.',
        keyPoints: ['Integration by parts: integral(u v dx) = u integral(v dx) - integral(u\' integral(v dx) dx).', 'Definite integral properties like King\'s rule.']
      },
      {
        chapterNumber: 8,
        title: 'Application of Integrals',
        code: 'lemh202',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh2=2-7',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh2=2-7',
        summary: 'Area bounded by curves (parabolas, ellipses, circles, straight lines) using definite integrals.',
        keyPoints: ['Area under curve y = f(x) from x = a to b is integral from a to b of |f(x)| dx.']
      },
      {
        chapterNumber: 9,
        title: 'Differential Equations',
        code: 'lemh203',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh2=3-7',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh2=3-7',
        summary: 'Order and degree, variable separable method, homogeneous differential equations, first order linear differential equations (I.F. method).',
        keyPoints: ['Linear differential equation: dy/dx + P y = Q; Integrating factor I.F. = exp(integral(P dx)).']
      },
      {
        chapterNumber: 10,
        title: 'Vector Algebra',
        code: 'lemh204',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh2=4-7',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh2=4-7',
        summary: 'Position vectors, dot (scalar) product, cross (vector) product, projection of vector on a line, scalar triple product.',
        keyPoints: ['a . b = |a||b| cos(theta); a x b = |a||b| sin(theta) n_hat.', 'Two non-zero vectors orthogonal if a . b = 0.']
      },
      {
        chapterNumber: 11,
        title: 'Three Dimensional Geometry',
        code: 'lemh205',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh2=5-7',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh2=5-7',
        summary: 'Direction cosines and direction ratios of lines, equation of a line in space, shortest distance between skew lines, plane geometry.',
        keyPoints: ['Shortest distance between skew lines r = a1 + lambda b1 and r = a2 + mu b2 is |(b1 x b2) . (a2 - a1)| / |b1 x b2|.']
      },
      {
        chapterNumber: 12,
        title: 'Linear Programming',
        code: 'lemh206',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh2=6-7',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh2=6-7',
        summary: 'Mathematical formulation of linear programming problem, graphical solution method, bounded and unbounded feasible regions.',
        keyPoints: ['Corner Point Method: Optimal value of objective function Z occurs at one of the vertices of the feasible region.']
      },
      {
        chapterNumber: 13,
        title: 'Probability',
        code: 'lemh207',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lemh2=7-7',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lemh2=7-7',
        summary: 'Conditional probability P(A|B), multiplication theorem, independent events, Bayes’ theorem, random variable and probability distribution.',
        keyPoints: ['Bayes’ theorem calculates posterior probability given evidence.', 'Independent events: P(A cap B) = P(A) * P(B).']
      }
    ]
  },

  // =========================================================================
  // CLASS 12 COMMERCE (Accountancy, Business Studies, Economics)
  // =========================================================================
  {
    id: 'ncert-leac1',
    title: 'NCERT Accountancy: Company Accounts & Analysis (Class XII)',
    code: 'leac1',
    classLevel: 'Class 12',
    stream: 'Commerce',
    subject: 'Accountancy',
    edition: 'Official NCERT National Commerce Framework',
    totalChapters: 8,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?leac1=0-5',
    description: 'Core official NCERT textbook for CBSE Class 12 Commerce and CA Foundation aspirants covering Company Accounts, Share Capital, Debentures, and Financial Analysis.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Accounting for Share Capital',
        code: 'leac101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leac1=1-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leac1=1-5',
        summary: 'Categories of share capital, issue of shares at par and premium, calls in arrears, pro-rata allotment in over-subscription, forfeiture and re-issue of shares.',
        keyPoints: [
          'Securities Premium Reserve can only be utilized for specified purposes under Section 52(2) of Companies Act 2013.',
          'Pro-rata allotment: Surplus application money adjusted toward allotment and calls.',
          'Profit on reissue of forfeited shares is transferred to Capital Reserve account.'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Issue and Redemption of Debentures',
        code: 'leac102',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leac1=2-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leac1=2-5',
        summary: 'Debentures meaning, issue of debentures as collateral security, terms of issue regarding redemption, writing off discount/loss on issue of debentures.',
        keyPoints: [
          'Debentures as collateral security: Debenture Suspense Account method vs memo method.',
          'Loss on issue of debentures written off from Securities Premium or Statement of Profit & Loss.'
        ]
      },
      {
        chapterNumber: 3,
        title: 'Financial Statements of a Company',
        code: 'leac201',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leac2=1-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leac2=1-5',
        summary: 'Schedule III Part I and Part II format, Balance Sheet and Statement of Profit and Loss presentation requirements.',
        keyPoints: [
          'Vertical format: Equity and Liabilities (Shareholders’ Funds, Non-Current Liabilities, Current Liabilities) and Assets (Non-Current, Current).',
          'Operating cycle determination.'
        ]
      },
      {
        chapterNumber: 4,
        title: 'Analysis of Financial Statements & Accounting Ratios',
        code: 'leac202',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leac2=2-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leac2=2-5',
        summary: 'Liquidity ratios (Current, Quick), Solvency ratios (Debt-to-Equity, Total Assets to Debt, Interest Coverage), Activity/Turnover ratios, Profitability ratios.',
        keyPoints: [
          'Current Ratio = Current Assets / Current Liabilities (Ideal 2:1); Quick Ratio ideal 1:1.',
          'Debt-Equity Ratio = Long-Term Debt / Shareholders’ Funds (Ideal 2:1).',
          'Inventory Turnover Ratio = Cost of Revenue from Operations / Average Inventory.'
        ]
      },
      {
        chapterNumber: 5,
        title: 'Cash Flow Statement (AS-3)',
        code: 'leac203',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leac2=3-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leac2=3-5',
        summary: 'Operating, Investing, and Financing activities classification, indirect method of cash flow calculation, non-cash transactions.',
        keyPoints: [
          'Operating activities: Adjust net profit for non-cash and non-operating items and working capital changes.',
          'Investing: Sale/purchase of fixed assets, interest/dividend received.',
          'Financing: Issue of shares/debentures, repayment of loans, dividend/interest paid.'
        ]
      }
    ]
  },
  {
    id: 'ncert-lebs1',
    title: 'NCERT Business Studies Part I & II (Class XII)',
    code: 'lebs1',
    classLevel: 'Class 12',
    stream: 'Commerce',
    subject: 'Business Studies',
    edition: 'Official NCERT Management Studies Edition',
    totalChapters: 12,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?lebs1=0-8',
    description: 'Comprehensive NCERT Business Studies textbook covering Principles and Functions of Management, Financial Management, Marketing, and Consumer Protection.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Nature and Significance of Management',
        code: 'lebs101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebs1=1-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebs1=1-8',
        summary: 'Management characteristics, objectives, importance, management as art, science, and profession, levels of management, coordination as essence.',
        keyPoints: ['Efficiency (cost minimization) vs Effectiveness (achieving goals on time).', 'Top, Middle, and Supervisory management responsibilities.']
      },
      {
        chapterNumber: 2,
        title: 'Principles of Management',
        code: 'lebs102',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebs1=2-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebs1=2-8',
        summary: 'Fayol’s 14 administrative principles (Division of Work, Unity of Command, Scalar Chain, etc.) and Taylor’s Scientific Management principles.',
        keyPoints: [
          'Unity of Command vs Unity of Direction.',
          'Scalar chain and Gang Plank emergency communication bridge.',
          'Taylor scientific techniques: Functional foremanship, time study, motion study, differential piece wage system.'
        ]
      },
      {
        chapterNumber: 3,
        title: 'Business Environment',
        code: 'lebs103',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebs1=3-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebs1=3-8',
        summary: 'Dimensions of business environment (Economic, Social, Technological, Political, Legal) and impact of 1991 economic reforms.',
        keyPoints: ['LPG reforms: Liberalisation, Privatisation, and Globalisation.']
      },
      {
        chapterNumber: 4,
        title: 'Planning and Organising',
        code: 'lebs104',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebs1=4-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebs1=4-8',
        summary: 'Planning process, types of plans (objectives, policies, procedures, rules), organisational structures (functional vs divisional), delegation vs decentralisation.',
        keyPoints: [
          'Elements of delegation: Authority, Responsibility, and Accountability (accountability cannot be delegated).',
          'Functional structure suits single product line; divisional suits multi-product conglomerates.'
        ]
      },
      {
        chapterNumber: 5,
        title: 'Financial Management & Financial Markets',
        code: 'lebs201',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebs2=1-4',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebs2=1-4',
        summary: 'Financial decisions (Investment, Financing, Dividend), financial planning, capital structure (trading on equity), money market vs capital market, SEBI regulatory functions.',
        keyPoints: [
          'Trading on Equity increases return on equity using cheaper debt when ROCE > cost of debt.',
          'Money market instruments: Treasury bills, Commercial paper, Call money, Certificate of deposit.',
          'SEBI regulates stock exchanges and protects investor rights.'
        ]
      },
      {
        chapterNumber: 6,
        title: 'Marketing Management & Consumer Protection',
        code: 'lebs202',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lebs2=2-4',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lebs2=2-4',
        summary: 'Marketing philosophies, 4 Ps of marketing mix (Product, Price, Place, Promotion), Consumer Protection Act 2019 three-tier redressal machinery.',
        keyPoints: [
          'Product mix: branding, packaging, labelling. Promotion mix: advertising, personal selling, sales promotion, PR.',
          'Consumer redressal forums: District Commission (claims up to 1 Cr), State (1 to 10 Cr), National (>10 Cr).'
        ]
      }
    ]
  },
  {
    id: 'ncert-leec1',
    title: 'NCERT Introductory Macroeconomics (Class XII)',
    code: 'leec1',
    classLevel: 'Class 12',
    stream: 'Commerce',
    subject: 'Economics',
    edition: 'Official NCERT Economics Curriculum',
    totalChapters: 6,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?leec1=0-6',
    description: 'National Income Accounting, Money and Banking (RBI monetary tools), Aggregate Demand and Employment, Government Budget, and Balance of Payments.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'National Income Accounting',
        code: 'leec101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leec1=1-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leec1=1-6',
        summary: 'Circular flow of income, three methods of calculating national income (Value Added, Income, Expenditure), GDP deflator, real vs nominal GDP.',
        keyPoints: [
          'GDP_mp to NNP_fc conversions using Depreciation, NFIA, and Net Indirect Taxes (NIT).',
          'Expenditure method: GDP_mp = C + I + G + (X - M).',
          'Transfer payments (old-age pensions, scholarships) are excluded from national income.'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Money and Banking',
        code: 'leec102',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leec1=2-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leec1=2-6',
        summary: 'Functions of money, money creation by commercial banking system, money multiplier (1/LRR), RBI quantitative and qualitative monetary policy tools.',
        keyPoints: [
          'Credit creation formula: Total Deposits = Primary Deposits * (1 / LRR).',
          'RBI quantitative tools: Repo rate, Reverse repo, CRR, SLR, Open Market Operations (OMO).',
          'Qualitative tools: Margin requirements, moral suasion, selective credit controls.'
        ]
      },
      {
        chapterNumber: 3,
        title: 'Determination of Income and Employment',
        code: 'leec103',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leec1=3-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leec1=3-6',
        summary: 'Aggregate Demand and Aggregate Supply, propensity to consume (MPC, APC) and save (MPS, APS), investment multiplier, deflationary and inflationary gaps.',
        keyPoints: [
          'MPC + MPS = 1; APC + APS = 1.',
          'Investment multiplier: k = 1 / (1 - MPC) = 1 / MPS = Delta Y / Delta I.',
          'Inflationary gap is corrected by decreasing government spending and raising interest rates.'
        ]
      },
      {
        chapterNumber: 4,
        title: 'Government Budget and the Economy',
        code: 'leec104',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leec1=4-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leec1=4-6',
        summary: 'Objectives of budget, revenue receipts vs capital receipts, revenue expenditure vs capital expenditure, Fiscal Deficit, Revenue Deficit, Primary Deficit.',
        keyPoints: [
          'Fiscal Deficit = Total Expenditure - Total Receipts excluding borrowings (measures total borrowings required).',
          'Primary Deficit = Fiscal Deficit - Interest Payments.'
        ]
      },
      {
        chapterNumber: 5,
        title: 'Balance of Payments and Foreign Exchange',
        code: 'leec105',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leec1=5-6',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leec1=5-6',
        summary: 'Current account and capital account components, autonomous vs accommodating items, flexible, fixed, and managed floating exchange rate systems.',
        keyPoints: [
          'Current account records export/import of goods, services, and unilateral transfers.',
          'Accommodating transactions are undertaken to bridge deficit or surplus in BOP.'
        ]
      }
    ]
  },

  // =========================================================================
  // CLASS 10 (SCIENCE, MATHEMATICS, SOCIAL SCIENCE, ENGLISH, COMPUTER)
  // =========================================================================
  {
    id: 'ncert-jesc1',
    title: 'NCERT Science (Class X)',
    code: 'jesc1',
    classLevel: 'Class 10',
    stream: 'Science',
    subject: 'Science',
    edition: 'Official NCERT Secondary Framework',
    totalChapters: 13,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?jesc1=0-13',
    description: 'Foundational secondary school science text covering Chemical Reactions, Acids Bases & Salts, Life Processes, Heredity, Light, Electricity, and Environment.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Chemical Reactions and Equations',
        code: 'jesc101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jesc1=1-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jesc1=1-13',
        summary: 'Balancing chemical equations, combination, decomposition, displacement, double displacement, precipitation, oxidation and reduction, corrosion and rancidity.',
        keyPoints: [
          'Balancing obeys Law of Conservation of Mass.',
          'Thermal, electrolytic, and photolytic decomposition reactions.',
          'Redox: Oxidation is gain of oxygen / loss of electrons; reduction is loss of oxygen / gain of electrons.'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Acids, Bases and Salts',
        code: 'jesc102',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jesc1=2-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jesc1=2-13',
        summary: 'Acid-base indicators, neutralization reactions, pH scale and everyday importance, preparation and uses of Bleaching Powder, Baking Soda, Washing Soda, and Plaster of Paris.',
        keyPoints: [
          'pH = -log[H+]; acidic if pH < 7, basic if pH > 7.',
          'Plaster of Paris: CaSO4 . 1/2 H2O obtained by heating gypsum CaSO4 . 2 H2O at 373 K.',
          'Chlor-alkali process produces NaOH, Cl2, and H2 from brine.'
        ]
      },
      {
        chapterNumber: 3,
        title: 'Metals and Non-metals',
        code: 'jesc103',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jesc1=3-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jesc1=3-13',
        summary: 'Physical and chemical properties, reactivity series, formation and properties of ionic compounds, metallurgy (roasting and calcination), refining and corrosion prevention.',
        keyPoints: [
          'Reactivity series order: K > Na > Ca > Mg > Al > Zn > Fe > Pb > [H] > Cu > Hg > Ag > Au.',
          'Roasting heats sulfide ores in excess air; calcination heats carbonate ores in limited air.'
        ]
      },
      {
        chapterNumber: 4,
        title: 'Carbon and its Compounds',
        code: 'jesc104',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jesc1=4-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jesc1=4-13',
        summary: 'Covalent bonding, tetravalency and catenation, saturated vs unsaturated hydrocarbons, homologous series, functional groups, combustion, saponification, micelles.',
        keyPoints: [
          'Catenation: Carbon self-linking property forming chains, branches, and rings.',
          'Saponification: Ester + NaOH -> Soap (sodium salt of fatty acid) + Alcohol.',
          'Micelles have hydrophobic hydrocarbon tail pointing inwards and hydrophilic ionic head pointing outwards.'
        ]
      },
      {
        chapterNumber: 5,
        title: 'Life Processes',
        code: 'jesc105',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jesc1=5-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jesc1=5-13',
        summary: 'Autotrophic and heterotrophic nutrition, human digestive system, respiration (aerobic vs anaerobic in yeast and muscle cells), double circulation in human heart, excretion in nephron.',
        keyPoints: [
          'Anaerobic respiration in muscle cells produces lactic acid causing muscle cramps.',
          'Double circulation: Pulmonary circulation to lungs and systemic circulation to body tissues.',
          'Nephron: Glomerular ultrafiltration, tubular reabsorption (glucose, amino acids, water), secretion.'
        ]
      },
      {
        chapterNumber: 6,
        title: 'Control and Coordination',
        code: 'jesc106',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jesc1=6-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jesc1=6-13',
        summary: 'Neuron structure, reflex arc, human brain (forebrain, midbrain, hindbrain), plant tropisms (phototropism, geotropism), phytohormones (auxin, gibberellin, cytokinin, ABA), endocrine glands.',
        keyPoints: [
          'Auxin promotes cell elongation and phototropic curvature towards light.',
          'Abscisic acid (ABA) is a growth inhibitor causing wilting of leaves.',
          'Insulin from pancreas regulates blood sugar levels.'
        ]
      },
      {
        chapterNumber: 7,
        title: 'Light - Reflection and Refraction',
        code: 'jesc109',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jesc1=9-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jesc1=9-13',
        summary: 'Spherical mirrors (concave and convex ray diagrams), mirror formula, magnification, Snell’s law of refraction, refractive index, lens formula, power of lens.',
        keyPoints: [
          'Mirror formula: 1/f = 1/v + 1/u; Magnification m = -v/u.',
          'Lens formula: 1/f = 1/v - 1/u; Magnification m = +v/u.',
          'Power of lens: P = 1 / f (in meters), unit is Dioptre (D).'
        ]
      },
      {
        chapterNumber: 8,
        title: 'Electricity',
        code: 'jesc111',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jesc1=11-13',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jesc1=11-13',
        summary: 'Electric current and potential difference, Ohm’s law, factors affecting resistance, series and parallel resistor combinations, Joule’s law of heating, electric power.',
        keyPoints: [
          'Ohm’s law: V = I * R; Resistance R = rho * l / A.',
          'Series: R_eq = R1 + R2 + ... ; Parallel: 1/R_eq = 1/R1 + 1/R2 + ...',
          'Joule’s heating: H = I^2 * R * t; Electric power P = V * I = I^2 * R = V^2 / R.'
        ]
      }
    ]
  },
  {
    id: 'ncert-jemh1',
    title: 'NCERT Mathematics (Class X)',
    code: 'jemh1',
    classLevel: 'Class 10',
    stream: 'Science',
    subject: 'Mathematics',
    edition: 'Official NCERT Secondary Standard',
    totalChapters: 14,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?jemh1=0-14',
    description: 'Class 10 NCERT Mathematics covering Real Numbers, Polynomials, Linear Equations, Quadratic Equations, Trigonometry, and Coordinate Geometry.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Real Numbers & Polynomials',
        code: 'jemh101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jemh1=1-14',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jemh1=1-14',
        summary: 'Fundamental Theorem of Arithmetic, HCF and LCM product relationship, proofs of irrationality, zeroes of polynomials and coefficient relations.',
        keyPoints: [
          'HCF(a, b) * LCM(a, b) = a * b.',
          'For ax^2 + bx + c: sum of zeroes alpha + beta = -b/a, product alpha * beta = c/a.'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Pair of Linear Equations in Two Variables',
        code: 'jemh103',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jemh1=3-14',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jemh1=3-14',
        summary: 'Graphical and algebraic methods (substitution, elimination), consistency conditions (a1/a2 != b1/b2 unique; a1/a2 = b1/b2 = c1/c2 infinite; a1/a2 = b1/b2 != c1/c2 no solution).',
        keyPoints: ['Intersecting lines (unique solution), coincident lines (infinitely many), parallel lines (inconsistent).']
      },
      {
        chapterNumber: 3,
        title: 'Quadratic Equations & Arithmetic Progressions',
        code: 'jemh104',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jemh1=4-14',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jemh1=4-14',
        summary: 'Standard quadratic form, quadratic formula x = (-b +- sqrt(D)) / 2a, nature of roots (D > 0, D = 0, D < 0), AP nth term a_n = a + (n-1)d, sum of n terms S_n.',
        keyPoints: [
          'Discriminant D = b^2 - 4ac. Real distinct roots if D > 0; equal roots if D = 0.',
          'AP sum formula: S_n = n/2 * (2a + (n-1)d) = n/2 * (a + l).'
        ]
      },
      {
        chapterNumber: 4,
        title: 'Introduction to Trigonometry & Applications',
        code: 'jemh108',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jemh1=8-14',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jemh1=8-14',
        summary: 'Trigonometric ratios of acute angles, standard angles (0°, 30°, 45°, 60°, 90°), fundamental identity sin^2 + cos^2 = 1, heights and distances.',
        keyPoints: [
          'sin(30°) = 1/2, cos(30°) = sqrt(3)/2, tan(45°) = 1, sin(60°) = sqrt(3)/2.',
          'Angle of elevation looking upwards; angle of depression looking downwards from observer.'
        ]
      }
    ]
  },
  {
    id: 'ncert-jess1',
    title: 'NCERT Social Science: Complete Series (Class X)',
    code: 'jess1',
    classLevel: 'Class 10',
    stream: 'Humanities',
    subject: 'Social Science',
    edition: 'Official NCERT National Social Science Framework',
    totalChapters: 12,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?jess1=0-7',
    description: 'Encompasses Contemporary India (Geography), India and the Contemporary World (History), Democratic Politics (Civics), and Understanding Economic Development.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Rise of Nationalism in Europe & India',
        code: 'jess301',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jess3=1-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jess3=1-5',
        summary: 'French Revolution symbols, unification of Italy and Germany, Rowlatt Act, Jallianwala Bagh massacre, Non-Cooperation and Civil Disobedience movements.',
        keyPoints: [
          'Mazzini, Cavour, and Garibaldi led Italian unification under Victor Emmanuel II.',
          'Mahatma Gandhi launched Non-Cooperation in 1920 and Salt March in 1930.'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Resources and Development & Agriculture',
        code: 'jess101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jess1=1-7',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jess1=1-7',
        summary: 'Classification of resources, sustainable development, soil types in India (Alluvial, Black, Red, Laterite), cropping seasons (Kharif, Rabi, Zaid).',
        keyPoints: [
          'Black soil (Regur) is ideal for cotton cultivation; Alluvial soil deposited by Indus, Ganga, Brahmaputra.',
          'Rabi crops sown in winter (wheat, gram); Kharif sown with onset of monsoons (rice, maize).'
        ]
      },
      {
        chapterNumber: 3,
        title: 'Power Sharing and Federalism',
        code: 'jess401',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jess4=1-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jess4=1-5',
        summary: 'Case studies of Belgium and Sri Lanka, horizontal vs vertical power sharing, federalism features in India, Union, State, and Concurrent legislative lists.',
        keyPoints: [
          'Horizontal division: Legislature, Executive, and Judiciary (system of checks and balances).',
          'Union List (defense, foreign affairs), State List (police, agriculture), Concurrent List (education).'
        ]
      },
      {
        chapterNumber: 4,
        title: 'Sectors of the Indian Economy & Money and Credit',
        code: 'jess201',
        pdfUrl: 'https://ncert.nic.in/textbook.php?jess2=1-5',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?jess2=1-5',
        summary: 'Primary, secondary, and tertiary sectors, disguised unemployment in agriculture, formal vs informal sources of credit, Self Help Groups (SHGs).',
        keyPoints: [
          'Tertiary sector has emerged as the largest producing sector in India in terms of GDP contribution.',
          'Formal credit (banks, cooperatives) supervised by RBI; informal (moneylenders) charges exorbitant interest.'
        ]
      }
    ]
  },

  // =========================================================================
  // CLASS 11 & 12 HUMANITIES / ARTS & COMPUTER SCIENCE
  // =========================================================================
  {
    id: 'ncert-lehs1',
    title: 'NCERT Themes in Indian History Part I, II & III (Class XII)',
    code: 'lehs1',
    classLevel: 'Class 12',
    stream: 'Humanities',
    subject: 'History',
    edition: 'Official NCERT National Archaeological Edition',
    totalChapters: 12,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?lehs1=0-4',
    description: 'Archaeology, architecture, socio-religious movements, Mughal agrarian society, and the Indian Freedom Struggle with historical inscriptions.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Bricks, Beads and Bones: The Harappan Civilisation',
        code: 'lehs101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lehs1=1-4',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lehs1=1-4',
        summary: 'Harappan urban planning, citadel and lower town, drainage system, Great Bath at Mohenjodaro, craft production, trade links with Mesopotamia, and decipherment issues.',
        keyPoints: [
          'Carefully planned drainage system: every house had a drain connected to street drains.',
          'Mohenjodaro Great Bath made watertight with gypsum mortar.',
          'Steatite seals featuring unicorn and undeciphered script.'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Kings, Farmers and Towns (c. 600 BCE - 600 CE)',
        code: 'lehs102',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lehs1=2-4',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lehs1=2-4',
        summary: 'Sixteen Mahajanapadas, rise of Magadha, Mauryan Empire administration (Ashoka’s Dhamma edicts), deciphering Brahmi and Kharosthi by James Prinsep.',
        keyPoints: [
          'James Prinsep deciphered Brahmi in 1838 mentioning King Piyadassi (Ashoka).',
          'Ashoka used inscriptions on stone pillars and rocks to propagate Dhamma.'
        ]
      },
      {
        chapterNumber: 3,
        title: 'Mahatma Gandhi and the Nationalist Movement',
        code: 'lehs301',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lehs3=1-4',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lehs3=1-4',
        summary: 'Return of Gandhi to India in 1915, Champaran Satyagraha, Non-Cooperation, Salt March to Dandi (1930), Round Table Conferences, and Quit India Movement (1942).',
        keyPoints: [
          'Champaran (1917) fought against oppressive indigo planters.',
          'Salt Satyagraha: 240-mile march from Sabarmati to Dandi broke the salt monopoly.',
          'Quit India Movement launched in August 1942 with the slogan "Do or Die".'
        ]
      }
    ]
  },
  {
    id: 'ncert-leps1',
    title: 'NCERT Contemporary World Politics & Politics in India (Class XII)',
    code: 'leps1',
    classLevel: 'Class 12',
    stream: 'Humanities',
    subject: 'Political Science',
    edition: 'Official NCERT Political Science Curriculum',
    totalChapters: 9,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?leps1=0-9',
    description: 'Post-Cold War international relations, regional organisations (EU, ASEAN), South Asia, United Nations, and contemporary Indian political transitions.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The End of Bipolarity',
        code: 'leps101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leps1=1-9',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leps1=1-9',
        summary: 'Soviet system features, Gorbachev’s Perestroika and Glasnost reforms, fall of Berlin Wall in 1989, disintegration of USSR, shock therapy, and consequences.',
        keyPoints: [
          'Fall of Berlin Wall (November 1989) marked collapse of the Communist bloc.',
          'Shock therapy in Russia resulted in the largest garage sale in history and hyperinflation.'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Challenges of Nation Building in India',
        code: 'leps201',
        pdfUrl: 'https://ncert.nic.in/textbook.php?leps2=1-9',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?leps2=1-9',
        summary: 'Partition consequences, integration of 565 Princely States by Sardar Vallabhbhai Patel, accession of Hyderabad and Junagadh, linguistic reorganisation of states.',
        keyPoints: [
          'Sardar Patel persuaded princely rulers using the Instrument of Accession.',
          'States Reorganisation Commission (1953) recommended creating states based on linguistic boundaries.'
        ]
      }
    ]
  },
  {
    id: 'ncert-lecs1',
    title: 'NCERT Computer Science with Python (Class XII)',
    code: 'lecs1',
    classLevel: 'Class 12',
    stream: 'Science',
    subject: 'Computer Science',
    edition: 'Official NCERT CBSE CS Curriculum',
    totalChapters: 8,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?lecs1=0-8',
    description: 'Python functions, exception handling, file handling (text, binary pickle, csv), data structures (stacks), computer networks, and MySQL relational database queries.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Python Functions and File Handling',
        code: 'lecs101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lecs1=1-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lecs1=1-8',
        summary: 'User-defined functions, scope of variables (LEGB rule), text file reading and writing methods, binary files using pickle (dump and load), csv files.',
        keyPoints: [
          'Text files: read(), readline(), readlines(), write(), writelines().',
          'Binary files require pickle module: pickle.dump(obj, file) and pickle.load(file).',
          'CSV module: csv.reader() and csv.writer() with delimiter specifications.'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Data Structures: Linear Stack',
        code: 'lecs102',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lecs1=2-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lecs1=2-8',
        summary: 'Stack operations (Push, Pop, Peek) using Python lists following LIFO (Last In First Out) principle, overflow and underflow conditions.',
        keyPoints: [
          'Push: list.append(item); Pop: list.pop() after checking not len(stack) == 0.',
          'Underflow condition occurs when attempting to pop from an empty stack.'
        ]
      },
      {
        chapterNumber: 3,
        title: 'Computer Networks & Relational Database (SQL)',
        code: 'lecs103',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lecs1=3-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lecs1=3-8',
        summary: 'Network topologies (Star, Bus), OSI & TCP/IP layers, network devices (Switch, Router, Gateway), MySQL aggregate functions (COUNT, SUM, AVG), GROUP BY, HAVING, and JOINs.',
        keyPoints: [
          'Star topology with central switch is most robust in local networks.',
          'SQL: WHERE filters individual rows before grouping; HAVING filters groups after aggregation.',
          'Equi-join and Natural join combine rows from two tables on matching foreign keys.'
        ]
      }
    ]
  },
  {
    id: 'ncert-lefl1',
    title: 'NCERT English: Flamingo & Vistas (Class XII)',
    code: 'lefl1',
    classLevel: 'Class 12',
    stream: 'General',
    subject: 'English',
    edition: 'Official NCERT Senior English Core',
    totalChapters: 8,
    officialPortalUrl: 'https://ncert.nic.in/textbook.php?lefl1=0-8',
    description: 'Official NCERT Core English prose, poetry, and character studies for Class 12 Boards and CUET Language Section.',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Last Lesson (Alphonse Daudet)',
        code: 'lefl101',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lefl1=1-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lefl1=1-8',
        summary: 'Franz arrives at school in Alsace expecting punishment, only to learn M. Hamel is giving his final French lesson due to Prussian occupation.',
        keyPoints: [
          'Themes of linguistic chauvinism, patriotism, and the realization of mother tongue value.',
          'M. Hamel writes "Vive La France!" on the blackboard before dismissing the class.'
        ]
      },
      {
        chapterNumber: 2,
        title: 'Lost Spring: Stories of Stolen Childhood (Anees Jung)',
        code: 'lefl102',
        pdfUrl: 'https://ncert.nic.in/textbook.php?lefl1=2-8',
        directViewerUrl: 'https://ncert.nic.in/textbook.php?lefl1=2-8',
        summary: 'Portrayal of Saheb-e-Alam, a ragpicker in Seemapuri, and Mukesh, a child laborer in Firozabad glass bangle factories.',
        keyPoints: [
          'Exposes vicious circle of middlemen, corrupt politicians, and policemen perpetuating child exploitation.',
          'Saheb prefers freedom over working at tea stall where canister feels heavier than his plastic bag.'
        ]
      }
    ]
  }
];

export function getNCERTBooksByFilter(filters: {
  classLevel?: string;
  stream?: string;
  subject?: string;
  searchQuery?: string;
}): NCERTBook[] {
  return NCERT_BOOKS_COLLECTION.filter((b) => {
    if (filters.classLevel && filters.classLevel !== 'All' && b.classLevel !== filters.classLevel) {
      return false;
    }
    if (filters.stream && filters.stream !== 'All' && b.stream !== filters.stream) {
      return false;
    }
    if (filters.subject && filters.subject !== 'All' && b.subject.toLowerCase() !== filters.subject.toLowerCase()) {
      return false;
    }
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchSubject = b.subject.toLowerCase().includes(q);
      const matchDesc = b.description.toLowerCase().includes(q);
      const matchChapter = b.chapters.some(
        (c) => c.title.toLowerCase().includes(q) || (c.summary && c.summary.toLowerCase().includes(q))
      );
      if (!matchTitle && !matchSubject && !matchDesc && !matchChapter) {
        return false;
      }
    }
    return true;
  });
}
