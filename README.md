# AI Compute Bounds Calculator

An interactive calculator exploring how compute constraints might affect AI/human labor substitution, based on the economic arguments from [Seb Krier](https://x.com/sebkrier) (Google DeepMind) and [CharlesD](https://x.com/CharlesD353).

## The Argument

The debate centers on two positions:

**Position A (AI Maximalist):** As AI becomes capable and cheap, it will fully substitute human labor across cognitive tasks.

**Position B (Compute-Constrained):** Real constraints (compute capacity, energy, cost) combined with imperfect substitutability mean humans retain economic value even with capable AI.

**Key Insight:** For human wages to approach zero, AI must be:
1. Capable of performing the tasks
2. Cheap enough to be economical
3. A **near-perfect substitute** (not just capable)

If AI and humans are complements rather than perfect substitutes, then as AI does more work, the remaining human work becomes *more valuable*, not worthless.

## Features

- **Parameter Controls:** Adjust compute growth, efficiency improvements, cost curves, and the crucial substitutability parameter
- **Compute Supply Chart:** Visualize raw and effective (efficiency-adjusted) AI compute over time
- **Wage Equilibrium Chart:** Compare AI cost per cognitive hour vs human wages
- **Task Allocation Chart:** See how work splits between AI and humans under different scenarios
- **Summary Panel:** Key metrics and insights for any projection year

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

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

### Netlify

```bash
npm run build
# Upload the `dist` folder to Netlify, or connect your repo
```

### GitHub Pages

```bash
# Update vite.config.ts to set base path
# base: '/your-repo-name/'

npm run build
# Deploy dist folder to gh-pages branch
```

### Docker (Optional)

```dockerfile
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t ai-compute-calculator .
docker run -p 8080:80 ai-compute-calculator
```

## Key Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| Projection Year | Target year for analysis | 2030 |
| Base Compute (2024) | Global AI inference capacity | 10^21.7 FLOP/s |
| Compute Growth | Annual capacity growth rate | 50%/year |
| Algorithmic Efficiency | Annual efficiency improvement | 1.4x/year |
| **Substitutability (σ)** | 0=complements, 1=perfect substitutes | 0.7 |
| Human Wage Floor | Minimum viable wage | $15/hour |
| Compute Cost | Base cost per exaFLOP | $0.10 |
| Cost Decline Rate | Annual cost reduction | 25%/year |

## Research Data

See [RESEARCH_DATA.md](./RESEARCH_DATA.md) for sources and methodology.

Key data points:
- Global AI inference compute estimated from deployed H100-class GPUs
- Algorithmic efficiency improvements per Epoch AI research (~2x/year)
- Global labor statistics from ILO
- Model costs from OpenAI/Anthropic pricing (Dec 2024)

## Limitations

This is a **simplified model** for exploring economic intuitions, not a precise forecast:

- Treats "cognitive work" as uniform rather than heterogeneous tasks
- Uses a single substitutability parameter rather than task-specific values
- Extrapolates compute growth (actual growth depends on energy, supply chains, etc.)
- Ignores physical labor, regulation, and preferences for human services
- Doesn't model adjustment dynamics, just equilibrium outcomes

## Context

This calculator was built to explore the [CharlesD ↔ Seb Krier discussion](https://x.com/CharlesD353/status/2005592245232452079) on AGI and labor economics.

Seb's core argument: Even with capable AI, if it's not a *perfect substitute* for human labor, complementarity effects mean human wages don't collapse to zero. The "margin" where AI cost = human wage determines task allocation, but substitutability determines wage dynamics.

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Recharts

## License

MIT
