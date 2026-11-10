// ─────────────────────────────────────────────────────────────
//  Kopīgais stāvoklis: localStorage + BroadcastChannel + atsaukšana.
//  Visi logi (pults, ekrāns, redaktors) lasa vienu un to pašu stāvokli;
//  katra izmaiņa tiek saglabāta un nosūtīta pārējiem logiem.
// ─────────────────────────────────────────────────────────────
import { useSyncExternalStore } from 'react';
import { produce } from 'immer';
import type { AppState } from '../types';
import { createDemoState } from '../data/demo';
import { migrateState } from './io';
import { uid } from './util';

const STORAGE_KEY = 'prata-speles:state:v1';
const CHANNEL = 'prata-speles';
const HISTORY_LIMIT = 60;
const tabId = uid('tab');

interface Snapshot {
  state: AppState;
  undoLabel: string | null;
  storageError: string | null;
}

interface HistoryEntry {
  label: string;
  state: AppState;
}

type Message = { type: 'state'; from: string; state: AppState };

let history: HistoryEntry[] = [];
let storageError: string | null = null;
let state: AppState = load() ?? createDemoState();
let snapshot: Snapshot = makeSnapshot();
const listeners = new Set<() => void>();

const channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

channel?.addEventListener('message', (e: MessageEvent<Message>) => {
  const msg = e.data;
  if (msg?.type !== 'state' || msg.from === tabId) return;
  state = msg.state;
  // Ārēja izmaiņa (piem., no redaktora) — vecie atsaukšanas soļi vairs nav droši.
  history = [];
  emit();
});

// Rezerves variants: ja tas pats stāvoklis mainīts citā cilnē bez BroadcastChannel.
if (typeof window !== 'undefined' && !channel) {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      state = JSON.parse(e.newValue);
      emit();
    } catch {
      /* ignorē */
    }
  });
}

function load(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    return parsed?.version === 1 && parsed.tournament && parsed.live ? migrateState(parsed) : null;
  } catch {
    return null;
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageError = null;
  } catch (err) {
    storageError =
      'Neizdevās saglabāt pārlūkā (localStorage ir pilns). Izmantojiet attēlu URL vai mazākus failus un eksportējiet turnīru JSON failā.';
    console.error(err);
  }
}

function makeSnapshot(): Snapshot {
  return { state, undoLabel: history.at(-1)?.label ?? null, storageError };
}

function emit() {
  snapshot = makeSnapshot();
  listeners.forEach((l) => l());
}

function broadcast() {
  try {
    channel?.postMessage({ type: 'state', from: tabId, state } satisfies Message);
  } catch (err) {
    console.error('BroadcastChannel kļūda', err);
  }
}

function apply(next: AppState, undoLabel?: string) {
  if (next === state) return;
  if (undoLabel) {
    history.push({ label: undoLabel, state });
    if (history.length > HISTORY_LIMIT) history.shift();
  }
  state = next;
  persist();
  broadcast();
  emit();
}

// ── Publiskais API ──────────────────────────────────────────

export function getState(): AppState {
  return state;
}

/**
 * Izmaina stāvokli ar immer recepti.
 * @param undo — ja norādīts, darbību var atsaukt (teksts parādās pogā "Atsaukt").
 */
export function commit(recipe: (draft: AppState) => void, undo?: string) {
  apply(produce(state, recipe), undo);
}

export function replaceState(next: AppState, undo?: string) {
  apply(next, undo);
}

export function undo() {
  const entry = history.pop();
  if (!entry) return;
  state = entry.state;
  persist();
  broadcast();
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useStore(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}

export function useAppState(): AppState {
  return useStore().state;
}
