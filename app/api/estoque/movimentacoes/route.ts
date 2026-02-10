import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("ENV missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, { auth: { persistSession: false } });
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

    const itemId = (searchParams.get("itemId") || "").trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 30), 1), 200);

    let query = supabase
      .from("estoque_movimentacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (itemId) query = query.eq("item_id", itemId);

    const { data, error } = await query;
    if (error) return err(error.message, 500);

    return json({ movimentacoes: data || [] });
  } catch (e: any) {
    return err(e?.message || "Erro no GET /api/estoque/movimentacoes", 500);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const itemId = String(body.itemId || "").trim();
    const tipo = String(body.tipo || "").trim(); // entrada|saida|ajuste
    const quantidade = body.quantidade === "" || body.quantidade == null ? null : Number(body.quantidade);
    const observacao = String(body.observacao || "");

    if (!itemId) return err("itemId é obrigatório.");
    if (!["entrada", "saida", "ajuste"].includes(tipo)) return err("tipo inválido (entrada|saida|ajuste).");
    if (quantidade == null || Number.isNaN(quantidade) || quantidade < 0) return err("quantidade inválida.");

    // chama a função transacional no Postgres
    const { data, error } = await supabase.rpc("estoque_add_movimentacao", {
      p_item_id: itemId,
      p_tipo: tipo,
      p_qtd: quantidade,
      p_observacao: observacao,
    });

    if (error) return err(error.message, 500);

    return json({ itemAtualizado: data });
  } catch (e: any) {
    return err(e?.message || "Erro no POST /api/estoque/movimentacoes", 500);
  }
}
