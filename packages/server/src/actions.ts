import { isSpaceId, type GameAction } from '@aw/engine';

export function parseAction(value: any): GameAction | null {
  if (!value || typeof value.type !== 'string') return null;
  if (value.type === 'finishSetup' || value.type === 'endTurn') return { type: value.type };
  if ((value.type === 'place' || value.type === 'move') &&
      typeof value.pieceId === 'string' && typeof value.to === 'string' && isSpaceId(value.to)) {
    return value.type === 'place'
      ? { type: 'place', pieceId: value.pieceId, to: value.to }
      : { type: 'move', pieceId: value.pieceId, to: value.to };
  }
  if ((value.type === 'grow' || value.type === 'kill' || value.type === 'interrogate') &&
      typeof value.at === 'string' && isSpaceId(value.at)) {
    return { type: value.type, at: value.at };
  }
  return null;
}
