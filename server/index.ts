import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseDelimitedText } from '@/lib/parsing';
import { profileDataset, calculateQualityScore } from '@/lib/diagnostics';
import { generateLocalAnalysis } from '@/lib/assistant';
import { executeOperation, OPERATION_NAMES } from '@/lib/cleaning';
import { cellToString } from '@/lib/utils';
import type { AuditReportData, CleaningConfig, Dataset, HistoryEntry, OperationResult } from '@/types';

const PORT = Number(process.env.PORT || 8787);
const MAX_BODY_BYTES = Number(process.env.TABULYTIX_MAX_BODY_BYTES || 70 * 1024 * 1024);
const MAX_ROWS = Number(process.env.TABULYTIX_MAX_ROWS || 100_000);
const MAX_COLUMNS = Number(process.env.TABULYTIX_MAX_COLUMNS || 1_000);
const API_VERSION = 'v1';
const API_KEY = process.env.TABULYTIX_API_KEY?.trim();

const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || 'http://127.0.0.1:3000,http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function setCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

function sendFile(
  res: ServerResponse,
  statusCode: number,
  contentType: string,
  filename: string,
  body: string | Buffer
): void {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

function getRequestPath(req: IncomingMessage): string {
  return new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
}

function requireApiKey(req: IncomingMessage, res: ServerResponse): void {
  if (!API_KEY) return;
  const authorization = req.headers.authorization;
  if (authorization !== `Bearer ${API_KEY}`) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    throw new ApiError(401, 'A valid API key is required.');
  }
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) {
      throw new ApiError(413, `Request body exceeds the ${MAX_BODY_BYTES} byte limit.`);
    }
    chunks.push(buffer);
  }

  if (total === 0) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ApiError(400, 'Request body must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

function assertDataset(value: unknown): Dataset {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'A dataset object is required.');
  }

  const dataset = value as Partial<Dataset>;
  if (!Array.isArray(dataset.columns) || !Array.isArray(dataset.rows)) {
    throw new ApiError(400, 'Dataset must contain columns and rows arrays.');
  }
  if (!dataset.meta || typeof dataset.meta !== 'object' || typeof dataset.meta.fileName !== 'string') {
    throw new ApiError(400, 'Dataset meta.fileName is required.');
  }
  if (dataset.columns.length === 0) {
    throw new ApiError(400, 'Dataset must contain at least one column.');
  }
  if (dataset.columns.length > MAX_COLUMNS || dataset.rows.length > MAX_ROWS) {
    throw new ApiError(413, `Dataset exceeds the ${MAX_ROWS} row / ${MAX_COLUMNS} column limit.`);
  }

  const columnIds = new Set<string>();
  for (const column of dataset.columns) {
    if (!column || typeof column !== 'object' || typeof column.id !== 'string' || typeof column.name !== 'string') {
      throw new ApiError(400, 'Each dataset column must have string id and name fields.');
    }
    if (columnIds.has(column.id)) throw new ApiError(400, `Duplicate column id: ${column.id}.`);
    columnIds.add(column.id);
  }
  for (const row of dataset.rows) {
    if (!row || typeof row !== 'object' || typeof row.__rowId !== 'string') {
      throw new ApiError(400, 'Each dataset row must have a string __rowId field.');
    }
  }

  return dataset as Dataset;
}

function analyze(dataset: Dataset) {
  const profile = profileDataset(dataset);
  const qualityScore = calculateQualityScore(dataset, profile);
  const aiAnalysis = generateLocalAnalysis(dataset, profile, qualityScore);
  return { profile, qualityScore, aiAnalysis };
}

function extensionOf(fileName: string): 'csv' | 'tsv' | 'xlsx' | 'xls' | null {
  const extension = fileName.toLowerCase().split('.').pop();
  if (extension === 'csv' || extension === 'tsv' || extension === 'xlsx' || extension === 'xls') {
    return extension;
  }
  return null;
}

function decodeBase64(value: unknown): Buffer {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ApiError(400, 'A non-empty base64 contentBase64 value is required for Excel files.');
  }
  const content = value.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(content, 'base64');
  if (buffer.length === 0) throw new ApiError(400, 'The supplied base64 file is empty.');
  return buffer;
}

function parseUpload(body: Record<string, unknown>): Dataset {
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const format = extensionOf(fileName);
  if (!fileName || !format) {
    throw new ApiError(400, 'fileName must end with .csv, .tsv, .xlsx, or .xls.');
  }

  if (format === 'csv' || format === 'tsv') {
    const content = typeof body.content === 'string'
      ? body.content
      : Buffer.isBuffer(body.contentBase64)
        ? body.contentBase64.toString('utf8')
        : typeof body.contentBase64 === 'string'
          ? decodeBase64(body.contentBase64).toString('utf8')
          : '';
    if (!content.trim()) throw new ApiError(400, 'The uploaded text file is empty.');

    const result = parseDelimitedText(content, fileName, format, Buffer.byteLength(content, 'utf8'));
    if (!result.success || !result.dataset) {
      throw new ApiError(422, result.error || 'Unable to parse the uploaded file.', result.warnings);
    }
    return result.dataset;
  }

  const workbook = XLSX.read(decodeBase64(body.contentBase64), { type: 'buffer', cellDates: true });
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) throw new ApiError(422, 'The workbook contains no worksheets.');
  const selectedSheet = typeof body.selectedSheet === 'string' && sheetNames.includes(body.selectedSheet)
    ? body.selectedSheet
    : sheetNames[0];
  const sheet = workbook.Sheets[selectedSheet];
  const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: true });
  const result = parseDelimitedText(csv, fileName, 'csv', Buffer.byteLength(decodeBase64(body.contentBase64)));
  if (!result.success || !result.dataset) {
    throw new ApiError(422, result.error || 'Unable to parse the selected worksheet.', result.warnings);
  }

  result.dataset.meta.fileFormat = format;
  result.dataset.meta.encoding = 'Excel binary';
  result.dataset.meta.selectedSheet = selectedSheet;
  result.dataset.meta.availableSheets = sheetNames.length > 1 ? sheetNames : undefined;
  return result.dataset;
}

function datasetToCsv(dataset: Dataset): string {
  const fields = dataset.columns.map((column) => column.name);
  const data = dataset.rows.map((row) => {
    const record: Record<string, string> = {};
    dataset.columns.forEach((column) => {
      record[column.name] = cellToString(row[column.id]);
    });
    return record;
  });
  return `\ufeff${Papa.unparse({ fields, data })}`;
}

function datasetToXlsx(dataset: Dataset): Buffer {
  const values = [
    dataset.columns.map((column) => column.name),
    ...dataset.rows.map((row) => dataset.columns.map((column) => {
      const value = row[column.id];
      return value === null || value === undefined ? null : cellToString(value);
    })),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(values);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cleaned Data');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
}

function buildAuditReport(body: Record<string, unknown>): AuditReportData {
  if (body.report && typeof body.report === 'object' && !Array.isArray(body.report)) {
    return body.report as AuditReportData;
  }

  const dataset = assertDataset(body.dataset);
  const originalDataset = body.originalDataset ? assertDataset(body.originalDataset) : dataset;
  const diagnostics = analyze(dataset);
  const initialQualityScore = typeof body.initialQualityScore === 'number'
    ? body.initialQualityScore
    : diagnostics.qualityScore.overall;
  const appliedOperations = Array.isArray(body.history) ? body.history as HistoryEntry[] : [];

  return {
    productName: typeof body.productName === 'string' ? body.productName : 'Tabulytix',
    fileName: dataset.meta.fileName,
    reportDate: new Date().toISOString(),
    originalRowCount: originalDataset.rows.length,
    originalColumnCount: originalDataset.columns.length,
    finalRowCount: dataset.rows.length,
    finalColumnCount: dataset.columns.length,
    initialQualityScore,
    finalQualityScore: diagnostics.qualityScore.overall,
    qualityBreakdown: diagnostics.qualityScore,
    detectedIssues: diagnostics.qualityScore.issues,
    appliedOperations,
    remainingIssues: diagnostics.qualityScore.issues,
    parseWarnings: dataset.meta.parseWarnings || [],
  };
}

function auditReportToPdf(report: AuditReportData): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(20);
  doc.setTextColor(5, 150, 105);
  doc.text(report.productName, pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Data Cleaning Audit Report', pageWidth / 2, 30, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date(report.reportDate).toLocaleString()}`, pageWidth / 2, 37, { align: 'center' });
  doc.text(`File: ${report.fileName}`, pageWidth / 2, 43, { align: 'center' });

  autoTable(doc, {
    startY: 55,
    head: [['Metric', 'Original', 'Final', 'Change']],
    body: [
      ['Rows', String(report.originalRowCount), String(report.finalRowCount), String(report.finalRowCount - report.originalRowCount)],
      ['Columns', String(report.originalColumnCount), String(report.finalColumnCount), String(report.finalColumnCount - report.originalColumnCount)],
      ['Quality Score', `${report.initialQualityScore}/100`, `${report.finalQualityScore}/100`, String(report.finalQualityScore - report.initialQualityScore)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
  });

  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  const y = (lastTable?.finalY || 55) + 12;
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Detected Issues', 14, y);
  autoTable(doc, {
    startY: y + 6,
    head: [['Severity', 'Column', 'Issue', 'Affected']],
    body: report.detectedIssues.length > 0
      ? report.detectedIssues.map((issue) => [issue.severity.toUpperCase(), issue.column || '—', issue.issue, String(issue.affectedCount)])
      : [['—', '—', 'No issues detected.', '0']],
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
  });

  const output = doc.output('arraybuffer');
  return Buffer.from(output);
}

function assertCleaningConfig(value: unknown): CleaningConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'An operation config is required.');
  }
  const config = value as Partial<CleaningConfig>;
  if (typeof config.actionId !== 'string' || !(config.actionId in OPERATION_NAMES)) {
    throw new ApiError(400, `Unknown operation. Supported operations: ${Object.keys(OPERATION_NAMES).join(', ')}.`);
  }
  return config as CleaningConfig;
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const path = getRequestPath(req);
  if (req.method === 'GET' && path === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'tabulytix-api', version: API_VERSION, timestamp: new Date().toISOString() });
    return;
  }

  if (req.method === 'GET' && path === `/api/${API_VERSION}/operations`) {
    sendJson(res, 200, { operations: Object.entries(OPERATION_NAMES).map(([actionId, name]) => ({ actionId, name })) });
    return;
  }

  if (!path.startsWith(`/api/${API_VERSION}/`)) {
    sendJson(res, 404, { error: 'Route not found.' });
    return;
  }

  requireApiKey(req, res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  const body = await readJson(req);

  if (path === `/api/${API_VERSION}/parse`) {
    const dataset = parseUpload(body);
    sendJson(res, 200, { dataset, ...analyze(dataset) });
    return;
  }

  if (path === `/api/${API_VERSION}/analyze`) {
    const dataset = assertDataset(body.dataset);
    sendJson(res, 200, analyze(dataset));
    return;
  }

  if (path === `/api/${API_VERSION}/pipeline`) {
    const dataset = assertDataset(body.dataset);
    sendJson(res, 200, { aiAnalysis: analyze(dataset).aiAnalysis });
    return;
  }

  if (path === `/api/${API_VERSION}/clean`) {
    const dataset = assertDataset(body.dataset);
    const config = assertCleaningConfig(body.operation ?? body.config);
    const operation: OperationResult = executeOperation(dataset, config);
    if (!operation.success) {
      sendJson(res, 422, { operation });
      return;
    }
    sendJson(res, 200, { operation, ...analyze(operation.resultDataset || dataset) });
    return;
  }

  if (path === `/api/${API_VERSION}/export/pdf`) {
    const report = buildAuditReport(body);
    const filename = `${report.fileName.replace(/\.[^.]+$/, '')}_audit_report.pdf`;
    sendFile(res, 200, 'application/pdf', filename, auditReportToPdf(report));
    return;
  }

  if (path === `/api/${API_VERSION}/export/csv`) {
    const dataset = assertDataset(body.dataset);
    sendFile(res, 200, 'text/csv; charset=utf-8', `${dataset.meta.fileName.replace(/\.[^.]+$/, '')}_cleaned.csv`, datasetToCsv(dataset));
    return;
  }

  if (path === `/api/${API_VERSION}/export/xlsx`) {
    const dataset = assertDataset(body.dataset);
    sendFile(
      res,
      200,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      `${dataset.meta.fileName.replace(/\.[^.]+$/, '')}_cleaned.xlsx`,
      datasetToXlsx(dataset)
    );
    return;
  }

  sendJson(res, 404, { error: 'Route not found.' });
}

export function createApiServer(): Server {
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((error: unknown) => {
      if (error instanceof ApiError) {
        sendJson(res, error.statusCode, { error: error.message, details: error.details });
        return;
      }
      console.error('[tabulytix-api]', error);
      sendJson(res, 500, { error: 'Internal server error.' });
    });
  });

  server.on('clientError', (_error, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApiServer().listen(PORT, () => {
    console.log(`Tabulytix API listening on http://127.0.0.1:${PORT}`);
  });
}
