# AI Compute Bounds Calculator - Research Data

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
BASE_INFERENCE_COMPUTE = 5e21  // FLOP/s globally available
COMPUTE_GROWTH_RATE = 0.5     // 50% per year (conservative)
EFFICIENCY_IMPROVEMENT = 1.4   // ~40% improvement per year (conservative)
SUBSTITUTABILITY = 0.7         // 0 = complements, 1 = perfect substitutes
HUMAN_WAGE_FLOOR = 15         // USD/hour
TOTAL_HUMAN_WORK_HOURS = 3e11 // 300 billion hours/year
AVERAGE_HUMAN_WAGE = 20       // USD/hour global average
FLOPS_PER_COGNITIVE_HOUR = 1e15 // FLOPs for one "hour" of AI cognitive work
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
