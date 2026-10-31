import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  MessageCircle,
  Plus,
  Skull,
  Trash2,
  Vote,
} from 'lucide-react';
import type { ForfeitHistoryRecord, ForfeitsOverview } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { DEMO_FORFEITS } from '../lib/demoData';
import { openWhatsAppShare } from '../lib/shareCardCanvas';

type Props = {
  demoMode: boolean;
  isAdmin: boolean;
  currentUserId?: string;
};

export default function FantasyForfeitsSection({ demoMode, isAdmin, currentUserId }: Props) {
  const { t } = useLanguage();
  const [data, setData] = useState<ForfeitsOverview>(
    demoMode
      ? DEMO_FORFEITS
      : { active_poll: null, history: [], shame_leaderboard: [] }
  );
  const [loading, setLoading] = useState(!demoMode);
  const [errorMsg, setErrorMsg] = useState('');
  const [votingId, setVotingId] = useState<number | null>(null);
  const [customIdea, setCustomIdea] = useState('');
  const [proposing, setProposing] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const clubTitleOf = (teamName?: string | null, displayName?: string | null) =>
    teamName?.trim() || `${displayName || 'Manager'} FC`;

  const loadForfeits = useCallback(async () => {
    if (demoMode || !supabase) {
      setData(DEMO_FORFEITS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    const { data: res, error } = await supabase.rpc('get_forfeits_overview');
    if (error) {
      setErrorMsg(error.message);
    } else if (res) {
      setData(res as ForfeitsOverview);
    }
    setLoading(false);
  }, [demoMode]);

  useEffect(() => {
    void loadForfeits();
  }, [loadForfeits]);

  async function handleVote(optionId: number) {
    if (!data.active_poll) return;
    setErrorMsg('');

    if (demoMode || !supabase) {
      setData(prev => {
        if (!prev.active_poll) return prev;
        const prevVote = prev.active_poll.my_vote_option_id;
        if (prevVote === optionId) return prev;
        const nextTotal = prevVote == null ? prev.active_poll.total_votes + 1 : prev.active_poll.total_votes;
        const nextOptions = prev.active_poll.options.map(o => {
          let v = o.votes;
          if (o.id === prevVote) v = Math.max(0, v - 1);
          if (o.id === optionId) v += 1;
          return {
            ...o,
            votes: v,
            pct: nextTotal > 0 ? Math.round((v * 100) / nextTotal) : 0,
          };
        });
        return {
          ...prev,
          active_poll: {
            ...prev.active_poll,
            my_vote_option_id: optionId,
            total_votes: nextTotal,
            options: nextOptions,
          },
        };
      });
      return;
    }

    setVotingId(optionId);
    const { error } = await supabase.rpc('cast_gameweek_forfeit_vote', {
      p_gameweek_id: data.active_poll.gameweek_id,
      p_option_id: optionId,
    });
    setVotingId(null);

    if (error) {
      setErrorMsg(error.message);
      return;
    }
    await loadForfeits();
  }

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    if (!data.active_poll || !customIdea.trim()) return;
    setErrorMsg('');

    if (demoMode || !supabase) {
      const newId = Date.now();
      const text = customIdea.trim();
      setCustomIdea('');
      setData(prev => {
        if (!prev.active_poll) return prev;
        const prevVote = prev.active_poll.my_vote_option_id;
        const nextTotal = prevVote == null ? prev.active_poll.total_votes + 1 : prev.active_poll.total_votes;
        const adjusted = prev.active_poll.options.map(o => {
          const v = o.id === prevVote ? Math.max(0, o.votes - 1) : o.votes;
          return { ...o, votes: v, pct: nextTotal > 0 ? Math.round((v * 100) / nextTotal) : 0 };
        });
        return {
          ...prev,
          active_poll: {
            ...prev.active_poll,
            my_vote_option_id: newId,
            total_votes: nextTotal,
            options: [
              ...adjusted,
              {
                id: newId,
                label: text,
                proposed_by_id: 'demo-me',
                proposed_by_name: 'You',
                votes: 1,
                pct: nextTotal > 0 ? Math.round(100 / nextTotal) : 100,
              },
            ],
          },
        };
      });
      return;
    }

    setProposing(true);
    const { error } = await supabase.rpc('propose_gameweek_forfeit_option', {
      p_gameweek_id: data.active_poll.gameweek_id,
      p_label: customIdea.trim(),
    });
    setProposing(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setCustomIdea('');
    await loadForfeits();
  }

  async function handleDeleteOption(optionId: number) {
    if (demoMode || !supabase) {
      setData(prev => {
        if (!prev.active_poll) return prev;
        return {
          ...prev,
          active_poll: {
            ...prev.active_poll,
            options: prev.active_poll.options.filter(o => o.id !== optionId),
          },
        };
      });
      return;
    }

    const { error } = await supabase.rpc('admin_delete_forfeit_option', {
      p_option_id: optionId,
    });
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    await loadForfeits();
  }

  async function handleToggleCompleted(gwId: number, managerId: string) {
    const key = `${gwId}:${managerId}`;
    if (demoMode || !supabase) {
      setData(prev => ({
        ...prev,
        history: prev.history.map(h =>
          h.gameweek_id !== gwId
            ? h
            : {
                ...h,
                losers: h.losers.map(l =>
                  l.manager_id === managerId ? { ...l, completed: !l.completed } : l
                ),
              }
        ),
      }));
      return;
    }

    setTogglingKey(key);
    const { error } = await supabase.rpc('admin_toggle_forfeit_completed', {
      p_gameweek_id: gwId,
      p_manager_id: managerId,
    });
    setTogglingKey(null);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    await loadForfeits();
  }

  function handleShareWhatsAppRoast(record: ForfeitHistoryRecord) {
    const loserNames = record.losers
      .map(
        l =>
          `• *${clubTitleOf(l.team_name, l.display_name)}* (${l.display_name}) — ${l.points} ${t('ptsUnit')} ${
            l.completed ? '✅' : '⏳'
          }`
      )
      .join('\n');

    const text =
      `🎭 *El Khames El Momtaz — GW #${record.gameweek_number} Official Forfeit!*\n\n` +
      `📉 ${t('forfeitLowestScoreLabel')}: *${record.lowest_points} ${t('ptsUnit')}*\n` +
      `${loserNames}\n\n` +
      `⚖️ *Punishment:* ${record.forfeit_title}\n\n` +
      `👉 Wall of Shame: https://elkhameselmomtaz.vercel.app/`;

    openWhatsAppShare(text);
  }

  if (loading) {
    return <p className="muted">{t('loadingPoints')}</p>;
  }

  const poll = data.active_poll;
  const maxPollVotes = poll
    ? poll.options.reduce((mx, o) => Math.max(mx, o.votes), 0)
    : 0;

  return (
    <div className="forfeits-hub screen-stage">
      {errorMsg && <div className="notice">{errorMsg}</div>}

      {/* 1. WEEKLY FORFEIT VOTE + LIVE THURSDAY DANGER ZONE */}
      <div className="forfeit-poll-card" data-scroll-reveal>
        <div className="forfeit-poll-head">
          <div>
            <span className="eyebrow">
              <Vote size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 5 }} />
              {poll ? `GW #${poll.gameweek_number} · ${poll.status}` : t('tabForfeits')}
            </span>
            <h4>{t('forfeitVoteHeading')}</h4>
            <p className="muted tiny">{t('forfeitVoteSub')}</p>
          </div>
          {poll && (
            <span className="tag">
              {poll.total_votes} {t('forfeitTotalVotes')}
            </span>
          )}
        </div>

        {!poll ? (
          <p className="muted" style={{ margin: '10px 0 0' }}>
            {t('forfeitNoOpenGw')}
          </p>
        ) : (
          <>
            {/* Live Danger Zone when Thursday GW is Active */}
            {poll.live_danger_zone && poll.live_danger_zone.managers.length > 0 && (
              <div className="forfeit-danger-banner">
                <div className="forfeit-danger-title">
                  <Flame size={15} />
                  <strong>{t('forfeitDangerZoneTitle')}</strong>
                  <span className="forfeit-score-pill">
                    {poll.live_danger_zone.lowest_points} {t('ptsUnit')}
                  </span>
                </div>
                <div className="forfeit-danger-clubs">
                  {poll.live_danger_zone.managers.map(m => (
                    <div key={m.manager_id} className="forfeit-danger-club-chip">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.display_name} />
                      ) : (
                        <span className="mini-avatar-fallback">
                          {(m.display_name || '?').slice(0, 1)}
                        </span>
                      )}
                      <div>
                        <strong>{clubTitleOf(m.team_name, m.display_name)}</strong>
                        <small>{m.display_name}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form className="forfeit-suggest-form" onSubmit={e => void handlePropose(e)}>
              <input
                type="text"
                maxLength={160}
                placeholder={t('forfeitSuggestPlaceholder')}
                value={customIdea}
                onChange={e => setCustomIdea(e.target.value)}
              />
              <button
                type="submit"
                className="primary compact-btn"
                disabled={proposing || customIdea.trim().length < 3}
              >
                <Plus size={14} /> {t('forfeitSuggestBtn')}
              </button>
            </form>

            {poll.options.length === 0 ? (
              <div className="news-empty-box">{t('forfeitNoOptionsYet')}</div>
            ) : (
              <div className="forfeit-options-list">
                {poll.options.map((opt, idx) => {
                  const isMine = poll.my_vote_option_id === opt.id;
                  const isLeading = maxPollVotes > 0 && opt.votes === maxPollVotes && idx === 0;
                  const canRemove =
                    isAdmin ||
                    (Boolean(currentUserId) && opt.proposed_by_id === currentUserId);

                  return (
                    <div
                      key={opt.id}
                      className={`forfeit-option-row ${isMine ? 'is-voted' : ''} ${
                        isLeading ? 'is-leading' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="forfeit-option-btn"
                        disabled={votingId === opt.id}
                        onClick={() => void handleVote(opt.id)}
                      >
                        <span
                          className="forfeit-option-bar"
                          style={{ width: `${Math.max(0, Math.min(100, opt.pct))}%` }}
                          aria-hidden="true"
                        />
                        <div className="forfeit-option-content">
                          <div className="forfeit-option-text">
                            <strong>
                              {isLeading && (
                                <Crown
                                  size={13}
                                  style={{
                                    verticalAlign: 'middle',
                                    marginInlineEnd: 6,
                                    color: 'var(--gold)',
                                  }}
                                />
                              )}
                              {opt.label}
                            </strong>
                            {opt.proposed_by_name && (
                              <small className="forfeit-proposer-note">
                                {t('forfeitSuggestedBy')} {opt.proposed_by_name}
                              </small>
                            )}
                          </div>

                          <div className="forfeit-option-stats">
                            {isMine && (
                              <span className="forfeit-my-vote-chip">
                                <Check size={11} /> {t('forfeitYourVote')}
                              </span>
                            )}
                            <strong>{opt.pct}%</strong>
                            <small>({opt.votes})</small>
                          </div>
                        </div>
                      </button>

                      {canRemove && (
                        <button
                          type="button"
                          className="icon-btn forfeit-del-btn"
                          title="Remove option"
                          onClick={() => void handleDeleteOption(opt.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 2. SEASON WALL OF SHAME COUNTER */}
      {data.shame_leaderboard.length > 0 && (
        <div className="forfeit-shame-wall" data-scroll-reveal>
          <div className="lineup-heading" style={{ marginTop: 0 }}>
            <div>
              <strong>
                <Skull size={15} style={{ verticalAlign: 'text-bottom', marginInlineEnd: 6 }} />
                {t('forfeitShameWallTitle')}
              </strong>
              <p className="muted tiny" style={{ margin: '2px 0 0' }}>
                {t('forfeitShameWallSub')}
              </p>
            </div>
          </div>

          <div className="forfeit-shame-grid">
            {data.shame_leaderboard.map((row, idx) => (
              <div
                key={row.manager_id}
                className={`forfeit-shame-card hover-lift-card ${idx === 0 ? 'most-shamed' : ''}`}
              >
                <div className="forfeit-shame-head">
                  {row.avatar_url ? (
                    <img
                      className="leaderboard-photo"
                      src={row.avatar_url}
                      alt={row.display_name}
                    />
                  ) : (
                    <div className="player-photo small-photo">
                      {(row.display_name || '?').slice(0, 1)}
                    </div>
                  )}
                  <div className="forfeit-club-stack">
                    <strong>{clubTitleOf(row.team_name, row.display_name)}</strong>
                    <span>{row.display_name}</span>
                  </div>
                </div>

                <div className="forfeit-shame-pills">
                  <span className="shame-count-badge">
                    🤡 {row.losses_count}
                    {t('forfeitLossesSuffix')}
                  </span>
                  {row.pending_count > 0 && (
                    <span className="shame-pending-badge">
                      ⏳ {row.pending_count} {t('forfeitPendingCount')}
                    </span>
                  )}
                  {row.completed_count > 0 && (
                    <span className="shame-done-badge">
                      ✅ {row.completed_count} {t('forfeitDoneCount')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PERMANENT GAMEWEEK-BY-GAMEWEEK SAVED ARCHIVE */}
      <div className="forfeit-archive-section" data-scroll-reveal>
        <div className="lineup-heading" style={{ marginTop: 0 }}>
          <div>
            <strong>{t('forfeitArchiveTitle')}</strong>
            <p className="muted tiny" style={{ margin: '2px 0 0' }}>
              {t('forfeitArchiveSub')}
            </p>
          </div>
        </div>

        {data.history.length === 0 ? (
          <div className="news-empty-box">{t('forfeitNoHistoryYet')}</div>
        ) : (
          <div className="forfeit-history-list">
            {data.history.map(item => (
              <article key={item.gameweek_id} className="forfeit-history-card hover-lift-card">
                <div className="forfeit-history-top">
                  <div className="forfeit-history-badges">
                    <span className="tag">GW #{item.gameweek_number}</span>
                    <span className="forfeit-score-pill">
                      {t('forfeitLowestScoreLabel')}: {item.lowest_points} {t('ptsUnit')}
                    </span>
                    {item.losers.length > 1 && (
                      <span className="forfeit-tie-pill">
                        <AlertTriangle size={11} /> {t('forfeitCoLosersBadge')}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="secondary compact-btn"
                    onClick={() => handleShareWhatsAppRoast(item)}
                  >
                    <MessageCircle size={13} /> {t('forfeitShareRoastBtn')}
                  </button>
                </div>

                <div className="forfeit-punishment-banner">
                  <span>⚖️</span>
                  <strong>{item.forfeit_title}</strong>
                </div>

                <div className="forfeit-losers-grid">
                  {item.losers.map(loser => {
                    const key = `${item.gameweek_id}:${loser.manager_id}`;
                    return (
                      <div
                        key={loser.manager_id}
                        className={`forfeit-loser-row ${
                          loser.completed ? 'is-completed' : 'is-pending'
                        }`}
                      >
                        <div className="forfeit-loser-identity">
                          {loser.avatar_url ? (
                            <img
                              className="leaderboard-photo"
                              src={loser.avatar_url}
                              alt={loser.display_name}
                            />
                          ) : (
                            <div className="player-photo small-photo">
                              {(loser.display_name || '?').slice(0, 1)}
                            </div>
                          )}
                          <div className="forfeit-club-stack">
                            <strong>{clubTitleOf(loser.team_name, loser.display_name)}</strong>
                            <span>
                              {loser.display_name} · {loser.points} {t('ptsUnit')}
                            </span>
                          </div>
                        </div>

                        <div className="forfeit-loser-actions">
                          <span
                            className={`forfeit-status-pill ${
                              loser.completed ? 'status-done' : 'status-pending'
                            }`}
                          >
                            {loser.completed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            {loser.completed ? t('forfeitStatusDone') : t('forfeitStatusPending')}
                          </span>

                          {isAdmin && (
                            <button
                              type="button"
                              className={
                                loser.completed ? 'secondary compact-btn' : 'primary compact-btn'
                              }
                              disabled={togglingKey === key}
                              onClick={() =>
                                void handleToggleCompleted(item.gameweek_id, loser.manager_id)
                              }
                            >
                              {loser.completed ? t('forfeitUndoDoneBtn') : t('forfeitMarkDoneBtn')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
