
"use client"
import Link from "next/link"
export default function Layout({children}:{children:React.ReactNode}){
 return(
 <div className="flex h-screen">
  <aside className="w-60 bg-green-100 p-4 space-y-2">
   <img src="/logoagro1.png" className="h-10"/>
   <Nav href="/app/fazenda" label="Fazenda"/>
   <Nav href="/app/financeiro" label="Financeiro"/>
   <Nav href="/app/estoque" label="Insumos"/>
   <Nav href="/app/estatisticas" label="Estatísticas"/>
  </aside>
  <div className="flex-1 flex flex-col">
   <header className="h-14 bg-white border-b flex items-center justify-between px-4">
    
    <span>Conta</span>
   </header>
   <main className="flex-1 bg-green-50 p-6">{children}</main>
  </div>
 </div>
 )
}
function Nav({href,label}:{href:string,label:string}){
 return <Link href={href} className="block bg-white p-2 rounded">{label}</Link>
}
