import { useState } from 'react';
import { GameScreen } from '../components/GameScreen';
import { useI18n } from '../i18n';
import { api, downloadCsv } from './api';
import { PlayerReplay } from './ReplayModal';
import { useOnlineGame } from './useOnlineGame';

export function OnlineGameScreen({ gameId, onLeave, onHelp }: { gameId: string; onLeave: () => void; onHelp: () => void }) {
  const [debrief, setDebrief] = useState(false);
  const { game, error, connected, submit } = useOnlineGame(gameId, debrief);
  const [replay, setReplay] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { t } = useI18n();
  if (!game) return <main className="center-message"><div className="auth-card"><p>{error ?? t('loadingGame')}</p><button className="ghost-btn" onClick={onLeave}>{t('backLobby')}</button></div></main>;
  const over = game.view.phase === 'gameover';
  const toolbar = <>
    {!game.opponentJoined && <span className="invite-line">{t('invitePrefix')} <strong>{game.inviteCode}</strong></span>}
    <button className="ghost-btn" onClick={() => setReplay(true)}>{t('replay')}</button>
    <button className="ghost-btn" onClick={() => {
      void api.observerLink(gameId).then(async ({ url }) => {
        await navigator.clipboard.writeText(url);
        setNotice(t('facilitatorLinkCopied'));
      }).catch(() => setNotice(t('facilitatorLinkFailed')));
    }}>{t('facilitatorLink')}</button>
    <button className="ghost-btn" onClick={() => void downloadCsv(`/games/${gameId}/export.csv${debrief ? '?debrief=1' : ''}`)}>{t('exportCsv')}</button>
    {over && <label className="debrief-toggle"><input type="checkbox" checked={debrief} onChange={(event) => setDebrief(event.target.checked)} />{t('fullDebrief')}</label>}
    {notice && <span>{notice}</span>}
  </>;
  return <>
    {!connected && <div className="reconnect-banner">{t('reconnecting')}</div>}
    <GameScreen
      view={game.view}
      legalActions={game.legalActions}
      interactive={game.opponentJoined && game.side === game.view.activeSide && !over}
      onAction={(action) => { void submit(action).catch(() => undefined); }}
      onReset={onLeave}
      onHelp={onHelp}
      error={error}
      toolbar={toolbar}
    />
    {replay && <PlayerReplay gameId={gameId} maxSeq={game.view.history.length} debrief={debrief} onClose={() => setReplay(false)} />}
  </>;
}
