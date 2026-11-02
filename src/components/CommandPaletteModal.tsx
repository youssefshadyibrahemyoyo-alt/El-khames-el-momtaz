import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CircleUserRound,
  Globe,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Swords,
  Trophy,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import type { LeaguePlayer, Screen } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  isOpen: boolean;
  isAdmin: boolean;
  players: LeaguePlayer[];
  onClose: () => void;
  onSelectScreen: (screen: Screen) => void;
  onOpenPlayerProfile: (playerId: string) => void;
  onOpenMyProfile: () => void;
};

export default function CommandPaletteModal({
  isOpen,
  isAdmin,
  players,
  onClose,
  onSelectScreen,
  onOpenPlayerProfile,
  onOpenMyProfile,
}: Props) {
  const { t, toggleLang } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const screens = useMemo(() => {
    const base: { id: Screen; label: string; icon: typeof CalendarDays }[] = [
      { id: 'overview', label: t('navHome'), icon: CalendarDays },
      { id: 'squad', label: t('navSquad'), icon: Users },
      { id: 'players', label: t('navPlayers'), icon: CircleUserRound },
      { id: 'matches', label: t('navMatches'), icon: Swords },
      { id: 'leaderboard', label: t('navLeaderboard'), icon: Trophy },
    ];
    if (isAdmin) {
      base.push({ id: 'admin', label: t('navAdmin'), icon: ShieldCheck });
    }
    const q = query.trim().toLowerCase();
    return q ? base.filter(s => s.label.toLowerCase().includes(q)) : base;
  }, [isAdmin, query, t]);

  const matchingPlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = [...players].sort((a, b) => b.points - a.points || b.price - a.price);
    if (!q) return pool.slice(0, 6);
    return pool
      .filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          String(p.kit_number ?? '').includes(q) ||
          (p.favourite_team ?? '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [players, query]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop cmd-palette-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="cmd-palette-card" onClick={e => e.stopPropagation()}>
        <div className="cmd-palette-search-bar">
          <Search size={17} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('cmdPalettePlaceholder')}
          />
          <kbd className="cmd-esc-badge">ESC</kbd>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="cmd-palette-body">
          {screens.length === 0 && matchingPlayers.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', padding: '18px 0' }}>
              {t('cmdNoResults')}
            </p>
          ) : (
            <>
              {screens.length > 0 && (
                <div className="cmd-group">
                  <span className="cmd-group-title">{t('cmdSectionScreens')}</span>
                  <div className="cmd-screen-pills">
                    {screens.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className="cmd-screen-btn"
                        onClick={() => {
                          onSelectScreen(s.id);
                          onClose();
                        }}
                      >
                        <s.icon size={15} />
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchingPlayers.length > 0 && (
                <div className="cmd-group">
                  <span className="cmd-group-title">{t('cmdSectionPlayers')}</span>
                  <div className="cmd-player-list">
                    {matchingPlayers.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="cmd-player-row"
                        onClick={() => {
                          onOpenPlayerProfile(p.id);
                          onClose();
                        }}
                      >
                        <div className="cmd-player-left">
                          {p.photo_url ? (
                            <img src={p.photo_url} alt={p.name} className="leaderboard-photo" />
                          ) : (
                            <div className="player-photo small-photo">{p.name.slice(0, 1)}</div>
                          )}
                          <div>
                            <strong>
                              {p.kit_number != null ? `#${p.kit_number} ` : ''}
                              {p.name}
                            </strong>
                            <small className="muted tiny">
                              {p.points} {t('ptsUnit')} · £{p.price.toFixed(1)}m
                            </small>
                          </div>
                        </div>
                        <span className="tag">£{p.price.toFixed(1)}m</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="cmd-group">
                <span className="cmd-group-title">{t('cmdSectionActions')}</span>
                <div className="cmd-screen-pills">
                  <button
                    type="button"
                    className="cmd-screen-btn"
                    onClick={() => {
                      onOpenMyProfile();
                      onClose();
                    }}
                  >
                    <UserCog size={15} />
                    <span>{t('myProfileBtn')}</span>
                  </button>
                  <button
                    type="button"
                    className="cmd-screen-btn"
                    onClick={() => {
                      toggleTheme();
                      onClose();
                    }}
                  >
                    {isDark ? <Sun size={15} /> : <Moon size={15} />}
                    <span>{isDark ? t('daylightMode') : t('floodlightMode')}</span>
                  </button>
                  <button
                    type="button"
                    className="cmd-screen-btn"
                    onClick={() => {
                      toggleLang();
                      onClose();
                    }}
                  >
                    <Globe size={15} />
                    <span>{t('langSwitchLabel')}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
