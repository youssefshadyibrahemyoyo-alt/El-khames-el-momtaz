import { useCallback, useEffect, useState } from 'react';
import type { AdminProps } from './types';

type Row = { id: string; display_name: string; price: number; is_active: boolean };
type Edit = { name: string; price: string; active: boolean };

export default function PlayersAdmin({ db, onChanged }: AdminProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('5');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db
      .from('football_players')
      .select('id,display_name,price,is_active')
      .order('display_name', { ascending: true });
    if (error) { setMsg(error.message); return; }
    const list = (data ?? []) as Row[];
    setRows(list);
    setEdits(Object.fromEntries(list.map(p => [
      p.id,
      { name: p.display_name, price: String(p.price), active: p.is_active },
    ])));
  }, [db]);

  useEffect(() => { void load(); }, [load]);

  const dirty = (p: Row) => {
    const e = edits[p.id];
    return !!e && (e.name !== p.display_name || Number(e.price) !== Number(p.price) || e.active !== p.is_active);
  };

  async function save(p: Row) {
    const e = edits[p.id];
    const price = Number(e.price);
    if (!e.name.trim() || !Number.isFinite(price) || price <= 0) {
      setMsg('Enter a name and a price above 0.');
      return;
    }
    setBusy(true);
    setMsg('');
    const { error } = await db
      .from('football_players')
      .update({ display_name: e.name.trim(), price, is_active: e.active })
      .eq('id', p.id);
    if (error) setMsg(`Could not save ${p.display_name}: ${error.message}`);
    else { setMsg(`${e.name.trim()} saved.`); await load(); onChanged(); }
    setBusy(false);
  }

  async function add() {
    const price = Number(newPrice);
    if (!newName.trim() || !Number.isFinite(price) || price <= 0) {
      setMsg('Enter a name and a price above 0.');
      return;
    }
    setBusy(true);
    setMsg('');
    const { error } = await db
      .from('football_players')
      .insert({ display_name: newName.trim(), price, is_active: true });
    if (error) setMsg(`Could not add player: ${error.message}`);
    else { setNewName(''); setMsg('Player added.'); await load(); onChanged(); }
    setBusy(false);
  }

  return (
    <div>
      <p className="muted tiny">
        Prices apply the next time a manager saves a squad. Untick “Active” to hide a player from the market.
      </p>

      <div className="admin-form">
        <input type="text" placeholder="New player name" value={newName} onChange={e => setNewName(e.target.value)} />
        <input type="number" step="0.5" min="0" value={newPrice} onChange={e => setNewPrice(e.target.value)} style={{ width: 80 }} />
        <button className="primary compact-btn" disabled={busy} onClick={() => void add()}>Add player</button>
      </div>

      <div className="admin-scroll">
        <table className="admin-table">
          <thead><tr><th>Player</th><th>Price (£m)</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {rows.map(p => {
              const e = edits[p.id];
              if (!e) return null;
              return (
                <tr key={p.id}>
                  <td><input type="text" value={e.name} onChange={ev => setEdits(o => ({ ...o, [p.id]: { ...e, name: ev.target.value } }))} /></td>
                  <td><input type="number" step="0.5" min="0" value={e.price} onChange={ev => setEdits(o => ({ ...o, [p.id]: { ...e, price: ev.target.value } }))} /></td>
                  <td><input type="checkbox" checked={e.active} onChange={ev => setEdits(o => ({ ...o, [p.id]: { ...e, active: ev.target.checked } }))} /></td>
                  <td><button className="primary compact-btn" disabled={busy || !dirty(p)} onClick={() => void save(p)}>Save</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && <p className="muted tiny">No players yet. Add your first player above.</p>}
      {msg && <div className="notice inline-notice">{msg}</div>}
    </div>
  );
}
