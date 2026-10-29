import type { LeaguePlayer, ScoringRule, Standing, SquadInspection } from '../types/league';

export const DEFAULT_SCORING_RULES: ScoringRule[] = [
  { key: 'goal', label: 'Goal', points: 5 },
  { key: 'assist', label: 'Assist', points: 3 },
  { key: 'save', label: 'Save', points: 1 },
  { key: 'penalty_save', label: 'Penalty save', points: 5 },
  { key: 'penalty_missed', label: 'Penalty missed', points: -2 },
  { key: 'yellow_card', label: 'Yellow card', points: -1 },
  { key: 'red_card', label: 'Red card', points: -3 },
  { key: 'own_goal', label: 'Own goal', points: -2 },
];

export const DEMO_PLAYERS: LeaguePlayer[] = [
  { id: 'Karim', name: 'Karim', price: 8.5, points: 24, matchesPlayed: 4, photo_url: null, is_active: true },
  { id: 'Omar', name: 'Omar', price: 8.0, points: 21, matchesPlayed: 4, photo_url: null, is_active: true },
  { id: 'Youssef', name: 'Youssef', price: 7.5, points: 19, matchesPlayed: 4, photo_url: null, is_active: true },
  { id: 'Ziad', name: 'Ziad', price: 7.0, points: 16, matchesPlayed: 4, photo_url: null, is_active: true },
  { id: 'Adam', name: 'Adam', price: 6.5, points: 14, matchesPlayed: 3, photo_url: null, is_active: true },
  { id: 'Mazen', name: 'Mazen', price: 6.0, points: 12, matchesPlayed: 3, photo_url: null, is_active: true },
  { id: 'Nour', name: 'Nour', price: 5.5, points: 10, matchesPlayed: 3, photo_url: null, is_active: true },
  { id: 'Fares', name: 'Fares', price: 5.0, points: 9, matchesPlayed: 3, photo_url: null, is_active: true },
  { id: 'Tarek', name: 'Tarek', price: 4.5, points: 7, matchesPlayed: 2, photo_url: null, is_active: true },
];

export const DEMO_STANDINGS: Standing[] = [
  { manager_id: 'demo-1', display_name: 'Yako', total_points: 78, last_gameweek_points: 42, gameweeks_played: 2 },
  { manager_id: 'demo-2', display_name: 'Shady', total_points: 71, last_gameweek_points: 35, gameweeks_played: 2 },
  { manager_id: 'demo-3', display_name: 'Moaaz', total_points: 66, last_gameweek_points: 33, gameweeks_played: 2 },
  { manager_id: 'demo-4', display_name: 'Benas', total_points: 59, last_gameweek_points: 28, gameweeks_played: 2 },
];

export function buildDemoInspection(managerName: string): SquadInspection {
  const sample = DEMO_PLAYERS.slice(0, 7);
  return {
    has_squad: true,
    is_rolled_over: managerName === 'Benas',
    chip: managerName === 'Yako' ? 'Triple Captain' : null,
    transfers_used: 1,
    points_hit: 0,
    total_points: managerName === 'Yako' ? 42 : 35,
    players: sample.map((p, idx) => {
      const isStarter = idx < 5;
      const isCap = idx === 0;
      const isVice = idx === 1;
      const mult = isCap ? (managerName === 'Yako' ? 3 : 2) : 1;
      const raw = Math.max(2, Math.round(p.points / 3));
      return {
        slot: idx + 1,
        player_id: p.id,
        display_name: p.name,
        price: p.price,
        photo_url: null,
        played: true,
        raw_points: raw,
        effective_points: isStarter ? raw * mult : 0,
        multiplier: isStarter ? mult : 1,
        is_starter_slot: isStarter,
        is_captain: isCap,
        is_vice_captain: isVice,
        is_effective_captain: isCap,
        subbed_in: false,
        subbed_out: false,
      };
    }),
  };
}
