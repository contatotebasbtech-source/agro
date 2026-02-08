"use client";

import React, { useEffect, useMemo, useState } from "react";

type EstoqueCategoria =
  | "Insumos"
  | "Sementes"
  | "Fertilizantes"
  | "Defensivos"
  | "Ração"
  | "Peças"
  | "Combustível"
  | "Produção"
  | "Outros";

type EstoqueUnidade = "kg" | "g" | "L" | "mL" | "sc" | "un" | "cx" | "ton";

type EstoqueItem = {
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

const CATEGORIAS: EstoqueCategoria[] = [
  "Insumos",
  "Sementes",
  "Fertilizantes",
  "Defensivos",
  "Ração",
  "Peças",
  "Combustível",
  "Produção",
  "Outros",
];

const UNIDADES: EstoqueUnidade[] = ["kg", "g", "L", "mL", "sc", "un", "cx", "ton"];

function brl(v?: number) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function num(v?: number) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return n.toLocaleString("pt-BR");
}

function fmtDateBR(iso?: string) {
  if (!iso) return "—";
  // aceita yyyy-mm-dd
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function isLow(item: EstoqueItem) {
  if (typeof item.minimo !== "number") return false;
  const q = typeof item.quantidade === "number" ? item.quantidade : 0;
  return q <= item.minimo;
}

export default function EstoquePage() {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(false);

  // filtros
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState<"" | EstoqueCategoria>("");
  const [onlyLow, setOnlyLow] = useState(false);

  // modal
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // form
  const [nome, setNome] = useState("");
  const [catForm, setCatForm] = useState<EstoqueCategoria>("Insumos");
  const [unidade, setUnidade] = useState<EstoqueUnidade>("kg");
  const [quantidade, setQuantidade] = useState<string>("");
  const [minimo, setMinimo] = useState<string>("");
  const [valorUnitario, setValorUnitario] = useState<string>("");
  const [local, setLocal] = useState("");
  const [validade, setValidade] = useState("");
  const [observacao, setObservacao] = useState("");

  const [lastUpdated, setLastUpdated] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (categoria) params.set("categoria", categoria);
      if (onlyLow) params.set("low", "1");

      const res = await fetch(`/api/estoque?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setLastUpdated(new Date().toLocaleString("pt-BR"));
    } catch {
      setItems([]);
      alert("Falha ao carregar estoque.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recarrega quando filtros mudarem (com pequeno debounce)
  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoria, onlyLow]);

  const totals = useMemo(() => {
    const totalItens = items.length;
    const totalValor = items.reduce((acc, x) => {
      const qnt = typeof x.quantidade === "number" ? x.quantidade : 0;
      const vu = typeof x.valorUnitario === "number" ? x.valorUnitario : 0;
      return acc + qnt * vu;
    }, 0);
    const low = items.filter((x) => isLow(x)).length;
    return { totalItens, totalValor, low };
  }, [items]);

  function resetForm() {
    setNome("");
    setCatForm("Insumos");
    setUnidade("kg");
    setQuantidade("");
    setMinimo("");
    setValorUnitario("");
    setLocal("");
    setValidade("");
    setObservacao("");
  }

  async function onCreate() {
    if (!nome.trim()) {
      alert("Informe o nome do item.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        nome: nome.trim(),
        categoria: catForm,
        unidade,
        quantidade: quantidade === "" ? undefined : Number(quantidade),
        minimo: minimo === "" ? undefined : Number(minimo),
        valorUnitario: valorUnitario === "" ? undefined : Number(valorUnitario),
        local: local.trim() || undefined,
        validade: validade.trim() || undefined,
        observacao: observacao.trim() || undefined,
      };

      const res = await fetch("/api/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Falha ao salvar.");
        return;
      }

      setOpen(false);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    const ok = confirm("Excluir este item do estoque?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/estoque?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Falha ao excluir.");
        return;
      }
      await load();
    } catch {
      alert("Falha ao excluir.");
    }
  }

  function clearFilters() {
    setQ("");
    setCategoria("");
    setOnlyLow(false);
  }

  return (
    <main className="pat-page">
      <div className="pat-container">
        {/* Header */}
        <div className="pat-header">
          <div>
            <h1 className="pat-title">Estoque de produção</h1>
            <p className="pat-subtitle">Controle de insumos, peças, produção e itens da fazenda</p>
          </div>

          <button className="pat-btn pat-btn-primary" onClick={() => setOpen(true)}>
            + Adicionar
          </button>
        </div>

        {/* Top cards */}
        <div className="pat-grid pat-grid-3">
          <div className="pat-card pat-metric">
            <div className="pat-metric-label">Itens</div>
            <div className="pat-metric-value">{num(totals.totalItens)}</div>
            <div className="pat-metric-sub">Total na lista (com filtros)</div>
          </div>

          <div className="pat-card pat-metric">
            <div className="pat-metric-label">Valor estimado</div>
            <div className="pat-metric-value">{brl(totals.totalValor)}</div>
            <div className="pat-metric-sub">Soma aprox. qtd × valor unit.</div>
          </div>

          <div className="pat-card pat-metric">
            <div className="pat-metric-label">Abaixo do mínimo</div>
            <div className="pat-metric-value">{num(totals.low)}</div>
            <div className="pat-metric-sub">Itens com quantidade menor que o mínimo</div>
          </div>
        </div>

        {/* Filters */}
        <div className="pat-card pat-panel">
          <div className="pat-panel-title">Filtros</div>

          <div className="pat-form-grid">
            <div className="pat-field">
              <label className="pat-label">Buscar</label>
              <input
                className="pat-input"
                placeholder="Digite: adubo, sementes, galpão..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="pat-field">
              <label className="pat-label">Categoria</label>
              <select
                className="pat-select"
                value={categoria}
                onChange={(e) => setCategoria((e.target.value as any) || "")}
              >
                <option value="">Todas</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="pat-field pat-field-inline">
              <label className="pat-label">Abaixo do mínimo</label>
              <div className="pat-inline">
                <input
                  type="checkbox"
                  checked={onlyLow}
                  onChange={(e) => setOnlyLow(e.target.checked)}
                />
                <span className="pat-hint">Mostrar apenas itens em alerta</span>
              </div>
            </div>

            <div className="pat-actions">
              <button className="pat-btn" onClick={clearFilters}>
                Limpar
              </button>
              <button className="pat-btn" onClick={load} disabled={loading}>
                {loading ? "Carregando..." : "Recarregar"}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="pat-card pat-panel">
          <div className="pat-panel-row">
            <div className="pat-panel-title">Itens cadastrados</div>
            <div className="pat-panel-meta">Atualizado: {lastUpdated || "—"}</div>
          </div>

          <div className="pat-table-wrap">
            <table className="pat-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Local</th>
                  <th>Qtd</th>
                  <th>Mínimo</th>
                  <th>Valor unit.</th>
                  <th>Validade</th>
                  <th className="pat-th-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="pat-empty">
                      Nenhum item encontrado. Clique em <b>+ Adicionar</b> para cadastrar.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className={isLow(it) ? "pat-row-alert" : ""}>
                      <td>
                        <div className="pat-strong">{it.nome}</div>
                        {it.observacao ? <div className="pat-muted">{it.observacao}</div> : null}
                      </td>
                      <td>
                        <span className="pat-chip">{it.categoria}</span>
                      </td>
                      <td>{it.local || "—"}</td>
                      <td>
                        {num(it.quantidade)} <span className="pat-muted">{it.unidade}</span>
                      </td>
                      <td>{it.minimo === undefined ? "—" : num(it.minimo)}</td>
                      <td>{it.valorUnitario === undefined ? "—" : brl(it.valorUnitario)}</td>
                      <td>{fmtDateBR(it.validade)}</td>
                      <td className="pat-td-right">
                        <button className="pat-btn pat-btn-danger" onClick={() => onDelete(it.id)}>
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pat-footnote">
            Fonte: API local <code>/api/estoque</code>. (Sem banco ainda, se você estiver usando
            “mock”.)
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="pat-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="pat-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pat-modal-head">
              <div>
                <div className="pat-modal-title">Adicionar item</div>
                <div className="pat-modal-sub">Cadastre um item do estoque de produção</div>
              </div>
              <button className="pat-btn" onClick={() => setOpen(false)}>
                Fechar
              </button>
            </div>

            <div className="pat-divider" />

            <div className="pat-form-grid pat-form-grid-modal">
              <div className="pat-field">
                <label className="pat-label">Nome do item</label>
                <input
                  className="pat-input"
                  placeholder="Ex: Ureia 45%, Semente milho, Óleo hidráulico..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="pat-field">
                <label className="pat-label">Categoria</label>
                <select
                  className="pat-select"
                  value={catForm}
                  onChange={(e) => setCatForm(e.target.value as EstoqueCategoria)}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pat-field">
                <label className="pat-label">Unidade</label>
                <select
                  className="pat-select"
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value as EstoqueUnidade)}
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pat-field">
                <label className="pat-label">Quantidade</label>
                <input
                  className="pat-input"
                  inputMode="decimal"
                  placeholder="Ex: 10"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>

              <div className="pat-field">
                <label className="pat-label">Mínimo</label>
                <input
                  className="pat-input"
                  inputMode="decimal"
                  placeholder="Ex: 2"
                  value={minimo}
                  onChange={(e) => setMinimo(e.target.value)}
                />
              </div>

              <div className="pat-field">
                <label className="pat-label">Valor unitário (R$)</label>
                <input
                  className="pat-input"
                  inputMode="decimal"
                  placeholder="Ex: 120.50"
                  value={valorUnitario}
                  onChange={(e) => setValorUnitario(e.target.value)}
                />
              </div>

              <div className="pat-field">
                <label className="pat-label">Local</label>
                <input
                  className="pat-input"
                  placeholder="Ex: Galpão, Depósito 1..."
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                />
              </div>

              <div className="pat-field">
                <label className="pat-label">Validade</label>
                <input
                  className="pat-input"
                  type="date"
                  value={validade}
                  onChange={(e) => setValidade(e.target.value)}
                />
              </div>

              <div className="pat-field pat-field-full">
                <label className="pat-label">Observação (opcional)</label>
                <input
                  className="pat-input"
                  placeholder="Ex: lote, fornecedor, uso..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>
            </div>

            <div className="pat-divider" />

            <div className="pat-modal-actions">
              <button className="pat-btn" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="pat-btn pat-btn-primary" onClick={onCreate} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS do layout (mesmo padrão do Patrimônio) */}
      <style jsx global>{`
        .pat-page {
          position: relative;
          min-height: calc(100vh - 70px);
          padding: 24px 16px 60px;
        }

        .pat-container {
          max-width: 1120px;
          margin: 0 auto;
        }

        .pat-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .pat-title {
          font-size: 40px;
          line-height: 1.05;
          font-weight: 900;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .pat-subtitle {
          margin: 6px 0 0;
          opacity: 0.8;
        }

        .pat-grid {
          display: grid;
          gap: 16px;
          margin: 16px 0;
        }
        .pat-grid-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        @media (max-width: 980px) {
          .pat-grid-3 {
            grid-template-columns: 1fr;
          }
        }

        .pat-card {
          border: 1px solid rgba(238, 242, 242, 0.12);
          background: rgba(10, 30, 18, 0.55);
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
        }

        .pat-metric {
          padding: 16px;
        }

        .pat-metric-label {
          font-size: 12px;
          opacity: 0.75;
          margin-bottom: 6px;
        }
        .pat-metric-value {
          font-size: 22px;
          font-weight: 900;
          margin-bottom: 6px;
        }
        .pat-metric-sub {
          font-size: 12px;
          opacity: 0.7;
        }

        .pat-panel {
          padding: 16px;
        }
        .pat-panel-title {
          font-size: 16px;
          font-weight: 900;
          margin-bottom: 12px;
        }
        .pat-panel-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .pat-panel-meta {
          opacity: 0.7;
          font-size: 12px;
        }

        .pat-form-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr 0.8fr 0.6fr;
          gap: 12px;
          align-items: end;
        }

        @media (max-width: 980px) {
          .pat-form-grid {
            grid-template-columns: 1fr;
          }
        }

        .pat-form-grid-modal {
          grid-template-columns: 1.2fr 0.8fr 0.5fr 0.6fr;
        }
        @media (max-width: 980px) {
          .pat-form-grid-modal {
            grid-template-columns: 1fr;
          }
        }

        .pat-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pat-field-full {
          grid-column: 1 / -1;
        }
        .pat-field-inline {
          grid-column: span 1;
        }

        .pat-label {
          font-size: 12px;
          opacity: 0.85;
        }

        .pat-input,
        .pat-select {
          height: 42px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.25);
          color: rgba(255, 255, 255, 0.95);
          outline: none;
        }

        .pat-input::placeholder {
          color: rgba(255, 255, 255, 0.45);
        }

        .pat-select option {
          color: #111;
        }

        .pat-inline {
          display: flex;
          gap: 10px;
          align-items: center;
          height: 42px;
        }

        .pat-hint {
          opacity: 0.75;
          font-size: 12px;
        }

        .pat-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .pat-btn {
          height: 40px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.25);
          color: rgba(255, 255, 255, 0.95);
          cursor: pointer;
          transition: transform 0.06s ease, background 0.2s ease, border 0.2s ease;
          font-weight: 700;
        }
        .pat-btn:hover {
          background: rgba(0, 0, 0, 0.35);
        }
        .pat-btn:active {
          transform: translateY(1px);
        }
        .pat-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pat-btn-primary {
          border-color: rgba(0, 255, 120, 0.25);
          background: rgba(0, 255, 120, 0.12);
        }

        .pat-btn-danger {
          border-color: rgba(255, 80, 80, 0.25);
          background: rgba(255, 80, 80, 0.12);
        }

        .pat-table-wrap {
          overflow: auto;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .pat-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 920px;
          background: rgba(0, 0, 0, 0.18);
        }

        .pat-table thead th {
          text-align: left;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          opacity: 0.8;
          padding: 12px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .pat-table tbody td {
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          vertical-align: top;
        }

        .pat-empty {
          text-align: center;
          opacity: 0.8;
          padding: 18px 12px;
        }

        .pat-strong {
          font-weight: 900;
        }
        .pat-muted {
          opacity: 0.72;
          font-size: 12px;
          margin-top: 2px;
        }

        .pat-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.25);
          font-size: 12px;
          opacity: 0.95;
          white-space: nowrap;
        }

        .pat-th-right,
        .pat-td-right {
          text-align: right;
        }

        .pat-row-alert td {
          background: rgba(255, 120, 0, 0.07);
        }

        .pat-footnote {
          margin-top: 10px;
          opacity: 0.75;
          font-size: 12px;
        }

        .pat-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 14px 0;
        }

        /* Modal */
        .pat-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 18px;
          z-index: 9999;
        }

        .pat-modal {
          width: min(860px, 100%);
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(10, 30, 18, 0.92);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
          padding: 16px;
          backdrop-filter: blur(12px);
        }

        .pat-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .pat-modal-title {
          font-size: 18px;
          font-weight: 900;
        }

        .pat-modal-sub {
          font-size: 12px;
          opacity: 0.75;
          margin-top: 2px;
        }

        .pat-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
      `}</style>
    </main>
  );
}
