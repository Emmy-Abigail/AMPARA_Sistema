import { useState, useMemo } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { FiltrosBar } from '../components/FiltrosBar';
import { KpiCards } from '../components/KpiCards';
import { MapaVigilancia } from '../components/MapaVigilancia';
import { FeedAcciones } from '../components/FeedAcciones';
import { TendenciasChart } from '../components/TendenciasChart';
import { SOSBanner } from '../components/SOSBanner';
import { PersonalPage } from './PersonalPage';
import type { Filtros } from '../types';

type Page = 'dashboard' | 'personal';

export function DashboardPage() {
  const [filtros, setFiltros] = useState<Partial<Filtros>>({});
  const [page, setPage] = useState<Page>('dashboard');

  const subtitle = useMemo(() => {
    const s = new Date().toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F8F5FE]">
      <Sidebar activePage={page} onNavigate={setPage} />

      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-screen-2xl mx-auto">
          {page === 'personal' ? (
            <>
              <TopBar title="Gestión de Personal" subtitle="Administra operadores y administradores del sistema" />
              <PersonalPage />
            </>
          ) : (
            <>
              <TopBar
                title="Panel de Operaciones"
                subtitle={subtitle}
              />
              <SOSBanner />
              <FiltrosBar filtros={filtros} onChange={setFiltros} />
              <KpiCards filtros={filtros} />
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-4">
                <div className="xl:col-span-3">
                  <MapaVigilancia filtros={filtros} />
                </div>
                <div className="xl:col-span-2">
                  <FeedAcciones filtros={filtros} />
                </div>
              </div>
              <TendenciasChart filtros={filtros} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
