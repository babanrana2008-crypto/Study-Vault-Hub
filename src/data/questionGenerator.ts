import { MCQQuestion } from '../types';
import { SAMPLE_MCQS } from './sampleData';

export interface GenerateQuestionsParams {
  exam: string;
  classLevel: string;
  subject: string;
  chapterName: string;
  topicName?: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  count: number;
}

interface RawQuestionTemplate {
  q: string;
  opts: [string, string, string, string];
  correct: number;
  exp: string;
  hint: string;
}

/**
 * Validates a single MCQQuestion to ensure it has a clean stem, 4 distinct valid options,
 * a valid answer key index, a meaningful explanation, subject, topic, and difficulty.
 */
export function isValidMCQQuestion(q: unknown): q is MCQQuestion {
  if (!q || typeof q !== 'object') return false;
  const item = q as MCQQuestion;
  if (typeof item.id !== 'string' || !item.id.trim()) return false;
  if (typeof item.question !== 'string' || item.question.trim().length < 15) return false;
  if (typeof item.subject !== 'string' || !item.subject.trim()) return false;
  if (typeof item.topic !== 'string' || !item.topic.trim()) return false;
  if (!['Easy', 'Moderate', 'Hard'].includes(item.difficulty)) return false;
  if (typeof item.explanation !== 'string' || item.explanation.trim().length < 10) return false;
  if (!Array.isArray(item.options) || item.options.length !== 4) return false;

  const normalizedOpts = new Set<string>();
  for (const opt of item.options) {
    if (typeof opt !== 'string' || !opt.trim()) return false;
    const norm = opt.trim().toLowerCase();
    if (normalizedOpts.has(norm)) return false; // Reject duplicate options
    normalizedOpts.add(norm);
  }

  if (
    typeof item.correctIndex !== 'number' ||
    !Number.isInteger(item.correctIndex) ||
    item.correctIndex < 0 ||
    item.correctIndex >= item.options.length
  ) {
    return false;
  }

  return true;
}

/**
 * Normalizes question text to detect repeated or near-duplicate questions.
 */
function normalizeQuestionStem(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Deterministically permutes options so the correct answer is distributed evenly across A, B, C, D
 * while preserving the exact answer key mapping.
 */
function shuffleOptionsWithCorrectIndex(
  options: [string, string, string, string],
  correctIndex: number,
  seedIndex: number
): { options: string[]; correctIndex: number } {
  const correctText = options[correctIndex];
  const shift = (seedIndex * 3 + 1) % 4;
  const rotated: string[] = [];
  for (let i = 0; i < 4; i++) {
    rotated.push(options[(i + shift) % 4]);
  }
  const newCorrectIndex = rotated.indexOf(correctText);
  return {
    options: rotated,
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
  };
}

/**
 * Validates, sanitizes, and de-duplicates a list of MCQ questions.
 * Invalid, corrupted, or duplicate questions are rejected.
 */
export function validateAndSanitizeQuestions(questions: MCQQuestion[]): MCQQuestion[] {
  const seenStems = new Set<string>();
  const seenIds = new Set<string>();
  const validList: MCQQuestion[] = [];

  for (const q of questions) {
    if (!isValidMCQQuestion(q)) continue;
    const stemKey = normalizeQuestionStem(q.question);
    if (seenStems.has(stemKey) || seenIds.has(q.id)) continue;
    seenStems.add(stemKey);
    seenIds.add(q.id);
    validList.push(q);
  }

  return validList;
}

// Smart algorithmic topic-aligned question generators for authentic academic preparation
export function generateDynamicQuestions(params: GenerateQuestionsParams): MCQQuestion[] {
  const { exam, classLevel, subject, chapterName, topicName, difficulty, count } = params;
  const effectiveTopic = topicName && topicName !== 'All Topics' ? topicName : chapterName;
  const subLower = subject.toLowerCase();

  // First gather any matching curated questions from SAMPLE_MCQS that match subject
  const curatedMatches = SAMPLE_MCQS.filter(
    (q) => q.subject.toLowerCase() === subLower && isValidMCQQuestion(q)
  );

  const rawPool: RawQuestionTemplate[] = [];
  if (subLower.includes('bio')) {
    rawPool.push(...getBiologyQuestionBank(chapterName, effectiveTopic));
  } else if (subLower.includes('phy')) {
    rawPool.push(...getPhysicsQuestionBank(chapterName, effectiveTopic));
  } else if (subLower.includes('chem')) {
    rawPool.push(...getChemistryQuestionBank(chapterName, effectiveTopic));
  } else if (subLower.includes('math')) {
    rawPool.push(...getMathQuestionBank(chapterName, effectiveTopic));
  } else if (subLower.includes('account') || subLower.includes('business') || subLower.includes('eco')) {
    rawPool.push(...getCommerceQuestionBank(chapterName, effectiveTopic));
  } else if (subLower.includes('social') || subLower.includes('hist') || subLower.includes('pol') || subLower.includes('geo')) {
    rawPool.push(...getSocialScienceQuestionBank(chapterName, effectiveTopic));
  } else if (subLower.includes('comp')) {
    rawPool.push(...getComputerQuestionBank(chapterName, effectiveTopic));
  } else {
    rawPool.push(...getGeneralQuestionBank(subject, chapterName, effectiveTopic));
  }

  const results: MCQQuestion[] = [];
  const seenStems = new Set<string>();
  const batchTimestamp = Date.now();

  for (let i = 0; i < rawPool.length && results.length < count; i++) {
    const item = rawPool[i];
    const stem = normalizeQuestionStem(item.q);
    if (seenStems.has(stem)) continue;

    const { options, correctIndex } = shuffleOptionsWithCorrectIndex(item.opts, item.correct, i);
    const candidate: MCQQuestion = {
      id: `gen-${subLower.slice(0, 3)}-${batchTimestamp}-${i}`,
      subject,
      targetStreams: [exam],
      topic: effectiveTopic,
      difficulty,
      year: `${exam} ${classLevel} Target`,
      question: item.q,
      options,
      correctIndex,
      explanation: item.exp,
      hint: item.hint,
    };

    if (isValidMCQQuestion(candidate)) {
      seenStems.add(stem);
      results.push(candidate);
    }
  }

  // If count > results.length, supplement with curated non-duplicate questions
  for (const curated of curatedMatches) {
    if (results.length >= count) break;
    const stem = normalizeQuestionStem(curated.question);
    if (!seenStems.has(stem)) {
      seenStems.add(stem);
      results.push({
        ...curated,
        id: `${curated.id}-${batchTimestamp}`,
        difficulty,
      });
    }
  }

  return validateAndSanitizeQuestions(results);
}

function getBiologyQuestionBank(chapter: string, topic: string): RawQuestionTemplate[] {
  return [
    {
      q: `In the context of ${topic} (${chapter}), which statement is strictly accurate regarding biological membrane asymmetry and oxidative phosphorylation?`,
      opts: [
        'The inner mitochondrial membrane maintains a high protein-to-lipid ratio (~75:25) essential for electron transport complexes and ATP synthase.',
        'Prokaryotic ribosomes sediment at 80S and are composed of 60S and 40S subunits.',
        'Crossing over between non-sister chromatids occurs during the Leptotene stage of Prophase I.',
        'Primary endosperm nucleus in typical angiosperm double fertilization is diploid (2n).',
      ],
      correct: 0,
      exp: 'The inner mitochondrial membrane contains ~75% protein by mass, housing Complexes I–IV and F0-F1 ATP synthase to maintain the proton motive force.',
      hint: 'Recall the Singer-Nicolson fluid mosaic model and mitochondrial cristae specialization.',
    },
    {
      q: `During enzymatic catalysis studied under ${chapter} (${topic}), how does an enzyme accelerate a biochemical reaction without altering the equilibrium constant?`,
      opts: [
        'By stabilizing the transition state complex and lowering the Gibbs free energy of activation.',
        'By increasing the overall negative enthalpy change of the substrate-to-product conversion.',
        'By undergoing irreversible covalent degradation of its catalytic active-site residues.',
        'By shifting the thermodynamic equilibrium constant K_eq toward product formation.',
      ],
      correct: 0,
      exp: 'Enzymes lower the activation energy barrier (Delta G‡) by complementary binding to the transition state, leaving overall Delta G and K_eq unchanged.',
      hint: 'Consider transition-state stabilization in the induced-fit model.',
    },
    {
      q: `In a dihybrid test cross related to ${topic}, two linked genes A and B are located 16 centiMorgans (map units) apart on the same autosome. What percentage of the progeny will exhibit parental phenotypes?`,
      opts: [
        '84% total parental progeny (42% of each parental type)',
        '16% total parental progeny (8% of each parental type)',
        '50% parental and 50% recombinant progeny',
        '92% total parental progeny (46% of each parental type)',
      ],
      correct: 0,
      exp: '1 map unit (cM) = 1% recombination frequency. With 16 cM distance, recombinant progeny = 16% (8% each) and parental progeny = 100% - 16% = 84% (42% each).',
      hint: 'Subtract the percentage of recombinants (equal to map distance in cM) from 100%.',
    },
    {
      q: `Regarding homeostatic endocrine regulation in ${chapter} (${topic}), how do elevated circulating levels of free thyroid hormones (T3 and T4) regulate the hypothalamo-pituitary axis?`,
      opts: [
        'They exert negative feedback inhibition on both hypothalamic TRH and anterior pituitary TSH secretion.',
        'They trigger positive feedback stimulation of thyrotropin-releasing hormone from the posterior pituitary.',
        'They directly inhibit calcitonin synthesis in the adrenal cortex.',
        'They require calcium-dependent exocytosis through the blood-brain barrier without carrier proteins.',
      ],
      correct: 0,
      exp: 'High circulating T3/T4 suppresses TRH from the hypothalamus and TSH from thyrotrophs of the adenohypophysis via classic negative feedback.',
      hint: 'Endocrine axes maintain physiological set-points via negative feedback loops.',
    },
    {
      q: `In a population genetics study for ${topic} (${chapter}), the frequency of the recessive allele (q) for an autosomal trait in Hardy-Weinberg equilibrium is 0.3. What is the frequency of heterozygous carriers (2pq)?`,
      opts: ['0.42 (42%)', '0.09 (9%)', '0.49 (49%)', '0.21 (21%)'],
      correct: 0,
      exp: 'Given q = 0.3, p = 1 - q = 0.7. The heterozygous carrier frequency is 2pq = 2 × 0.7 × 0.3 = 0.42 (42%).',
      hint: 'Use p + q = 1 and calculate 2pq.',
    },
    {
      q: `During the C4 photosynthetic pathway (Hatch-Slack pathway) relevant to ${chapter}, which enzyme catalyzes the primary fixation of atmospheric CO2 in mesophyll cells?`,
      opts: [
        'PEP carboxylase (Phosphoenolpyruvate carboxylase)',
        'RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase)',
        'Pyruvate orthophosphate dikinase',
        'NADP-malic enzyme in bundle sheath plastids',
      ],
      correct: 0,
      exp: 'Mesophyll cells of C4 plants lack RuBisCO and fix HCO3- into oxaloacetate (OAA) using PEP carboxylase, which has high affinity for carbon and no oxygenase activity.',
      hint: 'Identify the oxygen-insensitive carboxylase located in C4 mesophyll cytosol.',
    },
    {
      q: `In molecular genetics (${topic}), if a double-stranded DNA molecule contains 22% Cytosine on a molar basis, what is the exact percentage of Adenine (A) according to Chargaff’s parity rules?`,
      opts: ['28%', '22%', '44%', '56%'],
      correct: 0,
      exp: 'In dsDNA, %C = %G = 22%, accounting for 44% of total bases. The remaining 56% is split equally between %A and %T, giving %A = 28%.',
      hint: 'Apply %A + %G = 50% (or %A + %T + %G + %C = 100%).',
    },
    {
      q: `Which immunological class of human antibodies (${topic}) is a pentamer capable of potent complement activation and serves as the primary indicator of acute recent infection?`,
      opts: ['IgM', 'IgG', 'Secretory IgA', 'IgE'],
      correct: 0,
      exp: 'IgM is the first immunoglobulin class synthesized during a primary immune response and exists in serum as a J-chain-linked pentamer with 10 antigen-binding sites.',
      hint: 'Think of the largest pentameric immunoglobulin produced first in primary responses.',
    },
    {
      q: `In human renal physiology (${chapter}), counter-current multiplication in the Loop of Henle establishes an interstitial osmolarity gradient ranging from 300 mOsmol/L in the cortex to what maximum value in the inner medulla?`,
      opts: ['1200 mOsmol/L', '600 mOsmol/L', '150 mOsmol/L', '2400 mOsmol/L'],
      correct: 0,
      exp: 'Active NaCl transport in the thick ascending limb and urea recycling maintain an inner medullary interstitial osmolarity of ~1200 mOsmol/L in humans.',
      hint: 'Four times the normal plasma osmolarity of 300 mOsmol/L.',
    },
    {
      q: `During recombinant DNA workflows (${topic}), what is the specific role of the selectable marker gene (such as amp^R and tet^R) in cloning vector pBR322?`,
      opts: [
        'It permits identification and selection of transformants while distinguishing recombinants via insertional inactivation.',
        'It initiates autonomous replication of plasmid DNA independent of host chromosomal Ori.',
        'It synthesizes restriction endonucleases that cleave foreign bacteriophage DNA.',
        'It encodes reverse transcriptase for cDNA synthesis.',
      ],
      correct: 0,
      exp: 'Selectable markers eliminate non-transformants and allow screening of recombinant colonies when foreign DNA is ligated into a restriction site inside one of the resistance genes.',
      hint: 'Recall insertional inactivation of antibiotic resistance genes.',
    },
    {
      q: `In human cardiac cycle dynamics (${chapter}), what physiological event directly produces the first heart sound ("Lub") heard on auscultation?`,
      opts: [
        'Simultaneous closure of the tricuspid and bicuspid (mitral) atrioventricular valves at the onset of ventricular systole.',
        'Closure of the aortic and pulmonary semilunar valves at the beginning of ventricular diastole.',
        'Rapid ventricular filling during atrial contraction.',
        'Opening of the semilunar valves during ventricular ejection.',
      ],
      correct: 0,
      exp: 'Rising intraventricular pressure at the start of isovolumetric ventricular contraction forces the AV valves (tricuspid and mitral) shut, generating the "Lub" (S1) sound.',
      hint: 'S1 marks the beginning of ventricular systole.',
    },
    {
      q: `In ecological energetics (${topic}), why are pyramids of energy in any natural ecosystem invariably upright and never inverted?`,
      opts: [
        'Because energy is continuously dissipated as metabolic heat at every trophic transfer in accordance with the Second Law of Thermodynamics.',
        'Because primary producers always possess greater standing crop biomass than primary consumers.',
        'Because decomposers recycle 100% of solar radiation back to autotrophs.',
        'Because Lindeman’s law states that 90% of energy is transferred to the next higher trophic level.',
      ],
      correct: 0,
      exp: 'Only ~10% of energy is transferred from one trophic level to the next, while ~90% is lost as respiratory heat; hence energy flow is strictly unidirectional and upright.',
      hint: 'Recall Lindeman’s 10% energy transfer law and thermodynamic entropy.',
    },
    {
      q: `At the neuromuscular junction or chemical synapse (${chapter}), influx of which specific extracellular ion into the synaptic knob triggers the exocytosis of neurotransmitter vesicles?`,
      opts: ['Ca2+ (Calcium ions)', 'Na+ (Sodium ions)', 'K+ (Potassium ions)', 'Cl- (Chloride ions)'],
      correct: 0,
      exp: 'Arrival of an action potential depolarizes the presynaptic terminal, opening voltage-gated Ca2+ channels; Ca2+ influx binds synaptotagmin to fuse synaptic vesicles with the presynaptic membrane.',
      hint: 'Voltage-gated divalent cation channels in the presynaptic terminal.',
    },
    {
      q: `In angiosperm megasporogenesis and embryo sac development (${topic}), the mature Polygonum-type female gametophyte is structurally characterized as:`,
      opts: [
        '7-celled and 8-nucleate',
        '8-celled and 8-nucleate',
        '7-celled and 7-nucleate',
        '4-celled and 8-nucleate',
      ],
      correct: 0,
      exp: 'Three mitotic divisions of the functional megaspore yield 3 antipodal cells, 2 synergids, 1 egg cell, and 1 large central cell containing 2 polar nuclei (total 7 cells, 8 nuclei).',
      hint: 'Count the central cell with its two polar nuclei as a single cell.',
    },
    {
      q: `In the lac operon of Escherichia coli (${chapter}), what is the molecular consequence when lactose (allolactose) is introduced into a medium lacking glucose?`,
      opts: [
        'Allolactose binds the repressor protein, inducing a conformational change that prevents it from binding the operator region.',
        'Allolactose binds directly to RNA polymerase to terminate transcription of lacZ, lacY, and lacA.',
        'The lacI gene stops transcribing the repressor mRNA.',
        'β-galactosidase binds the promoter and blocks cAMP-CAP complex formation.',
      ],
      correct: 0,
      exp: 'Allolactose acts as an inducer by binding the tetrameric lac repressor, allosterically inactivating it so RNA polymerase can transcribe the polycistronic structural genes.',
      hint: 'Allolactose is an inducer that inactivates the repressor protein.',
    },
    {
      q: `During oxygen transport in human blood (${topic}), which set of physiological conditions in active systemic tissues shifts the oxygen-haemoglobin dissociation curve to the right (Bohr effect), facilitating O2 unloading?`,
      opts: [
        'High pCO2, high H+ concentration (low pH), elevated temperature, and high 2,3-BPG',
        'Low pCO2, high pH (alkalosis), low temperature, and decreased 2,3-BPG',
        'High pO2, low pCO2, and hypothermia',
        'Complete absence of carbonic anhydrase in erythrocytes',
      ],
      correct: 0,
      exp: 'Metabolically active tissues produce CO2, H+, and heat, which decrease haemoglobin’s affinity for O2 (increasing P50) and promote oxygen release to working cells.',
      hint: 'Right shift means lower O2 affinity (easier unloading in active tissues).',
    },
    {
      q: `In plant growth and development (${chapter}), which phytohormone ratio in callus tissue culture medium specifically induces root differentiation (rhizogenesis) over shoot bud formation?`,
      opts: [
        'High Auxin-to-Cytokinin ratio',
        'High Cytokinin-to-Auxin ratio',
        'High Gibberellin-to-Abscisic acid ratio',
        'Pure Ethylene application without Auxin',
      ],
      correct: 0,
      exp: 'As demonstrated by Skoog and Miller, a high auxin-to-cytokinin ratio promotes root differentiation, whereas a high cytokinin-to-auxin ratio promotes shoot organogenesis.',
      hint: 'Auxin favors rooting; cytokinin favors shooting.',
    },
    {
      q: `During meiosis I in ${topic}, the synaptonemal complex dissolves and homologous chromosomes remain attached only at cross-shaped chiasmata during which specific sub-stage?`,
      opts: ['Diplotene', 'Pachytene', 'Zygotene', 'Diakinesis'],
      correct: 0,
      exp: 'Zygotene forms the synaptonemal complex, Pachytene executes recombination, and Diplotene begins with the dissolution of the synaptonemal complex revealing X-shaped chiasmata.',
      hint: 'The stage immediately following Pachytene where chiasmata become visible.',
    },
    {
      q: `In nitrogen metabolism and biological nitrogen fixation (${chapter}), what is the physiological function of Leghaemoglobin in root nodules of leguminous plants?`,
      opts: [
        'It acts as an oxygen scavenger to maintain anaerobic conditions required for the nitrogenase enzyme complex.',
        'It directly reduces atmospheric N2 into nitrate (NO3-) using ATP.',
        'It transports fixed ammonia through the xylem to senescing leaves.',
        'It oxidizes nitrite to nitrate in aerobic soil bacteria.',
      ],
      correct: 0,
      exp: 'The Mo-Fe nitrogenase enzyme is irreversibly inactivated by molecular oxygen; leghaemoglobin binds free O2 to keep the bacteroid microenvironment anaerobic while supplying O2 for ATP production.',
      hint: 'Nitrogenase is strictly sensitive to molecular O2.',
    },
    {
      q: `In biodiversity conservation (${topic}), which of the following is an example of an ex-situ conservation strategy rather than in-situ protection?`,
      opts: [
        'Cryopreservation of gametes and seed banks in liquid nitrogen at -196°C',
        'Biosphere Reserves',
        'National Parks and Wildlife Sanctuaries',
        'Sacred Groves in Meghalaya and Western Ghats',
      ],
      correct: 0,
      exp: 'Ex-situ conservation involves protecting threatened species or their genetic material outside their natural habitats (e.g., botanical gardens, seed banks, cryopreservation).',
      hint: 'Distinguish off-site preservation from natural habitat protection.',
    },
  ];
}

function getPhysicsQuestionBank(chapter: string, topic: string): RawQuestionTemplate[] {
  return [
    {
      q: `A particle moves along the x-axis under a conservative force field studied in ${topic} (${chapter}) with potential energy U(x) = a/x^2 - b/x (where a, b > 0). At what position x_0 is the particle in stable equilibrium?`,
      opts: ['x_0 = 2a / b', 'x_0 = a / b', 'x_0 = b / (2a)', 'x_0 = sqrt(a / b)'],
      correct: 0,
      exp: 'At equilibrium, F = -dU/dx = 2a/x^3 - b/x^2 = 0 => x_0 = 2a/b. Since d^2U/dx^2 at x_0 is positive, it corresponds to stable minimum potential energy.',
      hint: 'Set F = -dU/dx = 0 and solve for x.',
    },
    {
      q: `In the analysis of damped oscillations in ${chapter} (${topic}), a block experiences a resistive force F_d = -b v proportional to velocity v. What is the dimensional formula of the damping constant b?`,
      opts: ['[M L^0 T^-1]', '[M L T^-2]', '[M L^-1 T^-1]', '[M^0 L T^-1]'],
      correct: 0,
      exp: '[b] = [F] / [v] = [M L T^-2] / [L T^-1] = [M L^0 T^-1].',
      hint: 'Divide the dimensions of force by the dimensions of velocity.',
    },
    {
      q: `In rotational dynamics (${topic}), a solid cylinder of mass M and radius R rolls without slipping down a rough inclined plane of inclination angle θ. What is the magnitude of the linear acceleration of its center of mass?`,
      opts: ['(2/3) g sin θ', '(1/2) g sin θ', '(5/7) g sin θ', 'g sin θ'],
      correct: 0,
      exp: 'For rolling without slipping, a = g sin θ / (1 + I / (M R^2)). For a solid cylinder, I = (1/2) M R^2, so 1 + 1/2 = 3/2, giving a = (2/3) g sin θ.',
      hint: 'Use a = g sin θ / (1 + k^2/R^2) with k^2/R^2 = 1/2 for a solid cylinder.',
    },
    {
      q: `According to Einstein’s photoelectric equation in ${chapter} (${topic}), if the frequency of incident monochromatic radiation above threshold is doubled, how does the maximum kinetic energy (K_max) of photoelectrons change?`,
      opts: [
        'K_max increases to more than double its initial value.',
        'K_max becomes exactly double its initial value.',
        'K_max increases by a factor of sqrt(2).',
        'K_max remains unchanged because it depends only on intensity.',
      ],
      correct: 0,
      exp: 'Initially K_1 = hν - φ. When frequency is 2ν, K_2 = 2hν - φ = 2(K_1 + φ) - φ = 2K_1 + φ > 2K_1.',
      hint: 'Substitute hν = K_1 + φ into K_2 = 2hν - φ.',
    },
    {
      q: `In an electromagnetic wave propagating through free space (${topic}), the rms value of the electric field is E_rms = 150 V/m. What is the peak value of the magnetic field B_0?`,
      opts: ['7.07 × 10^-7 T', '5.00 × 10^-7 T', '3.54 × 10^-7 T', '1.50 × 10^-6 T'],
      correct: 0,
      exp: 'B_rms = E_rms / c = 150 / (3 × 10^8) = 5.0 × 10^-7 T. The peak value is B_0 = sqrt(2) × B_rms ≈ 1.414 × 5.0 × 10^-7 = 7.07 × 10^-7 T.',
      hint: 'First find B_rms = E_rms / c, then multiply by sqrt(2) to obtain the peak amplitude.',
    },
    {
      q: `In electrostatics (${chapter}), two point charges +4q and +q are separated by a distance d. Where on the line joining them should a third charge Q be placed so that the system is in electrostatic equilibrium?`,
      opts: [
        'At a distance of 2d/3 from +4q (and d/3 from +q)',
        'At the exact midpoint d/2 between the two charges',
        'At a distance of d/3 from +4q',
        'At a distance of 3d/4 from +4q',
      ],
      correct: 0,
      exp: 'For net force on Q to vanish: 4q / x^2 = q / (d - x)^2 => 2 / x = 1 / (d - x) => 2d - 2x = x => x = 2d/3 from +4q.',
      hint: 'Equate the electric field magnitudes of +4q and +q at distance x from +4q.',
    },
    {
      q: `In current electricity (${topic}), n identical cells each of emf E and internal resistance r are connected in series to an external resistor R. If one cell is accidentally connected in reverse polarity, what is the current through R?`,
      opts: [
        '(n - 2) E / (R + n r)',
        '(n - 1) E / (R + (n - 1) r)',
        '(n - 2) E / (R + (n - 2) r)',
        'n E / (R + n r)',
      ],
      correct: 0,
      exp: 'One reversed cell opposes one forward cell, reducing net emf to (n - 2)E. However, internal resistances always add in series, keeping total resistance R + n r.',
      hint: 'One reversed cell cancels the emf of another cell, but all n internal resistances still add.',
    },
    {
      q: `A charged particle of mass m and charge q enters a uniform magnetic field B perpendicular to its velocity with kinetic energy K (${chapter}). How does the time period T of its circular orbit depend on K?`,
      opts: [
        'T is completely independent of the kinetic energy K.',
        'T is directly proportional to sqrt(K).',
        'T is inversely proportional to K.',
        'T is directly proportional to K.',
      ],
      correct: 0,
      exp: 'The cyclotron period is T = 2π m / (q B), which depends only on mass, charge, and magnetic field B, and is independent of speed or kinetic energy (for non-relativistic speeds).',
      hint: 'Recall the cyclotron frequency formula ω = qB / m.',
    },
    {
      q: `In an ideal transformer studied under ${topic}, the primary coil has 400 turns and the secondary coil has 2000 turns. If the primary is connected to 200 V AC and the secondary delivers 2 A current to a resistive load, what is the primary current?`,
      opts: ['10 A', '0.4 A', '2 A', '5 A'],
      correct: 0,
      exp: 'Turns ratio N_s / N_p = 2000 / 400 = 5. For an ideal transformer, I_p / I_s = N_s / N_p = 5 => I_p = 5 × 2 A = 10 A.',
      hint: 'Power in primary equals power in secondary: V_p I_p = V_s I_s.',
    },
    {
      q: `In thermodynamics (${chapter}), an ideal monoatomic gas (γ = 5/3) undergoes an adiabatic expansion in which its volume increases by a factor of 8. By what factor does its absolute temperature T change?`,
      opts: [
        'T decreases to 1/4 of its initial value',
        'T decreases to 1/2 of its initial value',
        'T decreases to 1/8 of its initial value',
        'T remains constant',
      ],
      correct: 0,
      exp: 'For a reversible adiabatic process, T V^(γ - 1) = constant. With γ = 5/3, γ - 1 = 2/3. Thus T_2 / T_1 = (V_1 / V_2)^(2/3) = (1/8)^(2/3) = (1/2)^2 = 1/4.',
      hint: 'Use T V^(γ - 1) = constant with γ - 1 = 2/3.',
    },
    {
      q: `In Young’s double-slit experiment (${topic}), if the apparatus is completely immersed in a transparent liquid of refractive index μ = 4/3, how does the fringe width β change compared to its value β_0 in air?`,
      opts: ['β = (3/4) β_0', 'β = (4/3) β_0', 'β = (9/16) β_0', 'β = β_0'],
      correct: 0,
      exp: 'In a medium of refractive index μ, wavelength becomes λ\' = λ / μ. Since β = λ D / d, the new fringe width is β = β_0 / μ = (3/4) β_0.',
      hint: 'Wavelength in a medium of refractive index μ decreases by a factor of μ.',
    },
    {
      q: `In Bohr’s model of the hydrogen atom (${chapter}), what is the ratio of the radius of the third stationary orbit (n = 3) to the radius of the first Bohr orbit (n = 1)?`,
      opts: ['9 : 1', '3 : 1', '27 : 1', '1 : 9'],
      correct: 0,
      exp: 'The Bohr orbit radius is proportional to n^2 / Z (r_n = r_1 × n^2 for hydrogen). Therefore, r_3 / r_1 = 3^2 / 1^2 = 9 : 1.',
      hint: 'Radius of the nth Bohr orbit scales as n^2.',
    },
    {
      q: `In orbital gravitation (${topic}), if the radius of the Earth were to shrink by 2% while its mass remained strictly constant, how would the acceleration due to gravity g at its surface change?`,
      opts: [
        'g would increase by approximately 4%',
        'g would decrease by approximately 2%',
        'g would increase by approximately 2%',
        'g would decrease by approximately 4%',
      ],
      correct: 0,
      exp: 'Since g = G M / R^2, fractional change is Δg / g ≈ -2 (ΔR / R). For ΔR / R = -2%, Δg / g ≈ +4%.',
      hint: 'Apply error propagation to g = G M R^-2.',
    },
    {
      q: `In a series LCR circuit connected to a variable-frequency AC source (${chapter}), at the resonant angular frequency ω_0 = 1 / sqrt(L C), what is the phase difference φ between the applied voltage and circuit current?`,
      opts: ['0 radians (in phase)', 'π / 2 radians', 'π / 4 radians', 'π radians'],
      correct: 0,
      exp: 'At resonance, inductive reactance X_L equals capacitive reactance X_C, so net reactance is zero, impedance Z = R, and current is strictly in phase with voltage (φ = 0).',
      hint: 'At resonance X_L = X_C, making the circuit purely resistive.',
    },
    {
      q: `In fluid mechanics (${topic}), 27 identical small spherical mercury droplets each charged to a potential of 10 V coalesce to form a single large spherical drop. What is the electric potential of the large drop?`,
      opts: ['90 V', '270 V', '30 V', '10 V'],
      correct: 0,
      exp: 'For n droplets coalescing, V_big = n^(2/3) V_small. With n = 27 and V_small = 10 V, V_big = 27^(2/3) × 10 = 9 × 10 = 90 V.',
      hint: 'Use V_new = n^(2/3) V_initial.',
    },
    {
      q: `In ray optics (${chapter}), a biconvex lens made of glass (refractive index 1.5) has focal length f in air. When immersed in a liquid of refractive index 1.5, it behaves as:`,
      opts: [
        'A plane transparent glass plate of infinite focal length (zero optical power)',
        'A diverging lens of focal length -f',
        'A converging lens of focal length 2f',
        'A concave mirror of focal length f/2',
      ],
      correct: 0,
      exp: 'By Lens Maker’s formula, 1/f = (μ_lens / μ_medium - 1)(1/R_1 - 1/R_2). When μ_lens = μ_medium = 1.5, 1/f = 0 => f = ∞ (zero power).',
      hint: 'Check the relative refractive index μ_lens / μ_medium when both equal 1.5.',
    },
    {
      q: `In nuclear physics (${topic}), a radioactive sample has a half-life of 15 minutes. What fraction of the original undecayed nuclei remains after 1 hour?`,
      opts: ['1 / 16', '1 / 8', '1 / 4', '15 / 16'],
      correct: 0,
      exp: 'Total elapsed time t = 60 minutes = 4 half-lives (n = 60 / 15 = 4). Remaining fraction N / N_0 = (1/2)^n = (1/2)^4 = 1/16.',
      hint: 'Determine the number of half-lives n = t / T_1/2 and compute (1/2)^n.',
    },
    {
      q: `In simple harmonic motion (${chapter}), a particle oscillates with amplitude A. At what displacement x from the mean position is its kinetic energy exactly equal to three times its potential energy (K = 3U)?`,
      opts: ['x = ± A / 2', 'x = ± A / sqrt(2)', 'x = ± (sqrt(3)/2) A', 'x = ± A / 4'],
      correct: 0,
      exp: 'Total energy E = K + U = 4U. Since U / E = x^2 / A^2 = 1/4, taking the square root yields x = ± A / 2.',
      hint: 'Use U / E = x^2 / A^2 where E = K + U = 4U.',
    },
    {
      q: `In semiconductor electronics (${topic}), when a p-n junction diode is connected in forward bias, how do the depletion layer width and barrier potential change?`,
      opts: [
        'Both the depletion layer width and the potential barrier height decrease.',
        'Both the depletion layer width and the potential barrier height increase.',
        'Depletion width increases while barrier potential decreases.',
        'Depletion width decreases while barrier potential increases.',
      ],
      correct: 0,
      exp: 'Forward bias applies an external electric field opposing the built-in barrier field, driving majority carriers toward the junction and narrowing both the depletion region and barrier height.',
      hint: 'Forward bias opposes the internal built-in electric field across the junction.',
    },
    {
      q: `A projectile is launched from horizontal ground (${chapter}) such that its maximum height H equals one-fourth of its horizontal range R (H = R/4). What is the launch angle θ above the horizontal?`,
      opts: ['45°', '30°', '60°', '76°'],
      correct: 0,
      exp: 'For any ground-to-ground projectile, R / H = 4 cot θ. Given H = R / 4, we have tan θ = 4H / R = 1 => θ = 45°.',
      hint: 'Use the standard projectile relation tan θ = 4H / R.',
    },
  ];
}

function getChemistryQuestionBank(chapter: string, topic: string): RawQuestionTemplate[] {
  return [
    {
      q: `In organic reaction mechanisms under ${topic} (${chapter}), why does acid-catalyzed hydration of propene yield propan-2-ol as the major product rather than propan-1-ol?`,
      opts: [
        'Because the secondary (2°) carbocation intermediate is more stabilized by 6 α-C-H hyperconjugative structures and +I effect than the primary (1°) carbocation.',
        'Because the reaction proceeds via a concerted cyclic bromonium-like transition state without carbocations.',
        'Because primary carbocations exhibit greater steric hindrance to nucleophilic attack by water.',
        'Because anti-Markovnikov free radical addition operates in aqueous sulfuric acid.',
      ],
      correct: 0,
      exp: 'Protonation of propene forms the isopropyl carbocation CH3-CH(+)-CH3 (6 α-hydrogens) which is far more stable than CH3-CH2-CH2(+) (2 α-hydrogens).',
      hint: 'Count the number of α-hydrogens stabilizing the intermediate carbocation.',
    },
    {
      q: `For the reversible gas-phase equilibrium in ${chapter} (${topic}): N2(g) + 3H2(g) <=> 2NH3(g) (ΔH° = -92.4 kJ/mol), which set of conditions maximizes the equilibrium yield of ammonia according to Le Chatelier’s principle?`,
      opts: [
        'High pressure and moderately low temperature',
        'Low pressure and high temperature',
        'High temperature and addition of an inert gas at constant volume',
        'Low pressure and removal of N2(g)',
      ],
      correct: 0,
      exp: 'Since Δn_g = 2 - 4 = -2 (< 0) and the forward reaction is exothermic (ΔH < 0), high pressure favors fewer gas moles and lower temperature favors the exothermic forward direction.',
      hint: 'Evaluate the sign of Δn_g and ΔH° for the forward synthesis.',
    },
    {
      q: `In coordination chemistry (${topic}), what is the hybridization, geometry, and magnetic spin-only moment of the complex ion [Ni(CN)4]^2- (atomic number of Ni = 28)?`,
      opts: [
        'dsp2, Square planar, and 0 BM (diamagnetic)',
        'sp3, Tetrahedral, and 2.83 BM (paramagnetic)',
        'sp3d2, Octahedral, and 0 BM',
        'd2sp3, Octahedral, and 1.73 BM',
      ],
      correct: 0,
      exp: 'Ni^2+ is a 3d8 system. Cyanide (CN-) is a strong-field ligand that pairs all 8 d-electrons into 4 orbitals, leaving one 3d orbital empty for dsp2 square planar hybridization with 0 unpaired electrons.',
      hint: 'CN- is a strong-field π-acceptor ligand acting on a d8 metal ion.',
    },
    {
      q: `In electrochemistry (${chapter}), given the standard reduction potentials E°(Zn2+/Zn) = -0.76 V and E°(Cu2+/Cu) = +0.34 V, what is the standard Gibbs free energy change ΔG° for the cell reaction Zn(s) + Cu2+(aq) -> Zn2+(aq) + Cu(s)?`,
      opts: ['-212.3 kJ/mol', '+212.3 kJ/mol', '-106.15 kJ/mol', '-424.6 kJ/mol'],
      correct: 0,
      exp: 'E°_cell = 0.34 - (-0.76) = +1.10 V. With n = 2 moles of electrons transferred, ΔG° = -n F E°_cell = -2 × 96500 C/mol × 1.10 V = -212,300 J/mol = -212.3 kJ/mol.',
      hint: 'Apply ΔG° = -n F E°_cell with n = 2 and F = 96500 C/mol.',
    },
    {
      q: `In chemical kinetics (${topic}), a first-order reaction is 50% complete in 20 minutes. How much time is required for the same reaction to reach 87.5% completion at the same temperature?`,
      opts: ['60 minutes', '40 minutes', '80 minutes', '35 minutes'],
      correct: 0,
      exp: '87.5% completion leaves 12.5% (1/8 = (1/2)^3) of reactant unreacted. For a first-order reaction, t_87.5% = 3 × t_1/2 = 3 × 20 min = 60 minutes.',
      hint: '12.5% remaining corresponds to 3 half-lives (100% -> 50% -> 25% -> 12.5%).',
    },
    {
      q: `According to VSEPR theory and molecular orbital analysis in ${chapter} (${topic}), what is the exact molecular geometry and hybridization of the central xenon atom in XeF4?`,
      opts: [
        'Square planar geometry with sp3d2 hybridization (4 bond pairs + 2 lone pairs)',
        'Tetrahedral geometry with sp3 hybridization',
        'See-saw geometry with sp3d hybridization',
        'Octahedral geometry with d2sp3 hybridization',
      ],
      correct: 0,
      exp: 'Xe has 8 valence electrons; bonding with 4 fluorine atoms forms 4 σ-bonds and leaves 2 lone pairs (steric number 6, sp3d2). The 2 lone pairs occupy trans axial positions, giving a square planar molecular shape.',
      hint: 'Count valence electrons of Xe (8) plus 4 from F, divide by 2 to get steric number 6.',
    },
    {
      q: `In solutions and colligative properties (${topic}), what is the van’t Hoff factor (i) for a dilute aqueous solution of K4[Fe(CN)6] that undergoes 80% dissociation?`,
      opts: ['4.2', '5.0', '3.8', '4.0'],
      correct: 0,
      exp: 'K4[Fe(CN)6] dissociates into 4 K+ and 1 [Fe(CN)6]^4- ion, so n = 5. Using α = (i - 1) / (n - 1): 0.80 = (i - 1) / (5 - 1) => i - 1 = 3.2 => i = 4.2.',
      hint: 'Use i = 1 + α(n - 1) where n = 5 ions per formula unit.',
    },
    {
      q: `Among the following carbonyl compounds studied in ${chapter} (${topic}), which one undergoes the Cannizzaro disproportionation reaction when heated with concentrated aqueous NaOH?`,
      opts: [
        'Benzaldehyde (C6H5CHO)',
        'Acetaldehyde (CH3CHO)',
        'Propanone (CH3COCH3)',
        'Phenylacetaldehyde (C6H5CH2CHO)',
      ],
      correct: 0,
      exp: 'Aldehydes that lack an α-hydrogen atom (such as HCHO, C6H5CHO, and (CH3)3C-CHO) cannot form enolate ions and instead undergo base-induced Cannizzaro self-redox disproportionation.',
      hint: 'Identify the aldehyde that has no α-hydrogen atom.',
    },
    {
      q: `In atomic structure (${topic}), which set of four quantum numbers (n, l, m_l, m_s) is strictly impossible according to quantum mechanical selection rules?`,
      opts: [
        'n = 3, l = 3, m_l = -2, m_s = +1/2',
        'n = 3, l = 2, m_l = -2, m_s = -1/2',
        'n = 4, l = 1, m_l = 0, m_s = +1/2',
        'n = 2, l = 0, m_l = 0, m_s = -1/2',
      ],
      correct: 0,
      exp: 'For a given principal quantum number n, the azimuthal quantum number l can only take integer values from 0 to n - 1. Hence l = 3 is forbidden when n = 3.',
      hint: 'Check the rule 0 <= l <= n - 1.',
    },
    {
      q: `In chemical thermodynamics (${chapter}), a reaction has ΔH° = +40 kJ/mol and ΔS° = +100 J/(K·mol). Above what minimum absolute temperature T does the reaction become spontaneous under standard conditions?`,
      opts: ['Above 400 K', 'Above 250 K', 'Below 400 K', 'Above 40 K'],
      correct: 0,
      exp: 'For spontaneity, ΔG° = ΔH° - T ΔS° < 0 => T > ΔH° / ΔS° = 40,000 J/mol / (100 J/(K·mol)) = 400 K.',
      hint: 'Convert ΔH° to Joules and compute T_eq = ΔH° / ΔS°.',
    },
    {
      q: `In ionic equilibrium (${topic}), what is the pH of a 1.0 × 10^-3 M aqueous solution of Ba(OH)2 assuming complete dissociation at 298 K (K_w = 10^-14, log 2 = 0.30)?`,
      opts: ['11.30', '11.00', '2.70', '10.70'],
      correct: 0,
      exp: 'Ba(OH)2 is a strong diacidic base: [OH-] = 2 × 1.0 × 10^-3 = 2.0 × 10^-3 M. Thus pOH = 3 - log 2 = 2.70, and pH = 14 - 2.70 = 11.30.',
      hint: 'Remember each mole of Ba(OH)2 releases 2 moles of OH- ions.',
    },
    {
      q: `In organic nitrogen chemistry (${chapter}), which chemical test specifically distinguishes a primary aliphatic or aromatic amine from secondary and tertiary amines by forming a foul-smelling isocyanide?`,
      opts: [
        'Carbylamine reaction (heating with CHCl3 and alcoholic KOH)',
        'Lucas turbidity test (conc. HCl + anhydrous ZnCl2)',
        'Fehling’s alkaline copper tartrate test',
        'Iodoform reaction (I2 + aqueous NaOH)',
      ],
      correct: 0,
      exp: 'Only primary amines (R-NH2) react with chloroform and ethanolic KOH via dichlorocarbene (:CCl2) to yield offensive-smelling alkyl or aryl isocyanides (R-NC).',
      hint: 'Isocyanide test uses chloroform and alcoholic KOH.',
    },
    {
      q: `According to Molecular Orbital Theory (${topic}), which of the following diatomic species has a bond order of 2.5 and is paramagnetic?`,
      opts: ['O2+ (Dioxygenyl cation)', 'O2 (Dioxygen)', 'N2 (Dinitrogen)', 'O2^2- (Peroxide ion)'],
      correct: 0,
      exp: 'Neutral O2 has bond order 2.0 with 2 electrons in π*2p antibonding orbitals. Removing one antibonding electron to form O2+ increases the bond order to (10 - 5)/2 = 2.5 with 1 unpaired electron.',
      hint: 'Removing an electron from an antibonding π* orbital increases bond order by 0.5.',
    },
    {
      q: `In d- and f-block chemistry (${chapter}), what is the primary atomic cause of the Lanthanoid Contraction across the 4f series from Cerium (Z=58) to Lutetium (Z=71)?`,
      opts: [
        'Poor shielding of outer electrons by inner 4f electrons coupled with increasing nuclear charge',
        'Complete shielding of nuclear charge by 5d orbitals',
        'Decrease in effective nuclear charge (Z_eff) across the period',
        'Relativistic expansion of the 6s valence shell',
      ],
      correct: 0,
      exp: '4f orbitals have diffuse shapes that poorly shield the outer 5s/5p/6s electrons from the steadily increasing nuclear charge (+1 per element), causing a steady contraction in ionic radii.',
      hint: 'Shielding power follows the order s > p > d > f.',
    },
    {
      q: `In alcohol, phenol, and ether chemistry (${topic}), why is phenol significantly more acidic (pK_a ≈ 10.0) than ethanol (pK_a ≈ 15.9)?`,
      opts: [
        'The phenoxide ion is resonance-stabilized by delocalization of negative charge over the aromatic ring, whereas ethoxide has no resonance stabilization.',
        'The ethyl group exerts a strong electron-withdrawing inductive (-I) effect.',
        'Phenol forms stronger intermolecular hydrogen bonds than ethanol.',
        'The sp3 carbon of phenol is more electronegative than the sp2 carbon of ethanol.',
      ],
      correct: 0,
      exp: 'Deprotonation of phenol gives the phenoxide ion in which negative charge is delocalized over ortho and para ring carbons without charge separation, stabilizing the conjugate base.',
      hint: 'Compare the resonance stability of phenoxide versus ethoxide conjugate bases.',
    },
    {
      q: `In solid state / crystal chemistry (${chapter}), what is the packing efficiency of a Face-Centered Cubic (FCC / CCP) crystal lattice?`,
      opts: ['74.0%', '68.0%', '52.4%', '34.0%'],
      correct: 0,
      exp: 'An FCC unit cell contains Z = 4 spheres with a = 2 sqrt(2) r. Packing fraction = [4 × (4/3)π r^3] / (2 sqrt(2) r)^3 = π / (3 sqrt(2)) ≈ 0.7405 (74%).',
      hint: 'FCC/HCP close-packed structures achieve the highest packing efficiency of 74%.',
    },
  ];
}

function getMathQuestionBank(chapter: string, topic: string): RawQuestionTemplate[] {
  return [
    {
      q: `In matrix algebra (${topic}, ${chapter}), if a square matrix A satisfies the polynomial equation A^2 - A + I = O (where I is the identity matrix), what is the inverse matrix A^-1?`,
      opts: ['I - A', 'A - I', 'A + I', 'A^2'],
      correct: 0,
      exp: 'Multiplying A^2 - A + I = O by A^-1 gives A - I + A^-1 = O => A^-1 = I - A.',
      hint: 'Pre-multiply the matrix equation by A^-1.',
    },
    {
      q: `Evaluate the definite integral in ${chapter} (${topic}): I = ∫ from 0 to π/2 of [sin^4(x) / (sin^4(x) + cos^4(x))] dx.`,
      opts: ['π / 4', 'π / 2', '1', 'π / 8'],
      correct: 0,
      exp: 'Using ∫_0^a f(x) dx = ∫_0^a f(a - x) dx with a = π/2, sin^4(x) becomes cos^4(x). Adding the two forms gives 2I = ∫_0^(π/2) 1 dx = π/2 => I = π/4.',
      hint: 'Apply King’s definite integral property f(x) -> f(π/2 - x) and add.',
    },
    {
      q: `In differential calculus (${topic}), determine the interval on which the real function f(x) = x^3 - 6x^2 + 9x + 15 is strictly decreasing.`,
      opts: ['(1, 3)', '(-∞, 1) ∪ (3, ∞)', '(0, 2)', '(-3, -1)'],
      correct: 0,
      exp: 'f\'(x) = 3x^2 - 12x + 9 = 3(x - 1)(x - 3). Since f\'(x) < 0 for 1 < x < 3, the function is strictly decreasing on the open interval (1, 3).',
      hint: 'Factorize f\'(x) = 3(x - 1)(x - 3) and solve f\'(x) < 0.',
    },
    {
      q: `In vector algebra (${chapter}), if two vectors a and b have magnitudes |a| = 3 and |b| = 4, and the magnitude of their cross product is |a × b| = 6, what is |a · b|?`,
      opts: ['6 sqrt(3)', '6', '12', '3 sqrt(3)'],
      correct: 0,
      exp: 'By Lagrange’s identity, |a · b|^2 + |a × b|^2 = |a|^2 |b|^2 = 9 × 16 = 144. Thus |a · b|^2 = 144 - 36 = 108 => |a · b| = sqrt(108) = 6 sqrt(3).',
      hint: 'Use |a · b|^2 + |a × b|^2 = |a|^2 |b|^2.',
    },
    {
      q: `If A is an invertible 3 × 3 square matrix (${topic}) with determinant |A| = 5, what is the determinant of its adjoint matrix, |adj(A)|?`,
      opts: ['25', '125', '5', '15'],
      correct: 0,
      exp: 'For an n × n matrix A, |adj(A)| = |A|^(n - 1). Here n = 3 and |A| = 5, so |adj(A)| = 5^(3 - 1) = 5^2 = 25.',
      hint: 'Use the property |adj(A)| = |A|^(n - 1) for n = 3.',
    },
    {
      q: `In probability theory (${chapter}), two independent events E and F have probabilities P(E) = 0.4 and P(F) = 0.5. What is the probability that at least one of the events occurs, P(E ∪ F)?`,
      opts: ['0.70', '0.90', '0.20', '0.60'],
      correct: 0,
      exp: 'Since E and F are independent, P(E ∩ F) = P(E)P(F) = 0.4 × 0.5 = 0.20. Thus P(E ∪ F) = P(E) + P(F) - P(E ∩ F) = 0.4 + 0.5 - 0.2 = 0.70.',
      hint: 'Use P(E ∪ F) = 1 - P(E\')P(F\') or P(E) + P(F) - P(E)P(F).',
    },
    {
      q: `What is the integrating factor (I.F.) of the first-order linear differential equation (${topic}): x (dy/dx) + 2y = x^2 (for x > 0)?`,
      opts: ['x^2', '2x', 'e^(2x)', '1 / x^2'],
      correct: 0,
      exp: 'Divide throughout by x to get standard form: dy/dx + (2/x)y = x. Here P(x) = 2/x, so I.F. = e^(∫ (2/x) dx) = e^(2 ln x) = x^2.',
      hint: 'First rewrite the equation in standard linear form dy/dx + P(x)y = Q(x).',
    },
    {
      q: `In 3D coordinate geometry (${chapter}), what is the perpendicular distance of the point P(3, 4, 5) from the y-axis?`,
      opts: ['sqrt(34)', '5', 'sqrt(41)', '4'],
      correct: 0,
      exp: 'The foot of the perpendicular from P(x, y, z) on the y-axis is (0, y, 0) = (0, 4, 0). The distance is sqrt((3 - 0)^2 + (4 - 4)^2 + (5 - 0)^2) = sqrt(9 + 25) = sqrt(34).',
      hint: 'Distance of (x, y, z) from the y-axis is sqrt(x^2 + z^2).',
    },
    {
      q: `In relations and functions (${topic}), how many bijective (one-to-one and onto) functions can be defined from a finite set A containing 4 elements onto itself?`,
      opts: ['24', '16', '256', '12'],
      correct: 0,
      exp: 'The number of bijections from an n-element set to itself is n! (n factorial). For n = 4, 4! = 4 × 3 × 2 × 1 = 24.',
      hint: 'Number of bijections on a finite set of cardinality n is n!.',
    },
    {
      q: `In inverse trigonometric functions (${chapter}), what is the principal value of cos^-1(cos(7π / 6))?`,
      opts: ['5π / 6', '7π / 6', 'π / 6', '-π / 6'],
      correct: 0,
      exp: 'The principal value branch of cos^-1(x) is [0, π]. Since 7π/6 ∉ [0, π], rewrite cos(7π/6) = cos(2π - 5π/6) = cos(5π/6). As 5π/6 ∈ [0, π], the value is 5π/6.',
      hint: 'Map the angle into the principal range [0, π] of arccosine.',
    },
    {
      q: `In complex numbers and quadratic equations (${topic}), what is the smallest positive integer n for which ((1 + i) / (1 - i))^n = 1?`,
      opts: ['n = 4', 'n = 2', 'n = 8', 'n = 1'],
      correct: 0,
      exp: 'Multiplying numerator and denominator by (1 + i): (1 + i)^2 / (1 - i^2) = (2i) / 2 = i. The smallest positive integer n such that i^n = 1 is n = 4.',
      hint: 'Simplify (1 + i)/(1 - i) to i first.',
    },
    {
      q: `Find the area of the region bounded by the parabola y^2 = 4x and its latus rectum x = 1 (${chapter}).`,
      opts: ['8 / 3 sq. units', '4 / 3 sq. units', '16 / 3 sq. units', '2 sq. units'],
      correct: 0,
      exp: 'By symmetry about the x-axis, Area = 2 ∫_0^1 2 sqrt(x) dx = 4 × [ (2/3) x^(3/2) ]_0^1 = 8/3 square units.',
      hint: 'Integrate 2 × y dx from x = 0 to x = 1.',
    },
  ];
}

function getCommerceQuestionBank(chapter: string, topic: string): RawQuestionTemplate[] {
  return [
    {
      q: `In corporate accounting (${topic}, ${chapter}), when equity shares are forfeited for non-payment of allotment or call money, the Share Capital Account is debited with:`,
      opts: [
        'Called-up capital value of the forfeited shares',
        'Paid-up amount actually received on the shares',
        'Nominal (face) value regardless of calls made',
        'Unpaid calls-in-arrears amount only',
      ],
      correct: 0,
      exp: 'On forfeiture, Share Capital is reversed (debited) to the extent it was previously credited, which is the called-up value per share up to the date of forfeiture.',
      hint: 'Capital is debited by the total amount called up so far.',
    },
    {
      q: `In macroeconomic income determination (${topic}), if the Marginal Propensity to Consume (MPC) in an economy is 0.75, what is the value of the Investment Multiplier (k)?`,
      opts: ['4.0', '5.0', '1.33', '2.5'],
      correct: 0,
      exp: 'Multiplier k = 1 / (1 - MPC) = 1 / (1 - 0.75) = 1 / 0.25 = 4.0.',
      hint: 'Use k = 1 / MPS = 1 / (1 - MPC).',
    },
    {
      q: `Under Henri Fayol’s 14 Principles of Management (${chapter}), which principle mandates that all activities having the same objective must be directed by one manager under one plan?`,
      opts: ['Unity of Direction', 'Unity of Command', 'Espirit de Corps', 'Centralization'],
      correct: 0,
      exp: 'Unity of Direction ("One head and one plan") ensures coordination of organizational units working toward the same goal, whereas Unity of Command deals with reporting to one boss.',
      hint: 'One head and one plan for a group of activities with the same objective.',
    },
    {
      q: `In Cash Flow Statement analysis (AS-3) (${topic}), cash proceeds from issuing debentures and payment of interim dividend on equity shares are classified under:`,
      opts: [
        'Cash Flows from Financing Activities',
        'Cash Flows from Investing Activities',
        'Cash Flows from Operating Activities',
        'Cash and Cash Equivalents',
      ],
      correct: 0,
      exp: 'Transactions that alter the long-term capital structure (equity and long-term borrowings) and their servicing costs (dividends and interest) belong to Financing Activities.',
      hint: 'Consider activities that change the size and composition of owners’ capital and borrowings.',
    },
    {
      q: `In partnership accounting (${chapter}), if a partnership deed is silent regarding interest on partner’s loan to the firm, at what statutory rate per annum is interest allowed?`,
      opts: ['6% per annum', '12% per annum', '10% per annum', 'No interest is allowed'],
      correct: 0,
      exp: 'Under the Indian Partnership Act, 1932, in the absence of a partnership deed, a partner who advances a loan to the firm is entitled to interest at 6% per annum as a charge against profits.',
      hint: 'Recall the default statutory provision under the Indian Partnership Act, 1932.',
    },
    {
      q: `In microeconomics (${topic}), when the price elasticity of demand (E_d) for a commodity is strictly greater than 1 (elastic demand), a fall in its price leads to:`,
      opts: [
        'An increase in Total Expenditure (Total Revenue) on the commodity',
        'A decrease in Total Expenditure on the commodity',
        'No change in Total Expenditure',
        'A leftward shift of the demand curve',
      ],
      correct: 0,
      exp: 'When demand is price-elastic (E_d > 1), the percentage increase in quantity demanded exceeds the percentage fall in price, causing Total Expenditure (P × Q) to rise.',
      hint: 'Price and total expenditure move in opposite directions when demand is elastic.',
    },
  ];
}

function getSocialScienceQuestionBank(chapter: string, topic: string): RawQuestionTemplate[] {
  return [
    {
      q: `In modern Indian history (${topic}, ${chapter}), which historic event on 6 April 1930 marked the formal launch of the Civil Disobedience Movement?`,
      opts: [
        'Mahatma Gandhi ceremonially manufacturing salt at Dandi to defy the British salt monopoly',
        'Adoption of the Purna Swaraj resolution at the Lahore Congress Session',
        'Signing of the Gandhi-Irwin Pact in New Delhi',
        'Launch of the Quit India Resolution at Gowalia Tank Maidan',
      ],
      correct: 0,
      exp: 'After walking 240 miles from Sabarmati Ashram to the coastal town of Dandi, Gandhiji violated the colonial salt law on 6 April 1930, inaugurating the nationwide Civil Disobedience Movement.',
      hint: 'Think of the culmination of the 24-day Salt March.',
    },
    {
      q: `Under the Seventh Schedule of the Indian Constitution (${topic}), subjects such as Education, Forests, Trade Unions, Marriage, and Adoption are placed under which legislative list?`,
      opts: ['Concurrent List', 'Union List', 'State List', 'Residuary Powers of the President'],
      correct: 0,
      exp: 'The Concurrent List includes subjects of common interest to both the Union and State governments (Education and Forests were moved to it by the 42nd Amendment, 1976).',
      hint: 'Both Parliament and State Legislatures can frame laws on these subjects.',
    },
    {
      q: `In Indian physical and agricultural geography (${chapter}), which soil type develops on crystalline igneous and basaltic rocks of the Deccan Trap and is renowned for its self-ploughing moisture retention for cotton cultivation?`,
      opts: ['Regur (Black Cotton Soil)', 'Laterite Soil', 'Khadar Alluvial Soil', 'Arid Desert Soil'],
      correct: 0,
      exp: 'Black soils (Regur) are rich in montmorillonite clay minerals, calcium carbonate, magnesium, and potash, developing deep cracks in summer for aeration and holding moisture when wet.',
      hint: 'Also known as Regur soil across Maharashtra, Saurashtra, and Malwa.',
    },
    {
      q: `In democratic political economy (${topic}), which institution in India is constitutionally and statutorily empowered to issue currency notes and regulate the formal credit supply through Repo Rate and CRR?`,
      opts: [
        'Reserve Bank of India (RBI)',
        'Ministry of Finance, Department of Economic Affairs',
        'Securities and Exchange Board of India (SEBI)',
        'NITI Aayog',
      ],
      correct: 0,
      exp: 'The Reserve Bank of India (RBI) acts as the central bank, issuing currency on behalf of the Central Government and supervising monetary policy and formal banking.',
      hint: 'India’s central monetary authority established under the RBI Act, 1934.',
    },
  ];
}

function getComputerQuestionBank(chapter: string, topic: string): RawQuestionTemplate[] {
  return [
    {
      q: `In Python programming (${topic}, ${chapter}), what is the fundamental difference between a list and a tuple regarding mutability and dictionary key eligibility?`,
      opts: [
        'Lists are mutable and unhashable, whereas tuples are immutable and can be used as dictionary keys if their elements are hashable.',
        'Tuples support in-place append() and pop() methods, whereas lists do not.',
        'Lists require contiguous homogeneous C-types, whereas tuples store only strings.',
        'Both lists and tuples are mutable, but tuples use square brackets.',
      ],
      correct: 0,
      exp: 'Tuples are immutable sequences whose hash value remains constant (provided they contain only immutable elements), allowing them to serve as dict keys.',
      hint: 'Dictionary keys in Python must be immutable and hashable.',
    },
    {
      q: `In Relational Database Management Systems (SQL) studied in ${chapter} (${topic}), what is the exact distinction between the WHERE clause and the HAVING clause?`,
      opts: [
        'WHERE filters individual rows before grouping, whereas HAVING filters aggregated groups created by GROUP BY.',
        'HAVING can only be used without GROUP BY, whereas WHERE requires aggregate functions.',
        'WHERE filters columns, whereas HAVING deletes duplicate primary keys.',
        'There is no operational difference; they are interchangeable in ANSI SQL.',
      ],
      correct: 0,
      exp: 'WHERE is evaluated on base table rows prior to GROUP BY aggregation, while HAVING applies conditions to group summaries (such as COUNT(*), SUM(), AVG()).',
      hint: 'One operates on rows before aggregation; the other operates on grouped aggregates.',
    },
    {
      q: `In data structures (${topic}), a Stack operates on which fundamental access discipline for insertion (Push) and deletion (Pop) operations?`,
      opts: [
        'LIFO (Last-In, First-Out)',
        'FIFO (First-In, First-Out)',
        'Priority-based random access',
        'Circular doubly linked traversal',
      ],
      correct: 0,
      exp: 'A stack restricts all insertions (push) and removals (pop) to a single end called the Top, meaning the most recently inserted element is the first one removed (LIFO).',
      hint: 'Think of a stack of plates where the top element is added and removed last-in, first-out.',
    },
    {
      q: `In computer networking (${chapter}), which network device operates at the Network Layer (Layer 3 of the OSI model) to forward data packets between different IP networks using logical addressing?`,
      opts: ['Router', 'Passive Hub', 'Unidirectional Repeater', 'RJ-45 Connector'],
      correct: 0,
      exp: 'Routers inspect destination IP addresses in Layer 3 packet headers and consult routing tables to determine the optimal path across heterogeneous networks.',
      hint: 'Layer 3 device that routes IP packets between networks.',
    },
  ];
}

function getGeneralQuestionBank(subject: string, chapter: string, topic: string): RawQuestionTemplate[] {
  return [
    {
      q: `In the systematic academic study of ${subject} — ${chapter} (${topic}), which methodological approach provides rigorous verification of a theoretical hypothesis?`,
      opts: [
        'Controlled empirical observation, quantitative measurement, and reproducibility against boundary conditions.',
        'Unverified extrapolation from a single isolated anecdote.',
        'Ignoring conservation laws and boundary constraints.',
        'Assuming linear proportionality without dimensional consistency.',
      ],
      correct: 0,
      exp: 'Rigorous academic analysis requires empirical reproducibility, dimensional consistency, and validation against boundary conditions.',
      hint: 'Focus on reproducibility and controlled empirical verification.',
    },
    {
      q: `When solving quantitative problems in ${chapter} (${topic}), why is dimensional homogeneity a necessary condition for any valid physical or analytical equation?`,
      opts: [
        'Because only quantities having identical fundamental dimensions can be added, subtracted, or equated.',
        'Because dimensionless constants are always equal to unity.',
        'Because transcendental functions (sin, log, exp) accept arguments with arbitrary units.',
        'Because unit conversion changes the underlying physical law.',
      ],
      correct: 0,
      exp: 'By the Principle of Homogeneity of Dimensions, every additive term on both sides of a valid equation must possess the exact same dimensional formula.',
      hint: 'Recall the Principle of Homogeneity of Dimensions.',
    },
  ];
}
