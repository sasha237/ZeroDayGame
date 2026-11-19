import type { Side } from '@aw/engine';
import { useI18n } from '../i18n';

export function HandoffScreen({ nextSide, onConfirm }: { nextSide: Side; onConfirm: () => void }) {
  const { t } = useI18n();
  const label = nextSide === 'state' ? t('state') : t('insurgent');
  return (
    <div className="screen handoff">
      <div className={`handoff-card ${nextSide}`}>
        <span className="eyebrow">{t('privacyHandoff')}</span>
        <h2>{t('passDevice', { side: label })}</h2>
        <p>{t('privacyText')}</p>
        <button className={`submit-btn big ${nextSide}`} onClick={onConfirm}>{t('beginTurn', { side: label })}</button>
      </div>
    </div>
  );
}
