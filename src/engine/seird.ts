import { SimulationConfig, Strain } from '../types/simulation';

export interface ModelDerivativesContext {
  strains: Strain[];
  population: number;
  config: SimulationConfig;
  activeStrains: Strain[];
}

/**
 * Calculates net intervention transmission reduction at a specific day t.
 * Multiplicative independent reduction model: (1 - r1)*(1 - r2)...
 */
export function getInterventionMultiplier(t: number, config: SimulationConfig): number {
  if (!config.interventions || config.interventions.length === 0) return 1.0;

  let multiplier = 1.0;
  for (const itv of config.interventions) {
    if (itv.enabled && t >= itv.startDay && t <= itv.endDay) {
      const reduction = Math.min(0.95, Math.max(0, itv.transmissionReduction * itv.compliance));
      multiplier *= (1 - reduction);
    }
  }
  return Math.max(0.02, multiplier); // Cannot reduce contacts below 2%
}

/**
 * Vector representation for SEIRD state:
 * Index 0: S (Susceptible)
 * Index 1: V (Vaccinated, if used)
 * For each strain i:
 *   E_i: 2 + i*4 + 0
 *   I_i: 2 + i*4 + 1
 *   R_i: 2 + i*4 + 2
 *   D_i: 2 + i*4 + 3
 * Optional Hospitalization:
 *   H:   2 + numStrains*4 + 0
 *   ICU: 2 + numStrains*4 + 1
 */
export function packState(
  S: number,
  V: number,
  strainStates: Array<{ E: number; I: number; R: number; D: number }>,
  H: number = 0,
  ICU: number = 0
): number[] {
  const state: number[] = [S, V];
  for (const s of strainStates) {
    state.push(s.E, s.I, s.R, s.D);
  }
  state.push(H, ICU);
  return state;
}

export function unpackState(state: number[], numStrains: number) {
  const S = Math.max(0, state[0]);
  const V = Math.max(0, state[1]);
  const strains: Array<{ E: number; I: number; R: number; D: number }> = [];

  for (let i = 0; i < numStrains; i++) {
    const base = 2 + i * 4;
    strains.push({
      E: Math.max(0, state[base]),
      I: Math.max(0, state[base + 1]),
      R: Math.max(0, state[base + 2]),
      D: Math.max(0, state[base + 3]),
    });
  }

  const hospBase = 2 + numStrains * 4;
  const H = Math.max(0, state[hospBase] || 0);
  const ICU = Math.max(0, state[hospBase + 1] || 0);

  return { S, V, strains, H, ICU };
}

/**
 * Computes derivatives dy/dt for the multi-strain SEIRD system.
 */
export function computeDerivatives(
  t: number,
  y: number[],
  activeStrains: Strain[],
  config: SimulationConfig
): number[] {
  const N = config.population;
  const numStrains = activeStrains.length;
  const { S, V, strains, H, ICU } = unpackState(y, numStrains);

  const dydt = new Array(y.length).fill(0);
  const interventionMult = getInterventionMultiplier(t, config);

  // Check mutation emergence
  let mutationActive = false;
  if (config.mutation && config.mutation.enabled && t >= config.mutation.emergenceDay) {
    mutationActive = true;
  }

  // Calculate vaccination dynamics
  let dS_vaccine = 0;
  let dV_waning = 0;
  const vax = config.vaccination;
  if (vax && vax.enabled && t >= vax.startDay) {
    const totalVaccinated = V;
    const maxVaccinated = N * vax.coverageTarget;
    if (totalVaccinated < maxVaccinated && S > 0) {
      const dailyDoses = Math.min(vax.dailyRate, S * 0.5);
      dS_vaccine = dailyDoses;
    }
    if (vax.waningPeriodDays > 0) {
      dV_waning = V / vax.waningPeriodDays;
    }
  }

  let totalTransmissionFromS = 0;
  let totalTransmissionFromV = 0;

  // For each strain, calculate transmission & compartment flows
  for (let i = 0; i < numStrains; i++) {
    const strain = activeStrains[i];
    const sState = strains[i];

    // Transmission rate β_effective
    const betaEffective = strain.beta * interventionMult * strain.relativeFitness;
    const sigma = 1 / Math.max(0.1, strain.incubationPeriod);
    const gamma = 1 / Math.max(0.1, strain.infectiousPeriod);
    const mu = (strain.mortalityRate * gamma) / Math.max(0.001, 1 - strain.mortalityRate);

    // Force of infection on Susceptible: λ_i = β_i * I_i / N
    const forceOfInfection = (betaEffective * sState.I) / N;
    const newExposedFromS = forceOfInfection * S;

    // Force of infection on Vaccinated (scaled by vaccine efficacy & immune escape)
    let vaxEfficacyAgainstStrain = vax?.enabled ? vax.efficacy : 0;
    if (vax?.variantEfficacyMap && vax.variantEfficacyMap[strain.id] !== undefined) {
      vaxEfficacyAgainstStrain *= vax.variantEfficacyMap[strain.id];
    }
    // Immune escape reduces efficacy: eff_net = eff * (1 - escape)
    vaxEfficacyAgainstStrain *= (1 - Math.min(1, strain.immuneEscape));
    const susceptibilityVaccinated = Math.max(0, 1 - vaxEfficacyAgainstStrain);

    const newExposedFromV = forceOfInfection * susceptibilityVaccinated * V;

    const totalNewExposed_i = newExposedFromS + newExposedFromV;

    totalTransmissionFromS += newExposedFromS;
    totalTransmissionFromV += newExposedFromV;

    // Compartment ODEs for strain i
    // dE_i/dt = NewExposed - σ*E_i
    const dE = totalNewExposed_i - sigma * sState.E;

    // dI_i/dt = σ*E_i - (γ + μ)*I_i
    let dI = sigma * sState.E - (gamma + mu) * sState.I;

    // dR_i/dt = γ*I_i
    let dR = gamma * sState.I;

    // dD_i/dt = μ*I_i
    let dD = mu * sState.I;

    // If hospitalization is modeled, route a fraction of infected to hospital
    const hosp = config.hospitalization;
    if (hosp && hosp.enabled) {
      const hospRate = (hosp.hospitalizationProb * sigma * sState.E);
      // Acute care adjustments are integrated below
    }

    const baseIdx = 2 + i * 4;
    dydt[baseIdx + 0] = dE;
    dydt[baseIdx + 1] = dI;
    dydt[baseIdx + 2] = dR;
    dydt[baseIdx + 3] = dD;
  }

  // dS/dt = - Σ (force_i * S) - vaccineRate + waningRate
  dydt[0] = -totalTransmissionFromS - dS_vaccine + dV_waning;

  // dV/dt = vaccineRate - waningRate - Σ (force_i * (1-eff) * V)
  dydt[1] = dS_vaccine - dV_waning - totalTransmissionFromV;

  // Hospitalization compartment ODEs (if enabled)
  const hosp = config.hospitalization;
  if (hosp && hosp.enabled) {
    const totalActiveI = strains.reduce((acc, s) => acc + s.I, 0);
    const totalSigmaE = strains.reduce((acc, s, idx) => {
      const sig = 1 / Math.max(0.1, activeStrains[idx].incubationPeriod);
      return acc + sig * s.E;
    }, 0);

    const newHosp = totalSigmaE * hosp.hospitalizationProb;
    const gammaH = 1 / Math.max(1, hosp.hospitalStayDays);
    const gammaICU = 1 / Math.max(1, hosp.icuStayDays);

    const overflow = H > hosp.hospitalCapacity;
    const overflowMult = overflow ? hosp.overflowMortalityMultiplier : 1.0;

    const toICU = H * (hosp.icuProb / Math.max(1, hosp.hospitalStayDays));
    const hospRecovery = H * gammaH * (1 - hosp.hospitalMortality * overflowMult);
    const hospDeath = H * gammaH * hosp.hospitalMortality * overflowMult;

    const icuRecovery = ICU * gammaICU * (1 - hosp.icuMortality);
    const icuDeath = ICU * gammaICU * hosp.icuMortality;

    const hospBase = 2 + numStrains * 4;
    dydt[hospBase] = newHosp - toICU - hospRecovery - hospDeath;
    dydt[hospBase + 1] = toICU - icuRecovery - icuDeath;
  }

  return dydt;
}
