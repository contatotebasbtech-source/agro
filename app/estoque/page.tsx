"use client";

import { useEffect, useMemo, useState } from "react";

type EstoqueItem = {
  id: string;
  nome: string;
  categoria: string | null;
  unidade: string | null;
  quantidade: number | null;
  minimo: number | null;
  valor_unitario: number | null;
  local: string | null;
  validade: string | null; // date
  observacao: string | null;
  created_at: string;
};

const CATEGORIAS = ["Todas", "Insumos", "Produção", "Peças", "Sementes", "Defensivos", "Fertilizantes", "Outros"];

function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
function asText(value?: string | null) {
  return value ?? "";
}
function asNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export default function EstoquePage() {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [lowOnly, setLowOnly] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [updatedAtIso, setUpdatedAtIso] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    categoria: "Insumos",
    unidade: "kg",
    quantidade: "",
    minimo: "",
    valorUnitario: "",
    local: "",
    validade: "",
    observacao: "",
  });

  useEffect(() => {
    setMounted(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatedAtHuman = useMemo(() => {
    if (!mounted || !updatedAtIso) return "";
    try {
      return new Date(updatedAtIso).toLocaleString("pt-BR");
    } catch {
      return "";
    }
  }, [mounted, updatedAtIso]);

  async function load(custom?: { q?: string; categoria?: string; low?: boolean }) {
    try {
      setLoading(true);

      const q = (custom?.q ?? busca).trim();
      const cat = custom?.categoria ?? categoria;
      const low = custom?.low ?? lowOnly;

      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cat && cat !== "Todas") params.set("categoria", cat);
      if (low) params.set("low", "1");

      const res = await fetch(`/api/estoque?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        console.error(json);
        alert(json?.error || "Falha ao carregar");
        return;
      }

      setItems(json.items || []);
      setUpdatedAtIso(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm({
      nome: "",
      categoria: "Insumos",
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

  function openEdit(item: EstoqueItem) {
    setEditingId(item.id);

    setForm({
      nome: asText(item.nome),
      categoria: asText(item.categoria) || "Insumos",
      unidade: asText(item.unidade) || "kg",
      local: asText(item.local),
      quantidade: String(asNumber(item.quantidade)),
      minimo: String(asNumber(item.minimo)),
      valorUnitario: String(asNumber(item.valor_unitario)),
      validade: toInputDate(item.validade),
      observacao: asText(item.observacao),
    });

    setShowModal(true);
  }

  async function save() {
    try {
      const payload = {
        id: editingId,
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
        alert("Nome do item é obrigatório.");
        return;
      }

      const res = await fetch("/api/estoque", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error(json);
        alert(json?.error || "Falha ao salvar.");
        return;
      }

      setShowModal(false);
      await load();
    } catch (e) {
      console.error(e);
      alert("Falha ao salvar.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este item?")) return;

    const res = await fetch(`/api/estoque?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await res.json();

    if (!res.ok) {
      console.error(json);
      alert(json?.error || "Falha ao excluir.");
      return;
    }

    await load();
  }

  const stats = useMemo(() => {
    const total = items.length;
    const valorEstimado = items.reduce((acc, it) => {
      const q = asNumber(it.quantidade);
      const v = asNumber(it.valor_unitario);
      return acc + q * v;
    }, 0);
    const abaixoMinimo = items.filter((it) => asNumber(it.quantidade) < asNumber(it.minimo)).length;
    return { total, valorEstimado, abaixoMinimo };
  }, [items]);

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <main className="pat-shell">
          {/* Header */}
          <div className="pat-header">
            <div>
              <div className="pat-title">Estoque de produção</div>
              <div className="pat-subtitle">Controle de insumos, peças, produção e itens da fazenda</div>
            </div>

            <div className="pat-actions">
              <button className="pat-btn" onClick={() => load()}>
                Recarregar
              </button>
              <button className="pat-btn pat-btn-primary" onClick={openAdd}>
                + Adicionar
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="pat-grid-3">
            <div className="pat-metric">
              <div className="pat-metric-label">Itens</div>
              <div className="pat-metric-value">{stats.total}</div>
              <div className="pat-metric-foot">Total na lista (com filtros)</div>
            </div>

            <div className="pat-metric">
              <div className="pat-metric-label">Valor estimado</div>
              <div className="pat-metric-value">
                {Number(stats.valorEstimado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              <div className="pat-metric-foot">Soma aprox. qtd × valor unit.</div>
            </div>

            <div className="pat-metric">
              <div className="pat-metric-label">Abaixo do mínimo</div>
              <div className="pat-metric-value">{stats.abaixoMinimo}</div>
              <div className="pat-metric-foot">Itens com quantidade menor que o mínimo</div>
            </div>
          </div>

          {/* Filters */}
          <div className="pat-panel">
            <div className="pat-panel-title">Filtros</div>

            <div className="pat-filters">
              <div className="pat-field">
                <label>Buscar</label>
                <input
                  className="pat-input"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite: adubo, sementes, galpão..."
                />
                <div className="pat-muted">Atualizado {updatedAtHuman}</div>
              </div>

              <div className="pat-field">
                <label>Categoria</label>
                <select className="pat-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pat-field pat-inline">
                <input
                  type="checkbox"
                  checked={lowOnly}
                  onChange={(e) => setLowOnly(e.target.checked)}
                />
                <span>Abaixo do mínimo</span>
              </div>

              <div className="pat-filter-actions">
                <button
                  className="pat-btn"
                  onClick={() => {
                    setBusca("");
                    setCategoria("Todas");
                    setLowOnly(false);
                    load({ q: "", categoria: "Todas", low: false });
                  }}
                >
                  Limpar
                </button>

                <button className="pat-btn pat-btn-primary" onClick={() => load()}>
                  Aplicar
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="pat-panel">
            <div className="pat-panel-title">Itens cadastrados</div>

            <div className="pat-table-wrap">
              <table className="pat-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Categoria</th>
                    <th>Local</th>
                    <th>Qtd</th>
                    <th>Un</th>
                    <th>Mínimo</th>
                    <th>Valor unit.</th>
                    <th>Validade</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="pat-empty">
                        Carregando...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="pat-empty">
                        Nenhum item encontrado. Clique em <b>+ Adicionar</b> para cadastrar.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => (
                      <tr key={it.id}>
                        <td className="pat-strong">{asText(it.nome)}</td>
                        <td>{asText(it.categoria)}</td>
                        <td>{asText(it.local)}</td>
                        <td>{asNumber(it.quantidade)}</td>
                        <td>{asText(it.unidade)}</td>
                        <td>{asNumber(it.minimo)}</td>
                        <td>
                          {Number(asNumber(it.valor_unitario)).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                        <td>{toInputDate(it.validade) || "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          <button className="pat-btn pat-btn-small" onClick={() => openEdit(it)}>
                            Editar
                          </button>{" "}
                          <button className="pat-btn pat-btn-small pat-btn-danger" onClick={() => remove(it.id)}>
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pat-muted" style={{ marginTop: 10 }}>
              Fonte: API local <b>/api/estoque</b>.
            </div>
          </div>

          {/* Modal */}
          {showModal && (
            <div className="pat-modal-backdrop" onClick={() => setShowModal(false)}>
              <div className="pat-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pat-modal-head">
                  <div>
                    <div className="pat-modal-title">{editingId ? "Editar item" : "Adicionar item"}</div>
                    <div className="pat-muted">Cadastre um item do estoque da fazenda</div>
                  </div>
                  <button className="pat-btn" onClick={() => setShowModal(false)}>
                    Fechar
                  </button>
                </div>

                <div className="pat-form-grid">
                  <div className="pat-field">
                    <label>Nome do item</label>
                    <input
                      className="pat-input"
                      value={form.nome ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      placeholder="Ex: Semente de milho"
                    />
                  </div>

                  <div className="pat-field">
                    <label>Categoria</label>
                    <select
                      className="pat-select"
                      value={form.categoria ?? "Insumos"}
                      onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
                    >
                      {CATEGORIAS.filter((c) => c !== "Todas").map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pat-field">
                    <label>Local</label>
                    <input
                      className="pat-input"
                      value={form.local ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, local: e.target.value }))}
                      placeholder="Ex: Barracão"
                    />
                  </div>

                  <div className="pat-field">
                    <label>Unidade</label>
                    <input
                      className="pat-input"
                      value={form.unidade ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, unidade: e.target.value }))}
                      placeholder="kg, un, L..."
                    />
                  </div>

                  <div className="pat-field">
                    <label>Quantidade</label>
                    <input
                      className="pat-input"
                      value={form.quantidade ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, quantidade: e.target.value }))}
                      placeholder="Ex: 10"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="pat-field">
                    <label>Mínimo</label>
                    <input
                      className="pat-input"
                      value={form.minimo ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, minimo: e.target.value }))}
                      placeholder="Ex: 2"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="pat-field">
                    <label>Valor unitário (R$)</label>
                    <input
                      className="pat-input"
                      value={form.valorUnitario ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, valorUnitario: e.target.value }))}
                      placeholder="Ex: 120.50"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="pat-field">
                    <label>Validade</label>
                    <input
                      className="pat-input"
                      type="date"
                      value={form.validade ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, validade: e.target.value }))}
                    />
                  </div>

                  <div className="pat-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Observação (opcional)</label>
                    <input
                      className="pat-input"
                      value={form.observacao ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                      placeholder="Ex: Lote 23, guardar em local seco"
                    />
                  </div>
                </div>

                <div className="pat-modal-actions">
                  <button className="pat-btn" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button className="pat-btn pat-btn-primary" onClick={save}>
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CSS extra pra resolver “quadrados/branco” e deixar a busca legível */}
      <style jsx global>{`
        /* Se você já tem esses estilos no globals, pode manter. Esse bloco só reforça inputs/select/options */
        .pat-input,
        .pat-select {
          background: rgba(0, 0, 0, 0.25) !important;
          color: #e8f5ea !important;
          border: 1px solid rgba(232, 245, 234, 0.18) !important;
          border-radius: 12px;
          padding: 10px 12px;
          outline: none;
        }
        .pat-input::placeholder {
          color: rgba(232, 245, 234, 0.55) !important;
        }

        /* o “quadrado branco” geralmente é o OPTION do select (nativo do browser) */
        .pat-select option {
          background: #0b2e13 !important;
          color: #e8f5ea !important;
        }

        /* checkbox melhor */
        .pat-inline input[type="checkbox"] {
          accent-color: #2a7a3d;
          transform: translateY(1px);
        }

        /* modal */
        .pat-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }
        .pat-modal {
          width: min(900px, 100%);
          background: rgba(10, 25, 14, 0.92);
          border: 1px solid rgba(232, 245, 234, 0.16);
          border-radius: 18px;
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
          padding: 16px;
        }
        .pat-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }
        .pat-modal-title {
          font-size: 18px;
          font-weight: 800;
          color: #e8f5ea;
        }
        .pat-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 10px;
        }
        .pat-field label {
          display: block;
          font-size: 12px;
          color: rgba(232, 245, 234, 0.75);
          margin-bottom: 6px;
        }
        .pat-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 14px;
        }

        /* botões (se não existir) */
        .pat-btn {
          background: rgba(0, 0, 0, 0.18);
          color: #e8f5ea;
          border: 1px solid rgba(232, 245, 234, 0.18);
          padding: 10px 14px;
          border-radius: 14px;
          cursor: pointer;
        }
        .pat-btn:hover {
          background: rgba(0, 0, 0, 0.28);
        }
        .pat-btn-primary {
          background: rgba(42, 122, 61, 0.8);
          border-color: rgba(42, 122, 61, 0.9);
        }
        .pat-btn-primary:hover {
          background: rgba(42, 122, 61, 0.95);
        }
        .pat-btn-small {
          padding: 8px 10px;
          border-radius: 12px;
          font-size: 12px;
        }
        .pat-btn-danger {
          background: rgba(160, 40, 40, 0.5);
          border-color: rgba(160, 40, 40, 0.6);
        }
        .pat-btn-danger:hover {
          background: rgba(160, 40, 40, 0.7);
        }

        /* table */
        .pat-table-wrap {
          overflow: auto;
          border-radius: 16px;
          border: 1px solid rgba(232, 245, 234, 0.12);
        }
        .pat-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 820px;
        }
        .pat-table thead th {
          text-align: left;
          font-size: 12px;
          color: rgba(232, 245, 234, 0.75);
          padding: 12px;
          background: rgba(0, 0, 0, 0.22);
        }
        .pat-table tbody td {
          padding: 12px;
          border-top: 1px solid rgba(232, 245, 234, 0.08);
          color: rgba(232, 245, 234, 0.92);
        }
        .pat-empty {
          padding: 18px !important;
          color: rgba(232, 245, 234, 0.7);
        }
        .pat-strong {
          font-weight: 800;
        }

        /* cards/painéis (se o teu globals não tiver) */
        .pat-shell {
          width: min(1200px, 100%);
          margin: 0 auto;
          padding: 22px 16px 40px;
        }
        .pat-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
        }
        .pat-title {
          font-size: 42px;
          font-weight: 900;
          line-height: 1.05;
          color: #e8f5ea;
        }
        .pat-subtitle {
          color: rgba(232, 245, 234, 0.78);
          margin-top: 8px;
        }
        .pat-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .pat-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }
        @media (max-width: 980px) {
          .pat-grid-3 {
            grid-template-columns: 1fr;
          }
          .pat-form-grid {
            grid-template-columns: 1fr;
          }
        }
        .pat-metric,
        .pat-panel {
          background: rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(232, 245, 234, 0.12);
          border-radius: 18px;
          padding: 14px;
        }
        .pat-metric-label {
          font-size: 12px;
          color: rgba(232, 245, 234, 0.65);
          margin-bottom: 6px;
        }
        .pat-metric-value {
          font-size: 22px;
          font-weight: 900;
          color: #e8f5ea;
        }
        .pat-metric-foot {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(232, 245, 234, 0.7);
        }
        .pat-panel-title {
          font-size: 20px;
          font-weight: 900;
          color: rgba(232, 245, 234, 0.85);
          margin-bottom: 10px;
        }
        .pat-filters {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 12px;
          align-items: end;
        }
        @media (max-width: 980px) {
          .pat-filters {
            grid-template-columns: 1fr;
          }
        }
        .pat-inline {
          display: flex;
          gap: 8px;
          align-items: center;
          color: rgba(232, 245, 234, 0.9);
          padding-bottom: 6px;
        }
        .pat-filter-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .pat-muted {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(232, 245, 234, 0.6);
        }

        /* garante fundo geral verde (caso algum local fique branco) */
        .page-wrapper {
          min-height: 100vh;
          background: #0b2e13;
        }
      `}</style>
    </div>
  );
}
