import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { SimulationLab } from './components/SimulationLab';
import { VariantLab } from './components/VariantLab';
import { InterventionLab } from './components/InterventionLab';
import { DataCenter } from './components/DataCenter';
import { ModelFitting } from './components/ModelFitting';
import { ScenarioComparison } from './components/ScenarioComparison';
import { WhatIfLab } from './components/WhatIfLab';
import { EducationalMode } from './components/EducationalMode';
import { AiAssistantModal } from './components/AiAssistantModal';
import { ExportReportModal } from './components/ExportReportModal';
import { SimulationConfig, SimulationResults, DatasetRecord, SimulationEventLogEntry } from './types/simulation';
import { defaultSimulationConfig, scenarioPresets, syntheticHistoricalOutbreakCsv } from './data/presets';
import { parseDelimitedText } from './data/parser';
import { detectColumnMappings } from './data/columnDetector';
import { normalizeDatasetRows } from './data/dataQuality';
import { runDeterministicSimulation } from './engine/rk45';
import { runStochasticSimulation } from './engine/stochastic';
import { createEventLogEntry } from './engine/eventLogger';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isLearningMode, setIsLearningMode] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('viralab_theme');
        if (saved === 'dark') return true;
        if (saved === 'light') return false;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch {
        return false;
      }
    }
    return false;
  });
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Core Simulation Configuration & Output State
  const [config, setConfig] = useState<SimulationConfig>(defaultSimulationConfig);
  const [results, setResults] = useState<SimulationResults | null>(null);

  // Simulation Event Logs & State Transitions
  const [eventLogs, setEventLogs] = useState<SimulationEventLogEntry[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Ingested Dataset State
  const [records, setRecords] = useState<DatasetRecord[]>([]);
  const [datasetMetadata, setDatasetMetadata] = useState<any>(null);

  // Synchronize theme across DOM elements and localStorage
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDarkMode) {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    try {
      localStorage.setItem('viralab_theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore storage access errors
    }
  }, [isDarkMode]);

  // Execute simulation (calls /api/simulation/run with fallback to client-side engine)
  const executeSimulation = useCallback(
    async (cfgToRun: SimulationConfig = config) => {
      setIsSimulating(true);
      try {
        let simData: SimulationResults;
        const response = await fetch('/api/simulation/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfgToRun),
        });

        if (response.ok) {
          simData = await response.json();
        } else {
          // Direct fallback to in-memory engine if API gateway is unreached
          simData =
            cfgToRun.mode === 'stochastic'
              ? runStochasticSimulation(cfgToRun)
              : runDeterministicSimulation(cfgToRun);
        }
        setResults(simData);

        // Record timestamped simulation parameters and significant state transitions in the event logger
        const newLogEntry = createEventLogEntry(cfgToRun, simData);
        setEventLogs((prev) => [newLogEntry, ...prev.slice(0, 49)]);
        setSelectedLogId(newLogEntry.id);
      } catch {
        const fallback =
          cfgToRun.mode === 'stochastic'
            ? runStochasticSimulation(cfgToRun)
            : runDeterministicSimulation(cfgToRun);
        setResults(fallback);

        const newLogEntry = createEventLogEntry(cfgToRun, fallback);
        setEventLogs((prev) => [newLogEntry, ...prev.slice(0, 49)]);
        setSelectedLogId(newLogEntry.id);
      } finally {
        setIsSimulating(false);
      }
    },
    [config]
  );

  // Auto-run baseline simulation and initialize synthetic historical outbreak data on mount
  useEffect(() => {
    executeSimulation(defaultSimulationConfig);

    // Auto-populate synthetic dataset for instant model fitting readiness
    try {
      const table = parseDelimitedText(syntheticHistoricalOutbreakCsv);
      const { mappings } = detectColumnMappings(table.headers, table.rows);
      const { cleanedRecords } = normalizeDatasetRows(table.rows, mappings, 'keep');
      setRecords(cleanedRecords);
      setDatasetMetadata({
        sourceName: 'synthetic_historical_outbreak.csv (Preloaded)',
        rowCount: cleanedRecords.length,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Ignored
    }
  }, []);

  // Handle loading scenario preset
  const handleLoadPreset = (presetId: string) => {
    const preset = scenarioPresets.find((p) => p.id === presetId);
    if (!preset) return;

    const mergedConfig: SimulationConfig = {
      ...defaultSimulationConfig,
      ...preset.config,
    };
    setConfig(mergedConfig);
    executeSimulation(mergedConfig);
  };

  const handleResetToDefaults = () => {
    setConfig(defaultSimulationConfig);
    executeSimulation(defaultSimulationConfig);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors antialiased">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLearningMode={isLearningMode}
        setIsLearningMode={setIsLearningMode}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onRunSimulation={() => executeSimulation(config)}
        isSimulating={isSimulating}
        onOpenAiAssistant={() => setIsAiModalOpen(true)}
        onOpenExportReport={() => setIsExportModalOpen(true)}
        onResetToDefaults={handleResetToDefaults}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingPage
            onNavigate={(tab) => setActiveTab(tab)}
            onLoadPreset={handleLoadPreset}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            results={results}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            isLearningMode={isLearningMode}
          />
        )}

        {activeTab === 'simulation' && (
          <SimulationLab
            config={config}
            onChangeConfig={(newCfg) => setConfig(newCfg)}
            onRunSimulation={() => executeSimulation(config)}
            isSimulating={isSimulating}
            onLoadPreset={handleLoadPreset}
            isLearningMode={isLearningMode}
            eventLogs={eventLogs}
            selectedLogId={selectedLogId}
            onSelectLog={(id) => setSelectedLogId(id)}
            onReviewInFitting={(id) => {
              setSelectedLogId(id);
              setActiveTab('modelfitting');
            }}
            onRestoreLogConfig={(cfg) => {
              setConfig(cfg);
              executeSimulation(cfg);
            }}
            onDeleteLog={(id) => {
              setEventLogs((prev) => prev.filter((l) => l.id !== id));
              if (selectedLogId === id) {
                setSelectedLogId(null);
              }
            }}
            onClearLogs={() => {
              setEventLogs([]);
              setSelectedLogId(null);
            }}
          />
        )}

        {activeTab === 'variants' && (
          <VariantLab
            config={config}
            onChangeConfig={(newCfg) => {
              setConfig(newCfg);
              executeSimulation(newCfg);
            }}
            isLearningMode={isLearningMode}
          />
        )}

        {activeTab === 'interventions' && (
          <InterventionLab
            config={config}
            onChangeConfig={(newCfg) => {
              setConfig(newCfg);
              executeSimulation(newCfg);
            }}
            isLearningMode={isLearningMode}
          />
        )}

        {activeTab === 'datacenter' && (
          <DataCenter
            onDatasetLoaded={(recs, meta) => {
              setRecords(recs);
              setDatasetMetadata(meta);
            }}
            isLearningMode={isLearningMode}
            onNavigateToFitting={() => setActiveTab('modelfitting')}
          />
        )}

        {activeTab === 'modelfitting' && (
          <ModelFitting
            records={records}
            activeConfig={config}
            onApplyFittedConfig={(fittedCfg) => {
              setConfig(fittedCfg);
              executeSimulation(fittedCfg);
              setActiveTab('dashboard');
            }}
            isLearningMode={isLearningMode}
            eventLogs={eventLogs}
            selectedLogId={selectedLogId}
            onSelectLogId={(id) => setSelectedLogId(id)}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioComparison
            baseConfig={config}
            isLearningMode={isLearningMode}
          />
        )}

        {activeTab === 'whatif' && (
          <WhatIfLab
            baseConfig={config}
            isLearningMode={isLearningMode}
          />
        )}

        {activeTab === 'education' && <EducationalMode />}
      </main>

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        simulationResults={results}
        datasetMetadata={datasetMetadata}
      />

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        results={results}
      />

      {/* Global Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">ViraLab</span>
            <span>•</span>
            <span>Interactive Viral Transmission, Evolution & Outbreak Simulation Platform</span>
          </div>
          <div>
            <span>Runge-Kutta SEIRD ODE Numerical Integration • Educational & Scientific Modeling</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
