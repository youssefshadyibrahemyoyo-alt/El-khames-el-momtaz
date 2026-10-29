import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  RotateCcw,
  Share2,
  Sparkles,
  Zap,
} from 'lucide-react';
import type {
  ChipName,
  Gameweek,
  LeaguePlayer,
  Screen,
  SquadInspection,
} from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { SQUAD_BUDGET, SQUAD_SIZE, STARTERS_COUNT } from '../lib/squadRules';
import { shareOrDownloadSquadCard } from '../lib/shareCardCanvas';
import { supabase } from '../lib/supabase';
import { buildDemoInspection } from '../lib/demoData';
import FutPlayerCard from '../components/FutPlayerCard';
import AnimatedNumber from '../components/AnimatedNumber';
import ConfettiBurst from '../components/ConfettiBurst';

type SquadScreenProps = {
  demoMode: boolean;
  currentUserId?: string;
  allGameweeks?: Gameweek[];
  managerName?: string;
  teamName?: string | null;
  gameweekNumber?: number;
  squadLoading: boolean;
  squadSaving: boolean;
  playersError: string;
  squadError: string;
  sessionMessage: string;
  onClearMessage: () => void;
  targetGw: Gameweek | null;
  isTransfersLocked?: boolean;
  selected: string[];
  playerById: Map<string, LeaguePlayer>;
  selectedCost: number;
  managerBudget?: number;
  captain: string;
  viceCaptain: string;
  activeChip: string | null;
  usedChips: string[];
  freeTransfers: number;
  transfersUsed: number;
  pointsHits: number;
  hasUnsaved: boolean;
  celebrateKey: number;
  onResetSquad: () => void;
  onApplyLineup: (next: string[]) => void;
  onSetCaptain: (id: string) => void;
  onSetViceCaptain: (id: string) => void;
  onToggleChip: (chip: ChipName) => void;
  onSaveSquad: () => void;
  onOpenPlayerProfile: (playerId: string) => void;
  onNavigate: (screen: Screen) => void;
};

export default function SquadScreen({
  demoMode,
  currentUserId,
  allGameweeks = [],
  managerName = 'Manager',
  teamName = null,
  gameweekNumber = 1,
  squadLoading,
  squadSaving,
  playersError,
  squadError,
  sessionMessage,
  onClearMessage,
  targetGw,
  isTransfersLocked = false,
  selected,
  playerById,
  selectedCost,
  managerBudget = SQUAD_BUDGET,
  captain,
  viceCaptain,
  activeChip,
  usedChips,
  freeTransfers,
  transfersUsed,
  pointsHits,
  hasUnsaved,
  celebrateKey,
  onResetSquad,
  onApplyLineup,
  onSetCaptain,
  onSetViceCaptain,
  onToggleChip,
  onSaveSquad,
  onOpenPlayerProfile,
  onNavigate,
}: SquadScreenProps) {
  const { t } = useLanguage();
  const [swapStarter, setSwapStarter] = useState<string | null>(null);
  const [justSwapped, setJustSwapped] = useState<string[]>([]);
  const [matchInProgress, setMatchInProgress] = useState(false);
  const [didNotPlay, setDidNotPlay] = useState<string[]>([]);
  const [demoNotice, setDemoNotice] = useState('');
  const [sharingCard, setSharingCard] = useState(false);

  // Pick Team vs Live GW Points Pitch Toggle
  const scoredGws = allGameweeks.filter(g =>
    ['active', 'finished'].includes(String(g.status).toLowerCase())
  );
  const [pitchMode, setPitchMode] = useState<'pick' | 'live'>('pick');
  const [liveGwId, setLiveGwId] = useState<number | null>(null);
  const [liveData, setLiveData] = useState<SquadInspection | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    if (scoredGws.length > 0 && (liveGwId == null || !scoredGws.some(g => g.id === liveGwId))) {
      setLiveGwId(scoredGws[scoredGws.length - 1].id);
    }
  }, [scoredGws, liveGwId]);

  useEffect(() => {
    if (pitchMode !== 'live') return;
    if (demoMode) {
      setLiveData(buildDemoInspection(managerName));
      return;
    }
    if (!supabase || !currentUserId || !liveGwId) {
      setLiveData(null);
      return;
    }
    let cancelled = false;
    setLiveLoading(true);
    supabase
      .rpc('inspect_gameweek_squad', {
        p_gameweek_id: liveGwId,
        p_manager_id: currentUserId,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setLiveData(data as SquadInspection);
        } else {
          setLiveData(null);
        }
        setLiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pitchMode, demoMode, currentUserId, liveGwId, managerName]);

  useEffect(() => {
    if (justSwapped.length === 0) return;
    const timer = window.setTimeout(() => setJustSwapped([]), 820);
    return () => window.clearTimeout(timer);
  }, [justSwapped]);

  const starters = selected.slice(0, STARTERS_COUNT);
  const bench = selected.slice(STARTERS_COUNT, SQUAD_SIZE);

  const flaggedInSquad = selected
    .map(id => playerById.get(id))
    .filter(
      (p): p is LeaguePlayer =>
        Boolean(p && (p.availability_status === 'doubtful' || p.availability_status === 'out'))
    );

  async function handleShareSquadImage() {
    if (selected.length < SQUAD_SIZE) return;
    setSharingCard(true);
    try {
      await shareOrDownloadSquadCard({
        managerName,
        teamName,
        gameweekNumber: targetGw?.number ?? gameweekNumber,
        selectedCost,
        managerBudget,
        activeChip,
        starters: starters.map(id => playerById.get(id)).filter((p): p is LeaguePlayer => Boolean(p)),
        bench: bench.map(id => playerById.get(id)).filter((p): p is LeaguePlayer => Boolean(p)),
        captainId: captain,
        viceCaptainId: viceCaptain,
      });
    } finally {
      setSharingCard(false);
    }
  }

  const chips: { name: ChipName; icon: string; desc: string }[] = [
    { name: 'Triple Captain', icon: '👑', desc: t('chipTripleDesc') },
    { name: 'Wildcard', icon: '🃏', desc: t('chipWildcardDesc') },
    { name: 'Bench Boost', icon: '🪑', desc: t('chipBenchDesc') },
    { name: 'Free Hit', icon: '⚡', desc: t('chipFreeHitDesc') },
  ];

  function executeSwap(starterId: string, benchId: string) {
    const next = [...selected];
    const sIdx = next.indexOf(starterId);
    const bIdx = next.indexOf(benchId);
    if (sIdx >= 0 && bIdx >= 0) {
      [next[sIdx], next[bIdx]] = [next[bIdx], next[sIdx]];
      onApplyLineup(next);
      setJustSwapped([starterId, benchId]);
    }
    setSwapStarter(null);
  }

  return (
    <>
      <ConfettiBurst triggerKey={celebrateKey} />

      <section
        className="panel egypt-squad-panel stagger-item"
        style={{ '--stagger-i': 0 } as React.CSSProperties}
      >
        <div className="panel-heading">
          <div>
            <h3>{t('myFantasySquad')}</h3>
            <p>{t('mySquadSub')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="squad-mode-toggle">
              <button
                type="button"
                className={pitchMode === 'pick' ? 'primary compact-btn' : 'secondary compact-btn'}
                onClick={() => setPitchMode('pick')}
              >
                {t('pickTeamTab')}
              </button>
              <button
                type="button"
                className={pitchMode === 'live' ? 'primary compact-btn' : 'secondary compact-btn'}
                onClick={() => setPitchMode('live')}
              >
                <Zap size={13} /> {t('liveGwPointsTab')}
              </button>
            </div>

            {pitchMode === 'pick' && selected.length === SQUAD_SIZE && (
              <button
                type="button"
                className="secondary compact-btn"
                disabled={sharingCard}
                onClick={() => void handleShareSquadImage()}
              >
                <Share2 size={14} /> {t('shareSquadCardBtn')}
              </button>
            )}
            <span className="budget">
              <AnimatedNumber value={selectedCost} decimals={1} prefix="£" suffix="m" /> / £
              {managerBudget.toFixed(1)}m
            </span>
          </div>
        </div>

        {pitchMode === 'live' ? (
          <div className="live-gw-pitch-wrap screen-stage">
            {!demoMode && scoredGws.length > 0 && (
              <div className="gw-picker-bar" style={{ marginBottom: 12 }}>
                <select
                  className="player-price-filter"
                  value={liveGwId ?? ''}
                  onChange={e => setLiveGwId(Number(e.target.value))}
                >
                  {scoredGws.map(g => (
                    <option key={g.id} value={g.id}>
                      {t('gameweekOption')} #{g.number} ({g.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {liveLoading && <p className="muted">{t('loadingPoints')}</p>}

            {!liveLoading && (!liveData || !liveData.has_squad) ? (
              <div className="gw-empty-state">
                <Zap size={26} style={{ color: 'var(--gold)', marginBottom: 6 }} />
                <p className="muted" style={{ margin: 0 }}>
                  {scoredGws.length === 0 ? t('noLiveGwYet') : t('noSquadSavedForGw')}
                </p>
              </div>
            ) : (
              liveData &&
              liveData.has_squad && (
                <>
                  <div className="live-gw-score-hero">
                    <div>
                      <span className="eyebrow">{t('liveGwTotalLabel')}</span>
                      <strong>
                        <AnimatedNumber value={liveData.total_points ?? 0} decimals={0} />{' '}
                        <small>{t('ptsUnit')}</small>
                      </strong>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {liveData.chip && (
                        <span className="gw-status-pill gw-status-active">
                          {t('chipPlayedBadge')}: {liveData.chip}
                        </span>
                      )}
                      {liveData.is_rolled_over && (
                        <span className="gw-status-pill">{t('rolledOverBadge')}</span>
                      )}
                      {(liveData.points_hit ?? 0) > 0 && (
                        <span className="fpl-flag-chip fpl-flag-chip--out">
                          {t('transferHitBadge')}: −{liveData.points_hit} {t('ptsUnit')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="egypt-lineup-layout">
                    <div className="pitch-3d-stage">
                      <div className="egypt-pitch pitch-3d-stadium">
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
                          {(liveData.players ?? [])
                            .filter(pl => pl.is_starter_slot)
                            .map((pl, idx) => (
                              <FutPlayerCard
                                key={pl.slot}
                                slotNumber={idx + 1}
                                kitNumber={playerById.get(pl.player_id)?.kit_number}
                                name={pl.display_name}
                                photoUrl={pl.photo_url}
                                statLabel={`${pl.effective_points} ${t('ptsUnit')}${
                                  pl.multiplier > 1 ? ` (${pl.multiplier}×)` : ''
                                }`}
                                secondaryNote={
                                  pl.subbed_out
                                    ? `↓ ${t('autoSubOutTag')}`
                                    : !pl.played
                                      ? t('didNotPlayTag')
                                      : undefined
                                }
                                isCaptain={pl.is_effective_captain || pl.is_captain}
                                isTripleCaptain={
                                  pl.is_effective_captain && pl.multiplier === 3
                                }
                                isViceCaptain={pl.is_vice_captain && !pl.is_effective_captain}
                                isSubbedOut={pl.subbed_out}
                                profileLabel={t('playerProfileTitle')}
                                onCardClick={() => onOpenPlayerProfile(pl.player_id)}
                                onOpenProfile={() => onOpenPlayerProfile(pl.player_id)}
                              />
                            ))}
                        </div>
                      </div>
                    </div>

                    <aside
                      className={`egypt-bench ${
                        liveData.chip === 'Bench Boost' ? 'bench-boost-glow' : ''
                      }`}
                    >
                      <h3>{t('benchTitle')}</h3>
                      {(liveData.players ?? [])
                        .filter(pl => !pl.is_starter_slot)
                        .map((pl, idx) => (
                          <div
                            key={pl.slot}
                            className="egypt-bench-player clickable-row"
                            onClick={() => onOpenPlayerProfile(pl.player_id)}
                          >
                            <span className="egypt-sub-number">{idx + 1}</span>
                            {pl.photo_url ? (
                              <img src={pl.photo_url} alt={pl.display_name} />
                            ) : (
                              <div className="player-photo">
                                {pl.display_name.slice(0, 1)}
                              </div>
                            )}
                            <div className="egypt-bench-info">
                              <strong>
                                {pl.display_name}
                                {pl.subbed_in && (
                                  <span
                                    className="fpl-flag-chip fpl-flag-chip--available"
                                    style={{ marginInlineStart: 5 }}
                                  >
                                    ↑ {t('autoSubInTag')}
                                  </span>
                                )}
                              </strong>
                              <span>
                                {pl.played
                                  ? `${pl.effective_points > 0 ? pl.effective_points : pl.raw_points} ${t('ptsUnit')}`
                                  : t('didNotPlayTag')}
                              </span>
                            </div>
                          </div>
                        ))}
                    </aside>
                  </div>
                </>
              )
            )}
          </div>
        ) : (
          <>

        {flaggedInSquad.length > 0 && (
          <div className="fpl-squad-alert-banner spring-pop">
            <AlertTriangle size={17} />
            <div>
              <strong>{t('availSquadAlertTitle')}</strong>
              <p>
                {t('availSquadAlertSub')}{' '}
                {flaggedInSquad
                  .map(
                    p =>
                      `${p.name} (${
                        p.availability_status === 'out' ? t('availOut') : t('availDoubtful')
                      }${p.availability_note ? ` — ${p.availability_note}` : ''})`
                  )
                  .join(' · ')}
              </p>
            </div>
          </div>
        )}

        <div className="budget-track">
          <span style={{ width: `${Math.min((selectedCost / managerBudget) * 100, 100)}%` }} />
        </div>

        {!demoMode && (
          <p className="muted tiny">
            {squadLoading
              ? t('loadingSavedSquad')
              : targetGw
                ? `${t('pickingForGw')} #${targetGw.number} (${targetGw.status})`
                : !isTransfersLocked
                  ? `${t('pickingForUpcomingGw')} #${gameweekNumber}`
                  : t('transfersClosedMsg')}
          </p>
        )}

        {hasUnsaved && !demoMode && (
          <div className="unsaved-bar spring-pop">
            <span>{t('unsavedChanges')}</span>
            <button type="button" className="secondary compact-btn" onClick={onResetSquad}>
              <RotateCcw size={13} /> {t('resetChanges')}
            </button>
          </div>
        )}

        {playersError && <div className="notice">{playersError}</div>}
        {squadError && <div className="notice">{squadError}</div>}

        <div className="lineup-heading">
          <strong>{t('chipsHeading')}</strong>
          <span>{t('oneChipPerGw')}</span>
        </div>

        <div className="egypt-chip-row">
          {chips.map(chip => {
            const active = activeChip === chip.name;
            const used = usedChips.includes(chip.name) && !active;

            return (
              <button
                type="button"
                key={chip.name}
                className={`egypt-chip ${active ? 'active chip-armed-glow' : ''}`}
                disabled={used || (activeChip !== null && !active) || matchInProgress}
                onClick={() => onToggleChip(chip.name)}
              >
                <strong>
                  <span>{chip.icon}</span> {chip.name}
                  {active && <Sparkles size={12} className="chip-sparkle-icon" />}
                </strong>
                <span>{active ? t('chipActive') : used ? t('chipUsed') : chip.desc}</span>
              </button>
            );
          })}
        </div>

        {selected.length === 0 ? (
          <div className="empty-squad-cta">
            <p className="muted">{t('goToMarketEmpty')}</p>
            <button type="button" className="primary" onClick={() => onNavigate('players')}>
              {t('playerMarketBtn')} →
            </button>
          </div>
        ) : (
          <div className="egypt-lineup-layout">
            <div className="pitch-3d-stage">
              <div className="egypt-pitch pitch-3d-stadium">
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
                  {starters.map((id, index) => {
                    const p = playerById.get(id);
                    if (!p) return null;

                    return (
                      <FutPlayerCard
                        key={id}
                        slotNumber={index + 1}
                        kitNumber={p.kit_number}
                        name={p.name}
                        photoUrl={p.photo_url}
                        statLabel={`£${p.price.toFixed(1)}m · ${p.points} ${t('ptsUnit')}`}
                        availabilityStatus={p.availability_status}
                        availabilityNote={p.availability_note}
                        isCaptain={captain === id}
                        isTripleCaptain={captain === id && activeChip === 'Triple Captain'}
                        isViceCaptain={viceCaptain === id && captain !== id}
                        isSelected={swapStarter === id}
                        isJustSwapped={justSwapped.includes(id)}
                        profileLabel={t('playerProfileTitle')}
                        onOpenProfile={() => onOpenPlayerProfile(id)}
                        onCardClick={
                          matchInProgress
                            ? undefined
                            : () => setSwapStarter(swapStarter === id ? null : id)
                        }
                      >
                        <button
                          type="button"
                          className={`egypt-captain-action ${captain === id ? 'chosen' : ''}`}
                          disabled={matchInProgress}
                          onClick={() => onSetCaptain(id)}
                        >
                          {captain === id ? t('captainChosen') : t('makeCaptain')}
                        </button>

                        <button
                          type="button"
                          className={`egypt-captain-action ${viceCaptain === id ? 'chosen' : ''}`}
                          disabled={matchInProgress || captain === id}
                          onClick={() => onSetViceCaptain(id)}
                        >
                          {viceCaptain === id ? t('viceChosen') : t('makeVice')}
                        </button>

                        <div className="egypt-swap-buttons">
                          {bench.map((benchId, benchIndex) => (
                            <button
                              type="button"
                              key={benchId}
                              disabled={matchInProgress}
                              onClick={() => executeSwap(id, benchId)}
                            >
                              ↔ {t('subShort')} {benchIndex + 1}
                            </button>
                          ))}
                        </div>
                      </FutPlayerCard>
                    );
                  })}
                </div>
                <p className="egypt-pitch-hint">
                  {t('pitchHint')} · ⓘ {t('tapForProfileHint')}
                </p>
              </div>
            </div>

            <aside
              className={`egypt-bench ${activeChip === 'Bench Boost' ? 'bench-boost-glow' : ''}`}
            >
              <h3>
                {t('benchTitle')}{' '}
                {activeChip === 'Bench Boost' && (
                  <span className="tag" style={{ marginInlineStart: 6 }}>
                    BOOST ON
                  </span>
                )}
              </h3>
              <p>{t('benchSub')}</p>

              {bench.map((id, index) => {
                const p = playerById.get(id);
                if (!p) return null;

                return (
                  <div
                    className={`egypt-bench-player clickable-row ${justSwapped.includes(id) ? 'swap-flash-row' : ''}`}
                    key={id}
                    onClick={() => onOpenPlayerProfile(id)}
                  >
                    <span className="egypt-sub-number">{index + 1}</span>
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} />
                    ) : (
                      <div className="player-photo">{p.name.slice(0, 1)}</div>
                    )}
                    <div className="egypt-bench-info">
                      <strong>
                        {p.kit_number != null && (
                          <span className="inline-kit-chip">#{p.kit_number}</span>
                        )}
                        {p.name}
                        {p.availability_status === 'doubtful' && (
                          <span className="fpl-flag-chip fpl-flag-chip--doubtful" style={{ marginInlineStart: 5 }}>
                            🟡 {t('availDoubtShort')}
                          </span>
                        )}
                        {p.availability_status === 'out' && (
                          <span className="fpl-flag-chip fpl-flag-chip--out" style={{ marginInlineStart: 5 }}>
                            🔴 {t('availOutShort')}
                          </span>
                        )}
                      </strong>
                      <span>
                        £{p.price.toFixed(1)}m · {p.points} {t('ptsUnit')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`egypt-bench-swap ${swapStarter ? 'ready-to-swap' : ''}`}
                      disabled={matchInProgress || !swapStarter}
                      onClick={e => {
                        e.stopPropagation();
                        if (swapStarter) executeSwap(swapStarter, id);
                      }}
                    >
                      {t('swapBtn')}
                    </button>
                    {index === 1 && (
                      <button
                        type="button"
                        className="egypt-bench-swap"
                        disabled={matchInProgress}
                        onClick={e => {
                          e.stopPropagation();
                          if (selected.length < SQUAD_SIZE) return;
                          const next = [...selected];
                          [next[5], next[6]] = [next[6], next[5]];
                          onApplyLineup(next);
                          setJustSwapped([next[5], next[6]]);
                          setSwapStarter(null);
                        }}
                        title="Promote to Sub 1"
                      >
                        ↑
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="egypt-bench-note">
                {swapStarter
                  ? `${t('benchSelectedPrefix')} ${playerById.get(swapStarter)?.name ?? ''}`
                  : t('benchSelectHint')}
              </div>
            </aside>
          </div>
        )}

        {demoMode && selected.length === SQUAD_SIZE && (
          <>
            <div className="match-lock-panel">
              <div>
                <strong>
                  {matchInProgress ? '15-minute match in progress' : 'Simulate auto-sub preview'}
                </strong>
                <p>
                  {matchInProgress
                    ? 'Select any absent starter below, then finish to test Sub 1 / Sub 2 auto-substitution.'
                    : 'Test how absent starters and captaincy promotion work.'}
                </p>
              </div>
              {!matchInProgress ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setMatchInProgress(true);
                    setDidNotPlay([]);
                    setSwapStarter(null);
                    setDemoNotice('');
                  }}
                >
                  Start preview match
                </button>
              ) : (
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    const next = [...selected];
                    let msg = 'Preview match finished.';
                    const missing = didNotPlay.filter(id => next.slice(0, 5).includes(id));
                    const moved: string[] = [];

                    for (const absent of missing) {
                      const starterIdx = next.slice(0, 5).indexOf(absent);
                      const benchIdx = next.slice(5).findIndex(id => !didNotPlay.includes(id));
                      if (starterIdx >= 0 && benchIdx >= 0) {
                        const actualBench = 5 + benchIdx;
                        const rep = next[actualBench];
                        [next[starterIdx], next[actualBench]] = [next[actualBench], next[starterIdx]];
                        moved.push(rep, absent);
                        msg += ` Auto-sub: ${playerById.get(rep)?.name} → ${playerById.get(absent)?.name}.`;
                      }
                    }

                    onApplyLineup(next);
                    if (moved.length > 0) setJustSwapped(moved);
                    setMatchInProgress(false);
                    setDidNotPlay([]);
                    setDemoNotice(msg);
                  }}
                >
                  Finish & auto-sub
                </button>
              )}
            </div>

            {matchInProgress && (
              <div className="did-not-play">
                <label htmlFor="did-not-play">Absent starter(s)</label>
                <select
                  id="did-not-play"
                  multiple
                  value={didNotPlay}
                  onChange={e =>
                    setDidNotPlay(Array.from(e.target.selectedOptions, o => o.value))
                  }
                >
                  {starters.map(id => (
                    <option key={id} value={id}>
                      {playerById.get(id)?.name ?? id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {squadError && (
          <div className="notice inline-notice spring-pop" style={{ marginTop: 12 }}>
            <span className="toast-content">
              <AlertTriangle size={16} />
              {squadError}
            </span>
          </div>
        )}

        {(sessionMessage || demoNotice) && (
          <div className="notice inline-notice celebration-toast spring-pop">
            <span className="toast-content">
              <CheckCircle2 size={16} />
              {sessionMessage || demoNotice}
            </span>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                onClearMessage();
                setDemoNotice('');
              }}
            >
              {t('dismiss')}
            </button>
          </div>
        )}

        <div className="transfer-controls">
          <button
            type="button"
            className="primary save-squad-cta"
            disabled={
              squadSaving ||
              squadLoading ||
              matchInProgress ||
              isTransfersLocked ||
              selected.length !== SQUAD_SIZE
            }
            onClick={onSaveSquad}
          >
            {isTransfersLocked
              ? t('transfersLockedBtn')
              : squadSaving
                ? t('savingSquadBtn')
                : !hasUnsaved && selected.length === SQUAD_SIZE
                  ? `✓ ${t('savedSquadBadge')}`
                  : t('saveSquadBtn')}
          </button>
        </div>

        <p className="muted tiny">{demoMode ? t('demoSquadNote') : t('realSquadNote')}</p>
          </>
        )}
      </section>

      <section
        className="panel stagger-item"
        style={{ '--stagger-i': 1 } as React.CSSProperties}
      >
        <div className="panel-heading">
          <div>
            <h3>{t('transferAllowanceTitle')}</h3>
            <p>{t('transferAllowanceSub')}</p>
          </div>
          <ArrowLeftRight color="#dfbd62" />
        </div>
        <div className="transfer-summary">
          <div>
            <span>{t('freeTransfersLabel')}</span>
            <strong>{freeTransfers}</strong>
          </div>
          <div>
            <span>{t('usedTransfersLabel')}</span>
            <strong>{transfersUsed}</strong>
          </div>
          <div>
            <span>{t('pointsHitLabel')}</span>
            <strong className={pointsHits > 0 ? 'pts-neg' : ''}>
              −{pointsHits} {t('ptsUnit')}
            </strong>
          </div>
        </div>
      </section>
    </>
  );
}
