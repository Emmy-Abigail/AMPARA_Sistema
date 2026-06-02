// services/sync.ts — offline-first sync engine
//
// Architecture (main → supplementary):
//   1. Immediate sync after each insertPendingReport()
//   2. NetInfo listener   — sync when connectivity is restored
//   3. AppState listener  — sync when app returns to foreground
//   4. BackgroundFetch    — best-effort periodic sync (iOS/Android throttle this)
//
// SQLite remains a TEMPORARY QUEUE only. PostgreSQL is the system of record.
// Records are marked 'enviado' (not deleted) for pilot debugging, then pruned
// after 7 days via cleanOldSentReports().

import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as FileSystem from 'expo-file-system';

import { reportesService } from './reportes';
import {
  getPendingAndFailedReports,
  markAsSending,
  markAsSent,
  markAsFailed,
  updateFotoUrl,
  cleanOldSentReports,
} from './db';
import type { TipoLugar, TipoObjeto, ObservaLarvas, ConocimientoDengue } from '../types';

// ─── Global isSyncing flag ────────────────────────────────────────────────────
// Prevents concurrent sync runs (e.g. NetInfo + AppState firing simultaneously).

let isSyncing = false;

// ─── Core sync logic ──────────────────────────────────────────────────────────

export async function syncPendingReports(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const pending = getPendingAndFailedReports();
    if (pending.length === 0) return;

    for (const report of pending) {
      markAsSending(report.id);

      // Step 1: Upload photo if we have a local file but no server URL yet.
      let fotoUrl = report.foto_url;
      if (report.foto_local_uri && !fotoUrl) {
        try {
          fotoUrl = await reportesService.subirFoto(report.foto_local_uri);
          updateFotoUrl(report.local_id, fotoUrl);
        } catch {
          // Photo upload failure does NOT block report creation.
          // Per design: it is better to have the report without photo than to
          // lose the epidemiological event entirely. Photo stays for manual retry.
          fotoUrl = null;
        }
      }

      // Step 2: Create report on backend (with or without photo URL).
      try {
        const { status, data } = await reportesService.crearRaw({
          latitud: report.latitud,
          longitud: report.longitud,
          foto_url: fotoUrl ?? undefined,
          tipo_lugar: report.tipo_lugar as TipoLugar,
          tipo_objeto: report.tipo_objeto as TipoObjeto,
          observa_larvas: report.observa_larvas as ObservaLarvas,
          conocimiento_dengue_cercano:
            (report.conocimiento_dengue_cercano as ConocimientoDengue) ?? undefined,
          comentarios: report.comentarios ?? undefined,
          device_id: report.device_id,
          local_id: report.local_id,
          direccion: report.direccion ?? undefined,
        });

        markAsSent(report.id, status, JSON.stringify(data) ?? '{}');

        // Delete local photo file after successful sync (best effort).
        if (report.foto_local_uri) {
          FileSystem.deleteAsync(report.foto_local_uri, { idempotent: true }).catch(() => {});
        }
      } catch (err: any) {
        const httpStatus: number | null = err?.response?.status ?? null;
        const body: string | null = err?.response?.data
          ? JSON.stringify(err.response.data)
          : err?.message ?? null;

        // 409 Conflict = backend's idempotency guard detected a duplicate.
        // Treat as successfully sent — no need to retry.
        if (httpStatus === 409) {
          markAsSent(report.id, 409, body ?? '{"duplicado":true}');
          if (report.foto_local_uri) {
            FileSystem.deleteAsync(report.foto_local_uri, { idempotent: true }).catch(() => {});
          }
        } else {
          await markAsFailed(report.id, httpStatus, body);
        }
      }
    }

    cleanOldSentReports(7);
  } finally {
    isSyncing = false;
  }
}

// ─── Foreground listeners (primary sync mechanisms) ───────────────────────────

let _netUnsubscribe: (() => void) | null = null;
let _appStateSub: { remove: () => void } | null = null;

export function startSyncListeners(): void {
  _netUnsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      syncPendingReports();
    }
  });

  _appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'active') {
      syncPendingReports();
    }
  });
}

export function stopSyncListeners(): void {
  _netUnsubscribe?.();
  _netUnsubscribe = null;
  _appStateSub?.remove();
  _appStateSub = null;
}

// ─── Background fetch (supplementary — best effort) ───────────────────────────
// iOS and Android heavily throttle background tasks (15 min minimum, often longer).
// This is intentionally supplementary. Never depend on it as a primary mechanism.

const BACKGROUND_TASK = 'sivapre-bg-sync';

TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    await syncPendingReports();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // Not supported or already registered — silently ignore.
  }
}
