import { Filter, X } from 'lucide-react';
import type { Filtros, EstadoCaso, NivelRiesgo, TipoViolencia } from '../types';

interface FiltrosBarProps {
  filtros: Partial<Filtros>;
  onChange: (f: Partial<Filtros>) => void;
}

const ESTADOS: { value: EstadoCaso; label: string }[] = [
  { value: 'nueva',                  label: 'Nueva' },
  { value: 'asignada',               label: 'Asignada' },
  { value: 'en_seguimiento',         label: 'En seguimiento' },
  { value: 'derivada',               label: 'Derivada' },
  { value: 'pendiente_confirmacion', label: 'Pendiente' },
  { value: 'cerrada',                label: 'Cerrada' },
];

const NIVELES: { value: NivelRiesgo; label: string }[] = [
  { value: 'urgente',  label: 'Urgente' },
  { value: 'alto',     label: 'Alto' },
  { value: 'medio',    label: 'Medio' },
  { value: 'bajo',     label: 'Bajo' },
  { value: 'moderado', label: 'Moderado' },
];

const TIPOS: { value: TipoViolencia; label: string }[] = [
  { value: 'Física',      label: 'Física' },
  { value: 'Psicológica', label: 'Psicológica' },
  { value: 'Verbal',      label: 'Verbal' },
  { value: 'Sexual',      label: 'Sexual' },
  { value: 'Económica',   label: 'Económica' },
  { value: 'Digital',     label: 'Digital' },
  { value: 'Otra',        label: 'Otra' },
];

export function FiltrosBar({ filtros, onChange }: FiltrosBarProps) {
  const set = (key: keyof Filtros, val: string) =>
    onChange({ ...filtros, [key]: val || undefined });
  const clear = () => onChange({});
  const hasFilters = Object.values(filtros).some(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={15} className="text-[#8B43D4]" />
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
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#8B43D4] focus:ring-1 focus:ring-[#8B43D4]/30"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Hasta</label>
          <input
            type="date"
            value={filtros.fecha_hasta ?? ''}
            onChange={(e) => set('fecha_hasta', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#8B43D4] focus:ring-1 focus:ring-[#8B43D4]/30"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Estado</label>
          <select
            value={filtros.estado ?? ''}
            onChange={(e) => set('estado', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#8B43D4] focus:ring-1 focus:ring-[#8B43D4]/30 bg-white"
          >
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Nivel de riesgo</label>
          <select
            value={filtros.nivel_riesgo ?? ''}
            onChange={(e) => set('nivel_riesgo', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#8B43D4] focus:ring-1 focus:ring-[#8B43D4]/30 bg-white"
          >
            <option value="">Todos</option>
            {NIVELES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Tipo de violencia</label>
          <select
            value={filtros.tipo_violencia ?? ''}
            onChange={(e) => set('tipo_violencia', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#8B43D4] focus:ring-1 focus:ring-[#8B43D4]/30 bg-white"
          >
            <option value="">Todos</option>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
