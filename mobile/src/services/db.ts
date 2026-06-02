// services/db.ts — SQLite local queue for offline-first report submission
//
// This is NOT a replica of PostgreSQL. It is a temporary holding queue:
// - Reports land here first (always, online or offline).
// - The sync engine processes them and marks them 'enviado'.
// - Sent records older than 7 days are pruned automatically.
// - Observability fields (http_status, server_response, retry_count) exist
//   solely for debugging during the pilot, not for application logic.

import * as SQLite from 'expo-sqlite';
import type { TipoLugar, TipoObjeto, ObservaLarvas, ConocimientoDengue } from '../types';

export type PendingReportStatus = 'pendiente' | 'enviando' | 'enviado' | 'fallido';

export interface PendingReport {
  id: number;
  local_id: string;
  device_id: string;
  latitud: number;
  longitud: number;
  direccion: string | null;
  foto_local_uri: string | null;
  foto_url: string | null;
  tipo_lugar: TipoLugar;
  tipo_objeto: TipoObjeto;
  observa_larvas: ObservaLarvas;
  conocimiento_dengue_cercano: ConocimientoDengue | null;
  comentarios: string | null;
  estado: PendingReportStatus;
  created_at: string;
  updated_at: string;
  last_sync_attempt: string | null;
  http_status: number | null;
  server_response: string | null;
  retry_count: number;
}

let _db: SQLite.SQLiteDatabase | null = null;
function getDb(): SQLite.SQLiteDatabase {
  if (!_db) _db = SQLite.openDatabaseSync('sivapre.db');
  return _db;
}

export function initDb(): void {
  getDb().execSync(`
    CREATE TABLE IF NOT EXISTS pending_reports (
      id                          INTEGER PRIMARY KEY AUTOINCREMENT,
      local_id                    TEXT    NOT NULL UNIQUE,
      device_id                   TEXT    NOT NULL,
      latitud                     REAL    NOT NULL,
      longitud                    REAL    NOT NULL,
      direccion                   TEXT,
      foto_local_uri              TEXT,
      foto_url                    TEXT,
      tipo_lugar                  TEXT    NOT NULL,
      tipo_objeto                 TEXT    NOT NULL,
      observa_larvas              TEXT    NOT NULL,
      conocimiento_dengue_cercano TEXT,
      comentarios                 TEXT,
      estado                      TEXT    NOT NULL DEFAULT 'pendiente',
      created_at                  TEXT    NOT NULL,
      updated_at                  TEXT    NOT NULL,
      last_sync_attempt           TEXT,
      http_status                 INTEGER,
      server_response             TEXT,
      retry_count                 INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Migration for installs that predate the 'direccion' column.
  // ALTER TABLE ADD COLUMN IF NOT EXISTS requires SQLite 3.35+ which is not
  // guaranteed across all environments — try/catch is the safe alternative.
  try {
    getDb().execSync(`ALTER TABLE pending_reports ADD COLUMN direccion TEXT`);
  } catch {
    // Column already exists — safe to ignore.
  }

  // Records stuck in 'enviando' mean the app crashed mid-sync. Reset them so
  // they are picked up on the next sync instead of being silently abandoned.
  getDb().runSync(
    `UPDATE pending_reports SET estado = 'pendiente', updated_at = ? WHERE estado = 'enviando'`,
    [new Date().toISOString()],
  );
}

// ─── Write operations ─────────────────────────────────────────────────────────

export async function insertPendingReport(report: {
  local_id: string;
  device_id: string;
  latitud: number;
  longitud: number;
  direccion: string | null;
  foto_local_uri: string | null;
  tipo_lugar: TipoLugar;
  tipo_objeto: TipoObjeto;
  observa_larvas: ObservaLarvas;
  conocimiento_dengue_cercano: ConocimientoDengue | null;
  comentarios: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  // Pasar null por el bridge JS→Kotlin de expo-sqlite causa
  // "Cannot convert '[object Object]' to a Kotlin type".
  // Solución: omitir las claves con null — SQLite las trata como NULL nativo.
  const params: Record<string, string | number> = {
    $local_id:       report.local_id,
    $device_id:      report.device_id,
    $latitud:        report.latitud,
    $longitud:       report.longitud,
    $tipo_lugar:     report.tipo_lugar,
    $tipo_objeto:    report.tipo_objeto,
    $observa_larvas: report.observa_larvas,
    $created_at:     now,
    $updated_at:     now,
  };
  if (report.direccion != null)                   params.$direccion      = report.direccion;
  if (report.foto_local_uri != null)              params.$foto_local_uri = report.foto_local_uri;
  if (report.conocimiento_dengue_cercano != null) params.$conocimiento   = report.conocimiento_dengue_cercano;
  if (report.comentarios != null)                 params.$comentarios    = report.comentarios;

  await getDb().runAsync(
    `INSERT OR IGNORE INTO pending_reports
       (local_id, device_id, latitud, longitud, direccion, foto_local_uri, foto_url,
        tipo_lugar, tipo_objeto, observa_larvas, conocimiento_dengue_cercano,
        comentarios, estado, created_at, updated_at)
     VALUES ($local_id, $device_id, $latitud, $longitud, $direccion, $foto_local_uri,
             NULL, $tipo_lugar, $tipo_objeto, $observa_larvas, $conocimiento,
             $comentarios, 'pendiente', $created_at, $updated_at)`,
    params,
  );
}

export function markAsSending(id: number): void {
  const now = new Date().toISOString();
  getDb().runSync(
    `UPDATE pending_reports
     SET estado = 'enviando', updated_at = ?, last_sync_attempt = ?
     WHERE id = ?`,
    [now, now, id],
  );
}

export function markAsSent(id: number, httpStatus: number, serverResponse: string): void {
  getDb().runSync(
    `UPDATE pending_reports
     SET estado = 'enviado', updated_at = ?, http_status = ?, server_response = ?
     WHERE id = ?`,
    [new Date().toISOString(), httpStatus, serverResponse, id],
  );
}

export async function markAsFailed(
  id: number,
  httpStatus: number | null,
  serverResponse: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  const params: Record<string, string | number> = { $now: now, $id: id };
  if (httpStatus != null)     params.$http_status      = httpStatus;
  if (serverResponse != null) params.$server_response  = serverResponse;

  await getDb().runAsync(
    `UPDATE pending_reports
     SET estado = 'fallido', updated_at = $now, last_sync_attempt = $now,
         http_status = $http_status, server_response = $server_response,
         retry_count = retry_count + 1
     WHERE id = $id`,
    params,
  );
}

export function updateFotoUrl(localId: string, fotoUrl: string): void {
  getDb().runSync(
    `UPDATE pending_reports SET foto_url = ?, updated_at = ? WHERE local_id = ?`,
    [fotoUrl, new Date().toISOString(), localId],
  );
}

// ─── Read operations ──────────────────────────────────────────────────────────

// Máximo de reintentos antes de abandonar un reporte.
// Un reporte en 'fallido' con retry_count >= MAX_RETRY_COUNT ya no se procesa.
// Queda en SQLite como registro de debugging y se limpia a los 7 días.
// Razón: un error 422 (validación) nunca va a resolverse solo — reintentar
// infinitamente satura el backend y el dispositivo sin ningún beneficio.
export const MAX_RETRY_COUNT = 10;

export function getPendingAndFailedReports(): PendingReport[] {
  return getDb().getAllSync<PendingReport>(
    `SELECT * FROM pending_reports
     WHERE estado IN ('pendiente', 'fallido')
       AND retry_count < ?
     ORDER BY created_at ASC`,
    [MAX_RETRY_COUNT],
  );
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export function cleanOldSentReports(daysOld = 7): void {
  const cutoff = new Date(Date.now() - daysOld * 86_400_000).toISOString();
  getDb().runSync(
    `DELETE FROM pending_reports WHERE estado = 'enviado' AND updated_at < ?`,
    [cutoff],
  );
}
