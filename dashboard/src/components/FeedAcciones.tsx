import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, CheckCircle, Clock, ChevronDown, ChevronUp, User, ShieldCheck } from 'lucide-react';
import { useFeed, useActualizarEstado } from '../hooks/useDashboard';
import type { Filtros, FeedItem } from '../types';
import { Badge } from './ui/Badge';

type EstadoFiltro = 'todos' | 'enviado' | 'en_revision' | 'resuelto' | 'rechazado';

const FILTROS: { value: EstadoFiltro; label: string }[] = [
  { value: 'todos',       label: 'Todos' },
  { value: 'enviado',     label: 'Enviados' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'resuelto',    label: 'Resueltos' },
  { value: 'rechazado',   label: 'Rechazados' },
];

const ESTADOS_ACCION = [
  { value: 'en_revision', label: 'En revisión' },
  { value: 'resuelto',    label: 'Resuelto' },
  { value: 'rechazado',   label: 'Rechazado' },
];

function estadoVariant(e: string): 'green' | 'yellow' | 'gray' | 'red' {
  const m: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
    enviado: 'green', en_revision: 'yellow', resuelto: 'gray', rechazado: 'red', cancelado: 'gray',
  };
  return m[e] ?? 'gray';
}

function estadoLabel(e: string) {
  const m: Record<string, string> = {
    enviado: 'Enviado', en_revision: 'En revisión', resuelto: 'Resuelto',
    rechazado: 'Rechazado', cancelado: 'Cancelado',
  };
  return m[e] ?? e;
}

function FeedCard({ item }: { item: FeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const { mutate: cambiarEstado, isPending } = useActualizarEstado();

  const esCerrado = ['resuelto', 'rechazado', 'cancelado'].includes(item.estado);

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      esCerrado ? 'border-gray-100 opacity-80' : 'border-gray-200 hover:border-[#0F6E56]/30'
    }`}>
      <div
        className="flex items-start gap-3 p-3.5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Foto */}
        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          {item.foto_url ? (
            <img src={item.foto_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin size={16} className="text-gray-300" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {item.tipo_lugar} · {item.tipo_objeto}
            </p>
            <Badge variant={estadoVariant(item.estado)}>
              {estadoLabel(item.estado)}
            </Badge>
          </div>

          {/* Reportante */}
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
            <User size={9} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{item.reporter.nombre}</span>
          </div>

          {/* Dirección */}
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
            <MapPin size={9} className="flex-shrink-0" />
            <span className="truncate">
              {item.direccion || `${item.reporter.distrito || item.reporter.provincia || '—'}`}
            </span>
          </div>

          {/* Hora + actor (quien se hizo cargo) */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <Clock size={9} />
              {item.fecha_reporte
                ? format(new Date(item.fecha_reporte), "d MMM · HH:mm", { locale: es })
                : '—'}
            </p>
            {item.last_actor && (
              <p className="text-[10px] text-[#0F6E56] flex items-center gap-1 truncate">
                <ShieldCheck size={9} />
                <span className="truncate">
                  {item.last_actor.nombre || item.last_actor.email.split('@')[0]}
                </span>
              </p>
            )}
          </div>
        </div>

        <span className="text-gray-300 flex-shrink-0 mt-1">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/50">
          {item.foto_url && (
            <img
              src={item.foto_url}
              alt="Foto del criadero"
              className="w-full h-36 object-cover rounded-xl mb-3"
            />
          )}

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <InfoRow label="Lugar" value={item.tipo_lugar} />
            <InfoRow label="Objeto" value={item.tipo_objeto} />
            <InfoRow label="Larvas" value={item.observa_larvas} />
            {item.conocimiento_dengue_cercano && (
              <InfoRow label="Dengue cercano" value={item.conocimiento_dengue_cercano} />
            )}
            {item.direccion ? (
              <div className="col-span-2"><InfoRow label="Dirección" value={item.direccion} /></div>
            ) : (
              <>
                <InfoRow label="Lat" value={item.lat.toFixed(5)} />
                <InfoRow label="Lng" value={item.lng.toFixed(5)} />
              </>
            )}
          </div>

          {item.last_actor && (
            <div className="flex items-center gap-2 text-xs bg-[#0F6E56]/5 border border-[#0F6E56]/20 rounded-lg px-3 py-2 mb-3">
              <ShieldCheck size={13} className="text-[#0F6E56] flex-shrink-0" />
              <span className="text-gray-600">
                <span className="font-semibold text-[#0F6E56]">
                  {item.last_actor.nombre || item.last_actor.email.split('@')[0]}
                </span>
                {' '}se hizo cargo · {item.last_actor.email}
              </span>
            </div>
          )}

          {item.comentarios && (
            <p className="text-xs text-gray-600 italic bg-white rounded-lg px-3 py-2 border border-gray-100 mb-3">
              "{item.comentarios}"
            </p>
          )}

          {!esCerrado && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Cambiar estado:</p>
              <div className="flex flex-wrap gap-2">
                {ESTADOS_ACCION.filter((e) => e.value !== item.estado).map((e) => (
                  <button
                    key={e.value}
                    disabled={isPending}
                    onClick={(ev) => { ev.stopPropagation(); cambiarEstado({ id: item.id, estado: e.value }); }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold text-gray-700 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-all disabled:opacity-50"
                  >
                    {isPending ? '…' : e.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400">{label}: </span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  );
}

interface Props {
  filtros: Partial<Filtros>;
}

const LIMIT_OPTIONS = [20, 50, 100];

export function FeedAcciones({ filtros }: Props) {
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('enviado');
  const [limit, setLimit] = useState(30);
  const { data, isLoading } = useFeed(
    filtros,
    filtroEstado === 'todos' ? undefined : filtroEstado,
    limit,
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Feed de Acción
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{data?.length ?? '—'} reportes</p>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white focus:outline-none focus:border-[#0F6E56]"
        >
          {LIMIT_OPTIONS.map((n) => <option key={n} value={n}>Máx {n}</option>)}
        </select>
      </div>

      {/* Pills de filtro */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {FILTROS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFiltroEstado(value)}
            className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all ${
              filtroEstado === value
                ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] pr-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[72px] bg-gray-100 rounded-xl animate-pulse" />
          ))
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <CheckCircle size={28} className="mb-2 text-gray-200" />
            <p className="text-sm">Sin reportes para este filtro</p>
          </div>
        ) : (
          data.map((item) => <FeedCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
