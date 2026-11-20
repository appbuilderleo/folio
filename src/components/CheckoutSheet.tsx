import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Lock, ShieldCheck, Smartphone, X } from 'lucide-react';
import { unlockCurriculum } from '../lib/apiClient';
import type { PaymentOperator, TopicSearchItem, UnlockReceipt } from '../types/folio';

interface CheckoutSheetProps {
  topic: TopicSearchItem;
  userEmail: string;
  onClose: () => void;
  onUnlockSuccess: (receipt: UnlockReceipt) => void;
}

function validateMzPhone(operator: PaymentOperator, rawDigits: string): string | null {
  if (rawDigits.length === 0) return null;
  if (rawDigits.length < 9) return 'Introduz os 9 dígitos do número moçambicano.';
  if (operator === 'mpesa' && !/^8[45]/.test(rawDigits)) {
    return 'M-Pesa (Vodacom) requer um número começado por 84 ou 85.';
  }
  if (operator === 'emola' && !/^8[67]/.test(rawDigits)) {
    return 'e-Mola (Movitel) requer um número começado por 86 ou 87.';
  }
  return null;
}

function formatMzDisplay(digits: string): string {
  const clean = digits.slice(0, 9);
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)} ${clean.slice(2)}`;
  return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`;
}

export function CheckoutSheet({
  topic,
  userEmail,
  onClose,
  onUnlockSuccess,
}: CheckoutSheetProps) {
  const [operator, setOperator] = useState<PaymentOperator>('mpesa');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [step, setStep] = useState<'form' | 'ussd' | 'confirming' | 'confirmed'>('form');
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'confirming' && step !== 'confirmed') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  const error = validateMzPhone(operator, phoneDigits);
  const canSubmit = phoneDigits.length === 9 && !error;

  const handleStartPush = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (!canSubmit) return;
    setStep('ussd');
  };

  const handleConfirmPin = async () => {
    setStep('confirming');
    setServerError(null);
    try {
      const { receipt } = await unlockCurriculum(topic.curriculumId, operator, phoneDigits);
      setStep('confirmed');
      window.setTimeout(() => {
        onUnlockSuccess(receipt);
      }, 620);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Não foi possível concluir o pagamento.');
      setStep('ussd');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/55 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'confirming' && step !== 'confirmed') onClose();
      }}
    >
      <div className="w-full max-w-md bg-ivory rounded-t-[26px] sm:rounded-[26px] border-t sm:border border-sand shadow-[var(--shadow-sheet)] px-5 pt-3 pb-6 pb-safe sheet-enter">
        <div className="w-10 h-1 rounded-full bg-sand-strong mx-auto mb-3 sm:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-forest">
              Taxa de Sincronização Offline
            </p>
            <h2 id="checkout-title" className="mt-1 text-[19px] font-extrabold text-ink leading-snug">
              {topic.subject} · {topic.grade}
            </h2>
            <p className="text-[12px] text-ink-muted mt-0.5 truncate">Conta: {userEmail}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={step === 'confirming' || step === 'confirmed'}
            aria-label="Fechar pagamento"
            className="w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-parchment cursor-pointer shrink-0 disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Summary */}
        <div className="mt-4 rounded-2xl bg-parchment/85 border border-sand px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-ink-soft">Taxa única</p>
            <p className="text-[11px] text-ink-muted">
              Acesso completo e offline a toda a matéria na tua conta
            </p>
          </div>
          <span className="text-[22px] font-extrabold text-ink tabular-nums shrink-0 ml-2">
            {topic.priceMt},00 MT
          </span>
        </div>

        {serverError && (
          <div
            role="alert"
            className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 flex items-start gap-2 text-[12.5px] font-medium text-red-800"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleStartPush} className="mt-5 space-y-4">
            <div>
              <span className="block text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted mb-2">
                Escolhe a carteira móvel
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setOperator('mpesa');
                    setTouched(false);
                  }}
                  aria-pressed={operator === 'mpesa'}
                  className={`min-h-[64px] p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    operator === 'mpesa'
                      ? 'bg-forest text-ivory border-forest shadow-sm'
                      : 'bg-parchment/45 text-ink border-sand-strong hover:border-forest/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-extrabold">M-Pesa</span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        operator === 'mpesa' ? 'bg-amber' : 'bg-red-600/75'
                      }`}
                    />
                  </div>
                  <span
                    className={`block mt-0.5 text-[11px] font-medium ${
                      operator === 'mpesa' ? 'text-ivory/80' : 'text-ink-muted'
                    }`}
                  >
                    Vodacom · 84 / 85
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOperator('emola');
                    setTouched(false);
                  }}
                  aria-pressed={operator === 'emola'}
                  className={`min-h-[64px] p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    operator === 'emola'
                      ? 'bg-forest text-ivory border-forest shadow-sm'
                      : 'bg-parchment/45 text-ink border-sand-strong hover:border-forest/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-extrabold">e-Mola</span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        operator === 'emola' ? 'bg-amber' : 'bg-orange-500/80'
                      }`}
                    />
                  </div>
                  <span
                    className={`block mt-0.5 text-[11px] font-medium ${
                      operator === 'emola' ? 'text-ivory/80' : 'text-ink-muted'
                    }`}
                  >
                    Movitel · 86 / 87
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="mz-phone"
                className="block text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted mb-1.5"
              >
                Número {operator === 'mpesa' ? 'Vodacom (84/85)' : 'Movitel (86/87)'}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-[14px] font-bold text-ink-soft select-none tabular-nums">
                  +258
                </span>
                <input
                  id="mz-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder={operator === 'mpesa' ? '84 123 4567' : '86 123 4567'}
                  value={formatMzDisplay(phoneDigits)}
                  onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  onBlur={() => setTouched(true)}
                  className="w-full min-h-[52px] pl-16 pr-4 rounded-2xl bg-parchment/55 border border-sand-strong text-[16px] font-bold text-ink tracking-wide tabular-nums placeholder:font-normal placeholder:text-ink-muted focus:border-forest"
                />
              </div>

              {touched && error ? (
                <p role="alert" className="mt-1.5 text-[12px] font-semibold text-red-700">
                  {error}
                </p>
              ) : (
                <p className="mt-1.5 text-[11.5px] text-ink-muted">
                  Receberás um pedido Push USSD no teu telemóvel para confirmar com o PIN.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full min-h-[52px] rounded-2xl font-extrabold text-[15px] flex items-center justify-center gap-2 transition-all tabular-nums ${
                canSubmit
                  ? 'bg-amber hover:bg-amber-hover active:scale-[0.985] text-ink cursor-pointer shadow-[0_8px_20px_-8px_rgba(234,146,34,0.65)]'
                  : 'bg-sand text-ink-muted cursor-not-allowed'
              }`}
            >
              <Smartphone className="w-4 h-4" aria-hidden="true" />
              <span>Enviar Pedido Push — {topic.priceMt} MT</span>
            </button>

            <p className="text-[11px] text-center text-ink-muted flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-forest" aria-hidden="true" />
              <span>Acesso encriptado guardado em Minhas Matérias</span>
            </p>
          </form>
        )}

        {(step === 'ussd' || step === 'confirming') && (
          <div className="mt-5 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-forest/10 text-forest flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin" aria-hidden="true" />
            </div>

            <div>
              <h3 className="text-[17px] font-extrabold text-ink">
                {step === 'confirming' ? 'A confirmar pagamento…' : 'Pedido Push USSD enviado'}
              </h3>
              <p className="mt-1.5 text-[13.5px] text-ink-soft leading-relaxed">
                Verifica o ecrã do número{' '}
                <strong className="text-ink tabular-nums">
                  +258 {formatMzDisplay(phoneDigits)}
                </strong>{' '}
                ({operator === 'mpesa' ? 'M-Pesa' : 'e-Mola'}) e introduz o PIN para confirmar{' '}
                <strong className="text-ink tabular-nums">{topic.priceMt},00 MT</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={step === 'confirming'}
                onClick={handleConfirmPin}
                className="w-full min-h-[52px] rounded-2xl bg-forest hover:bg-forest-hover text-ivory font-bold text-[15px] flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-65"
              >
                <Lock className="w-4 h-4 text-amber" aria-hidden="true" />
                <span>
                  {step === 'confirming' ? 'A registar acesso…' : 'Confirmar PIN (Simulação)'}
                </span>
              </button>

              <button
                type="button"
                disabled={step === 'confirming'}
                onClick={() => setStep('form')}
                className="min-h-[42px] text-[13px] font-semibold text-ink-muted hover:text-ink cursor-pointer disabled:opacity-40"
              >
                Alterar número
              </button>
            </div>
          </div>
        )}

        {step === 'confirmed' && (
          <div className="mt-6 py-4 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-forest text-ivory flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-amber" aria-hidden="true" />
            </div>
            <h3 className="text-[18px] font-extrabold text-ink">Acesso desbloqueado</h3>
            <p className="text-[13.5px] text-ink-soft">
              A sincronizar e encriptar a matéria para estudo offline…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
