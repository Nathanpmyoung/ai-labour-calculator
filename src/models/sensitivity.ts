/**
 * Sensitivity Analysis Module
 * 
 * Calculates how sensitive model outputs (human work hours) are to each parameter.
 * Uses finite difference approximation to estimate partial derivatives.
 */

import { parameters, type ParameterValues } from './parameters';
import { runModel } from './computeModel';

export interface ParameterSensitivity {
  parameterId: string;
  parameterLabel: string;
  parameterGroup: string;
  sensitivity: number;           // Normalized: % change in output per % change in input
  absoluteImpact: number;        // Absolute hours change for +10% param change
  direction: 'positive' | 'negative' | 'neutral';  // Does increasing param increase human hours?
  rank: number;                  // 1 = most sensitive
  isKeyParameter: boolean;       // Top 5 most sensitive
}

export interface SensitivityAnalysis {
  sensitivities: ParameterSensitivity[];
  keyParameters: ParameterSensitivity[];      // Top 5
  advancedParameters: ParameterSensitivity[]; // The rest
  baselineHumanHours: number;
  targetYear: number;
}

/**
 * Calculate sensitivity of human work hours to all parameters
 * 
 * Uses central difference approximation:
 * sensitivity = (f(x + δ) - f(x - δ)) / (2δ) normalized by baseline
 */
export function calculateSensitivities(
  baseParams: ParameterValues,
  targetYear: number
): SensitivityAnalysis {
  const delta = 0.10; // 10% perturbation
  
  // Get baseline output
  const baseOutputs = runModel(baseParams);
  const baseProjection = baseOutputs.projections.find(p => p.year === targetYear);
  const baseHumanHours = baseProjection?.totalHumanHours ?? 0;
  
  if (baseHumanHours === 0) {
    return {
      sensitivities: [],
      keyParameters: [],
      advancedParameters: [],
      baselineHumanHours: 0,
      targetYear,
    };
  }
  
  const sensitivities: ParameterSensitivity[] = [];
  
  // Calculate sensitivity for each non-tier parameter
  for (const param of parameters) {
    // Skip tier parameters (too many, would clutter the analysis)
    if (param.group === 'tiers') continue;
    
    // Skip year parameter (it's the independent variable)
    if (param.id === 'year') continue;
    
    // Skip cognitiveShare - it's trivially sensitive (more cognitive work = more hours)
    // and less interesting than parameters affecting AI/human allocation
    if (param.id === 'cognitiveShare') continue;
    
    const baseValue = baseParams[param.id];
    
    // Skip if base value is 0 (can't do percentage change)
    if (baseValue === 0) {
      sensitivities.push({
        parameterId: param.id,
        parameterLabel: param.label,
        parameterGroup: param.group || 'other',
        sensitivity: 0,
        absoluteImpact: 0,
        direction: 'neutral',
        rank: 999,
        isKeyParameter: false,
      });
      continue;
    }
    
    // Perturb up
    const paramsUp = { ...baseParams };
    paramsUp[param.id] = baseValue * (1 + delta);
    // Clamp to valid range
    paramsUp[param.id] = Math.min(param.max, Math.max(param.min, paramsUp[param.id]));
    
    // Perturb down
    const paramsDown = { ...baseParams };
    paramsDown[param.id] = baseValue * (1 - delta);
    paramsDown[param.id] = Math.min(param.max, Math.max(param.min, paramsDown[param.id]));
    
    // Calculate outputs for both perturbations
    const outputsUp = runModel(paramsUp);
    const outputsDown = runModel(paramsDown);
    
    const humanHoursUp = outputsUp.projections.find(p => p.year === targetYear)?.totalHumanHours ?? 0;
    const humanHoursDown = outputsDown.projections.find(p => p.year === targetYear)?.totalHumanHours ?? 0;
    
    // Central difference
    const absoluteChange = (humanHoursUp - humanHoursDown) / 2;
    
    // Normalized sensitivity: % change in output per % change in input
    // sensitivity = (Δoutput/output) / (Δinput/input) = (Δoutput/Δinput) * (input/output)
    const normalizedSensitivity = (absoluteChange / (baseValue * delta)) * (baseValue / baseHumanHours);
    
    sensitivities.push({
      parameterId: param.id,
      parameterLabel: param.label,
      parameterGroup: param.group || 'other',
      sensitivity: normalizedSensitivity,
      absoluteImpact: absoluteChange,
      direction: absoluteChange > 1e6 ? 'positive' : absoluteChange < -1e6 ? 'negative' : 'neutral',
      rank: 0,
      isKeyParameter: false,
    });
  }
  
  // Rank by absolute sensitivity
  sensitivities.sort((a, b) => Math.abs(b.sensitivity) - Math.abs(a.sensitivity));
  sensitivities.forEach((s, i) => {
    s.rank = i + 1;
    s.isKeyParameter = i < 5; // Top 5 are "key"
  });
  
  // Split into key and advanced
  const keyParameters = sensitivities.filter(s => s.isKeyParameter);
  const advancedParameters = sensitivities.filter(s => !s.isKeyParameter);
  
  return {
    sensitivities,
    keyParameters,
    advancedParameters,
    baselineHumanHours: baseHumanHours,
    targetYear,
  };
}

/**
 * Get parameter IDs ranked by sensitivity
 * Used to determine which parameters to show prominently
 */
export function getKeyParameterIds(
  baseParams: ParameterValues,
  targetYear: number,
  count: number = 5
): string[] {
  const analysis = calculateSensitivities(baseParams, targetYear);
  return analysis.keyParameters.slice(0, count).map(s => s.parameterId);
}

/**
 * Format sensitivity for display
 */
export function formatSensitivity(sensitivity: number): string {
  const percent = sensitivity * 100;
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

