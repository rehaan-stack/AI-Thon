'use client';

import React from 'react';
import { useAppStore } from '@/store';
import { parseSampleCSV } from '@/lib/parsing';
import messySampleCsv from '@/data/Messy_Global_Customer_Orders.csv?raw';
import { Sparkles, Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  featureBadge?: string;
  features?: string[];
}

export function EmptyState({
  title,
  description,
  featureBadge = 'Demo Available',
  features = [
    'Auto-detect missing values & outliers',
    'Standardize dates & strip currency symbols',
    'Export cleaned CSV, Excel & PDF Audit Trail',
  ],
}: EmptyStateProps) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setDataset = useAppStore((s) => s.setDataset);
  const setLoading = useAppStore((s) => s.setLoading);

  const handleLoadSample = async () => {
    try {
      setLoading(true, 'Ingesting and analyzing benchmark dataset...');
      await new Promise((resolve) => setTimeout(resolve, 200));
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
    <div className="max-w-2xl mx-auto my-8 p-8 sm:p-10 bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100/60 text-center space-y-6 animate-fadeIn">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
        <FileSpreadsheet size={32} />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold tracking-wide uppercase">
          <Sparkles size={12} className="text-emerald-500 animate-pulse" />
          {featureBadge}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
        <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {features.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left max-w-md mx-auto space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            What you can do here
          </div>
          <div className="space-y-1.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-medium">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleLoadSample}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95"
        >
          <Sparkles size={16} />
          Load Benchmark Sample Data
        </button>

        <button
          onClick={() => setCurrentView('upload')}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-sm transition-all"
        >
          <Upload size={16} />
          Upload Your Own File
        </button>
      </div>
    </div>
  );
}
