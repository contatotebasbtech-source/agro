"use client";

import { useEffect, useMemo, useState } from "react";

type Insumo = {
  id: string;
  nome: string;
  categoria: string;
  local: string;
  unidade: string;
  quantidade: number;
  minimo: number;
  valor_unitario: number;
  validade?: string | null;
  observacao?: string | null;
  created_at: string;
};

type Mov = {
  id: string;
  insumo_id: string;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  data: string; // YYYY-MM-DD
  observacao?: string | null;
  created_at: string;
};

const CATEGORIAS = [
  "Fertilizantes",
  "Defensivos",
  "Sementes",
  "Outros",
];

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtBRL(n: number) {
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${n.toFixed(2)}`;
  }
}

export default function InsumosPage() {
  const [items, setItems] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);

  const [buscaDraft, setBuscaDraft] = useState("");
  const [categoriaDraft, setCategoriaDraft] = useState("Todas");
  const [lowOnlyDraft, setLowOnlyDraft] = useState(false);

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [lowOnly, setLowOnly] = useState(false);

  const [updatedAtIso, setUpdatedAtIso] = useState<string | null>(null);

  const updatedAtHuman = useMemo(() => {
    if (!updatedAtIso) return "—";
    try {
      const d = new Date(updatedAtIso);
      return d.toLocaleString("pt-BR");
    } catch {
      return updatedAtIso;
    }
  }, [updatedAtIso]);

  // MODAL ADD/EDIT
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    categoria: "Fertilizantes",
    local: "",
    unidade: "kg",
    quantidade: 0, // só no CREATE
    minimo: 0,
    valor_unitario: 0,
    validade: "",
    observacao: "",
  });

  // MOVIMENTAÇÃO
  const [movOpen, setMovOpen] = useState(false);
  const [movTipo, setMovTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [movInsumo, setMovInsumo] = useState<Insumo | null>(null);
  const [movForm, setMovForm] = useState({
    quantidade: 1,
    data: todayISO(),
    observacao: "",
  });

  // HISTÓRICO
  const [histOpen, setHistOpen] = useState(false);
  const [histInsumo, setHistInsumo] = useState<Insumo | null>(null);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [movLoading, setMovLoading] = useState(false);

  async function load(current?: { q?: string; categoria?: string; low?: boolean }) {
    try {
      setLoading(true);

      const q = (current?.q ?? busca).trim();
      const cat = (current?.categoria ?? categoria).trim();
      const low = current?.low ?? lowOnly;

      const params = new URLSearchParams();
      if (q) params.append("q", q);
      if (cat && cat !== "Todas") params.append("categoria", cat);
      if (low) params.append("low", "1");

      const res = await fetch(`/api/insumos?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || "Falha ao carregar insumos.");

      setItems(json.items || []);
      setUpdatedAtIso(new Date().toISOString());
    } catch (e: any) {
      alert(e?.message || "Falha ao carregar insumos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load({ q: "", categoria: "Todas", low: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = items.length;

  const belowMin = useMemo(() => {
    return items.filter((i) => Number(i.quantidade ?? 0) < Number(i.minimo ?? 0)).length;
  }, [items]);

  const valorTotal = useMemo(() => {
    return items.reduce((acc, i) => acc + Number(i.quantidade || 0) * Number(i.valor_unitario || 0), 0);
  }, [items]);

  function openAdd() {
    setEditId(null);
    setForm({
      nome: "",
      categoria: "Fertilizantes",
      local: "",
      unidade: "kg",
      quantidade: 0,
      minimo: 0,
      valor_unitario: 0,
      validade: "",
      observacao: "",
    });
    setShowModal(true);
  }

  function openEdit(i: Insumo) {
    setEditId(i.id);
    setForm({
      nome: i.nome || "",
      categoria: i.categoria || "Fertilizantes",
      local: i.local || "",
      unidade: i.unidade || "kg",
      quantidade: Number(i.quantidade || 0), // apenas para mostrar, não salva no PATCH
      minimo: Number(i.minimo || 0),
      valor_unitario: Number(i.valor_unitario || 0),
      validade: i.validade || "",
      observacao: i.observacao || "",
    });
    setShowModal(true);
  }

  async function saveInsumo() {
    try {
      const payload: any = {
        nome: form.nome,
        categoria: form.categoria,
        local: form.local,
        unidade: form.unidade,
        minimo: Number(form.minimo || 0),
        valor_unitario: Number(form.valor_unitario || 0),
        validade: form.validade ? form.validade : null,
        observacao: form.observacao,
      };

      let res: Response;

      if (!editId) {
        payload.quantidade = Number(form.quantidade || 0);
        res = await fetch("/api/insumos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        payload.id = editId;
        res = await fetch("/api/insumos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao salvar.");

      setShowModal(false);
      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao salvar.");
    }
  }

  async function deleteInsumo(id: string) {
    if (!confirm("Excluir este insumo? Isso apaga também as movimentações.")) return;
    try {
      const res = await fetch(`/api/insumos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao excluir.");
      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao excluir.");
    }
  }

  function openMov(i: Insumo, tipo: "ENTRADA" | "SAIDA") {
    setMovInsumo(i);
    setMovTipo(tipo);
    setMovForm({ quantidade: 1, data: todayISO(), observacao: "" });
    setMovOpen(true);
  }

  async function saveMov() {
    if (!movInsumo) return;
    try {
      const res = await fetch("/api/insumos/movimentacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insumo_id: movInsumo.id,
          tipo: movTipo,
          quantidade: Number(movForm.quantidade),
          data: movForm.data || null,
          observacao: movForm.observacao,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao movimentar.");

      setMovOpen(false);
      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao movimentar.");
    }
  }

  async function openHist(i: Insumo) {
    setHistInsumo(i);
    setHistOpen(true);
    try {
      setMovLoading(true);
      const res = await fetch(`/api/insumos/movimentacoes?insumo_id=${encodeURIComponent(i.id)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar histórico.");
      setMovs(json.movs || []);
    } catch (e: any) {
      alert(e?.message || "Falha ao carregar histórico.");
      setMovs([]);
    } finally {
      setMovLoading(false);
    }
  }

  async function deleteMov(id: string) {
    if (!confirm("Apagar esta movimentação? (o saldo será ajustado)")) return;
    try {
      const res = await fetch(`/api/insumos/movimentacoes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao apagar.");
      if (histInsumo) await openHist(histInsumo);
      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao apagar.");
    }
  }

  function applyFilters() {
    setBusca(buscaDraft);
    setCategoria(categoriaDraft);
    setLowOnly(lowOnlyDraft);
    load({ q: buscaDraft, categoria: categoriaDraft, low: lowOnlyDraft });
  }

  function clearFilters() {
    setBuscaDraft("");
    setCategoriaDraft("Todas");
    setLowOnlyDraft(false);

    setBusca("");
    setCategoria("Todas");
    setLowOnly(false);

    load({ q: "", categoria: "Todas", low: false });
  }

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* HEADER (igual Estoque) */}
        <div className="pat-header">
          <div>
            <div className="pat-title">Insumos</div>
            <div className="pat-subtitle">Controle de fertilizantes, defensivos e sementes (com movimentações)</div>
          </div>

          <div className="pat-header-actions">
            <button className="btn-outline" onClick={() => load()}>
              Recarregar
            </button>
            <button className="btn-primary" onClick={openAdd}>
              + Adicionar
            </button>
          </div>
        </div>

        {/* MÉTRICAS (igual Estoque) */}
        <div className="pat-metrics">
          <div className="pat-metric">
            <div className="pat-metric-label">Itens</div>
            <div className="pat-metric-value">{total}</div>
            <div className="pat-metric-help">Total na lista (com filtros)</div>
          </div>

          <div className="pat-metric">
            <div className="pat-metric-label">Valor estimado</div>
            <div className="pat-metric-value">{fmtBRL(valorTotal)}</div>
            <div className="pat-metric-help">Soma aprox. qtd × valor unit.</div>
          </div>

          <div className="pat-metric">
            <div className="pat-metric-label">Abaixo do mínimo</div>
            <div className="pat-metric-value">{belowMin}</div>
            <div className="pat-metric-help">Insumos críticos</div>
          </div>
        </div>

        {/* FILTROS (mesma cara do Estoque) */}
        <div className="pat-filters">
          <div className="pat-filter-col">
            <div className="pat-filter-label">Buscar</div>
            <input
              className="pat-input"
              value={buscaDraft}
              onChange={(e) => setBuscaDraft(e.target.value)}
              placeholder="Digite: adubo, semente, galpão..."
            />
            <div className="pat-filter-sub">
              Atualizado <b>{updatedAtHuman}</b>
            </div>
          </div>

          <div className="pat-filter-col">
            <div className="pat-filter-label">Categoria</div>
            <select className="pat-select" value={categoriaDraft} onChange={(e) => setCategoriaDraft(e.target.value)}>
              <option value="Todas">Todas</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="pat-filter-col pat-filter-inline">
            <label className="pat-check">
              <input type="checkbox" checked={lowOnlyDraft} onChange={(e) => setLowOnlyDraft(e.target.checked)} />
              <span>Abaixo do mínimo</span>
            </label>
          </div>

          <div className="pat-filter-actions">
            <button className="btn-outline" onClick={clearFilters}>
              Limpar
            </button>
            <button className="btn-primary" onClick={applyFilters}>
              Aplicar
            </button>
          </div>
        </div>

        {/* LISTA / TABELA (igual Estoque) */}
        <div className="pat-table-card">
          <div className="pat-table-title">Itens cadastrados</div>

          {loading ? (
            <div className="pat-empty">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="pat-empty">Nenhum insumo encontrado. Clique em <b>+ Adicionar</b> para cadastrar.</div>
          ) : (
            <div className="pat-table-scroll">
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
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const critico = Number(i.quantidade ?? 0) < Number(i.minimo ?? 0);
                    return (
                      <tr key={i.id} className={critico ? "pat-row-warn" : ""}>
                        <td className="pat-strong">{i.nome}</td>
                        <td>{i.categoria}</td>
                        <td>{i.local || "—"}</td>
                        <td>{Number(i.quantidade ?? 0)}</td>
                        <td>{i.unidade}</td>
                        <td>{Number(i.minimo ?? 0)}</td>
                        <td>{fmtBRL(Number(i.valor_unitario ?? 0))}</td>
                        <td>{i.validade || "—"}</td>
                        <td className="pat-actions">
                          <button className="btn-outline-sm" onClick={() => openMov(i, "ENTRADA")}>
                            Entrada
                          </button>
                          <button className="btn-outline-sm" onClick={() => openMov(i, "SAIDA")}>
                            Saída
                          </button>
                          <button className="btn-outline-sm" onClick={() => openHist(i)}>
                            Histórico
                          </button>
                          <button className="btn-outline-sm" onClick={() => openEdit(i)}>
                            Editar
                          </button>
                          <button className="btn-danger-sm" onClick={() => deleteInsumo(i.id)}>
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

          <div className="pat-footnote">Fonte: API local <b>/api/insumos</b> e <b>/api/insumos/movimentacoes</b>.</div>
        </div>
      </div>

      {/* MODAL ADD/EDIT */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal modal-lg">
            <div className="modal-head">
              <div>
                <h2>{editId ? "Editar insumo" : "Adicionar insumo"}</h2>
                <p>{editId ? "Edite dados (saldo muda via movimentação)." : "Cadastre com saldo inicial e mínimo."}</p>
              </div>
              <button className="btn-outline" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>

            <div className="modal-grid">
              <div>
                <label>Nome</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>

              <div>
                <label>Categoria</label>
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Local</label>
                <input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Ex: Barracão" />
              </div>

              <div>
                <label>Unidade</label>
                <input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
              </div>

              {!editId && (
                <div>
                  <label>Quantidade (inicial)</label>
                  <input
                    type="number"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
                  />
                </div>
              )}

              <div>
                <label>Mínimo</label>
                <input type="number" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: Number(e.target.value) })} />
              </div>

              <div>
                <label>Valor unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.valor_unitario}
                  onChange={(e) => setForm({ ...form, valor_unitario: Number(e.target.value) })}
                />
              </div>

              <div>
                <label>Validade</label>
                <input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} />
              </div>

              <div className="modal-span-2">
                <label>Observação</label>
                <input
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  placeholder="Ex: guardar em local seco"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={saveInsumo}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVIMENTAÇÃO */}
      {movOpen && movInsumo && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <div>
                <h2>
                  {movTipo === "ENTRADA" ? "Entrada" : "Saída"} • {movInsumo.nome}
                </h2>
                <p>
                  Saldo atual: <b>{Number(movInsumo.quantidade ?? 0)}</b> {movInsumo.unidade}
                </p>
              </div>
              <button className="btn-outline" onClick={() => setMovOpen(false)}>
                Fechar
              </button>
            </div>

            <div className="modal-grid">
              <div>
                <label>Quantidade</label>
                <input
                  type="number"
                  min={1}
                  value={movForm.quantidade}
                  onChange={(e) => setMovForm({ ...movForm, quantidade: Number(e.target.value) })}
                />
              </div>

              <div>
                <label>Data</label>
                <input type="date" value={movForm.data} onChange={(e) => setMovForm({ ...movForm, data: e.target.value })} />
              </div>

              <div className="modal-span-2">
                <label>Observação</label>
                <input
                  value={movForm.observacao}
                  onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value })}
                  placeholder="Ex: aplicação no talhão 3"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setMovOpen(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={saveMov}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTÓRICO */}
      {histOpen && histInsumo && (
        <div className="modal-backdrop">
          <div className="modal modal-lg">
            <div className="modal-head">
              <div>
                <h2>Histórico • {histInsumo.nome}</h2>
                <p>Movimentações (entrada/saída)</p>
              </div>
              <button className="btn-outline" onClick={() => setHistOpen(false)}>
                Fechar
              </button>
            </div>

            {movLoading ? (
              <div className="pat-empty">Carregando…</div>
            ) : movs.length === 0 ? (
              <div className="pat-empty">Sem movimentações.</div>
            ) : (
              <div className="pat-table-scroll">
                <table className="pat-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Quantidade</th>
                      <th>Obs</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movs.map((m) => (
                      <tr key={m.id}>
                        <td>{m.data}</td>
                        <td>{m.tipo}</td>
                        <td>{Number(m.quantidade)}</td>
                        <td>{m.observacao || "—"}</td>
                        <td className="pat-actions">
                          <button className="btn-danger-sm" onClick={() => deleteMov(m.id)}>
                            Apagar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setHistOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
