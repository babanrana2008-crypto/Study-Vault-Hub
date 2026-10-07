import { SyllabusChapter } from '../types';

export interface ExamHierarchyConfig {
  id: string;
  name: string;
  classes: string[];
  streams?: Record<string, string[]>;
  defaultClass: string;
}

export const EXAM_HIERARCHIES: ExamHierarchyConfig[] = [
  {
    id: 'NEET',
    name: 'NEET UG',
    classes: ['Class 11', 'Class 12', 'Complete (11 + 12)'],
    defaultClass: 'Class 12'
  },
  {
    id: 'JEE Main',
    name: 'JEE Main',
    classes: ['Class 11', 'Class 12', 'Complete (11 + 12)'],
    defaultClass: 'Class 12'
  },
  {
    id: 'JEE Advanced',
    name: 'JEE Advanced',
    classes: ['Class 11', 'Class 12', 'Complete (11 + 12)'],
    defaultClass: 'Class 12'
  },
  {
    id: 'Class 10 Board',
    name: 'Class 10 Board (CBSE / ICSE)',
    classes: ['Class 10'],
    defaultClass: 'Class 10'
  },
  {
    id: 'Class 12 Board',
    name: 'Class 12 Board (CBSE / ISC / State)',
    classes: ['Class 12'],
    streams: {
      'Class 12': ['Science', 'Commerce', 'Humanities']
    },
    defaultClass: 'Class 12'
  },
  {
    id: 'Commerce',
    name: 'Commerce & Business Studies',
    classes: ['Class 11', 'Class 12'],
    defaultClass: 'Class 12'
  },
  {
    id: 'CA',
    name: 'CA Foundation & Entrance',
    classes: ['Foundation Level'],
    defaultClass: 'Foundation Level'
  },
  {
    id: 'CUET',
    name: 'CUET UG',
    classes: ['Class 12 Domain', 'General Test'],
    defaultClass: 'Class 12 Domain'
  },
  {
    id: 'General Study',
    name: 'General Academic Study',
    classes: ['Class 10', 'Class 11', 'Class 12'],
    defaultClass: 'Class 12'
  }
];

export const SYLLABUS_EXAM_SUBJECTS_MAP: Record<string, string[]> = {
  NEET: ['Biology', 'Physics', 'Chemistry'],
  'JEE Main': ['Physics', 'Chemistry', 'Mathematics'],
  'JEE Advanced': ['Physics', 'Chemistry', 'Mathematics'],
  'Class 10 Board': ['Science', 'Mathematics', 'Social Science', 'English', 'Computer Applications'],
  'Class 12 Board': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Accountancy', 'Business Studies', 'Economics', 'History', 'Political Science', 'Computer Science', 'English'],
  Commerce: ['Accountancy', 'Business Studies', 'Economics', 'Applied Mathematics'],
  CA: ['Principles of Accounting', 'Business Laws', 'Quantitative Aptitude', 'Business Economics'],
  CUET: ['General Test', 'Domain Subjects', 'Language Comprehension'],
  'General Study': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Social Science', 'English']
};

export const COMPLETE_SYLLABUS_CHAPTERS: SyllabusChapter[] = [
  // =========================================================================
  // PHYSICS - CLASS 11 (NEET / JEE / CBSE)
  // =========================================================================
  {
    id: 'phy-11-01',
    number: 1,
    name: 'Units and Measurements',
    unitName: 'Unit I: Physical World and Measurement',
    subject: 'Physics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'keph101',
    expectedWeightage: '1-2 Questions (~4-8 marks)',
    topics: [
      { id: 't-phy-11-01-1', name: 'SI Fundamental & Derived Units', highYield: false },
      { id: 't-phy-11-01-2', name: 'Significant Figures & Rounding Off Rules', highYield: true },
      { id: 't-phy-11-01-3', name: 'Dimensional Analysis & Homogeneity Principle', highYield: true },
      { id: 't-phy-11-01-4', name: 'Absolute, Relative & Percentage Errors in Measurement', highYield: true }
    ]
  },
  {
    id: 'phy-11-02',
    number: 2,
    name: 'Motion in a Straight Line',
    unitName: 'Unit II: Kinematics',
    subject: 'Physics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'keph102',
    expectedWeightage: '1-2 Questions',
    topics: [
      { id: 't-phy-11-02-1', name: 'Position-Time, Velocity-Time & Acceleration-Time Graphs', highYield: true },
      { id: 't-phy-11-02-2', name: 'Kinematic Equations for Uniform Acceleration', highYield: true },
      { id: 't-phy-11-02-3', name: 'Relative Velocity in 1D', highYield: false },
      { id: 't-phy-11-02-4', name: 'Free Fall under Gravity & Stopping Distance', highYield: true }
    ]
  },
  {
    id: 'phy-11-03',
    number: 3,
    name: 'Motion in a Plane',
    unitName: 'Unit II: Kinematics',
    subject: 'Physics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'keph103',
    expectedWeightage: '2 Questions',
    topics: [
      { id: 't-phy-11-03-1', name: 'Vector Addition, Resolution, Dot & Cross Product', highYield: true },
      { id: 't-phy-11-03-2', name: 'Projectile Motion on Horizontal Ground (Time, Height, Range)', highYield: true },
      { id: 't-phy-11-03-3', name: 'Equation of Trajectory of Projectile', highYield: true },
      { id: 't-phy-11-03-4', name: 'Uniform Circular Motion & Centripetal Acceleration', highYield: true }
    ]
  },
  {
    id: 'phy-11-04',
    number: 4,
    name: 'Laws of Motion',
    unitName: 'Unit III: Laws of Motion',
    subject: 'Physics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'keph104',
    expectedWeightage: '2-3 Questions',
    topics: [
      { id: 't-phy-11-04-1', name: 'Newton’s Laws of Motion & Free Body Diagrams (FBD)', highYield: true },
      { id: 't-phy-11-04-2', name: 'Law of Conservation of Linear Momentum & Rocket Propulsion', highYield: true },
      { id: 't-phy-11-04-3', name: 'Static & Kinetic Friction, Angle of Repose', highYield: true },
      { id: 't-phy-11-04-4', name: 'Banking of Curved Roads with and without Friction', highYield: true }
    ]
  },
  {
    id: 'phy-11-05',
    number: 5,
    name: 'Work, Energy and Power',
    unitName: 'Unit IV: Work, Energy and Power',
    subject: 'Physics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'keph105',
    expectedWeightage: '2 Questions',
    topics: [
      { id: 't-phy-11-05-1', name: 'Work Done by Constant and Variable Forces', highYield: false },
      { id: 't-phy-11-05-2', name: 'Work-Energy Theorem (W_net = Delta K)', highYield: true },
      { id: 't-phy-11-05-3', name: 'Potential Energy of Spring & Conservative vs Non-conservative Forces', highYield: true },
      { id: 't-phy-11-05-4', name: 'Elastic and Inelastic Collisions in 1D and 2D', highYield: true }
    ]
  },
  {
    id: 'phy-11-06',
    number: 6,
    name: 'System of Particles and Rotational Motion',
    unitName: 'Unit V: Rotational Motion',
    subject: 'Physics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'keph106',
    expectedWeightage: '3 Questions',
    topics: [
      { id: 't-phy-11-06-1', name: 'Centre of Mass of Two-Particle & Rigid Bodies', highYield: true },
      { id: 't-phy-11-06-2', name: 'Torque and Angular Momentum Conservation (tau = I * alpha)', highYield: true },
      { id: 't-phy-11-06-3', name: 'Moment of Inertia, Radius of Gyration & Standard Bodies', highYield: true },
      { id: 't-phy-11-06-4', name: 'Pure Rolling Without Slipping on Inclined Plane', highYield: true }
    ]
  },
  {
    id: 'phy-11-07',
    number: 7,
    name: 'Gravitation',
    unitName: 'Unit VI: Gravitation',
    subject: 'Physics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'keph107',
    expectedWeightage: '2 Questions',
    topics: [
      { id: 't-phy-11-07-1', name: 'Kepler’s Three Laws of Planetary Motion', highYield: true },
      { id: 't-phy-11-07-2', name: 'Universal Law of Gravitation & Variation of g with Altitude/Depth', highYield: true },
      { id: 't-phy-11-07-3', name: 'Gravitational Potential Energy & Escape Velocity (v_e = sqrt(2 g R))', highYield: true },
      { id: 't-phy-11-07-4', name: 'Orbital Velocity of Satellite & Geostationary Satellites', highYield: false }
    ]
  },
  {
    id: 'phy-11-08',
    number: 8,
    name: 'Mechanical Properties of Solids & Fluids',
    unitName: 'Unit VII: Properties of Bulk Matter',
    subject: 'Physics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'keph201',
    expectedWeightage: '2-3 Questions',
    topics: [
      { id: 't-phy-11-08-1', name: 'Hooke’s Law, Stress-Strain Curve & Young’s Modulus', highYield: true },
      { id: 't-phy-11-08-2', name: 'Pascal’s Law, Hydraulic Lift & Archimedes’ Principle', highYield: true },
      { id: 't-phy-11-08-3', name: 'Viscosity, Stokes’ Law & Terminal Velocity', highYield: true },
      { id: 't-phy-11-08-4', name: 'Surface Tension, Excess Pressure in Drop/Bubble & Capillary Rise', highYield: true },
      { id: 't-phy-11-08-5', name: 'Bernoulli’s Principle and Torricelli’s Law of Efflux', highYield: true }
    ]
  },
  {
    id: 'phy-11-09',
    number: 9,
    name: 'Thermal Properties of Matter & Thermodynamics',
    unitName: 'Unit VIII: Thermodynamics',
    subject: 'Physics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'keph203',
    expectedWeightage: '3-4 Questions',
    topics: [
      { id: 't-phy-11-09-1', name: 'Thermal Expansion, Specific Heat & Latent Heat Calorimetry', highYield: true },
      { id: 't-phy-11-09-2', name: 'First Law of Thermodynamics (Delta Q = Delta U + Delta W)', highYield: true },
      { id: 't-phy-11-09-3', name: 'Isothermal, Adiabatic, Isobaric, Isochoric Work Formulas', highYield: true },
      { id: 't-phy-11-09-4', name: 'Second Law of Thermodynamics, Carnot Engine & Efficiency', highYield: true },
      { id: 't-phy-11-09-5', name: 'Heat Transfer: Conduction, Convection & Stefan-Boltzmann Law', highYield: true }
    ]
  },
  {
    id: 'phy-11-10',
    number: 10,
    name: 'Kinetic Theory of Gases, Oscillations and Waves',
    unitName: 'Unit IX & X: Oscillations and Waves',
    subject: 'Physics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'keph205',
    expectedWeightage: '3-4 Questions',
    topics: [
      { id: 't-phy-11-10-1', name: 'Ideal Gas Equation & Kinetic Interpretation of Temperature', highYield: true },
      { id: 't-phy-11-10-2', name: 'Degrees of Freedom, Law of Equipartition of Energy & Molar Heat Capacities', highYield: true },
      { id: 't-phy-11-10-3', name: 'Simple Harmonic Motion (SHM), Spring Pendulum & Simple Pendulum', highYield: true },
      { id: 't-phy-11-10-4', name: 'Wave Motion, Velocity of Sound (Laplace Correction)', highYield: true },
      { id: 't-phy-11-10-5', name: 'Superposition of Waves, Standing Waves in Open/Closed Pipes & Beats', highYield: true }
    ]
  },

  // =========================================================================
  // PHYSICS - CLASS 12 (NEET / JEE / CBSE)
  // =========================================================================
  {
    id: 'phy-12-01',
    number: 1,
    name: 'Electric Charges and Fields',
    unitName: 'Unit I: Electrostatics',
    subject: 'Physics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'leph101',
    expectedWeightage: '2-3 Questions',
    topics: [
      { id: 't-phy-12-01-1', name: 'Coulomb’s Law in Vector Form & Superposition', highYield: true },
      { id: 't-phy-12-01-2', name: 'Electric Field Lines & Electric Dipole in Uniform Field', highYield: true },
      { id: 't-phy-12-01-3', name: 'Gauss’s Law & Flux Evaluation', highYield: true },
      { id: 't-phy-12-01-4', name: 'Field due to Infinitely Long Straight Wire & Uniform Thin Spherical Shell', highYield: true }
    ]
  },
  {
    id: 'phy-12-02',
    number: 2,
    name: 'Electrostatic Potential and Capacitance',
    unitName: 'Unit I: Electrostatics',
    subject: 'Physics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'leph102',
    expectedWeightage: '2-3 Questions',
    topics: [
      { id: 't-phy-12-02-1', name: 'Electric Potential due to Point Charge & Dipole', highYield: true },
      { id: 't-phy-12-02-2', name: 'Equipotential Surfaces & Potential Energy of System of Charges', highYield: true },
      { id: 't-phy-12-02-3', name: 'Parallel Plate Capacitor with and without Dielectric Slab', highYield: true },
      { id: 't-phy-12-02-4', name: 'Combinations of Capacitors & Energy Stored in Capacitor', highYield: true }
    ]
  },
  {
    id: 'phy-12-03',
    number: 3,
    name: 'Current Electricity',
    unitName: 'Unit II: Current Electricity',
    subject: 'Physics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'leph103',
    expectedWeightage: '3-4 Questions',
    topics: [
      { id: 't-phy-12-03-1', name: 'Drift Velocity, Mobility & Microscopic Ohm’s Law (J = sigma * E)', highYield: true },
      { id: 't-phy-12-03-2', name: 'Temperature Dependence of Resistivity & Resistor Circuits', highYield: true },
      { id: 't-phy-12-03-3', name: 'EMF, Internal Resistance & Cells in Series/Parallel', highYield: true },
      { id: 't-phy-12-03-4', name: 'Kirchhoff’s Laws and Balanced Wheatstone Bridge', highYield: true }
    ]
  },
  {
    id: 'phy-12-04',
    number: 4,
    name: 'Moving Charges and Magnetism',
    unitName: 'Unit III: Magnetic Effects of Current and Magnetism',
    subject: 'Physics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'leph104',
    expectedWeightage: '2-3 Questions',
    topics: [
      { id: 't-phy-12-04-1', name: 'Biot-Savart Law & Magnetic Field on Axis of Circular Loop', highYield: true },
      { id: 't-phy-12-04-2', name: 'Ampere’s Circuital Law & Solenoid Magnetic Field', highYield: true },
      { id: 't-phy-12-04-3', name: 'Lorentz Force on Charged Particle & Helical Motion', highYield: true },
      { id: 't-phy-12-04-4', name: 'Force between Two Parallel Current-Carrying Wires', highYield: true },
      { id: 't-phy-12-04-5', name: 'Moving Coil Galvanometer: Sensitivity & Conversion to Ammeter/Voltmeter', highYield: true }
    ]
  },
  {
    id: 'phy-12-05',
    number: 5,
    name: 'Magnetism and Matter & Electromagnetic Waves',
    unitName: 'Unit III & V: Magnetism and EM Waves',
    subject: 'Physics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'leph105',
    expectedWeightage: '2 Questions',
    topics: [
      { id: 't-phy-12-05-1', name: 'Magnetic Dipole Moment of Revolving Electron (Bohr Magneton)', highYield: true },
      { id: 't-phy-12-05-2', name: 'Diamagnetic, Paramagnetic & Ferromagnetic Materials (Curie’s Law)', highYield: true },
      { id: 't-phy-12-05-3', name: 'Displacement Current & Maxwell’s Equations', highYield: true },
      { id: 't-phy-12-05-4', name: 'Electromagnetic Spectrum Properties & Applications', highYield: true }
    ]
  },
  {
    id: 'phy-12-06',
    number: 6,
    name: 'Electromagnetic Induction and Alternating Currents',
    unitName: 'Unit IV: EMI and Alternating Currents',
    subject: 'Physics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'leph106',
    expectedWeightage: '3-4 Questions',
    topics: [
      { id: 't-phy-12-06-1', name: 'Faraday’s Laws of Induction & Lenz’s Law', highYield: true },
      { id: 't-phy-12-06-2', name: 'Motional EMF & Self/Mutual Inductance', highYield: true },
      { id: 't-phy-12-06-3', name: 'RMS and Peak Values of AC & Phasor Diagrams', highYield: true },
      { id: 't-phy-12-06-4', name: 'Series LCR Circuit, Resonance, Quality Factor & Power Factor', highYield: true },
      { id: 't-phy-12-06-5', name: 'AC Generator and Step-up/Step-down Transformers', highYield: true }
    ]
  },
  {
    id: 'phy-12-07',
    number: 7,
    name: 'Optics (Ray & Wave Optics)',
    unitName: 'Unit VI: Optics',
    subject: 'Physics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'leph201',
    expectedWeightage: '4-5 Questions',
    topics: [
      { id: 't-phy-12-07-1', name: 'Total Internal Reflection (TIR) & Optical Fibres', highYield: true },
      { id: 't-phy-12-07-2', name: 'Lens Maker’s Formula & Combination of Thin Lenses in Contact', highYield: true },
      { id: 't-phy-12-07-3', name: 'Prism Formula & Dispersion of Light', highYield: true },
      { id: 't-phy-12-07-4', name: 'Astronomical Telescope & Compound Microscope Magnifying Power', highYield: true },
      { id: 't-phy-12-07-5', name: 'Young’s Double Slit Experiment (Interference Fringe Width)', highYield: true },
      { id: 't-phy-12-07-6', name: 'Diffraction at a Single Slit & Width of Central Maximum', highYield: true }
    ]
  },
  {
    id: 'phy-12-08',
    number: 8,
    name: 'Modern Physics & Semiconductor Electronics',
    unitName: 'Unit VII, VIII & IX: Modern Physics & Electronic Devices',
    subject: 'Physics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'leph203',
    expectedWeightage: '5-6 Questions',
    topics: [
      { id: 't-phy-12-08-1', name: 'Photoelectric Effect & Einstein’s Photoelectric Equation', highYield: true },
      { id: 't-phy-12-08-2', name: 'de Broglie Matter Waves & Davisson-Germer Experiment', highYield: true },
      { id: 't-phy-12-08-3', name: 'Bohr’s Model of Hydrogen Atom & Spectral Series (Lyman, Balmer)', highYield: true },
      { id: 't-phy-12-08-4', name: 'Mass Defect, Binding Energy per Nucleon Curve & Nuclear Fission/Fusion', highYield: true },
      { id: 't-phy-12-08-5', name: 'p-n Junction Diode Characteristics & Half/Full Wave Rectifiers', highYield: true }
    ]
  },

  // =========================================================================
  // CHEMISTRY - CLASS 11 (NEET / JEE / CBSE)
  // =========================================================================
  {
    id: 'chm-11-01',
    number: 1,
    name: 'Some Basic Concepts of Chemistry',
    unitName: 'Unit I: Basic Concepts of Chemistry',
    subject: 'Chemistry',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kech101',
    expectedWeightage: '1-2 Questions',
    topics: [
      { id: 't-chm-11-01-1', name: 'Mole Concept, Molar Mass & Stoichiometry', highYield: true },
      { id: 't-chm-11-01-2', name: 'Empirical Formula and Molecular Formula Determination', highYield: true },
      { id: 't-chm-11-01-3', name: 'Limiting Reagent Calculations', highYield: true },
      { id: 't-chm-11-01-4', name: 'Concentration Terms: Molarity, Molality, Mole Fraction', highYield: true }
    ]
  },
  {
    id: 'chm-11-02',
    number: 2,
    name: 'Structure of Atom',
    unitName: 'Unit II: Structure of Atom',
    subject: 'Chemistry',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kech102',
    expectedWeightage: '2-3 Questions',
    topics: [
      { id: 't-chm-11-02-1', name: 'Bohr’s Atomic Model & Hydrogen Emission Spectrum', highYield: true },
      { id: 't-chm-11-02-2', name: 'de Broglie Wavelength & Heisenberg’s Uncertainty Principle', highYield: true },
      { id: 't-chm-11-02-3', name: 'Quantum Numbers (n, l, m_l, m_s) & Orbital Shapes', highYield: true },
      { id: 't-chm-11-02-4', name: 'Aufbau Principle, Pauli’s Exclusion Principle & Hund’s Rule', highYield: true }
    ]
  },
  {
    id: 'chm-11-03',
    number: 3,
    name: 'Classification of Elements & Chemical Bonding',
    unitName: 'Unit III & IV: Periodicity and Bonding',
    subject: 'Chemistry',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kech103',
    expectedWeightage: '4 Questions',
    topics: [
      { id: 't-chm-11-03-1', name: 'Periodic Trends: Atomic Radius, IE, Electron Gain Enthalpy', highYield: true },
      { id: 't-chm-11-03-2', name: 'VSEPR Theory & Molecular Geometries', highYield: true },
      { id: 't-chm-11-03-3', name: 'Hybridization (sp, sp2, sp3, sp3d, sp3d2)', highYield: true },
      { id: 't-chm-11-03-4', name: 'Molecular Orbital Theory (MOT): Bond Order & Magnetic Nature', highYield: true },
      { id: 't-chm-11-03-5', name: 'Dipole Moment & Intermolecular Hydrogen Bonding', highYield: true }
    ]
  },
  {
    id: 'chm-11-04',
    number: 4,
    name: 'Chemical Thermodynamics & Equilibrium',
    unitName: 'Unit V & VI: Energetics and Equilibrium',
    subject: 'Chemistry',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kech105',
    expectedWeightage: '4-5 Questions',
    topics: [
      { id: 't-chm-11-04-1', name: 'First Law, Enthalpy of Reaction, Hess’s Law of Constant Heat Summation', highYield: true },
      { id: 't-chm-11-04-2', name: 'Entropy, Gibbs Free Energy & Criterion of Spontaneity (Delta G = Delta H - T Delta S)', highYield: true },
      { id: 't-chm-11-04-3', name: 'Law of Mass Action, K_p and K_c Relationship & Le Chatelier’s Principle', highYield: true },
      { id: 't-chm-11-04-4', name: 'Ionic Equilibrium: pH, Buffer Solutions & Henderson-Hasselbalch Equation', highYield: true },
      { id: 't-chm-11-04-5', name: 'Solubility Product (K_sp) & Common Ion Effect', highYield: true }
    ]
  },
  {
    id: 'chm-11-05',
    number: 5,
    name: 'Redox Reactions, Organic Principles & Hydrocarbons',
    unitName: 'Unit VII & VIII: Redox and Organic Chemistry',
    subject: 'Chemistry',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kech201',
    expectedWeightage: '4 Questions',
    topics: [
      { id: 't-chm-11-05-1', name: 'Oxidation Number Rules & Balancing Redox Reactions (Ion-Electron Method)', highYield: true },
      { id: 't-chm-11-05-2', name: 'IUPAC Nomenclature of Organic Compounds', highYield: true },
      { id: 't-chm-11-05-3', name: 'Inductive, Electromeric, Resonance and Hyperconjugation Effects', highYield: true },
      { id: 't-chm-11-05-4', name: 'Conformations of Ethane and Cyclohexane', highYield: true },
      { id: 't-chm-11-05-5', name: 'Electrophilic Addition to Alkenes (Markovnikov & Anti-Markovnikov Rule)', highYield: true },
      { id: 't-chm-11-05-6', name: 'Electrophilic Aromatic Substitution in Benzene (Nitration, Friedel-Crafts)', highYield: true }
    ]
  },

  // =========================================================================
  // CHEMISTRY - CLASS 12 (NEET / JEE / CBSE)
  // =========================================================================
  {
    id: 'chm-12-01',
    number: 1,
    name: 'Solutions and Electrochemistry',
    unitName: 'Unit I & II: Physical Chemistry',
    subject: 'Chemistry',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lech101',
    expectedWeightage: '4 Questions',
    topics: [
      { id: 't-chm-12-01-1', name: 'Raoult’s Law, Ideal & Non-Ideal Solutions (Azeotropes)', highYield: true },
      { id: 't-chm-12-01-2', name: 'Colligative Properties & van’t Hoff Factor for Association/Dissociation', highYield: true },
      { id: 't-chm-12-01-3', name: 'Nernst Equation & Cell Potential Calculations (E_cell)', highYield: true },
      { id: 't-chm-12-01-4', name: 'Kohlrausch’s Law of Independent Migration & Molar Conductivity', highYield: true },
      { id: 't-chm-12-01-5', name: 'Faraday’s Laws of Electrolysis & Commercial Batteries', highYield: true }
    ]
  },
  {
    id: 'chm-12-02',
    number: 2,
    name: 'Chemical Kinetics & Coordination Compounds',
    unitName: 'Unit III & IV: Physical and Inorganic Chemistry',
    subject: 'Chemistry',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lech103',
    expectedWeightage: '4-5 Questions',
    topics: [
      { id: 't-chm-12-02-1', name: 'Rate Law, Order and Molecularity of Reactions', highYield: true },
      { id: 't-chm-12-02-2', name: 'First Order Kinetics & Arrhenius Equation for Activation Energy', highYield: true },
      { id: 't-chm-12-02-3', name: 'IUPAC Nomenclature and Isomerism of Coordination Compounds', highYield: true },
      { id: 't-chm-12-02-4', name: 'Crystal Field Theory (CFT) Octahedral and Tetrahedral Splitting', highYield: true },
      { id: 't-chm-12-02-5', name: 'd- and f-Block Elements: Magnetic Moment, Color & Lanthanoid Contraction', highYield: true }
    ]
  },
  {
    id: 'chm-12-03',
    number: 3,
    name: 'Organic Chemistry: Haloalkanes, Alcohols & Carbonyls',
    unitName: 'Unit V, VI & VII: Organic Reaction Mechanisms',
    subject: 'Chemistry',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lech201',
    expectedWeightage: '6-7 Questions',
    topics: [
      { id: 't-chm-12-03-1', name: 'SN1 vs SN2 Mechanisms, Inversion and Racemization', highYield: true },
      { id: 't-chm-12-03-2', name: 'Lucas Test, Reimer-Tiemann & Kolbe’s Synthesis of Salicylic Acid', highYield: true },
      { id: 't-chm-12-03-3', name: 'Williamson Ether Synthesis and Cleavage by HI', highYield: true },
      { id: 't-chm-12-03-4', name: 'Nucleophilic Addition to Carbonyls (Aldol, Cannizzaro, Clemmensen)', highYield: true },
      { id: 't-chm-12-03-5', name: 'Tollens’, Fehling’s and Iodoform Tests for Functional Identification', highYield: true },
      { id: 't-chm-12-03-6', name: 'Acidity of Carboxylic Acids & Hell-Volhard-Zelinsky (HVZ) Reaction', highYield: true }
    ]
  },
  {
    id: 'chm-12-04',
    number: 4,
    name: 'Amines, Diazonium Salts & Biomolecules',
    unitName: 'Unit VIII & IX: Nitrogen Compounds & Biomolecules',
    subject: 'Chemistry',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lech204',
    expectedWeightage: '4 Questions',
    topics: [
      { id: 't-chm-12-04-1', name: 'Basicity Order of Amines in Gaseous vs Aqueous Phase', highYield: true },
      { id: 't-chm-12-04-2', name: 'Gabriel Phthalimide Synthesis & Hoffmann Bromamide Degradation', highYield: true },
      { id: 't-chm-12-04-3', name: 'Carbylamine Test, Hinsberg Test & Diazonium Coupling Reactions', highYield: true },
      { id: 't-chm-12-04-4', name: 'Carbohydrates: Glucose Anomers, Mutarotation & Reducing Sugars', highYield: true },
      { id: 't-chm-12-04-5', name: 'Proteins: Peptide Bond, Primary-Quaternary Structures & Denaturation', highYield: true },
      { id: 't-chm-12-04-6', name: 'Nucleic Acids: DNA vs RNA Chemical Composition & Double Helix', highYield: true }
    ]
  },

  // =========================================================================
  // BIOLOGY - CLASS 11 (NEET / CBSE)
  // =========================================================================
  {
    id: 'bio-11-01',
    number: 1,
    name: 'Diversity in the Living World',
    unitName: 'Unit I: Diversity in the Living World',
    subject: 'Biology',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kebo101',
    expectedWeightage: '4-5 Questions',
    topics: [
      { id: 't-bio-11-01-1', name: 'Binomial Nomenclature & Taxonomic Hierarchy Categories', highYield: true },
      { id: 't-bio-11-01-2', name: 'Five Kingdom System: Monera, Protista, Fungi, Plantae, Animalia', highYield: true },
      { id: 't-bio-11-01-3', name: 'Plant Kingdom: Algae, Bryophytes, Pteridophytes, Gymnosperms, Angiosperms', highYield: true },
      { id: 't-bio-11-01-4', name: 'Animal Kingdom: Non-chordates (Porifera to Echinodermata) & Chordata', highYield: true }
    ]
  },
  {
    id: 'bio-11-02',
    number: 2,
    name: 'Structural Organisation in Animals and Plants',
    unitName: 'Unit II: Structural Organisation',
    subject: 'Biology',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kebo105',
    expectedWeightage: '3-4 Questions',
    topics: [
      { id: 't-bio-11-02-1', name: 'Morphology of Root, Stem, Leaf & Inflorescence', highYield: true },
      { id: 't-bio-11-02-2', name: 'Anatomy of Monocot and Dicot Root, Stem and Leaf', highYield: true },
      { id: 't-bio-11-02-3', name: 'Animal Tissues: Epithelial, Connective, Muscular, Neural', highYield: true },
      { id: 't-bio-11-02-4', name: 'Morphology & Anatomy of Cockroach (Periplaneta americana)', highYield: true }
    ]
  },
  {
    id: 'bio-11-03',
    number: 3,
    name: 'Cell Structure and Function & Biomolecules',
    unitName: 'Unit III: Cell Structure and Function',
    subject: 'Biology',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kebo108',
    expectedWeightage: '6-7 Questions',
    topics: [
      { id: 't-bio-11-03-1', name: 'Prokaryotic vs Eukaryotic Cell Architecture', highYield: true },
      { id: 't-bio-11-03-2', name: 'Fluid Mosaic Model & Endomembrane Transport (ER, Golgi, Lysosomes)', highYield: true },
      { id: 't-bio-11-03-3', name: 'Structure and Function of Carbohydrates, Lipids, Proteins & Enzymes', highYield: true },
      { id: 't-bio-11-03-4', name: 'Cell Cycle Phases (G1, S, G2, M) & Regulation', highYield: true },
      { id: 't-bio-11-03-5', name: 'Meiosis: Synapsis, Crossing Over in Pachytene & Disjunction', highYield: true }
    ]
  },
  {
    id: 'bio-11-04',
    number: 4,
    name: 'Plant Physiology',
    unitName: 'Unit IV: Plant Physiology',
    subject: 'Biology',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kebo111',
    expectedWeightage: '5-6 Questions',
    topics: [
      { id: 't-bio-11-04-1', name: 'Photosynthesis: Light Reactions, Photophosphorylation (Z-scheme)', highYield: true },
      { id: 't-bio-11-04-2', name: 'Calvin Cycle (C3 Pathway), Hatch-Slack (C4 Pathway) & Photorespiration', highYield: true },
      { id: 't-bio-11-04-3', name: 'Cellular Respiration: Glycolysis (EMP Pathway) & Krebs Cycle (TCA)', highYield: true },
      { id: 't-bio-11-04-4', name: 'Electron Transport System (ETS) & Oxidative Phosphorylation', highYield: true },
      { id: 't-bio-11-04-5', name: 'Plant Growth Regulators: Auxins, Gibberellins, Cytokinins, Ethylene, ABA', highYield: true }
    ]
  },
  {
    id: 'bio-11-05',
    number: 5,
    name: 'Human Physiology',
    unitName: 'Unit V: Human Physiology',
    subject: 'Biology',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kebo114',
    expectedWeightage: '12-14 Questions',
    topics: [
      { id: 't-bio-11-05-1', name: 'Breathing: Respiratory Volumes, Capacities & Oxygen-Hemoglobin Dissociation Curve', highYield: true },
      { id: 't-bio-11-05-2', name: 'Body Fluids & Circulation: Cardiac Cycle, ECG Waves & Double Circulation', highYield: true },
      { id: 't-bio-11-05-3', name: 'Excretory Products: Nephron Counter-Current Mechanism & Renin-Angiotensin System', highYield: true },
      { id: 't-bio-11-05-4', name: 'Locomotion: Sliding Filament Theory of Muscle Contraction & Human Skeleton', highYield: true },
      { id: 't-bio-11-05-5', name: 'Neural Control: Action Potential Conduction & Synaptic Transmission', highYield: true },
      { id: 't-bio-11-05-6', name: 'Chemical Coordination: Pituitary, Thyroid, Adrenal & Pancreatic Hormones', highYield: true }
    ]
  },

  // =========================================================================
  // BIOLOGY - CLASS 12 (NEET / CBSE)
  // =========================================================================
  {
    id: 'bio-12-01',
    number: 1,
    name: 'Reproduction in Organisms and Humans',
    unitName: 'Unit VI: Reproduction',
    subject: 'Biology',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lebo101',
    expectedWeightage: '6-8 Questions',
    topics: [
      { id: 't-bio-12-01-1', name: 'Microsporogenesis, Megasporogenesis & Double Fertilization in Angiosperms', highYield: true },
      { id: 't-bio-12-01-2', name: 'Male and Female Reproductive Anatomy & Gametogenesis Comparison', highYield: true },
      { id: 't-bio-12-01-3', name: 'Menstrual Cycle Hormonal Cascade (FSH, LH, Estrogen, Progesterone)', highYield: true },
      { id: 't-bio-12-01-4', name: 'Fertilization, Blastocyst Implantation, Placenta & Parturition', highYield: true },
      { id: 't-bio-12-01-5', name: 'Contraceptive Strategies & Assisted Reproductive Technologies (IVF, ZIFT, GIFT)', highYield: true }
    ]
  },
  {
    id: 'bio-12-02',
    number: 2,
    name: 'Genetics and Evolution',
    unitName: 'Unit VII: Genetics and Evolution',
    subject: 'Biology',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lebo104',
    expectedWeightage: '14-16 Questions',
    topics: [
      { id: 't-bio-12-02-1', name: 'Mendelian Genetics, Incomplete Dominance & Codominance', highYield: true },
      { id: 't-bio-12-02-2', name: 'Morgan Linkage, Recombination Mapping & Sex Linkage', highYield: true },
      { id: 't-bio-12-02-3', name: 'Pedigree Charts & Genetic Disorders (Sickle-Cell, Hemophilia, Turner)', highYield: true },
      { id: 't-bio-12-02-4', name: 'DNA Double Helix, Nucleosome Packaging & Replication (Meselson-Stahl)', highYield: true },
      { id: 't-bio-12-02-5', name: 'Transcription, Genetic Code & Translation Mechanism', highYield: true },
      { id: 't-bio-12-02-6', name: 'Lac Operon Gene Regulation & Human Genome Project Findings', highYield: true },
      { id: 't-bio-12-02-7', name: 'Hardy-Weinberg Equilibrium Principle & Natural Selection Patterns', highYield: true }
    ]
  },
  {
    id: 'bio-12-03',
    number: 3,
    name: 'Biology in Human Welfare & Biotechnology',
    unitName: 'Unit VIII & IX: Human Welfare and Biotechnology',
    subject: 'Biology',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lebo107',
    expectedWeightage: '10-12 Questions',
    topics: [
      { id: 't-bio-12-03-1', name: 'Pathogens: Life Cycle of Plasmodium, Typhoid, Pneumonia, Amoebiasis', highYield: true },
      { id: 't-bio-12-03-2', name: 'Innate vs Acquired Immunity, Antibody Structure (H2L2) & HIV Replication', highYield: true },
      { id: 't-bio-12-03-3', name: 'Microbes in Household, Sewage Treatment (BOD) & Biogas Production', highYield: true },
      { id: 't-bio-12-03-4', name: 'Recombinant DNA Tools: Restriction Endonucleases, pBR322 Vector & PCR', highYield: true },
      { id: 't-bio-12-03-5', name: 'Biotech Applications: Bt Cotton, RNAi Pest Resistance & Recombinant Insulin', highYield: true },
      { id: 't-bio-12-03-6', name: 'Gene Therapy for ADA Deficiency, Transgenic Organisms & Ethical Issues', highYield: true }
    ]
  },
  {
    id: 'bio-12-04',
    number: 4,
    name: 'Ecology and Environment',
    unitName: 'Unit X: Ecology and Environment',
    subject: 'Biology',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lebo111',
    expectedWeightage: '10-12 Questions',
    topics: [
      { id: 't-bio-12-04-1', name: 'Organismal Adaptations to Abiotic Stress & Population Growth Models', highYield: true },
      { id: 't-bio-12-04-2', name: 'Population Interactions: Mutualism, Competition, Predation, Parasitism', highYield: true },
      { id: 't-bio-12-04-3', name: 'Ecosystem Productivity (GPP vs NPP), Decomposition & Energy Pyramids', highYield: true },
      { id: 't-bio-12-04-4', name: 'Biodiversity Patterns: Latitudinal Gradient & Species-Area Relationship', highYield: true },
      { id: 't-bio-12-04-5', name: 'Threats to Biodiversity (The Evil Quartet) & In-situ vs Ex-situ Conservation', highYield: true }
    ]
  },

  // =========================================================================
  // MATHEMATICS - CLASS 11 (JEE Main / JEE Advanced / CBSE)
  // =========================================================================
  {
    id: 'mth-11-01',
    number: 1,
    name: 'Sets, Relations and Functions',
    unitName: 'Unit I: Sets and Functions',
    subject: 'Mathematics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kemh101',
    expectedWeightage: '1-2 Questions',
    topics: [
      { id: 't-mth-11-01-1', name: 'Subsets, Power Set, Union, Intersection & De Morgan’s Laws', highYield: true },
      { id: 't-mth-11-01-2', name: 'Cartesian Product of Sets & Domain and Range of Relations', highYield: true },
      { id: 't-mth-11-01-3', name: 'Domain and Range of Real Functions (Greatest Integer, Signum, Modulus)', highYield: true }
    ]
  },
  {
    id: 'mth-11-02',
    number: 2,
    name: 'Trigonometric Functions',
    unitName: 'Unit I: Sets and Functions',
    subject: 'Mathematics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kemh103',
    expectedWeightage: '2-3 Questions',
    topics: [
      { id: 't-mth-11-02-1', name: 'Radian Measure, Unit Circle Definitions & Signs of Trigonometric Functions', highYield: true },
      { id: 't-mth-11-02-2', name: 'Compound Angle Formulas & Product to Sum Transformations', highYield: true },
      { id: 't-mth-11-02-3', name: 'Multiple and Sub-multiple Angle Formulas (sin 2A, cos 2A, tan 3A)', highYield: true },
      { id: 't-mth-11-02-4', name: 'Trigonometric Equations and General Solutions', highYield: true }
    ]
  },
  {
    id: 'mth-11-03',
    number: 3,
    name: 'Algebra: Complex Numbers, Permutations & Binomial',
    unitName: 'Unit II: Algebra',
    subject: 'Mathematics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kemh104',
    expectedWeightage: '4-5 Questions',
    topics: [
      { id: 't-mth-11-03-1', name: 'Complex Numbers: Modulus, Conjugate, Argand Plane & Polar Form', highYield: true },
      { id: 't-mth-11-03-2', name: 'Quadratic Equations with Complex Roots & Relation between Roots', highYield: true },
      { id: 't-mth-11-03-3', name: 'Fundamental Counting Principle, Permutations (nPr) and Combinations (nCr)', highYield: true },
      { id: 't-mth-11-03-4', name: 'Binomial Theorem for Positive Integral Index & General/Middle Terms', highYield: true },
      { id: 't-mth-11-03-5', name: 'Arithmetic and Geometric Progressions (AP and GP), Sum to Infinity', highYield: true }
    ]
  },
  {
    id: 'mth-11-04',
    number: 4,
    name: 'Coordinate Geometry & Conic Sections',
    unitName: 'Unit III: Coordinate Geometry',
    subject: 'Mathematics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kemh109',
    expectedWeightage: '3-4 Questions',
    topics: [
      { id: 't-mth-11-04-1', name: 'Slope of Line, Various Forms of Straight Lines (Slope-Intercept, Normal)', highYield: true },
      { id: 't-mth-11-04-2', name: 'Distance of Point from a Line & Distance between Parallel Lines', highYield: true },
      { id: 't-mth-11-04-3', name: 'Circles: Standard and General Equation, Tangent Condition', highYield: true },
      { id: 't-mth-11-04-4', name: 'Parabola: Standard Forms, Focus, Directrix and Latus Rectum', highYield: true },
      { id: 't-mth-11-04-5', name: 'Ellipse and Hyperbola: Eccentricity, Foci and Standard Equations', highYield: true }
    ]
  },
  {
    id: 'mth-11-05',
    number: 5,
    name: 'Calculus, Statistics and Probability',
    unitName: 'Unit IV & V: Calculus and Statistics',
    subject: 'Mathematics',
    classLevel: 'Class 11',
    stream: 'Science',
    ncertChapterCode: 'kemh112',
    expectedWeightage: '2-3 Questions',
    topics: [
      { id: 't-mth-11-05-1', name: 'Intuitive Idea of Limits, Standard Trigonometric & Algebraic Limits', highYield: true },
      { id: 't-mth-11-05-2', name: 'Derivatives as Rate of Change & Product and Quotient Rules', highYield: true },
      { id: 't-mth-11-05-3', name: 'Measures of Dispersion: Mean Deviation, Variance and Standard Deviation', highYield: true },
      { id: 't-mth-11-05-4', name: 'Axiomatic Probability, Event Algebra & Addition Theorem', highYield: true }
    ]
  },

  // =========================================================================
  // MATHEMATICS - CLASS 12 (JEE Main / JEE Advanced / CBSE)
  // =========================================================================
  {
    id: 'mth-12-01',
    number: 1,
    name: 'Relations, Functions and Inverse Trigonometry',
    unitName: 'Unit I: Relations and Functions',
    subject: 'Mathematics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lemh101',
    expectedWeightage: '2 Questions',
    topics: [
      { id: 't-mth-12-01-1', name: 'Reflexive, Symmetric, Transitive and Equivalence Relations', highYield: true },
      { id: 't-mth-12-01-2', name: 'Injective (One-One) and Surjective (Onto) Functions', highYield: true },
      { id: 't-mth-12-01-3', name: 'Principal Value Branches of Inverse Trigonometric Functions', highYield: true }
    ]
  },
  {
    id: 'mth-12-02',
    number: 2,
    name: 'Matrices and Determinants',
    unitName: 'Unit II: Algebra',
    subject: 'Mathematics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lemh103',
    expectedWeightage: '2-3 Questions',
    topics: [
      { id: 't-mth-12-02-1', name: 'Matrix Multiplication, Symmetric and Skew-Symmetric Matrices', highYield: true },
      { id: 't-mth-12-02-2', name: 'Determinant Expansion, Minors, Cofactors & Invertibility', highYield: true },
      { id: 't-mth-12-02-3', name: 'Adjoint and Inverse of a Matrix (A^-1 = adj(A)/det(A))', highYield: true },
      { id: 't-mth-12-02-4', name: 'System of Linear Equations (Matrix Method & Cramer’s Rule)', highYield: true }
    ]
  },
  {
    id: 'mth-12-03',
    number: 3,
    name: 'Differential Calculus & Applications of Derivatives',
    unitName: 'Unit III: Calculus',
    subject: 'Mathematics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lemh105',
    expectedWeightage: '4-5 Questions',
    topics: [
      { id: 't-mth-12-03-1', name: 'Continuity at a Point, Differentiability & L’Hopital’s Rule', highYield: true },
      { id: 't-mth-12-03-2', name: 'Chain Rule, Implicit & Logarithmic Differentiation', highYield: true },
      { id: 't-mth-12-03-3', name: 'Rate of Change of Quantities & Tangents and Normals', highYield: true },
      { id: 't-mth-12-03-4', name: 'Monotonicity: Increasing and Decreasing Functions', highYield: true },
      { id: 't-mth-12-03-5', name: 'Local and Absolute Maxima and Minima (First & Second Derivative Tests)', highYield: true }
    ]
  },
  {
    id: 'mth-12-04',
    number: 4,
    name: 'Integral Calculus & Differential Equations',
    unitName: 'Unit III: Calculus',
    subject: 'Mathematics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lemh201',
    expectedWeightage: '5-6 Questions',
    topics: [
      { id: 't-mth-12-04-1', name: 'Integration by Substitution, Parts and Partial Fractions', highYield: true },
      { id: 't-mth-12-04-2', name: 'Definite Integral Properties (King’s Rule, Periodicity)', highYield: true },
      { id: 't-mth-12-04-3', name: 'Area Bounded by Curves (Parabolas, Circles, Ellipses, Lines)', highYield: true },
      { id: 't-mth-12-04-4', name: 'Differential Equations: Order, Degree & Variable Separable Method', highYield: true },
      { id: 't-mth-12-04-5', name: 'First Order Linear Differential Equations (Integrating Factor Method)', highYield: true }
    ]
  },
  {
    id: 'mth-12-05',
    number: 5,
    name: 'Vectors, 3D Geometry, Linear Programming & Probability',
    unitName: 'Unit IV, V & VI: Vectors, 3D and Probability',
    subject: 'Mathematics',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lemh204',
    expectedWeightage: '5-6 Questions',
    topics: [
      { id: 't-mth-12-05-1', name: 'Dot Product, Cross Product & Projection of Vectors', highYield: true },
      { id: 't-mth-12-05-2', name: 'Equation of Line in 3D Space & Shortest Distance between Skew Lines', highYield: true },
      { id: 't-mth-12-05-3', name: 'Planes in 3D Space: Vector and Cartesian Forms', highYield: true },
      { id: 't-mth-12-05-4', name: 'Linear Programming Corner Point Method for Feasible Regions', highYield: true },
      { id: 't-mth-12-05-5', name: 'Conditional Probability, Multiplication Theorem & Independent Events', highYield: true },
      { id: 't-mth-12-05-6', name: 'Bayes’ Theorem and Random Variable Probability Distribution', highYield: true }
    ]
  },

  // =========================================================================
  // COMMERCE - ACCOUNTANCY (Class 11 & 12 / CA Foundation)
  // =========================================================================
  {
    id: 'acc-11-01',
    number: 1,
    name: 'Financial Accounting Fundamentals',
    unitName: 'Unit I: Accounting Fundamentals',
    subject: 'Accountancy',
    classLevel: 'Class 11',
    stream: 'Commerce',
    ncertChapterCode: 'keac101',
    expectedWeightage: '15 Marks',
    topics: [
      { id: 't-acc-11-01-1', name: 'Accounting Principles, Assumptions & Concepts (Going Concern, Accrual)', highYield: true },
      { id: 't-acc-11-01-2', name: 'Recording of Transactions: Golden Rules, Journal Entries & Ledger Posting', highYield: true },
      { id: 't-acc-11-01-3', name: 'Bank Reconciliation Statement (BRS) with Cash Book vs Pass Book Balance', highYield: true },
      { id: 't-acc-11-01-4', name: 'Depreciation Accounting: Straight Line Method (SLM) vs Written Down Value (WDV)', highYield: true }
    ]
  },
  {
    id: 'acc-12-01',
    number: 1,
    name: 'Accounting for Partnership: Fundamentals & Admission',
    unitName: 'Unit I: Partnership Accounting',
    subject: 'Accountancy',
    classLevel: 'Class 12',
    stream: 'Commerce',
    ncertChapterCode: 'leac101',
    expectedWeightage: '15 Marks',
    topics: [
      { id: 't-acc-12-01-1', name: 'Partnership Deed, P&L Appropriation & Interest on Capital/Drawings', highYield: true },
      { id: 't-acc-12-01-2', name: 'Goodwill Valuation: Average Profit, Super Profit & Capitalisation Methods', highYield: true },
      { id: 't-acc-12-01-3', name: 'Admission of Partner: Sacrificing Ratio, Revaluation & Capital Adjustments', highYield: true },
      { id: 't-acc-12-01-4', name: 'Retirement/Death of Partner: Gaining Ratio, Deceased Partner Share & Dissolution', highYield: true }
    ]
  },
  {
    id: 'acc-12-02',
    number: 2,
    name: 'Accounting for Companies & Financial Analysis',
    unitName: 'Unit II: Company Accounts and Analysis',
    subject: 'Accountancy',
    classLevel: 'Class 12',
    stream: 'Commerce',
    ncertChapterCode: 'leac201',
    expectedWeightage: '20 Marks',
    topics: [
      { id: 't-acc-12-02-1', name: 'Issue of Shares at Par & Premium, Pro-Rata Allotment Calculations', highYield: true },
      { id: 't-acc-12-02-2', name: 'Forfeiture of Shares & Reissue Transfer to Capital Reserve', highYield: true },
      { id: 't-acc-12-02-3', name: 'Debentures Issue as Collateral Security & Redemption Terms', highYield: true },
      { id: 't-acc-12-02-4', name: 'Ratio Analysis: Current Ratio, Quick Ratio, Debt-Equity, Operating Ratios', highYield: true },
      { id: 't-acc-12-02-5', name: 'Cash Flow Statement (AS-3): Operating, Investing and Financing Activities', highYield: true }
    ]
  },

  // =========================================================================
  // COMMERCE - BUSINESS STUDIES (Class 11 & 12)
  // =========================================================================
  {
    id: 'bst-11-01',
    number: 1,
    name: 'Foundations of Business Organisation',
    unitName: 'Unit I: Foundations of Business',
    subject: 'Business Studies',
    classLevel: 'Class 11',
    stream: 'Commerce',
    ncertChapterCode: 'kebs101',
    expectedWeightage: '12 Marks',
    topics: [
      { id: 't-bst-11-01-1', name: 'Sole Proprietorship, Partnership, Joint Hindu Family & Cooperative Societies', highYield: true },
      { id: 't-bst-11-01-2', name: 'Joint Stock Company: Formation Stages, MOA, AOA & Prospectus', highYield: true },
      { id: 't-bst-11-01-3', name: 'Sources of Business Finance: Retained Earnings, Equity, Preference, Debentures', highYield: true }
    ]
  },
  {
    id: 'bst-12-01',
    number: 1,
    name: 'Principles and Functions of Management',
    unitName: 'Unit I: Principles of Management',
    subject: 'Business Studies',
    classLevel: 'Class 12',
    stream: 'Commerce',
    ncertChapterCode: 'lebs101',
    expectedWeightage: '16 Marks',
    topics: [
      { id: 't-bst-12-01-1', name: 'Fayol’s 14 Administrative Principles vs Taylor’s Scientific Management', highYield: true },
      { id: 't-bst-12-01-2', name: 'Business Environment Dimensions: Economic, Social, Technological, Legal', highYield: true },
      { id: 't-bst-12-01-3', name: 'Planning and Organising: Functional vs Divisional Structures, Delegation', highYield: true },
      { id: 't-bst-12-01-4', name: 'Staffing, Directing (Leadership styles, Maslow Hierarchy) & Controlling Process', highYield: true }
    ]
  },
  {
    id: 'bst-12-02',
    number: 2,
    name: 'Financial Management, Marketing & Consumer Protection',
    unitName: 'Unit II: Business Finance and Marketing',
    subject: 'Business Studies',
    classLevel: 'Class 12',
    stream: 'Commerce',
    ncertChapterCode: 'lebs201',
    expectedWeightage: '18 Marks',
    topics: [
      { id: 't-bst-12-02-1', name: 'Financial Decisions: Investment (Capital Budgeting), Financing & Dividend', highYield: true },
      { id: 't-bst-12-02-2', name: 'Money Market Instruments vs Capital Market (NSE, BSE, SEBI)', highYield: true },
      { id: 't-bst-12-02-3', name: 'Marketing Mix 4 Ps: Product, Price, Place (Channels), Promotion', highYield: true },
      { id: 't-bst-12-02-4', name: 'Consumer Protection Act 2019: Consumer Rights & 3-Tier Redressal Machinery', highYield: true }
    ]
  },

  // =========================================================================
  // COMMERCE - ECONOMICS (Class 11 & 12)
  // =========================================================================
  {
    id: 'eco-11-01',
    number: 1,
    name: 'Introductory Microeconomics & Statistics',
    unitName: 'Unit I: Microeconomics and Data',
    subject: 'Economics',
    classLevel: 'Class 11',
    stream: 'Commerce',
    ncertChapterCode: 'keec101',
    expectedWeightage: '14 Marks',
    topics: [
      { id: 't-eco-11-01-1', name: 'Production Possibility Frontier (PPF) & Opportunity Cost', highYield: true },
      { id: 't-eco-11-01-2', name: 'Consumer Equilibrium: Marginal Utility vs Indifference Curve Analysis', highYield: true },
      { id: 't-eco-11-01-3', name: 'Law of Demand, Elasticity of Demand (Price, Cross, Income)', highYield: true },
      { id: 't-eco-11-01-4', name: 'Cost Curves (TC, AC, MC) & Revenue under Perfect Competition', highYield: true }
    ]
  },
  {
    id: 'eco-12-01',
    number: 1,
    name: 'Introductory Macroeconomics',
    unitName: 'Unit I: Macroeconomics',
    subject: 'Economics',
    classLevel: 'Class 12',
    stream: 'Commerce',
    ncertChapterCode: 'leec101',
    expectedWeightage: '20 Marks',
    topics: [
      { id: 't-eco-12-01-1', name: 'National Income Aggregates: GDP, NDP, GNP, NNP at Factor Cost & Market Price', highYield: true },
      { id: 't-eco-12-01-2', name: 'Measurement Methods: Value Added, Income Method & Expenditure Method', highYield: true },
      { id: 't-eco-12-01-3', name: 'Money Creation by Commercial Banks & RBI Monetary Policy Tools', highYield: true },
      { id: 't-eco-12-01-4', name: 'Aggregate Demand, Propensity to Consume (MPC) & Investment Multiplier', highYield: true },
      { id: 't-eco-12-01-5', name: 'Government Budget: Revenue & Fiscal Deficits, Fiscal Policy', highYield: true },
      { id: 't-eco-12-01-6', name: 'Balance of Payments (Current & Capital Account) & Foreign Exchange Rate', highYield: true }
    ]
  },

  // =========================================================================
  // CLASS 10 (SCIENCE, MATHEMATICS, SOCIAL SCIENCE, ENGLISH, COMPUTER)
  // =========================================================================
  {
    id: 'sci-10-01',
    number: 1,
    name: 'Chemical Reactions, Acids, Bases & Metals',
    unitName: 'Unit I: Chemical Substances - Nature and Behaviour',
    subject: 'Science',
    classLevel: 'Class 10',
    ncertChapterCode: 'jesc101',
    expectedWeightage: '12 Marks',
    topics: [
      { id: 't-sci-10-01-1', name: 'Types of Reactions: Combination, Decomposition, Displacement, Redox', highYield: true },
      { id: 't-sci-10-01-2', name: 'pH Scale Significance in Everyday Life (Soil, Digestive, Tooth Decay)', highYield: true },
      { id: 't-sci-10-01-3', name: 'Manufacture & Properties of Bleaching Powder, Baking Soda, Plaster of Paris', highYield: true },
      { id: 't-sci-10-01-4', name: 'Reactivity Series of Metals & Extraction of Low, Medium, High Reactivity Metals', highYield: true },
      { id: 't-sci-10-01-5', name: 'Covalent Bonding in Carbon, Homologous Series, Saponification & Micelles', highYield: true }
    ]
  },
  {
    id: 'sci-10-02',
    number: 2,
    name: 'Life Processes, Control & Reproduction',
    unitName: 'Unit II: World of Living',
    subject: 'Science',
    classLevel: 'Class 10',
    ncertChapterCode: 'jesc105',
    expectedWeightage: '14 Marks',
    topics: [
      { id: 't-sci-10-02-1', name: 'Photosynthesis & Human Digestive System Enzymes', highYield: true },
      { id: 't-sci-10-02-2', name: 'Aerobic vs Anaerobic Respiration Pathways in Glucose Breakdown', highYield: true },
      { id: 't-sci-10-02-3', name: 'Human Heart Structure, Double Circulation & Blood Pressure', highYield: true },
      { id: 't-sci-10-02-4', name: 'Structure of Nephron & Mechanism of Urine Formation', highYield: true },
      { id: 't-sci-10-02-5', name: 'Reflex Arc & Human Brain Functions (Forebrain, Cerebellum, Medulla)', highYield: true },
      { id: 't-sci-10-02-6', name: 'Asexual vs Sexual Reproduction & Human Male/Female Reproductive Systems', highYield: true },
      { id: 't-sci-10-02-7', name: 'Mendel’s Experiments on Pea Plants & Sex Determination in Humans', highYield: true }
    ]
  },
  {
    id: 'sci-10-03',
    number: 3,
    name: 'Light, Human Eye, Electricity & Magnetic Effects',
    unitName: 'Unit III & IV: Natural Phenomena & Effects of Current',
    subject: 'Science',
    classLevel: 'Class 10',
    ncertChapterCode: 'jesc109',
    expectedWeightage: '16 Marks',
    topics: [
      { id: 't-sci-10-03-1', name: 'Ray Diagrams for Concave/Convex Mirrors & Mirror Formula', highYield: true },
      { id: 't-sci-10-03-2', name: 'Refraction through Glass Slab, Snell’s Law & Lens Formula', highYield: true },
      { id: 't-sci-10-03-3', name: 'Human Eye Defects (Myopia, Hypermetropia) and Corrective Lenses', highYield: true },
      { id: 't-sci-10-03-4', name: 'Atmospheric Refraction (Twinkling of Stars) & Scattering (Tyndall Effect)', highYield: true },
      { id: 't-sci-10-03-5', name: 'Ohm’s Law, Factors Affecting Resistance & Series/Parallel Resistors', highYield: true },
      { id: 't-sci-10-03-6', name: 'Joule’s Heating Effect, Electric Power & Domestic Electric Circuits', highYield: true },
      { id: 't-sci-10-03-7', name: 'Right-Hand Thumb Rule, Solenoid Magnetic Field & Fleming’s Left-Hand Rule', highYield: true }
    ]
  },
  {
    id: 'mth-10-01',
    number: 1,
    name: 'Number Systems, Algebra & Polynomials',
    unitName: 'Unit I & II: Number Systems & Algebra',
    subject: 'Mathematics',
    classLevel: 'Class 10',
    ncertChapterCode: 'jemh101',
    expectedWeightage: '16 Marks',
    topics: [
      { id: 't-mth-10-01-1', name: 'Fundamental Theorem of Arithmetic (HCF * LCM = a * b)', highYield: true },
      { id: 't-mth-10-01-2', name: 'Proof of Irrationality for sqrt(2), sqrt(3), sqrt(5)', highYield: true },
      { id: 't-mth-10-01-3', name: 'Relationship between Zeroes and Coefficients of Quadratic Polynomial', highYield: true },
      { id: 't-mth-10-01-4', name: 'Pair of Linear Equations: Substitution, Elimination & Consistency Conditions', highYield: true },
      { id: 't-mth-10-01-5', name: 'Quadratic Equation Solution by Quadratic Formula & Discriminant Nature of Roots', highYield: true },
      { id: 't-mth-10-01-6', name: 'Arithmetic Progression (AP): nth term (a_n) & Sum of first n terms (S_n)', highYield: true }
    ]
  },
  {
    id: 'mth-10-02',
    number: 2,
    name: 'Trigonometry, Coordinate Geometry & Triangles',
    unitName: 'Unit III, IV & V: Geometry and Trigonometry',
    subject: 'Mathematics',
    classLevel: 'Class 10',
    ncertChapterCode: 'jemh108',
    expectedWeightage: '20 Marks',
    topics: [
      { id: 't-mth-10-02-1', name: 'Trigonometric Ratios of Acute Angles & Standard Values (30, 45, 60)', highYield: true },
      { id: 't-mth-10-02-2', name: 'Fundamental Trigonometric Identity: sin^2 theta + cos^2 theta = 1', highYield: true },
      { id: 't-mth-10-02-3', name: 'Heights and Distances: Angles of Elevation and Depression Problems', highYield: true },
      { id: 't-mth-10-02-4', name: 'Distance Formula & Section Formula in Coordinate Geometry', highYield: true },
      { id: 't-mth-10-02-5', name: 'Basic Proportionality Theorem (Thales Theorem) & Similarity of Triangles', highYield: true },
      { id: 't-mth-10-02-6', name: 'Tangent to a Circle Theorem (Lengths of tangents from external point are equal)', highYield: true }
    ]
  },
  {
    id: 'sst-10-01',
    number: 1,
    name: 'India & Contemporary World: History, Civics & Geography',
    unitName: 'Social Science Integrated Core',
    subject: 'Social Science',
    classLevel: 'Class 10',
    ncertChapterCode: 'jess301',
    expectedWeightage: '20 Marks',
    topics: [
      { id: 't-sst-10-01-1', name: 'The Rise of Nationalism in Europe (French Revolution, Mazzini, Bismarck)', highYield: true },
      { id: 't-sst-10-01-2', name: 'Nationalism in India: Non-Cooperation Movement & Salt Satyagraha', highYield: true },
      { id: 't-sst-10-01-3', name: 'Power Sharing in Belgium vs Sri Lanka & Principles of Federalism in India', highYield: true },
      { id: 't-sst-10-01-4', name: 'Political Parties: National vs State Parties & Electoral Reforms', highYield: true },
      { id: 't-sst-10-01-5', name: 'Resources & Soil Classification in India (Alluvial, Black, Red, Laterite)', highYield: true },
      { id: 't-sst-10-01-6', name: 'Agriculture: Major Food Crops (Rice, Wheat) & Commercial Crops', highYield: true },
      { id: 't-sst-10-01-7', name: 'Economic Sectors (Primary, Secondary, Tertiary) & Money and Credit Mechanisms', highYield: true }
    ]
  },
  {
    id: 'eng-10-01',
    number: 1,
    name: 'English Language and Literature',
    unitName: 'Class 10 English Core',
    subject: 'English',
    classLevel: 'Class 10',
    ncertChapterCode: 'jeff101',
    expectedWeightage: '20 Marks',
    topics: [
      { id: 't-eng-10-01-1', name: 'First Flight: A Letter to God & Nelson Mandela Freedom Speech', highYield: true },
      { id: 't-eng-10-01-2', name: 'Poetry: Dust of Snow, Fire and Ice & A Tiger in the Zoo', highYield: true },
      { id: 't-eng-10-01-3', name: 'Formal Letter Writing (Editor, Complaint, Enquiry) & Analytical Paragraph', highYield: true },
      { id: 't-eng-10-01-4', name: 'Tenses, Modals, Subject-Verb Concord & Reported Speech', highYield: true }
    ]
  },
  {
    id: 'ca-10-01',
    number: 1,
    name: 'Computer Applications & IT Foundation',
    unitName: 'Unit I: Cyber Concepts and Web Basics',
    subject: 'Computer Applications',
    classLevel: 'Class 10',
    ncertChapterCode: 'jeca101',
    expectedWeightage: '20 Marks',
    topics: [
      { id: 't-ca-10-01-1', name: 'Internet Basics: Web Client, Server, URL, HTTP/HTTPS Protocols', highYield: true },
      { id: 't-ca-10-01-2', name: 'HTML & CSS: Headings, Tables, Lists, Hyperlinks & Embedded Media', highYield: true },
      { id: 't-ca-10-01-3', name: 'Cyber Ethics: Netiquettes, Plagiarism, Intellectual Property & Data Privacy', highYield: true },
      { id: 't-ca-10-01-4', name: 'Programming Fundamentals in Python: Variables, Conditional Loops & Lists', highYield: true }
    ]
  },

  // =========================================================================
  // HUMANITIES & SOCIAL SCIENCES - CLASS 12
  // =========================================================================
  {
    id: 'his-12-01',
    number: 1,
    name: 'Themes in Indian History Part I, II & III',
    unitName: 'Indian History Comprehensive',
    subject: 'History',
    classLevel: 'Class 12',
    stream: 'Humanities',
    ncertChapterCode: 'lehs101',
    expectedWeightage: '25 Marks',
    topics: [
      { id: 't-his-12-01-1', name: 'Harappan Civilisation: Urban Planning, Craft Production & Drainage Systems', highYield: true },
      { id: 't-his-12-01-2', name: 'Sixteen Mahajanapadas & Ashokan Inscriptions (James Prinsep Decipherment)', highYield: true },
      { id: 't-his-12-01-3', name: 'Bhakti-Sufi Traditions & Vijayanagara Imperial Architecture', highYield: true },
      { id: 't-his-12-01-4', name: 'Colonialism and Countryside (Permanent Settlement & Ryotwari System)', highYield: true },
      { id: 't-his-12-01-5', name: 'Rebels and the Raj (1857 Revolt Leaders & Centres) & Salt Satyagraha', highYield: true },
      { id: 't-his-12-01-6', name: 'Framing the Indian Constitution (Constituent Assembly Debates)', highYield: true }
    ]
  },
  {
    id: 'pol-12-01',
    number: 1,
    name: 'Contemporary World Politics & Politics in India',
    unitName: 'Political Science Core',
    subject: 'Political Science',
    classLevel: 'Class 12',
    stream: 'Humanities',
    ncertChapterCode: 'leps101',
    expectedWeightage: '25 Marks',
    topics: [
      { id: 't-pol-12-01-1', name: 'Cold War Era & The End of Bipolarity (Disintegration of USSR in 1991)', highYield: true },
      { id: 't-pol-12-01-2', name: 'Contemporary Centres of Power (European Union, ASEAN, BRICS)', highYield: true },
      { id: 't-pol-12-01-3', name: 'United Nations: Security Council Reform & Non-Governmental Agencies', highYield: true },
      { id: 't-pol-12-01-4', name: 'Integration of Princely States (Sardar Patel) & Reorganisation on Linguistic Lines', highYield: true },
      { id: 't-pol-12-01-5', name: 'Democratic Crisis: National Emergency 1975 & Coalition Politics Evolution', highYield: true }
    ]
  },
  {
    id: 'cs-12-01',
    number: 1,
    name: 'Computer Science with Python & Databases',
    unitName: 'Computational Thinking and Programming',
    subject: 'Computer Science',
    classLevel: 'Class 12',
    stream: 'Science',
    ncertChapterCode: 'lecs101',
    expectedWeightage: '30 Marks',
    topics: [
      { id: 't-cs-12-01-1', name: 'Python User Defined Functions, Scope of Variables & Module Imports', highYield: true },
      { id: 't-cs-12-01-2', name: 'File Handling: Text Files, Binary Files (Pickle) & CSV Module Handling', highYield: true },
      { id: 't-cs-12-01-3', name: 'Data Structures: Stack Implementation using Lists (Push, Pop, Peek)', highYield: true },
      { id: 't-cs-12-01-4', name: 'Computer Networks: Topologies, OSI Reference Model & Network Security', highYield: true },
      { id: 't-cs-12-01-5', name: 'Relational Database Management (MySQL): DDL, DML, Aggregate Functions & Table JOINs', highYield: true }
    ]
  },
  {
    id: 'eng-12-01',
    number: 1,
    name: 'Senior English Core (Flamingo & Vistas)',
    unitName: 'Senior English Core',
    subject: 'English',
    classLevel: 'Class 12',
    stream: 'General',
    ncertChapterCode: 'lefl101',
    expectedWeightage: '20 Marks',
    topics: [
      { id: 't-eng-12-01-1', name: 'The Last Lesson (Alphonse Daudet) & Lost Spring (Anees Jung)', highYield: true },
      { id: 't-eng-12-01-2', name: 'Deep Water (William Douglas) & The Rattrap (Selma Lagerlöf)', highYield: true },
      { id: 't-eng-12-01-3', name: 'Poetry: My Mother at Sixty-Six (Kamala Das) & Keeping Quiet (Pablo Neruda)', highYield: true },
      { id: 't-eng-12-01-4', name: 'Formal Letters, Article/Report Writing, Invitations & Job Applications', highYield: true }
    ]
  }
];

// Helper functions for easy filtering across sections
export function getClassesForExam(exam: string): string[] {
  const found = EXAM_HIERARCHIES.find((e) => e.id === exam);
  return found ? found.classes : ['Class 10', 'Class 11', 'Class 12'];
}

export function getSubjectsForExamAndClass(exam: string, classLevel: string): string[] {
  const baseSubjects = SYLLABUS_EXAM_SUBJECTS_MAP[exam] || [];
  const chaptersInClass = COMPLETE_SYLLABUS_CHAPTERS.filter((c) => {
    if (classLevel.includes('11') && c.classLevel === 'Class 11') return true;
    if (classLevel.includes('12') && c.classLevel === 'Class 12') return true;
    if (classLevel.includes('10') && c.classLevel === 'Class 10') return true;
    if (classLevel.includes('Complete')) return true;
    return true;
  });

  const subjectSet = new Set<string>(baseSubjects);
  chaptersInClass.forEach((c) => {
    if (baseSubjects.length === 0 || baseSubjects.includes(c.subject)) {
      subjectSet.add(c.subject);
    }
  });

  return Array.from(subjectSet);
}

export function getChaptersForSubjectAndClass(subject: string, classLevel: string): SyllabusChapter[] {
  return COMPLETE_SYLLABUS_CHAPTERS.filter((c) => {
    const matchesSub = c.subject.toLowerCase() === subject.toLowerCase();
    if (!matchesSub) return false;

    if (classLevel.includes('10')) return c.classLevel === 'Class 10';
    if (classLevel.includes('11')) return c.classLevel === 'Class 11';
    if (classLevel.includes('12')) return c.classLevel === 'Class 12';
    return true; // Complete 11+12
  });
}

export function searchSyllabus(query: string): SyllabusChapter[] {
  const q = query.toLowerCase().trim();
  if (!q) return COMPLETE_SYLLABUS_CHAPTERS;

  return COMPLETE_SYLLABUS_CHAPTERS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.unitName.toLowerCase().includes(q) ||
      c.topics.some((t) => t.name.toLowerCase().includes(q))
  );
}
