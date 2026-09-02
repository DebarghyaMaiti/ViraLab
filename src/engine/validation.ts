import { SimulationConfig } from '../types/simulation';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a simulation configuration before running the solver.
 * Enforces strict scientific and numerical stability constraints.
 */
export function validateSimulationConfig(config: SimulationConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Population check
  if (!Number.isFinite(config.population) || config.population <= 0) {
    errors.push(`Total population must be a positive number greater than zero. Received: ${config.population}`);
  }

  // 2. Duration check
  if (!Number.isFinite(config.durationDays) || config.durationDays <= 0) {
    errors.push(`Simulation duration must be at least 1 day. Received: ${config.durationDays}`);
  } else if (config.durationDays > 1000) {
    warnings.push(`Long simulation duration (${config.durationDays} days) may accumulate numerical integration drift.`);
  }

  // 3. Time step check
  if (!Number.isFinite(config.timeStep) || config.timeStep <= 0) {
    errors.push(`Time step (dt) must be positive. Received: ${config.timeStep}`);
  } else if (config.timeStep > 1.0) {
    warnings.push(`Large time step (dt = ${config.timeStep}) may reduce ODE integration accuracy.`);
  }

  // 4. Strains check
  if (!Array.isArray(config.strains) || config.strains.length === 0) {
    errors.push('At least one viral strain/variant must be specified.');
  } else {
    let initialInfectedSum = 0;
    let initialExposedSum = 0;
    let initialRecoveredSum = 0;
    let initialDeathsSum = 0;

    config.strains.forEach((strain, idx) => {
      const label = strain.name || `Strain #${idx + 1}`;

      if (!Number.isFinite(strain.beta) || strain.beta < 0) {
        errors.push(`[${label}] Transmission rate (β) must be non-negative. Received: ${strain.beta}`);
      }

      if (!Number.isFinite(strain.incubationPeriod) || strain.incubationPeriod <= 0) {
        errors.push(`[${label}] Incubation period (1/σ) must be strictly greater than zero days. Received: ${strain.incubationPeriod}`);
      }

      if (!Number.isFinite(strain.infectiousPeriod) || strain.infectiousPeriod <= 0) {
        errors.push(`[${label}] Infectious period (1/γ) must be strictly greater than zero days. Received: ${strain.infectiousPeriod}`);
      }

      if (!Number.isFinite(strain.mortalityRate) || strain.mortalityRate < 0 || strain.mortalityRate > 1) {
        errors.push(`[${label}] Mortality rate (μ) must be between 0.0 and 1.0 (0% to 100%). Received: ${strain.mortalityRate}`);
      }

      if (strain.initialExposed < 0 || !Number.isFinite(strain.initialExposed)) {
        errors.push(`[${label}] Initial exposed (E₀) cannot be negative.`);
      }
      if (strain.initialInfected < 0 || !Number.isFinite(strain.initialInfected)) {
        errors.push(`[${label}] Initial infected (I₀) cannot be negative.`);
      }
      if (strain.initialRecovered < 0 || !Number.isFinite(strain.initialRecovered)) {
        errors.push(`[${label}] Initial recovered (R₀) cannot be negative.`);
      }
      if (strain.initialDeaths < 0 || !Number.isFinite(strain.initialDeaths)) {
        errors.push(`[${label}] Initial deaths (D₀) cannot be negative.`);
      }

      initialExposedSum += strain.initialExposed || 0;
      initialInfectedSum += strain.initialInfected || 0;
      initialRecoveredSum += strain.initialRecovered || 0;
      initialDeathsSum += strain.initialDeaths || 0;
    });

    const initialNonSusceptible = initialExposedSum + initialInfectedSum + initialRecoveredSum + initialDeathsSum;
    if (initialNonSusceptible > config.population) {
      errors.push(
        `Initial non-susceptible population sum (${initialNonSusceptible.toLocaleString()}) exceeds total population (${config.population.toLocaleString()}). S₀ would be negative.`
      );
    }

    if (initialExposedSum === 0 && initialInfectedSum === 0 && !config.mutation?.enabled) {
      warnings.push(
        'Zero initial infected and exposed individuals (I₀=0, E₀=0). No transmission will occur unless a mutation or seed emerges.'
      );
    }
  }

  // 5. Interventions check
  if (config.interventions && Array.isArray(config.interventions)) {
    config.interventions.forEach((itv) => {
      if (itv.startDay < 0) {
        errors.push(`Intervention "${itv.name}" cannot have a negative start day.`);
      }
      if (itv.endDay < itv.startDay) {
        errors.push(`Intervention "${itv.name}" end day (${itv.endDay}) is before start day (${itv.startDay}).`);
      }
      if (itv.transmissionReduction < 0 || itv.transmissionReduction > 1) {
        errors.push(`Intervention "${itv.name}" reduction must be between 0 and 1.`);
      }
      if (itv.compliance < 0 || itv.compliance > 1) {
        errors.push(`Intervention "${itv.name}" compliance must be between 0 and 1.`);
      }
    });
  }

  // 6. Vaccination check
  if (config.vaccination && config.vaccination.enabled) {
    if (config.vaccination.dailyRate < 0) {
      errors.push('Daily vaccination rate cannot be negative.');
    }
    if (config.vaccination.coverageTarget < 0 || config.vaccination.coverageTarget > 1) {
      errors.push('Vaccination coverage target must be between 0.0 and 1.0.');
    }
    if (config.vaccination.efficacy < 0 || config.vaccination.efficacy > 1) {
      errors.push('Vaccine efficacy must be between 0.0 and 1.0.');
    }
  }

  // 7. Hospitalization check
  if (config.hospitalization && config.hospitalization.enabled) {
    if (config.hospitalization.hospitalCapacity <= 0) {
      warnings.push('Hospital capacity is 0 or negative; any hospitalization will immediately exceed capacity.');
    }
    if (config.hospitalization.hospitalizationProb < 0 || config.hospitalization.hospitalizationProb > 1) {
      errors.push('Hospitalization probability must be between 0 and 1.');
    }
    if (config.hospitalization.icuProb < 0 || config.hospitalization.icuProb > 1) {
      errors.push('ICU probability must be between 0 and 1.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
