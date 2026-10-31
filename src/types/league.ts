export type Screen = 'overview' | 'squad' | 'players' | 'matches' | 'leaderboard' | 'admin';

export type LeaderboardTab =
  | 'managers'
  | 'h2h'
  | 'cup'
  | 'highlights'
  | 'records'
  | 'forfeits'
  | 'player_stats';

export type PlayerStatCategory = 'goals' | 'assists' | 'contributions' | 'ratings';

export type AvailabilityStatus = 'available' | 'doubtful' | 'out';

export type AccountRole = 'admin_player' | 'player';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type ChipName = 'Triple Captain' | 'Wildcard' | 'Bench Boost' | 'Free Hit';

export type Profile = {
  id: string;
  display_name: string;
  team_name?: string | null;
  avatar_url?: string | null;
  budget?: number;
  role: AccountRole;
  player_approval_status: ApprovalStatus;
};

export type Standing = {
  manager_id: string;
  display_name: string;
  team_name?: string | null;
  avatar_url?: string | null;
  total_points: number;
  last_gameweek_points: number;
  gameweeks_played: number;
  budget?: number;
  rank_delta?: number;
};

export type GameweekStanding = {
  manager_id: string;
  display_name: string;
  team_name?: string | null;
  avatar_url?: string | null;
  points: number;
};

export type FootballPlayer = {
  id: string;
  display_name: string;
  price: number;
  last_price_change?: number | null;
  is_active: boolean;
  photo_url: string | null;
  kit_number?: number | null;
  nationality?: string | null;
  favourite_team?: string | null;
  preferred_foot?: string | null;
  playstyle?: string | null;
  age?: number | null;
  bio?: string | null;
  availability_status?: AvailabilityStatus | null;
  availability_note?: string | null;
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
  last_price_change?: number;
  form?: number;
  ownership_pct?: number;
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
  availability_status?: AvailabilityStatus | null;
  availability_note?: string | null;
};

export type PlayerRecentMatch = {
  gameweek_number: number;
  match_number: number;
  goals: number;
  assists: number;
  saves: number;
  yellow_cards: number;
  red_cards: number;
  is_mvp?: boolean;
  rating: number | null;
  fantasy_points: number;
};

export type PlayerProfileDetail = {
  id: string;
  display_name: string;
  price: number;
  last_price_change?: number;
  form?: number;
  photo_url: string | null;
  is_active: boolean;
  kit_number: number | null;
  nationality: string | null;
  favourite_team: string | null;
  preferred_foot: string | null;
  playstyle: string | null;
  age: number | null;
  bio: string | null;
  availability_status?: AvailabilityStatus | null;
  availability_note?: string | null;
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
    hat_tricks?: number;
    mvp_awards?: number;
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

export type PublicMatchPlayer = {
  player_id: string;
  display_name: string;
  photo_url: string | null;
  kit_number: number | null;
  goals: number;
  assists: number;
  saves: number;
  penalty_saves: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  own_goals: number;
  rating: number | null;
  is_mvp: boolean;
  is_hat_trick: boolean;
  fantasy_points: number;
};

export type PublicMatch = {
  match_id: string;
  gameweek_id: number;
  gameweek_number: number;
  match_number: number;
  status: string;
  ended_at: string | null;
  players: PublicMatchPlayer[];
};

export type TotwPlayer = {
  player_id: string;
  display_name: string;
  photo_url: string | null;
  kit_number: number | null;
  price: number;
  points: number;
  goals: number;
  assists: number;
  mvp_count: number;
};

export type GameweekHighlights = {
  has_data: boolean;
  gameweek_id?: number;
  gameweek_number?: number;
  team_of_the_week?: TotwPlayer[];
  awards?: {
    gw_champion?: {
      manager_id: string;
      display_name: string;
      team_name?: string | null;
      avatar_url?: string | null;
      points: number;
    } | null;
    golden_boot?: {
      player_id: string;
      display_name: string;
      photo_url?: string | null;
      kit_number?: number | null;
      goals: number;
    } | null;
    captain_genius?: {
      manager_id: string;
      display_name: string;
      team_name?: string | null;
      avatar_url?: string | null;
      player_name: string;
      captain_points: number;
    } | null;
    bench_pain?: {
      manager_id: string;
      display_name: string;
      team_name?: string | null;
      avatar_url?: string | null;
      bench_points: number;
      bench_names: string;
    } | null;
  };
};

export type H2HSide = {
  manager_id: string | null;
  display_name: string;
  team_name?: string | null;
  avatar_url?: string | null;
  points: number;
  is_average?: boolean;
};

export type H2HFixture = {
  id: number;
  home: H2HSide;
  away: H2HSide;
  status: string;
  winner: 'home' | 'away' | 'draw' | 'pending';
};

export type H2HStanding = {
  manager_id: string;
  display_name: string;
  team_name?: string | null;
  avatar_url?: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
  h2h_points: number;
};

export type H2HOverview = {
  gameweek_id: number | null;
  gameweek_number: number | null;
  gameweek_status: string | null;
  fixtures: H2HFixture[];
  standings: H2HStanding[];
};

export type PriceChangePreview = {
  player_id: string;
  display_name: string;
  photo_url: string | null;
  kit_number: number | null;
  old_price: number;
  played: boolean;
  gw_points: number;
  ownership_pct: number;
  new_price: number;
  delta: number;
};

export type FanPotnCandidate = {
  player_id: string;
  display_name: string;
  photo_url: string | null;
  kit_number: number | null;
  votes: number;
  vote_pct: number;
  gw_points: number;
  is_leader: boolean;
};

export type FanPotnPoll = {
  has_poll: boolean;
  gameweek_id?: number;
  gameweek_number?: number;
  total_votes?: number;
  my_vote_player_id?: string | null;
  candidates?: FanPotnCandidate[];
};

export type CupSide = {
  manager_id: string | null;
  display_name: string;
  team_name?: string | null;
  avatar_url?: string | null;
  points: number;
  is_bye?: boolean;
};

export type CupTie = {
  id: number;
  round_order: number;
  round_name: string;
  slot_index: number;
  gameweek_id: number | null;
  gameweek_number: number | null;
  gameweek_status: string | null;
  winner_manager_id: string | null;
  home: CupSide;
  away: CupSide;
};

export type CupOverview = {
  has_cup: boolean;
  cup_id?: number;
  name?: string;
  status?: 'active' | 'completed';
  champion?: {
    manager_id: string;
    display_name: string;
    team_name?: string | null;
    avatar_url?: string | null;
  } | null;
  ties?: CupTie[];
};

export type ManagerTrophyEntry = {
  gw_wins: number;
  cup_wins: number;
  motm_wins?: number;
};

export type ManagerTrophyMap = Record<string, ManagerTrophyEntry>;

export type LeagueMonth = {
  month_key: string;
  month_label: string;
  gameweeks_count: number;
};

export type MonthlyStanding = {
  manager_id: string;
  display_name: string;
  team_name?: string | null;
  avatar_url?: string | null;
  points: number;
  gameweeks_played: number;
};

export type NewsCategory = 'announcement' | 'injury' | 'matchday' | 'transfer';

export type LeagueNewsBulletin = {
  id: number;
  category: NewsCategory;
  title: string;
  body: string;
  is_pinned: boolean;
  author_name: string;
  created_at: string;
};

export type AutoWireItem = {
  key: string;
  kind: NewsCategory;
  headline: string;
  detail: string;
  ts: string;
};

export type LeagueNewsFeed = {
  bulletins: LeagueNewsBulletin[];
  auto_wire: AutoWireItem[];
};

export type SeasonRecords = {
  highest_gw_club: {
    manager_id: string;
    display_name: string;
    team_name?: string | null;
    avatar_url?: string | null;
    gameweek_number: number;
    points: number;
  } | null;
  most_goals_night: {
    player_id: string;
    display_name: string;
    photo_url?: string | null;
    kit_number?: number | null;
    gameweek_number: number;
    value: number;
  } | null;
  most_pts_night: {
    player_id: string;
    display_name: string;
    photo_url?: string | null;
    kit_number?: number | null;
    gameweek_number: number;
    value: number;
  } | null;
  most_mvps: {
    player_id: string;
    display_name: string;
    photo_url?: string | null;
    kit_number?: number | null;
    value: number;
  } | null;
  highest_match_rating: {
    player_id: string;
    display_name: string;
    photo_url?: string | null;
    kit_number?: number | null;
    gameweek_number: number;
    match_number: number;
    value: number;
  } | null;
  longest_h2h_streak: {
    manager_id: string;
    display_name: string;
    team_name?: string | null;
    avatar_url?: string | null;
    streak: number;
  } | null;
};

export type GameweekScoutPlayer = {
  player_id: string;
  display_name: string;
  photo_url?: string | null;
  kit_number?: number | null;
  count: number;
  pct: number;
};

export type GameweekScout = {
  has_locked_gw: boolean;
  gameweek_id?: number;
  gameweek_number?: number;
  gameweek_status?: string;
  active_squads_count?: number;
  most_captained?: GameweekScoutPlayer | null;
  most_owned?: GameweekScoutPlayer | null;
  chips_armed?: { chip: string; count: number }[];
};

export type SquadReadinessSummary = {
  total_managers: number;
  ready_count: number;
  missing: { manager_id: string; display_name: string; team_name?: string | null }[];
  ready: { manager_id: string; display_name: string; team_name?: string | null }[];
};

export type ForfeitOptionItem = {
  id: number;
  label: string;
  proposed_by_id: string | null;
  proposed_by_name: string | null;
  votes: number;
  pct: number;
};

export type ForfeitLoserEntry = {
  manager_id: string;
  display_name: string;
  team_name?: string | null;
  avatar_url?: string | null;
  points: number;
  completed: boolean;
  completed_at?: string | null;
};

export type ForfeitHistoryRecord = {
  gameweek_id: number;
  gameweek_number: number;
  forfeit_title: string;
  lowest_points: number;
  winning_votes: number;
  finalized_at: string;
  losers: ForfeitLoserEntry[];
};

export type ForfeitShameRow = {
  manager_id: string;
  display_name: string;
  team_name?: string | null;
  avatar_url?: string | null;
  losses_count: number;
  completed_count: number;
  pending_count: number;
};

export type ForfeitsOverview = {
  active_poll: {
    gameweek_id: number;
    gameweek_number: number;
    status: string;
    my_vote_option_id: number | null;
    total_votes: number;
    options: ForfeitOptionItem[];
    live_danger_zone: {
      lowest_points: number;
      managers: {
        manager_id: string;
        display_name: string;
        team_name?: string | null;
        avatar_url?: string | null;
        points: number;
      }[];
    } | null;
  } | null;
  history: ForfeitHistoryRecord[];
  shame_leaderboard: ForfeitShameRow[];
};



