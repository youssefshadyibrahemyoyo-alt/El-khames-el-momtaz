import React from 'react';
import { Award, CheckCircle2, Eye, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import type { Gameweek, ScoringRule, Screen, Standing } from '../types/league';
import { SQUAD_BUDGET } from '../lib/squadRules';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import AnimatedNumber from '../components/AnimatedNumber';

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
  scoringRules,
  onNavigate,
}: Props) {
  const { t } = useLanguage();
  const remaining = Math.max(0, managerBudget - selectedCost);

  const labelForRule = (rule: ScoringRule) => {
    const key = `rule_${rule.key}` as TranslationKey;
    const translated = t(key);
    return translated === key ? rule.label : translated;
  };

  return (
    <>
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
        <div className="hero-ball" aria-hidden="true">
          ⚽
        </div>
        <div className="hero-lines" aria-hidden="true" />
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

      <section
        className="panel stagger-item"
        style={{ '--stagger-i': 4 } as React.CSSProperties}
      >
        <div className="panel-heading">
          <div>
            <h3>{t('howLeagueWorks')}</h3>
            <p>{t('howLeagueSub')}</p>
          </div>
          <span className="tag">{t('leagueRulesTag')}</span>
        </div>
        <div className="rule-grid">
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
      </section>

      {scoringRules.length > 0 && (
        <section
          className="panel stagger-item"
          style={{ '--stagger-i': 5 } as React.CSSProperties}
        >
          <div className="panel-heading">
            <div>
              <h3>{t('scoringHeading')}</h3>
              <p>{t('scoringSub')}</p>
            </div>
            <span className="tag">
              <Trophy size={11} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
              {t('pointsTag')}
            </span>
          </div>
          <div className="scoring-pills-grid">
            {scoringRules.map((rule, idx) => (
              <div
                key={rule.key}
                className="scoring-pill hover-lift-card stagger-item"
                style={{ '--stagger-i': idx + 2 } as React.CSSProperties}
              >
                <span>{labelForRule(rule)}</span>
                <strong className={rule.points >= 0 ? 'pts-pos' : 'pts-neg'}>
                  {rule.points > 0 ? `+${rule.points}` : rule.points} {t('ptsUnit')}
                </strong>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
