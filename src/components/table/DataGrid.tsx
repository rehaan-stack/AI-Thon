'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Trash2,
  Edit2,
  Sparkles,
  Filter,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import type { ColumnMeta, CellValue } from '@/types';

interface DataGridProps {
  selectedColumnIds?: string[];
  onSelectedColumnIdsChange?: (columnIds: string[]) => void;
  selectedRowIds?: string[];
  onSelectedRowIdsChange?: (rowIds: string[]) => void;
}

export function DataGrid({
  selectedColumnIds = [],
  onSelectedColumnIdsChange,
  selectedRowIds = [],
  onSelectedRowIdsChange,
}: DataGridProps) {
  const workingDataset = useAppStore((s) => s.workingDataset);
  const applyOperation = useAppStore((s) => s.applyOperation);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [activeMenuColId, setActiveMenuColId] = useState<string | null>(null);

  const selectedColumnSet = useMemo(() => new Set(selectedColumnIds), [selectedColumnIds]);
  const columns = workingDataset?.columns ?? [];
  const rows = workingDataset?.rows ?? [];

  useEffect(() => {
    const validRowIds = new Set(rows.map((row) => row.__rowId));
    const validColumnIds = new Set(columns.map((column) => column.id));
    const validRows = selectedRowIds.filter((rowId) => validRowIds.has(rowId));
    const validColumns = selectedColumnIds.filter((columnId) => validColumnIds.has(columnId));

    if (validRows.length !== selectedRowIds.length) onSelectedRowIdsChange?.(validRows);
    if (validColumns.length !== selectedColumnIds.length) onSelectedColumnIdsChange?.(validColumns);
  }, [rows, columns, selectedRowIds, selectedColumnIds, onSelectedRowIdsChange, onSelectedColumnIdsChange]);

  if (!workingDataset) {
    return (
      <div className="p-8 text-center text-slate-500">
        No dataset loaded. Upload a dataset to view the table.
      </div>
    );
  }

  // Sorting handler
  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(colId);
      setSortDirection('asc');
    }
  };

  // Filter & Sort Rows
  const processedRows = useMemo(() => {
    let result = [...rows];

    // Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.id];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        })
      );
    }

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA);
        const strB = String(valB);
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [rows, columns, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalRows = processedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const pageIndex = Math.min(currentPage, totalPages);
  const paginatedRows = processedRows.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);
  const visibleRowIds = paginatedRows.map((row) => row.__rowId);
  const selectedVisibleRowCount = visibleRowIds.filter((rowId) => selectedRowIds.includes(rowId)).length;
  const allVisibleRowsSelected = visibleRowIds.length > 0 && selectedVisibleRowCount === visibleRowIds.length;

  const toggleColumnSelection = (columnId: string) => {
    onSelectedColumnIdsChange?.(
      selectedColumnSet.has(columnId)
        ? selectedColumnIds.filter((id) => id !== columnId)
        : [...selectedColumnIds, columnId]
    );
  };

  const toggleRowSelection = (rowId: string) => {
    onSelectedRowIdsChange?.(
      selectedRowIds.includes(rowId)
        ? selectedRowIds.filter((id) => id !== rowId)
        : [...selectedRowIds, rowId]
    );
  };

  const toggleVisibleRows = () => {
    if (allVisibleRowsSelected) {
      onSelectedRowIdsChange?.(selectedRowIds.filter((rowId) => !visibleRowIds.includes(rowId)));
    } else {
      onSelectedRowIdsChange?.([...new Set([...selectedRowIds, ...visibleRowIds])]);
    }
  };

  const clearSelection = () => {
    onSelectedRowIdsChange?.([]);
    onSelectedColumnIdsChange?.([]);
  };

  // Column Actions
  const handleRenameColumn = (colId: string) => {
    if (!renameValue.trim()) {
      setEditingColId(null);
      return;
    }
    applyOperation({
      actionId: 'rename_column',
      targetColumns: [colId],
      newName: renameValue.trim(),
    });
    setEditingColId(null);
    setActiveMenuColId(null);
  };

  const handleDeleteColumn = (colId: string) => {
    applyOperation({
      actionId: 'delete_column',
      targetColumns: [colId],
    });
    setActiveMenuColId(null);
  };

  const handleTrimColumn = (colId: string) => {
    applyOperation({
      actionId: 'trim_whitespace',
      targetColumns: [colId],
    });
    setActiveMenuColId(null);
  };

  const renderCellContent = (value: CellValue) => {
    if (value === null || value === undefined || value === '') {
      return (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-50 text-rose-600 border border-rose-100">
          null
        </span>
      );
    }

    const str = String(value);
    const hasLeading = str !== str.trimStart();
    const hasTrailing = str !== str.trimEnd();

    if (hasLeading || hasTrailing) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-1 rounded font-mono text-[11px] border border-amber-200">
          <span className="opacity-40 font-sans">•</span>
          {str.trim()}
          <span className="opacity-40 font-sans">•</span>
        </span>
      );
    }

    return <span className="truncate block">{str}</span>;
  };

  return (
    <div className="data-grid-panel bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px] overflow-hidden">
      {/* Table Toolbar */}
      <div className="data-grid-toolbar p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 bg-slate-50/50">
        <div className="data-grid-search flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${totalRows.toLocaleString()} rows...`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="data-grid-controls flex items-center gap-4 text-xs text-slate-600">
          {(selectedRowIds.length > 0 || selectedColumnIds.length > 0) && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
              <span className="font-semibold">
                {selectedRowIds.length} row{selectedRowIds.length === 1 ? '' : 's'} · {selectedColumnIds.length} column{selectedColumnIds.length === 1 ? '' : 's'} selected
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
              >
                Clear
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="font-medium text-slate-500">
            Showing {Math.min(totalRows, (pageIndex - 1) * pageSize + 1)}–
            {Math.min(totalRows, pageIndex * pageSize)} of {totalRows.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Table Body */}
      <div className="data-grid-scroll flex-1 overflow-auto relative">
        <table className="responsive-table w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 shadow-sm text-slate-700">
            <tr>
              <th className="py-2.5 px-3 w-16 text-center font-mono text-[11px] text-slate-400 border-r border-slate-200 bg-slate-100">
                <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer" title="Select all visible rows">
                  <input
                    type="checkbox"
                    checked={allVisibleRowsSelected}
                    ref={(element) => {
                      if (element) element.indeterminate = selectedVisibleRowCount > 0 && !allVisibleRowsSelected;
                    }}
                    onChange={toggleVisibleRows}
                    aria-label="Select all visible rows"
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>#</span>
                </label>
              </th>
              {columns.map((col) => {
                const isSorted = sortColumn === col.id;
                const isEditing = editingColId === col.id;
                const isColumnSelected = selectedColumnSet.has(col.id);

                return (
                  <th
                    key={col.id}
                    className={`py-2 px-3 border-r border-slate-200 select-none relative group transition-colors ${
                      isColumnSelected ? 'bg-emerald-50 text-slate-700' : 'bg-slate-100 text-slate-700'
                    } hover:bg-slate-200/60`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="checkbox"
                        checked={selectedColumnSet.has(col.id)}
                        onChange={() => toggleColumnSelection(col.id)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Select column ${col.name}`}
                        title={`Select ${col.name} column for the next transformation`}
                        className="shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameColumn(col.id)}
                            autoFocus
                            className="px-1.5 py-0.5 text-xs font-semibold rounded border border-emerald-500 focus:outline-none"
                          />
                          <button
                            onClick={() => handleRenameColumn(col.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSort(col.id)}
                          className="flex items-center gap-1.5 font-semibold text-slate-900 truncate hover:text-emerald-700"
                        >
                          <span className="truncate">{col.name}</span>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp size={12} className="text-emerald-600 shrink-0" />
                            ) : (
                              <ArrowDown size={12} className="text-emerald-600 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-40 shrink-0" />
                          )}
                        </button>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-mono ${
                          col.inferredType === 'number' ? 'bg-blue-100 text-blue-800' :
                          col.inferredType === 'date' ? 'bg-purple-100 text-purple-800' :
                          col.inferredType === 'boolean' ? 'bg-teal-100 text-teal-800' :
                          col.inferredType === 'mixed' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {col.inferredType.slice(0, 3)}
                        </span>

                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMenuColId(activeMenuColId === col.id ? null : col.id)
                            }
                            className="p-1 hover:bg-slate-300 rounded text-slate-500"
                          >
                            <MoreVertical size={12} />
                          </button>

                          {activeMenuColId === col.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 text-xs">
                              <button
                                onClick={() => {
                                  setEditingColId(col.id);
                                  setRenameValue(col.name);
                                  setActiveMenuColId(null);
                                }}
                                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 text-left"
                              >
                                <Edit2 size={12} /> Rename Column
                              </button>
                              <button
                                onClick={() => handleTrimColumn(col.id)}
                                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 text-left"
                              >
                                <Sparkles size={12} /> Trim Whitespace
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                onClick={() => handleDeleteColumn(col.id)}
                                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-50 text-rose-600 text-left"
                              >
                                <Trash2 size={12} /> Delete Column
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-slate-400">
                  No records matching the filter.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const isRowSelected = selectedRowIds.includes(row.__rowId);
                return (
                <tr key={row.__rowId} className={`${isRowSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50/80'} transition-colors`}>
                  <td className={`py-2 px-3 text-center font-mono text-[10px] text-slate-400 border-r border-slate-100 ${isRowSelected ? 'bg-emerald-100/60' : 'bg-slate-50/40'}`}>
                    <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRowSelected}
                        onChange={() => toggleRowSelection(row.__rowId)}
                        aria-label={`Select row ${(pageIndex - 1) * pageSize + idx + 1}`}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{(pageIndex - 1) * pageSize + idx + 1}</span>
                    </label>
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={`py-2 px-3 border-r border-slate-100 text-slate-700 max-w-xs truncate font-mono text-[11px] ${selectedColumnSet.has(col.id) ? 'bg-emerald-50/60' : ''}`}
                    >
                      {renderCellContent(row[col.id])}
                    </td>
                  ))}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs shrink-0">
        <div className="text-slate-500">
          Page <span className="font-semibold text-slate-800">{pageIndex}</span> of{' '}
          <span className="font-semibold text-slate-800">{totalPages}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={pageIndex <= 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageIndex >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
