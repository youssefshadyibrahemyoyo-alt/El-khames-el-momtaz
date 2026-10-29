import React, { useCallback, useEffect, useState } from 'react';
import { Crown, Eye, Flame, MessageCircle, Share2, Sparkles, Swords, Trophy } from 'lucide-react';
import type {
  CupOverview,
  CupTie,
  Gameweek,
  GameweekHighlights,
  GameweekStanding,
  H2HOverview,
  LeaderboardPlayer,
  LeaderboardTab,
  LeagueMonth,
  LeaguePlayer,
  ManagerTrophyMap,
  MonthlyStanding,
  SquadInspection,
  Standing,
} from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import {
  buildDemoInspection,
  DEMO_CUP,
  DEMO_H2H,
  DEMO_HIGHLIGHTS,
  DEMO_MONTHLY_STANDINGS,
  DEMO_MONTHS,
  DEMO_STANDINGS,
} from '../lib/demoData';
import {
  openWhatsAppShare,
  shareOrDownloadHighlightsCard,
} from '../lib/shareCardCanvas';
import SquadInspectorModal from '../components/SquadInspectorModal';
import FutPlayerCard from '../components/FutPlayerCard';
import AnimatedNumber from '../components/AnimatedNumber';

type LeaderboardScreenProps = {
  demoMode: boolean;
  currentUserId?: string;
  isAdmin: boolean;
  standings: Standing[];
  standingsLoading: boolean;
  standingsError: string;
  gameweeks: Gameweek[];
  demoPlayers: LeaguePlayer[];
  trophies?: ManagerTrophyMap;
  onCupChanged?: () => void;
  onOpenPlayerProfile: (playerId: string) => void;
};

export default function LeaderboardScreen({
  demoMode,
  currentUserId,
  isAdmin,
  standings,
  standingsLoading,
  standingsError,
  gameweeks,
  demoPlayers,
  trophies = {},
  onCupChanged,
  onOpenPlayerProfile,
}: LeaderboardScreenProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<LeaderboardTab>('managers');
  const [selectedGwId, setSelectedGwId] = useState<'overall' | `month:${string}` | number>('overall');
  const [gwStandings, setGwStandings] = useState<GameweekStanding[]>([]);
  const [leagueMonths, setLeagueMonths] = useState<LeagueMonth[]>(demoMode ? DEMO_MONTHS : []);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyStanding[]>(
    demoMode ? DEMO_MONTHLY_STANDINGS : []
  );
  const [gwLoading, setGwLoading] = useState(false);

  // H2H state
  const [h2hGwId, setH2hGwId] = useState<number | 'latest'>('latest');
  const [h2hData, setH2hData] = useState<H2HOverview | null>(null);
  const [h2hLoading, setH2hLoading] = useState(false);

  // Highlights / Banter state
  const [highlightGwId, setHighlightGwId] = useState<number | 'latest'>('latest');
  const [highlights, setHighlights] = useState<GameweekHighlights | null>(null);
  const [highlightsLoading, setHighlightsLoading] = useState(false);

  // Knockout Cup state
  const [cupData, setCupData] = useState<CupOverview | null>(null);
  const [cupLoading, setCupLoading] = useState(false);
  const [cupBusy, setCupBusy] = useState(false);
  const [cupMsg, setCupMsg] = useState('');

  const loadCup = useCallback(async () => {
    if (demoMode || !supabase) {
      setCupData(DEMO_CUP);
      return;
    }
    setCupLoading(true);
    const { data, error } = await supabase.rpc('get_cup_overview');
    if (!error && data) {
      setCupData(data as CupOverview);
    }
    setCupLoading(false);
  }, [demoMode]);

  useEffect(() => {
    if (tab !== 'cup') return;
    void loadCup();
  }, [tab, loadCup]);

  async function handleLaunchCup() {
    if (demoMode || !supabase) return;
    const customName = window.prompt(
      'Enter a name for the Knockout Cup tournament:',
      'El Khames Cup'
    );
    if (!customName || !customName.trim()) return;
    setCupBusy(true);
    setCupMsg('');
    try {
      const { error } = await supabase.rpc('admin_create_cup', {
        p_name: customName.trim(),
      });
      if (error) {
        setCupMsg(error.message);
      } else {
        setCupMsg(`🏆 Launched "${customName.trim()}"!`);
        await loadCup();
        onCupChanged?.();
      }
    } finally {
      setCupBusy(false);
    }
  }

  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState('');

  const [inspectTarget, setInspectTarget] = useState<{
    managerId: string;
    managerName: string;
    gw: Gameweek;
  } | null>(null);
  const [inspectData, setInspectData] = useState<SquadInspection | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState('');

  const scoredGameweeks = gameweeks.filter(g =>
    ['active', 'finished'].includes(String(g.status).toLowerCase())
  );
  const latestScoredGw =
    scoredGameweeks[scoredGameweeks.length - 1] ?? gameweeks[gameweeks.length - 1] ?? null;

  useEffect(() => {
    if (demoMode || !supabase) {
      setLeagueMonths(DEMO_MONTHS);
      return;
    }
    let cancelled = false;
    supabase.rpc('list_league_months').then(({ data, error }) => {
      if (cancelled || error || !data) return;
      setLeagueMonths(data as LeagueMonth[]);
    });
    return () => {
      cancelled = true;
    };
  }, [demoMode, gameweeks.length]);

  useEffect(() => {
    if (demoMode || !supabase || tab !== 'managers' || selectedGwId === 'overall') return;
    let cancelled = false;
    setGwLoading(true);

    if (typeof selectedGwId === 'string' && selectedGwId.startsWith('month:')) {
      const mKey = selectedGwId.slice('month:'.length);
      supabase.rpc('monthly_standings', { p_month_key: mKey }).then(({ data, error }) => {
        if (cancelled) return;
        if (!error) {
          setMonthlyRows(
            ((data ?? []) as MonthlyStanding[]).map(r => ({
              ...r,
              points: Number(r.points) || 0,
              gameweeks_played: Number(r.gameweeks_played) || 0,
            }))
          );
        }
        setGwLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    supabase.rpc('gameweek_standings', { p_gameweek_id: selectedGwId }).then(({ data, error }) => {
      if (cancelled) return;
      if (!error) {
        setGwStandings(
          ((data ?? []) as GameweekStanding[]).map(r => ({
            ...r,
            points: Number(r.points) || 0,
          }))
        );
      }
      setGwLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [demoMode, tab, selectedGwId]);

  // Load 1v1 Head-to-Head
  useEffect(() => {
    if (tab !== 'h2h') return;
    if (demoMode || !supabase) {
      setH2hData(DEMO_H2H);
      return;
    }
    let cancelled = false;
    setH2hLoading(true);
    supabase
      .rpc('get_h2h_overview', {
        p_gameweek_id: h2hGwId === 'latest' ? null : h2hGwId,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setH2hData(data as H2HOverview);
        }
        setH2hLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demoMode, tab, h2hGwId]);

  // Load TOTW & Banter Highlights
  useEffect(() => {
    if (tab !== 'highlights') return;
    if (demoMode || !supabase) {
      setHighlights(DEMO_HIGHLIGHTS);
      return;
    }
    let cancelled = false;
    setHighlightsLoading(true);
    supabase
      .rpc('get_gameweek_highlights', {
        p_gameweek_id: highlightGwId === 'latest' ? null : highlightGwId,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setHighlights(data as GameweekHighlights);
        }
        setHighlightsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demoMode, tab, highlightGwId]);

  // Load player stat leaderboards
  useEffect(() => {
    if (
      demoMode ||
      !supabase ||
      tab === 'managers' ||
      tab === 'h2h' ||
      tab === 'cup' ||
      tab === 'highlights'
    ) {
      return;
    }
    let cancelled = false;
    setPlayersLoading(true);
    setPlayersError('');

    const viewByTab = {
      goals: 'top_scorers',
      assists: 'top_assists',
      contributions: 'goal_contributions',
      ratings: 'player_ratings',
    } as const;

    supabase
      .from(viewByTab[tab])
      .select('*')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setPlayersError(error.message);
          setPlayers([]);
        } else {
          setPlayers((data ?? []) as LeaderboardPlayer[]);
        }
        setPlayersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [demoMode, tab]);

  async function openInspector(managerId: string, managerName: string) {
    if (demoMode) {
      const fakeGw: Gameweek = {
        id: 2,
        number: 2,
        status: 'active',
        transfer_deadline: null,
        started_at: null,
        ended_at: null,
      };
      setInspectTarget({ managerId, managerName, gw: fakeGw });
      setInspectData(buildDemoInspection(managerName));
      setInspectError('');
      return;
    }

    const gwToInspect =
      typeof selectedGwId === 'number'
        ? (gameweeks.find(g => g.id === selectedGwId) ?? latestScoredGw)
        : latestScoredGw;

    if (!gwToInspect || !supabase) return;

    setInspectTarget({ managerId, managerName, gw: gwToInspect });
    setInspectLoading(true);
    setInspectError('');
    setInspectData(null);

    const { data, error } = await supabase.rpc('inspect_gameweek_squad', {
      p_gameweek_id: gwToInspect.id,
      p_manager_id: managerId,
    });

    setInspectLoading(false);
    if (error) {
      setInspectError(error.message);
    } else {
      setInspectData(data as SquadInspection);
    }
  }

  const tabs: { id: LeaderboardTab; label: string }[] = [
    { id: 'managers', label: t('tabManagers') },
    { id: 'h2h', label: `⚔️ ${t('tabH2H')}` },
    { id: 'cup', label: `🏆 ${t('tabCup')}` },
    { id: 'highlights', label: `✨ ${t('tabHighlights')}` },
    { id: 'goals', label: t('tabGoals') },
    { id: 'assists', label: t('tabAssists') },
    { id: 'contributions', label: t('tabContributions') },
    { id: 'ratings', label: t('tabRatings') },
  ];

  const descriptions: Record<LeaderboardTab, string> = {
    managers: t('descManagers'),
    h2h: t('descH2H'),
    cup: t('descCup'),
    highlights: t('descHighlights'),
    goals: `${t('descGoals')} · ${t('tapForProfileHint')}`,
    assists: `${t('descAssists')} · ${t('tapForProfileHint')}`,
    contributions: `${t('descContributions')} · ${t('tapForProfileHint')}`,
    ratings: `${t('descRatings')} · ${t('tapForProfileHint')}`,
  };

  const statValue = (p: LeaderboardPlayer) => {
    if (tab === 'goals') return p.goals ?? p.total_goals ?? 0;
    if (tab === 'assists') return p.assists ?? p.total_assists ?? 0;
    if (tab === 'contributions') return p.contributions ?? p.total_contributions ?? 0;
    return p.average_rating == null ? '—' : Number(p.average_rating).toFixed(2);
  };

  const canInspectGw = (managerId: string): boolean => {
    if (demoMode) return true;
    const gw =
      typeof selectedGwId === 'number'
        ? (gameweeks.find(g => g.id === selectedGwId) ?? latestScoredGw)
        : latestScoredGw;
    if (!gw) return false;
    const locked =
      ['active', 'finished'].includes(String(gw.status).toLowerCase()) ||
      (Boolean(gw.transfer_deadline) && Date.now() >= new Date(gw.transfer_deadline!).getTime());
    return locked || managerId === currentUserId || isAdmin;
  };

  const podiumClassFor = (idx: number) =>
    idx === 0
      ? 'podium-gold'
      : idx === 1
        ? 'podium-silver'
        : idx === 2
          ? 'podium-bronze'
          : '';

  const medalBadgeFor = (idx: number) =>
    idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : String(idx + 1).padStart(2, '0');

  const podiumSubtitleFor = (idx: number) =>
    idx === 0
      ? t('podiumChampion')
      : idx === 1
        ? t('podiumRunnerUp')
        : idx === 2
          ? t('podiumThird')
          : null;

  const managerRows = demoMode
    ? DEMO_STANDINGS.map(s => ({
        manager_id: s.manager_id,
        display_name: s.display_name,
        team_name: s.team_name ?? null,
        avatar_url: s.avatar_url ?? null,
        primaryPoints: s.total_points,
        subLabel: `${s.last_gameweek_points} ${t('ptsUnit')} (${t('lastGwPts')})`,
      }))
    : selectedGwId === 'overall'
      ? standings.map(s => ({
          manager_id: s.manager_id,
          display_name: s.display_name,
          team_name: s.team_name ?? null,
          avatar_url: s.avatar_url ?? null,
          primaryPoints: s.total_points,
          subLabel: `${s.last_gameweek_points} ${t('ptsUnit')} (${t('lastGwPts')})`,
        }))
      : typeof selectedGwId === 'string' && selectedGwId.startsWith('month:')
        ? monthlyRows.map(s => ({
            manager_id: s.manager_id,
            display_name: s.display_name,
            team_name: s.team_name ?? null,
            avatar_url: s.avatar_url ?? null,
            primaryPoints: s.points,
            subLabel: `${s.gameweeks_played} ${t('monthlyRoundsPlayed')}`,
          }))
        : gwStandings.map(s => ({
            manager_id: s.manager_id,
            display_name: s.display_name,
            team_name: s.team_name ?? null,
            avatar_url: s.avatar_url ?? null,
            primaryPoints: s.points,
            subLabel: t('gwPtsLabel'),
          }));

  const isPlayerStatTab =
    tab === 'goals' || tab === 'assists' || tab === 'contributions' || tab === 'ratings';

  return (
    <section
      className="panel stagger-item"
      style={{ '--stagger-i': 0 } as React.CSSProperties}
    >
      <div className="panel-heading">
        <div>
          <h3>
            {tab === 'managers'
              ? t('leagueTableTitle')
              : tab === 'h2h'
                ? t('h2hTableHeading')
                : tab === 'cup'
                  ? t('tabCup')
                  : tab === 'highlights'
                    ? t('totwHeading')
                    : t('playerLeaderboardTitle')}
          </h3>
          <p>{descriptions[tab]}</p>
        </div>
        <Trophy color="#b9954b" />
      </div>

      <div className="leaderboard-tabs">
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'primary tab-pill-active' : 'secondary'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 1. CLASSIC MANAGERS STANDINGS */}
      {tab === 'managers' && (demoMode || gameweeks.length > 0 || leagueMonths.length > 0) && (
        <div className="gw-picker-bar">
          <select
            className="player-price-filter"
            value={selectedGwId}
            onChange={e => {
              const val = e.target.value;
              if (val === 'overall') setSelectedGwId('overall');
              else if (val.startsWith('month:')) setSelectedGwId(val as `month:${string}`);
              else setSelectedGwId(Number(val));
            }}
          >
            <option value="overall">{t('overallSeason')}</option>
            {leagueMonths.map(m => (
              <option key={m.month_key} value={`month:${m.month_key}`}>
                📅 {t('monthlyFilterPrefix')} {m.month_label} ({m.gameweeks_count} GW)
              </option>
            ))}
            {gameweeks.map(g => (
              <option key={g.id} value={g.id}>
                {t('gameweekOption')} {g.number} ({g.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {tab === 'managers' && (
        <div key={`mgr-${selectedGwId}`} className="screen-stage">
          {(standingsLoading || gwLoading) && <p className="muted">{t('loadingPoints')}</p>}
          {standingsError && <div className="notice">{standingsError}</div>}
          {!standingsLoading && !gwLoading && !standingsError && (
            <div className="leaderboard-list">
              {managerRows.length === 0 ? (
                <p className="muted">{t('noManagersYet')}</p>
              ) : (
                managerRows.map((row, index) => {
                  const inspectable = canInspectGw(row.manager_id);
                  const podiumTag = podiumSubtitleFor(index);

                  return (
                    <div
                      className={[
                        'leaderboard-player',
                        'stagger-item',
                        podiumClassFor(index),
                        row.manager_id === currentUserId ? 'is-me' : '',
                        inspectable ? 'clickable-row' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ '--stagger-i': Math.min(index, 10) } as React.CSSProperties}
                      key={row.manager_id}
                      onClick={() => {
                        if (inspectable) void openInspector(row.manager_id, row.display_name);
                      }}
                    >
                      <span className={`rank ${index < 3 ? 'podium-rank' : ''}`}>
                        {medalBadgeFor(index)}
                      </span>

                      {row.avatar_url ? (
                        <img
                          className="leaderboard-photo"
                          src={row.avatar_url}
                          alt={row.display_name}
                        />
                      ) : (
                        <div className="player-photo small-photo">
                          {(row.display_name || '?').slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div className="leaderboard-player-info">
                        <strong style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span>
                            {row.team_name ? `${row.team_name} · ` : ''}
                            {row.display_name}
                            {row.manager_id === currentUserId ? ` ${t('youTag')}` : ''}
                          </span>
                          {(trophies[row.manager_id]?.cup_wins ?? 0) > 0 && (
                            <span
                              className="trophy-inline-badge trophy-inline-cup"
                              title={t('trophyCupWins')}
                            >
                              🏆 ×{trophies[row.manager_id].cup_wins}
                            </span>
                          )}
                          {(trophies[row.manager_id]?.motm_wins ?? 0) > 0 && (
                            <span
                              className="trophy-inline-badge trophy-inline-motm"
                              title={t('trophyMotmWins')}
                            >
                              🥇 ×{trophies[row.manager_id].motm_wins}
                            </span>
                          )}
                          {(trophies[row.manager_id]?.gw_wins ?? 0) > 0 && (
                            <span
                              className="trophy-inline-badge trophy-inline-gw"
                              title={t('trophyGwWins')}
                            >
                              👑 ×{trophies[row.manager_id].gw_wins}
                            </span>
                          )}
                        </strong>
                        <span>
                          {podiumTag ? `${podiumTag} · ` : ''}
                          {row.subLabel}
                        </span>
                      </div>

                      {inspectable && (
                        <span className="inspect-hint">
                          <Eye size={13} /> {t('viewSquadAction')}
                        </span>
                      )}

                      <strong className="leaderboard-stat">
                        <AnimatedNumber value={row.primaryPoints} decimals={0} /> {t('ptsUnit')}
                      </strong>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. WEEKLY 1v1 HEAD-TO-HEAD RIVALRIES */}
      {tab === 'h2h' && (
        <div className="screen-stage" key={`h2h-${h2hGwId}`}>
          {!demoMode && gameweeks.length > 0 && (
            <div className="gw-picker-bar">
              <select
                className="player-price-filter"
                value={h2hGwId}
                onChange={e =>
                  setH2hGwId(e.target.value === 'latest' ? 'latest' : Number(e.target.value))
                }
              >
                <option value="latest">Latest Gameweek</option>
                {gameweeks.map(g => (
                  <option key={g.id} value={g.id}>
                    {t('gameweekOption')} {g.number} ({g.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {h2hLoading && <p className="muted">{t('loadingPoints')}</p>}

          {!h2hLoading && h2hData && (
            <>
              <h4 className="sub-section-heading">
                <Swords size={15} /> {t('h2hFixturesHeading')}
                {h2hData.gameweek_number ? ` · GW #${h2hData.gameweek_number}` : ''}
              </h4>

              {h2hData.fixtures.length === 0 ? (
                <div className="gw-empty-state" style={{ marginBottom: 16 }}>
                  <p className="muted tiny" style={{ margin: 0 }}>
                    {t('h2hNoFixturesYet')}
                  </p>
                </div>
              ) : (
                <div className="h2h-fixtures-grid">
                  {h2hData.fixtures.map(fx => (
                    <div className="h2h-fixture-card" key={fx.id}>
                      <div
                        className={`h2h-side ${fx.winner === 'home' ? 'h2h-side-winner' : ''}`}
                      >
                        {fx.home.avatar_url ? (
                          <img
                            className="leaderboard-photo"
                            src={fx.home.avatar_url}
                            alt={fx.home.display_name}
                          />
                        ) : (
                          <div className="player-photo small-photo">
                            {fx.home.display_name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="h2h-side-meta">
                          <strong>{fx.home.team_name || fx.home.display_name}</strong>
                          {fx.home.team_name && <span>{fx.home.display_name}</span>}
                        </div>
                      </div>

                      <div className="h2h-scorebox">
                        {fx.winner === 'pending' ? (
                          <span className="h2h-vs-pill">VS</span>
                        ) : (
                          <strong>
                            {fx.home.points} — {fx.away.points}
                          </strong>
                        )}
                      </div>

                      <div
                        className={`h2h-side h2h-side-away ${
                          fx.winner === 'away' ? 'h2h-side-winner' : ''
                        }`}
                      >
                        <div className="h2h-side-meta">
                          <strong>{fx.away.team_name || fx.away.display_name}</strong>
                          {fx.away.team_name && <span>{fx.away.display_name}</span>}
                        </div>
                        {fx.away.avatar_url ? (
                          <img
                            className="leaderboard-photo"
                            src={fx.away.avatar_url}
                            alt={fx.away.display_name}
                          />
                        ) : (
                          <div className="player-photo small-photo">
                            {fx.away.is_average
                              ? '⚡'
                              : fx.away.display_name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h4 className="sub-section-heading" style={{ marginTop: 18 }}>
                <Trophy size={15} /> {t('h2hTableHeading')}
              </h4>

              <div className="admin-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Manager</th>
                      <th>P</th>
                      <th>W</th>
                      <th>D</th>
                      <th>L</th>
                      <th>PF</th>
                      <th>H2H Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h2hData.standings.map((row, idx) => (
                      <tr key={row.manager_id}>
                        <td>
                          <strong>{medalBadgeFor(idx)}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {row.avatar_url ? (
                              <img
                                className="leaderboard-photo"
                                src={row.avatar_url}
                                alt={row.display_name}
                                style={{ width: 30, height: 30, flexBasis: 30 }}
                              />
                            ) : (
                              <div
                                className="player-photo small-photo"
                                style={{ width: 30, height: 30, fontSize: 12 }}
                              >
                                {row.display_name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <strong>{row.team_name || row.display_name}</strong>
                              {row.team_name && (
                                <span className="muted tiny" style={{ display: 'block' }}>
                                  {row.display_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{row.played}</td>
                        <td>{row.wins}</td>
                        <td>{row.draws}</td>
                        <td>{row.losses}</td>
                        <td>{row.points_for}</td>
                        <td>
                          <strong style={{ color: 'var(--gold-text)' }}>
                            {row.h2h_points} pts
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2B. KNOCKOUT CUP BRACKET */}
      {tab === 'cup' && (
        <div className="screen-stage" key="cup-bracket">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              {cupData?.has_cup && (
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Trophy size={16} style={{ color: 'var(--gold)' }} />
                  {cupData.name}
                  <span
                    className={`gw-status-pill ${
                      cupData.status === 'completed' ? 'gw-status-finished' : 'gw-status-active'
                    }`}
                  >
                    {cupData.status}
                  </span>
                </h4>
              )}
            </div>

            {isAdmin && !demoMode && (
              <button
                type="button"
                className="primary compact-btn"
                disabled={cupBusy}
                onClick={() => void handleLaunchCup()}
              >
                <Trophy size={14} /> {t('cupLaunchBtn')}
              </button>
            )}
          </div>

          {cupMsg && <div className="notice">{cupMsg}</div>}
          {cupLoading && <p className="muted">{t('loadingPoints')}</p>}

          {!cupLoading && (!cupData || !cupData.has_cup) && (
            <div className="gw-empty-state">
              <Trophy size={28} style={{ color: 'var(--gold)', marginBottom: 6 }} />
              <p className="muted" style={{ margin: 0 }}>
                {t('cupNoTournamentYet')}
              </p>
            </div>
          )}

          {!cupLoading && cupData?.has_cup && (
            <>
              {cupData.champion && (
                <div className="cup-champion-banner">
                  <Crown size={24} />
                  <div>
                    <span className="eyebrow">{t('cupChampionTitle')}</span>
                    <strong>
                      {cupData.champion.team_name || cupData.champion.display_name}
                    </strong>
                    {cupData.champion.team_name && (
                      <small style={{ display: 'block', opacity: 0.85 }}>
                        {cupData.champion.display_name}
                      </small>
                    )}
                  </div>
                </div>
              )}

              <div className="cup-bracket-columns">
                {Array.from(
                  (cupData.ties ?? []).reduce((acc, tie) => {
                    const list = acc.get(tie.round_order) ?? [];
                    list.push(tie);
                    acc.set(tie.round_order, list);
                    return acc;
                  }, new Map<number, CupTie[]>())
                )
                  .sort(([a], [b]) => a - b)
                  .map(([roundOrder, roundTies]) => (
                    <div className="cup-round-column" key={roundOrder}>
                      <div className="cup-round-header">
                        <strong>{roundTies[0]?.round_name ?? `Round ${roundOrder}`}</strong>
                        {roundTies[0]?.gameweek_number && (
                          <span>GW #{roundTies[0].gameweek_number}</span>
                        )}
                      </div>

                      <div className="cup-round-ties">
                        {roundTies.map(tie => {
                          const homeWon =
                            tie.winner_manager_id != null &&
                            tie.winner_manager_id === tie.home.manager_id;
                          const awayWon =
                            tie.winner_manager_id != null &&
                            tie.winner_manager_id === tie.away.manager_id;

                          return (
                            <div className="cup-tie-card" key={tie.id}>
                              <div className={`cup-tie-side ${homeWon ? 'cup-side-winner' : ''}`}>
                                <span className="cup-side-name">
                                  {tie.home.is_bye
                                    ? t('cupByeLabel')
                                    : tie.home.team_name || tie.home.display_name}
                                </span>
                                <strong className="cup-side-pts">
                                  {tie.home.is_bye ? '—' : tie.home.points}
                                </strong>
                              </div>

                              <div className={`cup-tie-side ${awayWon ? 'cup-side-winner' : ''}`}>
                                <span className="cup-side-name">
                                  {tie.away.is_bye
                                    ? t('cupByeLabel')
                                    : tie.away.team_name || tie.away.display_name}
                                </span>
                                <strong className="cup-side-pts">
                                  {tie.away.is_bye ? '—' : tie.away.points}
                                </strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. TEAM OF THE WEEK & BANTER TROPHIES */}
      {tab === 'highlights' && (
        <div className="screen-stage" key={`hl-${highlightGwId}`}>
          {!demoMode && scoredGameweeks.length > 0 && (
            <div className="gw-picker-bar">
              <select
                className="player-price-filter"
                value={highlightGwId}
                onChange={e =>
                  setHighlightGwId(e.target.value === 'latest' ? 'latest' : Number(e.target.value))
                }
              >
                <option value="latest">Latest Scored Round</option>
                {scoredGameweeks.map(g => (
                  <option key={g.id} value={g.id}>
                    {t('gameweekOption')} {g.number}
                  </option>
                ))}
              </select>
            </div>
          )}

          {highlightsLoading && <p className="muted">{t('loadingPoints')}</p>}

          {!highlightsLoading && (!highlights || !highlights.has_data) && (
            <div className="gw-empty-state">
              <Sparkles size={26} style={{ color: 'var(--gold)', marginBottom: 6 }} />
              <p className="muted" style={{ margin: 0 }}>
                {t('noHighlightsYet')}
              </p>
            </div>
          )}

          {!highlightsLoading && highlights && highlights.has_data && (
            <>
              {/* DREAM 5 TEAM OF THE WEEK PITCH */}
              <div className="totw-banner-head">
                <div>
                  <span className="eyebrow">GW #{highlights.gameweek_number}</span>
                  <h4>{t('totwHeading')}</h4>
                  <span className="muted tiny">{t('totwSub')}</span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="primary compact-btn"
                    onClick={() => void shareOrDownloadHighlightsCard(highlights)}
                  >
                    <Share2 size={13} /> {t('shareRecapCardBtn')}
                  </button>
                  <button
                    type="button"
                    className="secondary compact-btn"
                    onClick={() => {
                      const gwN = highlights.gameweek_number ?? 1;
                      const king =
                        highlights.awards?.gw_champion?.team_name ||
                        highlights.awards?.gw_champion?.display_name ||
                        '—';
                      const kingPts = highlights.awards?.gw_champion?.points ?? 0;
                      const boot = highlights.awards?.golden_boot?.display_name || '—';
                      const bootGoals = highlights.awards?.golden_boot?.goals ?? 0;
                      const totwLine = (highlights.team_of_the_week ?? [])
                        .map(p => `${p.display_name} (${p.points})`)
                        .join(', ');
                      openWhatsAppShare(
                        `🏆 *EL KHAMES EL MOMTAZ — GW #${gwN} RECAP!*\n\n👑 *King of Thursday:* ${king} (${kingPts} pts)\n⚽ *Golden Boot:* ${boot} (${bootGoals} goals)\n🌟 *Dream V TOTW:* ${totwLine}\n\n🗳️ Cast your *Fans’ Player of the Night* vote now:\n👉 https://elkhameselmomtaz.vercel.app/`
                      );
                    }}
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </button>
                </div>
              </div>

              <div className="egypt-pitch pitch-3d-stadium" style={{ marginBottom: 18 }}>
                <div className="egypt-pitch-line" />
                <div className="egypt-pitch-circle" />
                <div className="egypt-pitch-grid">
                  {(highlights.team_of_the_week ?? []).map((p, idx) => (
                    <FutPlayerCard
                      key={p.player_id}
                      slotNumber={idx + 1}
                      kitNumber={p.kit_number}
                      name={p.display_name}
                      photoUrl={p.photo_url}
                      isCaptain={idx === 0}
                      statLabel={`${p.points} ${t('ptsUnit')}`}
                      secondaryNote={
                        [
                          p.goals > 0 ? `⚽${p.goals}` : '',
                          p.assists > 0 ? `🎯${p.assists}` : '',
                          p.mvp_count > 0 ? `👑MVP` : '',
                        ]
                          .filter(Boolean)
                          .join(' · ') || undefined
                      }
                      onCardClick={() => onOpenPlayerProfile(p.player_id)}
                      onOpenProfile={() => onOpenPlayerProfile(p.player_id)}
                    />
                  ))}
                </div>
              </div>

              {/* BANTER AWARDS & TROPHIES GRID */}
              <h4 className="sub-section-heading">
                <Flame size={15} /> {t('banterAwardsHeading')}
              </h4>

              <div className="banter-awards-grid">
                {highlights.awards?.gw_champion && (
                  <div className="banter-award-card award-gold">
                    <div className="banter-award-icon">
                      <Crown size={20} />
                    </div>
                    <div>
                      <span className="banter-award-tag">{t('awardGwChampion')}</span>
                      <strong>
                        {highlights.awards.gw_champion.team_name ||
                          highlights.awards.gw_champion.display_name}
                      </strong>
                      <p>
                        {highlights.awards.gw_champion.display_name} ·{' '}
                        <b>
                          {highlights.awards.gw_champion.points} {t('ptsUnit')}
                        </b>
                      </p>
                    </div>
                  </div>
                )}

                {highlights.awards?.golden_boot && (
                  <div
                    className="banter-award-card clickable-row"
                    onClick={() =>
                      onOpenPlayerProfile(highlights.awards!.golden_boot!.player_id)
                    }
                  >
                    <div className="banter-award-icon">⚽</div>
                    <div>
                      <span className="banter-award-tag">{t('awardGoldenBoot')}</span>
                      <strong>{highlights.awards.golden_boot.display_name}</strong>
                      <p>
                        <b>{highlights.awards.golden_boot.goals}</b> {t('rule_goal')} in GW #
                        {highlights.gameweek_number}
                      </p>
                    </div>
                  </div>
                )}

                {highlights.awards?.captain_genius && (
                  <div className="banter-award-card">
                    <div className="banter-award-icon">🧠</div>
                    <div>
                      <span className="banter-award-tag">{t('awardCaptainGenius')}</span>
                      <strong>{highlights.awards.captain_genius.display_name}</strong>
                      <p>
                        Captained <b>{highlights.awards.captain_genius.player_name}</b> for{' '}
                        <b>
                          +{highlights.awards.captain_genius.captain_points} {t('ptsUnit')}
                        </b>
                      </p>
                    </div>
                  </div>
                )}

                {highlights.awards?.bench_pain && (
                  <div className="banter-award-card award-banter-pain">
                    <div className="banter-award-icon">😭</div>
                    <div>
                      <span className="banter-award-tag">{t('awardBenchPain')}</span>
                      <strong>{highlights.awards.bench_pain.display_name}</strong>
                      <p>
                        Left <b>{highlights.awards.bench_pain.bench_points} pts</b> rotting on the
                        bench ({highlights.awards.bench_pain.bench_names})!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. PLAYER STAT TABS (Goals, Assists, Contributions, Ratings) */}
      {isPlayerStatTab && !demoMode && (
        <div key={tab} className="screen-stage">
          {playersLoading && <p className="muted">{t('loadingPoints')}</p>}
          {playersError && <div className="notice">{playersError}</div>}
          {!playersLoading && !playersError && (
            <div className="leaderboard-list">
              {players.length === 0 ? (
                <p className="muted">{t('noStatsYet')}</p>
              ) : (
                [...players]
                  .sort((a, b) => (Number(statValue(b)) || 0) - (Number(statValue(a)) || 0))
                  .map((p, index) => (
                    <div
                      className={`leaderboard-player clickable-row stagger-item ${podiumClassFor(index)}`}
                      style={{ '--stagger-i': Math.min(index, 12) } as React.CSSProperties}
                      key={p.player_id}
                      onClick={() => onOpenPlayerProfile(p.player_id)}
                    >
                      <span className={`rank ${index < 3 ? 'podium-rank' : ''}`}>
                        {medalBadgeFor(index)}
                      </span>
                      {p.photo_url ? (
                        <img
                          className="leaderboard-photo"
                          src={p.photo_url}
                          alt={p.display_name}
                        />
                      ) : (
                        <div className="player-photo small-photo">
                          {(p.display_name || '?').slice(0, 1)}
                        </div>
                      )}
                      <div className="leaderboard-player-info">
                        <strong>{p.display_name}</strong>
                        {tab === 'ratings' && (
                          <span>
                            {p.rated_matches ?? p.matches_rated ?? 0} {t('ratingsCountSuffix')}
                          </span>
                        )}
                      </div>
                      <strong className="leaderboard-stat">
                        {statValue(p)}
                        {tab === 'ratings'
                          ? ''
                          : ` ${tab === 'contributions' ? 'G+A' : tab === 'goals' ? 'G' : 'A'}`}
                      </strong>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      )}

      {isPlayerStatTab && demoMode && (
        <div className="leaderboard-list screen-stage" key={`demo-${tab}`}>
          {demoPlayers.slice(0, 6).map((p, index) => (
            <div
              className={`leaderboard-player clickable-row stagger-item ${podiumClassFor(index)}`}
              style={{ '--stagger-i': index } as React.CSSProperties}
              key={p.id}
              onClick={() => onOpenPlayerProfile(p.id)}
            >
              <span className={`rank ${index < 3 ? 'podium-rank' : ''}`}>
                {medalBadgeFor(index)}
              </span>
              <div className="player-photo small-photo">{p.name.slice(0, 1)}</div>
              <div className="leaderboard-player-info">
                <strong>
                  {p.kit_number != null && (
                    <span className="inline-kit-chip">#{p.kit_number}</span>
                  )}
                  {p.name}
                </strong>
              </div>
              <strong className="leaderboard-stat">
                {tab === 'ratings'
                  ? '8.40'
                  : tab === 'contributions'
                    ? `${Math.round(p.points / 3)} G+A`
                    : `${Math.round(p.points / 4)} ${tab === 'goals' ? 'G' : 'A'}`}
              </strong>
            </div>
          ))}
        </div>
      )}

      {inspectTarget && (
        <SquadInspectorModal
          managerName={inspectTarget.managerName}
          gameweekNumber={inspectTarget.gw.number}
          loading={inspectLoading}
          error={inspectError}
          inspection={inspectData}
          onOpenPlayerProfile={playerId => onOpenPlayerProfile(playerId)}
          onClose={() => setInspectTarget(null)}
        />
      )}
    </section>
  );
}
