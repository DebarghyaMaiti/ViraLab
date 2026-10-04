import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  Play,
  ArrowRight,
  Sparkles,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Skull,
  Activity,
  Layers,
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
import { DisclaimerBanner } from './DisclaimerBanner';

interface WhatIfLabProps {
  baseConfig: SimulationConfig;
  isLearningMode: boolean;
}

export const WhatIfLab: React.FC<WhatIfLabProps> = ({ baseConfig, isLearningMode }) => {
  const [selectedExperiment, setSelectedExperiment] = useState<string>('beta-plus-25');
  const [customDeltaBeta, setCustomDeltaBeta] = useState<number>(25);
  const [customEarlyDays, setCustomEarlyDays] = useState<number>(14);

  // Define experiments
  const whatIfConfig: SimulationConfig = useMemo(() => {
    const clone: SimulationConfig = JSON.parse(JSON.stringify(baseConfig));

    if (selectedExperiment === 'beta-plus-25') {
      clone.strains = clone.strains.map((s) => ({ ...s, beta: s.beta * 1.25 }));
    } else if (selectedExperiment === 'beta-minus-25') {
      clone.strains = clone.strains.map((s) => ({ ...s, beta: s.beta * 0.75 }));
    } else if (selectedExperiment === 'early-interventions') {
      clone.interventions = clone.interventions.map((itv) => ({
        ...itv,
        enabled: true,
        startDay: Math.max(5, itv.startDay - customEarlyDays),
      }));
    } else if (selectedExperiment === 'double-vaccination') {
      clone.vaccination = {
        ...clone.vaccination,
        enabled: true,
        dailyRate: clone.vaccination.dailyRate * 2,
        startDay: Math.max(10, clone.vaccination.startDay - 10),
      };
    } else if (selectedExperiment === 'escape-mutant') {
      clone.mutation = {
        enabled: true,
        parentStrainId: clone.strains[0]?.id || 'strain-wildtype',
        childStrainName: 'Escape Variant',
        childColor: '#ec4899',
        emergenceDay: 30,
        initialInoculum: 20,
        deltaBetaPercent: 35,
        deltaMortalityPercent: 0,
        deltaIncubationDays: -1,
        immuneEscape: 0.45,
      };
    } else if (selectedExperiment === 'halve-mortality') {
      clone.strains = clone.strains.map((s) => ({ ...s, mortalityRate: s.mortalityRate * 0.5 }));
    }

    return clone;
  }, [baseConfig, selectedExperiment, customEarlyDays]);

  const baseResult = useMemo(() => runDeterministicSimulation(baseConfig), [baseConfig]);
  const whatIfResult = useMemo(() => runDeterministicSimulation(whatIfConfig), [whatIfConfig]);

  // Combined chart time-series
  const chartData = useMemo(() => {
    const maxDays = Math.max(baseResult.timeSeries.length, whatIfResult.timeSeries.length);
    const data = [];
    for (let d = 0; d < maxDays; d++) {
      const basePt = baseResult.timeSeries[d] || baseResult.timeSeries[baseResult.timeSeries.length - 1];
      const whatIfPt = whatIfResult.timeSeries[d] || whatIfResult.timeSeries[whatIfResult.timeSeries.length - 1];
      data.push({
        day: d + 1,
        baseActive: basePt?.totalActive || 0,
        whatIfActive: whatIfPt?.totalActive || 0,
        baseDeaths: basePt?.D || 0,
        whatIfDeaths: whatIfPt?.D || 0,
      });
    }
    return data;
  }, [baseResult, whatIfResult]);

  // Delta calculations
  const deltaPeak = whatIfResult.kpis.peakActive - baseResult.kpis.peakActive;
  const deltaPeakDay = whatIfResult.kpis.peakDay - baseResult.kpis.peakDay;
  const deltaTotal = whatIfResult.kpis.totalInfected - baseResult.kpis.totalInfected;
  const deltaDeaths = whatIfResult.kpis.totalDeaths - baseResult.kpis.totalDeaths;

  return (
    <div id="whatif-lab" className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 min-w-0">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-indigo-600" />
          <span>Counterfactual What-If Experimentation Lab</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore sensitivity and policy alternatives by asking hypothetical questions against the baseline model.
        </p>
      </div>

      <DisclaimerBanner compact />

      {/* Preset What-If Questions */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Select a Counterfactual Hypothesis</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedExperiment('beta-plus-25')}
            className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
              selectedExperiment === 'beta-plus-25'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-bold shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="font-bold mb-1">What if transmission (β) was 25% higher?</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Simulates enhanced airborne contagion or lack of precautions</div>
          </button>

          <button
            onClick={() => setSelectedExperiment('early-interventions')}
            className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
              selectedExperiment === 'early-interventions'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-bold shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="font-bold mb-1">What if interventions started 14 days earlier?</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Tests preemptive non-pharmaceutical containment</div>
          </button>

          <button
            onClick={() => setSelectedExperiment('double-vaccination')}
            className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
              selectedExperiment === 'double-vaccination'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-bold shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="font-bold mb-1">What if vaccine rollout pace was doubled?</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Tests impact of surged logistical immunization bandwidth</div>
          </button>

          <button
            onClick={() => setSelectedExperiment('escape-mutant')}
            className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
              selectedExperiment === 'escape-mutant'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-bold shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="font-bold mb-1">What if a 45% immune-escape variant emerges?</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Emerges on Day 30 and reinfects recovered individuals</div>
          </button>

          <button
            onClick={() => setSelectedExperiment('beta-minus-25')}
            className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
              selectedExperiment === 'beta-minus-25'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-bold shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="font-bold mb-1">What if transmission (β) was 25% lower?</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Natural seasonality or baseline behavioral caution</div>
          </button>

          <button
            onClick={() => setSelectedExperiment('halve-mortality')}
            className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
              selectedExperiment === 'halve-mortality'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-bold shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="font-bold mb-1">What if clinical therapeutics cut CFR by 50%?</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Tests antiviral efficacy reducing mortality rate</div>
          </button>
        </div>
      </div>

      {/* Delta KPI Impact Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500">Delta Peak Infections</span>
          <div className={`text-xl sm:text-2xl font-bold mt-1 ${deltaPeak >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {deltaPeak >= 0 ? `+${deltaPeak.toLocaleString()}` : deltaPeak.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">
            {baseResult.kpis.peakActive.toLocaleString()} → {whatIfResult.kpis.peakActive.toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500">Shift in Peak Day</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {deltaPeakDay > 0 ? `+${deltaPeakDay} days delayed` : deltaPeakDay < 0 ? `${deltaPeakDay} days earlier` : 'No shift'}
          </div>
          <span className="text-[10px] text-slate-400">
            Day {baseResult.kpis.peakDay} → Day {whatIfResult.kpis.peakDay}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500">Delta Cumulative Infections</span>
          <div className={`text-xl sm:text-2xl font-bold mt-1 ${deltaTotal >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {deltaTotal >= 0 ? `+${deltaTotal.toLocaleString()}` : deltaTotal.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">
            Attack: {(baseResult.kpis.attackRate * 100).toFixed(1)}% → {(whatIfResult.kpis.attackRate * 100).toFixed(1)}%
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500">Delta Cumulative Deaths</span>
          <div className={`text-xl sm:text-2xl font-bold mt-1 ${deltaDeaths >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {deltaDeaths >= 0 ? `+${deltaDeaths.toLocaleString()}` : deltaDeaths.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">
            {baseResult.kpis.totalDeaths.toLocaleString()} → {whatIfResult.kpis.totalDeaths.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Chart: Baseline vs What-If Comparison */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Active Infection Trajectory: Baseline (Blue) vs Counterfactual What-If (Indigo)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visualizing epidemic curve displacement and suppression efficacy
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                formatter={(val: any, name: any) => [
                  Number(val).toLocaleString(),
                  name === 'baseActive' ? 'Baseline Active' : 'What-If Active',
                ]}
                labelFormatter={(lbl) => `Day ${lbl}`}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="baseActive" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Baseline Model" />
              <Line type="monotone" dataKey="whatIfActive" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="5 5" dot={false} name="Counterfactual What-If" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
