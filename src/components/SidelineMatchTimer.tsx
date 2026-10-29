import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, Volume2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const PRESET_MINUTES = [10, 12, 15, 20] as const;

export function playRefereeWhistle() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Classic 3-blast full-time referee whistle (peep - peep - PEEEEEEP)
    const blasts = [
      { start: 0.0, duration: 0.22 },
      { start: 0.32, duration: 0.22 },
      { start: 0.64, duration: 0.65 },
    ];

    blasts.forEach(({ start, duration }) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      // Dual-tone pea-whistle frequencies (~2820 Hz + ~3140 Hz)
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(2820, ctx.currentTime + start);
      osc2.frequency.setValueAtTime(3140, ctx.currentTime + start);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + start + 0.025);
      gain.gain.setValueAtTime(0.26, ctx.currentTime + start + duration - 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime + start);
      osc2.start(ctx.currentTime + start);
      osc1.stop(ctx.currentTime + start + duration + 0.02);
      osc2.stop(ctx.currentTime + start + duration + 0.02);
    });
  } catch {
    // Ignore if browser audio policy blocks synthesis
  }
}

export default function SidelineMatchTimer() {
  const { t } = useLanguage();
  const [durationSec, setDurationSec] = useState(15 * 60);
  const [remainingSec, setRemainingSec] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [fullTimeFlash, setFullTimeFlash] = useState(false);
  const endAtRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (endAtRef.current != null) {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemainingSec(left);
    }
    endAtRef.current = null;
    setRunning(false);
  }, []);

  const startTimer = useCallback(() => {
    const startFrom = remainingSec <= 0 ? durationSec : remainingSec;
    setFullTimeFlash(false);
    setRemainingSec(startFrom);
    endAtRef.current = Date.now() + startFrom * 1000;
    setRunning(true);
  }, [durationSec, remainingSec]);

  const resetTimer = useCallback(
    (newMinutes?: number) => {
      const secs = (newMinutes ?? Math.round(durationSec / 60)) * 60;
      if (newMinutes) setDurationSec(secs);
      endAtRef.current = null;
      setRunning(false);
      setFullTimeFlash(false);
      setRemainingSec(secs);
    },
    [durationSec]
  );

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (endAtRef.current == null) return;
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemainingSec(left);
      if (left <= 0) {
        endAtRef.current = null;
        setRunning(false);
        setFullTimeFlash(true);
        playRefereeWhistle();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const mins = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const secs = String(remainingSec % 60).padStart(2, '0');
  const isFinalMinute = running && remainingSec > 0 && remainingSec <= 60;

  return (
    <div
      className={[
        'sideline-timer-bar',
        running ? 'sideline-timer-running' : '',
        isFinalMinute ? 'sideline-timer-urgent' : '',
        fullTimeFlash ? 'sideline-timer-fulltime' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="sideline-timer-clock">
        <Timer size={18} />
        <strong>
          {mins}:{secs}
        </strong>
        <span className="sideline-timer-tag">
          {fullTimeFlash ? t('timerFullTime') : t('timerLabel')}
        </span>
      </div>

      <div className="sideline-timer-presets">
        {PRESET_MINUTES.map(m => {
          const active = durationSec === m * 60;
          return (
            <button
              key={m}
              type="button"
              className={`avail-pill ${active ? 'avail-pill--available active' : ''}`}
              disabled={running}
              onClick={() => resetTimer(m)}
            >
              {m}m
            </button>
          );
        })}
      </div>

      <div className="sideline-timer-actions">
        {!running ? (
          <button type="button" className="primary compact-btn" onClick={startTimer}>
            <Play size={13} /> {t('timerStartBtn')}
          </button>
        ) : (
          <button type="button" className="secondary compact-btn" onClick={stopTimer}>
            <Pause size={13} /> {t('timerPauseBtn')}
          </button>
        )}

        <button type="button" className="secondary compact-btn" onClick={() => resetTimer()}>
          <RotateCcw size={13} /> {t('timerResetBtn')}
        </button>

        <button
          type="button"
          className="secondary compact-btn"
          title={t('timerWhistleBtn')}
          onClick={() => playRefereeWhistle()}
        >
          <Volume2 size={13} /> {t('timerWhistleBtn')}
        </button>
      </div>
    </div>
  );
}
