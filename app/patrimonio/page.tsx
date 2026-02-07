// app/patrimonio/page.tsx
"use client";

import { useMemo, useState } from "react";

type Asset = {
  id: string;
  nome: string;
  categoria: string; // Ex.: "Trator", "Implemento", "Veículo"
  status: "Ativo" | "Manutenção" | "Vendido";
  valorAquisicao: number; // R$
  dataAquisicao: string; // yyyy-mm-dd
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "").toUpperCase();
}

function toIsoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function PatrimonioPage() {
  // Exemplo de dados (depois ligamos no banco / Supabase)
  const [assets, setAssets] = useState<Asset[]>([
    { id: "1", nome: "Trator John Deere 5078E", categoria: "Trator", status: "Ativo", valorAquisicao: 265000, dataAquisicao: "2024-06-10" },
    { id: "2", nome: "Pulverizador 600L", categoria: "Implemento", status: "Manutenção", valorAquisicao: 18000, dataAquisicao: "2023-11-15" },
    { id: "3", nome: "Caminhonete", categoria: "Veículo", status: "Ativo", valorAquisicao: 145000, dataAquisicao: "2022-02-02" },
  ]);

  const [q, setQ] = useState("");
  const [farmName, setFarmName] = useState("fazenda Cachoeira");

  // período (como no print: Jan -> Jun)
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setMonth(0); // janeiro
    d.setDate(1);
    return d;
  });
  const [periodMonths, setPeriodMonths] = useState(6);

  const periodEnd = useMemo(() => {
    const d = new Date(periodStart);
    d.setMonth(d.getMonth() + periodMonths);
    d.setDate(0); // último dia do mês anterior (fim do range)
    return d;
  }, [periodStart, periodMonths]);

  const filteredAssets = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return assets;
    return assets.filter((a) =>
      [a.nome, a.categoria, a.status].some((x) => x.toLowerCase().includes(term))
    );
  }, [assets, q]);

  const totalItens = filteredAssets.length;
  const totalAquisicao = filteredAssets.reduce((acc, a) => acc + a.valorAquisicao, 0);

  // Placeholder de métricas do período (no futuro vem do Financeiro/Manutenção)
  const workedAlq = 0;
  const gastoManutencoes = 0;
  const contas = 0;
  const custosTotais = 0;

  function prevPeriod() {
    const d = new Date(periodStart);
    d.setMonth(d.getMonth() - periodMonths);
    setPeriodStart(d);
  }

  function nextPeriod() {
    const d = new Date(periodStart);
    d.setMonth(d.getMonth() + periodMonths);
    setPeriodStart(d);
  }

  function addFakeAsset() {
    const now = new Date();
    const id = String(Date.now());
    const novo: Asset = {
      id,
      nome: `Novo item ${assets.length + 1}`,
      categoria: "Outro",
      status: "Ativo",
      valorAquisicao: 0,
      dataAquisicao: toIsoDate(now),
    };
    setAssets((p) => [novo, ...p]);
  }

  return (
    <main className="pat-shell">
      {/* Topo (barra verde + seletor fazenda) */}
      <div className="pat-topbar">
        <div className="pat-topbar-inner">
          <div className="pat-logo">a</div>

          <div className="pat-farm-select">
            <span className="pat-farm-name">{farmName}</span>
            <button className="pat-farm-btn" type="button" onClick={() => setFarmName(farmName === "fazenda Cachoeira" ? "fazenda Primavera" : "fazenda Cachoeira")}>
              ▾
            </button>
          </div>

          <div className="pat-top-actions">
            <span className="pat-expire">Seu teste expira em 7 dia(s)</span>
            <button className="pat-icon-btn" title="Ajuda" type="button">?</button>
            <button className="pat-icon-btn" title="Usuário" type="button">M</button>
          </div>
        </div>
      </div>

      {/* Linha de módulos (como no print: Início, Mapa, Equipe...) */}
      <div className="pat-modules">
        <div className="pat-modules-inner">
          {["Início", "Mapa", "Equipe", "Áreas", "Safras", "Patrimônio", "Financeiro", "Fiscal"].map((m) => (
            <div key={m} className={"pat-mod " + (m === "Patrimônio" ? "active" : "")}>
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* Banner */}
      <div className="pat-banner">
        <div className="pat-banner-inner">
          <span>💎 Deixe o cálculo dos seus custos de produção por nossa conta!</span>
          <button className="pat-banner-btn" type="button">ATIVAR</button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="pat-content">
        {/* Sidebar busca */}
        <aside className="pat-sidebar">
          <div className="pat-search">
            <input
              className="pat-search-input"
              placeholder="Pesquisar patrimônio..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="pat-sidebar-actions">
            <button className="pat-side-btn" type="button" onClick={() => setQ("")}>
              Limpar busca
            </button>
          </div>

          <div className="pat-sidebar-list">
            {filteredAssets.map((a) => (
              <div key={a.id} className="pat-asset-item">
                <div className="pat-asset-title">{a.nome}</div>
                <div className="pat-asset-sub">
                  {a.categoria} • {a.status} • {brl(a.valorAquisicao)}
                </div>
              </div>
            ))}
            {!filteredAssets.length && <div className="pat-empty">Nenhum item encontrado.</div>}
          </div>
        </aside>

        {/* Main cards */}
        <section className="pat-main">
          <div className="pat-card pat-card-main">
            <div className="pat-card-head">
              <div className="pat-card-icon">🚜</div>
              <div>
                <div className="pat-card-kicker">Patrimônio</div>
                <div className="pat-card-title">
                  <strong>{totalItens}</strong> itens
                </div>
              </div>
              <div className="pat-card-right">
                <div className="pat-card-muted">Valor de aquisição</div>
                <div className="pat-card-value">{brl(totalAquisicao)}</div>
              </div>
            </div>

            <div className="pat-divider" />

            <div className="pat-section-title">CUSTOS NO PERÍODO</div>

            <div className="pat-period-row">
              <button className="pat-period-btn" onClick={prevPeriod} type="button">‹</button>
              <div className="pat-period-label">
                {monthLabel(periodStart)} — {monthLabel(periodEnd)}
              </div>
              <button className="pat-period-btn" onClick={nextPeriod} type="button">›</button>

              <div className="pat-period-spacer" />

              <label className="pat-select">
                <span>Janela</span>
                <select value={periodMonths} onChange={(e) => setPeriodMonths(Number(e.target.value))}>
                  <option value={1}>1 mês</option>
                  <option value={3}>3 meses</option>
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                </select>
              </label>
            </div>

            <div className="pat-metrics">
              <div className="pat-metric">
                <div className="pat-metric-label">Trabalhados</div>
                <div className="pat-metric-value">{workedAlq.toFixed(2)} alq</div>
              </div>

              <div className="pat-metric">
                <div className="pat-metric-label">Gastos em manutenções</div>
                <div className="pat-metric-value">{brl(gastoManutencoes)}</div>
              </div>

              <div className="pat-metric">
                <div className="pat-metric-label">Contas</div>
                <div className="pat-metric-value">{brl(contas)}</div>
              </div>

              <div className="pat-metric">
                <div className="pat-metric-label">Custos totais</div>
                <div className="pat-metric-value">{brl(custosTotais)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Botão flutuante + */}
      <button className="pat-fab" type="button" onClick={addFakeAsset} title="Adicionar item">
        +
      </button>
    </main>
  );
}
