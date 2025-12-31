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

interface ComputeSupplyChartProps {
  projections: YearlyProjection[];
  targetYear: number;
}

export function ComputeSupplyChart({ projections, targetYear }: ComputeSupplyChartProps) {
  // Transform data for the chart - use log scale for FLOPs
  const chartData = projections.map(p => ({
    year: p.year,
    totalCompute: Math.log10(p.totalComputeFlops),
    effectiveCompute: Math.log10(p.effectiveComputeFlops),
  }));

  const formatYAxis = (value: number) => `10^${value.toFixed(0)}`;
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-300 font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: 10^{entry.value.toFixed(1)} FLOP/s
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
        Global AI Compute Capacity
      </h3>
      <p className="text-sm text-zinc-500 mb-4">
        Raw and effective (efficiency-adjusted) compute available for inference
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
              tickFormatter={formatYAxis}
              domain={['auto', 'auto']}
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
            <Line
              type="monotone"
              dataKey="totalCompute"
              name="Raw Compute"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b' }}
            />
            <Line
              type="monotone"
              dataKey="effectiveCompute"
              name="Effective Compute"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <p className="text-xs text-zinc-600 mt-3">
        Effective compute accounts for algorithmic efficiency improvements—the same hardware 
        can accomplish more cognitive work over time.
      </p>
    </div>
  );
}

