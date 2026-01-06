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
  deploymentLag: number;         // Years between "AI can do it" and "AI is doing it"
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
    deploymentLag: params[`tier_${config.id}_deploymentLag`] ?? config.deploymentLag,
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
  deploymentLag: config.deploymentLag,
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
  labourTightness: number;      // Demand / effective supply ratio
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
 * 
 * The deploymentLag parameter separates "AI can do it" (σ_possible) from "AI is doing it" (σ_effective).
 * σ_effective(year) = σ_possible(year - deploymentLag)
 */
function calculateTierSubstitutability(
  initialSigma: number,
  maxSigma: number,
  midpointYear: number,
  steepness: number,
  currentYear: number,
  deploymentLag: number = 0  // Years between capability and deployment
): number {
  // Apply deployment lag: effective year is earlier than current year
  const effectiveYear = currentYear - deploymentLag;
  
  // Sigmoid function: σ = initial + (max - initial) / (1 + e^(-k(t - midpoint)))
  const range = maxSigma - initialSigma;
  const exponent = -steepness * (effectiveYear - midpointYear);
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
  substitutabilityGrowth: number, // How much has σ multiplier grown from initial
  taskTiers: TaskTier[],
  tierSigmaArray: number[]
): { totalHours: number; tierHours: number[]; components: DemandComponents } {
  
  // 1. Baseline growth from GDP/population (compound growth)
  const baselineMultiplier = Math.pow(1 + baselineDemandGrowth, yearsFromBase);
  
  // 2. AI-induced demand: cheaper AI → more cognitive work gets done
  // If AI is 10x cheaper, and elasticity is 0.5, demand increases by ~3x
  // Use log scale for cost reduction effect
  const costReductionFactor = Math.max(0.01, 1 - aiCostReduction);
  const logCostReduction = Math.log10(1 / costReductionFactor);
  
  // Per-tier induced demand: only tiers where AI can substitute (σ) should get the boost.
  // This avoids showing "AI-induced ×2" in scenarios where AI can't do much work.
  const tierAiInducedMultipliers = taskTiers.map((_, i) => {
    const sigma = tierSigmaArray[i] ?? 0;
    const raw = 1 + demandElasticity * sigma * logCostReduction;
    return Math.max(1, raw);
  });
  
  // 3. New task creation: AI capabilities enable work that wasn't possible before
  // Tied to σ growth - as AI becomes more capable, new use cases emerge
  // Plateaus when σ plateaus (no longer multiplied by years)
  const newTaskMultiplier = 1 + newTaskCreationRate * substitutabilityGrowth;
  
  // Per-tier demand (baseline tier shares are treated as the 2024 starting distribution)
  const tierHours = taskTiers.map((tier, i) => {
    const baseTierHours = baseCognitiveHours * tier.shareOfCognitive;
    return baseTierHours * baselineMultiplier * tierAiInducedMultipliers[i] * newTaskMultiplier;
  });
  
  const totalHours = tierHours.reduce((sum, h) => sum + h, 0);
  const effectiveAiInducedMultiplier = taskTiers.reduce(
    (sum, tier, i) => sum + tier.shareOfCognitive * tierAiInducedMultipliers[i],
    0
  );
  
  return {
    totalHours,
    tierHours,
    components: {
      baseline: baselineMultiplier,
      aiInduced: effectiveAiInducedMultiplier,
      newTasks: newTaskMultiplier,
    },
  };
}

// Constants for compute allocation
const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
const AI_UTILIZATION = 0.3; // Fraction of compute capacity used for cognitive work

/**
 * Skill band represents workers whose MAXIMUM tier capability is a specific tier.
 * 
 * Example: If humanCapable values are Routine=90%, Standard=65%, Complex=35%, Expert=12%, Frontier=3%
 * Then exclusive skill bands are:
 * - Frontier-max: 3% (can work ALL tiers)
 * - Expert-max: 12% - 3% = 9% (can work up to Expert)
 * - Complex-max: 35% - 12% = 23% (can work up to Complex)
 * - Standard-max: 65% - 35% = 30% (can work up to Standard)
 * - Routine-only: 90% - 65% = 25% (can ONLY work Routine)
 * 
 * Workers in higher skill bands have MORE FLEXIBILITY in tier choice.
 * Workers in lower skill bands have FEWER OPTIONS.
 */
interface SkillBand {
  maxTierIndex: number;      // Highest tier index this band can work (0=routine, 4=frontier)
  maxTierName: string;       // Name for display
  fractionOfWorkforce: number; // Exclusive fraction (not cumulative)
  totalHours: number;        // Total hours available from this band
}

/**
 * Calculate exclusive skill bands from cumulative humanCapable values.
 * 
 * humanCapable is interpreted as "% of cognitive workforce that CAN do this tier"
 * (cumulative - anyone who can do Expert can also do Complex, Standard, Routine)
 */
function calculateSkillBands(tiers: TaskTier[], totalWorkforceHours: number): SkillBand[] {
  // Sort tiers by index (routine=0, frontier=4) - ascending order
  const sortedTiers = [...tiers].sort((a, b) => {
    const tierOrder = ['routine', 'standard', 'complex', 'expert', 'frontier'];
    return tierOrder.indexOf(a.id) - tierOrder.indexOf(b.id);
  });
  
  // humanCapable values (cumulative: higher tiers have lower values)
  // e.g., [0.90, 0.65, 0.35, 0.12, 0.03]
  const cumulativeCapable = sortedTiers.map(t => t.humanCapable);
  
  // Convert to exclusive bands (each band = this tier's capable minus next higher tier's capable)
  const bands: SkillBand[] = [];
  
  for (let i = 0; i < sortedTiers.length; i++) {
    const thisTierCapable = cumulativeCapable[i];
    const nextHigherTierCapable = i < sortedTiers.length - 1 ? cumulativeCapable[i + 1] : 0;
    
    // Exclusive fraction = can do this tier but NOT the next higher tier
    const exclusiveFraction = thisTierCapable - nextHigherTierCapable;
    
    if (exclusiveFraction > 0.001) { // Skip negligible bands
      bands.push({
        maxTierIndex: i,
        maxTierName: sortedTiers[i].name,
        fractionOfWorkforce: exclusiveFraction,
        totalHours: totalWorkforceHours * exclusiveFraction,
      });
    }
  }
  
  return bands;
}

/**
 * Equilibrium wage calculation result for a single tier
 */
interface TierEquilibriumResult {
  equilibriumWage: number;      // Final wage after supply/demand equilibrium
  effectiveSupply: number;      // Base capacity + displaced from above
  labourTightness: number;       // Demand / effective supply
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
  actualSupply: number[],        // Actual worker-hours available per tier (from skill-band allocation)
  _aiSharePerTier: number[],     // Kept for API compatibility
  wageFloor: number,
  _mobilityThreshold: number,    // Kept for API compatibility but no longer used
  maxIterations: number = 20
): TierEquilibriumResult[] {
  const n = tiers.length;
  
  // Initialize with base wages (floor × multiplier)
  let wages = tiers.map(t => wageFloor * t.wageMultiplier);
  let effectiveSupply = [...actualSupply];
  let displacedInflow = new Array(n).fill(0);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const prevWages = [...wages];
    
    // NOTE: Displacement/inflow is no longer calculated here.
    // With skill-stratified allocation, "flow down" is already handled during allocation.
    // displacedInflow remains zero.
    displacedInflow = new Array(n).fill(0);
    
    // Effective supply comes from the allocation (actual hours + unemployed workers who could work this tier)
    effectiveSupply = [...actualSupply];
    
    // Calculate labor market tightness and equilibrium wages
    wages = tiers.map((tier, i) => {
      const demand = tierHoursNeeded[i];
      const supply = Math.max(effectiveSupply[i], 1); // Avoid division by zero
      const tightness = demand / supply;
      
      const baseWage = wageFloor * tier.wageMultiplier;
      
      // NEW: Allow wages to go both UP (shortage) and DOWN (surplus)
      // But with bounds: floor at wageFloor, ceiling at taskValue
      let rawWage: number;
      if (tightness >= 1) {
        // Shortage: wages rise with tightness^elasticity
        rawWage = baseWage * Math.pow(tightness, tier.wageElasticity);
      } else {
        // Surplus: wages fall, but more slowly (sticky downward)
        // At tightness=0.5, wage is ~75% of base; at tightness=0, wage is ~50% of base
        // Formula: baseWage × (0.5 + 0.5 × tightness) when tightness < 1
        rawWage = baseWage * (0.5 + 0.5 * tightness);
      }
      
      // Bounds: floor at wageFloor, ceiling at taskValue
      return Math.max(wageFloor, Math.min(rawWage, tier.taskValue));
    });
    
    // Check convergence
    const maxDiff = Math.max(...wages.map((w, i) => Math.abs(w - prevWages[i]) / Math.max(prevWages[i], 1)));
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
      labourTightness: tightness,
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
  actualSupplyPerTier: number[];  // Actual worker-hours available for each tier (for tightness calc)
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
  
  // First pass: record AI allocations
  for (const tv of tierValues) {
    const alloc = allocation.get(tv.tier.id) ?? { aiHours: 0, computeUsed: 0 };
    lpResult[`ai_${tv.tier.id}`] = alloc.aiHours;
  }
  
  // Second pass: allocate humans with SKILL-STRATIFIED capacity constraint
  // Workers can only work in tiers AT OR BELOW their skill level.
  // Higher-skill workers are allocated first (they have more options and go to highest-paying accessible tier).
  
  // Calculate skill bands from humanCapable values
  const skillBands = calculateSkillBands(tiers, totalWorkforceHours);
  
  // Track remaining hours per skill band
  const bandRemainingHours = skillBands.map(b => b.totalHours);
  
  // Track remaining demand per tier
  const tierOrder = ['routine', 'standard', 'complex', 'expert', 'frontier'];
  const tierRemainingDemand: Map<string, number> = new Map();
  for (const tv of tierValues) {
    const alloc = allocation.get(tv.tier.id) ?? { aiHours: 0, computeUsed: 0 };
    tierRemainingDemand.set(tv.tier.id, tv.tierHours - alloc.aiHours);
  }
  
  // Track human allocation per tier
  const humanAllocation: Map<string, number> = new Map();
  for (const tv of tierValues) {
    humanAllocation.set(tv.tier.id, 0);
  }
  
  // Track which tiers hit skill constraints
  const skillConstraintBinding: Set<string> = new Set();
  
  // Sort tiers by wage (highest first)
  const sortedByWage = [...tierValues].sort((a, b) => b.tierWage - a.tierWage);
  
  // Process skill bands from HIGHEST skill to LOWEST
  // Higher-skill workers get first pick of tiers, going to highest-paying tier they can access
  for (let bandIdx = skillBands.length - 1; bandIdx >= 0; bandIdx--) {
    const band = skillBands[bandIdx];
    let bandHoursRemaining = bandRemainingHours[bandIdx];
    
    // This band can work tiers 0 through band.maxTierIndex
    // Iterate through tiers by wage (highest first), allocating this band's workers
    for (const tv of sortedByWage) {
      const tierIdx = tierOrder.indexOf(tv.tier.id);
      
      // Can this skill band work in this tier?
      if (tierIdx > band.maxTierIndex) {
        continue; // This tier requires higher skill than this band has
      }
      
      // How much demand remains in this tier?
      const remainingDemand = tierRemainingDemand.get(tv.tier.id) ?? 0;
      if (remainingDemand <= 0) continue;
      
      // Allocate what we can from this band
      const hoursToAllocate = Math.min(remainingDemand, bandHoursRemaining);
      if (hoursToAllocate > 0) {
        humanAllocation.set(tv.tier.id, (humanAllocation.get(tv.tier.id) ?? 0) + hoursToAllocate);
        tierRemainingDemand.set(tv.tier.id, remainingDemand - hoursToAllocate);
        bandHoursRemaining -= hoursToAllocate;
      }
      
      if (bandHoursRemaining <= 0) break; // This band is exhausted
    }
    
    bandRemainingHours[bandIdx] = bandHoursRemaining;
  }
  
  // Check which tiers are constrained by skill availability
  // A tier is skill-constrained if there's remaining demand but all accessible skill bands are exhausted
  for (const tv of tierValues) {
    const tierIdx = tierOrder.indexOf(tv.tier.id);
    const remainingDemand = tierRemainingDemand.get(tv.tier.id) ?? 0;
    
    if (remainingDemand > 0) {
      // Check if any skill band that could serve this tier has hours left
      const anyBandHasHours = skillBands.some((band, i) => 
        band.maxTierIndex >= tierIdx && bandRemainingHours[i] > 0
      );
      
      if (!anyBandHasHours) {
        skillConstraintBinding.add(tv.tier.id);
      }
    }
  }
  
  // Write human allocations to LP result
  for (const tv of tierValues) {
    lpResult[`human_${tv.tier.id}`] = humanAllocation.get(tv.tier.id) ?? 0;
  }
  
  // Compute ACTUAL SUPPLY for each tier (for proper tightness calculation)
  // Supply = hours actually allocated + unemployed hours from workers who COULD work this tier
  // This gives us realistic tightness: demand / actualSupply
  const actualSupplyPerTier: number[] = tierValues.map((tv) => {
    const actualTierIdx = tierOrder.indexOf(tv.tier.id);
    const hoursAllocated = humanAllocation.get(tv.tier.id) ?? 0;
    
    // Add unemployed hours from skill bands that could work this tier
    // A band can work this tier if band.maxTierIndex >= actualTierIdx
    let unemployedHoursForTier = 0;
    for (let bandIdx = 0; bandIdx < skillBands.length; bandIdx++) {
      const band = skillBands[bandIdx];
      if (band.maxTierIndex >= actualTierIdx) {
        unemployedHoursForTier += bandRemainingHours[bandIdx];
      }
    }
    
    return hoursAllocated + unemployedHoursForTier;
  });
  
  // For backward compatibility, track global constraint binding
  const globalHumanCapacityBinding = skillConstraintBinding;
  
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
    const hitGlobalHumanCap = globalHumanCapacityBinding.has(tv.tier.id);
    
    if (!wouldUseAtProductionCost && almostNoAI) {
      // AI too expensive even at production cost
      bindingConstraint = 'cost';
    } else if (wouldUseAtProductionCost && !isCostEffectiveAtMarket && almostNoAI) {
      // Would use AI at production cost, but scarcity priced it out
      bindingConstraint = 'compute';
    } else if (gotFullSigma) {
      // Got full σ allocation - substitutability is the limit
      bindingConstraint = 'substitutability';
    } else if ((humanCapacityFull || hitGlobalHumanCap) && humanHours > 0) {
      // Human capacity is full (either per-tier or global)
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
      labourTightness: 1.0,
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
    actualSupplyPerTier,
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
    ta.labourTightness = eq.labourTightness;
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
      allocationResult.actualSupplyPerTier,  // Use actual supply from skill-band allocation
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
        finalAllocationResult.actualSupplyPerTier,  // Use actual supply
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
    finalAllocationResult.actualSupplyPerTier,  // Use actual supply
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
    // Each tier has its own midpoint year (breakthrough), steepness, and deployment lag
    // Deployment lag separates "AI can do it" from "AI is doing it"
    const tierSigmaArray = taskTiers.map(tier => 
      calculateTierSubstitutability(
        tier.initialSigma,
        tier.maxSigma,
        tier.sigmaMidpoint,
        tier.sigmaSteepness,
        year,
        tier.deploymentLag
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
      substitutabilityGrowth,
      taskTiers,
      tierSigmaArray
    );
    
    const totalCognitiveWorkHours = demandResult.totalHours;
    const demandGrowthFromBaseline = (totalCognitiveWorkHours / baseCognitiveHours) - 1;
    
    // Calculate hours per tier from per-tier demand multipliers
    const tierHoursArray = demandResult.tierHours;
    
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
