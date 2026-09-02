import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Sliders,
  Dna,
  ShieldCheck,
  Database,
  GitCompare,
  HelpCircle,
  Play,
  Moon,
  Sun,
  Sparkles,
  FileText,
  Menu,
  X,
  RotateCcw,
  FlaskConical,
  LineChart,
} from 'lucide-react';

export type ActiveTab =
  | 'landing'
  | 'dashboard'
  | 'simulation'
  | 'variants'
  | 'interventions'
  | 'datacenter'
  | 'modelfitting'
  | 'scenarios'
  | 'whatif'
  | 'education';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isLearningMode: boolean;
  setIsLearningMode: (val: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onRunSimulation: () => void;
  isSimulating: boolean;
  onOpenAiAssistant: () => void;
  onOpenExportReport: () => void;
  onResetToDefaults: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isLearningMode,
  setIsLearningMode,
  isDarkMode,
  setIsDarkMode,
  onRunSimulation,
  isSimulating,
  onOpenAiAssistant,
  onOpenExportReport,
  onResetToDefaults,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'simulation', label: 'Simulation Lab', icon: Sliders },
    { id: 'variants', label: 'Variant Lab', icon: Dna },
    { id: 'interventions', label: 'Interventions', icon: ShieldCheck },
    { id: 'datacenter', label: 'Data Center', icon: Database },
    { id: 'modelfitting', label: 'Model Fit', icon: LineChart },
    { id: 'scenarios', label: 'Scenarios', icon: GitCompare },
    { id: 'whatif', label: 'What-If?', icon: FlaskConical },
    { id: 'education', label: 'Theory', icon: HelpCircle },
  ];

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs transition-colors"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              id="brand-logo-btn"
              onClick={() => setActiveTab('landing')}
              className="flex items-center gap-2 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                    ViraLab
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-md">
                    SEIRD v2.4
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none hidden sm:block">
                  Computational Outbreak Platform
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Bar */}
          <div className="flex items-center gap-2">
            {/* Run Simulation Button */}
            <button
              id="run-simulation-btn"
              onClick={onRunSimulation}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              title="Execute SEIRD ODE numerical solver"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isSimulating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSimulating ? 'Simulating...' : 'Simulate'}</span>
            </button>

            {/* AI Assistant */}
            <button
              id="open-ai-assistant-btn"
              onClick={onOpenAiAssistant}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/60 rounded-lg transition-colors"
              title="Epidemiological Research Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden md:inline">AI Analysis</span>
            </button>

            {/* Export Report */}
            <button
              id="open-export-report-btn"
              onClick={onOpenExportReport}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Generate scientific summary report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>

            {/* Learning Mode Switch */}
            <button
              id="toggle-learning-mode-btn"
              onClick={() => setIsLearningMode(!isLearningMode)}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                isLearningMode
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Toggle theoretical explanations and parameter tooltips"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{isLearningMode ? 'Learn Mode: On' : 'Learn Mode'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Mobile Menu Button */}
            <button
              id="mobile-nav-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-menu"
            className="xl:hidden py-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => {
                onOpenExportReport();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Export Report</span>
            </button>
            <button
              onClick={() => {
                onResetToDefaults();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Reset Defaults</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
