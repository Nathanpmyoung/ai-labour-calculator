import type { TierAllocation } from '../models/computeModel';

interface TierBreakdownProps {
  tierAllocations: TierAllocation[];
  year: number;
}

export function TierBreakdown({ tierAllocations, year }: TierBreakdownProps) {
  const formatCurrency = (n: number): string => {
    if (n >= 1) return `$${n.toFixed(2)}`;
    if (n >= 0.01) return `$${n.toFixed(2)}`;
    if (n >= 0.0001) return `$${n.toFixed(4)}`;
    return `$${n.toExponential(1)}`;
  };

  const formatHours = (n: number): string => {
    if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    return `${(n / 1e3).toFixed(1)}K`;
  };

  const getConstraintIcon = (constraint: string) => {
    switch (constraint) {
      case 'cost': return '💰';
      case 'compute': return '⚡';
      case 'substitutability': return '🔄';
      case 'humanCapacity': return '👥';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Task allocation by difficulty tier for {year}. Each tier has different FLOPs requirements and substitutability.
      </p>
      
      <div className="space-y-3">
        {tierAllocations.map((ta) => (
          <div 
            key={ta.tier.id}
            className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ta.tier.color }}
                />
                <div>
                  <h4 className="text-sm font-medium text-zinc-200">{ta.tier.name}</h4>
                  <p className="text-xs text-zinc-500">{ta.tier.description}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                {(ta.tier.shareOfCognitive * 100).toFixed(0)}% of work
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-6 bg-zinc-800 rounded-full overflow-hidden flex mb-3">
              <div 
                className="h-full flex items-center justify-center text-xs font-medium transition-all duration-300"
                style={{ 
                  width: `${ta.aiShare * 100}%`,
                  backgroundColor: ta.tier.color,
                  minWidth: ta.aiShare > 0.05 ? '40px' : '0'
                }}
              >
                {ta.aiShare >= 0.1 && (
                  <span className="text-white/90">{(ta.aiShare * 100).toFixed(0)}% AI</span>
                )}
              </div>
              <div 
                className="h-full bg-zinc-700 flex items-center justify-center text-xs font-medium"
                style={{ 
                  width: `${ta.humanShare * 100}%`,
                  minWidth: ta.humanShare > 0.05 ? '40px' : '0'
                }}
              >
                {ta.humanShare >= 0.1 && (
                  <span className="text-zinc-300">{(ta.humanShare * 100).toFixed(0)}% Human</span>
                )}
              </div>
            </div>
            
            {/* Stats grid - economics */}
            <div className="grid grid-cols-4 gap-2 text-xs mb-2">
              <div>
                <span className="text-zinc-500 block">AI Cost</span>
                <span className="text-zinc-300">{formatCurrency(ta.aiCostPerHour)}/hr</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Eq. Wage</span>
                <span className={`font-medium ${ta.wageAtCeiling ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatCurrency(ta.tierWage)}/hr
                  {ta.wageAtCeiling && <span className="ml-1" title="At task value ceiling">⚠</span>}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Ceiling</span>
                <span className="text-zinc-400">{formatCurrency(ta.tier.taskValue)}/hr</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Tightness</span>
                <span className={`${ta.laborTightness > 1.2 ? 'text-amber-400' : ta.laborTightness < 0.8 ? 'text-blue-400' : 'text-zinc-300'}`}>
                  {ta.laborTightness.toFixed(2)}×
                </span>
              </div>
            </div>
            
            {/* Stats grid - labor */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div title="σ = substitutability (0=can't replace, 1=perfect substitute)">
                <span className="text-zinc-500 block">σ (sub)</span>
                <span className="text-zinc-300">{ta.effectiveSubstitutability.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Human %</span>
                <span className="text-zinc-300">{(ta.tier.humanCapable * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Inflow</span>
                <span className={`${ta.displacedInflow > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {ta.displacedInflow > 0 ? `+${formatHours(ta.displacedInflow)}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Binding</span>
                <span className="text-zinc-300">
                  {getConstraintIcon(ta.bindingConstraint)}
                </span>
              </div>
            </div>
            
            {/* Hours breakdown */}
            <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between text-xs text-zinc-500">
              <span>AI: {formatHours(ta.hoursAI)} hrs/yr</span>
              <span>Human: {formatHours(ta.hoursHuman)} hrs/yr</span>
              <span>Supply: {formatHours(ta.effectiveSupply)} hrs</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary row */}
      <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg p-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-indigo-300 font-medium">Total Aggregate</span>
          <div className="flex gap-4">
            <span className="text-zinc-300">
              AI: {(tierAllocations.reduce((sum, ta) => 
                sum + ta.aiShare * ta.tier.shareOfCognitive, 0) * 100).toFixed(1)}%
            </span>
            <span className="text-zinc-300">
              Human: {(tierAllocations.reduce((sum, ta) => 
                sum + ta.humanShare * ta.tier.shareOfCognitive, 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for showing in summary
 */
export function TierBreakdownCompact({ tierAllocations }: { tierAllocations: TierAllocation[] }) {
  return (
    <div className="space-y-2">
      {tierAllocations.map((ta) => (
        <div key={ta.tier.id} className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: ta.tier.color }}
          />
          <span className="text-xs text-zinc-400 w-16">{ta.tier.name}</span>
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300"
              style={{ 
                width: `${ta.aiShare * 100}%`,
                backgroundColor: ta.tier.color,
              }}
            />
          </div>
          <span className="text-xs text-zinc-400 w-12 text-right">
            {(ta.aiShare * 100).toFixed(0)}% AI
          </span>
        </div>
      ))}
    </div>
  );
}

