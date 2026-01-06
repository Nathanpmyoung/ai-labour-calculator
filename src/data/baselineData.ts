/**
 * Baseline data from research
 * See RESEARCH_DATA.md for sources and methodology
 */

export const BASELINE_DATA = {
  // Base year for all projections
  baseYear: 2024,
  
  // Global AI inference compute capacity (FLOP/s)
  // Estimated from ~2-3 million H100-class GPUs deployed
  // H100: ~2×10^15 FLOP/s each
  baseInferenceCompute: 5e21, // 5×10^21 FLOP/s
  
  // Training compute of frontier models (for reference)
  trainingComputeBenchmarks: {
    'GPT-3': 3e23,
    'GPT-4': 1e25,
    'Claude 3 Opus (est.)': 5e24,
    'Llama 3.1 405B': 4e25,
  },
  
  // Historical growth rates
  trainingComputeGrowthRate: 4.0,      // ~4x per year historically
  inferenceCapacityGrowthRate: 0.5,     // ~50% per year (more conservative)
  algorithmicEfficiencyRate: 1.4,       // ~40% improvement per year
  costDeclineRate: 0.25,                // ~25% cost reduction per year
  
  // Inference economics (Dec 2024)
  tokenCosts: {
    'GPT-4 Turbo': { input: 10, output: 30 },    // $/million tokens
    'GPT-4o': { input: 2.5, output: 10 },
    'Claude 3.5 Sonnet': { input: 3, output: 15 },
    'Claude 3 Opus': { input: 15, output: 75 },
    'Llama 3.1 70B': { input: 0.5, output: 1 },
  },
  
  // Approximate FLOPs per token for different model sizes
  flopsPerToken: {
    '7B params': 1e10,
    '70B params': 1e11,
    '400B params': 1e12,
  },
  
  // Global labour market
  globalWorkforce: 3.5e9,              // 3.5 billion workers
  averageWorkHoursPerYear: 1900,       // OECD average
  totalGlobalWorkHours: 3e11,          // ~300 billion hours/year
  globallabourIncome: 80e12,            // ~$80 trillion/year
  averageGlobalWage: 22,               // ~$22/hour weighted average
  
  // Task breakdown (rough estimates)
  taskCategories: {
    physicalManual: { share: 0.40, automatable: 0.1 },
    routineCognitive: { share: 0.25, automatable: 0.8 },
    complexCognitive: { share: 0.20, automatable: 0.5 },
    creativeSocial: { share: 0.15, automatable: 0.2 },
  },
  
  // Energy and physical constraints
  aiDatacenterPower2024: 75e12,        // ~75 TWh/year
  h100PowerConsumption: 700,           // Watts per chip
  avgElectricityCost: 0.08,            // $/kWh
  
  // Chip economics
  h100Price: 30000,                    // $ per chip
  h100WaferCost: 17500,                // $ per wafer
};

// Cognitive work categories with compute intensity
export const TASK_COMPUTE_REQUIREMENTS = [
  { 
    name: 'Simple queries/classification', 
    flopsPerTask: 1e10,
    humanMinutes: 1,
    share: 0.15,
  },
  { 
    name: 'Email/document drafting', 
    flopsPerTask: 5e11,
    humanMinutes: 15,
    share: 0.20,
  },
  { 
    name: 'Code generation/debugging', 
    flopsPerTask: 1e12,
    humanMinutes: 30,
    share: 0.15,
  },
  { 
    name: 'Analysis/research', 
    flopsPerTask: 5e12,
    humanMinutes: 60,
    share: 0.25,
  },
  { 
    name: 'Complex reasoning/planning', 
    flopsPerTask: 1e13,
    humanMinutes: 120,
    share: 0.15,
  },
  { 
    name: 'Creative/strategic work', 
    flopsPerTask: 5e13,
    humanMinutes: 240,
    share: 0.10,
  },
];

// Summary statistics
export const computeSummary = () => {
  const { baseInferenceCompute, totalGlobalWorkHours } = BASELINE_DATA;
  
  // How many cognitive hours can current AI provide?
  const avgFlopsPerHour = 1e15; // Average FLOPs for one hour of cognitive work
  const secondsPerYear = 365.25 * 24 * 3600;
  const aiCognitiveCapacity = (baseInferenceCompute * secondsPerYear * 0.3) / avgFlopsPerHour;
  
  // What fraction of global cognitive work could AI do today?
  const cognitiveWorkHours = totalGlobalWorkHours * 0.35; // ~35% of work is cognitive
  const currentAiCoverage = aiCognitiveCapacity / cognitiveWorkHours;
  
  return {
    aiCognitiveCapacity,
    cognitiveWorkHours,
    currentAiCoverage,
  };
};

