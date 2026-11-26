import type { ExperimentRun, WaterSample } from '../types/aquapure';

/**
 * BIS IS 10500:2012 Drinking Water Specification Reference Values
 * Acceptable Limits & Permissible Limits (in the absence of alternate source)
 */
export const BIS_IS_10500 = {
  arsenic: {
    acceptableMgL: 0.01,
    permissibleMgL: 0.01, // No relaxation permitted
    unit: 'mg/L',
    note: 'No relaxation beyond 0.01 mg/L under BIS IS 10500:2012.',
  },
  fluoride: {
    acceptableMgL: 1.0,
    permissibleMgL: 1.5,
    unit: 'mg/L',
    note: 'Acceptable 1.0 mg/L; permissible 1.5 mg/L in absence of alternate source.',
  },
  ph: {
    min: 6.5,
    max: 8.5,
    unit: 'pH',
    note: 'No relaxation outside 6.5–8.5 range.',
  },
  tds: {
    acceptableMgL: 500,
    permissibleMgL: 2000,
    unit: 'mg/L',
    note: 'TDS does NOT measure trace Arsenic or Fluoride ions.',
  },
  turbidity: {
    acceptableNtu: 1.0,
    permissibleNtu: 5.0,
    unit: 'NTU',
    note: 'High turbidity can foul adsorbent pores and shield particulates.',
  },
} as const;

export interface CalculationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  removalEfficiencyPct: number | null;
  adsorptionCapacityMgG: number | null;
  belowDetectionLimitFlag: boolean;
}

/**
 * Computes Removal Efficiency (%) = [(C0 - Ce) / C0] * 100
 * and Adsorption Capacity q (mg/g) = [(C0 - Ce) * V (L)] / m (g)
 * Enforces unit consistency, numeric validation, and scientific safety rules
 * (never claims 100% absolute contaminant removal).
 */
export function evaluateAdsorptionMetrics(params: {
  initialConcentrationMgL: number;
  finalConcentrationMgL: number;
  waterVolumeL: number;
  adsorbentMassG: number;
}): CalculationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { initialConcentrationMgL: c0, finalConcentrationMgL: ce, waterVolumeL: v, adsorbentMassG: m } =
    params;

  if (!Number.isFinite(c0) || c0 <= 0) {
    errors.push('Initial concentration (C0) must be greater than 0 mg/L.');
  }
  if (!Number.isFinite(ce) || ce < 0) {
    errors.push('Final concentration (Ce) must be 0 or a positive number in mg/L.');
  }
  if (Number.isFinite(c0) && Number.isFinite(ce) && ce > c0) {
    errors.push(
      'Final concentration (Ce) cannot exceed Initial concentration (C0) for adsorption removal calculations. Check for media leaching or measurement error.'
    );
  }
  if (!Number.isFinite(v) || v <= 0) {
    errors.push('Water volume (V) must be greater than 0 L.');
  }
  if (!Number.isFinite(m) || m <= 0) {
    errors.push('Adsorbent mass (m) must be greater than 0 g.');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      removalEfficiencyPct: null,
      adsorptionCapacityMgG: null,
      belowDetectionLimitFlag: false,
    };
  }

  const rawEfficiency = ((c0 - ce) / c0) * 100;
  // Scientific rule: Never report 100.00% absolute contaminant removal.
  // If Ce === 0, report capped analytical notation (< MDL, <= 99.9%) and flag lab confirmation.
  const belowDetectionLimitFlag = ce === 0 || rawEfficiency >= 99.99;
  const cappedEfficiency = belowDetectionLimitFlag ? 99.9 : Number(rawEfficiency.toFixed(2));

  if (belowDetectionLimitFlag) {
    warnings.push(
      'Final concentration entered as 0 mg/L (or >=99.99% removal). Scientifically, report effluent as "< Method Detection Limit (MDL)" rather than claiming 100% absolute removal, and confirm via ICP-MS / GF-AAS / ISE.'
    );
  }

  const q = ((c0 - ce) * v) / m;

  if (q > 150) {
    warnings.push(
      `Calculated adsorption capacity (${q.toFixed(2)} mg/g) is unusually high for indigenous low-cost media; verify units (V in L, m in g, concentrations in mg/L).`
    );
  }

  return {
    valid: true,
    errors,
    warnings,
    removalEfficiencyPct: cappedEfficiency,
    adsorptionCapacityMgG: Number(q.toFixed(4)),
    belowDetectionLimitFlag,
  };
}

export function estimateTreatmentCostPer1000L(params: {
  waterVolumeL: number;
  adsorbentMassG: number;
  costPerKgInr: number;
  regenerationCycles?: number;
}): number | null {
  const { waterVolumeL, adsorbentMassG, costPerKgInr, regenerationCycles = 1 } = params;
  if (waterVolumeL <= 0 || adsorbentMassG <= 0 || costPerKgInr < 0 || regenerationCycles < 1) {
    return null;
  }
  const kgPer1000L = ((adsorbentMassG / 1000) / waterVolumeL) * 1000;
  const cost = (kgPer1000L * costPerKgInr) / regenerationCycles;
  return Number(cost.toFixed(2));
}

export interface SampleComplianceFlags {
  arsenicExceeded: boolean;
  fluorideExceeded: boolean;
  phOutOfRange: boolean;
  tdsAboveAcceptable: boolean;
  tdsAbovePermissible: boolean;
  turbidityAboveAcceptable: boolean;
  requiresLabVerification: boolean;
  summaryStatus: 'Exceeds BIS Limit' | 'Lab Assay Pending' | 'Within BIS Acceptable';
}

export function evaluateSampleAgainstBIS(sample: WaterSample): SampleComplianceFlags {
  const arsenicMissing = sample.initialArsenicMgL === null || sample.initialArsenicMgL === undefined;
  const fluorideMissing = sample.initialFluorideMgL === null || sample.initialFluorideMgL === undefined;

  const arsenicExceeded =
    sample.initialArsenicMgL !== null && sample.initialArsenicMgL > BIS_IS_10500.arsenic.acceptableMgL;
  const fluorideExceeded =
    sample.initialFluorideMgL !== null && sample.initialFluorideMgL > BIS_IS_10500.fluoride.acceptableMgL;
  const phOutOfRange = sample.initialPh < BIS_IS_10500.ph.min || sample.initialPh > BIS_IS_10500.ph.max;
  const tdsAboveAcceptable = sample.initialTdsMgL > BIS_IS_10500.tds.acceptableMgL;
  const tdsAbovePermissible = sample.initialTdsMgL > BIS_IS_10500.tds.permissibleMgL;
  const turbidityAboveAcceptable = sample.initialTurbidityNtu > BIS_IS_10500.turbidity.acceptableNtu;

  const requiresLabVerification =
    arsenicMissing ||
    fluorideMissing ||
    sample.arsenicMethod === 'Pending Lab Assay' ||
    sample.fluorideMethod === 'Pending Lab Assay';

  let summaryStatus: SampleComplianceFlags['summaryStatus'] = 'Within BIS Acceptable';
  if (arsenicExceeded || fluorideExceeded || phOutOfRange || tdsAbovePermissible) {
    summaryStatus = 'Exceeds BIS Limit';
  } else if (requiresLabVerification) {
    summaryStatus = 'Lab Assay Pending';
  }

  return {
    arsenicExceeded,
    fluorideExceeded,
    phOutOfRange,
    tdsAboveAcceptable,
    tdsAbovePermissible,
    turbidityAboveAcceptable,
    requiresLabVerification,
    summaryStatus,
  };
}

export function evaluateExperimentVerification(exp: ExperimentRun): {
  meetsBisArsenic: boolean | null;
  meetsBisFluoride: boolean | null;
  requiresAdditionalVerification: boolean;
  flagReason: string | null;
} {
  const meetsBisArsenic =
    exp.finalArsenicMgL !== null ? exp.finalArsenicMgL <= BIS_IS_10500.arsenic.acceptableMgL : null;
  const meetsBisFluoride =
    exp.finalFluorideMgL !== null ? exp.finalFluorideMgL <= BIS_IS_10500.fluoride.acceptableMgL : null;

  const reasons: string[] = [];
  if (exp.verificationSource !== 'laboratory_verified') {
    reasons.push('Requires laboratory-verified ICP-MS/AAS/ISE confirmation');
  }
  if (exp.finalArsenicMgL !== null && exp.finalArsenicMgL > BIS_IS_10500.arsenic.acceptableMgL) {
    reasons.push(`Effluent As (${exp.finalArsenicMgL.toFixed(3)} mg/L) > BIS 0.01 mg/L`);
  }
  if (exp.finalFluorideMgL !== null && exp.finalFluorideMgL > BIS_IS_10500.fluoride.permissibleMgL) {
    reasons.push(`Effluent F⁻ (${exp.finalFluorideMgL.toFixed(2)} mg/L) > BIS 1.5 mg/L`);
  }
  if (exp.status === 'Needs Lab Verification') {
    reasons.push('Marked pending lab verification');
  }

  return {
    meetsBisArsenic,
    meetsBisFluoride,
    requiresAdditionalVerification: reasons.length > 0,
    flagReason: reasons.length > 0 ? reasons.join(' · ') : null,
  };
}
