import { useState, useMemo, useEffect } from 'react';
import { ParameterControls } from './components/ParameterControls';
import { ComputeSupplyChart } from './components/ComputeSupplyChart';
import { TierCostChart } from './components/TierCostChart';
import { DemandDynamicsChart } from './components/DemandDynamicsChart';
import { SubstitutabilityChart } from './components/SubstitutabilityChart';
import { TaskAllocationChart } from './components/TaskAllocationChart';
import { SummaryPanel } from './components/SummaryPanel';
import { TierBreakdown } from './components/TierBreakdown';
import { SensitivityChart } from './components/SensitivityChart';
import { ComputeCostTab } from './components/ComputeCostTab';
import { Tabs } from './components/Tabs';
import { Collapsible } from './components/Collapsible';
import { OnboardingWizard } from './components/OnboardingWizard';
import { getDefaultValues } from './models/parameters';
import type { ParameterValues } from './models/parameters';
import { runModel } from './models/computeModel';
import { calculateSensitivities } from './models/sensitivity';

const ONBOARDING_KEY = 'ai-compute-onboarding-complete';

function App() {
  const [params, setParams] = useState<ParameterValues>(getDefaultValues());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [savedParams, setSavedParams] = useState<ParameterValues | null>(null);
  
  // Check localStorage on mount to show onboarding for first-time visitors
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, []);
  
  const handleOnboardingComplete = (newParams: Partial<ParameterValues>) => {
    // Merge user's choices with defaults (only defined values)
    setParams(prev => {
      const updated = { ...prev };
      for (const [key, value] of Object.entries(newParams)) {
        if (value !== undefined) {
          (updated as Record<string, number>)[key] = value;
        }
      }
      return updated;
    });
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };
  
  const handleOnboardingSkip = () => {
    // Keep defaults, mark as completed
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };
  
  const handleReopenOnboarding = () => {
    setShowOnboarding(true);
  };
  
  const handleParamChange = (id: string, value: number) => {
    setParams(prev => ({ ...prev, [id]: value }));
  };
  
  const handleReset = () => {
    setParams(getDefaultValues());
  };

  // Scenario presets (keep baseComputeExponent the same across all)
  const scenarios = [
    {
      id: 'optimistic',
      name: 'Optimistic',
      color: 'emerald',
      description: 'Low substitutability ceiling—AI assists but doesn\'t fully replace humans',
      explanation: `This scenario assumes AI hits fundamental limits in replacing human judgment, creativity, and social interaction. Even if AI becomes very capable at narrow tasks, it may never fully substitute for human work in most domains.

Key assumptions:
• Routine tasks cap at 70% substitutability—humans still needed for edge cases and oversight
• Complex/Expert tasks cap at 40-50%—AI augments but doesn't replace professionals  
• Frontier work (research, strategy) caps at 30%—fundamentally requires human insight
• Late breakthroughs (2030-2040)—technological progress is gradual

This reflects views that AGI is far off, or that even capable AI won't be trusted/accepted as a full replacement for human workers in most contexts.`,
      changes: {
        tier_routine_maxSigma: 0.7,
        tier_standard_maxSigma: 0.6,
        tier_complex_maxSigma: 0.5,
        tier_expert_maxSigma: 0.4,
        tier_frontier_maxSigma: 0.3,
        tier_routine_sigmaMidpoint: 2030,
        tier_standard_sigmaMidpoint: 2032,
        tier_complex_sigmaMidpoint: 2035,
        tier_expert_sigmaMidpoint: 2038,
        tier_frontier_sigmaMidpoint: 2042,
        tier_routine_sigmaSteepness: 0.8,
        tier_standard_sigmaSteepness: 0.7,
        tier_complex_sigmaSteepness: 0.6,
        tier_expert_sigmaSteepness: 0.5,
        tier_frontier_sigmaSteepness: 0.4,
      },
    },
    {
      id: 'pessimistic',
      name: 'High Substitutability',
      color: 'red',
      description: 'AI rapidly approaches near-perfect substitution across all tiers',
      explanation: `This scenario assumes AI capabilities advance rapidly and society quickly adopts AI as a near-complete replacement for human cognitive labor. Barriers like trust, regulation, and organizational inertia are overcome within years, not decades.

Key assumptions:
• Routine tasks reach 99% substitutability—fully automated with minimal oversight
• Standard/Complex tasks reach 95-97%—AI handles nearly all professional work
• Expert/Frontier tasks reach 85-90%—even research and strategy largely AI-driven
• Early breakthroughs (2025-2028)—rapid capability gains and adoption

This reflects views that transformative AI is imminent and that economic pressures will drive rapid automation regardless of social preferences. Human labor value could collapse within 10-15 years.`,
      changes: {
        tier_routine_maxSigma: 0.99,
        tier_standard_maxSigma: 0.97,
        tier_complex_maxSigma: 0.95,
        tier_expert_maxSigma: 0.90,
        tier_frontier_maxSigma: 0.85,
        tier_routine_sigmaMidpoint: 2025,
        tier_standard_sigmaMidpoint: 2026,
        tier_complex_sigmaMidpoint: 2027,
        tier_expert_sigmaMidpoint: 2028,
        tier_frontier_sigmaMidpoint: 2029,
        tier_routine_sigmaSteepness: 3,
        tier_standard_sigmaSteepness: 2.5,
        tier_complex_sigmaSteepness: 2,
        tier_expert_sigmaSteepness: 1.8,
        tier_frontier_sigmaSteepness: 1.5,
      },
    },
    {
      id: 'compute-constrained',
      name: 'Compute Constrained',
      color: 'amber',
      description: 'Higher compute requirements per task make capacity the bottleneck',
      explanation: `This scenario assumes AI tasks require even more compute than the (already realistic) default estimates—perhaps because real-world deployment needs extensive verification, or because frontier tasks require truly massive inference budgets.

Key assumptions:
• All tier FLOPs requirements increased by ~100x beyond defaults (e.g., routine: 10^15 → 10^18)
• Compute growth slowed to 50%/year (vs. 100% default)—supply chain constraints, energy limits
• Faster growth decay (8%/year)—exponential growth can't continue indefinitely

This makes raw compute capacity the binding constraint rather than cost or substitutability. Even if AI is cheap per FLOP, there simply isn't enough compute to do all the work. Human labor fills the gap.`,
      changes: {
        tier_routine_flops: 18,
        tier_standard_flops: 20,
        tier_complex_flops: 21,
        tier_expert_flops: 22,
        tier_frontier_flops: 24,
        computeGrowthRate: 0.5,
        computeGrowthDecay: 0.08,
      },
    },
    {
      id: 'high-demand',
      name: 'High Demand Growth',
      color: 'blue',
      description: 'AI enables lots of new work—total cognitive hours grow substantially',
      explanation: `This scenario assumes cheap AI dramatically expands what's economically feasible. As AI costs fall, entirely new categories of work emerge—things that weren't worth doing when they required expensive human labor.

Key assumptions:
• High demand elasticity (0.6)—strong Jevons paradox effect; cheaper AI → much more AI use
• High new task creation (0.15)—AI enables personalized education, ubiquitous assistants, mass customization
• Higher baseline growth (4%/year)—AI-augmented economy grows faster

In this world, total cognitive work hours might 2-3x even as AI does most of it. Humans may do fewer hours but remain employed because there's so much more work to do. Wages could remain stable even with high substitutability.`,
      changes: {
        demandElasticity: 0.6,
        newTaskCreationRate: 0.15,
        baselineDemandGrowth: 0.04,
      },
    },
    {
      id: 'slow-progress',
      name: 'Slow AI Progress',
      color: 'zinc',
      description: 'Algorithmic efficiency gains and cost declines slow down',
      explanation: `This scenario assumes AI progress decelerates from current rates. Perhaps the low-hanging fruit has been picked, or scaling laws hit diminishing returns. AI still improves, but more slowly than optimists expect.

Key assumptions:
• Efficiency gains drop to 1.3x/year (vs. 2x default)—algorithmic improvements slow
• Faster efficiency decay (12%/year)—gains get harder over time
• Cost decline slows to 15%/year (vs. 25%)—hardware improvements plateau
• Late breakthroughs (2032-2045)—capability gains take longer to translate to deployable substitution

This extends the timeline for AI disruption by 10-20 years. Humans have more time to adapt, retrain, and find new niches. Compute constraints may also become more binding as supply grows faster than efficiency.`,
      changes: {
        efficiencyImprovement: 1.3,
        efficiencyDecay: 0.12,
        costDeclineRate: 0.15,
        costDeclineDecay: 0.10,
        tier_routine_sigmaMidpoint: 2032,
        tier_standard_sigmaMidpoint: 2035,
        tier_complex_sigmaMidpoint: 2038,
        tier_expert_sigmaMidpoint: 2042,
        tier_frontier_sigmaMidpoint: 2048,
        tier_routine_sigmaSteepness: 0.6,
        tier_standard_sigmaSteepness: 0.5,
        tier_complex_sigmaSteepness: 0.4,
        tier_expert_sigmaSteepness: 0.4,
        tier_frontier_sigmaSteepness: 0.3,
      },
    },
  ];

  const applyScenario = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    // Start from defaults, then apply scenario changes (keeping baseComputeExponent)
    const defaults = getDefaultValues();
    const newParams = { ...defaults };
    for (const [key, value] of Object.entries(scenario.changes)) {
      (newParams as Record<string, number>)[key] = value;
    }
    setParams(newParams);
  };
  
  // Run the model with current parameters
  const modelOutputs = useMemo(() => runModel(params), [params]);
  
  // Calculate sensitivity analysis
  const sensitivityAnalysis = useMemo(() => 
    calculateSensitivities(params, params.year), [params]);
  
  const targetProjection = modelOutputs.projections.find(p => p.year === params.year);

  // Define tabs for the main content area
  const tabs = [
    {
      id: 'intro',
      label: 'Introduction',
      icon: '👋',
      content: (
        <div className="bg-[#12121a] rounded-xl p-6 border border-zinc-800 space-y-6">
          {/* Hero */}
          <div className="text-center pb-4 border-b border-zinc-800">
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">
              Will AI Make Human Labor Worthless?
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              This calculator lets you explore different scenarios for how AI automation affects human wages and employment over time.
            </p>
          </div>

          {/* The Debate */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-emerald-950/20 rounded-lg p-4 border border-emerald-900/30">
              <p className="text-emerald-400 mb-2">🟢 Optimistic View</p>
              <p className="text-sm text-zinc-400">
                "Compute is limited. Even if AI is cheaper per task, there may not be enough compute to do all cognitive work. 
                Humans could retain valuable niches."
              </p>
            </div>
            <div className="bg-red-950/20 rounded-lg p-4 border border-red-900/30">
              <p className="text-red-400 mb-2">🔴 Pessimistic View</p>
              <p className="text-sm text-zinc-400">
                "AI is getting cheaper faster than compute is growing. If substitutability approaches 100%, 
                human labor could lose most of its economic value."
              </p>
            </div>
          </div>

          {/* How the Model Works */}
          <div>
            <h3 className="text-lg text-zinc-100 mb-3">How the Model Works</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <p className="text-amber-400 mb-2">1. Supply</p>
                <p className="text-zinc-400">
                  Global AI compute grows over time. Algorithmic efficiency multiplies effective capacity.
                </p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <p className="text-amber-400 mb-2">2. Demand</p>
                <p className="text-zinc-400">
                  Cognitive work is split into 5 tiers (Routine → Frontier). AI costs vary by task difficulty.
                </p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <p className="text-amber-400 mb-2">3. Substitution</p>
                <p className="text-zinc-400">
                  σ (substitutability) limits how much AI can replace humans—even when cheaper.
                </p>
              </div>
            </div>
          </div>

          {/* What to Explore */}
          <div className="bg-indigo-950/30 rounded-lg p-4 border border-indigo-900/40">
            <p className="text-indigo-300 mb-2">🔍 What to Explore</p>
            <p className="text-sm text-zinc-400">
              The model suggests that with current defaults, substitutability (σ) may matter more than raw compute availability—but 
              this depends heavily on your assumptions. Try adjusting parameters to see which factors dominate under different scenarios.
            </p>
          </div>

          {/* How to Use */}
          <div>
            <h3 className="text-lg text-zinc-100 mb-3">How to Use This Tool</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="text-zinc-300">🎛️ Adjust Parameters (left sidebar)</p>
                <ul className="list-disc list-inside text-zinc-400 space-y-1 ml-2">
                  <li>Compute: Base capacity, growth rate, efficiency gains</li>
                  <li>Demand: Elasticity, new task creation</li>
                  <li>Costs: $/exaFLOP, human wage floor</li>
                  <li>Tiers: Per-tier σ, FLOPs, human capability</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-zinc-300">📊 Explore Results (tabs above)</p>
                <ul className="list-disc list-inside text-zinc-400 space-y-1 ml-2">
                  <li>Summary: Key metrics for selected year</li>
                  <li>Task Tiers: Per-tier breakdown of AI vs human work</li>
                  <li>Charts: Time series of all model outputs</li>
                  <li>Model Info: Parameter sources and methodology</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Experiments */}
          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-300">🧪 Try These Experiments</p>
              {savedParams && (
                <button
                  onClick={() => {
                    setParams(savedParams);
                    setSavedParams(null);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                >
                  ↩ Restore my assumptions
                </button>
              )}
            </div>
            <p className="text-zinc-600 text-xs mb-3">Clicking these will reset all parameters to defaults, then apply the experiment.</p>
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <button
                onClick={() => {
                  setSavedParams(params);
                  setParams({
                    ...getDefaultValues(),
                    tier_routine_maxSigma: 0.6,
                    tier_standard_maxSigma: 0.6,
                    tier_complex_maxSigma: 0.6,
                    tier_expert_maxSigma: 0.6,
                    tier_frontier_maxSigma: 0.6,
                  });
                }}
                className="bg-zinc-900/50 rounded p-3 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-950/20 transition-all text-left cursor-pointer"
              >
                <p className="text-emerald-400">Optimist scenario</p>
                <p className="text-zinc-500">Set σ max to 0.6 for all task tiers. Human share stays high even in 2050.</p>
              </button>
              <button
                onClick={() => {
                  setSavedParams(params);
                  setParams({
                    ...getDefaultValues(),
                    tier_routine_maxSigma: 1,
                    tier_standard_maxSigma: 1,
                    tier_complex_maxSigma: 1,
                    tier_expert_maxSigma: 1,
                    tier_frontier_maxSigma: 1,
                    tier_routine_sigmaMidpoint: 2026,
                    tier_standard_sigmaMidpoint: 2026,
                    tier_complex_sigmaMidpoint: 2026,
                    tier_expert_sigmaMidpoint: 2026,
                    tier_frontier_sigmaMidpoint: 2026,
                    tier_routine_sigmaSteepness: 3,
                    tier_standard_sigmaSteepness: 3,
                    tier_complex_sigmaSteepness: 3,
                    tier_expert_sigmaSteepness: 3,
                    tier_frontier_sigmaSteepness: 3,
                  });
                }}
                className="bg-zinc-900/50 rounded p-3 border border-zinc-800 hover:border-red-500/50 hover:bg-red-950/20 transition-all text-left cursor-pointer"
              >
                <p className="text-red-400">Pessimist scenario</p>
                <p className="text-zinc-500">Set σ max to 1, midpoint to 2026, steepness to 3. Human wages and employment fall sharply.</p>
              </button>
              <button
                onClick={() => {
                  setSavedParams(params);
                  setParams({
                    ...getDefaultValues(),
                    tier_routine_flops: 18,
                    tier_standard_flops: 20,
                    tier_complex_flops: 21,
                    tier_expert_flops: 22,
                    tier_frontier_flops: 23,
                  });
                }}
                className="bg-zinc-900/50 rounded p-3 border border-zinc-800 hover:border-amber-500/50 hover:bg-amber-950/20 transition-all text-left cursor-pointer"
              >
                <p className="text-amber-400">Compute-constrained</p>
                <p className="text-zinc-500">Raise FLOPs/hr by +3 OOM. Compute becomes the binding constraint even at low σ.</p>
              </button>
            </div>
          </div>

          {/* Footnote */}
          <p className="text-xs text-zinc-600 pt-4 border-t border-zinc-800/50">
            This tool was inspired by a{' '}
            <a 
              href="https://x.com/CharlesD353/status/2005592245232452079" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-400 underline"
            >
              debate between @CharlesD353 and @SebKrier
            </a>
            {' '}on whether compute limitations will preserve human labor value.
          </p>
        </div>
      ),
    },
    {
      id: 'summary',
      label: 'Summary',
      icon: '📊',
      content: <SummaryPanel outputs={modelOutputs} params={params} />,
    },
    {
      id: 'compute-costs',
      label: 'Compute Costs',
      icon: '💰',
      content: targetProjection && (
        <ComputeCostTab projection={targetProjection} params={params} />
      ),
    },
    {
      id: 'tiers',
      label: 'Task Tiers',
      icon: '📋',
      content: targetProjection && (
        <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">
            Task Tier Breakdown for {params.year}
          </h3>
          <TierBreakdown 
            tierAllocations={targetProjection.tierAllocations}
            year={params.year}
          />
        </div>
      ),
    },
    {
      id: 'charts',
      label: 'Charts',
      icon: '📈',
      content: (
        <div className="space-y-6">
          <DemandDynamicsChart
            projections={modelOutputs.projections}
            targetYear={params.year}
          />
          <TaskAllocationChart
            projections={modelOutputs.projections}
            targetYear={params.year}
          />
          <TierCostChart
            projections={modelOutputs.projections}
            targetYear={params.year}
            humanWageFloor={params.humanWageFloor}
          />
          <SubstitutabilityChart
            projections={modelOutputs.projections}
            targetYear={params.year}
          />
          <ComputeSupplyChart
            projections={modelOutputs.projections}
            targetYear={params.year}
          />
          <SensitivityChart analysis={sensitivityAnalysis} />
        </div>
      ),
    },
    {
      id: 'model',
      label: 'Model Info',
      icon: 'ℹ️',
      content: (
        <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800 space-y-6">
          {/* Tier explanations */}
          <div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Tiered Task Model
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              Instead of assuming all cognitive work requires the same compute, this model
              divides work into <strong className="text-zinc-200">{modelOutputs.tiers.length} difficulty tiers</strong>:
            </p>
            <div className="space-y-2">
              {modelOutputs.tiers.map((tier) => (
                <div 
                  key={tier.id}
                  className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-lg"
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: tier.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-200 font-medium">{tier.name}</span>
                      <span className="text-xs text-zinc-500">
                        {(tier.shareOfCognitive * 100).toFixed(0)}% of work • 10^{tier.flopsPerHourExponent} FLOPs/hr • σ (sub): {(tier.initialSigma * 100).toFixed(0)}%→{(tier.maxSigma * 100).toFixed(0)}% • {(tier.humanCapable * 100).toFixed(0)}% can do • {tier.wageMultiplier}× wage
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{tier.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 pt-4 border-t border-zinc-800 mt-4">
              Each tier is evaluated independently: AI takes over tasks where it's cheaper 
              (vs tier-specific wage) AND substitutability allows AND compute is available 
              AND human capacity is sufficient. If skilled workers are scarce, AI fills the 
              gap even at higher cost. This produces realistic stratified automation.
            </p>
          </div>
          
          {/* Default sources */}
          <div className="border-t border-zinc-800 pt-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Where Do the Defaults Come From?
            </h3>
            
            {/* Cognitive Labor Baseline - NEW */}
            <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-indigo-300 mb-2">📊 Cognitive Labor Baseline</h4>
              <div className="text-xs text-zinc-400 space-y-1">
                <div className="flex justify-between border-b border-zinc-800 pb-1">
                  <span>Global workforce</span>
                  <span className="text-zinc-300">3.4 billion</span>
                  <span className="text-indigo-400">ILO ILOSTAT 2023</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-1">
                  <span>Avg hours/worker/year</span>
                  <span className="text-zinc-300">~1,800</span>
                  <span className="text-indigo-400">OECD 2023</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-1">
                  <span>Total global work hours</span>
                  <span className="text-zinc-300">~6.1 trillion/year</span>
                  <span className="text-zinc-500">Derived</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-1">
                  <span>Cognitive work share</span>
                  <span className="text-zinc-300">~40%</span>
                  <span className="text-indigo-400">McKinsey 2017</span>
                </div>
                <div className="flex justify-between pt-1 font-medium">
                  <span className="text-zinc-200">Cognitive hours/year</span>
                  <span className="text-amber-400">~2.4 trillion</span>
                  <span className="text-zinc-500">Derived</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                McKinsey Global Institute estimates 35-50% of work time involves "cognitive" tasks 
                (data processing, expertise application, stakeholder interaction). Adjustable via the 
                Cognitive Work Share parameter.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-500">
              <div className="space-y-2">
                <h4 className="text-zinc-400 font-medium">Compute Supply (2024)</h4>
                <ul className="space-y-1 list-disc list-inside ml-1">
                  <li><strong className="text-zinc-300">Base compute: 10^21.7 FLOP/s</strong> — Epoch AI estimates ~5×10^21 FLOP/s of global AI inference capacity</li>
                  <li><strong className="text-zinc-300">Growth: 100%/year (2×)</strong> — Inference capacity historically grows 2-3× annually</li>
                  <li><strong className="text-zinc-300">Efficiency: 2×/year</strong> — Algorithmic efficiency doubles annually</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-zinc-400 font-medium">Economics</h4>
                <ul className="space-y-1 list-disc list-inside ml-1">
                  <li><strong className="text-zinc-300">Cost: $1/exaFLOP</strong> — Based on cloud provider pricing (Dec 2024)</li>
                  <li><strong className="text-zinc-300">Cost decline: 30%/year</strong> — Historical GPU price/performance trend</li>
                  <li><strong className="text-zinc-300">Wage floor: $15/hr</strong> — Base wage, multiplied per tier (Routine 1×, Standard 1.5×, Complex 2×, Expert 3×, Frontier 6×)</li>
                </ul>
              </div>
            </div>
            
            {/* AI Utilization - Hidden Constant */}
            <div className="bg-amber-950/30 border border-amber-900/40 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-medium text-amber-300 mb-2">⚠️ Hidden Constant: AI Utilization (30%)</h4>
              <p className="text-xs text-zinc-400 mb-2">
                Only <strong className="text-amber-400">30% of global AI compute</strong> is assumed to go to cognitive work that competes with human labor. 
                The rest goes to:
              </p>
              <ul className="text-xs text-zinc-500 list-disc list-inside ml-1 space-y-1">
                <li><strong className="text-zinc-300">Training</strong> — Large model training runs consume significant compute</li>
                <li><strong className="text-zinc-300">Non-cognitive inference</strong> — Recommender systems, video/image generation, ads ranking</li>
                <li><strong className="text-zinc-300">Tasks without human equivalents</strong> — Protein folding, game AI, robotics control</li>
              </ul>
              <p className="text-xs text-zinc-500 mt-2">
                This 30% figure strongly affects compute scarcity outcomes. If you believe more compute goes to cognitive work, 
                the model would show less scarcity. This constant is not adjustable in the UI.
              </p>
            </div>
            
            {/* Declining Growth Rates - NEW */}
            <div className="pt-4 border-t border-zinc-800 mt-4 text-xs text-zinc-500">
              <h4 className="text-zinc-400 font-medium mb-2">Declining Growth Rates — Why Exponentials Can't Last</h4>
              <p className="mb-2">
                Perpetual exponential growth is unrealistic. Moore's Law is slowing, algorithmic breakthroughs get harder as 
                low-hanging fruit is picked, and cost optimizations plateau. The model supports <strong className="text-amber-400">declining growth rates</strong>:
              </p>
              <div className="bg-zinc-800/50 rounded p-2 my-2 font-mono text-xs">
                rate(year) = initialRate × (1 - decay)^years
              </div>
              <p className="mb-2">
                <strong>Example:</strong> 100%/year compute growth with 5% decay:
                Year 1: +100% → Year 5: +77% → Year 10: +60% → Year 20: +36%.
                By 2044, compute is ~150× (not 1,000×) of 2024.
              </p>
              <ul className="space-y-1 list-disc list-inside ml-1">
                <li><strong className="text-zinc-300">Compute Growth Slowdown (10%)</strong> — Hardware scaling gets harder each generation</li>
                <li><strong className="text-zinc-300">Efficiency Gain Slowdown (8%)</strong> — Algorithmic improvements have diminishing returns faster</li>
                <li><strong className="text-zinc-300">Cost Decline Slowdown (5%)</strong> — Manufacturing optimizations plateau</li>
              </ul>
              <p className="mt-2 text-amber-400/80">
                Set all decay params to 0 to restore constant exponential growth (original behavior).
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-800 mt-4 text-xs text-zinc-500">
              <h4 className="text-zinc-400 font-medium mb-2">Substitutability (σ) — S-Curve Growth + Deployment Lag</h4>
              <p className="mb-2">
                AI capabilities often develop in breakthroughs, not smooth curves. Each tier uses an <strong className="text-zinc-300">S-curve (sigmoid)</strong> model 
                with a <strong className="text-zinc-300">midpoint year</strong> (when the breakthrough happens), <strong className="text-zinc-300">steepness</strong> (how rapid the transition),
                and <strong className="text-zinc-300">deployment lag</strong> (years between "AI can do it" and "AI is doing it"):
              </p>
              <div className="space-y-1 mb-2">
                {modelOutputs.tiers.map((tier) => (
                  <div key={tier.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tier.color }} />
                    <span className="text-zinc-300 w-16">{tier.name}</span>
                    <span className="text-zinc-500">
                      {(tier.initialSigma * 100).toFixed(0)}%→{(tier.maxSigma * 100).toFixed(0)}%, 
                      breakthrough ~{tier.sigmaMidpoint}, 
                      steepness {tier.sigmaSteepness},
                      lag {tier.deploymentLag}yr
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-zinc-500 mb-2">
                <strong className="text-amber-400">Key insight:</strong> Move the midpoint later to model "AI can't do this yet, but eventually will." 
                Steepness controls transition speed — use low values for gradual adoption even if capabilities arrive quickly.
              </p>
              <p className="text-zinc-500">
                <strong className="text-cyan-400">Deployment Lag:</strong> Separates technical capability from real-world deployment. 
                Even when AI <em>can</em> do a task, regulatory approval, organizational change, integration work, and trust-building 
                delay actual adoption. σ_effective(year) = σ_possible(year - lag).
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-800 mt-4 text-xs text-zinc-500">
              <h4 className="text-zinc-400 font-medium mb-2">Demand Dynamics — Why Total Work Isn't Fixed</h4>
              <div className="space-y-2">
                <p>
                  <strong className="text-emerald-400">Baseline Growth:</strong> Cognitive work grows with GDP/population (~3%/year historically).
                </p>
                <p>
                  <strong className="text-emerald-400">Demand Elasticity (Jevons Paradox):</strong> When AI makes tasks cheaper, 
                  we do <em>more</em> of them, not the same amount. A report that took 10 hours now takes 1? 
                  Organizations don't cut report-writing by 90%—they commission 5× more reports.
                </p>
                
                {/* Log-based demand elasticity explanation */}
                <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-lg p-3 mt-2">
                  <p className="text-indigo-300 font-medium mb-1">📐 Technical Note: Log-Based Elasticity</p>
                  <p className="text-zinc-400 mb-2">
                    The "Demand Elasticity" parameter uses a <strong className="text-zinc-300">log-based</strong> form, 
                    not a standard isoelastic demand curve:
                  </p>
                  <div className="bg-zinc-950 p-2 rounded font-mono text-xs text-emerald-400 mb-2">
                    multiplier = 1 + ε × log₁₀(1 / costReductionFactor)
                  </div>
                  <p className="text-zinc-500 text-xs mb-1">
                    <strong>Example (ε = 0.5):</strong> 
                    50% cost drop → 1.15× demand. 
                    90% cost drop → 1.50× demand. 
                    99% cost drop → 2.00× demand.
                  </p>
                  <p className="text-zinc-500 text-xs">
                    This means the <em>effective</em> elasticity <strong className="text-amber-400">accelerates</strong> as AI gets very cheap — 
                    intentionally modeling an accelerating Jevons effect. Think of it as a "Jevons coefficient" rather than a standard elasticity.
                  </p>
                </div>
                
                <p>
                  <strong className="text-emerald-400">New Task Creation:</strong> AI enables entirely new categories 
                  of work that were previously impossible or uneconomical.
                </p>
                <div className="bg-zinc-800/50 rounded p-2 my-2 font-mono text-xs">
                  multiplier = 1 + (rate × σ_growth × years)
                </div>
                <p className="text-zinc-400 text-xs mb-2">
                  <strong>Example:</strong> If avg σ grows from 0.30→0.55 over 6 years (growth=0.25), 
                  with rate=0.1: multiplier = 1 + (0.1 × 0.25 × 6) = <strong className="text-emerald-400">1.15</strong> (15% more work).
                </p>
                <ul className="list-disc list-inside ml-2 space-y-1 text-zinc-500 text-xs">
                  <li><strong className="text-zinc-300">rate = 0</strong> — AI only automates existing work, no new categories</li>
                  <li><strong className="text-zinc-300">rate = 0.1</strong> — Modest new work (personalized tutoring, real-time translation)</li>
                  <li><strong className="text-zinc-300">rate = 0.3+</strong> — AI creates major new industries (like internet → e-commerce)</li>
                </ul>
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-800 mt-4 text-xs text-zinc-500">
              <h4 className="text-zinc-400 font-medium mb-2">Human Capacity & Wage Multipliers</h4>
              <p className="mb-2">
                Not everyone can do every type of cognitive work. Each tier has a <strong className="text-zinc-300">Human %</strong> 
                (what fraction of the workforce can perform it) and a <strong className="text-zinc-300">Wage ×</strong> 
                (reflecting skill scarcity):
              </p>
              <div className="grid grid-cols-5 gap-2 text-center">
                {modelOutputs.tiers.map(tier => (
                  <div key={tier.id} className="bg-zinc-900/50 rounded p-2">
                    <p className="font-medium" style={{ color: tier.color }}>{tier.name}</p>
                    <p className="text-zinc-400">{(tier.humanCapable * 100).toFixed(0)}% can do</p>
                    <p className="text-zinc-400">{tier.wageMultiplier}× wage</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-zinc-500">
                If demand exceeds human capacity for a tier, "Human Capacity" becomes the binding constraint—AI 
                must fill the gap even if other factors would favor humans.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-800 mt-4 text-xs text-zinc-500">
              <h4 className="text-zinc-400 font-medium mb-2">Equilibrium Wages — Dynamic Supply/Demand</h4>
              <p className="mb-2">
                Wages are not fixed multipliers of the floor—they respond to <strong className="text-zinc-300">labor market tightness</strong>:
              </p>
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 mb-2 font-mono text-center">
                wage = floor × multiplier × tightness<sup>elasticity</sup>
              </div>
              <p className="mb-2">
                <strong className="text-zinc-300">Tightness</strong> = demand / effective supply. When demand exceeds supply, wages rise.
                <strong className="text-zinc-300"> Elasticity</strong> controls sensitivity (0.3 for Routine, 1.5 for Frontier).
              </p>
              <p className="mb-2">
                <strong className="text-amber-400">Wage ceiling:</strong> Wages cannot exceed <strong className="text-zinc-300">Task Value</strong> (max $/hr 
                employers will pay). If wages hit the ceiling, some work doesn't get done.
              </p>
              <p className="mb-2">
                <strong className="text-violet-400">Inter-tier mobility:</strong> Workers flow between tiers:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong className="text-zinc-300">Displacement:</strong> Workers automated out of tier j flow to lower tiers</li>
                <li><strong className="text-zinc-300">Voluntary:</strong> If tier i pays &gt;80% of tier j wage, j-workers substitute down</li>
              </ul>
              <p className="mt-2 text-zinc-400">
                This creates cascades: automating Expert work pushes displaced workers into Complex/Standard, 
                potentially depressing wages even in tiers AI hasn't touched.
              </p>
            </div>
            <p className="pt-4 text-xs text-zinc-500">
              <strong className="text-zinc-400">Primary sources:</strong>{' '}
              <a href="https://ilostat.ilo.org/topics/employment/" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener">
                ILO ILOSTAT
              </a>,{' '}
              <a href="https://data.oecd.org/emp/hours-worked.htm" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener">
                OECD Hours Worked
              </a>,{' '}
              <a href="https://www.mckinsey.com/featured-insights/future-of-work/jobs-lost-jobs-gained-what-the-future-of-work-will-mean-for-jobs-skills-and-wages" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener">
                McKinsey Future of Work
              </a>,{' '}
              <a href="https://epochai.org/trends" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener">
                Epoch AI Trends
              </a>,{' '}
              <a href="https://epochai.org/blog/algorithmic-progress-in-language-models" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener">
                Algorithmic Progress
              </a>.
            </p>
          </div>
          
          {/* Methodology */}
          <div className="border-t border-zinc-800 pt-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Methodology & Limitations
            </h3>
            <div className="text-xs text-zinc-500 space-y-2">
              <p>
                This is a simplified model for exploring economic intuitions, not a precise forecast. 
                Key simplifications:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Task tiers are rough categories—real work is more heterogeneous</li>
                <li>Substitutability is modeled per-tier, but real tasks vary within tiers</li>
                <li>Compute growth rates are extrapolations, not predictions</li>
                <li>Doesn't model physical tasks, regulation, or preference for human services</li>
                <li>Assumes compute is fungible across all AI tasks</li>
              </ul>
              <p className="pt-2 text-amber-400/80">
                <strong>Key takeaway:</strong> The model shows that with realistic 2024 numbers and 
                historical growth rates, compute scarcity is unlikely to be the binding constraint 
                for most tasks—substitutability and task difficulty are more important.
              </p>
            </div>
          </div>
          
          {/* Parameter Reference */}
          <div className="border-t border-zinc-800 pt-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Parameter Reference (with Units)
            </h3>
            
            {/* Tier Parameters */}
            <div className="mb-6">
              <h4 className="text-zinc-300 font-medium mb-3">📋 Tier Parameters</h4>
              <div className="text-xs text-zinc-500 space-y-4">
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">FLOPs/hr <span className="text-zinc-500 font-normal">(unit: exponent, e.g. "14" means 10¹⁴)</span></p>
                  <p>
                    The compute required for AI to perform one hour of cognitive work in this tier, expressed as a power of 10. 
                    For example, FLOPs/hr = 14 means 10¹⁴ = 100 trillion FLOPs per hour. 
                    Routine tasks (email drafts) require ~10¹² FLOPs/hr, while frontier tasks (novel research) 
                    might require 10²⁰ FLOPs/hr—<strong className="text-zinc-300">8 orders of magnitude</strong> difference.
                  </p>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Work Share <span className="text-zinc-500 font-normal">(unit: percentage, 0-100%)</span></p>
                  <p>
                    What fraction of total global cognitive work falls into this tier. 
                    Shares are normalized to sum to 100%. Default: Routine 25%, Standard 35%, Complex 25%, Expert 12%, Frontier 3%. 
                    Adjusting these changes how much "easy" vs "hard" cognitive work exists in the economy.
                  </p>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">σ (substitutability, 2024) <span className="text-zinc-500 font-normal">(unit: ratio, 0.0-1.0)</span></p>
                  <p>
                    <strong>σ = substitutability</strong> — how replaceable humans are by AI (0=AI can't replace humans, 1=perfect substitutes). 
                    This is the starting value in 2024. 
                    Example: Routine tasks start at σ=0.5 (50% substitutable), Frontier at σ=0.02 (2%).
                  </p>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">σ (max) <span className="text-zinc-500 font-normal">(unit: ratio, 0.0-1.0)</span></p>
                  <p>
                    <strong>Asymptotic maximum substitutability</strong> — the highest σ this tier can ever reach, even with infinite time. 
                    σ(max) &lt; 1 means some work in this tier will <em>always</em> require humans (trust, creativity, regulation, etc.). 
                    Example: Routine can reach 95%, but Frontier caps at 15%.
                  </p>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">σ Midpoint <span className="text-zinc-500 font-normal">(unit: year, 2024-2050)</span></p>
                  <p>
                    <strong>The "breakthrough" year</strong> — when σ reaches halfway between initial and max. 
                    This is when AI capabilities for this tier cross a threshold and adoption accelerates.
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-emerald-400">Routine: 2026</strong> — already happening, rapid adoption</li>
                    <li><strong className="text-blue-400">Standard: 2027</strong> — knowledge work breakthrough imminent</li>
                    <li><strong className="text-violet-400">Complex: 2029</strong> — complex reasoning a few years out</li>
                    <li><strong className="text-orange-400">Expert: 2032</strong> — expert judgment takes longer</li>
                    <li><strong className="text-red-400">Frontier: 2035</strong> — breakthrough innovation hardest to crack</li>
                  </ul>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">σ Steepness <span className="text-zinc-500 font-normal">(unit: 0.3-5)</span></p>
                  <p>
                    <strong>How rapid the S-curve transition</strong> — controls whether capability growth is gradual or sudden.
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-zinc-300">0.5</strong> — very gradual (~10 year spread)</li>
                    <li><strong className="text-zinc-300">1.0</strong> — moderate (~5 year spread)</li>
                    <li><strong className="text-zinc-300">2.0</strong> — fairly sharp (~2-3 year spread)</li>
                    <li><strong className="text-zinc-300">3.0+</strong> — step-like (~1 year, sudden capability jump)</li>
                  </ul>
                </div>
                
                <div className="bg-cyan-950/30 rounded-lg p-3 border border-cyan-900/40">
                  <p className="text-cyan-300 font-medium mb-1">Deployment Lag <span className="text-zinc-500 font-normal">(unit: years, 0-10)</span></p>
                  <p>
                    <strong>Years between "AI can do it" and "AI is doing it"</strong> — separates technical capability from real-world deployment.
                  </p>
                  <p className="mt-2 text-zinc-400">
                    <strong>σ_effective(year) = σ_possible(year - lag)</strong>
                  </p>
                  <p className="mt-2 text-zinc-400">
                    Even when AI <em>can</em> perform a task, adoption is delayed by:
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Regulatory approval and compliance</li>
                    <li>Organizational change management</li>
                    <li>Integration and tooling development</li>
                    <li>Trust-building and risk assessment</li>
                  </ul>
                  <p className="mt-2 text-zinc-400">
                    <strong className="text-amber-400">Defaults:</strong> Routine/Standard/Complex: 2yr, Expert: 3yr, Frontier: 1yr 
                    (frontier may deploy faster due to competitive pressure).
                  </p>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Human % <span className="text-zinc-500 font-normal">(unit: percentage, 1-100%)</span></p>
                  <p>
                    <strong>Human capability bound</strong> — what fraction of the workforce is capable of performing this tier's tasks.
                    Not everyone can do expert-level work.
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-zinc-300">Routine 90%</strong> — most workers can handle basic tasks</li>
                    <li><strong className="text-zinc-300">Standard 65%</strong> — many workers can do knowledge work</li>
                    <li><strong className="text-zinc-300">Complex 35%</strong> — fewer workers handle complex analysis</li>
                    <li><strong className="text-zinc-300">Expert 12%</strong> — small fraction can do expert work</li>
                    <li><strong className="text-zinc-300">Frontier 3%</strong> — very few can do breakthrough innovation</li>
                  </ul>
                  <p className="mt-2 text-zinc-400">
                    If human capacity is insufficient for demand, AI must fill the gap (even if expensive), 
                    triggering "Human Capacity" as the binding constraint.
                  </p>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Wage × <span className="text-zinc-500 font-normal">(unit: multiplier, 1.0-20.0×)</span></p>
                  <p>
                    <strong>Base wage multiplier</strong> — the minimum wage for this tier relative to the floor.
                    This is the starting point before supply/demand equilibrium is calculated.
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-zinc-300">Routine 1.0×</strong> = minimum $15/hr (at $15 floor)</li>
                    <li><strong className="text-zinc-300">Standard 1.5×</strong> = minimum $22.50/hr</li>
                    <li><strong className="text-zinc-300">Complex 2.0×</strong> = minimum $30/hr</li>
                    <li><strong className="text-zinc-300">Expert 3.0×</strong> = minimum $45/hr</li>
                    <li><strong className="text-zinc-300">Frontier 6.0×</strong> = minimum $90/hr</li>
                  </ul>
                  <p className="mt-2 text-zinc-400">
                    Actual wages may exceed these minimums based on labor market tightness (see below).
                  </p>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Task Value <span className="text-zinc-500 font-normal">(unit: $/hr)</span></p>
                  <p>
                    <strong>Wage ceiling</strong> — the maximum employers will pay for one hour of this tier's work.
                    Wages cannot exceed this value (work doesn't get done if costs exceed value).
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-zinc-300">Routine $30/hr</strong> — low-value work has low ceiling</li>
                    <li><strong className="text-zinc-300">Standard $60/hr</strong></li>
                    <li><strong className="text-zinc-300">Complex $150/hr</strong></li>
                    <li><strong className="text-zinc-300">Expert $400/hr</strong></li>
                    <li><strong className="text-zinc-300">Frontier $1000/hr</strong> — breakthrough work is highly valued</li>
                  </ul>
                  <p className="mt-2 text-zinc-400">
                    If equilibrium wage hits the ceiling (⚠ indicator), demand destruction occurs.
                  </p>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Wage ε <span className="text-zinc-500 font-normal">(unit: elasticity, 0.1-2.0)</span></p>
                  <p>
                    <strong>Wage elasticity</strong> — how sensitive wages are to labor market tightness.
                    Higher elasticity = wages spike faster when workers are scarce.
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-zinc-300">Routine 0.3</strong> — large labor pool, wages rise slowly</li>
                    <li><strong className="text-zinc-300">Standard 0.5</strong></li>
                    <li><strong className="text-zinc-300">Complex 0.8</strong></li>
                    <li><strong className="text-zinc-300">Expert 1.2</strong></li>
                    <li><strong className="text-zinc-300">Frontier 1.5</strong> — tiny talent pool, wages jump quickly</li>
                  </ul>
                  <p className="mt-2 text-zinc-400">
                    Formula: wage = floor × multiplier × tightness<sup>ε</sup>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Compute Parameters */}
            <div className="mb-6">
              <h4 className="text-zinc-300 font-medium mb-3">⚡ Compute Parameters</h4>
              <div className="text-xs text-zinc-500 space-y-3">
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Base Compute (2024) <span className="text-zinc-500 font-normal">(unit: FLOP/s, exponent)</span></p>
                  <p>
                    Total global AI inference compute capacity in 2024, as exponent of 10. 
                    Default 21.7 means 10^21.7 ≈ 5×10²¹ FLOP/s. Source: Epoch AI.
                  </p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Annual Compute Growth <span className="text-zinc-500 font-normal">(unit: %/year)</span></p>
                  <p>
                    Year-over-year growth in global AI inference capacity. 
                    100% = doubles each year (2× growth). Historical: 2-3× per year.
                  </p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Algorithmic Efficiency <span className="text-zinc-500 font-normal">(unit: ×/year)</span></p>
                  <p>
                    Annual improvement in how much capability you get per FLOP. 
                    2.0× means the same task requires half the FLOPs next year. 
                    Compounds with compute growth to give "effective compute."
                  </p>
                </div>
              </div>
            </div>
            
            {/* Economic Parameters */}
            <div className="mb-6">
              <h4 className="text-zinc-300 font-medium mb-3">💰 Economic Parameters</h4>
              <div className="text-xs text-zinc-500 space-y-3">
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Compute Cost (2024) <span className="text-zinc-500 font-normal">(unit: $/exaFLOP, exponent)</span></p>
                  <p>
                    Cost to perform 10¹⁸ FLOPs (1 exaFLOP) in 2024 dollars. 
                    Default 0 = $1/exaFLOP. Value -1 = $0.10/exaFLOP, value 1 = $10/exaFLOP.
                  </p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Cost Decline Rate <span className="text-zinc-500 font-normal">(unit: %/year)</span></p>
                  <p>
                    Annual rate at which compute costs decrease. 
                    30% means next year's cost is 70% of this year's. Historical: ~30%/year.
                  </p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Human Wage Floor <span className="text-zinc-500 font-normal">(unit: $/hour)</span></p>
                  <p>
                    Minimum viable hourly wage for human cognitive workers globally. 
                    This is the base for tier wages (multiplied by Wage ×).
                  </p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Mobility Threshold <span className="text-zinc-500 font-normal">(unit: ratio, 0.5-1.0)</span></p>
                  <p>
                    Workers substitute to a lower tier if it pays at least this fraction of their current tier wage.
                    0.8 = workers accept a 20% pay cut to move down (e.g., Expert → Complex).
                    Lower values = more mobility, higher = workers stay in their tier.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Demand Parameters */}
            <div>
              <h4 className="text-zinc-300 font-medium mb-3">📈 Demand Parameters</h4>
              <div className="text-xs text-zinc-500 space-y-3">
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Cognitive Work Share <span className="text-zinc-500 font-normal">(unit: percentage)</span></p>
                  <p>
                    Share of all global work that is cognitive (vs physical/manual). 
                    Base: 6.1T total work hours/year. 40% → 2.4T cognitive hours/year.
                  </p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Baseline Demand Growth <span className="text-zinc-500 font-normal">(unit: %/year)</span></p>
                  <p>
                    Natural growth in cognitive work from GDP/population growth, independent of AI. 
                    Historical ~3%/year.
                  </p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">Demand Elasticity <span className="text-zinc-500 font-normal">(unit: ratio, 0-1.5)</span></p>
                  <p>
                    How much demand increases when AI cost falls (Jevons paradox). 
                    0 = fixed demand. 1 = demand doubles when cost halves.
                  </p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-zinc-300 font-medium mb-1">New Task Creation <span className="text-zinc-500 font-normal">(unit: ratio, 0-0.5)</span></p>
                  <p>
                    <strong>Formula:</strong> new work multiplier = 1 + (rate × σ_growth × years)
                  </p>
                  <p className="mt-1">
                    <strong>At rate=0.1:</strong> If σ grows 0.25 over 6 years → 15% more cognitive work exists (personalized tutoring, AI assistants).
                  </p>
                  <p className="mt-1">
                    <strong>At rate=0:</strong> AI only redistributes existing work, no new categories.
                    <strong className="ml-2">At rate=0.3+:</strong> AI creates major new industries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'scenarios',
      label: 'Scenarios',
      icon: '🎯',
      content: (
        <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800 space-y-6">
          <div>
            <h3 className="text-lg text-zinc-100 mb-2">Scenario Presets</h3>
            <p className="text-sm text-zinc-400">
              Click a scenario to load a preset configuration. Base compute (10^{params.baseComputeExponent} FLOP/s) stays the same—only other parameters change.
            </p>
          </div>

          <div className="space-y-4">
            {scenarios.map((scenario) => {
              const colorClasses: Record<string, { bg: string; border: string; text: string; hover: string }> = {
                emerald: { bg: 'bg-emerald-950/30', border: 'border-emerald-900/50', text: 'text-emerald-400', hover: 'hover:border-emerald-700' },
                red: { bg: 'bg-red-950/30', border: 'border-red-900/50', text: 'text-red-400', hover: 'hover:border-red-700' },
                amber: { bg: 'bg-amber-950/30', border: 'border-amber-900/50', text: 'text-amber-400', hover: 'hover:border-amber-700' },
                blue: { bg: 'bg-blue-950/30', border: 'border-blue-900/50', text: 'text-blue-400', hover: 'hover:border-blue-700' },
                zinc: { bg: 'bg-zinc-900/50', border: 'border-zinc-700/50', text: 'text-zinc-300', hover: 'hover:border-zinc-600' },
              };
              const colors = colorClasses[scenario.color] || colorClasses.zinc;
              
              return (
                <div key={scenario.id} className={`${colors.bg} ${colors.border} border rounded-lg overflow-hidden`}>
                  <button
                    onClick={() => applyScenario(scenario.id)}
                    className={`w-full p-4 text-left ${colors.hover} transition-all cursor-pointer`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`${colors.text} text-lg mb-1`}>{scenario.name}</p>
                        <p className="text-sm text-zinc-400">{scenario.description}</p>
                      </div>
                      <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded ml-4 whitespace-nowrap">
                        Apply →
                      </span>
                    </div>
                  </button>
                  <Collapsible title="See full explanation" defaultOpen={false}>
                    <div className="px-4 pb-4 text-sm text-zinc-400 whitespace-pre-line">
                      {scenario.explanation}
                      <div className="mt-4 pt-3 border-t border-zinc-800/50">
                        <p className="text-xs text-zinc-300 mb-2">Key parameters:</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                          {Object.entries(scenario.changes).map(([key, value]) => {
                            const displayKey = key
                              .replace('tier_', '')
                              .replace(/_/g, ' ')
                              .replace('flops', 'FLOPs')
                              .replace('maxSigma', 'max σ')
                              .replace('sigmaMidpoint', 'σ midpoint')
                              .replace('sigmaSteepness', 'σ steepness');
                            const displayValue = key.includes('Sigma') 
                              ? `${((value as number) * 100).toFixed(0)}%`
                              : key.includes('Rate') || key.includes('Growth') || key.includes('Elasticity') || key.includes('Decay')
                              ? `${((value as number) * 100).toFixed(0)}%`
                              : key.includes('flops')
                              ? `10^${value}`
                              : key.includes('HalfLife')
                              ? `${value} yrs`
                              : key.includes('Improvement')
                              ? `${value}×/yr`
                              : String(value);
                            return (
                              <div key={key} className="flex justify-between">
                                <span className="text-zinc-500">{displayKey}:</span>
                                <span className="text-zinc-300">{displayValue}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Collapsible>
                </div>
              );
            })}
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'technical',
      label: 'Technical Details',
      icon: '🔧',
      content: (
        <div className="bg-[#12121a] rounded-xl p-5 border border-zinc-800 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
              Technical Model Documentation
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              This page documents the exact formulas and algorithms used in the model, with worked numerical examples.
            </p>
          </div>

          {/* 1. Compute Supply Pipeline */}
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-md font-semibold text-amber-400 mb-3">1. Compute Supply Pipeline</h4>
            
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Hidden Constants</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code className="text-amber-400">AI_UTILIZATION = 0.3</code> — Only 30% of global AI compute goes to cognitive work (rest: training, non-cognitive inference such as recommender systems, video & image generation, and other tasks without human equivalents)</li>
                  <li><code className="text-amber-400">SECONDS_PER_YEAR = 3.15×10⁷</code> — Converts FLOP/s to FLOPs/year</li>
                </ul>
              </div>
              
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Raw Compute (with declining growth)</p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 overflow-x-auto">
{`rate(year) = initialRate × (1 - decay)^year
compute(t) = base × Π[y=0 to t-1] (1 + rate(y))`}
                </pre>
              </div>
              
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Effective Compute (with efficiency gains)</p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 overflow-x-auto">
{`efficiency(year) = initialFactor^((1 - decay)^year)
effective = raw × Π[y=0 to t-1] efficiency(y)`}
                </pre>
              </div>
              
              <div className="bg-indigo-950/30 rounded-lg p-3 border border-indigo-900/40">
                <p className="text-indigo-300 font-medium mb-2">📝 Example: Year 6</p>
                <div className="text-xs space-y-1 font-mono">
                  <p>Base: 10^21.7 FLOP/s (2024)</p>
                  <p>Growth: 100%/yr with 5% decay → Year 0: +100%, Year 5: +77%</p>
                  <p>Raw compute: 10^21.7 × ~35 = <span className="text-emerald-400">10^23.2 FLOP/s</span></p>
                  <p>Efficiency: 2×/yr with 8% decay → ~12× by year 6</p>
                  <p>Effective: 10^23.2 × 12 = <span className="text-emerald-400">10^24.3 FLOP/s</span></p>
                  <p>Available for cognitive: 10^24.3 × 0.3 × 3.15×10⁷ = <span className="text-amber-400">6×10^31 FLOPs/year</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. AI Cost Calculation */}
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-md font-semibold text-amber-400 mb-3">2. AI Cost Per Hour</h4>
            
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Formula</p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 overflow-x-auto">
{`AI $/hr = (10^flopsExponent / efficiencyMultiplier) / 10^18 × $/exaFLOP`}
                </pre>
                <p className="mt-2 text-xs">Dividing by 10^18 converts FLOPs to exaFLOPs (the pricing unit).</p>
              </div>
              
              <div className="bg-indigo-950/30 rounded-lg p-3 border border-indigo-900/40">
                <p className="text-indigo-300 font-medium mb-2">📝 Example: Routine Tier, Year 2</p>
                <div className="text-xs space-y-1 font-mono">
                  <p>Routine tier compute required: 10^15 FLOPs/hr</p>
                  <p>Cost: $1/exaFLOP, efficiency: 4× (year 2)</p>
                  <p>AI cost = (10^15 / 4) / 10^18 × $1</p>
                  <p>AI cost = 2.5×10^14 / 10^18 × $1 = <span className="text-emerald-400">$0.00025/hr</span></p>
                  <p>vs human wage $15/hr → <span className="text-amber-400">AI is 60,000× cheaper</span></p>
                </div>
              </div>
              
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Cost-Effectiveness Check</p>
                <p className="text-xs">AI is "cost-effective" for a tier when:</p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 mt-1">
{`aiCostPerHour < tierWage (= wageFloor × wageMultiplier)`}
                </pre>
                <p className="text-xs mt-2">If NOT cost-effective: only 2% × σ adoption (early adopters).</p>
              </div>
            </div>
          </div>

          {/* 3. Substitutability Growth */}
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-md font-semibold text-amber-400 mb-3">3. Substitutability (σ) — S-Curve Growth</h4>
            
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Sigmoid (S-Curve) Model</p>
                <p className="text-xs mb-2">
                  AI capabilities often develop in breakthroughs, not smooth exponential curves. 
                  The S-curve captures: slow start → rapid transition → plateau.
                </p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 overflow-x-auto">
{`σ(year) = σ_initial + (σ_max - σ_initial) / (1 + e^(-steepness × (year - midpoint)))`}
                </pre>
                <p className="mt-2 text-xs">Each tier has: σ_initial, σ_max, midpoint (breakthrough year), steepness.</p>
              </div>
              
              <div className="bg-indigo-950/30 rounded-lg p-3 border border-indigo-900/40">
                <p className="text-indigo-300 font-medium mb-2">📝 Example: Frontier Tier</p>
                <div className="text-xs space-y-1 font-mono">
                  <p>σ_initial=0.02, σ_max=0.80, midpoint=2035, steepness=0.8</p>
                  <p className="mt-2">Year 2024: σ = 0.02 + 0.78 / (1 + e^(8.8)) ≈ <span className="text-emerald-400">0.02</span> (barely any AI)</p>
                  <p>Year 2030: σ = 0.02 + 0.78 / (1 + e^(4.0)) ≈ <span className="text-emerald-400">0.04</span> (still minimal)</p>
                  <p>Year 2035: σ = 0.02 + 0.78 / (1 + e^(0)) = <span className="text-emerald-400">0.41</span> (breakthrough!)</p>
                  <p>Year 2040: σ = 0.02 + 0.78 / (1 + e^(-4.0)) ≈ <span className="text-emerald-400">0.76</span> (rapid adoption)</p>
                </div>
              </div>
              
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">What σ Means</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li><strong>σ = 0:</strong> AI cannot substitute for humans at all (only augments)</li>
                  <li><strong>σ = 0.5:</strong> AI can do 50% of the work, humans must do rest</li>
                  <li><strong>σ = 1:</strong> AI can fully substitute (limited only by cost/compute)</li>
                </ul>
              </div>
              
              <div className="bg-cyan-950/30 rounded-lg p-3 border border-cyan-900/40">
                <p className="text-cyan-300 font-medium mb-2">Deployment Lag: σ_possible vs σ_effective</p>
                <p className="text-xs mb-2">
                  The S-curve gives us σ_possible (what AI <em>can</em> do). But there's a delay before AI <em>is</em> doing it:
                </p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 overflow-x-auto">
{`σ_effective(year) = σ_possible(year - deploymentLag)`}
                </pre>
                <p className="text-xs mt-2">
                  Default lags: Routine/Standard/Complex: 2yr, Expert: 3yr, Frontier: 1yr.
                </p>
              </div>
              
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Why S-Curve, Not Exponential?</p>
                <p className="text-xs">
                  Exponential decay assumes steady progress from day one. But AI often shows: 
                  "nothing works" → "breakthrough" → "rapid adoption" → "plateau". 
                  The S-curve lets you set <em>when</em> the breakthrough happens (midpoint) 
                  and <em>how sudden</em> it is (steepness).
                </p>
                <p className="text-xs mt-2 text-amber-400/80">
                  <strong>Note:</strong> Steepness can also model <em>adoption lag</em>—even if AI capabilities 
                  arrive suddenly, low steepness captures slow organizational adoption (trust, regulation, 
                  integration costs).
                </p>
              </div>
            </div>
          </div>

          {/* 4. Demand Dynamics */}
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-md font-semibold text-amber-400 mb-3">4. Demand Dynamics</h4>
            
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Three Demand Components</p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 overflow-x-auto">
{`1. Baseline: (1 + growthRate)^years

2. AI-Induced (Jevons paradox):
   costReductionFactor = max(0.01, 1 - effectiveCostReduction)
   aiInduced = 1 + elasticity × log₁₀(1 / costReductionFactor)

3. New Task Creation:
   newTasks = 1 + rate × σ_growth × years

Total Hours = baseHours × baseline × aiInduced × newTasks`}
                </pre>
              </div>
              
              <div className="bg-indigo-950/30 rounded-lg p-3 border border-indigo-900/40">
                <p className="text-indigo-300 font-medium mb-2">📝 Example: Year 6</p>
                <div className="text-xs space-y-1 font-mono">
                  <p>Base: 2.4T hours, AI is 10× cheaper (cost reduction = 0.9)</p>
                  <p>Average σ grew from 0.25 to 0.45 (growth = 0.20)</p>
                  <p className="mt-2">Baseline (3%/yr): 1.03^6 = <span className="text-emerald-400">1.19×</span></p>
                  <p>AI-Induced (ε=0.5): 1 + 0.5 × log₁₀(10) = 1 + 0.5 = <span className="text-emerald-400">1.50×</span></p>
                  <p>New Tasks (rate=0.1): 1 + 0.1 × 0.2 × 6 = <span className="text-emerald-400">1.12×</span></p>
                  <p className="mt-2">Total: 2.4T × 1.19 × 1.50 × 1.12 = <span className="text-amber-400">4.8T hours (+100%)</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Compute Allocation Algorithm */}
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-md font-semibold text-amber-400 mb-3">5. Compute Allocation (Uniform-Price Auction)</h4>
            
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Market-Clearing Auction</p>
                <ol className="list-decimal list-inside text-xs space-y-1">
                  <li>Each tier bids a <strong>reservation price per FLOP</strong>:
                    <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 mt-1 overflow-x-auto">
{`reservationPrice = min(tierWage, taskValue) / effectiveFlopsPerHour`}
                    </pre>
                  </li>
                  <li>Sort tiers by reservation price (highest first)</li>
                  <li>Allocate compute greedily: each tier gets min(σ limit, remaining compute)</li>
                  <li>The <strong>marginal tier</strong> (last to get allocation) sets the market-clearing price</li>
                  <li>If compute is abundant (&gt;10% unused), price falls to production cost</li>
                </ol>
              </div>
              
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Human Capacity Constraint</p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 overflow-x-auto">
{`humanCapacityHours = baseCognitiveHours × tier.humanCapable
(NOT demand-scaled — fixed 2024 workforce)`}
                </pre>
                <p className="mt-2 text-xs">If tier demand &gt; human capacity, AI must fill the gap even if expensive.</p>
              </div>
              
              <div className="bg-indigo-950/30 rounded-lg p-3 border border-indigo-900/40">
                <p className="text-indigo-300 font-medium mb-2">📝 Example</p>
                <div className="text-xs space-y-1 font-mono">
                  <p>Available: 10^30 FLOPs/year</p>
                  <p>Frontier bids: $1000/hr ÷ 10^21 FLOP/hr = <span className="text-emerald-400">$10^-18/FLOP</span></p>
                  <p>Routine bids: $15/hr ÷ 10^15 FLOP/hr = <span className="text-emerald-400">$1.5×10^-14/FLOP</span></p>
                  <p className="mt-2">Routine bids higher per-FLOP → served first</p>
                  <p>If Routine exhausts compute → Frontier gets nothing</p>
                  <p>Clearing price = marginal tier's reservation price</p>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Joint Equilibrium Solver */}
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-md font-semibold text-amber-400 mb-3">6. Joint Wage-Compute Equilibrium</h4>
            
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Why Iteration?</p>
                <p className="text-xs mb-2">
                  Wages affect compute bids (higher wages → higher reservation prices → more compute allocated).
                  But compute allocation affects wages (more AI → displaced workers → lower wages).
                  We solve this circular dependency by iterating until convergence.
                </p>
              </div>
              
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Convergence Loop (up to 20 iterations, 1% tolerance)</p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 overflow-x-auto">
{`wages = baseWages (floor × multiplier)
repeat until wages converge:
  1. Run auction with current wages → get AI allocation
  2. Calculate labor market:
     - displaced = AI_share × tier_capacity
     - Flow displaced DOWN to lower tiers
     - Voluntary mobility if lower tier pays > 80% of current
     - tightness = demand / effectiveSupply
     - newWage = baseWage × tightness^elasticity
     - Cap at taskValue
  3. Damped update: wages = 0.7 × old + 0.3 × new
  4. Check convergence: max relative change < 1%`}
                </pre>
              </div>
              
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Wage Formula</p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400">
{`baseWage = wageFloor × wageMultiplier
rawWage = baseWage × max(1, tightness)^elasticity
finalWage = min(rawWage, taskValue)`}
                </pre>
              </div>
              
              <div className="bg-indigo-950/30 rounded-lg p-3 border border-indigo-900/40">
                <p className="text-indigo-300 font-medium mb-2">📝 Example: Expert Tier</p>
                <div className="text-xs space-y-1 font-mono">
                  <p>Demand: 100M hours, Supply: 50M hours (12% of workforce can do Expert)</p>
                  <p>Tightness = 100M / 50M = <span className="text-emerald-400">2.0</span></p>
                  <p>baseWage = $15 × 5 = $75/hr</p>
                  <p>elasticity = 1.2</p>
                  <p>rawWage = $75 × 2.0^1.2 = $75 × 2.30 = <span className="text-emerald-400">$172/hr</span></p>
                  <p>taskValue = $400 → final wage = <span className="text-amber-400">$172/hr</span> (below ceiling)</p>
                </div>
              </div>
              
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Mobility Mechanics</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li><strong>Displacement:</strong> AI automates tier i → workers flow to tiers &lt; i</li>
                  <li><strong>Voluntary:</strong> If tier j pays &gt; mobilityThreshold × tier i wage, workers move down</li>
                  <li>Both increase supply at lower tiers, reducing their tightness/wages</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 7. Edge Cases & Binding Constraints */}
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-md font-semibold text-amber-400 mb-3">7. Edge Cases & Binding Constraints</h4>
            
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-red-400 font-medium mb-1">Cost Binding</p>
                  <p className="text-xs">AI is too expensive → minimal adoption (2% early adopters)</p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-orange-400 font-medium mb-1">Compute Binding</p>
                  <p className="text-xs">Not enough FLOPs → AI adoption limited by hardware</p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-blue-400 font-medium mb-1">Substitutability (σ) Binding</p>
                  <p className="text-xs">AI can only do σ% of work → humans do the rest</p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-purple-400 font-medium mb-1">Human Capacity Binding</p>
                  <p className="text-xs">Not enough skilled humans → AI must fill gap even if expensive</p>
                </div>
              </div>
              
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Special Cases</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li><strong>σ = 0:</strong> AI cannot substitute at all; used only for augmentation</li>
                  <li><strong>σ = 1:</strong> Perfect substitution; limited only by cost or compute</li>
                  <li><strong>Wage at ceiling:</strong> Demand so high that wage hits taskValue cap</li>
                  <li><strong>Tier shares auto-normalize:</strong> If user sets shares that don't sum to 1, they're normalized</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 8. Data Sources */}
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-md font-semibold text-amber-400 mb-3">8. Data Sources & Assumptions</h4>
            
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Labor Statistics (2024 baseline)</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li>Global workforce: 3.4B (ILO ILOSTAT 2023)</li>
                  <li>Avg hours/worker/year: ~1,800 (OECD 2023)</li>
                  <li>Cognitive work share: ~40% (McKinsey Global Institute 2017)</li>
                  <li>Derived: 2.4 trillion cognitive hours/year</li>
                </ul>
              </div>
              
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Compute Statistics (2024 baseline)</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li>Global AI inference: ~5×10^21 FLOP/s (Epoch AI estimates)</li>
                  <li>Growth rate: ~100%/year (Epoch AI historical data)</li>
                  <li>Algorithmic efficiency: ~2×/year improvement (Epoch AI)</li>
                  <li>Cost: ~$1/exaFLOP (cloud provider pricing, Dec 2024)</li>
                </ul>
              </div>
              
              <div className="bg-amber-950/30 rounded-lg p-3 border border-amber-900/40">
                <p className="text-amber-300 font-medium mb-2">⚠️ Key Model Assumptions</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li>Substitutability (σ) values are <strong>not empirical</strong> — they represent the debate</li>
                  <li>Human capacity is <strong>fixed at 2024 workforce</strong> — doesn't scale with demand</li>
                  <li>AI utilization (30%) is an estimate — could vary significantly</li>
                  <li>Declining growth rates are speculative projections</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
      
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">
              AI Labour Displacement Calculator
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Explore how compute and substitutability constraints affect AI/human labor substitution
            </p>
          </div>
          <button
            onClick={handleReopenOnboarding}
            className="px-3 py-1.5 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/40 rounded-lg transition-colors"
          >
            Adjust Assumptions
          </button>
        </div>
      </header>
      
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Controls */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <ParameterControls
                values={params}
                onChange={handleParamChange}
                onReset={handleReset}
              />
            </div>
          </div>
          
          {/* Right Column: Tabbed Content */}
          <div className="lg:col-span-8">
            {/* Year Slider - Always visible */}
            <div className="bg-[#12121a] rounded-xl p-4 border border-zinc-800 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-zinc-200">
                  Projection Year
                </label>
                <span className="text-lg font-semibold text-indigo-400 tabular-nums">
                  {params.year}
                </span>
              </div>
              <input
                type="range"
                min={2024}
                max={2050}
                step={1}
                value={params.year}
                onChange={(e) => handleParamChange('year', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>2024</span>
                <span>2050</span>
              </div>
            </div>
            
            <Tabs tabs={tabs} defaultTab="intro" />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-600 space-y-2">
          <p>
            Built to explore the{' '}
            <a 
              href="https://x.com/CharlesD353/status/2005592245232452079" 
              className="text-indigo-400 hover:text-indigo-300"
              target="_blank"
              rel="noopener"
            >
              CharlesD ↔ Seb Krier discussion
            </a>{' '}
            on AGI and labor economics.
          </p>
          <p className="text-zinc-500">
            Thanks to Claude Opus 4.5 for doing most of the research legwork and virtually all of the coding, 
            GPT 5.2 Extra High for resolving one tricky issue, and Simon Morris, Nathan Young and Peter Wildeford 
            for taking a look at early drafts.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
