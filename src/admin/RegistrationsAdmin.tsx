import { useCallback, useEffect, useState } from 'react';
import { Trash2, UserCheck, UserX } from 'lucide-react';
import type { AdminProps } from './types';

type Member = {
  id: string;
  display_name: string;
  role: string;
  player_approval_status: string;
};

export default function RegistrationsAdmin({ db, onChanged }: AdminProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [autoApprove, setAutoApprove] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [membersRes, settingsRes] = await Promise.all([
      db
        .from('profiles')
        .select('id,display_name,role,player_approval_status')
        .order('created_at', { ascending: true }),
      db.from('league_settings').select('auto_approve_signups').eq('id', 1).maybeSingle(),
    ]);

    if (membersRes.error) setMsg(membersRes.error.message);
    else setMembers((membersRes.data ?? []) as Member[]);

    if (!settingsRes.error && settingsRes.data) {
      setAutoApprove(Boolean(settingsRes.data.auto_approve_signups));
    }
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleAutoApprove(next: boolean) {
    setBusy(true);
    setMsg('');
    const { error } = await db.rpc('admin_set_auto_approve', { p_enabled: next });
    if (error) {
      setMsg(`Could not update signup mode: ${error.message}`);
    } else {
      setAutoApprove(next);
      setMsg(
        next
          ? 'Auto-approve ON: new friends can join immediately after creating an account.'
          : 'Manual approval ON: new signups must be approved by you first.'
      );
    }
    setBusy(false);
  }

  async function setStatus(m: Member, status: 'approved' | 'rejected') {
    setBusy(true);
    setMsg('');
    const { error } = await db.rpc('admin_set_member_status', {
      p_user_id: m.id,
      p_status: status,
    });
    if (error) {
      setMsg(`Could not update ${m.display_name}: ${error.message}`);
    } else {
      setMsg(`${m.display_name} is now ${status === 'approved' ? 'approved' : 'removed from the league'}.`);
      await load();
      onChanged();
    }
    setBusy(false);
  }

  async function deleteAccount(m: Member) {
    if (
      !window.confirm(
        `Permanently delete ${m.display_name}'s account and squads? They can sign up again from scratch if needed.`
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg('');
    const { error } = await db.rpc('admin_delete_member', { p_user_id: m.id });
    if (error) {
      setMsg(`Could not delete ${m.display_name}: ${error.message}`);
    } else {
      setMsg(`Deleted ${m.display_name}'s account.`);
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
      <div className="match-lock-panel" style={{ marginTop: 0, marginBottom: 16 }}>
        <div>
          <strong>
            {autoApprove ? 'Instant friend signups: ON' : 'Manual admin approval: ON'}
          </strong>
          <p className="muted tiny" style={{ marginBottom: 0 }}>
            {autoApprove
              ? 'Friends who create an account join the league right away. You can still remove or delete anyone below.'
              : 'New signups wait in “Waiting for approval” until you approve them.'}
          </p>
        </div>
        <button
          type="button"
          className={autoApprove ? 'secondary compact-btn' : 'primary compact-btn'}
          disabled={busy}
          onClick={() => void toggleAutoApprove(!autoApprove)}
        >
          {autoApprove ? 'Require manual approval' : 'Turn on auto-approve'}
        </button>
      </div>

      <div className="admin-section">
        <h4>Waiting for approval ({pending.length})</h4>
        {pending.length === 0 && <p className="muted tiny">No one is waiting.</p>}
        {pending.map(m => (
          <div className="player-row" key={m.id}>
            <div className="player-photo small-photo">{m.display_name.slice(0, 1)}</div>
            <div className="player-info">
              <strong>{m.display_name}</strong>
              <span>New registration</span>
            </div>
            <button
              className="primary compact-btn"
              disabled={busy}
              onClick={() => void setStatus(m, 'approved')}
            >
              <UserCheck size={13} /> Approve
            </button>
            <button
              className="secondary compact-btn"
              disabled={busy}
              onClick={() => void setStatus(m, 'rejected')}
            >
              <UserX size={13} /> Reject
            </button>
            <button
              className="secondary compact-btn"
              disabled={busy}
              title="Delete account permanently"
              onClick={() => void deleteAccount(m)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="admin-section">
        <h4>Approved managers ({approved.length})</h4>
        {approved.map(m => (
          <div className="player-row" key={m.id}>
            <div className="player-photo small-photo">{m.display_name.slice(0, 1)}</div>
            <div className="player-info">
              <strong>{m.display_name}</strong>
              <span>{m.role === 'admin_player' ? 'Admin + player' : 'Player'}</span>
            </div>
            {m.role !== 'admin_player' && (
              <>
                <button
                  className="secondary compact-btn"
                  disabled={busy}
                  onClick={() => void setStatus(m, 'rejected')}
                >
                  <UserX size={13} /> Remove
                </button>
                <button
                  className="secondary compact-btn"
                  disabled={busy}
                  title="Delete account permanently"
                  onClick={() => void deleteAccount(m)}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {rejected.length > 0 && (
        <div className="admin-section">
          <h4>Removed / suspended ({rejected.length})</h4>
          {rejected.map(m => (
            <div className="player-row" key={m.id}>
              <div className="player-photo small-photo">{m.display_name.slice(0, 1)}</div>
              <div className="player-info">
                <strong>{m.display_name}</strong>
                <span>Suspended from league</span>
              </div>
              <button
                className="primary compact-btn"
                disabled={busy}
                onClick={() => void setStatus(m, 'approved')}
              >
                <UserCheck size={13} /> Re-approve
              </button>
              <button
                className="secondary compact-btn"
                disabled={busy}
                onClick={() => void deleteAccount(m)}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {msg && <div className="notice inline-notice">{msg}</div>}
    </div>
  );
}
