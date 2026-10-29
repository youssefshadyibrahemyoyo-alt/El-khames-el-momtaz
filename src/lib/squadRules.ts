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
}): { transfersUsed: number; pointsHits: number } {
  const { selected, baselineIds, freeTransfers, activeChip } = params;
  const transfersUsed =
    baselineIds.length === SQUAD_SIZE
      ? selected.filter(id => !baselineIds.includes(id)).length
      : 0;
  const pointsHits =
    activeChip === 'Wildcard' ? 0 : Math.max(0, transfersUsed - freeTransfers) * 4;
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
  if (!previousSquad || previousWeekNumber <= 1 || previousSquad.chip === 'Wildcard') {
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
