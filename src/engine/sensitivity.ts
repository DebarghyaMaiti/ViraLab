import { SimulationConfig, SimulationResults, Strain } from '../types/simulation';
import {
  ParameterMetadata,
  QueuedSimulation,
  SensitivityAnalysisSummary,
  SensitivityMetricKey,
  SensitivityParameterKey,
  SensitivityPoint,
  SweepPreset,
} from '../types/sensitivity';
import { runDeterministicSimulation } from './rk45';
import { runStochasticSimulation } from './stochastic';

export const PARAMETER_METADATA: Record<SensitivityParameterKey, ParameterMetadata> = {
  beta: {
    key: 'beta',
    label: 'Transmission Rate (β)',
    shortLabel: 'β',
    unit: '1/day',
    description: 'Daily contact and probability of viral transmission per contact',
    defaultMin: 0.15,
    defaultMax: 0.70,
    defaultSteps: 6,
    step: 0.01,
    format: (v) => v.toFixed(3),
  },
  infectiousPeriod: {
    key: 'infectiousPeriod',
    label: 'Infectious Duration (1/γ)',
    shortLabel: '1/γ',
    unit: 'days',
    description: 'Average number of days an infected individual remains contagious',
    defaultMin: 3.0,
    defaultMax: 14.0,
    defaultSteps: 6,
    step: 0.5,
    format: (v) => `${v.toFixed(1)} d`,
  },
  incubationPeriod: {
    key: 'incubationPeriod',
    label: 'Incubation Duration (1/σ)',
    shortLabel: '1/σ',
    unit: 'days',
    description: 'Days between initial exposure and infectious onset',
    defaultMin: 2.0,
    defaultMax: 10.0,
    defaultSteps: 5,
    step: 0.5,
    format: (v) => `${v.toFixed(1)} d`,
  },
  mortalityRate: {
    key: 'mortalityRate',
    label: 'Infection Fatality / Mortality (μ)',
    shortLabel: 'μ',
    unit: '%',
    description: 'Fraction of infected individuals who succumb to disease',
    defaultMin: 0.005,
    defaultMax: 0.05,
    defaultSteps: 6,
    step: 0.002,
    format: (v) => `${(v * 100).toFixed(2)}%`,
  },
  initialInfected: {
    key: 'initialInfected',
    label: 'Initial Infected Seeds (I₀)',
    shortLabel: 'I₀',
    unit: 'individuals',
    description: 'Initial seed cases igniting community transmission on day 0',
    defaultMin: 5,
    defaultMax: 500,
    defaultSteps: 6,
    step: 5,
    format: (v) => Math.round(v).toLocaleString(),
  },
  population: {
    key: 'population',
    label: 'Total Population (N)',
    shortLabel: 'N',
    unit: 'people',
    description: 'Total closed host population scale',
    defaultMin: 50000,
    defaultMax: 1000000,
    defaultSteps: 5,
    step: 50000,
    format: (v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${Math.round(v / 1000)}k`),
  },
  timeStep: {
    key: 'timeStep',
    label: 'Integration Step (dt)',
    shortLabel: 'dt',
    unit: 'days',
    description: 'Numerical time step for ODE Runge-Kutta solver convergence',
    defaultMin: 0.05,
    defaultMax: 0.50,
    defaultSteps: 5,
    step: 0.05,
    format: (v) => `${v.toFixed(2)} d`,
  },
  vaccineCoverage: {
    key: 'vaccineCoverage',
    label: 'Vaccine Target Coverage',
    shortLabel: 'Coverage',
    unit: '%',
    description: 'Proportion of target population inoculated against infection',
    defaultMin: 0.10,
    defaultMax: 0.90,
    defaultSteps: 6,
    step: 0.05,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  vaccineDailyRate: {
    key: 'vaccineDailyRate',
    label: 'Daily Vaccination Doses',
    shortLabel: 'Rollout',
    unit: 'doses/day',
    description: 'Daily throughput of vaccination distribution administration',
    defaultMin: 500,
    defaultMax: 10000,
    defaultSteps: 6,
    step: 500,
    format: (v) => `${Math.round(v).toLocaleString()}/day`,
  },
  interventionCompliance: {
    key: 'interventionCompliance',
    label: 'NPI Compliance Rate',
    shortLabel: 'Compliance',
    unit: '%',
    description: 'Adherence to mask mandates, social distancing, and isolation interventions',
    defaultMin: 0.10,
    defaultMax: 0.90,
    defaultSteps: 6,
    step: 0.05,
    format: (v) => `${Math.round(v * 100)}%`,
  },
};

export const SWEEP_PRESETS: SweepPreset[] = [
  {
    id: 'sweep-beta-transmissibility',
    name: 'Transmissibility (β) Sweep',
    description: 'Evaluate outbreak scaling from baseline R0 ~ 1.2 to hyper-transmissible R0 > 4.5',
    badge: 'Core R0 Sensitivity',
    paramKey: 'beta',
    min: 0.18,
    max: 0.65,
    steps: 7,
  },
  {
    id: 'sweep-npi-compliance',
    name: 'Intervention Compliance Sweep',
    description: 'Quantify public health mitigation efficacy from lax (15%) to strict (85%) adherence',
    badge: 'Policy Impact',
    paramKey: 'interventionCompliance',
    min: 0.10,
    max: 0.85,
    steps: 6,
  },
  {
    id: 'sweep-vaccine-coverage',
    name: 'Vaccine Target Coverage Sweep',
    description: 'Detect herd immunity tipping points by stepping vaccination from 20% to 90%',
    badge: 'Immunization Target',
    paramKey: 'vaccineCoverage',
    min: 0.20,
    max: 0.90,
    steps: 6,
  },
  {
    id: 'sweep-infectious-duration',
    name: 'Infectious Period (1/γ) Sweep',
    description: 'Test sensitivity to infectious shedding duration from 3 days to 14 days',
    badge: 'Clinical Parameter',
    paramKey: 'infectiousPeriod',
    min: 3.5,
    max: 12.0,
    steps: 6,
  },
  {
    id: 'sweep-initial-seeding',
    name: 'Outbreak Seed Size (I₀) Sweep',
    description: 'Simulate early detection advantage with initial cases varying from 10 to 500',
    badge: 'Surveillance Sensitivity',
    paramKey: 'initialInfected',
    min: 10,
    max: 400,
    steps: 6,
  },
  {
    id: 'sweep-fatality-rate',
    name: 'Infection Fatality (μ) Sweep',
    description: 'Measure mortality risk elasticity across mild (0.2%) to severe (3.5%) lethality',
    badge: 'Severity Spectrum',
    paramKey: 'mortalityRate',
    min: 0.003,
    max: 0.035,
    steps: 6,
  },
];

// Color palette for trajectory overlays across parameter values
export const SENSITIVITY_COLORS = [
  '#2563eb', // Blue 600
  '#0284c7', // Sky 600
  '#0d9488', // Teal 600
  '#16a34a', // Green 600
  '#ca8a04', // Yellow 600
  '#ea580c', // Orange 600
  '#dc2626', // Red 600
  '#9333ea', // Purple 600
  '#db2777', // Pink 600
  '#4f46e5', // Indigo 600
];

/**
 * Creates a cloned SimulationConfig with the specified parameter modified.
 */
export function createConfigWithParamOverride(
  baseConfig: SimulationConfig,
  paramKey: SensitivityParameterKey,
  value: number
): SimulationConfig {
  const cloned: SimulationConfig = JSON.parse(JSON.stringify(baseConfig));

  switch (paramKey) {
    case 'beta':
      if (cloned.strains && cloned.strains.length > 0) {
        cloned.strains[0].beta = value;
      }
      break;

    case 'infectiousPeriod':
      if (cloned.strains && cloned.strains.length > 0) {
        cloned.strains[0].infectiousPeriod = value;
      }
      break;

    case 'incubationPeriod':
      if (cloned.strains && cloned.strains.length > 0) {
        cloned.strains[0].incubationPeriod = value;
      }
      break;

    case 'mortalityRate':
      if (cloned.strains && cloned.strains.length > 0) {
        cloned.strains[0].mortalityRate = value;
      }
      break;

    case 'initialInfected':
      if (cloned.strains && cloned.strains.length > 0) {
        cloned.strains[0].initialInfected = Math.round(value);
      }
      break;

    case 'population':
      cloned.population = Math.round(value);
      break;

    case 'timeStep':
      cloned.timeStep = value;
      break;

    case 'vaccineCoverage':
      if (!cloned.vaccination) {
        cloned.vaccination = {
          enabled: true,
          startDay: 15,
          dailyRate: 1500,
          coverageTarget: value,
          efficacy: 0.85,
          waningPeriodDays: 180,
          variantEfficacyMap: {},
        };
      } else {
        cloned.vaccination.enabled = true;
        cloned.vaccination.coverageTarget = value;
      }
      break;

    case 'vaccineDailyRate':
      if (!cloned.vaccination) {
        cloned.vaccination = {
          enabled: true,
          startDay: 15,
          dailyRate: Math.round(value),
          coverageTarget: 0.70,
          efficacy: 0.85,
          waningPeriodDays: 180,
          variantEfficacyMap: {},
        };
      } else {
        cloned.vaccination.enabled = true;
        cloned.vaccination.dailyRate = Math.round(value);
      }
      break;

    case 'interventionCompliance':
      if (!cloned.interventions || cloned.interventions.length === 0) {
        cloned.interventions = [
          {
            id: 'npi-compliance-sweep',
            name: 'Public Health Precautionary Measures',
            type: 'social_distancing',
            startDay: 10,
            endDay: cloned.durationDays,
            transmissionReduction: 0.50,
            compliance: value,
            enabled: true,
          },
        ];
      } else {
        cloned.interventions = cloned.interventions.map((inv) => ({
          ...inv,
          enabled: true,
          compliance: value,
        }));
      }
      break;
  }

  return cloned;
}

/**
 * Builds a sequence of QueuedSimulation objects for a parameter sweep.
 */
export function buildSweepQueue(
  baseConfig: SimulationConfig,
  paramKey: SensitivityParameterKey,
  minValue: number,
  maxValue: number,
  steps: number
): QueuedSimulation[] {
  const meta = PARAMETER_METADATA[paramKey];
  const count = Math.max(2, Math.min(20, Math.round(steps)));
  const stepSize = count > 1 ? (maxValue - minValue) / (count - 1) : 0;
  const queue: QueuedSimulation[] = [];

  for (let i = 0; i < count; i++) {
    const rawVal = minValue + i * stepSize;
    // Format precision according to metadata
    const roundedVal = paramKey === 'initialInfected' || paramKey === 'population' || paramKey === 'vaccineDailyRate'
      ? Math.round(rawVal)
      : Number(rawVal.toFixed(4));

    const cfg = createConfigWithParamOverride(baseConfig, paramKey, roundedVal);
    const formatted = meta.format(roundedVal);

    queue.push({
      id: `sim-sweep-${paramKey}-${i + 1}-${Date.now().toString(36)}`,
      label: `${meta.shortLabel} = ${formatted}`,
      paramKey,
      paramLabel: meta.label,
      paramValue: roundedVal,
      unit: meta.unit,
      config: cfg,
      status: 'idle',
      progress: 0,
    });
  }

  return queue;
}

/**
 * Runs a single simulation either via /api/simulation/run with fallback to local ODE solver.
 */
export async function executeSingleSimulation(config: SimulationConfig): Promise<SimulationResults> {
  try {
    const res = await fetch('/api/simulation/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // API not reached, run in-memory
  }

  if (config.mode === 'stochastic') {
    return runStochasticSimulation(config);
  }
  return runDeterministicSimulation(config);
}

/**
 * Executes an array of queued simulations sequentially, invoking progress callbacks between runs.
 */
export async function executeQueueInSequence(
  queue: QueuedSimulation[],
  onItemStart: (index: number, item: QueuedSimulation) => void,
  onItemCompleted: (index: number, updatedItem: QueuedSimulation) => void,
  isCancelledRef: { current: boolean }
): Promise<QueuedSimulation[]> {
  const updatedQueue = [...queue];

  for (let i = 0; i < updatedQueue.length; i++) {
    if (isCancelledRef.current) {
      break;
    }

    const currentItem = { ...updatedQueue[i], status: 'running' as const, progress: 20 };
    updatedQueue[i] = currentItem;
    onItemStart(i, currentItem);

    // Yield to the event loop so the UI updates smoothly
    await new Promise((r) => setTimeout(r, 16));

    const startTime = performance.now();
    try {
      const results = await executeSingleSimulation(currentItem.config);
      const durationMs = Math.round(performance.now() - startTime);

      const completedItem: QueuedSimulation = {
        ...currentItem,
        status: 'completed',
        progress: 100,
        durationMs,
        results,
      };
      updatedQueue[i] = completedItem;
      onItemCompleted(i, completedItem);
    } catch (err: any) {
      const failedItem: QueuedSimulation = {
        ...currentItem,
        status: 'failed',
        progress: 0,
        error: err?.message || 'Simulation error',
      };
      updatedQueue[i] = failedItem;
      onItemCompleted(i, failedItem);
    }

    // Brief delay to allow React state flush and smooth animation
    await new Promise((r) => setTimeout(r, 20));
  }

  return updatedQueue;
}

/**
 * Extracts normalized sensitivity data points from completed queue items.
 */
export function extractSensitivityPoints(queue: QueuedSimulation[]): SensitivityPoint[] {
  const completed = queue.filter((q) => q.status === 'completed' && q.results);
  const meta = queue[0] ? PARAMETER_METADATA[queue[0].paramKey] : null;

  return completed.map((item, index) => {
    const kpis = item.results!.kpis;
    const color = SENSITIVITY_COLORS[index % SENSITIVITY_COLORS.length];
    const formatted = meta ? meta.format(item.paramValue) : String(item.paramValue);

    return {
      runId: item.id,
      label: item.label,
      paramValue: item.paramValue,
      formattedValue: formatted,
      r0: Number((kpis.basicR0 || 0).toFixed(2)),
      maxRe: Number((kpis.maxRe || 0).toFixed(2)),
      peakActive: Math.round(kpis.peakActive || 0),
      peakDay: Math.round(kpis.peakDay || 0),
      totalInfected: Math.round(kpis.totalInfected || 0),
      attackRate: Number(((kpis.attackRate || 0) * 100).toFixed(1)),
      totalDeaths: Math.round(kpis.totalDeaths || 0),
      crudeMortalityRate: Number(((kpis.crudeMortalityRate || 0) * 100).toFixed(2)),
      peakHospitalized: Math.round(kpis.peakHospitalized || 0),
      hospitalOverloadDays: Math.round(kpis.hospitalOverloadDays || 0),
      color,
    };
  });
}

/**
 * Computes elasticity and summary statistics for sensitivity analysis.
 */
export function computeSensitivitySummary(
  points: SensitivityPoint[],
  paramKey: SensitivityParameterKey
): SensitivityAnalysisSummary | null {
  if (points.length < 2) return null;

  const meta = PARAMETER_METADATA[paramKey];

  // Sort by parameter value ascending
  const sorted = [...points].sort((a, b) => a.paramValue - b.paramValue);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const deltaParam = last.paramValue - first.paramValue;
  const avgParam = (last.paramValue + first.paramValue) / 2;

  // Elasticity of Peak Active: (% delta peak) / (% delta param)
  let elasticityPeakActive = 0;
  if (deltaParam !== 0 && avgParam > 0) {
    const deltaPeak = last.peakActive - first.peakActive;
    const avgPeak = Math.max(1, (last.peakActive + first.peakActive) / 2);
    const pctDeltaParam = deltaParam / avgParam;
    const pctDeltaPeak = deltaPeak / avgPeak;
    elasticityPeakActive = Number((pctDeltaPeak / pctDeltaParam).toFixed(2));
  }

  // Elasticity of Total Deaths
  let elasticityDeaths = 0;
  if (deltaParam !== 0 && avgParam > 0) {
    const deltaDeaths = last.totalDeaths - first.totalDeaths;
    const avgDeaths = Math.max(1, (last.totalDeaths + first.totalDeaths) / 2);
    const pctDeltaParam = deltaParam / avgParam;
    const pctDeltaDeaths = deltaDeaths / avgDeaths;
    elasticityDeaths = Number((pctDeltaDeaths / pctDeltaParam).toFixed(2));
  }

  // Qualitative sensitivity rating
  const absElasticity = Math.abs(elasticityPeakActive);
  let sensitivityRating: SensitivityAnalysisSummary['sensitivityRating'] = 'Moderate';
  if (absElasticity < 0.4) sensitivityRating = 'Inelastic';
  else if (absElasticity < 1.0) sensitivityRating = 'Moderate';
  else if (absElasticity < 2.0) sensitivityRating = 'High';
  else sensitivityRating = 'Super-sensitive';

  // Peak Day Shift (days per unit param change)
  const peakDayShiftPerUnit =
    deltaParam !== 0 ? Number(((last.peakDay - first.peakDay) / deltaParam).toFixed(1)) : 0;

  // Detect critical tipping point (e.g. R0 crosses 1.0 or hospital overload occurs)
  let tippingPoint: SensitivityAnalysisSummary['tippingPoint'] = null;

  // Check R0 crossover near 1.0
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if ((prev.r0 < 1.0 && curr.r0 >= 1.0) || (prev.r0 >= 1.0 && curr.r0 < 1.0)) {
      tippingPoint = {
        description: `Epidemic threshold (R₀ = 1.0) inflection`,
        criticalValue: Number(((prev.paramValue + curr.paramValue) / 2).toFixed(3)),
        metricAffected: 'R₀',
      };
      break;
    }
  }

  // If no R0 tipping point, check hospital saturation tipping point
  if (!tippingPoint) {
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.hospitalOverloadDays === 0 && curr.hospitalOverloadDays > 0) {
        tippingPoint = {
          description: `Healthcare system bed capacity breached`,
          criticalValue: Number(((prev.paramValue + curr.paramValue) / 2).toFixed(3)),
          metricAffected: 'Hospital Beds',
        };
        break;
      }
    }
  }

  // Best and worst runs based on lowest and highest total deaths/peak active
  const bestRun = [...sorted].sort((a, b) => a.totalDeaths - b.totalDeaths)[0];
  const worstRun = [...sorted].sort((a, b) => b.totalDeaths - a.totalDeaths)[0];

  return {
    paramKey,
    paramLabel: meta.label,
    unit: meta.unit,
    points: sorted,
    elasticityPeakActive,
    elasticityDeaths,
    sensitivityRating,
    tippingPoint,
    peakDayShiftPerUnit,
    bestRun,
    worstRun,
  };
}

/**
 * Exports sensitivity analysis points to CSV.
 */
export function exportSensitivityDataAsCsv(points: SensitivityPoint[], paramLabel: string) {
  const headers = [
    'RunLabel',
    `ParameterValue (${paramLabel})`,
    'R0',
    'Max_Re',
    'PeakActiveCases',
    'PeakDay',
    'TotalInfected',
    'AttackRate_Pct',
    'TotalDeaths',
    'CrudeMortality_Pct',
    'PeakHospitalized',
    'HospitalOverloadDays',
  ];

  const rows = points.map((p) => [
    `"${p.label.replace(/"/g, '""')}"`,
    p.paramValue,
    p.r0,
    p.maxRe,
    p.peakActive,
    p.peakDay,
    p.totalInfected,
    p.attackRate,
    p.totalDeaths,
    p.crudeMortalityRate,
    p.peakHospitalized,
    p.hospitalOverloadDays,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `viralab_sensitivity_analysis_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports complete sensitivity analysis summary as JSON.
 */
export function exportSensitivityDataAsJson(summary: SensitivityAnalysisSummary) {
  const jsonContent = JSON.stringify(summary, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `viralab_sensitivity_summary_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
