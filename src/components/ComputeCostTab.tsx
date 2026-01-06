import type { YearlyProjection } from '../models/computeModel';
import type { ParameterValues } from '../models/parameters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface ComputeCostTabProps {
  projection: YearlyProjection;
  params: ParameterValues;
}

export function ComputeCostTab({ projection, params }: ComputeCostTabProps) {
  const formatCurrency = (n: number): string => {
    if (n >= 1) return `$${n.toFixed(2)}`;
    if (n >= 0.01) return `$${n.toFixed(2)}`;
    if (n >= 0.0001) return `$${n.toFixed(4)}`;
    return `$${n.toExponential(1)}`;
  };

  const formatExaflops = (n: number): string => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)} ZettaFLOP/s`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)} ExaFLOP/s`;
    return `${n.toFixed(1)} PetaFLOP/s`;
  };

  const { 
    productionCostPerFLOP, 
    marketPricePerFLOP, 
    scarcityPremium, 
    clearingTier,
    computeUtilization,
    effectiveComputeFlops,
    tierAllocations,
  } = projection;

  const hasScarcity = scarcityPremium > 1.01;
  
  // Prepare demand curve data - showing reservation price vs cumulative compute
  // Sort tiers by reservation price descending
  const sortedTiers = [...tierAllocations].sort((a, b) => 
    (b.reservationPrice ?? 0) - (a.reservationPrice ?? 0)
  );
  
  // Build demand curve data
  const demandCurveData = sortedTiers.map(ta => {
    return {
      tier: ta.tier.name,
      reservationPrice: ta.reservationPrice ?? 0,
      reservationPricePerHour: (ta.reservationPrice ?? 0) * Math.pow(10, ta.tier.flopsPerHourExponent),
      computeShare: ta.effectiveSubstitutability * ta.tier.shareOfCognitive * 100,
      gotCompute: ta.aiShare > 0.01,
      isClearingTier: ta.tier.id === clearingTier,
      color: ta.tier.color,
    };
  });

  // Per-tier cost breakdown
  const tierCostData = tierAllocations.map(ta => ({
    name: ta.tier.name,
    productionCost: ta.productionCostPerHour,
    marketCost: ta.aiCostPerHour,
    humanWage: ta.tierWage,
    taskValue: ta.tier.taskValue,
    color: ta.tier.color,
    aiShare: ta.aiShare,
    gotCompute: ta.aiShare > 0.01,
  }));

  // Count binding constraints
  const constraintCounts = {
    cost: tierAllocations.filter(ta => ta.bindingConstraint === 'cost').length,
    compute: tierAllocations.filter(ta => ta.bindingConstraint === 'compute').length,
    substitutability: tierAllocations.filter(ta => ta.bindingConstraint === 'substitutability').length,
    humanCapacity: tierAllocations.filter(ta => ta.bindingConstraint === 'humanCapacity').length,
  };

  return (
    <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">
          Compute Cost Analysis for {params.year}
        </h3>
        <span className="px-3 py-1 text-xs font-medium bg-indigo-900/50 text-indigo-300 rounded-full border border-indigo-700/50">
          Market Clearing
        </span>
      </div>

      {/* Price summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900/50 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Production Cost</p>
          <p className="text-lg font-semibold text-emerald-400">
            {formatCurrency(productionCostPerFLOP * 1e18)}/ExaFLOP
          </p>
          <p className="text-xs text-zinc-500 mt-1">Hardware + energy only</p>
        </div>
        
        <div className="p-4 bg-zinc-900/50 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Market Price</p>
          <p className={`text-lg font-semibold ${hasScarcity ? 'text-amber-400' : 'text-emerald-400'}`}>
            {formatCurrency(marketPricePerFLOP * 1e18)}/ExaFLOP
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {hasScarcity ? 'Scarcity-adjusted' : 'No scarcity premium'}
          </p>
        </div>
        
        <div className="p-4 bg-zinc-900/50 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Scarcity Premium</p>
          <p className={`text-lg font-semibold ${hasScarcity ? 'text-amber-400' : 'text-zinc-400'}`}>
            {scarcityPremium.toFixed(2)}×
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {hasScarcity ? `+${((scarcityPremium - 1) * 100).toFixed(0)}% above base` : 'Market = Production'}
          </p>
        </div>
        
        <div className="p-4 bg-zinc-900/50 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Compute Utilization</p>
          <p className={`text-lg font-semibold ${computeUtilization > 0.95 ? 'text-red-400' : computeUtilization > 0.7 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {(computeUtilization * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {formatExaflops(effectiveComputeFlops)} available
          </p>
        </div>
      </div>

      {/* Binding Constraints Summary */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <h4 className="text-sm font-medium text-zinc-300 mb-3">Binding Constraints by Tier</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-zinc-400">Cost: {constraintCounts.cost} tiers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-zinc-400">Compute: {constraintCounts.compute} tiers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-violet-500"></span>
            <span className="text-zinc-400">Substitutability: {constraintCounts.substitutability} tiers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span className="text-zinc-400">Human Capacity: {constraintCounts.humanCapacity} tiers</span>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          The model clears a compute market: scarce compute goes to the highest bidders (by willingness-to-pay per FLOP), and the market price rises under scarcity.
        </p>
      </div>

      {/* Clearing tier info */}
      {hasScarcity && clearingTier && (
        <div className="p-4 bg-amber-950/30 border border-amber-900/50 rounded-lg">
          <h4 className="text-sm font-medium text-amber-300 mb-2">Market Clearing Mechanism</h4>
          <p className="text-sm text-zinc-300">
            The <span className="text-amber-400 font-medium">{clearingTier}</span> tier is the marginal buyer, 
            setting the market price. Higher-value tiers (willing to pay more) get compute; 
            lower-value tiers are priced out.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-zinc-500">Price-setters (got compute):</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {demandCurveData.filter(d => d.gotCompute).map(d => (
                  <span 
                    key={d.tier} 
                    className="px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: d.color }}
                  >
                    {d.tier}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-zinc-500">Priced out (use humans):</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {demandCurveData.filter(d => !d.gotCompute).map(d => (
                  <span 
                    key={d.tier} 
                    className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-300"
                  >
                    {d.tier}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-tier cost breakdown */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3">Per-Tier AI Cost vs Human Wage</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tierCostData} layout="vertical" margin={{ left: 60 }}>
              <XAxis 
                type="number" 
                tickFormatter={(v) => `$${v}`}
                domain={[0, 'auto']}
              />
              <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa' }} />
              <Tooltip 
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
              />
              <Legend />
              <Bar 
                dataKey="productionCost" 
                name="AI (Production)" 
                fill="#10b981"
                opacity={0.4}
              />
              <Bar 
                dataKey="marketCost" 
                name="AI (Market)" 
                fill="#f59e0b"
              >
                {tierCostData.map((entry, index) => (
                  <Cell key={index} fill={entry.gotCompute ? '#f59e0b' : '#71717a'} />
                ))}
              </Bar>
              <Bar 
                dataKey="humanWage" 
                name="Human Wage" 
                fill="#8b5cf6"
              />
              <ReferenceLine x={params.humanWageFloor} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Floor', fill: '#ef4444' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Gray bars indicate tiers that were priced out of the compute market at current demand.
        </p>
      </div>

      {/* Reservation prices table */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3">Tier Reservation Prices (Max Willingness to Pay)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
              <tr>
                <th className="text-left py-2 px-2">Tier</th>
                <th className="text-right py-2 px-2">FLOPs/hr</th>
                <th className="text-right py-2 px-2">Production</th>
                <th className="text-right py-2 px-2">Market</th>
                <th className="text-right py-2 px-2">Human</th>
                <th className="text-right py-2 px-2">AI Share</th>
                <th className="text-center py-2 px-2">Constraint</th>
              </tr>
            </thead>
            <tbody>
              {tierAllocations.map((ta) => {
                const constraintColors: Record<string, string> = {
                  cost: 'text-blue-400',
                  compute: 'text-amber-400',
                  substitutability: 'text-violet-400',
                  humanCapacity: 'text-orange-400',
                };
                const constraintLabels: Record<string, string> = {
                  cost: 'Cost',
                  compute: 'Compute',
                  substitutability: 'σ limit',
                  humanCapacity: 'Human cap',
                };
                return (
                  <tr key={ta.tier.id} className="border-b border-zinc-800/50">
                    <td className="py-2 px-2">
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ta.tier.color }}
                        />
                        {ta.tier.name}
                        {ta.tier.id === clearingTier && (
                          <span className="text-amber-400 text-xs">★</span>
                        )}
                      </span>
                    </td>
                    <td className="text-right py-2 px-2 text-zinc-400 font-mono text-xs">
                      10^{ta.tier.flopsPerHourExponent}
                    </td>
                    <td className="text-right py-2 px-2 text-emerald-400">
                      {formatCurrency(ta.productionCostPerHour)}
                    </td>
                    <td className={`text-right py-2 px-2 ${hasScarcity ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {formatCurrency(ta.aiCostPerHour)}
                    </td>
                    <td className="text-right py-2 px-2 text-violet-400">
                      {formatCurrency(ta.tierWage)}
                    </td>
                    <td className="text-right py-2 px-2">
                      <span className={ta.aiShare > 0.01 ? 'text-emerald-400' : 'text-zinc-500'}>
                        {(ta.aiShare * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className={`text-center py-2 px-2 text-xs ${constraintColors[ta.bindingConstraint]}`}>
                      {constraintLabels[ta.bindingConstraint]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanation */}
      <div className="p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-lg">
        <h4 className="text-sm font-medium text-indigo-300 mb-2">How Market Clearing Works</h4>
        <div className="text-sm text-zinc-400 space-y-2">
          <p>
            <span className="text-indigo-300">Uniform-price auction:</span> Each tier has a maximum willingness to pay
            for compute, based on its equilibrium human wage (capped by task value) and its compute required per hour.
          </p>
          <p>
            <span className="text-indigo-300">Allocation + clearing price:</span> Tiers are served from highest bid to
            lowest bid up to their σ limit. The marginal tier sets the market-clearing price; lower bidders are priced out.
          </p>
          <p>
            <span className="text-indigo-300">Wages and compute interact:</span> Wages rise when human labour is scarce,
            which raises bids for compute. The model iterates wages and compute allocation until they stabilize.
          </p>
          <p>
            <span className="text-indigo-300">Why this matters:</span> Using equilibrium wages avoids counterintuitive
            outcomes where scarce-skill tiers (like Frontier) are skipped even when AI would be economical for them.
          </p>
        </div>
      </div>
    </div>
  );
}

