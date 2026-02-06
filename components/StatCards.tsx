export default function StatCards({cards}:{cards:any[]}){
  return (
    <div className="card-grid">
      {cards.map((c,i)=>(
        <div key={i} className="card">
          <h4>{c.title}</h4>
          <p>{c.value}</p>
        </div>
      ))}
    </div>
  )
}
