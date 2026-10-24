import type { Card } from '../engine/types';

const RANK_NAME: Record<string, string> = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: '10' };
const SUIT_NAME: Record<string, string> = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
export const cardLabel = (c: Card) => `${RANK_NAME[c.rank] ?? c.rank} of ${SUIT_NAME[c.suit] ?? c.suit}`;

export function CardView({ card, hidden, small }: { card?: Card; hidden?: boolean; small?: boolean }) {
  if (hidden || !card) return <div className={`card back${small ? ' small' : ''}`} role="img" aria-label="face-down card" />;
  const red = card.suit === '♥' || card.suit === '♦';
  const r = card.rank === 'T' ? '10' : card.rank;
  return (
    <div className={`card${red ? ' red' : ''}${small ? ' small' : ''}`} role="img" aria-label={cardLabel(card)}>
      <span className="rank">{r}</span>
      <span className="suit">{card.suit}</span>
    </div>
  );
}

export function CardRow({ cards, hideSecond, small, dealer }: { cards: Card[]; hideSecond?: boolean; small?: boolean; dealer?: boolean }) {
  return (
    <div className={`card-row${dealer ? ' dealer' : ''}`}>
      {cards.map((c, i) => (
        // The hole card remounts when it turns over, so it gets the flip animation.
        <CardView key={dealer && i === 1 ? `1${hideSecond ? 'd' : 'u'}` : i} card={c} hidden={hideSecond && i === 1} small={small} />
      ))}
    </div>
  );
}
