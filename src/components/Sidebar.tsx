import {
  ArrowLeftRight,
  CalendarDays,
  CircleUserRound,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import type { Screen } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

type SidebarProps = {
  screen: Screen;
  onSelectScreen: (next: Screen) => void;
  isAdmin: boolean;
  demoMode: boolean;
  displayName?: string;
  teamName?: string | null;
  avatarUrl?: string | null;
  onOpenMyProfile: () => void;
  onSignOutOrToggleDemo: () => void;
};

export default function Sidebar({
  screen,
  onSelectScreen,
  isAdmin,
  demoMode,
  displayName,
  teamName,
  avatarUrl,
  onOpenMyProfile,
  onSignOutOrToggleDemo,
}: SidebarProps) {
  const { t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  const navItems: {
    id: Screen;
    label: string;
    icon: typeof CalendarDays;
    group?: string;
    admin?: boolean;
  }[] = [
    { id: 'overview', label: t('navHome'), icon: CalendarDays, group: t('navGroupClub') },
    { id: 'squad', label: t('navSquad'), icon: Users },
    { id: 'players', label: t('navPlayers'), icon: CircleUserRound },
    { id: 'matches', label: t('navMatches'), icon: Swords, group: t('navGroupLeague') },
    { id: 'leaderboard', label: t('navLeaderboard'), icon: Trophy },
    { id: 'admin', label: t('navAdmin'), icon: ShieldCheck, group: t('navGroupAdmin'), admin: true },
  ];

  const shownName = demoMode
    ? isAdmin
      ? t('demoAdminAccount')
      : t('demoPlayerAccount')
    : displayName || 'Player';

  return (
    <aside className="sidebar">
      <div className="brand compact">
        <span className="brand-mark">⚽</span>
        <div>
          <div className="eyebrow">{t('brandEyebrow')}</div>
          <h2>
            {t('brandTitleMain')} <em>{t('brandTitleAccent')}</em>
          </h2>
        </div>
      </div>

      <div className="league-pill">
        <span className="pulse" /> {t('privateLeague')}
      </div>

      <nav>
        {navItems
          .filter(item => !item.admin || isAdmin)
          .map(item => (
            <div className="nav-entry-wrap" key={item.id}>
              {item.group && <span className="nav-section-label">{item.group}</span>}
              <button
                type="button"
                className={`nav-item ${screen === item.id ? 'active' : ''}`}
                onClick={() => onSelectScreen(item.id)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.admin && <span className="nav-admin">{t('adminBadge')}</span>}
              </button>
            </div>
          ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          type="button"
          className="floodlight-toggle-btn sidebar-floodlight-btn"
          onClick={toggleTheme}
        >
          <span className="theme-icon-wrap" key={isDark ? 'sun' : 'moon'}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </span>
          <span>{isDark ? t('daylightMode') : t('floodlightMode')}</span>
        </button>

        <div className="account-chip">
          <button
            type="button"
            className="account-profile-trigger"
            title={t('myProfileBtn')}
            onClick={onOpenMyProfile}
          >
            {avatarUrl ? (
              <img className="manager-chip-avatar" src={avatarUrl} alt={shownName} />
            ) : (
              <div className="avatar">{shownName.slice(0, 1).toUpperCase()}</div>
            )}
            <div className="account-copy">
              <strong>{teamName?.trim() || `${shownName} FC`}</strong>
              <span>
                {shownName} · {isAdmin ? t('roleAdminTitle') : t('rolePlayerTitle')}
              </span>
            </div>
          </button>

          <button
            type="button"
            className="icon-btn"
            title={demoMode ? t('switchPreviewRole') : t('signOut')}
            onClick={onSignOutOrToggleDemo}
          >
            {demoMode ? <ArrowLeftRight size={16} /> : <LogOut size={16} />}
          </button>
        </div>
        <div className="tiny">{demoMode ? t('demoSubtext') : t('secureSubtext')}</div>
      </div>
    </aside>
  );
}
