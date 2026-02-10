import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ENV missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

const TBL = "insumos";

const json = (data: any, status = 200) => NextResponse.json(data, { status });
const bad = (message: string, status = 400) => json({ error: message }, status);

export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const categoria = (searchParams.get("categoria") || "").trim();
    const low = searchParams.get("low") === "1";

    let query = supabase.from(TBL).select("*").order("created_at", { ascending: false });

    if (categoria && categoria !== "Todas") query = query.eq("categoria", categoria);

    if (q) {
      query = query.or(`nome.ilike.%${q}%,categoria.ilike.%${q}%,local.ilike.%${q}%,observacao.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) return bad(error.message, 500);

    let items = (data || []) as any[];

    if (low) items = items.filter((i) => Number(i.quantidade ?? 0) < Number(i.minimo ?? 0));

    return json({ items });
  } catch (e: any) {
    return bad(e?.message || "Erro no GET /api/insumos", 500);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const payload = {
      nome: String(body.nome || "").trim(),
      categoria: String(body.categoria || "Outros"),
      local: String(body.local || ""),
      unidade: String(body.unidade || "kg"),
      quantidade: body.quantidade === "" || body.quantidade == null ? 0 : Number(body.quantidade),
      minimo: body.minimo === "" || body.minimo == null ? 0 : Number(body.minimo),
      valor_unitario: body.valor_unitario === "" || body.valor_unitario == null ? 0 : Number(body.valor_unitario),
      validade: body.validade || null, // YYYY-MM-DD ou null
      observacao: body.observacao ?? "",
    };

    if (!payload.nome) return bad("Nome é obrigatório.");

    const { data, error } = await supabase.from(TBL).insert(payload).select("*").single();
    if (error) return bad(error.message, 500);

    return json({ item: data }, 201);
  } catch (e: any) {
    return bad(e?.message || "Erro no POST /api/insumos", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const id = String(body.id || "").trim();
    if (!id) return bad("ID é obrigatório.");

    const payload = {
      nome: String(body.nome || "").trim(),
      categoria: String(body.categoria || "Outros"),
      local: String(body.local || ""),
      unidade: String(body.unidade || "kg"),
      minimo: body.minimo === "" || body.minimo == null ? 0 : Number(body.minimo),
      valor_unitario: body.valor_unitario === "" || body.valor_unitario == null ? 0 : Number(body.valor_unitario),
      validade: body.validade || null,
      observacao: body.observacao ?? "",
      // quantidade NÃO edita direto aqui — muda via movimentações
    };

    if (!payload.nome) return bad("Nome é obrigatório.");

    const { data, error } = await supabase.from(TBL).update(payload).eq("id", id).select("*").single();
    if (error) return bad(error.message, 500);

    return json({ item: data });
  } catch (e: any) {
    return bad(e?.message || "Erro no PATCH /api/insumos", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();
    if (!id) return bad("ID é obrigatório.");

    const { error } = await supabase.from(TBL).delete().eq("id", id);
    if (error) return bad(error.message, 500);

    return json({ ok: true });
  } catch (e: any) {
    return bad(e?.message || "Erro no DELETE /api/insumos", 500);
  }
}
