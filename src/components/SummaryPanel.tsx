import type { ModelOutputs } from '../models/computeModel';
import type { ParameterValues } from '../models/parameters';
import { TierBreakdownCompact } from './TierBreakdown';

interface SummaryPanelProps {
  outputs: ModelOutputs;
  params: ParameterValues;
}

export function SummaryPanel({ outputs, params }: SummaryPanelProps) {
  const targetProjection = outputs.projections.find(p => p.year === params.year);
  
  if (!targetProjection) return null;
  
  const formatCurrency = (n: number): string => {
    if (n >= 1) return `$${n.toFixed(2)}`;
    if (n >= 0.01) return `$${n.toFixed(2)}`;
    if (n >= 0.0001) return `$${n.toFixed(4)}`;
    return `$${n.toExponential(1)}`;
  };

  const binding = targetProjection.primaryBindingConstraint;
  const sigma = targetProjection.averageSubstitutability;
  
  // Get 2024 baseline for comparison
  const baseline2024 = outputs.projections.find(p => p.year === 2024);
  const baselineHumanHours = baseline2024?.totalHumanHours ?? targetProjection.totalHumanHours;
  const humanHoursChange = ((targetProjection.totalHumanHours - baselineHumanHours) / baselineHumanHours) * 100;
  
  // Calculate average AI cost across tiers
  const avgAICost = targetProjection.tierAllocations.reduce((sum, ta) => 
    sum + ta.aiCostPerHour * ta.tier.shareOfCognitive, 0);
  
  // Format hours
  const formatHours = (n: number): string => {
    if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    return `${(n / 1e3).toFixed(1)}K`;
  };
  
  return (
    <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800">
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">
        Summary for {params.year}
      </h3>
      
      {/* Demand dynamics highlight */}
      <div className="mb-5 p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-emerald-400">
            Total Cognitive Work Demand
          </span>
          <span className="text-sm font-semibold text-emerald-300">
            {formatHours(targetProjection.totalCognitiveWorkHours)} hrs/yr
            <span className="text-emerald-500 ml-2">
              (+{(targetProjection.demandGrowthFromBaseline * 100).toFixed(0)}% vs 2024)
            </span>
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="text-center">
            <div className="text-zinc-500">GDP</div>
            <div className="text-emerald-400">×{targetProjection.demandComponents.baseline.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-zinc-500">AI-Induced</div>
            <div className="text-emerald-400">×{targetProjection.demandComponents.aiInduced.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-zinc-500">New Tasks</div>
            <div className="text-emerald-400">×{targetProjection.demandComponents.newTasks.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-zinc-500">Human-Only</div>
            <div className="text-emerald-400">+{formatHours(targetProjection.demandComponents.humanPreference)}</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="p-4 bg-zinc-900/50 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            AI Work Done
          </p>
          <p className="text-xl font-semibold text-amber-400">
            {formatHours(targetProjection.totalAIHours)} hrs/yr
          </p>
        </div>
        
        <div className="p-4 bg-zinc-900/50 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            Human Work Done
          </p>
          <p className="text-xl font-semibold text-emerald-400">
            {formatHours(targetProjection.totalHumanHours)} hrs/yr
          </p>
        </div>
        
        <div className="p-4 bg-zinc-900/50 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            Avg AI Cost/Hour
          </p>
          <p className="text-xl font-semibold text-amber-400">
            {formatCurrency(avgAICost)}
          </p>
        </div>
        
        <div className="p-4 bg-zinc-900/50 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            Avg Human Wage
          </p>
          <p className="text-xl font-semibold text-emerald-400">
            {formatCurrency(targetProjection.humanWageEquilibrium)}/hr
          </p>
        </div>
      </div>
      
      {/* Employment & wage breakdown */}
      <div className="mb-5 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
          Employment & Equilibrium Wages by Tier
        </h4>
        {/* Column headers */}
        <div className="flex items-center gap-2 text-[10px] text-zinc-600 mb-2 border-b border-zinc-800 pb-1">
          <span className="w-2"></span>
          <span className="w-14">Tier</span>
          <span className="w-18">Wage</span>
          <span className="w-10" title="Labor market tightness: demand ÷ supply. >1 means shortage.">Tight</span>
          <span className="w-14" title="Full-time equivalent jobs (2000 hrs/year)">Jobs</span>
          <span className="ml-auto" title="% of tier's work done by humans">Human</span>
        </div>
        <div className="space-y-2">
          {targetProjection.tierAllocations.map((ta) => {
            const ftes = ta.hoursHuman / 2000; // ~2000 hrs/year per FTE
            return (
              <div key={ta.tier.id} className="flex items-center gap-2 text-xs">
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ta.tier.color }}
                />
                <span className="text-zinc-400 w-14">{ta.tier.name}</span>
                <span className={`w-18 ${ta.wageAtCeiling ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatCurrency(ta.tierWage)}/hr
                  {ta.wageAtCeiling && <span className="ml-0.5" title="Wage hit task value ceiling">⚠</span>}
                </span>
                <span className="text-zinc-500 w-10" title={`Demand ${ta.laborTightness > 1 ? '>' : '<'} supply`}>
                  {ta.laborTightness.toFixed(1)}×
                </span>
                <span className="text-zinc-300 w-14">
                  {ftes >= 1e9 ? `${(ftes/1e9).toFixed(1)}B` : ftes >= 1e6 ? `${(ftes/1e6).toFixed(0)}M` : `${(ftes/1e3).toFixed(0)}K`}
                </span>
                <span className={`ml-auto ${ta.humanShare > 0.5 ? 'text-emerald-400' : ta.humanShare > 0.2 ? 'text-amber-400' : 'text-red-400'}`}>
                  {(ta.humanShare * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-zinc-500 block">Total FTEs</span>
            <span className="text-emerald-300 font-medium">
              {(() => {
                const totalFtes = targetProjection.totalHumanHours / 2000;
                return totalFtes >= 1e9 ? `${(totalFtes/1e9).toFixed(2)}B` : `${(totalFtes/1e6).toFixed(0)}M`;
              })()}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">vs 2024</span>
            <span className={`font-medium ${humanHoursChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {humanHoursChange >= 0 ? '+' : ''}{humanHoursChange.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Wage Spread</span>
            <span className="text-emerald-300">
              {(Math.max(...targetProjection.tierAllocations.map(ta => ta.tierWage)) / 
                Math.min(...targetProjection.tierAllocations.map(ta => ta.tierWage))).toFixed(1)}×
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">At Ceiling</span>
            <span className={`font-medium ${targetProjection.tierAllocations.filter(ta => ta.wageAtCeiling).length > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {targetProjection.tierAllocations.filter(ta => ta.wageAtCeiling).length}/5
            </span>
          </div>
        </div>
      </div>
      
      {/* Tier breakdown compact */}
      <div className="mb-5 pb-5 border-b border-zinc-800">
        <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
          AI Share by Task Tier
        </h4>
        <TierBreakdownCompact tierAllocations={targetProjection.tierAllocations} />
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Overall AI Task Share</span>
          <span className="text-sm font-medium text-zinc-200">
            {(targetProjection.aiTaskShare * 100).toFixed(1)}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Overall Human Task Share</span>
          <span className="text-sm font-medium text-zinc-200">
            {(targetProjection.humanTaskShare * 100).toFixed(1)}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Avg σ (substitutability)</span>
          <span className="text-sm font-medium text-violet-400">
            {(sigma * 100).toFixed(0)}%
            <span className="text-zinc-500 ml-1">
              (weighted by work share)
            </span>
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Compute Utilization</span>
          <span className="text-sm font-medium text-zinc-200">
            {(targetProjection.computeUtilization * 100).toFixed(1)}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Primary Binding Constraint</span>
          <span className={`text-sm font-medium ${
            binding === 'compute'
              ? 'text-amber-400' 
              : binding === 'cost'
                ? 'text-blue-400' 
                : binding === 'humanCapacity'
                  ? 'text-orange-400'
                  : 'text-violet-400'
          }`}>
            {binding === 'compute' 
              ? '⚡ Compute Scarcity' 
              : binding === 'cost'
                ? '💰 AI Cost'
                : binding === 'humanCapacity'
                  ? '👥 Human Capacity'
                  : '🔄 Substitutability'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
          {outputs.summary.crossoverYear && (
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Avg Cost Crossover</span>
              <span className="text-sm font-medium text-amber-300">
                {outputs.summary.crossoverYear}
              </span>
            </div>
          )}
          {outputs.summary.computeSufficiencyYear && (
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Compute Sufficient</span>
              <span className="text-sm font-medium text-emerald-300">
                {outputs.summary.computeSufficiencyYear}
              </span>
            </div>
          )}
          {!outputs.summary.computeSufficiencyYear && (
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Compute Sufficient</span>
              <span className="text-sm font-medium text-zinc-500">
                After 2050
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-5 p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-lg">
        <h4 className="text-sm font-medium text-indigo-300 mb-2">Key Insight</h4>
        <p className="text-sm text-indigo-200/80 leading-relaxed">
          {(() => {
            // Count tiers by binding constraint
            const tiersByConstraint: Record<string, number> = { cost: 0, compute: 0, substitutability: 0, humanCapacity: 0 };
            targetProjection.tierAllocations.forEach(ta => {
              tiersByConstraint[ta.bindingConstraint]++;
            });
            
            if (tiersByConstraint.humanCapacity >= 2) {
              return (
                <>
                  <strong className="text-orange-300">Human capacity constrains multiple tiers.</strong>{' '}
                  Not enough skilled workers for expert tasks—AI fills the gap even at higher cost.
                  Average wage elevated at {formatCurrency(targetProjection.humanWageEquilibrium)}/hr 
                  due to premium for scarce skills.
                </>
              );
            } else if (tiersByConstraint.compute >= 2) {
              return (
                <>
                  <strong className="text-amber-300">Compute scarcity affects multiple task tiers.</strong>{' '}
                  AI handles routine tasks well, but harder tiers are compute-limited.
                  Human wages elevated at {formatCurrency(targetProjection.humanWageEquilibrium)}/hr 
                  due to demand for complex work.
                </>
              );
            } else if (tiersByConstraint.cost >= 2) {
              return (
                <>
                  <strong className="text-blue-300">AI is still too expensive for many tasks.</strong>{' '}
                  Cost remains the binding constraint for {tiersByConstraint.cost} of 5 tiers.
                  As costs decline, expect more AI adoption.
                </>
              );
            } else {
              const routineTier = targetProjection.tierAllocations[0];
              const expertTier = targetProjection.tierAllocations[3];
              return (
                <>
                  <strong className="text-emerald-300">Stratified automation pattern.</strong>{' '}
                  Routine tasks are {(routineTier.aiShare * 100).toFixed(0)}% AI-automated, 
                  while expert tasks remain {(expertTier.humanShare * 100).toFixed(0)}% human.
                  Substitutability limits AI even where compute is abundant.
                </>
              );
            }
          })()}
        </p>
      </div>
    </div>
  );
}
