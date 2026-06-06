// services/db.ts — Cola SQLite offline-first para denuncias
//
// Este archivo es una cola temporal, NO una réplica de PostgreSQL.
// - La denuncia se inserta aquí primero (siempre, con o sin red).
// - El sync engine la sube al servidor y la marca como 'enviada'.
// - Los registros enviados se limpian a los 7 días.

import * as SQLite from 'expo-sqlite';
import type { TipoViolencia, RelacionAgresor, PreferenciaContacto, FactorRiesgo } from '../types';

export type PendingDenunciaStatus = 'pendiente' | 'enviando' | 'enviada' | 'fallida';

export interface PendingDenuncia {
  id: number;
  local_id: string;
  device_id: string;
  token_anonimo: string;
  codigo_acceso: string | null;   // código corto de seguimiento (6 chars)
  tipo_violencia: TipoViolencia;  // v1 compat — primer tipo seleccionado
  tipos_violencia: string | null; // v2 — JSON array de tipos
  factores_riesgo: string | null; // v2 — JSON array de factores
  relacion_agresor: RelacionAgresor;
  hay_heridos: number;
  foto_local_uri: string | null;
  foto_url: string | null;
  audio_local_uri: string | null;
  audio_url: string | null;
  latitud: number | null;
  longitud: number | null;
  preferencia_contacto: PreferenciaContacto;
  horario_contacto: string | null;
  descripcion: string | null;
  estado: PendingDenunciaStatus;
  created_at: string;
  updated_at: string;
  last_sync_attempt: string | null;
  http_status: number | null;
  server_response: string | null;
  retry_count: number;
}

let _db: SQLite.SQLiteDatabase | null = null;
function getDb(): SQLite.SQLiteDatabase {
  if (!_db) _db = SQLite.openDatabaseSync('ampara.db');
  return _db;
}

export function initDb(): void {
  getDb().execSync(`
    CREATE TABLE IF NOT EXISTS pending_denuncias (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      local_id             TEXT    NOT NULL UNIQUE,
      device_id            TEXT    NOT NULL,
      token_anonimo        TEXT    NOT NULL,
      codigo_acceso        TEXT,
      tipo_violencia       TEXT    NOT NULL,
      tipos_violencia      TEXT,
      factores_riesgo      TEXT,
      relacion_agresor     TEXT    NOT NULL,
      hay_heridos          INTEGER NOT NULL DEFAULT 0,
      foto_local_uri       TEXT,
      foto_url             TEXT,
      audio_local_uri      TEXT,
      audio_url            TEXT,
      latitud              REAL,
      longitud             REAL,
      preferencia_contacto TEXT    NOT NULL DEFAULT 'ninguno',
      horario_contacto     TEXT,
      descripcion          TEXT,
      estado               TEXT    NOT NULL DEFAULT 'pendiente',
      created_at           TEXT    NOT NULL,
      updated_at           TEXT    NOT NULL,
      last_sync_attempt    TEXT,
      http_status          INTEGER,
      server_response      TEXT,
      retry_count          INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Migraciones incrementales — seguro ejecutar en cada arranque
  const migraciones = [
    `ALTER TABLE pending_denuncias ADD COLUMN descripcion TEXT`,
    `ALTER TABLE pending_denuncias ADD COLUMN tipos_violencia TEXT`,
    `ALTER TABLE pending_denuncias ADD COLUMN factores_riesgo TEXT`,
    `ALTER TABLE pending_denuncias ADD COLUMN codigo_acceso TEXT`,
  ];
  for (const sql of migraciones) {
    try { getDb().execSync(sql); } catch { /* columna ya existe */ }
  }

  // Resetear registros atascados en 'enviando' (crash durante sync anterior)
  getDb().runSync(
    `UPDATE pending_denuncias SET estado = 'pendiente', updated_at = ? WHERE estado = 'enviando'`,
    [new Date().toISOString()],
  );
}

// ─── Escritura ────────────────────────────────────────────────────────────────

export async function insertPendingDenuncia(d: {
  local_id: string;
  device_id: string;
  token_anonimo: string;
  codigo_acceso?: string | null;
  tipos_violencia: TipoViolencia[];
  relacion_agresor: RelacionAgresor;
  factores_riesgo?: FactorRiesgo[];
  hay_heridos: boolean;
  foto_local_uri?: string | null;
  audio_local_uri?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  preferencia_contacto: PreferenciaContacto;
  horario_contacto?: string | null;
  descripcion?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const primerTipo = d.tipos_violencia[0] ?? 'Física';
  const params: Record<string, string | number> = {
    $local_id:             d.local_id,
    $device_id:            d.device_id,
    $token_anonimo:        d.token_anonimo,
    $tipo_violencia:       primerTipo,
    $tipos_violencia:      JSON.stringify(d.tipos_violencia),
    $factores_riesgo:      JSON.stringify(d.factores_riesgo ?? []),
    $relacion_agresor:     d.relacion_agresor,
    $hay_heridos:          d.hay_heridos ? 1 : 0,
    $preferencia_contacto: d.preferencia_contacto,
    $created_at:           now,
    $updated_at:           now,
  };
  if (d.codigo_acceso)    params.$codigo_acceso    = d.codigo_acceso;
  if (d.foto_local_uri)   params.$foto_local_uri   = d.foto_local_uri;
  if (d.audio_local_uri)  params.$audio_local_uri  = d.audio_local_uri;
  if (d.latitud != null)  params.$latitud           = d.latitud;
  if (d.longitud != null) params.$longitud          = d.longitud;
  if (d.horario_contacto) params.$horario_contacto = d.horario_contacto;
  if (d.descripcion)      params.$descripcion      = d.descripcion;

  await getDb().runAsync(
    `INSERT OR IGNORE INTO pending_denuncias
       (local_id, device_id, token_anonimo, codigo_acceso, tipo_violencia, tipos_violencia, factores_riesgo,
        relacion_agresor, hay_heridos, foto_local_uri, foto_url, audio_local_uri, audio_url,
        latitud, longitud, preferencia_contacto, horario_contacto, descripcion,
        estado, created_at, updated_at)
     VALUES
       ($local_id, $device_id, $token_anonimo, $codigo_acceso, $tipo_violencia, $tipos_violencia, $factores_riesgo,
        $relacion_agresor, $hay_heridos, $foto_local_uri, NULL, $audio_local_uri, NULL,
        $latitud, $longitud, $preferencia_contacto, $horario_contacto, $descripcion,
        'pendiente', $created_at, $updated_at)`,
    params,
  );
}

export function markAsSending(id: number): void {
  const now = new Date().toISOString();
  getDb().runSync(
    `UPDATE pending_denuncias SET estado = 'enviando', updated_at = ?, last_sync_attempt = ? WHERE id = ?`,
    [now, now, id],
  );
}

export function markAsSent(id: number, httpStatus: number, serverResponse: string): void {
  getDb().runSync(
    `UPDATE pending_denuncias SET estado = 'enviada', updated_at = ?, http_status = ?, server_response = ? WHERE id = ?`,
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
  if (httpStatus != null)     params.$http_status     = httpStatus;
  if (serverResponse != null) params.$server_response = serverResponse;
  await getDb().runAsync(
    `UPDATE pending_denuncias
     SET estado = 'fallida', updated_at = $now, last_sync_attempt = $now,
         http_status = $http_status, server_response = $server_response,
         retry_count = retry_count + 1
     WHERE id = $id`,
    params,
  );
}

export function updateMediaUrls(localId: string, fotoUrl?: string, audioUrl?: string): void {
  const now = new Date().toISOString();
  if (fotoUrl) {
    getDb().runSync(
      `UPDATE pending_denuncias SET foto_url = ?, updated_at = ? WHERE local_id = ?`,
      [fotoUrl, now, localId],
    );
  }
  if (audioUrl) {
    getDb().runSync(
      `UPDATE pending_denuncias SET audio_url = ?, updated_at = ? WHERE local_id = ?`,
      [audioUrl, now, localId],
    );
  }
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

export const MAX_RETRY_COUNT = 10;

export function getPendingAndFailedDenuncias(): PendingDenuncia[] {
  return getDb().getAllSync<PendingDenuncia>(
    `SELECT * FROM pending_denuncias
     WHERE estado IN ('pendiente', 'fallida') AND retry_count < ?
     ORDER BY created_at ASC`,
    [MAX_RETRY_COUNT],
  );
}

// ─── Limpieza ─────────────────────────────────────────────────────────────────

export function cleanOldSentDenuncias(daysOld = 7): void {
  const cutoff = new Date(Date.now() - daysOld * 86_400_000).toISOString();
  getDb().runSync(
    `DELETE FROM pending_denuncias WHERE estado = 'enviada' AND updated_at < ?`,
    [cutoff],
  );
}
