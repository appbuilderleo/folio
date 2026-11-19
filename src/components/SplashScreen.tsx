import { useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const timer = window.setTimeout(onComplete, prefersReduced ? 650 : 1900);

    const onKeyDown = () => onComplete();
    window.addEventListener('keydown', onKeyDown, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onComplete]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fólio — A página certa para cada dúvida. Toque para avançar."
      onClick={onComplete}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onComplete();
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-parchment px-6 py-12 cursor-pointer select-none"
    >
      <div className="h-6" aria-hidden="true" />

      <div className="flex flex-col items-center text-center folio-enter">
        <img
          src="/assets/folio-logo.png"
          alt="Fólio"
          width={220}
          height={56}
          className="h-12 sm:h-14 w-auto object-contain"
        />
        <p className="mt-5 font-editorial italic text-[15px] sm:text-base text-ink-soft tracking-[0.01em]">
          A página certa para cada dúvida.
        </p>
      </div>

      <div className="w-full max-w-[200px] flex flex-col items-center gap-3 pb-safe">
        <div
          className="w-full h-[3px] rounded-full bg-sand overflow-hidden"
          aria-hidden="true"
        >
          <div className="h-full w-full rounded-full bg-gradient-to-r from-forest via-forest to-amber splash-progress" />
        </div>
        <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-ink-muted">
          Toque para entrar
        </span>
      </div>
    </div>
  );
}
