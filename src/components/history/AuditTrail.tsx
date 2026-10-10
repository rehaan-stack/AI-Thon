'use client';

import React from 'react';
import { useAppStore } from '@/store';
import {
  History,
  CheckCircle2,
  Undo2,
  Redo2,
  RotateCcw,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { exportAuditReportPDF } from '@/lib/export';
import { APP_CONFIG } from '@/config/app-config';
import { EmptyState } from '@/components/common/EmptyState';

export function AuditTrail() {
  const history = useAppStore((s) => s.history);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const canUndo = useAppStore((s) => s.canUndo);
  const canRedo = useAppStore((s) => s.canRedo);
  const workingDataset = useAppStore((s) => s.workingDataset);
  const originalDataset = useAppStore((s) => s.originalDataset);
  const qualityScore = useAppStore((s) => s.qualityScore);
  const initialQualityScore = useAppStore((s) => s.initialQualityScore);
  const appliedHistory = history.filter(
    (entry) => entry.status === 'applied' || entry.status === 'reapplied'
  );

  if (!workingDataset) {
    return (
      <EmptyState
        title="Audit Trail & Provenance History"
        description="Every cleaning step is logged immutably with cell-level change counters, execution timestamps, and zero-data-loss rollback capability."
        featureBadge="Provenance"
        features={[
          'Complete chronological operation ledger',
          'Instant time-travel Undo & Redo to any past state',
          'Export formal PDF Compliance & Quality Audit Report',
          'Execution latency and data footprint tracking'
        ]}
      />
    );
  }

  const handleExportPdfReport = () => {
    if (!workingDataset || !qualityScore || !initialQualityScore) return;

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
  };

  return (
    <div className="audit-trail max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History size={20} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Audit Trail & Pipeline Provenance
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Immutable operation record with non-destructive state reconstruction
          </p>
        </div>

        <div className="audit-actions flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Undo2 size={13} />
            <span>Undo Step</span>
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Redo2 size={13} />
            <span>Redo Step</span>
          </button>

          <button
            onClick={handleExportPdfReport}
            disabled={!workingDataset}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <FileText size={13} />
            <span>Export PDF Audit</span>
          </button>
        </div>
      </div>

      {/* History Timeline: only transformations still applied to the working dataset */}
      {appliedHistory.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
          <Clock size={36} className="mx-auto text-slate-300" />
          <h3 className="text-base font-semibold text-slate-800">
            No transformations applied
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Operations applied in the Cleaning Studio or through the AI Assistant will appear here. Undone steps are hidden while remaining available through Undo/Redo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative pl-6 border-l-2 border-emerald-200 space-y-6">
            {appliedHistory.map((entry, idx) => {
              const isCurrent = idx === appliedHistory.length - 1;

              return (
                <div key={entry.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 transition-all ${
                      isCurrent
                        ? 'border-emerald-600 bg-emerald-600 ring-4 ring-emerald-100'
                        : 'border-emerald-500 bg-white'
                    }`}
                  />

                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-white border-emerald-300 shadow-sm'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="audit-entry-header flex items-center justify-between gap-3">
                      <div className="min-w-0 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {entry.operationName}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-800">
                          Applied
                        </span>
                      </div>

                      <span className="shrink-0 text-[11px] text-slate-400 font-mono">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span>
                        <strong className="text-slate-900">{entry.cellsChanged}</strong> cells
                        modified
                      </span>
                      <span>
                        <strong className="text-slate-900">{entry.rowsAffected}</strong> rows
                        affected
                      </span>
                      {entry.rowsRemoved > 0 && (
                        <span className="text-rose-600 font-medium">
                          <strong>{entry.rowsRemoved}</strong> rows removed
                        </span>
                      )}
                    </div>

                    {/* Configuration parameters summary */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                      {entry.config.targetColumns && (
                        <span>Target: {entry.config.targetColumns.join(', ')} | </span>
                      )}
                      {entry.config.targetRows && (
                        <span>{entry.config.targetRows.length} selected row{entry.config.targetRows.length === 1 ? '' : 's'} | </span>
                      )}
                      {entry.config.fillStrategy && (
                        <span>Strategy: {entry.config.fillStrategy} | </span>
                      )}
                      {entry.config.headerStyle && (
                        <span>Style: {entry.config.headerStyle} | </span>
                      )}
                      <span>Action ID: {entry.actionId}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
