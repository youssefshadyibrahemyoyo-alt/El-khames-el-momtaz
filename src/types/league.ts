export type Screen = 'overview' | 'squad' | 'players' | 'leaderboard' | 'admin';

export type LeaderboardTab = 'managers' | 'goals' | 'assists' | 'contributions' | 'ratings';

export type AccountRole = 'admin_player' | 'player';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type ChipName = 'Triple Captain' | 'Wildcard' | 'Bench Boost';

export type Profile = {
  id: string;
  display_name: string;
  role: AccountRole;
  player_approval_status: ApprovalStatus;
};

export type Standing = {
  manager_id: string;
  display_name: string;
  total_points: number;
  last_gameweek_points: number;
  gameweeks_played: number;
};

export type GameweekStanding = {
  manager_id: string;
  display_name: string;
  points: number;
};

export type FootballPlayer = {
  id: string;
  display_name: string;
  price: number;
  is_active: boolean;
  photo_url: string | null;
  kit_number?: number | null;
  nationality?: string | null;
  favourite_team?: string | null;
  preferred_foot?: string | null;
  playstyle?: string | null;
  age?: number | null;
  bio?: string | null;
};

export type PlayerFantasyTotal = {
  player_id: string;
  total_points: number;
  matches_played: number;
};

export type LeaguePlayer = {
  id: string;
  name: string;
  price: number;
  points: number;
  matchesPlayed: number;
  photo_url: string | null;
  is_active: boolean;
  kit_number?: number | null;
  nationality?: string | null;
  favourite_team?: string | null;
  preferred_foot?: string | null;
  playstyle?: string | null;
  age?: number | null;
  bio?: string | null;
};

export type PlayerRecentMatch = {
  gameweek_number: number;
  match_number: number;
  goals: number;
  assists: number;
  saves: number;
  yellow_cards: number;
  red_cards: number;
  rating: number | null;
  fantasy_points: number;
};

export type PlayerProfileDetail = {
  id: string;
  display_name: string;
  price: number;
  photo_url: string | null;
  is_active: boolean;
  kit_number: number | null;
  nationality: string | null;
  favourite_team: string | null;
  preferred_foot: string | null;
  playstyle: string | null;
  age: number | null;
  bio: string | null;
  ownership_pct: number;
  stats: {
    matches_played: number;
    total_points: number;
    points_per_match: number;
    goals: number;
    assists: number;
    contributions: number;
    saves: number;
    penalty_saves: number;
    penalties_missed: number;
    yellow_cards: number;
    red_cards: number;
    own_goals: number;
    average_rating: number | null;
    rated_matches: number;
  };
  recent_matches: PlayerRecentMatch[];
};

export type Gameweek = {
  id: number;
  number: number;
  status: string;
  transfer_deadline: string | null;
  started_at: string | null;
  ended_at: string | null;
};

export type SquadRecord = {
  id: string;
  manager_id: string;
  gameweek_id: number;
  captain_player_id: string | null;
  vice_captain_player_id: string | null;
  chip: string | null;
  transfers_used: number;
  points_hit: number;
  free_transfers: number;
};

export type LeaderboardPlayer = {
  player_id: string;
  display_name: string;
  photo_url: string | null;
  goals?: number;
  total_goals?: number;
  assists?: number;
  total_assists?: number;
  contributions?: number;
  total_contributions?: number;
  average_rating?: number | null;
  rated_matches?: number;
  matches_rated?: number;
};

export type ScoringRule = {
  key: string;
  label: string;
  points: number;
};

export type InspectedSquadPlayer = {
  slot: number;
  player_id: string;
  display_name: string;
  price: number;
  photo_url: string | null;
  played: boolean;
  raw_points: number;
  effective_points: number;
  multiplier: number;
  is_starter_slot: boolean;
  is_captain: boolean;
  is_vice_captain: boolean;
  is_effective_captain: boolean;
  subbed_in: boolean;
  subbed_out: boolean;
};

export type SquadInspection = {
  has_squad: boolean;
  is_rolled_over?: boolean;
  chip?: string | null;
  transfers_used?: number;
  points_hit?: number;
  total_points?: number;
  players?: InspectedSquadPlayer[];
};
