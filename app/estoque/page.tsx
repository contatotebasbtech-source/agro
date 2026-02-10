"use client";

import { useEffect, useMemo, useState } from "react";

type EstoqueItem = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  minimo: number;
  valor_unitario: number;
  local: string;
  validade: string | null; // date
  observacao: string;
  created_at: string;
};

const CATEGORIAS = [
  "Todas",
  "Produção",
  "Peças",
  "Sementes",
  "Defensivos",
  "Fertilizantes",
  "Outros",
] as const;

function money(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toDateInput(v: string | null | undefined) {
  if (!v) return "";
  // se vier "2026-02-09T..." corta
  if (typeof v === "string" && v.length >= 10) return v.slice(0, 10);
  return "";
}

export default function EstoquePage() {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Todas");
  const [lowOnly, setLowOnly] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");

  const [form, setForm] = useState({
    id: "",
    nome: "",
    categoria: "Produção",
    unidade: "kg",
    quantidade: "",
    minimo: "",
    valorUnitario: "",
    local: "",
    validade: "",
    observacao: "",
  });

  // evita hydration mismatch: só calcula depois de carregar
  const [updatedAt, setUpdatedAt] = useState<string>("—");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (busca.trim()) params.set("q", busca.trim());
      if (categoria && categoria !== "Todas") params.set("categoria", categoria);
      if (lowOnly) params.set("low", "1");

      const res = await fetch(`/api/estoque?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        alert(json?.error || "Falha ao carregar");
        return;
      }

      // Se existir algo antigo com categoria "Insumos", jogamos para "Outros" (já que você quer separado)
      const normalized = (json.items || []).map((it: any) => ({
        ...it,
        categoria: it.categoria === "Insumos" ? "Outros" : it.categoria,
      }));

      setItems(normalized);
      setUpdatedAt(new Date().toLocaleString("pt-BR"));
    } catch (e: any) {
      console.error(e);
      alert("Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setMode("create");
    setForm({
      id: "",
      nome: "",
      categoria: "Produção",
      unidade: "kg",
      quantidade: "",
      minimo: "",
      valorUnitario: "",
      local: "",
      validade: "",
      observacao: "",
    });
    setShowModal(true);
  }

  function openEdit(it: EstoqueItem) {
    setMode("edit");
    setForm({
      id: it.id,
      nome: it.nome ?? "",
      categoria: (it.categoria === "Insumos" ? "Outros" : it.categoria) || "Produção",
      unidade: it.unidade || "kg",
      quantidade: String(it.quantidade ?? 0),
      minimo: String(it.minimo ?? 0),
      valorUnitario: String(it.valor_unitario ?? 0),
      local: it.local ?? "",
      validade: toDateInput(it.validade),
      observacao: it.observacao ?? "",
    });
    setShowModal(true);
  }

  async function save() {
    try {
      const payload = {
        id: form.id,
        nome: form.nome.trim(),
        categoria: form.categoria,
        unidade: form.unidade,
        quantidade: form.quantidade,
        minimo: form.minimo,
        valorUnitario: form.valorUnitario,
        local: form.local,
        validade: form.validade || null,
        observacao: form.observacao,
      };

      if (!payload.nome) {
        alert("Nome é obrigatório.");
        return;
      }

      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch("/api/estoque", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error(json);
        alert(json?.error || "Falha ao salvar");
        return;
      }

      setShowModal(false);
      await load();
    } catch (e: any) {
      console.error(e);
      alert("Falha ao salvar");
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este item?")) return;

    try {
      const res = await fetch(`/api/estoque?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        console.error(json);
        alert(json?.error || "Falha ao excluir");
        return;
      }

      await load();
    } catch (e: any) {
      console.error(e);
      alert("Falha ao excluir");
    }
  }

  const stats = useMemo(() => {
    const total = items.length;
    const valor = items.reduce((acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0), 0);
    const low = items.filter((it) => (Number(it.quantidade) || 0) < (Number(it.minimo) || 0)).length;
    return { total, valor, low };
  }, [items]);

  return (
    <div className="page-wrapper">
      <main className="shell">
        <div className="header">
          <div>
            <div className="title">Estoque</div>
            <div className="subtitle">Produção / Peças / Sementes / Defensivos / Fertilizantes / Outros</div>
          </div>

          <div className="header-actions">
            <button className="btn" onClick={load} disabled={loading}>
              Recarregar
            </button>
            <button className="btn primary" onClick={openCreate}>
              + Adicionar
            </button>
          </div>
        </div>

        <div className="grid3">
          <div className="card">
            <div className="metricLabel">Itens</div>
            <div className="metricValue">{stats.total}</div>
            <div className="hint">Total com filtros</div>
          </div>
          <div className="card">
            <div className="metricLabel">Valor estimado</div>
            <div className="metricValue">{money(stats.valor)}</div>
            <div className="hint">qtd × valor unit.</div>
          </div>
          <div className="card">
            <div className="metricLabel">Abaixo do mínimo</div>
            <div className="metricValue">{stats.low}</div>
            <div className="hint">precisa repor</div>
          </div>
        </div>

        <div className="card">
          <div className="blockTitle">Filtros</div>

          <div className="filters">
            <div className="field">
              <label>Buscar</label>
              <input
                className="input"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite: adubo, semente, galpão..."
              />
              <div className="muted">Atualizado: {updatedAt}</div>
            </div>

            <div className="field">
              <label>Categoria</label>
              <select className="select" value={categoria} onChange={(e) => setCategoria(e.target.value as any)}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="check">
              <input
                id="lowOnly"
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
              />
              <label htmlFor="lowOnly">Abaixo do mínimo</label>
            </div>

            <div className="filterActions">
              <button
                className="btn"
                onClick={() => {
                  setBusca("");
                  setCategoria("Todas");
                  setLowOnly(false);
                  setTimeout(load, 0);
                }}
              >
                Limpar
              </button>
              <button className="btn primary" onClick={load} disabled={loading}>
                Aplicar
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="blockTitle">Itens</div>

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Local</th>
                  <th>Qtd</th>
                  <th>Un</th>
                  <th>Mín</th>
                  <th>Valor</th>
                  <th>Validade</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="empty">
                      Carregando...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty">
                      Nenhum item ainda. Clique em <b>+ Adicionar</b>.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id}>
                      <td className="strong">{it.nome}</td>
                      <td>{it.categoria}</td>
                      <td>{it.local || "—"}</td>
                      <td>{it.quantidade ?? 0}</td>
                      <td>{it.unidade || "—"}</td>
                      <td>{it.minimo ?? 0}</td>
                      <td>{money(Number(it.valor_unitario ?? 0))}</td>
                      <td>{toDateInput(it.validade) || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn small" onClick={() => openEdit(it)}>
                          Editar
                        </button>{" "}
                        <button className="btn small danger" onClick={() => remove(it.id)}>
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modalHead">
                <div>
                  <div className="modalTitle">{mode === "edit" ? "Editar item" : "Adicionar item"}</div>
                  <div className="muted">Sem “Insumos” aqui — será um módulo separado.</div>
                </div>
                <button className="btn" onClick={() => setShowModal(false)}>
                  Fechar
                </button>
              </div>

              <div className="formGrid">
                <div className="field">
                  <label>Nome</label>
                  <input className="input" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
                </div>

                <div className="field">
                  <label>Categoria</label>
                  <select
                    className="select"
                    value={form.categoria}
                    onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
                  >
                    {/* Sem Insumos */}
                    {CATEGORIAS.filter((c) => c !== "Todas").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Local</label>
                  <input className="input" value={form.local} onChange={(e) => setForm((p) => ({ ...p, local: e.target.value }))} />
                </div>

                <div className="field">
                  <label>Unidade</label>
                  <input className="input" value={form.unidade} onChange={(e) => setForm((p) => ({ ...p, unidade: e.target.value }))} placeholder="kg, un, sc..." />
                </div>

                <div className="field">
                  <label>Quantidade</label>
                  <input className="input" value={form.quantidade} onChange={(e) => setForm((p) => ({ ...p, quantidade: e.target.value }))} />
                </div>

                <div className="field">
                  <label>Mínimo</label>
                  <input className="input" value={form.minimo} onChange={(e) => setForm((p) => ({ ...p, minimo: e.target.value }))} />
                </div>

                <div className="field">
                  <label>Valor unitário (R$)</label>
                  <input className="input" value={form.valorUnitario} onChange={(e) => setForm((p) => ({ ...p, valorUnitario: e.target.value }))} />
                </div>

                <div className="field">
                  <label>Validade</label>
                  <input className="input" type="date" value={form.validade} onChange={(e) => setForm((p) => ({ ...p, validade: e.target.value }))} />
                </div>

                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Observação</label>
                  <input className="input" value={form.observacao} onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))} />
                </div>
              </div>

              <div className="modalActions">
                <button className="btn" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button className="btn primary" onClick={save}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        .page-wrapper {
          min-height: 100vh;
          background: #0b2e13;
        }
        .shell {
          max-width: 1150px;
          margin: 0 auto;
          padding: 24px 16px 60px;
          color: rgba(255, 255, 255, 0.92);
        }
        .header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }
        .title {
          font-size: 44px;
          font-weight: 900;
          line-height: 1.05;
        }
        .subtitle {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 14px;
        }
        .header-actions {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }
        .grid3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 18px 0;
        }
        @media (max-width: 900px) {
          .grid3 {
            grid-template-columns: 1fr;
          }
        }
        .card {
          background: rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
        }
        .metricLabel {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.65);
          margin-bottom: 6px;
        }
        .metricValue {
          font-size: 22px;
          font-weight: 900;
        }
        .hint {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.65);
        }
        .blockTitle {
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 10px;
        }
        .filters {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 12px;
          align-items: end;
        }
        @media (max-width: 900px) {
          .filters {
            grid-template-columns: 1fr;
          }
        }
        .field label {
          display: block;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.75);
          margin-bottom: 6px;
          font-weight: 700;
        }
        .input,
        .select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(0, 0, 0, 0.25);
          color: rgba(255, 255, 255, 0.96);
          outline: none;
        }
        .input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        .select option {
          background: #0b2516;
          color: #fff;
        }
        .check {
          display: flex;
          gap: 8px;
          align-items: center;
          color: rgba(255, 255, 255, 0.9);
          padding-bottom: 6px;
          font-weight: 700;
        }
        .filterActions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .muted {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }
        .tableWrap {
          overflow: auto;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
        }
        thead th {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          text-align: left;
          padding: 12px;
          background: rgba(0, 0, 0, 0.22);
        }
        tbody td {
          padding: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .strong {
          font-weight: 900;
        }
        .empty {
          padding: 18px !important;
          color: rgba(255, 255, 255, 0.7);
        }
        .btn {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(0, 0, 0, 0.22);
          color: rgba(255, 255, 255, 0.92);
          cursor: pointer;
          font-weight: 800;
        }
        .btn:hover {
          background: rgba(0, 0, 0, 0.32);
        }
        .btn.primary {
          background: rgba(34, 197, 94, 0.28);
          border-color: rgba(34, 197, 94, 0.45);
        }
        .btn.primary:hover {
          background: rgba(34, 197, 94, 0.35);
        }
        .btn.small {
          padding: 8px 10px;
          font-size: 12px;
        }
        .btn.danger {
          background: rgba(239, 68, 68, 0.18);
          border-color: rgba(239, 68, 68, 0.35);
        }
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 9999;
        }
        .modal {
          width: min(900px, 100%);
          background: rgba(9, 30, 18, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
        }
        .modalHead {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .modalTitle {
          font-size: 18px;
          font-weight: 900;
        }
        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .formGrid {
            grid-template-columns: 1fr;
          }
        }
        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 14px;
        }
      `}</style>
    </div>
  );
}
