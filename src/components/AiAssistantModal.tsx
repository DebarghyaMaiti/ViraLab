import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  HelpCircle,
  Activity,
  Bot,
  User,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { SimulationResults } from '../types/simulation';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationResults: SimulationResults | null;
  datasetMetadata: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  simulationResults,
  datasetMetadata,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Welcome to the ViraLab AI Epidemiological Assistant. I analyze your mathematical simulation runs, model parameters, and empirical datasets to provide grounded scientific explanations. How can I assist your investigation today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendPrompt = async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Prepare compact simulation summary context
      const simSummary = simulationResults
        ? {
            population: simulationResults.kpis.population,
            totalInfected: simulationResults.kpis.totalInfected,
            attackRate: `${(simulationResults.kpis.attackRate * 100).toFixed(1)}%`,
            peakActive: simulationResults.kpis.peakActive,
            peakDay: simulationResults.kpis.peakDay,
            totalDeaths: simulationResults.kpis.totalDeaths,
            basicR0: simulationResults.kpis.basicR0,
            currentRe: simulationResults.kpis.currentRe,
            durationDays: simulationResults.config.durationDays,
            strains: simulationResults.config.strains.map((s) => ({
              name: s.name,
              beta: s.beta,
              incubation: s.incubationPeriod,
              infectious: s.infectiousPeriod,
              mortality: s.mortalityRate,
              escape: s.immuneEscape,
            })),
            activeInterventions: simulationResults.config.interventions
              .filter((i) => i.enabled)
              .map((i) => `${i.name} (Day ${i.startDay}-${i.endDay})`),
            vaccinationEnabled: simulationResults.config.vaccination?.enabled,
          }
        : null;

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          simulationSummary: simSummary,
          datasetMetadata,
        }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer || data.fallbackAnswer || 'Unable to generate response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'The AI service could not be reached. All numerical simulation figures, variant comparisons, and fit metrics remain accessible directly in the ViraLab dashboard.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQueries = [
    'Analyze why the variant sweep occurred and how Rₑ shifted.',
    'Did this simulation reach the herd immunity threshold?',
    'What was the primary driver of peak infection day?',
    'Explain the mathematical distinction between R₀ and Rₑ(t).',
  ];

  return (
    <div
      id="ai-assistant-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs"
    >
      <div
        id="ai-assistant-modal"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                ViraLab AI Research Assistant
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Grounded in active SEIRD simulation outputs & Gemini 2.5
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Disclaimer Notice */}
        <div className="px-4 py-2 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Responses are generated for mathematical research context and do not constitute clinical guidance.</span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-xs leading-relaxed ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div
                  className={`text-[10px] mt-1.5 text-right ${
                    msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing simulation trajectories...</span>
            </div>
          )}
        </div>

        {/* Suggested Queries */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-semibold shrink-0">Inquiries:</span>
          {sampleQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendPrompt(q)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-purple-400 dark:hover:border-purple-600 shrink-0 cursor-pointer transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendPrompt(inputText);
            }}
            placeholder="Ask about transmission rates, variant sweeps, or Rₑ dynamics..."
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => handleSendPrompt(inputText)}
            disabled={!inputText.trim() || isLoading}
            className="p-2 text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
