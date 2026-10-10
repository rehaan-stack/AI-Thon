/**
 * Utility functions used across the application.
 */
import { CellValue, DataRow } from '@/types';
import { APP_CONFIG } from '@/config/app-config';

/** Generate a unique ID. */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Check if a value is considered missing. */
export function isMissing(value: CellValue, tokens?: string[]): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const checkTokens = tokens ?? APP_CONFIG.missingValueTokens;
    return checkTokens.some(t => t.toLowerCase() === trimmed.toLowerCase());
  }
  if (typeof value === 'number' && isNaN(value)) return true;
  return false;
}

/** Deep clone a dataset (structuredClone for immutability). */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/** Format a number with commas. */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Format percentage. */
export function formatPercent(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

/** Format file size in human-readable form. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Safely parse a numeric string, removing currency symbols and separators. */
export function parseNumericString(value: string, currencySymbols: string[] = ['$', '€', '£', '¥']): number | null {
  if (typeof value !== 'string') return null;
  let cleaned = value.trim();
  for (const sym of currencySymbols) {
    cleaned = cleaned.replace(new RegExp(`\\${sym}`, 'g'), '');
  }
  // Remove thousands separators (commas)
  cleaned = cleaned.replace(/,/g, '');
  // Handle percentage
  if (cleaned.endsWith('%')) {
    cleaned = cleaned.slice(0, -1);
  }
  const num = Number(cleaned);
  return isFinite(num) ? num : null;
}

/** Check if a string looks like a date. */
export function looksLikeDate(value: string): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  // Common date patterns
  const patterns = [
    /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY or DD/MM/YYYY
    /^\d{2}-\d{2}-\d{4}$/,           // DD-MM-YYYY or MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/,         // YYYY/MM/DD
  ];
  return patterns.some(p => p.test(trimmed));
}

/** Check if a string looks like a boolean. */
export function looksLikeBoolean(value: string): boolean {
  if (typeof value !== 'string') return false;
  const lower = value.trim().toLowerCase();
  return ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0', 'on', 'off'].includes(lower);
}

/** Convert a string to snake_case. */
export function toSnakeCase(str: string): string {
  return str
    .replace(/[^\w\s]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s]+/g, '_')
    .toLowerCase()
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Convert a string to camelCase. */
export function toCamelCase(str: string): string {
  const snake = toSnakeCase(str);
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Convert a string to Title Case. */
export function toTitleCase(str: string): string {
  return str
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Convert to lowercase_clean. */
export function toLowercaseClean(str: string): string {
  return str
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Make a header name unique by appending _N if duplicated. */
export function makeUniqueHeaders(headers: string[]): string[] {
  const counts: Record<string, number> = {};
  return headers.map(h => {
    const key = h.toLowerCase();
    if (counts[key] === undefined) {
      counts[key] = 0;
      return h;
    }
    counts[key]++;
    return `${h}_${counts[key]}`;
  });
}

/** Get ISO timestamp. */
export function now(): string {
  return new Date().toISOString();
}

/** Calculate median of a sorted number array. */
export function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Calculate mean. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Calculate standard deviation. */
export function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Calculate mode - returns the first encountered most common value. */
export function mode<T>(values: T[]): T | undefined {
  if (values.length === 0) return undefined;
  const freq = new Map<string, { count: number; value: T }>();
  for (const v of values) {
    const key = String(v);
    const existing = freq.get(key);
    if (existing) {
      existing.count++;
    } else {
      freq.set(key, { count: 1, value: v });
    }
  }
  let maxCount = 0;
  let modeVal: T | undefined;
  for (const entry of freq.values()) {
    if (entry.count > maxCount) {
      maxCount = entry.count;
      modeVal = entry.value;
    }
  }
  return modeVal;
}

/** Compute Levenshtein distance between two strings. */
export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/** Get a cell value as string for display. */
export function cellToString(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value);
}
