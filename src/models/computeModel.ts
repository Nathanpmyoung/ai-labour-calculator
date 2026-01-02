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
 * Legacy result type (originally from javascript-lp-solver).
 * 
 * The current allocation uses a market-clearing auction, not an LP solver.
 * We keep this type for compatibility with downstream code that reads allocation results.
 */
interface LPResult {
  feasible: boolean;
  result: number;
  bounded: boolean;
  [key: string]: number | boolean;
}

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
  sigmaMidpoint: number;         // Year when σ reaches halfway (the "breakthrough" year)
  sigmaSteepness: number;        // How rapid the transition (1=gradual, 3=sharp)
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
    sigmaMidpoint: params[`tier_${config.id}_sigmaMidpoint`] ?? config.sigmaMidpoint,
    sigmaSteepness: params[`tier_${config.id}_sigmaSteepness`] ?? config.sigmaSteepness,
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
  sigmaMidpoint: config.sigmaMidpoint,
  sigmaSteepness: config.sigmaSteepness,
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
  aiCostPerHour: number;       // MARKET cost for AI to do 1 hour (includes scarcity premium)
  productionCostPerHour: number; // BASE cost (hardware/energy only, no scarcity)
  aiShare: number;             // Fraction of this tier done by AI
  humanShare: number;          // Fraction done by humans
  effectiveSubstitutability: number; // σ for this tier this year
  bindingConstraint: 'cost' | 'compute' | 'substitutability' | 'humanCapacity';
  hoursAI: number;             // Total hours done by AI
  hoursHuman: number;          // Total hours done by humans
  hoursUnmet: number;          // Demanded hours that couldn't be supplied (humans capped, AI too expensive)
  computeUsed: number;         // FLOPs used for this tier
  tierWage: number;            // Equilibrium wage for this tier ($/hr)
  humanCapacityHours: number;  // Max hours humans can supply for this tier (base capacity)
  reservationPrice: number;    // Max $/FLOP this tier would pay (willingness to pay)
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
  };
  
  // Aggregated metrics
  aiTaskShare: number;               // Overall fraction of cognitive tasks done by AI
  humanTaskShare: number;            // Overall fraction done by humans
  unmetTaskShare: number;            // Fraction of demand that couldn't be met
  humanWageEquilibrium: number;      // Weighted equilibrium wage for humans
  totalAIHours: number;              // Absolute hours done by AI
  totalHumanHours: number;           // Absolute hours done by humans
  totalUnmetHours: number;           // Hours demanded but not supplied (humans capped, AI too expensive)
  
  // Per-tier breakdown
  tierAllocations: TierAllocation[];
  
  // Average substitutability across tiers (weighted by share)
  averageSubstitutability: number;
  
  // Constraint analysis
  primaryBindingConstraint: 'cost' | 'compute' | 'substitutability' | 'humanCapacity';
  computeUtilization: number;        // What % of available compute is used
  
  // Market pricing
  productionCostPerFLOP: number;     // Base cost (hardware/energy)
  marketPricePerFLOP: number;        // Market clearing price (>= production cost)
  scarcityPremium: number;           // marketPrice / productionCost ratio (1.0 = no premium)
  clearingTier: string | null;       // Which tier set the clearing price (null if compute abundant)
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
 * Calculate time-varying substitutability for a tier using S-curve (sigmoid) growth
 * 
 * This models AI capability breakthroughs more realistically than exponential decay:
 * - Slow start: AI hasn't figured out this tier yet
 * - Rapid middle: breakthrough → adoption  
 * - Plateau: physical/social limits reached
 * 
 * Formula: σ(year) = initial + (max - initial) / (1 + e^(-steepness × (year - midpoint)))
 */
function calculateTierSubstitutability(
  initialSigma: number,
  maxSigma: number,
  midpointYear: number,
  steepness: number,
  currentYear: number
): number {
  // Sigmoid function: σ = initial + (max - initial) / (1 + e^(-k(t - midpoint)))
  const range = maxSigma - initialSigma;
  const exponent = -steepness * (currentYear - midpointYear);
  const sigma = initialSigma + range / (1 + Math.exp(exponent));
  
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
 */
interface DemandComponents {
  baseline: number;       // Multiplier from GDP/population growth
  aiInduced: number;      // Multiplier from AI cost reduction
  newTasks: number;       // Multiplier from new task creation
}

function calculateCognitiveWorkDemand(
  baseCognitiveHours: number,    // Base cognitive work hours (from getBaseCognitiveWorkHours)
  yearsFromBase: number,
  baselineDemandGrowth: number,
  demandElasticity: number,
  newTaskCreationRate: number,
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
  
  // Total cognitive work demand
  const totalHours = baseCognitiveHours * 
    baselineMultiplier * 
    Math.max(1, aiInducedMultiplier) * 
    newTaskMultiplier;
  
  return {
    totalHours,
    components: {
      baseline: baselineMultiplier,
      aiInduced: Math.max(1, aiInducedMultiplier),
      newTasks: newTaskMultiplier,
    },
  };
}

// Constants for compute allocation
const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
const AI_UTILIZATION = 0.3; // Fraction of compute capacity used for cognitive work

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
  tierWage: number;            // Wage for this tier (can be overridden during equilibrium solving)
  productionCostPerHour: number; // Base AI cost (hardware/energy only)
  flopsPerHour: number;        // After efficiency adjustment
  valuePerFlop: number;        // = tierWage / flopsPerHour
  reservationPricePerFLOP: number; // Max $/FLOP willing to pay = min(tierWage, taskValue) / flopsPerHour
  effectiveSigma: number;      // Effective substitutability for this tier
  tierHours: number;           // Total hours of work in this tier
  maxAIHours: number;          // Limited by substitutability
  maxComputeNeeded: number;    // FLOPs to max out this tier
  humanCapacityHours: number;  // Max hours humans can supply for this tier
}

interface AllocationResult {
  allocations: TierAllocation[];
  marketPricePerFLOP: number;     // Clearing price (scarcity-adjusted)
  productionCostPerFLOP: number;  // Base hardware cost
  scarcityPremium: number;        // market / production ratio
  clearingTier: string | null;    // Which tier set the price
}

/**
 * Clear the compute market (uniform-price auction) to allocate scarce compute across tiers.
 *
 * Each tier bids a reservation price per FLOP based on max willingness to pay per hour
 * (min(wage, taskValue)) divided by FLOPs/hour. Tiers are served from highest bid to lowest
 * up to their σ limit; the marginal tier sets the market-clearing price.
 *
 * In `runModel`, we optionally pass equilibrium wages so compute bids reflect labor scarcity.
 */
function allocateComputeOptimally(
  tiers: TaskTier[],
  tierHoursArray: number[],
  tierSigmaArray: number[],     // Per-tier effective σ for this year
  efficiencyMultiplier: number,
  totalComputeBudget: number,   // Total FLOP/s available
  costPerExaflop: number,
  humanWageFloor: number,
  totalWorkforceHours: number,  // Total human cognitive work hours available
  tierWages?: number[]          // Optional override wages for reservation bids (length must match tiers)
): AllocationResult {
  // Base production cost per FLOP (hardware/energy only)
  const productionCostPerFLOP = costPerExaflop / 1e18;
  
  // 1. Calculate tier info needed for market clearing
  const tierValues: TierValueInfo[] = tiers.map((tier, i) => {
    const wageOverride = tierWages && tierWages.length === tiers.length ? tierWages[i] : undefined;
    const tierWage = wageOverride ?? (humanWageFloor * tier.wageMultiplier);
    const effectiveFlopsPerHour = Math.pow(10, tier.flopsPerHourExponent) / efficiencyMultiplier;
    const productionCostPerHour = productionCostPerFLOP * effectiveFlopsPerHour;
    const effectiveSigma = tierSigmaArray[i];
    const tierHours = tierHoursArray[i];
    const maxAIHours = tierHours * effectiveSigma;
    const maxComputeNeeded = maxAIHours * effectiveFlopsPerHour;
    const humanCapacityHours = totalWorkforceHours * tier.humanCapable;
    const maxPayPerHour = Math.min(tierWage, tier.taskValue);
    const reservationPricePerFLOP = maxPayPerHour / effectiveFlopsPerHour;
    const valuePerFlop = tierWage / effectiveFlopsPerHour;
    
    return {
      tier, tierIndex: i, tierWage, productionCostPerHour, flopsPerHour: effectiveFlopsPerHour,
      valuePerFlop, reservationPricePerFLOP, effectiveSigma, tierHours, maxAIHours,
      maxComputeNeeded, humanCapacityHours,
    };
  });
  
  // 2. Total compute available (FLOPs per year for cognitive work)
  const totalAvailableCompute = totalComputeBudget * SECONDS_PER_YEAR * AI_UTILIZATION;
  
  // 3. GREEDY ALLOCATION BY RESERVATION PRICE
  // In a market with scarce compute, allocation goes to the highest bidders first.
  // The clearing price is set by the marginal buyer (last tier to get allocation).
  
  // Sort tiers by reservation price (willing to pay per FLOP), highest first
  const sortedByReservation = [...tierValues].sort((a, b) => b.reservationPricePerFLOP - a.reservationPricePerFLOP);
  
  // Greedy allocation: fill each tier up to its σ limit before moving to the next
  let remainingCompute = totalAvailableCompute;
  const allocation: Map<string, { aiHours: number; computeUsed: number }> = new Map();
  let clearingTier: string | null = null;
  let marketPricePerFLOP = productionCostPerFLOP;
  
  for (const tv of sortedByReservation) {
    // How much compute does this tier need for its full σ allocation?
    const computeNeeded = tv.maxAIHours * tv.flopsPerHour;
    
    // How much can we actually give them?
    const computeToAllocate = Math.min(computeNeeded, remainingCompute);
    const aiHours = computeToAllocate / tv.flopsPerHour;
    
    allocation.set(tv.tier.id, { aiHours, computeUsed: computeToAllocate });
    remainingCompute -= computeToAllocate;
    
    // If this tier got ANY allocation, they're (potentially) the marginal buyer
    if (aiHours > 0.01 * tv.maxAIHours) { // Got at least 1% of what they wanted
      clearingTier = tv.tier.id;
      // Clearing price = this tier's reservation (everyone pays this)
      marketPricePerFLOP = tv.reservationPricePerFLOP;
    }
    
    if (remainingCompute < 1e15) { // Essentially no compute left
      break;
    }
  }
  
  // Build a legacy LP-shaped result object for compatibility with the rest of the code
  const lpResult: LPResult = { feasible: true, bounded: true, result: 0 };
  for (const tv of tierValues) {
    const alloc = allocation.get(tv.tier.id) ?? { aiHours: 0, computeUsed: 0 };
    lpResult[`ai_${tv.tier.id}`] = alloc.aiHours;
    // Humans fill remaining demand up to capacity
    const remainingDemand = tv.tierHours - alloc.aiHours;
    lpResult[`human_${tv.tier.id}`] = Math.min(remainingDemand, tv.humanCapacityHours);
  }
  
  // Market price is the clearing tier's reservation price
  // If compute is abundant (all tiers served), use production cost
  const finalMarketPricePerFLOP = remainingCompute > 0.1 * totalAvailableCompute 
    ? productionCostPerFLOP 
    : marketPricePerFLOP;
  
  // 4. Extract solution and build allocations
  const scarcityPremium = finalMarketPricePerFLOP / productionCostPerFLOP;
  
  const finalAllocations: TierAllocation[] = tierValues.map(tv => {
    const aiKey = `ai_${tv.tier.id}`;
    const humanKey = `human_${tv.tier.id}`;
    const aiHours = (lpResult?.[aiKey] ?? 0) as number;
    const humanHours = (lpResult?.[humanKey] ?? 0) as number;
    const totalDone = aiHours + humanHours;
    const unmetHours = Math.max(0, tv.tierHours - totalDone);
    
    const aiShare = totalDone > 0 ? aiHours / totalDone : 0;
    const humanShare = totalDone > 0 ? humanHours / totalDone : 0;
    const computeUsed = aiHours * tv.flopsPerHour;
    
    // Determine binding constraint
    // Note: We compare against PRODUCTION cost to determine if AI would be cost-effective
    // without scarcity. If production cost is low but market cost is high, compute is the constraint.
    let bindingConstraint: 'cost' | 'compute' | 'substitutability' | 'humanCapacity';
    const aiCostPerHour = finalMarketPricePerFLOP * tv.flopsPerHour;
    const aiProductionCost = tv.productionCostPerHour;
    
    // Would this tier use AI at PRODUCTION cost? (ignoring scarcity)
    const wouldUseAtProductionCost = aiProductionCost < Math.min(tv.tierWage, tv.tier.taskValue);
    // Is AI cost-effective at MARKET price?
    const isCostEffectiveAtMarket = aiCostPerHour < Math.min(tv.tierWage, tv.tier.taskValue);
    
    const gotFullSigma = Math.abs(aiHours - tv.maxAIHours) < 0.01 * tv.maxAIHours;
    const humanCapacityFull = Math.abs(humanHours - tv.humanCapacityHours) < 0.01 * tv.humanCapacityHours;
    const almostNoAI = aiHours < 0.05 * tv.maxAIHours;
    
    if (!wouldUseAtProductionCost && almostNoAI) {
      // AI too expensive even at production cost
      bindingConstraint = 'cost';
    } else if (wouldUseAtProductionCost && !isCostEffectiveAtMarket && almostNoAI) {
      // Would use AI at production cost, but scarcity priced it out
      bindingConstraint = 'compute';
    } else if (gotFullSigma) {
      // Got full σ allocation - substitutability is the limit
      bindingConstraint = 'substitutability';
    } else if (humanCapacityFull && humanHours > 0) {
      // Human capacity is full
      bindingConstraint = 'humanCapacity';
    } else if (scarcityPremium > 1.5 && almostNoAI) {
      // High scarcity but didn't get AI - compute is scarce
      bindingConstraint = 'compute';
    } else {
      bindingConstraint = 'substitutability';
    }
    
    return {
      tier: tv.tier,
      aiCostPerHour: finalMarketPricePerFLOP * tv.flopsPerHour,
      productionCostPerHour: tv.productionCostPerHour,
      aiShare: Math.max(0, Math.min(1, aiShare)),
      humanShare: Math.max(0, Math.min(1, humanShare)),
      effectiveSubstitutability: tv.effectiveSigma,
      bindingConstraint,
      hoursAI: aiHours,
      hoursHuman: humanHours,
      hoursUnmet: unmetHours,
      computeUsed: computeUsed / SECONDS_PER_YEAR,
      tierWage: tv.tierWage,
      humanCapacityHours: tv.humanCapacityHours,
      reservationPrice: tv.reservationPricePerFLOP,
      effectiveSupply: tv.humanCapacityHours,
      laborTightness: 1.0,
      displacedInflow: 0,
      wageAtCeiling: false,
    };
  });
  
  return {
    allocations: finalAllocations,
    marketPricePerFLOP: finalMarketPricePerFLOP,
    productionCostPerFLOP,
    scarcityPremium,
    clearingTier,
  };
}

function applyEquilibriumToAllocations(
  allocationResult: AllocationResult,
  tierHoursArray: number[],
  efficiencyMultiplier: number,
  equilibriumResults: TierEquilibriumResult[]
): void {
  allocationResult.allocations.forEach((ta, i) => {
    const eq = equilibriumResults[i];
    if (!eq) return;

    // Update equilibrium wage diagnostics
    ta.tierWage = eq.equilibriumWage;
    ta.effectiveSupply = eq.effectiveSupply;
    ta.laborTightness = eq.laborTightness;
    ta.displacedInflow = eq.displacedInflow;
    ta.wageAtCeiling = eq.wageAtCeiling;

    // Recompute reservation price using equilibrium wage
    const effectiveFlopsPerHour = Math.pow(10, ta.tier.flopsPerHourExponent) / efficiencyMultiplier;
    const maxPayPerHour = Math.min(ta.tierWage, ta.tier.taskValue);
    ta.reservationPrice = maxPayPerHour / effectiveFlopsPerHour;

    // Keep market AI cost consistent with clearing price
    ta.aiCostPerHour = allocationResult.marketPricePerFLOP * effectiveFlopsPerHour;

    // Re-evaluate binding constraint using equilibrium wage (not base wage)
    const tierHours = tierHoursArray[i] ?? 0;
    const maxAIHours = tierHours * ta.effectiveSubstitutability;
    const aiProductionCost = ta.productionCostPerHour;

    const wouldUseAtProductionCost = aiProductionCost < maxPayPerHour;
    const isCostEffectiveAtMarket = ta.aiCostPerHour < maxPayPerHour;

    const gotFullSigma = maxAIHours > 0
      ? Math.abs(ta.hoursAI - maxAIHours) < 0.01 * maxAIHours
      : ta.hoursAI === 0;
    const humanCapacityFull = ta.humanCapacityHours > 0
      ? Math.abs(ta.hoursHuman - ta.humanCapacityHours) < 0.01 * ta.humanCapacityHours
      : ta.hoursHuman === 0;
    const almostNoAI = maxAIHours > 0 ? ta.hoursAI < 0.05 * maxAIHours : ta.hoursAI === 0;

    if (!wouldUseAtProductionCost && almostNoAI) {
      ta.bindingConstraint = 'cost';
    } else if (wouldUseAtProductionCost && !isCostEffectiveAtMarket && almostNoAI) {
      ta.bindingConstraint = 'compute';
    } else if (gotFullSigma) {
      ta.bindingConstraint = 'substitutability';
    } else if (humanCapacityFull && ta.hoursHuman > 0) {
      ta.bindingConstraint = 'humanCapacity';
    } else if (allocationResult.scarcityPremium > 1.5 && almostNoAI) {
      ta.bindingConstraint = 'compute';
    } else {
      ta.bindingConstraint = 'substitutability';
    }
  });
}

function solveYearJointEquilibrium(
  tiers: TaskTier[],
  tierHoursArray: number[],
  tierSigmaArray: number[],
  efficiencyMultiplier: number,
  totalComputeBudget: number,   // Total FLOP/s available
  costPerExaflop: number,
  humanWageFloor: number,
  totalWorkforceHours: number,  // Fixed human workforce capacity (base 2024 hours)
  mobilityThreshold: number,
  maxIterations: number = 20,
  wageTolerance: number = 0.01
): AllocationResult {
  const baseCapacity = tiers.map(t => totalWorkforceHours * t.humanCapable);

  // Initialize with base wages (floor × multiplier)
  let wages = tiers.map(t => humanWageFloor * t.wageMultiplier);

  // Damped updates help avoid oscillations in the wage/allocation fixed point
  const dampingNewWeight = 0.3; // 0.7 old + 0.3 new

  for (let iter = 0; iter < maxIterations; iter++) {
    const allocationResult = allocateComputeOptimally(
      tiers,
      tierHoursArray,
      tierSigmaArray,
      efficiencyMultiplier,
      totalComputeBudget,
      costPerExaflop,
      humanWageFloor,
      totalWorkforceHours,
      wages
    );

    const tierAllocations = allocationResult.allocations;
    const tierHoursNeeded = tierAllocations.map(ta => ta.hoursHuman + ta.hoursUnmet);
    const aiSharePerTier = tierAllocations.map(ta => ta.aiShare);

    const equilibriumResults = calculateEquilibriumWages(
      tiers,
      tierHoursNeeded,
      baseCapacity,
      aiSharePerTier,
      humanWageFloor,
      mobilityThreshold
    );

    const eqWages = equilibriumResults.map(eq => eq.equilibriumWage);
    const maxRelDiff = Math.max(
      ...eqWages.map((w, i) => {
        const denom = Math.max(Math.abs(wages[i]), 1);
        return Math.abs(w - wages[i]) / denom;
      })
    );

    if (maxRelDiff < wageTolerance) {
      // Snap to equilibrium wages and do one final consistency pass so bids/prices use the converged wages
      wages = eqWages;

      const finalAllocationResult = allocateComputeOptimally(
        tiers,
        tierHoursArray,
        tierSigmaArray,
        efficiencyMultiplier,
        totalComputeBudget,
        costPerExaflop,
        humanWageFloor,
        totalWorkforceHours,
        wages
      );

      const finalTierAllocations = finalAllocationResult.allocations;
      const finalTierHoursNeeded = finalTierAllocations.map(ta => ta.hoursHuman + ta.hoursUnmet);
      const finalAiSharePerTier = finalTierAllocations.map(ta => ta.aiShare);

      const finalEquilibriumResults = calculateEquilibriumWages(
        tiers,
        finalTierHoursNeeded,
        baseCapacity,
        finalAiSharePerTier,
        humanWageFloor,
        mobilityThreshold
      );

      applyEquilibriumToAllocations(
        finalAllocationResult,
        tierHoursArray,
        efficiencyMultiplier,
        finalEquilibriumResults
      );

      return finalAllocationResult;
    }

    // Damped wage update toward equilibrium
    wages = wages.map((w, i) => (1 - dampingNewWeight) * w + dampingNewWeight * eqWages[i]);
  }

  // Best-effort final pass (no convergence reached)
  const finalAllocationResult = allocateComputeOptimally(
    tiers,
    tierHoursArray,
    tierSigmaArray,
    efficiencyMultiplier,
    totalComputeBudget,
    costPerExaflop,
    humanWageFloor,
    totalWorkforceHours,
    wages
  );

  const finalTierAllocations = finalAllocationResult.allocations;
  const finalTierHoursNeeded = finalTierAllocations.map(ta => ta.hoursHuman + ta.hoursUnmet);
  const finalAiSharePerTier = finalTierAllocations.map(ta => ta.aiShare);

  const finalEquilibriumResults = calculateEquilibriumWages(
    tiers,
    finalTierHoursNeeded,
    baseCapacity,
    finalAiSharePerTier,
    humanWageFloor,
    mobilityThreshold
  );

  applyEquilibriumToAllocations(
    finalAllocationResult,
    tierHoursArray,
    efficiencyMultiplier,
    finalEquilibriumResults
  );

  return finalAllocationResult;
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
    
    // Calculate per-tier substitutability for this year (S-curve model)
    // Each tier has its own midpoint year (breakthrough) and steepness
    const tierSigmaArray = taskTiers.map(tier => 
      calculateTierSubstitutability(
        tier.initialSigma,
        tier.maxSigma,
        tier.sigmaMidpoint,
        tier.sigmaSteepness,
        year
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
      effectiveCostReduction,
      substitutabilityGrowth
    );
    
    const totalCognitiveWorkHours = demandResult.totalHours;
    const demandGrowthFromBaseline = (totalCognitiveWorkHours / baseCognitiveHours) - 1;
    
    // Calculate hours per tier based on total demand and tier shares
    const tierHoursArray = taskTiers.map(tier => 
      totalCognitiveWorkHours * tier.shareOfCognitive
    );
    
    // Jointly clear compute and labor markets: wages affect compute bids, and AI allocation affects wages.
    const mobilityThreshold = params.mobilityThreshold ?? 0.8;
    const allocationResult = solveYearJointEquilibrium(
      taskTiers,
      tierHoursArray,
      tierSigmaArray,
      efficiencyMultiplier,
      effectiveComputeFlops,
      computeCostPerExaflop,
      params.humanWageFloor,
      baseCognitiveHours, // Fixed workforce, not demand
      mobilityThreshold
    );
    const tierAllocations = allocationResult.allocations;
    const { marketPricePerFLOP, productionCostPerFLOP, scarcityPremium, clearingTier } = allocationResult;
    
    // Calculate aggregate metrics
    const totalAIHours = tierAllocations.reduce((sum, ta) => sum + ta.hoursAI, 0);
    const totalHumanHours = tierAllocations.reduce((sum, ta) => sum + ta.hoursHuman, 0);
    const totalUnmetHours = tierAllocations.reduce((sum, ta) => sum + ta.hoursUnmet, 0);
    const aiTaskShare = totalAIHours / totalCognitiveWorkHours;
    const humanTaskShare = totalHumanHours / totalCognitiveWorkHours;
    const unmetTaskShare = totalUnmetHours / totalCognitiveWorkHours;
    
    // Calculate average human wage (weighted by hours worked in each tier) using equilibrium wages
    const totalTierHumanHours = tierAllocations.reduce((sum, ta) => sum + ta.hoursHuman, 0);
    const humanWageEquilibrium = totalTierHumanHours > 0 
      ? tierAllocations.reduce((sum, ta) => sum + ta.tierWage * ta.hoursHuman, 0) / totalTierHumanHours
      : params.humanWageFloor;
    
    // Compute utilization (relative to compute available for cognitive work, not total compute)
    // Note: computeUsed is in FLOP/s, so multiply by SECONDS_PER_YEAR to get FLOPs/year
    const totalComputeUsedFLOPs = tierAllocations.reduce((sum, ta) => sum + ta.computeUsed, 0) * SECONDS_PER_YEAR;
    const cognitiveComputeBudget = effectiveComputeFlops * SECONDS_PER_YEAR * AI_UTILIZATION;
    const computeUtilization = Math.min(1, totalComputeUsedFLOPs / cognitiveComputeBudget);
    
    // Determine primary binding constraint with smarter logic:
    // If compute is >95% utilized OR any tier is compute-bound with near-zero AI, compute is primary
    const anyTierComputeStarved = tierAllocations.some(ta => 
      ta.bindingConstraint === 'compute' && ta.aiShare < 0.05
    );
    
    let primaryBindingConstraint: 'cost' | 'compute' | 'substitutability' | 'humanCapacity';
    if (computeUtilization > 0.95 || anyTierComputeStarved) {
      primaryBindingConstraint = 'compute';
    } else {
      // Fall back to weighted counting
      const constraintCounts: Record<string, number> = { cost: 0, compute: 0, substitutability: 0, humanCapacity: 0 };
      tierAllocations.forEach(ta => {
        constraintCounts[ta.bindingConstraint] += ta.tier.shareOfCognitive;
      });
      primaryBindingConstraint = Object.entries(constraintCounts)
        .sort((a, b) => b[1] - a[1])[0][0] as 'cost' | 'compute' | 'substitutability' | 'humanCapacity';
    }
    
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
      unmetTaskShare,
      humanWageEquilibrium,
      totalAIHours,
      totalHumanHours,
      totalUnmetHours,
      tierAllocations,
      averageSubstitutability,
      primaryBindingConstraint,
      computeUtilization,
      // Market pricing
      productionCostPerFLOP,
      marketPricePerFLOP,
      scarcityPremium,
      clearingTier,
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
