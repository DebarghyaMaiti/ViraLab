import React, { useState } from 'react';
import {
  Clock,
  History,
  Activity,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sliders,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  Download,
  Trash2,
  Filter,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Syringe,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SimulationConfig,
  SimulationEventLogEntry,
  StateTransitionEvent,
} from '../types/simulation';
import { exportEventLogsAsJson, exportEventLogsAsCsv } from '../engine/eventLogger';

interface EventLoggingPanelProps {
  eventLogs: SimulationEventLogEntry[];
  selectedLogId: string | null;
  onSelectLog: (logId: string) => void;
  onReviewInFitting: (logId: string) => void;
  onRestoreConfig: (config: SimulationConfig) => void;
  onDeleteLog: (logId: string) => void;
  onClearLogs: () => void;
}

export const EventLoggingPanel: React.FC<EventLoggingPanelProps> = ({
  eventLogs,
  selectedLogId,
  onSelectLog,
  onReviewInFitting,
  onRestoreConfig,
  onDeleteLog,
  onClearLogs,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const activeLog =
    eventLogs.find((l) => l.id === selectedLogId) || eventLogs[0] || null;

  const handleCopy = (log: SimulationEventLogEntry) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getSeverityBadge = (severity: StateTransitionEvent['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'warning':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'normal':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  const getTransitionIcon = (type: StateTransitionEvent['type']) => {
    switch (type) {
      case 'capacity_breach':
      case 'icu_capacity_breach':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'capacity_restored':
      case 'icu_capacity_restored':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 're_inflection_subcritical':
        return <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 're_inflection_supercritical':
        return <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'peak_incidence':
      case 'peak_daily_infections':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'vaccination_launch':
      case 'vaccination_milestone':
        return <Syringe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
      case 'variant_emergence':
      case 'variant_dominance':
        return <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />;
    }
  };

  const filteredTransitions = (activeLog?.transitions || []).filter((t) => {
    const matchesCategory =
      selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `day ${t.day}`.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section
      id="simulation-event-logger"
      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Simulation Event Log & State Transitions
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {eventLogs.length} {eventLogs.length === 1 ? 'Run Logged' : 'Runs Logged'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Captures timestamped simulation parameters, numerical solver states, and critical epidemiological transitions for calibration and review during model fitting.
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {eventLogs.length > 0 && (
            <>
              <button
                onClick={() => exportEventLogsAsJson(eventLogs)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Export logs as JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
              <button
                onClick={() => exportEventLogsAsCsv(eventLogs)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Export transitions as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Clear all logged simulation event history?')) {
                    onClearLogs();
                  }
                }}
                className="p-1.5 text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                title="Clear all logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {eventLogs.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <Clock className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                No Simulation Runs Logged Yet
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Execute a simulation to automatically record timestamped parameters, solver settings, and significant epidemiological state transitions.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Run Selector Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {eventLogs.map((log) => {
                  const isSelected = activeLog?.id === log.id;
                  const dateObj = new Date(log.timestamp);
                  const timeStr = dateObj.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <button
                      key={log.id}
                      onClick={() => onSelectLog(log.id)}
                      className={`px-3.5 py-2 rounded-xl text-left transition-all shrink-0 cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-500 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSelected ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[150px]">
                          {log.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{timeStr}</span>
                        <span>•</span>
                        <span>{log.transitions.length} events</span>
                        <span>•</span>
                        <span>R₀ {log.parametersSummary.primaryR0}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeLog && (
                <div className="space-y-5">
                  {/* Selected Run Action Bar */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {activeLog.label}
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {activeLog.solver} ({activeLog.mode})
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(activeLog.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Peak: Day {activeLog.outcomesSummary.peakDay} ({activeLog.outcomesSummary.peakActive.toLocaleString()} cases) • Attack Rate: {activeLog.outcomesSummary.attackRate}% • Deaths: {activeLog.outcomesSummary.totalDeaths.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => onReviewInFitting(activeLog.id)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Review in Model Fitting</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onRestoreConfig(activeLog.config)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Restore this parameter set into active simulation"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Config</span>
                      </button>

                      <button
                        onClick={() => handleCopy(activeLog)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Copy parameter JSON to clipboard"
                      >
                        {copiedId === activeLog.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onDeleteLog(activeLog.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Delete this run log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Parameter Snapshot Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Transmission (β)
                      </span>
                      <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                        {activeLog.parametersSummary.primaryBeta}
                      </div>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400">
                        R₀ = {activeLog.parametersSummary.primaryR0}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Recovery (γ)
                      </span>
                      <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                        {activeLog.parametersSummary.primaryGamma}/d
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {(1 / activeLog.parametersSummary.primaryGamma).toFixed(1)}d infectious
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Incubation (σ)
                      </span>
                      <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                        {activeLog.parametersSummary.primarySigma}/d
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {(1 / activeLog.parametersSummary.primarySigma).toFixed(1)}d latent
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Mortality (μ)
                      </span>
                      <div className="text-base font-bold font-mono text-red-600 dark:text-red-400 mt-0.5">
                        {activeLog.parametersSummary.primaryMu}/d
                      </div>
                      <span className="text-[10px] text-slate-400">virulence rate</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Host Population
                      </span>
                      <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                        {activeLog.parametersSummary.population.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {activeLog.parametersSummary.horizonDays}d horizon
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Policies & Vax
                      </span>
                      <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {activeLog.parametersSummary.activeInterventionsCount} NPIs
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        {activeLog.parametersSummary.vaccinationEnabled ? 'Vax Active' : 'No Vax'}
                      </span>
                    </div>
                  </div>

                  {/* Significant State Transitions Timeline */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Detected State Transitions ({filteredTransitions.length} of {activeLog.transitions.length})
                        </h5>
                      </div>

                      {/* Filter pills & search */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-7 pr-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg border border-transparent focus:border-blue-500 outline-hidden w-36 sm:w-44 text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
                          {[
                            { id: 'all', label: 'All' },
                            { id: 'epidemic', label: 'Epidemic' },
                            { id: 'healthcare', label: 'Healthcare' },
                            { id: 'intervention', label: 'Policies' },
                            { id: 'variant', label: 'Variants' },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                                selectedCategory === cat.id
                                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-semibold shadow-2xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {filteredTransitions.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                        No transitions match the filter criteria.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        {filteredTransitions.map((t) => (
                          <div
                            key={t.id}
                            className="p-3 sm:p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 p-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                {getTransitionIcon(t.type)}
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    Day {t.day}
                                  </span>
                                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                    {t.title}
                                  </span>
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${getSeverityBadge(
                                      t.severity
                                    )}`}
                                  >
                                    {t.category}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
                                  {t.description}
                                </p>
                              </div>
                            </div>

                            {t.metricValue !== undefined && (
                              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md shrink-0">
                                {t.metricValue}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};
