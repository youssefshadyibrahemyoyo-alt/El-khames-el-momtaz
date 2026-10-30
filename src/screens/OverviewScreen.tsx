import React, { useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Eye,
  ShieldCheck,
  Sparkles,
  Trophy,
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
  const remaining = Math.max(0, managerBudget - selectedCost);

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
