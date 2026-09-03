import React, { useState } from 'react';
import {
  History,
  Activity,
  Calendar,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Syringe,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import {
  SimulationEventLogEntry,
  ParameterEstimationResult,
  DatasetRecord,
  SimulationConfig,
  StateTransitionEvent,
} from '../types/simulation';

interface EventLogFittingReviewProps {
  eventLogs: SimulationEventLogEntry[];
  selectedLogId: string | null;
  onSelectLogId: (id: string) => void;
  estimationResult: ParameterEstimationResult | null;
  records: DatasetRecord[];
  onSeedOptimization: (initialGuess: {
    beta: number;
    infectiousPeriod: number;
    incubationPeriod: number;
    mortalityRate: number;
  }) => void;
  onApplyLoggedConfig: (config: SimulationConfig) => void;
  activeConfig: SimulationConfig;
}

export const EventLogFittingReview: React.FC<EventLogFittingReviewProps> = ({
  eventLogs,
  selectedLogId,
  onSelectLogId,
  estimationResult,
  records,
  onSeedOptimization,
  onApplyLoggedConfig,
  activeConfig,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'comparison' | 'transitions'>('comparison');

  if (eventLogs.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <span>No simulation event logs captured yet. Run simulations in the Simulation Lab to record parameter snapshots and state transitions for review here.</span>
        </div>
      </div>
    );
  }

  const activeLog =
    eventLogs.find((l) => l.id === selectedLogId) || eventLogs[0];

  const primaryStrain = activeLog.config.strains[0] || {
    beta: 0.35,
    incubationPeriod: 5.2,
    infectiousPeriod: 7.0,
    mortalityRate: 0.015,
  };

  const loggedInfectiousPeriod = primaryStrain.infectiousPeriod;
  const loggedIncubationPeriod = primaryStrain.incubationPeriod;
  const loggedMortalityRate = primaryStrain.mortalityRate;
  const loggedBeta = primaryStrain.beta;
  const loggedR0 = activeLog.parametersSummary.primaryR0;

  // Calculate discrepancies if estimationResult is present
  const deltaBeta = estimationResult
    ? (((estimationResult.beta - loggedBeta) / loggedBeta) * 100).toFixed(1)
    : null;
  const deltaR0 = estimationResult
    ? (((estimationResult.R0 - loggedR0) / loggedR0) * 100).toFixed(1)
    : null;
  const deltaInf = estimationResult
    ? (
        ((estimationResult.infectiousPeriodDays - loggedInfectiousPeriod) /
          loggedInfectiousPeriod) *
        100
      ).toFixed(1)
    : null;
  const deltaInc = estimationResult
    ? (
        ((estimationResult.incubationPeriodDays - loggedIncubationPeriod) /
          loggedIncubationPeriod) *
        100
      ).toFixed(1)
    : null;

  // Find empirical peak day for comparison
  let empiricalPeakDay: number | null = null;
  let maxEmpiricalCases = 0;
  records.forEach((r) => {
    if (r.newCases && r.newCases > maxEmpiricalCases) {
      maxEmpiricalCases = r.newCases;
      empiricalPeakDay = r.dayIndex;
    }
  });

  const getTransitionIcon = (type: StateTransitionEvent['type']) => {
    switch (type) {
      case 'capacity_breach':
      case 'icu_capacity_breach':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
      case 'capacity_restored':
      case 'icu_capacity_restored':
      case 're_inflection_subcritical':
        return <TrendingDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      case 're_inflection_supercritical':
      case 'peak_incidence':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      case 'vaccination_launch':
      case 'vaccination_milestone':
        return <Syringe className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div
      id="event-log-fitting-review"
      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Prior Simulation Log Review & Parameter Comparison
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                {eventLogs.length} Available Runs
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Review timestamped ODE parameters and significant state transitions from Simulation Lab to cross-validate empirical optimization priors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Run selector dropdown */}
          <select
            value={activeLog.id}
            onChange={(e) => onSelectLogId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:border-blue-500 outline-hidden cursor-pointer"
          >
            {eventLogs.map((log) => (
              <option key={log.id} value={log.id}>
                {log.label} ({new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-5 space-y-5">
          {/* Sub-tabs: Parameter Comparison vs State Transitions */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setActiveTab('comparison')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  activeTab === 'comparison'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Parameters vs. Empirical Fit
              </button>
              <button
                onClick={() => setActiveTab('transitions')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  activeTab === 'transitions'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Logged State Transitions ({activeLog.transitions.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onSeedOptimization({
                    beta: loggedBeta,
                    infectiousPeriod: loggedInfectiousPeriod,
                    incubationPeriod: loggedIncubationPeriod,
                    mortalityRate: loggedMortalityRate,
                  })
                }
                className="px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Seed the Nelder-Mead optimization simplex with logged parameters"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Seed Simplex with Logged Params</span>
              </button>

              <button
                onClick={() => onApplyLoggedConfig(activeLog.config)}
                className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Restore logged config to active simulator"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Load into Active Sim</span>
              </button>
            </div>
          </div>

          {activeTab === 'comparison' ? (
            <div className="space-y-4">
              {/* Comparative Diagnostic Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="pb-2">Epidemiological Parameter</th>
                      <th className="pb-2">Logged Simulation Snapshot</th>
                      <th className="pb-2">Empirically Calibrated Fit</th>
                      <th className="pb-2">Discrepancy (Δ)</th>
                      <th className="pb-2">Calibration Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {/* Beta */}
                    <tr>
                      <td className="py-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        Transmission Rate (β)
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">
                        {loggedBeta.toFixed(3)}
                      </td>
                      <td className="py-2.5 font-bold text-blue-600 dark:text-blue-400">
                        {estimationResult ? estimationResult.beta.toFixed(3) : 'Pending fit'}
                      </td>
                      <td className="py-2.5">
                        {deltaBeta !== null ? (
                          <span
                            className={
                              Number(deltaBeta) > 0
                                ? 'text-amber-600 font-semibold'
                                : 'text-blue-600 font-semibold'
                            }
                          >
                            {Number(deltaBeta) > 0 ? `+${deltaBeta}%` : `${deltaBeta}%`}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 font-sans text-slate-500 text-[11px]">
                        {deltaBeta !== null
                          ? Math.abs(Number(deltaBeta)) < 15
                            ? 'High concordance with empirical contact rates.'
                            : Number(deltaBeta) > 0
                            ? 'Empirical spread faster than prior simulation.'
                            : 'Empirical spread slower than prior simulation.'
                          : 'Run model calibration above to compute error.'}
                      </td>
                    </tr>

                    {/* R0 */}
                    <tr>
                      <td className="py-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        Basic Reproduction Number (R₀)
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">
                        {loggedR0.toFixed(2)}
                      </td>
                      <td className="py-2.5 font-bold text-purple-600 dark:text-purple-400">
                        {estimationResult ? estimationResult.R0.toFixed(2) : 'Pending fit'}
                      </td>
                      <td className="py-2.5">
                        {deltaR0 !== null ? (
                          <span
                            className={
                              Number(deltaR0) > 0
                                ? 'text-amber-600 font-semibold'
                                : 'text-emerald-600 font-semibold'
                            }
                          >
                            {Number(deltaR0) > 0 ? `+${deltaR0}%` : `${deltaR0}%`}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 font-sans text-slate-500 text-[11px]">
                        {estimationResult
                          ? `95% CI: [${estimationResult.confidenceIntervals.R0[0]} – ${estimationResult.confidenceIntervals.R0[1]}]`
                          : 'Awaiting calibration'}
                      </td>
                    </tr>

                    {/* Infectious Period */}
                    <tr>
                      <td className="py-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        Infectious Period (1/γ)
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">
                        {loggedInfectiousPeriod.toFixed(1)} days
                      </td>
                      <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                        {estimationResult
                          ? `${estimationResult.infectiousPeriodDays.toFixed(1)} days`
                          : 'Pending fit'}
                      </td>
                      <td className="py-2.5">
                        {deltaInf !== null ? (
                          <span>{Number(deltaInf) > 0 ? `+${deltaInf}%` : `${deltaInf}%`}</span>
                        ) : (
                          <span className="text-slate-400 font-sans text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 font-sans text-slate-500 text-[11px]">
                        Pathogen shedding window duration.
                      </td>
                    </tr>

                    {/* Incubation Period */}
                    <tr>
                      <td className="py-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        Incubation Period (1/σ)
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">
                        {loggedIncubationPeriod.toFixed(1)} days
                      </td>
                      <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                        {estimationResult
                          ? `${estimationResult.incubationPeriodDays.toFixed(1)} days`
                          : 'Pending fit'}
                      </td>
                      <td className="py-2.5">
                        {deltaInc !== null ? (
                          <span>{Number(deltaInc) > 0 ? `+${deltaInc}%` : `${deltaInc}%`}</span>
                        ) : (
                          <span className="text-slate-400 font-sans text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 font-sans text-slate-500 text-[11px]">
                        Latency duration before infectiousness.
                      </td>
                    </tr>

                    {/* Peak Timing */}
                    <tr>
                      <td className="py-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        Peak Incidence Timing
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">
                        Day {activeLog.outcomesSummary.peakDay}
                      </td>
                      <td className="py-2.5 font-bold text-amber-600">
                        {empiricalPeakDay !== null ? `Day ${empiricalPeakDay}` : 'N/A'}
                      </td>
                      <td className="py-2.5 font-sans font-semibold text-slate-700 dark:text-slate-300">
                        {empiricalPeakDay !== null ? (
                          `${Math.abs(empiricalPeakDay - activeLog.outcomesSummary.peakDay)} days offset`
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 font-sans text-slate-500 text-[11px]">
                        {empiricalPeakDay !== null &&
                        Math.abs(empiricalPeakDay - activeLog.outcomesSummary.peakDay) <= 3
                          ? 'Temporal peak alignment is highly consistent.'
                          : 'Temporal divergence indicates intervention or contact rate shift.'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip for Epidemiologists:</strong> Reviewing logged simulation state transitions (e.g. NPI enacted at Day 14 or hospital overload) helps explain sudden changes in empirical case slopes without incorrectly attributing them to changes in pathogen biology (β or R₀).
                </span>
              </div>
            </div>
          ) : (
            /* State Transitions Timeline with Empirical Context */
            <div className="space-y-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Chronological state transitions detected in <strong>{activeLog.label}</strong>:
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl max-h-72 overflow-y-auto">
                {activeLog.transitions.map((t) => {
                  // Check what empirical data was on that day
                  const empiricalDayRecord = records.find((r) => r.dayIndex === t.day);

                  return (
                    <div
                      key={t.id}
                      className="p-3 bg-white dark:bg-slate-900 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {getTransitionIcon(t.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300 text-[11px]">
                              Day {t.day}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {t.title}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                              ({t.category})
                            </span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                            {t.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {t.metricValue && (
                          <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {t.metricValue}
                          </div>
                        )}
                        {empiricalDayRecord && empiricalDayRecord.newCases !== undefined && (
                          <div className="text-[10px] text-amber-600 font-mono">
                            Observed: {empiricalDayRecord.newCases.toLocaleString()} cases
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
