import type { Card } from '../engine/types';

export function CardView({ card, hidden, small }: { card?: Card; hidden?: boolean; small?: boolean }) {
  if (hidden || !card) return <div className={`card back${small ? ' small' : ''}`} aria-label="face-down card" />;
  const red = card.suit === '♥' || card.suit === '♦';
  const r = card.rank === 'T' ? '10' : card.rank;
  return (
    <div className={`card${red ? ' red' : ''}${small ? ' small' : ''}`} aria-label={`${r}${card.suit}`}>
      <span className="rank">{r}</span>
      <span className="suit">{card.suit}</span>
    </div>
  );
}

export function CardRow({ cards, hideSecond, small }: { cards: Card[]; hideSecond?: boolean; small?: boolean }) {
  return (
    <div className="card-row">
      {cards.map((c, i) => (
        <CardView key={i} card={c} hidden={hideSecond && i === 1} small={small} />
      ))}
    </div>
  );
}
