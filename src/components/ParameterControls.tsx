import { useState, useMemo } from 'react';
import { parameters, formatValue, TIER_CONFIGS } from '../models/parameters';
import type { Parameter, ParameterValues } from '../models/parameters';
import { calculateSensitivities } from '../models/sensitivity';

interface ParameterControlsProps {
  values: ParameterValues;
  onChange: (id: string, value: number) => void;
  onReset: () => void;
}

function SensitivityBadge({ sensitivity, direction }: { 
  sensitivity: number; 
  direction: 'positive' | 'negative' | 'neutral';
}) {
  const absPercent = Math.abs(sensitivity * 100);
  if (absPercent < 2) return null; // Don't show tiny sensitivities
  
  // Bar width scales with sensitivity (max 24px)
  const barWidth = Math.min(24, Math.max(4, absPercent / 2));
  
  return (
    <div className="flex items-center gap-1 ml-2" title={`${direction === 'positive' ? '+' : '-'}${absPercent.toFixed(0)}% sensitivity`}>
      <div 
        className="h-2 rounded-sm"
        style={{
          width: `${barWidth}px`,
          backgroundColor: direction === 'positive' ? '#22c55e' : '#ef4444',
          opacity: 0.7,
        }}
      />
    </div>
  );
}

function ParameterSlider({ 
  param, 
  value, 
  onChange,
  sensitivity,
  sensitivityDirection,
}: { 
  param: Parameter; 
  value: number; 
  onChange: (value: number) => void;
  sensitivity?: number;
  sensitivityDirection?: 'positive' | 'negative' | 'neutral';
}) {
  const [inputValue, setInputValue] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  // Sync input value when external value changes (e.g., slider or reset)
  const handleFocus = () => {
    setIsEditing(true);
    // Show raw number for editing
    setInputValue(String(value));
  };

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      // Clamp to valid range
      const clamped = Math.min(param.max, Math.max(param.min, parsed));
      onChange(clamped);
      setInputValue(String(clamped));
    } else {
      // Reset to current value if invalid
      setInputValue(String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setInputValue(String(value));
      setIsEditing(false);
    }
  };

  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-1.5">
        <div className="flex items-center">
          <label className="text-sm font-medium text-zinc-200">
            {param.label}
          </label>
          {sensitivity !== undefined && sensitivityDirection && (
            <SensitivityBadge sensitivity={sensitivity} direction={sensitivityDirection} />
          )}
        </div>
        <input
          type="text"
          value={isEditing ? inputValue : formatValue(param, value)}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="text-sm font-mono text-indigo-400 bg-transparent border-b border-transparent 
                     hover:border-zinc-600 focus:border-indigo-500 focus:outline-none 
                     text-right w-24 px-1 transition-colors cursor-text"
          title="Click to edit value directly"
        />
      </div>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(e) => {
          const newVal = parseFloat(e.target.value);
          onChange(newVal);
          setInputValue(String(newVal));
        }}
        className="w-full"
      />
      <p className="text-xs text-zinc-500 mt-1.5">
        {param.description}
      </p>
    </div>
  );
}

// Compact editable row for tier parameters
function TierParamRow({ 
  param, 
  value, 
  onChange 
}: { 
  param: Parameter; 
  value: number; 
  onChange: (value: number) => void;
}) {
  const [inputValue, setInputValue] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  const handleFocus = () => {
    setIsEditing(true);
    setInputValue(String(value));
  };

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.min(param.max, Math.max(param.min, parsed));
      onChange(clamped);
      setInputValue(String(clamped));
    } else {
      setInputValue(String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setInputValue(String(value));
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-zinc-400 w-20 flex-shrink-0">
        {param.label.split(': ')[1]}
      </label>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(e) => {
          const newVal = parseFloat(e.target.value);
          onChange(newVal);
          setInputValue(String(newVal));
        }}
        className="flex-1"
      />
      <input
        type="text"
        value={isEditing ? inputValue : formatValue(param, value)}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="text-xs font-mono text-indigo-400 bg-transparent border-b border-transparent 
                   hover:border-zinc-600 focus:border-indigo-500 focus:outline-none 
                   text-right w-16 px-1 transition-colors cursor-text"
        title="Click to edit"
      />
    </div>
  );
}

type ParamTab = 'compute' | 'demand' | 'economic' | 'tiers';

const TAB_CONFIG: { id: ParamTab; label: string; icon: string; color: string; description?: string }[] = [
  { id: 'compute', label: 'Compute Supply', icon: '⚡', color: 'text-amber-400' },
  { id: 'demand', label: 'Labour Demand', icon: '📈', color: 'text-emerald-400', description: 'Total work is NOT fixed. Cheaper AI → more gets done (Jevons paradox). New AI capabilities create tasks that didn\'t exist.' },
  { id: 'economic', label: 'Costs', icon: '💰', color: 'text-blue-400' },
  { id: 'tiers', label: 'Task Types', icon: '📋', color: 'text-pink-400', description: 'Configure each tier: FLOPs, work share, σ (substitutability: start, max, midpoint year, steepness), human capability %, and wage multiplier.' },
];

export function ParameterControls({ values, onChange, onReset }: ParameterControlsProps) {
  const [activeTab, setActiveTab] = useState<ParamTab>('compute');
  
  // Calculate sensitivity for all parameters
  const sensitivityMap = useMemo(() => {
    const analysis = calculateSensitivities(values, values.year);
    const map: Record<string, { sensitivity: number; direction: 'positive' | 'negative' | 'neutral' }> = {};
    for (const s of analysis.sensitivities) {
      map[s.parameterId] = { sensitivity: s.sensitivity, direction: s.direction };
    }
    return map;
  }, [values]);
  
  // Group parameters by category (exclude 'year' - it has its own slider above tabs)
  const computeParams = parameters.filter(p => p.group === 'compute' && p.id !== 'year');
  const economicParams = parameters.filter(p => p.group === 'economic');
  const demandParams = parameters.filter(p => p.group === 'demand');
  const tierParams = parameters.filter(p => p.group === 'tiers');
  
  const getParamsForTab = (tab: ParamTab): Parameter[] => {
    switch (tab) {
      case 'compute': return computeParams;
      case 'demand': return demandParams;
      case 'economic': return economicParams;
      case 'tiers': return []; // Handled specially
    }
  };
  
  const activeParams = getParamsForTab(activeTab);
  const activeTabConfig = TAB_CONFIG.find(t => t.id === activeTab);
  
  // For tiers tab, group parameters by tier
  const getTierParamsGrouped = () => {
    return TIER_CONFIGS.map(tierConfig => ({
      tier: tierConfig,
      params: tierParams.filter(p => p.tier === tierConfig.id)
    }));
  };

  return (
    <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">Parameters</h2>
        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 
                     text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Reset All
        </button>
      </div>
      
      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg mb-4">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 px-2 py-2 text-xs font-medium rounded-md transition-all flex flex-col items-center gap-0.5
              ${activeTab === tab.id 
                ? `bg-zinc-800 ${tab.color} shadow-lg` 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab description */}
      {activeTabConfig?.description && (
        <p className="text-xs text-zinc-500 mb-4 pb-3 border-b border-zinc-800">
          {activeTabConfig.description}
        </p>
      )}
      
      {/* Parameters for active tab */}
      <div className="min-h-[300px]">
        {activeTab !== 'tiers' ? (
          activeParams.map(param => {
            const sens = sensitivityMap[param.id];
            return (
              <ParameterSlider
                key={param.id}
                param={param}
                value={values[param.id]}
                onChange={(v) => onChange(param.id, v)}
                sensitivity={sens?.sensitivity}
                sensitivityDirection={sens?.direction}
              />
            );
          })
        ) : (
          // Special rendering for tiers - grouped by tier with colored headers
          <div className="space-y-4">
            {getTierParamsGrouped().map(({ tier, params: tierParamsList }) => (
              <div key={tier.id} className="border border-zinc-800 rounded-lg overflow-hidden">
                <div 
                  className="px-3 py-2 flex items-center gap-2"
                  style={{ backgroundColor: `${tier.color}15` }}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                  <span className="text-sm font-medium text-zinc-200">{tier.name}</span>
                  <span className="text-xs text-zinc-500">— {tier.description}</span>
                </div>
                <div className="p-3 space-y-3">
                  {tierParamsList.map(param => (
                    <TierParamRow 
                      key={param.id}
                      param={param}
                      value={values[param.id]}
                      onChange={(v) => onChange(param.id, v)}
                    />
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-zinc-500 mt-2">
              Shares are normalized to sum to 100%. Adjust relative proportions.
            </p>
          </div>
        )}
      </div>
      
      {/* Legend for sensitivity bars */}
      <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
        <span>Sensitivity:</span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-emerald-500/70" /> ↑ human hrs
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-red-500/70" /> ↓ human hrs
        </span>
      </div>
      
      <div className="mt-3">
        <p className="text-xs text-zinc-600 leading-relaxed">
          Based on the economic framing from{' '}
          <a 
            href="https://x.com/sebkrier" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300"
          >
            Seb Krier
          </a>
          : compute constraints may keep it economical for humans to do some tasks at non-trivial wages.
        </p>
      </div>
    </div>
  );
}
