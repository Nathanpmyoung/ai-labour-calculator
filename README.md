# AI Compute Bounds Calculator

An interactive calculator exploring how compute constraints might affect AI/human labor substitution over time.

## What This Tool Does

The model explores a key question: **Will AI make human labor economically worthless?**

Two views frame the debate:
- **Optimistic:** Compute is limited. Even cheap AI can't do *all* cognitive work. Humans retain valuable niches.
- **Pessimistic:** AI costs fall faster than compute grows. If substitutability approaches 100%, human labor loses value.

This calculator lets you adjust assumptions and see how they affect human wages, employment, and task allocation across different scenarios.

## Features

- **Tiered Task Model:** Cognitive work split into 5 difficulty tiers (Routine → Frontier), each with independent parameters
- **Time-Varying Substitutability:** Per-tier σ that grows from initial value toward an asymptote over time
- **Dynamic Demand:** Total work grows with GDP, AI-induced demand (Jevons paradox), and new task creation
- **Human Capacity Constraints:** Per-tier limits on what fraction of the workforce can perform each task type
- **Equilibrium Wages:** Market-clearing wages per tier based on supply/demand with inter-tier mobility
- **Market-Clearing Allocation:** Uniform-price auction allocates scarce compute to highest bidders

### Tabs

| Tab | Description |
|-----|-------------|
| Introduction | Quick overview and suggested experiments |
| Summary | Key metrics for the selected projection year |
| Task Tiers | Per-tier breakdown of AI vs human allocation |
| Charts | Time series of compute supply, costs, demand, and substitutability |
| Model Info | Parameter sources, methodology, and detailed explanations |
| Technical Details | Hidden model mechanics, formulas, and toy examples |

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to GitHub Pages on push to `main`.

To enable:
1. Go to Settings → Pages
2. Set Source to "GitHub Actions"

### Other Options

- **Vercel/Netlify:** Connect your GitHub repo for automatic deployments
- **Manual:** Run `npm run build` and deploy the `dist` folder

## Key Parameters

### Compute
| Parameter | Description | Default |
|-----------|-------------|---------|
| Base Compute (2024) | Global AI inference capacity | 10^21.7 FLOP/s |
| Compute Growth | Annual capacity growth | 100%/year |
| Growth Slowdown | How much growth declines per year | 5%/year |
| Algorithmic Efficiency | Annual efficiency multiplier | 2x/year |
| AI Utilization | Fraction of compute for cognitive work | 30% |

### Substitutability (σ) — S-Curve Model
Each tier has independent parameters:
| Parameter | Description |
|-----------|-------------|
| Initial σ | Starting substitutability (0 = complements, 1 = perfect substitutes) |
| Max σ | Asymptotic limit |
| σ Midpoint | Year when σ reaches halfway (the "breakthrough" year) |
| σ Steepness | How rapid the transition (1=gradual ~5yr, 3=sharp ~2yr). Also proxies for adoption lag. |

### Demand
| Parameter | Description | Default |
|-----------|-------------|---------|
| Baseline Demand Growth | Annual growth in work demand | 3%/year |
| Demand Elasticity | How much demand rises as AI cost falls (log-based) | 0.5 |
| New Task Creation | Rate AI enables entirely new work | 0.1 |

### Per-Tier Settings
| Parameter | Description |
|-----------|-------------|
| FLOPs/hr | Compute required for AI to do one hour of work |
| Share | Fraction of total cognitive work in this tier |
| Human Capable | Fraction of workforce able to do this tier |
| Wage Multiplier | How much more this tier pays vs base wage |
| Task Value | Maximum willingness to pay (wage ceiling) |
| Wage Elasticity | How sensitive wages are to market tightness |

## Research Data

See [RESEARCH_DATA.md](./RESEARCH_DATA.md) for sources.

Key sources:
- **Compute:** Epoch AI estimates of global AI inference capacity
- **Efficiency:** ~2x/year algorithmic improvement (Epoch AI)
- **Labor:** ILO global workforce statistics, OECD cognitive labor share, McKinsey task automation studies
- **Costs:** NVIDIA/cloud provider pricing (2024)

## Limitations

This is a simplified model for exploring intuitions, not a precise forecast:

- Extrapolates compute growth (actual growth depends on energy, supply chains, investment)
- Substitutability trajectories are speculative—we don't know how fast AI will become "good enough"
- Ignores physical labor, regulation, preferences for human services
- Doesn't model transition dynamics or geographic variation
- Assumes rational economic allocation (reality is messier)

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Recharts

## License

AGPL-3.0 — see [LICENSE](./LICENSE)

## Context

Inspired by a [debate between @CharlesD353 and @SebKrier](https://x.com/CharlesD353/status/2005592245232452079) on whether compute limitations will preserve human labor value.
