export default function TodoAlerts({todos,alerts}:{todos:string[],alerts:string[]}){
  return (
    <div>
      <ul>{todos.map(t=><li key={t}>{t}</li>)}</ul>
      <ul>{alerts.map(a=><li key={a}>{a}</li>)}</ul>
    </div>
  )
}
