'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import {
  Sparkles,
  Bot,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  Zap,
  HelpCircle,
} from 'lucide-react';
import type { CleaningActionId, CleaningConfig } from '@/types';

export function AiAssistantPanel() {
  const workingDataset = useAppStore((s) => s.workingDataset);
  const aiAnalysis = useAppStore((s) => s.aiAnalysis);
  const applyOperation = useAppStore((s) => s.applyOperation);
  const refreshAIAnalysis = useAppStore((s) => s.refreshAIAnalysis);

  const [prompt, setPrompt] = useState('');
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!workingDataset || !aiAnalysis) {
    return (
      <div className="p-8 text-center text-slate-500">
        Upload a dataset to activate the AI Data Doctor.
      </div>
    );
  }

  const handleApplyStep = (actionId: CleaningActionId, config?: Partial<CleaningConfig>) => {
    applyOperation({
      actionId,
      ...config,
    });
  };

  const handleRunFullPipeline = () => {
    aiAnalysis.recommendedPipeline.forEach((rec) => {
      applyOperation({
        actionId: rec.actionId,
        ...rec.config,
      });
    });
  };

  const handleSendPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    const userText = prompt.trim();
    setPrompt('');
    setChatLog((prev) => [...prev, { role: 'user', text: userText }]);
    setIsProcessing(true);

    setTimeout(() => {
      const lower = userText.toLowerCase();
      let matchedAction: CleaningActionId | null = null;
      let matchedConfig: Partial<CleaningConfig> = {};
      let reply = '';

      if (lower.includes('trim') || lower.includes('whitespace') || lower.includes('space')) {
        matchedAction = 'trim_whitespace';
        reply = 'I identified whitespace anomalies across text columns. Executing leading and trailing whitespace trim.';
      } else if (lower.includes('dedup') || lower.includes('duplicate')) {
        matchedAction = 'deduplicate_rows';
        reply = 'Identified duplicate records. Removing identical duplicate rows across all columns.';
      } else if (lower.includes('header') || lower.includes('column name') || lower.includes('snake')) {
        matchedAction = 'normalize_headers';
        matchedConfig = { headerStyle: 'snake_case' };
        reply = 'Standardizing column headers to clean snake_case convention.';
      } else if (lower.includes('date') || lower.includes('iso')) {
        matchedAction = 'normalize_dates';
        reply = 'Harmonizing dates to standard ISO-8601 (YYYY-MM-DD).';
      } else if (lower.includes('currency') || lower.includes('dollar') || lower.includes('price')) {
        matchedAction = 'remove_currency_symbols';
        reply = 'Stripping currency signs and parsing numeric values.';
      } else if (lower.includes('missing') || lower.includes('null') || lower.includes('fill')) {
        matchedAction = 'fill_missing';
        matchedConfig = { fillStrategy: 'mode' };
        reply = 'Imputing missing values using the most frequent column modes.';
      } else {
        reply = `I analyzed your request. I recommend following the automated pipeline below for best results on ${workingDataset.meta.fileName}.`;
      }

      if (matchedAction) {
        const result = applyOperation({
          actionId: matchedAction,
          ...matchedConfig,
        });
        reply += ` Applied! Modified ${result.cellsChanged} cells and removed ${result.rowsRemoved} rows.`;
      }

      setChatLog((prev) => [...prev, { role: 'assistant', text: reply }]);
      setIsProcessing(false);
    }, 400);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* AI Summary Banner */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-emerald-900/50 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Bot size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">AI Data Doctor & Copilot</h2>
              <span className="text-xs text-emerald-400 font-mono">Autonomous In-Browser Diagnosis</span>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/40">
            Health: {aiAnalysis.healthScore}/100
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed font-normal">
          {aiAnalysis.summary}
        </p>

        {aiAnalysis.recommendedPipeline.length > 0 && (
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {aiAnalysis.recommendedPipeline.length} recommended remediation operations
            </span>
            <button
              onClick={handleRunFullPipeline}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow transition-all"
            >
              <Sparkles size={14} />
              <span>Auto-Clean Full Pipeline</span>
            </button>
          </div>
        )}
      </div>

      {/* Recommended Pipeline Steps */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Prescribed Cleaning Pipeline
        </h3>

        {aiAnalysis.recommendedPipeline.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
            No issues requiring remediation. Dataset has high health standards!
          </div>
        ) : (
          <div className="space-y-3">
            {aiAnalysis.recommendedPipeline.map((rec) => (
              <div
                key={rec.step}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                      {rec.step}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{rec.title}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {rec.target}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 pl-7">{rec.reason}</p>
                </div>

                <button
                  onClick={() => handleApplyStep(rec.actionId, rec.config)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all shrink-0 ml-7 sm:ml-0"
                >
                  <Play size={12} />
                  <span>Execute Step</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Natural Language Prompt Copilot */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Sparkles size={18} className="text-emerald-600" />
          <span>Ask Copilot to Clean Anything</span>
        </div>

        {/* Chat History */}
        {chatLog.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            {chatLog.map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-emerald-50 text-emerald-950 font-medium ml-4'
                    : 'bg-white border border-slate-200 text-slate-800 mr-4'
                }`}
              >
                <strong>{msg.role === 'user' ? 'You: ' : 'Copilot: '}</strong>
                {msg.text}
              </div>
            ))}
          </div>
        )}

        {/* Input Field */}
        <form onSubmit={handleSendPrompt} className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. 'Trim all whitespace' or 'Remove duplicate orders' or 'Standardize dates'..."
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isProcessing || !prompt.trim()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
          >
            <Send size={14} />
            <span>Send</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">Quick prompts:</span>
          {[
            'Trim whitespace',
            'Deduplicate rows',
            'Convert headers to snake_case',
            'Harmonize dates',
            'Remove currency symbols',
          ].map((quick) => (
            <button
              key={quick}
              onClick={() => {
                setPrompt(quick);
              }}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              {quick}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
