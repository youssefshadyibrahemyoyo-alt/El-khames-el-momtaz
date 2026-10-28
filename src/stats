import { useCallback, useEffect, useState } from 'react';
import type { AdminProps } from './types';

type GW = { id: number; number: number; status: string };
type Match = { id: string; match_number: number; status: string | null };
type Player = { id: string; display_name: string };

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

type Entry = { played: boolean; rating: string } & Record<Field, number>;

const blank = (): Entry => ({
  played: false, rating: '',
  goals: 0, assists: 0, saves: 0, penalty_saves: 0,
  penalties_missed: 0, yellow_cards: 0, red_cards: 0, own_goals: 0,
});

export default function StatsAdmin({ db, onChanged }: AdminProps) {
  const [gws, setGws] = useState<GW[]>([]);
  const [gwId, setGwId] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [entry, setEntry] = useState<Record<string, Entry>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [g, p] = await Promise.all([
        db.from('gameweeks').select('id,number,status').order('number', { ascending: false }),
        db.from('football_players').select('id,display_name').eq('is_active', true).order('display_name', { ascending: true }),
      ]);
      if (g.error) { setMsg(g.error.message); return; }
      if (p.error) { setMsg(p.error.message); return; }
      const list = (g.data ?? []) as GW[];
      setGws(list);
      setPlayers((p.data ?? []) as Player[]);
      const active = list.find(x => String(x.status).toLowerCase() === 'active');
      setGwId((active ?? list[0])?.id ?? null);
    })();
  }, [db]);

  const loadMatches = useCallback(async () => {
    if (gwId == null) { setMatches([]); setMatchId(null); return; }
    const { data, error } = await db
      .from('matches')
      .select('id,match_number,status')
      .eq('gameweek_id', gwId)
      .order('match_number', { ascending: true });
    if (error) { setMsg(error.message); return; }
    const list = (data ?? []) as Match[];
    setMatches(list);
    setMatchId(cur => (cur && list.some(m => m.id === cur) ? cur : list[0]?.id ?? null));
  }, [db, gwId]);

  useEffect(() => { void loadMatches(); }, [loadMatches]);

  useEffect(() => {
    if (!matchId) { setEntry({}); return; }
    void (async () => {
      const { data, error } = await db
        .from('player_match_stats')
        .select('player_id,goals,assists,saves,penalty_saves,penalties_missed,yellow_cards,red_cards,own_goals,rating')
        .eq('match_id', matchId);
      if (error) { setMsg(error.message); return; }
      const next: Record<string, Entry> = {};
      for (const r of (data ?? []) as Array<Record<string, number | string | null>>) {
        const e = blank();
        e.played = true;
        for (const [f] of FIELDS) e[f] = Number(r[f] ?? 0);
        e.rating = r.rating == null ? '' : String(r.rating);
        next[String(r.player_id)] = e;
      }
      setEntry(next);
    })();
  }, [db, matchId]);

  const get = (id: string) => entry[id] ?? blank();
  const patch = (id: string, change: Partial<Entry>) =>
    setEntry(o => ({ ...o, [id]: { ...(o[id] ?? blank()), ...change } }));

  async function addMatch() {
    if (gwId == null) return;
    setBusy(true);
    setMsg('');
    const { error } = await db.from('matches').insert({
      gameweek_id: gwId,
      match_number: (matches[matches.length - 1]?.match_number ?? 0) + 1,
      status: 'finished',
      ended_at: new Date().toISOString(),
    });
    if (error) setMsg(`Could not add match: ${error.message}`);
    else await loadMatches();
    setBusy(false);
  }

  async function save() {
    if (!matchId) return;
    const rows = players
      .filter(p => get(p.id).played)
      .map(p => {
        const e = get(p.id);
        return {
          player_id: p.id,
          goals: e.goals, assists: e.assists, saves: e.saves,
          penalty_saves: e.penalty_saves, penalties_missed: e.penalties_missed,
          yellow_cards: e.yellow_cards, red_cards: e.red_cards, own_goals: e.own_goals,
          rating: e.rating === '' ? null : Number(e.rating),
        };
      });
    setBusy(true);
    setMsg('');
    const { error } = await db.rpc('save_match_stats', { p_match_id: matchId, p_rows: rows });
    if (error) setMsg(`Could not save stats: ${error.message}`);
    else { setMsg(`Saved. ${rows.length} player${rows.length === 1 ? '' : 's'} played in this match.`); onChanged(); }
    setBusy(false);
  }

  return (
    <div>
      <p className="muted tiny">
        Tick “Played” for every player who took part, even if all their numbers are 0.
        A player who is not ticked is treated as absent, so a substitute can replace him.
      </p>

      <div className="admin-form">
        <select value={gwId ?? ''} onChange={e => setGwId(Number(e.target.value))}>
          {gws.map(g => <option key={g.id} value={g.id}>Gameweek {g.number} ({g.status})</option>)}
        </select>
        <select value={matchId ?? ''} onChange={e => setMatchId(e.target.value || null)} disabled={matches.length === 0}>
          {matches.length === 0 && <option value="">No matches yet</option>}
          {matches.map(m => <option key={m.id} value={m.id}>Match {m.match_number}</option>)}
        </select>
        <button className="secondary compact-btn" disabled={busy || gwId == null} onClick={() => void addMatch()}>+ Add match</button>
      </div>

      {matchId && (
        <>
          <div className="admin-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Player</th><th>Played</th>
                  {FIELDS.map(([k, label]) => <th key={k}>{label}</th>)}
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {players.map(p => {
                  const e = get(p.id);
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.display_name}</strong></td>
                      <td><input type="checkbox" checked={e.played} onChange={ev => patch(p.id, { played: ev.target.checked })} /></td>
                      {FIELDS.map(([k]) => (
                        <td key={k}>
                          <input
                            type="number" min="0" value={e[k]} disabled={!e.played}
                            onChange={ev => patch(p.id, { [k]: Math.max(0, Number(ev.target.value) || 0) } as Partial<Entry>)}
                          />
                        </td>
                      ))}
                      <td>
                        <input
                          type="number" min="0" max="10" step="0.1" value={e.rating} disabled={!e.played}
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
            <button className="primary" disabled={busy} onClick={() => void save()}>Save match stats</button>
          </div>
        </>
      )}

      {!matchId && gwId != null && <p className="muted tiny">Add a match to start entering stats.</p>}
      {msg && <div className="notice inline-notice">{msg}</div>}
    </div>
  );
}
