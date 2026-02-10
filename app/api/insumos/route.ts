import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type InsumoRow = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  minimo: number;
  valor_unitario: number;
  local: string;
  validade: string | null; // YYYY-MM-DD
  observacao: string;
  created_at: string;
  updated_at: string;
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "ENV missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (configure in .env.local and Vercel env vars)."
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function bad(message: string, status = 400) {
  return json({ error: message }, status);
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const categoria = (searchParams.get("categoria") || "").trim();
    const low = searchParams.get("low") === "1";

    let query = supabase
      .from("insumos_itens")
      .select("*")
      .order("created_at", { ascending: false });

    if (categoria && categoria !== "Todas") query = query.eq("categoria", categoria);

    if (q) {
      query = query.or(
        `nome.ilike.%${q}%,categoria.ilike.%${q}%,local.ilike.%${q}%,observacao.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) return bad(error.message, 500);

    let items = ((data || []) as InsumoRow[]).map((i) => ({
      ...i,
      quantidade: Number(i.quantidade ?? 0),
      minimo: Number(i.minimo ?? 0),
      valor_unitario: Number(i.valor_unitario ?? 0),
    }));

    if (low) {
      items = items.filter((i) => (i.quantidade ?? 0) < (i.minimo ?? 0));
    }

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
      categoria: String(body.categoria || "Fertilizantes"),
      unidade: String(body.unidade || "kg"),
      quantidade: body.quantidade == null || body.quantidade === "" ? 0 : Number(body.quantidade),
      minimo: body.minimo == null || body.minimo === "" ? 0 : Number(body.minimo),
      valor_unitario:
        body.valorUnitario == null || body.valorUnitario === "" ? 0 : Number(body.valorUnitario),
      local: String(body.local || ""),
      validade: body.validade || null, // YYYY-MM-DD
      observacao: String(body.observacao || ""),
    };

    if (!payload.nome) return bad("Nome do insumo é obrigatório.");

    const { data, error } = await supabase
      .from("insumos_itens")
      .insert(payload)
      .select("*")
      .single();

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
      categoria: String(body.categoria || "Fertilizantes"),
      unidade: String(body.unidade || "kg"),
      quantidade: body.quantidade == null || body.quantidade === "" ? 0 : Number(body.quantidade),
      minimo: body.minimo == null || body.minimo === "" ? 0 : Number(body.minimo),
      valor_unitario:
        body.valorUnitario == null || body.valorUnitario === "" ? 0 : Number(body.valorUnitario),
      local: String(body.local || ""),
      validade: body.validade || null,
      observacao: String(body.observacao || ""),
    };

    if (!payload.nome) return bad("Nome do insumo é obrigatório.");

    const { data, error } = await supabase
      .from("insumos_itens")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

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

    const { error } = await supabase.from("insumos_itens").delete().eq("id", id);
    if (error) return bad(error.message, 500);

    return json({ ok: true });
  } catch (e: any) {
    return bad(e?.message || "Erro no DELETE /api/insumos", 500);
  }
}
