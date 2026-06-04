import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, Area, AreaChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useKpis } from '../hooks/useDashboard';
import type { Filtros } from '../types';

interface Props {
  filtros: Partial<Filtros>;
}

export function TendenciasChart({ filtros }: Props) {
  const { data: kpis, isLoading } = useKpis(filtros);

  const chartData = (kpis?.tendencia ?? []).map(({ fecha, total }) => ({
    label: format(parseISO(fecha), "d MMM", { locale: es }),
    total,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="font-semibold text-gray-800 mb-1">{label}</p>
        <p style={{ color: '#8B43D4' }} className="font-bold">
          {payload[0].value} {payload[0].value === 1 ? 'denuncia' : 'denuncias'}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <h2 className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Tendencia de Denuncias
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">Últimos 7 días</p>
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
              <linearGradient id="gradDenuncias" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8B43D4" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#8B43D4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              name="Denuncias"
              stroke="#8B43D4"
              strokeWidth={2.5}
              fill="url(#gradDenuncias)"
              dot={{ r: 3, fill: '#8B43D4', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
