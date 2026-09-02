export interface Strain {
  id: string;
  name: string;
  color: string;
  beta: number; // transmission rate
  incubationPeriod: number; // days (1/sigma)
  infectiousPeriod: number; // days (1/gamma)
  mortalityRate: number; // fraction 0 - 1 (mu_fraction)
  initialExposed: number;
  initialInfected: number;
  initialRecovered: number;
  initialDeaths: number;
  immuneEscape: number; // 0 to 1
  relativeFitness: number; // relative fitness multiplier (1.0 = baseline)
}

export type InterventionType = 
  | 'social_distancing'
  | 'masks'
  | 'lockdown'
  | 'contact_reduction'
  | 'isolation'
  | 'testing';

export interface Intervention {
  id: string;
  name: string;
  type: InterventionType;
  startDay: number;
  endDay: number;
  transmissionReduction: number; // 0.0 - 1.0 (e.g. 0.35 = 35% reduction)
  compliance: number; // 0.0 - 1.0 (e.g. 0.8 = 80% compliance)
  enabled: boolean;
}

export interface VaccinationConfig {
  enabled: boolean;
  startDay: number;
  dailyRate: number; // people vaccinated per day
  coverageTarget: number; // e.g. 0.75 for 75%
  efficacy: number; // e.g. 0.85 for 85%
  waningPeriodDays: number; // e.g. 180 days (0 = no waning)
  variantEfficacyMap: Record<string, number>; // strainId -> multiplier (e.g. 0.7 for Delta)
}

export interface HospitalizationConfig {
  enabled: boolean;
  hospitalCapacity: number; // total available acute beds
  icuCapacity: number; // total available ICU beds
  hospitalizationProb: number; // fraction of active infections needing hospital (0.05)
  icuProb: number; // fraction of hospitalized needing ICU (0.2)
  hospitalStayDays: number; // average duration in hospital (e.g. 8 days)
  icuStayDays: number; // average duration in ICU (e.g. 10 days)
  hospitalMortality: number; // mortality rate among hospitalized non-ICU (e.g. 0.04)
  icuMortality: number; // mortality rate among ICU patients (e.g. 0.25)
  overflowMortalityMultiplier: number; // increase in mortality when capacity is exceeded (e.g. 1.6x)
}

export interface AgeGroup {
  id: string;
  label: string;
  fraction: number; // portion of total population (sums to 1.0)
  susceptibilityMultiplier: number; // multiplier on beta
  contactMultiplier: number; // relative contact rate
  hospitalizationMultiplier: number; // relative hospital risk
  mortalityMultiplier: number; // relative death risk
}

export interface MutationConfig {
  enabled: boolean;
  parentStrainId: string;
  childStrainName: string;
  childColor: string;
  emergenceDay: number;
  initialInoculum: number; // small seed of new mutated strain
  deltaBetaPercent: number; // e.g. +30%
  deltaMortalityPercent: number; // e.g. -10%
  deltaIncubationDays: number; // e.g. -1 day
  immuneEscape: number; // 0 to 1
}

export interface SimulationConfig {
  population: number;
  durationDays: number;
  timeStep: number; // dt (days, e.g. 0.2)
  solver: 'rk4' | 'rk45';
  solverTolerance: number;
  mode: 'deterministic' | 'stochastic';
  stochasticRuns: number; // e.g. 20
  randomSeed: number;
  strains: Strain[];
  interventions: Intervention[];
  vaccination: VaccinationConfig;
  hospitalization: HospitalizationConfig;
  mutation: MutationConfig;
  ageStructured: boolean;
  ageGroups?: AgeGroup[];
}

export interface StrainTimeMetric {
  E: number;
  I: number;
  R: number;
  D: number;
  activeShare: number; // 0 - 100%
  Re: number;
  newInfections: number;
}

export interface SimulationTimePoint {
  day: number;
  S: number;
  E: number;
  I: number;
  R: number;
  D: number;
  V?: number; // vaccinated protected
  H?: number; // hospitalized
  ICU?: number; // in ICU
  totalActive: number;
  newInfectionsDaily: number;
  cumulativeInfections: number;
  effectiveR: number;
  effectiveTransmissionRate: number;
  strainMetrics: Record<string, StrainTimeMetric>;
  hospitalUtilization?: number; // fraction 0 - 2.0+
  icuUtilization?: number; // fraction 0 - 2.0+
  capacityExceeded?: boolean;
  icuCapacityExceeded?: boolean;
  // Stochastic confidence bounds
  p05Active?: number;
  p25Active?: number;
  p50Active?: number;
  p75Active?: number;
  p95Active?: number;
  p05Deaths?: number;
  p50Deaths?: number;
  p95Deaths?: number;
}

export interface StrainSummary {
  strainId: string;
  name: string;
  color: string;
  totalInfected: number;
  peakInfected: number;
  peakDay: number;
  totalDeaths: number;
  timeToDominance?: number | null; // day when it became >50% of active cases
  R0: number;
  currentRe: number;
  maxRe: number;
}

export interface SimulationKPIs {
  population: number;
  totalInfected: number;
  attackRate: number; // fraction of population infected
  currentActive: number;
  peakActive: number;
  peakDay: number;
  totalRecovered: number;
  totalDeaths: number;
  crudeMortalityRate: number;
  basicR0: number;
  currentRe: number;
  maxRe: number;
  vaccinatedTotal?: number;
  effectiveProtection?: number;
  infectionsPreventedVsBaseline?: number;
  deathsPreventedVsBaseline?: number;
  peakHospitalized?: number;
  hospitalOverloadDays?: number;
  strainSummaries: StrainSummary[];
}

export interface SimulationResults {
  id: string;
  timestamp: string;
  config: SimulationConfig;
  timeSeries: SimulationTimePoint[];
  kpis: SimulationKPIs;
  conservationCheck: {
    passed: boolean;
    maxDiscrepancy: number;
    initialSum: number;
    finalSum: number;
  };
  assumptions: string[];
}

export interface ScenarioComparisonItem {
  id: string;
  name: string;
  description: string;
  color: string;
  config: SimulationConfig;
  results?: SimulationResults;
}

export interface ComparisonSummary {
  scenarios: Array<{
    id: string;
    name: string;
    color: string;
    totalInfected: number;
    attackRate: number;
    peakActive: number;
    peakDay: number;
    totalDeaths: number;
    crudeMortality: number;
    maxRe: number;
    peakHospitalized?: number;
    hospitalOverloadDays?: number;
    deathsPreventedVsBaseline: number;
    infectionsPreventedVsBaseline: number;
    peakReductionPercent: number;
  }>;
}

export interface DataQualityIssue {
  type: 'missing' | 'duplicate' | 'invalid_date' | 'negative' | 'non_monotonic' | 'outlier';
  severity: 'error' | 'warning' | 'info';
  column: string;
  count: number;
  message: string;
}

export interface QualityReport {
  valid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  issues: DataQualityIssue[];
  cleanOpsApplied: string[];
  totalRows: number;
  usableRows: number;
}

export interface ColumnMappingConfidence {
  detectedColumn: string | null;
  confidence: number; // 0 - 100%
  alternatives: Array<{ column: string; confidence: number }>;
}

export interface DatasetRecord {
  date: string;
  dayIndex: number;
  newCases?: number;
  totalCases?: number;
  deaths?: number;
  totalDeaths?: number;
  recovered?: number;
  [key: string]: any;
}

export interface DatasetMetadata {
  id: string;
  name: string;
  source: string;
  sourceUrl?: string;
  uploadTimestamp: string;
  lastUpdated: string;
  fileType: 'csv' | 'json' | 'tsv';
  rowCount: number;
  columnCount: number;
  rawColumns: string[];
  columnMappings: {
    dateCol?: string;
    newCasesCol?: string;
    totalCasesCol?: string;
    deathsCol?: string;
    totalDeathsCol?: string;
    recoveredCol?: string;
  };
  confidences: Record<string, ColumnMappingConfidence>;
  qualityReport: QualityReport;
  data: DatasetRecord[];
  provenance: {
    cleanOperations: string[];
    parameterEstimationApplied?: boolean;
    modelVersion: string;
  };
}

export interface ParameterEstimationResult {
  beta: number;
  gamma: number;
  mu: number;
  sigma: number;
  R0: number;
  incubationPeriodDays: number;
  infectiousPeriodDays: number;
  fitMetrics: {
    mae: number;
    rmse: number;
    mape: number;
    r2: number;
  };
  confidenceIntervals: {
    beta: [number, number];
    gamma: [number, number];
    mu: [number, number];
    R0: [number, number];
  };
  observationsUsed: number;
  method: string;
  assumptions: string[];
  residuals: Array<{
    day: number;
    date?: string;
    observed: number;
    model: number;
    residual: number;
  }>;
}
