/**
 * Deep debug of market-clearing allocation
 */

import { getDefaultValues } from './src/models/parameters';

// Manually calculate what the LP should see for year 2030

const params = getDefaultValues();
params.tier_routine_flops = 17;
params.tier_standard_flops = 19;
params.tier_complex_flops = 21;
params.tier_expert_flops = 23;
params.tier_frontier_flops = 22;
params.computeGrowthRate = 0.5;
params.computeGrowthDecay = 0.08;

const yearsFromBase = 6; // 2030 - 2024

// Calculate efficiency multiplier (2x per year default)
const efficiencyMultiplier = Math.pow(params.efficiencyImprovement, yearsFromBase);
console.log('Efficiency multiplier:', efficiencyMultiplier.toFixed(2));

// Frontier tier values
const frontierFlops = Math.pow(10, 22);
const frontierEffectiveFlops = frontierFlops / efficiencyMultiplier;
console.log('Frontier effective FLOPs/hr:', frontierEffectiveFlops.toExponential(2));

// Frontier sigma for year 2030
const initialSigma = 0.0;  // From user's screenshot
const maxSigma = 0.8;
const halfLife = 6;
const progress = 1 - Math.pow(0.5, yearsFromBase / halfLife);
const frontierSigma = initialSigma + (maxSigma - initialSigma) * progress;
console.log('Frontier σ for 2030:', frontierSigma.toFixed(2));

// Total cognitive work demand
const baseCognitiveHours = 2.37e12;
const demandGrowth = 1.5; // Approximate for 2030 with demand elasticity
const totalDemand = baseCognitiveHours * demandGrowth;
console.log('Total cognitive demand:', totalDemand.toExponential(2), 'hours');

// Frontier's share = 3%
const frontierShare = 0.03;
const frontierDemand = totalDemand * frontierShare;
console.log('Frontier demand:', frontierDemand.toExponential(2), 'hours');

// Max AI hours for Frontier = σ × demand
const frontierMaxAI = frontierDemand * frontierSigma;
console.log('Frontier max AI hours (σ limit):', frontierMaxAI.toExponential(2), 'hours');

// Compute budget
const baseCompute = Math.pow(10, params.baseComputeExponent);
let totalCompute = baseCompute;
for (let y = 0; y < yearsFromBase; y++) {
  const effectiveRate = params.computeGrowthRate * Math.pow(1 - params.computeGrowthDecay, y);
  totalCompute *= (1 + effectiveRate);
}
const effectiveCompute = totalCompute * efficiencyMultiplier;
const AI_UTILIZATION = 0.30;
const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
const computeBudgetFLOPs = effectiveCompute * SECONDS_PER_YEAR * AI_UTILIZATION;
console.log('Compute budget (FLOPs/year):', computeBudgetFLOPs.toExponential(2));

// Frontier compute needed for max AI
const frontierComputeNeeded = frontierMaxAI * frontierEffectiveFlops;
console.log('Frontier compute needed for max AI:', frontierComputeNeeded.toExponential(2));

// Cost per ExaFLOP
let computeCost = Math.pow(10, params.computeCostExponent);
for (let y = 0; y < yearsFromBase; y++) {
  computeCost *= (1 - params.costDeclineRate);
}
const costPerFLOP = computeCost / 1e18;
console.log('Production cost per FLOP:', costPerFLOP.toExponential(2));

// Frontier AI cost at production
const frontierAICost = costPerFLOP * frontierEffectiveFlops;
console.log('Frontier AI cost/hr (production):', '$' + frontierAICost.toFixed(2));

// Frontier task value
const frontierTaskValue = 1000;
console.log('Frontier task value:', '$' + frontierTaskValue);

// Frontier AI profit
const frontierProfit = frontierTaskValue - frontierAICost;
console.log('Frontier AI profit:', '$' + frontierProfit.toFixed(2));

console.log('\n=== DIAGNOSIS ===');
if (frontierSigma === 0) {
  console.log('❌ Frontier σ = 0, NO AI can be allocated (σ constraint)');
} else if (frontierMaxAI <= 0) {
  console.log('❌ Frontier max AI hours = 0');
} else if (frontierProfit <= 0) {
  console.log('❌ Frontier AI not profitable');
} else if (frontierComputeNeeded > computeBudgetFLOPs) {
  console.log('⚠️ Frontier alone would exceed compute budget');
  console.log('  But should still get SOME allocation...');
} else {
  console.log('✓ Frontier SHOULD get AI allocation');
  console.log('  - σ allows up to', (frontierSigma * 100).toFixed(0) + '% AI');
  console.log('  - AI profit is $' + frontierProfit.toFixed(2) + '/hr');
  console.log('  - Compute need is', (frontierComputeNeeded / computeBudgetFLOPs * 100).toFixed(1) + '% of budget');
}

// Check other tiers
console.log('\n=== OTHER TIERS COMPUTE USAGE ===');
const tiers = [
  { name: 'Routine', flops: 17, share: 0.35, sigma: 0.77 },  // Approximate sigma for 2030
  { name: 'Standard', flops: 19, share: 0.25, sigma: 0.67 },
  { name: 'Complex', flops: 21, share: 0.25, sigma: 0.56 },
  { name: 'Expert', flops: 23, share: 0.12, sigma: 0.45 },
  { name: 'Frontier', flops: 22, share: 0.03, sigma: frontierSigma },
];

let totalComputeUsed = 0;
for (const tier of tiers) {
  const tierDemand = totalDemand * tier.share;
  const tierAIHours = tierDemand * tier.sigma;
  const tierEffectiveFlops = Math.pow(10, tier.flops) / efficiencyMultiplier;
  const tierComputeUsed = tierAIHours * tierEffectiveFlops;
  totalComputeUsed += tierComputeUsed;
  console.log(`${tier.name}: ${tierAIHours.toExponential(2)} AI hrs × ${tierEffectiveFlops.toExponential(2)} FLOPs = ${tierComputeUsed.toExponential(2)} FLOPs (${(tierComputeUsed/computeBudgetFLOPs*100).toFixed(1)}%)`);
}

console.log('\nTotal compute if all tiers saturate σ:', totalComputeUsed.toExponential(2));
console.log('Compute budget:', computeBudgetFLOPs.toExponential(2));
console.log('Utilization if all saturate:', (totalComputeUsed / computeBudgetFLOPs * 100).toFixed(1) + '%');

