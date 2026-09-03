import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  LineChart as ChartIcon,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { DatasetRecord, ParameterEstimationResult, SimulationConfig, SimulationEventLogEntry } from '../types/simulation';
import { estimateParametersFromData } from '../engine/estimation';
import { DisclaimerBanner } from './DisclaimerBanner';
import { EventLogFittingReview } from './EventLogFittingReview';

interface ModelFittingProps {
  records: DatasetRecord[];
  activeConfig: SimulationConfig;
  onApplyFittedConfig: (config: SimulationConfig) => void;
  isLearningMode: boolean;
  eventLogs?: SimulationEventLogEntry[];
  selectedLogId?: string | null;
  onSelectLogId?: (logId: string) => void;
}

export const ModelFitting: React.FC<ModelFittingProps> = ({
  records,
  activeConfig,
  onApplyFittedConfig,
  isLearningMode,
  eventLogs = [],
  selectedLogId = null,
  onSelectLogId = () => {},
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [estimationResult, setEstimationResult] = useState<ParameterEstimationResult | null>(null);
  const [appliedNotice, setAppliedNotice] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [seededInitialGuess, setSeededInitialGuess] = useState<{
    beta?: number;
    infectiousPeriod?: number;
    incubationPeriod?: number;
    mortalityRate?: number;
  } | null>(null);
  const [seededNotice, setSeededNotice] = useState<string | null>(null);

  // Run Nelder-Mead simplex estimation
  const handleRunEstimation = (overrideSeed?: typeof seededInitialGuess) => {
    setErrorNotice(null);
    if (records.length < 5) {
      setErrorNotice('Please upload or load a dataset with at least 5 empirical observations in the Data Center first.');
      return;
    }

    setIsOptimizing(true);
    setTimeout(() => {
      try {
        const obs = records.map((r) => ({
          day: r.dayIndex,
          date: r.date,
          cases: r.newCases,
          deaths: r.deaths,
        }));
        const seedToUse = overrideSeed !== undefined ? overrideSeed : seededInitialGuess;
        const result = estimateParametersFromData(obs, activeConfig.population, seedToUse || undefined);
        setEstimationResult(result);
      } catch (err: any) {
        setErrorNotice(`Parameter estimation error: ${err.message || 'Optimization failed'}`);
      } finally {
        setIsOptimizing(false);
      }
    }, 150);
  };

  const handleSeedOptimization = (guess: {
    beta: number;
    infectiousPeriod: number;
    incubationPeriod: number;
    mortalityRate: number;
  }) => {
    setSeededInitialGuess(guess);
    setSeededNotice(
      `Optimization prior seeded from logged simulation: β=${guess.beta.toFixed(3)}, infectious=${guess.infectiousPeriod.toFixed(1)}d, incubation=${guess.incubationPeriod.toFixed(1)}d, μ=${guess.mortalityRate.toFixed(4)}`
    );
    // Auto trigger estimation with the seeded prior
    handleRunEstimation(guess);
  };

  const handleApplyParameters = () => {
    if (!estimationResult) return;
    const fittedStrain = {
      ...activeConfig.strains[0],
      beta: estimationResult.beta,
      incubationPeriod: estimationResult.incubationPeriodDays,
      infectiousPeriod: estimationResult.infectiousPeriodDays,
      mortalityRate: Number((estimationResult.mu / (estimationResult.gamma + estimationResult.mu)).toFixed(4)),
    };

    onApplyFittedConfig({
      ...activeConfig,
      strains: [fittedStrain, ...activeConfig.strains.slice(1)],
    });
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 4000);
  };

  return (
    <div id="model-fitting" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ChartIcon className="w-6 h-6 text-blue-600" />
            <span>Empirical Model Calibration & Parameter Estimation</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fit SEIRD differential equations to observed incidence data using constrained nonlinear least-squares optimization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunEstimation()}
            disabled={isOptimizing || records.length < 5}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>{isOptimizing ? 'Optimizing Simplex...' : 'Calibrate Model Parameters'}</span>
          </button>
        </div>
      </div>

      <DisclaimerBanner compact />

      {/* Prior Simulation Event Log Review */}
      <EventLogFittingReview
        eventLogs={eventLogs}
        selectedLogId={selectedLogId}
        onSelectLogId={onSelectLogId}
        estimationResult={estimationResult}
        records={records}
        onSeedOptimization={handleSeedOptimization}
        onApplyLoggedConfig={onApplyFittedConfig}
        activeConfig={activeConfig}
      />

      {seededNotice && (
        <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 rounded-xl text-xs text-purple-900 dark:text-purple-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <span>{seededNotice}</span>
          </div>
          <button
            onClick={() => setSeededNotice(null)}
            className="text-purple-700 dark:text-purple-400 hover:underline text-[11px] font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {records.length < 5 ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Info className="w-10 h-10 text-blue-500 mx-auto" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            No Empirical Dataset Loaded
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Please navigate to the <strong>Data Center</strong> and load the 40-Day Synthetic Dataset or upload custom incidence numbers.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {errorNotice && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorNotice}</span>
              </div>
              <button
                onClick={() => setErrorNotice(null)}
                className="text-rose-700 dark:text-rose-400 hover:underline text-[11px] font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {appliedNotice && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Calibrated parameters (β, γ, σ, μ) successfully transferred to the active SEIRD simulation engine!
              </span>
            </div>
          )}

          {estimationResult && (
            <>
              {/* Fit Statistics KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs text-slate-500">Goodness of Fit R²</span>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {estimationResult.fitMetrics.r2}
                  </div>
                  <span className="text-[10px] text-slate-400">Target: &gt; 0.85</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs text-slate-500">Mean Absolute Error (MAE)</span>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {estimationResult.fitMetrics.mae.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">Cases/day deviation</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs text-slate-500">Root Mean Square Error (RMSE)</span>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {estimationResult.fitMetrics.rmse.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">Quadratic penalty metric</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs text-slate-500">Calibrated R₀ Estimate</span>
                  <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {estimationResult.R0}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    95% CI: [{estimationResult.confidenceIntervals.R0[0]} – {estimationResult.confidenceIntervals.R0[1]}]
                  </span>
                </div>
              </div>

              {/* Chart 1: Overlay Observed vs Model */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Observed Empirical Cases vs Fitted Model Trajectory
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Solid line represents continuous calibrated SEIRD differential solution
                    </p>
                  </div>
                  <button
                    onClick={handleApplyParameters}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply Parameters to Simulator</span>
                  </button>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={estimationResult.residuals} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: 'Observation Day', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                        labelFormatter={(lbl) => `Day ${lbl}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Line type="monotone" dataKey="observed" name="Observed Cases" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="model" name="Fitted Model" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Residuals Plot */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Optimization Residuals (Observed − Model)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Symmetric distribution around zero indicates unbiased estimation without structural misspecification
                  </p>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={estimationResult.residuals} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(val: any) => [Number(val).toLocaleString(), 'Residual']}
                        labelFormatter={(lbl) => `Day ${lbl}`}
                      />
                      <ReferenceLine y={0} stroke="#94a3b8" />
                      <Bar dataKey="residual" fill="#64748b" name="Residual Error" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Estimated Parameters Table */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Estimated Compartmental Parameters
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                    <span className="text-slate-500">Transmission Rate (β)</span>
                    <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {estimationResult.beta}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      CI: [{estimationResult.confidenceIntervals.beta[0]} – {estimationResult.confidenceIntervals.beta[1]}]
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                    <span className="text-slate-500">Infectious Period</span>
                    <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {estimationResult.infectiousPeriodDays} days
                    </div>
                    <span className="text-[10px] text-slate-400">γ = {estimationResult.gamma}/day</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                    <span className="text-slate-500">Incubation Period</span>
                    <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {estimationResult.incubationPeriodDays} days
                    </div>
                    <span className="text-[10px] text-slate-400">σ = {estimationResult.sigma}/day</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                    <span className="text-slate-500">Mortality Rate (μ)</span>
                    <div className="font-mono font-bold text-sm text-red-600 dark:text-red-400">
                      {estimationResult.mu} / day
                    </div>
                    <span className="text-[10px] text-slate-400">Pathogen virulence</span>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Scientific Disclaimer on Parameter Calibration</span>
                  </div>
                  <p>
                    Parameter estimation is model-dependent and should not be interpreted as a clinical estimate. The fitted rates assume homogeneous population contact patterns, zero behavioral feedback loops, and closed community bounds.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
