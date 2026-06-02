import { Bug, AlertTriangle, FlaskConical, MapPin } from 'lucide-react';
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
          <p className="text-3xl font-black text-gray-900 leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
      label: 'Total Reportes Ciudadanos',
      value: data?.total_reportes ?? 0,
      icon: <MapPin size={22} />,
      color: 'text-[#0F6E56]',
      bgColor: 'bg-[#0F6E56]/10',
    },
    {
      label: 'Reportes con Larvas',
      value: data?.reportes_con_larvas ?? 0,
      icon: <Bug size={22} />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      delta: 'Alerta temprana',
    },
    {
      label: 'Casos Sospechosos (NOTI)',
      value: data?.casos_sospechosos ?? 0,
      icon: <AlertTriangle size={22} />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'Casos Confirmados (NETLAB)',
      value: data?.casos_confirmados ?? 0,
      icon: <FlaskConical size={22} />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      delta: 'PCR positivo',
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
