export const sections = {
  Geral: {
    subtitle: 'Visão geral da propriedade',
    cards: [
      { title: 'Produção total (mês)', value: '1.280 sc', detail: '+6% vs mês anterior' },
      { title: 'Custo operacional', value: 'R$ 94.200', detail: 'Meta: R$ 90.000' },
      { title: 'Mão de obra ativa', value: '18 pessoas' },
      { title: 'Maquinário', value: '12 ativos', detail: '2 em manutenção' },
    ],
    todos: ['Validar relatórios semanais', 'Conferir estoque de insumos', 'Atualizar cronograma agrícola'],
    alerts: ['Irrigação setorial precisa de revisão', 'Reserva de diesel abaixo de 20%'],
  },
  Cafe: {
    subtitle: 'Talhões, produtividade e qualidade',
    cards: [
      { title: 'Talhões ativos', value: '6' },
      { title: 'Produtividade', value: '36 sc/ha' },
      { title: 'Secagem', value: '68% concluída' },
      { title: 'Qualidade', value: '84 pts' },
    ],
    todos: ['Monitorar umidade dos grãos', 'Agendar prova de xícara'],
    alerts: ['Talhão C com risco de pragas'],
  },
  Leite: {
    subtitle: 'Rebanho leiteiro e coleta',
    cards: [
      { title: 'Produção diária', value: '2.350 L' },
      { title: 'Vacas em lactação', value: '120' },
      { title: 'Qualidade (CCS)', value: '280 mil' },
      { title: 'Refrigeração', value: 'OK' },
    ],
    todos: ['Revisar dieta do lote 3', 'Agendar visita do veterinário'],
    alerts: ['Tanque 2 com manutenção preventiva'],
  },
  Gado: {
    subtitle: 'Engorda e sanidade',
    cards: [
      { title: 'Cabeças', value: '420' },
      { title: 'Ganho médio/dia', value: '0,85 kg' },
      { title: 'Pasto disponível', value: '75%' },
      { title: 'Sanidade', value: '98% OK' },
    ],
    todos: ['Planejar rotação de pastagens', 'Conferir sal mineral'],
    alerts: ['Piquete 7 precisa de adubação'],
  },
  Milho: {
    subtitle: 'Safra e estoque',
    cards: [
      { title: 'Área plantada', value: '140 ha' },
      { title: 'Estimativa safra', value: '980 t' },
      { title: 'Umidade', value: '14%' },
      { title: 'Estoque silo', value: '52%' },
    ],
    todos: ['Agendar colheita', 'Revisar manutenção da colheitadeira'],
    alerts: ['Previsão de chuvas fortes em 48h'],
  },
  Peixe: {
    subtitle: 'Tanques e alimentação',
    cards: [
      { title: 'Tanques ativos', value: '8' },
      { title: 'Biomassa', value: '12,4 t' },
      { title: 'Conversão alimentar', value: '1,6' },
      { title: 'Qualidade da água', value: 'Boa' },
    ],
    todos: ['Verificar oxigenação', 'Registrar mortalidade diária'],
    alerts: ['Tanque 5 com PH abaixo do ideal'],
  },
  Soja: {
    subtitle: 'Plantio e manejo',
    cards: [
      { title: 'Área plantada', value: '200 ha' },
      { title: 'Estágio fenológico', value: 'R3' },
      { title: 'Produtividade estimada', value: '62 sc/ha' },
      { title: 'Insumos', value: '85% disponível' },
    ],
    todos: ['Aplicar fungicida', 'Atualizar mapa de aplicação'],
    alerts: ['Monitorar lagarta em área norte'],
  },
  Outros: {
    subtitle: 'Projetos especiais e novas receitas',
    cards: [
      { title: 'Horta', value: 'Ativa' },
      { title: 'Energia solar', value: '42% do consumo' },
      { title: 'Turismo rural', value: '4 visitas/semana' },
      { title: 'Compostagem', value: '2 t/mês' },
    ],
    todos: ['Planejar calendário de visitas', 'Expandir compostagem'],
    alerts: ['Revisar licenças ambientais'],
  },
};
