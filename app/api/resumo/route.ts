import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ItemBase = {
  id: string;
  nome: string;
  categoria: string | null;
  unidade: string | null;
  quantidade: number | null;
  minimo: number | null;
  valor_unitario: number | null;
  local: string | null;
  validade: string | null; // YYYY-MM-DD
  updated_at?: string | null;
  created_at?: string | null;
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ENV missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

function daysUntil(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = d.getTime() - today.getTime();
  return Math.floor(diffMs / 86400000);
}

function classify(i: ItemBase, vencEmDias: number) {
  const qtd = Number(i.quantidade ?? 0);
  const min = Number(i.minimo ?? 0);
  const low = qtd < min;

  const d = daysUntil(i.validade);
  const expired = d != null && d < 0;
  const expSoon = d != null && d >= 0 && d <= vencEmDias;

  // severidade (para ordenar)
  // 3 = vencido, 2 = vencendo, 1 = abaixo minimo, 0 = ok
  const severity = expired ? 3 : expSoon ? 2 : low ? 1 : 0;

  return { low, expired, expSoon, daysToExpire: d, severity };
}

function mapRow(row: any) {
  return {
    ...row,
    quantidade: Number(row.quantidade ?? 0),
    minimo: Number(row.minimo ?? 0),
    valor_unitario: Number(row.valor_unitario ?? 0),
  } as ItemBase;
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);

    const vencEmDias = Math.min(Math.max(Number(searchParams.get("venc") || 30), 1), 365); // default 30
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 10), 300);

    // Busca “leve”: pega itens mais recentes, e a gente classifica no servidor
    // (Se o seu volume crescer muito, depois a gente cria uma VIEW ou RPC no banco.)
    const [estoqueRes, insumosRes] = await Promise.all([
      supabase.from("estoque_itens").select("*").order("updated_at", { ascending: false }).limit(limit),
      supabase.from("insumos_itens").select("*").order("updated_at", { ascending: false }).limit(limit),
    ]);

    if (estoqueRes.error) return err(estoqueRes.error.message, 500);
    if (insumosRes.error) return err(insumosRes.error.message, 500);

    const estoque = (estoqueRes.data || []).map(mapRow).map((it) => {
      const c = classify(it, vencEmDias);
      return { ...it, modulo: "Estoque", ...c };
    });

    const insumos = (insumosRes.data || []).map(mapRow).map((it) => {
      const c = classify(it, vencEmDias);
      return { ...it, modulo: "Insumos", ...c };
    });

    const all = [...estoque, ...insumos];

    const total = all.length;
    const lowCount = all.filter((i) => i.low).length;
    const expSoonCount = all.filter((i) => i.expSoon).length;
    const expiredCount = all.filter((i) => i.expired).length;

    const valorTotal = all.reduce((acc, i) => acc + Number(i.quantidade ?? 0) * Number(i.valor_unitario ?? 0), 0);

    // urgentes: vencido > vencendo > abaixo minimo; e por dias para vencer
    const urgentes = all
      .filter((i) => i.severity > 0)
      .sort((a, b) => {
        if (b.severity !== a.severity) return b.severity - a.severity;
        const da = a.daysToExpire ?? 999999;
        const db = b.daysToExpire ?? 999999;
        return da - db;
      })
      .slice(0, 50);

    return json({
      meta: {
        vencEmDias,
        limit,
        total,
        lowCount,
        expSoonCount,
        expiredCount,
        valorTotal,
      },
      urgentes,
    });
  } catch (e: any) {
    return err(e?.message || "Erro no GET /api/resumo", 500);
  }
}
