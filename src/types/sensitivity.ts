import { SimulationConfig, SimulationResults } from './simulation';

export type SensitivityParameterKey =
  | 'beta'
  | 'infectiousPeriod'
  | 'incubationPeriod'
  | 'mortalityRate'
  | 'initialInfected'
  | 'population'
  | 'timeStep'
  | 'vaccineCoverage'
  | 'vaccineDailyRate'
  | 'interventionCompliance';

export type SensitivityMetricKey =
  | 'peakActive'
  | 'peakDay'
  | 'totalInfected'
  | 'attackRate'
  | 'totalDeaths'
  | 'basicR0'
  | 'maxRe'
  | 'peakHospitalized'
  | 'hospitalOverloadDays';

export interface ParameterMetadata {
  key: SensitivityParameterKey;
  label: string;
  shortLabel: string;
  unit: string;
  description: string;
  defaultMin: number;
  defaultMax: number;
  defaultSteps: number;
  step: number;
  format: (val: number) => string;
}

export interface QueuedSimulation {
  id: string;
  label: string;
  paramKey: SensitivityParameterKey;
  paramLabel: string;
  paramValue: number;
  unit: string;
  config: SimulationConfig;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number; // 0 - 100
  durationMs?: number;
  error?: string;
  results?: SimulationResults;
}

export interface SensitivityPoint {
  runId: string;
  label: string;
  paramValue: number;
  formattedValue: string;
  r0: number;
  maxRe: number;
  peakActive: number;
  peakDay: number;
  totalInfected: number;
  attackRate: number; // percentage 0 - 100
  totalDeaths: number;
  crudeMortalityRate: number; // percentage
  peakHospitalized: number;
  hospitalOverloadDays: number;
  color: string;
}

export interface SensitivityAnalysisSummary {
  paramKey: SensitivityParameterKey;
  paramLabel: string;
  unit: string;
  points: SensitivityPoint[];
  // Elasticity of peak active cases: (% delta outcome) / (% delta param)
  elasticityPeakActive: number;
  // Elasticity of cumulative deaths
  elasticityDeaths: number;
  // Qualitative sensitivity index
  sensitivityRating: 'Inelastic' | 'Moderate' | 'High' | 'Super-sensitive';
  // Critical tipping point if detected (e.g. R0 crosses 1.0 or hospital overload starts)
  tippingPoint?: {
    description: string;
    criticalValue: number;
    metricAffected: string;
  } | null;
  // Peak day delay (days shift per unit change in parameter)
  peakDayShiftPerUnit: number;
  bestRun: SensitivityPoint;
  worstRun: SensitivityPoint;
}

export interface SweepPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  paramKey: SensitivityParameterKey;
  min: number;
  max: number;
  steps: number;
}
