import { describe, expect, it } from 'vitest';
import {
  autoFillSquad,
  calculateTransfersAndHits,
  computeDemoPoints,
  computeFreeTransfers,
  isOverBudget,
  pickTargetGameweek,
  SQUAD_SIZE,
  syncSquadLeaders,
} from '../lib/squadRules';
import { fromCairoDateTimeInput, toCairoDateTimeInput } from '../lib/cairoTime';
import { translations } from '../i18n/translations';
import { DEMO_CUP, DEMO_FAN_POLL, DEMO_PLAYERS } from '../lib/demoData';
import type { Gameweek, LeaguePlayer, SquadRecord } from '../types/league';

describe('squadRules', () => {
  it('handles IEEE-754 decimal sums at exact £50.0m budget boundary and grown FPL budgets', () => {
    const exactFifty = 7.1 + 7.2 + 7.3 + 7.1 + 7.2 + 7.1 + 7.0; // 50.00000000000001 in JS float
    expect(isOverBudget(exactFifty)).toBe(false);
    expect(isOverBudget(50.5)).toBe(true);
    // Grown FPL budget after owned players rise in price (+0.4m -> £50.4m cap)
    expect(isOverBudget(50.4, 50.4)).toBe(false);
    expect(isOverBudget(50.5, 50.4)).toBe(true);
  });

  it('keeps captain and vice-captain on starting five after bench swaps or removals', () => {
    const initial = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    // Swap captain p1 onto bench (index 5)
    const swapped = ['p6', 'p2', 'p3', 'p4', 'p5', 'p1', 'p7'];
    const res = syncSquadLeaders(swapped, 'p1', 'p2');
    expect(res.captain).toBe('p6');
    expect(res.viceCaptain).toBe('p2');
    expect(res.captain).not.toBe(res.viceCaptain);
  });

  it('gives 1 free transfer in Gameweek 2 and rolls over up to 2 from Gameweek 3+', () => {
    const gw1Squad: SquadRecord = {
      id: 's1',
      manager_id: 'm1',
      gameweek_id: 1,
      captain_player_id: 'p1',
      vice_captain_player_id: 'p2',
      chip: null,
      transfers_used: 0,
      points_hit: 0,
      free_transfers: 1,
    };

    // GW2 should get 1 free transfer, NOT 2
    expect(
      computeFreeTransfers({ currentSquad: null, previousSquad: gw1Squad, previousWeekNumber: 1 })
    ).toBe(1);

    // GW3 after using 0 transfers in GW2 rolls over to 2 free transfers
    const gw2Squad: SquadRecord = { ...gw1Squad, id: 's2', gameweek_id: 2, transfers_used: 0, free_transfers: 1 };
    expect(
      computeFreeTransfers({ currentSquad: null, previousSquad: gw2Squad, previousWeekNumber: 2 })
    ).toBe(2);

    // Wildcard & Free Hit both reset next week's free transfers to 1
    const wildcardSquad: SquadRecord = { ...gw2Squad, chip: 'Wildcard', transfers_used: 5 };
    expect(
      computeFreeTransfers({ currentSquad: null, previousSquad: wildcardSquad, previousWeekNumber: 2 })
    ).toBe(1);

    const freeHitSquad: SquadRecord = { ...gw2Squad, chip: 'Free Hit', transfers_used: 6 };
    expect(
      computeFreeTransfers({ currentSquad: null, previousSquad: freeHitSquad, previousWeekNumber: 2 })
    ).toBe(1);
  });

  it('calculates 4-point hits and waives hits when Wildcard or Free Hit is active', () => {
    const base = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const next = ['p1', 'p2', 'p3', 'p4', 'p8', 'p9', 'p10']; // 3 transfers

    expect(
      calculateTransfersAndHits({
        selected: next,
        baselineIds: base,
        freeTransfers: 1,
        activeChip: null,
      })
    ).toEqual({ transfersUsed: 3, pointsHits: 8 });

    expect(
      calculateTransfersAndHits({
        selected: next,
        baselineIds: base,
        freeTransfers: 1,
        activeChip: 'Wildcard',
      })
    ).toEqual({ transfersUsed: 3, pointsHits: 0 });

    expect(
      calculateTransfersAndHits({
        selected: next,
        baselineIds: base,
        freeTransfers: 1,
        activeChip: 'Free Hit',
      })
    ).toEqual({ transfersUsed: 3, pointsHits: 0 });

    // Gameweek 1 never charges transfer hits no matter how many edits a manager makes
    expect(
      calculateTransfersAndHits({
        selected: next,
        baselineIds: base,
        freeTransfers: 1,
        activeChip: null,
        gameweekNumber: 1,
      })
    ).toEqual({ transfersUsed: 0, pointsHits: 0 });
  });

  it('skips expired draft gameweeks when picking target gameweek', () => {
    const now = new Date('2026-10-29T18:00:00Z').getTime();
    const weeks: Gameweek[] = [
      {
        id: 1,
        number: 1,
        status: 'draft',
        transfer_deadline: '2026-10-29T16:00:00Z', // expired
        started_at: null,
        ended_at: null,
      },
      {
        id: 2,
        number: 2,
        status: 'draft',
        transfer_deadline: '2026-11-05T17:00:00Z', // open
        started_at: null,
        ended_at: null,
      },
    ];
    const { target } = pickTargetGameweek(weeks, now);
    expect(target?.number).toBe(2);
  });

  it('promotes vice-captain multiplier in demo points when captain is benched', () => {
    const players: LeaguePlayer[] = [
      { id: 'p1', name: 'P1', price: 7, points: 10, matchesPlayed: 1, photo_url: null, is_active: true },
      { id: 'p2', name: 'P2', price: 7, points: 8, matchesPlayed: 1, photo_url: null, is_active: true },
      { id: 'p3', name: 'P3', price: 7, points: 5, matchesPlayed: 1, photo_url: null, is_active: true },
      { id: 'p4', name: 'P4', price: 7, points: 5, matchesPlayed: 1, photo_url: null, is_active: true },
      { id: 'p5', name: 'P5', price: 7, points: 5, matchesPlayed: 1, photo_url: null, is_active: true },
      { id: 'p6', name: 'P6', price: 7, points: 4, matchesPlayed: 1, photo_url: null, is_active: true },
      { id: 'p7', name: 'P7', price: 7, points: 2, matchesPlayed: 1, photo_url: null, is_active: true },
    ];
    const map = new Map(players.map(p => [p.id, p]));
    // p6 in starters instead of p1 (p1 benched); p2 is vice-captain -> p2 gets 2x (16)
    const pts = computeDemoPoints({
      selected: ['p6', 'p2', 'p3', 'p4', 'p5', 'p1', 'p7'],
      playerById: map,
      captain: 'p1',
      viceCaptain: 'p2',
      activeChip: null,
      pointsHits: 0,
    });
    expect(pts).toBe(4 + 16 + 5 + 5 + 5);
  });

  it('autoFillSquad builds a valid 7-player squad within the £50.0m budget from empty or partial picks', () => {
    const fromEmpty = autoFillSquad({ players: DEMO_PLAYERS, selected: [], budget: 50 });
    expect(fromEmpty).toHaveLength(SQUAD_SIZE);
    expect(new Set(fromEmpty).size).toBe(SQUAD_SIZE);
    const emptyCost = fromEmpty.reduce(
      (sum, id) => sum + (DEMO_PLAYERS.find(p => p.id === id)?.price ?? 0),
      0
    );
    expect(isOverBudget(emptyCost, 50)).toBe(false);

    const partial = ['Karim', 'Omar'];
    const fromPartial = autoFillSquad({ players: DEMO_PLAYERS, selected: partial, budget: 50 });
    expect(fromPartial).toHaveLength(SQUAD_SIZE);
    expect(fromPartial.slice(0, 2)).toEqual(partial);
    const partialCost = fromPartial.reduce(
      (sum, id) => sum + (DEMO_PLAYERS.find(p => p.id === id)?.price ?? 0),
      0
    );
    expect(isOverBudget(partialCost, 50)).toBe(false);
  });
});

describe('cairoTime', () => {
  it('round-trips Cairo datetime-local strings across summer, winter, and DST transition', () => {
    for (const sample of ['2026-07-15T19:00', '2026-10-29T21:30', '2026-11-05T19:00']) {
      const iso = fromCairoDateTimeInput(sample);
      expect(iso).not.toBeNull();
      expect(toCairoDateTimeInput(iso)).toBe(sample);
    }
  });
});

describe('i18n & tournament fixtures', () => {
  it('keeps English and Arabic translation keys 100% in sync and validates cup & fan poll structures', () => {
    expect(Object.keys(translations.ar).sort()).toEqual(Object.keys(translations.en).sort());
    expect(DEMO_CUP.has_cup).toBe(true);
    expect(DEMO_CUP.ties?.length).toBeGreaterThanOrEqual(3);
    expect(DEMO_FAN_POLL.has_poll).toBe(true);
    expect(DEMO_FAN_POLL.candidates?.[0]?.is_leader).toBe(true);
  });
});

