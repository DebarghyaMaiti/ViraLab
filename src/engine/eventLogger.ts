import {
  SimulationConfig,
  SimulationResults,
  SimulationEventLogEntry,
  StateTransitionEvent,
  Strain,
} from '../types/simulation';

/**
 * Automatically analyzes time-series trajectory and simulation configuration
 * to extract significant epidemiological state transitions in chronological order.
 */
export function extractStateTransitions(
  config: SimulationConfig,
  results: SimulationResults
): StateTransitionEvent[] {
  const transitions: StateTransitionEvent[] = [];
  const { timeSeries, kpis } = results;
  if (!timeSeries || timeSeries.length === 0) return transitions;

  const N = config.population;

  // 1. Initial Outbreak Seeding (Day 0)
  const initialInfectedTotal = config.strains.reduce((acc, s) => acc + (s.initialInfected || 0), 0);
  const initialExposedTotal = config.strains.reduce((acc, s) => acc + (s.initialExposed || 0), 0);

  transitions.push({
    id: `seed-0`,
    day: 0,
    type: 'outbreak_seeding',
    category: 'epidemic',
    title: 'Initial Outbreak Seeding',
    description: `Outbreak initialized with ${initialInfectedTotal.toLocaleString()} infectious and ${initialExposedTotal.toLocaleString()} exposed individuals across ${config.strains.length} strain(s) (N = ${N.toLocaleString()}).`,
    severity: 'info',
    metricValue: initialInfectedTotal,
  });

  // 2. Emergent Variant from Mutation config
  if (config.mutation?.enabled && config.mutation.emergenceDay > 0) {
    transitions.push({
      id: `mutation-emerge-${config.mutation.emergenceDay}`,
      day: config.mutation.emergenceDay,
      type: 'variant_emergence',
      category: 'variant',
      title: `Variant Emergence: ${config.mutation.childStrainName}`,
      description: `New variant lineage ${config.mutation.childStrainName} emerged on Day ${config.mutation.emergenceDay} with ${config.mutation.deltaBetaPercent > 0 ? '+' : ''}${config.mutation.deltaBetaPercent}% transmissibility and ${(config.mutation.immuneEscape * 100).toFixed(0)}% immune evasion.`,
      severity: 'warning',
      metricValue: `${config.mutation.deltaBetaPercent > 0 ? '+' : ''}${config.mutation.deltaBetaPercent}% beta`,
    });
  }

  // 3. Active NPI Interventions
  (config.interventions || []).forEach((npi) => {
    if (npi.enabled) {
      const netReduction = Math.round((npi.transmissionReduction * npi.compliance) * 100);
      // Activation
      transitions.push({
        id: `npi-start-${npi.id}`,
        day: npi.startDay,
        type: 'npi_triggered',
        category: 'intervention',
        title: `NPI Enacted: ${npi.name}`,
        description: `Non-pharmaceutical policy implemented with ${netReduction}% effective contact transmission reduction (${Math.round(npi.compliance * 100)}% compliance).`,
        severity: 'normal',
        metricValue: `-${netReduction}% transmission`,
        interventionId: npi.id,
      });

      // Lifting
      transitions.push({
        id: `npi-end-${npi.id}`,
        day: npi.endDay,
        type: 'npi_ended',
        category: 'intervention',
        title: `NPI Lifted: ${npi.name}`,
        description: `Policy restriction lifted at Day ${npi.endDay}; contact rates return to unmitigated levels unless other policies persist.`,
        severity: 'info',
        metricValue: `Day ${npi.endDay}`,
        interventionId: npi.id,
      });
    }
  });

  // 4. Vaccination Campaign Launch & Milestones
  if (config.vaccination?.enabled) {
    transitions.push({
      id: `vax-launch`,
      day: config.vaccination.startDay,
      type: 'vaccination_launch',
      category: 'intervention',
      title: 'Mass Vaccination Rollout Commenced',
      description: `Immunization campaign launched at ${config.vaccination.dailyRate.toLocaleString()} doses/day with ${(config.vaccination.efficacy * 100).toFixed(0)}% target clinical efficacy (Target: ${(config.vaccination.coverageTarget * 100).toFixed(0)}%).`,
      severity: 'normal',
      metricValue: `${config.vaccination.dailyRate.toLocaleString()} doses/day`,
    });

    // Track vaccination population coverage milestones (25%, 50%, 75%)
    const milestones = [0.25, 0.5, 0.75];
    const loggedMilestones = new Set<number>();

    for (let i = 0; i < timeSeries.length; i++) {
      const pt = timeSeries[i];
      if (pt.V !== undefined) {
        const coverage = pt.V / N;
        for (const ms of milestones) {
          if (coverage >= ms && !loggedMilestones.has(ms)) {
            loggedMilestones.add(ms);
            transitions.push({
              id: `vax-ms-${ms * 100}`,
              day: pt.day,
              type: 'vaccination_milestone',
              category: 'intervention',
              title: `Vaccination Milestone: ${(ms * 100).toFixed(0)}% Protected`,
              description: `Community immunoprotection reached ${(ms * 100).toFixed(0)}% of total host population (${Math.round(pt.V).toLocaleString()} individuals protected).`,
              severity: 'info',
              metricValue: `${(ms * 100).toFixed(0)}%`,
            });
          }
        }
      }
    }
  }

  // 5. Hospital & ICU Capacity Saturation and Relief
  let hospitalBreached = false;
  let hospitalRelieved = false;
  let icuBreached = false;
  let icuRelieved = false;

  for (let i = 0; i < timeSeries.length; i++) {
    const pt = timeSeries[i];

    // Acute hospital beds
    if (pt.hospitalUtilization !== undefined) {
      if (pt.hospitalUtilization >= 1.0 && !hospitalBreached) {
        hospitalBreached = true;
        transitions.push({
          id: `hosp-breach-${pt.day}`,
          day: pt.day,
          type: 'capacity_breach',
          category: 'healthcare',
          title: 'Acute Hospital Bed Capacity Saturated',
          description: `Hospital bed demand exceeded 100% capacity threshold (${Math.round(pt.H || 0).toLocaleString()} patients requiring admission). Overflow mortality multipliers active.`,
          severity: 'critical',
          metricValue: `${(pt.hospitalUtilization * 100).toFixed(0)}% utilization`,
        });
      } else if (hospitalBreached && !hospitalRelieved && pt.hospitalUtilization < 1.0) {
        hospitalRelieved = true;
        transitions.push({
          id: `hosp-relieved-${pt.day}`,
          day: pt.day,
          type: 'capacity_restored',
          category: 'healthcare',
          title: 'Acute Hospital Bed Strain Subsided',
          description: `Hospital census dropped back below 100% rated bed capacity. Health system exits triage overflow.`,
          severity: 'normal',
          metricValue: `${(pt.hospitalUtilization * 100).toFixed(0)}% utilization`,
        });
      }
    }

    // ICU beds
    if (pt.icuUtilization !== undefined) {
      if (pt.icuUtilization >= 1.0 && !icuBreached) {
        icuBreached = true;
        transitions.push({
          id: `icu-breach-${pt.day}`,
          day: pt.day,
          type: 'icu_capacity_breach',
          category: 'healthcare',
          title: 'ICU Critical Care Surge Breached',
          description: `Intensive care unit demand surpassed 100% capacity (${Math.round(pt.ICU || 0).toLocaleString()} patients in critical care). Critical care rationing active.`,
          severity: 'critical',
          metricValue: `${(pt.icuUtilization * 100).toFixed(0)}% ICU load`,
        });
      } else if (icuBreached && !icuRelieved && pt.icuUtilization < 1.0) {
        icuRelieved = true;
        transitions.push({
          id: `icu-relieved-${pt.day}`,
          day: pt.day,
          type: 'icu_capacity_restored',
          category: 'healthcare',
          title: 'ICU Intensive Care Strain Relieved',
          description: `ICU patient load stabilized below maximum capacity limit.`,
          severity: 'normal',
          metricValue: `${(pt.icuUtilization * 100).toFixed(0)}% ICU load`,
        });
      }
    }
  }

  // 6. Reproduction Number (Re) Inflection Points
  let crossedBelowOne = false;
  for (let i = 1; i < timeSeries.length; i++) {
    const prevRe = timeSeries[i - 1].effectiveR;
    const currRe = timeSeries[i].effectiveR;

    // Subcritical crossover: Re drops < 1.0
    if (prevRe >= 1.0 && currRe < 1.0 && !crossedBelowOne) {
      crossedBelowOne = true;
      transitions.push({
        id: `re-subcritical-${timeSeries[i].day}`,
        day: timeSeries[i].day,
        type: 're_inflection_subcritical',
        category: 'epidemic',
        title: 'Epidemic Inflection: Re Drops Below 1.0',
        description: `Effective reproduction number contracted to ${currRe.toFixed(2)}. Each infected individual infects fewer than 1 on average, marking the transition from exponential growth to epidemic suppression.`,
        severity: 'normal',
        metricValue: `Re = ${currRe.toFixed(2)}`,
      });
    }

    // Resurgence crossover: Re bounces back > 1.0 after dropping
    if (crossedBelowOne && prevRe < 1.0 && currRe >= 1.0) {
      transitions.push({
        id: `re-supercritical-${timeSeries[i].day}`,
        day: timeSeries[i].day,
        type: 're_inflection_supercritical',
        category: 'epidemic',
        title: 'Epidemic Resurgence: Re Climbs Above 1.0',
        description: `Effective reproduction number rebounded to ${currRe.toFixed(2)}. Secondary transmission surge re-entered exponential expansion.`,
        severity: 'warning',
        metricValue: `Re = ${currRe.toFixed(2)}`,
      });
      crossedBelowOne = false;
    }
  }

  // 7. Peak Active Prevalence & Peak Daily Incidence
  if (kpis.peakDay > 0) {
    transitions.push({
      id: `peak-active-${kpis.peakDay}`,
      day: kpis.peakDay,
      type: 'peak_incidence',
      category: 'epidemic',
      title: 'Epidemic Wave Peak (Active Infections)',
      description: `Active prevalence apex reached with ${kpis.peakActive.toLocaleString()} concurrent infected individuals (${((kpis.peakActive / N) * 100).toFixed(1)}% of total host population).`,
      severity: 'warning',
      metricValue: `${kpis.peakActive.toLocaleString()} cases`,
    });
  }

  // Check peak daily new infections
  let maxDailyNew = 0;
  let maxDailyNewDay = 0;
  timeSeries.forEach((pt) => {
    if (pt.newInfectionsDaily > maxDailyNew) {
      maxDailyNew = pt.newInfectionsDaily;
      maxDailyNewDay = pt.day;
    }
  });

  if (maxDailyNewDay > 0 && Math.abs(maxDailyNewDay - kpis.peakDay) >= 2) {
    transitions.push({
      id: `peak-daily-new-${maxDailyNewDay}`,
      day: maxDailyNewDay,
      type: 'peak_daily_infections',
      category: 'epidemic',
      title: 'Peak Daily New Infections Incidence',
      description: `Daily transmission velocity maximized at ${Math.round(maxDailyNew).toLocaleString()} new transmissions/day.`,
      severity: 'info',
      metricValue: `${Math.round(maxDailyNew).toLocaleString()} / day`,
    });
  }

  // 8. Variant Genomic Dominance Sweep (>50% active cases)
  if (config.strains.length > 1) {
    const dominanceTracked = new Set<string>();
    for (let i = 0; i < timeSeries.length; i++) {
      const pt = timeSeries[i];
      if (pt.strainMetrics) {
        Object.entries(pt.strainMetrics).forEach(([strainId, metrics]) => {
          if (metrics.activeShare >= 50 && !dominanceTracked.has(strainId)) {
            dominanceTracked.add(strainId);
            const strainObj = config.strains.find((s) => s.id === strainId);
            if (strainObj) {
              transitions.push({
                id: `strain-dominance-${strainId}`,
                day: pt.day,
                type: 'variant_dominance',
                category: 'variant',
                title: `Lineage Dominance: ${strainObj.name}`,
                description: `${strainObj.name} attained genomic dominance, accounting for ${metrics.activeShare.toFixed(1)}% of all active infectious cases.`,
                severity: 'warning',
                metricValue: `${metrics.activeShare.toFixed(1)}% share`,
                strainId,
              });
            }
          }
        });
      }
    }
  }

  // 9. Epidemic Exhaustion / Containment (<2% peak active after peak)
  if (kpis.peakDay > 0) {
    const postPeakThreshold = Math.max(10, kpis.peakActive * 0.02);
    for (let i = 0; i < timeSeries.length; i++) {
      const pt = timeSeries[i];
      if (pt.day > kpis.peakDay + 10 && pt.totalActive <= postPeakThreshold) {
        transitions.push({
          id: `epidemic-exhaustion-${pt.day}`,
          day: pt.day,
          type: 'epidemic_exhaustion',
          category: 'epidemic',
          title: 'Epidemic Depletion & Containment State',
          description: `Active infections declined below 2% of peak (${Math.round(pt.totalActive).toLocaleString()} cases remaining). Host population reached post-epidemic stabilization.`,
          severity: 'info',
          metricValue: `${Math.round(pt.totalActive).toLocaleString()} active`,
        });
        break;
      }
    }
  }

  // Sort all transitions chronologically by day
  transitions.sort((a, b) => a.day - b.day);
  return transitions;
}

/**
 * Creates a comprehensive SimulationEventLogEntry capturing current parameters,
 * outcomes, and chronological state transitions.
 */
export function createEventLogEntry(
  config: SimulationConfig,
  results: SimulationResults,
  label?: string
): SimulationEventLogEntry {
  const transitions = extractStateTransitions(config, results);
  const primaryStrain: Strain = config.strains[0] || {
    id: 'wildtype',
    name: 'Wildtype',
    color: '#3b82f6',
    beta: 0.35,
    incubationPeriod: 5.2,
    infectiousPeriod: 7.0,
    mortalityRate: 0.015,
    initialExposed: 50,
    initialInfected: 20,
    initialRecovered: 0,
    initialDeaths: 0,
    immuneEscape: 0,
    relativeFitness: 1.0,
  };

  const gamma = 1 / Math.max(0.1, primaryStrain.infectiousPeriod);
  const sigma = 1 / Math.max(0.1, primaryStrain.incubationPeriod);
  const mu = (primaryStrain.mortalityRate * gamma) / Math.max(0.001, 1 - primaryStrain.mortalityRate);
  const relativeFitness = primaryStrain.relativeFitness || 1.0;
  const R0 = Number(((primaryStrain.beta * relativeFitness) / (gamma + mu)).toFixed(2));

  const activeInterventionsCount = (config.interventions || []).filter((i) => i.enabled).length;

  const now = new Date();
  const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entryLabel = label || `Run #${Math.floor(Math.random() * 900 + 100)} (${config.solver.toUpperCase()}, ${config.mode}) - ${timeFormatted}`;

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    label: entryLabel,
    solver: config.solver,
    mode: config.mode,
    config: JSON.parse(JSON.stringify(config)), // deep clone snapshot
    parametersSummary: {
      population: config.population,
      solver: config.solver.toUpperCase(),
      timeStep: config.timeStep,
      horizonDays: config.durationDays,
      strainsCount: config.strains.length,
      primaryBeta: Number(primaryStrain.beta.toFixed(3)),
      primaryGamma: Number(gamma.toFixed(3)),
      primarySigma: Number(sigma.toFixed(3)),
      primaryMu: Number(mu.toFixed(4)),
      primaryR0: R0,
      activeInterventionsCount,
      vaccinationEnabled: !!config.vaccination?.enabled,
      hospitalCapacityEnabled: !!config.hospitalization?.enabled,
    },
    outcomesSummary: {
      totalInfected: results.kpis.totalInfected,
      peakActive: results.kpis.peakActive,
      peakDay: results.kpis.peakDay,
      attackRate: Number((results.kpis.attackRate * 100).toFixed(1)),
      totalDeaths: results.kpis.totalDeaths,
      maxRe: Number(results.kpis.maxRe.toFixed(2)),
      finalRe: Number(results.kpis.currentRe.toFixed(2)),
      hospitalOverloadDays: results.kpis.hospitalOverloadDays || 0,
    },
    transitions,
    results,
    timeSeries: results.timeSeries,
  };
}

/**
 * Exports event log entries as downloadable JSON file
 */
export function exportEventLogsAsJson(logs: SimulationEventLogEntry[]) {
  const jsonStr = JSON.stringify(logs, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `viralab_event_logs_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports event logs transitions as CSV
 */
export function exportEventLogsAsCsv(logs: SimulationEventLogEntry[]) {
  const headers = [
    'LogId',
    'Timestamp',
    'Label',
    'Solver',
    'Population',
    'PrimaryBeta',
    'PrimaryR0',
    'Day',
    'TransitionType',
    'Category',
    'Severity',
    'Title',
    'Description',
    'MetricValue',
  ];

  const rows: string[][] = [];

  logs.forEach((log) => {
    log.transitions.forEach((t) => {
      rows.push([
        log.id,
        log.timestamp,
        `"${log.label.replace(/"/g, '""')}"`,
        log.solver,
        log.parametersSummary.population.toString(),
        log.parametersSummary.primaryBeta.toString(),
        log.parametersSummary.primaryR0.toString(),
        t.day.toString(),
        t.type,
        t.category,
        t.severity,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${(t.metricValue || '').toString().replace(/"/g, '""')}"`,
      ]);
    });
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `viralab_state_transitions_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
