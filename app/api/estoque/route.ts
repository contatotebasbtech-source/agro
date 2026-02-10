import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type EstoqueRow = {
  id: string;
  nome: string;
  categoria: string;
  local: string | null;
  unidade: string;
  quantidade: number;
  minimo: number;
  valor_unitario: number;
  validade: string | null; // YYYY-MM-DD
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("ENV missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

const TABLE = "estoque_itens";

function ok(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const sb = supabaseAdmin();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const categoria = (searchParams.get("categoria") || "").trim(); // "Todas" ou uma categoria
    const low = searchParams.get("low") === "1";

    let query = sb.from(TABLE).select("*").order("created_at", { ascending: false });

    if (categoria && categoria !== "Todas") query = query.eq("categoria", categoria);

    if (q) {
      // busca textual em campos
      query = query.or(
        `nome.ilike.%${q}%,categoria.ilike.%${q}%,local.ilike.%${q}%,observacao.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) return fail(error.message, 500);

    let items = (data || []) as EstoqueRow[];

    if (low) {
      items = items.filter((i) => (i.quantidade ?? 0) < (i.minimo ?? 0));
    }

    return ok({ items });
  } catch (e: any) {
    return fail(e?.message || "Erro no GET /api/estoque", 500);
  }
}

export async function POST(req: Request) {
  try {
    const sb = supabaseAdmin();
    const body = await req.json();

    const payload = {
      nome: String(body.nome || "").trim(),
      categoria: String(body.categoria || "Produção"),
      local: String(body.local || "").trim() || null,
      unidade: String(body.unidade || "kg"),
      quantidade: Number(body.quantidade ?? 0) || 0,
      minimo: Number(body.minimo ?? 0) || 0,
      valor_unitario: Number(body.valor_unitario ?? body.valorUnitario ?? 0) || 0,
      validade: body.validade ? String(body.validade) : null,
      observacao: String(body.observacao || "").trim() || null,
    };

    if (!payload.nome) return fail("Nome do item é obrigatório.");

    const { data, error } = await sb.from(TABLE).insert(payload).select("*").single();
    if (error) return fail(error.message, 500);

    return ok({ item: data }, 201);
  } catch (e: any) {
    return fail(e?.message || "Erro no POST /api/estoque", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const sb = supabaseAdmin();
    const body = await req.json();

    const id = String(body.id || "").trim();
    if (!id) return fail("ID é obrigatório.");

    const payload = {
      nome: String(body.nome || "").trim(),
      categoria: String(body.categoria || "Produção"),
      local: String(body.local || "").trim() || null,
      unidade: String(body.unidade || "kg"),
      quantidade: Number(body.quantidade ?? 0) || 0,
      minimo: Number(body.minimo ?? 0) || 0,
      valor_unitario: Number(body.valor_unitario ?? body.valorUnitario ?? 0) || 0,
      validade: body.validade ? String(body.validade) : null,
      observacao: String(body.observacao || "").trim() || null,
    };

    if (!payload.nome) return fail("Nome do item é obrigatório.");

    const { data, error } = await sb
      .from(TABLE)
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return fail(error.message, 500);

    return ok({ item: data });
  } catch (e: any) {
    return fail(e?.message || "Erro no PATCH /api/estoque", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const sb = supabaseAdmin();
    const { searchParams } = new URL(req.url);

    const id = String(searchParams.get("id") || "").trim();
    if (!id) return fail("ID é obrigatório.");

    const { error } = await sb.from(TABLE).delete().eq("id", id);
    if (error) return fail(error.message, 500);

    return ok({ ok: true });
  } catch (e: any) {
    return fail(e?.message || "Erro no DELETE /api/estoque", 500);
  }
}
