import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronDown, ChevronUp, CheckCircle, AlertTriangle,
  MapPin, ImageOff, Volume2, User, Send, Trash2,
  ShieldCheck, Scale, Home, Copy, Check,
  MessageCircle, Clock, ArrowLeft, X,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  useDenuncias, useCambiarEstado, useAsignarOperador,
  useOperadores, useSendMensaje, useMensajes, useSosAlertas, useKpis,
  useResolverSos, useMarcarSosEnAtencion,
} from '../hooks/useDashboard';
import type { Filtros, Denuncia, EstadoCaso, NivelRiesgo, Operador, AlertaSos } from '../types';
import { Badge } from './ui/Badge';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function nivelVariant(n: NivelRiesgo): 'red' | 'yellow' | 'green' | 'purple' {
  if (n === 'urgente')               return 'red';
  if (n === 'alto' || n === 'medio') return 'yellow';
  if (n === 'bajo')                  return 'green';
  return 'purple';
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
  pendiente_confirmacion: 'Pend. confirmación',
  cerrada:                'Cerrada',
};

const ESTADO_LABEL_PIPELINE: Record<EstadoCaso, string> = {
  nueva:                  'Nueva',
  asignada:               'Asignada',
  en_seguimiento:         'Seguim.',
  derivada:               'Derivada',
  pendiente_confirmacion: 'Pendiente',
  cerrada:                'Cerrada',
};

const ESTADO_VARIANT: Record<EstadoCaso, 'blue' | 'yellow' | 'green' | 'gray' | 'red' | 'purple' | 'orange'> = {
  nueva:                  'blue',
  asignada:               'yellow',
  en_seguimiento:         'yellow',
  derivada:               'green',
  pendiente_confirmacion: 'orange',
  cerrada:                'gray',
};

const PIPELINE: EstadoCaso[] = [
  'nueva', 'asignada', 'en_seguimiento', 'derivada', 'pendiente_confirmacion', 'cerrada',
];

const DERIVACIONES = [
  { destino: 'comisaría',       label: 'Comisaría',       Icon: ShieldCheck, color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400' },
  { destino: 'fiscalía',        label: 'Fiscalía',        Icon: Scale,       color: 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400' },
  { destino: 'casa de acogida', label: 'Casa de acogida', Icon: Home,        color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400' },
] as const;

// ─── Pipeline de estado ────────────────────────────────────────────────────────

function PipelineEstado({ current }: { current: EstadoCaso }) {
  const currentIdx = PIPELINE.indexOf(current);
  return (
    <div className="flex justify-between items-start w-full">
      {PIPELINE.map((estado, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={estado} className="flex flex-col items-center flex-1 relative">
            {i > 0 && (
              <div className={`absolute top-[5px] right-1/2 left-0 h-px ${
                done || active ? 'bg-[#C4A8E8]' : 'bg-gray-100'
              }`} />
            )}
            {i < PIPELINE.length - 1 && (
              <div className={`absolute top-[5px] left-1/2 right-0 h-px ${
                done ? 'bg-[#C4A8E8]' : 'bg-gray-100'
              }`} />
            )}
            <div className={`relative z-10 w-3 h-3 rounded-full border-2 transition-all ${
              active ? 'bg-[#8B43D4] border-[#8B43D4] scale-125' :
              done   ? 'bg-[#C4A8E8] border-[#C4A8E8]' :
                       'bg-white border-gray-200'
            }`} />
            <span className={`text-[7px] mt-1 text-center leading-tight ${
              active ? 'text-[#5E4480] font-bold' :
              done   ? 'text-[#B09CC8]' :
                       'text-gray-200'
            }`}>
              {ESTADO_LABEL_PIPELINE[estado]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Código de acceso (copiable) ──────────────────────────────────────────────

function CodigoAcceso({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard.writeText(codigo).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };
  return (
    <button
      onClick={copiar}
      className="w-full flex items-center justify-between bg-[#F3EFFE] border border-[#DDD0F5] rounded-xl px-3 py-2.5 hover:border-[#8B43D4] transition-all group text-left"
    >
      <div>
        <p className="text-[9px] text-[#B09CC8] font-bold uppercase tracking-wider">
          Código de acceso · comparte con la víctima
        </p>
        <p className="text-xl font-mono font-black text-[#8B43D4] tracking-[0.25em] leading-none mt-1">
          {codigo}
        </p>
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border flex-shrink-0 transition-all ${
        copiado
          ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
          : 'text-[#5E4480] border-[#DDD0F5] bg-white group-hover:border-[#8B43D4]'
      }`}>
        {copiado ? <Check size={10} /> : <Copy size={10} />}
        {copiado ? 'Copiado' : 'Copiar'}
      </div>
    </button>
  );
}

// ─── Panel de acciones (máquina de estados) ───────────────────────────────────

function AccionesPanel({
  denuncia,
  onCambiar,
  onAsignar,
  cambiando,
  asignando,
  operadores,
}: {
  denuncia: Denuncia;
  onCambiar: (estado: EstadoCaso, motivo?: string) => void;
  onAsignar: (operador_id: string) => void;
  cambiando: boolean;
  asignando: boolean;
  operadores: Operador[] | undefined;
}) {
  const [motivoCierre, setMotivoCierre] = useState('');
  const { estado, motivo_cierre } = denuncia;
  const busy = cambiando || asignando;

  const BtnPrimary = ({ onClick, label, icon }: { onClick: () => void; label: string; icon?: React.ReactNode }) => (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex items-center justify-center gap-2 w-full bg-[#8B43D4] hover:bg-[#6E2DB0] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-40"
    >
      {icon}{label}
      {busy && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
    </button>
  );

  const BtnGhost = ({ onClick, label, icon }: { onClick: () => void; label: string; icon?: React.ReactNode }) => (
    <button
      onClick={onClick}
      disabled={cambiando}
      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5E4480] hover:text-[#8B43D4] transition-all disabled:opacity-40"
    >
      {icon}{label}
    </button>
  );

  const BtnDanger = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      disabled={cambiando}
      className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-700 transition-all disabled:opacity-40"
    >
      <X size={11} />{label}
    </button>
  );

  // ── NUEVA: asignar es el primer paso ──────────────────────────────────────
  if (estado === 'nueva') {
    return (
      <div className="bg-white rounded-xl border border-[#EBE3F9] p-3 space-y-3">
        <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          Sin asignar — requiere atención
        </p>
        <div>
          <p className="text-[9px] text-[#B09CC8] mb-1.5">Asignar a operador</p>
          <select
            disabled={asignando}
            defaultValue=""
            onChange={(e) => { if (e.target.value) { onAsignar(e.target.value); e.target.value = ''; } }}
            className="w-full text-xs border border-[#DDD0F5] rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#8B43D4] disabled:opacity-60"
          >
            <option value="">Seleccionar operador…</option>
            {operadores?.map((op) => (
              <option key={op.id} value={op.id}>{op.nombre} {op.apellido}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end pt-2 border-t border-[#EBE3F9]">
          <BtnDanger onClick={() => onCambiar('cerrada', 'Falsa alarma')} label="Falsa alarma — cerrar" />
        </div>
      </div>
    );
  }

  // ── ASIGNADA: contactar y pasar a seguimiento ─────────────────────────────
  if (estado === 'asignada') {
    return (
      <div className="bg-white rounded-xl border border-[#EBE3F9] p-3 space-y-3">
        <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          Pendiente de primer contacto
        </p>
        <BtnPrimary
          onClick={() => onCambiar('en_seguimiento')}
          label="Contacté a la víctima — iniciar seguimiento"
          icon={<MessageCircle size={13} />}
        />
        <div className="flex justify-end pt-2 border-t border-[#EBE3F9]">
          <BtnDanger onClick={() => onCambiar('cerrada', 'Víctima no responde')} label="Sin respuesta — cerrar" />
        </div>
      </div>
    );
  }

  // ── EN SEGUIMIENTO: derivar o esperar confirmación ────────────────────────
  if (estado === 'en_seguimiento') {
    return (
      <div className="bg-white rounded-xl border border-[#EBE3F9] p-3 space-y-3">
        <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
          En seguimiento activo
        </p>
        <div>
          <p className="text-[9px] text-[#B09CC8] mb-1.5">Derivar a institución</p>
          <div className="flex flex-wrap gap-2">
            {DERIVACIONES.map(({ destino, label, Icon, color }) => (
              <button
                key={destino}
                disabled={cambiando}
                onClick={() => onCambiar('derivada', `Derivada a ${destino}`)}
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all disabled:opacity-50 ${color}`}
              >
                <Icon size={11} />{label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-[#EBE3F9]">
          <BtnGhost
            onClick={() => onCambiar('pendiente_confirmacion')}
            label="Esperando respuesta de la víctima"
            icon={<Clock size={11} />}
          />
          <BtnDanger onClick={() => onCambiar('cerrada', 'Caso resuelto')} label="Cerrar" />
        </div>
      </div>
    );
  }

  // ── DERIVADA: confirmar atención ──────────────────────────────────────────
  if (estado === 'derivada') {
    const donde = motivo_cierre?.replace('Derivada a ', '') ?? 'la institución';
    return (
      <div className="bg-white rounded-xl border border-[#EBE3F9] p-3 space-y-3">
        <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          Derivada · esperando atención
        </p>
        <p className="text-xs text-[#5E4480] bg-[#F3EFFE] rounded-lg px-3 py-2 leading-relaxed">
          Derivada a <strong>{donde}</strong>. Confirma cuando la institución haya atendido el caso.
        </p>
        <BtnPrimary
          onClick={() => onCambiar('pendiente_confirmacion')}
          label={`${donde} atendió — confirmar`}
          icon={<Check size={13} />}
        />
        <div className="flex items-center justify-between pt-2 border-t border-[#EBE3F9]">
          <BtnGhost
            onClick={() => onCambiar('en_seguimiento')}
            label="Reactivar seguimiento"
            icon={<ArrowLeft size={11} />}
          />
          <BtnDanger onClick={() => onCambiar('cerrada', 'Caso resuelto')} label="Cerrar" />
        </div>
      </div>
    );
  }

  // ── PENDIENTE CONFIRMACIÓN: confirmar con víctima y cerrar ────────────────
  if (estado === 'pendiente_confirmacion') {
    return (
      <div className="bg-white rounded-xl border border-[#EBE3F9] p-3 space-y-3">
        <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse inline-block" />
          Confirmación final
        </p>
        <p className="text-[10px] text-[#B09CC8]">
          Confirma con la víctima que está a salvo y el caso puede cerrarse.
        </p>
        <div className="flex gap-2">
          <select
            value={motivoCierre}
            onChange={(e) => setMotivoCierre(e.target.value)}
            className="flex-1 text-xs border border-[#DDD0F5] rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#8B43D4]"
          >
            <option value="">Motivo de cierre…</option>
            <option value="Caso resuelto">Caso resuelto</option>
            <option value="Víctima en lugar seguro">Víctima en lugar seguro</option>
            <option value="Derivado exitosamente">Derivado exitosamente</option>
            <option value="Víctima no responde">Víctima no responde</option>
          </select>
          <button
            disabled={cambiando}
            onClick={() => onCambiar('cerrada', motivoCierre || 'Caso resuelto')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-40 whitespace-nowrap"
          >
            <CheckCircle size={12} />
            Confirmar y cerrar
          </button>
        </div>
        <div className="flex justify-start pt-2 border-t border-[#EBE3F9]">
          <BtnGhost
            onClick={() => onCambiar('en_seguimiento')}
            label="← Reactivar seguimiento"
          />
        </div>
      </div>
    );
  }

  return null;
}

// ─── Mini Mapa ─────────────────────────────────────────────────────────────────

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

// ─── Evidencia ─────────────────────────────────────────────────────────────────

function Evidencia({ fotoUrl, audioUrl }: { fotoUrl?: string | null; audioUrl?: string | null }) {
  if (!fotoUrl && !audioUrl) return null;
  return (
    <div className="flex gap-3 flex-wrap">
      {fotoUrl && (
        <a href={fotoUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={fotoUrl}
            alt="Evidencia"
            className="h-24 w-auto rounded-xl object-cover border border-[#DDD0F5] hover:opacity-90 transition-opacity cursor-zoom-in"
          />
        </a>
      )}
      {audioUrl && (
        <div className="flex-1 min-w-48">
          <div className="flex items-center gap-2 bg-[#F3EFFE] rounded-xl px-3 py-2 border border-[#DDD0F5] mb-1">
            <Volume2 size={14} className="text-[#8B43D4] flex-shrink-0" />
            <span className="text-xs text-[#5E4480]">Audio adjunto</span>
          </div>
          <audio controls src={audioUrl} className="w-full" style={{ height: 32 }} />
        </div>
      )}
    </div>
  );
}

// ─── Hilo de mensajes ──────────────────────────────────────────────────────────

function HiloMensajes({
  denunciaId,
  soloLectura = false,
}: {
  denunciaId: string;
  soloLectura?: boolean;
}) {
  const { data: mensajes = [], isLoading } = useMensajes(denunciaId, true);
  const [texto, setTexto] = useState('');
  const [destruir, setDestruir] = useState(false);
  const { mutate: send, isPending } = useSendMensaje();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes.length]);

  const handleSend = () => {
    if (!texto.trim()) return;
    send(
      { denunciaId, contenido: texto.trim(), destruirAlLeer: destruir },
      { onSuccess: () => { setTexto(''); setDestruir(false); } },
    );
  };

  const hayRespuestaVictima = mensajes.some((m) => m.autor === 'usuaria');

  return (
    <div>
      <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2 flex items-center gap-1.5">
        {soloLectura ? 'Historial de conversación' : 'Conversación'}
        {hayRespuestaVictima && !soloLectura && (
          <span className="bg-emerald-100 text-emerald-700 font-bold text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            Víctima respondió
          </span>
        )}
      </p>

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
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  esVictima ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-[#8B43D4] text-white rounded-tr-sm'
                }`}>
                  {m.contenido === '[Mensaje eliminado]'
                    ? <span className="italic opacity-60">{m.contenido}</span>
                    : m.contenido
                  }
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

      {!soloLectura && (
        <>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder='Ej: "Una patrulla está en camino, mantente a salvo"'
            rows={2}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(); }}
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
          <p className="text-[9px] text-[#B09CC8] mt-1">Ctrl+Enter para enviar · Actualiza cada 10 s</p>
        </>
      )}
    </div>
  );
}

// ─── Card del expediente ───────────────────────────────────────────────────────

function ExpedienteCard({
  denuncia,
  sosActiva,
  isSelected,
  cardRef,
}: {
  denuncia: Denuncia;
  sosActiva?: AlertaSos;
  isSelected?: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isSelected) setExpanded(true);
  }, [isSelected]);
  const { mutate: cambiarEstado, isPending: cambiando } = useCambiarEstado();
  const { mutate: asignarOperador, isPending: asignando } = useAsignarOperador();
  const { data: operadores } = useOperadores();

  const esCerrada      = denuncia.estado === 'cerrada';
  const esUrgente      = denuncia.nivel_riesgo === 'urgente';
  const tieneUbicacion = denuncia.latitud != null && denuncia.longitud != null;
  const tieneEvidencia = !!(denuncia.foto_url || denuncia.audio_url);

  const fecha       = format(new Date(denuncia.fecha_denuncia),    "d MMM · HH:mm",  { locale: es });
  const fechaUpdate = format(new Date(denuncia.fecha_actualizacion), "d MMM · HH:mm", { locale: es });

  return (
    <div
      ref={cardRef}
      className={`border rounded-2xl overflow-hidden transition-all ${
        isSelected
          ? 'border-[#8B43D4] shadow-md ring-2 ring-[#8B43D4]/30'
          : sosActiva
          ? 'border-red-500 shadow-red-100 shadow-md'
          : esUrgente && !esCerrada
          ? 'border-red-300 animate-pulse-urgente'
          : esCerrada
          ? 'border-gray-100 opacity-75'
          : 'border-[#DDD0F5] hover:border-[#8B43D4]/40'
      }`}>

      {/* ── Banner SOS vinculada ────────────────────────────────────────────── */}
      {sosActiva && (
        <div className="flex items-center gap-2 bg-red-600 text-white px-3.5 py-2 text-xs font-bold">
          <span className="relative flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-white opacity-40" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white/80" />
          </span>
          🆘 ALERTA SOS ACTIVA · {sosActiva.usuario_nombre ?? 'Usuaria anónima'}
          {sosActiva.latitud && sosActiva.longitud && (
            <a
              href={`https://maps.google.com/?q=${sosActiva.latitud},${sosActiva.longitud}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto underline text-red-100 hover:text-white font-normal"
              onClick={(e) => e.stopPropagation()}
            >
              Ver ubicación
            </a>
          )}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className={`flex items-start gap-3 p-3.5 cursor-pointer select-none ${
          sosActiva ? 'bg-red-50/40' : esUrgente && !esCerrada ? 'bg-red-50/60' : 'bg-white'
        }`}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className={`mt-1 flex-shrink-0 ${esUrgente && !esCerrada ? 'animate-dot-urgente' : ''}`}>
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: nivelColor(denuncia.nivel_riesgo) }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-xs font-bold text-[#1A0A2E] leading-snug">
              {denuncia.tipos_violencia?.join(' · ') ?? denuncia.tipo_violencia}
              <span className="font-normal text-[#5E4480]"> · {denuncia.relacion_agresor}</span>
            </p>
            <Badge variant={ESTADO_VARIANT[denuncia.estado]}>
              {ESTADO_LABEL[denuncia.estado]}
            </Badge>
          </div>

          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            {denuncia.codigo_acceso && (
              <span className="text-[10px] font-mono font-bold text-[#8B43D4] bg-[#F3EFFE] px-1.5 py-0.5 rounded">
                {denuncia.codigo_acceso}
              </span>
            )}
            <Badge variant={nivelVariant(denuncia.nivel_riesgo)}>{denuncia.nivel_riesgo}</Badge>
            {denuncia.hay_heridos && (
              <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-bold">
                <AlertTriangle size={9} /> Heridos
              </span>
            )}
          </div>

          <span className="text-[10px] text-[#B09CC8]">{fecha}</span>
        </div>

        <span className="text-[#B09CC8] flex-shrink-0 mt-1">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {/* ── Expediente expandido ───────────────────────────────────────────── */}
      {expanded && (
        <div className="expediente-expand border-t border-[#EBE3F9] bg-[#F8F5FE] px-4 pb-4 pt-3 space-y-4">

          {/* Pipeline + timestamp */}
          <div>
            <PipelineEstado current={denuncia.estado} />
            <p className="text-[9px] text-[#B09CC8] mt-1 text-right">Actualizado: {fechaUpdate}</p>
          </div>

          {/* Código de acceso */}
          {denuncia.codigo_acceso && <CodigoAcceso codigo={denuncia.codigo_acceso} />}

          {/* Información del caso */}
          <div>
            <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2 flex items-center gap-1">
              <User size={10} /> Información del caso
            </p>
            <div className="bg-white rounded-xl border border-[#EBE3F9] px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-[#B09CC8]">Tipo(s)</span>
              <span className="text-[#1A0A2E] font-medium">
                {(denuncia.tipos_violencia ?? [denuncia.tipo_violencia]).join(', ')}
              </span>
              <span className="text-[#B09CC8]">Relación</span>
              <span className="text-[#1A0A2E] font-medium">{denuncia.relacion_agresor}</span>
              <span className="text-[#B09CC8]">Acceso</span>
              <span className="text-[#1A0A2E] font-medium">{denuncia.es_anonima ? 'Anónima' : 'Con cuenta'}</span>
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

          {/* Descripción */}
          {denuncia.descripcion && (
            <div>
              <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2">Descripción</p>
              <p className="text-xs text-[#1A0A2E] bg-white rounded-xl border border-[#EBE3F9] px-3 py-2.5 leading-relaxed">
                {denuncia.descripcion}
              </p>
            </div>
          )}

          {/* Ubicación + Evidencia */}
          {(tieneUbicacion || tieneEvidencia) ? (
            <div className={`grid gap-3 ${tieneUbicacion && tieneEvidencia ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {tieneUbicacion && (
                <div>
                  <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <MapPin size={10} /> Ubicación
                  </p>
                  <MiniMapa lat={denuncia.latitud!} lng={denuncia.longitud!} nivel={denuncia.nivel_riesgo} />
                </div>
              )}
              {tieneEvidencia && (
                <div>
                  <p className="text-[10px] font-bold text-[#5E4480] uppercase tracking-wider mb-2">Evidencia</p>
                  <Evidencia fotoUrl={denuncia.foto_url} audioUrl={denuncia.audio_url} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#B09CC8] bg-white rounded-xl px-3 py-2 border border-[#EBE3F9]">
              <ImageOff size={13} /> Sin evidencia ni ubicación adjunta
            </div>
          )}

          {/* Acciones (máquina de estados) */}
          {!esCerrada && (
            <AccionesPanel
              denuncia={denuncia}
              onCambiar={(estado, motivo) => cambiarEstado({ id: denuncia.id, estado, motivo_cierre: motivo })}
              onAsignar={(operador_id) => asignarOperador({ id: denuncia.id, operador_id })}
              cambiando={cambiando}
              asignando={asignando}
              operadores={operadores}
            />
          )}

          {/* Motivo de cierre */}
          {esCerrada && denuncia.motivo_cierre && (
            <div className="flex items-start gap-2 text-xs bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
              <CheckCircle size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wide block mb-0.5">
                  Motivo de cierre
                </span>
                <span className="text-gray-600">{denuncia.motivo_cierre}</span>
              </div>
            </div>
          )}

          {/* Conversación */}
          <HiloMensajes denunciaId={denuncia.id} soloLectura={esCerrada} />
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta SOS ──────────────────────────────────────────────────────────────

function SosCard({
  alerta,
  onSelectDenuncia,
}: {
  alerta: AlertaSos;
  onSelectDenuncia?: (id: string) => void;
}) {
  const { mutate: enAtencion, isPending: marcando }  = useMarcarSosEnAtencion();
  const { mutate: resolver,   isPending: resolviendo } = useResolverSos();

  const hace = (() => {
    const diff = Date.now() - new Date(alerta.fecha_activacion).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'hace un momento';
    if (mins < 60) return `hace ${mins} min`;
    return `hace ${Math.floor(mins / 60)} h`;
  })();

  const enAtencionActual = alerta.estado === 'en_atencion';

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      enAtencionActual
        ? 'border-orange-300 bg-orange-50/30'
        : 'border-red-400 bg-red-50/20'
    }`}>

      {/* Cabecera */}
      <div className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold ${
        enAtencionActual ? 'bg-orange-500 text-white' : 'bg-red-600 text-white'
      }`}>
        <span className="relative flex-shrink-0">
          {!enAtencionActual && (
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-white opacity-40" />
          )}
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white/80" />
        </span>
        🆘 ALERTA SOS
        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          enAtencionActual
            ? 'bg-orange-400/40 text-white'
            : 'bg-red-500/40 text-red-100'
        }`}>
          {enAtencionActual ? 'En atención' : 'Activa'}
        </span>
      </div>

      {/* Cuerpo */}
      <div className="px-3.5 py-3 space-y-3">

        {/* Nombre + tiempo */}
        <div>
          <p className="text-sm font-bold text-[#1A0A2E]">
            {alerta.usuario_nombre ?? 'Usuaria anónima'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {hace}
            {alerta.sms_enviados > 0 && (
              <span className="ml-2">· 📨 {alerta.sms_enviados} SMS al círculo</span>
            )}
          </p>
        </div>

        {/* Ubicación */}
        {alerta.latitud && alerta.longitud && (
          <a
            href={`https://maps.google.com/?q=${alerta.latitud},${alerta.longitud}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-red-600 font-semibold hover:text-red-800 transition-colors"
          >
            <MapPin size={12} />
            Ver ubicación en Google Maps
          </a>
        )}

        {/* Expediente vinculado */}
        {alerta.denuncia_id && (
          <div className="flex items-center gap-2 bg-white rounded-xl border border-[#EBE3F9] px-3 py-2">
            <span className="text-[10px] text-[#B09CC8] font-bold uppercase tracking-wider">Expediente</span>
            {alerta.codigo_acceso && (
              <span className="text-xs font-mono font-black text-[#8B43D4]">{alerta.codigo_acceso}</span>
            )}
            {onSelectDenuncia && (
              <button
                onClick={() => onSelectDenuncia(alerta.denuncia_id!)}
                className="ml-auto text-[11px] font-bold text-[#8B43D4] hover:text-[#6E2DB0] transition-colors"
              >
                Ver expediente →
              </button>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          {!enAtencionActual && (
            <button
              disabled={marcando}
              onClick={() => enAtencion(alerta.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              {marcando
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Clock size={12} />
              }
              En atención
            </button>
          )}
          <button
            disabled={resolviendo}
            onClick={() => resolver(alerta.id)}
            className={`flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50 ${
              enAtencionActual
                ? 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'
            }`}
          >
            {resolviendo
              ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <CheckCircle size={12} />
            }
            Resolver
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FeedAcciones principal ────────────────────────────────────────────────────

type Tab = 'activas' | 'sin_asignar' | 'cerradas' | 'sos';

interface Props {
  filtros: Partial<Filtros>;
  selectedId?: string | null;
  onClearSelected?: () => void;
  onSelectDenuncia?: (id: string) => void;
}

export function FeedAcciones({ filtros, selectedId, onClearSelected, onSelectDenuncia }: Props) {
  const [pagina, setPagina]       = useState(1);
  const [tabActiva, setTabActiva] = useState<Tab>('activas');

  // Tab override: merges on top of external filtros
  const filtrosEfectivos = useMemo((): Partial<Filtros> => {
    if (tabActiva === 'sin_asignar') return { ...filtros, estado: 'nueva' as EstadoCaso };
    if (tabActiva === 'cerradas')    return { ...filtros, estado: 'cerrada' as EstadoCaso };
    return filtros;
  }, [tabActiva, filtros]);

  const soloActivas = tabActiva === 'activas';
  const { data, isLoading } = useDenuncias(filtrosEfectivos, pagina, 15, soloActivas);
  const { data: kpis }            = useKpis(filtros);       // sin override de tab para contadores globales
  const { data: sosAlertas = [] } = useSosAlertas();
  const cardRefs  = useRef<Record<string, HTMLDivElement | null>>({});
  const listRef   = useRef<HTMLDivElement>(null);

  const registerRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    cardRefs.current[id] = el;
  }, []);

  // Reset página al cambiar de tab
  useEffect(() => { setPagina(1); }, [tabActiva]);

  // Al seleccionar desde el mapa, ir a tab "Activas" (los casos activos están ahí)
  useEffect(() => {
    if (selectedId) setTabActiva('activas');
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    document.getElementById('expedientes-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const attempt = () => {
      const el = cardRefs.current[selectedId];
      if (el && listRef.current) {
        listRef.current.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
      }
    };
    const t = setTimeout(attempt, 300);
    return () => clearTimeout(t);
  }, [selectedId]);

  const denuncias = data?.data ?? [];
  const total     = data?.total ?? 0;
  const totalPags = Math.max(1, Math.ceil(total / 15));
  const urgentes  = denuncias.filter((d) => d.nivel_riesgo === 'urgente' && d.estado !== 'cerrada').length;

  // Contadores para los tabs (de kpis globales)
  const por_estado    = kpis?.por_estado as Partial<Record<EstadoCaso, number>> | undefined;
  const activasCnt    = kpis?.activas ?? 0;
  const sinAsignarCnt = por_estado?.nueva ?? 0;
  const cerradasCnt   = por_estado?.cerrada ?? 0;
  const urgentesCnt   = kpis?.urgentes ?? 0;
  const sosCnt        = sosAlertas.filter((s) => s.estado === 'activa' || s.estado === 'en_atencion').length;

  return (
    <div className="bg-white rounded-2xl border border-[#DDD0F5] shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-[#1A0A2E]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Expedientes
          </h2>
          <p className="text-xs text-[#B09CC8] mt-0.5">
            {total} denuncias
            {urgentes > 0 && (
              <span className="ml-2 text-red-600 font-bold animate-dot-urgente inline-block">
                · {urgentes} urgente{urgentes > 1 ? 's' : ''}
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
            >‹</button>
            <span className="px-1">{pagina}/{totalPags}</span>
            <button
              disabled={pagina >= totalPags}
              onClick={() => setPagina((p) => p + 1)}
              className="px-2 py-1 rounded-lg border border-[#DDD0F5] disabled:opacity-40 hover:border-[#8B43D4] transition-colors"
            >›</button>
          </div>
        )}
      </div>

      {/* ── Tabs de organización ─────────────────────────────────────────── */}
      <div className="flex gap-1 mb-3 bg-gray-50 rounded-xl p-1">
        {([
          { id: 'activas'     as Tab, label: 'Activas',     count: activasCnt,    showUrgent: urgentesCnt > 0, showSos: false },
          { id: 'sin_asignar' as Tab, label: 'Sin asignar', count: sinAsignarCnt, showUrgent: false,           showSos: false },
          { id: 'sos'         as Tab, label: '🆘 SOS',      count: sosCnt,        showUrgent: sosCnt > 0,      showSos: true  },
          { id: 'cerradas'    as Tab, label: 'Cerradas',    count: cerradasCnt,   showUrgent: false,           showSos: false },
        ] as const).map(({ id, label, count, showUrgent, showSos }) => {
          if (id === 'sos' && sosCnt === 0) return null; // ocultar tab SOS si no hay alertas
          return (
            <button
              key={id}
              onClick={() => setTabActiva(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-lg transition-all ${
                tabActiva === id
                  ? showSos
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-[#8B43D4] shadow-sm'
                  : showSos
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  tabActiva === id
                    ? showSos
                      ? 'bg-white/30 text-white'
                      : showUrgent
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : 'bg-[#F3EFFE] text-[#8B43D4]'
                    : showSos
                      ? 'bg-red-100 text-red-600 animate-pulse'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedId && (
        <div className="flex items-center gap-2 bg-[#F3EFFE] border border-[#DDD0F5] rounded-xl px-3 py-2 mb-3 text-xs text-[#5E4480]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8B43D4] flex-shrink-0" />
          Caso seleccionado desde el mapa
          <button
            onClick={onClearSelected}
            className="ml-auto text-[#B09CC8] hover:text-[#5E4480] font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 max-h-[520px] pr-0.5">
        {tabActiva === 'sos' ? (
          sosAlertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#B09CC8]">
              <CheckCircle size={28} className="mb-2 text-[#DDD0F5]" />
              <p className="text-sm">Sin alertas SOS activas</p>
            </div>
          ) : (
            sosAlertas
              .filter((s) => s.estado === 'activa' || s.estado === 'en_atencion')
              .map((alerta) => (
                <SosCard
                  key={alerta.id}
                  alerta={alerta}
                  onSelectDenuncia={onSelectDenuncia}
                />
              ))
          )
        ) : isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#F3EFFE] rounded-2xl animate-pulse" />
          ))
        ) : !denuncias.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#B09CC8]">
            <CheckCircle size={28} className="mb-2 text-[#DDD0F5]" />
            <p className="text-sm">Sin denuncias para este filtro</p>
          </div>
        ) : (
          denuncias.map((d) => (
            <ExpedienteCard
              key={d.id}
              denuncia={d}
              sosActiva={sosAlertas.find((s) => s.denuncia_id === d.id)}
              isSelected={d.id === selectedId}
              cardRef={registerRef(d.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
