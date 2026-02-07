'use client';

import { useMemo, useState } from 'react';

type AssetType = 'Máquina' | 'Veículo' | 'Implemento' | 'Imóvel' | 'Outros';

type Asset = {
  id: string;
  nome: string;
  tipo: AssetType;
  valorAquisicao: number;
  dataAquisicao: string; // yyyy-mm-dd
  observacao?: string;
};

function moneyBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function PatrimonioPage() {
  // Dados iniciais (depois vamos trocar por API/banco)
  const [items, setItems] = useState<Asset[]>([
    {
      id: uid(),
      nome: 'Trator 4x4',
      tipo: 'Máquina',
      valorAquisicao: 280000,
      dataAquisicao: '2024-05-10',
      observacao: 'Revisão em dia',
    },
    {
      id: uid(),
      nome: 'Pulverizador 600L',
      tipo: 'Implemento',
      valorAquisicao: 45000,
      dataAquisicao: '2023-09-18',
    },
  ]);

  const [modalOpen, setModalOpen] = useState(false);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<AssetType>('Máquina');
  const [valorAquisicao, setValorAquisicao] = useState<string>('');
  const [dataAquisicao, setDataAquisicao] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');

  const metrics = useMemo(() => {
    const totalItens = items.length;
    const totalAquisicao = items.reduce((acc, it) => acc + (it.valorAquisicao || 0), 0);

    const porTipo = items.reduce<Record<string, number>>((acc, it) => {
      acc[it.tipo] = (acc[it.tipo] || 0) + 1;
      return acc;
    }, {});

    const topTipo = Object.entries(porTipo).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    return { totalItens, totalAquisicao, topTipo };
  }, [items]);

  function resetForm() {
    setNome('');
    setTipo('Máquina');
    setValorAquisicao('');
    setDataAquisicao('');
    setObservacao('');
  }

  function addItem() {
    const v = Number(String(valorAquisicao).replace(/\./g, '').replace(',', '.'));
    if (!nome.trim()) return alert('Informe o nome do item.');
    if (!dataAquisicao) return alert('Informe a data de aquisição.');
    if (!Number.isFinite(v) || v <= 0) return alert('Informe um valor de aquisição válido.');

    const newItem: Asset = {
      id: uid(),
      nome: nome.trim(),
      tipo,
      valorAquisicao: v,
      dataAquisicao,
      observacao: observacao.trim() ? observacao.trim() : undefined,
    };

    setItems((prev) => [newItem, ...prev]);
    setModalOpen(false);
    resetForm();
  }

  function removeItem(id: string) {
    if (!confirm('Remover este item do patrimônio?')) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <main className="pat-wrap">
      {/* Barra superior (estilo “seção” da imagem) */}
      <div className="pat-topbar">
        <div className="pat-topbar-left">
          <div className="pat-title">Patrimônio</div>
          <div className="pat-subtitle">Controle de bens e equipamentos da fazenda</div>
        </div>

        <button className="pat-btn pat-btn-primary" onClick={() => setModalOpen(true)}>
          + Adicionar
        </button>
      </div>

      {/* Cards métricas */}
      <section className="pat-grid">
        <div className="pat-card">
          <div className="pat-card-head">
            <div className="pat-icon">🚜</div>
            <div>
              <div className="pat-metric-label">Patrimônio</div>
              <div className="pat-metric-value">{metrics.totalItens} itens</div>
            </div>
          </div>
          <div className="pat-muted">Total de bens cadastrados</div>
        </div>

        <div className="pat-card">
          <div className="pat-card-head">
            <div className="pat-icon">💰</div>
            <div>
              <div className="pat-metric-label">Valor de aquisição</div>
              <div className="pat-metric-value">{moneyBRL(metrics.totalAquisicao)}</div>
            </div>
          </div>
          <div className="pat-muted">Soma dos valores de compra</div>
        </div>

        <div className="pat-card">
          <div className="pat-card-head">
            <div className="pat-icon">📌</div>
            <div>
              <div className="pat-metric-label">Tipo mais comum</div>
              <div className="pat-metric-value">{metrics.topTipo}</div>
            </div>
          </div>
          <div className="pat-muted">Ajuda a entender o perfil</div>
        </div>
      </section>

      {/* Lista */}
      <section className="pat-panel">
        <div className="pat-panel-head">
          <div className="pat-panel-title">Itens cadastrados</div>

          <div className="pat-hint">
            Dica: depois vamos ligar isso ao banco para ficar 100% funcional.
          </div>
        </div>

        <div className="pat-table-wrap">
          <table className="pat-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Tipo</th>
                <th>Data</th>
                <th className="right">Valor</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pat-empty">
                    Nenhum item cadastrado ainda.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div className="pat-item-name">{it.nome}</div>
                      {it.observacao ? <div className="pat-item-sub">{it.observacao}</div> : null}
                    </td>
                    <td>
                      <span className="pat-badge">{it.tipo}</span>
                    </td>
                    <td>{new Date(it.dataAquisicao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="right">{moneyBRL(it.valorAquisicao)}</td>
                    <td className="right">
                      <button className="pat-btn pat-btn-ghost" onClick={() => removeItem(it.id)}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal */}
      {modalOpen && (
        <div className="pat-modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <div className="pat-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pat-modal-head">
              <div>
                <div className="pat-modal-title">Adicionar item</div>
                <div className="pat-muted">Cadastre um bem do patrimônio da fazenda</div>
              </div>
              <button className="pat-btn pat-btn-ghost" onClick={() => setModalOpen(false)}>
                Fechar
              </button>
            </div>

            <div className="pat-form">
              <label className="pat-field">
                <span>Nome do item</span>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Trator John Deere" />
              </label>

              <label className="pat-field">
                <span>Tipo</span>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as AssetType)}>
                  <option>Máquina</option>
                  <option>Veículo</option>
                  <option>Implemento</option>
                  <option>Imóvel</option>
                  <option>Outros</option>
                </select>
              </label>

              <label className="pat-field">
                <span>Valor de aquisição (R$)</span>
                <input
                  value={valorAquisicao}
                  onChange={(e) => setValorAquisicao(e.target.value)}
                  placeholder="Ex: 280000"
                  inputMode="decimal"
                />
              </label>

              <label className="pat-field">
                <span>Data de aquisição</span>
                <input value={dataAquisicao} onChange={(e) => setDataAquisicao(e.target.value)} type="date" />
              </label>

              <label className="pat-field pat-field-full">
                <span>Observação (opcional)</span>
                <input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: Manutenção em dia" />
              </label>
            </div>

            <div className="pat-modal-actions">
              <button
                className="pat-btn pat-btn-ghost"
                onClick={() => {
                  resetForm();
                  setModalOpen(false);
                }}
              >
                Cancelar
              </button>

              <button className="pat-btn pat-btn-primary" onClick={addItem}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS local (não depende de Tailwind) */}
      <style jsx>{`
        .pat-wrap {
          padding: 18px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .pat-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.10);
          backdrop-filter: blur(8px);
          margin-bottom: 14px;
        }

        .pat-title {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }

        .pat-subtitle {
          opacity: 0.85;
          font-size: 13px;
          margin-top: 2px;
        }

        .pat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        }

        @media (max-width: 980px) {
          .pat-grid {
            grid-template-columns: 1fr;
          }
        }

        .pat-card {
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.10);
          padding: 14px;
        }

        .pat-card-head {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 8px;
        }

        .pat-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.10);
          font-size: 18px;
        }

        .pat-metric-label {
          font-size: 12px;
          opacity: 0.85;
        }

        .pat-metric-value {
          font-size: 18px;
          font-weight: 900;
          margin-top: 2px;
        }

        .pat-muted {
          font-size: 12px;
          opacity: 0.80;
        }

        .pat-panel {
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.10);
          overflow: hidden;
        }

        .pat-panel-head {
          padding: 14px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
        }

        .pat-panel-title {
          font-size: 16px;
          font-weight: 900;
        }

        .pat-hint {
          font-size: 12px;
          opacity: 0.80;
        }

        .pat-table-wrap {
          overflow: auto;
        }

        .pat-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }

        .pat-table th,
        .pat-table td {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          vertical-align: top;
        }

        .pat-table th {
          text-align: left;
          font-size: 12px;
          opacity: 0.85;
          font-weight: 700;
          white-space: nowrap;
        }

        .right {
          text-align: right;
        }

        .pat-item-name {
          font-weight: 900;
        }

        .pat-item-sub {
          font-size: 12px;
          opacity: 0.85;
          margin-top: 2px;
        }

        .pat-badge {
          display: inline-flex;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.12);
          white-space: nowrap;
        }

        .pat-empty {
          padding: 22px 14px;
          opacity: 0.85;
        }

        .pat-btn {
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: inherit;
          border-radius: 12px;
          padding: 9px 12px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 120ms ease, background 120ms ease;
        }

        .pat-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-1px);
        }

        .pat-btn:active {
          transform: translateY(0px);
        }

        .pat-btn-primary {
          background: rgba(80, 220, 120, 0.20);
          border-color: rgba(80, 220, 120, 0.35);
        }

        .pat-btn-primary:hover {
          background: rgba(80, 220, 120, 0.26);
        }

        .pat-btn-ghost {
          background: transparent;
        }

        .pat-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: grid;
          place-items: center;
          padding: 16px;
          z-index: 50;
        }

        .pat-modal {
          width: 100%;
          max-width: 720px;
          border-radius: 18px;
          background: rgba(15, 30, 18, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .pat-modal-head {
          padding: 14px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
        }

        .pat-modal-title {
          font-size: 16px;
          font-weight: 900;
        }

        .pat-form {
          padding: 14px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .pat-field {
          display: grid;
          gap: 6px;
          font-size: 12px;
          opacity: 0.95;
        }

        .pat-field-full {
          grid-column: 1 / -1;
        }

        .pat-field input,
        .pat-field select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.08);
          color: inherit;
          outline: none;
        }

        .pat-field input:focus,
        .pat-field select:focus {
          border-color: rgba(120, 255, 170, 0.45);
        }

        .pat-modal-actions {
          padding: 14px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.10);
        }
      `}</style>
    </main>
  );
}
