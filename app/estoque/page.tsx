"use client";

import { useEffect, useMemo, useState } from "react";

type EstoqueItem = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  minimo: number;
  valorUnitario: number;
  local?: string;
  validade?: string; // ISO (yyyy-mm-dd) ou dd/mm/aaaa (vamos normalizar)
  observacao?: string;
  createdAt: string; // ISO
};

const CATEGORIAS = [
  "Insumos",
  "Produção",
  "Peças",
  "Sementes",
  "Defensivos",
  "Fertilizantes",
  "Outros",
];

const UNIDADES = ["kg", "L", "un", "sc", "cx", "m", "m²", "m³"];

function toNumber(v: string) {
  const n = Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(value: number) {
  try {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

function formatDateTimeBR(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

function normalizeDateToISO(input: string) {
  // aceita yyyy-mm-dd (já ok) ou dd/mm/aaaa
  if (!input) return "";
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const dd = m[1];
    const mm = m[2];
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return s; // deixa como está (não quebra)
}

export default function EstoquePage() {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [lowOnly, setLowOnly] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // evita HYDRATION mismatch (data/hora)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  const updatedAtIso = useMemo(() => {
    // pega o maior createdAt (ou agora se vazio)
    const max = items.reduce((acc, it) => {
      const t = new Date(it.createdAt).getTime();
      return Number.isFinite(t) && t > acc ? t : acc;
    }, 0);
    return max ? new Date(max).toISOString() : new Date().toISOString();
  }, [items]);

  const updatedAtHuman = useMemo(() => {
    if (!mounted) return "—";
    return formatDateTimeBR(updatedAtIso);
  }, [mounted, updatedAtIso]);

  async function load() {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (busca) params.set("q", busca);
      if (categoria !== "Todas") params.set("categoria", categoria);
      if (lowOnly) params.set("low", "1");

      const res = await fetch(`/api/estoque?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Falha ao carregar");

      const json = await res.json();
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      console.error(e);
      alert("Falha ao carregar estoque.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();

    return items.filter((it) => {
      const matchBusca =
        !q ||
        it.nome.toLowerCase().includes(q) ||
        (it.local || "").toLowerCase().includes(q) ||
        (it.observacao || "").toLowerCase().includes(q);

      const matchCat = categoria === "Todas" || it.categoria === categoria;

      const isLow = it.quantidade < it.minimo;
      const matchLow = !lowOnly || isLow;

      return matchBusca && matchCat && matchLow;
    });
  }, [items, busca, categoria, lowOnly]);

  const totalItens = filtered.length;
  const totalValor = filtered.reduce(
    (acc, it) => acc + (it.quantidade || 0) * (it.valorUnitario || 0),
    0
  );
  const totalLow = filtered.filter((it) => it.quantidade < it.minimo).length;

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
      nome: item.nome || "",
      categoria: item.categoria || "Insumos",
      unidade: item.unidade || "kg",
      quantidade: String(item.quantidade ?? ""),
      minimo: String(item.minimo ?? ""),
      valorUnitario: String(item.valorUnitario ?? ""),
      local: item.local || "",
      validade: item.validade || "",
      observacao: item.observacao || "",
    });
    setShowModal(true);
  }

  async function save() {
    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      unidade: form.unidade,
      quantidade: toNumber(form.quantidade),
      minimo: toNumber(form.minimo),
      valorUnitario: toNumber(form.valorUnitario),
      local: form.local.trim(),
      validade: normalizeDateToISO(form.validade.trim()),
      observacao: form.observacao.trim(),
    };

    if (!payload.nome) {
      alert("Informe o nome do item.");
      return;
    }

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/estoque?id=${editingId}` : `/api/estoque`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Falha ao salvar");

      setShowModal(false);
      await load();
    } catch (e) {
      console.error(e);
      alert("Falha ao salvar.");
    }
  }

  async function remove(id: string) {
    const ok = confirm("Deseja remover este item do estoque?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/estoque?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");
      await load();
    } catch (e) {
      console.error(e);
      alert("Falha ao excluir.");
    }
  }

  function clearFilters() {
    setBusca("");
    setCategoria("Todas");
    setLowOnly(false);
  }

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <main className="pat-shell">
          {/* Header */}
          <div className="pat-header">
            <div>
              <div className="pat-title">Estoque de produção</div>
              <div className="pat-subtitle">
                Controle de insumos, peças, produção e itens da fazenda
              </div>
            </div>

            <div className="pat-header-actions">
              <button className="pat-btn" onClick={load} disabled={loading}>
                Recarregar
              </button>
              <button className="pat-btn pat-btn-primary" onClick={openAdd}>
                + Adicionar
              </button>
            </div>
          </div>

          {/* Métricas (igual Patrimônio) */}
          <div className="pat-grid-3">
            <div className="pat-card pat-metric">
              <div className="pat-metric-label">Itens</div>
              <div className="pat-metric-value">{totalItens}</div>
              <div className="pat-metric-hint">Total na lista (com filtros)</div>
            </div>

            <div className="pat-card pat-metric">
              <div className="pat-metric-label">Valor estimado</div>
              <div className="pat-metric-value">{formatBRL(totalValor)}</div>
              <div className="pat-metric-hint">Soma aprox. qtd × valor unit.</div>
            </div>

            <div className="pat-card pat-metric">
              <div className="pat-metric-label">Abaixo do mínimo</div>
              <div className="pat-metric-value">{totalLow}</div>
              <div className="pat-metric-hint">
                Itens com quantidade menor que o mínimo
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="pat-card pat-section">
            <div className="pat-section-title">Filtros</div>

            <div className="pat-filters">
              <div className="pat-field">
                <label className="pat-label">Buscar</label>
                <input
                  className="pat-input"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite: adubo, sementes, galpão..."
                />
              </div>

              <div className="pat-field">
                <label className="pat-label">Categoria</label>
                <select
                  className="pat-select"
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

              <label className="pat-check">
                <input
                  type="checkbox"
                  checked={lowOnly}
                  onChange={(e) => setLowOnly(e.target.checked)}
                />
                Abaixo do mínimo
              </label>

              <div className="pat-actions">
                <button className="pat-btn" onClick={clearFilters}>
                  Limpar
                </button>
                <button className="pat-btn pat-btn-primary" onClick={load}>
                  Aplicar
                </button>
              </div>
            </div>

            <div className="pat-meta">
              <span className="pat-meta-label">Atualizado</span>{" "}
              <span className="pat-meta-value">{updatedAtHuman}</span>
            </div>
          </div>

          {/* Tabela */}
          <div className="pat-card pat-section">
            <div className="pat-section-title">Itens cadastrados</div>

            {loading ? (
              <div className="pat-empty">Carregando...</div>
            ) : filtered.length === 0 ? (
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
                      <th className="pat-actions-col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((it) => {
                      const low = it.quantidade < it.minimo;
                      return (
                        <tr key={it.id} className={low ? "pat-row-low" : ""}>
                          <td className="pat-strong">{it.nome}</td>
                          <td>{it.categoria}</td>
                          <td>{it.local || "—"}</td>
                          <td>{Number(it.quantidade ?? 0).toLocaleString("pt-BR")}</td>
                          <td>{it.unidade || "—"}</td>
                          <td>{Number(it.minimo ?? 0).toLocaleString("pt-BR")}</td>
                          <td>{formatBRL(Number(it.valorUnitario ?? 0))}</td>
                          <td>{it.validade ? it.validade : "—"}</td>
                          <td className="pat-actions-col">
                            <button className="pat-btn" onClick={() => openEdit(it)}>
                              Editar
                            </button>
                            <button
                              className="pat-btn pat-btn-danger"
                              onClick={() => remove(it.id)}
                            >
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

            <div className="pat-footnote">
              Fonte: API local <b>/api/estoque</b>.
            </div>
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="pat-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="pat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pat-modal-header">
              <div>
                <div className="pat-modal-title">
                  {editingId ? "Editar item" : "Adicionar item"}
                </div>
                <div className="pat-modal-subtitle">
                  Cadastre um item do estoque da fazenda
                </div>
              </div>

              <button className="pat-btn" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>

            <div className="pat-modal-body">
              <div className="pat-grid-2">
                <div className="pat-field">
                  <label className="pat-label">Nome do item</label>
                  <input
                    className="pat-input"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex: Semente de milho"
                  />
                </div>

                <div className="pat-field">
                  <label className="pat-label">Categoria</label>
                  <select
                    className="pat-select"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pat-field">
                  <label className="pat-label">Quantidade</label>
                  <input
                    className="pat-input"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    placeholder="Ex: 120"
                  />
                </div>

                <div className="pat-field">
                  <label className="pat-label">Unidade</label>
                  <select
                    className="pat-select"
                    value={form.unidade}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                  >
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pat-field">
                  <label className="pat-label">Mínimo</label>
                  <input
                    className="pat-input"
                    value={form.minimo}
                    onChange={(e) => setForm({ ...form, minimo: e.target.value })}
                    placeholder="Ex: 20"
                  />
                </div>

                <div className="pat-field">
                  <label className="pat-label">Valor unitário (R$)</label>
                  <input
                    className="pat-input"
                    value={form.valorUnitario}
                    onChange={(e) =>
                      setForm({ ...form, valorUnitario: e.target.value })
                    }
                    placeholder="Ex: 12,50"
                  />
                </div>

                <div className="pat-field">
                  <label className="pat-label">Local</label>
                  <input
                    className="pat-input"
                    value={form.local}
                    onChange={(e) => setForm({ ...form, local: e.target.value })}
                    placeholder="Ex: Galpão 1"
                  />
                </div>

                <div className="pat-field">
                  <label className="pat-label">Validade</label>
                  <input
                    className="pat-input"
                    value={form.validade}
                    onChange={(e) => setForm({ ...form, validade: e.target.value })}
                    placeholder="dd/mm/aaaa ou yyyy-mm-dd"
                  />
                </div>
              </div>

              <div className="pat-field">
                <label className="pat-label">Observação (opcional)</label>
                <input
                  className="pat-input"
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  placeholder="Ex: Lote 23 / manter em local seco"
                />
              </div>
            </div>

            <div className="pat-modal-footer">
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
    </div>
  );
}
