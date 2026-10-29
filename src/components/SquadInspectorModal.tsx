import { useEffect, useState } from 'react';
import { Swords, X } from 'lucide-react';
import type { SquadInspection } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { buildDemoInspection } from '../lib/demoData';
import FutPlayerCard from './FutPlayerCard';
import AnimatedNumber from './AnimatedNumber';

type SquadInspectorModalProps = {
  managerName: string;
  gameweekNumber: number;
  gameweekId?: number;
  demoMode?: boolean;
  currentUserId?: string;
  inspectedManagerId?: string;
  myClubName?: string;
  loading: boolean;
  error: string;
  inspection: SquadInspection | null;
  onOpenPlayerProfile?: (playerId: string) => void;
  onClose: () => void;
};

export default function SquadInspectorModal({
  managerName,
  gameweekNumber,
  gameweekId,
  demoMode = false,
  currentUserId,
  inspectedManagerId,
  myClubName = 'My Club',
  loading,
  error,
  inspection,
  onOpenPlayerProfile,
  onClose,
}: SquadInspectorModalProps) {
  const { t } = useLanguage();
  const [compareOpen, setCompareOpen] = useState(false);
  const [myInspection, setMyInspection] = useState<SquadInspection | null>(null);
  const [myLoading, setMyLoading] = useState(false);

  const canCompare = demoMode
    ? managerName !== 'Yako' && managerName !== 'Yako Royals'
    : Boolean(currentUserId && inspectedManagerId && currentUserId !== inspectedManagerId && gameweekId);

  useEffect(() => {
    setCompareOpen(false);
    setMyInspection(null);
  }, [inspectedManagerId, gameweekId, managerName]);

  useEffect(() => {
    if (!compareOpen || !canCompare) return;
    if (demoMode) {
      setMyInspection(buildDemoInspection('Yako'));
      return;
    }
    if (!supabase || !currentUserId || !gameweekId) return;

    let cancelled = false;
    setMyLoading(true);
    supabase
      .rpc('inspect_gameweek_squad', {
        p_gameweek_id: gameweekId,
        p_manager_id: currentUserId,
      })
      .then(({ data, error: rpcErr }) => {
        if (cancelled) return;
        if (!rpcErr && data) {
          setMyInspection(data as SquadInspection);
        } else {
          setMyInspection({ has_squad: false });
        }
        setMyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [compareOpen, canCompare, demoMode, currentUserId, gameweekId]);

  const starters = (inspection?.players ?? []).filter(p => p.is_starter_slot);
  const bench = (inspection?.players ?? []).filter(p => !p.is_starter_slot);

  const myPlayers = myInspection?.has_squad ? (myInspection.players ?? []) : [];
  const rivalPlayers = inspection?.has_squad ? (inspection.players ?? []) : [];
  const myIdSet = new Set(myPlayers.map(p => p.player_id));
  const rivalIdSet = new Set(rivalPlayers.map(p => p.player_id));

  const onlyMine = myPlayers.filter(p => !rivalIdSet.has(p.player_id));
  const onlyRival = rivalPlayers.filter(p => !myIdSet.has(p.player_id));
  const sharedPicks = rivalPlayers.filter(p => myIdSet.has(p.player_id));

  const myCap = myPlayers.find(p => p.is_effective_captain || p.is_captain);
  const rivalCap = rivalPlayers.find(p => p.is_effective_captain || p.is_captain);
  const sameCaptain = Boolean(myCap && rivalCap && myCap.player_id === rivalCap.player_id);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-sheet-spring inspector-modal-wide"
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-grabber" aria-hidden="true" />

        <div className="panel-heading modal-heading">
          <div>
            <h3>
              {managerName} · {t('gameweekOption')} #{gameweekNumber}
            </h3>
            <p>
              {t('inspectorTitle')} · {t('tapForProfileHint')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {canCompare && inspection?.has_squad && (
              <button
                type="button"
                className={compareOpen ? 'primary compact-btn' : 'secondary compact-btn'}
                onClick={() => setCompareOpen(prev => !prev)}
              >
                <Swords size={14} /> {compareOpen ? t('hideCompareBtn') : t('compareVsMeBtn')}
              </button>
            )}
            <button type="button" className="secondary compact-btn" onClick={onClose}>
              <X size={14} /> {t('closeBtn')}
            </button>
          </div>
        </div>

        {loading && <p className="muted">{t('loadingSavedSquad')}</p>}
        {error && <div className="notice">{error}</div>}

        {!loading && !error && inspection && !inspection.has_squad && (
          <div className="notice">{t('noSquadSavedForGw')}</div>
        )}

        {!loading && !error && inspection && inspection.has_squad && (
          <>
            <div className="inspector-badges">
              <span className="inspector-score-pill">
                <strong>
                  <AnimatedNumber value={inspection.total_points ?? 0} decimals={0} />{' '}
                  {t('ptsUnit')}
                </strong>
              </span>
              {inspection.chip && (
                <span className="inspector-badge gold">
                  {t('chipPlayedBadge')}: {inspection.chip}
                </span>
              )}
              {(inspection.points_hit ?? 0) > 0 && (
                <span className="inspector-badge danger">
                  {t('transferHitBadge')}: −{inspection.points_hit} {t('ptsUnit')}
                </span>
              )}
              {inspection.is_rolled_over && (
                <span className="inspector-badge muted-badge">{t('rolledOverBadge')}</span>
              )}
            </div>

            {compareOpen && (
              <div className="rival-diff-box spring-pop">
                {myLoading ? (
                  <p className="muted" style={{ margin: 0 }}>
                    {t('loadingSavedSquad')}
                  </p>
                ) : !myInspection || !myInspection.has_squad ? (
                  <p className="muted" style={{ margin: 0 }}>
                    {t('noSquadForComparison')}
                  </p>
                ) : (
                  <>
                    <div className="rival-diff-header">
                      <div className="rival-diff-side">
                        <span className="eyebrow">{myClubName}</span>
                        <strong>
                          {myInspection.total_points ?? 0} <small>{t('ptsUnit')}</small>
                        </strong>
                      </div>

                      <div className="rival-diff-vs-pill">
                        <Swords size={15} /> VS
                      </div>

                      <div className="rival-diff-side rival-diff-side-end">
                        <span className="eyebrow">{managerName}</span>
                        <strong>
                          {inspection.total_points ?? 0} <small>{t('ptsUnit')}</small>
                        </strong>
                      </div>
                    </div>

                    <div className="rival-diff-summary-pills">
                      <span className="inspector-badge muted-badge">
                        {t('sharedPlayersStat')}: <strong>{sharedPicks.length}/7</strong>
                      </span>
                      <span className="inspector-badge gold">
                        {t('differentialsStat')}: <strong>{onlyMine.length}</strong>
                      </span>
                      <span className="inspector-badge muted-badge">
                        {t('captainMatchLabel')}:{' '}
                        <strong>
                          {sameCaptain
                            ? `${t('captainSame')} (${myCap?.display_name ?? ''})`
                            : `${myCap?.display_name ?? '—'} vs ${rivalCap?.display_name ?? '—'}`}
                        </strong>
                      </span>
                    </div>

                    {onlyMine.length === 0 && onlyRival.length === 0 ? (
                      <div className="rival-identical-note">{t('noDifferentialsMsg')}</div>
                    ) : (
                      <div className="rival-diff-columns">
                        <div className="rival-diff-col">
                          <h5>{t('onlyInYourSquad')}</h5>
                          {onlyMine.map(pl => (
                            <div
                              key={pl.player_id}
                              className="rival-diff-player-row clickable-row"
                              onClick={() => onOpenPlayerProfile?.(pl.player_id)}
                            >
                              <span>
                                <strong>{pl.display_name}</strong>
                                {pl.is_captain ? ' (C)' : pl.is_vice_captain ? ' (VC)' : ''}
                                {!pl.is_starter_slot ? ` · ${t('subShort')}` : ''}
                              </span>
                              <strong className="pts-pos">
                                {pl.effective_points} {t('ptsUnit')}
                              </strong>
                            </div>
                          ))}
                        </div>

                        <div className="rival-diff-col">
                          <h5>{t('onlyInRivalSquad')}</h5>
                          {onlyRival.map(pl => (
                            <div
                              key={pl.player_id}
                              className="rival-diff-player-row clickable-row"
                              onClick={() => onOpenPlayerProfile?.(pl.player_id)}
                            >
                              <span>
                                <strong>{pl.display_name}</strong>
                                {pl.is_captain ? ' (C)' : pl.is_vice_captain ? ' (VC)' : ''}
                                {!pl.is_starter_slot ? ` · ${t('subShort')}` : ''}
                              </span>
                              <strong>
                                {pl.effective_points} {t('ptsUnit')}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sharedPicks.length > 0 && (
                      <div className="rival-shared-strip">
                        <span>{t('sharedSquadPicks')}:</span>{' '}
                        {sharedPicks.map(p => p.display_name).join(' · ')}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="pitch-3d-stage">
              <div className="egypt-pitch pitch-3d-stadium inspector-pitch">
                <div className="stadium-beam beam-left" aria-hidden="true" />
                <div className="stadium-beam beam-right" aria-hidden="true" />
                <div className="egypt-pitch-title">{t('pitchTitle')}</div>
                <div className="egypt-pitch-markings">
                  <div className="egypt-halfway" />
                  <div className="egypt-centre-circle" />
                  <div className="egypt-goal-box egypt-goal-top" />
                  <div className="egypt-goal-box egypt-goal-bottom" />
                </div>

                <div className="egypt-formation">
                  {starters.map((p, index) => {
                    const isDiff =
                      compareOpen && Boolean(myInspection?.has_squad) && !myIdSet.has(p.player_id);
                    const noteParts: string[] = [];
                    if (p.subbed_out) noteParts.push(t('autoSubOutTag'));
                    if (isDiff) noteParts.push(`⚡ ${t('diffBadge')}`);

                    return (
                      <FutPlayerCard
                        key={p.player_id}
                        slotNumber={index + 1}
                        name={p.display_name}
                        photoUrl={p.photo_url}
                        statLabel={
                          p.played
                            ? `${p.effective_points} ${t('ptsUnit')}${p.multiplier > 1 ? ` (×${p.multiplier})` : ''}`
                            : t('didNotPlayTag')
                        }
                        secondaryNote={noteParts.length > 0 ? noteParts.join(' · ') : null}
                        isCaptain={p.is_captain}
                        isTripleCaptain={p.is_captain && inspection.chip === 'Triple Captain'}
                        isViceCaptain={!p.is_captain && p.is_vice_captain}
                        isSubbedOut={p.subbed_out}
                        profileLabel={t('playerProfileTitle')}
                        onCardClick={
                          onOpenPlayerProfile ? () => onOpenPlayerProfile(p.player_id) : undefined
                        }
                        onOpenProfile={
                          onOpenPlayerProfile ? () => onOpenPlayerProfile(p.player_id) : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="inspector-bench">
              <h4>{t('benchTitle')}</h4>
              <div className="inspector-bench-grid">
                {bench.map((p, idx) => {
                  const isDiff =
                    compareOpen && Boolean(myInspection?.has_squad) && !myIdSet.has(p.player_id);
                  return (
                    <div
                      key={p.player_id}
                      className={`egypt-bench-player inspector-bench-item ${onOpenPlayerProfile ? 'clickable-row' : ''} ${p.subbed_in ? 'subbed-in-card' : ''}`}
                      onClick={() => onOpenPlayerProfile?.(p.player_id)}
                    >
                      <span className="egypt-sub-number">{idx + 1}</span>
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.display_name} />
                      ) : (
                        <div className="player-photo small-photo">
                          {p.display_name.slice(0, 1)}
                        </div>
                      )}
                      <div className="egypt-bench-info">
                        <strong>
                          {p.display_name}
                          {isDiff && (
                            <span
                              className="inspector-badge gold"
                              style={{ marginInlineStart: 6, padding: '2px 6px', fontSize: 10 }}
                            >
                              {t('diffBadge')}
                            </span>
                          )}
                        </strong>
                        <span>
                          {p.played ? `${p.raw_points} ${t('ptsUnit')}` : t('didNotPlayTag')}
                          {p.subbed_in ? ` · ${t('autoSubInTag')} (+${p.effective_points})` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
