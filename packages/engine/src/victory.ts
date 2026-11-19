import { getAdjacent, spaceId } from './board.js';
import type { GameState, Side } from './types.js';

export type InsurgentVictory = 'paired-four' | 'six-spaces' | null;

export function getInsurgentVictory(state: GameState): InsurgentVictory {
  const occupied = new Set(
    Object.values(state.pieces)
      .filter((piece) => piece.side === 'insurgent' && piece.position?.startsWith('B'))
      .map((piece) => piece.position!),
  );

  if (occupied.size >= 6) return 'six-spaces';

  const paired = [...occupied].filter((id) =>
    getAdjacent(id).some((neighbor) => neighbor.startsWith('B') && occupied.has(neighbor)),
  );
  if (paired.length >= 4) return 'paired-four';
  return null;
}

export function getWinner(state: GameState): Side | null {
  return state.winner;
}

export function victorySpaces(ring: 'B' = 'B') {
  return Array.from({ length: 12 }, (_, index) => spaceId(ring, index + 1));
}
