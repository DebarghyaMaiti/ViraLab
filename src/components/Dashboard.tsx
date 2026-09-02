import React, { useState } from 'react';
import {
  Users,
  AlertTriangle,
  HeartPulse,
  Skull,
  TrendingUp,
  Activity,
  Calendar,
  ShieldAlert,
  Percent,
  Syringe,
  BedDouble,
  Download,
  Eye,
  EyeOff,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { SimulationResults, SimulationTimePoint } from '../types/simulation';
import { DisclaimerBanner } from './DisclaimerBanner';

interface DashboardProps {
  results: SimulationResults | null;
  onNavigateToTab: (tab: any) => void;
  isLearningMode: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ results, onNavigateToTab, isLearningMode }) => {
  // Chart visibility toggles
  const [showS, setShowS] = useState(true);
  const [showE, setShowE] = useState(true);
  const [showI, setShowI] = useState(true);
  const [showR, setShowR] = useState(true);
  const [showD, setShowD] = useState(true);
  const [showV, setShowV] = useState(true);

  if (!results) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <Activity className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Simulation Executed</h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Configure parameters in the Simulation Lab or load a preset to generate epidemiological trajectories.
          </p>
          <button
            onClick={() => onNavigateToTab('simulation')}
            className="mt-6 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Open Simulation Lab
          </button>
        </div>
      </div>
    );
  }

  const { kpis, timeSeries, config, conservationCheck } = results;
  const isStochastic = config.mode === 'stochastic';

  // Export time-series data to CSV
  const handleExportCsv = () => {
    const headers = ['day', 'S', 'E', 'I', 'R', 'D', 'totalActive', 'newInfectionsDaily', 'effectiveR'];
    const rows = timeSeries.map((pt) => [
      pt.day,
      pt.S,
      pt.E,
      pt.I,
      pt.R,
      pt.D,
      pt.totalActive,
      pt.newInfectionsDaily,
      pt.effectiveR,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viralab_simulation_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="viralab-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Disclaimer */}
      <DisclaimerBanner compact />

      {/* Hospitalization Alert Banner if overloaded */}
      {config.hospitalization?.enabled && (kpis.hospitalOverloadDays || 0) > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200">
              Healthcare Capacity Exceeded ({kpis.hospitalOverloadDays} Days)
            </h4>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
              Acute hospital patient volume exceeded the modeled bed quota ({config.hospitalization.hospitalCapacity.toLocaleString()} beds). Under model assumptions, overflow mortality increased by {(config.hospitalization.overflowMortalityMultiplier * 100 - 100).toFixed(0)}%.
            </p>
          </div>
        </div>
      )}

      {/* Numerical Conservation Warning if discrepancy detected */}
      {!conservationCheck.passed && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Numerical Drift Notice:</strong> Population conservation variance is {conservationCheck.maxDiscrepancy.toLocaleString()} individuals (tolerance limit exceeded). Adjusting dt in Simulation Lab improves accuracy.
          </span>
        </div>
      )}

      {/* 1. Master KPI Cards Grid */}
      <section id="kpi-cards-grid">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: Total Population */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Population (N)</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {kpis.population.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>Naive S₀:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {timeSeries[0]?.S.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 2: Total Infected & Attack Rate */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Total Infected</span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
              {kpis.totalInfected.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>Attack Rate:</span>
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {(kpis.attackRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 3: Active Peak & Peak Day */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Peak Infections</span>
              <Calendar className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
              {kpis.peakActive.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>Peak Day:</span>
              <span className="font-semibold text-rose-700 dark:text-rose-300">
                Day {kpis.peakDay}
              </span>
            </div>
          </div>

          {/* Card 4: Total Deaths & Crude CFR */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Total Deaths (D)</span>
              <Skull className="w-4 h-4 text-red-500" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
              {kpis.totalDeaths.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>Crude CFR:</span>
              <span className="font-semibold text-red-700 dark:text-red-300">
                {(kpis.crudeMortalityRate * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Card 5: Basic R0 & Current Re */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Reproduction R₀ / Rₑ</span>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {kpis.basicR0}
              </span>
              <span className="text-xs text-slate-400">/</span>
              <span
                className={`text-base sm:text-lg font-bold flex items-center ${
                  kpis.currentRe > 1 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {kpis.currentRe}
                {kpis.currentRe > 1 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {kpis.currentRe > 1 ? (
                <span className="text-rose-600 dark:text-rose-400 font-medium">Expanding (Rₑ &gt; 1)</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Declining (Rₑ &lt; 1)</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Learning Mode Theory Card if Active */}
      {isLearningMode && (
        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 leading-relaxed space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-blue-950 dark:text-blue-100">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Mathematical Interpretation & Assumptions</span>
          </div>
          <p>
            • <strong>R₀ (Basic Reproduction Number):</strong> Calculated as <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">R₀ ≈ β / (γ + μ)</code>, representing expected secondary infections from a single primary case in a fully susceptible population.
          </p>
          <p>
            • <strong>Rₑ(t) (Effective Reproduction Number):</strong> Defined as <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">Rₑ(t) = R₀ × [S(t)/N] × (1 - intervention_reduction(t))</code>. Transmission contracts when Rₑ falls below 1.0 due to susceptible depletion or interventions.
          </p>
        </div>
      )}

      {/* 2. Interactive Charts Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Primary Outbreak Trajectories
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Numerical ODE solutions over {config.durationDays} days ({config.mode} mode)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Chart 1: SEIRD Compartments */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                SEIRD Compartments Overview
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Susceptible (S), Exposed (E), Infectious (I), Recovered (R), Deaths (D)
              </p>
            </div>

            {/* Line Visibility Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <button
                onClick={() => setShowS(!showS)}
                className={`px-2 py-1 rounded border transition-colors ${
                  showS ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800'
                }`}
              >
                S (Susceptible)
              </button>
              <button
                onClick={() => setShowE(!showE)}
                className={`px-2 py-1 rounded border transition-colors ${
                  showE ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800'
                }`}
              >
                E (Exposed)
              </button>
              <button
                onClick={() => setShowI(!showI)}
                className={`px-2 py-1 rounded border transition-colors ${
                  showI ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800'
                }`}
              >
                I (Infectious)
              </button>
              <button
                onClick={() => setShowR(!showR)}
                className={`px-2 py-1 rounded border transition-colors ${
                  showR ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800'
                }`}
              >
                R (Recovered)
              </button>
              <button
                onClick={() => setShowD(!showD)}
                className={`px-2 py-1 rounded border transition-colors ${
                  showD ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800'
                }`}
              >
                D (Deaths)
              </button>
              {config.vaccination?.enabled && (
                <button
                  onClick={() => setShowV(!showV)}
                  className={`px-2 py-1 rounded border transition-colors ${
                    showV ? 'bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800'
                  }`}
                >
                  V (Vaccinated)
                </button>
              )}
            </div>
          </div>

          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: 'Simulation Day', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [Number(value).toLocaleString(), '']}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                {showS && <Line type="monotone" dataKey="S" name="Susceptible (S)" stroke="#3b82f6" strokeWidth={2} dot={false} />}
                {showE && <Line type="monotone" dataKey="E" name="Exposed (E)" stroke="#f59e0b" strokeWidth={2} dot={false} />}
                {showI && <Line type="monotone" dataKey="I" name="Infectious (I)" stroke="#f43f5e" strokeWidth={2.5} dot={false} />}
                {showR && <Line type="monotone" dataKey="R" name="Recovered (R)" stroke="#10b981" strokeWidth={2} dot={false} />}
                {showD && <Line type="monotone" dataKey="D" name="Deaths (D)" stroke="#ef4444" strokeWidth={2} dot={false} />}
                {config.vaccination?.enabled && showV && (
                  <Line type="monotone" dataKey="V" name="Vaccinated (V)" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2-Column Grid: Active Infections & Daily Cases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 2: Active Infections with Stochastic Ribbons */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Active Infections Curve</span>
                  {isStochastic && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      95% CI Ribbon
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total simultaneously infectious individuals over time
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), 'Active Cases']}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  {isStochastic && (
                    <>
                      {/* 95% Confidence Interval Band */}
                      <Area type="monotone" dataKey="p95Active" stroke="none" fill="#f43f5e" fillOpacity={0.15} name="Upper 95% CI" />
                      <Area type="monotone" dataKey="p05Active" stroke="none" fill="#fff" fillOpacity={0.0} name="Lower 95% CI" />
                    </>
                  )}
                  <Area type="monotone" dataKey="totalActive" stroke="#f43f5e" strokeWidth={2.5} fill="#f43f5e" fillOpacity={0.25} name="Active Infections" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Daily New Infections */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="mb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Daily Incident Infections
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                New daily transmissions (inflow into Exposed/Infected)
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), 'New Cases']}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Area type="monotone" dataKey="newInfectionsDaily" stroke="#f59e0b" strokeWidth={2} fill="#f59e0b" fillOpacity={0.25} name="Daily Incidence" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Effective Reproduction Number Re(t) & Variant Competition */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 4: Re(t) Over Time */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="mb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Effective Reproduction Number Rₑ(t)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Threshold: Rₑ &gt; 1.0 (epidemic expansion), Rₑ &lt; 1.0 (containment/decline)
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [Number(val).toFixed(2), 'Rₑ']}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Rₑ = 1.0 Threshold', position: 'top', fill: '#ef4444', fontSize: 11 }} />
                  <Line type="monotone" dataKey="effectiveR" stroke="#6366f1" strokeWidth={2.5} dot={false} name="Effective Rₑ" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 5: Variant Competition / Prevalence Share */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Variant Competition & Prevalence (%)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Relative active case share of competing viral strains
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('variants')}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Configure Variants
              </button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timeSeries.map((pt) => {
                    const row: any = { day: pt.day };
                    Object.entries(pt.strainMetrics).forEach(([strainId, metric]) => {
                      row[strainId] = (metric as any).activeShare;
                    });
                    return row;
                  })}
                  margin={{ top: 10, right: 15, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any, name: any) => {
                      const strain = kpis.strainSummaries.find((s) => s.strainId === name);
                      return [`${Number(val).toFixed(1)}%`, strain?.name || name];
                    }}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Legend
                    formatter={(val) => {
                      const strain = kpis.strainSummaries.find((s) => s.strainId === val);
                      return strain?.name || val;
                    }}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                  {kpis.strainSummaries.map((strain) => (
                    <Area
                      key={strain.strainId}
                      type="monotone"
                      dataKey={strain.strainId}
                      stackId="1"
                      stroke={strain.color}
                      fill={strain.color}
                      fillOpacity={0.65}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Hospitalization Chart (if enabled) */}
        {config.hospitalization?.enabled && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Hospitalization & ICU Occupancy vs Capacity
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Acute beds ({config.hospitalization.hospitalCapacity.toLocaleString()}) and ICU beds ({config.hospitalization.icuCapacity.toLocaleString()})
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), '']}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <ReferenceLine
                    y={config.hospitalization.hospitalCapacity}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    label={{ value: 'Acute Bed Quota', position: 'top', fill: '#f43f5e', fontSize: 11 }}
                  />
                  <ReferenceLine
                    y={config.hospitalization.icuCapacity}
                    stroke="#8b5cf6"
                    strokeDasharray="4 4"
                    label={{ value: 'ICU Capacity', position: 'top', fill: '#8b5cf6', fontSize: 11 }}
                  />
                  <Line type="monotone" dataKey="H" stroke="#f43f5e" strokeWidth={2.5} dot={false} name="Hospitalized (H)" />
                  <Line type="monotone" dataKey="ICU" stroke="#8b5cf6" strokeWidth={2} dot={false} name="ICU Patients" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* 3. Strain Comparison Table */}
      <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
          Variant Comparison Summary
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Variant Name</th>
                <th className="py-2.5 px-3 font-semibold">R₀</th>
                <th className="py-2.5 px-3 font-semibold">Current Rₑ</th>
                <th className="py-2.5 px-3 font-semibold">Peak Cases</th>
                <th className="py-2.5 px-3 font-semibold">Peak Day</th>
                <th className="py-2.5 px-3 font-semibold">Cumulative Infected</th>
                <th className="py-2.5 px-3 font-semibold">Deaths</th>
                <th className="py-2.5 px-3 font-semibold">Time to Dominance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {kpis.strainSummaries.map((strain) => (
                <tr key={strain.strainId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: strain.color }} />
                    <span>{strain.name}</span>
                  </td>
                  <td className="py-2.5 px-3 font-medium">{strain.R0}</td>
                  <td className="py-2.5 px-3 font-medium">
                    <span className={strain.currentRe > 1 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                      {strain.currentRe}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{strain.peakInfected.toLocaleString()}</td>
                  <td className="py-2.5 px-3">Day {strain.peakDay}</td>
                  <td className="py-2.5 px-3">{strain.totalInfected.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-red-600 dark:text-red-400 font-medium">
                    {strain.totalDeaths.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    {strain.timeToDominance ? (
                      <span className="text-purple-600 dark:text-purple-400 font-semibold">
                        Day {strain.timeToDominance} (&gt;50%)
                      </span>
                    ) : (
                      <span className="text-slate-400">Never</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
