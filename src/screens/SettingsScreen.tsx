import { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  Crown,
  Download,
  Globe,
  KeyRound,
  LogOut,
  Moon,
  RefreshCw,
  RotateCcw,
  Shield,
  Sliders,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  Wallet,
} from 'lucide-react';
import type { Profile, Screen } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import {
  APP_ICON_CATALOG,
  type AppIconMeta,
  type DefaultLandingScreen,
  type IconColorKey,
  type SplashPreference,
  type UiScaleMode,
  useAppSettings,
} from '../settings/AppSettingsContext';
import { supabase, uploadManagerAvatar } from '../lib/supabase';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Props = {
  profile: Profile | null;
  demoMode: boolean;
  isAdmin: boolean;
  onProfileUpdated: (updated: Profile) => void;
  onOpenTrophyModal: () => void;
  onRefreshLeagueData: () => void;
  onSignOutOrToggleDemo: () => void;
  onNavigate: (next: Screen) => void;
};

export default function SettingsScreen({
  profile,
  demoMode,
  isAdmin,
  onProfileUpdated,
  onOpenTrophyModal,
  onRefreshLeagueData,
  onSignOutOrToggleDemo,
}: Props) {
  const { lang, setLang, t } = useLanguage();
  const { isDark, setTheme } = useTheme();
  const {
    appIcon,
    activeIconMeta,
    setAppIcon,
    prefs,
    updatePref,
    resetAllSettings,
  } = useAppSettings();

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHomeGuide, setShowHomeGuide] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Account & Club inline editor state
  const effectiveProfile: Profile = profile ?? {
    id: 'demo-user',
    display_name: isAdmin ? 'Admin' : 'Player',
    team_name: 'El Khames XI',
    avatar_url: null,
    budget: 50,
    role: isAdmin ? 'admin_player' : 'player',
    player_approval_status: 'approved',
  };

  const [displayName, setDisplayName] = useState(effectiveProfile.display_name || '');
  const [teamName, setTeamName] = useState(effectiveProfile.team_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(effectiveProfile.avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPwd, setUpdatingPwd] = useState(false);
  const [accountNotice, setAccountNotice] = useState('');
  const [accountError, setAccountError] = useState('');

  useEffect(() => {
    setDisplayName(effectiveProfile.display_name || '');
    setTeamName(effectiveProfile.team_name ?? '');
    setAvatarUrl(effectiveProfile.avatar_url ?? null);
  }, [effectiveProfile.display_name, effectiveProfile.team_name, effectiveProfile.avatar_url]);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  function flashToast(msg: string) {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg(prev => (prev === msg ? '' : prev));
    }, 3200);
  }

  function colorLabel(colorKey: IconColorKey): string {
    switch (colorKey) {
      case 'green':
        return t('iconColorGreen');
      case 'white':
        return t('iconColorWhite');
      case 'silver':
        return t('iconColorSilver');
      case 'black':
        return t('iconColorBlack');
    }
  }

  async function handleAddToHomeScreen() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setShowHomeGuide(true);
  }

  async function handleAvatarUpload(file: File | undefined) {
    if (!file) return;
    setAccountError('');
    setAccountNotice('');
    if (demoMode || !supabase) {
      setAvatarUrl(URL.createObjectURL(file));
      return;
    }
    setUploadingAvatar(true);
    try {
      const publicUrl = await uploadManagerAvatar(supabase, effectiveProfile.id, file);
      setAvatarUrl(publicUrl);
    } catch (e: unknown) {
      setAccountError(e instanceof Error ? e.message : 'Could not upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveClubProfile(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = displayName.trim();
    const trimmedTeam = teamName.trim();
    if (trimmedName.length < 2) {
      setAccountError('Display name must be at least 2 characters.');
      return;
    }
    if (trimmedTeam.length < 2) {
      setAccountError(t('clubNameRequiredError'));
      return;
    }

    if (demoMode || !supabase) {
      onProfileUpdated({
        ...effectiveProfile,
        display_name: trimmedName,
        team_name: trimmedTeam,
        avatar_url: avatarUrl,
      });
      setAccountNotice(t('profileSavedNotice'));
      return;
    }

    setSavingProfile(true);
    setAccountError('');
    setAccountNotice('');
    try {
      const { data, error: rpcError } = await supabase.rpc('update_my_manager_profile', {
        p_display_name: trimmedName,
        p_team_name: trimmedTeam,
        p_avatar_url: avatarUrl,
      });
      if (rpcError || !data) {
        setAccountError(rpcError?.message ?? 'Could not update profile.');
      } else {
        const row = data as Record<string, unknown>;
        onProfileUpdated({
          id: String(row.id),
          display_name: String(row.display_name),
          team_name: (row.team_name as string | null) ?? null,
          avatar_url: (row.avatar_url as string | null) ?? null,
          budget: Number(row.budget ?? effectiveProfile.budget ?? 50),
          role: (row.role as Profile['role']) ?? effectiveProfile.role,
          player_approval_status:
            (row.player_approval_status as Profile['player_approval_status']) ??
            effectiveProfile.player_approval_status,
        });
        setAccountNotice(t('profileSavedNotice'));
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setAccountError(
        lang === 'ar'
          ? 'يجب أن تكون كلمة المرور ٦ أحرف على الأقل.'
          : 'Password must be at least 6 characters.'
      );
      return;
    }
    if (demoMode || !supabase) {
      setNewPassword('');
      setAccountNotice(t('passwordUpdatedNotice'));
      return;
    }
    setUpdatingPwd(true);
    setAccountError('');
    setAccountNotice('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setAccountError(error.message);
      } else {
        setNewPassword('');
        setAccountNotice(t('passwordUpdatedNotice'));
      }
    } finally {
      setUpdatingPwd(false);
    }
  }

  const arabicIcons = APP_ICON_CATALOG.filter(item => item.langGroup === 'ar');
  const englishIcons = APP_ICON_CATALOG.filter(item => item.langGroup === 'en');

  const landingOptions: { id: DefaultLandingScreen; label: string }[] = [
    { id: 'overview', label: t('navHome') },
    { id: 'squad', label: t('navSquad') },
    { id: 'players', label: t('navPlayers') },
    { id: 'matches', label: t('navMatches') },
    { id: 'leaderboard', label: t('navLeaderboard') },
  ];

  function renderIconTile(item: AppIconMeta) {
    const isSelected = appIcon === item.id;
    return (
      <button
        key={item.id}
        type="button"
        className={`settings-icon-tile ${isSelected ? 'is-selected' : ''}`}
        onClick={() => setAppIcon(item.id)}
        aria-pressed={isSelected}
      >
        <div className="settings-icon-squircle-wrap">
          <img
            src={item.svgPath}
            alt={`${item.homeLabel} — ${colorLabel(item.colorKey)}`}
            className="settings-icon-squircle-img"
          />
          {isSelected && (
            <span className="settings-icon-check-pill">
              <Check size={12} strokeWidth={3} />
            </span>
          )}
        </div>

        <div className="settings-icon-meta">
          <div className="settings-icon-title-row">
            <strong>{colorLabel(item.colorKey)}</strong>
            {item.isMain && <span className="settings-icon-main-tag">{t('iconMainBadge')}</span>}
          </div>
          <small>
            {isSelected
              ? t('iconActiveBadge')
              : item.langGroup === 'ar'
                ? 'الخميس الممتاز'
                : 'EL KHAMES'}
          </small>
        </div>
      </button>
    );
  }

  return (
    <div className="settings-studio-page">
      {toastMsg && (
        <div className="settings-floating-toast" role="status" aria-live="polite">
          <Sparkles size={15} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hero Banner */}
      <section className="panel settings-hero-banner stagger-item">
        <div className="settings-hero-left">
          <div className="settings-hero-active-icon">
            <img src={activeIconMeta.svgPath} alt={activeIconMeta.homeLabel} />
          </div>
          <div>
            <span className="eyebrow">{t('settingsHeroEyebrow')}</span>
            <h2>{t('settingsHeroTitle')}</h2>
            <p>{t('settingsHeroSub')}</p>
          </div>
        </div>
      </section>

      {/* 1. Home Screen & App Icon Picker (4 Arabic + 4 English) */}
      <section className="panel settings-section stagger-item">
        <div className="settings-section-head">
          <div className="settings-section-icon">
            <Smartphone size={18} />
          </div>
          <div>
            <h3>{t('settingsHomeIconTitle')}</h3>
            <p>{t('settingsHomeIconSub')}</p>
          </div>
        </div>

        <div className="settings-icon-studio-layout">
          <div className="settings-icon-groups">
            <div className="settings-icon-group">
              <div className="settings-group-label">{t('settingsArabicIconsHeading')}</div>
              <div className="settings-icon-grid">{arabicIcons.map(renderIconTile)}</div>
            </div>

            <div className="settings-icon-group">
              <div className="settings-group-label">{t('settingsEnglishIconsHeading')}</div>
              <div className="settings-icon-grid">{englishIcons.map(renderIconTile)}</div>
            </div>
          </div>

          {/* Live Phone Home Screen Preview Mockup */}
          <aside className="settings-phone-mockup-card">
            <span className="eyebrow">{t('settingsPhonePreviewLabel')}</span>
            <div className="phone-homescreen-frame">
              <div className="phone-status-bar">
                <span>9:41</span>
                <span className="phone-dynamic-island" />
                <span>5G · 100%</span>
              </div>

              <div className="phone-apps-grid">
                <div className="phone-dummy-app">
                  <div className="phone-dummy-squircle" />
                  <span />
                </div>
                <div className="phone-selected-app">
                  <div className="phone-selected-squircle">
                    <img src={activeIconMeta.svgPath} alt={activeIconMeta.homeLabel} />
                  </div>
                  <strong>{activeIconMeta.homeLabel}</strong>
                </div>
                <div className="phone-dummy-app">
                  <div className="phone-dummy-squircle" />
                  <span />
                </div>
                <div className="phone-dummy-app">
                  <div className="phone-dummy-squircle" />
                  <span />
                </div>
              </div>

              <div className="phone-glass-dock">
                <div className="phone-dummy-squircle small" />
                <div className="phone-selected-squircle small">
                  <img src={activeIconMeta.svgPath} alt={activeIconMeta.homeLabel} />
                </div>
                <div className="phone-dummy-squircle small" />
              </div>
            </div>

            <p className="settings-phone-hint">{t('settingsPhonePreviewHint')}</p>

            <div className="settings-phone-actions">
              <button
                type="button"
                className="primary compact-btn full"
                onClick={() => void handleAddToHomeScreen()}
              >
                <Smartphone size={15} />
                <span>{t('settingsAddHomeBtn')}</span>
              </button>

              <a
                href={activeIconMeta.png512Path}
                download={`el-khames-icon-${appIcon}.png`}
                className="secondary compact-btn full settings-download-link"
              >
                <Download size={14} />
                <span>{t('settingsDownloadIconBtn')}</span>
              </a>

              <button
                type="button"
                className="ghost-link-btn"
                onClick={() => setShowHomeGuide(prev => !prev)}
              >
                {t('settingsHomeGuideBtn')}
              </button>
            </div>

            {showHomeGuide && (
              <div className="settings-home-guide-box">
                <div>
                  <strong>{t('settingsHomeGuideIosTitle')}</strong>
                  <p>{t('settingsHomeGuideIosSteps')}</p>
                </div>
                <div>
                  <strong>{t('settingsHomeGuideAndroidTitle')}</strong>
                  <p>{t('settingsHomeGuideAndroidSteps')}</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* 2. Appearance, Language & Display */}
      <section className="panel settings-section stagger-item">
        <div className="settings-section-head">
          <div className="settings-section-icon">
            <Sun size={18} />
          </div>
          <div>
            <h3>{t('settingsAppearanceTitle')}</h3>
            <p>{t('settingsAppearanceSub')}</p>
          </div>
        </div>

        <div className="settings-two-col">
          {/* Theme Picker */}
          <div className="settings-control-block">
            <span className="settings-block-label">{t('settingsThemeLabel')}</span>
            <div className="settings-choice-cards">
              <button
                type="button"
                className={`settings-choice-card ${!isDark ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun size={18} />
                <div>
                  <strong>{t('daylightMode')}</strong>
                  <small>{t('settingsThemeLightDesc')}</small>
                </div>
              </button>

              <button
                type="button"
                className={`settings-choice-card ${isDark ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon size={18} />
                <div>
                  <strong>{t('floodlightMode')}</strong>
                  <small>{t('settingsThemeDarkDesc')}</small>
                </div>
              </button>
            </div>
          </div>

          {/* Language Picker */}
          <div className="settings-control-block">
            <span className="settings-block-label">{t('settingsLanguageLabel')}</span>
            <div className="settings-choice-cards">
              <button
                type="button"
                className={`settings-choice-card ${lang === 'ar' ? 'active' : ''}`}
                onClick={() => setLang('ar')}
              >
                <Globe size={18} />
                <div>
                  <strong>العربية (RTL)</strong>
                  <small>واجهة عربية كاملة · الخميس الممتاز</small>
                </div>
              </button>

              <button
                type="button"
                className={`settings-choice-card ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
              >
                <Globe size={18} />
                <div>
                  <strong>English (LTR)</strong>
                  <small>Full English interface · El Khames El Momtaz</small>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="settings-two-col" style={{ marginTop: 14 }}>
          {/* UI Scale */}
          <div className="settings-control-block">
            <span className="settings-block-label">{t('settingsScaleLabel')}</span>
            <div className="settings-segmented">
              {(
                [
                  { id: 'compact', label: t('settingsScaleCompact') },
                  { id: 'standard', label: t('settingsScaleStandard') },
                  { id: 'comfortable', label: t('settingsScaleComfortable') },
                ] as { id: UiScaleMode; label: string }[]
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={prefs.uiScale === opt.id ? 'active' : ''}
                  onClick={() => updatePref('uiScale', opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Boot Splash Mode */}
          <div className="settings-control-block">
            <span className="settings-block-label">{t('settingsSplashLabel')}</span>
            <div className="settings-segmented">
              {(
                [
                  { id: 'auto', label: t('settingsSplashAuto') },
                  { id: 'fast', label: t('settingsSplashFast') },
                ] as { id: SplashPreference; label: string }[]
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={prefs.splashMode === opt.id ? 'active' : ''}
                  onClick={() => updatePref('splashMode', opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <div>
              <strong>{t('settingsCelebrationsTitle')}</strong>
              <p>{t('settingsCelebrationsDesc')}</p>
            </div>
            <input
              type="checkbox"
              className="settings-switch"
              checked={prefs.celebrationsEnabled}
              onChange={e => updatePref('celebrationsEnabled', e.target.checked)}
            />
          </label>

          <label className="settings-toggle-row">
            <div>
              <strong>{t('settingsReduceMotionTitle')}</strong>
              <p>{t('settingsReduceMotionDesc')}</p>
            </div>
            <input
              type="checkbox"
              className="settings-switch"
              checked={prefs.reduceMotion}
              onChange={e => updatePref('reduceMotion', e.target.checked)}
            />
          </label>
        </div>
      </section>

      {/* 3. Fantasy & Matchday Preferences */}
      <section className="panel settings-section stagger-item">
        <div className="settings-section-head">
          <div className="settings-section-icon">
            <Sliders size={18} />
          </div>
          <div>
            <h3>{t('settingsGameplayTitle')}</h3>
            <p>{t('settingsGameplaySub')}</p>
          </div>
        </div>

        <div className="settings-control-block" style={{ marginBottom: 14 }}>
          <span className="settings-block-label">{t('settingsDefaultScreenLabel')}</span>
          <div className="settings-segmented wrap-mobile">
            {landingOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={prefs.defaultScreen === opt.id ? 'active' : ''}
                onClick={() => updatePref('defaultScreen', opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <div>
              <strong>{t('settingsConfirmHitsTitle')}</strong>
              <p>{t('settingsConfirmHitsDesc')}</p>
            </div>
            <input
              type="checkbox"
              className="settings-switch"
              checked={prefs.confirmPointHits}
              onChange={e => updatePref('confirmPointHits', e.target.checked)}
            />
          </label>

          <label className="settings-toggle-row">
            <div>
              <strong>{t('settingsDeadlineAlertsTitle')}</strong>
              <p>{t('settingsDeadlineAlertsDesc')}</p>
            </div>
            <input
              type="checkbox"
              className="settings-switch"
              checked={prefs.deadlineAlerts}
              onChange={e => updatePref('deadlineAlerts', e.target.checked)}
            />
          </label>

          <label className="settings-toggle-row">
            <div>
              <strong>{t('settingsHapticsTitle')}</strong>
              <p>{t('settingsHapticsDesc')}</p>
            </div>
            <input
              type="checkbox"
              className="settings-switch"
              checked={prefs.hapticsEnabled}
              onChange={e => updatePref('hapticsEnabled', e.target.checked)}
            />
          </label>
        </div>
      </section>

      {/* 4. Account, Fantasy Club & Security */}
      <section className="panel settings-section stagger-item">
        <div className="settings-section-head">
          <div className="settings-section-icon">
            <Shield size={18} />
          </div>
          <div>
            <h3>{t('settingsAccountTitle')}</h3>
            <p>{t('settingsAccountSub')}</p>
          </div>
        </div>

        <div className="settings-club-summary-bar">
          <div className="settings-club-avatar-box">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              <span>{(displayName || 'M').slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="settings-club-summary-meta">
            <strong>{teamName || t('fantasyTeamPlaceholder')}</strong>
            <span>
              <Wallet size={13} /> £{(effectiveProfile.budget ?? 50).toFixed(1)}m ·{' '}
              <Crown size={13} />{' '}
              {effectiveProfile.role === 'admin_player' ? t('roleAdminTitle') : t('rolePlayerTitle')}
            </span>
          </div>
          <div className="settings-club-avatar-btns">
            <label className="secondary compact-btn" style={{ cursor: 'pointer' }}>
              <Camera size={14} />
              <span>{uploadingAvatar ? '…' : t('uploadAvatarBtn')}</span>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                disabled={uploadingAvatar}
                onChange={e => void handleAvatarUpload(e.target.files?.[0])}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                className="secondary compact-btn"
                onClick={() => setAvatarUrl(null)}
                title={t('removeAvatarBtn')}
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="button"
              className="secondary compact-btn"
              onClick={onOpenTrophyModal}
            >
              <Trophy size={14} />
              <span>{t('settingsOpenTrophyModalBtn')}</span>
            </button>
          </div>
        </div>

        {accountError && (
          <div className="notice error" style={{ marginBottom: 12 }}>
            {accountError}
          </div>
        )}
        {accountNotice && (
          <div className="notice" style={{ marginBottom: 12 }}>
            {accountNotice}
          </div>
        )}

        <div className="settings-two-col">
          <form onSubmit={handleSaveClubProfile} className="settings-inline-form">
            <label>
              {t('displayNameLabel')} *
              <input
                required
                minLength={2}
                maxLength={40}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </label>

            <label>
              {t('fantasyTeamNameLabel')} *
              <input
                required
                minLength={2}
                maxLength={40}
                value={teamName}
                placeholder={t('fantasyTeamPlaceholder')}
                onChange={e => setTeamName(e.target.value)}
              />
            </label>

            <button type="submit" className="primary compact-btn" disabled={savingProfile}>
              {savingProfile ? '…' : t('saveProfileBtn')}
            </button>
          </form>

          <form onSubmit={handleChangePassword} className="settings-inline-form">
            <label>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <KeyRound size={13} /> {t('changePasswordHeading')}
              </span>
              <input
                type="password"
                minLength={6}
                placeholder={t('newPasswordPlaceholder')}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </label>

            <button
              type="submit"
              className="secondary compact-btn"
              disabled={updatingPwd || newPassword.length < 6}
              style={{ marginTop: 'auto' }}
            >
              {updatingPwd ? '…' : t('updatePasswordBtn')}
            </button>
          </form>
        </div>
      </section>

      {/* 5. Data Sync & Reset */}
      <section className="panel settings-section stagger-item">
        <div className="settings-section-head">
          <div className="settings-section-icon">
            <RefreshCw size={18} />
          </div>
          <div>
            <h3>{t('settingsSystemTitle')}</h3>
            <p>{t('settingsSystemSub')}</p>
          </div>
        </div>

        <div className="settings-system-actions">
          <button
            type="button"
            className="secondary compact-btn"
            onClick={() => {
              onRefreshLeagueData();
              flashToast(t('settingsRefreshDoneToast'));
            }}
          >
            <RefreshCw size={14} />
            <span>{t('settingsRefreshDataBtn')}</span>
          </button>

          <button
            type="button"
            className="secondary compact-btn"
            onClick={() => {
              try {
                localStorage.removeItem('elkhames_pwa_banner_dismissed_v1');
              } catch {
                // ignore
              }
              flashToast(t('settingsRestoreInstallToast'));
            }}
          >
            <Smartphone size={14} />
            <span>{t('settingsRestoreInstallBtn')}</span>
          </button>

          <button
            type="button"
            className="secondary compact-btn"
            onClick={() => {
              resetAllSettings();
              flashToast(t('settingsResetDoneToast'));
            }}
          >
            <RotateCcw size={14} />
            <span>{t('settingsResetDefaultsBtn')}</span>
          </button>

          <button
            type="button"
            className="secondary compact-btn danger-outline-btn"
            onClick={onSignOutOrToggleDemo}
          >
            <LogOut size={14} />
            <span>{demoMode ? t('switchPreviewRole') : t('signOut')}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
