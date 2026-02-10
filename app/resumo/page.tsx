"use client";

import { useEffect, useMemo, useState } from "react";

type Urgente = {
  id: string;
  modulo: "Estoque" | "Insumos";
  nome: string;
  categoria: string | null;
  unidade: string | null;
  quantidade: number;
  minimo: number;
  valor_unitario: number;
  local: string | null;
  validade: string | null;
  low: boolean;
  expSoon: boolean;
  expired: boolean;
  daysToExpire: number | null;
  severity: number;
};

type ResumoPayload = {
  meta: {
    vencEmDias: number;
    limit: number;
    total: number;
    lowCount: number;
    expSoonCount: number;
    expiredCount: number;
    valorTotal: number;
  };
  urgentes: Urgente[];
};

function brl(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function safeJson(res: Response) {
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : {};
  } catch {
    return { error: txt || "Resposta inválida" };
  }
}

function statusLabel(u: Urgente) {
  if (u.expired) return "Vencido";
  if (u.expSoon) return "Vencendo";
  if (u.low) return "Baixo estoque";
  return "OK";
}

function statusHint(u: Urgente) {
  if (u.expired) return `Venceu há ${Math.abs(u.daysToExpire ?? 0)} dia(s)`;
  if (u.expSoon) return `Vence em ${u.daysToExpire} dia(s)`;
  if (u.low) return `Qtd ${u.quantidade} < mín ${u.minimo}`;
  return "";
}

export default function ResumoPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResumoPayload | null>(null);

  // filtros (estilo estoque)
  const [modulo, setModulo] = useState<"Todos" | "Estoque" | "Insumos">("Todos");
  const [busca, setBusca] = useState("");
  const [apenasCriticos, setApenasCriticos] = useState(true);
  const [venc, setVenc] = useState(30);

  const updatedAt = useMemo(() => new Date().toLocaleString("pt-BR"), [loading]); // re-render após carregar

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/resumo?venc=${encodeURIComponent(venc)}&limit=200`, { cache: "no-store" });
      const json = (await safeJson(res)) as any;

      if (!res.ok) throw new Error(json?.error || `Falha ao carregar (${res.status})`);

      setData(json);
    } catch (e: any) {
      alert(e?.message || "Falha ao carregar");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const urgentesFiltrados = useMemo(() => {
    const arr = data?.urgentes || [];
    const q = busca.trim().toLowerCase();

    return arr.filter((u) => {
      if (modulo !== "Todos" && u.modulo !== modulo) return false;
      if (apenasCriticos && u.severity === 0) return false;

      if (q) {
        const blob = [u.nome, u.categoria, u.local, u.modulo, u.validade]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }

      return true;
    });
  }, [data, modulo, busca, apenasCriticos]);

  const meta = data?.meta;

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <main className="pat-shell">
          {/* HEADER */}
          <div className="pat-header">
            <div>
              <div className="pat-title">Resumo</div>
              <div className="pat-subtitle">Alertas e prioridades do Estoque + Insumos.</div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="pat-btn" onClick={load}>
                Recarregar
              </button>
            </div>
          </div>

          {/* CARDS */}
          <div className="pat-metrics">
            <div className="pat-metric">
              <div className="pat-metric-label">Total de itens</div>
              <div className="pat-metric-value">{meta ? meta.total : "—"}</div>
              <div className="pat-metric-hint">Estoque + Insumos</div>
            </div>

            <div className="pat-metric">
              <div className="pat-metric-label">Baixo estoque</div>
              <div className="pat-metric-value">{meta ? meta.lowCount : "—"}</div>
              <div className="pat-metric-hint">Qtd menor que mínimo</div>
            </div>

            <div className="pat-metric">
              <div className="pat-metric-label">Vencendo (≤ {venc} dias)</div>
              <div className="pat-metric-value">{meta ? meta.expSoonCount : "—"}</div>
              <div className="pat-metric-hint">Itens com validade próxima</div>
            </div>

            <div className="pat-metric">
              <div className="pat-metric-label">Vencidos</div>
              <div className="pat-metric-value">{meta ? meta.expiredCount : "—"}</div>
              <div className="pat-metric-hint">Validade já passou</div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="pat-card">
            <div className="pat-card-title">Filtros</div>

            <div className="pat-form-grid">
              <div className="pat-field">
                <label>Módulo</label>
                <select className="pat-select" value={modulo} onChange={(e) => setModulo(e.target.value as any)}>
                  <option value="Todos">Todos</option>
                  <option value="Estoque">Estoque</option>
                  <option value="Insumos">Insumos</option>
                </select>
              </div>

              <div className="pat-field">
                <label>Janela de vencimento</label>
                <select className="pat-select" value={String(venc)} onChange={(e) => setVenc(Number(e.target.value))}>
                  <option value="7">7 dias</option>
                  <option value="15">15 dias</option>
                  <option value="30">30 dias</option>
                  <option value="45">45 dias</option>
                  <option value="60">60 dias</option>
                  <option value="90">90 dias</option>
                </select>
              </div>

              <div className="pat-field">
                <label>&nbsp;</label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.9 }}>
                  <input type="checkbox" checked={apenasCriticos} onChange={(e) => setApenasCriticos(e.target.checked)} />
                  Apenas críticos
                </label>
              </div>
            </div>

            <div className="pat-form-row">
              <input
                className="pat-input"
                placeholder="Buscar por nome, categoria, local, validade…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />

              <div className="pat-actions" style={{ marginLeft: "auto" }}>
                <button
                  className="pat-btn"
                  onClick={() => {
                    setModulo("Todos");
                    setBusca("");
                    setApenasCriticos(true);
                    setVenc(30);
                    setTimeout(() => load(), 0);
                  }}
                >
                  Limpar
                </button>
                <button className="pat-btn" onClick={load}>
                  Aplicar
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
              Atualizado <b>{updatedAt}</b>
            </div>
          </div>

          {/* LISTA DE PRIORIDADES */}
          <div className="pat-card">
            <div className="pat-card-title">Prioridades</div>

            {loading ? (
              <div style={{ marginTop: 10, opacity: 0.9 }}>Carregando…</div>
            ) : !urgentesFiltrados.length ? (
              <div style={{ marginTop: 10, opacity: 0.9 }}>
                Nenhum alerta encontrado com os filtros atuais.
              </div>
            ) : (
              <div style={{ marginTop: 10, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ opacity: 0.9 }}>
                      <th style={thStyle}>Módulo</th>
                      <th style={thStyle}>Item</th>
                      <th style={thStyle}>Categoria</th>
                      <th style={thStyle}>Local</th>
                      <th style={thStyle}>Qtd</th>
                      <th style={thStyle}>Mín</th>
                      <th style={thStyle}>Validade</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Atalho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urgentesFiltrados.map((u) => {
                      const rowStyle =
                        u.expired ? rowExpired : u.expSoon ? rowSoon : u.low ? rowLow : undefined;

                      const href = u.modulo === "Estoque" ? "/estoque" : "/insumos";

                      return (
                        <tr key={`${u.modulo}-${u.id}`} style={rowStyle}>
                          <td style={tdStyleStrong}>{u.modulo}</td>
                          <td style={tdStyleStrong}>{u.nome}</td>
                          <td style={tdStyle}>{u.categoria || "—"}</td>
                          <td style={tdStyle}>{u.local || "—"}</td>
                          <td style={tdStyle}>{u.quantidade}</td>
                          <td style={tdStyle}>{u.minimo}</td>
                          <td style={tdStyle}>{u.validade || "—"}</td>
                          <td style={tdStyle}>
                            <b>{statusLabel(u)}</b>
                            <div style={{ fontSize: 12, opacity: 0.85 }}>{statusHint(u)}</div>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                            <a className="pat-btn" href={href}>
                              Abrir {u.modulo}
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
              Dica: “Vencidos” e “Vencendo” têm prioridade maior que “Baixo estoque”.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 10px",
  borderBottom: "1px solid rgba(255,255,255,.10)",
  fontSize: 12,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid rgba(255,255,255,.06)",
  fontSize: 13,
  opacity: 0.95,
};

const tdStyleStrong: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 800,
};

const rowExpired: React.CSSProperties = {
  background: "rgba(180, 40, 40, 0.18)",
};

const rowSoon: React.CSSProperties = {
  background: "rgba(180, 120, 20, 0.14)",
};

const rowLow: React.CSSProperties = {
  background: "rgba(120, 160, 40, 0.10)",
};
