import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Flame,
  Megaphone,
  Newspaper,
  Pin,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { LeagueNewsFeed, NewsCategory } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { DEMO_NEWS_FEED } from '../lib/demoData';

type LatestNewsSectionProps = {
  demoMode: boolean;
  isAdmin: boolean;
};

export default function LatestNewsSection({ demoMode, isAdmin }: LatestNewsSectionProps) {
  const { t, lang } = useLanguage();
  const [feed, setFeed] = useState<LeagueNewsFeed>(
    demoMode ? DEMO_NEWS_FEED : { bulletins: [], auto_wire: [] }
  );
  const [loading, setLoading] = useState(!demoMode);
  const [composerOpen, setComposerOpen] = useState(false);
  const [category, setCategory] = useState<NewsCategory>('announcement');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadFeed = useCallback(async () => {
    if (demoMode || !supabase) {
      setFeed(DEMO_NEWS_FEED);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('get_league_news_feed');
    if (!error && data) {
      setFeed(data as LeagueNewsFeed);
    }
    setLoading(false);
  }, [demoMode]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const categoryMeta = (cat: NewsCategory) => {
    switch (cat) {
      case 'injury':
        return { label: t('newsCatInjury'), cls: 'news-cat-injury', icon: <Activity size={13} /> };
      case 'matchday':
        return { label: t('newsCatMatchday'), cls: 'news-cat-matchday', icon: <Flame size={13} /> };
      case 'transfer':
        return {
          label: t('newsCatTransfer'),
          cls: 'news-cat-transfer',
          icon: <TrendingUp size={13} />,
        };
      default:
        return {
          label: t('newsCatAnnouncement'),
          cls: 'news-cat-announcement',
          icon: <Megaphone size={13} />,
        };
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Cairo',
      }).format(new Date(iso));
    } catch {
      return '';
    }
  };

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setErrorMsg('');

    if (demoMode || !supabase) {
      setFeed(prev => ({
        ...prev,
        bulletins: [
          {
            id: Date.now(),
            category,
            title: title.trim(),
            body: body.trim(),
            is_pinned: isPinned,
            author_name: 'Admin',
            created_at: new Date().toISOString(),
          },
          ...prev.bulletins,
        ],
      }));
      setTitle('');
      setBody('');
      setIsPinned(false);
      setComposerOpen(false);
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc('admin_post_news', {
      p_category: category,
      p_title: title.trim(),
      p_body: body.trim(),
      p_is_pinned: isPinned,
    });
    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setTitle('');
    setBody('');
    setIsPinned(false);
    setComposerOpen(false);
    await loadFeed();
  }

  async function handleTogglePin(id: number) {
    if (demoMode || !supabase) {
      setFeed(prev => ({
        ...prev,
        bulletins: prev.bulletins.map(b => (b.id === id ? { ...b, is_pinned: !b.is_pinned } : b)),
      }));
      return;
    }
    await supabase.rpc('admin_toggle_pin_news', { p_news_id: id });
    await loadFeed();
  }

  async function handleDelete(id: number) {
    if (demoMode || !supabase) {
      setFeed(prev => ({
        ...prev,
        bulletins: prev.bulletins.filter(b => b.id !== id),
      }));
      return;
    }
    await supabase.rpc('admin_delete_news', { p_news_id: id });
    await loadFeed();
  }

  return (
    <section
      className="panel newsroom-panel stagger-item"
      style={{ '--stagger-i': 4 } as React.CSSProperties}
    >
      <div className="panel-heading">
        <div>
          <h3>
            <Newspaper
              size={18}
              style={{ verticalAlign: 'text-bottom', marginInlineEnd: 8, color: 'var(--gold)' }}
            />
            {t('newsSectionTitle')}
          </h3>
          <p>{t('newsSectionSub')}</p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className={composerOpen ? 'secondary compact-btn' : 'primary compact-btn'}
            onClick={() => setComposerOpen(prev => !prev)}
          >
            {composerOpen ? (
              t('closeComposerBtn')
            ) : (
              <>
                <Plus size={14} /> {t('postNewsBtn').replace(/^\+\s*/, '')}
              </>
            )}
          </button>
        )}
      </div>

      {isAdmin && composerOpen && (
        <form className="news-composer-card spring-pop" onSubmit={e => void handlePublish(e)}>
          <div className="news-composer-cats">
            {(['announcement', 'matchday', 'injury', 'transfer'] as NewsCategory[]).map(cat => {
              const meta = categoryMeta(cat);
              return (
                <button
                  type="button"
                  key={cat}
                  className={category === cat ? 'primary compact-btn' : 'secondary compact-btn'}
                  onClick={() => setCategory(cat)}
                >
                  {meta.icon} {meta.label}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            className="news-composer-input"
            placeholder={t('newsTitlePlaceholder')}
            value={title}
            maxLength={120}
            onChange={e => setTitle(e.target.value)}
            required
          />

          <textarea
            className="news-composer-textarea"
            placeholder={t('newsBodyPlaceholder')}
            rows={3}
            maxLength={500}
            value={body}
            onChange={e => setBody(e.target.value)}
            required
          />

          {errorMsg && <div className="notice">{errorMsg}</div>}

          <div className="news-composer-footer">
            <label className="news-pin-toggle">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
              />
              <Pin size={13} />
              <span>{t('pinBulletinLabel')}</span>
            </label>

            <button
              type="submit"
              className="primary"
              disabled={saving || !title.trim() || !body.trim()}
            >
              {t('publishNewsBtn')}
            </button>
          </div>
        </form>
      )}

      <div className="newsroom-columns">
        {/* LEFT COLUMN: Official Clubhouse Bulletins */}
        <div className="newsroom-col">
          <div className="newsroom-col-header">
            <span className="eyebrow">{t('officialBulletinsHeading')}</span>
          </div>

          {loading ? (
            <p className="muted">{t('loadingPoints')}</p>
          ) : feed.bulletins.length === 0 ? (
            <div className="news-empty-box">{t('noBulletinsYet')}</div>
          ) : (
            <div className="news-bulletins-list">
              {feed.bulletins.map(item => {
                const meta = categoryMeta(item.category);
                return (
                  <article
                    key={item.id}
                    className={`news-bulletin-card hover-lift-card ${
                      item.is_pinned ? 'news-bulletin-pinned' : ''
                    }`}
                  >
                    <div className="news-bulletin-top">
                      <div className="news-badges-row">
                        <span className={`news-cat-pill ${meta.cls}`}>
                          {meta.icon} {meta.label}
                        </span>
                        {item.is_pinned && (
                          <span className="news-pinned-pill">
                            <Pin size={11} /> {t('pinnedTag')}
                          </span>
                        )}
                      </div>

                      <div className="news-meta-right">
                        <span className="news-timestamp">{formatDate(item.created_at)}</span>
                        {isAdmin && (
                          <div className="news-admin-btns">
                            <button
                              type="button"
                              className="icon-btn"
                              title={t('pinBulletinLabel')}
                              onClick={() => void handleTogglePin(item.id)}
                            >
                              <Pin
                                size={14}
                                color={item.is_pinned ? 'var(--gold)' : 'currentColor'}
                              />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Delete"
                              onClick={() => void handleDelete(item.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h4>{item.title}</h4>
                    <p>{item.body}</p>
                    <span className="news-author-byline">— {item.author_name}</span>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Auto-Generated League Wire */}
        <div className="newsroom-col">
          <div className="newsroom-col-header">
            <span className="eyebrow">
              <span className="status-dot" />
              {t('liveWireHeading')}
            </span>
          </div>

          <div className="news-wire-list">
            {feed.auto_wire.map(w => {
              const meta = categoryMeta(w.kind);
              return (
                <div key={w.key} className="news-wire-item hover-lift-card">
                  <div className={`news-wire-icon ${meta.cls}`}>{meta.icon}</div>
                  <div className="news-wire-copy">
                    <strong>{w.headline}</strong>
                    <p>{w.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
