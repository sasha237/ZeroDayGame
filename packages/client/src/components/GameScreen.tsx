import { useEffect, useMemo, useState } from 'react';
import type { GameAction, GameView, Side, SpaceId, ViewEvent } from '@aw/engine';
import { LanguageSwitcher, useI18n, type Translator } from '../i18n';
import { Board } from './Board';

interface GameScreenProps {
  view: GameView;
  legalActions: GameAction[];
  interactive: boolean;
  onAction: (action: GameAction) => void;
  onReset: () => void;
  onHelp: () => void;
  error?: string | null;
  toolbar?: React.ReactNode;
  observer?: boolean;
}

function sideName(side: Side, t: Translator): string {
  return side === 'state' ? t('state') : t('insurgent');
}

function eventText(event: ViewEvent, t: Translator): string {
  const actor = sideName(event.actor, t);
  switch (event.type) {
    case 'place': return event.to ? t('eventDeployed', { actor, to: event.to }) : t('eventHiddenDeployment');
    case 'finishSetup': return t('eventDeploymentComplete');
    case 'move': return event.to ? t('eventMoved', { actor, from: event.from ?? '', to: event.to }) : t('eventHiddenMove', { actor });
    case 'grow': return t('eventGrew', { actor, at: event.at });
    case 'kill': return t('eventKilled', { actor, count: event.killed ?? 0, at: event.at });
    case 'interrogate': return t('eventInterrogated', {
      actor,
      at: event.at,
      revealed: event.revealed?.length ? event.revealed.join(', ') : t('noAdjacentContacts'),
    });
    case 'endTurn': return t('eventEndedTurn', { actor });
  }
}

export function GameScreen({
  view,
  legalActions,
  interactive,
  onAction,
  onReset,
  onHelp,
  error,
  toolbar,
  observer = false,
}: GameScreenProps) {
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const { t } = useI18n();
  const viewer = view.viewer;
  const ownPieces = useMemo(() => {
    const pieces = viewer === 'state' ? view.statePieces : viewer === 'insurgent' ? view.insurgents : [];
    return [...pieces].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [viewer, view.statePieces, view.insurgents]);
  const selected = ownPieces.find((piece) => piece.id === selectedPiece) ?? null;

  useEffect(() => setSelectedPiece(null), [view.activeSide, view.turn, view.phase]);

  const can = (predicate: (action: GameAction) => boolean) => interactive && legalActions.some(predicate);
  const matching = (predicate: (action: GameAction) => boolean) => legalActions.find(predicate);
  const performAction = (action: GameAction) => {
    setSelectedPiece(null);
    onAction(action);
  };

  const handleSpace = (space: SpaceId) => {
    const placement = matching((action) => action.type === 'place' && action.to === space);
    if (placement) {
      performAction(placement);
      return;
    }
    if (selectedPiece) {
      const movement = matching((action) =>
        action.type === 'move' && action.pieceId === selectedPiece && action.to === space,
      );
      if (movement) {
        performAction(movement);
        return;
      }
    }
    const occupants = ownPieces.filter((piece) => piece.position === space);
    if (occupants.length > 0) {
      const current = occupants.findIndex((piece) => piece.id === selectedPiece);
      setSelectedPiece(occupants[(current + 1) % occupants.length].id);
    } else {
      setSelectedPiece(null);
    }
  };

  const selectedAt = selected?.position ?? null;
  const acting = view.phase !== 'gameover' && interactive;
  const setupCount = view.insurgents.length;
  const positionName = (position: SpaceId | null) => position === 'Capital' ? t('capital') : position;
  const status = view.phase === 'gameover'
    ? t('sideWins', { side: sideName(view.winner!, t) })
    : view.phase === 'setup'
      ? t('deploymentStatus', { count: setupCount })
      : interactive
        ? t('turnStatus', { side: sideName(view.activeSide, t), count: view.actionsRemaining })
        : t('waitingFor', { side: sideName(view.activeSide, t) });

  return (
    <div className={`app game-app ${viewer}`}>
      <header className="topbar">
        <div className="brand"><span className="brand-dot" /><span className="neon-logo">ZERO DAY</span></div>
        <div className="topbar-center">
          <span className="turn-tracker">{t('turn', { turn: view.turn })}</span>
          <span className={`acting-title ${view.activeSide}`}>{status}</span>
        </div>
        <div className="topbar-actions">
          {observer && <span className="obs-badge-inline">{t('facilitator')}</span>}
          <button className="ghost-btn" onClick={onHelp} aria-label={t('howToPlay')}>?</button>
          <LanguageSwitcher />
          <button className="ghost-btn" onClick={onReset}>{observer ? t('exit') : t('newGame')}</button>
        </div>
      </header>
      {toolbar && <div className="game-toolbar">{toolbar}</div>}
      {error && <div className="error-banner" role="alert">{error}</div>}
      <main className="game-layout">
        <aside className="panel left-rail">
          <span className="eyebrow">{t('currentRole')}</span>
          <h2 className={`${viewer}-text`}>{observer ? t('facilitator') : sideName(viewer as Side, t)}</h2>
          <div className="counter-grid">
            <div><span>{t('killed')}</span><strong>{view.killedTotal} / 12</strong></div>
            <div><span>{t('available')}</span><strong>{view.insurgentAvailable ?? '—'}</strong></div>
            <div><span>{t('actions')}</span><strong>{view.actionsRemaining}</strong></div>
          </div>
          <section className="piece-section">
            <h3>{viewer === 'state' ? t('statePieces') : viewer === 'insurgent' ? t('yourPieces') : t('pieces')}</h3>
            <div className="piece-list">
              {ownPieces.map((piece) => (
                <button
                  key={piece.id}
                  className={selectedPiece === piece.id ? 'active' : ''}
                  disabled={!interactive}
                  onClick={() => setSelectedPiece(piece.id)}
                >
                  <span>{piece.id}</span><strong>{positionName(piece.position)}</strong>
                </button>
              ))}
            </div>
          </section>
          <div className="legend">
            <span><i className="legend-state" /> {t('state')}</span>
            <span><i className="legend-insurgent" /> {t('insurgent')}</span>
            <span><i className="legend-legal" /> {t('legalDestination')}</span>
          </div>
        </aside>

        <section className="board-wrap">
          <Board
            view={view}
            legalActions={legalActions}
            selectedPiece={selectedPiece}
            interactive={acting || (interactive && view.phase === 'setup')}
            onSpace={handleSpace}
          />
          <p className="board-instruction" aria-live="polite">
            {view.phase === 'setup'
              ? t('deployNext')
              : selected
                ? t('pieceSelected', { id: selected.id, position: positionName(selected.position) })
                : t('selectPiece')}
          </p>
        </section>

        <aside className="panel right-rail">
          <section className="actions-panel">
            <h3>{t('actions')}</h3>
            {view.phase === 'setup' ? (
              <button
                className="submit-btn insurgent"
                disabled={!can((action) => action.type === 'finishSetup')}
                onClick={() => performAction({ type: 'finishSetup' })}
              >{t('completeDeployment')}</button>
            ) : (
              <>
                {viewer === 'insurgent' && (
                  <button
                    className="action-btn grow"
                    disabled={!can((action) => action.type === 'grow' && action.at === selectedAt)}
                    onClick={() => selectedAt && performAction({ type: 'grow', at: selectedAt })}
                  >{t('grow')} <span>{t('growDetail')}</span></button>
                )}
                {viewer === 'state' && (
                  <>
                    <button
                      className="action-btn kill"
                      disabled={!can((action) => action.type === 'kill' && action.at === selectedAt)}
                      onClick={() => selectedAt && performAction({ type: 'kill', at: selectedAt })}
                    >{t('kill')} <span>{t('killDetail')}</span></button>
                    <button
                      className="action-btn interrogate"
                      disabled={!can((action) => action.type === 'interrogate' && action.at === selectedAt)}
                      onClick={() => selectedAt && performAction({ type: 'interrogate', at: selectedAt })}
                    >{t('interrogate')} <span>{t('interrogateDetail')}</span></button>
                  </>
                )}
                <button
                  className="submit-btn end-turn"
                  disabled={!can((action) => action.type === 'endTurn')}
                  onClick={() => performAction({ type: 'endTurn' })}
                >{t('passEndTurn')}</button>
              </>
            )}
          </section>
          <section className="feed-section">
            <h3>{t('actionFeed')}</h3>
            <ol className="feed" aria-live="polite">
              {[...view.history].reverse().slice(0, 30).map((event) => (
                <li key={event.seq}><span>T{event.turn}</span><p>{eventText(event, t)}</p></li>
              ))}
            </ol>
          </section>
        </aside>
      </main>
      {view.phase === 'gameover' && (
        <div className={`winner-strip ${view.winner}`} role="status">
          {t('sideWins', { side: sideName(view.winner!, t) })} — {view.winner === 'state' ? t('stateWinReason') : t('insurgentWinReason')}
        </div>
      )}
    </div>
  );
}
