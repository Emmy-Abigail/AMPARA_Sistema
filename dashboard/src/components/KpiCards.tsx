// components - KpiCards.tsx

import { ShieldAlert, AlertOctagon, Activity, CalendarCheck } from 'lucide-react';
import { useKpis } from '../hooks/useDashboard';
import type { Filtros } from '../types';

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  loading: boolean;
  delta?: string;
}

function KpiCard({ label, value, icon, color, bgColor, loading, delta }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
        {loading ? (
          <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <p
            className="text-3xl font-black text-gray-900 leading-none"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {value.toLocaleString()}
          </p>
        )}
        {delta && !loading && (
          <p className="text-xs text-gray-400 mt-1">{delta}</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  filtros: Partial<Filtros>;
}

export function KpiCards({ filtros }: Props) {
  const { data, isLoading } = useKpis(filtros);

  const cards = [
    {
      label:   'Total Denuncias',
      value:   data?.total ?? 0,
      icon:    <ShieldAlert size={22} />,
      color:   'text-[#8B43D4]',
      bgColor: 'bg-[#8B43D4]/10',
      delta:   'Todas las denuncias registradas',
    },
    {
      label:   'Casos Activos',
      value:   data?.activas ?? 0,
      icon:    <Activity size={22} />,
      color:   'text-blue-600',
      bgColor: 'bg-blue-50',
      delta:   'Sin cerrar',
    },
    {
      label:   'Casos Urgentes',
      value:   data?.urgentes ?? 0,
      icon:    <AlertOctagon size={22} />,
      color:   'text-red-600',
      bgColor: 'bg-red-50',
      delta:   'Requieren atención inmediata',
    },
    {
      label:   'Denuncias Hoy',
      value:   data?.hoy ?? 0,
      icon:    <CalendarCheck size={22} />,
      color:   'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} loading={isLoading} />
      ))}
    </div>
  );
}
