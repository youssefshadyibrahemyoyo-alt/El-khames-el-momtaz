import React, { useMemo, useState } from 'react';
import type { LeaguePlayer, Screen } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { isOverBudget, SQUAD_BUDGET, SQUAD_SIZE } from '../lib/squadRules';
import AnimatedNumber from '../components/AnimatedNumber';

type PlayerMarketScreenProps = {
  players: LeaguePlayer[];
  playersLoading: boolean;
  playersError: string;
  selected: string[];
  selectedCost: number;
  onAddOrRemovePlayer: (player: LeaguePlayer) => void;
  onNavigate: (screen: Screen) => void;
};

export default function PlayerMarketScreen({
  players,
  playersLoading,
  playersError,
  selected,
  selectedCost,
  onAddOrRemovePlayer,
  onNavigate,
}: PlayerMarketScreenProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'price' | 'points' | 'name'>('points');

  const activeCount = useMemo(() => players.filter(p => p.is_active).length, [players]);

  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => {
        const visible = p.is_active || selected.includes(p.id);
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesPrice =
          priceFilter === 'all' ||
          (priceFilter === 'under5' && p.price < 5) ||
          (priceFilter === '5to7' && p.price >= 5 && p.price <= 7) ||
          (priceFilter === 'over7' && p.price > 7);
        return visible && matchesSearch && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'points') return b.points - a.points || b.price - a.price;
        if (sortBy === 'price') return b.price - a.price || b.points - a.points;
        return a.name.localeCompare(b.name);
      });
  }, [players, selected, search, priceFilter, sortBy]);

  return (
    <section
      className="panel stagger-item"
      style={{ '--stagger-i': 0 } as React.CSSProperties}
    >
      <div className="panel-heading">
        <div>
          <h3>{t('marketTitle')}</h3>
          <p>{t('marketSub')}</p>
        </div>
        <span className="tag">
          {activeCount} {t('availableCount')}
        </span>
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
              value={Math.max(0, SQUAD_BUDGET - selectedCost)}
              decimals={1}
              prefix="£"
              suffix="m"
            />
          </strong>
        </div>
      </div>

      <div className="budget-track" style={{ marginTop: 14 }}>
        <span style={{ width: `${Math.min((selectedCost / SQUAD_BUDGET) * 100, 100)}%` }} />
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
          onChange={e => setSortBy(e.target.value as 'price' | 'points' | 'name')}
        >
          <option value="points">{t('sortByPoints')}</option>
          <option value="price">{t('sortByPrice')}</option>
          <option value="name">{t('sortByName')}</option>
        </select>
      </div>

      <div className="player-list" key={sortBy}>
        {filteredPlayers.map((p, idx) => {
          const isSelected = selected.includes(p.id);
          const cannotAfford = !isSelected && isOverBudget(selectedCost + p.price);
          const squadFull = !isSelected && selected.length >= SQUAD_SIZE;

          return (
            <div
              className={`player-row market-player-card stagger-item ${isSelected ? 'in-squad-row' : ''}`}
              style={{ '--stagger-i': Math.min(idx, 12) } as React.CSSProperties}
              key={p.id}
            >
              {p.photo_url ? (
                <img className="leaderboard-photo" src={p.photo_url} alt={p.name} />
              ) : (
                <div className="player-photo small-photo">{p.name.slice(0, 1)}</div>
              )}

              <div className="player-info">
                <strong>{p.name}</strong>
                <span>
                  {!p.is_active
                    ? t('inactiveInSquad')
                    : isSelected
                      ? t('inYourSquad')
                      : t('availableToSelect')}{' '}
                  · {p.points} {t('ptsUnit')} ({p.matchesPlayed} {t('matchesShort')})
                </span>
              </div>

              <strong className="price">£{p.price.toFixed(1)}m</strong>

              <button
                type="button"
                className={isSelected ? 'secondary compact-btn' : 'primary compact-btn'}
                disabled={squadFull || cannotAfford}
                onClick={() => onAddOrRemovePlayer(p)}
              >
                {isSelected ? t('removePlayerBtn') : t('addPlayerBtn')}
              </button>
            </div>
          );
        })}
      </div>

      <div className="transfer-controls">
        <button
          type="button"
          className="primary"
          disabled={selected.length !== SQUAD_SIZE || isOverBudget(selectedCost)}
          onClick={() => onNavigate('squad')}
        >
          {selected.length === SQUAD_SIZE
            ? t('pickMyTeamBtn')
            : `${SQUAD_SIZE - selected.length} ${t('selectMorePlayers')}`}
        </button>
      </div>
    </section>
  );
}
