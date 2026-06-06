import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { dashboardApi } from '../api/endpoints';
import { useAuthStore } from '../store/auth';

// ─── Panel decorativo izquierdo ───────────────────────────────────────────────

function DecorativePanel() {
  return (
    <div className="hidden lg:flex flex-col relative overflow-hidden" style={{
      background: 'linear-gradient(145deg, #1A0A2E 0%, #2D1060 45%, #3B1A6B 100%)',
      width: '55%',
      flexShrink: 0,
    }}>
      {/* Orbs de fondo — efecto de luz ambiental */}
      <div style={{
        position: 'absolute', top: '-120px', left: '-80px',
        width: 420, height: 420, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,67,212,0.35) 0%, transparent 70%)',
        filter: 'blur(1px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', right: '-60px',
        width: 360, height: 360, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(176,123,230,0.25) 0%, transparent 70%)',
        filter: 'blur(1px)',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '60%',
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(90,36,160,0.4) 0%, transparent 70%)',
        transform: 'translate(-50%, -50%)',
      }} />

      {/* Líneas decorativas tenues */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }} viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice">
        <circle cx="300" cy="450" r="200" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="300" cy="450" r="300" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="300" cy="450" r="400" fill="none" stroke="white" strokeWidth="1"/>
        <line x1="0" y1="0" x2="600" y2="900" stroke="white" strokeWidth="0.5"/>
        <line x1="600" y1="0" x2="0" y2="900" stroke="white" strokeWidth="0.5"/>
      </svg>

      {/* Contenido principal */}
      <div className="relative flex flex-col items-center justify-center flex-1 px-12 py-16 z-10">

        {/* Logo */}
        <div style={{
          width: 200, height: 200,
          background: 'radial-gradient(circle at 40% 35%, rgba(176,123,230,0.18) 0%, rgba(139,67,212,0.08) 60%, transparent 100%)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
          boxShadow: '0 0 60px rgba(139,67,212,0.3), inset 0 0 40px rgba(176,123,230,0.1)',
        }}>
          <img
            src="/ampara-logo.png"
            alt="Ampara"
            style={{ width: 160, height: 160, objectFit: 'contain', filter: 'drop-shadow(0 4px 24px rgba(176,123,230,0.5))' }}
          />
        </div>

        {/* Nombre */}
        <h1 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 800,
          fontSize: 42,
          letterSpacing: '0.18em',
          color: '#FFFFFF',
          marginBottom: 6,
          textShadow: '0 2px 20px rgba(176,123,230,0.4)',
        }}>
          AMPARA
        </h1>

        {/* Tagline */}
        <p style={{
          color: 'rgba(176,123,230,0.85)',
          fontSize: 13,
          letterSpacing: '0.08em',
          textAlign: 'center',
          maxWidth: 280,
          lineHeight: 1.7,
          marginBottom: 48,
        }}>
          Plataforma de Protección y Atención a Víctimas de Violencia de Género
        </p>

        {/* Divisor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 300, marginBottom: 40 }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(176,123,230,0.4))' }} />
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(176,123,230,0.6)' }} />
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(176,123,230,0.4), transparent)' }} />
        </div>

        {/* Tres pilares */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 320 }}>
          {[
            { icon: '🛡', title: 'Protección', desc: 'Seguimiento activo de casos en tiempo real' },
            { icon: '🤝', title: 'Coordinación', desc: 'Derivación inmediata a instituciones competentes' },
            { icon: '🔒', title: 'Confidencialidad', desc: 'Comunicación cifrada y anonimato garantizado' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(139,67,212,0.25)',
                border: '1px solid rgba(176,123,230,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>
                {icon}
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {title}
                </p>
                <p style={{ color: 'rgba(176,123,230,0.7)', fontSize: 11, lineHeight: 1.5 }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer del panel */}
      <div style={{ padding: '16px 48px', borderTop: '1px solid rgba(139,67,212,0.2)', zIndex: 10 }}>
        <p style={{ color: 'rgba(176,123,230,0.45)', fontSize: 11, textAlign: 'center', letterSpacing: '0.04em' }}>
          Acceso exclusivo para personal autorizado · Ampara © 2026
        </p>
      </div>
    </div>
  );
}

// ─── Panel del formulario ─────────────────────────────────────────────────────

export function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuthStore();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res   = await dashboardApi.login(email, password);
      const token = res.token;
      const user  = res.usuario;
      if (!token) throw new Error('Respuesta inválida del servidor');
      if (!['operador', 'admin'].includes(user?.rol)) {
        throw new Error('Acceso restringido. Se requiere rol de operador o administrador.');
      }
      login(token, { nombre: user.nombre, email: user.email, rol: user.rol });
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail  ||
        err?.response?.data?.mensaje ||
        err?.message                  ||
        'Error al iniciar sesión';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F5FE' }}>

      {/* Panel izquierdo decorativo */}
      <DecorativePanel />

      {/* Panel derecho — formulario */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        background: '#FFFFFF',
        minHeight: '100vh',
      }}>

        {/* Logo solo visible en mobile (panel izquierdo oculto) */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div style={{
            width: 80, height: 80,
            background: 'linear-gradient(145deg, #B07BE6, #6E2DB0)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
            boxShadow: '0 8px 24px rgba(139,67,212,0.35)',
          }}>
            <img src="/ampara-logo.png" alt="Ampara" style={{ width: 56, height: 56, objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 24, letterSpacing: '0.15em', color: '#3B1A6B', margin: 0 }}>
            AMPARA
          </h1>
        </div>

        {/* Encabezado del formulario */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 36 }}>
          <p style={{ color: '#B09CC8', fontSize: 12, letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
            Panel de Operaciones
          </p>
          <h2 style={{
            fontFamily: 'Montserrat, sans-serif', fontWeight: 800,
            fontSize: 28, color: '#1A0A2E', margin: '0 0 8px 0', lineHeight: 1.2,
          }}>
            Bienvenida de vuelta
          </h2>
          <p style={{ color: '#5E4480', fontSize: 14, margin: 0 }}>
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400 }}>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#FFF1F2', border: '1px solid #FECDD3',
              borderRadius: 14, padding: '12px 16px', marginBottom: 20,
            }}>
              <AlertCircle size={16} color="#E11D48" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#BE123C', margin: 0, lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5E4480', marginBottom: 7, letterSpacing: '0.04em' }}>
              Correo electrónico
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operador@ampara.pe"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1.5px solid #DDD0F5', borderRadius: 14,
                padding: '13px 16px', fontSize: 14, color: '#1A0A2E',
                background: '#FAFAFA', outline: 'none', transition: 'all 0.2s',
                fontFamily: 'Inter, sans-serif',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#8B43D4'; e.target.style.boxShadow = '0 0 0 3px rgba(139,67,212,0.12)'; e.target.style.background = '#FFFFFF'; }}
              onBlur={(e)  => { e.target.style.borderColor = '#DDD0F5'; e.target.style.boxShadow = 'none'; e.target.style.background = '#FAFAFA'; }}
            />
          </div>

          {/* Contraseña */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5E4480', marginBottom: 7, letterSpacing: '0.04em' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1.5px solid #DDD0F5', borderRadius: 14,
                  padding: '13px 48px 13px 16px', fontSize: 14, color: '#1A0A2E',
                  background: '#FAFAFA', outline: 'none', transition: 'all 0.2s',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#8B43D4'; e.target.style.boxShadow = '0 0 0 3px rgba(139,67,212,0.12)'; e.target.style.background = '#FFFFFF'; }}
                onBlur={(e)  => { e.target.style.borderColor = '#DDD0F5'; e.target.style.boxShadow = 'none'; e.target.style.background = '#FAFAFA'; }}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#B09CC8',
                  padding: 4, display: 'flex', alignItems: 'center',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#8B43D4')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#B09CC8')}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Botón de ingreso */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px 24px',
              background: loading ? '#B07BE6' : 'linear-gradient(135deg, #8B43D4 0%, #6E2DB0 100%)',
              color: '#FFFFFF', border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s', letterSpacing: '0.02em',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(139,67,212,0.4)',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => { if (!loading) (e.target as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'none'; }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#FFFFFF', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Verificando…
              </>
            ) : (
              <>
                Ingresar al sistema
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Nota de seguridad */}
          <p style={{
            textAlign: 'center', fontSize: 11, color: '#B09CC8',
            marginTop: 24, lineHeight: 1.6,
          }}>
            🔒 Conexión cifrada · Acceso solo para personal autorizado
          </p>
        </form>
      </div>

      {/* Spinner keyframe inline */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
