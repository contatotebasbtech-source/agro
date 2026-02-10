'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menu = [
  { label: 'Geral', href: '/geral' },
  { label: 'Cafe', href: '/cafe' },
  { label: 'Leite', href: '/leite' },
  { label: 'Gado', href: '/gado' },
  { label: 'Milho', href: '/milho' },
  { label: 'Peixe', href: '/peixe' },
  { label: 'Soja', href: '/soja' },
  
{ label: "Estoque", href: "/estoque" },

  { label: "Patrimônio", href: "/patrimonio" },

  { label: 'Outros', href: '/outros' },

];


export default function TopMenu(){
  const pathname = usePathname();

  return (
    <div className="top-menu flex gap-2 overflow-x-auto whitespace-nowrap">

      {menu.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pathname === item.href ? 'menu-btn active' : 'menu-btn'}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
