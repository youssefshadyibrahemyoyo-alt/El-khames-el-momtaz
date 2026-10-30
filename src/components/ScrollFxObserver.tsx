import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type ScrollFxObserverProps = {
  screenKey: string;
};

const REVEAL_SELECTOR = [
  '[data-scroll-reveal]',
  '.market-player-card',
  '.leaderboard-player',
  '.record-showcase-card',
  '.news-stream-card',
  '.match-card',
  '.h2h-fixture-card',
  '.cup-tie-card',
].join(', ');

export default function ScrollFxObserver({ screenKey }: ScrollFxObserverProps) {
  const { t } = useLanguage();
  const barRef = useRef<HTMLDivElement | null>(null);
  const [showBackTop, setShowBackTop] = useState(false);

  // 1. Passive rAF scroll progress bar + hero parallax variable + back-to-top visibility
  useEffect(() => {
    let rafId = 0;

    const updateOnScroll = () => {
      rafId = 0;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const progress = maxScroll > 24 ? Math.min(1, Math.max(0, y / maxScroll)) : 0;

      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
        barRef.current.style.opacity = progress > 0.01 ? '1' : '0';
      }

      document.documentElement.style.setProperty(
        '--scroll-y',
        `${Math.min(y, 420).toFixed(1)}px`
      );
      setShowBackTop(y > 440);
    };

    const requestTick = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateOnScroll);
      }
    };

    updateOnScroll();
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', requestTick);
      window.removeEventListener('resize', requestTick);
    };
  }, [screenKey]);

  // 2. IntersectionObserver + MutationObserver for scroll-reveal cards below the fold
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let batchCounter = 0;
    let batchResetTimer: number | null = null;

    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const delayMs = Math.min(batchCounter * 42, 210);
          batchCounter += 1;
          el.style.setProperty('--reveal-delay', `${delayMs}ms`);
          el.classList.add('is-inview');
          el.classList.remove('scroll-reveal-pending');
          io.unobserve(el);
        }

        if (batchResetTimer) window.clearTimeout(batchResetTimer);
        batchResetTimer = window.setTimeout(() => {
          batchCounter = 0;
        }, 120);
      },
      {
        threshold: 0.07,
        rootMargin: '0px 0px -22px 0px',
      }
    );

    const registerTargets = (root: ParentNode) => {
      const nodes = root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
      const vh = window.innerHeight || 800;

      nodes.forEach(node => {
        if (node.dataset.fxBound === '1') return;
        node.dataset.fxBound = '1';

        const rect = node.getBoundingClientRect();
        // Immediately mark elements already on screen so above-the-fold never flashes
        if (rect.top < vh * 0.94 && rect.bottom > 0) {
          node.classList.add('is-inview');
        } else {
          node.classList.add('scroll-reveal-pending');
          io.observe(node);
        }
      });
    };

    const mainEl = document.querySelector('.main') ?? document.body;
    registerTargets(mainEl);

    const mo = new MutationObserver(() => {
      registerTargets(mainEl);
    });
    mo.observe(mainEl, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      if (batchResetTimer) window.clearTimeout(batchResetTimer);
    };
  }, [screenKey]);

  return (
    <>
      <div className="scroll-progress-track" aria-hidden="true">
        <div ref={barRef} className="scroll-progress-bar" />
      </div>

      {showBackTop && (
        <button
          type="button"
          className="back-to-top-fab spring-pop"
          aria-label={t('backToTopLabel')}
          title={t('backToTopLabel')}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ArrowUp size={16} />
          <span>{t('backToTopLabel')}</span>
        </button>
      )}
    </>
  );
}
