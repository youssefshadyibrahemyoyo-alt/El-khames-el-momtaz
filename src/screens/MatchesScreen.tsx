import React, { useEffect, useState } from 'react';
import { Crown, Flame, Star, Swords } from 'lucide-react';
import type { Gameweek, PublicMatch } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { DEMO_MATCHES } from '../lib/demoData';

type Props = {
  demoMode: boolean;
  gameweeks: Gameweek[];
  onOpenPlayerProfile: (playerId: string) => void;
};

export default function MatchesScreen({
  demoMode,
  gameweeks,
  onOpenPlayerProfile,
}: Props) {
  const { t } = useLanguage();
  const [selectedGwId, setSelectedGwId] = useState<'all' | number>('all');
  const [matches, setMatches] = useState<PublicMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (demoMode || !supabase) {
      setMatches(DEMO_MATCHES);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    supabase
      .rpc('get_public_matches', {
        p_gameweek_id: selectedGwId === 'all' ? null : selectedGwId,
      })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setError(rpcError.message);
          setMatches([]);
        } else {
          setMatches((data ?? []) as PublicMatch[]);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [demoMode, selectedGwId]);

  return (
    <section className="panel stagger-item" style={{ '--stagger-i': 0 } as React.CSSProperties}>
      <div className="panel-heading">
        <div>
          <h3>{t('matchesScreenTitle')}</h3>
          <p>{t('matchesScreenSub')}</p>
        </div>

        {!demoMode && gameweeks.length > 0 && (
          <select
            className="gw-filter-select"
            value={selectedGwId}
            onChange={e =>
              setSelectedGwId(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
          >
            <option value="all">{t('allGameweeksFilter')}</option>
            {gameweeks.map(g => (
              <option key={g.id} value={g.id}>
                {t('gameweekOption')} {g.number}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && <p className="muted">{t('loadingPoints')}</p>}
      {error && <div className="notice">{error}</div>}

      {!loading && !error && matches.length === 0 && (
        <div className="gw-empty-state">
          <Swords size={26} style={{ color: 'var(--gold)', marginBottom: 6 }} />
          <p className="muted" style={{ margin: 0 }}>
            {t('noMatchesPlayedYet')}
          </p>
        </div>
      )}

      <div className="public-matches-feed">
        {matches.map((m, idx) => {
          const mvpPlayer = m.players.find(p => p.is_mvp) ?? null;
          const totalGoals = m.players.reduce((acc, p) => acc + (p.goals || 0), 0);

          return (
            <article
              key={m.match_id}
              className="public-match-card stagger-item"
              style={{ '--stagger-i': Math.min(idx + 1, 10) } as React.CSSProperties}
            >
              <div className="public-match-header">
                <div className="public-match-title">
                  <span className="gw-status-pill gw-status-active">
                    GW {m.gameweek_number}
                  </span>
                  <strong>
                    {t('matchCardPrefix')} #{m.match_number}
                  </strong>
                  <span className="muted tiny">
                    · ⚽ {totalGoals} {t('rule_goal')} · {m.players.length} players
                  </span>
                </div>

                {mvpPlayer && (
                  <button
                    type="button"
                    className="match-mvp-spotlight"
                    onClick={() => onOpenPlayerProfile(mvpPlayer.player_id)}
                  >
                    <Crown size={13} />
                    <span>
                      {t('mvpBadge')}: <strong>{mvpPlayer.display_name}</strong> (+
                      {mvpPlayer.fantasy_points} {t('ptsUnit')})
                    </span>
                  </button>
                )}
              </div>

              {m.players.length === 0 ? (
                <p className="muted tiny" style={{ margin: '8px 0 0' }}>
                  No player appearances recorded in this match yet.
                </p>
              ) : (
                <div className="public-match-players-grid">
                  {m.players.map(p => (
                    <div
                      key={p.player_id}
                      className={`public-match-player-row clickable-row ${p.is_mvp ? 'mvp-highlight-row' : ''}`}
                      onClick={() => onOpenPlayerProfile(p.player_id)}
                    >
                      <div className="match-player-left">
                        {p.photo_url ? (
                          <img
                            className="leaderboard-photo"
                            src={p.photo_url}
                            alt={p.display_name}
                          />
                        ) : (
                          <div className="player-photo small-photo">
                            {p.display_name.slice(0, 1)}
                          </div>
                        )}

                        <div>
                          <strong style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            {p.display_name}
                            {p.kit_number != null && (
                              <span className="inline-kit-chip">#{p.kit_number}</span>
                            )}
                            {p.is_mvp && (
                              <span className="mvp-mini-pill">
                                <Crown size={10} /> MVP
                              </span>
                            )}
                            {p.is_hat_trick && (
                              <span className="hattrick-mini-pill">
                                <Flame size={10} /> {t('hatTrickBadge')}
                              </span>
                            )}
                          </strong>

                          <span className="match-stat-tags">
                            {p.goals > 0 && <em>⚽ {p.goals}</em>}
                            {p.assists > 0 && <em>🎯 {p.assists}</em>}
                            {p.saves > 0 && <em>🧤 {p.saves}</em>}
                            {p.penalty_saves > 0 && <em>🥅 {p.penalty_saves}</em>}
                            {p.penalties_missed > 0 && <em>❌ {p.penalties_missed}</em>}
                            {p.yellow_cards > 0 && <em>🟨 {p.yellow_cards}</em>}
                            {p.red_cards > 0 && <em>🟥 {p.red_cards}</em>}
                            {p.own_goals > 0 && <em>😬 {p.own_goals}</em>}
                            {p.goals === 0 &&
                              p.assists === 0 &&
                              p.saves === 0 &&
                              p.penalty_saves === 0 &&
                              p.penalties_missed === 0 &&
                              p.yellow_cards === 0 &&
                              p.red_cards === 0 &&
                              p.own_goals === 0 && <em>✓ Played</em>}
                          </span>
                        </div>
                      </div>

                      <div className="match-row-right">
                        {p.rating != null && (
                          <span className="match-rating-chip">
                            <Star size={10} style={{ verticalAlign: 'middle' }} />{' '}
                            {Number(p.rating).toFixed(1)}
                          </span>
                        )}
                        <strong className="leaderboard-stat">
                          {p.fantasy_points >= 0 ? `+${p.fantasy_points}` : p.fantasy_points}{' '}
                          {t('ptsUnit')}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
