import React, { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  Calculator,
  Dna,
  ShieldCheck,
  Cpu,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { DisclaimerBanner } from './DisclaimerBanner';

export const EducationalMode: React.FC = () => {
  const [calcBeta, setCalcBeta] = useState<number>(0.45);
  const [calcInfectiousDays, setCalcInfectiousDays] = useState<number>(7.0);
  const [calcMortalityRate, setCalcMortalityRate] = useState<number>(0.015);

  const gamma = 1 / Math.max(0.5, calcInfectiousDays);
  const mu = (calcMortalityRate * gamma) / Math.max(0.001, 1 - calcMortalityRate);
  const r0 = Number((calcBeta / (gamma + mu)).toFixed(2));
  const hit = r0 > 1 ? Number(((1 - 1 / r0) * 100).toFixed(1)) : 0;

  return (
    <div id="educational-mode" className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 min-w-0">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <span>Epidemiological Theory & Mathematical Foundations</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          A rigorous guide to compartmental differential systems, transmission parameters, reproduction numbers, and model limits.
        </p>
      </div>

      <DisclaimerBanner />

      {/* Interactive R0 & Herd Immunity Calculator */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Interactive R₀ & Herd Immunity Threshold (HIT) Calculator
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700 dark:text-slate-300">
              <span>Transmission Rate (β)</span>
              <span className="font-mono text-blue-600 font-bold">{calcBeta.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.5}
              step={0.05}
              value={calcBeta}
              onChange={(e) => setCalcBeta(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 mt-1">Contact rate × transmission probability</p>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700 dark:text-slate-300">
              <span>Infectious Duration (1/γ)</span>
              <span className="font-mono text-blue-600 font-bold">{calcInfectiousDays} days</span>
            </div>
            <input
              type="range"
              min={2}
              max={21}
              step={0.5}
              value={calcInfectiousDays}
              onChange={(e) => setCalcInfectiousDays(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 mt-1">γ = {(1 / calcInfectiousDays).toFixed(3)} / day</p>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700 dark:text-slate-300">
              <span>Case Fatality Rate (CFR)</span>
              <span className="font-mono text-blue-600 font-bold">{(calcMortalityRate * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={0.001}
              max={0.2}
              step={0.005}
              value={calcMortalityRate}
              onChange={(e) => setCalcMortalityRate(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 mt-1">μ = {mu.toFixed(4)} / day</p>
          </div>
        </div>

        {/* Calculated Results Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
          <div>
            <span className="text-xs text-blue-900 dark:text-blue-300 font-medium">Basic Reproduction Number (R₀)</span>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 font-mono mt-0.5">
              R₀ = {r0}
            </div>
            <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-1">
              Formula: <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">R₀ = β / (γ + μ)</code>
            </p>
          </div>

          <div>
            <span className="text-xs text-blue-900 dark:text-blue-300 font-medium">Herd Immunity Threshold (HIT)</span>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 font-mono mt-0.5">
              HIT = {hit}%
            </div>
            <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-1">
              Formula: <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">HIT = 1 - (1 / R₀)</code>
            </p>
          </div>
        </div>
      </div>

      {/* Compartmental ODE System */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Cpu className="w-5 h-5 text-purple-600" />
          <span>The Multi-Strain SEIRD Differential System</span>
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The population <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">N</code> is divided into continuous compartmental states. For multiple co-circulating viral strains <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">i ∈ &#123;1, ..., K&#125;</code>, the system evolves according to the coupled ordinary differential equations:
        </p>

        <div className="space-y-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="font-bold text-blue-600 dark:text-blue-400">dS/dt = - Σ [ βᵢ · (S / N) · Iᵢ · (1 - reduction) ] - ν(t)</span>
            <span className="font-sans text-[11px] text-slate-400">Susceptible Outflow (Infection + Vaccination)</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="font-bold text-amber-600 dark:text-amber-400">dEᵢ/dt = βᵢ · (S / N) · Iᵢ - σᵢ · Eᵢ</span>
            <span className="font-sans text-[11px] text-slate-400">Exposed Latency Compartment (Strain i)</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="font-bold text-rose-600 dark:text-rose-400">dIᵢ/dt = σᵢ · Eᵢ - (γᵢ + μᵢ) · Iᵢ</span>
            <span className="font-sans text-[11px] text-slate-400">Infectious Active Transmission (Strain i)</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">dRᵢ/dt = γᵢ · Iᵢ</span>
            <span className="font-sans text-[11px] text-slate-400">Recovered with Natural Immunity (Strain i)</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="font-bold text-red-600 dark:text-red-400">dDᵢ/dt = μᵢ · Iᵢ</span>
            <span className="font-sans text-[11px] text-slate-400">Cumulative Pathogen Fatalities (Strain i)</span>
          </div>
        </div>
      </div>

      {/* Model Assumptions & Limitations */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span>Scientific Assumptions & Boundary Conditions</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-white">1. Homogeneous Mixing</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Every susceptible individual has an identical probability of coming into contact with every infectious individual. Real-world populations exhibit spatial clustering, household structures, and network variance.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-white">2. Closed Population Scale</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Standard short-term outbreak horizons neglect demographic births and background natural mortality, maintaining total mass conservation <code className="font-mono">N = S + Σ(Eᵢ + Iᵢ + Rᵢ + Dᵢ)</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-white">3. Exponential Dwell Times</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Single-compartment transitions imply exponentially distributed latent and infectious durations. Real clinical latency follows gamma or log-normal distributions.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-white">4. Constant Parameters & Exogenous NPIs</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Transmission rates only change via scheduled policy interventions. Individuals do not autonomously alter their behaviors based on hospital burden reports without explicit user input.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
