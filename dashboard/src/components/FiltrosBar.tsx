import { Filter, X } from 'lucide-react';
import type { Filtros } from '../types';
import { useUbicaciones } from '../hooks/useDashboard';

interface FiltrosBarProps {
  filtros: Partial<Filtros>;
  onChange: (f: Partial<Filtros>) => void;
}

export function FiltrosBar({ filtros, onChange }: FiltrosBarProps) {
  const { data: ubicData } = useUbicaciones();
  const departamentos = ubicData?.departamentos ?? [];

  const set = (key: keyof Filtros, val: string) => onChange({ ...filtros, [key]: val });
  const clear = () => onChange({});
  const hasFilters = Object.values(filtros).some(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={15} className="text-[#0F6E56]" />
        <span className="text-sm font-semibold text-gray-700">Filtros</span>
        {hasFilters && (
          <button
            onClick={clear}
            className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={12} /> Limpiar
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Desde</label>
          <input
            type="date"
            value={filtros.fecha_desde ?? ''}
            onChange={(e) => set('fecha_desde', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]/30"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Hasta</label>
          <input
            type="date"
            value={filtros.fecha_hasta ?? ''}
            onChange={(e) => set('fecha_hasta', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]/30"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Departamento</label>
          <select
            value={filtros.departamento ?? ''}
            onChange={(e) => set('departamento', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]/30 bg-white"
          >
            <option value="">Todos</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Provincia</label>
          <input
            type="text"
            placeholder="Ej: Iquitos"
            value={filtros.provincia ?? ''}
            onChange={(e) => set('provincia', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]/30"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Distrito</label>
          <input
            type="text"
            placeholder="Ej: Belén"
            value={filtros.distrito ?? ''}
            onChange={(e) => set('distrito', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]/30"
          />
        </div>
      </div>
    </div>
  );
}
