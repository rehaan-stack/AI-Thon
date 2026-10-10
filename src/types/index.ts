/**
 * Core domain types for the Tabulytix data cleaning platform.
 */

// ────────────────────────────────────────────────────────────────
// Cell & Row
// ────────────────────────────────────────────────────────────────

/** A cell can hold a string, number, boolean, Date, null, or undefined. */
export type CellValue = string | number | boolean | Date | null | undefined;

/** A row is a record keyed by column id. Includes a stable __rowId. */
export interface DataRow {
  __rowId: string;
  [columnId: string]: CellValue;
}

// ────────────────────────────────────────────────────────────────
// Column
// ────────────────────────────────────────────────────────────────

export type InferredType = 'string' | 'number' | 'boolean' | 'date' | 'mixed' | 'empty' | 'unknown';

export interface ColumnMeta {
  /** Internal stable id (e.g., "col_0") */
  id: string;
  /** Current display name */
  name: string;
  /** Original header name from the imported file */
  originalName: string;
  /** Zero-based column index in original file */
  originalIndex: number;
  /** Inferred data type */
  inferredType: InferredType;
}

// ────────────────────────────────────────────────────────────────
// Dataset
// ────────────────────────────────────────────────────────────────

export interface DatasetMeta {
  fileName: string;
  fileSize: number;
  fileFormat: 'csv' | 'tsv' | 'xlsx' | 'xls';
  detectedDelimiter?: string;
  encoding: string;
  rowCount: number;
  columnCount: number;
  selectedSheet?: string;
  availableSheets?: string[];
  parseWarnings: string[];
  importedAt: string;
}

export interface Dataset {
  meta: DatasetMeta;
  columns: ColumnMeta[];
  rows: DataRow[];
}

// ────────────────────────────────────────────────────────────────
// Profiling
// ────────────────────────────────────────────────────────────────

export interface ColumnProfile {
  columnId: string;
  columnName: string;
  originalName: string;
  inferredType: InferredType;
  totalCount: number;
  missingCount: number;
  missingPercent: number;
  distinctCount: number;
  duplicateValueCount: number;
  sampleValues: CellValue[];
  leadingWhitespaceCount: number;
  trailingWhitespaceCount: number;
  excessiveInternalWhitespace: number;
  mixedTypeCount: number;
  parseFailures: number;
  dateFormatInconsistencies: number;
  numericFormatInconsistencies: number;
  categoricalInconsistencies: number;
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    q1: number;
    q3: number;
    outlierCount: number;
  };
}

export interface DataProfile {
  columns: ColumnProfile[];
  totalRows: number;
  totalColumns: number;
  emptyRowCount: number;
  emptyColumnCount: number;
  exactDuplicateCount: number;
  profiledAt: string;
}

// ────────────────────────────────────────────────────────────────
// Quality
// ────────────────────────────────────────────────────────────────

export type IssueSeverity = 'high' | 'medium' | 'low';

export interface DataQualityIssue {
  id: string;
  column?: string;
  columnId?: string;
  issue: string;
  severity: IssueSeverity;
  affectedCount: number;
  details?: string;
}

export interface QualityDimension {
  name: string;
  score: number;
  weight: number;
  penalties: string[];
}

export interface QualityScore {
  overall: number;
  dimensions: {
    completeness: QualityDimension;
    uniqueness: QualityDimension;
    consistency: QualityDimension;
    structuralHygiene: QualityDimension;
  };
  issues: DataQualityIssue[];
  calculatedAt: string;
}

// ────────────────────────────────────────────────────────────────
// Cleaning Operations
// ────────────────────────────────────────────────────────────────

export type CleaningActionId =
  | 'trim_whitespace'
  | 'deduplicate_rows'
  | 'deduplicate_by_keys'
  | 'normalize_headers'
  | 'normalize_dates'
  | 'normalize_emails'
  | 'coerce_numeric'
  | 'fill_missing'
  | 'drop_missing_rows'
  | 'drop_empty_rows'
  | 'harmonize_categories'
  | 'detect_outliers'
  | 'normalize_boolean'
  | 'normalize_percentages'
  | 'rename_column'
  | 'delete_column'
  | 'duplicate_column'
  | 'reorder_columns'
  | 'title_case_text'
  | 'uppercase_text'
  | 'lowercase_text'
  | 'collapse_whitespace'
  | 'remove_currency_symbols';

export type HeaderStyle = 'snake_case' | 'camelCase' | 'Title Case' | 'lowercase_clean';

export type MissingFillStrategy =
  | 'mean'
  | 'median'
  | 'mode'
  | 'custom'
  | 'forward_fill'
  | 'unknown';

export interface CleaningConfig {
  actionId: CleaningActionId;
  targetColumns?: string[];
  /** Stable row ids to scope row-aware transformations. Omit to process all rows. */
  targetRows?: string[];
  /** For deduplication */
  keyColumns?: string[];
  keepOccurrence?: 'first' | 'last';
  /** For missing value handling */
  fillStrategy?: MissingFillStrategy;
  customFillValue?: string;
  /** For header normalization */
  headerStyle?: HeaderStyle;
  /** For rename */
  newName?: string;
  /** For column reorder */
  newOrder?: string[];
  /** For category harmonization */
  categoryMappings?: Record<string, string>;
  /** For date normalization */
  dateInputFormat?: string;
  /** For percentage normalization */
  percentageMode?: 'decimal' | 'numeric'; // 25% -> 0.25 or 25
  /** For currency removal */
  currencySymbols?: string[];
  /** For custom missing value tokens */
  missingTokens?: string[];
}

export interface OperationResult {
  success: boolean;
  actionId: CleaningActionId;
  config: CleaningConfig;
  timestamp: string;
  rowsAffected: number;
  cellsChanged: number;
  rowsRemoved: number;
  rowsAdded: number;
  warnings: string[];
  errors: string[];
  /** The resulting dataset after the operation */
  resultDataset?: Dataset;
  /** Detailed changes for undo */
  changes?: CellChange[];
}

export interface CellChange {
  rowId: string;
  columnId: string;
  oldValue: CellValue;
  newValue: CellValue;
}

// ────────────────────────────────────────────────────────────────
// History & Undo/Redo
// ────────────────────────────────────────────────────────────────

export type OperationStatus = 'applied' | 'undone' | 'reapplied';

export interface HistoryEntry {
  id: string;
  operationName: string;
  actionId: CleaningActionId;
  config: CleaningConfig;
  timestamp: string;
  status: OperationStatus;
  rowsAffected: number;
  cellsChanged: number;
  rowsRemoved: number;
  warnings: string[];
  /** Snapshot of the dataset before this operation (for undo) */
  snapshotBefore: Dataset;
}

// ────────────────────────────────────────────────────────────────
// AI Recommendations
// ────────────────────────────────────────────────────────────────

export interface AIRecommendation {
  step: number;
  actionId: CleaningActionId;
  target: string;
  title: string;
  reason: string;
  severity: IssueSeverity;
  estimatedImpact?: string;
  requiresConfirmation: boolean;
  config?: Partial<CleaningConfig>;
}

export interface AIAnalysis {
  summary: string;
  healthScore: number;
  topIssues: DataQualityIssue[];
  recommendedPipeline: AIRecommendation[];
  generatedAt: string;
  source: 'local' | 'gemini' | 'openai';
}

// ────────────────────────────────────────────────────────────────
// Export
// ────────────────────────────────────────────────────────────────

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  filename?: string;
  sheetName?: string;
  includeHeaders: boolean;
}

export interface AuditReportData {
  productName: string;
  fileName: string;
  reportDate: string;
  originalRowCount: number;
  originalColumnCount: number;
  finalRowCount: number;
  finalColumnCount: number;
  initialQualityScore: number;
  finalQualityScore: number;
  qualityBreakdown: QualityScore;
  detectedIssues: DataQualityIssue[];
  appliedOperations: HistoryEntry[];
  remainingIssues: DataQualityIssue[];
  parseWarnings: string[];
}

// ────────────────────────────────────────────────────────────────
// Application State
// ────────────────────────────────────────────────────────────────

export type AppView =
  | 'landing'
  | 'home'
  | 'overview'
  | 'upload'
  | 'workspace'
  | 'comparison'
  | 'audit'
  | 'settings'
  | 'support';
