import { useEffect, useMemo } from 'react';

type Props = {
  triggerKey: number;
  onComplete?: () => void;
};

const COLORS = ['#e6ca7d', '#f5df9e', '#39b26d', '#246b45', '#ffffff', '#d4a644'];

export default function ConfettiBurst({ triggerKey, onComplete }: Props) {
  const pieces = useMemo(() => {
    if (triggerKey <= 0) return [];
    return Array.from({ length: 34 }, (_, idx) => {
      const angle = (idx / 34) * Math.PI * 2 + (idx % 3) * 0.14;
      const distance = 90 + ((idx * 37) % 160);
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 55;
      const rot = ((idx * 83) % 520) - 260;
      const delay = (idx % 6) * 24;
      const color = COLORS[idx % COLORS.length];
      const size = 6 + (idx % 5);
      return { id: idx, tx, ty, rot, delay, color, size };
    });
  }, [triggerKey]);

  useEffect(() => {
    if (triggerKey <= 0 || !onComplete) return;
    const timer = window.setTimeout(onComplete, 1450);
    return () => window.clearTimeout(timer);
  }, [triggerKey, onComplete]);

  if (triggerKey <= 0) return null;

  return (
    <div className="confetti-layer" aria-hidden="true" key={triggerKey}>
      {pieces.map(piece => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={
            {
              '--tx': `${piece.tx.toFixed(1)}px`,
              '--ty': `${piece.ty.toFixed(1)}px`,
              '--rot': `${piece.rot}deg`,
              '--delay': `${piece.delay}ms`,
              '--piece-color': piece.color,
              '--piece-size': `${piece.size}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
