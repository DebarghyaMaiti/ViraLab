import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  X,
  Layers,
  ArrowRight,
  Activity,
  Calendar,
  HeartPulse,
  Skull,
  Percent,
  FileSpreadsheet,
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
} from 'recharts';
import { SimulationEventLogEntry, SimulationConfig } from '../types/simulation';
import { runDeterministicSimulation } from '../engine/rk45';

interface ComparativeLogsViewerProps {
  logs: SimulationEventLogEntry[];
  onRemoveLog: (logId: string) => void;
  onRestoreConfig: (config: SimulationConfig) => void;
  onClose?: () => void;
}

const COMPARISON_COLORS = [
  '#2563eb', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#ca8a04', // Yellow
];

export const ComparativeLogsViewer: React.FC<ComparativeLogsViewerProps> = ({
  logs,
  onRemoveLog,
  onRestoreConfig,
  onClose,
}) => {
  const [metric, setMetric] = useState<'active' | 'newInfections' | 'deaths' | 're' | 'hospitalized'>('active');

  // Ensure each log has its timeSeries computed (or use cached results)
  const resolvedLogsWithData = useMemo(() => {
    return logs.map((log, index) => {
      let timeSeries = log.timeSeries;
      if (!timeSeries || timeSeries.length === 0) {
        try {
          const freshResults = runDeterministicSimulation(log.config);
          timeSeries = freshResults.timeSeries;
        } catch {
          timeSeries = [];
        }
      }
      const color = COMPARISON_COLORS[index % COMPARISON_COLORS.length];
      return {
        ...log,
        resolvedTimeSeries: timeSeries,
        color,
      };
    });
  }, [logs]);

  // Merge time series into synchronized Recharts format
  const chartData = useMemo(() => {
    if (resolvedLogsWithData.length === 0) return [];

    const maxDays = Math.max(...resolvedLogsWithData.map((l) => l.resolvedTimeSeries.length));
    const merged: any[] = [];

    for (let day = 0; day < maxDays; day++) {
      const point: any = { day };
      resolvedLogsWithData.forEach((log) => {
        const tsPoint = log.resolvedTimeSeries[day];
        if (tsPoint) {
          let val = 0;
          if (metric === 'active') val = tsPoint.totalActive;
          else if (metric === 'newInfections') val = tsPoint.newInfectionsDaily;
          else if (metric === 'deaths') val = tsPoint.D;
          else if (metric === 're') val = Number(tsPoint.effectiveR.toFixed(2));
          else if (metric === 'hospitalized') val = Math.round(tsPoint.H || 0);

          point[`log_${log.id}`] = val;
        }
      });
      merged.push(point);
    }

    return merged;
  }, [resolvedLogsWithData, metric]);

  // Export comparison table to CSV
  const handleExportComparisonCsv = () => {
    if (logs.length === 0) return;

    const headers = [
      'Metric / Parameter',
      ...logs.map((l) => `"${l.label.replace(/"/g, '""')}"`),
    ];

    const rows = [
      ['Timestamp', ...logs.map((l) => new Date(l.timestamp).toLocaleString())],
      ['Population (N)', ...logs.map((l) => l.parametersSummary.population)],
      ['Primary Beta (β)', ...logs.map((l) => l.parametersSummary.primaryBeta)],
      ['Infectious Period (1/γ)', ...logs.map((l) => (1 / l.parametersSummary.primaryGamma).toFixed(1))],
      ['Incubation Period (1/σ)', ...logs.map((l) => (1 / l.parametersSummary.primarySigma).toFixed(1))],
      ['Basic R0', ...logs.map((l) => l.parametersSummary.primaryR0)],
      ['Active Interventions', ...logs.map((l) => l.parametersSummary.activeInterventionsCount)],
      ['Vaccination Enabled', ...logs.map((l) => (l.parametersSummary.vaccinationEnabled ? 'Yes' : 'No'))],
      ['Solver', ...logs.map((l) => l.parametersSummary.solver)],
      ['Time Step (dt)', ...logs.map((l) => l.parametersSummary.timeStep)],
      ['Peak Active Cases', ...logs.map((l) => l.outcomesSummary.peakActive)],
      ['Peak Day', ...logs.map((l) => l.outcomesSummary.peakDay)],
      ['Total Cumulative Infected', ...logs.map((l) => l.outcomesSummary.totalInfected)],
      ['Attack Rate (%)', ...logs.map((l) => `${l.outcomesSummary.attackRate}%`)],
      ['Total Deaths', ...logs.map((l) => l.outcomesSummary.totalDeaths)],
      ['Peak / Max Re', ...logs.map((l) => l.outcomesSummary.maxRe)],
      ['Hospital Overload Days', ...logs.map((l) => l.outcomesSummary.hospitalOverloadDays)],
    ];

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulation_logs_comparison_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper to detect if a parameter varied among the selected logs
  const isParamDifferent = (accessor: (l: SimulationEventLogEntry) => any): boolean => {
    if (logs.length < 2) return false;
    const firstVal = accessor(logs[0]);
    return logs.some((l) => accessor(l) !== firstVal);
  };

  const betaDiff = isParamDifferent((l) => l.parametersSummary.primaryBeta);
  const r0Diff = isParamDifferent((l) => l.parametersSummary.primaryR0);
  const gammaDiff = isParamDifferent((l) => l.parametersSummary.primaryGamma);
  const sigmaDiff = isParamDifferent((l) => l.parametersSummary.primarySigma);
  const npiDiff = isParamDifferent((l) => l.parametersSummary.activeInterventionsCount);
  const vaxDiff = isParamDifferent((l) => l.parametersSummary.vaccinationEnabled);
  const solverDiff = isParamDifferent((l) => l.parametersSummary.solver);
  const popDiff = isParamDifferent((l) => l.parametersSummary.population);

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-500">No simulation logs selected for comparison.</p>
      </div>
    );
  }

  const baselineLog = logs[0];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Side-by-Side Simulation Log Comparison
            </h3>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
              ({logs.length} runs active)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Compare trajectories and parameter deltas side-by-side to visualize how specific epidemiological inputs altered outbreak dynamics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportComparisonCsv}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Comparison"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Selected Run Legend Tags */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mr-1">
          Comparing Runs:
        </span>
        {resolvedLogsWithData.map((log) => (
          <div
            key={log.id}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: log.color }}
            />
            <span className="font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">
              {log.label}
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              (R₀ {log.parametersSummary.primaryR0})
            </span>
            <button
              type="button"
              onClick={() => onRemoveLog(log.id)}
              className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer"
              title="Remove from comparison"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setMetric('active')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                metric === 'active'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Active Infections I(t)
            </button>
            <button
              type="button"
              onClick={() => setMetric('newInfections')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                metric === 'newInfections'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Daily New Cases
            </button>
            <button
              type="button"
              onClick={() => setMetric('deaths')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                metric === 'deaths'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Cumulative Deaths
            </button>
            <button
              type="button"
              onClick={() => setMetric('re')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                metric === 're'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Effective Re(t)
            </button>
            <button
              type="button"
              onClick={() => setMetric('hospitalized')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                metric === 'hospitalized'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Hospital Beds H(t)
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Hover over curves to inspect cross-run values on any simulation day
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="day"
                label={{ value: 'Simulation Time (Days)', position: 'insideBottom', offset: -5 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => (metric === 're' ? v.toFixed(1) : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
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
              {resolvedLogsWithData.map((log) => (
                <Line
                  key={log.id}
                  type="monotone"
                  dataKey={`log_${log.id}`}
                  name={log.label}
                  stroke={log.color}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-Side Parameter Impact & Outcome Matrix */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Side-by-Side Parameter Differentiators & Outcomes
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Yellow highlights indicate parameters varied across these runs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3 w-48 shrink-0">Parameter / Outcome</th>
                {resolvedLogsWithData.map((log, idx) => (
                  <th key={log.id} className="py-2.5 px-3 min-w-[200px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: log.color }}
                        />
                        <span className="truncate max-w-[130px] font-bold text-slate-900 dark:text-white">
                          {log.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRestoreConfig(log.config)}
                        title="Load this run's configuration into SimulationLab"
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold cursor-pointer"
                      >
                        Restore
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Parameter Rows */}
              <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <td colSpan={resolvedLogsWithData.length + 1} className="py-1 px-3">
                  Simulation Parameters
                </td>
              </tr>

              <tr className={betaDiff ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Transmission Rate (β)
                  {betaDiff && <span className="ml-1 text-[10px] text-amber-600 font-bold">•</span>}
                </td>
                {resolvedLogsWithData.map((l) => (
                  <td key={l.id} className="py-2 px-3 font-mono">
                    {l.parametersSummary.primaryBeta}
                  </td>
                ))}
              </tr>

              <tr className={r0Diff ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Basic Reproduction R₀
                  {r0Diff && <span className="ml-1 text-[10px] text-amber-600 font-bold">•</span>}
                </td>
                {resolvedLogsWithData.map((l) => (
                  <td key={l.id} className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {l.parametersSummary.primaryR0}
                  </td>
                ))}
              </tr>

              <tr className={gammaDiff ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Infectious Period (1/γ)
                  {gammaDiff && <span className="ml-1 text-[10px] text-amber-600 font-bold">•</span>}
                </td>
                {resolvedLogsWithData.map((l) => (
                  <td key={l.id} className="py-2 px-3 font-mono">
                    {(1 / l.parametersSummary.primaryGamma).toFixed(1)} days
                  </td>
                ))}
              </tr>

              <tr className={sigmaDiff ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Incubation Period (1/σ)
                  {sigmaDiff && <span className="ml-1 text-[10px] text-amber-600 font-bold">•</span>}
                </td>
                {resolvedLogsWithData.map((l) => (
                  <td key={l.id} className="py-2 px-3 font-mono">
                    {(1 / l.parametersSummary.primarySigma).toFixed(1)} days
                  </td>
                ))}
              </tr>

              <tr className={npiDiff ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Active Interventions (NPIs)
                  {npiDiff && <span className="ml-1 text-[10px] text-amber-600 font-bold">•</span>}
                </td>
                {resolvedLogsWithData.map((l) => (
                  <td key={l.id} className="py-2 px-3">
                    {l.parametersSummary.activeInterventionsCount > 0 ? (
                      <span className="text-emerald-600 font-semibold">
                        {l.parametersSummary.activeInterventionsCount} Active
                      </span>
                    ) : (
                      <span className="text-slate-400">None (0)</span>
                    )}
                  </td>
                ))}
              </tr>

              <tr className={vaxDiff ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Vaccination Campaign
                  {vaxDiff && <span className="ml-1 text-[10px] text-amber-600 font-bold">•</span>}
                </td>
                {resolvedLogsWithData.map((l) => (
                  <td key={l.id} className="py-2 px-3">
                    {l.parametersSummary.vaccinationEnabled ? (
                      <span className="text-blue-600 font-semibold">Enabled</span>
                    ) : (
                      <span className="text-slate-400">Disabled</span>
                    )}
                  </td>
                ))}
              </tr>

              <tr className={popDiff ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Population Scale (N)
                  {popDiff && <span className="ml-1 text-[10px] text-amber-600 font-bold">•</span>}
                </td>
                {resolvedLogsWithData.map((l) => (
                  <td key={l.id} className="py-2 px-3 font-mono">
                    {l.parametersSummary.population.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* Outcomes Rows */}
              <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <td colSpan={resolvedLogsWithData.length + 1} className="py-1 px-3">
                  Epidemiological Outcomes Impact
                </td>
              </tr>

              <tr>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Peak Active Infections
                </td>
                {resolvedLogsWithData.map((l, idx) => {
                  const deltaVsBase =
                    idx > 0 && baselineLog.outcomesSummary.peakActive > 0
                      ? Math.round(
                          ((l.outcomesSummary.peakActive - baselineLog.outcomesSummary.peakActive) /
                            baselineLog.outcomesSummary.peakActive) *
                            100
                        )
                      : null;

                  return (
                    <td key={l.id} className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {l.outcomesSummary.peakActive.toLocaleString()}
                      {deltaVsBase !== null && (
                        <span
                          className={`ml-1.5 text-[10px] font-normal ${
                            deltaVsBase < 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          ({deltaVsBase > 0 ? '+' : ''}
                          {deltaVsBase}%)
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Peak Day (Timing)
                </td>
                {resolvedLogsWithData.map((l, idx) => {
                  const shiftDays =
                    idx > 0 ? l.outcomesSummary.peakDay - baselineLog.outcomesSummary.peakDay : null;

                  return (
                    <td key={l.id} className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                      Day {l.outcomesSummary.peakDay}
                      {shiftDays !== null && shiftDays !== 0 && (
                        <span className="ml-1.5 text-[10px] text-slate-500">
                          ({shiftDays > 0 ? `+${shiftDays}d delay` : `${shiftDays}d earlier`})
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Total Cumulative Infected
                </td>
                {resolvedLogsWithData.map((l) => (
                  <td key={l.id} className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                    {l.outcomesSummary.totalInfected.toLocaleString()} ({l.outcomesSummary.attackRate}%)
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Total Cumulative Deaths
                </td>
                {resolvedLogsWithData.map((l, idx) => {
                  const deltaDeaths =
                    idx > 0 && baselineLog.outcomesSummary.totalDeaths > 0
                      ? Math.round(
                          ((l.outcomesSummary.totalDeaths - baselineLog.outcomesSummary.totalDeaths) /
                            baselineLog.outcomesSummary.totalDeaths) *
                            100
                        )
                      : null;

                  return (
                    <td key={l.id} className="py-2 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                      {l.outcomesSummary.totalDeaths.toLocaleString()}
                      {deltaDeaths !== null && (
                        <span
                          className={`ml-1.5 text-[10px] font-normal ${
                            deltaDeaths < 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          ({deltaDeaths > 0 ? '+' : ''}
                          {deltaDeaths}%)
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Hospital Overload Days
                </td>
                {resolvedLogsWithData.map((l) => (
                  <td key={l.id} className="py-2 px-3 font-mono">
                    {l.outcomesSummary.hospitalOverloadDays > 0 ? (
                      <span className="text-rose-600 font-bold">
                        {l.outcomesSummary.hospitalOverloadDays} days
                      </span>
                    ) : (
                      <span className="text-emerald-600">0 days</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
