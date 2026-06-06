import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronDown, ChevronUp, CheckCircle, AlertTriangle,
  MapPin, ImageOff, Volume2, User, Send, Trash2,
  ShieldCheck, Scale, Home, UserCheck,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useDenuncias, useCambiarEstado, useAsignarOperador, useOperadores, useSendMensaje, useMensajes } from '../hooks/useDashboard';
import type { Filtros, Denuncia, EstadoCaso, NivelRiesgo } from '../types';
import { Badge } from './ui/Badge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nivelVariant(n: NivelRiesgo): 'red' | 'yellow' | 'green' | 'purple' {
  if (n === 'urgente')            return 'red';
  if (n === 'alto')               return 'yellow';
  if (n === 'medio')              return 'yellow';
  if (n === 'bajo')               return 'green';
  return 'purple'; // moderado (compat v1)
}

function nivelColor(n: NivelRiesgo): string {
  if (n === 'urgente') return '#EF4444';
  if (n === 'alto')    return '#F59E0B';
  if (n === 'medio')   return '#D97706';
  if (n === 'bajo')    return '#16A34A';
  return '#8B43D4';
}

const ESTADO_LABEL: Record<EstadoCaso, string> = {
  nueva:                  'Nueva',
  asignada:               'Asignada',
  en_seguimiento:         'En seguimiento',
  derivada:               'Derivada',
  pendiente_confirmacion: 'Pendiente confirmación',
  cerrada:                'Cerrada',
};

const ESTADO_VARIANT: Record<EstadoCaso, 'blue' | 'yellow' | 'green' | 'gray' | 'red' | 'purple'> = {
  nueva:                  'blue',
  asignada:               'yellow',
  en_seguimiento:         'yellow',
  derivada:               'green',
  pendiente_confirmacion: 'orange' as any,
  cerrada:                'gray',
};

// Workflow: qué estados se puede transicionar desde cada estado actual
const NEXT_ESTADOS: Partial<Record<EstadoCaso, EstadoCaso[]>> = {
  nueva:                  ['asignada', 'en_seguimiento', 'cerrada'],
  asignada:               ['en_seguimiento', 'derivada', 'cerrada'],
  en_seguimiento:         ['derivada', 'pendiente_confirmacion', 'cerrada'],
  derivada:               ['pendiente_confirmacion', 'en_seguimiento', 'cerrada'],
  pendiente_confirmacion: ['cerrada', 'en_seguimiento'],
};

const DERIVACIONES = [
  { destino: 'comisaría',       label: 'Comisaría',       Icon: ShieldCheck, color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400' },
  { destino: 'fiscalía',        label: 'Fiscalía',        Icon: Scale,       color: 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400' },
  { destino: 'casa de acogida', label: 'Casa de acogida', Icon: Home,        color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400' },
] as const;

// ─── Mini Mapa ────────────────────────────────────────────────────────────────

function MiniMapa({ lat, lng, nivel }: { lat: number; lng: number; nivel: NivelRiesgo }) {
  return (
    <div className="rounded-xl overflow-hidden border border-[#DDD0F5]" style={{ height: 120 }}>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <CircleMarker
          center={[lat, lng]}
          radius={10}
          pathOptions={{ fillColor: nivelColor(nivel), fillOpacity: 0.9, color: '#fff', weight: 2.5 }}
        />
      </MapContainer>
    </div>
  );
}

// ─── Sección de evidencia ────────────────────────────────────────────────────

function Evidencia({ fotoUrl, audioUrl }: { fotoUrl?: string | null; audioUrl?: string | null }) {
  if (!fotoUrl && !audioUrl) return null;
  return (
    <div>
      <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2">Evidencia</p>
      <div className="flex gap-3 flex-wrap">
        {fotoUrl ? (
          <a href={fotoUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={fotoUrl}
              alt="Evidencia fotográfica"
              className="h-24 w-auto rounded-xl object-cover border border-[#DDD0F5] hover:opacity-90 transition-opacity cursor-zoom-in"
            />
          </a>
        ) : null}
        {audioUrl ? (
          <div className="flex-1 min-w-48">
            <div className="flex items-center gap-2 bg-[#F3EFFE] rounded-xl px-3 py-2 border border-[#DDD0F5] mb-1">
              <Volume2 size={14} className="text-[#8B43D4] flex-shrink-0" />
              <span className="text-xs text-[#5E4480]">Audio adjunto</span>
            </div>
            <audio controls src={audioUrl} className="w-full h-8" style={{ height: 32 }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Hilo de mensajes bidireccional ──────────────────────────────────────────

function HiloMensajes({ denunciaId }: { denunciaId: string }) {
  const { data: mensajes = [], isLoading } = useMensajes(denunciaId, true);
  const [texto, setTexto] = useState('');
  const [destruir, setDestruir] = useState(false);
  const { mutate: send, isPending } = useSendMensaje();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll al último mensaje al cargar o al recibir nuevos
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes.length]);

  const handleSend = () => {
    if (!texto.trim()) return;
    send(
      { denunciaId, contenido: texto.trim(), destruirAlLeer: destruir },
      {
        onSuccess: () => {
          setTexto('');
          setDestruir(false);
        },
      },
    );
  };

  const hayRespuestaVictima = mensajes.some((m) => m.autor === 'usuaria');

  return (
    <div>
      <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2 flex items-center gap-1.5">
        Conversación
        {hayRespuestaVictima && (
          <span className="bg-emerald-100 text-emerald-700 font-bold text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            Víctima respondió
          </span>
        )}
      </p>

      {/* Hilo */}
      <div className="bg-white border border-[#EBE3F9] rounded-xl p-2 mb-2 max-h-48 overflow-y-auto flex flex-col gap-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-12">
            <div className="w-4 h-4 border-2 border-[#8B43D4] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mensajes.length === 0 ? (
          <p className="text-[10px] text-[#B09CC8] text-center py-3">Sin mensajes aún</p>
        ) : (
          mensajes.map((m) => {
            const esVictima = m.autor === 'usuaria';
            const esSistema = m.autor === 'sistema';
            const hora = format(new Date(m.created_at), 'HH:mm');

            if (esSistema) {
              return (
                <div key={m.id} className="flex justify-center">
                  <span className="text-[9px] text-[#B09CC8] bg-[#F3EFFE] px-2 py-0.5 rounded-full">
                    {m.contenido}
                  </span>
                </div>
              );
            }

            return (
              <div key={m.id} className={`flex ${esVictima ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    esVictima
                      ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                      : 'bg-[#8B43D4] text-white rounded-tr-sm'
                  }`}
                >
                  {m.contenido === '[Mensaje eliminado]' ? (
                    <span className="italic opacity-60">{m.contenido}</span>
                  ) : (
                    m.contenido
                  )}
                  <div className={`text-[9px] mt-1 ${esVictima ? 'text-gray-400' : 'text-purple-200'} text-right`}>
                    {esVictima ? 'Víctima' : 'Tú'} · {hora}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Redactar */}
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder='Ej: "Una patrulla está en camino, mantente a salvo"'
        rows={2}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
        }}
        className="w-full text-xs border border-[#DDD0F5] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-[#8B43D4] focus:ring-2 focus:ring-[#8B43D4]/20 text-[#1A0A2E] placeholder-[#B09CC8] bg-white"
      />
      <div className="flex items-center justify-between mt-1.5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setDestruir((v) => !v)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
              destruir ? 'bg-[#8B43D4] border-[#8B43D4]' : 'border-gray-300'
            }`}
          >
            {destruir && <Trash2 size={9} className="text-white" />}
          </div>
          <span className="text-[10px] text-[#5E4480]">Destruir al leer</span>
        </label>
        <button
          onClick={handleSend}
          disabled={!texto.trim() || isPending}
          className="flex items-center gap-1.5 bg-[#8B43D4] hover:bg-[#6E2DB0] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending
            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Send size={11} />
          }
          Enviar
        </button>
      </div>
      <p className="text-[9px] text-[#B09CC8] mt-1">Ctrl+Enter para enviar · Actualiza cada 20 s</p>
    </div>
  );
}

// ─── Card del expediente ──────────────────────────────────────────────────────

function ExpedienteCard({ denuncia }: { denuncia: Denuncia }) {
  const [expanded, setExpanded] = useState(false);
  const [motivoCierre, setMotivoCierre] = useState('');
  const { mutate: cambiarEstado, isPending: cambiando } = useCambiarEstado();
  const { mutate: asignarOperador, isPending: asignando } = useAsignarOperador();
  const { data: operadores } = useOperadores();

  const esCerrada    = denuncia.estado === 'cerrada';
  const esUrgente    = denuncia.nivel_riesgo === 'urgente';
  const nextEstados  = NEXT_ESTADOS[denuncia.estado] ?? [];
  const tieneUbicacion = denuncia.latitud != null && denuncia.longitud != null;

  const fecha = format(new Date(denuncia.fecha_denuncia), "d MMM · HH:mm", { locale: es });

  const handleDerivacion = (destino: string) => {
    cambiarEstado({
      id: denuncia.id,
      estado: 'derivada',
      motivo_cierre: `Derivada a ${destino}`,
    });
  };

  const handleCerrar = () => {
    cambiarEstado({
      id: denuncia.id,
      estado: 'cerrada',
      motivo_cierre: motivoCierre || undefined,
    });
  };

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all ${
        esUrgente && !esCerrada
          ? 'border-red-300 animate-pulse-urgente'
          : esCerrada
          ? 'border-gray-100 opacity-70'
          : 'border-[#DDD0F5] hover:border-[#8B43D4]/40'
      }`}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className={`flex items-start gap-3 p-3.5 cursor-pointer select-none ${
          esUrgente && !esCerrada ? 'bg-red-50/60' : 'bg-white'
        }`}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Indicador de nivel */}
        <div className={`mt-1 flex-shrink-0 ${esUrgente && !esCerrada ? 'animate-dot-urgente' : ''}`}>
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: nivelColor(denuncia.nivel_riesgo) }}
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Título + estado */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-xs font-bold text-[#1A0A2E] leading-snug">
              {denuncia.tipos_violencia?.join(' · ') ?? denuncia.tipo_violencia}
              <span className="font-normal text-[#5E4480]"> · {denuncia.relacion_agresor}</span>
            </p>
            <Badge variant={ESTADO_VARIANT[denuncia.estado]}>
              {ESTADO_LABEL[denuncia.estado]}
            </Badge>
          </div>

          {/* Token + heridos */}
          <div className="flex items-center gap-3 mb-0.5">
            <span className="text-[10px] font-mono text-[#B09CC8]">{denuncia.token_anonimo}</span>
            {denuncia.hay_heridos && (
              <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-bold">
                <AlertTriangle size={9} /> Heridos
              </span>
            )}
          </div>

          {/* Riesgo + fecha */}
          <div className="flex items-center justify-between">
            <Badge variant={nivelVariant(denuncia.nivel_riesgo)}>
              {denuncia.nivel_riesgo}
            </Badge>
            <span className="text-[10px] text-[#B09CC8]">{fecha}</span>
          </div>
        </div>

        <span className="text-[#B09CC8] flex-shrink-0 mt-1">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {/* ── Expediente expandible ─────────────────────────────────────────── */}
      {expanded && (
        <div className="expediente-expand border-t border-[#EBE3F9] bg-[#F8F5FE] px-4 pb-4 pt-3 space-y-4">

          {/* Mini mapa */}
          {tieneUbicacion && (
            <div>
              <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2 flex items-center gap-1">
                <MapPin size={10} /> Ubicación del reporte
              </p>
              <MiniMapa lat={denuncia.latitud!} lng={denuncia.longitud!} nivel={denuncia.nivel_riesgo} />
            </div>
          )}

          {/* Evidencia */}
          <Evidencia fotoUrl={denuncia.foto_url} audioUrl={denuncia.audio_url} />

          {/* Sin evidencia */}
          {!denuncia.foto_url && !denuncia.audio_url && !tieneUbicacion && (
            <div className="flex items-center gap-2 text-xs text-[#B09CC8] bg-white rounded-xl px-3 py-2 border border-[#EBE3F9]">
              <ImageOff size={13} /> Sin evidencia adjunta ni ubicación
            </div>
          )}

          {/* Información de la víctima */}
          <div>
            <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2 flex items-center gap-1">
              <User size={10} /> Víctima
            </p>
            <div className="bg-white rounded-xl border border-[#EBE3F9] px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-[#B09CC8]">Modo</span>
              <span className="text-[#1A0A2E] font-medium">{denuncia.es_anonima ? 'Anónima' : 'Con cuenta'}</span>
              <span className="text-[#B09CC8]">Token</span>
              <span className="text-[#1A0A2E] font-mono text-[10px]">{denuncia.token_anonimo}</span>
              <span className="text-[#B09CC8]">Contacto</span>
              <span className="text-[#1A0A2E] font-medium capitalize">{denuncia.preferencia_contacto}</span>
              {denuncia.horario_contacto && (
                <>
                  <span className="text-[#B09CC8]">Horario</span>
                  <span className="text-[#1A0A2E] font-medium">{denuncia.horario_contacto}</span>
                </>
              )}
            </div>
          </div>

          {/* Factores de riesgo */}
          {denuncia.factores_riesgo && denuncia.factores_riesgo.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2">Factores de riesgo</p>
              <div className="flex flex-wrap gap-1.5">
                {denuncia.factores_riesgo.map((f) => (
                  <span key={f} className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Descripción adicional */}
          {denuncia.descripcion && (
            <div>
              <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2">Descripción</p>
              <p className="text-xs text-[#1A0A2E] bg-white rounded-xl border border-[#EBE3F9] px-3 py-2.5 leading-relaxed">
                {denuncia.descripcion}
              </p>
            </div>
          )}

          {/* Acciones — solo si no está cerrada */}
          {!esCerrada && (
            <>
              {/* Cambiar estado */}
              {nextEstados.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2">Estado</p>
                  <div className="flex flex-wrap gap-1.5">
                    {nextEstados
                      .filter((e) => e !== 'derivada' && e !== 'cerrada')
                      .map((e) => (
                        <button
                          key={e}
                          disabled={cambiando}
                          onClick={() => cambiarEstado({ id: denuncia.id, estado: e })}
                          className="text-[11px] px-2.5 py-1.5 rounded-lg border border-[#DDD0F5] bg-white font-semibold text-[#5E4480] hover:border-[#8B43D4] hover:text-[#8B43D4] transition-all disabled:opacity-50"
                        >
                          {ESTADO_LABEL[e]}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Derivar a */}
              <div>
                <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2">Derivar a</p>
                <div className="flex flex-wrap gap-2">
                  {DERIVACIONES.map(({ destino, label, Icon, color }) => (
                    <button
                      key={destino}
                      disabled={cambiando}
                      onClick={() => handleDerivacion(destino)}
                      className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all disabled:opacity-50 ${color}`}
                    >
                      <Icon size={11} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asignar operador */}
              {operadores && operadores.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <UserCheck size={10} /> Asignar operador
                  </p>
                  <select
                    disabled={asignando}
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        asignarOperador({ id: denuncia.id, operador_id: e.target.value });
                        e.target.value = '';
                      }
                    }}
                    className="w-full text-xs border border-[#DDD0F5] rounded-xl px-3 py-2 text-[#1A0A2E] bg-white focus:outline-none focus:border-[#8B43D4] disabled:opacity-60"
                  >
                    <option value="">Seleccionar operador…</option>
                    {operadores.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.nombre} {op.apellido}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Cerrar con motivo */}
              {nextEstados.includes('cerrada') && (
                <div>
                  <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2">Cerrar caso</p>
                  <div className="flex gap-2">
                    <select
                      value={motivoCierre}
                      onChange={(e) => setMotivoCierre(e.target.value)}
                      className="flex-1 text-xs border border-[#DDD0F5] rounded-xl px-3 py-2 text-[#1A0A2E] bg-white focus:outline-none focus:border-[#8B43D4]"
                    >
                      <option value="">Motivo de cierre…</option>
                      <option value="Caso resuelto">Caso resuelto</option>
                      <option value="Víctima no responde">Víctima no responde</option>
                      <option value="Falsa alarma">Falsa alarma</option>
                      <option value="Derivado a instancia externa">Derivado a instancia externa</option>
                    </select>
                    <button
                      disabled={cambiando}
                      onClick={handleCerrar}
                      className="text-[11px] px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold hover:bg-red-100 transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}

              {/* Conversación bidireccional */}
              <HiloMensajes denunciaId={denuncia.id} />
            </>
          )}

          {/* Caso cerrado */}
          {esCerrada && (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-white rounded-xl px-3 py-2.5 border border-gray-100">
              <CheckCircle size={13} className="text-gray-300" />
              Caso cerrado — solo lectura
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FeedAcciones principal ───────────────────────────────────────────────────

interface Props {
  filtros: Partial<Filtros>;
}

export function FeedAcciones({ filtros }: Props) {
  const [pagina, setPagina] = useState(1);
  const { data, isLoading } = useDenuncias(filtros, pagina, 15);

  const denuncias  = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPags  = Math.max(1, Math.ceil(total / 15));

  const urgentesCount = denuncias.filter((d) => d.nivel_riesgo === 'urgente' && d.estado !== 'cerrada').length;

  return (
    <div className="bg-white rounded-2xl border border-[#DDD0F5] shadow-sm p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-[#1A0A2E]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Expedientes
          </h2>
          <p className="text-xs text-[#B09CC8] mt-0.5">
            {total} denuncias
            {urgentesCount > 0 && (
              <span className="ml-2 text-red-600 font-bold animate-dot-urgente inline-block">
                · {urgentesCount} urgente{urgentesCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        {total > 15 && (
          <div className="flex items-center gap-1 text-xs text-[#5E4480]">
            <button
              disabled={pagina === 1}
              onClick={() => setPagina((p) => p - 1)}
              className="px-2 py-1 rounded-lg border border-[#DDD0F5] disabled:opacity-40 hover:border-[#8B43D4] transition-colors"
            >
              ‹
            </button>
            <span className="px-1">{pagina}/{totalPags}</span>
            <button
              disabled={pagina >= totalPags}
              onClick={() => setPagina((p) => p + 1)}
              className="px-2 py-1 rounded-lg border border-[#DDD0F5] disabled:opacity-40 hover:border-[#8B43D4] transition-colors"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[520px] pr-0.5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#F3EFFE] rounded-2xl animate-pulse" />
          ))
        ) : !denuncias.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#B09CC8]">
            <CheckCircle size={28} className="mb-2 text-[#DDD0F5]" />
            <p className="text-sm">Sin denuncias para este filtro</p>
          </div>
        ) : (
          denuncias.map((d) => <ExpedienteCard key={d.id} denuncia={d} />)
        )}
      </div>
    </div>
  );
}
