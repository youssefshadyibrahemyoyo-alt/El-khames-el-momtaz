import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Eye,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import type { Gameweek, ScoringRule, Screen, Standing } from '../types/league';
import { SQUAD_BUDGET } from '../lib/squadRules';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import AnimatedNumber from '../components/AnimatedNumber';
import InstallAppBanner from '../components/InstallAppBanner';
import LatestNewsSection from '../components/LatestNewsSection';

type Props = {
  isAdmin: boolean;
  demoMode: boolean;
  selectedCost: number;
  managerBudget?: number;
  effectiveDemoPoints: number;
  myStanding: Standing | null;
  myRank: number;
  standingsCount: number;
  standingsLoading: boolean;
  standingsError: string;
  gameweek: Gameweek | null;
  targetGw?: Gameweek | null;
  isSquadSavedForTargetGw?: boolean;
  scoringRules: ScoringRule[];
  onNavigate: (s: Screen) => void;
};

export default function OverviewScreen({
  isAdmin,
  demoMode,
  selectedCost,
  managerBudget = SQUAD_BUDGET,
  effectiveDemoPoints,
  myStanding,
  myRank,
  standingsCount,
  standingsLoading,
  standingsError,
  gameweek,
  targetGw = null,
  isSquadSavedForTargetGw = false,
  scoringRules,
  onNavigate,
}: Props) {
  const { t } = useLanguage();
  const [guideOpen, setGuideOpen] = useState(false);

  // Interactive What-If Thursday Points Simulator state
  const [simMatches, setSimMatches] = useState(1);
  const [simGoals, setSimGoals] = useState(2);
  const [simAssists, setSimAssists] = useState(1);
  const [simSaves, setSimSaves] = useState(0);
  const [simMvp, setSimMvp] = useState(1);
  const [simYellows, setSimYellows] = useState(0);
  const [simMultiplier, setSimMultiplier] = useState<1 | 2 | 3>(2);

  const remaining = Math.max(0, managerBudget - selectedCost);

  const rulePointsMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of scoringRules) {
      m[r.key] = Number(r.points) || 0;
    }
    return m;
  }, [scoringRules]);

  const projectedSimPoints = useMemo(() => {
    const appPts = (rulePointsMap.appearance ?? 2) * simMatches;
    const goalPts = (rulePointsMap.goal ?? 5) * simGoals;
    const hatTrickBonus = simGoals >= 3 ? (rulePointsMap.hat_trick ?? 3) : 0;
    const assistPts = (rulePointsMap.assist ?? 3) * simAssists;
    const savePts =
      rulePointsMap.save != null
        ? rulePointsMap.save * simSaves
        : Math.floor(simSaves / 3) * (rulePointsMap.saves_3 ?? 1);
    const mvpPts = (rulePointsMap.mvp ?? 3) * simMvp;
    const yellowPts = (rulePointsMap.yellow_card ?? -1) * simYellows;
    const base = appPts + goalPts + hatTrickBonus + assistPts + savePts + mvpPts + yellowPts;
    return base * simMultiplier;
  }, [rulePointsMap, simAssists, simGoals, simMatches, simMultiplier, simMvp, simSaves, simYellows]);

  const labelForRule = (rule: ScoringRule) => {
    const key = `rule_${rule.key}` as TranslationKey;
    const translated = t(key);
    return translated === key ? rule.label : translated;
  };

  return (
    <>
      <InstallAppBanner />

      {!demoMode && targetGw && (
        <div
          className={`squad-readiness-banner ${
            isSquadSavedForTargetGw ? 'squad-readiness-ok' : 'squad-readiness-warn'
          }`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isSquadSavedForTargetGw ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <div>
              <strong>
                GW #{targetGw.number} ·{' '}
                {isSquadSavedForTargetGw
                  ? t('squadReadyBannerTitle')
                  : t('squadIncompleteBannerTitle')}
              </strong>
              <p>
                {isSquadSavedForTargetGw
                  ? t('squadReadyBannerSub')
                  : t('squadIncompleteBannerSub')}
              </p>
            </div>
          </div>

          <button
            type="button"
            className={isSquadSavedForTargetGw ? 'secondary compact-btn' : 'primary compact-btn'}
            onClick={() => onNavigate('squad')}
          >
            {t('viewSquadBtn')}
          </button>
        </div>
      )}

      <section className="hero stagger-item" style={{ '--stagger-i': 0 } as React.CSSProperties}>
        <div className="hero-floodlight hero-floodlight-left" aria-hidden="true" />
        <div className="hero-floodlight hero-floodlight-right" aria-hidden="true" />
        <div className="hero-content">
          <span className="tag">{t('heroTag')}</span>
          <h1>
            {t('heroTitleLine1')} <em>{t('heroTitleAccent')}</em>
          </h1>
          <p>{t('heroDesc')}</p>
          <div className="hero-actions">
            {isAdmin && (
              <button className="primary" onClick={() => onNavigate('admin')}>
                {t('openAdminBtn')}
              </button>
            )}
            <button
              className={isAdmin ? 'secondary' : 'primary'}
              onClick={() => onNavigate('squad')}
            >
              {t('viewSquadBtn')}
            </button>
            <button className="secondary" onClick={() => onNavigate('players')}>
              {t('playerMarketBtn')}
            </button>
          </div>
        </div>
        <div className="hero-ball hero-parallax-ball" aria-hidden="true">
          ⚽
        </div>
        <div className="hero-lines hero-parallax-lines" aria-hidden="true" />
      </section>

      <section className="stats-grid">
        <div className="stat-card stagger-item" style={{ '--stagger-i': 1 } as React.CSSProperties}>
          <span>{t('myTeamValue')}</span>
          <strong>
            <AnimatedNumber value={selectedCost} decimals={1} prefix="£" suffix="m" />{' '}
            <small>/ £{managerBudget.toFixed(1)}m</small>
          </strong>
          <small className="positive">
            <CheckCircle2 size={13} />{' '}
            <AnimatedNumber value={remaining} decimals={1} prefix="£" suffix="m " />
            {t('remainingBudget')}
          </small>
        </div>

        <div className="stat-card stagger-item" style={{ '--stagger-i': 2 } as React.CSSProperties}>
          <span>{demoMode ? t('sessionPoints') : t('myPoints')}</span>
          <strong>
            {demoMode ? (
              <AnimatedNumber value={effectiveDemoPoints} decimals={0} />
            ) : (
              <AnimatedNumber value={myStanding?.total_points ?? 0} decimals={0} />
            )}{' '}
            <small>{t('ptsUnit')}</small>
          </strong>
          <small>
            {demoMode
              ? t('previewPoints')
              : standingsLoading
                ? t('loadingPoints')
                : standingsError
                  ? t('couldNotLoadPoints')
                  : myStanding
                    ? `#${myRank} / ${standingsCount} · +${myStanding.last_gameweek_points} ${t('lastGwPts')}`
                    : t('noPointsYet')}
          </small>
        </div>

        <div className="stat-card stagger-item" style={{ '--stagger-i': 3 } as React.CSSProperties}>
          <span>{t('gwStatusCard')}</span>
          <strong className="status-text">
            {demoMode ? 'Active' : (gameweek?.status ?? t('notStarted'))}
          </strong>
          <small>
            <span className="status-dot" /> {t('autoRolloverEnabled')}
          </small>
        </div>
      </section>

      <LatestNewsSection demoMode={demoMode} isAdmin={isAdmin} />

      {/* Interactive Matchday Quick Hub + Live What-If Points Simulator */}
      <section className="flagship-overview-lab" data-scroll-reveal>
        <div className="overview-quick-tiles">
          <button
            type="button"
            className="overview-action-tile hover-lift-card"
            onClick={() => onNavigate('squad')}
          >
            <span className="tile-orb emerald-orb">
              <Users size={18} />
            </span>
            <div>
              <strong>{t('navSquad')}</strong>
              <small>{t('viewSquadBtn')}</small>
            </div>
          </button>

          <button
            type="button"
            className="overview-action-tile hover-lift-card"
            onClick={() => onNavigate('players')}
          >
            <span className="tile-orb gold-orb">
              <CircleUserRound size={18} />
            </span>
            <div>
              <strong>{t('navPlayers')}</strong>
              <small>{t('marketCompareDrawerTitle')}</small>
            </div>
          </button>

          <button
            type="button"
            className="overview-action-tile hover-lift-card"
            onClick={() => onNavigate('matches')}
          >
            <span className="tile-orb blue-orb">
              <Swords size={18} />
            </span>
            <div>
              <strong>{t('navMatches')}</strong>
              <small>{t('fanPollTitle')}</small>
            </div>
          </button>

          <button
            type="button"
            className="overview-action-tile hover-lift-card"
            onClick={() => onNavigate('leaderboard')}
          >
            <span className="tile-orb crimson-orb">
              <Trophy size={18} />
            </span>
            <div>
              <strong>{t('navLeaderboard')}</strong>
              <small>{t('forfeitReelsStripTitle')}</small>
            </div>
          </button>
        </div>

        {/* Interactive What-If Points Simulator */}
        <div className="panel points-sim-panel">
          <div className="points-sim-head">
            <div>
              <span className="eyebrow">
                <Calculator size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 5 }} />
                {t('simCardEyebrow')}
              </span>
              <h4>{t('simCardTitle')}</h4>
              <p className="muted tiny" style={{ margin: '2px 0 0' }}>
                {t('simCardSub')}
              </p>
            </div>

            <div className="points-sim-scorebox">
              <span>{t('simProjectedHaul')}</span>
              <strong>
                <AnimatedNumber value={projectedSimPoints} decimals={0} />{' '}
                <small>{t('ptsUnit')}</small>
              </strong>
            </div>
          </div>

          <div className="points-sim-multipliers">
            {(
              [
                [1, t('simMultiplierNormal')],
                [2, `👑 ${t('simMultiplierCap')}`],
                [3, `⚡ ${t('simMultiplierTriple')}`],
              ] as const
            ).map(([mult, label]) => (
              <button
                key={mult}
                type="button"
                className={`sim-mult-pill ${simMultiplier === mult ? 'active' : ''}`}
                onClick={() => setSimMultiplier(mult)}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              className="secondary compact-btn"
              onClick={() => {
                setSimMatches(1);
                setSimGoals(0);
                setSimAssists(0);
                setSimSaves(0);
                setSimMvp(0);
                setSimYellows(0);
                setSimMultiplier(1);
              }}
            >
              <RotateCcw size={12} /> {t('simResetBtn')}
            </button>
          </div>

          <div className="points-sim-steppers">
            {[
              { label: `🏟️ ${t('matchesShort')}`, val: simMatches, set: setSimMatches, max: 6 },
              { label: `⚽ ${t('rule_goal')}`, val: simGoals, set: setSimGoals, max: 12 },
              { label: `🎯 ${t('rule_assist')}`, val: simAssists, set: setSimAssists, max: 12 },
              { label: `🧤 ${t('rule_save')}`, val: simSaves, set: setSimSaves, max: 25 },
              { label: `👑 ${t('mvpBadge')}`, val: simMvp, set: setSimMvp, max: 5 },
              { label: `🟨 ${t('rule_yellow_card')}`, val: simYellows, set: setSimYellows, max: 4 },
            ].map(ctrl => (
              <div key={ctrl.label} className="sim-stepper-box">
                <span className="sim-stepper-label">{ctrl.label}</span>
                <div className="sim-stepper-controls">
                  <button
                    type="button"
                    className="sim-step-btn"
                    onClick={() => ctrl.set(v => Math.max(0, v - 1))}
                    aria-label="Decrease"
                  >
                    <Minus size={12} />
                  </button>
                  <strong>{ctrl.val}</strong>
                  <button
                    type="button"
                    className="sim-step-btn"
                    onClick={() => ctrl.set(v => Math.min(ctrl.max, v + 1))}
                    aria-label="Increase"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collapsible Rules & Official Scoring Accordion */}
      <section className="panel guide-accordion-panel" data-scroll-reveal>
        <button
          type="button"
          className="guide-accordion-trigger"
          aria-expanded={guideOpen}
          onClick={() => setGuideOpen(prev => !prev)}
        >
          <div className="guide-accordion-left">
            <span className="guide-accordion-icon">
              <BookOpen size={16} />
            </span>
            <div>
              <strong>{t('rulesAndScoringToggle')}</strong>
              <span>{t('rulesAndScoringSub')}</span>
            </div>
          </div>

          <span className="guide-accordion-cta">
            <span>{guideOpen ? t('hideGuideBtn') : t('showGuideBtn')}</span>
            <ChevronDown
              size={16}
              className={`guide-chevron ${guideOpen ? 'guide-chevron-open' : ''}`}
            />
          </span>
        </button>

        <div className={`guide-accordion-collapse ${guideOpen ? 'is-open' : ''}`}>
          <div className="guide-accordion-inner">
            <div className="home-bottom-grid" style={{ marginTop: 16 }}>
              <div>
                <div className="lineup-heading" style={{ marginTop: 0 }}>
                  <strong>{t('howLeagueWorks')}</strong>
                  <span className="tag">{t('leagueRulesTag')}</span>
                </div>
                <div className="rule-grid rule-grid-2col">
                  <div className="hover-lift-card">
                    <ShieldCheck />
                    <strong>{t('ruleSquadTitle')}</strong>
                    <span>{t('ruleSquadDesc')}</span>
                  </div>
                  <div className="hover-lift-card">
                    <Award />
                    <strong>{t('ruleCapTitle')}</strong>
                    <span>{t('ruleCapDesc')}</span>
                  </div>
                  <div className="hover-lift-card">
                    <Sparkles />
                    <strong>{t('ruleTransferTitle')}</strong>
                    <span>{t('ruleTransferDesc')}</span>
                  </div>
                  <div className="hover-lift-card">
                    <Eye />
                    <strong>{t('ruleInspectTitle')}</strong>
                    <span>{t('ruleInspectDesc')}</span>
                  </div>
                </div>
              </div>

              {scoringRules.length > 0 && (
                <div>
                  <div className="lineup-heading" style={{ marginTop: 0 }}>
                    <strong>{t('scoringHeading')}</strong>
                    <span className="tag">
                      <Trophy size={11} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                      {t('pointsTag')}
                    </span>
                  </div>
                  <div className="scoring-pills-grid">
                    {scoringRules.map(rule => (
                      <div key={rule.key} className="scoring-pill hover-lift-card">
                        <span>{labelForRule(rule)}</span>
                        <strong className={rule.points >= 0 ? 'pts-pos' : 'pts-neg'}>
                          {rule.points > 0 ? `+${rule.points}` : rule.points} {t('ptsUnit')}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
