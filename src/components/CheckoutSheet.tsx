import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Lock, ShieldCheck, Smartphone, X } from 'lucide-react';
import type { Manual, PaymentOperator, UnlockReceipt } from '../types/folio';

interface CheckoutSheetProps {
  manual: Manual;
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

export function CheckoutSheet({ manual, onClose, onUnlockSuccess }: CheckoutSheetProps) {
  const [operator, setOperator] = useState<PaymentOperator>('mpesa');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [step, setStep] = useState<'form' | 'ussd' | 'confirmed'>('form');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'confirmed') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  const error = validateMzPhone(operator, phoneDigits);
  const canSubmit = phoneDigits.length === 9 && !error;

  const handleOperatorSwitch = (next: PaymentOperator) => {
    setOperator(next);
    setTouched(false);
  };

  const handleStartPush = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setStep('ussd');
  };

  const handleConfirmPin = () => {
    setStep('confirmed');
    const reference = `FL-${new Date().getFullYear()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;

    const receipt: UnlockReceipt = {
      manualId: manual.id,
      operator,
      phone: phoneDigits,
      amountMt: manual.priceMt,
      reference,
      unlockedAt: new Date().toISOString(),
      syncedOffline: true,
    };

    window.setTimeout(() => {
      onUnlockSuccess(receipt);
    }, 680);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/55 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'confirmed') onClose();
      }}
    >
      <div className="w-full max-w-md bg-ivory rounded-t-[26px] sm:rounded-[26px] border-t sm:border border-sand shadow-[var(--shadow-sheet)] px-5 pt-3 pb-6 pb-safe sheet-enter">
        {/* Grab Handle */}
        <div className="w-10 h-1 rounded-full bg-sand-strong mx-auto mb-3 sm:hidden" aria-hidden="true" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-forest">
              Taxa de Sincronização Offline
            </p>
            <h2 id="checkout-title" className="mt-1 text-[19px] font-extrabold text-ink leading-snug">
              {manual.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={step === 'confirmed'}
            aria-label="Fechar janela de pagamento"
            className="w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-parchment cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Summary Strip */}
        <div className="mt-4 rounded-2xl bg-parchment/85 border border-sand px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-ink-soft">Total único</p>
            <p className="text-[11px] text-ink-muted">Acesso vitalício offline neste dispositivo</p>
          </div>
          <span className="text-[22px] font-extrabold text-ink tabular-nums">
            {manual.priceMt},00 MT
          </span>
        </div>

        {step === 'form' && (
          <form onSubmit={handleStartPush} className="mt-5 space-y-4">
            {/* Operator Selection */}
            <div>
              <span className="block text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted mb-2">
                Escolhe a carteira móvel
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOperatorSwitch('mpesa')}
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
                  onClick={() => handleOperatorSwitch('emola')}
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

            {/* Phone Number Field */}
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
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setPhoneDigits(digits);
                  }}
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
              <span>Enviar Pedido Push — {manual.priceMt} MT</span>
            </button>

            <p className="text-[11px] text-center text-ink-muted flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-forest" aria-hidden="true" />
              <span>Armazenamento encriptado dentro do aplicativo Fólio</span>
            </p>
          </form>
        )}

        {step === 'ussd' && (
          <div className="mt-5 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-forest/10 text-forest flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin" aria-hidden="true" />
            </div>

            <div>
              <h3 className="text-[17px] font-extrabold text-ink">
                Pedido Push USSD enviado
              </h3>
              <p className="mt-1.5 text-[13.5px] text-ink-soft leading-relaxed">
                Verifica o ecrã do número{' '}
                <strong className="text-ink tabular-nums">
                  +258 {formatMzDisplay(phoneDigits)}
                </strong>{' '}
                ({operator === 'mpesa' ? 'M-Pesa' : 'e-Mola'}) e introduz o teu PIN para aprovar{' '}
                <strong className="text-ink tabular-nums">{manual.priceMt},00 MT</strong>.
              </p>
            </div>

            <div className="rounded-xl bg-parchment border border-sand p-3 text-left text-[12px] text-ink-soft">
              <span className="font-bold text-forest block mb-0.5">Ambiente de Protótipo Interativo</span>
              Clica abaixo para simular a confirmação do PIN na rede móvel e iniciar a sincronização
              encriptada offline.
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmPin}
                className="w-full min-h-[52px] rounded-2xl bg-forest hover:bg-forest-hover text-ivory font-bold text-[15px] flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Lock className="w-4 h-4 text-amber" aria-hidden="true" />
                <span>Simular Confirmação de PIN</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('form')}
                className="min-h-[42px] text-[13px] font-semibold text-ink-muted hover:text-ink cursor-pointer"
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
            <h3 className="text-[18px] font-extrabold text-ink">Pagamento confirmado</h3>
            <p className="text-[13.5px] text-ink-soft">
              A abrir o leitor offline e a encriptar o manual para este dispositivo…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
