"use client";

import { useEffect, useMemo, useState } from "react";

type EstoqueItem = {
  id: string;
  nome: string;
  categoria: string;
  local: string | null;
  unidade: string;
  quantidade: number;
  minimo: number;
  valor_unitario: number;
  validade: string | null; // YYYY-MM-DD
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

const CATEGORIAS = ["Produção", "Peças", "Sementes", "Defensivos", "Fertilizantes", "Outros"] as const;
const UNIDADES = ["kg", "un", "L", "sc", "cx"] as const;

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Resposta inválida (JSON quebrado)." };
  }
}

export default function EstoquePage() {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [lowOnly, setLowOnly] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EstoqueItem | null>(null);

  const [mounted, setMounted] = useState(false);
  const [updatedAtIso, setUpdatedAtIso] = useState<string>("");

  const updatedHuman = useMemo(() => {
    if (!mounted || !updatedAtIso) return "";
    try {
      return new Date(updatedAtIso).toLocaleString();
    } catch {
      return "";
    }
  }, [mounted, updatedAtIso]);

  const [form, setForm] = useState({
    nome: "",
    categoria: "Produção",
    local: "",
    unidade: "kg",
    quantidade: "",
    minimo: "",
    valor_unitario: "",
    validade: "",
    observacao: "",
  });

  function resetForm() {
    setEditing(null);
    setForm({
      nome: "",
      categoria: "Produção",
      local: "",
      unidade: "kg",
      quantidade: "",
      minimo: "",
      valor_unitario: "",
      validade: "",
      observacao: "",
    });
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (busca.trim()) params.set("q", busca.trim());
      if (categoria !== "Todas") params.set("categoria", categoria);
      if (lowOnly) params.set("low", "1");

      const res = await fetch(`/api/estoque?${params.toString()}`, { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) throw new Error(json?.error || "Falha ao carregar.");
      setItems(json.items || []);
      setUpdatedAtIso(new Date().toISOString());
    } catch (e: any) {
      alert(e?.message || "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const total = items.length;
    const below = items.filter((i) => (i.quantidade ?? 0) < (i.minimo ?? 0)).length;
    const valorEstimado = items.reduce((acc, i) => acc + (Number(i.quantidade) || 0) * (Number(i.valor_unitario) || 0), 0);
    return { total, below, valorEstimado };
  }, [items]);

  function openAdd() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(item: EstoqueItem) {
    setEditing(item);
    setForm({
      nome: item.nome || "",
      categoria: item.categoria || "Produção",
      local: item.local || "",
      unidade: item.unidade || "kg",
      quantidade: String(item.quantidade ?? 0),
      minimo: String(item.minimo ?? 0),
      valor_unitario: String(item.valor_unitario ?? 0),
      validade: item.validade || "",
      observacao: item.observacao || "",
    });
    setShowModal(true);
  }

  async function save() {
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        nome: form.nome,
        categoria: form.categoria,
        local: form.local,
        unidade: form.unidade,
        quantidade: form.quantidade === "" ? 0 : Number(form.quantidade),
        minimo: form.minimo === "" ? 0 : Number(form.minimo),
        valor_unitario: form.valor_unitario === "" ? 0 : Number(form.valor_unitario),
        validade: form.validade || null,
        observacao: form.observacao,
      };

      const method = editing ? "PATCH" : "POST";
      const res = await fetch("/api/estoque", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Falha ao salvar.");

      setShowModal(false);
      resetForm();
      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao salvar.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este item?")) return;
    try {
      const res = await fetch(`/api/estoque?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Falha ao excluir.");
      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao excluir.");
    }
  }

  function applyFilters() {
    load();
  }

  function clearFilters() {
    setBusca("");
    setCategoria("Todas");
    setLowOnly(false);
    // carrega sem filtros
    setTimeout(() => load(), 0);
  }

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <main className="pat-shell">
          {/* Header */}
          <div className="pat-header">
            <div>
              <div className="pat-title">Estoque de produção</div>
              <div className="pat-subtitle">Controle de peças, produção e itens da fazenda (sem insumos).</div>
            </div>

            <div className="pat-actions">
              <button className="pat-btn pat-btn-muted" onClick={load} disabled={loading}>
                Recarregar
              </button>
              <button className="pat-btn pat-btn-primary" onClick={openAdd}>
                + Adicionar
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="pat-metrics-grid">
            <div className="pat-metric">
              <div className="pat-metric-label">Itens</div>
              <div className="pat-metric-value">{totals.total}</div>
              <div className="pat-metric-foot">Total na lista (com filtros)</div>
            </div>

            <div className="pat-metric">
              <div className="pat-metric-label">Valor estimado</div>
              <div className="pat-metric-value">
                {totals.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              <div className="pat-metric-foot">Soma aprox. qtd × valor unit.</div>
            </div>

            <div className="pat-metric">
              <div className="pat-metric-label">Abaixo do mínimo</div>
              <div className="pat-metric-value">{totals.below}</div>
              <div className="pat-metric-foot">Itens com quantidade menor que o mínimo</div>
            </div>
          </div>

          {/* Filters */}
          <div className="pat-card">
            <div className="pat-card-title">Filtros</div>

            <div className="pat-filters-grid">
              <div>
                <label className="pat-label">Buscar</label>
                <input
                  className="pat-input"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite: peça, semente, galpão..."
                />
                <div className="pat-muted">Atualizado {updatedHuman || "—"}</div>
              </div>

              <div>
                <label className="pat-label">Categoria</label>
                <select className="pat-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value="Todas">Todas</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pat-checkbox">
                <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
                <span>Abaixo do mínimo</span>
              </div>

              <div className="pat-filter-actions">
                <button className="pat-btn pat-btn-muted" onClick={clearFilters}>
                  Limpar
                </button>
                <button className="pat-btn pat-btn-primary" onClick={applyFilters}>
                  Aplicar
                </button>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="pat-card">
            <div className="pat-card-title">Itens cadastrados</div>

            {loading ? (
              <div className="pat-muted">Carregando...</div>
            ) : items.length === 0 ? (
              <div className="pat-muted">Nenhum item encontrado. Clique em <b>+ Adicionar</b> para cadastrar.</div>
            ) : (
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
                      <th className="pat-th-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id}>
                        <td className="pat-td-strong">{i.nome}</td>
                        <td>{i.categoria}</td>
                        <td>{i.local || "—"}</td>
                        <td>{Number(i.quantidade || 0)}</td>
                        <td>{i.unidade}</td>
                        <td>{Number(i.minimo || 0)}</td>
                        <td>
                          {Number(i.valor_unitario || 0).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                        <td>{i.validade || "—"}</td>
                        <td className="pat-td-actions">
                          <button className="pat-btn pat-btn-muted" onClick={() => openEdit(i)}>
                            Editar
                          </button>
                          <button className="pat-btn pat-btn-danger" onClick={() => remove(i.id)}>
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pat-muted" style={{ marginTop: 10 }}>
              Fonte: API local <b>/api/estoque</b>.
            </div>
          </div>

          {/* Modal */}
          {showModal && (
            <div className="pat-modal-backdrop" onClick={() => setShowModal(false)}>
              <div className="pat-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pat-modal-header">
                  <div>
                    <div className="pat-modal-title">{editing ? "Editar item" : "Adicionar item"}</div>
                    <div className="pat-muted">Cadastro do estoque (sem insumos).</div>
                  </div>
                  <button className="pat-btn pat-btn-muted" onClick={() => setShowModal(false)}>
                    Fechar
                  </button>
                </div>

                <div className="pat-modal-grid">
                  <div>
                    <label className="pat-label">Nome do item</label>
                    <input className="pat-input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Semente milho híbrido" />
                  </div>

                  <div>
                    <label className="pat-label">Categoria</label>
                    <select className="pat-select" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="pat-label">Local</label>
                    <input className="pat-input" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Ex: Barracão" />
                  </div>

                  <div>
                    <label className="pat-label">Unidade</label>
                    <select className="pat-select" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })}>
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="pat-label">Quantidade</label>
                    <input className="pat-input" inputMode="decimal" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} placeholder="Ex: 10" />
                  </div>

                  <div>
                    <label className="pat-label">Mínimo</label>
                    <input className="pat-input" inputMode="decimal" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} placeholder="Ex: 2" />
                  </div>

                  <div>
                    <label className="pat-label">Valor unitário (R$)</label>
                    <input className="pat-input" inputMode="decimal" value={form.valor_unitario} onChange={(e) => setForm({ ...form, valor_unitario: e.target.value })} placeholder="Ex: 120.50" />
                  </div>

                  <div>
                    <label className="pat-label">Validade</label>
                    <input className="pat-input" type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="pat-label">Observação (opcional)</label>
                    <input className="pat-input" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Ex: guardar em local seco" />
                  </div>
                </div>

                <div className="pat-modal-actions">
                  <button className="pat-btn pat-btn-muted" onClick={() => setShowModal(false)}>
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
    </div>
  );
}
