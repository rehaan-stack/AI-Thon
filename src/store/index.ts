/**
 * Zustand store — central application state for Tabulytix.
 * Manages original dataset, working dataset, history, diagnostics, and quality scoring.
 */
import { create } from 'zustand';
import {
  Dataset,
  DataProfile,
  QualityScore,
  AIAnalysis,
  HistoryEntry,
  CleaningConfig,
  OperationResult,
  AppView,
  OperationStatus,
} from '@/types';
import { profileDataset, calculateQualityScore } from '@/lib/diagnostics';
import { executeOperation, OPERATION_NAMES } from '@/lib/cleaning';
import { generateLocalAnalysis } from '@/lib/assistant';
import { deepClone, generateId, now } from '@/lib/utils';
import {
  loadWorkspace,
  saveWorkspace,
  type WorkspaceSnapshot,
} from '@/lib/workspace-persistence';

export interface AppState {
  // ─── Theme / Night Mode ───
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // ─── Navigation ───
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // ─── Dataset ───
  originalDataset: Dataset | null;
  workingDataset: Dataset | null;
  setDataset: (dataset: Dataset) => void;
  clearDataset: () => void;
  hydrateWorkspace: (snapshot: WorkspaceSnapshot) => void;

  // ─── Diagnostics ───
  profile: DataProfile | null;
  qualityScore: QualityScore | null;
  initialQualityScore: QualityScore | null;

  // ─── AI ───
  aiAnalysis: AIAnalysis | null;
  refreshAIAnalysis: () => void;

  // ─── History ───
  history: HistoryEntry[];
  undoStack: number; // Points to current position in history
  canUndo: boolean;
  canRedo: boolean;

  // ─── Operations ───
  applyOperation: (config: CleaningConfig) => OperationResult;
  undo: () => void;
  redo: () => void;

  // ─── Refresh ───
  refreshDiagnostics: () => void;

  // ─── Loading ───
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tabulytix_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  }
  // Keep the product presentation bright by default. Users can still opt into
  // Night Mode with the theme toggle, and that explicit choice is persisted.
  return 'light';
};

let activePersistenceUserId: string | null = null;
let persistenceTimer: ReturnType<typeof setTimeout> | null = null;
let persistenceRequest = 0;

function snapshotFromState(state: AppState): WorkspaceSnapshot {
  return {
    schemaVersion: 1,
    theme: state.theme,
    currentView: state.currentView,
    originalDataset: state.originalDataset,
    workingDataset: state.workingDataset,
    profile: state.profile,
    qualityScore: state.qualityScore,
    initialQualityScore: state.initialQualityScore,
    aiAnalysis: state.aiAnalysis,
    history: state.history,
    undoStack: state.undoStack,
  };
}

function scheduleWorkspaceSave(): void {
  if (!activePersistenceUserId) return;
  if (persistenceTimer) clearTimeout(persistenceTimer);
  persistenceTimer = setTimeout(() => {
    persistenceTimer = null;
    const userId = activePersistenceUserId;
    if (!userId) return;
    void saveWorkspace(userId, snapshotFromState(useAppStore.getState())).catch((error) => {
      console.warn('[Tabulytix] Firestore workspace save failed.', error);
    });
  }, 250);
}

export const useAppStore = create<AppState>((set, get) => ({
  // ─── Theme / Night Mode ───
  theme: getInitialTheme(),
  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('tabulytix_theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    }
    set({ theme: next });
    scheduleWorkspaceSave();
  },
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tabulytix_theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
    set({ theme });
    scheduleWorkspaceSave();
  },

  // ─── Navigation ───
  currentView: 'home',
  setCurrentView: (view) => {
    set({ currentView: view });
    scheduleWorkspaceSave();
  },

  // ─── Dataset ───
  originalDataset: null,
  workingDataset: null,

  setDataset: (dataset) => {
    const original = deepClone(dataset);
    const working = deepClone(dataset);
    const profile = profileDataset(working);
    const qualityScore = calculateQualityScore(working, profile);
    const aiAnalysis = generateLocalAnalysis(working, profile, qualityScore);

    set({
      originalDataset: original,
      workingDataset: working,
      profile,
      qualityScore,
      initialQualityScore: deepClone(qualityScore),
      aiAnalysis,
      history: [],
      undoStack: -1,
      canUndo: false,
      canRedo: false,
      currentView: 'overview',
    });
    scheduleWorkspaceSave();
  },

  clearDataset: () => {
    set({
      originalDataset: null,
      workingDataset: null,
      profile: null,
      qualityScore: null,
      initialQualityScore: null,
      aiAnalysis: null,
      history: [],
      undoStack: -1,
      canUndo: false,
      canRedo: false,
      currentView: 'landing',
    });
    scheduleWorkspaceSave();
  },

  hydrateWorkspace: (snapshot) => {
    const canUndo = snapshot.undoStack >= 0;
    const canRedo = snapshot.undoStack + 1 < snapshot.history.length;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tabulytix_theme', snapshot.theme);
      document.documentElement.classList.toggle('dark', snapshot.theme === 'dark');
    }
    set({
      theme: snapshot.theme,
      currentView: snapshot.currentView,
      originalDataset: snapshot.originalDataset,
      workingDataset: snapshot.workingDataset,
      profile: snapshot.profile,
      qualityScore: snapshot.qualityScore,
      initialQualityScore: snapshot.initialQualityScore,
      aiAnalysis: snapshot.aiAnalysis,
      history: snapshot.history,
      undoStack: snapshot.undoStack,
      canUndo,
      canRedo,
      isLoading: false,
      loadingMessage: '',
    });
  },

  // ─── Diagnostics ───
  profile: null,
  qualityScore: null,
  initialQualityScore: null,

  refreshDiagnostics: () => {
    const { workingDataset } = get();
    if (!workingDataset) return;
    const profile = profileDataset(workingDataset);
    const qualityScore = calculateQualityScore(workingDataset, profile);
    set({ profile, qualityScore });
    scheduleWorkspaceSave();
  },

  // ─── AI ───
  aiAnalysis: null,
  refreshAIAnalysis: () => {
    const { workingDataset, profile, qualityScore } = get();
    if (!workingDataset || !profile || !qualityScore) return;
    const aiAnalysis = generateLocalAnalysis(workingDataset, profile, qualityScore);
    set({ aiAnalysis });
    scheduleWorkspaceSave();
  },

  // ─── History ───
  history: [],
  undoStack: -1,
  canUndo: false,
  canRedo: false,

  // ─── Operations ───
  applyOperation: (config) => {
    const { workingDataset, history, undoStack } = get();
    if (!workingDataset) {
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
        errors: ['No dataset loaded.'],
      };
    }

    const result = executeOperation(workingDataset, config);

    if (!result.success || !result.resultDataset) {
      return result;
    }

    // Check if the operation actually changed anything
    const isNoop = result.cellsChanged === 0 && result.rowsRemoved === 0 && result.rowsAdded === 0;
    if (isNoop) {
      return result;
    }

    // Create history entry with snapshot before
    const entry: HistoryEntry = {
      id: generateId(),
      operationName: OPERATION_NAMES[config.actionId] || config.actionId,
      actionId: config.actionId,
      config: deepClone(config),
      timestamp: now(),
      status: 'applied' as OperationStatus,
      rowsAffected: result.rowsAffected,
      cellsChanged: result.cellsChanged,
      rowsRemoved: result.rowsRemoved,
      warnings: result.warnings,
      snapshotBefore: deepClone(workingDataset),
    };

    // If we're in the middle of history (after undo), discard the redo branch
    const newHistory = history.slice(0, undoStack + 1);
    newHistory.push(entry);

    const newWorking = deepClone(result.resultDataset);
    const profile = profileDataset(newWorking);
    const qualityScore = calculateQualityScore(newWorking, profile);
    const aiAnalysis = generateLocalAnalysis(newWorking, profile, qualityScore);

    set({
      workingDataset: newWorking,
      history: newHistory,
      undoStack: newHistory.length - 1,
      canUndo: true,
      canRedo: false,
      profile,
      qualityScore,
      aiAnalysis,
    });
    scheduleWorkspaceSave();

    return result;
  },

  undo: () => {
    const { history, undoStack } = get();
    if (undoStack < 0) return;

    const entry = history[undoStack];
    const restoredDataset = deepClone(entry.snapshotBefore);

    // Mark the entry as undone
    const newHistory = [...history];
    newHistory[undoStack] = { ...newHistory[undoStack], status: 'undone' };

    const newUndoStack = undoStack - 1;
    const profile = profileDataset(restoredDataset);
    const qualityScore = calculateQualityScore(restoredDataset, profile);
    const aiAnalysis = generateLocalAnalysis(restoredDataset, profile, qualityScore);

    set({
      workingDataset: restoredDataset,
      history: newHistory,
      undoStack: newUndoStack,
      canUndo: newUndoStack >= 0,
      canRedo: true,
      profile,
      qualityScore,
      aiAnalysis,
    });
    scheduleWorkspaceSave();
  },

  redo: () => {
    const { history, undoStack, workingDataset } = get();
    const redoIndex = undoStack + 1;
    if (redoIndex >= history.length || !workingDataset) return;

    const entry = history[redoIndex];

    // Re-execute the operation on current dataset
    const result = executeOperation(workingDataset, entry.config);
    if (!result.success || !result.resultDataset) return;

    const newHistory = [...history];
    newHistory[redoIndex] = { ...newHistory[redoIndex], status: 'reapplied' };

    const newWorking = deepClone(result.resultDataset);
    const profile = profileDataset(newWorking);
    const qualityScore = calculateQualityScore(newWorking, profile);
    const aiAnalysis = generateLocalAnalysis(newWorking, profile, qualityScore);

    set({
      workingDataset: newWorking,
      history: newHistory,
      undoStack: redoIndex,
      canUndo: true,
      canRedo: redoIndex + 1 < history.length,
      profile,
      qualityScore,
      aiAnalysis,
    });
    scheduleWorkspaceSave();
  },

  // ─── Loading ───
  isLoading: false,
  loadingMessage: '',
  setLoading: (loading, message) => set({ isLoading: loading, loadingMessage: message || '' }),
}));

export async function attachWorkspacePersistence(userId: string): Promise<boolean> {
  const request = ++persistenceRequest;
  activePersistenceUserId = null;
  if (persistenceTimer) {
    clearTimeout(persistenceTimer);
    persistenceTimer = null;
  }
  useAppStore.getState().clearDataset();

  let snapshot: WorkspaceSnapshot | null = null;
  try {
    snapshot = await loadWorkspace(userId);
  } catch (error) {
    console.warn('[Tabulytix] Firestore workspace load failed; starting with an empty workspace.', error);
  }

  if (request !== persistenceRequest) return false;
  activePersistenceUserId = userId;
  if (snapshot) {
    useAppStore.getState().hydrateWorkspace(snapshot);
    return true;
  } else {
    scheduleWorkspaceSave();
    return false;
  }
}

export function detachWorkspacePersistence(): void {
  persistenceRequest += 1;
  activePersistenceUserId = null;
  if (persistenceTimer) {
    clearTimeout(persistenceTimer);
    persistenceTimer = null;
  }
  useAppStore.getState().clearDataset();
}
