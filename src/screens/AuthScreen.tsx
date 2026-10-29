import React, { useState } from 'react';
import { Globe, KeyRound, Moon, Sun, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

export default function AuthScreen() {
  const { lang, toggleLang, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || submitting) return;
    setMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setMessage(lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter your email.');
      return;
    }

    if (mode === 'forgot') {
      setSubmitting(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        });
        if (error) {
          setMessage(error.message);
        } else {
          setMessage(t('resetEmailSentNotice'));
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (password.length < 6) {
      setMessage(
        lang === 'ar'
          ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const cleanName = displayName.trim();
        const cleanTeam = teamName.trim();
        if (!cleanName || cleanName.length < 2) {
          setMessage(lang === 'ar' ? 'يرجى كتابة اسمك.' : 'Please enter your name.');
          return;
        }
        if (cleanTeam.length < 2) {
          setMessage(t('clubNameRequiredError'));
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { display_name: cleanName, team_name: cleanTeam } },
        });
        if (error) {
          setMessage(error.message);
          return;
        }
        if (!data.session) {
          // Auto-sign-in right away since email autoconfirm is enabled
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (signInErr) {
            setMessage(t('registrationSuccess'));
          }
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          setMessage(
            lang === 'ar'
              ? 'بيانات الدخول غير صحيحة. إذا كنت جديداً، اضغط "إنشاء حساب جديد" بالأعلى أولاً.'
              : 'Wrong email or password. New here? Tap "Join League" above to create your account first.'
          );
        } else {
          setMessage(error.message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-lang-bar">
        <button type="button" className="floodlight-toggle-btn compact-btn" onClick={toggleTheme}>
          <span className="theme-icon-wrap" key={isDark ? 'sun' : 'moon'}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </span>
          {isDark ? t('daylightMode') : t('floodlightMode')}
        </button>

        <button type="button" className="secondary compact-btn lang-btn" onClick={toggleLang}>
          <Globe size={14} />
          {t('langSwitchLabel')}
        </button>
      </div>

      <div className="brand stagger-item" style={{ '--stagger-i': 0 } as React.CSSProperties}>
        <div className="brand-mark">⚽</div>
        <div>
          <span className="eyebrow">{t('brandEyebrow')}</span>
          <h1>
            {t('brandTitleMain')} <em>{t('brandTitleAccent')}</em>
          </h1>
        </div>
      </div>

      <section
        className="auth-card stagger-item"
        style={{ '--stagger-i': 1 } as React.CSSProperties}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            className={mode === 'signin' ? 'primary compact-btn' : 'secondary compact-btn'}
            onClick={() => {
              setMode('signin');
              setMessage('');
            }}
          >
            <LogIn size={14} />
            {t('signInBtn')}
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'primary compact-btn' : 'secondary compact-btn'}
            onClick={() => {
              setMode('signup');
              setMessage('');
            }}
          >
            <UserPlus size={14} />
            {lang === 'ar' ? 'إنشاء حساب جديد' : 'Join League'}
          </button>
        </div>

        <div className="panel-heading">
          <div>
            <h3>
              {mode === 'forgot'
                ? t('forgotPasswordTitle')
                : mode === 'signin'
                  ? t('welcomeBack')
                  : t('joinLeague')}
            </h3>
            <p>
              {mode === 'forgot'
                ? t('forgotPasswordSub')
                : mode === 'signin'
                  ? t('signInSub')
                  : t('signUpSub')}
            </p>
          </div>
        </div>

        <form onSubmit={submit} key={mode} className="screen-stage">
          {mode === 'signup' && (
            <>
              <label>
                {t('fantasyTeamNameLabel')} *
                <input
                  required
                  minLength={2}
                  maxLength={40}
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder={t('fantasyTeamPlaceholder')}
                />
              </label>
              <label>
                {t('yourName')} *
                <input
                  required
                  minLength={2}
                  maxLength={40}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Ahmed"
                  autoComplete="name"
                />
              </label>
            </>
          )}
          <label>
            {t('email')}
            <input
              type="email"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          {mode !== 'forgot' && (
            <label>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{t('password')}</span>
                {mode === 'signin' && (
                  <button
                    type="button"
                    className="text-button"
                    style={{ fontSize: 12, padding: 0 }}
                    onClick={() => {
                      setMode('forgot');
                      setMessage('');
                    }}
                  >
                    {t('forgotPasswordBtn')}
                  </button>
                )}
              </span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </label>
          )}
          <button className="primary full" type="submit" disabled={submitting}>
            {mode === 'forgot' ? (
              <>
                <KeyRound size={14} /> {t('sendResetLinkBtn')}
              </>
            ) : mode === 'signin' ? (
              t('signInBtn')
            ) : (
              t('signUpBtn')
            )}
          </button>
        </form>

        {message && <div className="notice inline-notice">{message}</div>}

        <button
          type="button"
          className="text-button full"
          onClick={() => {
            setMode(mode === 'forgot' ? 'signin' : mode === 'signin' ? 'signup' : 'signin');
            setMessage('');
          }}
        >
          {mode === 'forgot'
            ? t('backToSignInBtn')
            : mode === 'signin'
              ? t('toggleToSignUp')
              : t('toggleToSignIn')}
        </button>
        <p className="tiny muted center">{t('privateCairoNote')}</p>
      </section>
    </div>
  );
}
