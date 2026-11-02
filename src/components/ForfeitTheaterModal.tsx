import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Flag,
  MessageCircle,
  Mic,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  ForfeitMediaType,
  ForfeitReactionKey,
  ForfeitSocialEntry,
} from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';

export type CinemaReelItem = {
  targetKey: string;
  gwNumber?: number | null;
  clubName: string;
  managerName: string;
  avatarUrl?: string | null;
  forfeitTitle: string;
  mediaUrl: string;
  mediaType: ForfeitMediaType;
  caption?: string | null;
  uploadedByName?: string | null;
  dateLabel: string;
};

type FloatingBurst = {
  id: number;
  emoji: string;
  leftPct: number;
};

const REACTION_BUTTONS: { key: ForfeitReactionKey; emoji: string }[] = [
  { key: 'laugh', emoji: '😂' },
  { key: 'skull', emoji: '💀' },
  { key: 'fire', emoji: '🔥' },
  { key: 'clown', emoji: '🤡' },
  { key: 'salute', emoji: '🫡' },
];

type Props = {
  reels: CinemaReelItem[];
  initialIndex: number;
  socialByTarget: Record<string, ForfeitSocialEntry>;
  onToggleReaction: (targetKey: string, reaction: ForfeitReactionKey) => void;
  onShareWhatsApp: (item: CinemaReelItem) => void;
  onClose: () => void;
};

export default function ForfeitTheaterModal({
  reels,
  initialIndex,
  socialByTarget,
  onToggleReaction,
  onShareWhatsApp,
  onClose,
}: Props) {
  const { t } = useLanguage();
  const [idx, setIdx] = useState(() =>
    Math.max(0, Math.min(reels.length - 1, initialIndex))
  );
  const [speed, setSpeed] = useState<0.5 | 1 | 1.5>(1);
  const [bursts, setBursts] = useState<FloatingBurst[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const current = reels[idx];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed, idx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(p => (p + 1) % reels.length);
      if (e.key === 'ArrowLeft') setIdx(p => (p - 1 + reels.length) % reels.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, reels.length]);

  if (!current) return null;

  const social: ForfeitSocialEntry = socialByTarget[current.targetKey] || {
    counts: {
      laugh: 0,
      skull: 0,
      fire: 0,
      clown: 0,
      salute: 0,
      var_valid: 0,
      var_redo: 0,
    },
    my_reactions: [],
    comments: [],
  };

  function triggerReactionBurst(rx: ForfeitReactionKey, emoji: string) {
    onToggleReaction(current.targetKey, rx);
    const baseId = Date.now() + Math.random();
    const spawned: FloatingBurst[] = Array.from({ length: 4 }, (_, i) => ({
      id: baseId + i,
      emoji,
      leftPct: 18 + Math.random() * 64,
    }));
    setBursts(prev => [...prev, ...spawned]);
    window.setTimeout(() => {
      setBursts(prev => prev.filter(b => !spawned.some(s => s.id === b.id)));
    }, 1500);
  }

  function handleDownloadShamePoster() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Luxury stadium floodlight gradient background
    const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
    grad.addColorStop(0, '#07140e');
    grad.addColorStop(0.55, '#0f261b');
    grad.addColorStop(1, '#09110d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1350);

    // Gold stadium frame
    ctx.strokeStyle = '#d4af57';
    ctx.lineWidth = 6;
    ctx.strokeRect(42, 42, 996, 1266);
    ctx.strokeStyle = 'rgba(212, 175, 87, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(58, 58, 964, 1234);

    // Top eyebrow
    ctx.fillStyle = '#d4af57';
    ctx.textAlign = 'center';
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.fillText('EL KHAMES EL MOMTAZ · OFFICIAL FORFEIT RECORD', 540, 145);

    // GW badge
    const gwBadge = current.gwNumber ? `GAMEWEEK #${current.gwNumber}` : 'THURSDAY SHAME VAULT';
    ctx.fillStyle = 'rgba(212, 175, 87, 0.16)';
    ctx.fillRect(340, 185, 400, 62);
    ctx.strokeStyle = '#d4af57';
    ctx.lineWidth = 2;
    ctx.strokeRect(340, 185, 400, 62);
    ctx.fillStyle = '#fde68a';
    ctx.font = '900 26px system-ui, sans-serif';
    ctx.fillText(gwBadge, 540, 225);

    // Giant emblem
    ctx.font = '120px system-ui, sans-serif';
    ctx.fillText('🤡', 540, 390);

    // Club & Manager
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 58px system-ui, sans-serif';
    ctx.fillText(current.clubName.slice(0, 26), 540, 490);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '600 32px system-ui, sans-serif';
    ctx.fillText(`Manager: ${current.managerName} · ${current.dateLabel}`, 540, 548);

    // Punishment Box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(100, 620, 880, 330);
    ctx.strokeStyle = 'rgba(212, 175, 87, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(100, 620, 880, 330);

    ctx.fillStyle = '#d4af57';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.fillText('⚖️ OFFICIAL PUNISHMENT', 540, 680);

    // Word-wrap forfeit title
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 40px system-ui, sans-serif';
    const words = current.forfeitTitle.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > 780) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, 4).forEach((ln, idxLine) => {
      ctx.fillText(ln, 540, 755 + idxLine * 54);
    });

    if (current.caption) {
      ctx.fillStyle = '#fde68a';
      ctx.font = 'italic 600 28px system-ui, sans-serif';
      ctx.fillText(`“${current.caption.slice(0, 55)}”`, 540, 1030);
    }

    // VAR Stamp
    const validCnt = social.counts.var_valid || 0;
    const redoCnt = social.counts.var_redo || 0;
    const stampText =
      redoCnt > validCnt
        ? `🚩 PITCH VAR VERDICT: REDO DEMANDED (${redoCnt}-${validCnt})`
        : `✅ PITCH VAR VERDICT: EXECUTION VERIFIED (${validCnt}-${redoCnt})`;
    ctx.fillStyle = redoCnt > validCnt ? '#fca5a5' : '#86efac';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.fillText(stampText, 540, 1135);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText('elkhameselmomtaz.vercel.app · Saved Forever in the Wall of Shame', 540, 1245);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `khames-forfeit-${current.managerName.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }

  return (
    <div
      className="modal-backdrop forfeit-theater-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="forfeit-theater-shell" onClick={e => e.stopPropagation()}>
        {/* Stories Progress Strip */}
        <div className="forfeit-stories-progress">
          {reels.map((r, i) => (
            <button
              key={r.targetKey}
              type="button"
              className={`forfeit-story-seg ${i === idx ? 'active' : i < idx ? 'seen' : ''}`}
              onClick={() => setIdx(i)}
              aria-label={`Reel ${i + 1}`}
            />
          ))}
        </div>

        {/* Top Header */}
        <div className="forfeit-theater-top">
          <div className="forfeit-loser-identity">
            {current.avatarUrl ? (
              <img
                className="leaderboard-photo"
                src={current.avatarUrl}
                alt={current.managerName}
              />
            ) : (
              <div className="player-photo small-photo">
                {(current.managerName || '?').slice(0, 1)}
              </div>
            )}
            <div className="forfeit-club-stack">
              <strong>
                {current.clubName}{' '}
                {current.gwNumber ? (
                  <span className="tag" style={{ marginInlineStart: 6 }}>
                    GW #{current.gwNumber}
                  </span>
                ) : null}
              </strong>
              <span>
                {current.managerName} · {current.dateLabel}
              </span>
            </div>
          </div>

          <div className="forfeit-theater-top-actions">
            {current.mediaType === 'video' && (
              <div className="forfeit-speed-pills">
                {([0.5, 1, 1.5] as const).map(sp => (
                  <button
                    key={sp}
                    type="button"
                    className={`forfeit-speed-btn ${speed === sp ? 'active' : ''}`}
                    onClick={() => setSpeed(sp)}
                  >
                    {sp === 0.5 ? t('forfeitSlowMoLabel') : `${sp}×`}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              aria-label="Close cinema"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Media Stage + Floating Emoji Bursts */}
        <div className="forfeit-theater-stage">
          {reels.length > 1 && (
            <button
              type="button"
              className="forfeit-theater-nav prev"
              onClick={() => setIdx(p => (p - 1 + reels.length) % reels.length)}
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div className="forfeit-theater-viewport">
            {current.mediaType === 'video' && (
              <video
                key={current.mediaUrl}
                ref={videoRef}
                src={current.mediaUrl}
                controls
                autoPlay
                playsInline
                className="forfeit-theater-video"
              />
            )}
            {current.mediaType === 'image' && (
              <img
                src={current.mediaUrl}
                alt={current.forfeitTitle}
                className="forfeit-theater-img"
              />
            )}
            {current.mediaType === 'audio' && (
              <div className="forfeit-theater-audio-stage">
                <div className="forfeit-mic-orb is-recording">
                  <Mic size={32} />
                </div>
                <audio src={current.mediaUrl} controls autoPlay className="forfeit-audio-el" />
              </div>
            )}

            {/* Floating Live Emoji Particles */}
            <div className="forfeit-emoji-burst-layer" aria-hidden="true">
              {bursts.map(b => (
                <span
                  key={b.id}
                  className="forfeit-floating-emoji"
                  style={{ left: `${b.leftPct}%` }}
                >
                  {b.emoji}
                </span>
              ))}
            </div>
          </div>

          {reels.length > 1 && (
            <button
              type="button"
              className="forfeit-theater-nav next"
              onClick={() => setIdx(p => (p + 1) % reels.length)}
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>

        {/* Lower-Third Caption & Interactive Controls */}
        <div className="forfeit-theater-bottom">
          <div className="forfeit-punishment-banner" style={{ margin: 0 }}>
            <span>⚖️</span>
            <div>
              <strong>{current.forfeitTitle}</strong>
              {current.caption && (
                <p className="forfeit-proof-caption" style={{ marginTop: 3 }}>
                  “{current.caption}”
                </p>
              )}
            </div>
          </div>

          <div className="forfeit-theater-interactive-row">
            <div className="forfeit-reaction-strip">
              {REACTION_BUTTONS.map(({ key, emoji }) => {
                const active = social.my_reactions.includes(key);
                const count = social.counts[key] || 0;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`forfeit-rx-pill ${active ? 'active' : ''}`}
                    onClick={() => triggerReactionBurst(key, emoji)}
                  >
                    <span>{emoji}</span>
                    {count > 0 && <strong>{count}</strong>}
                  </button>
                );
              })}
            </div>

            <div className="forfeit-var-inline">
              <button
                type="button"
                className={`forfeit-var-btn valid ${
                  social.my_reactions.includes('var_valid') ? 'active' : ''
                }`}
                onClick={() => triggerReactionBurst('var_valid', '✅')}
              >
                <ShieldCheck size={13} /> {t('forfeitVarApproveBtn')} ({social.counts.var_valid || 0})
              </button>
              <button
                type="button"
                className={`forfeit-var-btn redo ${
                  social.my_reactions.includes('var_redo') ? 'active' : ''
                }`}
                onClick={() => triggerReactionBurst('var_redo', '🚩')}
              >
                <Flag size={13} /> {t('forfeitVarRedoBtn')} ({social.counts.var_redo || 0})
              </button>
            </div>
          </div>

          <div className="forfeit-theater-share-row">
            <button
              type="button"
              className="secondary compact-btn"
              onClick={handleDownloadShamePoster}
            >
              <Download size={14} /> {t('forfeitDownloadPosterBtn')}
            </button>
            <button
              type="button"
              className="primary compact-btn"
              onClick={() => onShareWhatsApp(current)}
            >
              <MessageCircle size={14} /> {t('forfeitShareRoastBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
