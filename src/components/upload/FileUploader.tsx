'use client';

import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store';
import { parseFile, getExcelSheets, parseSampleCSV, validateFile } from '@/lib/parsing';
import { APP_CONFIG } from '@/config/app-config';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Sparkles,
  Info,
  Loader2,
  ArrowRight,
  Database,
} from 'lucide-react';
import messySampleCsv from '@/data/Messy_Global_Customer_Orders.csv?raw';

export function FileUploader() {
  const setDataset = useAppStore((s) => s.setDataset);
  const setLoading = useAppStore((s) => s.setLoading);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setWarnings([]);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setWarnings([]);
    if (e.target.files && e.target.files.length > 0) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file.');
      return;
    }

    setSelectedFile(file);

    // If Excel, inspect sheets
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      try {
        const buffer = await file.arrayBuffer();
        const sheetList = getExcelSheets(buffer);
        if (sheetList.length > 1) {
          setSheets(sheetList);
          setSelectedSheet(sheetList[0]);
          return; // Wait for user to select sheet
        }
      } catch (err) {
        console.error('Failed to read Excel sheets', err);
      }
    }

    // Direct parse
    await executeParse(file);
  };

  const executeParse = async (file: File, sheetName?: string) => {
    setIsProcessing(true);
    setLoading(true, 'Parsing dataset and running quality diagnostics...');
    try {
      const result = await parseFile(file, { selectedSheet: sheetName });
      if (!result.success || !result.dataset) {
        setError(result.error || 'Failed to parse file.');
        if (result.warnings) setWarnings(result.warnings);
        return;
      }

      if (result.warnings.length > 0) {
        setWarnings(result.warnings);
      }

      setDataset(result.dataset);
      setCurrentView('overview');
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while parsing the file.');
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  const loadSampleDataset = async () => {
    setIsProcessing(true);
    setLoading(true, 'Loading comprehensive messy benchmark dataset...');
    try {
      await new Promise((r) => setTimeout(r, 100));
      const result = parseSampleCSV(messySampleCsv, 'Messy_Global_Customer_Orders.csv');
      if (result.success && result.dataset) {
        setDataset(result.dataset);
        setCurrentView('overview');
      } else {
        setError(result.error || 'Failed to parse sample data.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load sample dataset.');
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
          Import & Inspect Dataset
        </h2>
        <p className="text-slate-600 max-w-xl mx-auto">
          Upload any CSV, TSV, or Excel spreadsheet to generate instant data quality diagnostics and an automated cleaning plan.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center transition-all duration-200
          ${isDragging
            ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-emerald-400 bg-white hover:bg-slate-50/50 shadow-sm'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
            {isProcessing ? (
              <Loader2 size={32} className="animate-spin text-emerald-600" />
            ) : (
              <UploadCloud size={32} />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">
              {isDragging ? 'Drop file to upload' : 'Click to upload or drag and drop'}
            </h3>
            <p className="text-sm text-slate-500">
              CSV, TSV, XLSX, or XLS (Up to {APP_CONFIG.maxFileSizeLabel})
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-mono">
              .csv
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-mono">
              .tsv
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-mono">
              .xlsx
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-mono">
              .xls
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Sheet Excel Modal / Selection */}
      {sheets.length > 1 && selectedFile && (
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-md space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold">
            <FileSpreadsheet size={20} />
            <span>Select Sheet to Import ({sheets.length} sheets found)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sheets.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSheet(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedSheet === s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => executeParse(selectedFile, selectedSheet)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2 shadow"
            >
              <span>Load Sheet "{selectedSheet}"</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-red-600" />
          <div className="space-y-1">
            <div className="font-semibold text-sm">Failed to import file</div>
            <div className="text-xs text-red-600 leading-relaxed">{error}</div>
          </div>
        </div>
      )}

      {/* Warnings Display */}
      {warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Info size={18} className="text-amber-600" />
            <span>Parsing Notices & Auto-Adjustments</span>
          </div>
          <ul className="text-xs space-y-1 list-disc list-inside text-amber-700">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Benchmark Datasets Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Or Try A Pre-Loaded Benchmark Dataset
            </h3>
            <p className="text-xs text-slate-500">
              Stress-test the diagnosis engine with real-world contaminated data
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Messy Global Customer Orders */}
          <div
            onClick={loadSampleDataset}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Database size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                    Messy Global Customer Orders
                  </h4>
                  <span className="text-xs text-slate-500">
                    25 columns • 40+ rows • Contaminated real-world data
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                Recommended
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Contains duplicate orders, negative prices, inconsistent date formats, missing emails, dirty currency symbols, unescaped whitespace, and mixed casing.
            </p>

            <div className="pt-2 flex items-center justify-between text-xs font-medium text-emerald-600">
              <span>Load Interactive Benchmark</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Privacy and In-Browser guarantee card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>Zero Server Uploads & Total Privacy</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                All parsing, profiling, cleaning transformations, and PDF generation execute purely within your browser memory. No sensitive enterprise data ever leaves your device.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Client-Side WebAssembly & SheetJS Engine
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
