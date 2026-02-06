export default function SideFarmPanel() {
  return (
    <aside className="side-panel">
      <h2>Fazenda</h2>

      <div className="panel-section">
        <h3>Dados da Fazenda</h3>
        <ul>
          <li><strong>Nome:</strong> Fazenda Primavera</li>
          <li><strong>Local:</strong> Patos de Minas - MG</li>
          <li><strong>Área:</strong> 320 ha</li>
          <li><strong>Responsável:</strong> João Pereira</li>
        </ul>
      </div>

      <div className="panel-section">
        <h3>Funcionários</h3>
        <ul>
          <li>João Pereira — Gerente</li>
          <li>Maria Silva — Qualidade</li>
          <li>Pedro Lopes — Campo</li>
          <li>Luiza Andrade — Financeiro</li>
        </ul>
      </div>

      <div className="panel-section">
        <h3>Checklist diário</h3>
        <ul>
          <li>✅ Irrigação</li>
          <li>🟨 Alimentação animais</li>
          <li>🟨 Inspeção do maquinário</li>
        </ul>
      </div>
    </aside>
  );
}
