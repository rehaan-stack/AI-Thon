'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import {
  GitCompareArrows,
  CheckCircle2,
  TrendingUp,
  Filter,
  Layers,
  ArrowRight,
  Database,
  Search,
} from 'lucide-react';
import type { CellValue } from '@/types';
import { EmptyState } from '@/components/common/EmptyState';

export function DiffComparison() {
  const originalDataset = useAppStore((s) => s.originalDataset);
  const workingDataset = useAppStore((s) => s.workingDataset);
  const qualityScore = useAppStore((s) => s.qualityScore);
  const initialQualityScore = useAppStore((s) => s.initialQualityScore);

  const [viewMode, setViewMode] = useState<'side-by-side' | 'changelog'>('side-by-side');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!originalDataset || !workingDataset) {
    return (
      <EmptyState
        title="Side-by-Side Dataset Diff & Visual Changelog"
        description="Compare the original raw spreadsheet with your clean dataset side-by-side. Highlights modified cells with emerald indicators and filters for changed rows."
        featureBadge="Visual Diff"
        features={[
          'Synchronized side-by-side grid view with color-coded diff markers',
          'Searchable cell-level changelog with before and after values',
          'Instant filter toggle to show only modified rows',
          'Data health improvement metric tracker'
        ]}
      />
    );
  }

  // Calculate cell-level differences
  const diffData = useMemo(() => {
    const originalRowsMap = new Map(originalDataset.rows.map((r) => [r.__rowId, r]));
    const changes: {
      rowId: string;
      rowNum: number;
      columnName: string;
      columnId: string;
      originalValue: CellValue;
      newValue: CellValue;
    }[] = [];

    const changedRowIds = new Set<string>();

    workingDataset.rows.forEach((workingRow, idx) => {
      const origRow = originalRowsMap.get(workingRow.__rowId);
      if (!origRow) {
        // Newly added row
        changedRowIds.add(workingRow.__rowId);
        return;
      }

      workingDataset.columns.forEach((col) => {
        const origVal = origRow[col.id];
        const workVal = workingRow[col.id];

        const isDiff =
          origVal !== workVal &&
          !(origVal === null && workVal === null) &&
          !(origVal === undefined && workVal === null);

        if (isDiff) {
          changes.push({
            rowId: workingRow.__rowId,
            rowNum: idx + 1,
            columnName: col.name,
            columnId: col.id,
            originalValue: origVal,
            newValue: workVal,
          });
          changedRowIds.add(workingRow.__rowId);
        }
      });
    });

    const removedRowCount = Math.max(0, originalDataset.rows.length - workingDataset.rows.length);

    return {
      changes,
      changedRowIds,
      removedRowCount,
    };
  }, [originalDataset, workingDataset]);

  const scoreDelta =
    qualityScore && initialQualityScore
      ? qualityScore.overall - initialQualityScore.overall
      : 0;

  // Filtered rows for Side-by-side view
  const displayRows = useMemo(() => {
    let rows = workingDataset.rows;
    if (onlyChanged) {
      rows = rows.filter((r) => diffData.changedRowIds.has(r.__rowId));
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter((r) =>
        workingDataset.columns.some((c) => String(r[c.id] || '').toLowerCase().includes(q))
      );
    }
    return rows;
  }, [workingDataset, onlyChanged, searchTerm, diffData.changedRowIds]);

  return (
    <div className="diff-comparison max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Metrics Comparison Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Health Score Evolution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Quality Evolution
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-slate-500">
              {initialQualityScore?.overall || 0}
            </span>
            <ArrowRight size={18} className="text-emerald-500" />
            <span className="text-3xl font-extrabold text-emerald-600">
              {qualityScore?.overall || 0}
            </span>
            {scoreDelta > 0 && (
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                +{scoreDelta} pts
              </span>
            )}
          </div>
        </div>

        {/* Rows Delta */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Rows Preserved / Purged
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-slate-500">
              {originalDataset.rows.length}
            </span>
            <ArrowRight size={18} className="text-slate-400" />
            <span className="text-3xl font-extrabold text-slate-900">
              {workingDataset.rows.length}
            </span>
            {diffData.removedRowCount > 0 && (
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                -{diffData.removedRowCount} bad rows
              </span>
            )}
          </div>
        </div>

        {/* Total Cells Modified */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Cells Rectified
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">
            {diffData.changes.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">
            Across {diffData.changedRowIds.size} modified records
          </div>
        </div>

        {/* Columns Preserved */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Schema Hygiene
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {workingDataset.columns.length} cols
          </div>
          <div className="text-[11px] text-slate-500">
            Original: {originalDataset.columns.length} columns
          </div>
        </div>
      </div>

      {/* View Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="diff-toolbar-group flex items-center gap-2">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Side-by-Side Comparison
          </button>
          <button
            onClick={() => setViewMode('changelog')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'changelog'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cell-Level Change Log ({diffData.changes.length})
          </button>
        </div>

        <div className="diff-toolbar-options flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyChanged}
              onChange={(e) => setOnlyChanged(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Show Only Modified Rows ({diffData.changedRowIds.size})</span>
          </label>
        </div>
      </div>

      {/* Main Diff Content */}
      {viewMode === 'changelog' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">
              Cell-Level Audit Differences
            </h3>
          </div>
          <div className="responsive-table-scroll overflow-x-auto max-h-[600px]">
            <table className="responsive-table w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 sticky top-0 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Row #</th>
                  <th className="py-2.5 px-3">Column</th>
                  <th className="py-2.5 px-3">Raw / Original Value</th>
                  <th className="py-2.5 px-3">Normalized / Cleaned Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {diffData.changes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 font-sans">
                      No cell differences detected yet.
                    </td>
                  </tr>
                ) : (
                  diffData.changes.map((ch, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-slate-400 font-medium">{ch.rowNum}</td>
                      <td className="py-2 px-3 text-slate-900 font-semibold">{ch.columnName}</td>
                      <td className="py-2 px-3 text-rose-700 bg-rose-50/30 line-through">
                        {ch.originalValue === null || ch.originalValue === undefined
                          ? 'null'
                          : String(ch.originalValue)}
                      </td>
                      <td className="py-2 px-3 text-emerald-700 bg-emerald-50/50 font-bold">
                        {ch.newValue === null || ch.newValue === undefined
                          ? 'null'
                          : String(ch.newValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Side by Side View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original View */}
          <div className="diff-table-panel bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[550px]">
            <div className="diff-table-header p-3 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between gap-2">
              <span>Original Input ({originalDataset.rows.length} rows)</span>
              <span className="text-[11px] font-normal text-slate-500">Initial Import</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="responsive-table w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 font-mono text-[11px]">
                  <tr>
                    <th className="py-2 px-2.5 w-10 text-center">#</th>
                    {originalDataset.columns.map((c) => (
                      <th key={c.id} className="py-2 px-2.5 border-r border-slate-200 truncate">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {originalDataset.rows.slice(0, 100).map((row, i) => (
                    <tr key={row.__rowId} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 text-center text-slate-400">{i + 1}</td>
                      {originalDataset.columns.map((c) => (
                        <td key={c.id} className="py-1.5 px-2.5 border-r border-slate-100 truncate max-w-[120px]">
                          {row[c.id] === null || row[c.id] === undefined ? (
                            <span className="text-rose-500 font-sans text-[10px]">null</span>
                          ) : (
                            String(row[c.id])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cleaned Working View */}
          <div className="diff-table-panel bg-white rounded-2xl border border-emerald-300 shadow-sm overflow-hidden flex flex-col h-[550px]">
            <div className="diff-table-header p-3 bg-emerald-50 border-b border-emerald-200 font-bold text-xs text-emerald-900 flex items-center justify-between gap-2">
              <span>Cleaned Output ({workingDataset.rows.length} rows)</span>
              <span className="text-[11px] font-normal text-emerald-700">Analysis-Ready</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="responsive-table w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 font-mono text-[11px]">
                  <tr>
                    <th className="py-2 px-2.5 w-10 text-center">#</th>
                    {workingDataset.columns.map((c) => (
                      <th key={c.id} className="py-2 px-2.5 border-r border-slate-200 truncate">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {displayRows.slice(0, 100).map((row, i) => {
                    const isChangedRow = diffData.changedRowIds.has(row.__rowId);
                    return (
                      <tr
                        key={row.__rowId}
                        className={isChangedRow ? 'bg-emerald-50/30 hover:bg-emerald-50/50' : 'hover:bg-slate-50'}
                      >
                        <td className="py-1.5 px-2 text-center text-slate-400">{i + 1}</td>
                        {workingDataset.columns.map((c) => {
                          const val = row[c.id];
                          return (
                            <td key={c.id} className="py-1.5 px-2.5 border-r border-slate-100 truncate max-w-[120px]">
                              {val === null || val === undefined ? (
                                <span className="text-slate-400 font-sans text-[10px]">null</span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
