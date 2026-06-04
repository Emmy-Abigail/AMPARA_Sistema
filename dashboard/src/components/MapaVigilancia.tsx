import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import { useMapaDenuncias } from '../hooks/useDashboard';
import type { Filtros, DenunciaMapa, NivelRiesgo } from '../types';

const PERU_CENTER: [number, number] = [-9.19, -75.01];
const PERU_BOUNDS: [[number, number], [number, number]] = [[-18.35, -81.33], [0.04, -68.67]];

function nivelColor(nivel: NivelRiesgo): string {
  if (nivel === 'urgente') return '#EF4444';
  if (nivel === 'alto')    return '#F59E0B';
  return '#8B43D4';
}

function MapResizer() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100); }, [map]);
  return null;
}

function DenunciaPopup({ d }: { d: DenunciaMapa }) {
  return (
    <Popup maxWidth={260}>
      <div style={{ minWidth: 200 }}>
        <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{d.tipo_violencia}</p>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
          {d.hay_heridos ? '⚠ Con personas heridas' : 'Sin heridos reportados'}
        </p>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <span style={{
            background: nivelColor(d.nivel_riesgo) + '22',
            color: nivelColor(d.nivel_riesgo),
            padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
          }}>
            {d.nivel_riesgo}
          </span>
          <span style={{
            background: '#f3f4f6', color: '#6b7280',
            padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
          }}>
            {d.estado}
          </span>
        </div>
      </div>
    </Popup>
  );
}

interface Props {
  filtros: Partial<Filtros>;
}

const LEYENDA: { nivel: NivelRiesgo; color: string; label: string }[] = [
  { nivel: 'urgente',  color: '#EF4444', label: 'Urgente' },
  { nivel: 'alto',     color: '#F59E0B', label: 'Alto' },
  { nivel: 'moderado', color: '#8B43D4', label: 'Moderado' },
];

export function MapaVigilancia({ filtros: _filtros }: Props) {
  const { data: denuncias, isLoading } = useMapaDenuncias();
  const total = denuncias?.length ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Mapa de Denuncias
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{total} denuncias geolocalizadas</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {LEYENDA.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
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
          style={{ height: '460px', width: '100%' }}
          scrollWheelZoom
        >
          <MapResizer />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
            {(denuncias ?? []).map((d) => (
              <CircleMarker
                key={d.id}
                center={[d.lat, d.lng]}
                radius={d.hay_heridos ? 10 : 7}
                pathOptions={{
                  fillColor:   nivelColor(d.nivel_riesgo),
                  fillOpacity: 0.85,
                  color:       '#fff',
                  weight:      d.hay_heridos ? 2.5 : 1.5,
                }}
              >
                <DenunciaPopup d={d} />
              </CircleMarker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}
