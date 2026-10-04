import React from 'react';
import {
  ShieldCheck,
  Syringe,
  BedDouble,
  Calendar,
  Percent,
  Sliders,
  AlertTriangle,
  HelpCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { SimulationConfig, Intervention } from '../types/simulation';

interface InterventionLabProps {
  config: SimulationConfig;
  onChangeConfig: (newConfig: SimulationConfig) => void;
  isLearningMode: boolean;
}

export const InterventionLab: React.FC<InterventionLabProps> = ({
  config,
  onChangeConfig,
  isLearningMode,
}) => {
  const interventions = config.interventions;

  const updateIntervention = (id: string, partial: Partial<Intervention>) => {
    const updated = interventions.map((itv) => (itv.id === id ? { ...itv, ...partial } : itv));
    onChangeConfig({ ...config, interventions: updated });
  };

  const toggleIntervention = (id: string) => {
    const target = interventions.find((itv) => itv.id === id);
    if (!target) return;
    updateIntervention(id, { enabled: !target.enabled });
  };

  const updateVaccination = (partial: any) => {
    onChangeConfig({
      ...config,
      vaccination: { ...(config.vaccination || ({} as any)), ...partial },
    });
  };

  const updateHospitalization = (partial: any) => {
    onChangeConfig({
      ...config,
      hospitalization: { ...(config.hospitalization || ({} as any)), ...partial },
    });
  };

  return (
    <div id="intervention-lab" className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 min-w-0">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <span>Public Health Interventions & Clinical Capacity</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Model calendar-timed non-pharmaceutical interventions (NPIs), community vaccination rollouts, and hospital capacity stress.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Non-Pharmaceutical Interventions (NPIs) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Non-Pharmaceutical Interventions (NPIs)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Targeted transmission reductions effective over designated day windows
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {interventions.map((itv) => (
                <div
                  key={itv.id}
                  className={`p-4 rounded-xl border transition-all ${
                    itv.enabled
                      ? 'bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800/80 shadow-2xs'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={itv.enabled}
                        onChange={() => toggleIntervention(itv.id)}
                        className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        id={`toggle-${itv.id}`}
                      />
                      <label
                        htmlFor={`toggle-${itv.id}`}
                        className="font-bold text-sm text-slate-900 dark:text-white cursor-pointer"
                      >
                        {itv.name}
                      </label>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Day {itv.startDay} – Day {itv.endDay}
                    </span>
                  </div>

                  {itv.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-100 dark:border-emerald-900/40">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                          <span>Start Day</span>
                          <span className="font-bold">Day {itv.startDay}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={config.durationDays}
                          value={itv.startDay}
                          onChange={(e) => updateIntervention(itv.id, { startDay: Number(e.target.value) })}
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                          <span>End Day</span>
                          <span className="font-bold">Day {itv.endDay}</span>
                        </div>
                        <input
                          type="range"
                          min={itv.startDay + 1}
                          max={config.durationDays}
                          value={itv.endDay}
                          onChange={(e) => updateIntervention(itv.id, { endDay: Number(e.target.value) })}
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                          <span>Transmission Reduction</span>
                          <span className="font-bold text-emerald-600">
                            {(itv.transmissionReduction * itv.compliance * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.05}
                          max={0.9}
                          step={0.05}
                          value={itv.transmissionReduction}
                          onChange={(e) => updateIntervention(itv.id, { transmissionReduction: Number(e.target.value) })}
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isLearningMode && (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                <strong>Contact Reduction Dynamics:</strong> Interventions act as a multiplier <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">(1 - reduction × compliance)</code> directly on the force of infection, reducing the reproduction number without modifying intrinsic biological virulence.
              </div>
            )}
          </div>

          {/* Vaccination Campaign Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 flex items-center justify-center">
                  <Syringe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Mass Vaccination Campaign
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Proactive population immunization and vaccine-induced immunity
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.vaccination?.enabled || false}
                onChange={(e) => updateVaccination({ enabled: e.target.checked })}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
            </div>

            {config.vaccination?.enabled ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Rollout Start Day</span>
                    <span className="font-mono font-bold text-blue-600">Day {config.vaccination.startDay}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={config.durationDays - 10}
                    value={config.vaccination.startDay}
                    onChange={(e) => updateVaccination({ startDay: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Daily Vaccination Capacity</span>
                    <span className="font-mono font-bold text-blue-600">
                      {config.vaccination.dailyRate.toLocaleString()} doses/day
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={25000}
                    step={500}
                    value={config.vaccination.dailyRate}
                    onChange={(e) => updateVaccination({ dailyRate: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Vaccine Efficacy</span>
                    <span className="font-mono font-bold text-blue-600">
                      {(config.vaccination.efficacy * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={0.98}
                    step={0.02}
                    value={config.vaccination.efficacy}
                    onChange={(e) => updateVaccination({ efficacy: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Population Target Coverage</span>
                    <span className="font-mono font-bold text-blue-600">
                      {(config.vaccination.coverageTarget * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={0.95}
                    step={0.05}
                    value={config.vaccination.coverageTarget}
                    onChange={(e) => updateVaccination({ coverageTarget: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enable vaccination to model immunological protection depletion of susceptible individuals and quantify vaccine-prevented deaths.
              </p>
            )}
          </div>
        </div>

        {/* Column 2: Healthcare & ICU Capacity Module */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/70 text-rose-600 flex items-center justify-center">
                <BedDouble className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Clinical Healthcare Capacity
              </h3>
            </div>

            <input
              type="checkbox"
              checked={config.hospitalization?.enabled || false}
              onChange={(e) => updateHospitalization({ enabled: e.target.checked })}
              className="w-4 h-4 accent-rose-600 cursor-pointer"
            />
          </div>

          {config.hospitalization?.enabled ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Acute Hospital Beds</span>
                  <span className="font-mono font-bold text-rose-600">
                    {config.hospitalization.hospitalCapacity.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={10000}
                  step={100}
                  value={config.hospitalization.hospitalCapacity}
                  onChange={(e) => updateHospitalization({ hospitalCapacity: Number(e.target.value) })}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">ICU Bed Quota</span>
                  <span className="font-mono font-bold text-purple-600">
                    {config.hospitalization.icuCapacity.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={2000}
                  step={50}
                  value={config.hospitalization.icuCapacity}
                  onChange={(e) => updateHospitalization({ icuCapacity: Number(e.target.value) })}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Hospitalization Rate</span>
                  <span className="font-mono font-bold">
                    {(config.hospitalization.hospitalizationProb * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.01}
                  max={0.15}
                  step={0.005}
                  value={config.hospitalization.hospitalizationProb}
                  onChange={(e) => updateHospitalization({ hospitalizationProb: Number(e.target.value) })}
                  className="w-full accent-slate-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Overflow Mortality Multiplier</span>
                  <span className="font-mono font-bold text-rose-600">
                    {config.hospitalization.overflowMortalityMultiplier.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  value={config.hospitalization.overflowMortalityMultiplier}
                  onChange={(e) => updateHospitalization({ overflowMortalityMultiplier: Number(e.target.value) })}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-900 dark:text-rose-200">
                When patient census exceeds capacity, patient mortality increases by {((config.hospitalization.overflowMortalityMultiplier - 1) * 100).toFixed(0)}% due to resource strain.
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track clinical bed occupancy, ICU demand, and simulate excess deaths triggered by healthcare system saturation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
