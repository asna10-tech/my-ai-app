import { useState, type FormEvent } from 'react';
import Markdown from 'react-markdown';
import { Bot, Send, ShieldAlert, Sparkles } from 'lucide-react';
import type { WorkspaceData } from '../types/aquapure';

interface AiAssistantModuleProps {
  data: WorkspaceData;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const PRESET_PROMPTS = [
  {
    label: 'Compare Experiment Results',
    prompt:
      'Compare the arsenic and fluoride removal performance, adsorption capacity (q), and cost per 1,000 L across our recorded experiments. Identify which runs meet BIS IS 10500:2012 limits and distinguish simulated vs. measured runs.',
  },
  {
    label: 'Audit Missing Measurements',
    prompt:
      'Audit all samples and experiments in our current dataset to identify missing laboratory measurements, unmeasured cartridge operating life values, or results requiring additional ICP-MS/ISE verification.',
  },
  {
    label: 'Suggest Experimental Variables',
    prompt:
      'Based on our current iron-based arsenic and aluminium-based fluoride runs, suggest concrete next experimental variables (pH conditioning, EBCT, media dosage, co-ion interference) to optimize breakthrough life.',
  },
  {
    label: 'Explain Adsorption Mechanisms',
    prompt:
      'Explain the chemical adsorption mechanisms (inner-sphere complexation on FeOOH vs. ligand exchange on Al-media) and why TDS reduction does not indicate arsenic or fluoride removal.',
  },
  {
    label: 'Draft PI-RAHI Summary',
    prompt:
      'Generate a concise, scientifically accurate technical documentation summary of our AquaPure Indigenous dual-cartridge system for the IIT Ropar PI-RAHI IGNITE 2.0 review panel, strictly citing only recorded numbers and listing limitations.',
  },
];

export function AiAssistantModule({ data }: AiAssistantModuleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ready to analyze your AquaPure Indigenous samples, adsorbent materials, and prototype experiments. I cite only values present in your workspace dataset, distinguish simulated demo entries from lab-measured runs, and enforce BIS IS 10500:2012 verification standards.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [contextScope, setContextScope] = useState<'all' | 'experiments' | 'adsorbents'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    setErrorBanner(null);
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const contextPayload =
      contextScope === 'all'
        ? data
        : contextScope === 'experiments'
        ? { prototype: data.prototype, samples: data.samples, experiments: data.experiments }
        : { prototype: data.prototype, adsorbents: data.adsorbents };

    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          contextData: contextPayload,
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const payload = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || `Server error (${response.status})`);
      }

      const aiMsg: ChatMessage = {
        id: `msg-a-${Date.now()}`,
        role: 'assistant',
        content: payload.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach Gemini AI service.';
      setErrorBanner(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendPrompt(input);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left Sidebar Controls & Research Presets */}
      <div className="xl:col-span-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">AI Research Assistant</h2>
              <p className="text-xs text-slate-500">Grounded in live workspace data</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Dataset Context Attached
            </label>
            <select
              value={contextScope}
              onChange={(e) => setContextScope(e.target.value as 'all' | 'experiments' | 'adsorbents')}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="all">
                Full Workspace ({data.samples.length} samples, {data.adsorbents.length} media, {data.experiments.length} runs)
              </option>
              <option value="experiments">Samples &amp; Experiments Only</option>
              <option value="adsorbents">Adsorbent Material Matrix Only</option>
            </select>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-xs font-medium text-slate-700">Quick Analysis Prompts</p>
            <div className="space-y-1.5">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => void sendPrompt(preset.prompt)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 leading-relaxed">
            <strong>Scientific Safeguard:</strong> AI output is constrained against fabricating lab values, claiming 100% contaminant removal, or certifying potability without accredited ICP-MS/AAS/ISE testing.
          </div>
        </div>
      </div>

      {/* Chat Viewport */}
      <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col h-[640px]">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">
            Research Synthesis Console · Gemini AI
          </span>
          <span className="text-xs font-mono text-slate-500">
            Context: {contextScope === 'all' ? 'Full Dataset' : contextScope}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-800'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-slate max-w-none [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:bg-slate-200/70 [&_code]:px-1 [&_code]:rounded">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
              <span className="text-[11px] font-mono text-slate-400 mt-1 px-1">
                {msg.role === 'user' ? 'Researcher' : 'AquaPure AI'} · {msg.timestamp}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600">
                Analyzing attached water-quality and adsorbent data…
              </div>
            </div>
          )}
        </div>

        {errorBanner && (
          <div className="mx-5 mb-3 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
            <strong>AI Service Notice:</strong> {errorBanner}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about adsorption kinetics, BIS limits, missing measurements, or cost optimization..."
            className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            Ask AI
          </button>
        </form>
      </div>
    </div>
  );
}
