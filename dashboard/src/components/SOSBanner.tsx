import { AlertTriangle, MapPin, Phone, CheckCircle } from 'lucide-react';
import { useSosAlertas, useResolverSos } from '../hooks/useDashboard';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function SOSBanner() {
  const { data: alertas } = useSosAlertas();
  const { mutate: resolver } = useResolverSos();

  if (!alertas || alertas.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-2">
      {alertas.map((alerta) => (
        <div
          key={alerta.id}
          className="flex items-start gap-3 bg-red-600 text-white rounded-2xl px-5 py-4 shadow-lg"
        >
          {/* Icono pulsante */}
          <span className="relative flex-shrink-0 mt-0.5">
            <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-white opacity-50" />
            <AlertTriangle size={20} className="relative text-white" />
          </span>

          {/* Datos */}
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm tracking-wide">
              ⚠ ALERTA SOS ACTIVA
            </p>
            <p className="text-xs text-red-100 mt-0.5">
              {alerta.usuario_nombre ?? 'Usuaria anónima'}
              {' · '}
              {formatDistanceToNow(new Date(alerta.fecha_activacion), {
                addSuffix: true,
                locale: es,
              })}
            </p>
            <div className="flex gap-3 mt-1 flex-wrap">
              {alerta.sms_enviados > 0 && (
                <span className="flex items-center gap-1 text-xs text-red-100">
                  <Phone size={11} />
                  {alerta.sms_enviados} SMS enviado{alerta.sms_enviados > 1 ? 's' : ''}
                </span>
              )}
              {alerta.latitud && alerta.longitud && (
                <a
                  href={`https://maps.google.com/?q=${alerta.latitud},${alerta.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-red-100 underline hover:text-white"
                >
                  <MapPin size={11} />
                  Ver ubicación
                </a>
              )}
            </div>
          </div>

          {/* Resolver */}
          <button
            onClick={() => resolver(alerta.id)}
            className="flex-shrink-0 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors rounded-xl px-3 py-1.5 text-xs font-bold"
          >
            <CheckCircle size={14} />
            Resolver
          </button>
        </div>
      ))}
    </div>
  );
}
