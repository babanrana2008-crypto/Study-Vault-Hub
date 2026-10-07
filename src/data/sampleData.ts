import { Book, StudyNote, MCQQuestion, HighYieldTopic, MnemonicItem, UserStats } from '../types';
import officialLogoImg from '../assets/images/official_study_vault_logo_1790953350958.jpg';
import heroStudyBannerImg from '../assets/images/hero_study_banner_1790948663897.jpg';
import physicsCoverImg from '../assets/images/cover_physics_vol_1790948689583.jpg';
import chemCoverImg from '../assets/images/cover_chem_organic_1790948702423.jpg';

export const APP_LOGO = officialLogoImg || '/official_logo.jpg';
export const HERO_IMAGE = heroStudyBannerImg;
export const PHYSICS_COVER = physicsCoverImg;
export const CHEM_COVER = chemCoverImg;

export const PRESET_GOALS = [
  'NEET',
  'JEE Main',
  'JEE Advanced',
  'Class 10 Board',
  'Class 12 Board',
  'CUET',
  'Commerce',
  'CA',
  'Other Competitive Exams',
  'General Study'
];

export const GOAL_SUBJECTS_MAP: Record<string, string[]> = {
  NEET: ['Biology', 'Physics', 'Chemistry'],
  'JEE Main': ['Physics', 'Chemistry', 'Mathematics'],
  'JEE Advanced': ['Physics', 'Chemistry', 'Mathematics'],
  'Class 10 Board': ['Science', 'Mathematics', 'Social Science', 'English'],
  'Class 12 Board': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'],
  CUET: ['General Test', 'Domain Subjects', 'Language Comprehension'],
  Commerce: ['Accountancy', 'Business Studies', 'Economics', 'Applied Mathematics'],
  CA: ['Principles of Accounting', 'Business Laws', 'Quantitative Aptitude', 'Business Economics'],
  'Other Competitive Exams': ['Quantitative Aptitude', 'Logical Reasoning', 'General Awareness', 'English'],
  'General Study': ['Core Sciences', 'Mathematics', 'Humanities', 'General Studies']
};

export const SAMPLE_BOOKS: Book[] = [
  // Science & Engineering / Medical / Board (Original Study Vault Hub Reference Handbooks)
  {
    id: 'b1',
    title: 'SVH Biology Concept & Syllabus Revision Handbook',
    author: 'Study Vault Hub Academic Team (Biology Division)',
    subject: 'Biology',
    targetStreams: ['NEET', 'Class 12 Board', 'General Study'],
    edition: 'SVH Original Study Guide',
    rating: 4.9,
    totalChapters: 38,
    pages: 642,
    level: 'Core Curriculum Synopsis',
    accentColor: '#10b981',
    description: 'Original Study Vault Hub chapter-by-chapter study synopsis aligned with Class 11 and 12 biology syllabus concepts, key mechanisms, and revision summaries.',
    downloadSize: 'In-App Study Guide',
    chapters: [
      {
        id: 'c1',
        number: 1,
        title: 'Cell: The Unit of Life',
        pageRange: 'Sec. 1.1 - 1.4',
        summary: 'Prokaryotic and eukaryotic organelles, fluid mosaic model of cell membrane, and endomembrane system transport mechanisms.',
        keyConcepts: ['Fluid mosaic model (Singer & Nicolson 1972)', 'Endomembrane system: ER, Golgi, Lysosomes, Vacuoles', 'Ribosomes (70S vs 80S subunits)', 'Plasmids and inclusion bodies']
      },
      {
        id: 'c2',
        number: 2,
        title: 'Principles of Inheritance & Variation',
        pageRange: 'Sec. 2.1 - 2.5',
        summary: 'Mendelian ratios, chromosomal theory of inheritance, Morgan Drosophila experiments, sex linkage, and pedigree charts.',
        keyConcepts: ['Incomplete dominance vs Codominance (ABO blood)', 'Linkage vs Recombination frequency', 'Sickle-cell anemia (Glu to Val)', 'Thalassemia vs Hemophilia']
      }
    ]
  },
  {
    id: 'b2',
    title: 'SVH Physics: Mechanics, Rotational Dynamics & Optics Guide',
    author: 'Study Vault Hub Academic Team (Physics Division)',
    subject: 'Physics',
    targetStreams: ['JEE Main', 'JEE Advanced', 'NEET', 'Class 12 Board'],
    edition: 'SVH Original Concept Series',
    rating: 4.95,
    totalChapters: 22,
    pages: 462,
    level: 'Foundational to Advanced',
    coverImage: PHYSICS_COVER,
    accentColor: '#3b82f6',
    description: 'Original Study Vault Hub conceptual physics reference handbook covering mechanics, rotational motion, and ray optics derivations for entrance and board aspirants.',
    downloadSize: 'In-App Study Guide',
    chapters: [
      {
        id: 'cp1',
        number: 1,
        title: 'Rotational Dynamics & Moment of Inertia',
        pageRange: 'Sec. 1.1 - 1.6',
        summary: 'Torque balance, angular momentum conservation, rolling without slipping on inclined planes, parallel and perpendicular axis theorems.',
        keyConcepts: ['Torque tau = I * alpha', 'Angular momentum conservation L = I * omega', 'Pure rolling: v_cm = R * omega', 'Radius of gyration formulas']
      },
      {
        id: 'cp2',
        number: 2,
        title: 'Ray Optics and Optical Instruments',
        pageRange: 'Sec. 2.1 - 2.6',
        summary: 'Snell’s law, total internal reflection, lens maker formula, compound microscope and astronomical telescope magnification.',
        keyConcepts: ['Critical angle sin(theta_c) = 1/mu', 'Lens Maker Formula: 1/f = (mu-1)(1/R1 - 1/R2)', 'Compound microscope magnification', 'Prism formula']
      }
    ]
  },
  {
    id: 'b3',
    title: 'SVH Organic Chemistry: Reaction Mechanisms & Stereochemistry',
    author: 'Study Vault Hub Academic Team (Chemistry Division)',
    subject: 'Chemistry',
    targetStreams: ['JEE Main', 'JEE Advanced', 'NEET', 'Class 12 Board'],
    edition: 'SVH Original Revision Edition',
    rating: 4.88,
    totalChapters: 18,
    pages: 512,
    level: 'Reaction Mechanisms & Concepts',
    coverImage: CHEM_COVER,
    accentColor: '#f59e0b',
    description: 'Original Study Vault Hub chemistry study guide covering nucleophilic substitution pathways, electrophilic aromatic substitutions, and stereochemistry.',
    downloadSize: 'In-App Study Guide',
    chapters: [
      {
        id: 'cc1',
        number: 1,
        title: 'Reaction Mechanisms: SN1 vs SN2 Substitution',
        pageRange: 'Sec. 1.1 - 1.5',
        summary: 'Nucleophilic aliphatic substitution pathways, stereochemical inversion vs racemization, solvent effects (protic vs aprotic).',
        keyConcepts: ['Carbocation stability order (3° > 2° > 1°)', 'Walden inversion in bimolecular substitution (SN2)', 'Polar aprotic solvents accelerate SN2', 'Leaving group order: I- > Br- > Cl-']
      }
    ]
  },
  {
    id: 'b4',
    title: 'SVH Analytical Mathematics: Calculus & Vectors Compendium',
    author: 'Study Vault Hub Academic Team (Mathematics Division)',
    subject: 'Mathematics',
    targetStreams: ['JEE Main', 'JEE Advanced', 'Class 12 Board', 'CUET'],
    edition: 'SVH Original Calculus Series',
    rating: 4.92,
    totalChapters: 20,
    pages: 580,
    level: 'Analytical Mathematics',
    accentColor: '#8b5cf6',
    description: 'Original Study Vault Hub mathematics reference guide for Differential and Integral Calculus, Coordinate Geometry, Matrices, Determinants, and Vector 3D.',
    downloadSize: 'In-App Study Guide',
    chapters: [
      {
        id: 'cm1',
        number: 1,
        title: 'Application of Derivatives & Extreme Values',
        pageRange: 'Sec. 1.1 - 1.5',
        summary: 'Rate of change, tangents and normals, Rolle’s theorem, LMVT, critical points, and optimization problems.',
        keyConcepts: ['First derivative test for maxima/minima', 'Concavity and point of inflection: f"(x) = 0', 'Mean Value Theorem conditions', 'Rate measure modeling']
      },
      {
        id: 'cm2',
        number: 2,
        title: 'Definite Integrals & Area Under Curves',
        pageRange: 'Sec. 2.1 - 2.6',
        summary: 'Properties of definite integrals, symmetry properties, Leibniz integral rule, and enclosed area bounding.',
        keyConcepts: ['Property: int_a^b f(x)dx = int_a^b f(a+b-x)dx', 'Even/Odd symmetry simplification', 'Area bounded between intersecting curves', 'Leibniz rule differentiation under integral sign']
      }
    ]
  },
  // Commerce & CA
  {
    id: 'b5',
    title: 'SVH Financial Accounting & Corporate Statements Guide',
    author: 'Study Vault Hub Academic Team (Commerce Division)',
    subject: 'Accountancy',
    targetStreams: ['Commerce', 'CA', 'Class 12 Board', 'CUET'],
    edition: 'SVH Original Commerce Series',
    rating: 4.9,
    totalChapters: 16,
    pages: 490,
    level: 'Commerce & Accounting Foundations',
    accentColor: '#059669',
    description: 'Original Study Vault Hub study guide covering partnership accounts, share capital accounting, debentures, cash flow statements, and financial ratio analysis.',
    downloadSize: 'In-App Study Guide',
    chapters: [
      {
        id: 'ca1',
        number: 1,
        title: 'Accounting for Share Capital & Forfeiture',
        pageRange: 'Sec. 1.1 - 1.4',
        summary: 'Issue of shares at par/premium, calls in arrears, pro-rata allotment in oversubscription, and forfeiture of shares.',
        keyConcepts: ['Pro-rata allotment calculations', 'Journal entries for forfeiture of shares', 'Re-issue of forfeited shares at discount', 'Transfer to Capital Reserve']
      }
    ]
  },
  {
    id: 'b6',
    title: 'SVH Macroeconomics & Economic Development Synopsis',
    author: 'Study Vault Hub Academic Team (Economics Division)',
    subject: 'Economics',
    targetStreams: ['Commerce', 'Class 12 Board', 'CUET', 'CA'],
    edition: 'SVH Original Economics Series',
    rating: 4.86,
    totalChapters: 14,
    pages: 430,
    level: 'Macroeconomic Principles',
    accentColor: '#d97706',
    description: 'Original Study Vault Hub revision guide covering national income aggregates, money and banking, aggregate demand and supply, government budget, and foreign exchange.',
    downloadSize: 'In-App Study Guide',
    chapters: [
      {
        id: 'ce1',
        number: 1,
        title: 'National Income & Related Aggregates',
        pageRange: 'Sec. 1.1 - 1.5',
        summary: 'Value added method, income method, expenditure method, circular flow of income, GDP deflator, and real vs nominal GDP.',
        keyConcepts: ['Circular flow of income (Two-sector model)', 'GDP at MP to NNP at FC conversions', 'Net Indirect Taxes = Indirect Taxes - Subsidies', 'NFIA = Factor Income from Abroad - Factor Income to Abroad']
      }
    ]
  },
  // Class 10 Board
  {
    id: 'b7',
    title: 'SVH Class 10 Science Foundations & Board Revision Guide',
    author: 'Study Vault Hub Academic Team (Secondary Science Division)',
    subject: 'Science',
    targetStreams: ['Class 10 Board', 'General Study'],
    edition: 'SVH Original Secondary Series',
    rating: 4.88,
    totalChapters: 16,
    pages: 380,
    level: 'Secondary School Foundation',
    accentColor: '#0284c7',
    description: 'Original Study Vault Hub revision handbook for chemical reactions, acids, bases and salts, life processes, light reflection, electricity, and magnetic effects.',
    downloadSize: 'In-App Study Guide',
    chapters: [
      {
        id: 'cs1',
        number: 1,
        title: 'Life Processes & Cellular Respiration',
        pageRange: 'Sec. 1.1 - 1.4',
        summary: 'Autotrophic nutrition, human digestive tract, aerobic vs anaerobic breakdown of glucose, nephron structure and filtration.',
        keyConcepts: ['Photosynthesis: light & dark reactions', 'Pathway of glucose breakdown (Pyruvate formation)', 'Double circulation in human heart', 'Nephron ultrafiltration and selective reabsorption']
      }
    ]
  }
];

export const SAMPLE_NOTES: StudyNote[] = [
  {
    id: 'n1',
    title: 'Endocrine Gland Hormones & Feedback Loops',
    subject: 'Biology',
    targetStreams: ['NEET', 'Class 12 Board', 'General Study'],
    category: 'Human Physiology',
    readTime: '6 min read',
    highWeightage: true,
    examRelevance: 'Expected 3-4 questions in Biology papers',
    summary: 'Concise high-yield cheat sheet mapping hormones, endocrine origins, target organs, second messengers, and clinical disorders.',
    content: {
      overview: 'Hormones act as intercellular chemical messengers produced in trace amounts. Steroid hormones cross the lipid bilayer to bind nuclear receptors, whereas peptide hormones bind membrane receptors.',
      keyTakeaways: [
        'Anterior Pituitary: GH, TSH, ACTH, PRL, LH, FSH. Posterior stores Oxytocin and Vasopressin.',
        'Thyroid: T3 and T4 require iodine. Calcitonin is hypocalcemic, decreasing blood Ca2+.',
        'Parathyroid: PTH is hypercalcemic, increasing blood Ca2+ by bone resorption.',
        'Adrenal Cortex: Cortisol stimulates gluconeogenesis; Aldosterone regulates Na+/K+ balance.'
      ],
      formulasOrMechanisms: [
        { label: 'Calcium Homeostasis', formula: 'PTH (Raises Ca2+) <---> Calcitonin (Lowers Ca2+)', note: 'Antagonistic regulatory pair' }
      ],
      examTips: 'NCERT tip: Oxytocin and Vasopressin are NOT synthesized by the neurohypophysis; they are synthesized in the hypothalamus!'
    },
    lastUpdated: 'Updated 2 days ago'
  },
  {
    id: 'n2',
    title: 'Calculus: Indeterminate Forms & L’Hopital’s Rule',
    subject: 'Mathematics',
    targetStreams: ['JEE Main', 'JEE Advanced', 'Class 12 Board', 'CUET'],
    category: 'Limits, Continuity & Differentiability',
    readTime: '7 min read',
    highWeightage: true,
    examRelevance: 'Guaranteed 2 questions in JEE & Board calculus sections',
    summary: 'Master shortcuts for evaluating 0/0 and inf/inf limits, Taylor series expansions, and sandwich theorem approximations.',
    content: {
      overview: 'Limits form the foundation for all differential and integral calculus problems. Recognizing algebraic factorization vs series expansions saves time.',
      keyTakeaways: [
        'L’Hopital’s Rule applies only to 0/0 or inf/inf indeterminate forms.',
        'Standard expansions: sin x = x - x^3/6 + ..., e^x = 1 + x + x^2/2! + ..., ln(1+x) = x - x^2/2 + ...',
        'Limits of the form 1^inf: lim_{x->a} [f(x)]^g(x) = e^{lim_{x->a} g(x)[f(x) - 1]}.'
      ],
      formulasOrMechanisms: [
        { label: '1^Infinity Shortcut', formula: 'lim [f(x)]^g(x) = exp( lim g(x) * (f(x) - 1) )', note: 'Essential for JEE limit shortcuts' }
      ],
      examTips: 'Always check if the form is truly 0/0 before applying L’Hopital’s Rule. Differentiating when the denominator is non-zero causes wrong answers.'
    },
    lastUpdated: 'Updated yesterday'
  },
  {
    id: 'n3',
    title: 'Ray Optics: Lens Maker & Optical Instruments',
    subject: 'Physics',
    targetStreams: ['JEE Main', 'JEE Advanced', 'NEET', 'Class 12 Board'],
    category: 'Optics & Wave Motion',
    readTime: '8 min read',
    highWeightage: true,
    examRelevance: 'Expected 2-3 questions in Physics sections',
    summary: 'Complete formula matrix covering refraction at spherical surfaces, combination of thin lenses, and prism deviation.',
    content: {
      overview: 'Optics questions test sign convention discipline and compound systems. The lens maker formula links curvature radii and refractive index with focal length.',
      keyTakeaways: [
        'Cartesian sign convention: Light travel direction is positive (+); opposite is negative (-).',
        'Lens Maker Formula: 1/f = ((mu_lens / mu_med) - 1) * (1/R1 - 1/R2).',
        'Two thin lenses in contact: Effective Power P = P1 + P2.'
      ],
      formulasOrMechanisms: [
        { label: "Lens Maker's Formula", formula: '1/f = ((mu_lens / mu_med) - 1) * (1/R1 - 1/R2)' }
      ],
      examTips: 'Always check medium surrounding the lens! If liquid has same index as glass, focal length becomes infinite.'
    },
    lastUpdated: 'Updated 3 days ago'
  },
  {
    id: 'n4',
    title: 'Partnership Accounts: Admission & Goodwill Valuation',
    subject: 'Accountancy',
    targetStreams: ['Commerce', 'CA', 'Class 12 Board'],
    category: 'Partnership Accounting',
    readTime: '7 min read',
    highWeightage: true,
    examRelevance: 'Expected 10-12 marks in Board / CA exams',
    summary: 'Calculation of new profit sharing ratio, sacrificing ratio, treatment of goodwill (AS-26), and revaluation of assets and liabilities.',
    content: {
      overview: 'Admission of a partner leads to reconstitution of the partnership firm. Existing profit sharing ratios must be adjusted and reserves distributed.',
      keyTakeaways: [
        'Sacrificing Ratio = Old Ratio - New Ratio.',
        'Goodwill brought in cash by incoming partner is credited to sacrificing partners in sacrificing ratio.',
        'Revaluation Account is a nominal account. Profit on revaluation is credited to old partners in old ratio.'
      ],
      formulasOrMechanisms: [
        { label: 'Super Profit Goodwill', formula: 'Goodwill = Super Profit * Number of Years Purchase', note: 'Super Profit = Actual Average Profit - Normal Profit' }
      ],
      examTips: 'Per AS-26, self-generated goodwill cannot be recorded in books of accounts; only purchased goodwill can be recognized.'
    },
    lastUpdated: 'Updated 4 days ago'
  },
  {
    id: 'n5',
    title: 'Chemical Bonding: MOT, Bond Order & Hybridization',
    subject: 'Chemistry',
    targetStreams: ['JEE Main', 'JEE Advanced', 'NEET', 'Class 12 Board'],
    category: 'Inorganic Chemistry',
    readTime: '7 min read',
    highWeightage: true,
    examRelevance: 'Guaranteed 2 questions in competitive chemistry',
    summary: 'Fast mental shortcuts for calculating bond orders of diatomics (up to 20 electrons), magnetic behavior, and steric number geometries.',
    content: {
      overview: 'Molecular Orbital Theory explains paramagnetism in O2 and B2 where valence bond theory failed.',
      keyTakeaways: [
        'Bond Order Shortcut: 14 electrons = Bond Order 3.0. For every electron added or removed, deduct 0.5.',
        '10 e- = 1.0, 12 e- = 2.0, 14 e- = 3.0, 16 e- = 2.0 (paramagnetic), 18 e- = 1.0.',
        'Paramagnetic species have unpaired electrons.'
      ],
      formulasOrMechanisms: [
        { label: 'Bond Order Formula', formula: 'Bond Order = 1/2 * (N_bonding - N_antibonding)' }
      ],
      examTips: 'NO has 15 electrons, so Bond Order = 2.5 and it is paramagnetic!'
    },
    lastUpdated: 'Updated yesterday'
  }
];

export const SAMPLE_MCQS: MCQQuestion[] = [
  // Biology
  {
    id: 'q1',
    subject: 'Biology',
    targetStreams: ['NEET', 'Class 12 Board', 'General Study'],
    topic: 'Cell Biology',
    difficulty: 'Moderate',
    year: 'Standard Exam Series',
    question: 'Which of the following cellular organelles is enclosed by a single membrane and contains acid hydrolases active at acidic pH?',
    options: ['Mitochondria', 'Lysosome', 'Chloroplast', 'Ribosome'],
    correctIndex: 1,
    explanation: 'Lysosomes are single membrane-bound vesicular structures containing hydrolytic enzymes optimally active at acidic pH (~5). Mitochondria and chloroplasts are double-membraned.',
    hint: 'Think of the organelle that degrades waste materials inside the cell.'
  },
  // Physics
  {
    id: 'q2',
    subject: 'Physics',
    targetStreams: ['JEE Main', 'JEE Advanced', 'NEET', 'Class 12 Board'],
    topic: 'Mechanics & Rotational Motion',
    difficulty: 'Moderate',
    year: 'Standard Exam Series',
    question: 'A solid cylinder and a hollow cylinder of the same mass and external radius are rolled down an inclined plane from the same height without slipping. Which one reaches the bottom first?',
    options: [
      'The hollow cylinder',
      'The solid cylinder',
      'Both reach at the same instant',
      'Depends on the coefficient of friction only'
    ],
    correctIndex: 1,
    explanation: 'Linear acceleration a = (g sin theta) / (1 + I / (m R^2)). Solid cylinder has smaller moment of inertia ratio (0.5 vs 1.0), higher acceleration, and reaches the bottom first.',
    hint: 'Lower moment of inertia leads to higher linear acceleration.'
  },
  // Mathematics
  {
    id: 'q3',
    subject: 'Mathematics',
    targetStreams: ['JEE Main', 'JEE Advanced', 'Class 12 Board', 'CUET'],
    topic: 'Calculus & Limits',
    difficulty: 'Moderate',
    year: 'Competitive Entrance Standard',
    question: 'What is the value of the limit lim_{x -> 0} (sin(5x) / tan(2x))?',
    options: ['5/2', '2/5', '1', 'Does not exist'],
    correctIndex: 0,
    explanation: 'Rewrite as lim_{x -> 0} [ (sin(5x)/5x) * 5x ] / [ (tan(2x)/2x) * 2x ] = (1 * 5) / (1 * 2) = 5/2.',
    hint: 'Use the standard limits: lim sin(kx)/kx = 1 and lim tan(mx)/mx = 1.'
  },
  // Chemistry
  {
    id: 'q4',
    subject: 'Chemistry',
    targetStreams: ['JEE Main', 'JEE Advanced', 'NEET', 'Class 12 Board'],
    topic: 'Chemical Bonding',
    difficulty: 'Easy',
    year: 'Competitive Series',
    question: 'According to Molecular Orbital Theory, which of the following diatomic species is paramagnetic with a bond order of 2.0?',
    options: ['C2', 'O2', 'N2', 'F2'],
    correctIndex: 1,
    explanation: 'O2 has 16 electrons. Its antibonding pi* orbitals contain two unpaired electrons, conferring paramagnetism with Bond Order = (10 - 6)/2 = 2.0.',
    hint: 'Total of 16 electrons with two unpaired spins.'
  },
  // Accountancy
  {
    id: 'q5',
    subject: 'Accountancy',
    targetStreams: ['Commerce', 'CA', 'Class 12 Board'],
    topic: 'Partnership Accounts',
    difficulty: 'Moderate',
    year: 'Professional Entrance Standard',
    question: 'A and B are partners sharing profits in the ratio 3:2. C is admitted for 1/5th share in profits which he acquires equally from A and B. What is the new profit sharing ratio?',
    options: ['5:3:2', '2:2:1', '1:1:1', '3:2:1'],
    correctIndex: 0,
    explanation: 'C acquires 1/10 from A and 1/10 from B. A’s new share = 3/5 - 1/10 = 5/10. B’s new share = 2/5 - 1/10 = 3/10. C’s share = 2/10. Hence, new ratio is 5:3:2.',
    hint: 'Deduct half of C’s incoming share from each existing partner.'
  },
  // Economics
  {
    id: 'q6',
    subject: 'Economics',
    targetStreams: ['Commerce', 'Class 12 Board', 'CUET', 'CA'],
    topic: 'Macroeconomics',
    difficulty: 'Easy',
    year: 'Academic Standard',
    question: 'Which of the following is considered a transfer payment and is NOT included in the calculation of National Income?',
    options: ['Retirement Pension', 'Old-age Pension', 'Salaries of teachers', 'Profits of enterprise'],
    correctIndex: 1,
    explanation: 'Old-age pension is a unilateral transfer payment without any corresponding current productive contribution. Retirement pension is deferred wage and is included.',
    hint: 'A payment made without exchange for goods or services.'
  },
  // Science Class 10
  {
    id: 'q7',
    subject: 'Science',
    targetStreams: ['Class 10 Board', 'General Study'],
    topic: 'Chemical Reactions & Equations',
    difficulty: 'Easy',
    year: 'Secondary Board Standard',
    question: 'When white silver chloride (AgCl) is exposed to sunlight for a long time, it turns grey due to which type of chemical reaction?',
    options: [
      'Photochemical decomposition of silver chloride into silver and chlorine',
      'Sublimation of silver chloride',
      'Oxidation of chlorine gas',
      'Combination reaction'
    ],
    correctIndex: 0,
    explanation: '2AgCl(s) + Sunlight -> 2Ag(s) + Cl2(g). This is a photochemical decomposition reaction where silver chloride decomposes into grey elemental silver and chlorine gas.',
    hint: 'Energy from sunlight splits the compound into metallic silver.'
  }
];

export const HIGH_YIELD_TOPICS: HighYieldTopic[] = [
  // General & Competitive
  { id: 'hy1', subject: 'Biology', targetStream: 'NEET', chapter: 'Genetics and Evolution', weightagePercent: 18, expectedQuestions: 18, difficultyLevel: 'High', status: 'Mastered' },
  { id: 'hy2', subject: 'Biology', targetStream: 'NEET', chapter: 'Human Physiology', weightagePercent: 20, expectedQuestions: 20, difficultyLevel: 'High', status: 'In Progress' },
  { id: 'hy3', subject: 'Physics', targetStream: 'JEE Main', chapter: 'Mechanics & Rotational Dynamics', weightagePercent: 30, expectedQuestions: 8, difficultyLevel: 'High', status: 'In Progress' },
  { id: 'hy4', subject: 'Mathematics', targetStream: 'JEE Main', chapter: 'Differential & Integral Calculus', weightagePercent: 32, expectedQuestions: 9, difficultyLevel: 'High', status: 'To Revise' },
  { id: 'hy5', subject: 'Chemistry', targetStream: 'JEE Main', chapter: 'Organic Reaction Mechanisms', weightagePercent: 35, expectedQuestions: 10, difficultyLevel: 'High', status: 'In Progress' },
  { id: 'hy6', subject: 'Accountancy', targetStream: 'Commerce', chapter: 'Partnership & Company Accounts', weightagePercent: 40, expectedQuestions: 12, difficultyLevel: 'High', status: 'Mastered' },
  { id: 'hy7', subject: 'Economics', targetStream: 'Commerce', chapter: 'National Income & Money/Banking', weightagePercent: 35, expectedQuestions: 10, difficultyLevel: 'Medium', status: 'In Progress' },
  { id: 'hy8', subject: 'Mathematics', targetStream: 'Class 10 Board', chapter: 'Trigonometry & Quadratic Equations', weightagePercent: 28, expectedQuestions: 8, difficultyLevel: 'Medium', status: 'Mastered' },
  { id: 'hy9', subject: 'Science', targetStream: 'Class 10 Board', chapter: 'Chemical Reactions & Life Processes', weightagePercent: 30, expectedQuestions: 10, difficultyLevel: 'Foundational', status: 'In Progress' }
];

export const MNEMONICS_BANK: MnemonicItem[] = [
  {
    id: 'm1',
    subject: 'Biology',
    targetStream: 'NEET',
    title: 'Essential Amino Acids',
    acronym: 'PVT TIM HALL',
    standsFor: ['Phenylalanine', 'Valine', 'Threonine', 'Tryptophan', 'Isoleucine', 'Methionine', 'Histidine', 'Arginine', 'Leucine', 'Lysine'],
    explanation: 'The 10 amino acids that the human body cannot synthesize de novo in sufficient quantities.'
  },
  {
    id: 'm2',
    subject: 'Physics',
    targetStream: 'General Study',
    title: 'Electromagnetic Spectrum (Decreasing Wavelength)',
    acronym: 'R-M-I-V-U-X-G',
    standsFor: ['Radio waves', 'Microwaves', 'Infrared', 'Visible light', 'Ultraviolet', 'X-rays', 'Gamma rays'],
    explanation: 'From lowest frequency to highest frequency (highest photon energy).'
  },
  {
    id: 'm3',
    subject: 'Chemistry',
    targetStream: 'General Study',
    title: 'Redox Reactions Electron Flow',
    acronym: 'OIL RIG',
    standsFor: ['Oxidation Is Loss of electrons', 'Reduction Is Gain of electrons'],
    explanation: 'Universal principle to determine reducing and oxidizing agents.'
  },
  {
    id: 'm4',
    subject: 'Mathematics',
    targetStream: 'JEE Main',
    title: 'Trigonometric Signs in 4 Quadrants',
    acronym: 'All Silver Tea Cups (ASTC)',
    standsFor: ['Quadrant I: ALL positive', 'Quadrant II: SIN positive', 'Quadrant III: TAN positive', 'Quadrant IV: COS positive'],
    explanation: 'Instant sign allocation for trigonometric functions across angle rotations.'
  }
];

export const INITIAL_USER_STATS: UserStats = {
  name: '',
  profilePhotoUrl: null,
  hasCompletedSetup: false,
  themePreference: 'light',
  examCountdown: null,
  selectedGoals: [],
  activeGoal: '',
  customGoals: [],
  targetScore: undefined,
  targetCollegeOrInstitution: '',
  questionsAttempted: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  totalStudyMinutes: 0,
  streak: {
    current: 0,
    lastActiveDate: ''
  },
  dailyGoals: {
    studyMinutes: 120,
    questionCount: 20,
    taskCount: 3
  },
  tasks: [],
  studySessions: [],
  practiceHistory: [],
  topicsStudied: [],
  subjectsStudied: {},
  bookmarkedItemIds: [],
  completedNoteIds: [],
  readBookIds: []
};
