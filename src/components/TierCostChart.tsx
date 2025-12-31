import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { YearlyProjection } from '../models/computeModel';

interface TierCostChartProps {
  projections: YearlyProjection[];
  targetYear: number;
  humanWageFloor: number;
}

export function TierCostChart({ 
  projections, 
  targetYear, 
  humanWageFloor,
}: TierCostChartProps) {
  // Transform data - AI cost per hour for each tier
  const chartData = projections.map(p => {
    const tierCosts: Record<string, number> = {};
    p.tierAllocations.forEach(ta => {
      tierCosts[ta.tier.id] = ta.aiCostPerHour;
    });
    return {
      year: p.year,
      ...tierCosts,
      wageFloor: humanWageFloor,
    };
  });

  // Get tier info for colors
  const tierInfo = projections[0]?.tierAllocations.map(ta => ({
    id: ta.tier.id,
    name: ta.tier.name,
    color: ta.tier.color,
  })) || [];

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    if (value >= 1) return `$${value.toFixed(0)}`;
    if (value >= 0.01) return `$${value.toFixed(2)}`;
    if (value >= 0.0001) return `$${value.toFixed(4)}`;
    return `$${value.toExponential(1)}`;
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-300 font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}/hr
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800">
      <h3 className="text-lg font-semibold text-zinc-100 mb-1">
        AI Cost per Hour by Task Tier
      </h3>
      <p className="text-sm text-zinc-500 mb-4">
        How much it costs to get one hour of AI work done for each difficulty tier
      </p>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis 
              dataKey="year" 
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
            />
            <YAxis 
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              tickFormatter={formatCurrency}
              scale="log"
              domain={[0.0001, 10000]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => <span className="text-zinc-400 text-sm">{value}</span>}
            />
            <ReferenceLine 
              x={targetYear} 
              stroke="#6366f1" 
              strokeDasharray="5 5"
              strokeWidth={2}
            />
            <ReferenceLine 
              y={humanWageFloor} 
              stroke="#71717a" 
              strokeDasharray="5 5"
              strokeWidth={1}
              label={{ 
                value: `Wage Floor $${humanWageFloor}`, 
                position: 'right', 
                fill: '#71717a',
                fontSize: 10,
              }}
            />
            {tierInfo.map(tier => (
              <Line
                key={tier.id}
                type="monotone"
                dataKey={tier.id}
                name={tier.name}
                stroke={tier.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: tier.color }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <p className="text-xs text-zinc-600 mt-3">
        When AI cost drops below the tier wage (floor × multiplier), cost favors AI—but 
        substitutability or human capacity may still limit adoption. Tiers span 8 orders 
        of magnitude in compute requirements.
      </p>
    </div>
  );
}

