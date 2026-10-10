'use client';

import React from 'react';
import { useAppStore } from '@/store';
import { APP_CONFIG } from '@/config/app-config';
import {
  Sparkles,
  Upload,
  ShieldCheck,
  FileSpreadsheet,
  Activity,
  History,
  FileCheck,
  Zap,
  ArrowRight,
  Database,
  BarChart3,
  Layers,
  Wand2,
} from 'lucide-react';
import { parseSampleCSV } from '@/lib/parsing';
import messySampleCsv from '@/data/Messy_Global_Customer_Orders.csv?raw';

export function LandingView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setDataset = useAppStore((s) => s.setDataset);
  const setLoading = useAppStore((s) => s.setLoading);

  const loadSampleDataset = async () => {
    try {
      setLoading(true, 'Ingesting and analyzing sample dataset...');
      await new Promise((resolve) => setTimeout(resolve, 150));
      const res = parseSampleCSV(messySampleCsv, 'Messy_Global_Customer_Orders.csv');
      if (res.success && res.dataset) {
        setDataset(res.dataset);
      }
    } catch (err) {
      console.error('Failed to load sample dataset', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 animate-fadeIn">
      {/* Hero Section */}
      <div className="pt-10 sm:pt-14 text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider shadow-sm">
          <Sparkles size={14} className="text-emerald-600 animate-pulse" />
          Autonomous Data Engineering Studio
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Turn Messy, Broken Spreadsheets Into{' '}
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Analysis-Ready Data
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed">
          {APP_CONFIG.description}. Instantly diagnose quality issues, execute rule-based and AI-guided normalization, verify changes with visual diffs, and generate compliant audit reports.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setCurrentView('upload')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-base group"
          >
            <Upload size={18} />
            <span>Upload Your Dataset</span>
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={loadSampleDataset}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-medium border border-slate-300 shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 text-base"
          >
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <span>Try With Sample Messy Data</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 pt-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-600" /> 100% In-Browser & Private
          </span>
          <span className="flex items-center gap-1.5">
            <Zap size={16} className="text-amber-500" /> Instant Zero-Lag Engine
          </span>
          <span className="flex items-center gap-1.5">
            <History size={16} className="text-blue-500" /> Reversible Time-Machine
          </span>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Activity size={22} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Comprehensive Quality Scoring</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Multi-dimensional health checks calculating Completeness, Uniqueness, Consistency, and Structural Hygiene with severity-graded issue logs.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Wand2 size={22} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">20+ Transformation Engines</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Trim leading/trailing whitespace, resolve email anomalies, harmonize dates to ISO-8601, deduplicate rows, impute missing values, and sanitize column names.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles size={22} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">AI Assistant & Auto-Pipeline</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Automatic issue identification with one-click pipeline generation. Say what you want in plain English and let the engine prescribe precise operations.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers size={22} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Side-by-Side Visual Diff</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Verify before applying. Compare raw untrusted inputs with transformed datasets down to the exact cell, row, and column difference.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <History size={22} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Full Undo / Redo Time Machine</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Non-destructive operations with immutable snapshots. Undo or step forward through any operation with guaranteed data integrity.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileCheck size={22} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Audit-Ready PDF & Data Export</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Export cleaned CSV and XLSX datasets alongside a structured PDF Data Audit Trail detailing all quality metrics and transformations applied.
          </p>
        </div>
      </div>

      {/* Pipeline Preview Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl overflow-hidden relative border border-slate-800">
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            Enterprise Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Built for Data Engineers, Analysts & Hackathon Demonstrations
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Handles dirty real-world spreadsheets with inconsistent dates, duplicate keys, broken percentages, negative outlier values, mixed casing, and unescaped delimiters.
          </p>
          <div className="pt-2">
            <button
              onClick={loadSampleDataset}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-md hover:shadow-emerald-500/20"
            >
              Launch Live Interactive Demo
            </button>
          </div>
        </div>

        {/* Ambient background graphic */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}
