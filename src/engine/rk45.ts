import {
  SimulationConfig,
  SimulationResults,
  SimulationTimePoint,
  Strain,
  StrainSummary,
  StrainTimeMetric,
} from '../types/simulation';
import {
  computeDerivatives,
  getInterventionMultiplier,
  packState,
  unpackState,
} from './seird';
import { validateSimulationConfig } from './validation';

/**
 * Executes a single RK4 step.
 */
function rk4Step(
  t: number,
  y: number[],
  dt: number,
  strains: Strain[],
  config: SimulationConfig
): number[] {
  const k1 = computeDerivatives(t, y, strains, config);

  const y_k2 = y.map((val, i) => Math.max(0, val + 0.5 * dt * k1[i]));
  const k2 = computeDerivatives(t + 0.5 * dt, y_k2, strains, config);

  const y_k3 = y.map((val, i) => Math.max(0, val + 0.5 * dt * k2[i]));
  const k3 = computeDerivatives(t + 0.5 * dt, y_k3, strains, config);

  const y_k4 = y.map((val, i) => Math.max(0, val + dt * k3[i]));
  const k4 = computeDerivatives(t + dt, y_k4, strains, config);

  const nextY = y.map((val, i) => {
    const nextVal = val + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    return Math.max(0, Number.isFinite(nextVal) ? nextVal : val);
  });

  return nextY;
}

/**
 * Main deterministic multi-strain SEIRD solver.
 */
export function runDeterministicSimulation(config: SimulationConfig): SimulationResults {
  const validation = validateSimulationConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid simulation configuration:\n${validation.errors.join('\n')}`);
  }

  // Handle dynamic child strain if mutation is enabled
  const activeStrains: Strain[] = [...config.strains];
  if (config.mutation && config.mutation.enabled) {
    const parent = config.strains.find((s) => s.id === config.mutation.parentStrainId) || config.strains[0];
    const childStrain: Strain = {
      id: `mutant-${Date.now()}`,
      name: config.mutation.childStrainName || `${parent.name} (Mutant)`,
      color: config.mutation.childColor || '#f97316',
      beta: parent.beta * (1 + config.mutation.deltaBetaPercent / 100),
      incubationPeriod: Math.max(1, parent.incubationPeriod + config.mutation.deltaIncubationDays),
      infectiousPeriod: parent.infectiousPeriod,
      mortalityRate: Math.min(1, Math.max(0, parent.mortalityRate * (1 + config.mutation.deltaMortalityPercent / 100))),
      initialExposed: 0,
      initialInfected: 0,
      initialRecovered: 0,
      initialDeaths: 0,
      immuneEscape: config.mutation.immuneEscape,
      relativeFitness: 1.0 + config.mutation.deltaBetaPercent / 100,
    };
    activeStrains.push(childStrain);
  }

  const numStrains = activeStrains.length;

  // Initialize compartments
  let sumE0 = 0;
  let sumI0 = 0;
  let sumR0 = 0;
  let sumD0 = 0;

  const strainStates = activeStrains.map((s) => {
    sumE0 += s.initialExposed;
    sumI0 += s.initialInfected;
    sumR0 += s.initialRecovered;
    sumD0 += s.initialDeaths;
    return {
      E: s.initialExposed,
      I: s.initialInfected,
      R: s.initialRecovered,
      D: s.initialDeaths,
    };
  });

  const S0 = Math.max(0, config.population - (sumE0 + sumI0 + sumR0 + sumD0));
  const V0 = 0;
  const H0 = 0;
  const ICU0 = 0;

  let currentState = packState(S0, V0, strainStates, H0, ICU0);
  const initialPopulationSum = currentState.reduce((a, b) => a + b, 0);

  const duration = config.durationDays;
  const dt = Math.max(0.05, Math.min(0.5, config.timeStep || 0.2));
  const totalSteps = Math.ceil(duration / dt);

  const timeSeries: SimulationTimePoint[] = [];

  // Track cumulative infections per strain for attack rate
  let prevS = S0;
  let prevV = V0;
  let cumulativeNewInfections = sumI0 + sumE0;

  let peakActive = 0;
  let peakDay = 0;
  let peakHosp = 0;
  let hospitalOverloadCount = 0;

  let mutationInjected = false;

  // Record initial day 0
  const initialPoint = createTimePoint(
    0,
    currentState,
    activeStrains,
    config,
    0,
    cumulativeNewInfections
  );
  timeSeries.push(initialPoint);

  let currentT = 0;
  for (let step = 1; step <= totalSteps; step++) {
    currentT += dt;

    // Check mutation emergence
    if (
      config.mutation &&
      config.mutation.enabled &&
      !mutationInjected &&
      currentT >= config.mutation.emergenceDay
    ) {
      const childIdx = numStrains - 1;
      const base = 2 + childIdx * 4;
      const seed = Math.max(1, config.mutation.initialInoculum || 5);
      currentState[base + 1] = seed; // inject initial infected
      currentState[0] = Math.max(0, currentState[0] - seed);
      mutationInjected = true;
    }

    currentState = rk4Step(currentT, currentState, dt, activeStrains, config);

    // Sample once per simulated day (or integer day boundaries)
    const isDaySample = Math.abs(currentT - Math.round(currentT)) < dt / 1.99;
    if (isDaySample || step === totalSteps) {
      const dayIndex = Math.round(currentT);
      const unpacked = unpackState(currentState, numStrains);

      // Inflow into infected (difference in S and V)
      const dailyDropInS = Math.max(0, prevS - unpacked.S);
      const dailyDropInV = Math.max(0, prevV - unpacked.V);
      const newInfectionsDaily = dailyDropInS + dailyDropInV;
      cumulativeNewInfections += newInfectionsDaily;
      prevS = unpacked.S;
      prevV = unpacked.V;

      const point = createTimePoint(
        dayIndex,
        currentState,
        activeStrains,
        config,
        newInfectionsDaily,
        cumulativeNewInfections
      );

      if (point.totalActive > peakActive) {
        peakActive = point.totalActive;
        peakDay = dayIndex;
      }
      if ((point.H || 0) > peakHosp) {
        peakHosp = point.H || 0;
      }
      if (point.capacityExceeded) {
        hospitalOverloadCount++;
      }

      timeSeries.push(point);
    }
  }

  // De-duplicate any multiple day samples
  const dayMap = new Map<number, SimulationTimePoint>();
  for (const pt of timeSeries) {
    dayMap.set(pt.day, pt);
  }
  const cleanTimeSeries = Array.from(dayMap.values()).sort((a, b) => a.day - b.day);

  // Compute final population conservation check
  const finalState = currentState;
  const finalPopulationSum = finalState.reduce((a, b) => a + b, 0);
  const maxDiscrepancy = Math.abs(finalPopulationSum - initialPopulationSum);
  const conservationPassed = maxDiscrepancy / config.population < 0.005; // within 0.5% tolerance

  // Calculate Strain summaries
  const lastPoint = cleanTimeSeries[cleanTimeSeries.length - 1];
  const strainSummaries: StrainSummary[] = activeStrains.map((strain, idx) => {
    let strainPeak = 0;
    let strainPeakDay = 0;
    let timeToDominance: number | null = null;
    let maxStrainRe = 0;

    cleanTimeSeries.forEach((pt) => {
      const sMetric = pt.strainMetrics[strain.id];
      if (sMetric) {
        if (sMetric.I > strainPeak) {
          strainPeak = sMetric.I;
          strainPeakDay = pt.day;
        }
        if (sMetric.activeShare >= 50 && timeToDominance === null) {
          timeToDominance = pt.day;
        }
        if (sMetric.Re > maxStrainRe) {
          maxStrainRe = sMetric.Re;
        }
      }
    });

    const sigma = 1 / Math.max(0.1, strain.incubationPeriod);
    const gamma = 1 / Math.max(0.1, strain.infectiousPeriod);
    const mu = (strain.mortalityRate * gamma) / Math.max(0.001, 1 - strain.mortalityRate);
    const R0 = (strain.beta * strain.relativeFitness) / (gamma + mu);
    const lastRe = lastPoint?.strainMetrics[strain.id]?.Re || 0;

    return {
      strainId: strain.id,
      name: strain.name,
      color: strain.color,
      totalInfected: Math.round(lastPoint?.strainMetrics[strain.id]?.R + lastPoint?.strainMetrics[strain.id]?.D + lastPoint?.strainMetrics[strain.id]?.I || 0),
      peakInfected: Math.round(strainPeak),
      peakDay: strainPeakDay,
      totalDeaths: Math.round(lastPoint?.strainMetrics[strain.id]?.D || 0),
      timeToDominance,
      R0: Number(R0.toFixed(2)),
      currentRe: Number(lastRe.toFixed(2)),
      maxRe: Number(maxStrainRe.toFixed(2)),
    };
  });

  const totalDeaths = cleanTimeSeries.reduce(
    (acc, pt) => Math.max(acc, pt.D),
    0
  );
  const totalRecovered = lastPoint?.R || 0;
  const currentActive = lastPoint?.totalActive || 0;
  const totalInfected = Math.min(
    config.population,
    Math.round(lastPoint ? config.population - lastPoint.S - (lastPoint.V || 0) : 0)
  );

  const attackRate = Number((totalInfected / config.population).toFixed(4));
  const crudeMortalityRate = totalInfected > 0 ? Number((totalDeaths / totalInfected).toFixed(4)) : 0;

  // Primary strain R0
  const primaryStrain = activeStrains[0];
  const gamma0 = 1 / Math.max(0.1, primaryStrain.infectiousPeriod);
  const mu0 = (primaryStrain.mortalityRate * gamma0) / Math.max(0.001, 1 - primaryStrain.mortalityRate);
  const basicR0 = Number((primaryStrain.beta / (gamma0 + mu0)).toFixed(2));
  const currentRe = lastPoint ? Number(lastPoint.effectiveR.toFixed(2)) : basicR0;
  const maxRe = Number(
    Math.max(...cleanTimeSeries.map((pt) => pt.effectiveR)).toFixed(2)
  );

  return {
    id: `sim-${Date.now()}`,
    timestamp: new Date().toISOString(),
    config,
    timeSeries: cleanTimeSeries,
    kpis: {
      population: config.population,
      totalInfected,
      attackRate,
      currentActive: Math.round(currentActive),
      peakActive: Math.round(peakActive),
      peakDay,
      totalRecovered: Math.round(totalRecovered),
      totalDeaths: Math.round(totalDeaths),
      crudeMortalityRate,
      basicR0,
      currentRe,
      maxRe,
      vaccinatedTotal: lastPoint?.V ? Math.round(lastPoint.V) : undefined,
      peakHospitalized: config.hospitalization?.enabled ? Math.round(peakHosp) : undefined,
      hospitalOverloadDays: hospitalOverloadCount,
      strainSummaries,
    },
    conservationCheck: {
      passed: conservationPassed,
      maxDiscrepancy: Number(maxDiscrepancy.toFixed(2)),
      initialSum: Math.round(initialPopulationSum),
      finalSum: Math.round(finalPopulationSum),
    },
    assumptions: [
      'Standard multi-strain SEIRD compartmental ODE model with shared susceptible population S.',
      'Homogeneous mixing assumption: every susceptible individual has an equal probability of contacting infectious individuals.',
      'Basic reproduction number R₀ ≈ β / (γ + μ) represents average secondary transmissions in a completely naive population.',
      'Effective reproduction number Rₑ(t) ≈ R₀ × S(t)/N × (1 - intervention_reduction(t)) reflects instantaneous transmissibility.',
      'Public health interventions reduce effective transmission rate β multiplicatively based on specified efficacy and compliance.',
      'Vaccination confers immunity that reduces susceptibility by vaccine efficacy and variant escape factors.',
      config.hospitalization?.enabled
        ? 'Healthcare capacity overflow triggers a mortality penalty multiplier when total hospitalized patients exceed available acute beds.'
        : 'Unlimited healthcare capacity assumed; no overflow mortality modifier active.',
    ],
  };
}

function createTimePoint(
  day: number,
  y: number[],
  activeStrains: Strain[],
  config: SimulationConfig,
  newInfectionsDaily: number,
  cumulativeInfections: number
): SimulationTimePoint {
  const numStrains = activeStrains.length;
  const { S, V, strains, H, ICU } = unpackState(y, numStrains);

  let totalE = 0;
  let totalI = 0;
  let totalR = 0;
  let totalD = 0;

  for (const s of strains) {
    totalE += s.E;
    totalI += s.I;
    totalR += s.R;
    totalD += s.D;
  }

  const interventionMult = getInterventionMultiplier(day, config);
  const susceptibleFraction = (S + (1 - (config.vaccination?.enabled ? config.vaccination.efficacy : 0)) * V) / config.population;

  // Strain metrics
  const strainMetrics: Record<string, StrainTimeMetric> = {};
  let weightedReSum = 0;

  activeStrains.forEach((strain, idx) => {
    const s = strains[idx];
    const gamma = 1 / Math.max(0.1, strain.infectiousPeriod);
    const mu = (strain.mortalityRate * gamma) / Math.max(0.001, 1 - strain.mortalityRate);
    const R0_i = (strain.beta * strain.relativeFitness) / (gamma + mu);
    const Re_i = R0_i * susceptibleFraction * interventionMult;

    const activeShare = totalI > 0 ? (s.I / totalI) * 100 : 0;
    weightedReSum += Re_i * (totalI > 0 ? s.I / totalI : 1 / numStrains);

    strainMetrics[strain.id] = {
      E: Math.round(s.E),
      I: Math.round(s.I),
      R: Math.round(s.R),
      D: Math.round(s.D),
      activeShare: Number(activeShare.toFixed(1)),
      Re: Number(Re_i.toFixed(2)),
      newInfections: Math.round(newInfectionsDaily * (totalI > 0 ? s.I / totalI : 1 / numStrains)),
    };
  });

  const hosp = config.hospitalization;
  const hospCap = hosp?.enabled ? hosp.hospitalCapacity : 0;
  const icuCap = hosp?.enabled ? hosp.icuCapacity : 0;

  const hospUtil = hospCap > 0 ? H / hospCap : 0;
  const icuUtil = icuCap > 0 ? ICU / icuCap : 0;

  return {
    day,
    S: Math.round(S),
    E: Math.round(totalE),
    I: Math.round(totalI),
    R: Math.round(totalR),
    D: Math.round(totalD),
    V: config.vaccination?.enabled ? Math.round(V) : undefined,
    H: hosp?.enabled ? Math.round(H) : undefined,
    ICU: hosp?.enabled ? Math.round(ICU) : undefined,
    totalActive: Math.round(totalI),
    newInfectionsDaily: Math.round(newInfectionsDaily),
    cumulativeInfections: Math.round(cumulativeInfections),
    effectiveR: Number(weightedReSum.toFixed(2)),
    effectiveTransmissionRate: Number((activeStrains[0].beta * interventionMult).toFixed(3)),
    strainMetrics,
    hospitalUtilization: hosp?.enabled ? Number(hospUtil.toFixed(2)) : undefined,
    icuUtilization: hosp?.enabled ? Number(icuUtil.toFixed(2)) : undefined,
    capacityExceeded: hosp?.enabled ? H > hospCap : false,
    icuCapacityExceeded: hosp?.enabled ? ICU > icuCap : false,
  };
}
