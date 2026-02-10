"use client";

import { useEffect, useMemo, useState } from "react";

type InsumoItem = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  minimo: number;
  valor_unitario: number;
  local: string;
  validade: string | null; // YYYY-MM-DD
  observacao: string;
  created_at?: string;
  updated_at?: string;
};

type Mov = {
  id: string;
  item_id: string;
  tipo: "entrada" | "saida" | "ajuste";
  quantidade: number;
  custo_unitario: number;
  motivo: string;
  data: string;
};

const CATEGORIAS = [
  "Todas",
  "Fertilizantes",
  "Defensivos",
  "Sementes",
  "Adjuvantes",
  "Combustível",
  "Outros",
] as const;

type Categoria = (typeof CATEGORIAS)[number];

function brl(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function asNumber(v: any, fallback = 0) {
  if (v === "" || v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmtDT(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Resposta inválida (JSON quebrado)" };
  }
}

export default function InsumosPage() {
  const [items, setItems] = useState<InsumoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Todas");
  const [lowOnly, setLowOnly] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [updatedAtIso, setUpdatedAtIso] = useState("");

  // Modal item (add/edit)
  const [showItemModal, setShowItemModal] = useState(false);
  const [editing, setEditing] = useState<InsumoItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    categoria: "Fertilizantes",
    unidade: "kg",
    quantidade: "",
    minimo: "",
    valorUnitario: "",
    local: "",
    validade: "",
    observacao: "",
  });

  // Modal movimentação
  const [showMovModal, setShowMovModal] = useState(false);
  const [movItem, setMovItem] = useState<InsumoItem | null>(null);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [movLoading, setMovLoading] = useState(false);
  const [movSaving, setMovSaving] = useState(false);

  const [movForm, setMovForm] = useState({
    tipo: "entrada" as "entrada" | "saida" | "ajuste",
    quantidade: "",
    custoUnitario: "",
    motivo: "",
  });

  useEffect(() => setMounted(true), []);

  const updatedAtHuman = useMemo(() => {
    if (!mounted || !updatedAtIso) return "—";
    return fmtDT(updatedAtIso);
  }, [mounted, updatedAtIso]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (busca.trim()) params.set("q", busca.trim());
      if (categoria !== "Todas") params.set("categoria", categoria);
      if (lowOnly) params.set("low", "1");

      const res = await fetch(`/api/insumos?${params.toString()}`, { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) throw new Error(json?.error || `Falha ao carregar (${res.status})`);

      const arr = (json.items || []).map((it: any) => ({
        ...it,
        quantidade: asNumber(it.quantidade, 0),
        minimo: asNumber(it.minimo, 0),
        valor_unitario: asNumber(it.valor_unitario, 0),
      }));

      setItems(arr);
      setUpdatedAtIso(new Date().toISOString());
    } catch (e: any) {
      alert(e?.message || "Falha ao carregar");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    const total = items.length;
    const abaixo = items.filter((i) => (i.quantidade ?? 0) < (i.minimo ?? 0)).length;
    const valor = items.reduce((acc, i) => acc + (i.quantidade ?? 0) * (i.valor_unitario ?? 0), 0);
    return { total, abaixo, valor };
  }, [items]);

  function openCreate() {
    setEditing(null);
    setForm({
      nome: "",
      categoria: "Fertilizantes",
      unidade: "kg",
      quantidade: "",
      minimo: "",
      valorUnitario: "",
      local: "",
      validade: "",
      observacao: "",
    });
    setShowItemModal(true);
  }

  function openEdit(it: InsumoItem) {
    setEditing(it);
    setForm({
      nome: it.nome || "",
      categoria: it.categoria || "Fertilizantes",
      unidade: it.unidade || "kg",
      quantidade: String(it.quantidade ?? 0),
      minimo: String(it.minimo ?? 0),
      valorUnitario: String(it.valor_unitario ?? 0),
      local: it.local || "",
      validade: it.validade || "",
      observacao: it.observacao || "",
    });
    setShowItemModal(true);
  }

  function closeItemModal() {
    setShowItemModal(false);
    setEditing(null);
    setSaving(false);
  }

  async function saveItem() {
    if (!form.nome.trim()) {
      alert("Nome do insumo é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        nome: form.nome.trim(),
        categoria: form.categoria,
        unidade: form.unidade,
        quantidade: asNumber(form.quantidade, 0),
        minimo: asNumber(form.minimo, 0),
        valorUnitario: asNumber(form.valorUnitario, 0),
        local: form.local || "",
        validade: form.validade || null,
        observacao: form.observacao || "",
      };

      const res = await fetch("/api/insumos", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || `Falha ao salvar (${res.status})`);

      closeItemModal();
      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Excluir este insumo?")) return;

    try {
      const res = await fetch(`/api/insumos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await safeJson(res);

      if (!res.ok) throw new Error(json?.error || `Falha ao excluir (${res.status})`);

      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao excluir");
    }
  }

  async function openMov(it: InsumoItem) {
    setMovItem(it);
    setMovForm({ tipo: "entrada", quantidade: "", custoUnitario: "", motivo: "" });
    setShowMovModal(true);
    await loadMovs(it.id);
  }

  async function loadMovs(itemId: string) {
    setMovLoading(true);
    try {
      const res = await fetch(`/api/insumos/movimentacoes?itemId=${encodeURIComponent(itemId)}`, {
        cache: "no-store",
      });
      const json = await safeJson(res);

      if (!res.ok) throw new Error(json?.error || `Falha ao carregar movimentações (${res.status})`);
      setMovs(json.items || []);
    } catch (e: any) {
      alert(e?.message || "Falha ao carregar movimentações");
      setMovs([]);
    } finally {
      setMovLoading(false);
    }
  }

  async function addMov() {
    if (!movItem) return;

    const qtd = asNumber(movForm.quantidade, -1);
    const custo = asNumber(movForm.custoUnitario, 0);

    if (qtd <= 0) {
      alert("Quantidade inválida.");
      return;
    }

    setMovSaving(true);
    try {
      const res = await fetch("/api/insumos/movimentacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: movItem.id,
          tipo: movForm.tipo,
          quantidade: qtd,
          custoUnitario: custo,
          motivo: movForm.motivo,
        }),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || `Falha ao registrar movimentação (${res.status})`);

      // atualiza saldo na lista e recarrega o histórico
      await load();
      await loadMovs(movItem.id);

      // pega item atualizado da lista
      const refreshed = await fetch(`/api/insumos?q=&categoria=Todas`, { cache: "no-store" });
      const refJson = await safeJson(refreshed);
      const updated = (refJson.items || []).find((x: any) => x.id === movItem.id);
      if (updated) setMovItem(updated);

      setMovForm({ tipo: "entrada", quantidade: "", custoUnitario: "", motivo: "" });
    } catch (e: any) {
      alert(e?.message || "Falha ao registrar movimentação");
    } finally {
      setMovSaving(false);
    }
  }

  function clearFilters() {
    setBusca("");
    setCategoria("Todas");
    setLowOnly(false);
    setTimeout(() => load(), 0);
  }

  function applyFilters() {
    load();
  }

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <main className="pat-shell">
          {/* HEADER */}
          <div className="pat-header">
            <div>
              <div className="pat-title">Insumos</div>
              <div className="pat-subtitle">Controle de fertilizantes, defensivos, sementes e outros insumos.</div>
            </div>

            <div className="pat-actions">
              <button className="pat-btn pat-btn-muted" onClick={load}>
                Recarregar
              </button>
              <button className="pat-btn pat-btn-primary" onClick={openCreate}>
                + Adicionar
              </button>
            </div>
          </div>

          {/* MÉTRICAS */}
          <div className="pat-metrics">
            <div className="pat-metric">
              <div className="pat-metric-label">Itens</div>
              <div className="pat-metric-value">{metrics.total}</div>
              <div className="pat-metric-foot">Total na lista (com filtros)</div>
            </div>

            <div className="pat-metric">
              <div className="pat-metric-label">Valor estimado</div>
              <div className="pat-metric-value">{brl(metrics.valor)}</div>
              <div className="pat-metric-foot">qtd × valor unit.</div>
            </div>

            <div className="pat-metric">
              <div className="pat-metric-label">Abaixo do mínimo</div>
              <div className="pat-metric-value">{metrics.abaixo}</div>
              <div className="pat-metric-foot">precisa repor</div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="pat-card">
            <div className="pat-card-title">Filtros</div>

            <div className="pat-form-grid">
              <div className="pat-field">
                <label>Categoria</label>
                <select className="pat-select" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pat-field">
                <label>Status</label>
                <label className="pat-checkbox">
                  <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
                  <span>Abaixo do mínimo</span>
                </label>
              </div>

              <div className="pat-field pat-field-wide">
                <label>Buscar</label>
                <input
                  className="pat-input"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite: nome, local, observação..."
                />
              </div>
            </div>

            <div className="pat-form-row">
              <div className="pat-muted">Atualizado {updatedAtHuman}</div>
              <div className="pat-actions" style={{ marginLeft: "auto" }}>
                <button className="pat-btn pat-btn-muted" onClick={clearFilters}>
                  Limpar
                </button>
                <button className="pat-btn pat-btn-primary" onClick={applyFilters}>
                  Aplicar
                </button>
              </div>
            </div>
          </div>

          {/* LISTA */}
          <div className="pat-card">
            <div className="pat-card-title">Itens cadastrados</div>

            {loading ? (
              <div className="pat-muted" style={{ marginTop: 10 }}>
                Carregando...
              </div>
            ) : items.length === 0 ? (
              <div className="pat-muted" style={{ marginTop: 10 }}>
                Nenhum insumo encontrado. Clique em <b>+ Adicionar</b>.
              </div>
            ) : (
              <div className="pat-table-wrap">
                <table className="pat-table">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Categoria</th>
                      <th>Local</th>
                      <th>Qtd</th>
                      <th>Un</th>
                      <th>Mín</th>
                      <th>Valor</th>
                      <th>Validade</th>
                      <th className="pat-th-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const warn = (it.quantidade ?? 0) < (it.minimo ?? 0);
                      return (
                        <tr key={it.id} className={warn ? "pat-row-warn" : ""}>
                          <td className="pat-td-strong">{it.nome}</td>
                          <td>{it.categoria}</td>
                          <td>{it.local || "—"}</td>
                          <td>{Number(it.quantidade || 0).toLocaleString("pt-BR")}</td>
                          <td>{it.unidade}</td>
                          <td>{Number(it.minimo || 0).toLocaleString("pt-BR")}</td>
                          <td>{brl(Number(it.valor_unitario || 0))}</td>
                          <td>{it.validade || "—"}</td>
                          <td className="pat-td-actions">
                            <button className="pat-btn pat-btn-primary" onClick={() => openMov(it)}>
                              Movimentar
                            </button>
                            <button className="pat-btn pat-btn-muted" onClick={() => openEdit(it)}>
                              Editar
                            </button>
                            <button className="pat-btn pat-btn-danger" onClick={() => removeItem(it.id)}>
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Add/Edit */}
          {showItemModal && (
            <div className="pat-modal-backdrop" onMouseDown={closeItemModal}>
              <div className="pat-modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="pat-modal-header">
                  <div>
                    <div className="pat-modal-title">{editing ? "Editar insumo" : "Adicionar insumo"}</div>
                    <div className="pat-muted">Cadastro de insumos (com saldo e mínimo).</div>
                  </div>
                  <button className="pat-btn pat-btn-muted" onClick={closeItemModal}>
                    Fechar
                  </button>
                </div>

                <div className="pat-modal-grid">
                  <div className="pat-field">
                    <label>Nome</label>
                    <input className="pat-input" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
                  </div>

                  <div className="pat-field">
                    <label>Categoria</label>
                    <select className="pat-select" value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}>
                      {CATEGORIAS.filter((c) => c !== "Todas").map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pat-field">
                    <label>Local</label>
                    <input className="pat-input" value={form.local} onChange={(e) => setForm((p) => ({ ...p, local: e.target.value }))} />
                  </div>

                  <div className="pat-field">
                    <label>Unidade</label>
                    <input className="pat-input" value={form.unidade} onChange={(e) => setForm((p) => ({ ...p, unidade: e.target.value }))} placeholder="kg, L, un..." />
                  </div>

                  <div className="pat-field">
                    <label>Quantidade</label>
                    <input className="pat-input" value={form.quantidade} onChange={(e) => setForm((p) => ({ ...p, quantidade: e.target.value }))} />
                  </div>

                  <div className="pat-field">
                    <label>Mínimo</label>
                    <input className="pat-input" value={form.minimo} onChange={(e) => setForm((p) => ({ ...p, minimo: e.target.value }))} />
                  </div>

                  <div className="pat-field">
                    <label>Valor unitário (R$)</label>
                    <input className="pat-input" value={form.valorUnitario} onChange={(e) => setForm((p) => ({ ...p, valorUnitario: e.target.value }))} />
                  </div>

                  <div className="pat-field">
                    <label>Validade</label>
                    <input className="pat-input" type="date" value={form.validade} onChange={(e) => setForm((p) => ({ ...p, validade: e.target.value }))} />
                  </div>

                  <div className="pat-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Observação</label>
                    <input className="pat-input" value={form.observacao} onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))} />
                  </div>
                </div>

                <div className="pat-modal-actions">
                  <button className="pat-btn pat-btn-muted" onClick={closeItemModal} disabled={saving}>
                    Cancelar
                  </button>
                  <button className="pat-btn pat-btn-primary" onClick={saveItem} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Movimentações */}
          {showMovModal && movItem && (
            <div className="pat-modal-backdrop" onMouseDown={() => setShowMovModal(false)}>
              <div className="pat-modal pat-modal-wide" onMouseDown={(e) => e.stopPropagation()}>
                <div className="pat-modal-header">
                  <div>
                    <div className="pat-modal-title">Movimentar insumo</div>
                    <div className="pat-muted">
                      <b>{movItem.nome}</b> • Saldo:{" "}
                      <b>
                        {Number(movItem.quantidade || 0).toLocaleString("pt-BR")} {movItem.unidade}
                      </b>
                    </div>
                  </div>
                  <button className="pat-btn pat-btn-muted" onClick={() => setShowMovModal(false)}>
                    Fechar
                  </button>
                </div>

                <div className="pat-modal-body">
                  <div className="pat-form-grid">
                    <div className="pat-field">
                      <label>Tipo</label>
                      <select className="pat-select" value={movForm.tipo} onChange={(e) => setMovForm((p) => ({ ...p, tipo: e.target.value as any }))}>
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saída</option>
                        <option value="ajuste">Ajuste</option>
                      </select>
                    </div>

                    <div className="pat-field">
                      <label>Quantidade {movForm.tipo === "ajuste" ? "(novo saldo)" : ""}</label>
                      <input className="pat-input" value={movForm.quantidade} onChange={(e) => setMovForm((p) => ({ ...p, quantidade: e.target.value }))} />
                    </div>

                    <div className="pat-field">
                      <label>Custo unit. (opcional)</label>
                      <input className="pat-input" value={movForm.custoUnitario} onChange={(e) => setMovForm((p) => ({ ...p, custoUnitario: e.target.value }))} />
                    </div>

                    <div className="pat-field pat-field-wide">
                      <label>Motivo / Obs.</label>
                      <input className="pat-input" value={movForm.motivo} onChange={(e) => setMovForm((p) => ({ ...p, motivo: e.target.value }))} placeholder="Ex: compra, aplicação, ajuste inventário..." />
                    </div>

                    <div className="pat-actions" style={{ alignSelf: "end" }}>
                      <button className="pat-btn pat-btn-primary" onClick={addMov} disabled={movSaving}>
                        {movSaving ? "Registrando..." : "Registrar"}
                      </button>
                    </div>
                  </div>

                  <div className="pat-section-title" style={{ marginTop: 14 }}>
                    Histórico
                  </div>

                  {movLoading ? (
                    <div className="pat-muted" style={{ marginTop: 10 }}>
                      Carregando...
                    </div>
                  ) : movs.length === 0 ? (
                    <div className="pat-muted" style={{ marginTop: 10 }}>
                      Nenhuma movimentação ainda.
                    </div>
                  ) : (
                    <div className="pat-table-wrap">
                      <table className="pat-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Qtd</th>
                            <th>Custo</th>
                            <th>Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movs.map((m) => (
                            <tr key={m.id}>
                              <td>{fmtDT(m.data)}</td>
                              <td style={{ textTransform: "capitalize" }}>{m.tipo}</td>
                              <td>{Number(m.quantidade).toLocaleString("pt-BR")}</td>
                              <td>{brl(Number(m.custo_unitario || 0))}</td>
                              <td>{m.motivo || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="pat-modal-actions">
                  <button className="pat-btn pat-btn-muted" onClick={() => setShowMovModal(false)}>
                    Fechar
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
