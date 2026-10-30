import React, { useMemo, useState } from 'react';
import { ArrowRight, RotateCcw, Shuffle, Users } from 'lucide-react';
import type { LeaguePlayer, Screen } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { autoFillSquad, isOverBudget, SQUAD_BUDGET, SQUAD_SIZE } from '../lib/squadRules';
import AnimatedNumber from '../components/AnimatedNumber';

type MarketSort = 'price' | 'points' | 'form' | 'ownership' | 'name';

type PlayerMarketScreenProps = {
  players: LeaguePlayer[];
  playersLoading: boolean;
  playersError: string;
  selected: string[];
  selectedCost: number;
  managerBudget?: number;
  transferLocked?: boolean;
  onAddOrRemovePlayer: (player: LeaguePlayer) => void;
  onReplaceSelection?: (nextIds: string[]) => void;
  onOpenPlayerProfile: (playerId: string) => void;
  onNavigate: (screen: Screen) => void;
};

export default function PlayerMarketScreen({
  players,
  playersLoading,
  playersError,
  selected,
  selectedCost,
  managerBudget = SQUAD_BUDGET,
  transferLocked = false,
  onAddOrRemovePlayer,
  onReplaceSelection,
  onOpenPlayerProfile,
  onNavigate,
}: PlayerMarketScreenProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<MarketSort>('points');

  const activeCount = useMemo(() => players.filter(p => p.is_active).length, [players]);

  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => {
        const visible = p.is_active || selected.includes(p.id);
        const q = search.toLowerCase();
        const matchesSearch =
          p.name.toLowerCase().includes(q) ||
          (p.favourite_team ?? '').toLowerCase().includes(q);
        const matchesPrice =
          priceFilter === 'all' ||
          (priceFilter === 'under5' && p.price < 5) ||
          (priceFilter === '5to7' && p.price >= 5 && p.price <= 7) ||
          (priceFilter === 'over7' && p.price > 7);
        return visible && matchesSearch && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'ownership') {
          return (b.ownership_pct ?? 0) - (a.ownership_pct ?? 0) || b.points - a.points;
        }
        if (sortBy === 'form') return (b.form ?? 0) - (a.form ?? 0) || b.points - a.points;
        if (sortBy === 'points') return b.points - a.points || b.price - a.price;
        if (sortBy === 'price') return b.price - a.price || b.points - a.points;
        return a.name.localeCompare(b.name);
      });
  }, [players, selected, search, priceFilter, sortBy]);

  function handleAutoFill() {
    if (transferLocked || !onReplaceSelection) return;
    const seed = selected.length >= SQUAD_SIZE ? [] : selected;
    const filled = autoFillSquad({
      players,
      selected: seed,
      budget: managerBudget,
    });
    onReplaceSelection(filled);
  }

  function handleClear() {
    if (transferLocked || !onReplaceSelection || selected.length === 0) return;
    onReplaceSelection([]);
  }

  const remainingBudget = managerBudget - selectedCost;

  return (
    <section
      className="panel market-panel-with-dock stagger-item"
      style={{ '--stagger-i': 0 } as React.CSSProperties}
    >
      <div className="panel-heading">
        <div>
          <h3>{t('marketTitle')}</h3>
          <p>
            {t('marketSub')} · {t('tapForProfileHint')}
          </p>
        </div>
        <div className="market-header-actions">
          {!transferLocked && onReplaceSelection && (
            <>
              <button
                type="button"
                className="secondary compact-btn market-autofill-btn"
                onClick={handleAutoFill}
              >
                <Shuffle size={14} />{' '}
                {selected.length >= SQUAD_SIZE ? t('reshuffleBtn') : t('autoFillBtn')}
              </button>
              {selected.length > 0 && (
                <button
                  type="button"
                  className="secondary compact-btn"
                  onClick={handleClear}
                  title={t('clearSquadBtn')}
                >
                  <RotateCcw size={13} /> {t('clearSquadBtn')}
                </button>
              )}
            </>
          )}
          <span className="tag">
            {activeCount} {t('availableCount')}
          </span>
        </div>
      </div>

      <div className="transfer-summary">
        <div>
          <span>{t('squadSelectedLabel')}</span>
          <strong>
            {selected.length} / {SQUAD_SIZE}
          </strong>
        </div>
        <div>
          <span>{t('budgetUsedLabel')}</span>
          <strong>
            <AnimatedNumber value={selectedCost} decimals={1} prefix="£" suffix="m" />
          </strong>
        </div>
        <div>
          <span>{t('budgetRemainingLabel')}</span>
          <strong>
            <AnimatedNumber
              value={Math.max(0, managerBudget - selectedCost)}
              decimals={1}
              prefix="£"
              suffix="m"
            />
          </strong>
        </div>
      </div>

      <div className="budget-track" style={{ marginTop: 14 }}>
        <span style={{ width: `${Math.min((selectedCost / managerBudget) * 100, 100)}%` }} />
      </div>

      {playersLoading && <p className="muted">{t('loadingPoints')}</p>}
      {playersError && <div className="notice">{playersError}</div>}

      <div className="player-market-filters three-col">
        <input
          type="search"
          className="player-search"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          className="player-price-filter"
          value={priceFilter}
          onChange={e => setPriceFilter(e.target.value)}
        >
          <option value="all">{t('allPrices')}</option>
          <option value="under5">{t('under5')}</option>
          <option value="5to7">{t('from5to7')}</option>
          <option value="over7">{t('over7')}</option>
        </select>

        <select
          className="player-price-filter"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as MarketSort)}
        >
          <option value="points">{t('sortByPoints')}</option>
          <option value="form">{t('sortByForm')}</option>
          <option value="ownership">{t('sortByOwnership')}</option>
          <option value="price">{t('sortByPrice')}</option>
          <option value="name">{t('sortByName')}</option>
        </select>
      </div>

      <div className="player-list" key={sortBy}>
        {filteredPlayers.map((p, idx) => {
          const isSelected = selected.includes(p.id);
          const cannotAfford = !isSelected && isOverBudget(selectedCost + p.price, managerBudget);
          const squadFull = !isSelected && selected.length >= SQUAD_SIZE;
          const metaExtras = [p.favourite_team, p.playstyle].filter(Boolean).join(' · ');

          return (
            <div
              className={`player-row market-player-card clickable-row stagger-item ${isSelected ? 'in-squad-row' : ''}`}
              style={{ '--stagger-i': Math.min(idx, 12) } as React.CSSProperties}
              key={p.id}
              onClick={() => onOpenPlayerProfile(p.id)}
            >
              {p.photo_url ? (
                <img className="leaderboard-photo" src={p.photo_url} alt={p.name} />
              ) : (
                <div className="player-photo small-photo">{p.name.slice(0, 1)}</div>
              )}

              <div className="player-info">
                <strong>
                  {p.kit_number != null && (
                    <span className="inline-kit-chip">#{p.kit_number}</span>
                  )}
                  {p.name}
                  {p.availability_status === 'doubtful' && (
                    <span
                      className="fpl-flag-chip fpl-flag-chip--doubtful"
                      style={{ marginInlineStart: 6 }}
                      title={p.availability_note || t('availDoubtful')}
                    >
                      🟡 {t('availDoubtShort')}
                    </span>
                  )}
                  {p.availability_status === 'out' && (
                    <span
                      className="fpl-flag-chip fpl-flag-chip--out"
                      style={{ marginInlineStart: 6 }}
                      title={p.availability_note || t('availOut')}
                    >
                      🔴 {t('availOutShort')}
                    </span>
                  )}
                  {(p.form ?? 0) > 0 && (
                    <span
                      className={`market-form-pill ${(p.form ?? 0) >= 8 ? 'market-form-hot' : ''}`}
                      style={{ marginInlineStart: 6 }}
                      title="Average fantasy points over last 3 Gameweeks"
                    >
                      {(p.form ?? 0) >= 8 ? '🔥 ' : ''}
                      {t('hotFormBadge')} {Number(p.form).toFixed(1)}
                    </span>
                  )}
                  <span className="ownership-pill" style={{ marginInlineStart: 6 }}>
                    <Users size={11} /> {Math.round(Number(p.ownership_pct ?? 0))}% {t('ownedSuffix')}
                  </span>
                </strong>
                <span>
                  {!p.is_active
                    ? t('inactiveInSquad')
                    : isSelected
                      ? t('inYourSquad')
                      : t('availableToSelect')}{' '}
                  · {p.points} {t('ptsUnit')} ({p.matchesPlayed} {t('matchesShort')})
                  {metaExtras ? ` · ${metaExtras}` : ''}
                  {p.availability_note ? ` · ⚠️ ${p.availability_note}` : ''}
                </span>
              </div>

              <div className="market-price-col">
                <strong className="price">£{p.price.toFixed(1)}m</strong>
                {(p.last_price_change ?? 0) !== 0 && (
                  <span
                    className={`price-arrow-chip ${
                      (p.last_price_change ?? 0) > 0 ? 'price-arrow-up' : 'price-arrow-down'
                    }`}
                  >
                    {(p.last_price_change ?? 0) > 0
                      ? `▲ +${Number(p.last_price_change).toFixed(1)}`
                      : `▼ ${Number(p.last_price_change).toFixed(1)}`}
                  </span>
                )}
              </div>

              <button
                type="button"
                className={isSelected ? 'secondary compact-btn' : 'primary compact-btn'}
                disabled={transferLocked || squadFull || cannotAfford}
                onClick={e => {
                  e.stopPropagation();
                  onAddOrRemovePlayer(p);
                }}
              >
                {isSelected ? t('removePlayerBtn') : t('addPlayerBtn')}
              </button>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Squad Dock */}
      <div className="market-sticky-dock">
        <div className="market-dock-meta">
          <div className="market-dock-dots" aria-hidden="true">
            {Array.from({ length: SQUAD_SIZE }).map((_, idx) => (
              <span
                key={idx}
                className={`dock-slot-dot ${idx < selected.length ? 'is-filled' : ''}`}
              />
            ))}
          </div>
          <div className="market-dock-numbers">
            <strong>
              {selected.length} / {SQUAD_SIZE}
            </strong>
            <span className={remainingBudget < 0 ? 'pts-neg' : 'positive'}>
              £{Math.max(0, remainingBudget).toFixed(1)}m {t('dockBudgetLeft')}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="primary compact-btn market-dock-cta"
          onClick={() => onNavigate('squad')}
        >
          <span>
            {selected.length === SQUAD_SIZE
              ? t('pickMyTeamBtn')
              : `${SQUAD_SIZE - selected.length} ${t('selectMorePlayers')}`}
          </span>
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}
