import React, { useState } from 'react';
import {
  Dna,
  Plus,
  Trash2,
  Sliders,
  TrendingUp,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Flame,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { SimulationConfig, Strain } from '../types/simulation';

interface VariantLabProps {
  config: SimulationConfig;
  onChangeConfig: (newConfig: SimulationConfig) => void;
  isLearningMode: boolean;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#ec4899', // pink
  '#f97316', // orange
  '#8b5cf6', // purple
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#ef4444', // red
];

export const VariantLab: React.FC<VariantLabProps> = ({ config, onChangeConfig, isLearningMode }) => {
  const [selectedStrainId, setSelectedStrainId] = useState<string>(config.strains[0]?.id || '');

  const strains = config.strains;
  const currentStrain = strains.find((s) => s.id === selectedStrainId) || strains[0];

  const updateCurrentStrain = (partial: Partial<Strain>) => {
    if (!currentStrain) return;
    const updated = strains.map((s) => (s.id === currentStrain.id ? { ...s, ...partial } : s));
    onChangeConfig({ ...config, strains: updated });
  };

  const handleAddStrain = () => {
    const idx = strains.length + 1;
    const color = PRESET_COLORS[(strains.length) % PRESET_COLORS.length];
    const newStrain: Strain = {
      id: `strain-${Date.now()}`,
      name: `Variant ${String.fromCharCode(64 + idx)}`,
      color,
      beta: 0.55,
      incubationPeriod: 4.5,
      infectiousPeriod: 6.5,
      mortalityRate: 0.02,
      initialExposed: 10,
      initialInfected: 5,
      initialRecovered: 0,
      initialDeaths: 0,
      immuneEscape: 0.25,
      relativeFitness: 1.25,
    };
    const updated = [...strains, newStrain];
    onChangeConfig({ ...config, strains: updated });
    setSelectedStrainId(newStrain.id);
  };

  const handleDeleteStrain = (id: string) => {
    if (strains.length <= 1) return;
    const updated = strains.filter((s) => s.id !== id);
    onChangeConfig({ ...config, strains: updated });
    setSelectedStrainId(updated[0].id);
  };

  // Compute live basic reproduction number R0 = beta / (gamma + mu)
  const calcR0 = (s: Strain) => {
    const gamma = 1 / Math.max(0.5, s.infectiousPeriod);
    const mu = (s.mortalityRate * gamma) / Math.max(0.001, 1 - s.mortalityRate);
    return Number((s.beta / (gamma + mu)).toFixed(2));
  };

  return (
    <div id="variant-lab" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Dna className="w-6 h-6 text-purple-600" />
            <span>Variant Lab & Evolutionary Dynamics</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Model multi-strain competition, viral fitness advantages, immune escape, and de-novo variant emergence.
          </p>
        </div>

        <button
          onClick={handleAddStrain}
          className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Variant</span>
        </button>
      </div>

      {/* Variant Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {strains.map((s) => {
          const isSelected = s.id === currentStrain?.id;
          const r0 = calcR0(s);
          return (
            <button
              key={s.id}
              onClick={() => setSelectedStrainId(s.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-purple-500 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span>{s.name}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                R₀={r0}
              </span>
            </button>
          );
        })}
      </div>

      {currentStrain && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Strain Parameter Editor */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={currentStrain.color}
                  onChange={(e) => updateCurrentStrain({ color: e.target.value })}
                  className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                  title="Change strain color"
                />
                <div>
                  <input
                    type="text"
                    value={currentStrain.name}
                    onChange={(e) => updateCurrentStrain({ name: e.target.value })}
                    className="font-bold text-base text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none"
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Active Strain ID: <span className="font-mono">{currentStrain.id}</span>
                  </div>
                </div>
              </div>

              {strains.length > 1 && (
                <button
                  onClick={() => handleDeleteStrain(currentStrain.id)}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Variant</span>
                </button>
              )}
            </div>

            {/* Slider Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Transmission rate beta */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Transmission Coefficient (β)
                  </label>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                    {currentStrain.beta.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1.5}
                  step={0.01}
                  value={currentStrain.beta}
                  onChange={(e) => updateCurrentStrain({ beta: Number(e.target.value) })}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Higher β accelerates contact infection probability</p>
              </div>

              {/* Incubation Period */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Incubation Period (1/σ)
                  </label>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                    {currentStrain.incubationPeriod} days
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={14}
                  step={0.5}
                  value={currentStrain.incubationPeriod}
                  onChange={(e) => updateCurrentStrain({ incubationPeriod: Number(e.target.value) })}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Average latent duration before becoming infectious</p>
              </div>

              {/* Infectious Period */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Infectious Period (1/γ)
                  </label>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                    {currentStrain.infectiousPeriod} days
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={21}
                  step={0.5}
                  value={currentStrain.infectiousPeriod}
                  onChange={(e) => updateCurrentStrain({ infectiousPeriod: Number(e.target.value) })}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Mean window of viral shedding and potential transmission</p>
              </div>

              {/* Mortality Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Case Fatality Rate (CFR)
                  </label>
                  <span className="font-mono font-bold text-red-600 dark:text-red-400">
                    {(currentStrain.mortalityRate * 100).toFixed(2)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.001}
                  max={0.25}
                  step={0.002}
                  value={currentStrain.mortalityRate}
                  onChange={(e) => updateCurrentStrain({ mortalityRate: Number(e.target.value) })}
                  className="w-full accent-red-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Probability of fatal outcome from disease</p>
              </div>

              {/* Immune Escape */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Immune Escape (Prior Immunity Evasion)
                  </label>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {(currentStrain.immuneEscape * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.8}
                  step={0.05}
                  value={currentStrain.immuneEscape}
                  onChange={(e) => updateCurrentStrain({ immuneEscape: Number(e.target.value) })}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Cross-immunity evasion against previously recovered individuals</p>
              </div>

              {/* Relative Fitness */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Relative Fitness Multiplier
                  </label>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                    {currentStrain.relativeFitness.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.05}
                  value={currentStrain.relativeFitness}
                  onChange={(e) => updateCurrentStrain({ relativeFitness: Number(e.target.value) })}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Competitive transmission multiplier relative to baseline</p>
              </div>
            </div>

            {/* Initial Inoculum Seeds */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3">
                Initial Inoculum (Day 0)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Initial Exposed (E₀)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={currentStrain.initialExposed}
                    onChange={(e) => updateCurrentStrain({ initialExposed: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Initial Infectious (I₀)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={currentStrain.initialInfected}
                    onChange={(e) => updateCurrentStrain({ initialInfected: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel: Strain Metric Breakdown & De-Novo Mutation Model */}
          <div className="space-y-6">
            {/* Strain Summary Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Epidemiological Profile
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Basic Reproduction R₀</span>
                  <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                    {calcR0(currentStrain)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Recovery Rate (γ)</span>
                  <span className="font-mono font-medium">
                    {(1 / currentStrain.infectiousPeriod).toFixed(3)} / day
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Incubation Rate (σ)</span>
                  <span className="font-mono font-medium">
                    {(1 / currentStrain.incubationPeriod).toFixed(3)} / day
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Disease-induced Mortality (μ)</span>
                  <span className="font-mono font-medium text-red-600 dark:text-red-400">
                    {((currentStrain.mortalityRate / (1 - currentStrain.mortalityRate)) * (1 / currentStrain.infectiousPeriod)).toFixed(4)} / day
                  </span>
                </div>
              </div>

              {isLearningMode && (
                <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl text-[11px] text-purple-900 dark:text-purple-200 leading-relaxed">
                  <strong>Variant Sweep:</strong> In multi-strain systems, variants with higher fitness R₀ and immune escape gradually outcompete wildtype strains as susceptible pools deplete.
                </div>
              )}
            </div>

            {/* De-Novo Variant Emergence Model */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>Variant Emergence Event</span>
                </h3>
                <input
                  type="checkbox"
                  checked={config.mutation?.enabled || false}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      mutation: {
                        ...(config.mutation || {
                          parentStrainId: currentStrain.id,
                          childStrainName: 'Variant Delta',
                          childColor: '#ef4444',
                          emergenceDay: 40,
                          initialInoculum: 10,
                          deltaBetaPercent: 40,
                          deltaMortalityPercent: 0,
                          deltaIncubationDays: -1,
                          immuneEscape: 0.35,
                        }),
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 accent-orange-500 cursor-pointer"
                />
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Simulate mid-outbreak genetic mutation generating a fitter lineage on a designated calendar day.
              </p>

              {config.mutation?.enabled && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Emergence Day: <span className="text-orange-500 font-bold">Day {config.mutation.emergenceDay}</span>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={config.durationDays - 10}
                      step={5}
                      value={config.mutation.emergenceDay}
                      onChange={(e) =>
                        onChangeConfig({
                          ...config,
                          mutation: { ...config.mutation!, emergenceDay: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Transmission Advantage: <span className="text-orange-500 font-bold">+{config.mutation.deltaBetaPercent}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={config.mutation.deltaBetaPercent}
                      onChange={(e) =>
                        onChangeConfig({
                          ...config,
                          mutation: { ...config.mutation!, deltaBetaPercent: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
