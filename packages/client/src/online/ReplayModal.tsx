import { useEffect, useState } from 'react';
import type { GameView } from '@aw/engine';
import { GameScreen } from '../components/GameScreen';
import { HelpModal } from '../components/HelpModal';
import { useI18n } from '../i18n';
import { api } from './api';

export function ReplayModal({ maxSeq, getView, onClose, observer = false }: {
  maxSeq: number;
  getView: (seq: number) => Promise<GameView>;
  onClose: () => void;
  observer?: boolean;
}) {
  const [seq, setSeq] = useState(maxSeq);
  const [view, setView] = useState<GameView | null>(null);
  const [help, setHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  useEffect(() => {
    let active = true;
    getView(seq).then((value) => { if (active) setView(value); }).catch((failure) => {
      if (active) setError(failure instanceof Error ? failure.message : t('replayFailed'));
    });
    return () => { active = false; };
  }, [seq, getView]);
  return (
    <div className="replay-screen"><div className="replay-card">
      <div className="replay-head"><h2>{t('actionReplay')}</h2><button className="ghost-btn" onClick={onClose}>{t('closeReplay')}</button></div>
      <div className="replay-bar">
        <button className="ghost-btn" onClick={() => setSeq(Math.max(0, seq - 1))}>−</button>
        <input aria-label={t('replayAction')} type="range" min={0} max={maxSeq} value={seq} onChange={(event) => setSeq(Number(event.target.value))} />
        <button className="ghost-btn" onClick={() => setSeq(Math.min(maxSeq, seq + 1))}>+</button>
        <span>{seq} / {maxSeq}</span>
      </div>
      {error && <p className="auth-error">{error}</p>}
      {view ? <GameScreen
        view={view}
        legalActions={[]}
        interactive={false}
        onAction={() => undefined}
        onReset={onClose}
        onHelp={() => setHelp(true)}
        observer={observer}
      /> : <p>{t('loadingReplay')}</p>}
      {help && <HelpModal onClose={() => setHelp(false)} />}
    </div></div>
  );
}

export function PlayerReplay({ gameId, maxSeq, debrief, onClose }: { gameId: string; maxSeq: number; debrief: boolean; onClose: () => void }) {
  return <ReplayModal maxSeq={maxSeq} onClose={onClose} getView={async (seq) => (await api.replay(gameId, seq, debrief)).view} />;
}

export function ObserverReplay({ token, maxSeq, onClose }: { token: string; maxSeq: number; onClose: () => void }) {
  return <ReplayModal maxSeq={maxSeq} onClose={onClose} observer getView={async (seq) => (await api.observerReplay(token, seq)).view} />;
}
