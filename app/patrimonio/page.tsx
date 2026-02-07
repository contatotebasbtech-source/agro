"use client";

import React, { useEffect, useMemo, useState } from "react";

type CategoriaKey =
  | "Maquinas"
  | "Veiculos"
  | "Implementos"
  | "Infra"
  | "EnergiaAgua"
  | "Ferramentas"
  | "Outros";

const CATEGORIAS: { key: CategoriaKey; label: string }[] = [
  { key: "Maquinas", label: "Máquinas" },
  { key: "Veiculos", label: "Veículos" },
  { key: "Implementos", label: "Implementos" },
  { key: "Infra", label: "Infra / Oficina" },
  { key: "EnergiaAgua", label: "Energia / Água" },
  { key: "Ferramentas", label: "Ferramentas" },
  { key: "Outros", label: "Outros" },
];

const SUBTIPOS: Record<CategoriaKey, string[]> = {
  Maquinas: [
    "Trator",
    "Trator (pequeno)",
    "Trator (médio)",
    "Trator (grande)",
    "Colheitadeira",
    "Plantadeira",
    "Semeadora",
    "Pulverizador (barra)",
    "Pulverizador (costal/motorizado)",
    "Adubadora / Distribuidor",
    "Ensiladeira",
    "Carregadeira / Pá carregadeira",
    "Mini carregadeira",
    "Retroescavadeira",
    "Escavadeira",
    "Motoniveladora",
    "Roçadeira (máquina)",
    "Empilhadeira",
    "Outro (máquina)",
  ],
  Veiculos: [
    "Pick-up",
    "Caminhão",
    "Caminhão (toco)",
    "Caminhão (truck)",
    "Caminhão (bitruck)",
    "Carreta / Bitrem",
    "Moto",
    "Quadriciclo",
    "Carro",
    "Outro (veículo)",
  ],
  Implementos: [
    "Grade",
    "Arado",
    "Subsolador",
    "Roçadeira",
    "Carreta agrícola",
    "Enxada rotativa",
    "Plataforma de colheita",
    "Vagão forrageiro",
    "Sulcador",
    "Rolo compactador",
    "Outro (implemento)",
  ],
  Infra: [
    "Silo / Armazém",
    "Barracão / Galpão",
    "Curral / Brete",
    "Cercas",
    "Balança",
    "Tanque de leite",
    "Ordenhadeira",
    "Resfriador",
    "Oficina / Ferramental fixo",
    "Outro (infra)",
  ],
  EnergiaAgua: [
    "Gerador",
    "Bomba d'água",
    "Motor estacionário",
    "Irrigação (pivô)",
    "Irrigação (aspersão)",
    "Irrigação (gotejo)",
    "Poço / Captação",
    "Placas solares",
    "Outro (energia/água)",
  ],
  Ferramentas: [
    "Ferramentas manuais",
    "Ferramentas elétricas",
    "Solda / Oficina",
    "Medidores / Instrumentos",
    "Outro (ferramentas)",
  ],
  Outros: ["Outros"],
};

type PatrimonioItem = {
  id: string;
  nome: string;
  categoria?: CategoriaKey; // itens antigos podem não ter
  tipo: string; // agora é o subtipo
  valorAquisicao?: number;
  dataAquisicao?: string; // YYYY-MM-DD
  observacao?: string;
  createdAt: string; // ISO
};

const LS_KEY = "patrimonio_items_v1";

function formatBRL(v: number) {
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${v}`;
  }
}

function formatDateBR(iso?: string) {
  if (!iso) return "—";
  // iso esperado YYYY-MM-DD
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function PatrimonioPage() {
  const [items, setItems] = useState<PatrimonioItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [form, setForm] = useState({
    nome: "",
    categoria: "Maquinas" as CategoriaKey,
    tipo: SUBTIPOS.Maquinas[0],
    valorAquisicao: "",
    dataAquisicao: "",
    observacao: "",
  });

  // Filtros
  const [fCategoria, setFCategoria] = useState<CategoriaKey | "Todas">("Todas");
  const [fTipo, setFTipo] = useState<string>("Todos");
  const [search, setSearch] = useState("");

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const totalItens = items.length;
  const totalValor = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.valorAquisicao ?? 0), 0);
  }, [items]);

  const tiposFiltroDisponiveis = useMemo(() => {
    if (fCategoria === "Todas") return ["Todos"];
    return ["Todos", ...(SUBTIPOS[fCategoria] ?? ["Outros"])];
  }, [fCategoria]);

  const filtrados = useMemo(() => {
    const s = search.trim().toLowerCase();

    return items
      .map((it) => ({
        ...it,
        categoria: (it.categoria ?? "Maquinas") as CategoriaKey,
      }))
      .filter((it) => {
        if (fCategoria !== "Todas" && it.categoria !== fCategoria) return false;
        if (fTipo !== "Todos" && it.tipo !== fTipo) return false;
        if (s) {
          const hay = `${it.nome} ${it.tipo} ${it.observacao ?? ""}`.toLowerCase();
          if (!hay.includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [items, fCategoria, fTipo, search]);

  function abrirModal() {
    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
  }

  function limparForm() {
    setForm({
      nome: "",
      categoria: "Maquinas",
      tipo: SUBTIPOS.Maquinas[0],
      valorAquisicao: "",
      dataAquisicao: "",
      observacao: "",
    });
  }

  function salvarItem() {
    const nome = form.nome.trim();
    if (!nome) {
      alert("Informe o nome do item.");
      return;
    }

    const valorNum =
      form.valorAquisicao.trim() === ""
        ? undefined
        : Number(form.valorAquisicao.replace(",", "."));

    if (valorNum !== undefined && Number.isNaN(valorNum)) {
      alert("Valor de aquisição inválido.");
      return;
    }

    const novo: PatrimonioItem = {
      id: uid(),
      nome,
      categoria: form.categoria,
      tipo: form.tipo,
      valorAquisicao: valorNum,
      dataAquisicao: form.dataAquisicao || undefined,
      observacao: form.observacao.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setItems((prev) => [novo, ...prev]);
    fecharModal();
    limparForm();
  }

  function excluirItem(id: string) {
    if (!confirm("Deseja remover este item do patrimônio?")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function limparFiltros() {
    setFCategoria("Todas");
    setFTipo("Todos");
    setSearch("");
  }

  return (
    <main className="pat-page">
      <div className="pat-container">
        {/* Header */}
        <div className="pat-header">
          <div>
            <h1 className="pat-title">Patrimônio</h1>
            <p className="pat-subtitle">Controle de bens e equipamentos da fazenda</p>
          </div>

          <div className="pat-header-actions">
            <button className="pat-btn pat-btn-primary" onClick={abrirModal}>
              + Adicionar
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="pat-grid">
          <div className="pat-card pat-metric">
            <div className="pat-metric-label">Total de bens cadastrados</div>
            <div className="pat-metric-value">{totalItens}</div>
            <div className="pat-metric-hint">Itens no patrimônio</div>
          </div>

          <div className="pat-card pat-metric">
            <div className="pat-metric-label">Valor de aquisição</div>
            <div className="pat-metric-value">{formatBRL(totalValor)}</div>
            <div className="pat-metric-hint">Soma do valor informado</div>
          </div>

          <div className="pat-card pat-metric">
            <div className="pat-metric-label">Dica</div>
            <div className="pat-metric-value" style={{ fontSize: 16 }}>
              Filtros rápidos
            </div>
            <div className="pat-metric-hint">
              Use Categoria / Tipo / Busca para encontrar máquinas rápido.
            </div>
          </div>
        </div>

        {/* Filtros + Lista */}
        <div className="pat-layout">
          <div className="pat-card">
            <div className="pat-card-title">Filtros</div>

            <div className="pat-filters">
              <div className="pat-field">
                <label>Categoria</label>
                <select
                  value={fCategoria}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setFCategoria(val);
                    // ao trocar categoria, resetar tipo
                    setFTipo("Todos");
                  }}
                >
                  <option value="Todas">Todas</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pat-field">
                <label>Tipo</label>
                <select value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
                  {tiposFiltroDisponiveis.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pat-field pat-field-wide">
                <label>Buscar</label>
                <input
                  placeholder="Digite o nome (ex: Trator John Deere)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="pat-filter-actions">
                <button className="pat-btn" onClick={limparFiltros}>
                  Limpar
                </button>
                <button className="pat-btn pat-btn-ghost" onClick={abrirModal}>
                  + Adicionar item
                </button>
              </div>
            </div>
          </div>

          <div className="pat-card">
            <div className="pat-card-title">Itens cadastrados</div>

            {filtrados.length === 0 ? (
              <div className="pat-empty">
                <div className="pat-empty-title">Nenhum item cadastrado</div>
                <div className="pat-empty-subtitle">
                  Clique em <b>+ Adicionar</b> para cadastrar seu primeiro item.
                </div>
              </div>
            ) : (
              <div className="pat-table-wrap">
                <table className="pat-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Categoria</th>
                      <th>Tipo</th>
                      <th>Valor (R$)</th>
                      <th>Data</th>
                      <th>Obs.</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((it) => {
                      const cat = (it.categoria ?? "Maquinas") as CategoriaKey;
                      const catLabel =
                        CATEGORIAS.find((c) => c.key === cat)?.label ?? "Máquinas";

                      return (
                        <tr key={it.id}>
                          <td className="pat-td-strong">{it.nome}</td>
                          <td>{catLabel}</td>
                          <td>{it.tipo}</td>
                          <td>{it.valorAquisicao != null ? formatBRL(it.valorAquisicao) : "—"}</td>
                          <td>{formatDateBR(it.dataAquisicao)}</td>
                          <td className="pat-td-muted">{it.observacao ?? "—"}</td>
                          <td className="pat-td-actions">
                            <button
                              className="pat-btn pat-btn-danger"
                              onClick={() => excluirItem(it.id)}
                              title="Excluir"
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
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="pat-modal-backdrop" onMouseDown={fecharModal}>
          <div className="pat-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pat-modal-header">
              <div>
                <div className="pat-modal-title">Adicionar item</div>
                <div className="pat-modal-subtitle">Cadastre um bem do patrimônio da fazenda</div>
              </div>
              <button className="pat-btn" onClick={fecharModal}>
                Fechar
              </button>
            </div>

            <div className="pat-modal-body">
              <div className="pat-form-grid">
                <div className="pat-field pat-field-wide">
                  <label>Nome do item</label>
                  <input
                    placeholder="Ex: Trator John Deere"
                    value={form.nome}
                    onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  />
                </div>

                <div className="pat-field">
                  <label>Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => {
                      const cat = e.target.value as CategoriaKey;
                      const primeiro = SUBTIPOS[cat]?.[0] ?? "Outros";
                      setForm((p) => ({ ...p, categoria: cat, tipo: primeiro }));
                    }}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pat-field">
                  <label>Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
                  >
                    {(SUBTIPOS[form.categoria] ?? ["Outros"]).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pat-field">
                  <label>Valor de aquisição (R$)</label>
                  <input
                    placeholder="Ex: 280000"
                    value={form.valorAquisicao}
                    onChange={(e) => setForm((p) => ({ ...p, valorAquisicao: e.target.value }))}
                  />
                </div>

                <div className="pat-field">
                  <label>Data de aquisição</label>
                  <input
                    type="date"
                    value={form.dataAquisicao}
                    onChange={(e) => setForm((p) => ({ ...p, dataAquisicao: e.target.value }))}
                  />
                </div>

                <div className="pat-field pat-field-wide">
                  <label>Observação (opcional)</label>
                  <input
                    placeholder="Ex: Manutenção em dia"
                    value={form.observacao}
                    onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="pat-modal-footer">
              <button
                className="pat-btn"
                onClick={() => {
                  limparForm();
                  fecharModal();
                }}
              >
                Cancelar
              </button>
              <button className="pat-btn pat-btn-primary" onClick={salvarItem}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS local (não depende do Tailwind) */}
      <style jsx>{`
        .pat-page {
          min-height: calc(100vh - 0px);
          padding: 24px 16px 56px;
        }
        .pat-container {
          max-width: 1180px;
          margin: 0 auto;
        }

        .pat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
          padding: 18px 18px;
          border-radius: 16px;
          background: rgba(12, 26, 16, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
        }
        .pat-title {
          font-size: 32px;
          font-weight: 800;
          margin: 0;
        }
        .pat-subtitle {
          margin: 4px 0 0;
          opacity: 0.8;
        }

        .pat-btn {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: inherit;
          padding: 10px 14px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
        }
        .pat-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .pat-btn-primary {
          background: rgba(42, 167, 61, 0.25);
          border-color: rgba(42, 167, 61, 0.45);
        }
        .pat-btn-primary:hover {
          background: rgba(42, 167, 61, 0.34);
        }
        .pat-btn-ghost {
          background: transparent;
        }
        .pat-btn-danger {
          background: rgba(220, 38, 38, 0.16);
          border-color: rgba(220, 38, 38, 0.35);
        }
        .pat-btn-danger:hover {
          background: rgba(220, 38, 38, 0.22);
        }

        .pat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 14px;
        }
        .pat-card {
          border-radius: 16px;
          background: rgba(12, 26, 16, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          padding: 14px;
        }
        .pat-card-title {
          font-weight: 900;
          margin-bottom: 10px;
          opacity: 0.95;
        }
        .pat-metric-label {
          font-size: 12px;
          opacity: 0.75;
        }
        .pat-metric-value {
          font-size: 22px;
          font-weight: 900;
          margin-top: 6px;
        }
        .pat-metric-hint {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.7;
        }

        .pat-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .pat-filters {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          align-items: end;
        }
        .pat-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pat-field label {
          font-size: 12px;
          opacity: 0.75;
          font-weight: 700;
        }
        .pat-field input,
        .pat-field select {
          height: 40px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: inherit;
          outline: none;
        }
        .pat-field input::placeholder {
          opacity: 0.7;
        }
        .pat-field-wide {
          grid-column: span 2;
        }
        .pat-filter-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .pat-empty {
          padding: 18px;
          border-radius: 14px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.03);
        }
        .pat-empty-title {
          font-weight: 900;
          margin-bottom: 6px;
        }
        .pat-empty-subtitle {
          opacity: 0.8;
        }

        .pat-table-wrap {
          width: 100%;
          overflow: auto;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .pat-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }
        .pat-table th,
        .pat-table td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          vertical-align: middle;
          text-align: left;
        }
        .pat-table th {
          font-size: 12px;
          opacity: 0.75;
          font-weight: 900;
          background: rgba(255, 255, 255, 0.03);
        }
        .pat-td-strong {
          font-weight: 900;
        }
        .pat-td-muted {
          opacity: 0.8;
          max-width: 260px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pat-td-actions {
          text-align: right;
        }

        .pat-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          z-index: 9999;
        }
        .pat-modal {
          width: min(860px, 100%);
          border-radius: 18px;
          background: rgba(10, 22, 14, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          overflow: hidden;
        }
        .pat-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .pat-modal-title {
          font-weight: 900;
          font-size: 18px;
        }
        .pat-modal-subtitle {
          font-size: 12px;
          opacity: 0.75;
          margin-top: 2px;
        }
        .pat-modal-body {
          padding: 14px;
        }
        .pat-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .pat-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        @media (max-width: 980px) {
          .pat-grid {
            grid-template-columns: 1fr;
          }
          .pat-filters {
            grid-template-columns: 1fr;
          }
          .pat-field-wide {
            grid-column: span 1;
          }
          .pat-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
