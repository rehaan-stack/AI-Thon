/**
 * Cleaning operations engine.
 * All operations take a Dataset and CleaningConfig and return an OperationResult.
 * Operations are pure functions that do not mutate the input.
 */
import {
  Dataset,
  DataRow,
  ColumnMeta,
  CleaningConfig,
  CleaningActionId,
  OperationResult,
  CellChange,
  CellValue,
  HeaderStyle,
} from '@/types';
import { APP_CONFIG } from '@/config/app-config';
import {
  deepClone,
  isMissing,
  parseNumericString,
  toSnakeCase,
  toCamelCase,
  toTitleCase,
  toLowercaseClean,
  now,
  generateId,
  mean as calcMean,
  median as calcMedian,
  mode as calcMode,
  makeUniqueHeaders,
  looksLikeBoolean,
} from '@/lib/utils';

function makeResult(
  actionId: CleaningActionId,
  config: CleaningConfig,
  dataset: Dataset,
  changes: CellChange[],
  rowsRemoved: number,
  rowsAdded: number,
  warnings: string[],
  errors: string[]
): OperationResult {
  return {
    success: errors.length === 0,
    actionId,
    config,
    timestamp: now(),
    rowsAffected: new Set(changes.map(c => c.rowId)).size + rowsRemoved,
    cellsChanged: changes.length,
    rowsRemoved,
    rowsAdded,
    warnings,
    errors,
    resultDataset: dataset,
    changes,
  };
}

// ────────────────────────── Deduplication ──────────────────────────

function deduplicateRows(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const keepOccurrence = config.keepOccurrence || 'first';
  const seen = new Map<string, number>();
  const toRemove = new Set<number>();

  for (let i = 0; i < ds.rows.length; i++) {
    const hash = ds.columns.map(c => String(ds.rows[i][c.id] ?? '')).join('|');
    if (seen.has(hash)) {
      if (keepOccurrence === 'first') {
        toRemove.add(i);
      } else {
        toRemove.add(seen.get(hash)!);
        seen.set(hash, i);
      }
    } else {
      seen.set(hash, i);
    }
  }

  if (toRemove.size === 0) {
    return makeResult('deduplicate_rows', config, ds, [], 0, 0, ['No duplicate rows found.'], []);
  }

  ds.rows = ds.rows.filter((_, i) => !toRemove.has(i));
  ds.meta = { ...ds.meta, rowCount: ds.rows.length };

  return makeResult('deduplicate_rows', config, ds, [], toRemove.size, 0, [], []);
}

function deduplicateByKeys(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const keyColumns = config.keyColumns || [];
  if (keyColumns.length === 0) {
    return makeResult('deduplicate_by_keys', config, ds, [], 0, 0, [], ['No key columns specified.']);
  }

  const keepOccurrence = config.keepOccurrence || 'first';
  const seen = new Map<string, number>();
  const toRemove = new Set<number>();

  for (let i = 0; i < ds.rows.length; i++) {
    const hash = keyColumns.map(cid => String(ds.rows[i][cid] ?? '').trim()).join('|');
    if (seen.has(hash)) {
      if (keepOccurrence === 'first') {
        toRemove.add(i);
      } else {
        toRemove.add(seen.get(hash)!);
        seen.set(hash, i);
      }
    } else {
      seen.set(hash, i);
    }
  }

  if (toRemove.size === 0) {
    return makeResult('deduplicate_by_keys', config, ds, [], 0, 0, ['No duplicates found for the selected key columns.'], []);
  }

  ds.rows = ds.rows.filter((_, i) => !toRemove.has(i));
  ds.meta = { ...ds.meta, rowCount: ds.rows.length };

  return makeResult('deduplicate_by_keys', config, ds, [], toRemove.size, 0, [], []);
}

// ────────────────────────── Missing Values ──────────────────────────

function fillMissing(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || ds.columns.map(c => c.id);
  const strategy = config.fillStrategy || 'unknown';
  const changes: CellChange[] = [];
  const warnings: string[] = [];

  for (const colId of targetCols) {
    const col = ds.columns.find(c => c.id === colId);
    if (!col) continue;

    let fillValue: CellValue = null;

    if (strategy === 'mean' || strategy === 'median') {
      const numericValues: number[] = [];
      for (const row of ds.rows) {
        const v = row[colId];
        if (!isMissing(v)) {
          const parsed = typeof v === 'number' ? v : parseNumericString(String(v));
          if (parsed !== null && isFinite(parsed)) numericValues.push(parsed);
        }
      }
      if (numericValues.length === 0) {
        warnings.push(`Column "${col.name}": no valid numeric values for ${strategy} calculation.`);
        continue;
      }
      fillValue = strategy === 'mean'
        ? Math.round(calcMean(numericValues) * 100) / 100
        : calcMedian([...numericValues].sort((a, b) => a - b));
    } else if (strategy === 'mode') {
      const nonMissing = ds.rows.map(r => r[colId]).filter(v => !isMissing(v));
      fillValue = calcMode(nonMissing.map(v => String(v).trim()));
      if (fillValue === undefined) {
        warnings.push(`Column "${col.name}": no values for mode calculation.`);
        continue;
      }
    } else if (strategy === 'custom') {
      fillValue = config.customFillValue ?? '';
    } else if (strategy === 'unknown') {
      fillValue = 'Unknown';
    } else if (strategy === 'forward_fill') {
      // Handle forward fill row by row below
      let lastValue: CellValue = null;
      for (const row of ds.rows) {
        if (isMissing(row[colId])) {
          if (lastValue !== null) {
            changes.push({ rowId: row.__rowId, columnId: colId, oldValue: row[colId], newValue: lastValue });
            row[colId] = lastValue;
          }
        } else {
          lastValue = row[colId];
        }
      }
      continue;
    }

    if (fillValue === null) continue;

    for (const row of ds.rows) {
      if (isMissing(row[colId])) {
        changes.push({ rowId: row.__rowId, columnId: colId, oldValue: row[colId], newValue: fillValue });
        row[colId] = fillValue;
      }
    }
  }

  return makeResult('fill_missing', config, ds, changes, 0, 0, warnings, []);
}

function dropMissingRows(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || ds.columns.map(c => c.id);
  const originalCount = ds.rows.length;

  ds.rows = ds.rows.filter(row => !targetCols.some(colId => isMissing(row[colId])));
  const removed = originalCount - ds.rows.length;
  ds.meta = { ...ds.meta, rowCount: ds.rows.length };

  return makeResult('drop_missing_rows', config, ds, [], removed, 0,
    removed === 0 ? ['No rows with missing values in selected columns.'] : [], []);
}

function dropEmptyRows(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const originalCount = ds.rows.length;

  ds.rows = ds.rows.filter(row =>
    !ds.columns.every(col => isMissing(row[col.id]))
  );
  const removed = originalCount - ds.rows.length;
  ds.meta = { ...ds.meta, rowCount: ds.rows.length };

  return makeResult('drop_empty_rows', config, ds, [], removed, 0,
    removed === 0 ? ['No empty rows found.'] : [], []);
}

// ────────────────────────── Header Normalization ──────────────────────────

function normalizeHeaders(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const style: HeaderStyle = config.headerStyle || 'snake_case';
  const changes: CellChange[] = [];

  const converter = {
    snake_case: toSnakeCase,
    camelCase: toCamelCase,
    'Title Case': toTitleCase,
    lowercase_clean: toLowercaseClean,
  }[style];

  const newNames = ds.columns.map(c => converter(c.name));
  const uniqueNames = makeUniqueHeaders(newNames);

  for (let i = 0; i < ds.columns.length; i++) {
    const oldName = ds.columns[i].name;
    const newName = uniqueNames[i];
    if (oldName !== newName) {
      changes.push({
        rowId: 'header',
        columnId: ds.columns[i].id,
        oldValue: oldName,
        newValue: newName,
      });
      ds.columns[i].name = newName;
    }
  }

  return makeResult('normalize_headers', config, ds, changes, 0, 0,
    changes.length === 0 ? ['Headers already normalized.'] : [], []);
}

// ────────────────────────── Text Operations ──────────────────────────

function trimWhitespace(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || ds.columns.map(c => c.id);
  const changes: CellChange[] = [];

  for (const row of ds.rows) {
    for (const colId of targetCols) {
      const v = row[colId];
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed !== v) {
          changes.push({ rowId: row.__rowId, columnId: colId, oldValue: v, newValue: trimmed });
          row[colId] = trimmed;
        }
      }
    }
  }

  return makeResult('trim_whitespace', config, ds, changes, 0, 0,
    changes.length === 0 ? ['No whitespace to trim.'] : [], []);
}

function collapseWhitespace(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || ds.columns.map(c => c.id);
  const changes: CellChange[] = [];

  for (const row of ds.rows) {
    for (const colId of targetCols) {
      const v = row[colId];
      if (typeof v === 'string') {
        const collapsed = v.replace(/\s{2,}/g, ' ').trim();
        if (collapsed !== v) {
          changes.push({ rowId: row.__rowId, columnId: colId, oldValue: v, newValue: collapsed });
          row[colId] = collapsed;
        }
      }
    }
  }

  return makeResult('collapse_whitespace', config, ds, changes, 0, 0,
    changes.length === 0 ? ['No excessive whitespace found.'] : [], []);
}

function normalizeEmails(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || [];
  const changes: CellChange[] = [];

  for (const row of ds.rows) {
    for (const colId of targetCols) {
      const v = row[colId];
      if (typeof v === 'string' && v.includes('@')) {
        const lower = v.trim().toLowerCase();
        if (lower !== v) {
          changes.push({ rowId: row.__rowId, columnId: colId, oldValue: v, newValue: lower });
          row[colId] = lower;
        }
      }
    }
  }

  return makeResult('normalize_emails', config, ds, changes, 0, 0,
    changes.length === 0 ? ['Email values already normalized.'] : [], []);
}

function titleCaseText(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || [];
  const changes: CellChange[] = [];

  for (const row of ds.rows) {
    for (const colId of targetCols) {
      const v = row[colId];
      if (typeof v === 'string' && !isMissing(v)) {
        const titled = toTitleCase(v);
        if (titled !== v) {
          changes.push({ rowId: row.__rowId, columnId: colId, oldValue: v, newValue: titled });
          row[colId] = titled;
        }
      }
    }
  }

  return makeResult('title_case_text', config, ds, changes, 0, 0, [], []);
}

function uppercaseText(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || [];
  const changes: CellChange[] = [];

  for (const row of ds.rows) {
    for (const colId of targetCols) {
      const v = row[colId];
      if (typeof v === 'string' && !isMissing(v)) {
        const upper = v.trim().toUpperCase();
        if (upper !== v) {
          changes.push({ rowId: row.__rowId, columnId: colId, oldValue: v, newValue: upper });
          row[colId] = upper;
        }
      }
    }
  }

  return makeResult('uppercase_text', config, ds, changes, 0, 0, [], []);
}

function lowercaseText(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || [];
  const changes: CellChange[] = [];

  for (const row of ds.rows) {
    for (const colId of targetCols) {
      const v = row[colId];
      if (typeof v === 'string' && !isMissing(v)) {
        const lower = v.trim().toLowerCase();
        if (lower !== v) {
          changes.push({ rowId: row.__rowId, columnId: colId, oldValue: v, newValue: lower });
          row[colId] = lower;
        }
      }
    }
  }

  return makeResult('lowercase_text', config, ds, changes, 0, 0, [], []);
}

// ────────────────────────── Type Conversion ──────────────────────────

function coerceNumeric(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || [];
  const changes: CellChange[] = [];
  const warnings: string[] = [];
  const currencySymbols = config.currencySymbols || ['$', '€', '£', '¥'];

  for (const colId of targetCols) {
    let failures = 0;
    for (const row of ds.rows) {
      const v = row[colId];
      if (isMissing(v)) continue;
      if (typeof v === 'number') continue;
      const str = String(v).trim();
      const parsed = parseNumericString(str, currencySymbols);
      if (parsed !== null) {
        changes.push({ rowId: row.__rowId, columnId: colId, oldValue: v, newValue: parsed });
        row[colId] = parsed;
      } else {
        failures++;
      }
    }
    if (failures > 0) {
      const col = ds.columns.find(c => c.id === colId);
      warnings.push(`Column "${col?.name || colId}": ${failures} values could not be converted to numbers and were left unchanged.`);
    }
  }

  return makeResult('coerce_numeric', config, ds, changes, 0, 0, warnings, []);
}

function removeCurrencySymbols(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || [];
  const symbols = config.currencySymbols || ['$', '€', '£', '¥'];
  const changes: CellChange[] = [];

  for (const colId of targetCols) {
    for (const row of ds.rows) {
      const v = row[colId];
      if (typeof v === 'string') {
        let cleaned = v;
        for (const sym of symbols) {
          cleaned = cleaned.replace(new RegExp(`\\${sym}`, 'g'), '');
        }
        cleaned = cleaned.replace(/,/g, '').trim();
        if (cleaned !== v) {
          const num = Number(cleaned);
          const newVal = isFinite(num) ? num : cleaned;
          changes.push({ rowId: row.__rowId, columnId: colId, oldValue: v, newValue: newVal });
          row[colId] = newVal;
        }
      }
    }
  }

  return makeResult('remove_currency_symbols', config, ds, changes, 0, 0, [], []);
}

function normalizeDates(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || [];
  const inputFormat = config.dateInputFormat || 'MM/DD/YYYY';
  const changes: CellChange[] = [];
  const warnings: string[] = [];

  for (const colId of targetCols) {
    let failures = 0;
    for (const row of ds.rows) {
      const v = row[colId];
      if (isMissing(v)) continue;
      const str = String(v).trim();

      let date: Date | null = null;

      // Try YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        date = new Date(str + 'T00:00:00');
      }
      // Try YYYY/MM/DD
      else if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
        date = new Date(str.replace(/\//g, '-') + 'T00:00:00');
      }
      // Try MM/DD/YYYY or DD/MM/YYYY
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
        const parts = str.split('/');
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const y = parts[2];
        let m = p0;
        let d = p1;

        if (p0 > 12) {
          // p0 must be day
          d = p0;
          m = p1;
        } else if (p1 > 12) {
          // p1 must be day
          m = p0;
          d = p1;
        } else if (inputFormat === 'DD/MM/YYYY') {
          d = p0;
          m = p1;
        }

        const mStr = String(m).padStart(2, '0');
        const dStr = String(d).padStart(2, '0');
        date = new Date(`${y}-${mStr}-${dStr}T00:00:00`);
      }
      // Try DD-MM-YYYY or MM-DD-YYYY
      else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
        const parts = str.split('-');
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const y = parts[2];
        let m = p0;
        let d = p1;

        if (p0 > 12) {
          d = p0;
          m = p1;
        } else if (p1 > 12) {
          m = p0;
          d = p1;
        } else if (inputFormat === 'DD/MM/YYYY' || inputFormat === 'DD-MM-YYYY') {
          d = p0;
          m = p1;
        }

        const mStr = String(m).padStart(2, '0');
        const dStr = String(d).padStart(2, '0');
        date = new Date(`${y}-${mStr}-${dStr}T00:00:00`);
      }

      if (date && !isNaN(date.getTime())) {
        const iso = date.toISOString().split('T')[0];
        if (iso !== str) {
          changes.push({ rowId: row.__rowId, columnId: colId, oldValue: str, newValue: iso });
          row[colId] = iso;
        }
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        failures++;
      }
    }
    if (failures > 0) {
      const col = ds.columns.find(c => c.id === colId);
      warnings.push(`Column "${col?.name || colId}": ${failures} date values could not be parsed and were left unchanged.`);
    }
  }

  return makeResult('normalize_dates', config, ds, changes, 0, 0, warnings, []);
}

function normalizeBoolean(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || [];
  const changes: CellChange[] = [];

  const trueValues = new Set(['true', 'yes', 'y', '1', 'on']);
  const falseValues = new Set(['false', 'no', 'n', '0', 'off']);

  for (const colId of targetCols) {
    for (const row of ds.rows) {
      const v = row[colId];
      if (isMissing(v)) continue;
      const str = String(v).trim().toLowerCase();
      if (trueValues.has(str)) {
        changes.push({ rowId: row.__rowId, columnId: colId, oldValue: v, newValue: 'true' });
        row[colId] = 'true';
      } else if (falseValues.has(str)) {
        changes.push({ rowId: row.__rowId, columnId: colId, oldValue: v, newValue: 'false' });
        row[colId] = 'false';
      }
    }
  }

  return makeResult('normalize_boolean', config, ds, changes, 0, 0, [], []);
}

function normalizePercentages(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || [];
  const mode = config.percentageMode || 'decimal';
  const changes: CellChange[] = [];

  for (const colId of targetCols) {
    for (const row of ds.rows) {
      const v = row[colId];
      if (isMissing(v)) continue;
      const str = String(v).trim();
      if (str.endsWith('%')) {
        const num = Number(str.slice(0, -1));
        if (isFinite(num)) {
          const newVal = mode === 'decimal' ? num / 100 : num;
          changes.push({ rowId: row.__rowId, columnId: colId, oldValue: v, newValue: newVal });
          row[colId] = newVal;
        }
      }
    }
  }

  return makeResult('normalize_percentages', config, ds, changes, 0, 0, [], []);
}

// ────────────────────────── Categorical Harmonization ──────────────────────────

function harmonizeCategories(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || [];
  const mappings = config.categoryMappings || {};
  const changes: CellChange[] = [];

  for (const colId of targetCols) {
    for (const row of ds.rows) {
      const v = row[colId];
      if (isMissing(v)) continue;
      const str = String(v).trim();
      if (mappings[str] && mappings[str] !== str) {
        changes.push({ rowId: row.__rowId, columnId: colId, oldValue: str, newValue: mappings[str] });
        row[colId] = mappings[str];
      }
    }
  }

  return makeResult('harmonize_categories', config, ds, changes, 0, 0,
    changes.length === 0 ? ['No categorical values matched the mappings.'] : [], []);
}

// ────────────────────────── Column Operations ──────────────────────────

function renameColumn(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const colId = config.targetColumns?.[0];
  const newName = config.newName;

  if (!colId || !newName) {
    return makeResult('rename_column', config, ds, [], 0, 0, [], ['Column ID and new name are required.']);
  }

  const col = ds.columns.find(c => c.id === colId);
  if (!col) {
    return makeResult('rename_column', config, ds, [], 0, 0, [], ['Column not found.']);
  }

  const oldName = col.name;
  col.name = newName;

  return makeResult('rename_column', config, ds,
    [{ rowId: 'header', columnId: colId, oldValue: oldName, newValue: newName }], 0, 0, [], []);
}

function deleteColumn(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const colId = config.targetColumns?.[0];
  if (!colId) {
    return makeResult('delete_column', config, ds, [], 0, 0, [], ['No column specified.']);
  }

  const colIndex = ds.columns.findIndex(c => c.id === colId);
  if (colIndex === -1) {
    return makeResult('delete_column', config, ds, [], 0, 0, [], ['Column not found.']);
  }

  ds.columns.splice(colIndex, 1);
  for (const row of ds.rows) {
    delete row[colId];
  }
  ds.meta = { ...ds.meta, columnCount: ds.columns.length };

  return makeResult('delete_column', config, ds, [], 0, 0, [], []);
}

function duplicateColumn(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const colId = config.targetColumns?.[0];
  if (!colId) {
    return makeResult('duplicate_column', config, ds, [], 0, 0, [], ['No column specified.']);
  }

  const col = ds.columns.find(c => c.id === colId);
  if (!col) {
    return makeResult('duplicate_column', config, ds, [], 0, 0, [], ['Column not found.']);
  }

  const newColId = `col_${Date.now()}`;
  const newCol: ColumnMeta = {
    ...col,
    id: newColId,
    name: `${col.name}_copy`,
    originalName: col.originalName,
  };

  ds.columns.push(newCol);
  for (const row of ds.rows) {
    row[newColId] = row[colId];
  }
  ds.meta = { ...ds.meta, columnCount: ds.columns.length };

  return makeResult('duplicate_column', config, ds, [], 0, 1, [], []);
}

function reorderColumns(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const newOrder = config.newOrder;
  if (!newOrder || newOrder.length !== ds.columns.length) {
    return makeResult('reorder_columns', config, ds, [], 0, 0, [], ['Invalid column order.']);
  }

  ds.columns = newOrder.map(id => ds.columns.find(c => c.id === id)!).filter(Boolean);
  return makeResult('reorder_columns', config, ds, [], 0, 0, [], []);
}

// ────────────────────────── Outlier Detection ──────────────────────────

function detectOutliers(dataset: Dataset, config: CleaningConfig): OperationResult {
  const ds = deepClone(dataset);
  const targetCols = config.targetColumns || [];
  const warnings: string[] = [];

  for (const colId of targetCols) {
    const col = ds.columns.find(c => c.id === colId);
    if (!col) continue;

    const numericValues: { index: number; value: number }[] = [];
    for (let i = 0; i < ds.rows.length; i++) {
      const v = ds.rows[i][colId];
      if (!isMissing(v)) {
        const num = typeof v === 'number' ? v : parseNumericString(String(v));
        if (num !== null && isFinite(num)) {
          numericValues.push({ index: i, value: num });
        }
      }
    }

    if (numericValues.length < 4) {
      warnings.push(`Column "${col.name}": not enough numeric values for outlier detection.`);
      continue;
    }

    const sorted = [...numericValues].sort((a, b) => a.value - b.value);
    const q1 = sorted[Math.floor(sorted.length * 0.25)].value;
    const q3 = sorted[Math.floor(sorted.length * 0.75)].value;
    const iqr = q3 - q1;
    const lower = q1 - APP_CONFIG.outlierIQRMultiplier * iqr;
    const upper = q3 + APP_CONFIG.outlierIQRMultiplier * iqr;

    const outliers = numericValues.filter(v => v.value < lower || v.value > upper);
    if (outliers.length > 0) {
      warnings.push(
        `Column "${col.name}": ${outliers.length} potential outliers detected (values outside [${lower.toFixed(2)}, ${upper.toFixed(2)}]). No values were changed.`
      );
    } else {
      warnings.push(`Column "${col.name}": no outliers detected.`);
    }
  }

  // Outlier detection is read-only — we don't modify data
  return makeResult('detect_outliers', config, ds, [], 0, 0, warnings, []);
}

// ────────────────────────── Main Executor ──────────────────────────

const OPERATION_MAP: Record<CleaningActionId, (ds: Dataset, cfg: CleaningConfig) => OperationResult> = {
  trim_whitespace: trimWhitespace,
  collapse_whitespace: collapseWhitespace,
  deduplicate_rows: deduplicateRows,
  deduplicate_by_keys: deduplicateByKeys,
  normalize_headers: normalizeHeaders,
  normalize_dates: normalizeDates,
  normalize_emails: normalizeEmails,
  coerce_numeric: coerceNumeric,
  remove_currency_symbols: removeCurrencySymbols,
  fill_missing: fillMissing,
  drop_missing_rows: dropMissingRows,
  drop_empty_rows: dropEmptyRows,
  harmonize_categories: harmonizeCategories,
  detect_outliers: detectOutliers,
  normalize_boolean: normalizeBoolean,
  normalize_percentages: normalizePercentages,
  rename_column: renameColumn,
  delete_column: deleteColumn,
  duplicate_column: duplicateColumn,
  reorder_columns: reorderColumns,
  title_case_text: titleCaseText,
  uppercase_text: uppercaseText,
  lowercase_text: lowercaseText,
};

export const OPERATION_NAMES: Record<CleaningActionId, string> = {
  trim_whitespace: 'Trim Whitespace',
  collapse_whitespace: 'Collapse Whitespace',
  deduplicate_rows: 'Remove Duplicate Rows',
  deduplicate_by_keys: 'Remove Duplicates by Key',
  normalize_headers: 'Normalize Headers',
  normalize_dates: 'Normalize Dates',
  normalize_emails: 'Normalize Emails',
  coerce_numeric: 'Convert to Numbers',
  remove_currency_symbols: 'Remove Currency Symbols',
  fill_missing: 'Fill Missing Values',
  drop_missing_rows: 'Drop Rows with Missing Values',
  drop_empty_rows: 'Drop Empty Rows',
  harmonize_categories: 'Harmonize Categories',
  detect_outliers: 'Detect Outliers',
  normalize_boolean: 'Normalize Booleans',
  normalize_percentages: 'Normalize Percentages',
  rename_column: 'Rename Column',
  delete_column: 'Delete Column',
  duplicate_column: 'Duplicate Column',
  reorder_columns: 'Reorder Columns',
  title_case_text: 'Title Case Text',
  uppercase_text: 'Uppercase Text',
  lowercase_text: 'Lowercase Text',
};

/** Is this operation destructive (removes data)? */
export function isDestructive(actionId: CleaningActionId): boolean {
  return [
    'deduplicate_rows',
    'deduplicate_by_keys',
    'drop_missing_rows',
    'drop_empty_rows',
    'delete_column',
  ].includes(actionId);
}

/** Execute a cleaning operation. */
export function executeOperation(dataset: Dataset, config: CleaningConfig): OperationResult {
  const handler = OPERATION_MAP[config.actionId];
  if (!handler) {
    return {
      success: false,
      actionId: config.actionId,
      config,
      timestamp: now(),
      rowsAffected: 0,
      cellsChanged: 0,
      rowsRemoved: 0,
      rowsAdded: 0,
      warnings: [],
      errors: [`Unknown operation: ${config.actionId}`],
    };
  }

  try {
    return handler(dataset, config);
  } catch (error) {
    return {
      success: false,
      actionId: config.actionId,
      config,
      timestamp: now(),
      rowsAffected: 0,
      cellsChanged: 0,
      rowsRemoved: 0,
      rowsAdded: 0,
      warnings: [],
      errors: [`Operation failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
