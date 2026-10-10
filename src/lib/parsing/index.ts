/**
 * File parsing engine for CSV, TSV, XLS, and XLSX files.
 * Uses PapaParse for delimited text and SheetJS for Excel.
 */
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset, DataRow, ColumnMeta, DatasetMeta, InferredType, CellValue } from '@/types';
import { APP_CONFIG } from '@/config/app-config';
import { generateId, makeUniqueHeaders, isMissing, looksLikeDate, looksLikeBoolean, parseNumericString, now } from '@/lib/utils';

export interface ParseResult {
  success: boolean;
  dataset?: Dataset;
  error?: string;
  warnings: string[];
}

export interface ParseOptions {
  selectedSheet?: string;
}

/** Detect file format from extension. */
function detectFormat(fileName: string): 'csv' | 'tsv' | 'xlsx' | 'xls' | null {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'csv': return 'csv';
    case 'tsv': return 'tsv';
    case 'xlsx': return 'xlsx';
    case 'xls': return 'xls';
    default: return null;
  }
}

/** Validate file before parsing. */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const format = detectFormat(file.name);
  if (!format) {
    return { valid: false, error: `Unsupported file format. Supported: ${APP_CONFIG.supportedExtensions.join(', ')}` };
  }
  if (file.size > APP_CONFIG.maxFileSizeBytes) {
    return { valid: false, error: `File too large. Maximum size: ${APP_CONFIG.maxFileSizeLabel}` };
  }
  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }
  return { valid: true };
}

/** Infer the data type of a column from its values. */
function inferColumnType(values: CellValue[]): InferredType {
  const nonMissing = values.filter(v => !isMissing(v));
  if (nonMissing.length === 0) return 'empty';

  let numCount = 0;
  let dateCount = 0;
  let boolCount = 0;
  let strCount = 0;

  for (const v of nonMissing) {
    if (typeof v === 'number') { numCount++; continue; }
    if (typeof v === 'boolean') { boolCount++; continue; }
    if (v instanceof Date) { dateCount++; continue; }
    const s = String(v).trim();
    if (s === '') continue;
    if (looksLikeBoolean(s)) { boolCount++; continue; }
    const parsed = parseNumericString(s);
    if (parsed !== null) { numCount++; continue; }
    if (looksLikeDate(s)) { dateCount++; continue; }
    strCount++;
  }

  const total = nonMissing.length;
  const threshold = 0.7;

  if (numCount / total >= threshold) return 'number';
  if (dateCount / total >= threshold) return 'date';
  if (boolCount / total >= threshold) return 'boolean';
  if (strCount / total >= threshold) return 'string';

  // Check for mixed types
  const types = [numCount, dateCount, boolCount, strCount].filter(c => c > 0);
  if (types.length > 1) return 'mixed';

  return 'string';
}

/** Parse a CSV or TSV string into a Dataset. */
function parseDelimited(
  content: string,
  fileName: string,
  fileSize: number,
  format: 'csv' | 'tsv'
): ParseResult {
  const warnings: string[] = [];

  // Strip BOM
  let cleaned = content;
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.substring(1);
    warnings.push('UTF-8 BOM detected and removed.');
  }

  const delimiter = format === 'tsv' ? '\t' : undefined; // PapaParse auto-detects for CSV

  const parsed = Papa.parse(cleaned, {
    header: true,
    delimiter,
    skipEmptyLines: false,
    dynamicTyping: false, // We handle type inference ourselves
  });

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      if (err.type === 'Quotes' || err.type === 'FieldMismatch') {
        warnings.push(`Row ${err.row}: ${err.message}`);
      }
    }
  }

  const rawHeaders = parsed.meta.fields || [];
  if (rawHeaders.length === 0) {
    return { success: false, error: 'No columns detected in the file.', warnings };
  }

  // Keep the raw header text for diagnostics while exposing a trimmed display name.
  // The previous transformHeader callback discarded whitespace before the profiler
  // could identify it as a structural issue.
  const originalHeaders = [...rawHeaders];
  let headers = rawHeaders.map((header) => header.trim());

  // Handle missing headers
  const hasEmptyHeaders = headers.some(h => !h || h.trim() === '');
  if (hasEmptyHeaders) {
    headers = headers.map((h, i) => (!h || h.trim() === '') ? `Column_${i + 1}` : h);
    warnings.push('Some headers were empty and have been replaced with placeholder names.');
  }

  // Resolve duplicate headers
  headers = makeUniqueHeaders(headers);
  const hasDuplicateHeaders = headers.some((h, i) => h !== rawHeaders[i].trim());
  if (hasDuplicateHeaders) {
    warnings.push('Duplicate column names detected and resolved with numeric suffixes.');
  }

  const data = parsed.data as Record<string, string>[];
  if (data.length === 0) {
    warnings.push('File contains only headers with no data rows.');
  }

  // Build columns
  const columns: ColumnMeta[] = headers.map((name, i) => ({
    id: `col_${i}`,
    name,
    originalName: originalHeaders[i] || name,
    originalIndex: i,
    inferredType: 'unknown' as InferredType,
  }));

  // Build rows
  const rows: DataRow[] = data.map((record, idx) => {
    const row: DataRow = { __rowId: `row_${idx}` };
    columns.forEach(col => {
      // Map original field name to value
      const originalField = parsed.meta.fields?.[col.originalIndex];
      const value = originalField ? record[originalField] : undefined;
      row[col.id] = value === undefined ? null : value;
    });
    return row;
  });

  // Infer column types
  for (const col of columns) {
    const values = rows.map(r => r[col.id]);
    col.inferredType = inferColumnType(values);
  }

  const meta: DatasetMeta = {
    fileName,
    fileSize,
    fileFormat: format,
    detectedDelimiter: parsed.meta.delimiter,
    encoding: 'UTF-8 (assumed)',
    rowCount: rows.length,
    columnCount: columns.length,
    parseWarnings: warnings,
    importedAt: now(),
  };

  return {
    success: true,
    dataset: { meta, columns, rows },
    warnings,
  };
}

/** Get available sheet names from an Excel file. */
export function getExcelSheets(buffer: ArrayBuffer): string[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    return workbook.SheetNames;
  } catch {
    return [];
  }
}

/** Parse an Excel file into a Dataset. */
function parseExcel(
  buffer: ArrayBuffer,
  fileName: string,
  fileSize: number,
  format: 'xlsx' | 'xls',
  selectedSheet?: string
): ParseResult {
  const warnings: string[] = [];

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch {
    return { success: false, error: 'Failed to read the Excel file. It may be corrupted or password-protected.', warnings };
  }

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    return { success: false, error: 'The Excel file contains no worksheets.', warnings };
  }

  const sheetName = selectedSheet && sheetNames.includes(selectedSheet)
    ? selectedSheet
    : sheetNames[0];

  if (sheetNames.length > 1) {
    warnings.push(`Workbook contains ${sheetNames.length} sheets. Using "${sheetName}".`);
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { success: false, error: `Sheet "${sheetName}" not found.`, warnings };
  }

  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as CellValue[][];

  if (jsonData.length === 0) {
    return { success: false, error: 'The selected sheet is empty.', warnings };
  }

  // First row as headers
  let headers = (jsonData[0] || []).map((h, i) => {
    if (h === null || h === undefined || String(h).trim() === '') {
      warnings.push(`Header at position ${i + 1} was empty; replaced with placeholder.`);
      return `Column_${i + 1}`;
    }
    return String(h).trim();
  });

  const originalHeaders = [...headers];
  headers = makeUniqueHeaders(headers);

  // Build columns
  const columns: ColumnMeta[] = headers.map((name, i) => ({
    id: `col_${i}`,
    name,
    originalName: originalHeaders[i] || name,
    originalIndex: i,
    inferredType: 'unknown' as InferredType,
  }));

  // Build rows (skip header row)
  const dataRows = jsonData.slice(1);
  const rows: DataRow[] = dataRows.map((rawRow, idx) => {
    const row: DataRow = { __rowId: `row_${idx}` };
    columns.forEach((col, colIdx) => {
      let value = rawRow[colIdx];
      // Convert Date objects to ISO string for consistency
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      }
      row[col.id] = value === undefined ? null : value;
    });
    return row;
  });

  // Handle ragged rows
  const maxCols = Math.max(headers.length, ...dataRows.map(r => r.length));
  if (maxCols > headers.length) {
    warnings.push(`Some rows have more values than headers. Extra values may be truncated.`);
  }

  // Infer types
  for (const col of columns) {
    const values = rows.map(r => r[col.id]);
    col.inferredType = inferColumnType(values);
  }

  const meta: DatasetMeta = {
    fileName,
    fileSize,
    fileFormat: format,
    encoding: 'Excel binary',
    rowCount: rows.length,
    columnCount: columns.length,
    selectedSheet: sheetName,
    availableSheets: sheetNames.length > 1 ? sheetNames : undefined,
    parseWarnings: warnings,
    importedAt: now(),
  };

  return {
    success: true,
    dataset: { meta, columns, rows },
    warnings,
  };
}

/** Main parse function — dispatches based on file type. */
export async function parseFile(file: File, options?: ParseOptions): Promise<ParseResult> {
  const format = detectFormat(file.name);
  if (!format) {
    return { success: false, error: 'Unsupported file format.', warnings: [] };
  }

  if (format === 'csv' || format === 'tsv') {
    const text = await file.text();
    if (!text.trim()) {
      return { success: false, error: 'File is empty.', warnings: [] };
    }
    return parseDelimited(text, file.name, file.size, format);
  }

  // Excel
  const buffer = await file.arrayBuffer();
  return parseExcel(buffer, file.name, file.size, format, options?.selectedSheet);
}

/** Parse the built-in sample dataset from a raw CSV string. */
export function parseSampleCSV(csvContent: string, fileName: string): ParseResult {
  return parseDelimited(csvContent, fileName, new Blob([csvContent]).size, 'csv');
}

/** Parse raw delimited text for browser and server integrations. */
export function parseDelimitedText(
  content: string,
  fileName: string,
  format: 'csv' | 'tsv' = 'csv',
  fileSize = new Blob([content]).size
): ParseResult {
  return parseDelimited(content, fileName, fileSize, format);
}
