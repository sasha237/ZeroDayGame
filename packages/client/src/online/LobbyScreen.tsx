import { useEffect, useState } from 'react';
import type { Side } from '@aw/engine';
import { useI18n } from '../i18n';
import { api } from './api';
import type { GameSummary, PublicUser } from './types';

export function LobbyScreen({ user, onActive, onLoggedOut, onBack }: {
  user: PublicUser;
  onActive: (id: string) => void;
  onLoggedOut: () => void;
  onBack: () => void;
}) {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [side, setSide] = useState<Side>('state');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const load = async () => {
    try { setGames((await api.activeGames()).games); }
    catch (failure) { setError(failure instanceof Error ? failure.message : t('lobbyLoadFailed')); }
  };
  useEffect(() => { void load(); }, []);
  const run = async (operation: () => Promise<{ id: string }>) => {
    try { setError(null); onActive((await operation()).id); }
    catch (failure) { setError(failure instanceof Error ? failure.message : t('lobbyActionFailed')); }
  };
  return (
    <main className="mode-screen"><div className="lobby-card">
      <div className="lobby-user"><span>{user.displayName || user.email}</span><button className="link-btn" onClick={() => void api.logout().then(onLoggedOut)}>{t('signOut')}</button></div>
      <h1 className="mode-title">{t('gameLobby')}</h1>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <section className="lobby-section"><h2>{t('createGame')}</h2><div className="side-picker">
        {(['state', 'insurgent'] as Side[]).map((value) => <label key={value} className={`side-option ${value} ${side === value ? 'active' : ''}`}>
          <input type="radio" name="side" checked={side === value} onChange={() => setSide(value)} />{value === 'state' ? t('state') : t('insurgent')}
        </label>)}
      </div><button className="submit-btn online" onClick={() => void run(() => api.createGame(side))}>{t('createInvite')}</button></section>
      <div className="lobby-divider">{t('orJoin')}</div>
      <form className="lobby-section" onSubmit={(event) => { event.preventDefault(); void run(() => api.joinGame(code)); }}>
        <input className="code-input" required maxLength={8} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t('inviteCode')} />
        <button className="submit-btn online">{t('joinGame')}</button>
      </form>
      {games.length > 0 && <section className="lobby-section"><h2>{t('yourGames')}</h2>{games.map((game) => <button className="saved-game" key={game.id} onClick={() => onActive(game.id)}>
        <span>{game.side === 'state' ? t('state') : t('insurgent')} · {t('turn', { turn: game.turn })}</span><strong>{game.winner
          ? t('sideWon', { side: game.winner === 'state' ? t('state') : t('insurgent') })
          : game.opponentJoined
            ? game.phase === 'setup' ? t('setupPhase') : game.phase === 'playing' ? t('playingPhase') : t('gameoverPhase')
            : t('invite', { code: game.inviteCode })}</strong>
      </button>)}</section>}
      <button className="link-btn" onClick={onBack}>{t('backMode')}</button>
    </div></main>
  );
}
