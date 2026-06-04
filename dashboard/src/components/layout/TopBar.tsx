import { useState, useRef, useEffect } from 'react';
import { RefreshCw, Bell, Clock, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useKpis, useDenuncias } from '../../hooks/useDashboard';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

function useBrowserNotifications(urgentes: number) {
  const prevUrgentesRef = useRef(0);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;

  const requestPermission = async () => {
    if (typeof Notification === 'undefined' || !isSecure) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  useEffect(() => {
    const prev = prevUrgentesRef.current;
    prevUrgentesRef.current = urgentes;
    if (prev > 0 && urgentes > prev && permission === 'granted') {
      new Notification(`⚠️ ${urgentes - prev} nueva${urgentes - prev > 1 ? 's' : ''} denuncia urgente`, {
        body: 'Hay denuncias que requieren atención inmediata.',
        icon: '/favicon.svg',
        tag: 'ampara-urgente',
        requireInteraction: true,
      });
    }
  }, [urgentes, permission]);

  return { permission, requestPermission, isSecure };
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const qc = useQueryClient();
  const [spinning, setSpinning] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data: kpis } = useKpis({});
  const { data: urgentesData } = useDenuncias({ nivel_riesgo: 'urgente', estado: 'nueva' }, 1, 5);
  const { data: nuevasData }   = useDenuncias({ estado: 'nueva' }, 1, 5);

  const urgentesItems = urgentesData?.data ?? [];
  const nuevasItems   = nuevasData?.data ?? [];
  const totalUrgentes = kpis?.urgentes ?? 0;

  const { permission, requestPermission, isSecure } = useBrowserNotifications(totalUrgentes);

  const totalAlertas  = urgentesItems.length + nuevasItems.filter((d) => d.nivel_riesgo !== 'urgente').length;
  const badgeCount    = urgentesItems.length > 0 ? urgentesItems.length : totalAlertas;
  const badgeColor    = urgentesItems.length > 0 ? 'bg-red-500' : 'bg-[#8B43D4]';

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
        <button
          onClick={handleRefresh}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-[#8B43D4] hover:border-[#8B43D4] transition-all shadow-sm"
          title="Actualizar datos"
        >
          <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} />
        </button>

        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen((v) => !v)}
            className={`p-2 rounded-xl bg-white border transition-all shadow-sm relative ${
              bellOpen
                ? 'border-[#8B43D4] text-[#8B43D4]'
                : 'border-gray-200 text-gray-500 hover:text-[#8B43D4] hover:border-[#8B43D4]'
            }`}
          >
            <Bell size={16} />
            {badgeCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center ${badgeColor}`}>
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Alertas pendientes
                  </p>
                  {permission === 'granted' ? (
                    <span className="text-[10px] text-[#8B43D4] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8B43D4] animate-pulse" />
                      Alertas activas
                    </span>
                  ) : isSecure ? (
                    <button
                      onClick={requestPermission}
                      className="text-[10px] font-semibold text-[#8B43D4] border border-[#8B43D4]/30 rounded-lg px-2 py-0.5 hover:bg-[#8B43D4]/5 transition-all"
                    >
                      Activar alertas
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-400">Requiere HTTPS</span>
                  )}
                </div>
                {urgentesItems.length > 0 ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-0.5 w-fit">
                    <AlertTriangle size={10} /> {urgentesItems.length} denuncia{urgentesItems.length > 1 ? 's' : ''} urgente{urgentesItems.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  <p className="text-xs text-gray-400">Sin denuncias urgentes sin atender</p>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {urgentesItems.length === 0 && nuevasItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">Todo al día ✓</div>
                ) : (
                  [...urgentesItems, ...nuevasItems.filter((d) => d.nivel_riesgo !== 'urgente')]
                    .slice(0, 8)
                    .map((d) => (
                      <div key={d.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            d.nivel_riesgo === 'urgente' ? 'bg-red-500' :
                            d.nivel_riesgo === 'alto'    ? 'bg-orange-400' : 'bg-emerald-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {d.tipo_violencia} · {d.relacion_agresor}
                            </p>
                            <p className="text-[10px] font-mono text-gray-400">{d.token_anonimo}</p>
                            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock size={9} />
                              {formatDistanceToNow(new Date(d.fecha_denuncia), { locale: es, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>

              {totalAlertas > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-400 text-center">
                    {!isSecure
                      ? 'Las notificaciones de escritorio requieren HTTPS'
                      : permission === 'denied'
                      ? 'Alertas de escritorio bloqueadas en el navegador'
                      : permission === 'granted'
                      ? 'Recibirás alertas cuando lleguen nuevas denuncias urgentes'
                      : 'Activa las alertas para recibir notificaciones aunque cambies de pestaña'}
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
