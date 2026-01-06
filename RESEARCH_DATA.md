# AI Labour Displacement Calculator - Research Data

## Sources and Baseline Numbers

This document contains the researched baseline data used in the calculator.

### Compute Supply Side

#### Current Global AI Inference Capacity (2024)

| Metric | Estimate | Source/Notes |
|--------|----------|--------------|
| H100 GPU Performance | 2×10^15 FLOP/s (FP16) | NVIDIA specs (1,979 TFLOPS FP16) |
| Estimated H100-class GPUs deployed | 1-3 million | Industry estimates, NVIDIA shipments |
| Total Datacenter AI Compute | ~10^21 - 10^22 FLOP/s | Conservative estimate based on deployed GPUs |
| A100/older GPUs still in use | ~5 million+ | Adding to total capacity |

#### Training Compute for Reference

| Model | Training Compute | Year |
|-------|-----------------|------|
| GPT-4 | ~10^25 FLOPs | 2023 |
| GPT-3 | ~3×10^23 FLOPs | 2020 |
| Claude 3 Opus | ~10^24-10^25 FLOPs (est.) | 2024 |
| Llama 3.1 405B | ~4×10^25 FLOPs | 2024 |

#### Growth Rates

| Metric | Rate | Source |
|--------|------|--------|
| Training compute growth | ~4x per year | Epoch AI historical analysis |
| Inference capacity growth | ~2-3x per year | More constrained by deployment |
| Algorithmic efficiency | ~2x per year | Epoch AI (same capability, fewer FLOPs) |
| Cost per FLOP decline | ~30% per year | Historical GPU price/performance |

### Inference Economics

#### Cost Per Token (Frontier Models, Dec 2024)

| Model | Input ($/1M tokens) | Output ($/1M tokens) |
|-------|---------------------|---------------------|
| GPT-4 Turbo | $10 | $30 |
| GPT-4o | $2.50 | $10 |
| Claude 3.5 Sonnet | $3 | $15 |
| Claude 3 Opus | $15 | $75 |
| Llama 3.1 70B (API) | $0.50-1 | $1-2 |

#### FLOPs Per Token (Estimates)

- Large model (400B params): ~10^12 FLOPs per token (forward pass only)
- Medium model (70B params): ~10^11 FLOPs per token
- Small model (7B params): ~10^10 FLOPs per token

Note: Actual inference FLOPs = ~2 × parameters × tokens (approximate)

### Demand Side - Human Labor

#### Global Labor Statistics

| Metric | Value | Source |
|--------|-------|--------|
| Global workforce | ~3.5 billion people | ILO |
| Average work hours/year | ~1,800-2,000 | OECD average |
| Total global work hours | ~300-350 billion hours/year | Derived |
| Global labor income | ~$80 trillion/year | World Bank estimates |
| Average global wage | ~$20-25/hour (weighted) | High variance by region |

#### Task Breakdown (Rough Estimates)

| Task Category | % of Work Hours | AI Automatable |
|---------------|-----------------|----------------|
| Physical/Manual | 40% | Low (~10%) |
| Routine Cognitive | 25% | High (~80%) |
| Complex Cognitive | 20% | Medium (~50%) |
| Creative/Social | 15% | Low (~20%) |

### Key Constraints

#### Energy Constraints

- AI datacenter power consumption (2024): ~50-100 TWh/year
- Projected growth: 2-3x by 2030
- Each H100 uses ~700W
- Energy cost: $0.05-0.15/kWh

#### Chip Supply Constraints

- TSMC advanced node capacity is limited
- Lead time for new fabs: 3-5 years
- H100 wafer cost: ~$15,000-20,000

### Model Parameters for Calculator

Based on this research, the default parameters are:

```
BASE_YEAR = 2024
BASE_INFERENCE_COMPUTE = 10^21.7  // ~5×10^21 FLOP/s globally (Epoch AI)
COMPUTE_GROWTH_RATE = 1.0         // 100% per year (2× annually)
COMPUTE_GROWTH_DECAY = 0.10       // Growth rate declines 10%/year
EFFICIENCY_IMPROVEMENT = 2.0       // 2× per year (Epoch AI)
AI_UTILIZATION = 0.30              // 30% of compute goes to cognitive work
HUMAN_WAGE_FLOOR = 15              // USD/hour

// Per-tier FLOPs/hour (10^X) - reflects realistic inference costs
ROUTINE:   10^15  // Multiple model calls, context handling, verification
STANDARD:  10^17  // Extended reasoning chains, larger contexts
COMPLEX:   10^18  // Multi-step analysis, iteration, verification loops
EXPERT:    10^19  // Sophisticated reasoning, frontier model capability
FRONTIER:  10^21  // Cutting-edge capability, beyond current SOTA

// Per-tier substitutability (σ): S-curve model (initial → max, midpoint, steepness, deployment lag)
ROUTINE:   10% → 100%, midpoint 2026, steepness 2.0, lag 2yr
STANDARD:  10% → 98%, midpoint 2027, steepness 1.5, lag 2yr
COMPLEX:   5% → 95%, midpoint 2029, steepness 1.2, lag 2yr
EXPERT:    5% → 90%, midpoint 2032, steepness 1.0, lag 3yr
FRONTIER:  2% → 80%, midpoint 2035, steepness 0.8, lag 1yr

// Deployment lag: years between "AI can do it" and "AI is doing it"
// Accounts for regulatory approval, organizational change, integration work

// Demand dynamics
BASELINE_DEMAND_GROWTH = 0.03      // 3%/year
DEMAND_ELASTICITY = 0.5            // Log-based Jevons coefficient
NEW_TASK_CREATION_RATE = 0.5       // 50% of σ growth → new work (plateaus when σ plateaus)

// Labor (ILO/McKinsey)
GLOBAL_WORKFORCE = 3.4e9           // 3.4 billion workers
HOURS_PER_WORKER = 1800            // ~1,800 hours/year
COGNITIVE_SHARE = 0.40             // 40% of work is cognitive
// → ~2.4 trillion cognitive hours/year (global human capacity constraint)

// Skill-stratified labor supply (cumulative % who can do this tier OR HIGHER)
ROUTINE_CAPABLE:  100% // Everyone in cognitive workforce can do Routine
STANDARD_CAPABLE: 80%  // 80% can do Standard or higher
COMPLEX_CAPABLE:  50%  // 50% can do Complex or higher
EXPERT_CAPABLE:   20%  // 20% can do Expert or higher
FRONTIER_CAPABLE: 5%   // Only 5% can do Frontier

// Derived exclusive skill bands (can do THIS tier but NOT higher):
// Routine-only: 20% (100% - 80%) - these workers can ONLY do Routine tasks
// Standard-max: 30% (80% - 50%)  - can do Routine or Standard
// Complex-max:  30% (50% - 20%)  - can do up to Complex
// Expert-max:   15% (20% - 5%)   - can do up to Expert
// Frontier-max: 5%               - can do all tiers (most flexible)
//
// Workers are allocated from highest skill band first (most flexibility).
// Routine-only workers (20%) can ONLY work Routine - if that tier is automated,
// they have no fallback options.

```

### References

1. **Epoch AI** - "Compute Trends Across Three Eras of Machine Learning" - Historical compute growth data
2. **Semianalysis** - "AI Datacenter Energy Dilemma" - Infrastructure constraints
3. **NVIDIA Financial Reports** - GPU shipment data
4. **ILO Global Employment Trends** - Labor force statistics
5. **OpenAI/Anthropic Pricing Pages** - Current model costs (Dec 2024)
6. **Various academic papers** - Algorithmic efficiency improvements

### Caveats

This data is approximate and intended for exploring economic intuitions, not precise forecasting:

1. **Inference compute is hard to estimate** - Unlike training runs, inference capacity isn't publicly disclosed
2. **Task heterogeneity** - "Cognitive work" spans orders of magnitude in compute requirements
3. **Utilization rates** - Not all compute is used for the tasks we're modeling
4. **Regional variation** - Global averages hide huge variance in wages and work patterns
5. **Rapid change** - AI capabilities and costs are changing faster than data can be gathered
