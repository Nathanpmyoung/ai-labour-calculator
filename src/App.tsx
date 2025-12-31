import { useState, useMemo } from 'react';
import { ParameterControls } from './components/ParameterControls';
import { ComputeSupplyChart } from './components/ComputeSupplyChart';
import { TierCostChart } from './components/TierCostChart';
import { DemandDynamicsChart } from './components/DemandDynamicsChart';
import { SubstitutabilityChart } from './components/SubstitutabilityChart';
import { TaskAllocationChart } from './components/TaskAllocationChart';
import { SummaryPanel } from './components/SummaryPanel';
import { TierBreakdown } from './components/TierBreakdown';
import { SensitivityChart } from './components/SensitivityChart';
import { Tabs } from './components/Tabs';
import { getDefaultValues } from './models/parameters';
import type { ParameterValues } from './models/parameters';
import { runModel } from './models/computeModel';
import { calculateSensitivities } from './models/sensitivity';

function App() {
  const [params, setParams] = useState<ParameterValues>(getDefaultValues());
  
  const handleParamChange = (id: string, value: number) => {
    setParams(prev => ({ ...prev, [id]: value }));
  };
  
  const handleReset = () => {
    setParams(getDefaultValues());
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
            <p className="text-zinc-300 mb-3">🧪 Try These Experiments</p>
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <div className="bg-zinc-900/50 rounded p-3 border border-zinc-800">
                <p className="text-emerald-400">Optimist scenario</p>
                <p className="text-zinc-500">Set σ max to 0.6 for all tiers.</p>
              </div>
              <div className="bg-zinc-900/50 rounded p-3 border border-zinc-800">
                <p className="text-red-400">Pessimist scenario</p>
                <p className="text-zinc-500">Set σ max to 0.99, half-life to 3 years.</p>
              </div>
              <div className="bg-zinc-900/50 rounded p-3 border border-zinc-800">
                <p className="text-amber-400">Compute-constrained</p>
                <p className="text-zinc-500">Lower base compute to 10^20, raise tier FLOPs.</p>
              </div>
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
                  <li><strong className="text-zinc-300">Wage floor: $15/hr</strong> — Base wage, multiplied per tier (Routine 1×, Standard 1.5×, Complex 2.5×, Expert 5×, Frontier 10×)</li>
                </ul>
              </div>
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
                <li><strong className="text-zinc-300">Compute Growth Slowdown (5%)</strong> — Hardware scaling gets harder each generation</li>
                <li><strong className="text-zinc-300">Efficiency Gain Slowdown (8%)</strong> — Algorithmic improvements have diminishing returns faster</li>
                <li><strong className="text-zinc-300">Cost Decline Slowdown (5%)</strong> — Manufacturing optimizations plateau</li>
              </ul>
              <p className="mt-2 text-amber-400/80">
                Set all decay params to 0 to restore constant exponential growth (original behavior).
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-800 mt-4 text-xs text-zinc-500">
              <h4 className="text-zinc-400 font-medium mb-2">Substitutability (σ) — Per-Tier Growth</h4>
              <p>
                Each tier has its own σ trajectory: <strong className="text-emerald-400">Routine</strong> (50%→95%, 2.5yr half-life), 
                <strong className="text-blue-400">Standard</strong> (30%→80%, 4yr), 
                <strong className="text-violet-400">Complex</strong> (15%→60%, 6yr), 
                <strong className="text-orange-400">Expert</strong> (5%→35%, 10yr), 
                <strong className="text-red-400">Frontier</strong> (2%→15%, 15yr). 
                The <strong className="text-zinc-300">σ Half-Life</strong> controls how fast each tier converges to its max—Routine 
                develops quickly (2.5 years to close half the gap), Frontier very slowly (15 years). 
                These values are <strong className="text-amber-400">not empirical</strong>—they represent the key debate.
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
                <div className="bg-zinc-900/50 rounded p-2">
                  <p className="text-emerald-400 font-medium">Routine</p>
                  <p className="text-zinc-400">90% can do</p>
                  <p className="text-zinc-400">1× wage</p>
                </div>
                <div className="bg-zinc-900/50 rounded p-2">
                  <p className="text-blue-400 font-medium">Standard</p>
                  <p className="text-zinc-400">65% can do</p>
                  <p className="text-zinc-400">1.5× wage</p>
                </div>
                <div className="bg-zinc-900/50 rounded p-2">
                  <p className="text-violet-400 font-medium">Complex</p>
                  <p className="text-zinc-400">35% can do</p>
                  <p className="text-zinc-400">2.5× wage</p>
                </div>
                <div className="bg-zinc-900/50 rounded p-2">
                  <p className="text-orange-400 font-medium">Expert</p>
                  <p className="text-zinc-400">12% can do</p>
                  <p className="text-zinc-400">5× wage</p>
                </div>
                <div className="bg-zinc-900/50 rounded p-2">
                  <p className="text-red-400 font-medium">Frontier</p>
                  <p className="text-zinc-400">3% can do</p>
                  <p className="text-zinc-400">10× wage</p>
                </div>
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
                  <p className="text-zinc-300 font-medium mb-1">σ Half-Life <span className="text-zinc-500 font-normal">(unit: years, 1-30)</span></p>
                  <p>
                    <strong>Years to close half the gap</strong> between current σ and σ(max) for this tier.
                    Lower = faster AI progress toward human-level substitutability.
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-emerald-400">Routine: 2.5 years</strong> — simple tasks become AI-substitutable quickly</li>
                    <li><strong className="text-blue-400">Standard: 4 years</strong> — knowledge work takes longer</li>
                    <li><strong className="text-violet-400">Complex: 6 years</strong> — complex reasoning slower to crack</li>
                    <li><strong className="text-orange-400">Expert: 10 years</strong> — expert judgment difficult to replicate</li>
                    <li><strong className="text-red-400">Frontier: 15 years</strong> — breakthrough innovation hardest to automate</li>
                  </ul>
                  <p className="mt-2 text-zinc-400">
                    After 2 half-lives, σ is 75% of the way to max. After 3, 87.5%.
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
                    <li><strong className="text-zinc-300">Complex 2.5×</strong> = minimum $37.50/hr</li>
                    <li><strong className="text-zinc-300">Expert 5.0×</strong> = minimum $75/hr</li>
                    <li><strong className="text-zinc-300">Frontier 10.0×</strong> = minimum $150/hr</li>
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
                  <p>Routine tier compute required: 10^12 FLOPs/hr</p>
                  <p>Cost: $1/exaFLOP, efficiency: 4× (year 2)</p>
                  <p>AI cost = (10^12 / 4) / 10^18 × $1</p>
                  <p>AI cost = 2.5×10^11 / 10^18 × $1 = <span className="text-emerald-400">$0.00000025/hr</span></p>
                  <p>vs human wage $15/hr → <span className="text-amber-400">AI is 60 million × cheaper</span></p>
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
            <h4 className="text-md font-semibold text-amber-400 mb-3">3. Substitutability (σ) Growth</h4>
            
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Exponential Decay to Asymptote</p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 overflow-x-auto">
{`τ = halfLife / ln(2)
σ(t) = σ_max - (σ_max - σ_initial) × e^(-t / τ)`}
                </pre>
                <p className="mt-2 text-xs">Each tier has its own σ_initial, σ_max, and halfLife.</p>
              </div>
              
              <div className="bg-indigo-950/30 rounded-lg p-3 border border-indigo-900/40">
                <p className="text-indigo-300 font-medium mb-2">📝 Example: </p>
                <div className="text-xs space-y-1 font-mono">
                  <p>σ_initial=0.50, σ_max=0.95, halfLife=2.5 years</p>
                  <p>τ = 2.5 / 0.693 = 3.6</p>
                  <p>Year 2.5: σ = 0.95 - 0.45 × e^(-2.5/3.6) = 0.95 - 0.45 × 0.50 = <span className="text-emerald-400">0.725</span></p>
                  <p>Year 5: σ = 0.95 - 0.45 × e^(-5/3.6) = 0.95 - 0.45 × 0.25 = <span className="text-emerald-400">0.84</span></p>
                  <p>Year 10: σ = 0.95 - 0.45 × e^(-10/3.6) = 0.95 - 0.45 × 0.06 = <span className="text-emerald-400">0.92</span></p>
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
            <h4 className="text-md font-semibold text-amber-400 mb-3">5. Compute Allocation Algorithm</h4>
            
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Greedy Value-Maximizing Allocation</p>
                <ol className="list-decimal list-inside text-xs space-y-1">
                  <li>Calculate <code className="text-amber-400">valuePerFlop = tierWage / flopsPerHour</code> for each tier</li>
                  <li>Sort tiers: cost-effective first, then by valuePerFlop (descending)</li>
                  <li>For each tier in order:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>If NOT cost-effective: allocate 2% × σ (early adopters)</li>
                      <li>If cost-effective: allocate min(σ limit, compute remaining, human capacity gap)</li>
                    </ul>
                  </li>
                  <li>Track binding constraint: <code>cost | compute | substitutability | humanCapacity</code></li>
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
                  <p>Routine: needs 10^28 FLOPs (σ-limited at 80%)</p>
                  <p>Expert: needs 10^31 FLOPs (σ-limited at 30%)</p>
                  <p className="mt-2">Allocation order (by value/FLOP): Expert first, Routine second</p>
                  <p>Expert gets: min(10^31 needed, 10^30 available) = <span className="text-emerald-400">10^30</span></p>
                  <p>Expert binding: <span className="text-red-400">compute</span></p>
                  <p>Routine gets: min(10^28 needed, 0 remaining) = <span className="text-emerald-400">0</span></p>
                  <p>Routine binding: <span className="text-red-400">compute</span> (spillover effect)</p>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Equilibrium Wage Model */}
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-md font-semibold text-amber-400 mb-3">6. Equilibrium Wage Model</h4>
            
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-zinc-300 font-medium mb-2">Iterative Solver (5 rounds)</p>
                <pre className="bg-zinc-950 p-2 rounded text-xs text-emerald-400 overflow-x-auto">
{`for 5 iterations:
  1. displaced = AI_share × tier_capacity
  2. Flow displaced DOWN to lower tiers (weighted by relative wages)
  3. Voluntary mobility: if lower tier pays > threshold × current wage
  4. effectiveSupply = baseCapacity - displaced + inflows
  5. tightness = demand / effectiveSupply
  6. wage = baseWage × tightness^elasticity
  7. Cap at taskValue (wage ceiling)`}
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
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-zinc-100">
            AI Compute Bounds Calculator
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Explore how compute constraints affect AI/human labor substitution
          </p>
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
            <Tabs tabs={tabs} defaultTab="intro" />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-600">
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
        </div>
      </footer>
    </div>
  );
}

export default App;
