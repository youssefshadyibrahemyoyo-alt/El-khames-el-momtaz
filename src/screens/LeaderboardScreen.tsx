import React, { useEffect, useState } from 'react';
import { Eye, Trophy } from 'lucide-react';
import type {
  Gameweek,
  GameweekStanding,
  LeaderboardPlayer,
  LeaderboardTab,
  LeaguePlayer,
  SquadInspection,
  Standing,
} from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { buildDemoInspection, DEMO_STANDINGS } from '../lib/demoData';
import SquadInspectorModal from '../components/SquadInspectorModal';
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
}: LeaderboardScreenProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<LeaderboardTab>('managers');
  const [selectedGwId, setSelectedGwId] = useState<'overall' | number>('overall');
  const [gwStandings, setGwStandings] = useState<GameweekStanding[]>([]);
  const [gwLoading, setGwLoading] = useState(false);

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
    if (demoMode || !supabase || tab !== 'managers' || selectedGwId === 'overall') return;
    let cancelled = false;
    setGwLoading(true);
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

  useEffect(() => {
    if (demoMode || !supabase || tab === 'managers') return;
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
      selectedGwId === 'overall'
        ? latestScoredGw
        : (gameweeks.find(g => g.id === selectedGwId) ?? latestScoredGw);

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
    { id: 'goals', label: t('tabGoals') },
    { id: 'assists', label: t('tabAssists') },
    { id: 'contributions', label: t('tabContributions') },
    { id: 'ratings', label: t('tabRatings') },
  ];

  const descriptions: Record<LeaderboardTab, string> = {
    managers: t('descManagers'),
    goals: t('descGoals'),
    assists: t('descAssists'),
    contributions: t('descContributions'),
    ratings: t('descRatings'),
  };

  const statValue = (p: LeaderboardPlayer) => {
    if (tab === 'goals') return p.total_goals ?? 0;
    if (tab === 'assists') return p.total_assists ?? 0;
    if (tab === 'contributions') return p.total_contributions ?? 0;
    return p.average_rating == null ? '—' : Number(p.average_rating).toFixed(2);
  };

  const canInspectGw = (managerId: string): boolean => {
    if (demoMode) return true;
    const gw =
      selectedGwId === 'overall'
        ? latestScoredGw
        : (gameweeks.find(g => g.id === selectedGwId) ?? latestScoredGw);
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
        primaryPoints: s.total_points,
        subLabel: `${s.last_gameweek_points} ${t('ptsUnit')} (${t('lastGwPts')})`,
      }))
    : selectedGwId === 'overall'
      ? standings.map(s => ({
          manager_id: s.manager_id,
          display_name: s.display_name,
          primaryPoints: s.total_points,
          subLabel: `${s.last_gameweek_points} ${t('ptsUnit')} (${t('lastGwPts')})`,
        }))
      : gwStandings.map(s => ({
          manager_id: s.manager_id,
          display_name: s.display_name,
          primaryPoints: s.points,
          subLabel: t('gwPtsLabel'),
        }));

  return (
    <section
      className="panel stagger-item"
      style={{ '--stagger-i': 0 } as React.CSSProperties}
    >
      <div className="panel-heading">
        <div>
          <h3>{tab === 'managers' ? t('leagueTableTitle') : t('playerLeaderboardTitle')}</h3>
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

      {tab === 'managers' && !demoMode && gameweeks.length > 0 && (
        <div className="gw-picker-bar">
          <select
            className="player-price-filter"
            value={selectedGwId}
            onChange={e =>
              setSelectedGwId(e.target.value === 'overall' ? 'overall' : Number(e.target.value))
            }
          >
            <option value="overall">{t('overallSeason')}</option>
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
                      <div className="player-photo small-photo">
                        {(row.display_name || '?').slice(0, 1)}
                      </div>
                      <div className="leaderboard-player-info">
                        <strong>
                          {row.display_name}
                          {row.manager_id === currentUserId ? ` ${t('youTag')}` : ''}
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

      {tab !== 'managers' && !demoMode && (
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
                      className={`leaderboard-player stagger-item ${podiumClassFor(index)}`}
                      style={{ '--stagger-i': Math.min(index, 12) } as React.CSSProperties}
                      key={p.player_id}
                    >
                      <span className={`rank ${index < 3 ? 'podium-rank' : ''}`}>
                        {medalBadgeFor(index)}
                      </span>
                      {p.photo_url ? (
                        <img className="leaderboard-photo" src={p.photo_url} alt={p.display_name} />
                      ) : (
                        <div className="player-photo small-photo">
                          {(p.display_name || '?').slice(0, 1)}
                        </div>
                      )}
                      <div className="leaderboard-player-info">
                        <strong>{p.display_name}</strong>
                        {tab === 'ratings' && (
                          <span>
                            {p.matches_rated ?? 0} {t('ratingsCountSuffix')}
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

      {tab !== 'managers' && demoMode && (
        <div className="leaderboard-list screen-stage" key={`demo-${tab}`}>
          {demoPlayers.slice(0, 6).map((p, index) => (
            <div
              className={`leaderboard-player stagger-item ${podiumClassFor(index)}`}
              style={{ '--stagger-i': index } as React.CSSProperties}
              key={p.id}
            >
              <span className={`rank ${index < 3 ? 'podium-rank' : ''}`}>
                {medalBadgeFor(index)}
              </span>
              <div className="player-photo small-photo">{p.name.slice(0, 1)}</div>
              <div className="leaderboard-player-info">
                <strong>{p.name}</strong>
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
          onClose={() => setInspectTarget(null)}
        />
      )}
    </section>
  );
}
