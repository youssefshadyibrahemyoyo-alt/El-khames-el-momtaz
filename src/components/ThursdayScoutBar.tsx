import { useEffect, useState } from 'react';
import { Crown, Flame, Sparkles } from 'lucide-react';
import type { GameweekScout } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { DEMO_GAMEWEEK_SCOUT } from '../lib/demoData';

type ThursdayScoutBarProps = {
  demoMode: boolean;
  gameweekId?: number | null;
  onOpenPlayerProfile?: (playerId: string) => void;
};

export default function ThursdayScoutBar({
  demoMode,
  gameweekId = null,
  onOpenPlayerProfile,
}: ThursdayScoutBarProps) {
  const { t } = useLanguage();
  const [scout, setScout] = useState<GameweekScout | null>(
    demoMode ? DEMO_GAMEWEEK_SCOUT : null
  );

  useEffect(() => {
    if (demoMode || !supabase) {
      setScout(DEMO_GAMEWEEK_SCOUT);
      return;
    }

    let cancelled = false;
    supabase
      .rpc('get_gameweek_scout', { p_gameweek_id: gameweekId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setScout(data as GameweekScout);
        } else {
          setScout(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [demoMode, gameweekId]);

  if (!scout || !scout.has_locked_gw || (scout.active_squads_count ?? 0) === 0) {
    return null;
  }

  const chips = scout.chips_armed ?? [];

  return (
    <div className="thursday-scout-bar spring-pop">
      <div className="thursday-scout-header">
        <span className="eyebrow">
          <span className="status-dot" />
          GW #{scout.gameweek_number} · {t('scoutBarTitle')}
        </span>
      </div>

      <div className="thursday-scout-grid">
        {/* 1. Most Captained */}
        <div
          className={`thursday-scout-item ${
            scout.most_captained && onOpenPlayerProfile ? 'clickable-row' : ''
          }`}
          onClick={() =>
            scout.most_captained && onOpenPlayerProfile?.(scout.most_captained.player_id)
          }
        >
          <span className="scout-item-icon">
            <Crown size={15} />
          </span>
          <div className="scout-item-copy">
            <span>{t('scoutMostCaptained')}</span>
            <strong>
              {scout.most_captained ? scout.most_captained.display_name : '—'}
              {scout.most_captained && (
                <em className="scout-pct-pill">{scout.most_captained.pct}%</em>
              )}
            </strong>
          </div>
        </div>

        {/* 2. Most Owned */}
        <div
          className={`thursday-scout-item ${
            scout.most_owned && onOpenPlayerProfile ? 'clickable-row' : ''
          }`}
          onClick={() => scout.most_owned && onOpenPlayerProfile?.(scout.most_owned.player_id)}
        >
          <span className="scout-item-icon">
            <Flame size={15} />
          </span>
          <div className="scout-item-copy">
            <span>{t('scoutMostOwned')}</span>
            <strong>
              {scout.most_owned ? scout.most_owned.display_name : '—'}
              {scout.most_owned && <em className="scout-pct-pill">{scout.most_owned.pct}%</em>}
            </strong>
          </div>
        </div>

        {/* 3. Active Chips Tonight */}
        <div className="thursday-scout-item">
          <span className="scout-item-icon">
            <Sparkles size={15} />
          </span>
          <div className="scout-item-copy">
            <span>{t('scoutChipsArmed')}</span>
            <strong>
              {chips.length > 0
                ? chips.map(c => `${c.count}× ${c.chip}`).join(' · ')
                : t('scoutNoChips')}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
