import { useState, useRef, useEffect } from 'react';
import { RefreshCw, Bell, MapPin, Clock, AlertTriangle, Timer, Star } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFeedAlertas } from '../../hooks/useDashboard';
import type { FeedItem } from '../../types';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

// ─── Clasificación de alertas ──────────────────────────────────────────────────

interface AlertaClasificada {
  item: FeedItem;
  prioridad: 'critica' | 'alta' | 'normal';
  motivo: string;
}

function clasificarAlertas(items: FeedItem[]): AlertaClasificada[] {
  const now = Date.now();
  return items
    .map((item): AlertaClasificada => {
      const ms = item.fecha_reporte ? now - new Date(item.fecha_reporte).getTime() : 0;
      const horas = ms / 3_600_000;
      const conLarvas = item.observa_larvas === 'Sí, claramente';

      if (conLarvas && horas > 2) {
        return { item, prioridad: 'critica', motivo: 'Con larvas · sin revisar >2h' };
      }
      if (conLarvas || horas > 24) {
        return {
          item, prioridad: 'alta',
          motivo: conLarvas ? 'Con larvas confirmadas' : 'Sin atender >24h',
        };
      }
      return { item, prioridad: 'normal', motivo: 'Reciente' };
    })
    .sort((a, b) => {
      const orden = { critica: 0, alta: 1, normal: 2 };
      return orden[a.prioridad] - orden[b.prioridad];
    });
}

const PRIORIDAD_STYLE: Record<string, { dot: string; badge: string; label: string }> = {
  critica: { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',    label: 'Crítica' },
  alta:    { dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Alta' },
  normal:  { dot: 'bg-[#0F6E56]', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Normal' },
};

// ─── Notificaciones de navegador ──────────────────────────────────────────────

function useBrowserNotifications(alertas: FeedItem[] | undefined) {
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  // La Notification API del navegador requiere HTTPS (contexto seguro).
  // En HTTP el navegador ignora requestPermission silenciosamente.
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;

  const requestPermission = async () => {
    if (typeof Notification === 'undefined' || !isSecure) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  useEffect(() => {
    if (!alertas?.length) return;

    const currentIds = new Set(alertas.map((a) => a.id));
    const seenAny = prevIdsRef.current.size > 0;

    if (seenAny && permission === 'granted') {
      const nuevos = alertas.filter((a) => !prevIdsRef.current.has(a.id));
      const urgentes = nuevos.filter((a) => a.observa_larvas === 'Sí, claramente');
      const soloNuevos = nuevos.filter((a) => a.observa_larvas !== 'Sí, claramente');

      if (urgentes.length > 0) {
        new Notification(`⚠️ ${urgentes.length} criadero${urgentes.length > 1 ? 's' : ''} con larvas`, {
          body: urgentes
            .slice(0, 3)
            .map((r) => `${r.reporter.nombre} · ${r.direccion || r.reporter.provincia || r.tipo_lugar}`)
            .join('\n'),
          icon: '/favicon.svg',
          tag: 'sivapre-urgente',
          requireInteraction: true,
        });
      } else if (soloNuevos.length > 0) {
        new Notification(`📬 ${soloNuevos.length} nuevo${soloNuevos.length > 1 ? 's' : ''} reporte${soloNuevos.length > 1 ? 's' : ''}`, {
          body: soloNuevos.slice(0, 2).map((r) => r.tipo_lugar + ' · ' + r.reporter.nombre).join('\n'),
          icon: '/favicon.svg',
          tag: 'sivapre-nuevos',
        });
      }
    }

    prevIdsRef.current = currentIds;
  }, [alertas, permission]);

  return { permission, requestPermission, isSecure };
}

// ─── Componente TopBar ─────────────────────────────────────────────────────────

export function TopBar({ title, subtitle }: TopBarProps) {
  const qc = useQueryClient();
  const [spinning, setSpinning] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const { data: alertasRaw } = useFeedAlertas();
  const { permission, requestPermission, isSecure } = useBrowserNotifications(alertasRaw);

  const alertas = clasificarAlertas(alertasRaw ?? []);
  const criticas = alertas.filter((a) => a.prioridad === 'critica').length;
  const altas    = alertas.filter((a) => a.prioridad === 'alta').length;
  const total    = alertas.length;

  const badgeCount = criticas > 0 ? criticas : altas > 0 ? altas : total;
  const badgeColor = criticas > 0 ? 'bg-red-500' : altas > 0 ? 'bg-amber-400' : 'bg-[#0F6E56]';

  const handleRefresh = () => {
    if (spinning) return;
    setSpinning(true);
    qc.invalidateQueries();
    setTimeout(() => setSpinning(false), 800);
  };

  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {title}
        </h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-[#0F6E56] hover:border-[#0F6E56] transition-all shadow-sm"
          title="Actualizar datos"
        >
          <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} />
        </button>

        {/* Bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen((v) => !v)}
            className={`p-2 rounded-xl bg-white border transition-all shadow-sm relative ${
              bellOpen
                ? 'border-[#0F6E56] text-[#0F6E56]'
                : 'border-gray-200 text-gray-500 hover:text-[#0F6E56] hover:border-[#0F6E56]'
            }`}
          >
            <Bell size={16} />
            {total > 0 && (
              <span className={`absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center ${badgeColor}`}>
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
              {/* Cabecera con resumen */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Alertas pendientes
                  </p>
                  {permission === 'granted' ? (
                    <span className="text-[10px] text-[#0F6E56] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] animate-pulse" />
                      Alertas activas
                    </span>
                  ) : isSecure ? (
                    <button
                      onClick={requestPermission}
                      className="text-[10px] font-semibold text-[#0F6E56] border border-[#0F6E56]/30 rounded-lg px-2 py-0.5 hover:bg-[#0F6E56]/5 transition-all"
                    >
                      Activar alertas del escritorio
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-400">
                      Requiere HTTPS
                    </span>
                  )}
                </div>

                {/* Resumen de prioridades */}
                {total > 0 ? (
                  <div className="flex gap-2">
                    {criticas > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-0.5">
                        <AlertTriangle size={10} /> {criticas} crítico{criticas > 1 ? 's' : ''}
                      </span>
                    )}
                    {altas > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
                        <Timer size={10} /> {altas} alta{altas > 1 ? 's' : ''}
                      </span>
                    )}
                    {total - criticas - altas > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
                        <Star size={10} /> {total - criticas - altas} normal{total - criticas - altas > 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Sin reportes pendientes de revisión</p>
                )}
              </div>

              {/* Lista de alertas */}
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {alertas.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    Todo al día ✓
                  </div>
                ) : (
                  alertas.slice(0, 8).map(({ item, prioridad, motivo }) => {
                    const style = PRIORIDAD_STYLE[prioridad];
                    return (
                      <div key={item.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {item.tipo_lugar} · {item.tipo_objeto}
                              </p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${style.badge}`}>
                                {motivo}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 truncate">{item.reporter.nombre}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={9} className="flex-shrink-0" />
                              <span className="truncate">
                                {item.direccion || item.reporter.distrito || item.reporter.provincia || '—'}
                              </span>
                            </p>
                            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock size={9} />
                              {item.fecha_reporte
                                ? formatDistanceToNow(new Date(item.fecha_reporte), { locale: es, addSuffix: true })
                                : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {alertas.length > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-400 text-center">
                    {!isSecure
                      ? 'Las notificaciones de escritorio requieren HTTPS'
                      : permission === 'denied'
                      ? 'Alertas de escritorio bloqueadas en el navegador'
                      : permission === 'granted'
                      ? 'Recibirás alertas de escritorio ante nuevos reportes con larvas'
                      : 'Activa las alertas de escritorio para recibir notificaciones aunque cambies de pestaña'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
