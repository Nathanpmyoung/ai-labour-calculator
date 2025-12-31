/**
 * Core computation model for AI compute bounds calculator
 * 
 * TIERED TASK MODEL:
 * Instead of a single "FLOPs per cognitive hour", we model cognitive work
 * as a distribution over difficulty tiers, each with different:
 * - FLOPs requirements (easy tasks need fewer FLOPs than hard tasks)
 * - Share of total cognitive work
 * - Substitutability (routine tasks more substitutable than expert tasks)
 * 
 * This produces much more realistic dynamics where AI takes over easy tasks
 * first, and harder tasks remain human-dominated longer.
 */

import type { ParameterValues } from './parameters';
import { TIER_CONFIGS } from './parameters';

/**
 * Global Labor Statistics (2024 baseline)
 * Sources:
 * - ILO ILOSTAT 2023: Global employment = 3.4 billion
 * - OECD 2023: Average hours worked = ~1,800/year
 * - McKinsey Global Institute (2017): ~40% of work time involves cognitive tasks
 */
const GLOBAL_WORKFORCE_2024 = 3.4e9;           // ILO ILOSTAT
const AVG_HOURS_PER_WORKER_YEAR = 1800;        // OECD average
const DEFAULT_COGNITIVE_SHARE = 0.40;          // McKinsey estimate (35-50%)

// Calculated: Total global work hours = 6.12 trillion hours/year
// Cognitive work hours = 6.12T × 40% = 2.448 trillion hours/year
const TOTAL_GLOBAL_WORK_HOURS_2024 = GLOBAL_WORKFORCE_2024 * AVG_HOURS_PER_WORKER_YEAR;

// Base cognitive work demand - will be multiplied by cognitiveShare parameter
export function getBaseCognitiveWorkHours(cognitiveShare: number = DEFAULT_COGNITIVE_SHARE): number {
  return TOTAL_GLOBAL_WORK_HOURS_2024 * cognitiveShare;
}

/**
 * Task tier definition
 * Each tier represents a class of cognitive work with different characteristics
 * Now with per-tier σ growth trajectories, human capability bounds, and wage multipliers
 */
export interface TaskTier {
  id: string;
  name: string;
  description: string;
  flopsPerHourExponent: number;  // 10^X FLOPs needed per hour of this work
  shareOfCognitive: number;      // What fraction of cognitive hours is this tier?
  initialSigma: number;          // σ in 2024 for this tier
  maxSigma: number;              // Asymptotic σ this tier can reach
  sigmaHalfLife: number;         // Years to close half the gap to maxSigma
  humanCapable: number;          // Fraction of workforce capable of this tier (0-1)
  wageMultiplier: number;        // Minimum wage multiplier vs base floor for this tier
  taskValue: number;             // Max $/hr employers will pay (wage ceiling)
  wageElasticity: number;        // How wages respond to labor market tightness
  color: string;                 // For visualization
}

/**
 * Build task tiers from parameters
 * Each tier now has its own σ growth trajectory, human capability bounds, and wage multipliers
 */
export function buildTaskTiers(params: ParameterValues): TaskTier[] {
  return TIER_CONFIGS.map(config => ({
    id: config.id,
    name: config.name,
    description: config.description,
    color: config.color,
    flopsPerHourExponent: params[`tier_${config.id}_flops`] ?? config.defaultFlops,
    shareOfCognitive: params[`tier_${config.id}_share`] ?? config.defaultShare,
    initialSigma: params[`tier_${config.id}_initialSigma`] ?? config.initialSigma,
    maxSigma: params[`tier_${config.id}_maxSigma`] ?? config.maxSigma,
    sigmaHalfLife: params[`tier_${config.id}_sigmaHalfLife`] ?? config.sigmaHalfLife,
    humanCapable: params[`tier_${config.id}_humanCapable`] ?? config.humanCapable,
    wageMultiplier: params[`tier_${config.id}_wageMultiplier`] ?? config.wageMultiplier,
    taskValue: params[`tier_${config.id}_taskValue`] ?? config.taskValue,
    wageElasticity: params[`tier_${config.id}_wageElasticity`] ?? config.wageElasticity,
  }));
}

/**
 * Normalize tier shares to sum to 1.0
 * (in case user adjusts shares that don't sum correctly)
 */
function normalizeTierShares(tiers: TaskTier[]): TaskTier[] {
  const totalShare = tiers.reduce((sum, t) => sum + t.shareOfCognitive, 0);
  if (Math.abs(totalShare - 1.0) < 0.001) return tiers;
  
  return tiers.map(t => ({
    ...t,
    shareOfCognitive: t.shareOfCognitive / totalShare,
  }));
}

// Default tiers for display (when no params available)
export const DEFAULT_TASK_TIERS: TaskTier[] = TIER_CONFIGS.map(config => ({
  id: config.id,
  name: config.name,
  description: config.description,
  color: config.color,
  flopsPerHourExponent: config.defaultFlops,
  shareOfCognitive: config.defaultShare,
  initialSigma: config.initialSigma,
  maxSigma: config.maxSigma,
  sigmaHalfLife: config.sigmaHalfLife,
  humanCapable: config.humanCapable,
  wageMultiplier: config.wageMultiplier,
  taskValue: config.taskValue,
  wageElasticity: config.wageElasticity,
}));

/**
 * Per-tier allocation results
 */
export interface TierAllocation {
  tier: TaskTier;
  aiCostPerHour: number;       // Cost for AI to do 1 hour of this tier's work
  aiShare: number;             // Fraction of this tier done by AI
  humanShare: number;          // Fraction done by humans
  effectiveSubstitutability: number; // σ for this tier this year
  bindingConstraint: 'cost' | 'compute' | 'substitutability' | 'humanCapacity';
  hoursAI: number;             // Total hours done by AI
  hoursHuman: number;          // Total hours done by humans
  computeUsed: number;         // FLOPs used for this tier
  tierWage: number;            // Equilibrium wage for this tier ($/hr)
  humanCapacityHours: number;  // Max hours humans can supply for this tier (base capacity)
  // Equilibrium wage dynamics
  effectiveSupply: number;     // Base capacity + displaced workers from above
  laborTightness: number;      // Demand / effective supply ratio
  displacedInflow: number;     // Hours of workers displaced from higher tiers
  wageAtCeiling: boolean;      // True if wage hit task value ceiling
}

export interface YearlyProjection {
  year: number;
  totalComputeFlops: number;         // Total available FLOP/s
  effectiveComputeFlops: number;     // Adjusted for efficiency gains
  computeCostPerExaflop: number;     // $/exaFLOP
  
  // Demand dynamics
  totalCognitiveWorkHours: number;   // Dynamic total demand for this year
  demandGrowthFromBaseline: number;  // % growth from 2024 baseline
  demandComponents: {
    baseline: number;                // From GDP/population growth
    aiInduced: number;               // From AI cost reduction (elasticity)
    newTasks: number;                // From AI capability creating new work
    humanPreference: number;         // Shift toward human-preferred tasks
  };
  
  // Aggregated metrics
  aiTaskShare: number;               // Overall fraction of cognitive tasks done by AI
  humanTaskShare: number;            // Overall fraction done by humans
  humanWageEquilibrium: number;      // Weighted equilibrium wage for humans
  totalAIHours: number;              // Absolute hours done by AI
  totalHumanHours: number;           // Absolute hours done by humans
  
  // Per-tier breakdown
  tierAllocations: TierAllocation[];
  
  // Average substitutability across tiers (weighted by share)
  averageSubstitutability: number;
  
  // Constraint analysis
  primaryBindingConstraint: 'cost' | 'compute' | 'substitutability' | 'humanCapacity';
  computeUtilization: number;        // What % of available compute is used
}

export interface ModelOutputs {
  projections: YearlyProjection[];
  tiers: TaskTier[];
  summary: {
    crossoverYear: number | null;    // Year when avg AI cost < human wage floor
    computeSufficiencyYear: number | null; // Year when AI can do all cognitive work
    finalAiShare: number;
    finalHumanWage: number;
    tierSummary: { tierId: string; aiShare: number }[];
  };
}

/**
 * Calculate time-varying substitutability for a tier
 * Each tier grows from its initialSigma toward its maxSigma
 * Uses exponential decay toward asymptote: σ(t) = σ_max - (σ_max - σ_0) × e^(-t/τ)
 * where τ = halfLife / ln(2)
 */
function calculateTierSubstitutability(
  initialSigma: number,
  maxSigma: number,
  halfLife: number,
  yearsFromBase: number
): number {
  if (yearsFromBase <= 0) return initialSigma;
  
  const tau = halfLife / Math.log(2);
  const sigma = maxSigma - (maxSigma - initialSigma) * Math.exp(-yearsFromBase / tau);
  
  return Math.min(Math.max(sigma, 0), 1);
}

/**
 * Calculate the total available compute for a given year
 * Supports declining growth rates to model Moore's Law slowdown
 */
function calculateTotalCompute(
  baseComputeExponent: number,
  computeGrowthRate: number,
  yearsFromBase: number,
  growthDecay: number = 0
): number {
  const baseCompute = Math.pow(10, baseComputeExponent);
  
  if (growthDecay === 0 || yearsFromBase === 0) {
    // Original behavior - constant growth rate
    return baseCompute * Math.pow(1 + computeGrowthRate, yearsFromBase);
  }
  
  // Compound declining growth iteratively
  // rate(year) = initialRate × (1 - decay)^year
  let multiplier = 1;
  for (let y = 0; y < yearsFromBase; y++) {
    const yearRate = computeGrowthRate * Math.pow(1 - growthDecay, y);
    multiplier *= (1 + yearRate);
  }
  return baseCompute * multiplier;
}

/**
 * Calculate effective compute (adjusted for algorithmic improvements)
 * Supports declining efficiency gains to model diminishing returns
 */
function calculateEffectiveCompute(
  totalCompute: number,
  efficiencyImprovement: number,
  yearsFromBase: number,
  efficiencyDecay: number = 0
): number {
  if (efficiencyDecay === 0 || yearsFromBase === 0) {
    // Original behavior - constant efficiency multiplier
    return totalCompute * Math.pow(efficiencyImprovement, yearsFromBase);
  }
  
  // Compound declining efficiency gains iteratively
  // For efficiency, the improvement factor decays: factor(year) = initialFactor^((1-decay)^year)
  // This is equivalent to multiplying by a declining factor each year
  let multiplier = 1;
  for (let y = 0; y < yearsFromBase; y++) {
    // Decay the log of the improvement factor (so 2x becomes closer to 1x over time)
    const effectiveFactor = Math.pow(efficiencyImprovement, Math.pow(1 - efficiencyDecay, y));
    multiplier *= effectiveFactor;
  }
  return totalCompute * multiplier;
}

/**
 * Calculate cost per exaFLOP for a given year
 * Supports declining cost decline rate to model optimization plateaus
 */
function calculateComputeCost(
  baseCostExponent: number,
  costDeclineRate: number,
  yearsFromBase: number,
  costDeclineDecay: number = 0
): number {
  const baseCost = Math.pow(10, baseCostExponent);
  
  if (costDeclineDecay === 0 || yearsFromBase === 0) {
    // Original behavior - constant decline rate
    return baseCost * Math.pow(1 - costDeclineRate, yearsFromBase);
  }
  
  // Compound declining cost decline iteratively
  // rate(year) = initialRate × (1 - decay)^year
  let multiplier = 1;
  for (let y = 0; y < yearsFromBase; y++) {
    const yearDeclineRate = costDeclineRate * Math.pow(1 - costDeclineDecay, y);
    multiplier *= (1 - yearDeclineRate);
  }
  return baseCost * multiplier;
}

/**
 * Calculate dynamic cognitive work demand
 * 
 * Total demand is NOT fixed - it responds to:
 * 1. Baseline growth (GDP/population)
 * 2. AI-induced demand (cheaper cognitive work → more gets done)
 * 3. New task creation (AI capabilities enable new work categories)
 * 4. Human preference growth (some work shifts toward "must be human")
 */
interface DemandComponents {
  baseline: number;       // Multiplier from GDP/population growth
  aiInduced: number;      // Multiplier from AI cost reduction
  newTasks: number;       // Multiplier from new task creation
  humanPreference: number; // Additional human-preferred hours
}

function calculateCognitiveWorkDemand(
  baseCognitiveHours: number,    // Base cognitive work hours (from getBaseCognitiveWorkHours)
  yearsFromBase: number,
  baselineDemandGrowth: number,
  demandElasticity: number,
  newTaskCreationRate: number,
  humanPreferencePremium: number,
  aiCostReduction: number,      // How much cheaper is AI now vs 2024 (0-1 scale)
  substitutabilityGrowth: number // How much has σ multiplier grown from initial
): { totalHours: number; components: DemandComponents } {
  
  // 1. Baseline growth from GDP/population (compound growth)
  const baselineMultiplier = Math.pow(1 + baselineDemandGrowth, yearsFromBase);
  
  // 2. AI-induced demand: cheaper AI → more cognitive work gets done
  // If AI is 10x cheaper, and elasticity is 0.5, demand increases by ~3x
  // Use log scale for cost reduction effect
  const costReductionFactor = Math.max(0.01, 1 - aiCostReduction);
  const aiInducedMultiplier = 1 + demandElasticity * Math.log10(1 / costReductionFactor);
  
  // 3. New task creation: AI capabilities enable work that wasn't possible before
  // Tied to σ growth - as AI becomes more capable, new use cases emerge
  const newTaskMultiplier = 1 + newTaskCreationRate * substitutabilityGrowth * yearsFromBase;
  
  // 4. Human preference: some fraction of work shifts toward "must be human"
  // This adds to total demand but is human-only
  const humanPreferenceHours = baseCognitiveHours * 
    humanPreferencePremium * yearsFromBase;
  
  // Total cognitive work demand
  const baseAIAddressableDemand = baseCognitiveHours * 
    baselineMultiplier * 
    Math.max(1, aiInducedMultiplier) * 
    newTaskMultiplier;
  
  const totalHours = baseAIAddressableDemand + humanPreferenceHours;
  
  return {
    totalHours,
    components: {
      baseline: baselineMultiplier,
      aiInduced: Math.max(1, aiInducedMultiplier),
      newTasks: newTaskMultiplier,
      humanPreference: humanPreferenceHours,
    },
  };
}

/**
 * Calculate AI cost per hour for a specific tier
 */
function calculateAiCostPerHourForTier(
  flopsPerHourExponent: number,
  costPerExaflop: number,
  efficiencyMultiplier: number  // Efficiency improvements reduce effective FLOPs needed
): number {
  const flopsPerHour = Math.pow(10, flopsPerHourExponent) / efficiencyMultiplier;
  const exaflopsPerHour = flopsPerHour / 1e18;
  return exaflopsPerHour * costPerExaflop;
}

// Constants for compute allocation
const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
const AI_UTILIZATION = 0.3; // Fraction of compute capacity used for cognitive work

/**
 * Calculate tier-shifted demand
 * 
 * When AI automates lower tiers, organizations don't just do the same work cheaper—
 * they attempt MORE complex work. "Now that AI handles routine tasks, we can afford
 * to do frontier-level research on everything."
 * 
 * This shifts demand UP the tier stack proportionally to AI automation at lower tiers.
 */
function calculateTierShiftedDemand(
  tiers: TaskTier[],
  baseTierHours: number[],
  aiSharePerTier: number[],
  tierShiftRate: number
): number[] {
  const n = tiers.length;
  const shiftedHours = [...baseTierHours];
  
  // For each tier i, calculate induced demand from automation at lower tiers
  // Work automated at tier i can induce demand at tier i+1, i+2, etc.
  for (let i = 0; i < n - 1; i++) {
    // Hours done by AI at this tier
    const aiHoursAtTier = baseTierHours[i] * aiSharePerTier[i];
    
    // Some fraction of that AI work creates demand for more complex work
    const inducedDemand = aiHoursAtTier * tierShiftRate;
    
    // Distribute induced demand to higher tiers
    // Weight by inverse tier distance (closer tiers get more)
    // e.g., Routine automation mostly creates Standard demand, some Complex, less Expert
    let totalWeight = 0;
    for (let j = i + 1; j < n; j++) {
      totalWeight += 1 / (j - i);
    }
    
    for (let j = i + 1; j < n; j++) {
      const weight = (1 / (j - i)) / totalWeight;
      shiftedHours[j] += inducedDemand * weight;
    }
  }
  
  return shiftedHours;
}

/**
 * Equilibrium wage calculation result for a single tier
 */
interface TierEquilibriumResult {
  equilibriumWage: number;      // Final wage after supply/demand equilibrium
  effectiveSupply: number;      // Base capacity + displaced from above
  laborTightness: number;       // Demand / effective supply
  displacedInflow: number;      // Workers displaced from higher tiers
  wageAtCeiling: boolean;       // True if wage hit task value ceiling
}

/**
 * Calculate equilibrium wages with inter-tier mobility
 * 
 * This model considers:
 * 1. Displacement-driven mobility: Workers displaced by AI flow to lower tiers
 * 2. Voluntary mobility: Workers substitute down if lower tier pays well enough
 * 3. Task value ceiling: Wages cannot exceed task value (work doesn't get done)
 * 4. Per-tier wage elasticity: How sensitive wages are to labor market tightness
 * 
 * Returns equilibrium wages for all tiers after iterative convergence.
 */
function calculateEquilibriumWages(
  tiers: TaskTier[],
  tierHoursNeeded: number[],     // Human hours needed per tier (after AI allocation)
  baseCapacity: number[],        // Base human capacity per tier (humanCapable × total)
  aiSharePerTier: number[],      // AI share for each tier (for displacement calc)
  wageFloor: number,
  mobilityThreshold: number,
  maxIterations: number = 20
): TierEquilibriumResult[] {
  const n = tiers.length;
  
  // Initialize with base wages (floor × multiplier)
  let wages = tiers.map(t => wageFloor * t.wageMultiplier);
  let effectiveSupply = [...baseCapacity];
  let displacedInflow = new Array(n).fill(0);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const prevWages = [...wages];
    
    // Step 1: Calculate displaced workers from each tier
    // Workers are displaced when AI automates their work
    const displacedWorkers = tiers.map((_, i) => {
      return aiSharePerTier[i] * baseCapacity[i];
    });
    
    // Step 2: Flow displaced workers down to lower tiers
    // Displaced workers from tier i flow to tier i-1, i-2, etc.
    // They go to the highest tier they're capable of (which is any lower tier)
    displacedInflow = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      const displaced = displacedWorkers[i];
      if (displaced > 0) {
        // Flow to all lower tiers proportionally
        for (let j = i - 1; j >= 0; j--) {
          // Workers flow to lower tiers based on wage attractiveness
          // Higher wages attract more displaced workers
          const tierWage = wages[j];
          const attractiveness = tierWage / wages[i]; // Relative wage appeal
          const inflowShare = Math.min(1, attractiveness) / (i); // Distribute across tiers
          displacedInflow[j] += displaced * inflowShare;
        }
      }
    }
    
    // Step 3: Calculate voluntary mobility (workers substitute down if wages are higher below)
    const voluntaryMobility = new Array(n).fill(0);
    for (let i = n - 1; i > 0; i--) {
      // Check if any lower tier pays enough to attract workers from tier i
      for (let j = i - 1; j >= 0; j--) {
        if (wages[j] > wages[i] * mobilityThreshold) {
          // Some tier-i capable workers will move to tier-j
          // Amount depends on how much higher the wage is
          const wagePremium = (wages[j] / (wages[i] * mobilityThreshold)) - 1;
          const mobilityRate = Math.min(0.3, wagePremium * 0.5); // Cap at 30%
          const moversHours = baseCapacity[i] * (1 - aiSharePerTier[i]) * mobilityRate;
          voluntaryMobility[j] += moversHours;
        }
      }
    }
    
    // Step 4: Update effective supply = base capacity + displaced inflow + voluntary inflow
    // Note: Workers moving down reduce capacity at their original tier
    effectiveSupply = baseCapacity.map((base, i) => {
      // Base capacity for this tier (reduced by displacement)
      const remaining = base * (1 - aiSharePerTier[i]);
      // Plus inflows from above
      return remaining + displacedInflow[i] + voluntaryMobility[i];
    });
    
    // Step 5: Calculate labor market tightness and equilibrium wages
    wages = tiers.map((tier, i) => {
      const demand = tierHoursNeeded[i];
      const supply = Math.max(effectiveSupply[i], 1); // Avoid division by zero
      const tightness = demand / supply;
      
      // Wage formula: baseWage × tightness^elasticity
      const baseWage = wageFloor * tier.wageMultiplier;
      const rawWage = baseWage * Math.pow(Math.max(1, tightness), tier.wageElasticity);
      
      // Cap at task value (wage ceiling)
      return Math.min(rawWage, tier.taskValue);
    });
    
    // Check convergence
    const maxDiff = Math.max(...wages.map((w, i) => Math.abs(w - prevWages[i]) / prevWages[i]));
    if (maxDiff < 0.01) break; // 1% tolerance
  }
  
  // Build results
  return tiers.map((tier, i) => {
    const demand = tierHoursNeeded[i];
    const supply = effectiveSupply[i];
    const tightness = demand / Math.max(supply, 1);
    
    return {
      equilibriumWage: wages[i],
      effectiveSupply: effectiveSupply[i],
      laborTightness: tightness,
      displacedInflow: displacedInflow[i],
      wageAtCeiling: wages[i] >= tier.taskValue * 0.99,
    };
  });
}

/**
 * Value-per-FLOP info for optimization
 */
interface TierValueInfo {
  tier: TaskTier;
  tierIndex: number;
  tierWage: number;            // Wage for this tier (base × multiplier)
  aiCostPerHour: number;       // Cost for AI to do 1 hour
  flopsPerHour: number;        // After efficiency adjustment
  valuePerFlop: number;        // = tierWage / flopsPerHour
  effectiveSigma: number;      // Effective substitutability for this tier
  tierHours: number;           // Total hours of work in this tier
  maxAIHours: number;          // Limited by substitutability
  maxComputeNeeded: number;    // FLOPs to max out this tier
  isCostEffective: boolean;    // Is AI cheaper than tier wage?
  humanCapacityHours: number;  // Max hours humans can supply for this tier
}

/**
 * Optimally allocate compute across tiers using value-per-FLOP ordering
 * 
 * Now also considers:
 * - Human capacity constraints (not everyone can do expert work)
 * - Per-tier wages (harder tiers pay more)
 * - Human capacity binding (when humans can't supply enough workers)
 */
function allocateComputeOptimally(
  tiers: TaskTier[],
  tierHoursArray: number[],
  tierSigmaArray: number[],     // Per-tier effective σ for this year
  efficiencyMultiplier: number,
  totalComputeBudget: number,   // Total FLOP/s available
  costPerExaflop: number,
  humanWageFloor: number,
  totalWorkforceHours: number   // Total human cognitive work hours available
): TierAllocation[] {
  // 1. Calculate value info for each tier
  const tierValues: TierValueInfo[] = tiers.map((tier, i) => {
    // Per-tier wage based on the tier's wage multiplier
    const tierWage = humanWageFloor * tier.wageMultiplier;
    
    const effectiveFlopsPerHour = Math.pow(10, tier.flopsPerHourExponent) / efficiencyMultiplier;
    const aiCostPerHour = calculateAiCostPerHourForTier(
      tier.flopsPerHourExponent,
      costPerExaflop,
      efficiencyMultiplier
    );
    
    const effectiveSigma = tierSigmaArray[i]; // Use per-tier σ
    const tierHours = tierHoursArray[i];
    const maxAIHours = tierHours * effectiveSigma;
    const maxComputeNeeded = maxAIHours * effectiveFlopsPerHour;
    
    // Human capacity constraint: only humanCapable fraction of workforce can do this tier
    // Total workforce hours × humanCapable = max hours humans can supply for this tier
    const humanCapacityHours = totalWorkforceHours * tier.humanCapable;
    
    // Value per FLOP = economic value created per unit compute
    const valuePerFlop = tierWage / effectiveFlopsPerHour;
    
    return {
      tier,
      tierIndex: i,
      tierWage,
      aiCostPerHour,
      flopsPerHour: effectiveFlopsPerHour,
      valuePerFlop,
      effectiveSigma,
      tierHours,
      maxAIHours,
      maxComputeNeeded,
      isCostEffective: aiCostPerHour < tierWage, // Compare to tier wage, not floor
      humanCapacityHours,
    };
  });
  
  // 2. Sort by value per FLOP (descending) - highest value first
  // Only consider cost-effective tiers for compute allocation priority
  const sortedTiers = [...tierValues].sort((a, b) => {
    // Cost-effective tiers get priority
    if (a.isCostEffective && !b.isCostEffective) return -1;
    if (!a.isCostEffective && b.isCostEffective) return 1;
    // Among cost-effective (or non-cost-effective), sort by value per FLOP
    return b.valuePerFlop - a.valuePerFlop;
  });
  
  // 3. Greedy allocation - allocate compute to highest value tiers first
  const totalAvailableCompute = totalComputeBudget * SECONDS_PER_YEAR * AI_UTILIZATION;
  let remainingCompute = totalAvailableCompute;
  
  // Track allocation for each tier
  const allocations: Map<number, { 
    aiHours: number; 
    computeUsed: number; 
    bindingConstraint: 'cost' | 'compute' | 'substitutability' | 'humanCapacity' 
  }> = new Map();
  
  for (const tv of sortedTiers) {
    let aiHours = 0;
    let computeUsed = 0;
    let bindingConstraint: 'cost' | 'compute' | 'substitutability' | 'humanCapacity' = 'cost';
    
    // Calculate how much work humans can do for this tier
    const humanCanSupply = tv.humanCapacityHours;
    const humanWorkNeeded = tv.tierHours * (1 - tv.effectiveSigma); // Work that must be human
    const humanCapacityBinding = humanWorkNeeded > humanCanSupply;
    
    if (!tv.isCostEffective) {
      // AI is more expensive than humans - minimal adoption (early adopters only)
      // But if human capacity is binding, AI must fill the gap
      if (humanCapacityBinding) {
        // Humans can't supply enough - AI must fill gap even if expensive
        const humanActual = humanCanSupply;
        aiHours = tv.tierHours - humanActual;
        computeUsed = aiHours * tv.flopsPerHour;
        bindingConstraint = 'humanCapacity';
      } else {
        aiHours = tv.tierHours * 0.02 * tv.effectiveSigma;
        computeUsed = aiHours * tv.flopsPerHour;
        bindingConstraint = 'cost';
      }
    } else {
      // AI is cost-effective - allocate up to limits
      const desiredAIHours = tv.maxAIHours; // Want to max out substitutability
      
      // But if human capacity is binding, AI must do more
      const minAIHours = humanCapacityBinding ? tv.tierHours - humanCanSupply : 0;
      const targetAIHours = Math.max(desiredAIHours, minAIHours);
      
      const computeNeeded = targetAIHours * tv.flopsPerHour;
      
      if (computeNeeded <= remainingCompute) {
        // Have enough compute
        aiHours = targetAIHours;
        computeUsed = computeNeeded;
        bindingConstraint = humanCapacityBinding ? 'humanCapacity' : 'substitutability';
      } else {
        // Compute is binding - allocate what we can
        aiHours = remainingCompute / tv.flopsPerHour;
        computeUsed = remainingCompute;
        bindingConstraint = 'compute';
      }
    }
    
    remainingCompute = Math.max(0, remainingCompute - computeUsed);
    allocations.set(tv.tierIndex, { aiHours, computeUsed, bindingConstraint });
  }
  
  // 4. Build final allocations in original tier order
  // Note: equilibrium wage fields will be populated by runModel after calling calculateEquilibriumWages
  return tierValues.map(tv => {
    const alloc = allocations.get(tv.tierIndex)!;
    const aiShare = alloc.aiHours / tv.tierHours;
    
    return {
      tier: tv.tier,
      aiCostPerHour: tv.aiCostPerHour,
      aiShare: Math.max(0, Math.min(1, aiShare)),
      humanShare: Math.max(0, Math.min(1, 1 - aiShare)),
      effectiveSubstitutability: tv.effectiveSigma,
      bindingConstraint: alloc.bindingConstraint,
      hoursAI: alloc.aiHours,
      hoursHuman: tv.tierHours - alloc.aiHours,
      computeUsed: alloc.computeUsed / SECONDS_PER_YEAR, // Convert back to FLOP/s
      tierWage: tv.tierWage, // Will be updated with equilibrium wage
      humanCapacityHours: tv.humanCapacityHours,
      // Equilibrium wage fields - initially set to base values, updated by runModel
      effectiveSupply: tv.humanCapacityHours,
      laborTightness: 1.0,
      displacedInflow: 0,
      wageAtCeiling: false,
    };
  });
}

// Human wage calculation now uses per-tier wages from TierAllocation.tierWage
// Average human wage is calculated in runModel as weighted average of tier wages

/**
 * Main model function: run projections for all years
 */
export function runModel(params: ParameterValues): ModelOutputs {
  const BASE_YEAR = 2024;
  const projections: YearlyProjection[] = [];
  let crossoverYear: number | null = null;
  let computeSufficiencyYear: number | null = null;
  
  const endYear = Math.max(params.year, 2050);
  
  // Build task tiers from parameters (allows independent configuration)
  const taskTiers = normalizeTierShares(buildTaskTiers(params));
  
  // Calculate base cognitive work hours from cognitiveShare parameter
  // Default 0.4 = 40% of global work is cognitive (McKinsey estimate)
  const cognitiveShare = params.cognitiveShare ?? DEFAULT_COGNITIVE_SHARE;
  const baseCognitiveHours = getBaseCognitiveWorkHours(cognitiveShare);
  
  // First pass: calculate base AI cost reduction trajectory
  // (needed for demand elasticity calculation)
  const baseCostPerExaflop2024 = Math.pow(10, params.computeCostExponent);
  
  for (let year = BASE_YEAR; year <= endYear; year++) {
    const yearsFromBase = year - BASE_YEAR;
    
    // Calculate per-tier substitutability for this year
    // Each tier has its own half-life for growth toward its maxSigma
    const tierSigmaArray = taskTiers.map(tier => 
      calculateTierSubstitutability(
        tier.initialSigma,
        tier.maxSigma,
        tier.sigmaHalfLife,
        yearsFromBase
      )
    );
    
    // Calculate average σ across tiers (weighted by share) for display
    const averageSubstitutability = taskTiers.reduce((sum, tier, i) => 
      sum + tierSigmaArray[i] * tier.shareOfCognitive, 0);
    
    // Calculate compute metrics (with optional declining growth rates)
    const totalComputeFlops = calculateTotalCompute(
      params.baseComputeExponent,
      params.computeGrowthRate,
      yearsFromBase,
      params.computeGrowthDecay ?? 0
    );
    
    const effectiveComputeFlops = calculateEffectiveCompute(
      totalComputeFlops,
      params.efficiencyImprovement,
      yearsFromBase,
      params.efficiencyDecay ?? 0
    );
    
    const computeCostPerExaflop = calculateComputeCost(
      params.computeCostExponent,
      params.costDeclineRate,
      yearsFromBase,
      params.costDeclineDecay ?? 0
    );
    
    // Efficiency multiplier for reducing FLOPs needed (with decay)
    // Use same decay logic as calculateEffectiveCompute
    let efficiencyMultiplier = 1;
    const efficiencyDecay = params.efficiencyDecay ?? 0;
    if (efficiencyDecay === 0 || yearsFromBase === 0) {
      efficiencyMultiplier = Math.pow(params.efficiencyImprovement, yearsFromBase);
    } else {
      for (let y = 0; y < yearsFromBase; y++) {
        const effectiveFactor = Math.pow(params.efficiencyImprovement, Math.pow(1 - efficiencyDecay, y));
        efficiencyMultiplier *= effectiveFactor;
      }
    }
    
    // Calculate AI cost reduction for demand elasticity
    // This combines cost decline + efficiency improvement
    const effectiveCostReduction = 1 - (computeCostPerExaflop / efficiencyMultiplier) / 
      (baseCostPerExaflop2024);
    
    // Calculate average σ growth from initial (for demand calculation)
    const avgInitialSigma = taskTiers.reduce((sum, tier) => 
      sum + tier.initialSigma * tier.shareOfCognitive, 0);
    const substitutabilityGrowth = averageSubstitutability - avgInitialSigma;
    
    // Calculate dynamic cognitive work demand
    const demandResult = calculateCognitiveWorkDemand(
      baseCognitiveHours,
      yearsFromBase,
      params.baselineDemandGrowth ?? 0.03,
      params.demandElasticity ?? 0.5,
      params.newTaskCreationRate ?? 0.1,
      params.humanPreferencePremium ?? 0.02,
      effectiveCostReduction,
      substitutabilityGrowth
    );
    
    const totalCognitiveWorkHours = demandResult.totalHours;
    const demandGrowthFromBaseline = (totalCognitiveWorkHours / baseCognitiveHours) - 1;
    
    // Calculate base hours per tier
    const baseTierHours = taskTiers.map(tier => 
      totalCognitiveWorkHours * tier.shareOfCognitive
    );
    
    // First pass: allocate compute to get AI shares
    // Use FIXED workforce (baseCognitiveHours) for human capacity, not demand-scaled hours
    const preliminaryAllocations = allocateComputeOptimally(
      taskTiers,
      baseTierHours,
      tierSigmaArray,
      efficiencyMultiplier,
      effectiveComputeFlops,
      computeCostPerExaflop,
      params.humanWageFloor,
      baseCognitiveHours  // Fixed workforce, not demand
    );
    
    // Calculate tier-shift induced demand
    // When AI automates lower tiers, some demand shifts UP to harder tiers
    // This captures: "Now that AI handles the routine stuff, we can attempt more complex work"
    const tierShiftRate = params.tierShiftRate ?? 0.3;
    const tierHoursArray = calculateTierShiftedDemand(
      taskTiers,
      baseTierHours,
      preliminaryAllocations.map(ta => ta.aiShare),
      tierShiftRate
    );
    
    // Second pass: re-allocate with shifted demand
    // This may change AI shares slightly, but the main effect is increased demand at higher tiers
    // Use FIXED workforce (baseCognitiveHours) - workforce doesn't scale with demand
    const tierAllocations = allocateComputeOptimally(
      taskTiers,
      tierHoursArray,
      tierSigmaArray,
      efficiencyMultiplier,
      effectiveComputeFlops,
      computeCostPerExaflop,
      params.humanWageFloor,
      baseCognitiveHours  // Fixed workforce, not demand
    );
    
    // Calculate equilibrium wages with inter-tier mobility
    // This accounts for displaced workers flowing to lower tiers and voluntary mobility
    const tierHoursNeeded = tierAllocations.map(ta => ta.hoursHuman);
    // Use FIXED workforce capacity (base 2024 hours), not demand-scaled capacity
    // Otherwise wages don't respond to increased demand (capacity scales with demand)
    const baseCapacity = taskTiers.map(t => baseCognitiveHours * t.humanCapable);
    const aiSharePerTier = tierAllocations.map(ta => ta.aiShare);
    const mobilityThreshold = params.mobilityThreshold ?? 0.8;
    
    const equilibriumResults = calculateEquilibriumWages(
      taskTiers,
      tierHoursNeeded,
      baseCapacity,
      aiSharePerTier,
      params.humanWageFloor,
      mobilityThreshold
    );
    
    // Update tier allocations with equilibrium wage info
    tierAllocations.forEach((ta, i) => {
      const eq = equilibriumResults[i];
      ta.tierWage = eq.equilibriumWage;
      ta.effectiveSupply = eq.effectiveSupply;
      ta.laborTightness = eq.laborTightness;
      ta.displacedInflow = eq.displacedInflow;
      ta.wageAtCeiling = eq.wageAtCeiling;
    });
    
    // Add human-preference hours (these are 100% human by definition)
    const humanPreferenceHours = demandResult.components.humanPreference;
    
    // Calculate aggregate metrics
    const totalAIHours = tierAllocations.reduce((sum, ta) => sum + ta.hoursAI, 0);
    const totalHumanHours = tierAllocations.reduce((sum, ta) => sum + ta.hoursHuman, 0) + humanPreferenceHours;
    const aiTaskShare = totalAIHours / totalCognitiveWorkHours;
    const humanTaskShare = totalHumanHours / totalCognitiveWorkHours;
    
    // Calculate average human wage (weighted by hours worked in each tier) using equilibrium wages
    const totalTierHumanHours = tierAllocations.reduce((sum, ta) => sum + ta.hoursHuman, 0);
    const humanWageEquilibrium = totalTierHumanHours > 0 
      ? tierAllocations.reduce((sum, ta) => sum + ta.tierWage * ta.hoursHuman, 0) / totalTierHumanHours
      : params.humanWageFloor;
    
    // Determine primary binding constraint (most common across tiers weighted by hours)
    const constraintCounts: Record<string, number> = { cost: 0, compute: 0, substitutability: 0, humanCapacity: 0 };
    tierAllocations.forEach(ta => {
      constraintCounts[ta.bindingConstraint] += ta.tier.shareOfCognitive;
    });
    const primaryBindingConstraint = Object.entries(constraintCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as 'cost' | 'compute' | 'substitutability' | 'humanCapacity';
    
    // Compute utilization
    const totalComputeUsed = tierAllocations.reduce((sum, ta) => sum + ta.computeUsed, 0);
    const computeUtilization = Math.min(1, totalComputeUsed / effectiveComputeFlops);
    
    // Track crossover year (average AI cost < wage floor)
    const avgAICost = tierAllocations.reduce((sum, ta) => 
      sum + ta.aiCostPerHour * ta.tier.shareOfCognitive, 0);
    if (crossoverYear === null && avgAICost < params.humanWageFloor) {
      crossoverYear = year;
    }
    
    // Track compute sufficiency (can all tiers be fully served?)
    const allTiersServed = tierAllocations.every(ta => ta.bindingConstraint !== 'compute');
    if (computeSufficiencyYear === null && allTiersServed && avgAICost < params.humanWageFloor) {
      computeSufficiencyYear = year;
    }
    
    projections.push({
      year,
      totalComputeFlops,
      effectiveComputeFlops,
      computeCostPerExaflop,
      totalCognitiveWorkHours,
      demandGrowthFromBaseline,
      demandComponents: demandResult.components,
      aiTaskShare,
      humanTaskShare,
      humanWageEquilibrium,
      totalAIHours,
      totalHumanHours,
      tierAllocations,
      averageSubstitutability,
      primaryBindingConstraint,
      computeUtilization,
    });
  }
  
  const targetYearProjection = projections.find(p => p.year === params.year);
  const tierSummary = targetYearProjection?.tierAllocations.map(ta => ({
    tierId: ta.tier.id,
    aiShare: ta.aiShare,
  })) ?? [];
  
  return {
    projections,
    tiers: taskTiers,
    summary: {
      crossoverYear,
      computeSufficiencyYear,
      finalAiShare: targetYearProjection?.aiTaskShare ?? 0,
      finalHumanWage: targetYearProjection?.humanWageEquilibrium ?? params.humanWageFloor,
      tierSummary,
    },
  };
}

/**
 * Format large numbers for display
 */
export function formatLargeNumber(n: number): string {
  if (n >= 1e18) {
    return `${(n / 1e18).toFixed(1)}×10¹⁸`;
  } else if (n >= 1e15) {
    return `${(n / 1e15).toFixed(1)}×10¹⁵`;
  } else if (n >= 1e12) {
    return `${(n / 1e12).toFixed(1)}T`;
  } else if (n >= 1e9) {
    return `${(n / 1e9).toFixed(1)}B`;
  } else if (n >= 1e6) {
    return `${(n / 1e6).toFixed(1)}M`;
  } else if (n >= 1e3) {
    return `${(n / 1e3).toFixed(1)}K`;
  }
  return n.toFixed(1);
}

export function formatFlops(n: number): string {
  const exponent = Math.floor(Math.log10(n));
  const mantissa = n / Math.pow(10, exponent);
  return `${mantissa.toFixed(1)}×10^${exponent}`;
}
