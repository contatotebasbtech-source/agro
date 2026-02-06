type Props = {
  todos: string[];
  alerts: string[];
};

export default function TodoAlerts({ todos, alerts }: Props) {
  return (
    <div className="section-rows">
      <div className="row">
        <h3>Atividades</h3>
        <ul>
          {todos.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="row">
        <h3>Alertas</h3>
        <ul>
          {alerts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
