import React from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SimulationConfig } from '../types/simulation';
import { scenarioPresets } from '../data/presets';
import { validateSimulationConfig } from '../engine/validation';

interface SimulationLabProps {
  config: SimulationConfig;
  onChangeConfig: (newConfig: SimulationConfig) => void;
  onRunSimulation: () => void;
  isSimulating: boolean;
  onLoadPreset: (presetId: string) => void;
  isLearningMode: boolean;
}

export const SimulationLab: React.FC<SimulationLabProps> = ({
  config,
  onChangeConfig,
  onRunSimulation,
  isSimulating,
  onLoadPreset,
  isLearningMode,
}) => {
  const validation = validateSimulationConfig(config);

  const updateConfig = (partial: Partial<SimulationConfig>) => {
    onChangeConfig({ ...config, ...partial });
  };

  return (
    <div id="simulation-lab" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-blue-600" />
            <span>Simulation Lab & ODE Solver Configuration</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure population scales, numerical integration solvers, duration, and stochastic ensemble properties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRunSimulation}
            disabled={isSimulating || !validation.valid}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Computing Numerical Solution...' : 'Execute Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Banner */}
      <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Calibrated Scenario Presets</span>
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Click to instantly load</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {scenarioPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onLoadPreset(preset.id)}
              className="p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all cursor-pointer group"
            >
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                {preset.badge}
              </span>
              <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                {preset.name}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Main Parameters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Population & Horizon */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            1. Population & Time Horizon
          </h3>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Total Population (N)</label>
              <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                {config.population.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={10000}
              max={10000000}
              step={10000}
              value={config.population}
              onChange={(e) => updateConfig({ population: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>10k</span>
              <span>1M</span>
              <span>10M</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Simulation Duration</label>
              <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                {config.durationDays} days
              </span>
            </div>
            <input
              type="range"
              min={14}
              max={730}
              step={7}
              value={config.durationDays}
              onChange={(e) => updateConfig({ durationDays: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>2 weeks</span>
              <span>180 days</span>
              <span>2 years</span>
            </div>
          </div>

          {isLearningMode && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>Closed Population:</strong> The base SEIRD model assumes a closed population without natural background births/deaths over short horizons, preserving total individual counts.
            </div>
          )}
        </div>

        {/* Column 2: Numerical Solver Settings */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
            <span>2. Integration Solver</span>
            <Cpu className="w-4 h-4 text-slate-400" />
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Numerical ODE Algorithm
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateConfig({ solver: 'rk4' })}
                className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all ${
                  config.solver === 'rk4'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                RK4 (Runge-Kutta 4)
              </button>
              <button
                type="button"
                onClick={() => updateConfig({ solver: 'rk45' })}
                className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all ${
                  config.solver === 'rk45'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Adaptive RK45
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Integration Step (dt)</label>
              <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                {config.timeStep} days
              </span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.5}
              step={0.05}
              value={config.timeStep}
              onChange={(e) => updateConfig({ timeStep: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>0.05 (High precision)</span>
              <span>0.2 (Balanced)</span>
              <span>0.5 (Fast)</span>
            </div>
          </div>

          {isLearningMode && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>RK4 Stability:</strong> Fixed time steps below 0.25 prevent stiff oscillatory behavior when incidence rises sharply.
            </div>
          )}
        </div>

        {/* Column 3: Mode (Deterministic vs Stochastic Ensemble) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            3. Stochasticity & Uncertainty
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Simulation Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateConfig({ mode: 'deterministic' })}
                className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all ${
                  config.mode === 'deterministic'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Deterministic
              </button>
              <button
                type="button"
                onClick={() => updateConfig({ mode: 'stochastic' })}
                className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all ${
                  config.mode === 'stochastic'
                    ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Stochastic Ensemble
              </button>
            </div>
          </div>

          {config.mode === 'stochastic' ? (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Ensemble Trajectory Runs</label>
                  <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">
                    {config.stochasticRuns} runs
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={config.stochasticRuns}
                  onChange={(e) => updateConfig({ stochasticRuns: Number(e.target.value) })}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reproducibility Random Seed
                </label>
                <input
                  type="number"
                  value={config.randomSeed || 42}
                  onChange={(e) => updateConfig({ randomSeed: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Deterministic mode solves the exact continuous ODE curves rapidly. Switch to Stochastic Ensemble to calculate 50% interquartile and 95% confidence bounds.
            </div>
          )}
        </div>
      </div>

      {/* Validation Checklist Card */}
      <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          {validation.valid ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>Mathematical Configuration Status: {validation.valid ? 'Valid & Ready' : 'Validation Errors Detected'}</span>
        </h3>

        {validation.errors.length > 0 && (
          <div className="space-y-1 mb-3">
            {validation.errors.map((err, i) => (
              <div key={i} className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div className="space-y-1">
            {validation.warnings.map((warn, i) => (
              <div key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}

        {validation.valid && validation.warnings.length === 0 && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            All mass-conservation constraints, initial population seeds, and time steps are within certified numerical stability parameters.
          </p>
        )}
      </section>
    </div>
  );
};
