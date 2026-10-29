import {
  ArrowLeftRight,
  CalendarDays,
  CircleUserRound,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
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
  onSignOutOrToggleDemo: () => void;
};

export default function Sidebar({
  screen,
  onSelectScreen,
  isAdmin,
  demoMode,
  displayName,
  onSignOutOrToggleDemo,
}: SidebarProps) {
  const { t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  const navItems: { id: Screen; label: string; icon: typeof CalendarDays; admin?: boolean }[] = [
    { id: 'overview', label: t('navHome'), icon: CalendarDays },
    { id: 'squad', label: t('navSquad'), icon: Users },
    { id: 'players', label: t('navPlayers'), icon: CircleUserRound },
    { id: 'leaderboard', label: t('navLeaderboard'), icon: Trophy },
    { id: 'admin', label: t('navAdmin'), icon: ShieldCheck, admin: true },
  ];

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
            <button
              key={item.id}
              type="button"
              className={`nav-item ${screen === item.id ? 'active' : ''}`}
              onClick={() => onSelectScreen(item.id)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.admin && <span className="nav-admin">{t('adminBadge')}</span>}
            </button>
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
          <div className="avatar">{isAdmin ? 'A' : 'P'}</div>
          <div className="account-copy">
            <strong>
              {demoMode
                ? isAdmin
                  ? t('demoAdminAccount')
                  : t('demoPlayerAccount')
                : displayName || 'Player'}
            </strong>
            <span>{isAdmin ? t('roleAdminTitle') : t('rolePlayerTitle')}</span>
          </div>
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
