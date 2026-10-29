import { useCallback, useEffect, useState } from 'react';
import type { AdminProps } from './types';
import { fromCairoDateTimeInput, toCairoDateTimeInput } from '../lib/cairoTime';

type GW = { id: number; number: number; status: string; transfer_deadline: string | null };
type Result = { error: { message: string } | null };

export default function GameweeksAdmin({ db, onChanged }: AdminProps) {
  const [rows, setRows] = useState<GW[]>([]);
  const [deadlines, setDeadlines] = useState<Record<number, string>>({});
  const [newDeadline, setNewDeadline] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db
      .from('gameweeks')
      .select('id,number,status,transfer_deadline')
      .order('number', { ascending: false });
    if (error) {
      setMsg(error.message);
      return;
    }
    const list = (data ?? []) as GW[];
    setRows(list);
    setDeadlines(Object.fromEntries(list.map(g => [g.id, toCairoDateTimeInput(g.transfer_deadline)])));
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(label: string, fn: () => PromiseLike<Result>) {
    setBusy(true);
    setMsg('');
    try {
      const { error } = await fn();
      if (error) setMsg(`${label} failed: ${error.message}`);
      else {
        setMsg(`${label}: done.`);
        await load();
        onChanged();
      }
    } catch (e: any) {
      setMsg(`${label} failed: ${e?.message ?? 'Unexpected error'}`);
    } finally {
      setBusy(false);
    }
  }

  const status = (g: GW) => String(g.status).toLowerCase();
  const hasActive = rows.some(g => status(g) === 'active');

  return (
    <div>
      <p className="muted tiny">
        Flow: create a gameweek with a Cairo-time deadline, start it (this also auto-rolls over squads for managers who made no changes), record matches, then end it.
      </p>

      <div className="admin-form">
        <label className="tiny muted">Deadline (Cairo time)</label>
        <input type="datetime-local" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} />
        <button
          type="button"
          className="primary compact-btn"
          disabled={busy || !newDeadline}
          onClick={() =>
            void run('Create gameweek', () =>
              db.from('gameweeks').insert({
                number: (rows[0]?.number ?? 0) + 1,
                status: 'draft',
                transfer_deadline: fromCairoDateTimeInput(newDeadline),
              })
            )
          }
        >
          Create gameweek {(rows[0]?.number ?? 0) + 1}
        </button>
      </div>

      <div className="admin-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>GW</th>
              <th>Status</th>
              <th>Transfer deadline (Cairo)</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(g => (
              <tr key={g.id}>
                <td>
                  <strong>{g.number}</strong>
                </td>
                <td>{g.status}</td>
                <td>
                  <input
                    type="datetime-local"
                    value={deadlines[g.id] ?? ''}
                    disabled={status(g) === 'finished'}
                    onChange={e => setDeadlines(o => ({ ...o, [g.id]: e.target.value }))}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="secondary compact-btn"
                    disabled={
                      busy ||
                      status(g) === 'finished' ||
                      (deadlines[g.id] ?? '') === toCairoDateTimeInput(g.transfer_deadline)
                    }
                    onClick={() =>
                      void run('Save deadline', () =>
                        db
                          .from('gameweeks')
                          .update({ transfer_deadline: fromCairoDateTimeInput(deadlines[g.id] ?? '') })
                          .eq('id', g.id)
                      )
                    }
                  >
                    Save deadline
                  </button>
                </td>
                <td>
                  {['draft', 'open'].includes(status(g)) && (
                    <button
                      type="button"
                      className="primary compact-btn"
                      disabled={busy || hasActive}
                      title={hasActive ? 'End the active gameweek first' : ''}
                      onClick={() =>
                        void run(`Start gameweek ${g.number}`, () =>
                          db.rpc('start_gameweek', { p_gameweek_id: g.id })
                        )
                      }
                    >
                      Start
                    </button>
                  )}
                  {status(g) === 'active' && (
                    <button
                      type="button"
                      className="primary compact-btn"
                      disabled={busy}
                      onClick={() =>
                        void run(`End gameweek ${g.number}`, () =>
                          db
                            .from('gameweeks')
                            .update({ status: 'finished', ended_at: new Date().toISOString() })
                            .eq('id', g.id)
                        )
                      }
                    >
                      End
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && <p className="muted tiny">No gameweeks yet. Create the first one above.</p>}
      {msg && <div className="notice inline-notice">{msg}</div>}
    </div>
  );
}
