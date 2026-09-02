import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  TrendingDown,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
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
import { SimulationConfig } from '../types/simulation';
import { runDeterministicSimulation } from '../engine/rk45';
import { defaultSimulationConfig } from '../data/presets';
import { DisclaimerBanner } from './DisclaimerBanner';

interface ScenarioComparisonProps {
  baseConfig: SimulationConfig;
  isLearningMode: boolean;
}

interface ScenarioItem {
  id: string;
  name: string;
  color: string;
  config: SimulationConfig;
}

export const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  baseConfig,
  isLearningMode,
}) => {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([
    {
      id: 'sc-unmitigated',
      name: 'Unmitigated Baseline',
      color: '#ef4444', // red
      config: {
        ...baseConfig,
        interventions: baseConfig.interventions.map((itv) => ({ ...itv, enabled: false })),
        vaccination: { ...baseConfig.vaccination, enabled: false },
      },
    },
    {
      id: 'sc-masks',
      name: 'Universal Mask Mandate',
      color: '#3b82f6', // blue
      config: {
        ...baseConfig,
        interventions: baseConfig.interventions.map((itv) =>
          itv.type === 'masks' ? { ...itv, enabled: true } : { ...itv, enabled: false }
        ),
        vaccination: { ...baseConfig.vaccination, enabled: false },
      },
    },
    {
      id: 'sc-vaccine',
      name: 'Proactive Vaccination Rollout',
      color: '#10b981', // green
      config: {
        ...baseConfig,
        interventions: baseConfig.interventions.map((itv) => ({ ...itv, enabled: false })),
        vaccination: {
          enabled: true,
          startDay: 20,
          dailyRate: 6000,
          coverageTarget: 0.75,
          efficacy: 0.85,
          waningPeriodDays: 240,
          variantEfficacyMap: {},
        },
      },
    },
    {
      id: 'sc-combined',
      name: 'Combined Comprehensive Defense',
      color: '#8b5cf6', // purple
      config: {
        ...baseConfig,
        interventions: baseConfig.interventions.map((itv) => ({ ...itv, enabled: true })),
        vaccination: {
          enabled: true,
          startDay: 25,
          dailyRate: 6000,
          coverageTarget: 0.8,
          efficacy: 0.88,
          waningPeriodDays: 240,
          variantEfficacyMap: {},
        },
      },
    },
  ]);

  // Run all simulations
  const scenarioResults = useMemo(() => {
    return scenarios.map((sc) => {
      const sim = runDeterministicSimulation(sc.config);
      return {
        ...sc,
        kpis: sim.kpis,
        timeSeries: sim.timeSeries,
      };
    });
  }, [scenarios]);

  // Merge time series for overlay chart
  const mergedChartData = useMemo(() => {
    if (scenarioResults.length === 0) return [];
    const maxDays = Math.max(...scenarioResults.map((s) => s.timeSeries.length));
    const merged = [];

    for (let day = 0; day < maxDays; day++) {
      const row: any = { day: day + 1 };
      scenarioResults.forEach((sc) => {
        const pt = sc.timeSeries[day] || sc.timeSeries[sc.timeSeries.length - 1];
        row[`${sc.id}_active`] = pt?.totalActive || 0;
        row[`${sc.id}_deaths`] = pt?.D || 0;
      });
      merged.push(row);
    }
    return merged;
  }, [scenarioResults]);

  const baseline = scenarioResults[0];

  // Export comparison table to CSV
  const handleExportComparison = () => {
    const headers = ['scenario_name', 'peak_active', 'peak_day', 'total_infected', 'attack_rate_pct', 'total_deaths', 'deaths_prevented'];
    const rows = scenarioResults.map((sc) => [
      `"${sc.name}"`,
      sc.kpis.peakActive,
      sc.kpis.peakDay,
      sc.kpis.totalInfected,
      (sc.kpis.attackRate * 100).toFixed(2),
      sc.kpis.totalDeaths,
      baseline ? baseline.kpis.totalDeaths - sc.kpis.totalDeaths : 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viralab_scenario_comparison_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="scenario-comparison" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-purple-600" />
            <span>Policy Scenario Comparison Studio</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Evaluate counterfactual epidemiological interventions side-by-side to quantify infections prevented and mortality reduction.
          </p>
        </div>

        <button
          onClick={handleExportComparison}
          className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Comparison CSV</span>
        </button>
      </div>

      <DisclaimerBanner compact />

      {/* Overlay Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Infections Overlay */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Comparative Active Infection Waves
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Peak flattening and epidemic wave postponement across policies
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedChartData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any, name: any) => {
                    const sc = scenarioResults.find((s) => `${s.id}_active` === name);
                    return [Number(val).toLocaleString(), sc?.name || name];
                  }}
                  labelFormatter={(lbl) => `Day ${lbl}`}
                />
                <Legend
                  formatter={(val) => {
                    const sc = scenarioResults.find((s) => `${s.id}_active` === val);
                    return sc?.name || val;
                  }}
                  wrapperStyle={{ fontSize: '11px' }}
                />
                {scenarioResults.map((sc) => (
                  <Line
                    key={sc.id}
                    type="monotone"
                    dataKey={`${sc.id}_active`}
                    stroke={sc.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Deaths Overlay */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Comparative Cumulative Fatalities
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total cumulative death toll trajectories
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedChartData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any, name: any) => {
                    const sc = scenarioResults.find((s) => `${s.id}_deaths` === name);
                    return [Number(val).toLocaleString(), sc?.name || name];
                  }}
                  labelFormatter={(lbl) => `Day ${lbl}`}
                />
                <Legend
                  formatter={(val) => {
                    const sc = scenarioResults.find((s) => `${s.id}_deaths` === val);
                    return sc?.name || val;
                  }}
                  wrapperStyle={{ fontSize: '11px' }}
                />
                {scenarioResults.map((sc) => (
                  <Line
                    key={sc.id}
                    type="monotone"
                    dataKey={`${sc.id}_deaths`}
                    stroke={sc.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Side-by-Side KPI Table with Delta Averted Metrics */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Scenario Comparative Impact Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2.5 px-3 font-semibold">Scenario Policy</th>
                <th className="py-2.5 px-3 font-semibold">Peak Active</th>
                <th className="py-2.5 px-3 font-semibold">Peak Day</th>
                <th className="py-2.5 px-3 font-semibold">Total Infected</th>
                <th className="py-2.5 px-3 font-semibold">Attack Rate</th>
                <th className="py-2.5 px-3 font-semibold">Cumulative Deaths</th>
                <th className="py-2.5 px-3 font-semibold">Deaths Prevented</th>
                <th className="py-2.5 px-3 font-semibold">Peak Reduction %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {scenarioResults.map((sc) => {
                const isBase = sc.id === baseline?.id;
                const deathsPrevented = baseline ? baseline.kpis.totalDeaths - sc.kpis.totalDeaths : 0;
                const peakReduction = baseline
                  ? ((baseline.kpis.peakActive - sc.kpis.peakActive) / baseline.kpis.peakActive) * 100
                  : 0;

                return (
                  <tr key={sc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-sans">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sc.color }} />
                      <span>{sc.name}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">{sc.kpis.peakActive.toLocaleString()}</td>
                    <td className="py-3 px-3">Day {sc.kpis.peakDay}</td>
                    <td className="py-3 px-3 font-mono">{sc.kpis.totalInfected.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono">{(sc.kpis.attackRate * 100).toFixed(1)}%</td>
                    <td className="py-3 px-3 font-mono font-bold text-red-600 dark:text-red-400">
                      {sc.kpis.totalDeaths.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {isBase ? (
                        <span className="text-slate-400">Baseline</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          +{deathsPrevented.toLocaleString()} saved
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {isBase ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="text-purple-600 dark:text-purple-400 font-bold">
                          -{peakReduction.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
