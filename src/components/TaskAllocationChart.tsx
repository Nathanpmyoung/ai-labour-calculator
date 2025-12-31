import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { YearlyProjection } from '../models/computeModel';

interface TaskAllocationChartProps {
  projections: YearlyProjection[];
  targetYear: number;
}

export function TaskAllocationChart({ projections, targetYear }: TaskAllocationChartProps) {
  // Transform data for stacked area chart
  const chartData = projections.map(p => ({
    year: p.year,
    ai: p.aiTaskShare * 100,
    human: p.humanTaskShare * 100,
  }));

  const formatPercent = (value: number) => `${value.toFixed(0)}%`;
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-300 font-medium mb-2">{label}</p>
          {payload.reverse().map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}%
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
        Task Allocation: AI vs Human
      </h3>
      <p className="text-sm text-zinc-500 mb-4">
        Share of cognitive work performed by AI vs humans
      </p>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis 
              dataKey="year" 
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
            />
            <YAxis 
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              tickFormatter={formatPercent}
              domain={[0, 100]}
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
            <Area
              type="monotone"
              dataKey="human"
              name="Human Work"
              stackId="1"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="ai"
              name="AI Work"
              stackId="1"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {targetData && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-amber-400">
              {targetData.ai.toFixed(1)}%
            </p>
            <p className="text-xs text-amber-200/70">AI Task Share in {targetYear}</p>
          </div>
          <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {targetData.human.toFixed(1)}%
            </p>
            <p className="text-xs text-emerald-200/70">Human Task Share in {targetYear}</p>
          </div>
        </div>
      )}
      
      <p className="text-xs text-zinc-600 mt-3">
        Task allocation depends on cost (vs tier wage), substitutability (σ), and human capacity. 
        Even when AI is cheaper, low σ preserves human work. If skilled workers are scarce 
        (e.g., only 12% can do expert work), AI fills the gap even at higher cost.
      </p>
    </div>
  );
}

