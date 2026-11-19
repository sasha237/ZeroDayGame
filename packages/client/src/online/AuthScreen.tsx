import { useState } from 'react';
import { useI18n } from '../i18n';
import { api } from './api';
import type { PublicUser } from './types';

export function AuthScreen({ onAuthed, onBack, onForgot }: { onAuthed: (user: PublicUser) => void; onBack: () => void; onForgot: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onAuthed(mode === 'login' ? await api.login(email, password) : await api.register(email, password, displayName));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('authenticationFailed'));
    } finally { setBusy(false); }
  };
  return (
    <main className="mode-screen">
      <form className="auth-card" onSubmit={submit}>
        <h1 className="mode-title">ZERO DAY</h1>
        <h2>{mode === 'login' ? t('signIn') : t('createAccount')}</h2>
        {mode === 'register' && <label>{t('displayName')}<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} /></label>}
        <label>{t('email')}<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>{t('password')}<input type="password" required minLength={8} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="submit-btn big online" disabled={busy}>{mode === 'login' ? t('signIn') : t('register')}</button>
        <button type="button" className="link-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? t('createAnAccount') : t('useExistingAccount')}
        </button>
        {mode === 'login' && <button type="button" className="link-btn" onClick={onForgot}>{t('forgotPassword')}</button>}
        <button type="button" className="link-btn" onClick={onBack}>{t('backMode')}</button>
      </form>
    </main>
  );
}

export function ForgotScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { t } = useI18n();
  return (
    <main className="mode-screen"><form className="auth-card" onSubmit={async (event) => { event.preventDefault(); await api.forgot(email); setSent(true); }}>
      <h1 className="mode-title">{t('passwordReset')}</h1>
      {sent ? <p>{t('resetSent')}</p> : <>
        <label>{t('email')}<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <button className="submit-btn big online">{t('sendResetLink')}</button>
      </>}
      <button type="button" className="link-btn" onClick={onBack}>{t('backSignIn')}</button>
    </form></main>
  );
}

export function ResetScreen({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { t } = useI18n();
  return (
    <main className="mode-screen"><form className="auth-card" onSubmit={async (event) => {
      event.preventDefault();
      try { await api.reset(token, password); setDone(true); setMessage(null); }
      catch (failure) { setMessage(failure instanceof Error ? failure.message : t('resetFailed')); }
    }}>
      <h1 className="mode-title">{t('chooseNewPassword')}</h1>
      {done ? <p>{t('passwordResetDone')}</p> : <>
        <label>{t('newPassword')}<input type="password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="submit-btn big online">{t('resetPassword')}</button>
      </>}
      {message && <p className="auth-error">{message}</p>}
      <button type="button" className="link-btn" onClick={onDone}>{t('backSignIn')}</button>
    </form></main>
  );
}
