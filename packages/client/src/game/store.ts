import {
  applyAction,
  getInitialState,
  type GameAction,
  type GameState,
  type Side,
} from '@aw/engine';

export interface StoreState {
  game: GameState;
  handoffTo: Side | null;
  debrief: boolean;
  error: string | null;
}

export type StoreAction =
  | { type: 'act'; action: GameAction }
  | { type: 'confirmHandoff' }
  | { type: 'setDebrief'; value: boolean }
  | { type: 'reset' };

export function initStore(): StoreState {
  return { game: getInitialState(), handoffTo: null, debrief: false, error: null };
}

export function reducer(state: StoreState, action: StoreAction): StoreState {
  if (action.type === 'reset') return initStore();
  if (action.type === 'confirmHandoff') return { ...state, handoffTo: null, error: null };
  if (action.type === 'setDebrief') {
    return { ...state, debrief: state.game.phase === 'gameover' && action.value };
  }
  if (state.handoffTo || state.game.phase === 'gameover') return state;
  try {
    const game = applyAction(state.game, state.game.activeSide, action.action);
    const handoffTo = action.action.type === 'endTurn' && game.phase !== 'gameover'
      ? game.activeSide
      : null;
    return { game, handoffTo, debrief: false, error: null };
  } catch (error) {
    return { ...state, error: error instanceof Error ? error.message : 'Invalid action' };
  }
}
