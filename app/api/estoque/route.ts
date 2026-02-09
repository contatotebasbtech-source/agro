import { NextResponse } from "next/server";

export type EstoqueItem = {
  id: string;
  nome: string;
  categoria: string; // Ex: "Insumos", "Sementes", "Peças", "Produção", "Outros"
  local: string; // Ex: "Galpão", "Depósito", "Silo", "Campo"
  quantidade: number;
  unidade: string; // Ex: "kg", "L", "un", "sacos"
  minimo: number;
  valorUnit: number; // R$
  validade?: string; // ISO "YYYY-MM-DD" opcional
  obs?: string;
  criadoEm: string; // ISO
  atualizadoEm: string; // ISO
};

type DB = {
  items: EstoqueItem[];
  updatedAt: string; // ISO
};

function getDB(): DB {
  const g = globalThis as any;
  if (!g.__ESTOQUE_DB__) {
    g.__ESTOQUE_DB__ = {
      items: [],
      updatedAt: new Date().toISOString(),
    } satisfies DB;
  }
  return g.__ESTOQUE_DB__ as DB;
}

function touch(db: DB) {
  db.updatedAt = new Date().toISOString();
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export async function GET() {
  const db = getDB();
  return NextResponse.json(
    { items: db.items, updatedAt: db.updatedAt },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  const db = getDB();
  const body = await req.json().catch(() => null);

  if (!body?.nome) {
    return NextResponse.json({ error: "Campo 'nome' é obrigatório." }, { status: 400 });
  }

  const now = new Date().toISOString();

  const item: EstoqueItem = {
    id: uid(),
    nome: String(body.nome),
    categoria: String(body.categoria ?? "Insumos"),
    local: String(body.local ?? "Galpão"),
    quantidade: Number(body.quantidade ?? 0),
    unidade: String(body.unidade ?? "un"),
    minimo: Number(body.minimo ?? 0),
    valorUnit: Number(body.valorUnit ?? 0),
    validade: body.validade ? String(body.validade) : undefined,
    obs: body.obs ? String(body.obs) : undefined,
    criadoEm: now,
    atualizadoEm: now,
  };

  db.items.unshift(item);
  touch(db);

  return NextResponse.json({ ok: true, item, updatedAt: db.updatedAt }, { status: 201 });
}

export async function PUT(req: Request) {
  const db = getDB();
  const body = await req.json().catch(() => null);

  const id = body?.id ? String(body.id) : "";
  if (!id) return NextResponse.json({ error: "Informe 'id'." }, { status: 400 });

  const idx = db.items.findIndex((x) => x.id === id);
  if (idx === -1) return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });

  const now = new Date().toISOString();
  const old = db.items[idx];

  const updated: EstoqueItem = {
    ...old,
    nome: body.nome !== undefined ? String(body.nome) : old.nome,
    categoria: body.categoria !== undefined ? String(body.categoria) : old.categoria,
    local: body.local !== undefined ? String(body.local) : old.local,
    quantidade: body.quantidade !== undefined ? Number(body.quantidade) : old.quantidade,
    unidade: body.unidade !== undefined ? String(body.unidade) : old.unidade,
    minimo: body.minimo !== undefined ? Number(body.minimo) : old.minimo,
    valorUnit: body.valorUnit !== undefined ? Number(body.valorUnit) : old.valorUnit,
    validade: body.validade !== undefined ? (body.validade ? String(body.validade) : undefined) : old.validade,
    obs: body.obs !== undefined ? (body.obs ? String(body.obs) : undefined) : old.obs,
    atualizadoEm: now,
  };

  db.items[idx] = updated;
  touch(db);

  return NextResponse.json({ ok: true, item: updated, updatedAt: db.updatedAt }, { status: 200 });
}

export async function DELETE(req: Request) {
  const db = getDB();
  const body = await req.json().catch(() => null);

  const id = body?.id ? String(body.id) : "";
  if (!id) return NextResponse.json({ error: "Informe 'id'." }, { status: 400 });

  const before = db.items.length;
  db.items = db.items.filter((x) => x.id !== id);
  if (db.items.length === before) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }

  touch(db);
  return NextResponse.json({ ok: true, updatedAt: db.updatedAt }, { status: 200 });
}
