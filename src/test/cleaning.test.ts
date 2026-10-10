import { describe, it, expect } from 'vitest';
import { parseSampleCSV } from '@/lib/parsing';
import { profileDataset, calculateQualityScore } from '@/lib/diagnostics';
import { executeOperation } from '@/lib/cleaning';
import { generateLocalAnalysis } from '@/lib/assistant';

const sampleCsv = `Order ID,Customer Name,Email,Price,Order Date
101,  Alice Smith  ,alice@example.com,$150.00,2023-01-15
102,Bob Jones,bob@test.com,€250.50,15/01/2023
101,  Alice Smith  ,alice@example.com,$150.00,2023-01-15
103,Charlie Brown,,$99.00,2023/02/01
104,Dana White,dana@corp.com,$0.00,invalid-date`.trim();

describe('Data Cleaning Pipeline Engine', () => {
  it('parses CSV data and detects columns correctly', () => {
    const parseResult = parseSampleCSV(sampleCsv, 'test.csv');
    expect(parseResult.success).toBe(true);
    expect(parseResult.dataset).toBeDefined();
    expect(parseResult.dataset?.rows.length).toBe(5);
    expect(parseResult.dataset?.columns.length).toBe(5);
  });

  it('profiles dataset and identifies quality anomalies', () => {
    const { dataset } = parseSampleCSV(sampleCsv, 'test.csv');
    expect(dataset).toBeDefined();
    const profile = profileDataset(dataset!);
    expect(profile.totalRows).toBe(5);
    expect(profile.exactDuplicateCount).toBe(1);

    const score = calculateQualityScore(dataset!, profile);
    expect(score.overall).toBeLessThan(100);
    expect(score.issues.length).toBeGreaterThan(0);
  });

  it('executes whitespace trimming correctly', () => {
    const { dataset } = parseSampleCSV(sampleCsv, 'test.csv');
    const result = executeOperation(dataset!, {
      actionId: 'trim_whitespace',
    });
    expect(result.success).toBe(true);
    expect(result.cellsChanged).toBeGreaterThan(0);

    // Verify Alice Smith is trimmed
    const firstRowName = result.resultDataset?.rows[0]['col_1'];
    expect(firstRowName).toBe('Alice Smith');
  });

  it('executes row deduplication correctly', () => {
    const { dataset } = parseSampleCSV(sampleCsv, 'test.csv');
    const result = executeOperation(dataset!, {
      actionId: 'deduplicate_rows',
    });
    expect(result.success).toBe(true);
    expect(result.rowsRemoved).toBe(1);
    expect(result.resultDataset?.rows.length).toBe(4);
  });

  it('normalizes currency strings into clean numbers', () => {
    const { dataset } = parseSampleCSV(sampleCsv, 'test.csv');
    const result = executeOperation(dataset!, {
      actionId: 'remove_currency_symbols',
      targetColumns: ['col_3'],
    });
    expect(result.success).toBe(true);
    expect(result.cellsChanged).toBeGreaterThan(0);
    const cleanedPrice = result.resultDataset?.rows[0]['col_3'];
    expect(cleanedPrice).toBe(150);
  });

  it('normalizes mixed date representations into ISO-8601', () => {
    const { dataset } = parseSampleCSV(sampleCsv, 'test.csv');
    const result = executeOperation(dataset!, {
      actionId: 'normalize_dates',
      targetColumns: ['col_4'],
    });
    expect(result.success).toBe(true);
    const dateRow1 = result.resultDataset?.rows[0]['col_4'];
    const dateRow2 = result.resultDataset?.rows[1]['col_4'];
    expect(dateRow1).toBe('2023-01-15');
    expect(dateRow2).toBe('2023-01-15');
  });

  it('generates rule-based AI recommendations', () => {
    const { dataset } = parseSampleCSV(sampleCsv, 'test.csv');
    const profile = profileDataset(dataset!);
    const score = calculateQualityScore(dataset!, profile);
    const analysis = generateLocalAnalysis(dataset!, profile, score);

    expect(analysis.healthScore).toBe(score.overall);
    expect(analysis.recommendedPipeline.length).toBeGreaterThan(0);
    expect(analysis.recommendedPipeline.some((r) => r.actionId === 'trim_whitespace')).toBe(true);
    expect(analysis.recommendedPipeline.some((r) => r.actionId === 'deduplicate_rows')).toBe(true);
  });
});
