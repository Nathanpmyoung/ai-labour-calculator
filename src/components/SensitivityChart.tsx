import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { SensitivityAnalysis, ParameterSensitivity } from '../models/sensitivity';

interface SensitivityChartProps {
  analysis: SensitivityAnalysis;
}

export function SensitivityChart({ analysis }: SensitivityChartProps) {
  // Prepare data for chart - top 10 most sensitive parameters
  const chartData = analysis.sensitivities
    .slice(0, 10)
    .map(s => ({
      name: s.parameterLabel,
      sensitivity: s.sensitivity * 100, // Convert to percentage
      fill: s.direction === 'positive' ? '#22c55e' : s.direction === 'negative' ? '#ef4444' : '#71717a',
      isKey: s.isKeyParameter,
    }));

  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;
  
  const formatHours = (n: number): string => {
    const abs = Math.abs(n);
    if (abs >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
    if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    return n.toFixed(0);
  };
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const sensitivity = analysis.sensitivities.find(s => s.parameterLabel === data.name);
      if (!sensitivity) return null;
      
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-200 font-medium mb-2">{data.name}</p>
          <p className="text-sm text-zinc-400">
            Sensitivity: <span className={data.sensitivity > 0 ? 'text-emerald-400' : 'text-red-400'}>
              {formatPercent(data.sensitivity)}
            </span>
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            +10% param → {formatHours(sensitivity.absoluteImpact)} hours
          </p>
          {data.isKey && (
            <p className="text-xs text-amber-400 mt-1">★ Key Parameter</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800">
      <h3 className="text-lg font-semibold text-zinc-100 mb-1">
        Parameter Sensitivity Analysis
      </h3>
      <p className="text-sm text-zinc-500 mb-4">
        Impact on human work hours in {analysis.targetYear} — excludes cognitive share (which trivially scales everything)
      </p>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
            <XAxis 
              type="number"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickFormatter={formatPercent}
            />
            <YAxis 
              type="category"
              dataKey="name"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              width={115}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="#52525b" />
            <Bar dataKey="sensitivity" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg">
          <p className="text-emerald-400 font-medium mb-1">↑ Increases Human Work</p>
          <p className="text-emerald-200/70">
            {analysis.sensitivities.filter(s => s.direction === 'positive').length} parameters
          </p>
        </div>
        <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
          <p className="text-red-400 font-medium mb-1">↓ Decreases Human Work</p>
          <p className="text-red-200/70">
            {analysis.sensitivities.filter(s => s.direction === 'negative').length} parameters
          </p>
        </div>
      </div>
      
      <p className="text-xs text-zinc-600 mt-4">
        Sensitivity = (% change in human hours) / (% change in parameter). 
        Positive means increasing the parameter increases human work hours.
      </p>
    </div>
  );
}

/**
 * Compact sensitivity indicator for showing next to parameters
 */
export function SensitivityIndicator({ sensitivity }: { sensitivity: ParameterSensitivity }) {
  const absValue = Math.abs(sensitivity.sensitivity * 100);
  const barWidth = Math.min(100, absValue * 2); // Scale for visibility
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <div 
        className="h-1.5 rounded-full"
        style={{
          width: `${barWidth}%`,
          minWidth: '4px',
          maxWidth: '40px',
          backgroundColor: sensitivity.direction === 'positive' ? '#22c55e' : 
                          sensitivity.direction === 'negative' ? '#ef4444' : '#52525b',
        }}
      />
      <span className={`
        ${sensitivity.direction === 'positive' ? 'text-emerald-500' : 
          sensitivity.direction === 'negative' ? 'text-red-500' : 'text-zinc-500'}
      `}>
        {absValue.toFixed(0)}%
      </span>
    </div>
  );
}

/**
 * Key parameters summary box
 */
export function KeyParametersSummary({ analysis }: { analysis: SensitivityAnalysis }) {
  return (
    <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-4">
      <h4 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2">
        <span>★</span> Most Influential Parameters
      </h4>
      <div className="space-y-2">
        {analysis.keyParameters.map((s, i) => (
          <div key={s.parameterId} className="flex justify-between items-center text-sm">
            <span className="text-zinc-300">
              {i + 1}. {s.parameterLabel}
            </span>
            <span className={`font-mono ${
              s.direction === 'positive' ? 'text-emerald-400' : 
              s.direction === 'negative' ? 'text-red-400' : 'text-zinc-500'
            }`}>
              {s.sensitivity >= 0 ? '+' : ''}{(s.sensitivity * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500 mt-3">
        These parameters have the largest impact on human work hours.
      </p>
    </div>
  );
}

