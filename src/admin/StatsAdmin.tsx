import { useCallback, useEffect, useState } from 'react';
import { Crown, Flame, List, Minus, Plus, Zap } from 'lucide-react';
import type { AdminProps } from './types';
import { useLanguage } from '../i18n/LanguageContext';
import SidelineMatchTimer from '../components/SidelineMatchTimer';

type GW = { id: number; number: number; status: string };
type Match = { id: string; match_number: number; status: string | null };
type Player = {
  id: string;
  display_name: string;
  is_active: boolean;
  photo_url: string | null;
  kit_number: number | null;
};

const FIELDS = [
  ['goals', 'Goals'],
  ['assists', 'Assists'],
  ['saves', 'Saves'],
  ['penalty_saves', 'Pen saves'],
  ['penalties_missed', 'Pen missed'],
  ['yellow_cards', 'Yellow'],
  ['red_cards', 'Red'],
  ['own_goals', 'Own goals'],
] as const;
type Field = (typeof FIELDS)[number][0];

type Entry = { played: boolean; is_mvp: boolean; rating: string } & Record<Field, number>;

const blank = (): Entry => ({
  played: false,
  is_mvp: false,
  rating: '',
  goals: 0,
  assists: 0,
  saves: 0,
  penalty_saves: 0,
  penalties_missed: 0,
  yellow_cards: 0,
  red_cards: 0,
  own_goals: 0,
});

export default function StatsAdmin({ db, onChanged }: AdminProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'quick' | 'table'>('quick');
  const [gws, setGws] = useState<GW[]>([]);
  const [gwId, setGwId] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [entry, setEntry] = useState<Record<string, Entry>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [g, p] = await Promise.all([
        db.from('gameweeks').select('id,number,status').order('number', { ascending: false }),
        db
          .from('football_players')
          .select('id,display_name,is_active,photo_url,kit_number')
          .order('display_name', { ascending: true }),
      ]);
      if (cancelled) return;
      if (g.error) {
        setMsg(g.error.message);
        return;
      }
      if (p.error) {
        setMsg(p.error.message);
        return;
      }
      const list = (g.data ?? []) as GW[];
      setGws(list);
      setPlayers((p.data ?? []) as Player[]);
      const active = list.find(x => String(x.status).toLowerCase() === 'active');
      setGwId((active ?? list[0])?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const loadMatches = useCallback(
    async (selectId?: string) => {
      if (gwId == null) {
        setMatches([]);
        setMatchId(null);
        return;
      }
      const { data, error } = await db
        .from('matches')
        .select('id,match_number,status')
        .eq('gameweek_id', gwId)
        .order('match_number', { ascending: true });
      if (error) {
        setMsg(error.message);
        return;
      }
      const list = (data ?? []) as Match[];
      setMatches(list);
      if (selectId) {
        setMatchId(selectId);
      } else {
        setMatchId(cur => (cur && list.some(m => m.id === cur) ? cur : (list[0]?.id ?? null)));
      }
    },
    [db, gwId]
  );

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    if (!matchId) {
      setEntry({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await db
        .from('player_match_stats')
        .select(
          'player_id,goals,assists,saves,penalty_saves,penalties_missed,yellow_cards,red_cards,own_goals,rating,is_mvp'
        )
        .eq('match_id', matchId);
      if (cancelled) return;
      if (error) {
        setMsg(error.message);
        return;
      }
      const next: Record<string, Entry> = {};
      for (const r of (data ?? []) as Array<Record<string, any>>) {
        const e = blank();
        e.played = true;
        e.is_mvp = Boolean(r.is_mvp);
        for (const [f] of FIELDS) e[f] = Number(r[f] ?? 0);
        e.rating = r.rating == null ? '' : String(r.rating);
        next[String(r.player_id)] = e;
      }
      setEntry(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [db, matchId]);

  const get = (id: string) => entry[id] ?? blank();

  const patch = (id: string, change: Partial<Entry>) =>
    setEntry(o => ({ ...o, [id]: { ...(o[id] ?? blank()), ...change } }));

  const toggleMvp = (id: string) => {
    setEntry(prev => {
      const currentMvp = (prev[id] ?? blank()).is_mvp;
      const next: Record<string, Entry> = {};
      for (const [pid, val] of Object.entries(prev)) {
        next[pid] = { ...val, is_mvp: false };
      }
      const base = next[id] ?? blank();
      next[id] = { ...base, played: true, is_mvp: !currentMvp };
      return next;
    });
  };

  const bump = (id: string, field: Field, delta: number) => {
    const cur = get(id);
    const nextVal = Math.max(0, (cur[field] || 0) + delta);
    patch(id, { played: true, [field]: nextVal } as Partial<Entry>);
  };

  const visiblePlayers = players.filter(p => p.is_active || get(p.id).played);
  const activeOnPitch = visiblePlayers.filter(p => get(p.id).played);

  async function addMatch() {
    if (gwId == null) return;
    setBusy(true);
    setMsg('');
    try {
      const { data, error } = await db
        .from('matches')
        .insert({
          gameweek_id: gwId,
          match_number: (matches[matches.length - 1]?.match_number ?? 0) + 1,
          status: 'finished',
          ended_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) setMsg(`Could not add match: ${error.message}`);
      else await loadMatches(data?.id ? String(data.id) : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!matchId) return;
    const playedPlayers = visiblePlayers.filter(p => get(p.id).played);

    for (const p of playedPlayers) {
      const r = get(p.id).rating.trim();
      if (r !== '') {
        const num = Number(r);
        if (!Number.isFinite(num) || num < 0 || num > 10) {
          setMsg(`Invalid rating for ${p.display_name}: enter a number from 0 to 10.`);
          return;
        }
      }
    }

    const rows = playedPlayers.map(p => {
      const e = get(p.id);
      return {
        player_id: p.id,
        goals: e.goals,
        assists: e.assists,
        saves: e.saves,
        penalty_saves: e.penalty_saves,
        penalties_missed: e.penalties_missed,
        yellow_cards: e.yellow_cards,
        red_cards: e.red_cards,
        own_goals: e.own_goals,
        is_mvp: e.is_mvp,
        rating: e.rating.trim() === '' ? null : Number(e.rating),
      };
    });

    setBusy(true);
    setMsg('');
    try {
      const { error } = await db.rpc('save_match_stats', { p_match_id: matchId, p_rows: rows });
      if (error) setMsg(`Could not save stats: ${error.message}`);
      else {
        setMsg(
          `Saved! ${rows.length} player${rows.length === 1 ? '' : 's'} recorded (Hat-trick +3 & Match MVP +2 auto-calculated).`
        );
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SidelineMatchTimer />

      <div className="stats-mode-bar">
        <p className="muted tiny" style={{ margin: 0 }}>
          Mark everyone who played this 15-min match so auto-subs work accurately. Hat-tricks (3+ goals) automatically earn bonus points!
        </p>

        <div className="mode-Segmented">
          <button
            type="button"
            className={mode === 'quick' ? 'primary compact-btn' : 'secondary compact-btn'}
            onClick={() => setMode('quick')}
          >
            <Zap size={13} /> {t('quickTapMode')}
          </button>
          <button
            type="button"
            className={mode === 'table' ? 'primary compact-btn' : 'secondary compact-btn'}
            onClick={() => setMode('table')}
          >
            <List size={13} /> {t('tableMode')}
          </button>
        </div>
      </div>

      <div className="admin-form" style={{ marginTop: 10 }}>
        <select value={gwId ?? ''} onChange={e => setGwId(Number(e.target.value))}>
          {gws.length === 0 && <option value="">No gameweeks yet</option>}
          {gws.map(g => (
            <option key={g.id} value={g.id}>
              Gameweek #{g.number} ({g.status})
            </option>
          ))}
        </select>

        <select
          value={matchId ?? ''}
          onChange={e => setMatchId(e.target.value || null)}
          disabled={matches.length === 0}
        >
          {matches.length === 0 && <option value="">No matches yet</option>}
          {matches.map(m => (
            <option key={m.id} value={m.id}>
              15-Min Match #{m.match_number}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="primary compact-btn"
          disabled={busy || gwId == null}
          onClick={() => void addMatch()}
        >
          + Add 15-Min Match #{(matches[matches.length - 1]?.match_number ?? 0) + 1}
        </button>
      </div>

      {matchId && mode === 'quick' && (
        <div className="sideline-tracker-wrap">
          {/* STEP 1: TAP PLAYERS WHO PLAYED */}
          <div className="sideline-step-block">
            <span className="sideline-step-label">{t('tapPlayersWhoPlayed')}</span>
            <div className="sideline-roster-pills">
              {visiblePlayers.map(p => {
                const isPlaying = get(p.id).played;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`roster-pill ${isPlaying ? 'roster-pill-active' : ''}`}
                    onClick={() =>
                      patch(p.id, {
                        played: !isPlaying,
                        is_mvp: !isPlaying ? get(p.id).is_mvp : false,
                      })
                    }
                  >
                    <span>{isPlaying ? '✓' : '+'}</span>
                    <strong>{p.display_name}</strong>
                    {p.kit_number != null && <small>#{p.kit_number}</small>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: BIG SIDELINE QUICK-TAP CARDS */}
          {activeOnPitch.length === 0 ? (
            <p className="muted tiny" style={{ marginTop: 10 }}>
              Tap the players above who stepped onto the pitch in this 15-minute match.
            </p>
          ) : (
            <div className="sideline-step-block" style={{ marginTop: 14 }}>
              <span className="sideline-step-label">{t('quickTapStatsHint')}</span>
              <div className="sideline-cards-grid">
                {activeOnPitch.map(p => {
                  const e = get(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`sideline-player-card ${e.is_mvp ? 'sideline-card-mvp' : ''}`}
                    >
                      <div className="sideline-card-top">
                        <div className="sideline-player-id">
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
                            <strong>
                              {p.display_name}{' '}
                              {p.kit_number != null && (
                                <span className="inline-kit-chip">#{p.kit_number}</span>
                              )}
                            </strong>
                            {e.goals >= 3 && (
                              <span className="hattrick-mini-pill">
                                <Flame size={10} /> Hat-Trick!
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`mvp-toggle-btn ${e.is_mvp ? 'mvp-toggle-active' : ''}`}
                          onClick={() => toggleMvp(p.id)}
                        >
                          <Crown size={13} /> MVP
                        </button>
                      </div>

                      {/* PRIMARY STAT COUNTERS */}
                      <div className="sideline-tap-row">
                        {(
                          [
                            ['goals', '⚽ Goal'],
                            ['assists', '🎯 Assist'],
                            ['saves', '🧤 Save'],
                            ['yellow_cards', '🟨 YC'],
                            ['red_cards', '🟥 RC'],
                          ] as const
                        ).map(([field, label]) => (
                          <div className="tap-counter-box" key={field}>
                            <button
                              type="button"
                              className="tap-plus-btn"
                              onClick={() => bump(p.id, field, 1)}
                            >
                              <Plus size={12} /> {label}
                              {e[field] > 0 && <strong>{e[field]}</strong>}
                            </button>
                            {e[field] > 0 && (
                              <button
                                type="button"
                                className="tap-minus-btn"
                                title="Undo 1"
                                onClick={() => bump(p.id, field, -1)}
                              >
                                <Minus size={11} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* RATING + EXTRA PENALTY/OG MINI ROW */}
                      <div className="sideline-extra-row">
                        <label className="sideline-mini-field">
                          <span>★ Rating (0–10)</span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            placeholder="8.0"
                            value={e.rating}
                            onChange={ev => patch(p.id, { rating: ev.target.value })}
                          />
                        </label>
                        <label className="sideline-mini-field">
                          <span>🥅 Pen Save</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={e.penalty_saves}
                            onChange={ev =>
                              patch(p.id, {
                                penalty_saves: Math.max(0, Math.floor(Number(ev.target.value) || 0)),
                              })
                            }
                          />
                        </label>
                        <label className="sideline-mini-field">
                          <span>❌ Pen Miss</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={e.penalties_missed}
                            onChange={ev =>
                              patch(p.id, {
                                penalties_missed: Math.max(
                                  0,
                                  Math.floor(Number(ev.target.value) || 0)
                                ),
                              })
                            }
                          />
                        </label>
                        <label className="sideline-mini-field">
                          <span>😬 Own Goal</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={e.own_goals}
                            onChange={ev =>
                              patch(p.id, {
                                own_goals: Math.max(0, Math.floor(Number(ev.target.value) || 0)),
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="transfer-controls" style={{ marginTop: 14 }}>
            <button type="button" className="primary" disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save 15-Min Match Stats'}
            </button>
          </div>
        </div>
      )}

      {matchId && mode === 'table' && (
        <>
          <div className="admin-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Played</th>
                  <th>MVP</th>
                  {FIELDS.map(([k, label]) => (
                    <th key={k}>{label}</th>
                  ))}
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlayers.map(p => {
                  const e = get(p.id);
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.display_name}</strong>
                        {!p.is_active && <span className="muted tiny"> (inactive)</span>}
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={e.played}
                          onChange={ev =>
                            patch(p.id, {
                              played: ev.target.checked,
                              is_mvp: ev.target.checked ? e.is_mvp : false,
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={e.is_mvp}
                          disabled={!e.played}
                          onChange={() => toggleMvp(p.id)}
                        />
                      </td>
                      {FIELDS.map(([k]) => (
                        <td key={k}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={e[k]}
                            disabled={!e.played}
                            onChange={ev =>
                              patch(p.id, {
                                [k]: Math.max(0, Math.floor(Number(ev.target.value) || 0)),
                              } as Partial<Entry>)
                            }
                          />
                        </td>
                      ))}
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={e.rating}
                          disabled={!e.played}
                          onChange={ev => patch(p.id, { rating: ev.target.value })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="transfer-controls">
            <button type="button" className="primary" disabled={busy} onClick={() => void save()}>
              Save match stats
            </button>
          </div>
        </>
      )}

      {!matchId && gwId != null && (
        <p className="muted tiny" style={{ marginTop: 10 }}>
          Click <strong>+ Add 15-Min Match #1</strong> above to start logging Thursday’s matches.
        </p>
      )}
      {msg && (
        <div className="notice inline-notice" style={{ marginTop: 12 }}>
          {msg}
        </div>
      )}
    </div>
  );
}
