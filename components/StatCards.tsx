type Card = { title: string; value: string; detail?: string };

type Props = {
  cards: Card[];
};

export default function StatCards({ cards }: Props) {
  return (
    <div className="card-grid">
      {cards.map((card) => (
        <div className="card" key={card.title}>
          <h4>{card.title}</h4>
          <p className="value">{card.value}</p>
          {card.detail && <span className="detail">{card.detail}</span>}
        </div>
      ))}
    </div>
  );
}
