import { useEffect, useReducer, useState } from 'react';
import { getLegalActions, getPlayerView, type GameAction } from '@aw/engine';
import { GameScreen } from './components/GameScreen';
import { HandoffScreen } from './components/HandoffScreen';
import { HelpModal } from './components/HelpModal';
import { initStore, reducer } from './game/store';
import { LanguageSwitcher, useI18n } from './i18n';
import { api, getToken } from './online/api';
import { AuthScreen, ForgotScreen, ResetScreen } from './online/AuthScreen';
import { LobbyScreen } from './online/LobbyScreen';
import { ObserverScreen } from './online/ObserverScreen';
import { OnlineGameScreen } from './online/OnlineGameScreen';
import { parseHash, type Route } from './online/route';
import type { PublicUser } from './online/types';

function ModeScreen({ onHotseat, onOnline }: { onHotseat: () => void; onOnline: () => void }) {
  const { t } = useI18n();
  return (
    <main className="mode-screen">
      <LanguageSwitcher />
      <div className="mode-card">
        <span className="eyebrow">{t('menuEyebrow')}</span>
        <h1 className="mode-title">ZERO DAY</h1>
        <p>{t('menuTagline')}</p>
        <button className="submit-btn big" onClick={onHotseat}>{t('playHotseat')}</button>
        <button className="submit-btn big online" onClick={onOnline}>{t('playOnline')}</button>
      </div>
    </main>
  );
}

function HotseatApp({ onExit }: { onExit: () => void }) {
  const [store, dispatch] = useReducer(reducer, undefined, initStore);
  const [helpOpen, setHelpOpen] = useState(false);
  const { t } = useI18n();
  const view = getPlayerView(store.game, store.game.activeSide, store.debrief);
  const legalActions = store.handoffTo || store.game.phase === 'gameover' ? [] : getLegalActions(store.game, store.game.activeSide);
  if (store.handoffTo) return <div className="app"><HandoffScreen nextSide={store.handoffTo} onConfirm={() => dispatch({ type: 'confirmHandoff' })} /></div>;
  return <>
    <GameScreen
      view={view}
      legalActions={legalActions}
      interactive={store.game.phase !== 'gameover'}
      onAction={(action: GameAction) => dispatch({ type: 'act', action })}
      onReset={onExit}
      onHelp={() => setHelpOpen(true)}
      error={store.error}
      toolbar={store.game.phase === 'gameover' ? <label className="debrief-toggle">
        <input type="checkbox" checked={store.debrief} onChange={(event) => dispatch({ type: 'setDebrief', value: event.target.checked })} />{t('fullDebrief')}
      </label> : undefined}
    />
    {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
  </>;
}

export default function App() {
  const initial = parseHash(location.hash);
  const [route, setRoute] = useState<Route>(initial);
  const [mode, setMode] = useState<'menu' | 'hotseat' | 'online'>(initial.kind === 'game' ? 'online' : 'menu');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [gameId, setGameId] = useState<string | null>(initial.kind === 'game' ? initial.id : null);
  const [forgot, setForgot] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const changed = () => {
      const next = parseHash(location.hash);
      setRoute(next);
      if (next.kind === 'game') { setMode('online'); setGameId(next.id); }
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    if (mode === 'online' && getToken()) {
      void api.me().then((result) => setUser(result.user)).catch(() => setUser(null));
    }
  }, [mode]);

  const leaveGame = () => { location.hash = ''; setGameId(null); setRoute({ kind: 'home' }); };
  if (route.kind === 'observe') return <ObserverScreen token={route.token} onExit={() => { location.hash = ''; setRoute({ kind: 'home' }); }} />;
  if (route.kind === 'reset') return <ResetScreen token={route.token} onDone={() => { location.hash = ''; setRoute({ kind: 'home' }); setMode('online'); }} />;
  if (mode === 'hotseat') return <HotseatApp onExit={() => setMode('menu')} />;
  if (mode === 'menu') return <ModeScreen onHotseat={() => setMode('hotseat')} onOnline={() => setMode('online')} />;
  if (forgot) return <ForgotScreen onBack={() => setForgot(false)} />;
  if (!user) return <AuthScreen onAuthed={setUser} onBack={() => { leaveGame(); setMode('menu'); }} onForgot={() => setForgot(true)} />;
  return <>
    {gameId ? <OnlineGameScreen gameId={gameId} onLeave={leaveGame} onHelp={() => setHelpOpen(true)} /> : <LobbyScreen
      user={user}
      onActive={(id) => { location.hash = `#/game/${id}`; setGameId(id); }}
      onLoggedOut={() => { leaveGame(); setUser(null); }}
      onBack={() => setMode('menu')}
    />}
    {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
  </>;
}
