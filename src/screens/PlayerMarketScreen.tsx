import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Flame,
  LayoutGrid,
  List,
  RotateCcw,
  Shuffle,
  Sparkles,
  Swords,
  Users,
  X,
} from 'lucide-react';
import type { LeaguePlayer, Screen } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import { autoFillSquad, isOverBudget, SQUAD_BUDGET, SQUAD_SIZE } from '../lib/squadRules';
import AnimatedNumber from '../components/AnimatedNumber';
import FutPlayerCard from '../components/FutPlayerCard';

type MarketSort = 'price' | 'points' | 'form' | 'ownership' | 'name';
type QuickPreset = 'all' | 'hot' | 'diff' | 'mine';

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
  const [quickPreset, setQuickPreset] = useState<QuickPreset>('all');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const activeCount = useMemo(() => players.filter(p => p.is_active).length, [players]);

  const playerMap = useMemo(() => {
    const m = new Map<string, LeaguePlayer>();
    players.forEach(p => m.set(p.id, p));
    return m;
  }, [players]);

  const comparePlayers = useMemo(
    () => compareIds.map(id => playerMap.get(id)).filter((p): p is LeaguePlayer => Boolean(p)),
    [compareIds, playerMap]
  );

  function toggleCompare(playerId: string) {
    setCompareIds(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
      if (prev.length >= 2) return [prev[1], playerId];
      return [...prev, playerId];
    });
  }

  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => {
        const visible = p.is_active || selected.includes(p.id);
        const q = search.toLowerCase();
        const matchesSearch =
          p.name.toLowerCase().includes(q) ||
          (p.favourite_team ?? '').toLowerCase().includes(q) ||
          String(p.kit_number ?? '').includes(q);
        const matchesPrice =
          priceFilter === 'all' ||
          (priceFilter === 'under5' && p.price < 5) ||
          (priceFilter === '5to7' && p.price >= 5 && p.price <= 7) ||
          (priceFilter === 'over7' && p.price > 7);
        const matchesPreset =
          quickPreset === 'all' ||
          (quickPreset === 'hot' && (p.form ?? 0) >= 6) ||
          (quickPreset === 'diff' && (p.ownership_pct ?? 0) < 25) ||
          (quickPreset === 'mine' && selected.includes(p.id));

        return visible && matchesSearch && matchesPrice && matchesPreset;
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
  }, [players, selected, search, priceFilter, quickPreset, sortBy]);

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
          <div className="market-view-switcher" role="tablist">
            <button
              type="button"
              className={`market-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={14} /> {t('marketViewList')}
            </button>
            <button
              type="button"
              className={`market-view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid size={14} /> {t('marketViewCards')}
            </button>
          </div>

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

      {/* Interactive Head-to-Head VS Scout Comparison Drawer */}
      {comparePlayers.length > 0 && (
        <div className="market-vs-drawer">
          <div className="market-vs-head">
            <strong>
              <Swords size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 6, color: 'var(--gold)' }} />
              {t('marketCompareDrawerTitle')}
            </strong>
            <button
              type="button"
              className="secondary compact-btn"
              onClick={() => setCompareIds([])}
            >
              <X size={13} /> {t('marketCompareClearBtn')}
            </button>
          </div>

          {comparePlayers.length === 1 ? (
            <div className="market-vs-single-prompt">
              <strong>{comparePlayers[0].name}</strong> —{' '}
              <span className="muted">{t('marketComparePickSecond')}</span>
            </div>
          ) : (
            (() => {
              const [pA, pB] = comparePlayers;
              const valA = pA.price > 0 ? pA.points / pA.price : 0;
              const valB = pB.price > 0 ? pB.points / pB.price : 0;
              const metrics = [
                {
                  label: t('ptsUnit'),
                  a: pA.points,
                  b: pB.points,
                  fmt: (n: number) => `${n}`,
                  higherBetter: true,
                },
                {
                  label: t('hotFormBadge'),
                  a: Number(pA.form ?? 0),
                  b: Number(pB.form ?? 0),
                  fmt: (n: number) => n.toFixed(1),
                  higherBetter: true,
                },
                {
                  label: t('marketValueMetric'),
                  a: valA,
                  b: valB,
                  fmt: (n: number) => n.toFixed(2),
                  higherBetter: true,
                },
                {
                  label: t('sortByPrice'),
                  a: pA.price,
                  b: pB.price,
                  fmt: (n: number) => `£${n.toFixed(1)}m`,
                  higherBetter: false,
                },
                {
                  label: t('ownedSuffix'),
                  a: Number(pA.ownership_pct ?? 0),
                  b: Number(pB.ownership_pct ?? 0),
                  fmt: (n: number) => `${Math.round(n)}%`,
                  higherBetter: true,
                },
              ];

              return (
                <div className="market-vs-arena">
                  <div className="market-vs-fighters">
                    {[pA, pB].map(fp => {
                      const inSq = selected.includes(fp.id);
                      const cantAfford =
                        !inSq && isOverBudget(selectedCost + fp.price, managerBudget);
                      const full = !inSq && selected.length >= SQUAD_SIZE;
                      return (
                        <div key={fp.id} className="market-vs-fighter-card">
                          <div
                            className="market-vs-fighter-id clickable-row"
                            onClick={() => onOpenPlayerProfile(fp.id)}
                          >
                            {fp.photo_url ? (
                              <img
                                className="leaderboard-photo"
                                src={fp.photo_url}
                                alt={fp.name}
                              />
                            ) : (
                              <div className="player-photo small-photo">
                                {fp.name.slice(0, 1)}
                              </div>
                            )}
                            <div>
                              <strong>{fp.name}</strong>
                              <small className="muted tiny">£{fp.price.toFixed(1)}m</small>
                            </div>
                          </div>
                          <button
                            type="button"
                            className={inSq ? 'secondary compact-btn' : 'primary compact-btn'}
                            disabled={transferLocked || full || cantAfford}
                            onClick={() => onAddOrRemovePlayer(fp)}
                          >
                            {inSq ? t('removePlayerBtn') : t('addPlayerBtn')}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="market-vs-bars">
                    {metrics.map(m => {
                      const sum = Math.max(0.01, m.a + m.b);
                      const pctA = Math.round((m.a / sum) * 100);
                      const aWins = m.higherBetter ? m.a > m.b : m.a < m.b;
                      const bWins = m.higherBetter ? m.b > m.a : m.b < m.a;
                      return (
                        <div key={m.label} className="market-vs-metric-row">
                          <div className="market-vs-metric-nums">
                            <strong className={aWins ? 'vs-win-num' : ''}>{m.fmt(m.a)}</strong>
                            <span>{m.label}</span>
                            <strong className={bWins ? 'vs-win-num' : ''}>{m.fmt(m.b)}</strong>
                          </div>
                          <div className="market-vs-dual-track">
                            <span
                              className={`vs-bar-left ${aWins ? 'win' : ''}`}
                              style={{ width: `${pctA}%` }}
                            />
                            <span
                              className={`vs-bar-right ${bWins ? 'win' : ''}`}
                              style={{ width: `${100 - pctA}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {playersLoading && <p className="muted">{t('loadingPoints')}</p>}
      {playersError && <div className="notice">{playersError}</div>}

      {/* Quick Interactive Filter Chips */}
      <div className="market-quick-chips">
        {(
          [
            ['all', t('marketChipAll'), null],
            ['hot', t('marketChipHot'), Flame],
            ['diff', t('marketChipDiff'), Sparkles],
            ['mine', `${t('marketChipMine')} (${selected.length})`, Users],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            className={`forfeit-filter-pill ${quickPreset === key ? 'active' : ''}`}
            onClick={() => setQuickPreset(key)}
          >
            {Icon && <Icon size={12} />} {label}
          </button>
        ))}
      </div>

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

      {viewMode === 'cards' ? (
        <div className="market-fut-cards-grid">
          {filteredPlayers.map((p, idx) => {
            const isSelected = selected.includes(p.id);
            const isComparing = compareIds.includes(p.id);
            const cannotAfford = !isSelected && isOverBudget(selectedCost + p.price, managerBudget);
            const squadFull = !isSelected && selected.length >= SQUAD_SIZE;

            return (
              <div key={p.id} className="market-fut-cell">
                <FutPlayerCard
                  slotNumber={idx + 1}
                  kitNumber={p.kit_number}
                  name={p.name}
                  photoUrl={p.photo_url}
                  statLabel={`£${p.price.toFixed(1)}m · ${p.points} ${t('ptsUnit')}`}
                  secondaryNote={
                    (p.form ?? 0) > 0
                      ? `🔥 ${t('hotFormBadge')} ${Number(p.form).toFixed(1)} · ${Math.round(
                          Number(p.ownership_pct ?? 0)
                        )}%`
                      : `${Math.round(Number(p.ownership_pct ?? 0))}% ${t('ownedSuffix')}`
                  }
                  availabilityStatus={p.availability_status}
                  availabilityNote={p.availability_note}
                  isSelected={isSelected}
                  onCardClick={() => onOpenPlayerProfile(p.id)}
                  onOpenProfile={() => onOpenPlayerProfile(p.id)}
                >
                  <button
                    type="button"
                    className={`mini-vs-chip ${isComparing ? 'active' : ''}`}
                    onClick={() => toggleCompare(p.id)}
                  >
                    ⚔️ {t('marketCompareBtn')}
                  </button>
                  <button
                    type="button"
                    className={isSelected ? 'secondary compact-btn' : 'primary compact-btn'}
                    disabled={transferLocked || squadFull || cannotAfford}
                    onClick={() => onAddOrRemovePlayer(p)}
                  >
                    {isSelected ? t('removePlayerBtn') : t('addPlayerBtn')}
                  </button>
                </FutPlayerCard>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="player-list" key={sortBy}>
          {filteredPlayers.map((p, idx) => {
            const isSelected = selected.includes(p.id);
            const isComparing = compareIds.includes(p.id);
            const cannotAfford = !isSelected && isOverBudget(selectedCost + p.price, managerBudget);
            const squadFull = !isSelected && selected.length >= SQUAD_SIZE;
            const metaExtras = [p.favourite_team, p.playstyle].filter(Boolean).join(' · ');

            return (
              <div
                className={`player-row market-player-card clickable-row stagger-item ${
                  isSelected ? 'in-squad-row' : ''
                }`}
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
                        className={`market-form-pill ${
                          (p.form ?? 0) >= 8 ? 'market-form-hot' : ''
                        }`}
                        style={{ marginInlineStart: 6 }}
                        title="Average fantasy points over last 3 Gameweeks"
                      >
                        {(p.form ?? 0) >= 8 ? '🔥 ' : ''}
                        {t('hotFormBadge')} {Number(p.form).toFixed(1)}
                      </span>
                    )}
                    <span className="ownership-pill" style={{ marginInlineStart: 6 }}>
                      <Users size={11} /> {Math.round(Number(p.ownership_pct ?? 0))}%{' '}
                      {t('ownedSuffix')}
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

                <div className="market-row-btns" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`mini-vs-chip ${isComparing ? 'active' : ''}`}
                    onClick={() => toggleCompare(p.id)}
                    title={t('marketCompareDrawerTitle')}
                  >
                    ⚔️ {t('marketCompareBtn')}
                  </button>

                  <button
                    type="button"
                    className={isSelected ? 'secondary compact-btn' : 'primary compact-btn'}
                    disabled={transferLocked || squadFull || cannotAfford}
                    onClick={() => onAddOrRemovePlayer(p)}
                  >
                    {isSelected ? t('removePlayerBtn') : t('addPlayerBtn')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
