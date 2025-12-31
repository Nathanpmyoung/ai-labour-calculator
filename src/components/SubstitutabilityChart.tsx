import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
import type { YearlyProjection } from '../models/computeModel';
import { TIER_CONFIGS } from '../models/parameters';

interface SubstitutabilityChartProps {
  projections: YearlyProjection[];
  targetYear: number;
}

export function SubstitutabilityChart({ 
  projections, 
  targetYear,
}: SubstitutabilityChartProps) {
  // Transform data - show per-tier σ over time
  const chartData = projections.map(p => {
    const dataPoint: { year: number; average: number; [key: string]: number } = {
      year: p.year,
      average: p.averageSubstitutability,
    };
    // Add each tier's effective σ
    p.tierAllocations.forEach(ta => {
      dataPoint[ta.tier.id] = ta.effectiveSubstitutability;
    });
    return dataPoint;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-300 font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {(entry.value * 100).toFixed(0)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const targetData = chartData.find(d => d.year === targetYear);

  return (
    <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800">
      <h3 className="text-lg font-semibold text-zinc-100 mb-1">
        Substitutability (σ) by Tier Over Time
      </h3>
      <p className="text-sm text-zinc-500 mb-4">
        σ (substitutability) = how replaceable humans are by AI. Each tier follows its own trajectory toward an asymptote.
      </p>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis 
              dataKey="year" 
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
            />
            <YAxis 
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
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
            {TIER_CONFIGS.map(tier => (
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {targetData && (
        <div className="mt-4">
          <p className="text-xs text-zinc-500 mb-2">σ in {targetYear}:</p>
          <div className="grid grid-cols-5 gap-2">
            {TIER_CONFIGS.map(tier => (
              <div 
                key={tier.id}
                className="p-2 rounded-lg text-center"
                style={{ backgroundColor: `${tier.color}20`, borderColor: `${tier.color}40`, borderWidth: 1 }}
              >
                <p className="text-lg font-bold" style={{ color: tier.color }}>
                  {((targetData[tier.id] || 0) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-zinc-500">{tier.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <p className="text-xs text-zinc-600 mt-3">
        Each tier grows independently from its 2024 σ toward its asymptotic maximum. 
        Routine tasks can reach high substitutability; frontier tasks may never exceed 15%.
      </p>
    </div>
  );
}
