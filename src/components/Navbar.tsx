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
  ChevronDown,
  RotateCcw,
  FlaskConical,
  LineChart,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../firebase/authContext';

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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { user, signInWithGoogle, signOutUser } = useAuth();

  const primaryNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'simulation', label: 'Simulation Lab', icon: Sliders },
    { id: 'modelfitting', label: 'Model Fit', icon: LineChart },
    { id: 'scenarios', label: 'Scenarios', icon: GitCompare },
  ];

  const moreNavItems = [
    { id: 'variants', label: 'Variant Lab', icon: Dna },
    { id: 'interventions', label: 'Interventions', icon: ShieldCheck },
    { id: 'datacenter', label: 'Data Center', icon: Database },
    { id: 'whatif', label: 'What-If?', icon: FlaskConical },
    { id: 'education', label: 'Theory', icon: HelpCircle },
  ];

  const allNavItems = [...primaryNavItems, ...moreNavItems];

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs transition-colors"
    >
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              id="brand-logo-btn"
              onClick={() => setActiveTab('landing')}
              className="flex items-center gap-2 text-left group focus:outline-none cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                    ViraLab
                  </span>
                  <span className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-md">
                    SEIRD
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden xl:flex items-center gap-1 min-w-0">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                    setMoreMenuOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* More Labs Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  moreNavItems.some((m) => m.id === activeTab)
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {moreNavItems.find((m) => m.id === activeTab)?.label || 'More Labs'}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-48 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50"
                  onMouseLeave={() => setMoreMenuOpen(false)}
                >
                  {moreNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as ActiveTab);
                          setMoreMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Run Simulation Button */}
            <button
              id="run-simulation-btn"
              onClick={onRunSimulation}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Execute SEIRD ODE numerical solver"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isSimulating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSimulating ? 'Simulating...' : 'Simulate'}</span>
            </button>

            {/* AI Assistant */}
            <button
              id="open-ai-assistant-btn"
              onClick={onOpenAiAssistant}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/60 rounded-lg transition-colors cursor-pointer"
              title="Epidemiological Research Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden 2xl:inline">AI Analysis</span>
            </button>

            {/* Export Report */}
            <button
              id="open-export-report-btn"
              onClick={onOpenExportReport}
              className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Generate scientific summary report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>

            {/* Learning Mode Switch */}
            <button
              id="toggle-learning-mode-btn"
              onClick={() => setIsLearningMode(!isLearningMode)}
              className={`hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                isLearningMode
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Toggle theoretical explanations and parameter tooltips"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{isLearningMode ? 'Learn: On' : 'Learn'}</span>
            </button>

            {/* Google Sign-in / User Account */}
            {user ? (
              <div className="flex items-center gap-1.5 pl-1">
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                  title={`Signed in as ${user.email} (Firestore sync active)`}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                  <span className="hidden md:inline font-semibold max-w-[90px] truncate text-[11px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={signOutUser}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Sign in with Google to sync simulations to Firestore"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Mobile / Tablet Menu Button */}
            <button
              id="mobile-nav-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
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
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors cursor-pointer ${
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
            {/* Mobile Theme Toggle Button */}
            <button
              id="mobile-theme-toggle-btn"
              onClick={() => {
                setIsDarkMode(!isDarkMode);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-slate-500 shrink-0" />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button
              onClick={() => {
                onOpenExportReport();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Export Report</span>
            </button>
            <button
              onClick={() => {
                onResetToDefaults();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
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
