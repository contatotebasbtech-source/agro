
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
export default function LoginPage(){
 const r=useRouter()
 const [e,sE]=useState("")
 const [p,sP]=useState("")
 async function login(){
   const {error}=await supabase.auth.signInWithPassword({email:e,password:p})
   if(!error) r.push("/app/fazenda")
 }
 return (
 <div className="min-h-screen flex items-center justify-center bg-green-50">
  <div className="bg-white p-6 rounded-xl shadow w-80 space-y-3">
   <img src="/logoagro1.png" className="h-12 mx-auto"/>
   <input className="border p-2 w-full" placeholder="Email" onChange={x=>sE(x.target.value)}/>
   <input className="border p-2 w-full" type="password" placeholder="Senha" onChange={x=>sP(x.target.value)}/>
   <button onClick={login} className="bg-green-600 text-white p-2 w-full">Entrar</button>
  </div>
 </div>
 )
}
