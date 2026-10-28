import { useCallback, useEffect, useState } from 'react';
import type { AdminProps } from './types';

type Member = {
  id: string;
  display_name: string;
  role: string;
  player_approval_status: string;
};

export default function RegistrationsAdmin({ db, onChanged }: AdminProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db
      .from('profiles')
      .select('id,display_name,role,player_approval_status')
      .order('created_at', { ascending: true });
    if (error) setMsg(error.message);
    else setMembers((data ?? []) as Member[]);
  }, [db]);

  useEffect(() => { void load(); }, [load]);

  async function setStatus(m: Member, status: 'approved' | 'rejected') {
    setBusy(true);
    setMsg('');
    const { error } = await db
      .from('profiles')
      .update({ player_approval_status: status })
      .eq('id', m.id);
    if (error) setMsg(`Could not update ${m.display_name}: ${error.message}`);
    else {
      setMsg(`${m.display_name} is now ${status}.`);
      await load();
      onChanged();
    }
    setBusy(false);
  }

  const pending = members.filter(m => m.player_approval_status === 'pending');
  const approved = members.filter(m => m.player_approval_status === 'approved');
  const rejected = members.filter(m => m.player_approval_status === 'rejected');

  return (
    <div>
      <div className="admin-section">
        <h4>Waiting for approval ({pending.length})</h4>
        {pending.length === 0 && <p className="muted tiny">No one is waiting.</p>}
        {pending.map(m => (
          <div className="player-row" key={m.id}>
            <div className="player-photo small-photo">{m.display_name.slice(0, 1)}</div>
            <div className="player-info"><strong>{m.display_name}</strong><span>New registration</span></div>
            <button className="primary compact-btn" disabled={busy} onClick={() => void setStatus(m, 'approved')}>Approve</button>
            <button className="secondary compact-btn" disabled={busy} onClick={() => void setStatus(m, 'rejected')}>Reject</button>
          </div>
        ))}
      </div>

      <div className="admin-section">
        <h4>Approved players ({approved.length})</h4>
        {approved.map(m => (
          <div className="player-row" key={m.id}>
            <div className="player-photo small-photo">{m.display_name.slice(0, 1)}</div>
            <div className="player-info">
              <strong>{m.display_name}</strong>
              <span>{m.role === 'admin_player' ? 'Admin + player' : 'Player'}</span>
            </div>
            {m.role !== 'admin_player' && (
              <button className="secondary compact-btn" disabled={busy} onClick={() => void setStatus(m, 'rejected')}>Remove</button>
            )}
          </div>
        ))}
      </div>

      {rejected.length > 0 && (
        <div className="admin-section">
          <h4>Rejected / removed ({rejected.length})</h4>
          {rejected.map(m => (
            <div className="player-row" key={m.id}>
              <div className="player-photo small-photo">{m.display_name.slice(0, 1)}</div>
              <div className="player-info"><strong>{m.display_name}</strong></div>
              <button className="secondary compact-btn" disabled={busy} onClick={() => void setStatus(m, 'approved')}>Approve</button>
            </div>
          ))}
        </div>
      )}

      {msg && <div className="notice inline-notice">{msg}</div>}
    </div>
  );
}
