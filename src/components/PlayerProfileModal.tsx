import { useEffect, useState } from 'react';
import {
  Award,
  Flag,
  Footprints,
  Heart,
  Maximize2,
  Shirt,
  Star,
  Trophy,
  UserCheck,
  X,
} from 'lucide-react';
import type { LeaguePlayer, PlayerProfileDetail } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { buildDemoPlayerProfile } from '../lib/demoData';
import AnimatedNumber from './AnimatedNumber';

type Props = {
  playerId: string;
  demoMode: boolean;
  fallbackPlayer?: LeaguePlayer;
  isSelectedInSquad?: boolean;
  canAddToSquad?: boolean;
  onToggleSquadPlayer?: (player: LeaguePlayer) => void;
  onClose: () => void;
};

type PortraitFraming = 'vertical' | 'screenshot' | 'wide';

export default function PlayerProfileModal({
  playerId,
  demoMode,
  fallbackPlayer,
  isSelectedInSquad = false,
  canAddToSquad = false,
  onToggleSquadPlayer,
  onClose,
}: Props) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<PlayerProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [framing, setFraming] = useState<PortraitFraming>('vertical');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFraming('vertical');
    setLightboxOpen(false);

    async function load() {
      setLoading(true);
      setError('');

      if (demoMode || !supabase) {
        if (fallbackPlayer) {
          setProfile(buildDemoPlayerProfile(fallbackPlayer));
        } else {
          setError('Player not found.');
        }
        setLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('get_player_profile', {
        p_player_id: playerId,
      });

      if (cancelled) return;

      if (rpcError || !data) {
        setError(rpcError?.message ?? 'Could not load player profile.');
      } else {
        setProfile(data as PlayerProfileDetail);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [playerId, demoMode, fallbackPlayer]);

  // Allow Escape key to close lightbox first, then modal
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        if (lightboxOpen) {
          setLightboxOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, onClose]);

  const handlePhotoLoaded = (img: HTMLImageElement) => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    const ratio = h / w;
    if (ratio > 1.75) {
      setFraming('screenshot');
    } else if (ratio < 1.1) {
      setFraming('wide');
    } else {
      setFraming('vertical');
    }
  };

  const footLabel = (foot: string | null | undefined) => {
    if (!foot) return t('notSetValue');
    if (foot === 'Right') return t('footRight');
    if (foot === 'Left') return t('footLeft');
    if (foot === 'Both') return t('footBoth');
    return foot;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-sheet-spring player-profile-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-grabber" aria-hidden="true" />

        <div className="panel-heading modal-heading" style={{ marginBottom: 12 }}>
          <div>
            <h3>{t('playerProfileTitle')}</h3>
          </div>
          <button type="button" className="secondary compact-btn" onClick={onClose}>
            <X size={14} /> {t('closeBtn')}
          </button>
        </div>

        {loading && <p className="muted">{t('loadingPoints')}</p>}
        {error && <div className="notice">{error}</div>}

        {!loading && !error && profile && (
          <>
            {/* HERO STADIUM BANNER WITH PRO 3:4 PORTRAIT SHOWCASE */}
            <div className="profile-hero-banner">
              {profile.kit_number != null && (
                <div className="profile-kit-watermark" aria-hidden="true">
                  {profile.kit_number}
                </div>
              )}

              {profile.photo_url ? (
                <button
                  type="button"
                  className={`profile-portrait-card portrait-framing-${framing}`}
                  title={t('tapToZoomPhoto')}
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    className="profile-portrait-blur"
                    src={profile.photo_url}
                    alt=""
                    aria-hidden="true"
                  />
                  <img
                    className="profile-portrait-main"
                    src={profile.photo_url}
                    alt={profile.display_name}
                    onLoad={ev => handlePhotoLoaded(ev.currentTarget)}
                  />
                  {profile.kit_number != null && (
                    <span className="profile-kit-pill">#{profile.kit_number}</span>
                  )}
                  <span className="profile-zoom-badge" aria-hidden="true">
                    <Maximize2 size={12} />
                  </span>
                </button>
              ) : (
                <div className="profile-portrait-card profile-portrait-placeholder">
                  <span className="profile-portrait-initial">
                    {profile.display_name.slice(0, 1).toUpperCase()}
                  </span>
                  {profile.kit_number != null && (
                    <span className="profile-kit-pill">#{profile.kit_number}</span>
                  )}
                </div>
              )}

              <div className="profile-hero-info">
                <div className="profile-hero-badges">
                  <span className="profile-status-chip">
                    {profile.is_active ? t('activeBadge') : t('inactiveBadge')}
                  </span>
                  {profile.availability_status === 'doubtful' && (
                    <span className="fpl-flag-chip fpl-flag-chip--doubtful">
                      🟡 {t('availDoubtful')}
                    </span>
                  )}
                  {profile.availability_status === 'out' && (
                    <span className="fpl-flag-chip fpl-flag-chip--out">
                      🔴 {t('availOut')}
                    </span>
                  )}
                  {(!profile.availability_status || profile.availability_status === 'available') && (
                    <span className="fpl-flag-chip fpl-flag-chip--available">
                      🟢 {t('availAvailable')}
                    </span>
                  )}
                  <span className="profile-ownership-chip">
                    <UserCheck size={11} /> {t('selectedByLabel')} {profile.ownership_pct}%
                  </span>
                </div>

                <h2>{profile.display_name}</h2>

                {profile.availability_note && (
                  <p className="fpl-profile-avail-note">⚠️ {profile.availability_note}</p>
                )}

                <div className="profile-price-row">
                  <strong className="profile-price-tag">
                    £{Number(profile.price).toFixed(1)}m
                  </strong>
                  {profile.playstyle && (
                    <span className="profile-role-pill">{profile.playstyle}</span>
                  )}
                </div>

                {profile.bio && <p className="profile-bio-quote">“{profile.bio}”</p>}

                {onToggleSquadPlayer && fallbackPlayer && (
                  <div className="profile-hero-cta">
                    <button
                      type="button"
                      className={isSelectedInSquad ? 'secondary compact-btn' : 'primary compact-btn'}
                      disabled={!isSelectedInSquad && !canAddToSquad}
                      onClick={() => onToggleSquadPlayer(fallbackPlayer)}
                    >
                      {isSelectedInSquad ? t('removePlayerBtn') : `+ ${t('addPlayerBtn')}`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ESSENTIAL BIO GRID */}
            <div className="profile-essentials-grid">
              <div className="profile-bio-tile">
                <span>
                  <Shirt size={13} /> {t('kitNumberLabel')}
                </span>
                <strong>
                  {profile.kit_number != null ? `#${profile.kit_number}` : t('notSetValue')}
                </strong>
              </div>

              <div className="profile-bio-tile">
                <span>
                  <Flag size={13} /> {t('nationalityLabel')}
                </span>
                <strong>{profile.nationality || t('notSetValue')}</strong>
              </div>

              <div className="profile-bio-tile">
                <span>
                  <Heart size={13} /> {t('favouriteTeamLabel')}
                </span>
                <strong>{profile.favourite_team || t('notSetValue')}</strong>
              </div>

              <div className="profile-bio-tile">
                <span>
                  <Award size={13} /> {t('playstyleLabel')}
                </span>
                <strong>{profile.playstyle || t('notSetValue')}</strong>
              </div>

              <div className="profile-bio-tile">
                <span>
                  <Footprints size={13} /> {t('preferredFootLabel')}
                </span>
                <strong>{footLabel(profile.preferred_foot)}</strong>
              </div>

              {profile.age != null && (
                <div className="profile-bio-tile">
                  <span>{t('ageLabel')}</span>
                  <strong>{profile.age}</strong>
                </div>
              )}
            </div>

            {/* HEADLINE KPI STRIP */}
            <div className="profile-kpi-strip">
              <div className="profile-kpi-card highlight-kpi">
                <span>{t('sessionPoints')}</span>
                <strong>
                  <AnimatedNumber value={profile.stats.total_points} decimals={0} />
                </strong>
              </div>
              <div className="profile-kpi-card">
                <span>{t('ptsPerMatchLabel')}</span>
                <strong>
                  <AnimatedNumber value={profile.stats.points_per_match} decimals={1} />
                </strong>
              </div>
              <div className="profile-kpi-card">
                <span>{t('matchesShort')}</span>
                <strong>
                  <AnimatedNumber value={profile.stats.matches_played} decimals={0} />
                </strong>
              </div>
              <div className="profile-kpi-card">
                <span>{t('avgRatingLabel')}</span>
                <strong>
                  {profile.stats.average_rating != null ? (
                    <>
                      <Star
                        size={14}
                        style={{ color: '#e3be63', verticalAlign: 'middle', marginInlineEnd: 3 }}
                      />
                      {Number(profile.stats.average_rating).toFixed(2)}
                    </>
                  ) : (
                    t('notSetValue')
                  )}
                </strong>
              </div>
            </div>

            {/* FULL CAREER STATS */}
            <div className="profile-section-block">
              <h4>
                <Trophy size={14} /> {t('careerStatsHeading')}
              </h4>
              <div className="profile-stats-matrix">
                <div className="matrix-cell">
                  <span>⚽ {t('rule_goal')}</span>
                  <strong>{profile.stats.goals}</strong>
                </div>
                <div className="matrix-cell">
                  <span>🎯 {t('rule_assist')}</span>
                  <strong>{profile.stats.assists}</strong>
                </div>
                <div className="matrix-cell">
                  <span>🔥 {t('tabContributions')}</span>
                  <strong>{profile.stats.contributions}</strong>
                </div>
                <div className="matrix-cell">
                  <span>🧤 {t('rule_save')}</span>
                  <strong>{profile.stats.saves}</strong>
                </div>
                <div className="matrix-cell">
                  <span>🥅 {t('rule_penalty_save')}</span>
                  <strong>{profile.stats.penalty_saves}</strong>
                </div>
                <div className="matrix-cell">
                  <span>❌ {t('rule_penalty_missed')}</span>
                  <strong>{profile.stats.penalties_missed}</strong>
                </div>
                <div className="matrix-cell">
                  <span>🟨 {t('rule_yellow_card')}</span>
                  <strong>{profile.stats.yellow_cards}</strong>
                </div>
                <div className="matrix-cell">
                  <span>🟥 {t('rule_red_card')}</span>
                  <strong>{profile.stats.red_cards}</strong>
                </div>
                <div className="matrix-cell">
                  <span>👑 {t('mvpBadge')}</span>
                  <strong>{profile.stats.mvp_awards ?? 0}</strong>
                </div>
                <div className="matrix-cell">
                  <span>🎩 {t('hatTrickBadge')}</span>
                  <strong>{profile.stats.hat_tricks ?? 0}</strong>
                </div>
                <div className="matrix-cell">
                  <span>😬 {t('rule_own_goal')}</span>
                  <strong>{profile.stats.own_goals}</strong>
                </div>
              </div>
            </div>

            {/* RECENT MATCH LOG */}
            <div className="profile-section-block">
              <h4>{t('recentMatchesHeading')}</h4>
              {profile.recent_matches.length === 0 ? (
                <p className="muted tiny">{t('noRecentMatchesYet')}</p>
              ) : (
                <div className="profile-match-log">
                  {profile.recent_matches.map((m, idx) => (
                    <div
                      className="profile-match-row"
                      key={`${m.gameweek_number}-${m.match_number}-${idx}`}
                    >
                      <div className="match-row-title">
                        <strong>
                          GW {m.gameweek_number} · M{m.match_number}
                        </strong>
                        <span className="match-mini-tags">
                          {m.is_mvp && <em>👑 MVP</em>}
                          {m.goals > 0 && <em>⚽ {m.goals}</em>}
                          {m.assists > 0 && <em>🎯 {m.assists}</em>}
                          {m.saves > 0 && <em>🧤 {m.saves}</em>}
                          {m.yellow_cards > 0 && <em>🟨 {m.yellow_cards}</em>}
                          {m.red_cards > 0 && <em>🟥 {m.red_cards}</em>}
                          {m.goals === 0 &&
                            m.assists === 0 &&
                            m.saves === 0 &&
                            m.yellow_cards === 0 &&
                            m.red_cards === 0 && <em>✓ Played</em>}
                        </span>
                      </div>

                      <div className="match-row-right">
                        {m.rating != null && (
                          <span className="match-rating-chip">★ {Number(m.rating).toFixed(1)}</span>
                        )}
                        <strong className="leaderboard-stat">
                          {m.fantasy_points >= 0 ? `+${m.fantasy_points}` : m.fantasy_points}{' '}
                          {t('ptsUnit')}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FULL PHOTO LIGHTBOX OVERLAY */}
            {lightboxOpen && profile.photo_url && (
              <div
                className="photo-lightbox-backdrop"
                onClick={ev => {
                  ev.stopPropagation();
                  setLightboxOpen(false);
                }}
              >
                <div
                  className="photo-lightbox-dialog"
                  onClick={ev => ev.stopPropagation()}
                >
                  <div className="photo-lightbox-topbar">
                    <strong>
                      {profile.display_name}
                      {profile.kit_number != null ? ` · #${profile.kit_number}` : ''}
                    </strong>
                    <button
                      type="button"
                      className="secondary compact-btn"
                      onClick={() => setLightboxOpen(false)}
                    >
                      <X size={14} /> {t('closeBtn')}
                    </button>
                  </div>
                  <img
                    className="photo-lightbox-img"
                    src={profile.photo_url}
                    alt={profile.display_name}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
