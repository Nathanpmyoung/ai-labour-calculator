// Parameter definitions with defaults and ranges

export interface Parameter {
  id: string;
  label: string;
  description: string;
  default: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  format: 'number' | 'percent' | 'scientific' | 'currency';
  group?: 'compute' | 'substitutability' | 'economic' | 'demand' | 'tiers';
  tier?: 'routine' | 'standard' | 'complex' | 'expert' | 'frontier';
}

// Tier configuration type - now with per-tier σ growth (S-curve), human capability, wages, and equilibrium dynamics
export interface TierConfig {
  id: string;
  name: string;
  color: string;
  defaultFlops: number;
  defaultShare: number;
  // Per-tier substitutability growth (S-curve / sigmoid model)
  initialSigma: number;   // σ in 2024 (starting point)
  maxSigma: number;       // Asymptotic σ (ceiling)
  sigmaMidpoint: number;  // Year when σ reaches halfway between initial and max (the "breakthrough" year)
  sigmaSteepness: number; // How rapid the transition (1=gradual ~5yr, 3=sharp ~2yr, 5=step-like ~1yr)
  // Human labor constraints
  humanCapable: number;  // Fraction of workforce capable of this tier (0-1)
  wageMultiplier: number; // Multiplier on base wage floor for this tier (minimum wage)
  // Equilibrium wage dynamics
  taskValue: number;     // Max $/hr employers will pay (wage ceiling)
  wageElasticity: number; // How wages respond to labor market tightness
  description: string;
}

export const TIER_CONFIGS: TierConfig[] = [
  // Routine: already automatable, rapid adoption curve
  { id: 'routine', name: 'Routine', color: '#22c55e', defaultFlops: 12, defaultShare: 0.25, 
    initialSigma: 0.10, maxSigma: 1.0, sigmaMidpoint: 2026, sigmaSteepness: 2, 
    humanCapable: 0.90, wageMultiplier: 1.0, 
    taskValue: 30, wageElasticity: 0.3,
    description: 'Email drafts, simple lookups, form filling' },
  // Standard: breakthrough happening now, moderate transition
  { id: 'standard', name: 'Standard', color: '#3b82f6', defaultFlops: 14, defaultShare: 0.35, 
    initialSigma: 0.10, maxSigma: 0.98, sigmaMidpoint: 2027, sigmaSteepness: 1.5, 
    humanCapable: 0.65, wageMultiplier: 1.5,
    taskValue: 60, wageElasticity: 0.5,
    description: 'Document summarization, code review, data analysis' },
  // Complex: breakthrough expected late 2020s
  { id: 'complex', name: 'Complex', color: '#a855f7', defaultFlops: 16, defaultShare: 0.25, 
    initialSigma: 0.05, maxSigma: 0.95, sigmaMidpoint: 2029, sigmaSteepness: 1.2, 
    humanCapable: 0.35, wageMultiplier: 2.5,
    taskValue: 150, wageElasticity: 0.8,
    description: 'Multi-step research, strategic planning' },
  // Expert: breakthrough expected early 2030s
  { id: 'expert', name: 'Expert', color: '#f97316', defaultFlops: 18, defaultShare: 0.12, 
    initialSigma: 0.05, maxSigma: 0.90, sigmaMidpoint: 2032, sigmaSteepness: 1.0, 
    humanCapable: 0.12, wageMultiplier: 5.0,
    taskValue: 400, wageElasticity: 1.2,
    description: 'Novel research, high-stakes decisions' },
  // Frontier: breakthrough uncertain, mid-2030s if at all
  { id: 'frontier', name: 'Frontier', color: '#ef4444', defaultFlops: 20, defaultShare: 0.03, 
    initialSigma: 0.02, maxSigma: 0.80, sigmaMidpoint: 2035, sigmaSteepness: 0.8, 
    humanCapable: 0.03, wageMultiplier: 10.0,
    taskValue: 1000, wageElasticity: 1.5,
    description: 'Breakthrough innovation, trust-critical' },
];

export const parameters: Parameter[] = [
  // === TIME ===
  {
    id: 'year',
    label: 'Projection Year',
    description: 'The year to project compute and labor dynamics to',
    default: 2030,
    min: 2024,
    max: 2050,
    step: 1,
    unit: '',
    format: 'number',
    group: 'compute',
  },
  
  // === COMPUTE SUPPLY ===
  {
    id: 'baseComputeExponent',
    label: 'Base Compute (2024)',
    description: 'Total global AI inference compute in FLOP/s (exponent of 10). Epoch AI estimates: ~5×10^21',
    default: 21.7, // 5×10^21 FLOP/s - actual 2024 estimate
    min: 19,
    max: 24,
    step: 0.1,
    unit: 'FLOP/s',
    format: 'scientific',
    group: 'compute',
  },
  {
    id: 'computeGrowthRate',
    label: 'Annual Compute Growth',
    description: 'Rate at which global AI inference capacity grows per year. Historical: 2-3x/year.',
    default: 1.0, // 100%/year = 2x/year, based on Epoch AI data
    min: 0.2,
    max: 3.0,
    step: 0.1,
    unit: '/year',
    format: 'percent',
    group: 'compute',
  },
  {
    id: 'computeGrowthDecay',
    label: 'Compute Growth Slowdown',
    description: 'How much compute growth rate declines per year. 0.05 = growth rate is 5% lower each year (Moore\'s Law slowdown).',
    default: 0.05, // Modest slowdown - growth slows over time
    min: 0,
    max: 0.20,
    step: 0.01,
    unit: '/year',
    format: 'percent',
    group: 'compute',
  },
  {
    id: 'efficiencyImprovement',
    label: 'Algorithmic Efficiency Gain',
    description: 'Annual improvement in compute efficiency (same capability, fewer FLOPs). Historical: ~2x/year.',
    default: 2.0, // 2x/year - Epoch AI "Algorithmic Progress in Language Models"
    min: 1.0,
    max: 3.0,
    step: 0.1,
    unit: 'x/year',
    format: 'number',
    group: 'compute',
  },
  {
    id: 'efficiencyDecay',
    label: 'Efficiency Gain Slowdown',
    description: 'How much algorithmic efficiency gains decline per year. 0.08 = 8% slower each year (low-hanging fruit gets picked).',
    default: 0.08, // Faster slowdown than hardware - algorithmic gains harder over time
    min: 0,
    max: 0.20,
    step: 0.01,
    unit: '/year',
    format: 'percent',
    group: 'compute',
  },
  
  // === ECONOMIC PARAMETERS ===
  {
    id: 'humanWageFloor',
    label: 'Human Wage Floor',
    description: 'Minimum viable hourly wage for human workers globally',
    default: 15,
    min: 1,
    max: 50,
    step: 1,
    unit: '$/hour',
    format: 'currency',
    group: 'economic',
  },
  {
    id: 'computeCostExponent',
    label: 'Compute Cost (2024)',
    description: 'Cost per 10^18 FLOPs (1 exaFLOP) in 2024 dollars',
    default: 0, // $1 per exaFLOP (more conservative than $0.10)
    min: -2,
    max: 2,
    step: 0.1,
    unit: '$/exaFLOP',
    format: 'scientific',
    group: 'economic',
  },
  {
    id: 'costDeclineRate',
    label: 'Cost Decline Rate',
    description: 'Annual rate at which compute costs decrease. Historical: ~30%/year.',
    default: 0.30, // 30% cheaper per year - historical GPU price/performance trend
    min: 0,
    max: 0.5,
    step: 0.05,
    unit: '/year',
    format: 'percent',
    group: 'economic',
  },
  {
    id: 'costDeclineDecay',
    label: 'Cost Decline Slowdown',
    description: 'How much cost decline rate slows per year. 0.05 = cost decline is 5% slower each year.',
    default: 0.05, // Modest slowdown
    min: 0,
    max: 0.20,
    step: 0.01,
    unit: '/year',
    format: 'percent',
    group: 'economic',
  },
  {
    id: 'mobilityThreshold',
    label: 'Mobility Threshold',
    description: 'Workers substitute down if lower tier pays this fraction of their tier wage. 0.8 = accept 20% pay cut.',
    default: 0.8,
    min: 0.5,
    max: 1.0,
    step: 0.05,
    unit: '',
    format: 'number',
    group: 'economic',
  },
  
  // === DEMAND DYNAMICS ===
  {
    id: 'cognitiveShare',
    label: 'Cognitive Work Share',
    description: 'Share of global work that is cognitive (vs physical/manual). ILO: 3.4B workers × 1,800 hrs/yr = 6.1T total hours. McKinsey estimates 35-50% is cognitive.',
    default: 0.40, // McKinsey estimate
    min: 0.20,
    max: 0.60,
    step: 0.05,
    unit: '',
    format: 'percent',
    group: 'demand',
  },
  {
    id: 'baselineDemandGrowth',
    label: 'Baseline Demand Growth',
    description: 'Background growth in cognitive work from GDP/population (independent of AI). World GDP grows ~3%/year.',
    default: 0.03, // 3%/year baseline
    min: 0,
    max: 0.10,
    step: 0.01,
    unit: '/year',
    format: 'percent',
    group: 'demand',
  },
  {
    id: 'demandElasticity',
    label: 'Demand Elasticity',
    description: 'How much demand increases when AI cost falls. 0 = fixed demand, 1 = demand doubles when cost halves.',
    default: 0.5, // Moderate elasticity
    min: 0,
    max: 1.5,
    step: 0.1,
    unit: '',
    format: 'number',
    group: 'demand',
  },
  {
    id: 'newTaskCreationRate',
    label: 'New Task Creation',
    description: 'Multiplier = 1 + (rate × σ_growth × years). σ = substitutability. At 0.1: if σ grows 0.25 over 6yr → 15% more work. At 0: no new work categories. At 0.3+: major new industries.',
    default: 0.1, // 10% of σ growth translates to new tasks
    min: 0,
    max: 0.5,
    step: 0.05,
    unit: '',
    format: 'number',
    group: 'demand',
  },
  // === TIER PARAMETERS ===
  // Each tier can be configured independently with its own σ growth trajectory
  ...TIER_CONFIGS.flatMap(tier => [
    {
      id: `tier_${tier.id}_flops`,
      label: `${tier.name}: FLOPs/hr`,
      description: `FLOPs required per hour (exponent). ${tier.description}`,
      default: tier.defaultFlops,
      min: 12,
      max: 30,
      step: 1,
      unit: '10^X',
      format: 'number' as const,
      group: 'tiers' as const,
      tier: tier.id as 'routine' | 'standard' | 'complex' | 'expert' | 'frontier',
    },
    {
      id: `tier_${tier.id}_share`,
      label: `${tier.name}: Work Share`,
      description: `Fraction of total cognitive work in this tier`,
      default: tier.defaultShare,
      min: 0.01,
      max: 0.50,
      step: 0.01,
      unit: '',
      format: 'percent' as const,
      group: 'tiers' as const,
      tier: tier.id as 'routine' | 'standard' | 'complex' | 'expert' | 'frontier',
    },
    {
      id: `tier_${tier.id}_initialSigma`,
      label: `${tier.name}: σ (2024)`,
      description: `σ = substitutability (0=AI can't replace humans, 1=perfect substitutes). Starting value in 2024.`,
      default: tier.initialSigma,
      min: 0.01,
      max: 0.90,
      step: 0.05,
      unit: '',
      format: 'number' as const,
      group: 'tiers' as const,
      tier: tier.id as 'routine' | 'standard' | 'complex' | 'expert' | 'frontier',
    },
    {
      id: `tier_${tier.id}_maxSigma`,
      label: `${tier.name}: σ (max)`,
      description: `Maximum substitutability this tier can ever reach (even with infinite time)`,
      default: tier.maxSigma,
      min: 0.05,
      max: 1.0,
      step: 0.05,
      unit: '',
      format: 'number' as const,
      group: 'tiers' as const,
      tier: tier.id as 'routine' | 'standard' | 'complex' | 'expert' | 'frontier',
    },
    {
      id: `tier_${tier.id}_sigmaMidpoint`,
      label: `${tier.name}: σ Midpoint`,
      description: `Year when σ reaches halfway between initial and max (the "breakthrough" year). Earlier = faster AI progress.`,
      default: tier.sigmaMidpoint,
      min: 2024,
      max: 2050,
      step: 1,
      unit: '',
      format: 'number' as const,
      group: 'tiers' as const,
      tier: tier.id as 'routine' | 'standard' | 'complex' | 'expert' | 'frontier',
    },
    {
      id: `tier_${tier.id}_sigmaSteepness`,
      label: `${tier.name}: σ Steepness`,
      description: `How rapid the S-curve transition. 1=gradual (~5yr spread), 3=sharp (~2yr), 5=step-like (~1yr).`,
      default: tier.sigmaSteepness,
      min: 0.3,
      max: 5,
      step: 0.1,
      unit: '',
      format: 'number' as const,
      group: 'tiers' as const,
      tier: tier.id as 'routine' | 'standard' | 'complex' | 'expert' | 'frontier',
    },
    {
      id: `tier_${tier.id}_humanCapable`,
      label: `${tier.name}: Human %`,
      description: `Fraction of workforce capable of performing this tier's tasks`,
      default: tier.humanCapable,
      min: 0.01,
      max: 1.0,
      step: 0.05,
      unit: '',
      format: 'percent' as const,
      group: 'tiers' as const,
      tier: tier.id as 'routine' | 'standard' | 'complex' | 'expert' | 'frontier',
    },
    {
      id: `tier_${tier.id}_wageMultiplier`,
      label: `${tier.name}: Wage ×`,
      description: `Minimum wage multiplier vs base wage floor. 2.0 = minimum 2× the floor`,
      default: tier.wageMultiplier,
      min: 1.0,
      max: 20.0,
      step: 0.5,
      unit: '×',
      format: 'number' as const,
      group: 'tiers' as const,
      tier: tier.id as 'routine' | 'standard' | 'complex' | 'expert' | 'frontier',
    },
    {
      id: `tier_${tier.id}_taskValue`,
      label: `${tier.name}: Task Value`,
      description: `Maximum $/hr employers will pay for this tier (wage ceiling)`,
      default: tier.taskValue,
      min: 10,
      max: 2000,
      step: 10,
      unit: '$/hr',
      format: 'currency' as const,
      group: 'tiers' as const,
      tier: tier.id as 'routine' | 'standard' | 'complex' | 'expert' | 'frontier',
    },
    {
      id: `tier_${tier.id}_wageElasticity`,
      label: `${tier.name}: Wage ε`,
      description: `How sensitive wages are to labor market tightness. Higher = wages spike faster when workers scarce.`,
      default: tier.wageElasticity,
      min: 0.1,
      max: 2.0,
      step: 0.1,
      unit: '',
      format: 'number' as const,
      group: 'tiers' as const,
      tier: tier.id as 'routine' | 'standard' | 'complex' | 'expert' | 'frontier',
    },
  ]),
];

export type ParameterValues = {
  [key: string]: number;
};

export const getDefaultValues = (): ParameterValues => {
  const values: ParameterValues = {};
  parameters.forEach(p => {
    values[p.id] = p.default;
  });
  return values;
};

export const formatValue = (param: Parameter, value: number): string => {
  switch (param.format) {
    case 'percent':
      return `${(value * 100).toFixed(0)}%`;
    case 'scientific':
      if (param.id === 'baseComputeExponent' || param.id === 'flopsPerCognitiveHour') {
        return `10^${value.toFixed(1)}`;
      }
      return `$${Math.pow(10, value).toFixed(2)}`;
    case 'currency':
      return `$${value.toFixed(0)}`;
    default:
      return value.toFixed(param.step < 1 ? 1 : 0);
  }
};
