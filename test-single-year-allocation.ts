/**
 * Focused test for market-clearing allocation at a single year
 * Run with: npx tsx test-single-year-allocation.ts
 */

import { getDefaultValues } from './src/models/parameters';

// Re-implement core functions to debug

const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
const AI_UTILIZATION = 0.30;

// Get params for compute constrained scenario
const params = getDefaultValues();
params.baseComputeExponent = 21;
params.computeGrowthRate = 0.3;
params.tier_frontier_flops = 22;
params.year = 2030;

const yearsFromBase = params.year - 2024;

// Manual calculation of key values for 2030
const totalComputeFlops = Math.pow(10, params.baseComputeExponent) * 
  Math.pow(1 + params.computeGrowthRate, yearsFromBase);
const efficiencyMultiplier = Math.pow(params.efficiencyImprovement, yearsFromBase);
const effectiveComputeFlops = totalComputeFlops * efficiencyMultiplier;
const computeCostPerExaflop = Math.pow(10, params.computeCostExponent) * 
  Math.pow(1 - params.costDeclineRate, yearsFromBase);

console.log('=== YEAR 2030 MANUAL CALCULATION ===\n');
console.log('Total Compute:', totalComputeFlops.toExponential(2), 'FLOP/s');
console.log('Efficiency Multiplier:', efficiencyMultiplier.toFixed(2), 'x');
console.log('Effective Compute:', effectiveComputeFlops.toExponential(2), 'FLOP/s');
console.log('Cost per ExaFLOP:', '$' + computeCostPerExaflop.toFixed(4));
console.log('');

// Per-tier calculations
const tiers = [
  { id: 'routine', flops: 12, wage: 1, sigma: 0.95, taskValue: 30 },
  { id: 'standard', flops: 14, wage: 1.7, sigma: 0.80, taskValue: 60 },
  { id: 'complex', flops: 16, wage: 5, sigma: 0.65, taskValue: 150 },
  { id: 'expert', flops: 18, wage: 20, sigma: 0.50, taskValue: 400 },
  { id: 'frontier', flops: 22, wage: 50, sigma: 0.30, taskValue: 1000 },  // Frontier FLOPs = 22
];

const humanWageFloor = params.humanWageFloor;
const productionCostPerFLOP = computeCostPerExaflop / 1e18;

console.log('Production cost per FLOP:', productionCostPerFLOP.toExponential(2));
console.log('Human wage floor:', '$' + humanWageFloor);
console.log('');

console.log('=== PER-TIER ANALYSIS ===\n');
console.log('Tier       | FLOPs/hr (eff) | Prod $/hr | Human Wage | TaskValue | AI Profit | Human Profit');
console.log('-----------|----------------|-----------|------------|-----------|-----------|-------------');

for (const tier of tiers) {
  const rawFlopsPerHr = Math.pow(10, tier.flops);
  const effectiveFlopsPerHr = rawFlopsPerHr / efficiencyMultiplier;
  const productionCostPerHr = productionCostPerFLOP * effectiveFlopsPerHr;
  const humanWage = humanWageFloor * tier.wage;
  const taskValue = tier.taskValue;
  
  const aiProfit = taskValue - productionCostPerHr;
  const humanProfit = taskValue - humanWage;
  
  console.log(
    `${tier.id.padEnd(10)} | ${effectiveFlopsPerHr.toExponential(2).padStart(14)} | $${productionCostPerHr.toFixed(2).padStart(8)} | $${humanWage.toFixed(2).padStart(9)} | $${taskValue.toString().padStart(8)} | $${aiProfit.toFixed(2).padStart(8)} | $${humanProfit.toFixed(2).padStart(10)}`
  );
}

console.log('');
console.log('=== KEY INSIGHT ===');
console.log('');

// Calculate what the clearing price should be if compute is exhausted
const baseCognitiveHours = 2.37e12; // ~2.37 trillion cognitive work hours globally
const frontierShare = 0.03; // 3% of work is frontier
const frontierDemandHours = baseCognitiveHours * frontierShare * 1.5; // ~1.5x growth by 2030

const frontierEffectiveFlops = Math.pow(10, 22) / efficiencyMultiplier;
const frontierComputeNeeded = frontierDemandHours * frontierEffectiveFlops * 0.30; // 30% sigma

const totalAvailableComputeFLOPs = effectiveComputeFlops * SECONDS_PER_YEAR * AI_UTILIZATION;

console.log('Total available compute (FLOPs/year):', totalAvailableComputeFLOPs.toExponential(2));
console.log('Frontier demand hours:', frontierDemandHours.toExponential(2));
console.log('Frontier FLOPs/hr (effective):', frontierEffectiveFlops.toExponential(2));
console.log('Frontier max AI compute needed:', frontierComputeNeeded.toExponential(2));
console.log('');

// If market price rises to make AI unprofitable for high-cost tiers
const frontierTaskValue = 1000;
const frontierMaxPrice = frontierTaskValue / frontierEffectiveFlops;
console.log('Frontier max willingness to pay per FLOP:', '$' + frontierMaxPrice.toExponential(2));
console.log('Production cost per FLOP:', '$' + productionCostPerFLOP.toExponential(2));
console.log('');

if (frontierMaxPrice > productionCostPerFLOP) {
  console.log('✓ Frontier CAN afford AI at production cost');
  console.log('  At production cost, frontier AI = $' + (productionCostPerFLOP * frontierEffectiveFlops).toFixed(2) + '/hr');
} else {
  console.log('✗ Frontier CANNOT afford AI at production cost');
}

// What if market price = 10x production?
const scarcityPrice = productionCostPerFLOP * 10;
const frontierAtScarcity = scarcityPrice * frontierEffectiveFlops;
console.log('');
console.log('If compute is 10x scarce:');
console.log('  Market price per FLOP:', '$' + scarcityPrice.toExponential(2));
console.log('  Frontier AI cost:', '$' + frontierAtScarcity.toFixed(2) + '/hr');
console.log('  Frontier human wage:', '$' + (humanWageFloor * 50) + '/hr');
console.log('  Would use AI?', frontierAtScarcity < humanWageFloor * 50 ? 'YES' : 'NO');

