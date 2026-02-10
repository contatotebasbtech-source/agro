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
  validade: string | null;
  observacao: string;
  created_at: string;
  updated_at: string;
};

type Mov = {
  id: string;
  item_id: string;
  tipo: "entrada" | "saida" | "ajuste";
  quantidade: number;
  observacao: string;
  created_at: string;
};

const CATEGORIAS = [
  "Peças",
  "Produção",
  "Sementes",
  "Defensivos",
  "Fertilizantes",
  "Outros",
] as const;

function brl(n: number) {
  if (!Number.isFinite(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDT(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

async function safeJson(res: Response) {
  // evita "Unexpected end of JSON input"
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : {};
  } catch {
    return { error: txt || "Resposta inválida da API" };
  }
}

export default function EstoquePage() {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros (estilo patrimônio)
  const [categoria, setCategoria] = useState<string>("Todas");
  const [busca, setBusca] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  // modal item
  const [showItemModal, setShowItemModal] = useState(false);
  const [editing, setEditing] = useState<EstoqueItem | null>(null);

  const [form, setForm] = useState({
    nome: "",
    categoria: "Peças",
    unidade: "un",
    minimo: "",
    valorUnitario: "",
    local: "",
    validade: "",
    observacao: "",
  });

  // modal movimentação
  const [showMovModal, setShowMovModal] = useState(false);
  const [movItem, setMovItem] = useState<EstoqueItem | null>(null);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [movLoading, setMovLoading] = useState(false);

  const [movForm, setMovForm] = useState({
    tipo: "entrada" as "entrada" | "saida" | "ajuste",
    quantidade: "",
    observacao: "",
  });

  const updatedAtHuman = useMemo(() => fmtDT(new Date().toISOString()), []);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (busca.trim()) params.set("q", busca.trim());
      if (categoria !== "Todas") params.set("categoria", categoria);
      if (lowOnly) params.set("low", "1");

      const res = await fetch(`/api/estoque?${params.toString()}`, { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar");

      setItems(json.items || []);
    } catch (e: any) {
      alert(e?.message || "Falha ao carregar");
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
    const totalValor = items.reduce((acc, it) => acc + Number(it.quantidade || 0) * Number(it.valor_unitario || 0), 0);
    const abaixo = items.filter((it) => Number(it.quantidade || 0) < Number(it.minimo || 0)).length;
    return { total, totalValor, abaixo };
  }, [items]);

  function openAdd() {
    setEditing(null);
    setForm({
      nome: "",
      categoria: "Peças",
      unidade: "un",
      minimo: "",
      valorUnitario: "",
      local: "",
      validade: "",
      observacao: "",
    });
    setShowItemModal(true);
  }

  function openEdit(it: EstoqueItem) {
    setEditing(it);
    setForm({
      nome: it.nome || "",
      categoria: it.categoria || "Peças",
      unidade: it.unidade || "un",
      minimo: String(it.minimo ?? 0),
      valorUnitario: String(it.valor_unitario ?? 0),
      local: it.local || "",
      validade: it.validade || "",
      observacao: it.observacao || "",
    });
    setShowItemModal(true);
  }

  async function saveItem() {
    try {
      if (!form.nome.trim()) {
        alert("Nome do item é obrigatório.");
        return;
      }

      const payload = {
        id: editing?.id,
        nome: form.nome.trim(),
        categoria: form.categoria,
        unidade: form.unidade,
        minimo: form.minimo === "" ? 0 : Number(form.minimo),
        valorUnitario: form.valorUnitario === "" ? 0 : Number(form.valorUnitario),
        local: form.local,
        validade: form.validade || null,
        observacao: form.observacao,
      };

      const res = await fetch("/api/estoque", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Falha ao salvar");

      setShowItemModal(false);
      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao salvar");
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Excluir este item?")) return;

    try {
      const res = await fetch(`/api/estoque?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Falha ao excluir");

      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao excluir");
    }
  }

  async function openMov(it: EstoqueItem) {
    setMovItem(it);
    setMovForm({ tipo: "entrada", quantidade: "", observacao: "" });
    setShowMovModal(true);
    await loadMovs(it.id);
  }

  async function loadMovs(itemId: string) {
    setMovLoading(true);
    try {
      const res = await fetch(`/api/estoque/movimentacoes?itemId=${encodeURIComponent(itemId)}&limit=50`, {
        cache: "no-store",
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar movimentações");
      setMovs(json.movimentacoes || []);
    } catch (e: any) {
      alert(e?.message || "Falha ao carregar movimentações");
      setMovs([]);
    } finally {
      setMovLoading(false);
    }
  }

  async function addMov() {
    if (!movItem) return;

    try {
      const qtd = movForm.quantidade === "" ? null : Number(movForm.quantidade);
      if (qtd == null || Number.isNaN(qtd) || qtd < 0) {
        alert("Quantidade inválida.");
        return;
      }

      const res = await fetch("/api/estoque/movimentacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: movItem.id,
          tipo: movForm.tipo,
          quantidade: qtd,
          observacao: movForm.observacao,
        }),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Falha ao registrar movimentação");

      // atualiza lista e itens
      await load();
      await loadMovs(movItem.id);

      setMovForm({ tipo: "entrada", quantidade: "", observacao: "" });
    } catch (e: any) {
      alert(e?.message || "Falha ao registrar movimentação");
    }
  }

  function applyFilters() {
    load();
  }

  function clearFilters() {
    setBusca("");
    setCategoria("Todas");
    setLowOnly(false);
    // aplica com os estados zerados
    setTimeout(() => load(), 0);
  }

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* Reuso do “shell” do Patrimônio (se seu CSS já tem pat-*, isso vai ficar bem parecido) */}
        <main className="pat-shell">
          {/* Header */}
          <div className="pat-header">
            <div>
              <div className="pat-title">Estoque de produção</div>
              <div className="pat-subtitle">
                Controle de peças, produção e itens da fazenda (sem insumos).
              </div>
            </div>

            <div className="pat-header-actions">
              <button className="pat-btn pat-btn-ghost" onClick={load}>
                Recarregar
              </button>
              <button className="pat-btn pat-btn-primary" onClick={openAdd}>
                + Adicionar
              </button>
            </div>
          </div>

          {/* Métricas (igual Patrimônio: 3 cards + dica) */}
          <div className="pat-metrics">
            <div className="pat-metric-card">
              <div className="pat-metric-label">Total de itens</div>
              <div className="pat-metric-value">{metrics.total}</div>
              <div className="pat-metric-sub">Itens cadastrados no estoque</div>
            </div>

            <div className="pat-metric-card">
              <div className="pat-metric-label">Valor estimado</div>
              <div className="pat-metric-value">{brl(metrics.totalValor)}</div>
              <div className="pat-metric-sub">Soma aprox. qtd × valor unit.</div>
            </div>

            <div className="pat-metric-card">
              <div className="pat-metric-label">Abaixo do mínimo</div>
              <div className="pat-metric-value">{metrics.abaixo}</div>
              <div className="pat-metric-sub">Itens com quantidade menor que o mínimo</div>
            </div>

            <div className="pat-tip-card">
              <div className="pat-tip-title">Dica</div>
              <div className="pat-tip-text">
                Use <b>Movimentações</b> para registrar entrada/saída e manter o saldo correto.
              </div>
            </div>
          </div>

          {/* Filtros (layout do Patrimônio) */}
          <div className="pat-filters-card">
            <div className="pat-filters-grid">
              <div className="pat-field">
                <div className="pat-label">Categoria</div>
                <select
                  className="pat-input"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="Todas">Todas</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pat-field pat-field-wide">
                <div className="pat-label">Buscar</div>
                <input
                  className="pat-input"
                  placeholder="Digite nome, local ou observação"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              <div className="pat-field">
                <div className="pat-label">Status</div>
                <label className="pat-checkbox">
                  <input
                    type="checkbox"
                    checked={lowOnly}
                    onChange={(e) => setLowOnly(e.target.checked)}
                  />
                  <span>Abaixo do mínimo</span>
                </label>
              </div>

              <div className="pat-field pat-actions">
                <button className="pat-btn pat-btn-ghost" onClick={clearFilters}>
                  Limpar
                </button>
                <button className="pat-btn pat-btn-primary" onClick={applyFilters}>
                  Aplicar
                </button>
              </div>
            </div>

            <div className="pat-updated">Atualizado {updatedAtHuman}</div>
          </div>

          {/* Lista */}
          <div className="pat-table-card">
            <div className="pat-section-title">Itens cadastrados</div>

            {loading ? (
              <div className="pat-empty">Carregando...</div>
            ) : items.length === 0 ? (
              <div className="pat-empty">
                Nenhum item encontrado. Clique em <b>+ Adicionar</b> para cadastrar.
              </div>
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
                      <th className="pat-th-actions">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const abaixo = Number(it.quantidade) < Number(it.minimo);
                      return (
                        <tr key={it.id} className={abaixo ? "pat-row-warn" : ""}>
                          <td className="pat-strong">{it.nome}</td>
                          <td>{it.categoria}</td>
                          <td>{it.local || "—"}</td>
                          <td>{Number(it.quantidade).toLocaleString("pt-BR")}</td>
                          <td>{it.unidade}</td>
                          <td>{Number(it.minimo).toLocaleString("pt-BR")}</td>
                          <td>{brl(Number(it.valor_unitario))}</td>
                          <td>{it.validade || "—"}</td>
                          <td className="pat-td-actions">
                            <button className="pat-btn pat-btn-ghost" onClick={() => openMov(it)}>
                              Movimentar
                            </button>
                            <button className="pat-btn pat-btn-ghost" onClick={() => openEdit(it)}>
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

            <div className="pat-footnote">Fonte: API local /api/estoque.</div>
          </div>
        </main>

        {/* Modal Add/Edit Item */}
        {showItemModal && (
          <div className="pat-modal-backdrop" onMouseDown={() => setShowItemModal(false)}>
            <div className="pat-modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="pat-modal-header">
                <div>
                  <div className="pat-modal-title">
                    {editing ? "Editar item" : "Adicionar item"}
                  </div>
                  <div className="pat-modal-subtitle">
                    {editing
                      ? "Atualize os dados do item (saldo via movimentação)."
                      : "Cadastre um item do estoque."}
                  </div>
                </div>

                <button className="pat-btn pat-btn-ghost" onClick={() => setShowItemModal(false)}>
                  Fechar
                </button>
              </div>

              <div className="pat-modal-body">
                <div className="pat-form-grid">
                  <div className="pat-field pat-field-wide">
                    <div className="pat-label">Nome do item</div>
                    <input
                      className="pat-input"
                      placeholder="Ex: Rolamento, peneira, saco, peça..."
                      value={form.nome}
                      onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
                    />
                  </div>

                  <div className="pat-field">
                    <div className="pat-label">Categoria</div>
                    <select
                      className="pat-input"
                      value={form.categoria}
                      onChange={(e) => setForm((s) => ({ ...s, categoria: e.target.value }))}
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pat-field">
                    <div className="pat-label">Unidade</div>
                    <input
                      className="pat-input"
                      placeholder="un, kg, L..."
                      value={form.unidade}
                      onChange={(e) => setForm((s) => ({ ...s, unidade: e.target.value }))}
                    />
                  </div>

                  <div className="pat-field">
                    <div className="pat-label">Mínimo</div>
                    <input
                      className="pat-input"
                      type="number"
                      value={form.minimo}
                      onChange={(e) => setForm((s) => ({ ...s, minimo: e.target.value }))}
                    />
                  </div>

                  <div className="pat-field">
                    <div className="pat-label">Valor unitário (R$)</div>
                    <input
                      className="pat-input"
                      type="number"
                      step="0.01"
                      value={form.valorUnitario}
                      onChange={(e) => setForm((s) => ({ ...s, valorUnitario: e.target.value }))}
                    />
                  </div>

                  <div className="pat-field">
                    <div className="pat-label">Local</div>
                    <input
                      className="pat-input"
                      placeholder="Ex: galpão, barracão..."
                      value={form.local}
                      onChange={(e) => setForm((s) => ({ ...s, local: e.target.value }))}
                    />
                  </div>

                  <div className="pat-field">
                    <div className="pat-label">Validade</div>
                    <input
                      className="pat-input"
                      type="date"
                      value={form.validade}
                      onChange={(e) => setForm((s) => ({ ...s, validade: e.target.value }))}
                    />
                  </div>

                  <div className="pat-field pat-field-wide">
                    <div className="pat-label">Observação</div>
                    <input
                      className="pat-input"
                      placeholder="Ex: lote, marca, compatibilidade..."
                      value={form.observacao}
                      onChange={(e) => setForm((s) => ({ ...s, observacao: e.target.value }))}
                    />
                  </div>

                  <div className="pat-note">
                    <b>Importante:</b> a <b>quantidade</b> não é editada aqui. Use <b>Movimentar</b> para entrada/saída/ajuste.
                  </div>
                </div>
              </div>

              <div className="pat-modal-footer">
                <button className="pat-btn pat-btn-ghost" onClick={() => setShowItemModal(false)}>
                  Cancelar
                </button>
                <button className="pat-btn pat-btn-primary" onClick={saveItem}>
                  Salvar
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
                  <div className="pat-modal-title">Movimentações</div>
                  <div className="pat-modal-subtitle">
                    Item: <b>{movItem.nome}</b> • Saldo atual: <b>{Number(movItem.quantidade).toLocaleString("pt-BR")} {movItem.unidade}</b>
                  </div>
                </div>

                <button className="pat-btn pat-btn-ghost" onClick={() => setShowMovModal(false)}>
                  Fechar
                </button>
              </div>

              <div className="pat-modal-body">
                <div className="pat-form-grid">
                  <div className="pat-field">
                    <div className="pat-label">Tipo</div>
                    <select
                      className="pat-input"
                      value={movForm.tipo}
                      onChange={(e) =>
                        setMovForm((s) => ({ ...s, tipo: e.target.value as any }))
                      }
                    >
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                      <option value="ajuste">Ajuste</option>
                    </select>
                  </div>

                  <div className="pat-field">
                    <div className="pat-label">
                      Quantidade {movForm.tipo === "ajuste" ? "(novo saldo)" : ""}
                    </div>
                    <input
                      className="pat-input"
                      type="number"
                      value={movForm.quantidade}
                      onChange={(e) => setMovForm((s) => ({ ...s, quantidade: e.target.value }))}
                    />
                  </div>

                  <div className="pat-field pat-field-wide">
                    <div className="pat-label">Observação</div>
                    <input
                      className="pat-input"
                      placeholder="Ex: compra, consumo, ajuste de inventário..."
                      value={movForm.observacao}
                      onChange={(e) => setMovForm((s) => ({ ...s, observacao: e.target.value }))}
                    />
                  </div>

                  <div className="pat-field pat-actions">
                    <button className="pat-btn pat-btn-primary" onClick={addMov}>
                      Registrar
                    </button>
                  </div>
                </div>

                <div className="pat-section-title" style={{ marginTop: 14 }}>
                  Histórico
                </div>

                {movLoading ? (
                  <div className="pat-empty">Carregando movimentações...</div>
                ) : movs.length === 0 ? (
                  <div className="pat-empty">Nenhuma movimentação ainda.</div>
                ) : (
                  <div className="pat-table-wrap">
                    <table className="pat-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Tipo</th>
                          <th>Quantidade</th>
                          <th>Obs.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movs.map((m) => (
                          <tr key={m.id}>
                            <td>{fmtDT(m.created_at)}</td>
                            <td style={{ textTransform: "capitalize" }}>{m.tipo}</td>
                            <td>{Number(m.quantidade).toLocaleString("pt-BR")}</td>
                            <td>{m.observacao || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pat-modal-footer">
                <button className="pat-btn pat-btn-ghost" onClick={() => setShowMovModal(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CSS mínimo extra para garantir “cara” de Patrimônio caso falte alguma classe */}
        <style jsx global>{`
          /* Se seu projeto já tem .pat-* no CSS, isso aqui só complementa */
          .pat-header-actions { display: flex; gap: 10px; align-items: center; }
          .pat-actions { display: flex; gap: 10px; justify-content: flex-end; align-items: flex-end; }

          /* deixa os options visíveis no tema escuro (aquele “quadrado” da pesquisa/select) */
          select.pat-input, select.pat-input option {
            color: #0b1b10;
            background: #dfe7df;
          }
          select.pat-input:focus { outline: none; }

          /* fallback se não existir no teu CSS */
          .pat-shell { padding: 24px; }
          .pat-header {
            display: flex; justify-content: space-between; align-items: flex-start;
            padding: 26px; border-radius: 18px;
            background: rgba(7, 35, 17, 0.55);
            border: 1px solid rgba(255,255,255,0.08);
          }
          .pat-title { font-size: 52px; font-weight: 900; color: #eafff0; line-height: 1; }
          .pat-subtitle { margin-top: 6px; color: rgba(255,255,255,0.75); }

          .pat-btn {
            padding: 10px 14px; border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.06);
            color: #eafff0;
            cursor: pointer;
          }
          .pat-btn:hover { background: rgba(255,255,255,0.10); }
          .pat-btn-primary { background: rgba(36, 120, 66, 0.55); }
          .pat-btn-primary:hover { background: rgba(36, 120, 66, 0.70); }
          .pat-btn-danger { background: rgba(170, 40, 40, 0.35); }
          .pat-btn-danger:hover { background: rgba(170, 40, 40, 0.50); }

          .pat-metrics {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-top: 14px;
          }
          .pat-metric-card, .pat-tip-card, .pat-filters-card, .pat-table-card {
            border-radius: 18px;
            background: rgba(7, 35, 17, 0.40);
            border: 1px solid rgba(255,255,255,0.08);
            padding: 16px;
          }
          .pat-metric-label { color: rgba(255,255,255,0.65); font-size: 13px; }
          .pat-metric-value { color: #eafff0; font-size: 26px; font-weight: 800; margin-top: 8px; }
          .pat-metric-sub { color: rgba(255,255,255,0.60); font-size: 12px; margin-top: 4px; }

          .pat-tip-title { color: rgba(255,255,255,0.75); font-weight: 700; }
          .pat-tip-text { color: rgba(255,255,255,0.65); margin-top: 6px; }

          .pat-filters-card { margin-top: 14px; }
          .pat-filters-grid {
            display: grid;
            grid-template-columns: 260px 1fr 240px 260px;
            gap: 12px;
            align-items: end;
          }
          .pat-field-wide { grid-column: span 1; }
          .pat-label { color: rgba(255,255,255,0.70); font-size: 13px; margin-bottom: 6px; }
          .pat-input {
            width: 100%;
            padding: 10px 12px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(0,0,0,0.25);
            color: #eafff0;
          }
          .pat-checkbox { display: flex; gap: 8px; align-items: center; color: rgba(255,255,255,0.75); }
          .pat-updated { margin-top: 10px; color: rgba(255,255,255,0.55); font-size: 12px; }

          .pat-table-card { margin-top: 14px; }
          .pat-section-title { color: rgba(255,255,255,0.80); font-weight: 800; font-size: 18px; }
          .pat-empty { color: rgba(255,255,255,0.65); margin-top: 12px; }
          .pat-footnote { margin-top: 10px; color: rgba(255,255,255,0.50); font-size: 12px; }

          .pat-table-wrap { overflow: auto; margin-top: 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); }
          .pat-table { width: 100%; border-collapse: collapse; }
          .pat-table th, .pat-table td { padding: 10px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); color: rgba(255,255,255,0.78); }
          .pat-table th { text-align: left; color: rgba(255,255,255,0.65); font-size: 12px; }
          .pat-strong { color: #eafff0; font-weight: 800; }
          .pat-th-actions, .pat-td-actions { text-align: right; white-space: nowrap; }
          .pat-row-warn td { background: rgba(180, 120, 20, 0.10); }

          .pat-modal-backdrop {
            position: fixed; inset: 0; background: rgba(0,0,0,0.60);
            display: flex; justify-content: center; align-items: center;
            padding: 20px; z-index: 9999;
          }
          .pat-modal {
            width: min(860px, 100%);
            background: rgba(7, 35, 17, 0.92);
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 18px;
            padding: 16px;
          }
          .pat-modal-wide { width: min(980px, 100%); }
          .pat-modal-header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
          .pat-modal-title { color: #eafff0; font-weight: 900; font-size: 20px; }
          .pat-modal-subtitle { color: rgba(255,255,255,0.70); font-size: 13px; margin-top: 3px; }
          .pat-modal-body { margin-top: 12px; }
          .pat-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }

          .pat-form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .pat-note {
            grid-column: 1 / -1;
            margin-top: 6px;
            color: rgba(255,255,255,0.70);
            font-size: 13px;
            border-left: 3px solid rgba(36, 120, 66, 0.8);
            padding-left: 10px;
          }

          @media (max-width: 980px) {
            .pat-metrics { grid-template-columns: 1fr; }
            .pat-filters-grid { grid-template-columns: 1fr; }
            .pat-form-grid { grid-template-columns: 1fr; }
            .pat-title { font-size: 38px; }
          }
        `}</style>
      </div>
    </div>
  );
}
