/**
 * Test script for market-clearing allocation
 * Run with: npx tsx test-market-clearing.ts
 */

import { getDefaultValues } from './src/models/parameters';
import { runModel } from './src/models/computeModel';

// Get default params and modify for compute-constrained scenario with frontier FLOPs = 22
const params = getDefaultValues();

// Compute constrained scenario settings
params.baseComputeExponent = 21;  // Lower compute
params.computeGrowthRate = 0.3;   // Slower growth
params.tier_frontier_flops = 22;  // Frontier at 10^22 FLOPs/hr
params.year = 2024;               // Test year 2024 specifically

console.log('\n=== MARKET-CLEARING ALLOCATION TEST ===\n');
console.log('Scenario: Compute constrained with Frontier FLOPs = 10^22');
console.log('Year:', params.year);
console.log('Base Compute:', `10^${params.baseComputeExponent} FLOP/s`);
console.log('');

// Run model
const outputs = runModel(params);
const projection = outputs.projections.find(p => p.year === params.year);

if (!projection) {
  console.error('No projection found for year', params.year);
  process.exit(1);
}

console.log('=== COMPUTE AVAILABILITY ===');
console.log('Total Compute:', projection.totalComputeFlops.toExponential(2), 'FLOP/s');
console.log('Effective Compute:', projection.effectiveComputeFlops.toExponential(2), 'FLOP/s');
console.log('Compute Cost:', `$${projection.computeCostPerExaflop.toFixed(2)}/ExaFLOP`);
console.log('');

console.log('=== MARKET PRICING ===');
console.log('Production Cost:', `$${(projection.productionCostPerFLOP * 1e18).toFixed(4)}/ExaFLOP`);
console.log('Market Price:', `$${(projection.marketPricePerFLOP * 1e18).toFixed(4)}/ExaFLOP`);
console.log('Scarcity Premium:', `${projection.scarcityPremium.toFixed(2)}x`);
console.log('Clearing Tier:', projection.clearingTier ?? 'None (abundant)');
console.log('Compute Utilization:', `${(projection.computeUtilization * 100).toFixed(1)}%`);
console.log('');

console.log('=== PER-TIER ALLOCATION ===');
console.log('');

const tiers = projection.tierAllocations;

// Print header
console.log('Tier       | FLOPs/hr | AI Cost  | Human Wage | AI Profit | Human Profit | AI Share | Constraint');
console.log('-----------|----------|----------|------------|-----------|--------------|----------|------------');

for (const ta of tiers) {
  const flopsPerHr = Math.pow(10, ta.tier.flopsPerHourExponent);
  const aiCost = ta.aiCostPerHour;
  const humanWage = ta.tierWage;
  const taskValue = ta.tier.taskValue;
  
  const aiProfit = taskValue - aiCost;
  const humanProfit = taskValue - humanWage;
  
  const aiShareStr = `${(ta.aiShare * 100).toFixed(0)}%`.padStart(6);
  const constraintStr = ta.bindingConstraint.padEnd(12);
  
  console.log(
    `${ta.tier.name.padEnd(10)} | 10^${ta.tier.flopsPerHourExponent.toString().padStart(2)}   | $${aiCost.toFixed(2).padStart(7)} | $${humanWage.toFixed(2).padStart(9)} | $${aiProfit.toFixed(2).padStart(8)} | $${humanProfit.toFixed(2).padStart(11)} | ${aiShareStr} | ${constraintStr}`
  );
}

console.log('');
console.log('=== EXPECTED vs ACTUAL ===');
console.log('');

// Check expectations
let failures = 0;

for (const ta of tiers) {
  const aiCost = ta.aiCostPerHour;
  const humanWage = ta.tierWage;
  const taskValue = ta.tier.taskValue;
  
  const aiCheaperThanHuman = aiCost < humanWage;
  const aiProfitable = aiCost < taskValue;
  const shouldUseAI = aiCheaperThanHuman && aiProfitable;
  const actuallyUsingAI = ta.aiShare > 0.01;
  
  const status = shouldUseAI === actuallyUsingAI ? '✓' : '✗';
  
  if (shouldUseAI !== actuallyUsingAI && shouldUseAI) {
    failures++;
    console.log(`${status} ${ta.tier.name}: AI costs $${aiCost.toFixed(2)}/hr vs Human $${humanWage.toFixed(2)}/hr`);
    console.log(`   AI is ${aiCost < humanWage ? 'CHEAPER' : 'MORE EXPENSIVE'} than human`);
    console.log(`   AI is ${aiCost < taskValue ? 'PROFITABLE' : 'UNPROFITABLE'} (taskValue=$${taskValue})`);
    console.log(`   Expected: Use AI, Actual: ${actuallyUsingAI ? 'Using AI' : 'NOT using AI'}`);
    console.log(`   Binding constraint: ${ta.bindingConstraint}`);
    console.log('');
  }
}

if (failures === 0) {
  console.log('All allocations look correct!');
} else {
  console.log(`FAILURES: ${failures} tiers are not using AI when they should be`);
}

console.log('');
console.log('=== SUMMARY ===');
console.log('Overall AI Share:', `${(projection.aiTaskShare * 100).toFixed(1)}%`);
console.log('Overall Human Share:', `${(projection.humanTaskShare * 100).toFixed(1)}%`);
console.log('Unmet Demand:', `${(projection.unmetTaskShare * 100).toFixed(1)}%`);

