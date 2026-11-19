import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n';

export function HelpModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<Element | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    restoreRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusables = () => Array.from(
      dialog?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [],
    ).filter((element) => !element.hasAttribute('disabled'));
    focusables()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      } else if (event.key === 'Tab') {
        const items = focusables();
        const first = items[0];
        const last = items.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      (restoreRef.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('howToPlay')} ref={dialogRef} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{t('howToPlay')}</h2>
          <button className="ghost-btn" onClick={onClose}>{t('close')}</button>
        </div>
        <div className="modal-body rules-help">
          <section>
            <h3>{t('objective')}</h3>
            <p><strong className="state-text">{t('state')}:</strong> {t('helpStateObjective')}</p>
            <p><strong className="insurgent-text">{t('insurgent')}:</strong> {t('helpInsurgentObjective')}</p>
          </section>
          <section>
            <h3>{t('turn', { turn: '' }).trim()}</h3>
            <p>{t('helpTurn')}</p>
          </section>
          <section>
            <h3>{t('informationAndGrowth')}</h3>
            <p>{t('helpInformation')}</p>
          </section>
          <section>
            <h3>{t('stateActions')}</h3>
            <p>{t('helpStateActions')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
