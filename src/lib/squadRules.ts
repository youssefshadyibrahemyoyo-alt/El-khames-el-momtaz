import type { Gameweek, LeaguePlayer, SquadRecord } from '../types/league';

export const SQUAD_BUDGET = 50;
export const SQUAD_SIZE = 7;
export const STARTERS_COUNT = 5;

export function isOverBudget(cost: number, budget: number = SQUAD_BUDGET): boolean {
  return Math.round(cost * 10) > Math.round(budget * 10);
}

export function syncSquadLeaders(
  lineup: string[],
  currentCaptain: string,
  currentVice: string
): { selected: string[]; captain: string; viceCaptain: string } {
  const starters = lineup.slice(0, STARTERS_COUNT);
  const captain = starters.includes(currentCaptain) ? currentCaptain : (starters[0] ?? '');
  const viceCaptain =
    starters.includes(currentVice) && currentVice !== captain
      ? currentVice
      : (starters.find(id => id !== captain) ?? '');
  return { selected: lineup, captain, viceCaptain };
}

export function calculateTransfersAndHits(params: {
  selected: string[];
  baselineIds: string[];
  freeTransfers: number;
  activeChip: string | null;
  gameweekNumber?: number;
}): { transfersUsed: number; pointsHits: number } {
  const { selected, baselineIds, freeTransfers, activeChip, gameweekNumber } = params;
  if (gameweekNumber != null && gameweekNumber <= 1) {
    return { transfersUsed: 0, pointsHits: 0 };
  }
  const transfersUsed =
    baselineIds.length === SQUAD_SIZE
      ? selected.filter(id => !baselineIds.includes(id)).length
      : 0;
  const pointsHits =
    activeChip === 'Wildcard' || activeChip === 'Free Hit'
      ? 0
      : Math.max(0, transfersUsed - freeTransfers) * 4;
  return { transfersUsed, pointsHits };
}

export function computeFreeTransfers(params: {
  currentSquad: SquadRecord | null;
  previousSquad: SquadRecord | null;
  previousWeekNumber: number;
}): number {
  const { currentSquad, previousSquad, previousWeekNumber } = params;
  if (currentSquad?.free_transfers) {
    return currentSquad.free_transfers;
  }
  if (
    !previousSquad ||
    previousWeekNumber <= 1 ||
    previousSquad.chip === 'Wildcard' ||
    previousSquad.chip === 'Free Hit'
  ) {
    return 1;
  }
  const carried = Math.max(0, (previousSquad.free_transfers ?? 1) - (previousSquad.transfers_used ?? 0));
  return Math.min(2, carried + 1);
}

export function pickTargetGameweek(
  weeks: Gameweek[],
  nowMs: number = Date.now()
): { active: Gameweek | null; target: Gameweek | null } {
  const statusOf = (w: Gameweek) => String(w.status).toLowerCase();
  const passed = (w: Gameweek) =>
    Boolean(w.transfer_deadline) && nowMs >= new Date(w.transfer_deadline!).getTime();

  const active = weeks.find(w => statusOf(w) === 'active') ?? null;
  const upcoming = weeks.filter(w => ['draft', 'open'].includes(statusOf(w)));

  const target =
    active && !passed(active)
      ? active
      : upcoming.find(w => (!active || w.number > active.number) && !passed(w)) ?? null;

  return { active, target };
}

export function hasUnsavedSquadChanges(params: {
  selected: string[];
  savedPlayerIds: string[];
  captain: string;
  savedCaptain: string;
  viceCaptain: string;
  savedViceCaptain: string;
  activeChip: string | null;
  savedChip: string | null;
}): boolean {
  const {
    selected,
    savedPlayerIds,
    captain,
    savedCaptain,
    viceCaptain,
    savedViceCaptain,
    activeChip,
    savedChip,
  } = params;

  if (savedPlayerIds.length === 0) {
    return selected.length > 0;
  }
  if (selected.length !== savedPlayerIds.length) return true;
  for (let i = 0; i < selected.length; i++) {
    if (selected[i] !== savedPlayerIds[i]) return true;
  }
  return (
    captain !== savedCaptain ||
    viceCaptain !== savedViceCaptain ||
    (activeChip ?? null) !== (savedChip ?? null)
  );
}

export function computeDemoPoints(params: {
  selected: string[];
  playerById: Map<string, LeaguePlayer>;
  captain: string;
  viceCaptain: string;
  activeChip: string | null;
  pointsHits: number;
}): number {
  const { selected, playerById, captain, viceCaptain, activeChip, pointsHits } = params;
  const starters = selected.slice(0, STARTERS_COUNT);
  const bench = selected.slice(STARTERS_COUNT, SQUAD_SIZE);
  const effectiveCaptain = starters.includes(captain)
    ? captain
    : starters.includes(viceCaptain)
      ? viceCaptain
      : '';

  const startersTotal = starters.reduce((sum, id) => {
    const p = playerById.get(id);
    if (!p) return sum;
    const mult = id === effectiveCaptain ? (activeChip === 'Triple Captain' ? 3 : 2) : 1;
    return sum + p.points * mult;
  }, 0);

  const benchTotal =
    activeChip === 'Bench Boost'
      ? bench.reduce((sum, id) => sum + (playerById.get(id)?.points ?? 0), 0)
      : 0;

  return startersTotal + benchTotal - pointsHits;
}

export function autoFillSquad(params: {
  players: LeaguePlayer[];
  selected: string[];
  budget?: number;
}): string[] {
  const { players, selected, budget = SQUAD_BUDGET } = params;
  const activePool = players.filter(p => p.is_active);
  if (activePool.length < SQUAD_SIZE) return selected;

  // If already full (7/7), build a fresh 7-player squad; otherwise fill remaining empty slots
  const baseIds =
    selected.length >= SQUAD_SIZE
      ? []
      : selected.filter(id => activePool.some(p => p.id === id));

  const chosen = [...baseIds];
  let currentCost = chosen.reduce((sum, id) => {
    const pl = activePool.find(x => x.id === id);
    return sum + (pl?.price ?? 0);
  }, 0);

  while (chosen.length < SQUAD_SIZE) {
    const slotsRemainingAfterThis = SQUAD_SIZE - chosen.length - 1;
    const remainingPool = activePool.filter(p => !chosen.includes(p.id));
    if (remainingPool.length <= slotsRemainingAfterThis) break;

    const sortedByCheapest = [...remainingPool].sort((a, b) => a.price - b.price);

    const affordable = remainingPool.filter(candidate => {
      const othersCheapest = sortedByCheapest
        .filter(x => x.id !== candidate.id)
        .slice(0, slotsRemainingAfterThis)
        .reduce((s, x) => s + x.price, 0);
      return !isOverBudget(currentCost + candidate.price + othersCheapest, budget);
    });

    if (affordable.length === 0) break;

    // Prefer available (not 'out') and strong value/form, with variety among top candidates
    const fitPool = affordable.filter(p => p.availability_status !== 'out');
    const candidates = (fitPool.length > 0 ? fitPool : affordable).sort((a, b) => {
      const scoreA = a.points * 1.2 + (a.form ?? 0) * 1.5 + a.price;
      const scoreB = b.points * 1.2 + (b.form ?? 0) * 1.5 + b.price;
      return scoreB - scoreA;
    });

    const topSlice = candidates.slice(0, Math.min(3, candidates.length));
    const pick = topSlice[Math.floor(Math.random() * topSlice.length)];
    chosen.push(pick.id);
    currentCost += pick.price;
  }

  return chosen.length === SQUAD_SIZE ? chosen : selected;
}
