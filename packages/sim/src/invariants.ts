import { isSpaceId, type GameState } from '@aw/engine';

export function assertInvariants(state: GameState): void {
  const pieces = Object.values(state.pieces);
  const statePieces = pieces.filter((piece) => piece.side === 'state');
  const insurgents = pieces.filter((piece) => piece.side === 'insurgent');
  const livingInsurgents = insurgents.filter((piece) => piece.position !== null);
  if (statePieces.length !== 5 || statePieces.some((piece) => piece.position === null)) throw new Error('State must always have five living pieces');
  if (insurgents.length !== 15) throw new Error('Insurgent identity count must be 15');
  if (!Number.isInteger(state.killedTotal) || state.killedTotal < 0) throw new Error('Invalid killed count');
  if (!Number.isInteger(state.insurgentAvailable) || state.insurgentAvailable < 0 || state.insurgentAvailable > 15) throw new Error('Invalid available pool');
  if (state.phase !== 'setup' && livingInsurgents.length + state.insurgentAvailable !== 15) throw new Error('Living and available Insurgents must total 15');
  if (state.phase === 'setup' && (livingInsurgents.length > 5 || state.insurgentAvailable !== 10)) throw new Error('Invalid setup pool');
  if (state.actionsRemaining < 0 || state.actionsRemaining > 2) throw new Error('Invalid action allowance');
  for (const piece of pieces) {
    if (piece.position && !isSpaceId(piece.position)) throw new Error(`Unknown position ${piece.position}`);
    if (piece.side === 'insurgent' && piece.position === 'Capital') throw new Error('Insurgent entered Capital');
  }
  state.history.forEach((record, index) => {
    if (record.seq !== index + 1) throw new Error('History sequence is not contiguous');
  });
  if (state.phase === 'gameover') {
    if (!state.winner) throw new Error('Game over requires a winner');
    if (state.winner === 'state' && state.killedTotal < 12) throw new Error('State won below 12 kills');
  } else if (state.winner) throw new Error('Active game cannot have a winner');
}
