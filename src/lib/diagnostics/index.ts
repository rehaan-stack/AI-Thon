/**
 * Data profiling and quality diagnostics engine.
 * Analyzes every column and row for quality issues.
 */
import {
  Dataset,
  DataProfile,
  ColumnProfile,
  QualityScore,
  QualityDimension,
  DataQualityIssue,
  IssueSeverity,
  CellValue,
} from '@/types';
import { APP_CONFIG } from '@/config/app-config';
import {
  isMissing,
  parseNumericString,
  looksLikeDate,
  looksLikeBoolean,
  mean as calcMean,
  median as calcMedian,
  stdDev as calcStdDev,
  now,
  generateId,
  levenshtein,
} from '@/lib/utils';

// ─────────────────────────── Column Profiling ───────────────────────────

export function profileColumn(
  columnId: string,
  columnName: string,
  originalName: string,
  values: CellValue[],
  inferredType: string
): ColumnProfile {
  const totalCount = values.length;
  let missingCount = 0;
  let leadingWhitespace = 0;
  let trailingWhitespace = 0;
  let excessiveInternalWS = 0;
  let parseFailures = 0;

  const nonMissingValues: CellValue[] = [];
  const stringValues: string[] = [];
  const numericValues: number[] = [];

  for (const v of values) {
    if (isMissing(v)) {
      missingCount++;
      continue;
    }
    nonMissingValues.push(v);
    const str = String(v);
    stringValues.push(str);

    if (typeof v === 'string') {
      if (v !== v.trimStart()) leadingWhitespace++;
      if (v !== v.trimEnd()) trailingWhitespace++;
      if (/\s{2,}/.test(v.trim())) excessiveInternalWS++;
    }

    const parsed = parseNumericString(str);
    if (parsed !== null) {
      numericValues.push(parsed);
    }
  }

  // Distinct values
  const distinctSet = new Set(stringValues.map(s => s.trim().toLowerCase()));
  const distinctCount = distinctSet.size;

  // Duplicate value frequency
  const freq = new Map<string, number>();
  for (const s of stringValues) {
    const key = s.trim();
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  let duplicateValueCount = 0;
  for (const count of freq.values()) {
    if (count > 1) duplicateValueCount += count - 1;
  }

  // Mixed type detection
  let typeCategories = { number: 0, date: 0, boolean: 0, string: 0 };
  for (const v of nonMissingValues) {
    const str = String(v).trim();
    if (str === '') continue;
    if (typeof v === 'number' || parseNumericString(str) !== null) {
      typeCategories.number++;
    } else if (looksLikeDate(str)) {
      typeCategories.date++;
    } else if (looksLikeBoolean(str)) {
      typeCategories.boolean++;
    } else {
      typeCategories.string++;
    }
  }
  const activeTypes = Object.values(typeCategories).filter(c => c > 0).length;
  const mixedTypeCount = activeTypes > 1 ? nonMissingValues.length : 0;

  // Date format inconsistencies
  let dateFormatInconsistencies = 0;
  if (inferredType === 'date' || inferredType === 'mixed') {
    const dateFormats = new Set<string>();
    for (const v of nonMissingValues) {
      const s = String(v).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) dateFormats.add('YYYY-MM-DD');
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) dateFormats.add('MM/DD/YYYY');
      else if (/^\d{2}-\d{2}-\d{4}$/.test(s)) dateFormats.add('DD-MM-YYYY');
      else if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) dateFormats.add('YYYY/MM/DD');
    }
    if (dateFormats.size > 1) {
      dateFormatInconsistencies = nonMissingValues.length;
    }
  }

  // Numeric format inconsistencies
  let numericFormatInconsistencies = 0;
  if (inferredType === 'number' || inferredType === 'mixed') {
    let hasCurrency = 0;
    let hasPercent = 0;
    let hasPlainNum = 0;
    for (const v of nonMissingValues) {
      const s = String(v).trim();
      if (/[$€£¥]/.test(s)) hasCurrency++;
      else if (s.includes('%')) hasPercent++;
      else if (parseNumericString(s) !== null) hasPlainNum++;
      else parseFailures++;
    }
    const numFmts = [hasCurrency, hasPercent, hasPlainNum].filter(c => c > 0).length;
    if (numFmts > 1) numericFormatInconsistencies = nonMissingValues.length;
  }

  // Categorical inconsistencies
  let categoricalInconsistencies = 0;
  if (inferredType === 'string' && distinctCount > 1 && distinctCount <= 50) {
    const canonicals = new Map<string, string[]>();
    for (const s of stringValues) {
      const key = s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!canonicals.has(key)) canonicals.set(key, []);
      canonicals.get(key)!.push(s.trim());
    }
    for (const variants of canonicals.values()) {
      const uniqueVariants = new Set(variants);
      if (uniqueVariants.size > 1) {
        categoricalInconsistencies += variants.length;
      }
    }
  }

  // Numeric stats
  let numericStats: ColumnProfile['numericStats'] = undefined;
  if (numericValues.length > 0) {
    const sorted = [...numericValues].sort((a, b) => a - b);
    const q1Idx = Math.floor(sorted.length * 0.25);
    const q3Idx = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Idx];
    const q3 = sorted[q3Idx];
    const iqr = q3 - q1;
    const lowerBound = q1 - APP_CONFIG.outlierIQRMultiplier * iqr;
    const upperBound = q3 + APP_CONFIG.outlierIQRMultiplier * iqr;
    const outlierCount = sorted.filter(v => v < lowerBound || v > upperBound).length;

    numericStats = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: calcMean(numericValues),
      median: calcMedian(sorted),
      stdDev: calcStdDev(numericValues),
      q1,
      q3,
      outlierCount,
    };
  }

  // Sample values
  const sampleValues = nonMissingValues.slice(0, 5);

  return {
    columnId,
    columnName,
    originalName,
    inferredType: inferredType as ColumnProfile['inferredType'],
    totalCount,
    missingCount,
    missingPercent: totalCount > 0 ? missingCount / totalCount : 0,
    distinctCount,
    duplicateValueCount,
    sampleValues,
    leadingWhitespaceCount: leadingWhitespace,
    trailingWhitespaceCount: trailingWhitespace,
    excessiveInternalWhitespace: excessiveInternalWS,
    mixedTypeCount,
    parseFailures,
    dateFormatInconsistencies,
    numericFormatInconsistencies,
    categoricalInconsistencies,
    numericStats,
  };
}

// ─────────────────────────── Dataset Profiling ───────────────────────────

export function profileDataset(dataset: Dataset): DataProfile {
  const columns: ColumnProfile[] = dataset.columns.map(col => {
    const values = dataset.rows.map(r => r[col.id]);
    return profileColumn(col.id, col.name, col.originalName, values, col.inferredType);
  });

  // Empty rows (all values missing)
  const emptyRowCount = dataset.rows.filter(row =>
    dataset.columns.every(col => isMissing(row[col.id]))
  ).length;

  // Empty columns
  const emptyColumnCount = columns.filter(cp => cp.missingCount === cp.totalCount).length;

  // Exact duplicate rows
  const rowHashes = new Set<string>();
  let exactDuplicateCount = 0;
  for (const row of dataset.rows) {
    const hash = dataset.columns.map(c => String(row[c.id] ?? '')).join('|');
    if (rowHashes.has(hash)) {
      exactDuplicateCount++;
    } else {
      rowHashes.add(hash);
    }
  }

  return {
    columns,
    totalRows: dataset.rows.length,
    totalColumns: dataset.columns.length,
    emptyRowCount,
    emptyColumnCount,
    exactDuplicateCount,
    profiledAt: now(),
  };
}

// ─────────────────────────── Quality Scoring ───────────────────────────

export function calculateQualityScore(dataset: Dataset, profile: DataProfile): QualityScore {
  const weights = APP_CONFIG.qualityWeights;
  const issues: DataQualityIssue[] = [];

  // ── Completeness ──
  const totalCells = profile.totalRows * profile.totalColumns;
  let totalMissing = 0;
  for (const col of profile.columns) {
    totalMissing += col.missingCount;
    if (col.missingPercent > 0.1) {
      issues.push({
        id: generateId(),
        column: col.columnName,
        columnId: col.columnId,
        issue: `${(col.missingPercent * 100).toFixed(1)}% missing values (${col.missingCount} cells)`,
        severity: col.missingPercent > 0.3 ? 'high' : 'medium',
        affectedCount: col.missingCount,
      });
    }
  }
  const completenessScore = totalCells > 0 ? Math.max(0, 1 - totalMissing / totalCells) * 100 : 100;
  const completenessPenalties: string[] = [];
  if (totalMissing > 0) {
    completenessPenalties.push(`${totalMissing} missing values across ${profile.columns.filter(c => c.missingCount > 0).length} columns`);
  }
  if (profile.emptyRowCount > 0) {
    completenessPenalties.push(`${profile.emptyRowCount} fully empty rows`);
    issues.push({
      id: generateId(),
      issue: `${profile.emptyRowCount} completely empty rows`,
      severity: 'medium',
      affectedCount: profile.emptyRowCount,
    });
  }

  // ── Uniqueness ──
  const duplicateRatio = profile.totalRows > 0 ? profile.exactDuplicateCount / profile.totalRows : 0;
  const uniquenessScore = Math.max(0, (1 - duplicateRatio * 3)) * 100; // Penalize duplicates
  const uniquenessPenalties: string[] = [];
  if (profile.exactDuplicateCount > 0) {
    uniquenessPenalties.push(`${profile.exactDuplicateCount} exact duplicate rows`);
    issues.push({
      id: generateId(),
      issue: `${profile.exactDuplicateCount} exact duplicate rows detected`,
      severity: profile.exactDuplicateCount > 5 ? 'high' : 'medium',
      affectedCount: profile.exactDuplicateCount,
    });
  }

  // ── Consistency ──
  let consistencyPenaltySum = 0;
  let consistencyChecks = 0;
  const consistencyPenalties: string[] = [];

  for (const col of profile.columns) {
    consistencyChecks++;
    let colPenalty = 0;

    if (col.mixedTypeCount > 0) {
      const ratio = col.mixedTypeCount / Math.max(1, col.totalCount - col.missingCount);
      colPenalty += ratio * 0.5;
      if (ratio > 0.1) {
        issues.push({
          id: generateId(),
          column: col.columnName,
          columnId: col.columnId,
          issue: `Mixed data types detected`,
          severity: 'medium',
          affectedCount: col.mixedTypeCount,
        });
      }
    }

    if (col.dateFormatInconsistencies > 0) {
      colPenalty += 0.3;
      consistencyPenalties.push(`Inconsistent date formats in "${col.columnName}"`);
      issues.push({
        id: generateId(),
        column: col.columnName,
        columnId: col.columnId,
        issue: `Inconsistent date formats`,
        severity: 'medium',
        affectedCount: col.dateFormatInconsistencies,
      });
    }

    if (col.categoricalInconsistencies > 0) {
      const ratio = col.categoricalInconsistencies / Math.max(1, col.totalCount - col.missingCount);
      colPenalty += ratio * 0.4;
      issues.push({
        id: generateId(),
        column: col.columnName,
        columnId: col.columnId,
        issue: `Potential categorical spelling variants`,
        severity: 'medium',
        affectedCount: col.categoricalInconsistencies,
      });
    }

    if (col.numericFormatInconsistencies > 0) {
      colPenalty += 0.2;
      issues.push({
        id: generateId(),
        column: col.columnName,
        columnId: col.columnId,
        issue: `Inconsistent numeric formatting`,
        severity: 'low',
        affectedCount: col.numericFormatInconsistencies,
      });
    }

    consistencyPenaltySum += Math.min(1, colPenalty);
  }

  const consistencyScore = consistencyChecks > 0
    ? Math.max(0, (1 - consistencyPenaltySum / consistencyChecks)) * 100
    : 100;

  // ── Structural Hygiene ──
  let structuralPenalty = 0;
  const structuralPenalties: string[] = [];

  // Dirty headers
  const dirtyHeaders = dataset.columns.filter(c => {
    const name = c.name;
    const originalName = c.originalName;
    return originalName !== originalName.trim()
      || /\s{2,}/.test(originalName)
      || /[#$%^&*()!@]/.test(originalName)
      || name !== originalName.trim();
  });
  if (dirtyHeaders.length > 0) {
    structuralPenalty += dirtyHeaders.length / dataset.columns.length * 0.4;
    structuralPenalties.push(`${dirtyHeaders.length} column names with special characters or extra whitespace`);
    issues.push({
      id: generateId(),
      issue: `${dirtyHeaders.length} messy column headers`,
      severity: 'low',
      affectedCount: dirtyHeaders.length,
      details: dirtyHeaders.map(h => `"${h.name}"`).join(', '),
    });
  }

  // Whitespace issues. Scale this penalty by the number of affected cells so a
  // single accidental space does not reduce an entire dataset by 30 points.
  const wsColumns = profile.columns.filter(c => c.leadingWhitespaceCount > 0 || c.trailingWhitespaceCount > 0);
  if (wsColumns.length > 0) {
    const totalCells = Math.max(1, profile.totalRows * profile.totalColumns);
    const whitespaceCells = dataset.columns.reduce((total, column) => {
      return total + dataset.rows.filter((row) => {
        const value = row[column.id];
        if (typeof value !== 'string') return false;
        const trimmed = value.trim();
        return value !== trimmed || /\s{2,}/.test(trimmed);
      }).length;
    }, 0);
    structuralPenalty += Math.min(0.3, (whitespaceCells / totalCells) * 0.3);
    structuralPenalties.push(`${whitespaceCells} cells with leading/trailing or repeated whitespace across ${wsColumns.length} columns`);
    issues.push({
      id: generateId(),
      issue: `Whitespace issues in ${wsColumns.length} columns (${whitespaceCells} cells)`,
      severity: 'low',
      affectedCount: whitespaceCells,
    });
  }

  // Empty columns
  if (profile.emptyColumnCount > 0) {
    structuralPenalty += profile.emptyColumnCount / dataset.columns.length * 0.3;
    structuralPenalties.push(`${profile.emptyColumnCount} empty columns`);
  }

  const structuralScore = Math.max(0, (1 - Math.min(1, structuralPenalty))) * 100;

  // ── Overall ──
  const overall = Math.round(
    completenessScore * weights.completeness +
    uniquenessScore * weights.uniqueness +
    consistencyScore * weights.consistency +
    structuralScore * weights.structuralHygiene
  );

  // Add outlier issues
  for (const col of profile.columns) {
    if (col.numericStats && col.numericStats.outlierCount > 0) {
      issues.push({
        id: generateId(),
        column: col.columnName,
        columnId: col.columnId,
        issue: `${col.numericStats.outlierCount} potential numeric outliers (IQR method)`,
        severity: col.numericStats.outlierCount > 3 ? 'medium' : 'low',
        affectedCount: col.numericStats.outlierCount,
      });
    }
  }

  return {
    overall: Math.max(0, Math.min(100, overall)),
    dimensions: {
      completeness: {
        name: 'Completeness',
        score: Math.round(completenessScore),
        weight: weights.completeness,
        penalties: completenessPenalties,
      },
      uniqueness: {
        name: 'Uniqueness',
        score: Math.round(uniquenessScore),
        weight: weights.uniqueness,
        penalties: uniquenessPenalties,
      },
      consistency: {
        name: 'Consistency',
        score: Math.round(consistencyScore),
        weight: weights.consistency,
        penalties: consistencyPenalties,
      },
      structuralHygiene: {
        name: 'Structural Hygiene',
        score: Math.round(structuralScore),
        weight: weights.structuralHygiene,
        penalties: structuralPenalties,
      },
    },
    issues: issues.sort((a, b) => {
      const sevOrder = { high: 0, medium: 1, low: 2 };
      return sevOrder[a.severity] - sevOrder[b.severity];
    }),
    calculatedAt: now(),
  };
}

/** Detect potential categorical variants for a column. */
export function detectCategoryVariants(values: CellValue[]): Record<string, string[]> {
  const groups = new Map<string, Set<string>>();
  for (const v of values) {
    if (isMissing(v)) continue;
    const str = String(v).trim();
    if (!str) continue;
    const key = str.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '');
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key)!.add(str);
  }

  const variants: Record<string, string[]> = {};
  for (const [key, variantSet] of groups.entries()) {
    if (variantSet.size > 1) {
      variants[key] = Array.from(variantSet);
    }
  }
  return variants;
}

/** Detect duplicate rows by key columns. */
export function findDuplicatesByKeys(
  dataset: Dataset,
  keyColumnIds: string[]
): { groups: Map<string, string[]>; totalDuplicates: number } {
  const groups = new Map<string, string[]>();

  for (const row of dataset.rows) {
    const key = keyColumnIds.map(cid => String(row[cid] ?? '').trim()).join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row.__rowId);
  }

  // Filter to only groups with duplicates
  const dupGroups = new Map<string, string[]>();
  let totalDuplicates = 0;
  for (const [key, rowIds] of groups.entries()) {
    if (rowIds.length > 1) {
      dupGroups.set(key, rowIds);
      totalDuplicates += rowIds.length - 1;
    }
  }

  return { groups: dupGroups, totalDuplicates };
}
