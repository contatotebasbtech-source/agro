import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    throw new Error(
      "ENV missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (check Vercel env vars)"
    );
  }

  return createClient(url, service, {
    auth: { persistSession: false },
  });
}

const TABLE = "estoque_items";

// GET /api/estoque?q=&categoria=&low=1
export async function GET(req: Request) {
  try {
    const sb = supabaseAdmin();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const categoria = (searchParams.get("categoria") || "").trim();
    const low = searchParams.get("low") === "1";

    let query = sb.from(TABLE).select("*").order("created_at", { ascending: false });

    if (q) query = query.ilike("nome", `%${q}%`);
    if (categoria && categoria !== "Todas") query = query.eq("categoria", categoria);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const items = (data || []).map((it: any) => ({
      id: it.id,
      nome: it.nome ?? "",
      categoria: it.categoria ?? "",
      unidade: it.unidade ?? "",
      quantidade: Number(it.quantidade ?? 0),
      minimo: Number(it.minimo ?? 0),
      valorUnitario: Number(it.valor_unitario ?? 0),
      local: it.local ?? "",
      validade: it.validade ?? null,
      observacao: it.observacao ?? "",
      createdAt: it.created_at ?? null,
    }));

    const abaixoDoMinimo = items.filter((i) => i.quantidade < i.minimo);
    const totalValor = items.reduce((acc, i) => acc + i.quantidade * i.valorUnitario, 0);

    return NextResponse.json({
      items: low ? abaixoDoMinimo : items,
      meta: {
        total: items.length,
        abaixoDoMinimo: abaixoDoMinimo.length,
        totalValor,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "GET error" }, { status: 500 });
  }
}

// POST /api/estoque
export async function POST(req: Request) {
  try {
    const sb = supabaseAdmin();
    const body = await req.json();

    const payload = {
      nome: String(body.nome || "").trim(),
      categoria: String(body.categoria || "Insumos"),
      unidade: String(body.unidade || "kg"),
      quantidade: Number(body.quantidade || 0),
      minimo: Number(body.minimo || 0),
      valor_unitario: Number(body.valorUnitario || 0),
      local: String(body.local || ""),
      validade: body.validade ? String(body.validade) : null,
      observacao: String(body.observacao || ""),
    };

    if (!payload.nome) {
      return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
    }

    const { data, error } = await sb.from(TABLE).insert(payload).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "POST error" }, { status: 500 });
  }
}

// PATCH /api/estoque?id=UUID
export async function PATCH(req: Request) {
  try {
    const sb = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    const body = await req.json();

    const payload: any = {};
    if (body.nome !== undefined) payload.nome = String(body.nome || "").trim();
    if (body.categoria !== undefined) payload.categoria = String(body.categoria || "");
    if (body.unidade !== undefined) payload.unidade = String(body.unidade || "");
    if (body.quantidade !== undefined) payload.quantidade = Number(body.quantidade || 0);
    if (body.minimo !== undefined) payload.minimo = Number(body.minimo || 0);
    if (body.valorUnitario !== undefined) payload.valor_unitario = Number(body.valorUnitario || 0);
    if (body.local !== undefined) payload.local = String(body.local || "");
    if (body.validade !== undefined) payload.validade = body.validade ? String(body.validade) : null;
    if (body.observacao !== undefined) payload.observacao = String(body.observacao || "");

    const { data, error } = await sb.from(TABLE).update(payload).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ item: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "PATCH error" }, { status: 500 });
  }
}

// DELETE /api/estoque?id=UUID
export async function DELETE(req: Request) {
  try {
    const sb = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    const { error } = await sb.from(TABLE).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "DELETE error" }, { status: 500 });
  }
}
