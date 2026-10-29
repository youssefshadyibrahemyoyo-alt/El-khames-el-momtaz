import { useEffect, useState } from 'react';
import { Clock3, Globe, LogOut, Moon, Sun, Timer } from 'lucide-react';
import type { Gameweek, Screen } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import {
  formatCairoDeadline,
  formatCountdownShort,
  getDeadlineCountdown,
} from '../lib/cairoTime';

type Props = {
  screen: Screen;
  gameweekNumber: number;
  targetGw: Gameweek | null;
  isAdmin: boolean;
  demoMode: boolean;
  onSignOutOrToggleDemo: () => void;
};

export default function Topbar({
  screen,
  gameweekNumber,
  targetGw,
  isAdmin,
  demoMode,
  onSignOutOrToggleDemo,
}: Props) {
  const { lang, toggleLang, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const titleByScreen: Record<Screen, string> = {
    overview: t('navHome'),
    squad: t('navSquad'),
    players: t('navPlayers'),
    leaderboard: t('navLeaderboard'),
    admin: t('navAdmin'),
  };

  const deadlineIso = targetGw?.transfer_deadline ?? null;
  const countdown = getDeadlineCountdown(deadlineIso, nowMs);
  const countdownStr = formatCountdownShort(countdown, lang);
  const isUrgent = Boolean(
    countdown && !countdown.expired && countdown.days === 0 && countdown.hours < 3
  );

  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">
          {t('sessionGwPrefix')} {gameweekNumber}
        </span>
        <h2>{titleByScreen[screen]}</h2>
      </div>

      <div className="top-actions">
        <div className="deadline">
          <Clock3 size={14} />
          {deadlineIso
            ? `${t('transfersClose')}: ${formatCairoDeadline(deadlineIso, lang)}`
            : t('noDeadlineSet')}
        </div>

        {countdown && !countdown.expired && (
          <div
            className={`countdown-pill ${isUrgent ? 'urgent-pulse' : ''}`}
            title={t('transfersClose')}
          >
            <Timer size={14} />
            <strong>{countdownStr}</strong>
          </div>
        )}

        <button
          type="button"
          className="floodlight-toggle-btn compact-btn"
          onClick={toggleTheme}
          title={isDark ? t('daylightMode') : t('floodlightMode')}
        >
          <span className="theme-icon-wrap" key={isDark ? 'sun' : 'moon'}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </span>
          <span>{isDark ? t('daylightMode') : t('floodlightMode')}</span>
        </button>

        <button
          type="button"
          className="secondary compact-btn lang-btn"
          onClick={toggleLang}
          title="Switch language / تغيير اللغة"
        >
          <Globe size={14} />
          {t('langSwitchLabel')}
        </button>

        {demoMode ? (
          <button
            type="button"
            className="secondary compact-btn"
            onClick={onSignOutOrToggleDemo}
          >
            {isAdmin ? t('demoAdminAccount') : t('demoPlayerAccount')}
          </button>
        ) : (
          <button
            type="button"
            className="secondary compact-btn"
            onClick={onSignOutOrToggleDemo}
          >
            <LogOut size={13} />
            {t('signOut')}
          </button>
        )}
      </div>
    </header>
  );
}
