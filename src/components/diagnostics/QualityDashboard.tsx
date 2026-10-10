'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Wrench,
  ArrowRight,
  TrendingUp,
  Database,
  BarChart2,
  Filter,
  Check,
  Zap,
  RefreshCw,
} from 'lucide-react';
import type { IssueSeverity } from '@/types';
import { EmptyState } from '@/components/common/EmptyState';

export function QualityDashboard() {
  const workingDataset = useAppStore((s) => s.workingDataset);
  const qualityScore = useAppStore((s) => s.qualityScore);
  const initialQualityScore = useAppStore((s) => s.initialQualityScore);
  const profile = useAppStore((s) => s.profile);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const applyOperation = useAppStore((s) => s.applyOperation);
  const refreshDiagnostics = useAppStore((s) => s.refreshDiagnostics);
  const refreshAIAnalysis = useAppStore((s) => s.refreshAIAnalysis);

  const [severityFilter, setSeverityFilter] = useState<'all' | IssueSeverity>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const handleRefresh = () => {
    refreshDiagnostics();
    refreshAIAnalysis();
    setIsRefreshing(true);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => setIsRefreshing(false), 450);
  };

  if (!workingDataset || !qualityScore || !profile) {
    return (
      <EmptyState
        title="Data Health Diagnostics & Quality Profiling"
        description="Inspect data quality scores across 4 key pillars: Completeness, Validity, Uniqueness, and Consistency. Discover issues automatically before cleaning."
        featureBadge="Data Profiler"
        features={[
          'Overall Health Score (0-100) calculated mathematically',
          '4-Pillar breakdown with weighted diagnostic penalties',
          'Automated issue detection with severity tiers and one-click fixes',
          'Detailed column-level data type and null distribution charts'
        ]}
      />
    );
  }

  const scoreDelta = initialQualityScore
    ? qualityScore.overall - initialQualityScore.overall
    : 0;

  const filteredIssues = qualityScore.issues.filter((issue) => {
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    if (searchTerm) {
      const matchText = `${issue.issue} ${issue.column || ''} ${issue.details || ''}`.toLowerCase();
      if (!matchText.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getSeverityBadge = (severity: IssueSeverity) => {
    switch (severity) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">Low</span>;
    }
  };

  return (
    <div className="quality-dashboard max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-fadeIn">
      {/* Current dataset actions */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Current dataset</p>
          <p className="truncate text-sm font-bold text-slate-900" title={workingDataset.meta.fileName}>
            {workingDataset.meta.fileName}
          </p>
          <p className="text-[11px] text-slate-500">Health and recommendations are based on the cleaned working copy.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing…' : 'Refresh health'}
          </button>
        </div>
      </div>

      {/* Top Banner / Metrics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Quality Score Gauge */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>HEALTH SCORE</span>
            {scoreDelta > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <TrendingUp size={14} /> +{scoreDelta} pts
              </span>
            )}
          </div>

          <div className="my-4 relative flex items-center justify-center">
            <div
              className={`w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center transition-all ${
                qualityScore.overall >= 80
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50/30'
                  : qualityScore.overall >= 60
                  ? 'border-amber-500 text-amber-700 bg-amber-50/30'
                  : 'border-rose-500 text-rose-700 bg-rose-50/30'
              }`}
            >
              <span className="text-4xl font-extrabold tracking-tight">
                {qualityScore.overall}
              </span>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                out of 100
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-center">
            {qualityScore.overall >= 80 ? (
              <span className="text-emerald-700 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 size={14} /> Production Ready
              </span>
            ) : qualityScore.overall >= 60 ? (
              <span className="text-amber-700 font-semibold flex items-center justify-center gap-1">
                <AlertTriangle size={14} /> Requires Normalization
              </span>
            ) : (
              <span className="text-rose-700 font-semibold flex items-center justify-center gap-1">
                <ShieldAlert size={14} /> Critical Data Hygiene Issues
              </span>
            )}
          </div>
        </div>

        {/* 4 Pillars Dimensions */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="quality-dimensions-header flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Data Quality Dimensions
            </h3>
            <span className="text-xs text-slate-500">
              Evaluated across 4 architectural pillars
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(qualityScore.dimensions).map(([key, dim]) => (
              <div key={key} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800 capitalize">{dim.name}</span>
                  <span className="font-bold text-slate-900">{dim.score}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(dim.score)}`}
                    style={{ width: `${Math.max(5, dim.score)}%` }}
                  />
                </div>
                {dim.penalties.length > 0 ? (
                  <p className="text-[11px] text-slate-500 truncate" title={dim.penalties.join(', ')}>
                    {dim.penalties[0]}
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                    <Check size={12} /> Flawless
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dataset Vital Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">TOTAL ROWS</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {profile.totalRows.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {profile.emptyRowCount > 0 ? `${profile.emptyRowCount} empty rows` : '0 blank rows'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">COLUMNS</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {profile.totalColumns}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {profile.emptyColumnCount > 0 ? `${profile.emptyColumnCount} empty cols` : 'All populated'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">EXACT DUPLICATES</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {profile.exactDuplicateCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Identified for deduplication
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">IDENTIFIED ISSUES</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {qualityScore.issues.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {qualityScore.issues.filter((i) => i.severity === 'high').length} high severity
          </div>
        </div>
      </div>

      {/* Issues Diagnostic Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Diagnosed Data Quality Anomalies ({filteredIssues.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific defects categorized by impact and automated remediation availability
            </p>
          </div>

          <div className="quality-issues-toolbar flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
              {(['all', 'high', 'medium', 'low'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1 rounded-lg capitalize transition-colors font-medium ${
                    severityFilter === sev
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentView('workspace')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <Wrench size={14} />
              <span>Open Cleaning Studio</span>
            </button>
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
            No issues found matching this filter! Your dataset is looking clean.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="quality-issue-row p-4 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    {getSeverityBadge(issue.severity)}
                    {issue.column && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-medium">
                        {issue.column}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-slate-900">
                      {issue.issue}
                    </span>
                  </div>
                  {issue.details && (
                    <p className="text-xs text-slate-600 pl-0.5">
                      {issue.details}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-medium text-slate-500">
                    {issue.affectedCount} affected {issue.affectedCount === 1 ? 'cell' : 'records'}
                  </span>
                  <button
                    onClick={() => setCurrentView('workspace')}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Fix in workspace"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Column Profiler Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">
            Column Structure & Hygiene Profiler ({profile.columns.length} columns)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Deep statistical profiling for missing values, unique values, and anomalies per column
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="responsive-table w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Column Name</th>
                <th className="py-3 px-4">Inferred Type</th>
                <th className="py-3 px-4">Missing / Nulls</th>
                <th className="py-3 px-4">Distinct</th>
                <th className="py-3 px-4">Whitespace / Format Flaws</th>
                <th className="py-3 px-4">Sample Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {profile.columns.map((col) => {
                const missingPct = Math.round(col.missingPercent);
                const hasIssues =
                  col.missingCount > 0 ||
                  col.leadingWhitespaceCount > 0 ||
                  col.trailingWhitespaceCount > 0 ||
                  col.dateFormatInconsistencies > 0;

                return (
                  <tr key={col.columnId} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {col.columnName}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        col.inferredType === 'number' ? 'bg-blue-50 text-blue-700' :
                        col.inferredType === 'date' ? 'bg-purple-50 text-purple-700' :
                        col.inferredType === 'boolean' ? 'bg-teal-50 text-teal-700' :
                        col.inferredType === 'mixed' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {col.inferredType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              missingPct > 20 ? 'bg-rose-500' : missingPct > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(5, missingPct)}%` }}
                          />
                        </div>
                        <span className={missingPct > 0 ? 'text-amber-700 font-medium' : 'text-slate-400'}>
                          {col.missingCount} ({missingPct}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {col.distinctCount} unique
                    </td>
                    <td className="py-3 px-4">
                      {col.leadingWhitespaceCount + col.trailingWhitespaceCount > 0 ? (
                        <span className="text-amber-600 font-medium">
                          {col.leadingWhitespaceCount + col.trailingWhitespaceCount} whitespace issues
                        </span>
                      ) : col.dateFormatInconsistencies > 0 ? (
                        <span className="text-purple-600 font-medium">
                          {col.dateFormatInconsistencies} date format flaws
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                      {col.sampleValues.slice(0, 3).map((v) => (v === null ? 'null' : String(v))).join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
