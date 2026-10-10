/**
 * Export engine — CSV, XLSX, and PDF audit reports.
 */
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dataset, ExportOptions, AuditReportData, HistoryEntry } from '@/types';
import { APP_CONFIG } from '@/config/app-config';
import { cellToString } from '@/lib/utils';

/** Convert dataset to a 2D array (header + rows). */
function datasetToArray(dataset: Dataset): (string | number | boolean | null)[][] {
  const headers = dataset.columns.map(c => c.name);
  const rows = dataset.rows.map(row =>
    dataset.columns.map(col => {
      const v = row[col.id];
      if (v === null || v === undefined) return null;
      if (v instanceof Date) return v.toISOString().split('T')[0];
      return v as string | number | boolean;
    })
  );
  return [headers, ...rows];
}

/** Export dataset as CSV. */
export function exportCSV(dataset: Dataset, filename?: string): void {
  const headers = dataset.columns.map(c => c.name);
  const data = dataset.rows.map(row =>
    dataset.columns.reduce((obj, col) => {
      obj[col.name] = cellToString(row[col.id]);
      return obj;
    }, {} as Record<string, string>)
  );

  const csv = Papa.unparse({ fields: headers, data });
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename || `${dataset.meta.fileName.replace(/\.[^.]+$/, '')}_cleaned.csv`);
}

/** Export dataset as XLSX. */
export function exportXLSX(dataset: Dataset, filename?: string, sheetName?: string): void {
  const data = datasetToArray(dataset);
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Cleaned Data');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename || `${dataset.meta.fileName.replace(/\.[^.]+$/, '')}_cleaned.xlsx`);
}

/** Generate a PDF audit report. */
export function generateAuditReport(reportData: AuditReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setTextColor(5, 150, 105); // Primary emerald
  doc.text(reportData.productName, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Dark navy
  doc.text('Data Cleaning Audit Report', pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate
  doc.text(`Generated: ${new Date(reportData.reportDate).toLocaleString()}`, pageWidth / 2, 37, { align: 'center' });
  doc.text(`File: ${reportData.fileName}`, pageWidth / 2, 43, { align: 'center' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 48, pageWidth - 14, 48);

  // Summary table
  let y = 55;
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Summary', 14, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Original', 'Final', 'Change']],
    body: [
      ['Rows', String(reportData.originalRowCount), String(reportData.finalRowCount),
        `${reportData.finalRowCount - reportData.originalRowCount >= 0 ? '+' : ''}${reportData.finalRowCount - reportData.originalRowCount}`],
      ['Columns', String(reportData.originalColumnCount), String(reportData.finalColumnCount),
        `${reportData.finalColumnCount - reportData.originalColumnCount >= 0 ? '+' : ''}${reportData.finalColumnCount - reportData.originalColumnCount}`],
      ['Quality Score', `${reportData.initialQualityScore}/100`, `${reportData.finalQualityScore}/100`,
        `+${reportData.finalQualityScore - reportData.initialQualityScore}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  // Quality breakdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(14);
  doc.text('Quality Score Breakdown', 14, y);
  y += 8;

  const dimensions = reportData.qualityBreakdown.dimensions;
  autoTable(doc, {
    startY: y,
    head: [['Dimension', 'Score', 'Weight', 'Penalties']],
    body: Object.values(dimensions).map(d => [
      d.name,
      `${d.score}/100`,
      `${(d.weight * 100).toFixed(0)}%`,
      d.penalties.join('; ') || 'None',
    ]),
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 3: { cellWidth: 60 } },
    margin: { left: 14, right: 14 },
  });

  // Issues detected
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(14);
  doc.text('Issues Detected', 14, y);
  y += 8;

  if (reportData.detectedIssues.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Severity', 'Column', 'Issue', 'Affected']],
      body: reportData.detectedIssues.map(issue => [
        issue.severity.toUpperCase(),
        issue.column || '—',
        issue.issue,
        String(issue.affectedCount),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFontSize(10);
    doc.text('No issues detected.', 14, y);
    y += 6;
  }

  // Operations applied
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : y + 12;
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(14);
  doc.text('Applied Operations', 14, y);
  y += 8;

  const appliedOps = reportData.appliedOperations.filter(o => o.status === 'applied' || o.status === 'reapplied');
  if (appliedOps.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Operation', 'Rows Affected', 'Cells Changed', 'Status']],
      body: appliedOps.map((op, i) => [
        String(i + 1),
        op.operationName,
        String(op.rowsAffected),
        String(op.cellsChanged),
        op.status,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFontSize(10);
    doc.text('No operations were applied.', 14, y);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${reportData.productName} Audit Report — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(`${reportData.fileName.replace(/\.[^.]+$/, '')}_audit_report.pdf`);
}

/** Helper to download a Blob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const exportAuditReportPDF = generateAuditReport;
