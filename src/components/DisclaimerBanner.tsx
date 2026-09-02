import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';

export const DisclaimerBanner: React.FC<{ compact?: boolean }> = ({ compact }) => {
  if (compact) {
    return (
      <div
        id="scientific-disclaimer-compact"
        className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-1.5 flex items-center gap-2"
      >
        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span>
          <strong>Scientific Disclaimer:</strong> ViraLab is an educational and research mathematical modeling tool. Simulations are model-dependent assumptions and do not constitute clinical or official forecasts.
        </span>
      </div>
    );
  }

  return (
    <div
      id="scientific-disclaimer-banner"
      className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-xs"
    >
      <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div>
        <h4 className="font-semibold text-amber-950 dark:text-amber-100">Scientific & Epidemiological Disclaimer</h4>
        <p className="mt-1 leading-relaxed text-amber-800 dark:text-amber-300">
          This simulator is an educational and research-oriented mathematical modeling tool. Simulations are strictly dependent on input assumptions, homogeneous mixing formulations, and user-specified parameters. They should not be interpreted as medical advice, clinical predictions, or official public-health epidemiological forecasts. Always refer to certified public health authorities for real-world policy guidance.
        </p>
      </div>
    </div>
  );
};
