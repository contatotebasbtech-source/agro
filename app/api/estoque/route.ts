import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type EstoqueRow = {
  id: string;
  nome: string;
  categoria: string | null;
  unidade: string | null;
  quantidade: number | null;
  minimo: number | null;
  valor_unitario: number | null;
  local: string | null;
  validade: string | null; // date
  observacao: string | null;
  created_at: string;
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variáveis do Supabase ausentes. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (Vercel -> Settings -> Environment Variables)."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
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
      .from("estoque_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (categoria && categoria !== "Todas") query = query.eq("categoria", categoria);

    if (q) {
      // busca em campos principais
      // ilike funciona bem em texto
      query = query.or(
        `nome.ilike.%${q}%,categoria.ilike.%${q}%,local.ilike.%${q}%,observacao.ilike.%${q}%`
      );
    }

    const { data, error } = await query;

    if (error) return bad(error.message, 500);

    let items = (data || []) as EstoqueRow[];

    // filtro "abaixo do mínimo" no servidor (porque pode ter null)
    if (low) {
      items = items.filter((i) => (i.quantidade ?? 0) < (i.minimo ?? 0));
    }

    return json({ items });
  } catch (e: any) {
    return bad(e?.message || "Erro no GET /api/estoque", 500);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const payload = {
      nome: String(body.nome || "").trim(),
      categoria: body.categoria ?? "Insumos",
      unidade: body.unidade ?? "kg",
      quantidade: body.quantidade === "" || body.quantidade == null ? 0 : Number(body.quantidade),
      minimo: body.minimo === "" || body.minimo == null ? 0 : Number(body.minimo),
      valor_unitario:
        body.valorUnitario === "" || body.valorUnitario == null ? 0 : Number(body.valorUnitario),
      local: body.local ?? "",
      validade: body.validade || null, // "YYYY-MM-DD" ou null
      observacao: body.observacao ?? "",
    };

    if (!payload.nome) return bad("Nome do item é obrigatório.");

    const { data, error } = await supabase
      .from("estoque_itens")
      .insert(payload)
      .select("*")
      .single();

    if (error) return bad(error.message, 500);

    return json({ item: data }, 201);
  } catch (e: any) {
    return bad(e?.message || "Erro no POST /api/estoque", 500);
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
      categoria: body.categoria ?? "Insumos",
      unidade: body.unidade ?? "kg",
      quantidade: body.quantidade === "" || body.quantidade == null ? 0 : Number(body.quantidade),
      minimo: body.minimo === "" || body.minimo == null ? 0 : Number(body.minimo),
      valor_unitario:
        body.valorUnitario === "" || body.valorUnitario == null ? 0 : Number(body.valorUnitario),
      local: body.local ?? "",
      validade: body.validade || null,
      observacao: body.observacao ?? "",
    };

    if (!payload.nome) return bad("Nome do item é obrigatório.");

    const { data, error } = await supabase
      .from("estoque_itens")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return bad(error.message, 500);

    return json({ item: data });
  } catch (e: any) {
    return bad(e?.message || "Erro no PATCH /api/estoque", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();

    if (!id) return bad("ID é obrigatório.");

    const { error } = await supabase.from("estoque_items").delete().eq("id", id);
    if (error) return bad(error.message, 500);

    return json({ ok: true });
  } catch (e: any) {
    return bad(e?.message || "Erro no DELETE /api/estoque", 500);
  }
}
