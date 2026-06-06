import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, LayerGroup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, EyeOff } from 'lucide-react';
import { useMapaDenuncias, useSosAlertas } from '../hooks/useDashboard';
import type { Filtros, DenunciaMapa, NivelRiesgo } from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const PERU_CENTER: [number, number] = [-9.19, -75.01];
const PERU_BOUNDS: [[number, number], [number, number]] = [[-18.35, -81.33], [0.04, -68.67]];

function nivelColor(nivel: NivelRiesgo): string {
  if (nivel === 'urgente') return '#EF4444';
  if (nivel === 'alto')    return '#F59E0B';
  if (nivel === 'medio')   return '#D97706';
  if (nivel === 'bajo')    return '#16A34A';
  return '#8B43D4';
}

function tiempoDesde(fechaStr?: string): string {
  if (!fechaStr) return '';
  return formatDistanceToNow(new Date(fechaStr), { addSuffix: true, locale: es });
}

const ESTADO_LABEL: Record<string, string> = {
  nueva:                  'Sin asignar',
  asignada:               'Asignada',
  en_seguimiento:         'En seguimiento',
  derivada:               'Derivada',
  pendiente_confirmacion: 'Pend. confirmación',
  cerrada:                'Cerrada',
};

function MapResizer() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100); }, [map]);
  return null;
}

// ─── Popup denuncia ────────────────────────────────────────────────────────────

function DenunciaPopup({ d, onSelect }: { d: DenunciaMapa; onSelect?: (id: string) => void }) {
  const color      = nivelColor(d.nivel_riesgo);
  const sinAsignar = d.estado === 'nueva';

  return (
    <Popup maxWidth={250} className="ampara-popup">
      <div style={{ minWidth: 210, fontFamily: 'system-ui, sans-serif', padding: '2px 0' }}>

        {/* Cabecera con acento de color */}
        <div style={{
          borderLeft: `3px solid ${color}`,
          paddingLeft: 10,
          marginBottom: 10,
        }}>
          <p style={{ fontWeight: 800, fontSize: 13, color: '#1A0A2E', margin: '0 0 2px' }}>
            {d.tipo_violencia}
          </p>
          {d.relacion_agresor && (
            <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>{d.relacion_agresor}</p>
          )}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{
            background: color + '20', color,
            padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          }}>
            {d.nivel_riesgo}
          </span>
          <span style={{
            background: sinAsignar ? '#EFF6FF' : '#F3EFFE',
            color: sinAsignar ? '#1D4ED8' : '#5E4480',
            padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          }}>
            {ESTADO_LABEL[d.estado] ?? d.estado}
          </span>
          {d.hay_heridos && (
            <span style={{
              background: '#FEF2F2', color: '#DC2626',
              padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            }}>
              ⚠ Heridos
            </span>
          )}
        </div>

        {/* Tiempo */}
        {d.fecha_denuncia && (
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 8px' }}>
            Reportado {tiempoDesde(d.fecha_denuncia)}
          </p>
        )}

        {/* CTA */}
        {onSelect && (
          <button
            onClick={() => onSelect(d.id)}
            style={{
              width: '100%',
              background: '#8B43D4',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: 2,
            }}
          >
            Ver expediente →
          </button>
        )}
      </div>
    </Popup>
  );
}

// ─── Popup SOS ─────────────────────────────────────────────────────────────────

function SosPopup({ alerta }: {
  alerta: { id: string; usuario_nombre: string | null; sms_enviados: number; fecha_activacion: string; latitud: number | null; longitud: number | null }
}) {
  return (
    <Popup maxWidth={230}>
      <div style={{ minWidth: 190, fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ fontWeight: 800, fontSize: 14, color: '#DC2626', margin: '0 0 5px' }}>
          🆘 ALERTA SOS ACTIVA
        </p>
        <p style={{ fontSize: 12, color: '#1A0A2E', margin: '0 0 2px', fontWeight: 600 }}>
          {alerta.usuario_nombre ?? 'Usuaria anónima'}
        </p>
        <p style={{ fontSize: 11, color: '#6B7280', margin: '0 0 6px' }}>
          {tiempoDesde(alerta.fecha_activacion)}
        </p>
        {alerta.sms_enviados > 0 && (
          <p style={{ fontSize: 11, color: '#6B7280', margin: '0 0 6px' }}>
            📨 {alerta.sms_enviados} SMS enviado{alerta.sms_enviados > 1 ? 's' : ''} al círculo
          </p>
        )}
        {alerta.latitud && alerta.longitud && (
          <a
            href={`https://maps.google.com/?q=${alerta.latitud},${alerta.longitud}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}
          >
            📍 Abrir en Google Maps
          </a>
        )}
      </div>
    </Popup>
  );
}

// ─── Leyenda flotante ──────────────────────────────────────────────────────────

function LeyendaMapa({ sinAsignarCount }: { sinAsignarCount: number }) {
  return (
    <div className="absolute bottom-3 left-3 z-[500] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-100 shadow-md px-3 py-2.5 text-xs space-y-1.5">
      {[
        { color: '#EF4444', label: 'Urgente' },
        { color: '#F59E0B', label: 'Alto / Medio' },
        { color: '#16A34A', label: 'Bajo' },
        { color: '#8B43D4', label: 'Moderado' },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-gray-600">{label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-blue-600 flex-shrink-0" />
        <span className="text-blue-700 font-semibold">Sin asignar ({sinAsignarCount})</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-red-600" style={{ boxShadow: '0 0 0 2px #fee2e2' }} />
        <span className="text-red-600 font-semibold">SOS activa</span>
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function MapaVigilancia({
  filtros: _filtros,
  onSelectDenuncia,
}: {
  filtros: Partial<Filtros>;
  onSelectDenuncia?: (id: string) => void;
}) {
  const { data: todasDenuncias, isLoading } = useMapaDenuncias();
  const { data: sosAlertas = [] }           = useSosAlertas();
  const [mostrarCerradas, setMostrarCerradas] = useState(false);

  // Filtrado local: ocultar cerradas por defecto
  const denuncias = (todasDenuncias ?? []).filter(
    (d) => mostrarCerradas || d.estado !== 'cerrada',
  );

  // Stats para el header
  const activos     = denuncias.filter((d) => d.estado !== 'cerrada');
  const urgentes    = activos.filter((d) => d.nivel_riesgo === 'urgente');
  const sinAsignar  = activos.filter((d) => d.estado === 'nueva');
  const sosActivas  = sosAlertas.filter((s) => s.latitud != null && s.longitud != null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Mapa de Denuncias
          </h2>
          {/* Stats row */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-gray-500">
              <span className="font-bold text-gray-800">{activos.length}</span> activas
            </span>
            {urgentes.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {urgentes.length} urgente{urgentes.length > 1 ? 's' : ''}
              </span>
            )}
            {sinAsignar.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-blue-600">
                <span className="w-1.5 h-1.5 rounded-full border-2 border-dashed border-blue-500 inline-block" />
                {sinAsignar.length} sin asignar
              </span>
            )}
            {sosActivas.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                🆘 {sosActivas.length} SOS
              </span>
            )}
          </div>
        </div>

        {/* Toggle cerrados */}
        <button
          onClick={() => setMostrarCerradas((v) => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all font-medium ${
            mostrarCerradas
              ? 'border-gray-300 text-gray-600 bg-gray-50'
              : 'border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
        >
          {mostrarCerradas ? <Eye size={13} /> : <EyeOff size={13} />}
          {mostrarCerradas ? 'Mostrando cerradas' : 'Ocultar cerradas'}
        </button>
      </div>

      {/* ── Mapa ───────────────────────────────────────────────────────────── */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 z-[500] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#8B43D4] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <MapContainer
          center={PERU_CENTER}
          zoom={5}
          minZoom={4}
          maxZoom={18}
          maxBounds={PERU_BOUNDS}
          maxBoundsViscosity={0.9}
          style={{ height: '440px', width: '100%' }}
          scrollWheelZoom
        >
          <MapResizer />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />

          {/* Denuncias agrupadas — sin asignar visualmente diferenciadas */}
          <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
            {denuncias.map((d) => {
              const sinAsignarCase = d.estado === 'nueva';
              const color = nivelColor(d.nivel_riesgo);
              return (
                <CircleMarker
                  key={d.id}
                  center={[d.lat, d.lng]}
                  radius={d.hay_heridos ? 11 : sinAsignarCase ? 9 : 7}
                  pathOptions={sinAsignarCase ? {
                    // Sin asignar: círculo hueco con borde discontinuo llamativo
                    fillColor:   'white',
                    fillOpacity: 0.8,
                    color:       color,
                    weight:      2.5,
                    dashArray:   '5 3',
                  } : {
                    // Asignado: círculo sólido normal
                    fillColor:   color,
                    fillOpacity: 0.85,
                    color:       '#fff',
                    weight:      d.hay_heridos ? 2.5 : 1.5,
                  }}
                >
                  <DenunciaPopup d={d} onSelect={onSelectDenuncia} />
                </CircleMarker>
              );
            })}
          </MarkerClusterGroup>

          {/* SOS — fuera del cluster, siempre visible */}
          <LayerGroup>
            {sosActivas.map((s) => (
              <>
                {/* Anillo exterior (halo) */}
                <CircleMarker
                  key={`sos-halo-${s.id}`}
                  center={[s.latitud!, s.longitud!]}
                  radius={22}
                  pathOptions={{
                    fillColor:   '#DC2626',
                    fillOpacity: 0.12,
                    color:       '#DC2626',
                    weight:      1.5,
                    dashArray:   '4 3',
                  }}
                  interactive={false}
                />
                {/* Punto central */}
                <CircleMarker
                  key={`sos-dot-${s.id}`}
                  center={[s.latitud!, s.longitud!]}
                  radius={12}
                  pathOptions={{
                    fillColor:   '#DC2626',
                    fillOpacity: 0.95,
                    color:       '#fff',
                    weight:      3,
                  }}
                >
                  <SosPopup alerta={s} />
                </CircleMarker>
              </>
            ))}
          </LayerGroup>
        </MapContainer>

        {/* Leyenda flotante */}
        <LeyendaMapa sinAsignarCount={sinAsignar.length} />
      </div>
    </div>
  );
}
