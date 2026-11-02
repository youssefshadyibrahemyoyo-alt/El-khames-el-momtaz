import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Film,
  Flag,
  Flame,
  Maximize2,
  MessageCircle,
  MessageSquare,
  Mic,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Skull,
  Sparkles,
  Trash2,
  Tv,
  Vote,
  X,
} from 'lucide-react';
import type {
  ForfeitHistoryRecord,
  ForfeitMediaType,
  ForfeitReactionKey,
  ForfeitSocialEntry,
  ForfeitsOverview,
  RecordedForfeitClip,
} from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase, uploadForfeitMedia } from '../lib/supabase';
import { DEMO_FORFEITS } from '../lib/demoData';
import { openWhatsAppShare } from '../lib/shareCardCanvas';
import ForfeitMediaRecorderModal, {
  type ForfeitMediaSubmission,
  type ForfeitModalTarget,
} from './ForfeitMediaRecorderModal';
import ForfeitWheelDrawer from './ForfeitWheelDrawer';
import ForfeitTheaterModal, { type CinemaReelItem } from './ForfeitTheaterModal';

type Props = {
  demoMode: boolean;
  isAdmin: boolean;
  currentUserId?: string;
};

type ArchiveFilter = 'all' | 'proof' | 'pending';

const EMOJI_REACTIONS: { key: ForfeitReactionKey; emoji: string }[] = [
  { key: 'laugh', emoji: '😂' },
  { key: 'skull', emoji: '💀' },
  { key: 'fire', emoji: '🔥' },
  { key: 'clown', emoji: '🤡' },
  { key: 'salute', emoji: '🫡' },
];

function emptySocial(): ForfeitSocialEntry {
  return {
    counts: {
      laugh: 0,
      skull: 0,
      fire: 0,
      clown: 0,
      salute: 0,
      var_valid: 0,
      var_redo: 0,
    },
    my_reactions: [],
    comments: [],
  };
}

export default function FantasyForfeitsSection({ demoMode, isAdmin, currentUserId }: Props) {
  const { t } = useLanguage();
  const [data, setData] = useState<ForfeitsOverview>(
    demoMode
      ? DEMO_FORFEITS
      : {
          active_poll: null,
          history: [],
          recorded_clips: [],
          managers: [],
          shame_leaderboard: [],
          social_by_target: {},
        }
  );
  const [loading, setLoading] = useState(!demoMode);
  const [errorMsg, setErrorMsg] = useState('');
  const [votingId, setVotingId] = useState<number | null>(null);
  const [customIdea, setCustomIdea] = useState('');
  const [proposing, setProposing] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Interactive flagship state
  const [showWheel, setShowWheel] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('all');
  const [selectedManagerIdFilter, setSelectedManagerIdFilter] = useState<string | null>(null);
  const [openCommentsMap, setOpenCommentsMap] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postingCommentKey, setPostingCommentKey] = useState<string | null>(null);
  const [theaterIndex, setTheaterIndex] = useState<number | null>(null);

  // Record / Upload studio modal state
  const [modalTarget, setModalTarget] = useState<ForfeitModalTarget | null>(null);
  const [savingMedia, setSavingMedia] = useState(false);

  const clubTitleOf = useCallback(
    (teamName?: string | null, displayName?: string | null) =>
      teamName?.trim() || `${displayName || 'Manager'} FC`,
    []
  );

  const loadForfeits = useCallback(async () => {
    if (demoMode || !supabase) {
      setData(prev =>
        prev.history.length || (prev.recorded_clips?.length ?? 0) ? prev : DEMO_FORFEITS
      );
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

  const socialMap = data.social_by_target || {};

  // Build unified Cinema Reels array from all saved proofs (recorded clips + GW losers with proof)
  const cinemaReels = useMemo<CinemaReelItem[]>(() => {
    const items: CinemaReelItem[] = [];
    for (const clip of data.recorded_clips || []) {
      if (!clip.proof_url) continue;
      items.push({
        targetKey: `clip:${clip.id}`,
        gwNumber: clip.gameweek_number ?? null,
        clubName: clubTitleOf(clip.team_name, clip.display_name),
        managerName: clip.display_name,
        avatarUrl: clip.avatar_url,
        forfeitTitle: clip.forfeit_title,
        mediaUrl: clip.proof_url,
        mediaType: clip.proof_media_type || 'video',
        caption: clip.proof_caption,
        uploadedByName: clip.uploaded_by_name,
        dateLabel: new Date(clip.created_at).toLocaleDateString(),
      });
    }
    for (const gw of data.history) {
      for (const l of gw.losers) {
        if (!l.proof_url) continue;
        items.push({
          targetKey: `gw:${gw.gameweek_id}:${l.manager_id}`,
          gwNumber: gw.gameweek_number,
          clubName: clubTitleOf(l.team_name, l.display_name),
          managerName: l.display_name,
          avatarUrl: l.avatar_url,
          forfeitTitle: gw.forfeit_title,
          mediaUrl: l.proof_url,
          mediaType: l.proof_media_type || 'video',
          caption: l.proof_caption,
          uploadedByName: l.proof_uploaded_by_name,
          dateLabel: `GW #${gw.gameweek_number}`,
        });
      }
    }
    return items;
  }, [clubTitleOf, data.history, data.recorded_clips]);

  // Hero stats
  const heroStats = useMemo(() => {
    let pendingCnt = 0;
    for (const gw of data.history) {
      for (const l of gw.losers) {
        if (!l.completed) pendingCnt += 1;
      }
    }
    let totalReactions = 0;
    for (const s of Object.values(socialMap)) {
      totalReactions +=
        (s.counts.laugh || 0) +
        (s.counts.skull || 0) +
        (s.counts.fire || 0) +
        (s.counts.clown || 0) +
        (s.counts.salute || 0) +
        (s.counts.var_valid || 0) +
        (s.counts.var_redo || 0);
    }
    return {
      archivedGws: data.history.length,
      savedProofs: cinemaReels.length,
      pendingDebts: pendingCnt,
      totalReactions,
    };
  }, [cinemaReels.length, data.history, socialMap]);

  async function handleVote(optionId: number) {
    if (!data.active_poll) return;
    setErrorMsg('');

    if (demoMode || !supabase) {
      setData(prev => {
        if (!prev.active_poll) return prev;
        const prevVote = prev.active_poll.my_vote_option_id;
        if (prevVote === optionId) return prev;
        const nextTotal =
          prevVote == null ? prev.active_poll.total_votes + 1 : prev.active_poll.total_votes;
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
        const nextTotal =
          prevVote == null ? prev.active_poll.total_votes + 1 : prev.active_poll.total_votes;
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

  // Optimistic toggle reaction or VAR verdict
  async function handleToggleReaction(targetKey: string, reaction: ForfeitReactionKey) {
    setData(prev => {
      const existing = prev.social_by_target?.[targetKey] || emptySocial();
      const hasIt = existing.my_reactions.includes(reaction);
      let nextMine = hasIt
        ? existing.my_reactions.filter(r => r !== reaction)
        : [...existing.my_reactions, reaction];
      const nextCounts = { ...existing.counts };
      nextCounts[reaction] = Math.max(0, (nextCounts[reaction] || 0) + (hasIt ? -1 : 1));

      if (!hasIt && reaction === 'var_valid' && nextMine.includes('var_redo')) {
        nextMine = nextMine.filter(r => r !== 'var_redo');
        nextCounts.var_redo = Math.max(0, (nextCounts.var_redo || 0) - 1);
      } else if (!hasIt && reaction === 'var_redo' && nextMine.includes('var_valid')) {
        nextMine = nextMine.filter(r => r !== 'var_valid');
        nextCounts.var_valid = Math.max(0, (nextCounts.var_valid || 0) - 1);
      }

      return {
        ...prev,
        social_by_target: {
          ...(prev.social_by_target || {}),
          [targetKey]: {
            ...existing,
            counts: nextCounts,
            my_reactions: nextMine,
          },
        },
      };
    });

    if (demoMode || !supabase) return;

    const { error } = await supabase.rpc('toggle_forfeit_reaction', {
      p_target_key: targetKey,
      p_reaction: reaction,
    });
    if (error) {
      setErrorMsg(error.message);
      await loadForfeits();
    }
  }

  async function handlePostComment(e: React.FormEvent, targetKey: string) {
    e.preventDefault();
    const text = (commentDrafts[targetKey] || '').trim();
    if (!text) return;

    setCommentDrafts(prev => ({ ...prev, [targetKey]: '' }));

    if (demoMode || !supabase) {
      setData(prev => {
        const existing = prev.social_by_target?.[targetKey] || emptySocial();
        return {
          ...prev,
          social_by_target: {
            ...(prev.social_by_target || {}),
            [targetKey]: {
              ...existing,
              comments: [
                ...existing.comments,
                {
                  id: Date.now(),
                  user_id: currentUserId || 'demo-me',
                  display_name: 'You',
                  team_name: 'Your XI',
                  avatar_url: null,
                  body: text,
                  created_at: new Date().toISOString(),
                },
              ],
            },
          },
        };
      });
      return;
    }

    setPostingCommentKey(targetKey);
    const { error } = await supabase.rpc('add_forfeit_comment', {
      p_target_key: targetKey,
      p_body: text,
    });
    setPostingCommentKey(null);

    if (error) {
      setErrorMsg(error.message);
      return;
    }
    await loadForfeits();
  }

  async function handleDeleteComment(targetKey: string, commentId: number) {
    if (demoMode || !supabase) {
      setData(prev => {
        const existing = prev.social_by_target?.[targetKey] || emptySocial();
        return {
          ...prev,
          social_by_target: {
            ...(prev.social_by_target || {}),
            [targetKey]: {
              ...existing,
              comments: existing.comments.filter(c => c.id !== commentId),
            },
          },
        };
      });
      return;
    }

    const { error } = await supabase.rpc('delete_forfeit_comment', {
      p_comment_id: commentId,
    });
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    await loadForfeits();
  }

  async function handleSaveMedia(payload: ForfeitMediaSubmission) {
    if (!modalTarget) return;
    setSavingMedia(true);
    setErrorMsg('');

    try {
      if (demoMode || !supabase) {
        const localUrl = URL.createObjectURL(payload.blob);
        if (modalTarget.kind === 'gw_loser') {
          setData(prev => ({
            ...prev,
            history: prev.history.map(h =>
              h.gameweek_id !== modalTarget.gameweekId
                ? h
                : {
                    ...h,
                    losers: h.losers.map(l =>
                      l.manager_id !== modalTarget.managerId
                        ? l
                        : {
                            ...l,
                            completed: true,
                            completed_at: new Date().toISOString(),
                            proof_url: localUrl,
                            proof_media_type: payload.mediaType,
                            proof_caption: payload.caption || null,
                            proof_uploaded_by_name: 'You',
                            proof_uploaded_at: new Date().toISOString(),
                          }
                    ),
                  }
            ),
          }));
        } else {
          const mgr =
            (data.managers || []).find(m => m.manager_id === payload.managerId) || {
              manager_id: payload.managerId || 'demo-1',
              display_name: 'Manager',
              team_name: 'Thursday FC',
              avatar_url: null,
            };
          const newClip: RecordedForfeitClip = {
            id: Date.now(),
            gameweek_number: payload.gameweekNumber ?? null,
            manager_id: mgr.manager_id,
            display_name: mgr.display_name,
            team_name: mgr.team_name,
            avatar_url: mgr.avatar_url,
            forfeit_title: payload.forfeitTitle || 'Thursday Forfeit',
            proof_url: localUrl,
            proof_media_type: payload.mediaType,
            proof_caption: payload.caption || null,
            uploaded_by_name: 'You',
            created_at: new Date().toISOString(),
          };
          setData(prev => ({
            ...prev,
            recorded_clips: [newClip, ...(prev.recorded_clips || [])],
          }));
        }
        setModalTarget(null);
        return;
      }

      const folderKey =
        modalTarget.kind === 'gw_loser'
          ? `gw-${modalTarget.gameweekNumber}-${modalTarget.managerId}`
          : `vault-${payload.managerId || currentUserId || 'league'}`;

      const uploaded = await uploadForfeitMedia(
        supabase,
        folderKey,
        payload.blob,
        payload.fileNameHint
      );

      if (modalTarget.kind === 'gw_loser') {
        const { error } = await supabase.rpc('save_gw_forfeit_proof', {
          p_gameweek_id: modalTarget.gameweekId,
          p_manager_id: modalTarget.managerId,
          p_proof_url: uploaded.publicUrl,
          p_media_type: uploaded.mediaType,
          p_caption: payload.caption || null,
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.rpc('add_recorded_forfeit_to_history', {
          p_manager_id: payload.managerId,
          p_forfeit_title: payload.forfeitTitle,
          p_proof_url: uploaded.publicUrl,
          p_media_type: uploaded.mediaType,
          p_caption: payload.caption || null,
          p_gameweek_number: payload.gameweekNumber ?? null,
        });
        if (error) throw new Error(error.message);
      }

      setModalTarget(null);
      await loadForfeits();
    } finally {
      setSavingMedia(false);
    }
  }

  async function handleClearGwProof(gwId: number, managerId: string) {
    setErrorMsg('');
    if (demoMode || !supabase) {
      setData(prev => ({
        ...prev,
        history: prev.history.map(h =>
          h.gameweek_id !== gwId
            ? h
            : {
                ...h,
                losers: h.losers.map(l =>
                  l.manager_id !== managerId
                    ? l
                    : {
                        ...l,
                        proof_url: null,
                        proof_media_type: null,
                        proof_caption: null,
                      }
                ),
              }
        ),
      }));
      return;
    }

    const { error } = await supabase.rpc('clear_gw_forfeit_proof', {
      p_gameweek_id: gwId,
      p_manager_id: managerId,
    });
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    await loadForfeits();
  }

  async function handleDeleteRecordedClip(entryId: number) {
    setErrorMsg('');
    if (demoMode || !supabase) {
      setData(prev => ({
        ...prev,
        recorded_clips: (prev.recorded_clips || []).filter(c => c.id !== entryId),
      }));
      return;
    }

    const { error } = await supabase.rpc('delete_recorded_forfeit_entry', {
      p_entry_id: entryId,
    });
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

    const proofLinks = record.losers
      .filter(l => Boolean(l.proof_url) && !String(l.proof_url).startsWith('blob:'))
      .map(l => `🎬 ${l.display_name}: ${l.proof_url}`)
      .join('\n');

    const text =
      `🎭 *El Khames El Momtaz — GW #${record.gameweek_number} Official Forfeit!*\n\n` +
      `📉 ${t('forfeitLowestScoreLabel')}: *${record.lowest_points} ${t('ptsUnit')}*\n` +
      `${loserNames}\n\n` +
      `⚖️ *Punishment:* ${record.forfeit_title}\n` +
      (proofLinks ? `\n${proofLinks}\n` : '') +
      `\n👉 Wall of Shame: https://elkhameselmomtaz.vercel.app/`;

    openWhatsAppShare(text);
  }

  function handleShareClipWhatsApp(clip: RecordedForfeitClip) {
    const gwLine = clip.gameweek_number ? ` (GW #${clip.gameweek_number})` : '';
    const linkPart =
      clip.proof_url && !clip.proof_url.startsWith('blob:')
        ? `\n🎬 Proof: ${clip.proof_url}\n`
        : '';
    const captionPart = clip.proof_caption ? `\n💬 "${clip.proof_caption}"\n` : '';
    const text =
      `🎥 *El Khames El Momtaz — Recorded Forfeit${gwLine}!*\n\n` +
      `👤 *${clubTitleOf(clip.team_name, clip.display_name)}* (${clip.display_name})\n` +
      `⚖️ *Forfeit:* ${clip.forfeit_title}` +
      captionPart +
      linkPart +
      `\n👉 https://elkhameselmomtaz.vercel.app/`;

    openWhatsAppShare(text);
  }

  function openCinemaForTarget(targetKey: string) {
    const foundIdx = cinemaReels.findIndex(r => r.targetKey === targetKey);
    if (foundIdx >= 0) {
      setTheaterIndex(foundIdx);
    }
  }

  function renderInteractiveSocialBar(targetKey: string, hasProof: boolean) {
    const social = socialMap[targetKey] || emptySocial();
    const isCommentsOpen = Boolean(openCommentsMap[targetKey]);
    const validVotes = social.counts.var_valid || 0;
    const redoVotes = social.counts.var_redo || 0;
    const totalVar = validVotes + redoVotes;
    const validPct = totalVar > 0 ? Math.round((validVotes * 100) / totalVar) : 50;

    return (
      <div className="forfeit-interactive-social">
        <div className="forfeit-social-top-row">
          {/* Emoji Reaction Strip */}
          <div className="forfeit-reaction-strip">
            {EMOJI_REACTIONS.map(({ key, emoji }) => {
              const active = social.my_reactions.includes(key);
              const cnt = social.counts[key] || 0;
              return (
                <button
                  key={key}
                  type="button"
                  className={`forfeit-rx-pill ${active ? 'active' : ''}`}
                  onClick={() => void handleToggleReaction(targetKey, key)}
                >
                  <span>{emoji}</span>
                  {cnt > 0 && <strong>{cnt}</strong>}
                </button>
              );
            })}
          </div>

          <div className="forfeit-social-right-btns">
            {hasProof && (
              <div className="forfeit-var-inline">
                <button
                  type="button"
                  className={`forfeit-var-btn valid ${
                    social.my_reactions.includes('var_valid') ? 'active' : ''
                  }`}
                  onClick={() => void handleToggleReaction(targetKey, 'var_valid')}
                >
                  <ShieldCheck size={12} /> {t('forfeitVarApproveBtn')}{' '}
                  {validVotes > 0 ? `(${validVotes})` : ''}
                </button>
                <button
                  type="button"
                  className={`forfeit-var-btn redo ${
                    social.my_reactions.includes('var_redo') ? 'active' : ''
                  }`}
                  onClick={() => void handleToggleReaction(targetKey, 'var_redo')}
                >
                  <Flag size={12} /> {t('forfeitVarRedoBtn')}{' '}
                  {redoVotes > 0 ? `(${redoVotes})` : ''}
                </button>
              </div>
            )}

            <button
              type="button"
              className={`forfeit-roast-toggle-btn ${isCommentsOpen ? 'active' : ''}`}
              onClick={() =>
                setOpenCommentsMap(prev => ({ ...prev, [targetKey]: !prev[targetKey] }))
              }
            >
              <MessageSquare size={13} /> {t('forfeitRoastsBtn')}
              {social.comments.length > 0 && (
                <span className="roast-count-dot">{social.comments.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Live Pitch VAR Approval Meter when managers have cast verdicts */}
        {hasProof && totalVar > 0 && (
          <div className="forfeit-var-meter-wrap">
            <span className="muted tiny">
              {t('forfeitVarJuryLabel')}: {validPct}% {t('forfeitVarApproveBtn')}
            </span>
            <div className="forfeit-var-meter-track">
              <span
                className="forfeit-var-meter-fill"
                style={{ width: `${validPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Expandable Locker-Room Roast Thread */}
        {isCommentsOpen && (
          <div className="forfeit-roast-thread">
            {social.comments.length > 0 && (
              <div className="forfeit-roast-list">
                {social.comments.map(c => {
                  const canDel =
                    demoMode ||
                    isAdmin ||
                    (Boolean(currentUserId) && c.user_id === currentUserId);
                  return (
                    <div key={c.id} className="forfeit-roast-item">
                      <div className="forfeit-roast-body">
                        <strong>
                          {clubTitleOf(c.team_name, c.display_name)}{' '}
                          <small>({c.display_name})</small>
                        </strong>
                        <p>{c.body}</p>
                      </div>
                      {canDel && (
                        <button
                          type="button"
                          className="icon-btn forfeit-del-btn"
                          onClick={() => void handleDeleteComment(targetKey, c.id)}
                          aria-label="Delete roast"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <form
              className="forfeit-roast-form"
              onSubmit={e => void handlePostComment(e, targetKey)}
            >
              <input
                type="text"
                maxLength={240}
                placeholder={t('forfeitRoastPlaceholder')}
                value={commentDrafts[targetKey] || ''}
                onChange={e =>
                  setCommentDrafts(prev => ({ ...prev, [targetKey]: e.target.value }))
                }
              />
              <button
                type="submit"
                className="primary compact-btn"
                disabled={
                  postingCommentKey === targetKey ||
                  !(commentDrafts[targetKey] || '').trim()
                }
              >
                <Send size={12} /> {t('forfeitRoastSendBtn')}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  function renderSavedProofMedia(
    targetKey: string,
    url: string,
    mediaType?: ForfeitMediaType | null,
    caption?: string | null,
    uploadedByName?: string | null,
    onRemove?: (() => void) | null
  ) {
    const resolvedType: ForfeitMediaType =
      mediaType === 'image' || mediaType === 'audio' ? mediaType : 'video';

    return (
      <div className="forfeit-proof-card">
        <div className="forfeit-proof-media-frame">
          {resolvedType === 'video' && (
            <video
              src={url}
              controls
              playsInline
              preload="metadata"
              className="forfeit-media-player"
            />
          )}
          {resolvedType === 'image' && (
            <button
              type="button"
              className="forfeit-proof-img-btn"
              onClick={() => openCinemaForTarget(targetKey)}
            >
              <img src={url} alt="Saved forfeit proof" className="forfeit-media-image" />
            </button>
          )}
          {resolvedType === 'audio' && (
            <div className="forfeit-audio-preview">
              <Mic size={20} />
              <audio src={url} controls preload="metadata" className="forfeit-audio-el" />
            </div>
          )}

          <button
            type="button"
            className="forfeit-open-theater-badge"
            onClick={() => openCinemaForTarget(targetKey)}
          >
            <Maximize2 size={12} /> {t('forfeitWatchCinemaBtn')}
          </button>
        </div>

        {(caption || uploadedByName || onRemove) && (
          <div className="forfeit-proof-meta-bar">
            <div className="forfeit-proof-caption-wrap">
              {caption && <p className="forfeit-proof-caption">“{caption}”</p>}
              {uploadedByName && (
                <small className="muted tiny">
                  <Film size={11} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                  {t('forfeitUploadedByLabel')}: {uploadedByName}
                </small>
              )}
            </div>

            {onRemove && (
              <button
                type="button"
                className="icon-btn forfeit-del-btn"
                title={t('forfeitRemoveProofBtn')}
                onClick={onRemove}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return <p className="muted">{t('loadingPoints')}</p>;
  }

  const poll = data.active_poll;
  const maxPollVotes = poll
    ? poll.options.reduce((mx, o) => Math.max(mx, o.votes), 0)
    : 0;
  const recordedClips = data.recorded_clips || [];
  const availableManagers = data.managers || [];

  // Apply interactive Archive Filters (All | With Proof | Pending + optional Manager Dossier)
  const filteredClips = recordedClips.filter(clip => {
    if (selectedManagerIdFilter && clip.manager_id !== selectedManagerIdFilter) return false;
    if (archiveFilter === 'pending') return false;
    return true;
  });

  const filteredHistory = data.history
    .map(item => {
      const matchingLosers = item.losers.filter(l => {
        if (selectedManagerIdFilter && l.manager_id !== selectedManagerIdFilter) return false;
        if (archiveFilter === 'proof' && !l.proof_url) return false;
        if (archiveFilter === 'pending' && l.completed) return false;
        return true;
      });
      return { ...item, losers: matchingLosers };
    })
    .filter(item => item.losers.length > 0);

  const selectedFilterManagerObj = selectedManagerIdFilter
    ? data.shame_leaderboard.find(s => s.manager_id === selectedManagerIdFilter) ||
      availableManagers.find(m => m.manager_id === selectedManagerIdFilter)
    : null;

  const hasAnyArchiveItems = data.history.length > 0 || recordedClips.length > 0;
  const hasFilteredResults = filteredClips.length > 0 || filteredHistory.length > 0;

  return (
    <div className="forfeits-hub screen-stage">
      {errorMsg && <div className="notice">{errorMsg}</div>}

      {/* 0. FLAGSHIP BROADCAST SCOREBOARD HERO */}
      <div className="forfeit-broadcast-hero" data-scroll-reveal>
        <div className="forfeit-hero-top">
          <div>
            <span className="eyebrow forfeit-live-eyebrow">
              <span className="live-pulse-dot" />
              <Tv size={13} /> {t('forfeitHeroTagline')}
            </span>
            <h3 className="forfeit-hero-heading">{t('forfeitArchiveTitle')}</h3>
          </div>

          <button
            type="button"
            className="primary forfeit-record-cta"
            onClick={() =>
              setModalTarget({
                kind: 'new',
                defaultGwNumber: poll?.gameweek_number ?? null,
                defaultForfeitTitle: poll?.options[0]?.label ?? '',
              })
            }
          >
            <Camera size={15} /> {t('forfeitRecordOrUploadBtn')}
          </button>
        </div>

        <div className="forfeit-hero-kpis">
          <div className="forfeit-kpi-tile">
            <strong>{heroStats.archivedGws}</strong>
            <span>{t('forfeitStatArchived')}</span>
          </div>
          <div className="forfeit-kpi-tile gold-kpi">
            <strong>{heroStats.savedProofs}</strong>
            <span>{t('forfeitStatProofs')}</span>
          </div>
          <div className="forfeit-kpi-tile">
            <strong>{heroStats.pendingDebts}</strong>
            <span>{t('forfeitStatPending')}</span>
          </div>
          <div className="forfeit-kpi-tile">
            <strong>{heroStats.totalReactions}</strong>
            <span>{t('forfeitStatReactions')}</span>
          </div>
        </div>

        {/* STORIES / REELS HIGHLIGHT STRIP */}
        {cinemaReels.length > 0 && (
          <div className="forfeit-reels-strip-wrap">
            <div className="forfeit-reels-head">
              <strong>
                <Play size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 5 }} />
                {t('forfeitReelsStripTitle')}
              </strong>
              <span className="muted tiny">{t('forfeitReelsStripSub')}</span>
            </div>

            <div className="forfeit-reels-row">
              {cinemaReels.map((reel, idx) => (
                <button
                  key={reel.targetKey}
                  type="button"
                  className="forfeit-reel-bubble"
                  onClick={() => setTheaterIndex(idx)}
                >
                  <span className="forfeit-reel-ring">
                    {reel.avatarUrl ? (
                      <img src={reel.avatarUrl} alt={reel.managerName} />
                    ) : (
                      <span className="forfeit-reel-initial">
                        {(reel.managerName || '?').slice(0, 1)}
                      </span>
                    )}
                    <span className="forfeit-reel-play-badge">▶</span>
                  </span>
                  <small>{reel.clubName}</small>
                  {reel.gwNumber && <em>GW #{reel.gwNumber}</em>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 1. WEEKLY FORFEIT VOTE + WHEEL OF PUNISHMENT + LIVE DANGER ZONE */}
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

          <div className="forfeit-poll-head-actions">
            {poll && poll.options.length >= 2 && (
              <button
                type="button"
                className={`secondary compact-btn ${showWheel ? 'active-gold-btn' : ''}`}
                onClick={() => setShowWheel(v => !v)}
              >
                <Sparkles size={13} /> {t('forfeitWheelToggleBtn')}
              </button>
            )}
            {poll && (
              <span className="tag">
                {poll.total_votes} {t('forfeitTotalVotes')}
              </span>
            )}
          </div>
        </div>

        {!poll ? (
          <p className="muted" style={{ margin: '10px 0 0' }}>
            {t('forfeitNoOpenGw')}
          </p>
        ) : (
          <>
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

            {/* Interactive 60fps Physics Wheel of Punishment */}
            {showWheel && poll.options.length >= 2 && (
              <ForfeitWheelDrawer
                options={poll.options}
                myVoteOptionId={poll.my_vote_option_id}
                onVoteOption={id => void handleVote(id)}
              />
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

      {/* 2. INTERACTIVE SEASON WALL OF SHAME (TAP CLUB TO FILTER DOSSIER) */}
      {data.shame_leaderboard.length > 0 && (
        <div className="forfeit-shame-wall" data-scroll-reveal>
          <div className="lineup-heading" style={{ marginTop: 0 }}>
            <div>
              <strong>
                <Skull size={15} style={{ verticalAlign: 'text-bottom', marginInlineEnd: 6 }} />
                {t('forfeitShameWallTitle')}
              </strong>
              <p className="muted tiny" style={{ margin: '2px 0 0' }}>
                {t('forfeitClickToFilterHint')}
              </p>
            </div>
          </div>

          <div className="forfeit-shame-grid">
            {data.shame_leaderboard.map((row, idx) => {
              const isSelected = selectedManagerIdFilter === row.manager_id;
              return (
                <button
                  key={row.manager_id}
                  type="button"
                  onClick={() =>
                    setSelectedManagerIdFilter(prev =>
                      prev === row.manager_id ? null : row.manager_id
                    )
                  }
                  className={`forfeit-shame-card forfeit-shame-interactive hover-lift-card ${
                    idx === 0 ? 'most-shamed' : ''
                  } ${isSelected ? 'is-dossier-active' : ''}`}
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
                    <div className="forfeit-club-stack" style={{ textAlign: 'start' }}>
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
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE SAVED FORFEITS ARCHIVE + FILTER BAR + LOCKER ROOM */}
      <div className="forfeit-archive-section" data-scroll-reveal>
        <div className="lineup-heading forfeit-archive-header" style={{ marginTop: 0 }}>
          <div>
            <strong>{t('forfeitArchiveTitle')}</strong>
            <p className="muted tiny" style={{ margin: '2px 0 0' }}>
              {t('forfeitArchiveSub')}
            </p>
          </div>

          <div className="forfeit-filter-pills">
            {(
              [
                ['all', t('forfeitFilterAll')],
                ['proof', `🎬 ${t('forfeitFilterWithProof')}`],
                ['pending', `⏳ ${t('forfeitFilterPending')}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`forfeit-filter-pill ${archiveFilter === key ? 'active' : ''}`}
                onClick={() => setArchiveFilter(key)}
              >
                {label}
              </button>
            ))}

            {selectedFilterManagerObj && (
              <button
                type="button"
                className="forfeit-filter-pill active-mgr"
                onClick={() => setSelectedManagerIdFilter(null)}
              >
                {t('forfeitClearMgrFilter')}{' '}
                {clubTitleOf(
                  selectedFilterManagerObj.team_name,
                  selectedFilterManagerObj.display_name
                )}{' '}
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {!hasAnyArchiveItems ? (
          <div className="news-empty-box">{t('forfeitNoHistoryYet')}</div>
        ) : !hasFilteredResults ? (
          <div className="news-empty-box">{t('forfeitNoFilterMatch')}</div>
        ) : (
          <div className="forfeit-history-list">
            {/* Standalone / Direct Recorded Forfeit Clips */}
            {filteredClips.map(clip => {
              const targetKey = `clip:${clip.id}`;
              const canDeleteClip =
                demoMode ||
                isAdmin ||
                (Boolean(currentUserId) &&
                  (clip.uploaded_by_id === currentUserId || clip.manager_id === currentUserId));

              return (
                <article
                  key={`clip-${clip.id}`}
                  className="forfeit-history-card forfeit-recorded-clip-card hover-lift-card"
                >
                  <div className="forfeit-history-top">
                    <div className="forfeit-history-badges">
                      {clip.gameweek_number && (
                        <span className="tag">GW #{clip.gameweek_number}</span>
                      )}
                      <span className="forfeit-status-pill status-done">
                        <Film size={12} /> {t('forfeitDirectClipBadge')}
                      </span>
                    </div>

                    <div className="forfeit-loser-actions">
                      <button
                        type="button"
                        className="secondary compact-btn"
                        onClick={() => handleShareClipWhatsApp(clip)}
                      >
                        <MessageCircle size={13} /> {t('forfeitShareRoastBtn')}
                      </button>

                      {canDeleteClip && (
                        <button
                          type="button"
                          className="icon-btn forfeit-del-btn"
                          title={t('forfeitDeleteEntryBtn')}
                          onClick={() => void handleDeleteRecordedClip(clip.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="forfeit-punishment-banner">
                    <span>🎬</span>
                    <strong>{clip.forfeit_title}</strong>
                  </div>

                  <div className="forfeit-loser-block is-completed">
                    <div className="forfeit-loser-row is-completed">
                      <div className="forfeit-loser-identity">
                        {clip.avatar_url ? (
                          <img
                            className="leaderboard-photo"
                            src={clip.avatar_url}
                            alt={clip.display_name}
                          />
                        ) : (
                          <div className="player-photo small-photo">
                            {(clip.display_name || '?').slice(0, 1)}
                          </div>
                        )}
                        <div className="forfeit-club-stack">
                          <strong>{clubTitleOf(clip.team_name, clip.display_name)}</strong>
                          <span>
                            {clip.display_name} ·{' '}
                            {new Date(clip.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <span className="forfeit-status-pill status-done">
                        <CheckCircle2 size={12} /> {t('forfeitSavedProofBadge')}
                      </span>
                    </div>

                    {renderSavedProofMedia(
                      targetKey,
                      clip.proof_url,
                      clip.proof_media_type,
                      clip.proof_caption,
                      clip.uploaded_by_name,
                      null
                    )}

                    {renderInteractiveSocialBar(targetKey, true)}
                  </div>
                </article>
              );
            })}

            {/* Official Gameweek-by-Gameweek Saved Forfeits */}
            {filteredHistory.map(item => (
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
                    const targetKey = `gw:${item.gameweek_id}:${loser.manager_id}`;
                    const hasProof = Boolean(loser.proof_url);
                    const canClearProof =
                      hasProof &&
                      (demoMode ||
                        isAdmin ||
                        (Boolean(currentUserId) &&
                          (loser.manager_id === currentUserId ||
                            loser.proof_uploaded_by_id === currentUserId)));

                    return (
                      <div key={loser.manager_id} className="forfeit-loser-block">
                        <div
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

                            <button
                              type="button"
                              className={hasProof ? 'secondary compact-btn' : 'primary compact-btn'}
                              onClick={() =>
                                setModalTarget({
                                  kind: 'gw_loser',
                                  gameweekId: item.gameweek_id,
                                  gameweekNumber: item.gameweek_number,
                                  forfeitTitle: item.forfeit_title,
                                  managerId: loser.manager_id,
                                  managerName: loser.display_name,
                                  teamName: loser.team_name,
                                  initialCaption: loser.proof_caption,
                                })
                              }
                            >
                              <Camera size={13} />{' '}
                              {hasProof ? t('forfeitReplaceProofBtn') : t('forfeitAttachProofBtn')}
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                className="secondary compact-btn"
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

                        {loser.proof_url &&
                          renderSavedProofMedia(
                            targetKey,
                            loser.proof_url,
                            loser.proof_media_type,
                            loser.proof_caption,
                            loser.proof_uploaded_by_name,
                            canClearProof
                              ? () => void handleClearGwProof(item.gameweek_id, loser.manager_id)
                              : null
                          )}

                        {renderInteractiveSocialBar(targetKey, hasProof)}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {modalTarget && (
        <ForfeitMediaRecorderModal
          target={modalTarget}
          managers={availableManagers}
          currentUserId={currentUserId}
          saving={savingMedia}
          onClose={() => setModalTarget(null)}
          onSubmit={handleSaveMedia}
        />
      )}

      {theaterIndex !== null && cinemaReels.length > 0 && (
        <ForfeitTheaterModal
          reels={cinemaReels}
          initialIndex={theaterIndex}
          socialByTarget={socialMap}
          onToggleReaction={(tk, rx) => void handleToggleReaction(tk, rx)}
          onShareWhatsApp={reel => {
            const linkPart =
              reel.mediaUrl && !reel.mediaUrl.startsWith('blob:')
                ? `\n🎬 Watch: ${reel.mediaUrl}\n`
                : '';
            openWhatsAppShare(
              `🍿 *El Khames El Momtaz — Shame Cinema!*\n\n` +
                `👤 *${reel.clubName}* (${reel.managerName})\n` +
                `⚖️ ${reel.forfeitTitle}` +
                (reel.caption ? `\n💬 "${reel.caption}"` : '') +
                linkPart +
                `\n👉 https://elkhameselmomtaz.vercel.app/`
            );
          }}
          onClose={() => setTheaterIndex(null)}
        />
      )}
    </div>
  );
}
