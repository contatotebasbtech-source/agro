import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // sempre JSON
    throw new Error("ENV missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function err(message: string, status = 400) {
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
      .from("estoque_itens")
      .select("*")
      .order("created_at", { ascending: false });

    if (categoria && categoria !== "Todas") query = query.eq("categoria", categoria);

    if (q) {
      const safe = q.replace(/[%_]/g, "\\$&");
      query = query.or(
        `nome.ilike.%${safe}%,categoria.ilike.%${safe}%,local.ilike.%${safe}%,observacao.ilike.%${safe}%`
      );
    }

    const { data, error } = await query;
    if (error) return err(error.message, 500);

    let items = (data || []) as any[];

    if (low) {
      items = items.filter((i) => Number(i.quantidade ?? 0) < Number(i.minimo ?? 0));
    }

    return json({ items });
  } catch (e: any) {
    return err(e?.message || "Erro no GET /api/estoque", 500);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const payload = {
      nome: String(body.nome || "").trim(),
      categoria: String(body.categoria || "Peças"),
      unidade: String(body.unidade || "un"),
      quantidade: body.quantidade === "" || body.quantidade == null ? 0 : Number(body.quantidade),
      minimo: body.minimo === "" || body.minimo == null ? 0 : Number(body.minimo),
      valor_unitario:
        body.valorUnitario === "" || body.valorUnitario == null ? 0 : Number(body.valorUnitario),
      local: String(body.local || ""),
      validade: body.validade || null, // YYYY-MM-DD
      observacao: String(body.observacao || ""),
    };

    if (!payload.nome) return err("Nome do item é obrigatório.");

    const { data, error } = await supabase
      .from("estoque_itens")
      .insert(payload)
      .select("*")
      .single();

    if (error) return err(error.message, 500);

    return json({ item: data }, 201);
  } catch (e: any) {
    return err(e?.message || "Erro no POST /api/estoque", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const id = String(body.id || "").trim();
    if (!id) return err("ID é obrigatório.");

    const payload = {
      nome: String(body.nome || "").trim(),
      categoria: String(body.categoria || "Peças"),
      unidade: String(body.unidade || "un"),
      minimo: body.minimo === "" || body.minimo == null ? 0 : Number(body.minimo),
      valor_unitario:
        body.valorUnitario === "" || body.valorUnitario == null ? 0 : Number(body.valorUnitario),
      local: String(body.local || ""),
      validade: body.validade || null,
      observacao: String(body.observacao || ""),
      // quantidade NÃO é editada aqui — quantidade muda por movimentação
    };

    if (!payload.nome) return err("Nome do item é obrigatório.");

    const { data, error } = await supabase
      .from("estoque_itens")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return err(error.message, 500);

    return json({ item: data });
  } catch (e: any) {
    return err(e?.message || "Erro no PATCH /api/estoque", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();

    if (!id) return err("ID é obrigatório.");

    const { error } = await supabase.from("estoque_itens").delete().eq("id", id);
    if (error) return err(error.message, 500);

    return json({ ok: true });
  } catch (e: any) {
    return err(e?.message || "Erro no DELETE /api/estoque", 500);
  }
}
