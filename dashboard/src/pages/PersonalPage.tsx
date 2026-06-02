import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, ShieldCheck, Shield, ToggleLeft, ToggleRight, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function usePersonal() {
  return useQuery({
    queryKey: ['personal'],
    queryFn: () => api.get('/dashboard/personal').then((r) => r.data),
  });
}

function useCrearPersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nombre: string; email: string; password: string; rol: string }) =>
      api.post('/dashboard/personal', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] }),
  });
}

function useTogglePersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/dashboard/personal/${id}/estado`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] }),
  });
}

export function PersonalPage() {
  const { data: personal, isLoading } = usePersonal();
  const { mutate: crear, isPending: creando, error: errorCrear } = useCrearPersonal();
  const { mutate: toggle } = useTogglePersonal();

  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'inspector' });
  const [showPass, setShowPass] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSuccess('');
    crear(form, {
      onSuccess: (u) => {
        setSuccess(`Cuenta creada para ${u.nombre}`);
        setForm({ nombre: '', email: '', password: '', rol: 'inspector' });
      },
    });
  };

  const errMsg = (errorCrear as any)?.response?.data?.detail ?? '';

  return (
    <div className="space-y-6">
      {/* Crear nuevo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#0F6E56]/10 flex items-center justify-center">
            <UserPlus size={18} className="text-[#0F6E56]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Crear cuenta de personal
            </h2>
            <p className="text-xs text-gray-400">Inspectores y administradores del sistema</p>
          </div>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 text-sm text-emerald-700 font-medium">
            ✓ {success}
          </div>
        )}
        {errMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
            {errMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Nombre completo</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Carlos Ramírez"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Correo electrónico</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="inspector@minsa.gob.pe"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Contraseña inicial</label>
            <div className="relative">
              <input
                required
                type={showPass ? 'text' : 'password'}
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20"
              />
              <button type="button" onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Rol</label>
            <select
              value={form.rol}
              onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 bg-white"
            >
              <option value="inspector">Inspector</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={creando}
              className="bg-[#0F6E56] hover:bg-[#0a5542] text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 disabled:opacity-70"
            >
              {creando ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creando...</>
              ) : (
                <><UserPlus size={15} /> Crear cuenta</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-black text-gray-900 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Personal registrado ({personal?.length ?? 0})
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : personal?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No hay personal registrado aún.</p>
        ) : (
          <div className="space-y-2">
            {personal?.map((u: any) => (
              <div key={u.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#0F6E56]/10 flex items-center justify-center flex-shrink-0">
                  {u.rol === 'admin'
                    ? <ShieldCheck size={18} className="text-[#0F6E56]" />
                    : <Shield size={18} className="text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{u.nombre}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={u.rol === 'admin' ? 'green' : 'blue'} size="md">
                    {u.rol === 'admin' ? 'Administrador' : 'Inspector'}
                  </Badge>
                  <Badge variant={u.esActivo !== false ? 'green' : 'gray'}>
                    {u.esActivo !== false ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <span className="text-xs text-gray-400 hidden lg:block">
                    {u.creadoEn ? format(new Date(u.creadoEn), "d MMM yyyy", { locale: es }) : '—'}
                  </span>
                  <button
                    onClick={() => toggle(u.id)}
                    className="text-gray-400 hover:text-[#0F6E56] transition-colors"
                    title={u.esActivo !== false ? 'Desactivar' : 'Activar'}
                  >
                    {u.esActivo !== false
                      ? <ToggleRight size={22} className="text-[#0F6E56]" />
                      : <ToggleLeft size={22} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
