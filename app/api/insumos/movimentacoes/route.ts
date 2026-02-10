import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ENV missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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
    const itemId = (searchParams.get("itemId") || "").trim();

    let query = supabase
      .from("insumos_movimentacoes")
      .select("*")
      .order("data", { ascending: false });

    if (itemId) query = query.eq("item_id", itemId);

    const { data, error } = await query;
    if (error) return bad(error.message, 500);

    return json({ items: data || [] });
  } catch (e: any) {
    return bad(e?.message || "Erro no GET /api/insumos/movimentacoes", 500);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const itemId = String(body.itemId || "").trim();
    const tipo = String(body.tipo || "").trim(); // entrada|saida|ajuste
    const quantidade = Number(body.quantidade ?? 0);
    const custoUnitario = Number(body.custoUnitario ?? 0);
    const motivo = String(body.motivo || "");

    if (!itemId) return bad("itemId é obrigatório.");
    if (!["entrada", "saida", "ajuste"].includes(tipo)) return bad("tipo inválido.");
    if (!Number.isFinite(quantidade) || quantidade <= 0) return bad("quantidade inválida.");

    // 1) grava movimentação
    const { data: mov, error: movErr } = await supabase
      .from("insumos_movimentacoes")
      .insert({
        item_id: itemId,
        tipo,
        quantidade,
        custo_unitario: custoUnitario,
        motivo,
      })
      .select("*")
      .single();

    if (movErr) return bad(movErr.message, 500);

    // 2) atualiza saldo do item
    const { data: item, error: itemErr } = await supabase
      .from("insumos_itens")
      .select("quantidade")
      .eq("id", itemId)
      .single();

    if (itemErr) return bad(itemErr.message, 500);

    const atual = Number(item?.quantidade ?? 0);
    const novo =
      tipo === "entrada" ? atual + quantidade : tipo === "saida" ? atual - quantidade : quantidade; // ajuste = define

    const { error: updErr } = await supabase
      .from("insumos_itens")
      .update({ quantidade: novo })
      .eq("id", itemId);

    if (updErr) return bad(updErr.message, 500);

    return json({ ok: true, movimentacao: mov, novoSaldo: novo }, 201);
  } catch (e: any) {
    return bad(e?.message || "Erro no POST /api/insumos/movimentacoes", 500);
  }
}
