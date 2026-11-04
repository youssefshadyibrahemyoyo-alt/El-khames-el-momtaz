import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Check, ChevronDown, Crown, Flame, RefreshCw, Save, Search, Shield, Sparkles, Star, Swords, ThumbsUp, Trash2, Users } from 'lucide-react';
import type { FanPotnPoll, Gameweek, PublicMatch } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { DEMO_FAN_POLL, DEMO_MATCHES, DEMO_PLAYERS } from '../lib/demoData';
import type { LeaguePlayer } from '../types/league';
import AnimatedNumber from '../components/AnimatedNumber';

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
  const [fanPoll, setFanPoll] = useState<FanPotnPoll | null>(null);
  const [votingPlayerId, setVotingPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matchFilter, setMatchFilter] = useState<'all' | 'hattrick'>('all');
  const [playerQuery, setPlayerQuery] = useState('');

  const matchKpis = useMemo(() => {
    let goals = 0;
    let assists = 0;
    let mvps = 0;
    for (const m of matches) {
      for (const p of m.players) {
        goals += p.goals || 0;
        assists += p.assists || 0;
        if (p.is_mvp) mvps += 1;
      }
    }
    return { count: matches.length, goals, assists, mvps };
  }, [matches]);

  const visibleMatches = useMemo(() => {
    const q = playerQuery.trim().toLowerCase();
    return matches.filter(m => {
      if (matchFilter === 'hattrick' && !m.players.some(p => p.is_hat_trick)) return false;
      if (q && !m.players.some(p => p.display_name.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [matches, matchFilter, playerQuery]);

  const loadFanPoll = useCallback(
    async (gwId: 'all' | number) => {
      if (demoMode || !supabase) {
        setFanPoll(DEMO_FAN_POLL);
        return;
      }
      const { data, error: pollErr } = await supabase.rpc('get_fan_potn_poll', {
        p_gameweek_id: gwId === 'all' ? null : gwId,
      });
      if (!pollErr && data) {
        setFanPoll(data as FanPotnPoll);
      }
    },
    [demoMode]
  );

  useEffect(() => {
    void loadFanPoll(selectedGwId);

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
  }, [demoMode, selectedGwId, loadFanPoll]);

  async function handleCastVote(playerId: string) {
    if (!fanPoll?.gameweek_id) return;
    if (demoMode || !supabase) {
      setFanPoll(prev => {
        if (!prev?.candidates) return prev;
        const nextCandidates = prev.candidates.map(c => ({
          ...c,
          votes:
            c.player_id === playerId
              ? c.votes + (prev.my_vote_player_id === playerId ? 0 : 1)
              : c.player_id === prev.my_vote_player_id
                ? Math.max(0, c.votes - 1)
                : c.votes,
        }));
        const total = nextCandidates.reduce((s, c) => s + c.votes, 0);
        const maxVotes = Math.max(0, ...nextCandidates.map(c => c.votes));
        return {
          ...prev,
          my_vote_player_id: playerId,
          total_votes: total,
          candidates: nextCandidates
            .map(c => ({
              ...c,
              vote_pct: total > 0 ? Math.round((c.votes * 100) / total) : 0,
              is_leader: total > 0 && c.votes === maxVotes,
            }))
            .sort((a, b) => b.votes - a.votes || b.gw_points - a.gw_points),
        };
      });
      return;
    }

    setVotingPlayerId(playerId);
    try {
      const { data, error: voteErr } = await supabase.rpc('cast_fan_potn_vote', {
        p_gameweek_id: fanPoll.gameweek_id,
        p_player_id: playerId,
      });
      if (voteErr) {
        setError(voteErr.message);
      } else if (data) {
        setFanPoll(data as FanPotnPoll);
      }
    } finally {
      setVotingPlayerId(null);
    }
  }

  return (
    <section className="panel stagger-item" style={{ '--stagger-i': 0 } as React.CSSProperties}>
<PriceMatchPlanner demoMode={demoMode} />      <div className="panel-heading">
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

      <SingleFilePlanner demoMode={demoMode} />

      {loading && <p className="muted">{t('loadingPoints')}</p>}
      {error && <div className="notice">{error}</div>}

      {/* Matchday Broadcast KPI Strip */}
      {matches.length > 0 && (
        <div className="forfeit-hero-kpis" style={{ marginBottom: 14 }}>
          <div className="forfeit-kpi-tile">
            <strong>
              <AnimatedNumber value={matchKpis.count} decimals={0} />
            </strong>
            <span>🏟️ {t('matchesTotalMatches')}</span>
          </div>
          <div className="forfeit-kpi-tile gold-kpi">
            <strong>
              <AnimatedNumber value={matchKpis.goals} decimals={0} />
            </strong>
            <span>⚽ {t('matchesTotalGoals')}</span>
          </div>
          <div className="forfeit-kpi-tile">
            <strong>
              <AnimatedNumber value={matchKpis.assists} decimals={0} />
            </strong>
            <span>🎯 {t('matchesTotalAssists')}</span>
          </div>
          <div className="forfeit-kpi-tile">
            <strong>
              <AnimatedNumber value={matchKpis.mvps} decimals={0} />
            </strong>
            <span>👑 {t('matchesMvpsCrowned')}</span>
          </div>
        </div>
      )}

      {/* FANS' VOTE: PLAYER OF THE NIGHT POLL */}
      {fanPoll?.has_poll && (fanPoll.candidates?.length ?? 0) > 0 && (
        <div className="fan-potn-poll-card">
          <div className="fan-potn-header">
            <div>
              <span className="eyebrow">
                GW #{fanPoll.gameweek_number} · {fanPoll.total_votes ?? 0} {t('fanPollVotesSuffix')}
              </span>
              <h4 style={{ margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} style={{ color: 'var(--gold)' }} />
                {t('fanPollTitle')}
              </h4>
              <p className="muted tiny" style={{ margin: '3px 0 0' }}>
                {t('fanPollSub')}
              </p>
            </div>
          </div>

          <div className="fan-potn-grid">
            {fanPoll.candidates!.slice(0, 8).map(c => {
              const isMine = fanPoll.my_vote_player_id === c.player_id;
              return (
                <div
                  key={c.player_id}
                  className={`fan-potn-row ${c.is_leader ? 'fan-potn-leader' : ''} ${isMine ? 'fan-potn-mine' : ''}`}
                >
                  <div
                    className="fan-potn-bar"
                    style={{ width: `${Math.min(100, c.vote_pct)}%` }}
                    aria-hidden="true"
                  />
                  <div className="fan-potn-content">
                    <div
                      className="fan-potn-player clickable-row"
                      onClick={() => onOpenPlayerProfile(c.player_id)}
                    >
                      {c.photo_url ? (
                        <img className="leaderboard-photo" src={c.photo_url} alt={c.display_name} />
                      ) : (
                        <div className="player-photo small-photo">{c.display_name.slice(0, 1)}</div>
                      )}
                      <div>
                        <strong>
                          {c.kit_number != null && (
                            <span className="inline-kit-chip">#{c.kit_number}</span>
                          )}
                          {c.display_name}
                          {c.is_leader && (
                            <span className="mvp-mini-pill" style={{ marginInlineStart: 5 }}>
                              🔥 {t('fanPollLeaderBadge')}
                            </span>
                          )}
                        </strong>
                        <span className="muted tiny" style={{ display: 'block' }}>
                          {c.gw_points} {t('ptsUnit')} · {c.votes} {t('fanPollVotesSuffix')} ({c.vote_pct}%)
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={isMine ? 'primary compact-btn' : 'secondary compact-btn'}
                      disabled={votingPlayerId !== null}
                      onClick={() => void handleCastVote(c.player_id)}
                    >
                      {isMine ? (
                        <>
                          <Check size={13} /> {t('fanPollVotedBtn')}
                        </>
                      ) : (
                        <>
                          <ThumbsUp size={13} /> {t('fanPollVoteBtn')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="gw-empty-state">
          <Swords size={26} style={{ color: 'var(--gold)', marginBottom: 6 }} />
          <p className="muted" style={{ margin: 0 }}>
            {t('noMatchesPlayedYet')}
          </p>
        </div>
      )}

      {matches.length > 0 && (
        <div className="matches-interactive-toolbar">
          <div className="forfeit-filter-pills">
            <button
              type="button"
              className={`forfeit-filter-pill ${matchFilter === 'all' ? 'active' : ''}`}
              onClick={() => setMatchFilter('all')}
            >
              {t('matchesFilterAll')}
            </button>
            <button
              type="button"
              className={`forfeit-filter-pill ${matchFilter === 'hattrick' ? 'active' : ''}`}
              onClick={() => setMatchFilter('hattrick')}
            >
              <Flame size={12} /> {t('matchesFilterHattricks')}
            </button>
          </div>

          <div className="matches-player-search-wrap">
            <Search size={14} className="muted" />
            <input
              type="search"
              placeholder={t('matchesSearchPlayer')}
              value={playerQuery}
              onChange={e => setPlayerQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="public-matches-feed">
        {visibleMatches.map((m, idx) => {
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

type RatedPlayer = { id: string; name: string; strength: number };
type BalancedTeams = { teamA: RatedPlayer[]; teamB: RatedPlayer[]; difference: number };

/** Finds a minimum total-rating difference among equal-sized (or one-off) teams. */
function balanceTeams(players: RatedPlayer[], random: () => number = Math.random): BalancedTeams {
  if (players.length < 2 || players.length > 30 || players.some(p => !Number.isInteger(p.strength) || p.strength < 1 || p.strength > 10) || new Set(players.map(p => p.id)).size !== players.length) throw new Error('Choose 2–30 unique players rated 1–10');
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const count = Math.floor(shuffled.length / 2);
  const total = shuffled.reduce((sum, p) => sum + p.strength, 0);
  const states = Array.from({ length: count + 1 }, () => new Map<number, number[]>());
  states[0].set(0, []);
  shuffled.forEach((p, index) => {
    for (let n = Math.min(count, index + 1); n >= 1; n--) {
      for (const [sum, chosen] of states[n - 1]) {
        const next = sum + p.strength;
        if (!states[n].has(next)) states[n].set(next, [...chosen, index]);
      }
    }
  });
  let best: number[] = []; let diff = Infinity;
  for (const [sum, indices] of states[count]) { const d = Math.abs(total - sum * 2); if (d < diff) { diff = d; best = indices; } }
  const selected = new Set(best);
  return { teamA: shuffled.filter((_, i) => selected.has(i)), teamB: shuffled.filter((_, i) => !selected.has(i)), difference: diff };
}

type PlannedMatch = { id: string; title: string; created_by: string; created_at: string; team_a: RatedPlayer[]; team_b: RatedPlayer[] };
type PlannerProps = { players: LeaguePlayer[]; isAdmin: boolean; demoMode: boolean; userId?: string };

function MatchPlanner({ players, isAdmin, demoMode, userId }: PlannerProps) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const txt = (en: string, arabic: string) => ar ? arabic : en;
  const [open, setOpen] = useState(false);
  const [ratingsOpen, setRatingsOpen] = useState(false);
  const [strengths, setStrengths] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [teams, setTeams] = useState<BalancedTeams | null>(null);
  const [matches, setMatches] = useState<PlannedMatch[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const active = useMemo(() => players.filter(p => p.is_active), [players]);
  const missing = selected.filter(id => !strengths[id]);

  const load = useCallback(async () => {
    if (demoMode || !supabase) { setLoading(false); return; }
    setLoading(true); setError('');
    const [ratingRes, matchRes] = await Promise.all([
      supabase.from('match_player_strengths').select('player_id,strength'),
      supabase.from('planned_pickup_matches').select('id,title,created_by,created_at,team_a,team_b').order('created_at', { ascending: false }).limit(50),
    ]);
    if (ratingRes.error || matchRes.error) setError(txt('Could not load match planning. Please try again.', 'تعذر تحميل تخطيط المباريات. حاول مرة أخرى.'));
    else {
      setStrengths(Object.fromEntries((ratingRes.data ?? []).map((r: {player_id: string; strength: number}) => [r.player_id, Number(r.strength)])));
      setMatches((matchRes.data ?? []) as PlannedMatch[]);
    }
    setLoading(false);
  }, [demoMode, lang]);
  useEffect(() => { void load(); }, [load]);

  async function setRating(playerId: string, value: number) {
    if (!isAdmin || value < 1 || value > 10) return;
    setBusy(true); setError(''); setMessage('');
    if (!demoMode && supabase) {
      const { error: e } = await supabase.from('match_player_strengths').upsert({ player_id: playerId, strength: value, updated_at: new Date().toISOString() });
      if (e) { setError(txt('Could not save the rating. Please try again.', 'تعذر حفظ التقييم. حاول مرة أخرى.')); setBusy(false); return; }
    }
    setStrengths(prev => ({ ...prev, [playerId]: value })); setTeams(null); setBusy(false);
  }
  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 30 ? [...prev, id] : prev);
    setTeams(null); setMessage('');
  }
  function generate() {
    const pool = active.filter(p => selected.includes(p.id)).map(p => ({ id: p.id, name: p.name, strength: strengths[p.id] }));
    if (pool.length < 2 || pool.length > 30 || pool.some(p => !p.strength)) return;
    setTeams(balanceTeams(pool)); setMessage('');
  }
  async function save() {
    if (!teams || !title.trim() || busy) return;
    setBusy(true); setError(''); setMessage('');
    if (demoMode) {
      setMatches(prev => [{ id: `demo-${Date.now()}`, title: title.trim(), created_by: 'demo', created_at: new Date().toISOString(), team_a: teams.teamA, team_b: teams.teamB }, ...prev]);
    } else if (supabase) {
      const { error: e } = await supabase.rpc('create_balanced_pickup_match', { p_title: title.trim(), p_team_a: teams.teamA.map(p => p.id), p_team_b: teams.teamB.map(p => p.id) });
      if (e) { setError(txt('Could not save the match. Check the selected players and try again.', 'تعذر حفظ المباراة. تحقق من اللاعبين وحاول مرة أخرى.')); setBusy(false); return; }
      await load();
    }
    setOpen(false); setTitle(''); setSelected([]); setTeams(null); setMessage(txt('Match created. It will not affect official fantasy points.', 'تم إنشاء المباراة. لن تؤثر على نقاط الفانتازي الرسمية.')); setBusy(false);
  }
  async function remove(id: string) {
    if (!window.confirm(txt('Delete this planned match?', 'حذف هذه المباراة المخططة؟'))) return;
    setBusy(true); setError('');
    if (!demoMode && supabase) {
      const { data: deleted, error: e } = await supabase.from('planned_pickup_matches').delete().eq('id', id).select('id');
      if (e || !deleted?.length) { setError(txt('Could not delete the match.', 'تعذر حذف المباراة.')); setBusy(false); return; }
    }
    setMatches(prev => prev.filter(m => m.id !== id)); setBusy(false);
  }
  const teamCard = (team: RatedPlayer[], label: string, style: string) => (
    <div className={`planner-team ${style}`}><div className="planner-team-head"><strong>{label}</strong><span>{team.reduce((n,p) => n + p.strength, 0)} {txt('strength', 'قوة')}</span></div>
      <ul>{team.map(p => <li key={p.id}><span>{p.name}</span><strong>{p.strength}/10</strong></li>)}</ul></div>
  );
  return <div className="match-planner">
    <div className="planner-head"><div><span className="planner-eyebrow"><Shield size={14} /> {txt('MATCH PLANNER', 'تخطيط المباراة')}</span><h3>{txt('Build a fair game.', 'خلّي المباراة متوازنة.')}</h3><p>{txt('Choose who’s playing and generate balanced teams from admin ratings.', 'اختار اللاعبين ووزّع الفرق حسب تقييمات الأدمن.')}</p></div>
      <button className="primary planner-create-btn" type="button" onClick={() => {setOpen(v => !v);setError('');}} aria-expanded={open}><CalendarPlus size={16} /> {open ? txt('Close', 'إغلاق') : txt('Create a match', 'إنشاء مباراة')}</button></div>
    <p className="planner-note">{txt('Planned matches are separate from official results and do not award fantasy points.', 'المباريات المخططة منفصلة عن النتائج الرسمية ولا تضيف نقاط فانتازي.')}</p>
    {error && <div className="notice" role="alert">{error}</div>}{message && <p className="planner-message" role="status">{message}</p>}
    {isAdmin && <details className="planner-ratings" open={ratingsOpen} onToggle={e => setRatingsOpen(e.currentTarget.open)}><summary><span><Shield size={16} /> {txt('Player strength ratings', 'تقييم قوة اللاعبين')}</span><ChevronDown size={16}/></summary><p>{txt('Set a rating from 1 to 10 for each player. Ratings are shared with league members.', 'حدد تقييم كل لاعب من ١ إلى ١٠. التقييمات تظهر لأعضاء الدوري.')}</p><div className="planner-rating-list">{active.map(p => <label key={p.id}><span>{p.name}</span><select aria-label={`${txt('Strength rating for', 'تقييم قوة')} ${p.name}`} value={strengths[p.id] || ''} disabled={busy} onChange={e => void setRating(p.id, Number(e.target.value))}><option value="" disabled>{txt('Not rated', 'لم يُقيّم')}</option>{Array.from({length:10},(_,i) => <option value={i+1} key={i+1}>{i+1}/10</option>)}</select></label>)}</div></details>}
    {open && <div className="planner-builder"><label className="planner-title-label">{txt('Match name', 'اسم المباراة')}<input maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder={txt('e.g. Thursday night', 'مثال: ماتش الخميس')} /></label>
      <div className="planner-section-title"><div><strong>{txt('Who’s playing?', 'مين هيلعب؟')}</strong><p>{txt('Select 2–30 available players.', 'اختار من ٢ إلى ٣٠ لاعبًا متاحًا.')}</p></div><span><Users size={14}/>{selected.length}</span></div>
      <div className="planner-player-list">{active.map(p => <button type="button" key={p.id} className={`planner-player ${selected.includes(p.id) ? 'selected' : ''}`} onClick={() => toggle(p.id)} aria-pressed={selected.includes(p.id)}><span className="planner-checkbox">{selected.includes(p.id) ? '✓' : ''}</span><span>{p.name}</span><small>{strengths[p.id] ? `${strengths[p.id]}/10` : txt('Not rated', 'لم يُقيّم')}</small></button>)}</div>
      {missing.length > 0 && <p className="planner-warning">{txt('An admin must rate every selected player before teams can be generated.', 'يجب أن يقيّم الأدمن كل اللاعبين المختارين قبل توزيع الفرق.')}</p>}
      <div className="planner-actions"><button type="button" className="secondary" onClick={generate} disabled={selected.length < 2 || missing.length > 0 || busy}><RefreshCw size={15}/>{teams ? txt('Generate again', 'إعادة التوزيع') : txt('Generate balanced teams', 'وزّع الفرق بالتوازن')}</button></div>
      {teams && <><div className="planner-result-header"><strong>{txt('Your teams', 'الفرق')}</strong><span>{txt('Strength difference', 'فرق القوة')}: {teams.difference}</span></div><div className="planner-teams">{teamCard(teams.teamA,txt('Team A','الفريق أ'),'team-a')}{teamCard(teams.teamB,txt('Team B','الفريق ب'),'team-b')}</div><button type="button" className="primary planner-save" disabled={!title.trim() || busy} onClick={() => void save()}><Save size={15}/>{busy ? txt('Saving…','جارٍ الحفظ…') : txt('Save match','حفظ المباراة')}</button></>}
    </div>}
    {loading ? <p className="muted">{txt('Loading planned matches…','جارٍ تحميل المباريات المخططة…')}</p> : matches.length > 0 && <div className="planner-saved"><div className="planner-section-title"><div><strong>{txt('Planned matches','المباريات المخططة')}</strong><p>{txt('Visible to approved league members','مرئية لأعضاء الدوري المعتمدين')}</p></div></div>{matches.map(m => <details key={m.id} className="planner-match"><summary><span><strong>{m.title}</strong><small>{new Intl.DateTimeFormat(ar?'ar-EG':'en-GB',{dateStyle:'medium',timeZone:'Africa/Cairo'}).format(new Date(m.created_at))} · {m.team_a.length + m.team_b.length} {txt('players','لاعبين')}</small></span><ChevronDown size={16}/></summary><div className="planner-teams">{teamCard(m.team_a,txt('Team A','الفريق أ'),'team-a')}{teamCard(m.team_b,txt('Team B','الفريق ب'),'team-b')}</div>{(isAdmin || m.created_by === userId || (demoMode && m.created_by === 'demo')) && <button type="button" className="secondary compact-btn planner-delete" onClick={() => void remove(m.id)} disabled={busy}><Trash2 size={14}/>{txt('Delete match','حذف المباراة')}</button>}</details>)}</div>}
  </div>;
}


function SingleFilePlanner({ demoMode }: { demoMode: boolean }) {
  const [plannerPlayers, setPlannerPlayers] = useState<LeaguePlayer[]>(demoMode ? DEMO_PLAYERS : []);
  const [plannerAdmin, setPlannerAdmin] = useState(demoMode);
  const [plannerUserId, setPlannerUserId] = useState<string | undefined>();
  const [plannerLoadError, setPlannerLoadError] = useState(false);
  const { lang } = useLanguage();
  useEffect(() => {
    if (demoMode || !supabase) return;
    let cancelled = false;
    const db = supabase;
    async function loadPlannerContext() {
      const { data: authData, error: authError } = await db.auth.getUser();
      if (cancelled) return;
      const id = authData.user?.id;
      if (authError || !id) { setPlannerLoadError(true); return; }
      const [profile, pool] = await Promise.all([
        db.from('profiles').select('role').eq('id', id).maybeSingle(),
        db.from('football_players').select('id,display_name,price,photo_url,is_active').order('display_name'),
      ]);
      if (cancelled) return;
      if (profile.error || pool.error) { setPlannerLoadError(true); return; }
      setPlannerUserId(id);
      setPlannerAdmin(profile.data?.role === 'admin_player');
      setPlannerPlayers((pool.data ?? []).map((p: {id: string; display_name: string; price: number; photo_url: string | null; is_active: boolean}) => ({ id: p.id, name: p.display_name, price: Number(p.price), photo_url: p.photo_url, is_active: p.is_active, points: 0, matchesPlayed: 0 })));
    }
    void loadPlannerContext();
    return () => { cancelled = true; };
  }, [demoMode]);
  return <><style>{PLANNER_CSS}</style>{plannerLoadError && <div className="notice" role="alert">{lang === 'ar' ? 'تعذر تحميل اللاعبين. حاول تحديث الصفحة.' : 'Could not load players. Please refresh the page.'}</div>}<MatchPlanner players={plannerPlayers} isAdmin={plannerAdmin} demoMode={demoMode} userId={plannerUserId} /></>;
}

const PLANNER_CSS = `
/* Balanced pickup match planner */
.match-planner { padding: clamp(18px, 2.4vw, 26px); margin: 0 0 22px; border: 1px solid var(--line-strong); border-radius: 18px; background: var(--panel2); }
.planner-head { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.planner-eyebrow { display: inline-flex; align-items: center; gap: 6px; color: var(--gold-text); font-size: 10px; letter-spacing: .1em; font-weight: 800; }
.planner-head h3 { font-size: clamp(21px, 2.4vw, 28px); margin: 8px 0 5px; letter-spacing: -.03em; }
.planner-head p, .planner-section-title p { color: var(--muted); margin: 0; line-height: 1.5; font-size: 12px; }
.planner-create-btn { flex-shrink: 0; min-height: 42px; }
.planner-note { color: var(--muted); margin: 16px 0 0; font-size: 11px; line-height: 1.5; }
.planner-ratings, .planner-match { border: 1px solid var(--line); border-radius: 13px; background: var(--panel); margin-top: 14px; }
.planner-ratings summary, .planner-match summary { cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px; list-style: none; padding: 14px; font-size: 13px; font-weight: 700; }
.planner-ratings summary::-webkit-details-marker, .planner-match summary::-webkit-details-marker { display: none; }
.planner-ratings summary span { display:flex; align-items:center; gap:8px; }
.planner-ratings[open] summary > svg, .planner-match[open] summary > svg { transform: rotate(180deg); }
.planner-ratings > p { margin: 0 14px 12px; color: var(--muted); font-size: 12px; }
.planner-rating-list { display: grid; grid-template-columns: repeat(auto-fit,minmax(190px,1fr)); gap: 8px; padding: 0 14px 14px; }
.planner-rating-list label { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; background: var(--panel2); font-size: 12px; }
.planner-rating-list select { max-width: 105px; padding: 7px; border: 1px solid var(--line); border-radius: 8px; background: var(--input-bg); color: var(--text); }
.planner-builder { margin-top: 16px; padding: 18px; border-radius: 15px; border: 1px solid var(--line); background: var(--panel); }
.planner-title-label { display: grid; gap: 7px; font-size: 12px; font-weight: 700; }
.planner-title-label input { width: 100%; padding: 11px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--input-bg); color: var(--heading); }
.planner-section-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 20px 0 10px; }
.planner-section-title strong { font-size: 14px; color: var(--heading); }
.planner-section-title > span { display: inline-flex; align-items: center; gap: 5px; background: var(--green-soft); padding: 6px 9px; border-radius: 9px; color: var(--green); font-weight: 700; }
.planner-player-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 7px; }
.planner-player { min-width: 0; display: flex; align-items: center; gap: 9px; text-align: start; padding: 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel2); color: var(--heading); font-size: 12px; }
.planner-player.selected { border-color: var(--green); background: var(--green-soft); }
.planner-player small { margin-inline-start: auto; white-space: nowrap; color: var(--muted); }
.planner-checkbox { display: grid; place-items: center; flex-shrink: 0; width: 18px; height: 18px; border-radius: 5px; border: 1px solid var(--line-strong); }
.planner-player.selected .planner-checkbox { background: var(--green); color: #fff; border-color: var(--green); }
.planner-warning { color: var(--gold-text); font-size: 12px; line-height: 1.5; }
.planner-actions { margin-top: 16px; }
.planner-result-header { margin: 22px 0 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; }
.planner-result-header span { color: var(--muted); font-size: 11px; }
.planner-teams { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
.planner-team { border: 1px solid var(--line); background: var(--panel2); border-radius: 12px; padding: 13px; min-width: 0; }
.planner-team.team-a { border-top: 3px solid #368c62; }
.planner-team.team-b { border-top: 3px solid #c9a44e; }
.planner-team-head { display: flex; flex-wrap: wrap; gap: 5px; justify-content: space-between; font-size: 12px; }
.planner-team-head span { color: var(--muted); font-size: 11px; }
.planner-team ul { list-style: none; margin: 10px 0 0; padding: 0; }
.planner-team li { display: flex; justify-content: space-between; gap: 7px; padding: 6px 0; border-top: 1px solid var(--line); font-size: 12px; }
.planner-team li span { overflow-wrap: anywhere; }
.planner-team li strong { color: var(--muted); white-space: nowrap; font-size: 11px; }
.planner-save { margin-top: 15px; }
.planner-message { color: var(--green); font-weight: 700; font-size: 12px; }
.planner-match summary > span { display: grid; gap: 4px; }
.planner-match summary small { font-weight: 400; color: var(--muted); }
.planner-match .planner-teams { padding: 0 14px; }
.planner-delete { margin: 12px 14px 14px; }
@media (max-width: 640px) {
 .planner-head { align-items: flex-start; flex-direction: column; gap: 14px; }
 .planner-create-btn { width: 100%; }
 .planner-builder { padding: 14px; }
 .planner-player-list { grid-template-columns: repeat(2,minmax(0,1fr)); }
 .planner-player { flex-wrap: wrap; }
 .planner-player small { width: 100%; padding-inline-start: 27px; }
}

`;
// Match planner: balances teams using player prices.
type PlannerPlayer = {
  id: string;
  name: string;
  price: number;
};

type PlannerSavedPlayer = {
  id: string;
  name: string;
  strength: number;
};

type PlannerMatch = {
  id: string;
  title: string;
  created_by: string;
  team_a: PlannerSavedPlayer[];
  team_b: PlannerSavedPlayer[];
};

function PriceMatchPlanner({ demoMode }: { demoMode: boolean }) {
  const { lang } = useLanguage();

  const tr = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const money = (n: number) => `£${n.toFixed(1)}m`;

  const [players, setPlayers] = React.useState<PlannerPlayer[]>([]);
  const [chosen, setChosen] = React.useState<string[]>([]);
  const [teamA, setTeamA] = React.useState<PlannerPlayer[] | null>(null);
  const [teamB, setTeamB] = React.useState<PlannerPlayer[] | null>(null);
  const [matches, setMatches] = React.useState<PlannerMatch[]>([]);
  const [name, setName] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [userId, setUserId] = React.useState('');
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (demoMode) {
        const { DEMO_PLAYERS } = await import('../lib/demoData');

        if (!cancelled) {
          setPlayers(
            DEMO_PLAYERS.filter(p => p.is_active).map(p => ({
              id: p.id,
              name: p.name,
              price: p.price,
            }))
          );
        }

        return;
      }

      if (!supabase) return;

      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        if (!cancelled) {
          setError(tr('Please sign in.', 'يرجى تسجيل الدخول.'));
        }
        return;
      }

      const [pool, profile, saved] = await Promise.all([
        supabase
          .from('football_players')
          .select('id,display_name,price')
          .eq('is_active', true)
          .order('display_name'),

        supabase
          .from('profiles')
          .select('role')
          .eq('id', auth.user.id)
          .maybeSingle(),

        supabase
          .from('planned_pickup_matches')
          .select('id,title,created_by,team_a,team_b')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (cancelled) return;

      if (pool.error || profile.error || saved.error) {
        setError(
          tr(
            'Could not load the match planner.',
            'تعذر تحميل مخطط المباريات.'
          )
        );
        return;
      }

      setUserId(auth.user.id);
      setIsAdmin(profile.data?.role === 'admin_player');

      setPlayers(
        (pool.data ?? []).map(
          (p: { id: string; display_name: string; price: number }) => ({
            id: p.id,
            name: p.display_name,
            price: Number(p.price),
          })
        )
      );

      setMatches((saved.data ?? []) as PlannerMatch[]);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [demoMode, lang]);

  function toggle(id: string) {
    setChosen(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 30
          ? [...prev, id]
          : prev
    );

    setTeamA(null);
    setTeamB(null);
  }

  function generate() {
    const pool = players.filter(p => chosen.includes(p.id));

    if (
      pool.length < 2 ||
      pool.some(p => !Number.isFinite(p.price) || p.price < 0)
    ) {
      return;
    }

    // Shuffle first so repeated generations can produce different fair teams.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const target = Math.floor(pool.length / 2);

    const states = Array.from(
      { length: target + 1 },
      () => new Map<number, number[]>()
    );

    states[0].set(0, []);

    pool.forEach((player, i) => {
      for (
        let count = Math.min(target, i + 1);
        count >= 1;
        count--
      ) {
        for (const [sum, indices] of states[count - 1]) {
          const next = sum + Math.round(player.price * 10);

          if (!states[count].has(next)) {
            states[count].set(next, [...indices, i]);
          }
        }
      }
    });

    const total = pool.reduce(
      (sum, player) => sum + Math.round(player.price * 10),
      0
    );

    let best: number[] = [];
    let difference = Infinity;

    for (const [sum, indices] of states[target]) {
      const currentDifference = Math.abs(total - 2 * sum);

      if (currentDifference < difference) {
        difference = currentDifference;
        best = indices;
      }
    }

    const selected = new Set(best);

    setTeamA(pool.filter((_, i) => selected.has(i)));
    setTeamB(pool.filter((_, i) => !selected.has(i)));
  }

  async function save() {
    if (!name.trim() || !teamA || !teamB || busy) return;

    setBusy(true);
    setError('');

    if (demoMode) {
      const snapshot = (team: PlannerPlayer[]) =>
        team.map(player => ({
          id: player.id,
          name: player.name,
          strength: Math.round(player.price * 10),
        }));

      setMatches(prev => [
        {
          id: String(Date.now()),
          title: name.trim(),
          created_by: 'demo',
          team_a: snapshot(teamA),
          team_b: snapshot(teamB),
        },
        ...prev,
      ]);
    } else if (supabase) {
      const { error: saveError } = await supabase.rpc(
        'create_balanced_pickup_match',
        {
          p_title: name.trim(),
          p_team_a: teamA.map(player => player.id),
          p_team_b: teamB.map(player => player.id),
        }
      );

      if (saveError) {
        setError(
          tr(
            'Could not save the match. Please try again.',
            'تعذر حفظ المباراة. حاول مرة أخرى.'
          )
        );
        setBusy(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from('planned_pickup_matches')
        .select('id,title,created_by,team_a,team_b')
        .order('created_at', { ascending: false })
        .limit(50);

      if (loadError) {
        setError(
          tr(
            'Saved, but could not refresh the list.',
            'تم الحفظ، لكن تعذر تحديث القائمة.'
          )
        );
      } else {
        setMatches((data ?? []) as PlannerMatch[]);
      }
    }

    setName('');
    setChosen([]);
    setTeamA(null);
    setTeamB(null);
    setOpen(false);
    setBusy(false);
  }

  async function remove(id: string) {
    if (
      !window.confirm(
        tr('Delete this planned match?', 'حذف هذه المباراة؟')
      )
    ) {
      return;
    }

    if (!demoMode && supabase) {
      const { data, error: deleteError } = await supabase
        .from('planned_pickup_matches')
        .delete()
        .eq('id', id)
        .select('id');

      if (deleteError || !data?.length) {
        setError(
          tr('Could not delete the match.', 'تعذر حذف المباراة.')
        );
        return;
      }
    }

    setMatches(prev => prev.filter(match => match.id !== id));
  }

  const renderTeam = (label: string, team: PlannerPlayer[]) => (
    <div
      style={{
        flex: 1,
        minWidth: 130,
        padding: 14,
        border: '1px solid var(--line)',
        borderRadius: 12,
        background: 'var(--panel)',
      }}
    >
      <strong>
        {label} · {money(team.reduce((sum, p) => sum + p.price, 0))}
      </strong>

      {team.map(player => (
        <div
          key={player.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            paddingTop: 8,
            fontSize: 12,
          }}
        >
          <span>{player.name}</span>
          <span>{money(player.price)}</span>
        </div>
      ))}
    </div>
  );

  const fromSaved = (team: PlannerSavedPlayer[]) =>
    team.map(player => ({
      id: player.id,
      name: player.name,
      price: player.strength / 10,
    }));

  return (
    <div
      style={{
        margin: '0 0 22px',
        padding: 20,
        border: '1px solid var(--line)',
        borderRadius: 16,
        background: 'var(--panel2)',
      }}
    >
      <h3 style={{ margin: '0 0 6px' }}>
        {tr('Create a balanced match', 'إنشاء مباراة متوازنة')}
      </h3>

      <p className="muted" style={{ fontSize: 12 }}>
        {tr(
          'Select the players attending. Teams are balanced using their prices, not official fantasy points.',
          'اختار اللاعبين الحاضرين. يتم توزيع الفرق حسب أسعار اللاعبين دون التأثير على نقاط الفانتازي.'
        )}
      </p>

      <button
        type="button"
        className="primary"
        onClick={() => setOpen(value => !value)}
      >
        {open ? tr('Close', 'إغلاق') : tr('Create a match', 'إنشاء مباراة')}
      </button>

      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}

      {open && (
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'grid', gap: 7, fontWeight: 700 }}>
            {tr('Match name', 'اسم المباراة')}

            <input
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={80}
              placeholder={tr('Thursday match', 'مباراة الخميس')}
              style={{
                padding: 10,
                borderRadius: 9,
                border: '1px solid var(--line)',
                background: 'var(--input-bg)',
                color: 'var(--text)',
              }}
            />
          </label>

          <p style={{ marginBottom: 8 }}>
            {tr('Select 2–30 players', 'اختار من ٢ إلى ٣٠ لاعبًا')} ·{' '}
            {chosen.length}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {players.map(player => (
              <button
                type="button"
                key={player.id}
                aria-pressed={chosen.includes(player.id)}
                className={
                  chosen.includes(player.id)
                    ? 'primary compact-btn'
                    : 'secondary compact-btn'
                }
                onClick={() => toggle(player.id)}
              >
                {player.name} · {money(player.price)}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="secondary"
            style={{ marginTop: 14 }}
            disabled={chosen.length < 2}
            onClick={generate}
          >
            {tr('Generate balanced teams', 'وزّع الفرق بالتوازن')}
          </button>

          {teamA && teamB && (
            <>
              <p>
                {tr('Price difference', 'فرق الأسعار')}:{' '}
                {money(
                  Math.abs(
                    teamA.reduce((sum, p) => sum + p.price, 0) -
                      teamB.reduce((sum, p) => sum + p.price, 0)
                  )
                )}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {renderTeam(tr('Team A', 'الفريق أ'), teamA)}
                {renderTeam(tr('Team B', 'الفريق ب'), teamB)}
              </div>

              <button
                type="button"
                className="primary"
                style={{ marginTop: 14 }}
                disabled={!name.trim() || busy}
                onClick={() => void save()}
              >
                {busy
                  ? tr('Saving…', 'جارٍ الحفظ…')
                  : tr('Save match', 'حفظ المباراة')}
              </button>
            </>
          )}
        </div>
      )}

      {matches.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <strong>{tr('Planned matches', 'المباريات المخططة')}</strong>

          {matches.map(match => (
            <details
              key={match.id}
              style={{
                marginTop: 10,
                padding: 12,
                border: '1px solid var(--line)',
                borderRadius: 10,
                background: 'var(--panel)',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                {match.title}
              </summary>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  marginTop: 12,
                }}
              >
                {renderTeam(tr('Team A', 'الفريق أ'), fromSaved(match.team_a))}
                {renderTeam(tr('Team B', 'الفريق ب'), fromSaved(match.team_b))}
              </div>

              {(isAdmin ||
                match.created_by === userId ||
                (demoMode && match.created_by === 'demo')) && (
                <button
                  type="button"
                  className="secondary compact-btn"
                  style={{ marginTop: 10 }}
                  onClick={() => void remove(match.id)}
                >
                  {tr('Delete match', 'حذف المباراة')}
                </button>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
