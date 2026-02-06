import TopMenu from '@/components/TopMenu'
import SideFarmPanel from '@/components/SideFarmPanel'
import SectionHeader from '@/components/SectionHeader'
import StatCards from '@/components/StatCards'
import TodoAlerts from '@/components/TodoAlerts'
import { sections } from '@/lib/data'

export default function Page(){
  const s = sections.Soja
  return (
    <main className="app-shell">
      <header className="app-header"><TopMenu/></header>
      <div className="app-body">
        <SideFarmPanel/>
        <section className="dash-section">
          <SectionHeader title="Soja" subtitle={s.subtitle}/>
          <StatCards cards={s.cards}/>
          <TodoAlerts todos={s.todos} alerts={s.alerts}/>
        </section>
      </div>
    </main>
  )
}
