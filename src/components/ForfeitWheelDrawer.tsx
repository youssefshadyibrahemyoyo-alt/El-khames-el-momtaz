import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Sparkles, Trophy } from 'lucide-react';
import type { ForfeitOptionItem } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';

type Props = {
  options: ForfeitOptionItem[];
  myVoteOptionId: number | null;
  onVoteOption: (optionId: number) => void;
};

const SLICE_PALETTE = [
  { bg: '#123828', accent: '#d4af57' },
  { bg: '#1b2434', accent: '#60a5fa' },
  { bg: '#2c1c1e', accent: '#f87171' },
  { bg: '#252113', accent: '#fbbf24' },
  { bg: '#162d2c', accent: '#34d399' },
  { bg: '#271a30', accent: '#c084fc' },
];

export default function ForfeitWheelDrawer({ options, myVoteOptionId, onVoteOption }: Props) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const rotationRef = useRef<number>(0);

  const [spinning, setSpinning] = useState(false);
  const [landedOption, setLandedOption] = useState<ForfeitOptionItem | null>(null);
  const [pointerTick, setPointerTick] = useState(false);

  const drawWheel = useCallback(
    (angleRad: number) => {
      const canvas = canvasRef.current;
      if (!canvas || options.length === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = 280;
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 12;
      const n = options.length;
      const arc = (Math.PI * 2) / n;

      // Outer gold stadium rim
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(212, 175, 87, 0.22)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#d4af57';
      ctx.stroke();

      for (let i = 0; i < n; i++) {
        const start = angleRad + i * arc;
        const end = start + arc;
        const pal = SLICE_PALETTE[i % SLICE_PALETTE.length];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = pal.bg;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(212, 175, 87, 0.45)';
        ctx.stroke();

        // Label inside slice
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 11px system-ui, -apple-system, sans-serif';
        const raw = options[i].label;
        const label = raw.length > 22 ? `${raw.slice(0, 21)}…` : raw;
        ctx.fillText(label, radius - 14, 4);

        // Pin stud near outer edge
        ctx.beginPath();
        ctx.arc(radius - 5, 0, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = pal.accent;
        ctx.fill();
        ctx.restore();
      }

      // Center crest hub
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.fillStyle = '#0b1812';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#d4af57';
      ctx.stroke();

      ctx.fillStyle = '#d4af57';
      ctx.font = '900 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚖️', cx, cy + 1);

      ctx.restore();
    },
    [options]
  );

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [drawWheel]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  function handleSpin() {
    if (spinning || options.length < 2) return;
    setSpinning(true);
    setLandedOption(null);

    const startAngle = rotationRef.current;
    const extraSpins = 5 + Math.random() * 3.5; // 5 to 8.5 full revolutions
    const targetAngle = startAngle + extraSpins * Math.PI * 2;
    const duration = 3600;
    const t0 = performance.now();
    const arc = (Math.PI * 2) / options.length;
    let lastSliceIdx = -1;

    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - t0) / duration);
      // Cubic ease-out deceleration
      const eased = 1 - Math.pow(1 - elapsed, 3.4);
      const current = startAngle + (targetAngle - startAngle) * eased;
      rotationRef.current = current;
      drawWheel(current);

      // Pointer sits at top (-Math.PI / 2)
      const normPointer =
        (((-Math.PI / 2 - current) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const sliceIdx = Math.floor(normPointer / arc) % options.length;
      if (sliceIdx !== lastSliceIdx) {
        lastSliceIdx = sliceIdx;
        setPointerTick(true);
        window.setTimeout(() => setPointerTick(false), 65);
      }

      if (elapsed < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setSpinning(false);
        setLandedOption(options[sliceIdx] || options[0]);
      }
    };

    animRef.current = requestAnimationFrame(tick);
  }

  return (
    <div className="forfeit-wheel-drawer">
      <div className="forfeit-wheel-stage">
        <div className="forfeit-wheel-canvas-wrap">
          <div className={`forfeit-wheel-pointer ${pointerTick ? 'tick' : ''}`} aria-hidden="true">
            ▼
          </div>
          <canvas
            ref={canvasRef}
            style={{ width: 280, height: 280 }}
            className="forfeit-wheel-canvas"
          />
        </div>

        <div className="forfeit-wheel-side">
          <p className="muted tiny" style={{ margin: 0 }}>
            {t('forfeitWheelSub')}
          </p>

          <button
            type="button"
            className="primary forfeit-spin-cta"
            disabled={spinning || options.length < 2}
            onClick={handleSpin}
          >
            <Sparkles size={15} />{' '}
            {spinning ? t('forfeitWheelSpinning') : t('forfeitWheelSpinBtn')}
          </button>

          {landedOption && (
            <div className="forfeit-wheel-winner-card">
              <span className="eyebrow">
                <Trophy size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                {t('forfeitWheelLanded')}
              </span>
              <strong>{landedOption.label}</strong>
              {myVoteOptionId !== landedOption.id ? (
                <button
                  type="button"
                  className="secondary compact-btn"
                  onClick={() => onVoteOption(landedOption.id)}
                >
                  <Check size={13} /> {t('forfeitWheelVoteThisBtn')}
                </button>
              ) : (
                <span className="forfeit-my-vote-chip">
                  <Check size={11} /> {t('forfeitYourVote')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
