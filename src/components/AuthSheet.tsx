import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Lock, Mail, ShieldCheck, X } from 'lucide-react';
import { loginAccount, registerAccount } from '../lib/apiClient';
import type { AuthSessionState } from '../types/folio';

interface AuthFormProps {
  reason?: string;
  onSuccess: (session: AuthSessionState) => void;
  defaultMode?: 'login' | 'register';
}

export function AuthCardContent({ reason, onSuccess, defaultMode = 'register' }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const session =
        mode === 'register'
          ? await registerAccount(email, password)
          : await loginAccount(email, password);
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível autenticar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {reason && (
        <p className="text-[13.5px] text-ink-soft leading-relaxed mb-4">{reason}</p>
      )}

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-parchment border border-sand mb-4">
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError(null);
          }}
          className={`min-h-[38px] rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
            mode === 'register' ? 'bg-forest text-ivory shadow-xs' : 'text-ink-soft hover:text-ink'
          }`}
        >
          Criar Conta
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          className={`min-h-[38px] rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
            mode === 'login' ? 'bg-forest text-ivory shadow-xs' : 'text-ink-soft hover:text-ink'
          }`}
        >
          Entrar
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 flex items-start gap-2 text-[12.5px] font-medium text-red-800"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label
            htmlFor="auth-email"
            className="block text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted mb-1.5"
          >
            E-mail
          </label>
          <div className="relative flex items-center">
            <Mail
              className="w-4 h-4 text-ink-muted absolute left-3.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              placeholder="nome@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-parchment/55 border border-sand-strong text-[15px] text-ink placeholder:text-ink-muted focus:border-forest"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="block text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted mb-1.5"
          >
            Senha
          </label>
          <div className="relative flex items-center">
            <Lock
              className="w-4 h-4 text-ink-muted absolute left-3.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-parchment/55 border border-sand-strong text-[15px] text-ink placeholder:text-ink-muted focus:border-forest"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[50px] rounded-2xl bg-forest hover:bg-forest-hover active:scale-[0.985] text-ivory font-bold text-[15px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-65 shadow-[0_8px_20px_-10px_rgba(8,59,39,0.5)]"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          <span>{mode === 'register' ? 'Criar conta e continuar' : 'Entrar na minha conta'}</span>
        </button>

        <p className="pt-1 text-[11.5px] text-center text-ink-muted flex items-center justify-center gap-1.5 leading-snug">
          <ShieldCheck className="w-3.5 h-3.5 text-forest shrink-0" aria-hidden="true" />
          <span>1 dispositivo ativo por conta (novo login encerra o dispositivo anterior).</span>
        </p>
      </form>
    </div>
  );
}

interface AuthSheetProps {
  title: string;
  reason: string;
  defaultMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (session: AuthSessionState) => void;
}

export function AuthSheet({
  title,
  reason,
  defaultMode = 'register',
  onClose,
  onSuccess,
}: AuthSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-sheet-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/55 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-ivory rounded-t-[26px] sm:rounded-[26px] border-t sm:border border-sand shadow-[var(--shadow-sheet)] px-5 pt-3 pb-6 pb-safe sheet-enter">
        <div className="w-10 h-1 rounded-full bg-sand-strong mx-auto mb-3 sm:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-forest">
              Conta Fólio
            </p>
            <h2 id="auth-sheet-title" className="mt-0.5 text-[19px] font-extrabold text-ink">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-parchment cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <AuthCardContent reason={reason} defaultMode={defaultMode} onSuccess={onSuccess} />
      </div>
    </div>
  );
}
