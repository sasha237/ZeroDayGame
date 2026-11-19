import { useState } from 'react';
import { GameScreen } from '../components/GameScreen';
import { HelpModal } from '../components/HelpModal';
import { useI18n } from '../i18n';
import { downloadCsv } from './api';
import { ObserverReplay } from './ReplayModal';
import { useObserver } from './useOnlineGame';

export function ObserverScreen({ token, onExit }: { token: string; onExit: () => void }) {
  const { game, error, connected } = useObserver(token);
  const [replay, setReplay] = useState(false);
  const [help, setHelp] = useState(false);
  const { t } = useI18n();
  if (!game) return <main className="center-message"><div className="auth-card"><p>{error ?? t('loadingFacilitator')}</p><button className="ghost-btn" onClick={onExit}>{t('exit')}</button></div></main>;
  return <>
    {!connected && <div className="reconnect-banner">{t('reconnectingFacilitator')}</div>}
    <GameScreen
      view={game.view}
      legalActions={[]}
      interactive={false}
      onAction={() => undefined}
      onReset={onExit}
      onHelp={() => setHelp(true)}
      error={error}
      observer
      toolbar={<>
        <button className="ghost-btn" onClick={() => setReplay(true)}>{t('replay')}</button>
        <button className="ghost-btn" onClick={() => void downloadCsv(`/observe/${token}/export.csv`, false)}>{t('exportCsv')}</button>
      </>}
    />
    {replay && <ObserverReplay token={token} maxSeq={game.view.history.length} onClose={() => setReplay(false)} />}
    {help && <HelpModal onClose={() => setHelp(false)} />}
  </>;
}
