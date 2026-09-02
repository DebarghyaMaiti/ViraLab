import { SimulationConfig } from '../types/simulation';

export const defaultSimulationConfig: SimulationConfig = {
  population: 1000000,
  durationDays: 120,
  timeStep: 0.2,
  solver: 'rk4',
  solverTolerance: 1e-5,
  mode: 'deterministic',
  stochasticRuns: 20,
  randomSeed: 42,
  strains: [
    {
      id: 'strain-wildtype',
      name: 'Wildtype (Baseline)',
      color: '#3b82f6', // blue
      beta: 0.45,
      incubationPeriod: 5.0,
      infectiousPeriod: 7.0,
      mortalityRate: 0.015, // 1.5%
      initialExposed: 50,
      initialInfected: 20,
      initialRecovered: 0,
      initialDeaths: 0,
      immuneEscape: 0.0,
      relativeFitness: 1.0,
    },
  ],
  interventions: [
    {
      id: 'itv-masks',
      name: 'Universal Mask Mandate',
      type: 'masks',
      startDay: 25,
      endDay: 90,
      transmissionReduction: 0.25,
      compliance: 0.80,
      enabled: false,
    },
    {
      id: 'itv-distancing',
      name: 'Social Distancing & Capacity Limits',
      type: 'social_distancing',
      startDay: 30,
      endDay: 75,
      transmissionReduction: 0.40,
      compliance: 0.75,
      enabled: false,
    },
    {
      id: 'itv-lockdown',
      name: 'Emergency Lockdown',
      type: 'lockdown',
      startDay: 35,
      endDay: 65,
      transmissionReduction: 0.65,
      compliance: 0.85,
      enabled: false,
    },
  ],
  vaccination: {
    enabled: false,
    startDay: 30,
    dailyRate: 4000, // 4,000 people/day
    coverageTarget: 0.70, // 70%
    efficacy: 0.85, // 85%
    waningPeriodDays: 240,
    variantEfficacyMap: {},
  },
  hospitalization: {
    enabled: false,
    hospitalCapacity: 2500,
    icuCapacity: 500,
    hospitalizationProb: 0.045, // 4.5%
    icuProb: 0.18, // 18% of hospitalizations
    hospitalStayDays: 8,
    icuStayDays: 10,
    hospitalMortality: 0.04,
    icuMortality: 0.25,
    overflowMortalityMultiplier: 1.6,
  },
  mutation: {
    enabled: false,
    parentStrainId: 'strain-wildtype',
    childStrainName: 'Variant Delta',
    childColor: '#ef4444',
    emergenceDay: 40,
    initialInoculum: 10,
    deltaBetaPercent: 40, // +40% transmission
    deltaMortalityPercent: -15,
    deltaIncubationDays: -1.0,
    immuneEscape: 0.35,
  },
  ageStructured: false,
  ageGroups: [
    {
      id: 'age-0-17',
      label: '0–17 (Pediatric)',
      fraction: 0.22,
      susceptibilityMultiplier: 0.6,
      contactMultiplier: 1.3,
      hospitalizationMultiplier: 0.1,
      mortalityMultiplier: 0.01,
    },
    {
      id: 'age-18-44',
      label: '18–44 (Young Adults)',
      fraction: 0.36,
      susceptibilityMultiplier: 1.0,
      contactMultiplier: 1.2,
      hospitalizationMultiplier: 0.6,
      mortalityMultiplier: 0.2,
    },
    {
      id: 'age-45-64',
      label: '45–64 (Middle-aged)',
      fraction: 0.25,
      susceptibilityMultiplier: 1.1,
      contactMultiplier: 0.9,
      hospitalizationMultiplier: 1.4,
      mortalityMultiplier: 1.2,
    },
    {
      id: 'age-65+',
      label: '65+ (Seniors)',
      fraction: 0.17,
      susceptibilityMultiplier: 1.2,
      contactMultiplier: 0.6,
      hospitalizationMultiplier: 3.2,
      mortalityMultiplier: 4.8,
    },
  ],
};

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  config: Partial<SimulationConfig>;
}

export const scenarioPresets: ScenarioPreset[] = [
  {
    id: 'fast-spreading',
    name: 'Fast-Spreading Variant',
    description: 'High basic reproduction number (R₀ ≈ 3.5), rapid 3-day incubation, leading to early aggressive peak.',
    badge: 'High Transmissibility',
    config: {
      durationDays: 90,
      strains: [
        {
          id: 'fast-strain',
          name: 'Hyper-Transmissible Strain',
          color: '#f97316',
          beta: 0.70,
          incubationPeriod: 3.0,
          infectiousPeriod: 5.0,
          mortalityRate: 0.01,
          initialExposed: 80,
          initialInfected: 30,
          initialRecovered: 0,
          initialDeaths: 0,
          immuneEscape: 0.0,
          relativeFitness: 1.0,
        },
      ],
    },
  },
  {
    id: 'high-mortality',
    name: 'Severe / High-Mortality Outbreak',
    description: 'Elevated case fatality rate (12%), prolonged 9-day infectious period, resulting in heavy death tolls.',
    badge: 'Severe Pathology',
    config: {
      durationDays: 120,
      strains: [
        {
          id: 'severe-strain',
          name: 'Severe Virulence Strain',
          color: '#dc2626',
          beta: 0.38,
          incubationPeriod: 6.0,
          infectiousPeriod: 9.0,
          mortalityRate: 0.12, // 12% mortality
          initialExposed: 40,
          initialInfected: 15,
          initialRecovered: 0,
          initialDeaths: 0,
          immuneEscape: 0.0,
          relativeFitness: 1.0,
        },
      ],
    },
  },
  {
    id: 'competing-variants',
    name: 'Variant Competition (Alpha vs Delta)',
    description: 'Wildtype baseline initially dominates, then a more transmissible variant (+45% β) outcompetes it.',
    badge: 'Multi-Strain Dynamics',
    config: {
      durationDays: 140,
      strains: [
        {
          id: 'strain-alpha',
          name: 'Variant Alpha (Baseline)',
          color: '#3b82f6',
          beta: 0.40,
          incubationPeriod: 5.0,
          infectiousPeriod: 7.0,
          mortalityRate: 0.018,
          initialExposed: 120,
          initialInfected: 50,
          initialRecovered: 0,
          initialDeaths: 0,
          immuneEscape: 0.0,
          relativeFitness: 1.0,
        },
        {
          id: 'strain-delta',
          name: 'Variant Delta (High Fitness)',
          color: '#ec4899',
          beta: 0.62,
          incubationPeriod: 4.0,
          infectiousPeriod: 6.0,
          mortalityRate: 0.022,
          initialExposed: 5,
          initialInfected: 2,
          initialRecovered: 0,
          initialDeaths: 0,
          immuneEscape: 0.3,
          relativeFitness: 1.55,
        },
      ],
    },
  },
  {
    id: 'vaccine-mitigation',
    name: 'Proactive Vaccination Campaign',
    description: 'Rapid vaccination rollout (6,000 doses/day, 85% efficacy) starting on Day 20, flattening the curve.',
    badge: 'Immunization Impact',
    config: {
      durationDays: 120,
      vaccination: {
        enabled: true,
        startDay: 20,
        dailyRate: 6000,
        coverageTarget: 0.75,
        efficacy: 0.88,
        waningPeriodDays: 270,
        variantEfficacyMap: {},
      },
    },
  },
  {
    id: 'healthcare-overload',
    name: 'Healthcare Capacity Crisis',
    description: 'High infection surge that breaches hospital and ICU thresholds, triggering overflow mortality.',
    badge: 'Clinical Capacity',
    config: {
      durationDays: 100,
      strains: [
        {
          id: 'strain-overload',
          name: 'Surge Strain',
          color: '#8b5cf6',
          beta: 0.52,
          incubationPeriod: 4.5,
          infectiousPeriod: 6.5,
          mortalityRate: 0.02,
          initialExposed: 200,
          initialInfected: 80,
          initialRecovered: 0,
          initialDeaths: 0,
          immuneEscape: 0.0,
          relativeFitness: 1.0,
        },
      ],
      hospitalization: {
        enabled: true,
        hospitalCapacity: 1200, // deliberately tight capacity
        icuCapacity: 250,
        hospitalizationProb: 0.06,
        icuProb: 0.22,
        hospitalStayDays: 9,
        icuStayDays: 11,
        hospitalMortality: 0.04,
        icuMortality: 0.28,
        overflowMortalityMultiplier: 1.9,
      },
    },
  },
  {
    id: 'slow-outbreak',
    name: 'Protracted Smoldering Outbreak',
    description: 'Low transmission rate (R₀ ≈ 1.25) leading to an elongated wave lasting several months.',
    badge: 'Endemic Progression',
    config: {
      durationDays: 200,
      strains: [
        {
          id: 'slow-strain',
          name: 'Low-Transmission Strain',
          color: '#10b981',
          beta: 0.22,
          incubationPeriod: 6.0,
          infectiousPeriod: 8.0,
          mortalityRate: 0.012,
          initialExposed: 30,
          initialInfected: 10,
          initialRecovered: 0,
          initialDeaths: 0,
          immuneEscape: 0.0,
          relativeFitness: 1.0,
        },
      ],
    },
  },
];

/**
 * Synthetic Historical Outbreak Dataset (Simulated noisy epidemiological time-series for validation and fitting).
 */
export const syntheticHistoricalOutbreakCsv = `date,day,daily_cases,total_cases,daily_deaths,total_deaths,recovered
2026-01-01,1,14,14,0,0,0
2026-01-02,2,19,33,0,0,1
2026-01-03,3,26,59,0,0,3
2026-01-04,4,38,97,1,1,6
2026-01-05,5,52,149,1,2,12
2026-01-06,6,74,223,1,3,20
2026-01-07,7,105,328,2,5,33
2026-01-08,8,148,476,3,8,52
2026-01-09,9,215,691,4,12,81
2026-01-10,10,298,989,6,18,124
2026-01-11,11,410,1399,9,27,192
2026-01-12,12,568,1967,13,40,295
2026-01-13,13,760,2727,18,58,450
2026-01-14,14,1030,3757,25,83,678
2026-01-15,15,1385,5142,34,117,1012
2026-01-16,16,1790,6932,47,164,1489
2026-01-17,17,2280,9212,63,227,2150
2026-01-18,18,2790,12002,84,311,3040
2026-01-19,19,3320,15322,110,421,4210
2026-01-20,20,3810,19132,142,563,5720
2026-01-21,21,4150,23282,178,741,7590
2026-01-22,22,4380,27662,216,957,9840
2026-01-23,23,4420,32082,254,1211,12480
2026-01-24,24,4290,36372,289,1500,15490
2026-01-25,25,3980,40352,318,1818,18810
2026-01-26,26,3550,43902,338,2156,22370
2026-01-27,27,3050,46952,345,2501,26090
2026-01-28,28,2520,49472,339,2840,29890
2026-01-29,29,2020,51492,321,3161,33680
2026-01-30,30,1580,53072,293,3454,37380
2026-01-31,31,1210,54282,259,3713,40890
2026-02-01,32,910,55192,222,3935,44130
2026-02-02,33,670,55862,185,4120,47050
2026-02-03,34,490,56352,151,4271,49610
2026-02-04,35,350,56702,121,4392,51810
2026-02-05,36,250,56952,95,4487,53670
2026-02-06,37,175,57127,73,4560,55210
2026-02-07,38,122,57249,55,4615,56460
2026-02-08,39,84,57333,41,4656,57460
2026-02-09,40,58,57391,30,4686,58250`;
