import type { Card, Rank, Suit } from '../engine/types';

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];

export type Rng = () => number;

export class Shoe {
  cards: Card[] = [];
  private cutIndex = 0;
  constructor(public decks: number, private rng: Rng = Math.random, public penetration = 0.75) {
    this.shuffle();
  }
  shuffle() {
    const cards: Card[] = [];
    for (let d = 0; d < this.decks; d++) for (const s of SUITS) for (const r of RANKS) cards.push({ rank: r, suit: s });
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    this.cards = cards;
    this.cutIndex = Math.floor(cards.length * (1 - this.penetration));
  }
  get needsShuffle() {
    return this.cards.length <= this.cutIndex;
  }
  get remaining() {
    return this.cards.length;
  }
  draw(): Card {
    if (this.cards.length === 0) this.shuffle();
    return this.cards.pop()!;
  }
  /** Remove a specific rank (any suit) from the shoe, for constructing targeted deals. */
  take(pred: (c: Card) => boolean): Card | null {
    for (let i = this.cards.length - 1; i >= 0; i--) {
      if (pred(this.cards[i])) return this.cards.splice(i, 1)[0];
    }
    return null;
  }
}
