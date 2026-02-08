import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

/** Tipos (você pode ajustar os nomes depois) */
const CATEGORIAS = [
  "Insumos",
  "Sementes",
  "Fertilizantes",
  "Defensivos",
  "Ração",
  "Peças",
  "Combustível",
  "Produção",
  "Outros",
] as const;

const UNIDADES = ["kg", "g", "L", "mL", "sc", "un", "cx", "ton"] as const;

type EstoqueCategoria = (typeof CATEGORIAS)[number];
type EstoqueUnidade = (typeof UNIDADES)[number];

export type EstoqueItem = {
  id: string;

  nome: string;
  categoria: EstoqueCategoria;
  unidade: EstoqueUnidade;

  quantidade?: number;
  minimo?: number;
  valorUnitario?: number;

  local?: string;
  validade?: string; // yyyy-mm-dd
  observacao?: string;

  createdAt: string;
  updatedAt: string;
};

type Store = { items: EstoqueItem[] };

function nowISO() {
  return new Date().toISOString();
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function safeStr(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function safeOptionalStr(v: unknown): string | undefined {
  const s = String(v ?? "").trim();
  return s.length ? s : undefined;
}

function safeNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function isCategoria(v: unknown): v is EstoqueCategoria {
  return CATEGORIAS.includes(v as any);
}

function isUnidade(v: unknown): v is EstoqueUnidade {
  return UNIDADES.includes(v as any);
}

/** Persistência em arquivo JSON (mock) */
function storePath() {
  return path.join(process.cwd(), "data", "estoque.json");
}

async function ensureStoreFile(): Promise<void> {
  const file = storePath();
  const dir = path.dirname(file);

  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(file);
  } catch {
    const initial: Store = { items: [] };
    await fs.writeFile(file, JSON.stringify(initial, null, 2), "utf-8");
  }
}

async function readStore(): Promise<Store> {
  await ensureStoreFile();
  const raw = await fs.readFile(storePath(), "utf-8");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { items: [] };
    if (!Array.isArray(parsed.items)) return { items: [] };
    return { items: parsed.items as EstoqueItem[] };
  } catch {
    return { items: [] };
  }
}

async function writeStore(store: Store): Promise<void> {
  await ensureStoreFile();
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

/** Helpers de listagem */
function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function applyFilters(items: EstoqueItem[], params: URLSearchParams) {
  const categoria = params.get("categoria");
  const q = params.get("q");
  const min = params.get("min");
  const low = params.get("low"); // itens abaixo do mínimo (1/true)

  let out = [...items];

  if (categoria && isCategoria(categoria)) {
    out = out.filter((x) => x.categoria === categoria);
  }

  if (q && q.trim()) {
    const nq = normalize(q.trim());
    out = out.filter((x) => normalize(x.nome).includes(nq));
  }

  if (min) {
    // min=1/true -> só itens com minimo definido
    const on = min === "1" || min.toLowerCase() === "true";
    if (on) out = out.filter((x) => typeof x.minimo === "number");
  }

  if (low) {
    // low=1/true -> só itens em alerta (quantidade <= minimo)
    const on = low === "1" || low.toLowerCase() === "true";
    if (on) {
      out = out.filter((x) => {
        if (typeof x.minimo !== "number") return false;
        const qnt = typeof x.quantidade === "number" ? x.quantidade : 0;
        return qnt <= x.minimo;
      });
    }
  }

  // Ordena por updatedAt desc
  out.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return out;
}

function computeStats(items: EstoqueItem[]) {
  const totalItens = items.length;
  const totalQuantidade = items.reduce((acc, x) => acc + (x.quantidade ?? 0), 0);
  const totalValor = items.reduce((acc, x) => acc + (x.quantidade ?? 0) * (x.valorUnitario ?? 0), 0);

  const abaixoMinimo = items.filter((x) => {
    if (typeof x.minimo !== "number") return false;
    const qnt = typeof x.quantidade === "number" ? x.quantidade : 0;
    return qnt <= x.minimo;
  }).length;

  const porCategoria = CATEGORIAS.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = items.filter((x) => x.categoria === cat).length;
    return acc;
  }, {});

  return {
    totalItens,
    totalQuantidade,
    totalValor,
    abaixoMinimo,
    porCategoria,
  };
}

/** =========================
 *  GET /api/estoque
 *  - /api/estoque?categoria=Insumos&q=ureia&low=1
 *  - /api/estoque?stats=1
 *  ========================= */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    const store = await readStore();
    const filtered = applyFilters(store.items, params);

    // stats=1 -> retorna métricas
    const stats = params.get("stats");
    if (stats === "1" || stats?.toLowerCase() === "true") {
      return NextResponse.json({ items: filtered, totals: computeStats(filtered) });
    }

    return NextResponse.json({ items: filtered });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

/** =========================
 *  POST /api/estoque
 *  body: {nome, categoria, unidade, quantidade, minimo, valorUnitario, local, validade, observacao}
 *  ========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nome = safeStr(body?.nome);
    if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

    const categoriaRaw = body?.categoria ?? "Insumos";
    if (!isCategoria(categoriaRaw)) {
      return NextResponse.json(
        { error: `Categoria inválida. Use: ${CATEGORIAS.join(", ")}` },
        { status: 400 }
      );
    }

    const unidadeRaw = body?.unidade ?? "kg";
    if (!isUnidade(unidadeRaw)) {
      return NextResponse.json(
        { error: `Unidade inválida. Use: ${UNIDADES.join(", ")}` },
        { status: 400 }
      );
    }

    const quantidade = safeNumber(body?.quantidade);
    const minimo = safeNumber(body?.minimo);
    const valorUnitario = safeNumber(body?.valorUnitario);

    if (quantidade !== undefined && quantidade < 0) {
      return NextResponse.json({ error: "Quantidade não pode ser negativa" }, { status: 400 });
    }
    if (minimo !== undefined && minimo < 0) {
      return NextResponse.json({ error: "Mínimo não pode ser negativo" }, { status: 400 });
    }
    if (valorUnitario !== undefined && valorUnitario < 0) {
      return NextResponse.json({ error: "Valor unitário não pode ser negativo" }, { status: 400 });
    }

    const item: EstoqueItem = {
      id: uid(),
      nome,
      categoria: categoriaRaw,
      unidade: unidadeRaw,

      quantidade,
      minimo,
      valorUnitario,

      local: safeOptionalStr(body?.local),
      validade: safeOptionalStr(body?.validade),
      observacao: safeOptionalStr(body?.observacao),

      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    const store = await readStore();
    store.items.unshift(item);
    await writeStore(store);

    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Falha ao criar item" }, { status: 500 });
  }
}

/** =========================
 *  PUT /api/estoque?id=xxx
 *  body parcial
 *  ========================= */
export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    const body = await req.json();
    const store = await readStore();

    const idx = store.items.findIndex((x) => x.id === id);
    if (idx === -1) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

    const current = store.items[idx];

    const nome = body?.nome !== undefined ? safeStr(body.nome) : current.nome;
    if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

    const categoria =
      body?.categoria !== undefined ? (body.categoria as unknown) : current.categoria;
    if (body?.categoria !== undefined && !isCategoria(categoria)) {
      return NextResponse.json(
        { error: `Categoria inválida. Use: ${CATEGORIAS.join(", ")}` },
        { status: 400 }
      );
    }

    const unidade = body?.unidade !== undefined ? (body.unidade as unknown) : current.unidade;
    if (body?.unidade !== undefined && !isUnidade(unidade)) {
      return NextResponse.json(
        { error: `Unidade inválida. Use: ${UNIDADES.join(", ")}` },
        { status: 400 }
      );
    }

    const quantidade =
      body?.quantidade === undefined ? current.quantidade : safeNumber(body.quantidade);
    const minimo = body?.minimo === undefined ? current.minimo : safeNumber(body.minimo);
    const valorUnitario =
      body?.valorUnitario === undefined ? current.valorUnitario : safeNumber(body.valorUnitario);

    if (quantidade !== undefined && quantidade < 0) {
      return NextResponse.json({ error: "Quantidade não pode ser negativa" }, { status: 400 });
    }
    if (minimo !== undefined && minimo < 0) {
      return NextResponse.json({ error: "Mínimo não pode ser negativo" }, { status: 400 });
    }
    if (valorUnitario !== undefined && valorUnitario < 0) {
      return NextResponse.json({ error: "Valor unitário não pode ser negativo" }, { status: 400 });
    }

    const updated: EstoqueItem = {
      ...current,
      nome,
      categoria: categoria as EstoqueCategoria,
      unidade: unidade as EstoqueUnidade,
      quantidade,
      minimo,
      valorUnitario,
      local: body?.local === undefined ? current.local : safeOptionalStr(body.local),
      validade: body?.validade === undefined ? current.validade : safeOptionalStr(body.validade),
      observacao:
        body?.observacao === undefined ? current.observacao : safeOptionalStr(body.observacao),
      updatedAt: nowISO(),
    };

    store.items[idx] = updated;
    await writeStore(store);

    return NextResponse.json({ item: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar item" }, { status: 500 });
  }
}

/** =========================
 *  DELETE /api/estoque?id=xxx
 *  ========================= */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    const store = await readStore();
    const before = store.items.length;
    store.items = store.items.filter((x) => x.id !== id);

    if (store.items.length === before) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }

    await writeStore(store);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Falha ao excluir item" }, { status: 500 });
  }
}
