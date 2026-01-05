import {
  LineChart,
  Line,
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
import { TIER_CONFIGS } from '../models/parameters';

interface HumanEmploymentChartsProps {
  projections: YearlyProjection[];
  targetYear: number;
}

export function HumanEmploymentCharts({ projections, targetYear }: HumanEmploymentChartsProps) {
  // Get 2024 baseline for employment index
  const baseline2024 = projections.find(p => p.year === 2024);
  const baselineHumanHours = baseline2024?.totalHumanHours ?? projections[0]?.totalHumanHours ?? 1;
  
  // Prepare data for all charts
  const chartData = projections.map(p => {
    const tierHours: Record<string, number> = {};
    p.tierAllocations.forEach(ta => {
      tierHours[ta.tier.id] = ta.hoursHuman / 1e12; // Convert to trillions
    });
    
    return {
      year: p.year,
      totalHuman: p.totalHumanHours / 1e12, // Trillions
      employmentIndex: (p.totalHumanHours / baselineHumanHours) * 100,
      ...tierHours,
    };
  });

  const targetData = chartData.find(d => d.year === targetYear);
  
  const formatTrillions = (value: number) => `${value.toFixed(1)}T`;
  const formatPercent = (value: number) => `${value.toFixed(0)}%`;
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-300 font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' 
                ? entry.dataKey === 'employmentIndex' 
                  ? `${entry.value.toFixed(1)}%`
                  : `${entry.value.toFixed(2)}T hrs`
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Chart 1: Total Human Hours Over Time */}
      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
        <h4 className="text-sm font-medium text-zinc-200 mb-1">
          Total Human Work Hours Over Time
        </h4>
        <p className="text-xs text-zinc-500 mb-3">
          Absolute human cognitive work hours per year
        </p>
        
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis 
                dataKey="year" 
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
              />
              <YAxis 
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickFormatter={formatTrillions}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                x={targetYear} 
                stroke="#6366f1" 
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="totalHuman"
                name="Human Hours"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#22c55e' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {targetData && (
          <div className="mt-3 flex gap-4 text-xs">
            <div className="text-zinc-500">
              2024: <span className="text-emerald-400">{chartData[0]?.totalHuman.toFixed(2)}T</span>
            </div>
            <div className="text-zinc-500">
              {targetYear}: <span className="text-emerald-400">{targetData.totalHuman.toFixed(2)}T</span>
            </div>
            <div className="text-zinc-500">
              Change: <span className={targetData.totalHuman >= (chartData[0]?.totalHuman ?? 0) ? 'text-emerald-400' : 'text-red-400'}>
                {targetData.totalHuman >= (chartData[0]?.totalHuman ?? 0) ? '+' : ''}
                {(((targetData.totalHuman / (chartData[0]?.totalHuman ?? 1)) - 1) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chart 2: Employment Rate Index */}
      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
        <h4 className="text-sm font-medium text-zinc-200 mb-1">
          Employment Index (vs 2024 Baseline)
        </h4>
        <p className="text-xs text-zinc-500 mb-3">
          100 = same human work hours as 2024 — above means more jobs, below means fewer
        </p>
        
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis 
                dataKey="year" 
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
              />
              <YAxis 
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickFormatter={formatPercent}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={100} 
                stroke="#71717a" 
                strokeDasharray="3 3"
                label={{ value: '2024 baseline', fill: '#71717a', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine 
                x={targetYear} 
                stroke="#6366f1" 
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="employmentIndex"
                name="Employment Index"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#8b5cf6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {targetData && (
          <div className="mt-3 text-xs text-zinc-500">
            By {targetYear}: {targetData.employmentIndex >= 100 ? (
              <span className="text-emerald-400">
                {targetData.employmentIndex.toFixed(0)}% of 2024 jobs — employment has grown
              </span>
            ) : (
              <span className="text-red-400">
                {targetData.employmentIndex.toFixed(0)}% of 2024 jobs — {(100 - targetData.employmentIndex).toFixed(0)}% fewer human work hours
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart 3: Human Hours by Tier (Stacked Area) */}
      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
        <h4 className="text-sm font-medium text-zinc-200 mb-1">
          Human Work Hours by Task Tier
        </h4>
        <p className="text-xs text-zinc-500 mb-3">
          Breakdown of human cognitive work across difficulty tiers
        </p>
        
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis 
                dataKey="year" 
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
              />
              <YAxis 
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickFormatter={formatTrillions}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span className="text-zinc-400 text-xs">{value}</span>}
              />
              <ReferenceLine 
                x={targetYear} 
                stroke="#6366f1" 
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              {/* Stack tiers from Frontier (bottom) to Routine (top) for visual clarity */}
              {[...TIER_CONFIGS].reverse().map((tier) => (
                <Area
                  key={tier.id}
                  type="monotone"
                  dataKey={tier.id}
                  name={tier.name}
                  stackId="1"
                  stroke={tier.color}
                  fill={tier.color}
                  fillOpacity={0.7}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {targetData && (
          <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
            {TIER_CONFIGS.map(tier => {
              const hours = (targetData as any)[tier.id] as number;
              return (
                <div key={tier.id} className="text-center">
                  <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: tier.color }} />
                  <div className="text-zinc-400">{tier.name}</div>
                  <div className="text-zinc-200">{hours?.toFixed(2)}T</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

