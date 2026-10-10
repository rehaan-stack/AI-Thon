/**
 * Centralized application configuration.
 * Change branding, product name, tagline, and global settings here.
 * All components reference this config—no hardcoded product names elsewhere.
 */

export const APP_CONFIG = {
  /** Product name displayed across the app */
  name: 'Tabulytix',
  /** Product tagline */
  tagline: 'Messy Data In. Meaningful Insights Out.',
  /** Short description */
  description:
    'An intelligent data-cleaning and normalization platform. Upload messy datasets, identify quality issues, apply safe transformations, compare results, and export clean data.',
  /** Version string */
  version: '1.0.0',
  /** Copyright holder */
  copyright: `© ${new Date().getFullYear()} Tabulytix`,
  /** Maximum upload file size in bytes (50 MB) */
  maxFileSizeBytes: 50 * 1024 * 1024,
  /** Maximum upload file size label */
  maxFileSizeLabel: '50 MB',
  /** Supported file extensions */
  supportedExtensions: ['.csv', '.tsv', '.xlsx', '.xls'] as const,
  /** Privacy note */
  privacyNote:
    'All data processing happens locally in your browser. Your files never leave your device unless you explicitly opt in to external AI features.',

  /** Data quality score weights (must sum to 1) */
  qualityWeights: {
    completeness: 0.35,
    uniqueness: 0.25,
    consistency: 0.25,
    structuralHygiene: 0.15,
  },

  /** Missing value tokens (case-insensitive for text) */
  missingValueTokens: ['', 'null', 'undefined', 'N/A', 'NaN', 'none', 'n/a', '-', 'NA', 'na', '#N/A', '#NA'],

  /** Default rows per page in tables */
  defaultPageSize: 50,

  /** Max rows recommended for smooth operation */
  maxRecommendedRows: 50000,

  /** IQR multiplier for outlier detection */
  outlierIQRMultiplier: 1.5,

  /** AI configuration */
  ai: {
    /** Whether external AI is enabled by default */
    externalEnabled: false,
    /** Supported providers */
    providers: ['gemini', 'openai'] as const,
  },

  /** Design tokens */
  colors: {
    primary: '#059669',
    primaryLight: '#10B981',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    success: '#059669',
    warning: '#D97706',
    destructive: '#DC2626',
    info: '#2563EB',
    modified: '#059669',
    removed: '#DC2626',
    imputed: '#D97706',
    added: '#2563EB',
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
