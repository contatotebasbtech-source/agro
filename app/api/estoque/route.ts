import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Variáveis do Vercel (server-side)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function supabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    // Isso aparece nos Logs do Vercel se as env vars não estiverem chegando
    throw new Error(
      "Env vars ausentes: verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Vercel e faça Redeploy."
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// GET /api/estoque?q=...&categoria=...&low=1
export async function GET(req: Request) {
  try {
    const sb = supabaseAdmin();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const categoria = (searchParams.get("categoria") || "").trim();
    const low = searchParams.get("low") === "1";

    let query = sb
      .from("estoque_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (q) query = query.ilike("nome", `%${q}%`);
    if (categoria && categoria !== "Todas") query = query.eq("categoria", categoria);

    const { data, error } = await query;
    if (error) throw error;

    const items = (data || []).map((it) => ({
      ...it,
      // garante números coerentes
      quantidade: num(it.quantidade),
      minimo: num(it.minimo),
      valor_unitario: num(it.valor_unitario),
    }));

    const filtered = low ? items.filter((i) => i.quantidade < i.minimo) : items;

    return NextResponse.json({ items: filtered });
  } catch (e: any) {
    console.error("GET /api/estoque error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao buscar estoque" },
      { status: 500 }
    );
  }
}

// POST /api/estoque  body: { nome, categoria, local?, unidade, quantidade, minimo, valor_unitario, validade?, observacao? }
export async function POST(req: Request) {
  try {
    const sb = supabaseAdmin();
    const body = await req.json();

    const payload = {
      nome: String(body.nome || "").trim(),
      categoria: String(body.categoria || "").trim(),
      local: body.local ? String(body.local).trim() : null,
      unidade: String(body.unidade || "un").trim(),
      quantidade: num(body.quantidade, 0),
      minimo: num(body.minimo, 0),
      valor_unitario: num(body.valor_unitario, 0),
      validade: body.validade ? String(body.validade).slice(0, 10) : null, // "YYYY-MM-DD"
      observacao: body.observacao ? String(body.observacao).trim() : null,
      updated_at: new Date().toISOString(),
    };

    if (!payload.nome) throw new Error("Nome do item é obrigatório.");
    if (!payload.categoria) throw new Error("Categoria é obrigatória.");

    const { data, error } = await sb
      .from("estoque_items")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/estoque error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao salvar item" },
      { status: 500 }
    );
  }
}

// PUT /api/estoque?id=UUID  body: campos para atualizar
export async function PUT(req: Request) {
  try {
    const sb = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) throw new Error("Informe o id na query (?id=...).");

    const body = await req.json();

    const patch: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.nome !== undefined) patch.nome = String(body.nome || "").trim();
    if (body.categoria !== undefined) patch.categoria = String(body.categoria || "").trim();
    if (body.local !== undefined) patch.local = body.local ? String(body.local).trim() : null;
    if (body.unidade !== undefined) patch.unidade = String(body.unidade || "un").trim();

    if (body.quantidade !== undefined) patch.quantidade = num(body.quantidade, 0);
    if (body.minimo !== undefined) patch.minimo = num(body.minimo, 0);
    if (body.valor_unitario !== undefined) patch.valor_unitario = num(body.valor_unitario, 0);

    if (body.validade !== undefined) {
      patch.validade = body.validade ? String(body.validade).slice(0, 10) : null;
    }
    if (body.observacao !== undefined) {
      patch.observacao = body.observacao ? String(body.observacao).trim() : null;
    }

    const { data, error } = await sb
      .from("estoque_items")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (e: any) {
    console.error("PUT /api/estoque error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao editar item" },
      { status: 500 }
    );
  }
}

// DELETE /api/estoque?id=UUID
export async function DELETE(req: Request) {
  try {
    const sb = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) throw new Error("Informe o id na query (?id=...).");

    const { error } = await sb.from("estoque_items").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/estoque error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao excluir item" },
      { status: 500 }
    );
  }
}
