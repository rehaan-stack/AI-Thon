'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { exportXLSX } from '@/lib/export';
import {
  Wand2,
  Trash2,
  Undo2,
  Redo2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  Type,
  Layers,
  Calendar,
  DollarSign,
  Percent,
  Check,
  ChevronDown,
  Lightbulb,
  Download,
} from 'lucide-react';
import type { CleaningActionId, CleaningConfig, HeaderStyle, MissingFillStrategy } from '@/types';
import { isDestructive } from '@/lib/cleaning';
import { DataGrid } from '@/components/table/DataGrid';
import { EmptyState } from '@/components/common/EmptyState';

interface ActionDefinition {
  id: CleaningActionId;
  name: string;
  category: 'hygiene' | 'dedup' | 'missing' | 'formatting' | 'types' | 'schema';
  description: string;
  defaultConfig?: Partial<CleaningConfig>;
}

const CLEANING_ACTIONS: ActionDefinition[] = [
  // Hygiene
  {
    id: 'trim_whitespace',
    name: 'Trim Leading & Trailing Whitespace',
    category: 'hygiene',
    description: 'Strips unwanted leading, trailing, and double spacing from text values.',
  },
  {
    id: 'collapse_whitespace',
    name: 'Collapse Excessive Internal Spaces',
    category: 'hygiene',
    description: 'Compresses multi-spaces and newlines into single spaces.',
  },

  // Deduplication
  {
    id: 'deduplicate_rows',
    name: 'Remove Exact Duplicate Rows',
    category: 'dedup',
    description: 'Finds and drops identical duplicate rows across all columns.',
  },
  {
    id: 'deduplicate_by_keys',
    name: 'Deduplicate by Key Columns',
    category: 'dedup',
    description: 'Keeps first or last record for unique ID/Key combinations.',
    defaultConfig: { keepOccurrence: 'first' },
  },

  // Missing Values
  {
    id: 'drop_empty_rows',
    name: 'Drop Completely Empty Rows',
    category: 'missing',
    description: 'Deletes rows where every column contains empty or null values.',
  },
  {
    id: 'fill_missing',
    name: 'Impute Missing Values',
    category: 'missing',
    description: 'Fills blanks and nulls with mean, median, mode, forward-fill, or custom text.',
    defaultConfig: { fillStrategy: 'mode' },
  },
  {
    id: 'drop_missing_rows',
    name: 'Drop Rows With Null Values',
    category: 'missing',
    description: 'Removes rows that contain null or missing values in target columns.',
  },

  // Categories, schema & diagnostics
  {
    id: 'harmonize_categories',
    name: 'Harmonize Category Values',
    category: 'schema',
    description: 'Maps inconsistent labels such as USA, U.S.A., and United States to one value.',
  },
  {
    id: 'detect_outliers',
    name: 'Detect Numeric Outliers',
    category: 'schema',
    description: 'Flags values outside the IQR range without changing the dataset.',
  },
  {
    id: 'rename_column',
    name: 'Rename Column',
    category: 'schema',
    description: 'Changes one column name while preserving all of its data.',
  },
  {
    id: 'delete_column',
    name: 'Delete Column',
    category: 'schema',
    description: 'Removes an unwanted column and captures the change for undo.',
  },
  {
    id: 'duplicate_column',
    name: 'Duplicate Column',
    category: 'schema',
    description: 'Creates a copy of the selected column for derived calculations.',
  },
  {
    id: 'reorder_columns',
    name: 'Reorder Columns',
    category: 'schema',
    description: 'Rearranges the column order in the working dataset.',
  },

  // Formatting & Text
  {
    id: 'normalize_headers',
    name: 'Standardize Column Headers',
    category: 'formatting',
    description: 'Transforms header names to snake_case, camelCase, or Title Case.',
    defaultConfig: { headerStyle: 'snake_case' },
  },
  {
    id: 'normalize_emails',
    name: 'Clean & Validate Emails',
    category: 'formatting',
    description: 'Converts emails to lowercase, trims whitespace, and fixes basic syntax errors.',
  },
  {
    id: 'title_case_text',
    name: 'Convert Text to Title Case',
    category: 'formatting',
    description: 'Capitalizes the first letter of each word in customer names or addresses.',
  },
  {
    id: 'lowercase_text',
    name: 'Convert Text to Lowercase',
    category: 'formatting',
    description: 'Forces all target column strings to lowercase.',
  },
  {
    id: 'uppercase_text',
    name: 'Convert Text to Uppercase',
    category: 'formatting',
    description: 'Forces all target column strings to uppercase.',
  },

  // Types & Coercion
  {
    id: 'normalize_dates',
    name: 'Harmonize Date Formats (ISO-8601)',
    category: 'types',
    description: 'Converts mixed dates (DD/MM/YYYY, MM/DD/YYYY, month names) to standard YYYY-MM-DD.',
  },
  {
    id: 'remove_currency_symbols',
    name: 'Strip Currency Symbols & Parse Numbers',
    category: 'types',
    description: 'Cleans $, €, £, ¥ prefixes and commas to format pure numerical values.',
  },
  {
    id: 'normalize_percentages',
    name: 'Normalize Percentage Formats',
    category: 'types',
    description: 'Removes % signs and converts to either clean numeric or decimal notation.',
    defaultConfig: { percentageMode: 'numeric' },
  },
  {
    id: 'normalize_boolean',
    name: 'Harmonize Boolean Flags',
    category: 'types',
    description: 'Unifies yes/no, y/n, 1/0, true/false to boolean true/false values.',
  },
  {
    id: 'coerce_numeric',
    name: 'Coerce to Numeric Type',
    category: 'types',
    description: 'Strictly parses numbers, stripping commas and unparsable chars to NaN/null.',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Operations' },
  { id: 'hygiene', label: 'Hygiene & Spacing' },
  { id: 'dedup', label: 'Deduplication' },
  { id: 'missing', label: 'Missing Values' },
  { id: 'formatting', label: 'Formatting' },
  { id: 'types', label: 'Types & Coercion' },
  { id: 'schema', label: 'Schema & Diagnostics' },
];

export function CleaningStudio() {
  const workingDataset = useAppStore((s) => s.workingDataset);
  const applyOperation = useAppStore((s) => s.applyOperation);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const canUndo = useAppStore((s) => s.canUndo);
  const canRedo = useAppStore((s) => s.canRedo);
  const aiAnalysis = useAppStore((s) => s.aiAnalysis);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedActionId, setSelectedActionId] = useState<CleaningActionId>('trim_whitespace');
  const [targetColumns, setTargetColumns] = useState<string[]>([]);
  const [headerStyle, setHeaderStyle] = useState<HeaderStyle>('snake_case');
  const [fillStrategy, setFillStrategy] = useState<MissingFillStrategy>('mode');
  const [customFillValue, setCustomFillValue] = useState<string>('Unknown');
  const [keepOccurrence, setKeepOccurrence] = useState<'first' | 'last'>('first');
  const [percentageMode, setPercentageMode] = useState<'decimal' | 'numeric'>('numeric');
  const [newColumnName, setNewColumnName] = useState('');
  const [categoryMappingsText, setCategoryMappingsText] = useState('');
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [lastNotice, setLastNotice] = useState<string | null>(null);
  const actionListRef = useRef<HTMLDivElement>(null);

  // Start each filtered result at its first operation. This prevents a list
  // that was scrolled to the bottom in one category from appearing empty when
  // the user switches to a shorter category.
  useEffect(() => {
    actionListRef.current?.scrollTo({ top: 0 });
  }, [activeCategory]);

  if (!workingDataset) {
    return (
      <EmptyState
        title="Interactive Cleaning Workspace"
        description="Run 23 high-precision cleaning, schema, and diagnostic operations with instant before/after previews, column selectors, and multi-level Undo/Redo."
        featureBadge="Cleaning Studio"
        features={[
          'Whitespace trimming & invisible control character removal',
          'Key-based record deduplication with occurrence selection',
          'Date standardization (ISO 8601) & currency parsing',
          'Missing value imputation (Mean, Median, Mode, Custom fill)'
        ]}
      />
    );
  }

  const { columns } = workingDataset;
  const defaultColumnOrder = columns.map((column) => column.id);
  const resolvedColumnOrder =
    columnOrder.length === columns.length && columnOrder.every((id) => columns.some((column) => column.id === id))
      ? columnOrder
      : defaultColumnOrder;

  const currentActionDef =
    CLEANING_ACTIONS.find((a) => a.id === selectedActionId) || CLEANING_ACTIONS[0];

  const healthRecommendations = aiAnalysis?.recommendedPipeline.slice(0, 3) ?? [];

  const filteredActions =
    activeCategory === 'all'
      ? CLEANING_ACTIONS
      : CLEANING_ACTIONS.filter((a) => a.category === activeCategory);

  const handleToggleColumn = (colId: string) => {
    if (targetColumns.includes(colId)) {
      setTargetColumns(targetColumns.filter((id) => id !== colId));
    } else {
      setTargetColumns([...targetColumns, colId]);
    }
  };

  const handleSelectAllColumns = () => {
    if (targetColumns.length === columns.length) {
      setTargetColumns([]);
    } else {
      setTargetColumns(columns.map((c) => c.id));
    }
  };

  const handleApply = () => {
    const categoryMappings = categoryMappingsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce<Record<string, string>>((mappings, line) => {
        const separator = line.indexOf('=');
        if (separator > 0) {
          const from = line.slice(0, separator).trim();
          const to = line.slice(separator + 1).trim();
          if (from && to) mappings[from] = to;
        }
        return mappings;
      }, {});

    const config: CleaningConfig = {
      actionId: selectedActionId,
      targetColumns: targetColumns.length > 0 ? targetColumns : undefined,
      targetRows: selectedRowIds.length > 0 ? selectedRowIds : undefined,
      headerStyle: selectedActionId === 'normalize_headers' ? headerStyle : undefined,
      fillStrategy: selectedActionId === 'fill_missing' ? fillStrategy : undefined,
      customFillValue:
        selectedActionId === 'fill_missing' && fillStrategy === 'custom'
          ? customFillValue
          : undefined,
      keepOccurrence:
        selectedActionId === 'deduplicate_by_keys' ? keepOccurrence : undefined,
      percentageMode:
        selectedActionId === 'normalize_percentages' ? percentageMode : undefined,
      newName: selectedActionId === 'rename_column' ? newColumnName.trim() : undefined,
      categoryMappings:
        selectedActionId === 'harmonize_categories' ? categoryMappings : undefined,
      newOrder: selectedActionId === 'reorder_columns' ? resolvedColumnOrder : undefined,
    };

    const res = applyOperation(config);

    if (res.success) {
      setLastNotice(
        `Applied "${currentActionDef.name}": ${res.cellsChanged} cells modified, ${res.rowsRemoved} rows removed.`
      );
    } else {
      setLastNotice(`Operation failed: ${res.errors.join(', ')}`);
    }

    setTimeout(() => setLastNotice(null), 5000);
  };

  // Run full AI pipeline
  const handleRunAiPipeline = () => {
    if (!aiAnalysis || aiAnalysis.recommendedPipeline.length === 0) return;

    let appliedCount = 0;
    for (const rec of aiAnalysis.recommendedPipeline) {
      const res = applyOperation({
        actionId: rec.actionId,
        ...rec.config,
        targetRows: selectedRowIds.length > 0 ? selectedRowIds : undefined,
      });
      if (res.success) appliedCount++;
    }

    setLastNotice(`Successfully executed ${appliedCount} AI pipeline operations!`);
    setTimeout(() => setLastNotice(null), 5000);
  };

  const handleDownloadCleanedExcel = () => {
    if (!workingDataset) return;
    exportXLSX(workingDataset);
  };

  return (
    <div className="cleaning-workspace max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Action Bar with Undo/Redo & Auto-Clean */}
      <div className="cleaning-action-bar flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="cleaning-action-group flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Undo last operation (Ctrl+Z)"
          >
            <Undo2 size={14} />
            <span>Undo</span>
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Redo operation (Ctrl+Y)"
          >
            <Redo2 size={14} />
            <span>Redo</span>
          </button>

          <span className="h-5 w-px bg-slate-200 mx-2" />

          <button
            onClick={handleDownloadCleanedExcel}
            className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            title="Download the current cleaned working dataset as an Excel file"
          >
            <Download size={14} />
            <span>Download cleaned Excel</span>
          </button>

          {lastNotice && (
            <div className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fadeIn">
              {lastNotice}
            </div>
          )}
        </div>

        {aiAnalysis && aiAnalysis.recommendedPipeline.length > 0 && (
          <button
            onClick={handleRunAiPipeline}
            className="cleaning-ai-button px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Sparkles size={14} />
            <span>Execute AI Recommended Pipeline ({aiAnalysis.recommendedPipeline.length} steps)</span>
          </button>
        )}
      </div>

      {/* Main Studio Grid */}
      <div className="cleaning-main-grid grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Operations Catalog (Left Column) */}
        <div className="transformation-library-panel lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="transformation-library-header flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Transformation Library
            </h3>
            <span className="text-xs text-slate-500">{CLEANING_ACTIONS.length} tools</span>
          </div>

          {/* Category Tabs */}
          <div className="transformation-library-filters flex flex-wrap gap-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Action List */}
          <div ref={actionListRef} className="transformation-library-list space-y-2 pr-1">
            {filteredActions.map((action) => {
              const isSelected = selectedActionId === action.id;
              const destructive = isDestructive(action.id);
              const recommendation = aiAnalysis?.recommendedPipeline.find(
                (item) => item.actionId === action.id
              );

              return (
                <div
                  key={action.id}
                  onClick={() => setSelectedActionId(action.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                      : recommendation
                      ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-400 hover:bg-emerald-50/40'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{action.name}</span>
                      {recommendation && (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <Sparkles size={10} /> Recommended
                        </span>
                      )}
                    </div>
                    {destructive && (
                      <span className="ml-2 shrink-0 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-600">
                        Destructive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    {action.description}
                  </p>
                  {recommendation && (
                    <p className="mt-2 truncate text-xs font-semibold text-emerald-700" title={recommendation.reason}>
                      Health opportunity: {recommendation.target}
                      {recommendation.estimatedImpact ? ` · ${recommendation.estimatedImpact}` : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Configuration Panel (Right Column) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {currentActionDef.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {currentActionDef.description}
              </p>
            </div>

            {/* Target Columns Selection */}
            {selectedActionId !== 'normalize_headers' &&
              selectedActionId !== 'deduplicate_rows' &&
              selectedActionId !== 'drop_empty_rows' &&
              selectedActionId !== 'reorder_columns' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Target Columns
                    </label>
                    <button
                      onClick={handleSelectAllColumns}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {targetColumns.length === columns.length
                        ? 'Deselect All'
                        : 'Select All Columns'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 border border-slate-200">
                    {columns.map((col) => {
                      const isChecked = targetColumns.includes(col.id);
                      return (
                        <label
                          key={col.id}
                          className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-200/50"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleColumn(col.id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="truncate font-mono text-[11px]">{col.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {targetColumns.length === 0
                      ? 'No columns specified — will apply to all compatible columns by default.'
                      : `${targetColumns.length} of ${columns.length} columns selected.`}
                  </div>
                </div>
              )}

            {/* Header Normalization Options */}
            {selectedActionId === 'normalize_headers' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Target Naming Convention
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { id: 'snake_case', label: 'snake_case', sample: 'order_id, customer_email' },
                    { id: 'camelCase', label: 'camelCase', sample: 'orderId, customerEmail' },
                    { id: 'Title Case', label: 'Title Case', sample: 'Order Id, Customer Email' },
                    { id: 'lowercase_clean', label: 'lowercase clean', sample: 'order id, customer email' },
                  ].map((style) => (
                    <div
                      key={style.id}
                      onClick={() => setHeaderStyle(style.id as HeaderStyle)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        headerStyle === style.id
                          ? 'border-emerald-500 bg-emerald-50 text-slate-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="font-semibold">{style.label}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        {style.sample}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Value Strategy Options */}
            {selectedActionId === 'fill_missing' && (
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Imputation Strategy
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'mode', label: 'Mode (Most Frequent Value)' },
                    { id: 'mean', label: 'Mean (Numeric average)' },
                    { id: 'median', label: 'Median (Numeric middle)' },
                    { id: 'forward_fill', label: 'Forward Fill (Prior row)' },
                    { id: 'custom', label: 'Custom Replacement String' },
                  ].map((strat) => (
                    <div
                      key={strat.id}
                      onClick={() => setFillStrategy(strat.id as MissingFillStrategy)}
                      className={`p-2.5 rounded-xl border cursor-pointer ${
                        fillStrategy === strat.id
                          ? 'border-emerald-500 bg-emerald-50 font-semibold text-slate-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {strat.label}
                    </div>
                  ))}
                </div>

                {fillStrategy === 'custom' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Custom Value:</label>
                    <input
                      type="text"
                      value={customFillValue}
                      onChange={(e) => setCustomFillValue(e.target.value)}
                      placeholder="e.g. Unknown or N/A"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Deduplication Keep Occurrence */}
            {selectedActionId === 'deduplicate_by_keys' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Occurrence to Keep
                </label>
                <div className="flex gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="keepOccurrence"
                      checked={keepOccurrence === 'first'}
                      onChange={() => setKeepOccurrence('first')}
                    />
                    <span>Keep First (Earliest)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="keepOccurrence"
                      checked={keepOccurrence === 'last'}
                      onChange={() => setKeepOccurrence('last')}
                    />
                    <span>Keep Last (Most Recent)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Category Mapping Options */}
            {selectedActionId === 'harmonize_categories' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Category Mappings
                </label>
                <textarea
                  value={categoryMappingsText}
                  onChange={(event) => setCategoryMappingsText(event.target.value)}
                  placeholder={'One mapping per line, for example:\nUSA = United States\nU.S.A. = United States'}
                  rows={5}
                  className="w-full resize-y px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-[11px] text-slate-400">
                  Use <span className="font-mono">source = canonical value</span> on each line.
                </p>
              </div>
            )}

            {/* Column Rename Options */}
            {selectedActionId === 'rename_column' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  New Column Name
                </label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(event) => setNewColumnName(event.target.value)}
                  placeholder="Enter a new name for the selected column"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            )}

            {/* Column Ordering Options */}
            {selectedActionId === 'reorder_columns' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Column Order
                </label>
                <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {resolvedColumnOrder.map(
                    (columnId, index, order) => {
                      const column = columns.find((item) => item.id === columnId);
                      if (!column) return null;
                      return (
                        <div key={columnId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs">
                          <span className="truncate font-mono text-slate-700">{column.name}</span>
                          <span className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => {
                                const next = [...order];
                                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                setColumnOrder(next);
                              }}
                              className="rounded border border-slate-200 px-1.5 py-0.5 text-slate-500 disabled:opacity-30"
                              aria-label={`Move ${column.name} up`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={index === order.length - 1}
                              onClick={() => {
                                const next = [...order];
                                [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                setColumnOrder(next);
                              }}
                              className="rounded border border-slate-200 px-1.5 py-0.5 text-slate-500 disabled:opacity-30"
                              aria-label={`Move ${column.name} down`}
                            >
                              ↓
                            </button>
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Health Improvement Suggestions */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <Lightbulb size={17} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900">Health improvement suggestions</h4>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                    {healthRecommendations.length > 0
                      ? 'These are the highest-impact changes detected for this dataset.'
                      : 'No high-impact fixes are currently detected. Your dataset is in good shape.'}
                  </p>
                </div>
              </div>

              {healthRecommendations.length > 0 && (
                <div className="space-y-2">
                  {healthRecommendations.map((recommendation) => (
                    <div
                      key={`${recommendation.step}-${recommendation.actionId}-${recommendation.target}`}
                      className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                              {recommendation.step}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{recommendation.title}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${
                              recommendation.severity === 'high'
                                ? 'bg-rose-100 text-rose-700'
                                : recommendation.severity === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {recommendation.severity} priority
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{recommendation.reason}</p>
                          {recommendation.estimatedImpact && (
                            <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                              Expected impact: {recommendation.estimatedImpact}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 truncate font-mono text-[10px] text-slate-400" title={recommendation.target}>
                        Target: {recommendation.target}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {selectedRowIds.length > 0
                ? `${selectedRowIds.length} selected row${selectedRowIds.length === 1 ? '' : 's'} · `
                : ''}
              Safe & non-destructive: snapshot captured for 1-click undo.
            </span>

            <button
              onClick={handleApply}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Play size={14} />
              <span>Apply Transformation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Data Preview Section */}
      <div className="space-y-3 pt-4">
        <h3 className="text-base font-bold text-slate-900">
          Live Working Dataset Preview
        </h3>
        <DataGrid
          selectedColumnIds={targetColumns}
          onSelectedColumnIdsChange={setTargetColumns}
          selectedRowIds={selectedRowIds}
          onSelectedRowIdsChange={setSelectedRowIds}
        />
      </div>
    </div>
  );
}
