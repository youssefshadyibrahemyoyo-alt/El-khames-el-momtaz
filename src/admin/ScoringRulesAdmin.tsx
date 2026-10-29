import { useCallback, useEffect, useState } from 'react';
import type { AdminProps } from './types';
import type { ScoringRule } from '../types/league';

export default function ScoringRulesAdmin({ db, onChanged }: AdminProps) {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await db
      .from('scoring_rules')
      .select('key,label,points')
      .order('points', { ascending: false });
    if (error) {
      setMsg(error.message);
      return;
    }
    const list = ((data ?? []) as ScoringRule[]).map(r => ({
      ...r,
      points: Number(r.points),
    }));
    setRules(list);
    setEdits(Object.fromEntries(list.map(r => [r.key, String(r.points)])));
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRule(rule: ScoringRule) {
    const raw = edits[rule.key];
    const pts = Number(raw);
    if (raw === undefined || raw.trim() === '' || !Number.isFinite(pts)) {
      setMsg('Enter a valid number of points.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const { error } = await db
        .from('scoring_rules')
        .update({ points: pts })
        .eq('key', rule.key);
      if (error) {
        setMsg(`Could not update ${rule.label}: ${error.message}`);
      } else {
        setMsg(`Updated ${rule.label} to ${pts > 0 ? `+${pts}` : pts} pts.`);
        await load();
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="muted tiny">
        Adjust how many fantasy points each match event awards. Standings and player totals recalculate automatically. Match ratings (0–10) are for the Ratings leaderboard only.
      </p>

      <div className="admin-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Stat</th>
              <th>Points</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => {
              const val = edits[r.key] ?? String(r.points);
              const changed = Number(val) !== Number(r.points);
              return (
                <tr key={r.key}>
                  <td>
                    <strong>{r.label}</strong>
                    <span className="muted tiny"> ({r.key})</span>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.5"
                      value={val}
                      onChange={e => setEdits(o => ({ ...o, [r.key]: e.target.value }))}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="primary compact-btn"
                      disabled={busy || !changed}
                      onClick={() => void saveRule(r)}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {msg && <div className="notice inline-notice">{msg}</div>}
    </div>
  );
}
