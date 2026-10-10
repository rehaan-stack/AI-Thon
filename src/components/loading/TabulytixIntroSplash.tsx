import { useEffect, useState } from 'react';

type SplashPhase = 'visible' | 'fading';

/** The one-time app-level intro from the supplied Tabulytix landing HTML. */
export function TabulytixIntroSplash() {
  const [mounted, setMounted] = useState(true);
  const [phase, setPhase] = useState<SplashPhase>('visible');

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fadeAfter = reducedMotion ? 0 : 900;
    const removeAfter = reducedMotion ? 120 : 1200;

    const fadeTimer = window.setTimeout(() => setPhase('fading'), fadeAfter);
    const removeTimer = window.setTimeout(() => setMounted(false), removeAfter);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`tabulytix-intro-splash ${phase === 'fading' ? 'is-fading' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Tabulytix"
    >
      <svg className="tabulytix-intro-logo" viewBox="0 0 64 64" aria-hidden="true">
        <path className="intro-top" d="M32 6L58 19L32 32L6 19Z" fill="#2FA774" />
        <path className="intro-mid" d="M8 31L32 43L56 31" fill="none" stroke="#2FA774" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
        <path className="intro-bot" d="M8 43L32 55L56 43" fill="none" stroke="#B9E3CD" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
        <path className="intro-star" d="M32 12L33.8 17.2L39 19L33.8 20.8L32 26L30.2 20.8L25 19L30.2 17.2Z" fill="#FFFFFF" />
      </svg>
      <div className="intro-word">Tabulytix</div>
      <div className="intro-tag">DATA CLEANING STUDIO</div>
      <div className="intro-progress" aria-hidden="true"><span /></div>
    </div>
  );
}
