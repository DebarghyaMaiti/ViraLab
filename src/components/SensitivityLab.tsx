import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Sliders,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  Maximize2,
  Eye,
  FileSpreadsheet,
  FileCode,
  Flame,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ScatterChart,
  Scatter,
} from 'recharts';
import { SimulationConfig, SimulationResults } from '../types/simulation';
import {
  QueuedSimulation,
  SensitivityParameterKey,
  SensitivityMetricKey,
  SensitivityPoint,
  SensitivityAnalysisSummary,
  SweepPreset,
} from '../types/sensitivity';
import {
  PARAMETER_METADATA,
  SWEEP_PRESETS,
  SENSITIVITY_COLORS,
  buildSweepQueue,
  createConfigWithParamOverride,
  executeQueueInSequence,
  executeSingleSimulation,
  extractSensitivityPoints,
  computeSensitivitySummary,
  exportSensitivityDataAsCsv,
  exportSensitivityDataAsJson,
} from '../engine/sensitivity';

interface SensitivityLabProps {
  baseConfig: SimulationConfig;
  onApplyConfigToMain: (config: SimulationConfig) => void;
  isLearningMode: boolean;
}

export const SensitivityLab: React.FC<SensitivityLabProps> = ({
  baseConfig,
  onApplyConfigToMain,
  isLearningMode,
}) => {
  // Active selected parameter for sweep generation
  const [selectedParamKey, setSelectedParamKey] = useState<SensitivityParameterKey>('beta');
  const paramMeta = PARAMETER_METADATA[selectedParamKey];

  // Custom sweep range controls
  const [sweepMin, setSweepMin] = useState<number>(paramMeta.defaultMin);
  const [sweepMax, setSweepMax] = useState<number>(paramMeta.defaultMax);
  const [sweepSteps, setSweepSteps] = useState<number>(paramMeta.defaultSteps);

  // Update sweep inputs when parameter changes
  const handleParamKeyChange = (key: SensitivityParameterKey) => {
    setSelectedParamKey(key);
    const meta = PARAMETER_METADATA[key];
    setSweepMin(meta.defaultMin);
    setSweepMax(meta.defaultMax);
    setSweepSteps(meta.defaultSteps);
  };

  // Simulation Queue State
  const [queue, setQueue] = useState<QueuedSimulation[]>(() => {
    return buildSweepQueue(
      baseConfig,
      'beta',
      PARAMETER_METADATA.beta.defaultMin,
      PARAMETER_METADATA.beta.defaultMax,
      PARAMETER_METADATA.beta.defaultSteps
    );
  });

  // Execution State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [currentRunIndex, setCurrentRunIndex] = useState<number>(-1);
  const isCancelledRef = useRef<boolean>(false);

  // Active view tab for results
  const [activeResultsTab, setActiveResultsTab] = useState<'trajectories' | 'response' | 'matrix'>('trajectories');
  const [selectedTrajectoryMetric, setSelectedTrajectoryMetric] = useState<'active' | 'newInfections' | 'deaths' | 'hospitalized'>('active');
  const [selectedResponseMetric, setSelectedResponseMetric] = useState<SensitivityMetricKey>('peakActive');

  // Manual single run builder state
  const [customValueInput, setCustomValueInput] = useState<number>(paramMeta.defaultMin);
  const [customLabelInput, setCustomLabelInput] = useState<string>('');

  // Extract completed data points
  const completedPoints: SensitivityPoint[] = useMemo(() => {
    return extractSensitivityPoints(queue);
  }, [queue]);

  // Derived sensitivity summary & elasticity
  const sensitivitySummary: SensitivityAnalysisSummary | null = useMemo(() => {
    if (completedPoints.length < 2) return null;
    const key = queue[0]?.paramKey || selectedParamKey;
    return computeSensitivitySummary(completedPoints, key);
  }, [completedPoints, queue, selectedParamKey]);

  // Total stats
  const totalQueued = queue.length;
  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const failedCount = queue.filter((q) => q.status === 'failed').length;
  const overallProgress = totalQueued > 0 ? Math.round((completedCount / totalQueued) * 100) : 0;

  // Handler: Load Preset Sweep
  const handleLoadPreset = (preset: SweepPreset) => {
    setSelectedParamKey(preset.paramKey);
    setSweepMin(preset.min);
    setSweepMax(preset.max);
    setSweepSteps(preset.steps);

    const newQueue = buildSweepQueue(baseConfig, preset.paramKey, preset.min, preset.max, preset.steps);
    setQueue(newQueue);
  };

  // Handler: Generate Custom Sweep
  const handleGenerateSweep = () => {
    const min = Math.min(sweepMin, sweepMax);
    const max = Math.max(sweepMin, sweepMax);
    const newQueue = buildSweepQueue(baseConfig, selectedParamKey, min, max, sweepSteps);
    setQueue(newQueue);
  };

  // Handler: Append Custom Run to Queue
  const handleAddCustomRun = () => {
    const meta = PARAMETER_METADATA[selectedParamKey];
    const cfg = createConfigWithParamOverride(baseConfig, selectedParamKey, customValueInput);
    const label = customLabelInput.trim() || `${meta.shortLabel} = ${meta.format(customValueInput)}`;

    const newRun: QueuedSimulation = {
      id: `custom-run-${Date.now().toString(36)}`,
      label,
      paramKey: selectedParamKey,
      paramLabel: meta.label,
      paramValue: customValueInput,
      unit: meta.unit,
      config: cfg,
      status: 'idle',
      progress: 0,
    };

    setQueue((prev) => [...prev, newRun]);
    setCustomLabelInput('');
  };

  // Handler: Start Sequential Execution
  const handleStartSequentialExecution = async () => {
    if (queue.length === 0 || isExecuting) return;

    setIsExecuting(true);
    isCancelledRef.current = false;

    // Reset idle or failed items to clean state
    const readyQueue: QueuedSimulation[] = queue.map((item) => ({
      ...item,
      status: item.status === 'completed' ? 'completed' : 'idle',
      progress: item.status === 'completed' ? 100 : 0,
    }));
    setQueue(readyQueue);

    await executeQueueInSequence(
      readyQueue,
      (idx, item) => {
        setCurrentRunIndex(idx);
        setQueue((prev) => {
          const next = [...prev];
          next[idx] = item;
          return next;
        });
      },
      (idx, updatedItem) => {
        setQueue((prev) => {
          const next = [...prev];
          next[idx] = updatedItem;
          return next;
        });
      },
      isCancelledRef
    );

    setIsExecuting(false);
    setCurrentRunIndex(-1);
  };

  // Handler: Cancel / Stop Execution
  const handleCancelExecution = () => {
    isCancelledRef.current = true;
    setIsExecuting(false);
    setCurrentRunIndex(-1);
  };

  // Handler: Run Single Item in Queue
  const handleRunSingleItem = async (index: number) => {
    const item = queue[index];
    if (!item) return;

    setQueue((prev) => {
      const next = [...prev];
      next[index] = { ...item, status: 'running', progress: 30 };
      return next;
    });

    const startTime = performance.now();
    try {
      const res = await executeSingleSimulation(item.config);
      const durationMs = Math.round(performance.now() - startTime);

      setQueue((prev) => {
        const next = [...prev];
        next[index] = {
          ...item,
          status: 'completed',
          progress: 100,
          durationMs,
          results: res,
        };
        return next;
      });
    } catch (err: any) {
      setQueue((prev) => {
        const next = [...prev];
        next[index] = {
          ...item,
          status: 'failed',
          progress: 0,
          error: err?.message || 'Execution error',
        };
        return next;
      });
    }
  };

  // Handler: Remove Item
  const handleRemoveItem = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  // Handler: Clear All or Completed
  const handleClearCompleted = () => {
    setQueue((prev) => prev.filter((q) => q.status !== 'completed'));
  };

  const handleClearAll = () => {
    if (isExecuting) handleCancelExecution();
    setQueue([]);
  };

  // Prepare multi-trajectory data for Recharts
  const trajectoryChartData = useMemo(() => {
    const completed = queue.filter((q) => q.status === 'completed' && q.results);
    if (completed.length === 0) return [];

    const maxDays = Math.max(...completed.map((c) => c.results!.timeSeries.length));
    const mergedData: any[] = [];

    for (let day = 0; day < maxDays; day++) {
      const point: any = { day };
      completed.forEach((run, idx) => {
        const tsPoint = run.results!.timeSeries[day];
        if (tsPoint) {
          let val = 0;
          if (selectedTrajectoryMetric === 'active') val = tsPoint.totalActive;
          else if (selectedTrajectoryMetric === 'newInfections') val = tsPoint.newInfectionsDaily;
          else if (selectedTrajectoryMetric === 'deaths') val = tsPoint.D;
          else if (selectedTrajectoryMetric === 'hospitalized') val = tsPoint.H || 0;
          point[`run_${run.id}`] = Math.round(val);
        }
      });
      mergedData.push(point);
    }

    return mergedData;
  }, [queue, selectedTrajectoryMetric]);

  // Prepare response curve data for Recharts
  const responseChartData = useMemo(() => {
    if (completedPoints.length === 0) return [];

    return completedPoints.map((pt) => {
      let outcomeVal = 0;
      switch (selectedResponseMetric) {
        case 'peakActive':
          outcomeVal = pt.peakActive;
          break;
        case 'peakDay':
          outcomeVal = pt.peakDay;
          break;
        case 'totalInfected':
          outcomeVal = pt.totalInfected;
          break;
        case 'attackRate':
          outcomeVal = pt.attackRate;
          break;
        case 'totalDeaths':
          outcomeVal = pt.totalDeaths;
          break;
        case 'basicR0':
          outcomeVal = pt.r0;
          break;
        case 'maxRe':
          outcomeVal = pt.maxRe;
          break;
        case 'peakHospitalized':
          outcomeVal = pt.peakHospitalized;
          break;
        case 'hospitalOverloadDays':
          outcomeVal = pt.hospitalOverloadDays;
          break;
      }

      return {
        paramValue: pt.paramValue,
        formattedValue: pt.formattedValue,
        label: pt.label,
        outcome: outcomeVal,
        color: pt.color,
      };
    });
  }, [completedPoints, selectedResponseMetric]);

  return (
    <div className="space-y-8">
      {/* Module Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Sensitivity Analysis & Sequential Execution Queue
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Queue systematic multi-run parameter sweeps to test epidemiological elasticity, measure how variations in transmission, interventions, or host parameters shift outbreak peaks, and identify non-linear tipping points.
            </p>
          </div>

          {/* Master Queue Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isExecuting ? (
              <button
                type="button"
                onClick={handleCancelExecution}
                className="px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Queue</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartSequentialExecution}
                disabled={queue.length === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Queue in Sequence ({queue.length} runs)</span>
              </button>
            )}

            {completedPoints.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => exportSensitivityDataAsCsv(completedPoints, paramMeta.label)}
                  title="Export Sensitivity Data as CSV"
                  className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                {sensitivitySummary && (
                  <button
                    type="button"
                    onClick={() => exportSensitivityDataAsJson(sensitivitySummary)}
                    title="Export Complete Analysis Report as JSON"
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <FileCode className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Global Queue Progress Bar */}
        {totalQueued > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Execution Queue Progress
                </span>
                <span>·</span>
                <span>{completedCount} of {totalQueued} runs completed</span>
                {failedCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-rose-600 dark:text-rose-400">{failedCount} failed</span>
                  </>
                )}
              </div>
              <div className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {overallProgress}%
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isExecuting ? 'bg-indigo-600 animate-pulse' : 'bg-emerald-500'
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Preset Sensitivity Sweeps */}
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Standard Sensitivity Presets
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Click any preset to configure and queue runs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {SWEEP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleLoadPreset(preset)}
              className={`p-3 text-left rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                selectedParamKey === preset.paramKey
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30'
              }`}
            >
              <div>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                  {preset.badge}
                </span>
                <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  {preset.name}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                Range: {preset.min} → {preset.max} ({preset.steps} steps)
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Sweep Generator & Manual Configuration Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Param Selector & Range Builder */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Configure Parameter Sweep</span>
            </h4>
            <span className="text-xs text-slate-500 font-mono">
              Target: {paramMeta.label} [{paramMeta.unit}]
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Swept Parameter
              </label>
              <select
                value={selectedParamKey}
                onChange={(e) => handleParamKeyChange(e.target.value as SensitivityParameterKey)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {Object.values(PARAMETER_METADATA).map((meta) => (
                  <option key={meta.key} value={meta.key}>
                    {meta.label} ({meta.unit})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {paramMeta.description}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Start Value
                </label>
                <input
                  type="number"
                  step={paramMeta.step}
                  value={sweepMin}
                  onChange={(e) => setSweepMin(Number(e.target.value))}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  End Value
                </label>
                <input
                  type="number"
                  step={paramMeta.step}
                  value={sweepMax}
                  onChange={(e) => setSweepMax(Number(e.target.value))}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Steps Count
                </label>
                <input
                  type="number"
                  min={3}
                  max={15}
                  value={sweepSteps}
                  onChange={(e) => setSweepSteps(Math.max(2, Math.min(15, Number(e.target.value))))}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Generates {sweepSteps} equidistant simulation variations across{' '}
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {sweepMin}
              </span>{' '}
              to{' '}
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {sweepMax}
              </span>{' '}
              {paramMeta.unit}.
            </div>

            <button
              type="button"
              onClick={handleGenerateSweep}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Generate & Replace Queue</span>
            </button>
          </div>
        </div>

        {/* Manual Single Run Adder */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            Add Individual Custom Run
          </h4>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Custom Run Label (Optional)
            </label>
            <input
              type="text"
              placeholder={`e.g. Extreme ${paramMeta.shortLabel}`}
              value={customLabelInput}
              onChange={(e) => setCustomLabelInput(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span>{paramMeta.label}</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                {paramMeta.format(customValueInput)}
              </span>
            </div>
            <input
              type="number"
              step={paramMeta.step}
              value={customValueInput}
              onChange={(e) => setCustomValueInput(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <button
            type="button"
            onClick={handleAddCustomRun}
            className="w-full py-2 px-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-900 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enqueue Single Run</span>
          </button>
        </div>
      </div>

      {/* Execution Queue Table & Controls */}
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Simulation Execution Queue</span>
            </h4>
            <span className="text-xs text-slate-500 font-mono">
              ({queue.length} runs in queue)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <button
                type="button"
                onClick={handleClearCompleted}
                className="px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Clear Completed
              </button>
            )}
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 text-[11px] font-medium text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No simulations currently queued. Select a preset sweep above or generate a custom parameter range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Run Label</th>
                  <th className="py-2.5 px-3">Parameter Value</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Runtime</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {queue.map((item, index) => {
                  const meta = PARAMETER_METADATA[item.paramKey];
                  const isCurrent = currentRunIndex === index;
                  const color = SENSITIVITY_COLORS[index % SENSITIVITY_COLORS.length];

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isCurrent ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {index + 1}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {item.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {meta ? meta.format(item.paramValue) : item.paramValue} {item.unit}
                      </td>

                      <td className="py-2.5 px-3">
                        {item.status === 'idle' && (
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Queued</span>
                          </span>
                        )}
                        {item.status === 'running' && (
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 animate-spin" />
                            <span>Running...</span>
                          </span>
                        )}
                        {item.status === 'completed' && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Failed</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {item.durationMs ? `${item.durationMs}ms` : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRunSingleItem(index)}
                            disabled={isExecuting}
                            title="Execute this run"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onApplyConfigToMain(item.config)}
                            title="Load this run's configuration into main Simulation Lab"
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={isExecuting}
                            title="Remove from queue"
                            className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sensitivity Analysis Results & Comparative Insights */}
      {completedPoints.length > 0 && (
        <section className="space-y-6">
          {/* Key Metric Elasticity Banner */}
          {sensitivitySummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Outbreak Elasticity
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {sensitivitySummary.elasticityPeakActive > 0 ? '+' : ''}
                    {sensitivitySummary.elasticityPeakActive}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ({sensitivitySummary.sensitivityRating})
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  10% change in {paramMeta.shortLabel} alters peak cases by ~
                  {Math.abs(Math.round(sensitivitySummary.elasticityPeakActive * 10))}%
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Peak Day Shift (Flattening)
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {sensitivitySummary.peakDayShiftPerUnit > 0 ? '+' : ''}
                    {sensitivitySummary.peakDayShiftPerUnit}
                  </span>
                  <span className="text-xs text-slate-500">days / unit</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Outbreak timing delay or acceleration across swept parameter range
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Mortality Range Spread
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    {sensitivitySummary.bestRun.totalDeaths.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">→</span>
                  <span className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300">
                    {sensitivitySummary.worstRun.totalDeaths.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Deaths between least and most severe simulated variations
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Critical Tipping Point
                </span>
                {sensitivitySummary.tippingPoint ? (
                  <>
                    <div className="mt-1 flex items-baseline gap-2 text-amber-600 dark:text-amber-400 font-bold font-mono text-base">
                      <Flame className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>{paramMeta.shortLabel} ≈ {sensitivitySummary.tippingPoint.criticalValue}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {sensitivitySummary.tippingPoint.description}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>No Discontinuous Inflection</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Smooth monotonic epidemic response across tested bounds
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Results Sub-Tab Bar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveResultsTab('trajectories')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeResultsTab === 'trajectories'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Multi-Run Trajectory Overlay
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab('response')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeResultsTab === 'response'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Parameter Response Curve
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab('matrix')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeResultsTab === 'matrix'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Sensitivity Matrix Table
                </button>
              </div>

              {/* Sub-Metric Selectors depending on active tab */}
              {activeResultsTab === 'trajectories' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Metric:</span>
                  <select
                    value={selectedTrajectoryMetric}
                    onChange={(e: any) => setSelectedTrajectoryMetric(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="active">Active Infections I(t)</option>
                    <option value="newInfections">Daily New Infections</option>
                    <option value="deaths">Cumulative Deaths D(t)</option>
                    <option value="hospitalized">Hospital Census H(t)</option>
                  </select>
                </div>
              )}

              {activeResultsTab === 'response' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Response Y-Axis:</span>
                  <select
                    value={selectedResponseMetric}
                    onChange={(e: any) => setSelectedResponseMetric(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="peakActive">Peak Active Infections</option>
                    <option value="peakDay">Peak Timing (Day)</option>
                    <option value="totalInfected">Total Cumulative Cases</option>
                    <option value="attackRate">Final Attack Rate (%)</option>
                    <option value="totalDeaths">Total Cumulative Deaths</option>
                    <option value="basicR0">Basic Reproduction Number (R₀)</option>
                    <option value="hospitalOverloadDays">Hospital Overload Days</option>
                  </select>
                </div>
              )}
            </div>

            {/* TAB 1: Multi-Trajectory Overlay Chart */}
            {activeResultsTab === 'trajectories' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Overlaying {completedPoints.length} simulated trajectories:
                  </span>
                  {completedPoints.map((pt) => (
                    <span key={pt.runId} className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: pt.color }}
                      />
                      <span>{pt.label}</span>
                    </span>
                  ))}
                </div>

                <div className="h-80 w-full min-w-0 max-w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                    <LineChart data={trajectoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis
                        dataKey="day"
                        label={{ value: 'Simulation Time (Days)', position: 'insideBottom', offset: -5 }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                      />
                      {queue
                        .filter((q) => q.status === 'completed' && q.results)
                        .map((run, idx) => {
                          const color = SENSITIVITY_COLORS[idx % SENSITIVITY_COLORS.length];
                          return (
                            <Line
                              key={run.id}
                              type="monotone"
                              dataKey={`run_${run.id}`}
                              name={run.label}
                              stroke={color}
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={false}
                            />
                          );
                        })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 2: Parameter Response Curve */}
            {activeResultsTab === 'response' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-500">
                  Response curve demonstrating how{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {paramMeta.label}
                  </span>{' '}
                  influences{' '}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {selectedResponseMetric}
                  </span>
                  .
                </div>

                <div className="h-80 w-full min-w-0 max-w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                    <LineChart data={responseChartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis
                        dataKey="formattedValue"
                        label={{
                          value: `${paramMeta.label} (${paramMeta.unit})`,
                          position: 'insideBottom',
                          offset: -5,
                        }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="outcome"
                        name={selectedResponseMetric}
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ r: 5, fill: '#6366f1' }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 3: Sensitivity Matrix Table */}
            {activeResultsTab === 'matrix' && (
              <div className="overflow-x-auto w-full min-w-0 max-w-full scrollbar-thin">
                <table className="w-full text-left text-xs min-w-[720px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Run</th>
                      <th className="py-2.5 px-3">{paramMeta.shortLabel} Value</th>
                      <th className="py-2.5 px-3">R₀ / Re</th>
                      <th className="py-2.5 px-3 text-right">Peak Active</th>
                      <th className="py-2.5 px-3 text-right">Peak Day</th>
                      <th className="py-2.5 px-3 text-right">Total Cases</th>
                      <th className="py-2.5 px-3 text-right">Attack Rate</th>
                      <th className="py-2.5 px-3 text-right">Total Deaths</th>
                      <th className="py-2.5 px-3 text-right">Hosp. Overload</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {completedPoints.map((pt) => {
                      const matchingRun = queue.find((q) => q.id === pt.runId);

                      return (
                        <tr
                          key={pt.runId}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: pt.color }}
                              />
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {pt.label}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {pt.formattedValue}
                          </td>

                          <td className="py-2.5 px-3 font-mono">
                            <span className={pt.r0 > 1 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}>
                              {pt.r0}
                            </span>
                            <span className="text-slate-400 text-[10px] ml-1">
                              (max {pt.maxRe})
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {pt.peakActive.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            Day {pt.peakDay}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {pt.totalInfected.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {pt.attackRate}%
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            {pt.totalDeaths.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono">
                            {pt.hospitalOverloadDays > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">
                                {pt.hospitalOverloadDays} days
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                None (0)
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            {matchingRun && (
                              <button
                                type="button"
                                onClick={() => onApplyConfigToMain(matchingRun.config)}
                                className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                              >
                                Apply Config
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
