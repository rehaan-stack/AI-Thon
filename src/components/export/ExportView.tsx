'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { APP_CONFIG } from '@/config/app-config';
import { exportCSV, exportXLSX, exportAuditReportPDF } from '@/lib/export';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCheck,
  Settings,
  Trash2,
  CheckCircle2,
  Shield,
  Layers,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export function ExportView() {
  const workingDataset = useAppStore((s) => s.workingDataset);
  const originalDataset = useAppStore((s) => s.originalDataset);
  const qualityScore = useAppStore((s) => s.qualityScore);
  const initialQualityScore = useAppStore((s) => s.initialQualityScore);
  const history = useAppStore((s) => s.history);
  const clearDataset = useAppStore((s) => s.clearDataset);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  const [csvFileName, setCsvFileName] = useState(
    workingDataset ? `${workingDataset.meta.fileName.replace(/\.[^.]+$/, '')}_cleaned.csv` : 'cleaned_data.csv'
  );
  const [xlsxFileName, setXlsxFileName] = useState(
    workingDataset ? `${workingDataset.meta.fileName.replace(/\.[^.]+$/, '')}_cleaned.xlsx` : 'cleaned_data.xlsx'
  );
  const [sheetName, setSheetName] = useState('Cleaned Data');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!workingDataset) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
        <EmptyState
          title="Dataset Export & Pipeline Delivery"
          description="Download your cleansed and normalized data as high-fidelity CSV, multi-sheet Excel (.xlsx), or generate an executive PDF Quality Audit Report."
          featureBadge="Export Studio"
          features={[
            'UTF-8 sanitized CSV export with customizable delimiters',
            'Full Excel workbook export (.xlsx) with auto-formatted column headers',
            'Executive PDF Audit Report with quality charts and provenance trace',
            'Zero data loss guarantees & 100% in-browser processing'
          ]}
        />

        {/* Platform & Engine Configuration Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
            <Settings size={18} className="text-slate-600" />
            <span>System & Branding Configuration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-slate-400 font-medium">BRANDING / NAME</div>
              <div className="font-bold text-slate-900 text-sm">{APP_CONFIG.name}</div>
              <div className="text-[11px] text-slate-500">{APP_CONFIG.tagline}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-slate-400 font-medium">SECURITY & RUNTIME</div>
              <div className="font-bold text-slate-900 text-sm">100% In-Browser Execution</div>
              <div className="text-[11px] text-slate-500">Zero backend egress. Client-side JS engine.</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-slate-400 font-medium">SUPPORTED INGESTION</div>
              <div className="font-mono text-slate-800 font-semibold">
                {APP_CONFIG.supportedExtensions.join(', ')}
              </div>
              <div className="text-[11px] text-slate-500">Max limit: {APP_CONFIG.maxFileSizeLabel}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-slate-400 font-medium">APPEARANCE THEME</div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                  {theme === 'dark' ? <Moon size={14} className="text-emerald-400" /> : <Sun size={14} className="text-amber-500" />}
                  <span>{theme === 'dark' ? 'Night Mode (Active)' : 'Light Mode (Active)'}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {theme === 'dark' ? 'Deep obsidian navy palette' : 'High-clarity daylight slate'}
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
              >
                {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
                <span>Toggle</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    exportCSV(workingDataset, csvFileName);
    setDownloadSuccess('CSV exported successfully!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportXLSX = () => {
    exportXLSX(workingDataset, xlsxFileName, sheetName);
    setDownloadSuccess('Excel workbook exported successfully!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportPDF = () => {
    if (!qualityScore || !initialQualityScore) return;
    exportAuditReportPDF({
      productName: APP_CONFIG.name,
      fileName: workingDataset.meta.fileName,
      reportDate: new Date().toLocaleDateString(),
      originalRowCount: originalDataset ? originalDataset.rows.length : workingDataset.rows.length,
      originalColumnCount: originalDataset ? originalDataset.columns.length : workingDataset.columns.length,
      finalRowCount: workingDataset.rows.length,
      finalColumnCount: workingDataset.columns.length,
      initialQualityScore: initialQualityScore.overall,
      finalQualityScore: qualityScore.overall,
      qualityBreakdown: qualityScore,
      detectedIssues: qualityScore.issues,
      appliedOperations: history,
      remainingIssues: qualityScore.issues,
      parseWarnings: workingDataset.meta.parseWarnings,
    });
    setDownloadSuccess('PDF Audit Report exported successfully!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Export & Enterprise Settings
        </h2>
        <p className="text-sm text-slate-500">
          Download clean datasets, generate audit reports, and inspect engine configurations
        </p>
      </div>

      {downloadSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CSV Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Download size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Standard CSV</h3>
            <p className="text-xs text-slate-500">
              Analysis-ready delimited file with RFC 4180 escaping and UTF-8 encoding.
            </p>
            <div className="space-y-1 pt-2">
              <label className="text-[11px] font-semibold text-slate-600">Filename</label>
              <input
                type="text"
                value={csvFileName}
                onChange={(e) => setCsvFileName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
              />
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download size={14} /> Download CSV
          </button>
        </div>

        {/* Excel Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileSpreadsheet size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Excel Workbook (.xlsx)</h3>
            <p className="text-xs text-slate-500">
              Formatted multi-column spreadsheet with native date and numeric types.
            </p>
            <div className="space-y-1 pt-2">
              <label className="text-[11px] font-semibold text-slate-600">Filename</label>
              <input
                type="text"
                value={xlsxFileName}
                onChange={(e) => setXlsxFileName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
              />
            </div>
          </div>
          <button
            onClick={handleExportXLSX}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download size={14} /> Download Excel
          </button>
        </div>

        {/* PDF Audit Report */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">PDF Audit Report</h3>
            <p className="text-xs text-slate-500">
              Executive compliance document detailing quality scores, detected defects, and transformation history.
            </p>
            <div className="pt-2 text-xs text-slate-500 space-y-1">
              <div>• Before & After Scorecard</div>
              <div>• Applied Pipeline Log</div>
              <div>• Residual Issue Summary</div>
            </div>
          </div>
          <button
            onClick={handleExportPDF}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download size={14} /> Generate PDF Audit
          </button>
        </div>
      </div>

      {/* Platform & Engine Configuration Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
          <Settings size={18} className="text-slate-600" />
          <span>System & Branding Configuration</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-slate-400 font-medium">BRANDING / NAME</div>
            <div className="font-bold text-slate-900 text-sm">{APP_CONFIG.name}</div>
            <div className="text-[11px] text-slate-500">{APP_CONFIG.tagline}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-slate-400 font-medium">SECURITY & RUNTIME</div>
            <div className="font-bold text-slate-900 text-sm">100% In-Browser Execution</div>
            <div className="text-[11px] text-slate-500">Zero backend egress. Client-side JS engine.</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-slate-400 font-medium">SUPPORTED INGESTION</div>
            <div className="font-mono text-slate-800 font-semibold">
              {APP_CONFIG.supportedExtensions.join(', ')}
            </div>
            <div className="text-[11px] text-slate-500">Max limit: {APP_CONFIG.maxFileSizeLabel}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-medium">APPEARANCE THEME</div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                {theme === 'dark' ? <Moon size={14} className="text-emerald-400" /> : <Sun size={14} className="text-amber-500" />}
                <span>{theme === 'dark' ? 'Night Mode (Active)' : 'Light Mode (Active)'}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {theme === 'dark' ? 'Deep obsidian navy palette' : 'High-clarity daylight slate'}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
            >
              {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
              <span>Toggle</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Current Dataset: {workingDataset.meta.fileName} ({workingDataset.rows.length} rows)
          </span>

          <button
            onClick={clearDataset}
            className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={14} />
            <span>Reset & Clear Dataset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
