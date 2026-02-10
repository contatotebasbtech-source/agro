import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/* =========================
   Supabase
========================= */
function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error("Supabase env vars missing");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/* =========================
   GET — listar
========================= */
export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q");
    const categoria = searchParams.get("categoria");
    const low = searchParams.get("low") === "1";

    let query = supabase
      .from("estoque")
      .select("*")
      .order("created_at", { ascending: false });

    if (categoria && categoria !== "Todas") {
      query = query.eq("categoria", categoria);
    }

    if (q) {
      query = query.or(
        `nome.ilike.%${q}%,local.ilike.%${q}%,observacao.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    let items = data ?? [];

    if (low) {
      items = items.filter(
        (i) => (i.quantidade ?? 0) < (i.minimo ?? 0)
      );
    }

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}

/* =========================
   POST — criar
========================= */
export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    if (!body.nome) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("estoque")
      .insert({
        nome: body.nome,
        categoria: body.categoria ?? "Insumos",
        unidade: body.unidade ?? "kg",
        quantidade: Number(body.quantidade ?? 0),
        minimo: Number(body.minimo ?? 0),
        valor_unitario: Number(body.valorUnitario ?? 0),
        local: body.local ?? "",
        validade: body.validade || null,
        observacao: body.observacao ?? "",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}

/* =========================
   PATCH — editar
========================= */
export async function PATCH(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "ID obrigatório" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("estoque")
      .update({
        nome: body.nome,
        categoria: body.categoria,
        unidade: body.unidade,
        quantidade: Number(body.quantidade),
        minimo: Number(body.minimo),
        valor_unitario: Number(body.valorUnitario),
        local: body.local,
        validade: body.validade || null,
        observacao: body.observacao,
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE — excluir
========================= */
export async function DELETE(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID obrigatório" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("estoque")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
