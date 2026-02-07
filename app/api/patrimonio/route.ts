import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type AssetType = "Máquina" | "Veículo" | "Implemento" | "Imóvel" | "Outros";

type Asset = {
  id: string;
  nome: string;
  tipo: AssetType;
  valorAquisicao: number;
  dataAquisicao: string; // yyyy-mm-dd
  observacao?: string;
};

const DATA_PATH = path.join(process.cwd(), "data", "patrimonio.json");

function ensureDataFile() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ items: [] }, null, 2), "utf-8");
  }
}

function readData(): { items: Asset[] } {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

function writeData(items: Asset[]) {
  ensureDataFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify({ items }, null, 2), "utf-8");
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const tiposValidos: AssetType[] = ["Máquina", "Veículo", "Implemento", "Imóvel", "Outros"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const data = readData();
  const items = q
    ? data.items.filter((it) => {
        const hay = `${it.nome} ${it.tipo} ${it.observacao ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
    : data.items;

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const nome = String((body as any).nome ?? "").trim();
  const tipo = String((body as any).tipo ?? "") as AssetType;
  const valorAquisicao = Number((body as any).valorAquisicao);
  const dataAquisicao = String((body as any).dataAquisicao ?? "").trim();
  const observacaoRaw = (body as any).observacao;
  const observacao = observacaoRaw ? String(observacaoRaw).trim() : undefined;

  if (!nome) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
  if (!tiposValidos.includes(tipo)) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  if (!Number.isFinite(valorAquisicao) || valorAquisicao <= 0) {
    return NextResponse.json({ error: "Valor de aquisição inválido." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAquisicao)) {
    return NextResponse.json({ error: "Data inválida (use yyyy-mm-dd)." }, { status: 400 });
  }

  const data = readData();
  const newItem: Asset = {
    id: uid(),
    nome,
    tipo,
    valorAquisicao,
    dataAquisicao,
    observacao,
  };

  const items = [newItem, ...data.items];
  writeData(items);

  return NextResponse.json({ ok: true, item: newItem });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Informe ?id=" }, { status: 400 });

  const data = readData();
  const items = data.items.filter((x) => x.id !== id);
  writeData(items);

  return NextResponse.json({ ok: true });
}
