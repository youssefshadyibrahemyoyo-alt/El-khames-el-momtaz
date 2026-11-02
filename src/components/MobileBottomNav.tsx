import {
  CalendarDays,
  CircleUserRound,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import type { Screen } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';

type Props = {
  screen: Screen;
  isAdmin: boolean;
  squadIncomplete?: boolean;
  onSelectScreen: (next: Screen) => void;
};

export default function MobileBottomNav({
  screen,
  isAdmin,
  squadIncomplete = false,
  onSelectScreen,
}: Props) {
  const { t } = useLanguage();

  const items: { id: Screen; label: string; icon: typeof CalendarDays; alertDot?: boolean }[] = [
    { id: 'overview', label: t('navHome'), icon: CalendarDays },
    { id: 'squad', label: t('navSquad'), icon: Users, alertDot: squadIncomplete },
    { id: 'players', label: t('navPlayers'), icon: CircleUserRound },
    { id: 'matches', label: t('navMatches'), icon: Swords },
    { id: 'leaderboard', label: t('navLeaderboard'), icon: Trophy },
    { id: 'settings', label: t('navSettings'), icon: Settings },
  ];

  if (isAdmin) {
    items.push({ id: 'admin', label: t('adminBadge'), icon: ShieldCheck });
  }

  return (
    <nav className="mobile-glass-dock" aria-label="Primary Mobile Navigation">
      {items.map(item => {
        const active = screen === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-dock-tab ${active ? 'active' : ''}`}
            onClick={() => {
              onSelectScreen(item.id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="mobile-dock-icon-wrap">
              <item.icon size={18} />
              {item.alertDot && <span className="mobile-dock-alert-dot" />}
            </span>
            <small>{item.label}</small>
          </button>
        );
      })}
    </nav>
  );
}
