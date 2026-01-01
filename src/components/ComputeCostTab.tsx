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

  return (
    <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800 space-y-6">
      <h3 className="text-lg font-semibold text-zinc-100">
        Compute Cost Analysis for {params.year}
      </h3>

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
                <th className="text-right py-2 px-2">Production $/hr</th>
                <th className="text-right py-2 px-2">Market $/hr</th>
                <th className="text-right py-2 px-2">Human Wage</th>
                <th className="text-right py-2 px-2">Max WTP/hr</th>
                <th className="text-right py-2 px-2">Got AI?</th>
              </tr>
            </thead>
            <tbody>
              {tierAllocations.map((ta) => {
                const maxWTP = Math.min(ta.tierWage, ta.tier.taskValue);
                const gotCompute = ta.aiShare > 0.01;
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
                          <span className="text-amber-400 text-xs">★ clearing</span>
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
                    <td className="text-right py-2 px-2 text-zinc-300">
                      {formatCurrency(maxWTP)}
                    </td>
                    <td className="text-right py-2 px-2">
                      {gotCompute ? (
                        <span className="text-emerald-400">{(ta.aiShare * 100).toFixed(0)}%</span>
                      ) : (
                        <span className="text-zinc-500">No (priced out)</span>
                      )}
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
            <span className="text-indigo-300">1. Reservation prices:</span> Each tier has a maximum willingness 
            to pay per FLOP, bounded by both human wage (alternative) and task value (economic ceiling).
          </p>
          <p>
            <span className="text-indigo-300">2. Auction allocation:</span> Compute goes to highest bidders first. 
            Tiers are served in order of their willingness to pay until compute is exhausted.
          </p>
          <p>
            <span className="text-indigo-300">3. Clearing price:</span> When compute is scarce, the marginal 
            tier (last to get any compute) sets the market price. All users pay this price.
          </p>
          <p>
            <span className="text-indigo-300">4. Scarcity premium:</span> Market price can exceed production 
            cost when demand outstrips supply. This reflects the true economic value of scarce compute.
          </p>
        </div>
      </div>
    </div>
  );
}

