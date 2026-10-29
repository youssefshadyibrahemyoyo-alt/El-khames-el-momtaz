import { useCallback, useEffect, useState } from 'react';
import { Camera, ImageOff, Trash2 } from 'lucide-react';
import type { AdminProps } from './types';
import { uploadPlayerPhoto } from '../lib/supabase';

type Row = {
  id: string;
  display_name: string;
  price: number;
  is_active: boolean;
  photo_url: string | null;
};

type Edit = {
  name: string;
  price: string;
  active: boolean;
};

export default function PlayersAdmin({ db, onChanged }: AdminProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('5');
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db
      .from('football_players')
      .select('id,display_name,price,is_active,photo_url')
      .order('display_name', { ascending: true });
    if (error) {
      setMsg(error.message);
      return;
    }
    const list = (data ?? []) as Row[];
    setRows(list);
    setEdits(
      Object.fromEntries(
        list.map(p => [
          p.id,
          { name: p.display_name, price: String(p.price), active: p.is_active },
        ])
      )
    );
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = (p: Row) => {
    const e = edits[p.id];
    return (
      Boolean(e) &&
      (e.name !== p.display_name ||
        Number(e.price) !== Number(p.price) ||
        e.active !== p.is_active)
    );
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
    try {
      const { error } = await db
        .from('football_players')
        .update({ display_name: e.name.trim(), price, is_active: e.active })
        .eq('id', p.id);
      if (error) setMsg(`Could not save ${p.display_name}: ${error.message}`);
      else {
        setMsg(`${e.name.trim()} saved.`);
        await load();
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeFootballPlayer(p: Row) {
    if (
      !window.confirm(
        `Delete "${p.display_name}" completely from the player market? (Tip: if you only want to hide them from future picks while keeping past stats, untick Active instead.)`
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const { error } = await db.rpc('admin_delete_football_player', { p_player_id: p.id });
      if (error) {
        setMsg(`Could not delete ${p.display_name}: ${error.message}`);
      } else {
        setMsg(`Removed ${p.display_name} from the player pool.`);
        await load();
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const price = Number(newPrice);
    if (!newName.trim() || !Number.isFinite(price) || price <= 0) {
      setMsg('Enter a name and a price above 0.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const { data: created, error } = await db
        .from('football_players')
        .insert({ display_name: newName.trim(), price, is_active: true })
        .select('id')
        .single();

      if (error || !created) {
        setMsg(`Could not add player: ${error?.message ?? 'Unknown error'}`);
        return;
      }

      if (newPhotoFile) {
        const publicUrl = await uploadPlayerPhoto(db, String(created.id), newPhotoFile);
        await db.from('football_players').update({ photo_url: publicUrl }).eq('id', created.id);
      }

      setNewName('');
      setNewPhotoFile(null);
      setMsg('Player added.');
      await load();
      onChanged();
    } catch (err: any) {
      setMsg(err?.message ?? 'Could not upload photo.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePhotoUpload(player: Row, file: File | undefined) {
    if (!file) return;
    setUploadingId(player.id);
    setMsg('');
    try {
      const publicUrl = await uploadPlayerPhoto(db, player.id, file);
      const { error } = await db
        .from('football_players')
        .update({ photo_url: publicUrl })
        .eq('id', player.id);
      if (error) {
        setMsg(`Could not save photo: ${error.message}`);
      } else {
        setMsg(`Updated photo for ${player.display_name}.`);
        await load();
        onChanged();
      }
    } catch (err: any) {
      setMsg(err?.message ?? 'Photo upload failed.');
    } finally {
      setUploadingId(null);
    }
  }

  async function clearPhoto(player: Row) {
    setUploadingId(player.id);
    setMsg('');
    try {
      const { error } = await db
        .from('football_players')
        .update({ photo_url: null })
        .eq('id', player.id);
      if (error) setMsg(error.message);
      else {
        setMsg(`Removed photo for ${player.display_name}.`);
        await load();
        onChanged();
      }
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div>
      <p className="muted tiny">
        Upload player photos from your phone or PC, edit £m prices, untick “Active” to hide a player, or click Delete to remove them completely.
      </p>

      <div className="admin-form">
        <input
          type="text"
          placeholder="New player name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <input
          type="number"
          step="0.5"
          min="0.5"
          value={newPrice}
          onChange={e => setNewPrice(e.target.value)}
          style={{ width: 85 }}
        />
        <label className="secondary compact-btn upload-label">
          <Camera size={14} />
          {newPhotoFile ? newPhotoFile.name.slice(0, 14) : 'Photo (optional)'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={e => setNewPhotoFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button className="primary compact-btn" type="button" disabled={busy} onClick={() => void add()}>
          Add player
        </button>
      </div>

      <div className="admin-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Player</th>
              <th>Price (£m)</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const e = edits[p.id];
              if (!e) return null;
              const isUploading = uploadingId === p.id;
              return (
                <tr key={p.id}>
                  <td>
                    <div className="admin-photo-cell">
                      {p.photo_url ? (
                        <img className="leaderboard-photo" src={p.photo_url} alt={p.display_name} />
                      ) : (
                        <div className="player-photo small-photo">{p.display_name.slice(0, 1)}</div>
                      )}
                      <label className="secondary compact-btn upload-label" title="Upload photo">
                        <Camera size={13} />
                        {isUploading ? '…' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          disabled={isUploading || busy}
                          onChange={ev => void handlePhotoUpload(p, ev.target.files?.[0])}
                        />
                      </label>
                      {p.photo_url && (
                        <button
                          type="button"
                          className="icon-btn"
                          title="Clear photo"
                          disabled={isUploading || busy}
                          onClick={() => void clearPhoto(p)}
                        >
                          <ImageOff size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={e.name}
                      onChange={ev => setEdits(o => ({ ...o, [p.id]: { ...e, name: ev.target.value } }))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={e.price}
                      onChange={ev => setEdits(o => ({ ...o, [p.id]: { ...e, price: ev.target.value } }))}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={e.active}
                      onChange={ev => setEdits(o => ({ ...o, [p.id]: { ...e, active: ev.target.checked } }))}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        type="button"
                        className="primary compact-btn"
                        disabled={busy || !dirty(p)}
                        onClick={() => void save(p)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="secondary compact-btn"
                        disabled={busy}
                        title={`Delete ${p.display_name}`}
                        onClick={() => void removeFootballPlayer(p)}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
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
