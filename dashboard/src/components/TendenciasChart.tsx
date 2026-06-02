import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Area, AreaChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTendencias } from '../hooks/useDashboard';
import type { Filtros } from '../types';

interface Props {
  filtros: Partial<Filtros>;
}

interface ChartPoint {
  label: string;
  reportes: number;
  noti: number;
  netlab: number;
}

// Convierte semana epidemiológica (ISO: lunes) a fecha string YYYY-MM-DD.
// date_trunc('week', ...) en PostgreSQL también devuelve lunes — alinea bien.
function epiWeekToKey(year: number, week: number): { key: string; label: string } {
  const jan4 = new Date(year, 0, 4);
  const dow = (jan4.getDay() + 6) % 7; // 0=lun … 6=dom
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + (week - 1) * 7);
  const key = monday.toISOString().split('T')[0];
  const label = format(monday, "d MMM", { locale: es });
  return { key, label };
}

export function TendenciasChart({ filtros }: Props) {
  const { data, isLoading } = useTendencias(filtros);

  const chartData: ChartPoint[] = (() => {
    if (!data) return [];
    const map = new Map<string, ChartPoint>();

    const upsert = (k: string, label: string, patch: Partial<ChartPoint>) => {
      const cur = map.get(k) ?? { label, reportes: 0, noti: 0, netlab: 0 };
      map.set(k, { ...cur, ...patch, label: patch.label ?? cur.label });
    };

    data.reportes.forEach(({ semana, total }) => {
      if (!semana) return;
      const k = semana.substring(0, 10);
      const label = format(parseISO(semana), "d MMM", { locale: es });
      upsert(k, label, { reportes: (map.get(k)?.reportes ?? 0) + total });
    });

    data.noti.forEach(({ ano, semana_epi, total }) => {
      const { key: k, label } = epiWeekToKey(ano, semana_epi);
      upsert(k, label, { noti: (map.get(k)?.noti ?? 0) + total });
    });

    data.netlab.forEach(({ semana, total }) => {
      if (!semana) return;
      const k = semana.substring(0, 10);
      const label = format(parseISO(semana), "d MMM", { locale: es });
      upsert(k, label, { netlab: (map.get(k)?.netlab ?? 0) + total });
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  })();

  const hasNoti = chartData.some((p) => p.noti > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="font-semibold text-gray-800 mb-2">Semana del {label}</p>
        {payload.map((p: any) => (
          p.value > 0 && (
            <p key={p.dataKey} className="flex items-center gap-2 mb-0.5" style={{ color: p.color }}>
              <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: p.color }} />
              <span className="flex-1">{p.name}:</span>
              <span className="font-bold">{p.value}</span>
            </p>
          )
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Tendencias Semanales
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Últimas 12 semanas — criaderos SIVAPRE · casos NOTI · confirmados NETLAB
          </p>
        </div>
        {!hasNoti && data && !isLoading && (
          <span className="text-[10px] text-gray-300 mt-1">Sin datos NOTI para el período</span>
        )}
      </div>

      {isLoading ? (
        <div className="h-56 bg-gray-50 rounded-xl animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
          Sin datos para el período seleccionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradReportes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0F6E56" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#0F6E56" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradNoti" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradNetlab" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />

            <Area
              type="monotone" dataKey="reportes" name="Criaderos SIVAPRE"
              stroke="#0F6E56" strokeWidth={2.5} fill="url(#gradReportes)"
              dot={{ r: 3, fill: '#0F6E56', strokeWidth: 0 }} activeDot={{ r: 5 }}
            />
            <Area
              type="monotone" dataKey="noti" name="Casos NOTI"
              stroke="#3B82F6" strokeWidth={2} fill="url(#gradNoti)"
              dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 5 }}
              strokeDasharray={hasNoti ? undefined : '4 3'}
            />
            <Area
              type="monotone" dataKey="netlab" name="Confirmados NETLAB"
              stroke="#EF4444" strokeWidth={2.5} fill="url(#gradNetlab)"
              dot={{ r: 3, fill: '#EF4444', strokeWidth: 0 }} activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
