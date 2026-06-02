import { LayoutDashboard, Users, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/auth';

interface SidebarProps {
  activePage: 'dashboard' | 'personal';
  onNavigate: (page: 'dashboard' | 'personal') => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.rol === 'admin';

  return (
    <aside className="w-64 min-h-screen bg-[#0a4535] flex flex-col shadow-xl flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0F6E56] flex items-center justify-center shadow">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <div>
            <p className="text-white font-black text-base leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              SIVAPRE
            </p>
            <p className="text-white/50 text-xs mt-0.5">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavItem
          icon={<LayoutDashboard size={18} />}
          label="Vigilancia"
          active={activePage === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
        />
        {isAdmin && (
          <NavItem
            icon={<Users size={18} />}
            label="Gestión de Personal"
            active={activePage === 'personal'}
            onClick={() => onNavigate('personal')}
          />
        )}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-[#0F6E56] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">
              {user?.nombre?.charAt(0).toUpperCase() ?? 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.nombre ?? 'Admin'}</p>
            <p className="text-white/40 text-xs truncate capitalize">{user?.rol ?? 'inspector'}</p>
          </div>
          <button
            onClick={logout}
            className="text-white/40 hover:text-white transition-colors p-1 rounded"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon, label, active, onClick,
}: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        active
          ? 'bg-[#0F6E56] text-white font-semibold shadow'
          : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {active && <ChevronRight size={14} className="opacity-60" />}
    </button>
  );
}
