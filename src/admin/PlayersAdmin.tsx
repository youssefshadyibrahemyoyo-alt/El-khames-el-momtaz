import { useCallback, useEffect, useState } from 'react';
import { Camera, ImageOff, SlidersHorizontal, Trash2, X } from 'lucide-react';
import type { AdminProps } from './types';
import type { AvailabilityStatus } from '../types/league';
import { uploadPlayerPhoto } from '../lib/supabase';

type Row = {
  id: string;
  display_name: string;
  price: number;
  is_active: boolean;
  photo_url: string | null;
  kit_number: number | null;
  nationality: string | null;
  favourite_team: string | null;
  preferred_foot: string | null;
  playstyle: string | null;
  age: number | null;
  bio: string | null;
  availability_status: AvailabilityStatus | null;
  availability_note: string | null;
};

type InlineEdit = {
  name: string;
  price: string;
  kit: string;
  active: boolean;
};

type ProfileDraft = {
  display_name: string;
  price: string;
  kit_number: string;
  nationality: string;
  favourite_team: string;
  preferred_foot: string;
  playstyle: string;
  age: string;
  bio: string;
  availability_status: AvailabilityStatus;
  availability_note: string;
  is_active: boolean;
};

const POPULAR_TEAMS = [
  'Al Ahly',
  'Zamalek',
  'Real Madrid',
  'Barcelona',
  'Liverpool',
  'Man City',
  'Arsenal',
  'AC Milan',
];

const PLAYSTYLES = [
  'Finisher',
  'Playmaker',
  'Box-to-Box',
  'Defender',
  'Goalkeeper',
  'All-Rounder',
];

export default function PlayersAdmin({ db, onChanged }: AdminProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, InlineEdit>>({});

  // Quick-add form
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('5');
  const [newKit, setNewKit] = useState('');
  const [newFavTeam, setNewFavTeam] = useState('');
  const [newNationality, setNewNationality] = useState('Egypt 🇪🇬');
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);

  // Full profile editor modal
  const [editingPlayer, setEditingPlayer] = useState<Row | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db
      .from('football_players')
      .select(
        'id,display_name,price,is_active,photo_url,kit_number,nationality,favourite_team,preferred_foot,playstyle,age,bio,availability_status,availability_note'
      )
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
          {
            name: p.display_name,
            price: String(p.price),
            kit: p.kit_number == null ? '' : String(p.kit_number),
            active: p.is_active,
          },
        ])
      )
    );
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = (p: Row) => {
    const e = edits[p.id];
    const origKit = p.kit_number == null ? '' : String(p.kit_number);
    return (
      Boolean(e) &&
      (e.name !== p.display_name ||
        Number(e.price) !== Number(p.price) ||
        e.kit.trim() !== origKit ||
        e.active !== p.is_active)
    );
  };

  async function saveInline(p: Row) {
    const e = edits[p.id];
    const price = Number(e.price);
    const kitVal = e.kit.trim() === '' ? null : Number(e.kit);
    if (!e.name.trim() || !Number.isFinite(price) || price <= 0) {
      setMsg('Enter a name and a price above 0.');
      return;
    }
    if (kitVal !== null && (!Number.isInteger(kitVal) || kitVal < 0 || kitVal > 99)) {
      setMsg('Kit number must be a whole number from 0 to 99.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const { error } = await db
        .from('football_players')
        .update({
          display_name: e.name.trim(),
          price,
          kit_number: kitVal,
          is_active: e.active,
        })
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

  async function setQuickAvailability(p: Row, status: AvailabilityStatus) {
    setBusy(true);
    setMsg('');
    try {
      const { error } = await db
        .from('football_players')
        .update({ availability_status: status })
        .eq('id', p.id);
      if (error) {
        setMsg(`Could not update availability: ${error.message}`);
      } else {
        setMsg(
          `${p.display_name} marked ${
            status === 'available'
              ? '🟢 Playing Tonight'
              : status === 'doubtful'
                ? '🟡 50/50 Doubtful'
                : '🔴 Out Tonight'
          }.`
        );
        await load();
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  }

  function openFullProfileEditor(p: Row) {
    setEditingPlayer(p);
    setDraft({
      display_name: p.display_name,
      price: String(p.price),
      kit_number: p.kit_number == null ? '' : String(p.kit_number),
      nationality: p.nationality ?? 'Egypt 🇪🇬',
      favourite_team: p.favourite_team ?? '',
      preferred_foot: p.preferred_foot ?? '',
      playstyle: p.playstyle ?? '',
      age: p.age == null ? '' : String(p.age),
      bio: p.bio ?? '',
      availability_status: p.availability_status ?? 'available',
      availability_note: p.availability_note ?? '',
      is_active: p.is_active,
    });
  }

  async function saveProfileModal() {
    if (!editingPlayer || !draft) return;
    const price = Number(draft.price);
    const kitVal = draft.kit_number.trim() === '' ? null : Number(draft.kit_number);
    const ageVal = draft.age.trim() === '' ? null : Number(draft.age);

    if (!draft.display_name.trim() || !Number.isFinite(price) || price <= 0) {
      setMsg('Enter a valid name and price.');
      return;
    }
    if (kitVal !== null && (!Number.isInteger(kitVal) || kitVal < 0 || kitVal > 99)) {
      setMsg('Kit number must be between 0 and 99.');
      return;
    }
    if (ageVal !== null && (!Number.isInteger(ageVal) || ageVal < 10 || ageVal > 70)) {
      setMsg('Age must be between 10 and 70.');
      return;
    }

    setBusy(true);
    setMsg('');
    try {
      const { error } = await db
        .from('football_players')
        .update({
          display_name: draft.display_name.trim(),
          price,
          kit_number: kitVal,
          nationality: draft.nationality.trim() || 'Egypt 🇪🇬',
          favourite_team: draft.favourite_team.trim() || null,
          preferred_foot: draft.preferred_foot || null,
          playstyle: draft.playstyle.trim() || null,
          age: ageVal,
          bio: draft.bio.trim() || null,
          availability_status: draft.availability_status,
          availability_note: draft.availability_note.trim() || null,
          is_active: draft.is_active,
        })
        .eq('id', editingPlayer.id);

      if (error) {
        setMsg(`Could not update profile: ${error.message}`);
        return;
      }

      setMsg(`Full profile saved for ${draft.display_name.trim()}.`);
      setEditingPlayer(null);
      setDraft(null);
      await load();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function removeFootballPlayer(p: Row) {
    if (
      !window.confirm(
        `Delete "${p.display_name}" completely from the player market? (Tip: untick Active instead if you only want to hide them from future picks.)`
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
    const kitVal = newKit.trim() === '' ? null : Number(newKit);
    if (!newName.trim() || !Number.isFinite(price) || price <= 0) {
      setMsg('Enter a name and a price above 0.');
      return;
    }
    if (kitVal !== null && (!Number.isInteger(kitVal) || kitVal < 0 || kitVal > 99)) {
      setMsg('Kit number must be between 0 and 99.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const { data: created, error } = await db
        .from('football_players')
        .insert({
          display_name: newName.trim(),
          price,
          kit_number: kitVal,
          favourite_team: newFavTeam.trim() || null,
          nationality: newNationality.trim() || 'Egypt 🇪🇬',
          is_active: true,
        })
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
      setNewKit('');
      setNewFavTeam('');
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
        Click <strong>Profile</strong> on any player to edit their kit number, favourite team, nationality, preferred foot, role, age, and bio.
      </p>

      <div className="admin-form">
        <input
          type="text"
          placeholder="Player name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Kit #"
          min="0"
          max="99"
          value={newKit}
          onChange={e => setNewKit(e.target.value)}
          style={{ width: 72 }}
        />
        <input
          type="number"
          step="0.5"
          min="0.5"
          value={newPrice}
          onChange={e => setNewPrice(e.target.value)}
          style={{ width: 80 }}
          title="Price (£m)"
        />
        <input
          type="text"
          placeholder="Favourite team (e.g. Al Ahly)"
          value={newFavTeam}
          onChange={e => setNewFavTeam(e.target.value)}
          style={{ width: 175 }}
        />
        <input
          type="text"
          placeholder="Nationality"
          value={newNationality}
          onChange={e => setNewNationality(e.target.value)}
          style={{ width: 120 }}
        />
        <label className="secondary compact-btn upload-label">
          <Camera size={14} />
          {newPhotoFile ? newPhotoFile.name.slice(0, 12) : 'Photo'}
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
              <th>Kit #</th>
              <th>Player</th>
              <th>Info</th>
              <th>Price (£m)</th>
              <th>Thursday Status</th>
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
                      type="number"
                      min="0"
                      max="99"
                      placeholder="—"
                      value={e.kit}
                      onChange={ev => setEdits(o => ({ ...o, [p.id]: { ...e, kit: ev.target.value } }))}
                      style={{ width: 58 }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={e.name}
                      onChange={ev => setEdits(o => ({ ...o, [p.id]: { ...e, name: ev.target.value } }))}
                    />
                  </td>
                  <td>
                    <span className="muted tiny">
                      {[p.nationality, p.favourite_team, p.playstyle].filter(Boolean).join(' · ') || '—'}
                    </span>
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
                    <div className="avail-quick-group" title={p.availability_note ?? undefined}>
                      <button
                        type="button"
                        className={`avail-pill avail-pill--available ${(p.availability_status ?? 'available') === 'available' ? 'active' : ''}`}
                        disabled={busy}
                        onClick={() => void setQuickAvailability(p, 'available')}
                      >
                        🟢 In
                      </button>
                      <button
                        type="button"
                        className={`avail-pill avail-pill--doubtful ${p.availability_status === 'doubtful' ? 'active' : ''}`}
                        disabled={busy}
                        onClick={() => void setQuickAvailability(p, 'doubtful')}
                      >
                        🟡 50/50
                      </button>
                      <button
                        type="button"
                        className={`avail-pill avail-pill--out ${p.availability_status === 'out' ? 'active' : ''}`}
                        disabled={busy}
                        onClick={() => void setQuickAvailability(p, 'out')}
                      >
                        🔴 Out
                      </button>
                    </div>
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
                        className="secondary compact-btn"
                        disabled={busy}
                        onClick={() => openFullProfileEditor(p)}
                      >
                        <SlidersHorizontal size={13} /> Profile
                      </button>
                      <button
                        type="button"
                        className="primary compact-btn"
                        disabled={busy || !dirty(p)}
                        onClick={() => void saveInline(p)}
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
                        <Trash2 size={13} />
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

      {/* FULL PROFILE EDITOR MODAL */}
      {editingPlayer && draft && (
        <div className="modal-backdrop" onClick={() => setEditingPlayer(null)}>
          <div className="modal-card modal-sheet-spring" onClick={e => e.stopPropagation()}>
            <div className="sheet-grabber" aria-hidden="true" />
            <div className="panel-heading">
              <div>
                <h3>Edit Profile · {editingPlayer.display_name}</h3>
                <p>Kit number, favourite club, nationality, role, foot, age & scouting bio</p>
              </div>
              <button
                type="button"
                className="secondary compact-btn"
                onClick={() => setEditingPlayer(null)}
              >
                <X size={14} /> Close
              </button>
            </div>

            <div className="admin-profile-form-grid">
              <label>
                Player Name
                <input
                  type="text"
                  value={draft.display_name}
                  onChange={e => setDraft({ ...draft, display_name: e.target.value })}
                />
              </label>

              <label>
                Kit Number (0–99)
                <input
                  type="number"
                  min="0"
                  max="99"
                  placeholder="e.g. 10"
                  value={draft.kit_number}
                  onChange={e => setDraft({ ...draft, kit_number: e.target.value })}
                />
              </label>

              <label>
                Price (£m)
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={draft.price}
                  onChange={e => setDraft({ ...draft, price: e.target.value })}
                />
              </label>

              <label>
                Nationality
                <input
                  type="text"
                  placeholder="Egypt 🇪🇬"
                  value={draft.nationality}
                  onChange={e => setDraft({ ...draft, nationality: e.target.value })}
                />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                Favourite Team
                <input
                  type="text"
                  placeholder="e.g. Al Ahly, Zamalek, Real Madrid…"
                  value={draft.favourite_team}
                  onChange={e => setDraft({ ...draft, favourite_team: e.target.value })}
                />
                <div className="preset-chips-row">
                  {POPULAR_TEAMS.map(club => (
                    <button
                      type="button"
                      key={club}
                      className={`secondary compact-btn ${draft.favourite_team === club ? 'preset-selected' : ''}`}
                      onClick={() => setDraft({ ...draft, favourite_team: club })}
                    >
                      {club}
                    </button>
                  ))}
                </div>
              </label>

              <label>
                Role / Playstyle
                <select
                  value={draft.playstyle}
                  onChange={e => setDraft({ ...draft, playstyle: e.target.value })}
                >
                  <option value="">— Not set —</option>
                  {PLAYSTYLES.map(ps => (
                    <option key={ps} value={ps}>
                      {ps}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Preferred Foot
                <select
                  value={draft.preferred_foot}
                  onChange={e => setDraft({ ...draft, preferred_foot: e.target.value })}
                >
                  <option value="">— Not set —</option>
                  <option value="Right">Right</option>
                  <option value="Left">Left</option>
                  <option value="Both">Both</option>
                </select>
              </label>

              <label>
                Age (optional)
                <input
                  type="number"
                  min="10"
                  max="70"
                  placeholder="e.g. 22"
                  value={draft.age}
                  onChange={e => setDraft({ ...draft, age: e.target.value })}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={e => setDraft({ ...draft, is_active: e.target.checked })}
                />
                Active in player market
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                Short Bio / Nickname (optional)
                <input
                  type="text"
                  placeholder="e.g. Thursday night top-bins specialist"
                  value={draft.bio}
                  onChange={e => setDraft({ ...draft, bio: e.target.value })}
                />
              </label>

              <label>
                Thursday Availability Flag (FPL)
                <select
                  value={draft.availability_status}
                  onChange={e =>
                    setDraft({
                      ...draft,
                      availability_status: e.target.value as AvailabilityStatus,
                    })
                  }
                >
                  <option value="available">🟢 Playing Tonight</option>
                  <option value="doubtful">🟡 50/50 Doubtful</option>
                  <option value="out">🔴 Out Tonight</option>
                </select>
              </label>

              <label>
                Availability Note (optional)
                <input
                  type="text"
                  placeholder="e.g. Late work shift / Ankle knock"
                  value={draft.availability_note}
                  onChange={e => setDraft({ ...draft, availability_note: e.target.value })}
                />
              </label>
            </div>

            <div className="transfer-controls">
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => void saveProfileModal()}
              >
                Save player profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
