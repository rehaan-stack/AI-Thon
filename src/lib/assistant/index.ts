/**
 * AI Cleaning Doctor — rule-based recommendation engine.
 * Works entirely locally without any API credentials.
 */
import {
  Dataset,
  DataProfile,
  QualityScore,
  AIAnalysis,
  AIRecommendation,
  DataQualityIssue,
  CleaningActionId,
  IssueSeverity,
} from '@/types';
import { detectCategoryVariants } from '@/lib/diagnostics';
import { now, generateId } from '@/lib/utils';

/** Generate a full AI analysis from dataset diagnostics. */
export function generateLocalAnalysis(
  dataset: Dataset,
  profile: DataProfile,
  qualityScore: QualityScore
): AIAnalysis {
  const recommendations: AIRecommendation[] = [];
  let step = 0;

  // ── 1. Whitespace Issues ──
  const wsColumns = profile.columns.filter(
    c => c.leadingWhitespaceCount > 0 || c.trailingWhitespaceCount > 0 || c.excessiveInternalWhitespace > 0
  );
  if (wsColumns.length > 0) {
    const totalWS = wsColumns.reduce(
      (s, c) => s + c.leadingWhitespaceCount + c.trailingWhitespaceCount,
      0
    );
    step++;
    recommendations.push({
      step,
      actionId: 'trim_whitespace',
      target: 'all_columns',
      title: 'Trim Whitespace',
      reason: `${totalWS} cells across ${wsColumns.length} columns have leading or trailing whitespace, which can cause failed joins and mismatched filters.`,
      severity: 'low',
      estimatedImpact: `${totalWS} cells will be cleaned`,
      requiresConfirmation: false,
      config: { actionId: 'trim_whitespace' },
    });

    const excessWS = wsColumns.filter(c => c.excessiveInternalWhitespace > 0);
    if (excessWS.length > 0) {
      step++;
      recommendations.push({
        step,
        actionId: 'collapse_whitespace',
        target: excessWS.map(c => c.columnName).join(', '),
        title: 'Collapse Internal Whitespace',
        reason: `${excessWS.length} columns contain cells with repeated internal spaces.`,
        severity: 'low',
        requiresConfirmation: false,
        config: { actionId: 'collapse_whitespace', targetColumns: excessWS.map(c => c.columnId) },
      });
    }
  }

  // ── 2. Dirty Headers ──
  const dirtyHeaders = dataset.columns.filter(c => {
    return /[#$%^&*()!@]/.test(c.name) || /\s{2,}/.test(c.name) || c.name !== c.name.trim();
  });
  if (dirtyHeaders.length > 0) {
    step++;
    recommendations.push({
      step,
      actionId: 'normalize_headers',
      target: `${dirtyHeaders.length} columns`,
      title: 'Normalize Column Headers',
      reason: `${dirtyHeaders.length} column headers contain special characters or inconsistent formatting (e.g., "${dirtyHeaders[0]?.name}").`,
      severity: 'low',
      estimatedImpact: `${dirtyHeaders.length} headers will be standardized`,
      requiresConfirmation: false,
      config: { actionId: 'normalize_headers', headerStyle: 'snake_case' },
    });
  }

  // ── 3. Duplicates ──
  if (profile.exactDuplicateCount > 0) {
    step++;
    recommendations.push({
      step,
      actionId: 'deduplicate_rows',
      target: 'all_rows',
      title: 'Remove Duplicate Rows',
      reason: `${profile.exactDuplicateCount} exact duplicate rows detected that may inflate analytics and cause double-counting.`,
      severity: profile.exactDuplicateCount > 5 ? 'high' : 'medium',
      estimatedImpact: `${profile.exactDuplicateCount} rows will be removed`,
      requiresConfirmation: true,
      config: { actionId: 'deduplicate_rows', keepOccurrence: 'first' },
    });
  }

  // ── 4. Email Normalization ──
  const emailColumns = profile.columns.filter(c => {
    const name = c.columnName.toLowerCase();
    return (name.includes('email') || name.includes('e-mail')) && c.inferredType === 'string';
  });
  if (emailColumns.length > 0) {
    const mixedCase = emailColumns.filter(c => {
      const values = dataset.rows.map(r => r[c.columnId]).filter(v => typeof v === 'string' && v.includes('@'));
      return values.some(v => typeof v === 'string' && v !== v.toLowerCase());
    });
    if (mixedCase.length > 0) {
      step++;
      recommendations.push({
        step,
        actionId: 'normalize_emails',
        target: mixedCase.map(c => c.columnName).join(', '),
        title: 'Normalize Email Casing',
        reason: `Email addresses in ${mixedCase.length} column(s) have mixed casing which can cause duplicate contact entries.`,
        severity: 'medium',
        requiresConfirmation: false,
        config: { actionId: 'normalize_emails', targetColumns: mixedCase.map(c => c.columnId) },
      });
    }
  }

  // ── 5. Date Normalization ──
  const dateColumns = profile.columns.filter(c => c.dateFormatInconsistencies > 0);
  if (dateColumns.length > 0) {
    step++;
    recommendations.push({
      step,
      actionId: 'normalize_dates',
      target: dateColumns.map(c => c.columnName).join(', '),
      title: 'Standardize Date Formats',
      reason: `${dateColumns.length} column(s) contain multiple date formats, making sorting and filtering unreliable. Ambiguous dates (month/day order) will require user confirmation.`,
      severity: 'medium',
      requiresConfirmation: true,
      config: {
        actionId: 'normalize_dates',
        targetColumns: dateColumns.map(c => c.columnId),
        dateInputFormat: 'MM/DD/YYYY',
      },
    });
  }

  // ── 6. Numeric Coercion ──
  const numericCols = profile.columns.filter(c => {
    return c.numericFormatInconsistencies > 0 ||
      (c.inferredType === 'number' && c.parseFailures > 0);
  });
  // Also check for currency-formatted columns
  const currencyColumns = profile.columns.filter(c => {
    const vals = dataset.rows.map(r => r[c.columnId]).filter(v => typeof v === 'string');
    return vals.some(v => typeof v === 'string' && /[$€£¥]/.test(v));
  });
  if (currencyColumns.length > 0) {
    step++;
    recommendations.push({
      step,
      actionId: 'coerce_numeric',
      target: currencyColumns.map(c => c.columnName).join(', '),
      title: 'Convert Currency Strings to Numbers',
      reason: `${currencyColumns.length} column(s) contain currency-formatted values (e.g., "$1,250.00") that should be numeric for calculations.`,
      severity: 'medium',
      estimatedImpact: 'Currency symbols and thousands separators will be removed',
      requiresConfirmation: false,
      config: { actionId: 'coerce_numeric', targetColumns: currencyColumns.map(c => c.columnId) },
    });
  }

  // ── 7. Missing Values ──
  const highMissing = profile.columns.filter(c => c.missingPercent > 0.3);
  const medMissing = profile.columns.filter(c => c.missingPercent > 0.05 && c.missingPercent <= 0.3);

  if (highMissing.length > 0) {
    step++;
    recommendations.push({
      step,
      actionId: 'fill_missing',
      target: highMissing.map(c => c.columnName).join(', '),
      title: 'Address High Missing-Value Columns',
      reason: `${highMissing.length} column(s) have more than 30% missing values. Consider filling with appropriate defaults or reviewing the data source.`,
      severity: 'high',
      estimatedImpact: `${highMissing.reduce((s, c) => s + c.missingCount, 0)} cells could be filled`,
      requiresConfirmation: true,
      config: { actionId: 'fill_missing', targetColumns: highMissing.map(c => c.columnId), fillStrategy: 'unknown' },
    });
  }

  // ── 8. Categorical Harmonization ──
  const catColumns = profile.columns.filter(c => c.categoricalInconsistencies > 0);
  if (catColumns.length > 0) {
    for (const col of catColumns.slice(0, 3)) {
      const values = dataset.rows.map(r => r[col.columnId]);
      const variants = detectCategoryVariants(values);
      const variantEntries = Object.entries(variants);
      if (variantEntries.length > 0) {
        step++;
        const example = variantEntries[0];
        recommendations.push({
          step,
          actionId: 'harmonize_categories',
          target: col.columnName,
          title: `Harmonize "${col.columnName}" Values`,
          reason: `Found ${variantEntries.length} group(s) of similar values (e.g., ${example[1].slice(0, 3).join(', ')}). These likely represent the same category.`,
          severity: 'medium',
          requiresConfirmation: true,
          config: { actionId: 'harmonize_categories', targetColumns: [col.columnId] },
        });
      }
    }
  }

  // ── 9. Outliers ──
  const outlierCols = profile.columns.filter(c => c.numericStats && c.numericStats.outlierCount > 0);
  if (outlierCols.length > 0) {
    step++;
    recommendations.push({
      step,
      actionId: 'detect_outliers',
      target: outlierCols.map(c => c.columnName).join(', '),
      title: 'Review Numeric Outliers',
      reason: `${outlierCols.length} column(s) contain potential outliers based on the IQR method. These should be reviewed but are not automatically corrected.`,
      severity: 'low',
      requiresConfirmation: false,
      config: { actionId: 'detect_outliers', targetColumns: outlierCols.map(c => c.columnId) },
    });
  }

  // ── Build summary ──
  const issueCount = qualityScore.issues.length;
  const highCount = qualityScore.issues.filter(i => i.severity === 'high').length;
  const medCount = qualityScore.issues.filter(i => i.severity === 'medium').length;

  let summaryParts: string[] = [];
  summaryParts.push(
    `I inspected your ${dataset.meta.fileName} dataset (${dataset.rows.length} rows × ${dataset.columns.length} columns).`
  );

  if (issueCount === 0) {
    summaryParts.push('Your data looks clean! No significant issues were detected.');
  } else {
    summaryParts.push(
      `I found ${issueCount} issue${issueCount > 1 ? 's' : ''}: ${highCount} high severity, ${medCount} medium severity, and ${issueCount - highCount - medCount} low severity.`
    );

    const topIssueTexts: string[] = [];
    if (profile.exactDuplicateCount > 0) topIssueTexts.push(`${profile.exactDuplicateCount} duplicate rows`);
    if (wsColumns.length > 0) topIssueTexts.push('whitespace issues');
    if (dateColumns.length > 0) topIssueTexts.push('inconsistent date formats');
    if (currencyColumns.length > 0) topIssueTexts.push('currency-formatted numbers');
    if (catColumns.length > 0) topIssueTexts.push('categorical inconsistencies');
    if (highMissing.length > 0) topIssueTexts.push('significant missing data');

    if (topIssueTexts.length > 0) {
      summaryParts.push(`Key findings include: ${topIssueTexts.join(', ')}.`);
    }
  }

  summaryParts.push(
    `I recommend ${recommendations.length} cleaning operation${recommendations.length !== 1 ? 's' : ''} to improve data quality.`
  );

  return {
    summary: summaryParts.join(' '),
    healthScore: qualityScore.overall,
    topIssues: qualityScore.issues.slice(0, 5),
    recommendedPipeline: recommendations,
    generatedAt: now(),
    source: 'local',
  };
}
