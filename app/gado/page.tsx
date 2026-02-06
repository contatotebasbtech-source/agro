import TopMenu from '@/components/TopMenu';
import SideFarmPanel from '@/components/SideFarmPanel';
import SectionHeader from '@/components/SectionHeader';
import StatCards from '@/components/StatCards';
import TodoAlerts from '@/components/TodoAlerts';
import { sections } from '@/lib/data';

export default function GadoPage() {
  const section = sections.Gado;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="logo-area">
          <img src="/logoagro1.png" alt="Logo Agro" />
          <span className="brand">Tebas Tech Agro</span>
        </div>
        <TopMenu />
      </header>

      <div className="app-body">
        <SideFarmPanel />
        <section className="dash-section">
          <SectionHeader title="Gado" subtitle={section.subtitle} />
          <StatCards cards={section.cards} />
          <TodoAlerts todos={section.todos} alerts={section.alerts} />
        </section>
      </div>
    </main>
  );
}
