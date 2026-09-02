import React from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  Activity,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { SimulationResults } from '../types/simulation';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: SimulationResults | null;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  results,
}) => {
  if (!isOpen || !results) return null;

  const { kpis, config, timeSeries } = results;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viralab_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
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
    a.download = `viralab_timeseries_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="export-report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="export-report-modal"
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Scientific Outbreak Summary Report
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 dark:text-slate-200 print:p-0 print:text-black">
          {/* Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  ViraLab Scientific Simulation Report
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Multi-Strain SEIRD Compartmental Outbreak Assessment
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Generated: {new Date().toLocaleDateString()}</div>
                <div>Solver: {config.solver.toUpperCase()} (dt={config.timeStep})</div>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              1. Executive Outbreak Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400">Total Population:</span>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {kpis.population.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400">Attack Rate:</span>
                <div className="font-bold text-sm text-amber-600">
                  {(kpis.attackRate * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400">Peak Infections:</span>
                <div className="font-bold text-sm text-rose-600">
                  {kpis.peakActive.toLocaleString()} (Day {kpis.peakDay})
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400">Total Mortality:</span>
                <div className="font-bold text-sm text-red-600">
                  {kpis.totalDeaths.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Variant Analysis */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              2. Variant Lineage Parameters
            </h2>
            <table className="w-full text-left text-xs border-collapse border border-slate-200 dark:border-slate-800">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="p-2 border border-slate-200 dark:border-slate-800">Strain</th>
                  <th className="p-2 border border-slate-200 dark:border-slate-800">β</th>
                  <th className="p-2 border border-slate-200 dark:border-slate-800">Latency (1/σ)</th>
                  <th className="p-2 border border-slate-200 dark:border-slate-800">Infectious (1/γ)</th>
                  <th className="p-2 border border-slate-200 dark:border-slate-800">CFR</th>
                  <th className="p-2 border border-slate-200 dark:border-slate-800">R₀</th>
                  <th className="p-2 border border-slate-200 dark:border-slate-800">Peak Cases</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {config.strains.map((s) => {
                  const summary = kpis.strainSummaries.find((sum) => sum.strainId === s.id);
                  return (
                    <tr key={s.id}>
                      <td className="p-2 font-bold border border-slate-200 dark:border-slate-800">{s.name}</td>
                      <td className="p-2 border border-slate-200 dark:border-slate-800">{s.beta.toFixed(2)}</td>
                      <td className="p-2 border border-slate-200 dark:border-slate-800">{s.incubationPeriod}d</td>
                      <td className="p-2 border border-slate-200 dark:border-slate-800">{s.infectiousPeriod}d</td>
                      <td className="p-2 border border-slate-200 dark:border-slate-800">{(s.mortalityRate * 100).toFixed(2)}%</td>
                      <td className="p-2 font-bold border border-slate-200 dark:border-slate-800">{summary?.R0 || '—'}</td>
                      <td className="p-2 border border-slate-200 dark:border-slate-800">{summary?.peakInfected.toLocaleString() || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section 3: Model Assumptions & Scientific Disclaimer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-xs">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Scientific Disclaimer & Modeling Scope</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              This report is generated by the ViraLab differential modeling engine. The projections represent mathematical solutions under standard homogeneous mixing, constant transmission unless modified by explicit NPIs, and closed population boundaries. The data presented must not be used for direct clinical decisions or individual diagnosis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
