import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { dashboardApi } from '../api/endpoints';
import { useAuthStore } from '../store/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await dashboardApi.login(email, password);
      const token = res.token;
      const user = res.usuario;
      if (!token) throw new Error('Respuesta inválida del servidor');
      if (!['inspector', 'admin'].includes(user?.rol)) {
        throw new Error('Acceso restringido. Se requiere rol de inspector o administrador.');
      }
      login(token, { nombre: user.nombre, email: user.email, rol: user.rol });
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.mensaje ||
        err?.message ||
        'Error al iniciar sesión';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a4535] to-[#0F6E56] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4 shadow-xl">
            <span className="text-white font-black text-2xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>S</span>
          </div>
          <h1 className="text-white font-black text-2xl tracking-widest" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            SIVAPRE
          </h1>
          <p className="text-white/60 text-sm mt-1">Dashboard de Gestión Epidemiológica</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-gray-500 mb-6">Acceso exclusivo para personal autorizado</p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="inspector@minsa.gob.pe"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-11 text-sm text-gray-800 focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F6E56] hover:bg-[#0a5542] text-white font-bold py-3 rounded-xl transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar al Dashboard'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          SIVAPRE · Sistema de Vigilancia y Predicción en Salud
        </p>
      </div>
    </div>
  );
}
