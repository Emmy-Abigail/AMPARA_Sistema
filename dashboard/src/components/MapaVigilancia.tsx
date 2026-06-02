import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.heat';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Clock, User, Flame, Grid3x3 } from 'lucide-react';
import { useMapaReportes, useMapaNoti, useMapaNetlab } from '../hooks/useDashboard';
import type { Filtros, ReporteMapa } from '../types';
import { Badge } from './ui/Badge';

// ─── Coordenadas por ubigeo ────────────────────────────────────────────────────

const UBIGEO_CENTROIDS: Record<string, [number, number]> = {
  '01': [-6.77, -79.84],  '02': [-9.53, -77.53],  '03': [-13.16, -74.22],
  '04': [-16.40, -71.53], '05': [-13.16, -74.22],  '06': [-7.15, -78.52],
  '07': [-12.04, -77.04], '08': [-13.52, -71.97],  '09': [-12.78, -74.97],
  '10': [-9.93, -76.24],  '11': [-14.06, -75.73],  '12': [-11.99, -75.29],
  '13': [-8.11, -79.02],  '14': [-6.77, -79.84],   '15': [-12.04, -77.04],
  '16': [-3.74, -73.25],  '17': [-12.59, -69.18],  '18': [-17.19, -70.93],
  '19': [-10.72, -75.40], '20': [-5.19, -80.63],   '21': [-15.84, -70.02],
  '22': [-6.05, -76.98],  '23': [-18.01, -70.25],  '24': [-3.57, -80.45],
  '25': [-8.36, -74.55],
};

function getCoords(ubigeo: string, dpto: string): [number, number] {
  const prefix = ubigeo?.substring(0, 2);
  if (prefix && UBIGEO_CENTROIDS[prefix]) return UBIGEO_CENTROIDS[prefix];
  const dptoMap: Record<string, [number, number]> = {
    'LORETO': [-3.74, -73.25], 'LIMA': [-12.04, -77.04], 'PIURA': [-5.19, -80.63],
    'LA LIBERTAD': [-8.11, -79.02], 'CAJAMARCA': [-7.15, -78.52], 'CUSCO': [-13.52, -71.97],
    'PUNO': [-15.84, -70.02], 'JUNIN': [-11.99, -75.29], 'AREQUIPA': [-16.40, -71.53],
    'SAN MARTIN': [-6.05, -76.98], 'UCAYALI': [-8.36, -74.55], 'HUANUCO': [-9.93, -76.24],
    'ICA': [-14.06, -75.73], 'ANCASH': [-9.53, -77.53], 'LAMBAYEQUE': [-6.77, -79.84],
  };
  const key = dpto?.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return dptoMap[key] ?? [-9.19, -75.01];
}

const PERU_BOUNDS: [[number, number], [number, number]] = [
  [-18.35, -81.33],
  [0.04,  -68.67],
];

function estadoColor(estado: string): string {
  const map: Record<string, string> = {
    enviado: '#0F6E56', en_revision: '#F59E0B', resuelto: '#6B7280',
    rechazado: '#EF4444', cancelado: '#9CA3AF',
  };
  return map[estado] ?? '#0F6E56';
}

// ─── Mapa de calor (leaflet.heat) ─────────────────────────────────────────────

interface HeatPoint { lat: number; lng: number; intensity?: number }

function HeatmapLayer({ points }: { points: HeatPoint[] }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!points.length) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heat = (L as any).heatLayer(
      points.map((p) => [p.lat, p.lng, p.intensity ?? 1]),
      { radius: 25, blur: 20, maxZoom: 10, gradient: { 0.3: '#0F6E56', 0.6: '#F59E0B', 1.0: '#EF4444' } }
    );
    heat.addTo(map);
    layerRef.current = heat;
    return () => { heat.remove(); };
  }, [map, points]);

  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100); }, [map]);
  return null;
}

// ─── Popup con reverse geocoding lazy ─────────────────────────────────────────

function ReportePopup({ r }: { r: ReporteMapa }) {
  const [geoAddr, setGeoAddr] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const fetchAddress = useCallback(async () => {
    if (r.direccion || geoAddr || geoLoading) return;
    setGeoLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${r.lat}&lon=${r.lng}&format=json&accept-language=es`,
        { headers: { 'User-Agent': 'SIVAPRE-Dashboard/1.0' } }
      );
      const data = await res.json();
      if (data?.address) {
        const a = data.address;
        const partes = [
          a.road && a.house_number ? `${a.road} ${a.house_number}` : a.road,
          a.suburb || a.neighbourhood || a.city_district,
          a.city || a.town || a.village || a.county,
        ].filter(Boolean);
        setGeoAddr(partes.join(', ') || data.display_name);
      }
    } catch { /* sin red — muestra coords */ } finally {
      setGeoLoading(false);
    }
  }, [r.lat, r.lng, r.direccion, geoAddr, geoLoading]);

  const address = r.direccion || geoAddr;

  return (
    <Popup maxWidth={300} eventHandlers={{ add: fetchAddress }}>
      <div style={{ minWidth: 220 }}>
        {r.foto_url && (
          <img src={r.foto_url} alt="" style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <User size={13} color="#0F6E56" />
          <strong style={{ fontSize: 13, color: '#111' }}>{r.reporter.nombre}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: '#6b7280', fontSize: 12 }}>
          <Clock size={11} />
          {r.fecha_reporte ? format(new Date(r.fecha_reporte), "d MMM yyyy · HH:mm", { locale: es }) : '—'}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8, fontSize: 12, color: '#374151' }}>
          <MapPin size={11} color="#0F6E56" style={{ marginTop: 2, flexShrink: 0 }} />
          {address ? (
            <span>{address}</span>
          ) : geoLoading ? (
            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Obteniendo dirección…</span>
          ) : (
            <span style={{ color: '#9ca3af', fontFamily: 'monospace' }}>{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</span>
          )}
        </div>
        <p style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>{r.tipo_lugar} — {r.tipo_objeto}</p>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <EstadoBadge estado={r.estado} />
          <LarvasBadge larvas={r.observa_larvas} />
        </div>
        {r.comentarios && (
          <p style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginTop: 6 }}>"{r.comentarios}"</p>
        )}
      </div>
    </Popup>
  );
}

// ─── Panel de top distritos ────────────────────────────────────────────────────

function TopDistritosPanel({ reportes }: { reportes: ReporteMapa[] }) {
  const conteo = reportes.reduce<Record<string, { n: number; prov: string; larvas: number }>>((acc, r) => {
    const key = r.reporter.distrito !== '—' ? r.reporter.distrito : r.reporter.provincia;
    if (!key || key === '—') return acc;
    if (!acc[key]) acc[key] = { n: 0, prov: r.reporter.provincia, larvas: 0 };
    acc[key].n++;
    if (r.observa_larvas === 'Sí, claramente') acc[key].larvas++;
    return acc;
  }, {});

  const ranking = Object.entries(conteo)
    .sort(([, a], [, b]) => b.n - a.n)
    .slice(0, 5);

  if (!ranking.length) return null;
  const max = ranking[0][1].n;

  return (
    <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-3">
        <h3 className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Concentración por distrito
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Zonas con mayor densidad de criaderos reportados</p>
      </div>
      <div className="space-y-2">
        {ranking.map(([distrito, { n, prov, larvas }], i) => (
          <div key={distrito} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-semibold text-gray-800 truncate">{distrito}</p>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {larvas > 0 && (
                    <span className="text-[10px] text-red-500 font-bold">⚠ {larvas} larvas</span>
                  )}
                  <span className="text-xs font-bold text-[#0F6E56]">{n}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(n / max) * 100}%`,
                      backgroundColor: larvas / n > 0.5 ? '#EF4444' : larvas > 0 ? '#F59E0B' : '#0F6E56',
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{prov}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-300 mt-3 text-center">
        Rojo = +50% con larvas · Amarillo = algunos · Verde = sin larvas
      </p>
    </div>
  );
}

// ─── Tipos de capa y modo de visualización ────────────────────────────────────

type LayerKey = 'sivapre' | 'noti' | 'netlab';
type MapMode = 'puntos' | 'calor';

const LAYERS: { key: LayerKey; label: string; color: string }[] = [
  { key: 'sivapre', label: 'SIVAPRE',  color: '#0F6E56' },
  { key: 'noti',    label: 'NOTI',     color: '#3B82F6' },
  { key: 'netlab',  label: 'NETLAB',   color: '#EF4444' },
];

interface Props {
  filtros: Partial<Filtros>;
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function MapaVigilancia({ filtros }: Props) {
  const { data: reportes, isLoading: loadingR } = useMapaReportes(filtros);
  const { data: noti } = useMapaNoti(filtros);
  const { data: netlab } = useMapaNetlab(filtros);

  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(new Set(['sivapre', 'noti', 'netlab']));
  const [mapMode, setMapMode] = useState<MapMode>('puntos');

  const toggleLayer = (key: LayerKey) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const heatPoints: HeatPoint[] = (reportes ?? []).map((r) => ({
    lat: r.lat,
    lng: r.lng,
    intensity: r.observa_larvas === 'Sí, claramente' ? 1.5 : 0.6,
  }));

  const totalPuntos =
    (activeLayers.has('sivapre') ? (reportes?.length ?? 0) : 0) +
    (activeLayers.has('noti') ? (noti?.length ?? 0) : 0) +
    (activeLayers.has('netlab') ? (netlab?.length ?? 0) : 0);

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Mapa de Vigilancia Multicapa
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{totalPuntos} puntos visibles</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Modo de visualización */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setMapMode('puntos')}
                title="Puntos con clustering"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  mapMode === 'puntos' ? 'bg-[#0F6E56] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Grid3x3 size={12} /> Puntos
              </button>
              <button
                onClick={() => setMapMode('calor')}
                title="Mapa de calor"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border-l border-gray-200 transition-all ${
                  mapMode === 'calor' ? 'bg-[#0F6E56] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Flame size={12} /> Calor
              </button>
            </div>

            {/* Toggles de capa (solo en modo puntos para claridad) */}
            {LAYERS.map(({ key, label, color }) => {
              const active = activeLayers.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all ${
                    active ? 'text-white border-transparent' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                  style={active ? { backgroundColor: color, borderColor: color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: active ? 'rgba(255,255,255,0.8)' : color }}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Leyenda del modo calor */}
        {mapMode === 'calor' && (
          <div className="px-5 pb-3 flex items-center gap-4">
            <span className="text-xs text-gray-500">Densidad:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#0F6E56]" />
              <span className="text-xs text-gray-500">Baja</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <span className="text-xs text-gray-500">Media</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
              <span className="text-xs text-gray-500">Alta</span>
            </div>
            <span className="text-xs text-gray-400 ml-2">· Intensidad mayor donde hay larvas confirmadas</span>
          </div>
        )}

        {/* Leyenda de capas en modo puntos */}
        {mapMode === 'puntos' && (
          <div className="px-5 pb-3 flex flex-wrap gap-3">
            {LAYERS.map(({ key, label, color }) => activeLayers.has(key) && (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-500">{label === 'SIVAPRE' ? 'SIVAPRE Criaderos (agrupados)' : label === 'NOTI' ? 'NOTI Sospechosos/Probables' : 'NETLAB Confirmados'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Mapa */}
        <div className="relative">
          {loadingR && (
            <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#0F6E56] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <MapContainer
            center={[-9.19, -75.01]}
            zoom={5}
            minZoom={4}
            maxZoom={18}
            maxBounds={PERU_BOUNDS}
            maxBoundsViscosity={0.9}
            style={{ height: '460px', width: '100%' }}
            scrollWheelZoom
          >
            <MapResizer />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />

            {/* Modo calor: solo SIVAPRE */}
            {mapMode === 'calor' && activeLayers.has('sivapre') && heatPoints.length > 0 && (
              <HeatmapLayer points={heatPoints} />
            )}

            {/* Modo puntos: SIVAPRE con clustering */}
            {mapMode === 'puntos' && activeLayers.has('sivapre') && (
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={60}
              >
                {(reportes ?? []).map((r) => (
                  <CircleMarker
                    key={r.id}
                    center={[r.lat, r.lng]}
                    radius={7}
                    pathOptions={{
                      fillColor: estadoColor(r.estado),
                      fillOpacity: 0.85,
                      color: '#fff',
                      weight: 1.5,
                    }}
                  >
                    <ReportePopup r={r} />
                  </CircleMarker>
                ))}
              </MarkerClusterGroup>
            )}

            {/* NOTI — siempre puntos (ya son agregados por provincia) */}
            {activeLayers.has('noti') && (noti ?? []).map((n, i) => {
              const coords = getCoords(n.ubigeo, n.departamento);
              return (
                <CircleMarker
                  key={`noti-${i}`}
                  center={coords}
                  radius={Math.min(6 + Math.sqrt(n.total) * 2, 30)}
                  pathOptions={{ fillColor: '#3B82F6', fillOpacity: 0.5, color: '#2563EB', weight: 2 }}
                >
                  <Popup>
                    <div>
                      <p style={{ fontWeight: 600 }}>{n.provincia}, {n.departamento}</p>
                      <p style={{ color: '#2563EB', fontWeight: 700, fontSize: 16 }}>{n.total} casos</p>
                      <p style={{ color: '#6b7280', fontSize: 12 }}>{n.tipo_diagnostico} · UBIGEO {n.ubigeo}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* NETLAB — siempre puntos */}
            {activeLayers.has('netlab') && (netlab ?? []).map((nl, i) => {
              const coords = getCoords(nl.ubigeo, nl.departamento);
              return (
                <CircleMarker
                  key={`netlab-${i}`}
                  center={[coords[0] + 0.05, coords[1] + 0.05]}
                  radius={Math.min(6 + Math.sqrt(nl.total) * 2.5, 35)}
                  pathOptions={{ fillColor: '#EF4444', fillOpacity: 0.55, color: '#DC2626', weight: 2, dashArray: '4,3' }}
                >
                  <Popup>
                    <div>
                      <p style={{ fontWeight: 600 }}>{nl.distrito}, {nl.provincia}</p>
                      <p style={{ color: '#DC2626', fontWeight: 700, fontSize: 16 }}>{nl.total} confirmados</p>
                      {nl.serotipo && (
                        <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, display: 'inline-block', marginTop: 4 }}>
                          {nl.serotipo}
                        </span>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          </MapContainer>
        </div>
      </div>

      {/* Panel de concentración por distrito */}
      {reportes && reportes.length > 0 && (
        <TopDistritosPanel reportes={reportes} />
      )}
    </>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
    enviado: 'green', en_revision: 'yellow', resuelto: 'gray', rechazado: 'red', cancelado: 'gray',
  };
  const labels: Record<string, string> = {
    enviado: 'Enviado', en_revision: 'En revisión', resuelto: 'Resuelto', rechazado: 'Rechazado', cancelado: 'Cancelado',
  };
  return <Badge variant={map[estado] ?? 'gray'}>{labels[estado] ?? estado}</Badge>;
}

function LarvasBadge({ larvas }: { larvas: string }) {
  if (larvas === 'Sí, claramente') return <Badge variant="red">Con larvas</Badge>;
  if (larvas === 'No estoy seguro') return <Badge variant="yellow">Incierto</Badge>;
  return null;
}
