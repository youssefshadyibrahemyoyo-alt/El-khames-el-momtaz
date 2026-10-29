import { useEffect, useState } from 'react';
import { Camera, Crown, KeyRound, Shield, Trash2, Trophy, Wallet, X } from 'lucide-react';
import type { ManagerTrophyMap, Profile } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase, uploadManagerAvatar } from '../lib/supabase';

type Props = {
  profile: Profile;
  demoMode: boolean;
  trophies?: ManagerTrophyMap;
  onUpdated: (updated: Profile) => void;
  onClose: () => void;
};

export default function ManagerProfileModal({
  profile,
  demoMode,
  trophies = {},
  onUpdated,
  onClose,
}: Props) {
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [teamName, setTeamName] = useState(profile.team_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url ?? null);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPwd, setUpdatingPwd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleFileSelect(file: File | undefined) {
    if (!file) return;
    setError('');
    setMsg('');

    if (demoMode || !supabase) {
      const localUrl = URL.createObjectURL(file);
      setAvatarUrl(localUrl);
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadManagerAvatar(supabase, profile.id, file);
      setAvatarUrl(publicUrl);
    } catch (e: any) {
      setError(e?.message ?? 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }

    if (demoMode || !supabase) {
      onUpdated({
        ...profile,
        display_name: trimmedName,
        team_name: teamName.trim() || null,
        avatar_url: avatarUrl,
      });
      setMsg(t('profileSavedNotice'));
      return;
    }

    setSaving(true);
    setError('');
    setMsg('');
    try {
      const { data, error: rpcError } = await supabase.rpc('update_my_manager_profile', {
        p_display_name: trimmedName,
        p_team_name: teamName.trim() || null,
        p_avatar_url: avatarUrl,
      });

      if (rpcError || !data) {
        setError(rpcError?.message ?? 'Could not update profile.');
      } else {
        const row = data as Record<string, any>;
        onUpdated({
          id: String(row.id),
          display_name: String(row.display_name),
          team_name: row.team_name ?? null,
          avatar_url: row.avatar_url ?? null,
          budget: Number(row.budget ?? profile.budget ?? 50),
          role: row.role,
          player_approval_status: row.player_approval_status,
        });
        setMsg(t('profileSavedNotice'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword() {
    if (demoMode || !supabase) return;
    if (newPassword.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setUpdatingPwd(true);
    setError('');
    setMsg('');
    try {
      const { error: pwdErr } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });
      if (pwdErr) {
        setError(pwdErr.message);
      } else {
        setNewPassword('');
        setMsg(t('passwordUpdatedNotice'));
      }
    } finally {
      setUpdatingPwd(false);
    }
  }

  const budgetVal = Number(profile.budget ?? 50);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-sheet-spring manager-profile-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-grabber" aria-hidden="true" />

        <div className="panel-heading modal-heading" style={{ marginBottom: 10 }}>
          <div>
            <h3>{t('myProfileTitle')}</h3>
            <p className="muted tiny" style={{ margin: '3px 0 0' }}>
              {t('myProfileSub')}
            </p>
          </div>
          <button type="button" className="secondary compact-btn" onClick={onClose}>
            <X size={14} /> {t('closeBtn')}
          </button>
        </div>

        <form onSubmit={handleSave} className="manager-profile-form">
          {/* AVATAR UPLOAD HERO */}
          <div className="manager-avatar-hero">
            <div className="manager-avatar-preview">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName || 'Manager'} />
              ) : (
                <span>{(displayName || 'M').slice(0, 1).toUpperCase()}</span>
              )}
            </div>

            <div className="manager-avatar-actions">
              <label className="primary compact-btn upload-label">
                <Camera size={14} />
                {uploading ? 'Uploading…' : t('uploadAvatarBtn')}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  disabled={uploading || saving}
                  onChange={ev => void handleFileSelect(ev.target.files?.[0])}
                />
              </label>

              {avatarUrl && (
                <button
                  type="button"
                  className="secondary compact-btn"
                  disabled={uploading || saving}
                  onClick={() => setAvatarUrl(null)}
                >
                  <Trash2 size={13} /> {t('removeAvatarBtn')}
                </button>
              )}
            </div>
          </div>

          {/* DISPLAY NAME & FANTASY CLUB NAME */}
          <div className="manager-fields-grid">
            <label>
              <span>{t('displayNameLabel')}</span>
              <input
                type="text"
                maxLength={40}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />
            </label>

            <label>
              <span>
                <Shield size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                {t('fantasyTeamNameLabel')}
              </span>
              <input
                type="text"
                maxLength={40}
                placeholder={t('fantasyTeamPlaceholder')}
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
              />
            </label>
          </div>

          {/* PERSONAL FPL GROWING BUDGET INFO */}
          <div className="manager-budget-banner">
            <div>
              <span>
                <Wallet size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 5 }} />
                {t('myGrowingBudgetLabel')}
              </span>
              <small className="muted tiny" style={{ display: 'block', marginTop: 2 }}>
                {t('priceRisesGrowBudgetHint')}
              </small>
            </div>
            <strong>£{budgetVal.toFixed(1)}m</strong>
          </div>

          {/* PERMANENT MANAGER TROPHY CABINET */}
          <div className="manager-trophy-cabinet">
            <span className="eyebrow">{t('trophyCabinetHeading')}</span>
            <div className="manager-trophy-pills">
              <div className="trophy-cabinet-tile">
                <Trophy size={16} style={{ color: 'var(--gold)' }} />
                <div>
                  <strong>{trophies[profile.id]?.cup_wins ?? 0}</strong>
                  <span>{t('trophyCupWins')}</span>
                </div>
              </div>
              <div className="trophy-cabinet-tile">
                <Crown size={16} style={{ color: 'var(--gold)' }} />
                <div>
                  <strong>{trophies[profile.id]?.gw_wins ?? 0}</strong>
                  <span>{t('trophyGwWins')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CHANGE PASSWORD (SELF-SERVICE) */}
          {!demoMode && (
            <div className="manager-password-box">
              <span>
                <KeyRound size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                {t('changePasswordHeading')}
              </span>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <input
                  type="password"
                  minLength={6}
                  placeholder={t('newPasswordPlaceholder')}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ flex: '1 1 180px' }}
                />
                <button
                  type="button"
                  className="secondary compact-btn"
                  disabled={updatingPwd || newPassword.trim().length < 6}
                  onClick={() => void handleUpdatePassword()}
                >
                  {updatingPwd ? '…' : t('updatePasswordBtn')}
                </button>
              </div>
            </div>
          )}

          {error && <div className="notice">{error}</div>}
          {msg && <div className="notice positive-notice">{msg}</div>}

          <div className="gw-confirm-actions" style={{ marginTop: 6 }}>
            <button type="button" className="secondary compact-btn" onClick={onClose}>
              {t('closeBtn')}
            </button>
            <button
              type="submit"
              className="primary compact-btn"
              disabled={saving || uploading}
            >
              {saving ? 'Saving…' : t('saveProfileBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
