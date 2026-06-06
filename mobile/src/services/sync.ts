// services/sync.ts — motor de sincronización offline-first
//
// Orden de activación (principal → complementario):
//   1. Sync inmediato tras cada insertPendingDenuncia()
//   2. Listener NetInfo   — sync al recuperar conectividad
//   3. Listener AppState  — sync al volver al primer plano
//   4. BackgroundFetch    — sync periódico best-effort

import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as FileSystem from 'expo-file-system';

import { denunciasService } from './denuncias';
import {
  getPendingAndFailedDenuncias,
  markAsSending,
  markAsSent,
  markAsFailed,
  updateMediaUrls,
  cleanOldSentDenuncias,
} from './db';
import type { TipoViolencia, RelacionAgresor, PreferenciaContacto, FactorRiesgo } from '../types';

let isSyncing = false;

export async function syncPendingDenuncias(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const pending = getPendingAndFailedDenuncias();
    if (pending.length === 0) return;

    for (const denuncia of pending) {
      markAsSending(denuncia.id);

      // Subir foto si existe localmente pero no tiene URL de servidor aún
      let fotoUrl = denuncia.foto_url;
      if (denuncia.foto_local_uri && !fotoUrl) {
        try {
          fotoUrl = await denunciasService.subirFoto(denuncia.foto_local_uri);
          updateMediaUrls(denuncia.local_id, fotoUrl, undefined);
        } catch {
          fotoUrl = null;
        }
      }

      // Subir audio si existe localmente pero no tiene URL de servidor aún
      let audioUrl = denuncia.audio_url;
      if (denuncia.audio_local_uri && !audioUrl) {
        try {
          audioUrl = await denunciasService.subirAudio(denuncia.audio_local_uri);
          updateMediaUrls(denuncia.local_id, undefined, audioUrl);
        } catch {
          audioUrl = null;
        }
      }

      try {
        const tiposRaw: TipoViolencia[] = denuncia.tipos_violencia
          ? (JSON.parse(denuncia.tipos_violencia) as TipoViolencia[])
          : [denuncia.tipo_violencia as TipoViolencia];

        const factoresRaw: FactorRiesgo[] = denuncia.factores_riesgo
          ? (JSON.parse(denuncia.factores_riesgo) as FactorRiesgo[])
          : [];

        const { status, data } = await denunciasService.crearRaw({
          tipos_violencia:     tiposRaw,
          relacion_agresor:    denuncia.relacion_agresor as RelacionAgresor,
          factores_riesgo:     factoresRaw,
          hay_heridos:         denuncia.hay_heridos === 1,
          foto_url:            fotoUrl ?? undefined,
          audio_url:           audioUrl ?? undefined,
          latitud:             denuncia.latitud ?? undefined,
          longitud:            denuncia.longitud ?? undefined,
          preferencia_contacto: denuncia.preferencia_contacto as PreferenciaContacto,
          horario_contacto:    denuncia.horario_contacto ?? undefined,
          descripcion:         denuncia.descripcion ?? undefined,
          device_id:           denuncia.device_id,
          local_id:            denuncia.local_id,
          token_anonimo:       denuncia.token_anonimo,
          codigo_acceso:       denuncia.codigo_acceso ?? undefined,
        });

        markAsSent(denuncia.id, status, JSON.stringify(data) ?? '{}');

        if (denuncia.foto_local_uri) {
          FileSystem.deleteAsync(denuncia.foto_local_uri, { idempotent: true }).catch(() => {});
        }
        if (denuncia.audio_local_uri) {
          FileSystem.deleteAsync(denuncia.audio_local_uri, { idempotent: true }).catch(() => {});
        }
      } catch (err: any) {
        const httpStatus: number | null = err?.response?.status ?? null;
        const body: string | null = err?.response?.data
          ? JSON.stringify(err.response.data)
          : err?.message ?? null;

        if (httpStatus === 409) {
          markAsSent(denuncia.id, 409, body ?? '{"duplicado":true}');
        } else {
          await markAsFailed(denuncia.id, httpStatus, body);
        }
      }
    }

    cleanOldSentDenuncias(7);
  } finally {
    isSyncing = false;
  }
}

// ─── Listeners en primer plano ────────────────────────────────────────────────

let _netUnsubscribe: (() => void) | null = null;
let _appStateSub: { remove: () => void } | null = null;

export function startSyncListeners(): void {
  _netUnsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      syncPendingDenuncias();
    }
  });
  _appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'active') syncPendingDenuncias();
  });
}

export function stopSyncListeners(): void {
  _netUnsubscribe?.();
  _netUnsubscribe = null;
  _appStateSub?.remove();
  _appStateSub = null;
}

// ─── Background fetch (complementario) ───────────────────────────────────────

const BACKGROUND_TASK = 'ampara-bg-sync';

TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    await syncPendingDenuncias();
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
    // No soportado o ya registrado
  }
}
