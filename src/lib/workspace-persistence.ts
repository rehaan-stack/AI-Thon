import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type {
  AIAnalysis,
  AppView,
  DataProfile,
  Dataset,
  HistoryEntry,
  QualityScore,
} from '@/types';
import { getFirebaseFirestore } from '@/lib/firebase';

export const WORKSPACE_SCHEMA_VERSION = 1;
const WORKSPACE_COLLECTION = 'workspaces';
const WORKSPACE_DOCUMENT = 'default';
const MAX_WORKSPACE_BYTES = 900_000;

export interface WorkspaceSnapshot {
  schemaVersion: number;
  theme: 'light' | 'dark';
  currentView: AppView;
  originalDataset: Dataset | null;
  workingDataset: Dataset | null;
  profile: DataProfile | null;
  qualityScore: QualityScore | null;
  initialQualityScore: QualityScore | null;
  aiAnalysis: AIAnalysis | null;
  history: HistoryEntry[];
  undoStack: number;
}

type EncodedValue =
  | string
  | number
  | boolean
  | null
  | EncodedValue[]
  | { [key: string]: EncodedValue };

function encode(value: unknown): EncodedValue {
  if (value instanceof Date) {
    return { __tabulytixType: 'date', value: value.toISOString() };
  }
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    const result: { [key: string]: EncodedValue } = {};
    for (const [key, nested] of Object.entries(value)) {
      if (nested !== undefined) result[key] = encode(nested);
    }
    return result;
  }
  if (value === undefined) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value as string | number | boolean | null;
}

function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record.__tabulytixType === 'date' && typeof record.value === 'string') {
      return new Date(record.value);
    }
    return Object.fromEntries(Object.entries(record).map(([key, nested]) => [key, decode(nested)]));
  }
  return value;
}

export function serializeWorkspace(snapshot: WorkspaceSnapshot): string {
  return JSON.stringify(encode(snapshot));
}

export function deserializeWorkspace(payload: unknown): WorkspaceSnapshot | null {
  if (typeof payload !== 'string' || payload.length === 0) return null;
  try {
    const parsed = decode(JSON.parse(payload));
    if (!parsed || typeof parsed !== 'object') return null;
    const snapshot = parsed as Partial<WorkspaceSnapshot>;
    if (snapshot.schemaVersion !== WORKSPACE_SCHEMA_VERSION) return null;
    if (!Array.isArray(snapshot.history) || typeof snapshot.undoStack !== 'number') return null;
    return snapshot as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

function workspaceRef(userId: string) {
  const db = getFirebaseFirestore();
  if (!db) return null;
  return doc(db, 'users', userId, WORKSPACE_COLLECTION, WORKSPACE_DOCUMENT);
}

export async function loadWorkspace(userId: string): Promise<WorkspaceSnapshot | null> {
  const ref = workspaceRef(userId);
  if (!ref) return null;
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return deserializeWorkspace(snapshot.data().payload);
}

export async function saveWorkspace(userId: string, snapshot: WorkspaceSnapshot): Promise<void> {
  const ref = workspaceRef(userId);
  if (!ref) return;
  const payload = serializeWorkspace(snapshot);
  const size = new TextEncoder().encode(payload).byteLength;
  if (size > MAX_WORKSPACE_BYTES) {
    throw new Error('Workspace is too large to persist in one Firestore document.');
  }
  await setDoc(ref, {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    payload,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteWorkspace(userId: string): Promise<void> {
  const ref = workspaceRef(userId);
  if (ref) await deleteDoc(ref);
}
