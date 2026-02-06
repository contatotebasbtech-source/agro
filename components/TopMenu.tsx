'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menu = ['geral','cafe','leite','gado','milho','peixe','soja','outros']

export default function TopMenu(){
  const p = usePathname()
  return (
    <div className="top-menu">
      {menu.map(m=>(
        <Link key={m} href={`/${m}`} className={p===`/${m}`?'menu-btn active':'menu-btn'}>
          {m.toUpperCase()}
        </Link>
      ))}
    </div>
  )
}
