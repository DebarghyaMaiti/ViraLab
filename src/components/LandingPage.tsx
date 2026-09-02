import React from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Dna,
  ShieldCheck,
  Database,
  GitCompare,
  FlaskConical,
  HelpCircle,
  Play,
  UploadCloud,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
} from 'lucide-react';
import { DisclaimerBanner } from './DisclaimerBanner';
import { ActiveTab } from './Navbar';

interface LandingPageProps {
  onNavigate: (tab: ActiveTab) => void;
  onLoadPreset: (presetId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onLoadPreset }) => {
  return (
    <div id="viralab-landing-page" className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50 via-blue-50/20 to-white dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-6">
            <Activity className="w-3.5 h-3.5 animate-spin" />
            <span>Interactive Viral Transmission, Evolution & Outbreak Simulation Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight max-w-4xl mx-auto">
            ViraLab
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-blue-700 dark:text-blue-400 font-medium">
            Explore viral transmission, variant competition and outbreak dynamics.
          </p>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            A rigorous computational epidemiology platform powered by high-precision Runge-Kutta numerical solvers, multi-strain SEIRD differential equations, automated empirical dataset ingestion, and parameter estimation.
          </p>

          {/* Action CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              id="hero-start-sim-btn"
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-all flex items-center gap-2 group cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              <span>Start Simulation</span>
            </button>

            <button
              id="hero-upload-data-btn"
              onClick={() => onNavigate('datacenter')}
              className="px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-blue-500" />
              <span>Upload Data</span>
            </button>

            <button
              id="hero-explore-demo-btn"
              onClick={() => {
                onLoadPreset('competing-variants');
                onNavigate('dashboard');
              }}
              className="px-6 py-3 text-sm font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/60 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Explore Competing Variants Demo</span>
            </button>
          </div>

          <div className="mt-8 max-w-3xl mx-auto">
            <DisclaimerBanner compact />
          </div>
        </div>
      </section>

      {/* Preset Showcase */}
      <section className="py-12 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>Ready-to-Simulate Epidemiological Presets</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Scientifically calibrated scenarios ready for instant numerical exploration
              </p>
            </div>
            <button
              onClick={() => onNavigate('simulation')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Custom Simulation Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  Dual Strain
                </span>
                <span className="text-xs text-slate-400">R₀ = 2.4 vs 3.8</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Variant Competition (Alpha vs Delta)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Observe selective sweep as a high-fitness variant with 45% transmission advantage overtakes the naive baseline.
              </p>
              <button
                onClick={() => {
                  onLoadPreset('competing-variants');
                  onNavigate('dashboard');
                }}
                className="mt-3 w-full py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Load Scenario</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-colors shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Vaccination
                </span>
                <span className="text-xs text-slate-400">88% Efficacy</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Proactive Vaccination Rollout</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                6,000 doses/day campaign initiating Day 20, demonstrating community herd-immunity threshold deceleration.
              </p>
              <button
                onClick={() => {
                  onLoadPreset('vaccine-mitigation');
                  onNavigate('dashboard');
                }}
                className="mt-3 w-full py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Load Scenario</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 transition-colors shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                  Clinical Stress
                </span>
                <span className="text-xs text-slate-400">Overload Penalty</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Healthcare Capacity Overflow</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Infection surge breaches ICU and acute bed quotas, triggering dynamic overflow mortality multipliers.
              </p>
              <button
                onClick={() => {
                  onLoadPreset('healthcare-overload');
                  onNavigate('dashboard');
                }}
                className="mt-3 w-full py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/60 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Load Scenario</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture & Modules Grid */}
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Core Scientific Modules
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Built upon formal compartmental epidemiology with zero mock data and verified mass-conservation equations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Multi-Strain SEIRD ODE Engine
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Runge-Kutta 4th order (RK4) and adaptive Dormand-Prince (RK45) integration solvers tracking shared susceptible pool (S) and strain-specific Eᵢ, Iᵢ, Rᵢ, Dᵢ compartments with strict conservation guarantees.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 flex items-center justify-center mb-4">
                <Dna className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Variant Lab & Mutation Models
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Design custom variants with unique incubation periods, infectious durations, transmission rates β, immune escape coefficients, and relative viral fitness. Simulate lineage sweeps and emergence.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Interventions & Vaccination
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Schedule calendar-based NPIs (masks, contact reduction, targeted lockdowns) alongside progressive vaccination campaigns with waning immunity and strain-specific vaccine escape.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 flex items-center justify-center mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Data Center & Quality Engine
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Drag-and-drop CSV, TSV, JSON file ingestion. Intelligent fuzzy column matching with confidence scores, anomaly detection (negative counts, non-monotonic deaths), and immutable data provenance.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Optimization & Parameter Fitting
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Nelder-Mead simplex nonlinear least-squares estimation of β, γ, μ, and σ directly from observed time-series data. Computes MAE, RMSE, MAPE, R², and residual diagnostics.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 flex items-center justify-center mb-4">
                <GitCompare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Counterfactual What-If & Scenarios
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Compare multiple policy scenarios side-by-side: evaluate infections prevented, peak delay days, and deaths averted relative to the unmitigated baseline scenario.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive Disclaimer Card */}
      <section className="py-10 bg-slate-100/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <DisclaimerBanner />
        </div>
      </section>
    </div>
  );
};
