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

interface DemandDynamicsChartProps {
  projections: YearlyProjection[];
  targetYear: number;
}

export function DemandDynamicsChart({ projections, targetYear }: DemandDynamicsChartProps) {
  // Calculate total demand for each year from tier allocations
  const chartData = projections.map(p => {
    const totalHours = p.tierAllocations.reduce((sum, ta) => 
      sum + ta.hoursAI + ta.hoursHuman, 0);
    const aiHours = p.tierAllocations.reduce((sum, ta) => sum + ta.hoursAI, 0);
    const humanHours = p.tierAllocations.reduce((sum, ta) => sum + ta.hoursHuman, 0);
    
    return {
      year: p.year,
      total: totalHours / 1e9, // In billions
      ai: aiHours / 1e9,
      human: humanHours / 1e9,
    };
  });

  const formatBillions = (value: number) => `${value.toFixed(0)}B`;
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-300 font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}B hrs/yr
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const targetData = chartData.find(d => d.year === targetYear);
  const baselineData = chartData[0];
  const growthPercent = baselineData ? 
    ((targetData?.total || 0) / baselineData.total - 1) * 100 : 0;

  return (
    <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800">
      <h3 className="text-lg font-semibold text-zinc-100 mb-1">
        Cognitive Work Demand Over Time
      </h3>
      <p className="text-sm text-zinc-500 mb-4">
        Total hours of cognitive work demanded, split by who performs it
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
              tickFormatter={formatBillions}
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
      
      {targetData && baselineData && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="p-3 bg-indigo-950/30 border border-indigo-900/50 rounded-lg text-center">
            <p className="text-xl font-bold text-indigo-400">
              {targetData.total.toFixed(0)}B
            </p>
            <p className="text-xs text-indigo-200/70">Total hrs/yr in {targetYear}</p>
          </div>
          <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-center">
            <p className="text-xl font-bold text-emerald-400">
              {targetData.human.toFixed(0)}B
            </p>
            <p className="text-xs text-emerald-200/70">Human hrs/yr</p>
          </div>
          <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg text-center">
            <p className="text-xl font-bold text-amber-400">
              +{growthPercent.toFixed(0)}%
            </p>
            <p className="text-xs text-amber-200/70">Demand vs 2024</p>
          </div>
        </div>
      )}
      
      <p className="text-xs text-zinc-600 mt-3">
        Total work isn't fixed: it grows with GDP, expands when AI makes tasks cheaper 
        (Jevons paradox), and new task categories emerge as AI capabilities grow.
      </p>
    </div>
  );
}

