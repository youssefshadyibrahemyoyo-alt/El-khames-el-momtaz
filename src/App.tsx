import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Crown,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { isSupabaseConfigured, Profile, supabase } from './supabase';
import AdminPanel from './admin/AdminPanel';

type Screen = 'overview' | 'squad' | 'players' | 'leaderboard' | 'admin';
type LeaderboardTab = 'managers' | 'goals' | 'assists' | 'contributions' | 'ratings';

type Standing = {
  manager_id: string;
  display_name: string;
  total_points: number;
  last_gameweek_points: number;
  gameweeks_played: number;
};

type FootballPlayer = {
  id: string;
  display_name: string;
  price: number;
  is_active: boolean;
  photo_url: string | null;
};

type Gameweek = {
  id: number;
  number: number;
  status: string;
  transfer_deadline: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type SquadRecord = {
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

type LeaguePlayer = {
  id: string;
  name: string;
  price: number;
  points: number;
  photo_url: string | null;
  is_active?: boolean;
};

type LeaderboardPlayer = {
  player_id: string;
  display_name: string;
  photo_url: string | null;
  total_goals?: number;
  total_assists?: number;
  total_contributions?: number;
  average_rating?: number | null;
  matches_rated?: number;
};

const demoPlayers: LeaguePlayer[] = [
  { id: 'Karim', name: 'Karim', price: 7, points: 18, photo_url: null },
  { id: 'Omar', name: 'Omar', price: 6.5, points: 15, photo_url: null },
  { id: 'Youssef', name: 'Youssef', price: 6, points: 12, photo_url: null },
  { id: 'Ziad', name: 'Ziad', price: 5.5, points: 10, photo_url: null },
  { id: 'Adam', name: 'Adam', price: 5.5, points: 9, photo_url: null },
  { id: 'Mazen', name: 'Mazen', price: 4.5, points: 8, photo_url: null },
  { id: 'Nour', name: 'Nour', price: 4.5, points: 7, photo_url: null },
  { id: 'Fares', name: 'Fares', price: 4.5, points: 6, photo_url: null },
];

const leaderboardTabs: { id: LeaderboardTab; label: string }[] = [
  { id: 'managers', label: 'Managers' },
  { id: 'goals', label: 'Goals' },
  { id: 'assists', label: 'Assists' },
  { id: 'contributions', label: 'Goal contributions' },
  { id: 'ratings', label: 'Ratings' },
];


const activeStatuses = ['active'];


export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [notice, setNotice] = useState('');
  const [screen, setScreen] = useState<Screen>('overview');
  const [demoRole, setDemoRole] = useState<'admin_player' | 'player'>('admin_player');
  const [demoMode] = useState(!isSupabaseConfigured);

  const [realPlayers, setRealPlayers] = useState<FootballPlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState('');
const [playerSearch, setPlayerSearch] = useState('');
const [priceFilter, setPriceFilter] = useState('all');
  const [gameweek, setGameweek] = useState<Gameweek | null>(null);
  const [targetGw, setTargetGw] = useState<Gameweek | null>(null);
  const [baselineIds, setBaselineIds] = useState<string[]>([]);
  const [baseFree, setBaseFree] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
 const [selected, setSelected] = useState<string[]>([]);
const [captain, setCaptain] = useState('');
const [viceCaptain, setViceCaptain] = useState('');
  const [gameweekNumber, setGameweekNumber] = useState(1);
  const [savedPlayerIds, setSavedPlayerIds] = useState<string[]>([]);
  const [usedChips, setUsedChips] = useState<string[]>([]);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [matchInProgress, setMatchInProgress] = useState(false);
const [swapStarter, setSwapStarter] = useState<string | null>(null);
const [didNotPlay, setDidNotPlay] = useState<string[]>([]);
  const [sessionMessage, setSessionMessage] = useState('');
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadSaving, setSquadSaving] = useState(false);
  const [squadError, setSquadError] = useState('');

  const [leaderboardTab, setLeaderboardTab] =
    useState<LeaderboardTab>('managers');
  const [standings, setStandings] = useState<Standing[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState('');
  const [leaderboardPlayers, setLeaderboardPlayers] =
    useState<LeaderboardPlayer[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');

   const [profileLoading, setProfileLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    async function fetchProfile(id: string) {
      setProfileLoading(true);
      const { data, error } = await supabase!
        .from('profiles')
        .select('id,display_name,role,player_approval_status')
        .eq('id', id)
        .single();
      if (!active) return;
      if (error) {
        setNotice('Your account profile could not be loaded. Check your database setup.');
      } else {
        setProfile(data as Profile);
      }
      setProfileLoading(false);
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) {
        void fetchProfile(next.user.id);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    setNotice('');

    if (!supabase) {
      setNotice('Connect Supabase to enable real accounts.');
      return;
    }

    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });

      setNotice(error
        ? error.message
        : 'Registration submitted. Check your email if confirmation is enabled. An admin must approve your player profile.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setNotice(error.message);
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const role = demoMode ? demoRole : profile?.role;
  const isAdmin = role === 'admin_player';
  const approved = demoMode || profile?.player_approval_status === 'approved';

    const players: LeaguePlayer[] = demoMode
    ? demoPlayers
    : realPlayers.map(p => ({
        id: p.id,
        name: p.display_name,
        price: Number(p.price),
        points: 0,
        photo_url: p.photo_url,
        is_active: p.is_active,
      }));

  const playerById = new Map(players.map(p => [p.id, p]));
  const filteredPlayers = players.filter(p => {
    const visible = p.is_active !== false || selected.includes(p.id);
    const matchesSearch = p.name.toLowerCase().includes(playerSearch.toLowerCase());
    const matchesPrice =
      priceFilter === 'all' ||
      (priceFilter === 'under5' && p.price < 5) ||
      (priceFilter === '5to7' && p.price >= 5 && p.price <= 7) ||
      (priceFilter === 'over7' && p.price > 7);

    return visible && matchesSearch && matchesPrice;
  });

  function applyLineup(next: string[]) {
    const nextStarters = next.slice(0, 5);
    const nextCap = nextStarters.includes(captain) ? captain : (nextStarters[0] ?? '');
    const nextVice =
      nextStarters.includes(viceCaptain) && viceCaptain !== nextCap
        ? viceCaptain
        : (nextStarters.find(id => id !== nextCap) ?? '');
    setSelected(next);
    setCaptain(nextCap);
    setViceCaptain(nextVice);
  }

  // Preview of transfers and hits. The database repeats these checks when you save.
  const transfersUsed = baselineIds.length === 7
    ? selected.filter(id => !baselineIds.includes(id)).length
    : 0;
  const freeTransfers = baseFree;
  const pointsHits = activeChip === 'Wildcard'
    ? 0
    : Math.max(0, transfersUsed - freeTransfers) * 4;


  const selectedPlayers = selected
    .map(id => playerById.get(id))
    .filter((p): p is LeaguePlayer => Boolean(p));

  const selectedCost = selectedPlayers.reduce((sum, p) => sum + p.price, 0);

  const starters = selected.slice(0, 5);
  const bench = selected.slice(5, 7);
  

  const effectiveDemoPoints =
    starters.reduce((sum, id) => {
      const p = playerById.get(id);
      if (!p) return sum;
      return sum + p.points * (
        id === captain
          ? activeChip === 'Triple Captain' ? 3 : 2
          : 1
      );
    }, 0) +
    (activeChip === 'Bench Boost'
      ? bench.reduce((sum, id) => sum + (playerById.get(id)?.points ?? 0), 0)
      : 0) -
    pointsHits;

  const nav: {
    id: Screen;
    label: string;
    icon: any;
    admin?: boolean;
  }[] = [
    { id: 'overview', label: 'Home', icon: CalendarDays },
    { id: 'squad', label: 'My squad', icon: Users },
    { id: 'players', label: 'Players', icon: CircleUserRound },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'admin', label: 'Admin panel', icon: ShieldCheck, admin: true },
  ];

  // Load the real player pool from Supabase.
  useEffect(() => {
    if (demoMode || !supabase || !session || !approved) return;

    let cancelled = false;

    async function loadPlayers() {
      setPlayersLoading(true);
      setPlayersError('');

      const { data, error } = await supabase!
        .from('football_players')
        .select('id,display_name,price,is_active,photo_url')
        .order('display_name', { ascending: true });

      if (cancelled) return;

      if (error) {
        setPlayersError(error.message);
        setRealPlayers([]);
      } else {
        setRealPlayers((data ?? []) as FootballPlayer[]);
      }

      setPlayersLoading(false);
    }

    void loadPlayers();
    return () => { cancelled = true; };
  }, [demoMode, session, approved, reloadKey]);

  // Load gameweeks, then this manager's squad for the gameweek they are picking for.
  useEffect(() => {
    if (demoMode || !supabase || !session || !approved) return;

    let cancelled = false;

    async function loadSquad() {
      setSquadLoading(true);
      setSquadError('');

      const { data: weeks, error: weekError } = await supabase!
        .from('gameweeks')
        .select('id,number,status,transfer_deadline,started_at,ended_at')
        .order('number', { ascending: true });

      if (cancelled) return;

      if (weekError) {
        setSquadError(`Could not load gameweeks: ${weekError.message}`);
        setSquadLoading(false);
        return;
      }

      const rows = (weeks ?? []) as Gameweek[];
      const statusOf = (w: Gameweek) => String(w.status).toLowerCase();
      const passed = (w: Gameweek) =>
        !!w.transfer_deadline && Date.now() >= new Date(w.transfer_deadline).getTime();

      const active = rows.find(w => activeStatuses.includes(statusOf(w))) ?? null;
      const upcoming = rows.filter(w => ['draft', 'open'].includes(statusOf(w)));

            // Before the deadline you pick for the active gameweek; after it, for the next open one.
      const target: Gameweek | null =
        active && !passed(active)
          ? active
          : upcoming.find(w => (!active || w.number > active.number) && !passed(w)) ?? null;

      setGameweek(active);
      setTargetGw(target);

      if (!target) {
        setSelected([]);
        setSavedPlayerIds([]);
        setBaselineIds([]);
        setCaptain('');
        setViceCaptain('');
        setActiveChip(null);
        setSquadError(
          active
            ? 'Transfers are closed. An admin must create the next gameweek.'
            : 'No gameweek is open yet. An admin must create and start a gameweek.'
        );
        setSquadLoading(false);
        return;
      }

      setGameweekNumber(target.number);

      const { data: mine, error: mineError } = await supabase!
        .from('fantasy_squads')
        .select('id,manager_id,gameweek_id,captain_player_id,vice_captain_player_id,chip,transfers_used,points_hit,free_transfers')
        .eq('manager_id', session.user.id);

      if (cancelled) return;

      if (mineError) {
        setSquadError(`Could not load your squad: ${mineError.message}`);
        setSquadLoading(false);
        return;
      }

      const squads = (mine ?? []) as SquadRecord[];
      const numberOf = new Map(rows.map(w => [w.id, w.number]));
      const current = squads.find(s => s.gameweek_id === target.id) ?? null;
      const previous = squads
        .filter(s => (numberOf.get(s.gameweek_id) ?? 0) < target.number)
        .sort((a, b) => (numberOf.get(b.gameweek_id) ?? 0) - (numberOf.get(a.gameweek_id) ?? 0))[0] ?? null;

      setUsedChips(
        squads.filter(s => s.chip && s.gameweek_id !== target.id).map(s => String(s.chip))
      );
        const prevWeekNum = previous ? (numberOf.get(previous.gameweek_id) ?? 0) : 0;
      setBaseFree(
        current?.free_transfers
          ? current.free_transfers
          : !previous || prevWeekNum <= 1 || previous.chip === 'Wildcard'
            ? 1
            : Math.min(2, Math.max(0, (previous.free_transfers ?? 1) - (previous.transfers_used ?? 0)) + 1)
      );

      async function readIds(squadId: string): Promise<string[]> {
        const { data, error } = await supabase!
          .from('squad_players')
          .select('player_id,slot')
          .eq('squad_id', squadId)
          .order('slot', { ascending: true });
        if (error) throw error;
        return (data ?? []).map(row => String(row.player_id));
      }

      try {
        const previousIds = previous ? await readIds(previous.id) : [];
        const currentIds = current ? await readIds(current.id) : [];
        if (cancelled) return;

        // A new gameweek starts from last gameweek's squad, like FPL.
        const ids = current ? currentIds : previousIds;
        const source = current ?? previous;

        setBaselineIds(previousIds);
        setSelected(ids);
        setSavedPlayerIds(currentIds);
        setCaptain(source?.captain_player_id ?? ids[0] ?? '');
        setViceCaptain(source?.vice_captain_player_id ?? '');
        setActiveChip(current?.chip ?? null);
      } catch (e: any) {
        setSquadError(`Could not load your squad: ${e?.message ?? 'Unknown error'}`);
      }

      setSquadLoading(false);
    }

    void loadSquad();
    return () => { cancelled = true; };
  }, [demoMode, session, approved, reloadKey]);

  // Load the selected real leaderboard.
  useEffect(() => {
    if (screen !== 'leaderboard' || !supabase || !session || !approved) return;
    if (leaderboardTab === 'managers') return;

    let cancelled = false;

    async function loadLeaderboard() {
      setLeaderboardLoading(true);
      setLeaderboardError('');

      const viewByTab = {
        goals: 'top_scorers',
        assists: 'top_assists',
        contributions: 'goal_contributions',
        ratings: 'player_ratings',
      } as const;

      const { data, error } = await supabase!
        .from(viewByTab[leaderboardTab as Exclude<LeaderboardTab, 'managers'>])
        .select('*');

      if (cancelled) return;

      if (error) {
        setLeaderboardError(error.message);
        setLeaderboardPlayers([]);
      } else {
        setLeaderboardPlayers((data ?? []) as LeaderboardPlayer[]);
      }

      setLeaderboardLoading(false);
    }

    void loadLeaderboard();
    return () => { cancelled = true; };
  }, [screen, leaderboardTab, session, approved]);

  // Fantasy standings: points for every manager, calculated by the database.
  useEffect(() => {
    if (demoMode || !supabase || !session || !approved) return;
    if (screen !== 'overview' && screen !== 'leaderboard') return;

    let cancelled = false;

    async function loadStandings() {
      setStandingsLoading(true);
      setStandingsError('');

      const { data, error } = await supabase!.rpc('league_standings');

      if (cancelled) return;

      if (error) {
        setStandingsError(error.message);
        setStandings([]);
      } else {
        setStandings(
          ((data ?? []) as Standing[]).map(row => ({
            ...row,
            total_points: Number(row.total_points) || 0,
            last_gameweek_points: Number(row.last_gameweek_points) || 0,
          }))
        );
      }

      setStandingsLoading(false);
    }

    void loadStandings();
    return () => { cancelled = true; };
  }, [demoMode, session, approved, screen, reloadKey]);

  async function saveSquad() {
    setSquadError('');
    setSessionMessage('');

    if (demoMode || !supabase || !session) {
      setSessionMessage('Demo mode: this squad is not saved to the database.');
      return;
    }

    if (!approved) {
      setSquadError('Your player account must be approved before saving a squad.');
      return;
    }

    if (!targetGw) {
      setSquadError('No gameweek is open for squads right now. Ask an admin to create one.');
      return;
    }

    if (selected.length !== 7 || new Set(selected).size !== 7) {
      setSquadError('Select exactly seven different players before saving.');
      return;
    }

    if (selectedCost > 50) {
      setSquadError('Your squad exceeds the £50m budget.');
      return;
    }

    if (!captain || !starters.includes(captain)) {
      setSquadError('Choose a captain from your starting five.');
      return;
    }

    if (!viceCaptain || !starters.includes(viceCaptain) || viceCaptain === captain) {
      setSquadError('Choose a different vice-captain from your starting five.');
      return;
    }

    setSquadSaving(true);
    setSessionMessage('Saving your squad…');

    // The database checks budget, deadline, transfers and chips, and saves everything at once.
    const { error } = await supabase.rpc('save_squad', {
      p_gameweek_id: targetGw.id,
      p_captain: captain,
      p_vice: viceCaptain,
      p_player_ids: selected,
      p_chip: activeChip,
    });

    setSquadSaving(false);

    if (error) {
      setSessionMessage('');
      setSquadError(`Could not save: ${error.message}`);
      return;
    }

    setSessionMessage(`Your squad is saved for gameweek ${targetGw.number}.`);
    setReloadKey(k => k + 1);
  }

  if (!demoMode && !session) {
    return (
      <main className="auth-wrap">
        <div className="brand">
          <span className="brand-mark">⚽</span>
          <div>
            <div className="eyebrow">THURSDAY FOOTBALL FANTASY</div>
            <h1>El Khames <em>El Momtaz</em></h1>
          </div>
        </div>

        <section className="auth-card">
          <h2>{authMode === 'signin' ? 'Welcome back' : 'Join your league'}</h2>
          <p className="muted">
            {authMode === 'signin'
              ? 'Sign in to manage your squad.'
              : 'Create your player account. An admin must approve you.'}
          </p>

          <form onSubmit={submitAuth}>
            {authMode === 'signup' && (
              <label>
                Your name
                <input
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
            )}

            <label>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>

            <button className="primary full" type="submit">
              {authMode === 'signin' ? 'Sign in' : 'Create player account'}
            </button>
          </form>

          {notice && <p className="notice">{notice}</p>}

          <button
            className="text-button"
            onClick={() => {
              setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
              setNotice('');
            }}
          >
            {authMode === 'signin'
              ? 'New here? Register with your invite link'
              : 'Already registered? Sign in'}
          </button>
        </section>

        <p className="tiny center">Private league · Cairo time</p>
      </main>
    );
  }

  const leaderboardValue = (player: LeaderboardPlayer) => {
    if (leaderboardTab === 'goals') return player.total_goals ?? 0;
    if (leaderboardTab === 'assists') return player.total_assists ?? 0;
    if (leaderboardTab === 'contributions') return player.total_contributions ?? 0;
    return player.average_rating == null
      ? '—'
      : Number(player.average_rating).toFixed(2);
  };

  const myStanding = standings.find(row => row.manager_id === session?.user?.id) ?? null;
  const myRank = myStanding ? standings.indexOf(myStanding) + 1 : 0;

  const leaderboardDescription = {
    managers: 'Fantasy points for every manager in the league.',
    goals: 'Total goals scored in finished matches.',
    assists: 'Total assists recorded in finished matches.',
    contributions: 'Goals plus assists across finished matches.',
    ratings: 'Average player rating from recorded match ratings.',
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand compact">
          <span className="brand-mark">⚽</span>
          <div>
            <div className="eyebrow">THURSDAY FANTASY</div>
            <h2>El Khames <em>El Momtaz</em></h2>
          </div>
        </div>

        <div className="league-pill"><span className="pulse" /> PRIVATE LEAGUE</div>

        <nav>
          {nav.filter(n => !n.admin || isAdmin).map(n => (
            <button
              key={n.id}
              className={`nav-item ${screen === n.id ? 'active' : ''}`}
              onClick={() => setScreen(n.id)}
            >
              <n.icon size={18} />
              {n.label}
              {n.admin && <span className="nav-admin">ADMIN</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="account-chip">
            <div className="avatar">{isAdmin ? 'A' : 'P'}</div>
            <div className="account-copy">
              <strong>
                {demoMode
                  ? isAdmin ? 'Admin + Player' : 'Player account'
                  : profile?.display_name}
              </strong>
              <span>{isAdmin ? 'League administrator' : 'Fantasy manager'}</span>
            </div>
            <button
              className="icon-btn"
              title="Sign out"
              onClick={() => demoMode
                ? setDemoRole(demoRole === 'admin_player' ? 'player' : 'admin_player')
                : void signOut()}
            >
              {demoMode ? <ArrowLeftRight size={16} /> : <LogOut size={16} />}
            </button>
          </div>
          <div className="tiny">{demoMode ? 'Demo mode · sample data' : 'Secure account'}</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              THURSDAY SESSION / GAMEWEEK {String(gameweekNumber).padStart(2, '0')}
            </div>
            <h2>{nav.find(n => n.id === screen)?.label}</h2>
          </div>
          <div className="top-actions">
            <span className="deadline">
              <CalendarDays size={15} />{' '}
              {targetGw?.transfer_deadline
                ? `Transfers close ${new Date(targetGw.transfer_deadline).toLocaleString('en-GB', {
                    weekday: 'short', day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
                  })}`
                : 'No transfer deadline set'}
            </span>
                   <div className="avatar">{isAdmin ? 'A' : 'P'}</div>
            <button
              type="button"
              className="icon-btn"
              title={demoMode ? 'Switch preview role' : 'Sign out'}
              onClick={() => demoMode
                ? setDemoRole(demoRole === 'admin_player' ? 'player' : 'admin_player')
                : void signOut()}
            >
              {demoMode ? <ArrowLeftRight size={18} /> : <LogOut size={18} />}
            </button>
          </div>
        </header>

        {demoMode && (
          <div className="demo-banner">
            <span><strong>Interactive preview</strong> — sample data only.</span>
            <label>
              Preview role
              <select
                value={demoRole}
                onChange={e => {
                  setDemoRole(e.target.value as 'admin_player' | 'player');
                  setScreen('overview');
                }}
              >
                <option value="admin_player">Admin + Player</option>
                <option value="player">Player only</option>
              </select>
            </label>
          </div>
        )}

                {!demoMode && !profileLoading && profile && !approved && (
          <div className="approval-banner">
            <LockKeyhole size={18} />
            <div>
              <strong>Player profile awaiting approval</strong>
              <p>An admin must approve you before you can use the league.</p>
            </div>
          </div>
        )}

        {screen === 'overview' && (
          <>
            <section className="hero">
              <div className="hero-content">
                <span className="tag">GAMEWEEK CONTROL</span>
                <h1>Your Thursday.<br /><em>Your fantasy.</em></h1>
                <p>
                  Every 15-minute match counts toward one combined session
                  score. Rotate teams, record stats, climb the table.
                </p>
                
<div className="hero-actions">
  {isAdmin && (
    <button
      className="primary"
      onClick={() => setScreen('admin')}
    >
      <ShieldCheck size={17} />
      Open admin panel
    </button>
  )}

  <button
    className="secondary"
    onClick={() => setScreen('squad')}
  >
    View my squad
    <ChevronRight size={16} />
  </button>

  <button
    className="primary"
    onClick={() => setScreen('players')}
  >
    Player Market
    <ArrowLeftRight size={16} />
  </button>
</div>


                              </div>
              <div className="hero-ball">⚽</div>
              <div className="hero-lines" />
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <span>MY TEAM VALUE</span>
                <strong>£{selectedCost.toFixed(1)}m</strong>
                <small><Wallet size={13} /> £{(50 - selectedCost).toFixed(1)}m remaining</small>
              </div>
              <div className="stat-card">
                <span>{demoMode ? 'SESSION POINTS' : 'MY POINTS'}</span>
                <strong>{demoMode ? effectiveDemoPoints : myStanding?.total_points ?? 0} <small>pts</small></strong>
                <small className="positive">
                  <Trophy size={13} />{' '}
                  {demoMode
                    ? 'Preview points'
                    : myStanding
                      ? `Rank ${myRank} of ${standings.length} · ${myStanding.last_gameweek_points} last gameweek`
                      : standingsError
                        ? 'Could not load points'
                        : standingsLoading ? 'Loading points…' : 'No points yet'}
                </small>
              </div>
              <div className="stat-card">
                <span>GAMEWEEK STATUS</span>
                <strong className="status-text">{gameweek?.status ?? 'Not started'}</strong>
                <small><span className="status-dot" /> Admin starts manually</small>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div><h3>How this league works</h3><p>Made for your rotating 15-minute matches</p></div>
                <span className="tag">LEAGUE RULES</span>
              </div>
              <div className="rule-grid">
                <div><Users /><strong>5 starters + 2 bench</strong><span>No positions, £50m budget</span></div>
                <div><Crown /><strong>Captain x2</strong><span>Double eligible points</span></div>
                <div><ArrowLeftRight /><strong>Flexible transfers</strong><span>One free from Gameweek 2</span></div>
                <div><Trophy /><strong>One session score</strong><span>No appearance points</span></div>
              </div>
            </section>
          </>
        )}

        
        {screen === 'squad' && (
          <>
            <section className="panel egypt-squad-panel">
              <div className="panel-heading">
                <div>
                  <h3>My fantasy squad</h3>
                  <p>Choose your captain, activate a chip, and arrange your seven players.</p>
                </div>
                <span className="budget">£{selectedCost.toFixed(1)}m / £50.0m</span>
              </div>

              <div className="budget-track">
                <span style={{ width: `${Math.min(selectedCost / 50 * 100, 100)}%` }} />
              </div>

              {!demoMode && (
                          {!demoMode && (
                <p className="muted tiny">
                  {squadLoading
                    ? 'Loading your saved squad…'
                    : targetGw
                      ? `Picking squad for Gameweek ${targetGw.number} (${targetGw.status})`
                      : 'Transfers are currently closed.'}
                </p>
              )}

              {playersError && <div className="notice">{playersError}</div>}
              {squadError && <div className="notice">{squadError}</div>}

              <div className="lineup-heading">
                <strong>Gameweek chips</strong>
                <span>One chip per gameweek</span>
              </div>

              <div className="egypt-chip-row">
                {[
                  { name: 'Triple Captain', icon: '👑', desc: 'Captain scores triple' },
                  { name: 'Wildcard', icon: '🃏', desc: 'Unlimited transfers' },
                  { name: 'Bench Boost', icon: '🪑', desc: 'Bench points count' },
                ].map(chip => {
                  const active = activeChip === chip.name;
                  const used = usedChips.includes(chip.name) && !active;

                  return (
                    <button
                      type="button"
                      key={chip.name}
                      className={`egypt-chip ${active ? 'active' : ''}`}
                      disabled={used || (activeChip !== null && !active) || matchInProgress}
                      onClick={() => {
                        setActiveChip(active ? null : chip.name);
                        setSessionMessage(
                          active
                            ? `${chip.name} removed.`
                            : `${chip.name} selected. It is used when you save your squad.`
                        );
                      }}
                    >
                      <strong>{chip.icon} {chip.name}</strong>
                      <span>{active ? 'ACTIVE' : used ? 'USED' : chip.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="egypt-lineup-layout">
                <div className="egypt-pitch">
                  <div className="egypt-pitch-title">Starting XI · Five players</div>
                  <div className="egypt-pitch-markings">
                    <div className="egypt-halfway" />
                    <div className="egypt-centre-circle" />
                    <div className="egypt-goal-box egypt-goal-top" />
                    <div className="egypt-goal-box egypt-goal-bottom" />
                  </div>

                  <div className="egypt-formation">
                    {starters.map((id, index) => {
                      const p = playerById.get(id);
                      if (!p) return null;

                      return (
                        <div
                          key={id}
                          className={`egypt-player ${swapStarter === id ? 'selected' : ''}`}
                        >
                          <button
                            type="button"
                            className="egypt-player-main"
                            disabled={matchInProgress}
                            onClick={() => setSwapStarter(id)}
                            title="Select this starter to swap"
                          >
                            <span className="egypt-shirt">
                              {p.photo_url
                                ? <img src={p.photo_url} alt="" />
                                : <span>{p.name.slice(0, 1).toUpperCase()}</span>}
                            </span>
                            {captain === id && <span className="egypt-captain-badge">C</span>}
                            <strong>{p.name}</strong>
                            <small>£{p.price.toFixed(1)}m</small>
                            {demoMode && <small>{p.points} pts</small>}
                          </button>

                         
<button
  type="button"
  className={`egypt-captain-action ${captain === id ? 'chosen' : ''}`}
  disabled={matchInProgress}
  onClick={() => {
    setCaptain(id);
    if (viceCaptain === id) setViceCaptain('');
  }}
>
  {captain === id ? '★ Captain (C)' : 'Make captain'}
</button>

<button
  type="button"
  className={`egypt-captain-action ${viceCaptain === id ? 'chosen' : ''}`}
  disabled={matchInProgress || captain === id}
  onClick={() => setViceCaptain(id)}
>
  {viceCaptain === id ? 'Vice-Captain (VC)' : 'Make vice-captain'}
</button>


                          <div className="egypt-swap-buttons">
                            {bench.map((benchId, benchIndex) => (
                              <button
                                type="button"
                                key={benchId}
                                disabled={matchInProgress}
                                                               onClick={() => {
                                  const next = [...selected];
                                  const starterIndex = next.indexOf(id);
                                  const subIndex = next.indexOf(benchId);
                                  if (starterIndex >= 0 && subIndex >= 0) {
                                    [next[starterIndex], next[subIndex]] =
                                      [next[subIndex], next[starterIndex]];
                                    applyLineup(next);
                                  }
                                  setSwapStarter(null);
                                }}
                              >
                                ↔ Sub {benchIndex + 1}
                              </button>
                            ))}
                          </div>
                          <span className="egypt-player-number">{index + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="egypt-pitch-hint">
                    Select a starter, then use the substitute buttons to swap players.
                  </p>
                </div>

                <aside className="egypt-bench">
                  <h3>Substitutes</h3>
                  <p>Sub 1 is first to come on.</p>

                  {bench.map((id, index) => {
                    const p = playerById.get(id);
                    if (!p) return null;

                    return (
                      <div className="egypt-bench-player" key={id}>
                        <span className="egypt-sub-number">{index + 1}</span>
                        {p.photo_url
                          ? <img src={p.photo_url} alt={p.name} />
                          : <div className="player-photo">{p.name.slice(0, 1)}</div>}
                        <div className="egypt-bench-info">
                          <strong>{p.name}</strong>
                          <span>£{p.price.toFixed(1)}m</span>
                          {demoMode && <span>{p.points} preview pts</span>}
                        </div>
                        <button
                          type="button"
                          className="egypt-bench-swap"
                          disabled={matchInProgress || !swapStarter}
                          title={swapStarter ? `Swap with ${playerById.get(swapStarter)?.name}` : 'Select a starter first'}
                                                    onClick={() => {
                            if (!swapStarter) return;
                            const next = [...selected];
                            const starterIndex = next.indexOf(swapStarter);
                            const subIndex = next.indexOf(id);
                            if (starterIndex >= 0 && subIndex >= 0) {
                              [next[starterIndex], next[subIndex]] =
                                [next[subIndex], next[starterIndex]];
                              applyLineup(next);
                            }
                            setSwapStarter(null);
                          }}
                        >
                          Swap
                        </button>
                        {index === 1 && (
                          <button
                            type="button"
                            className="egypt-bench-swap"
                            disabled={matchInProgress}
                            onClick={() => {
                              setSelected(old => {
                                if (old.length < 7) return old;
                                const next = [...old];
                                [next[5], next[6]] = [next[6], next[5]];
                                return next;
                              });
                              setSwapStarter(null);
                            }}
                            title="Move this substitute into the first bench position"
                          >
                            ↑
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <div className="egypt-bench-note">
                    {swapStarter
                      ? `Selected: ${playerById.get(swapStarter)?.name ?? ''}. Choose Swap beside a substitute.`
                      : 'Select a starter on the pitch to enable the Swap buttons.'}
                  </div>
                </aside>
              </div>

              {demoMode && (
              <>
              <div className="match-lock-panel">
                <div>
                  <strong>{matchInProgress ? '15-minute match in progress' : 'Ready for kickoff?'}</strong>
                  <p>
                    {matchInProgress
                      ? 'Lineup changes are locked until this preview match finishes.'
                      : 'Make your lineup changes and save before kickoff.'}
                  </p>
                </div>
                {!matchInProgress ? (
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      setMatchInProgress(true);
                      setDidNotPlay([]);
                      setSwapStarter(null);
                      setSessionMessage('Preview match started. Lineup changes are locked locally.');
                    }}
                  >
                    Start 15-minute match
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      const next = [...selected];
                      let message = 'Preview match finished.';
                      const missing = didNotPlay.filter(id => next.slice(0, 5).includes(id));

                      for (const absent of missing) {
                        const starterIndex = next.slice(0, 5).indexOf(absent);
                        const benchIndex = next.slice(5).findIndex(id => !didNotPlay.includes(id));

                        if (starterIndex >= 0 && benchIndex >= 0) {
                          const actualBenchIndex = 5 + benchIndex;
                          const replacement = next[actualBenchIndex];
                          [next[starterIndex], next[actualBenchIndex]] =
                            [next[actualBenchIndex], next[starterIndex]];
                          message += ` Auto-sub: ${playerById.get(replacement)?.name ?? 'Bench player'} replaces ${playerById.get(absent)?.name ?? 'starter'}.`;
                        }
                      }

                      setSelected(next);
                      setMatchInProgress(false);
                      setDidNotPlay([]);
                      setSessionMessage(message);
                    }}
                  >
                    Finish match & auto-sub
                  </button>
                )}
              </div>

              {matchInProgress && (
                <div className="did-not-play">
                  <label htmlFor="did-not-play">Starter who did not play</label>
                  <select
                    id="did-not-play"
                    multiple
                    value={didNotPlay}
                    onChange={e => setDidNotPlay(
                      Array.from(e.target.selectedOptions, option => option.value)
                    )}
                  >
                    {starters.map(id => (
                      <option key={id} value={id}>
                        {playerById.get(id)?.name ?? id}
                      </option>
                    ))}
                  </select>
                  <p className="tiny muted">
                    Preview control only. It does not record a real match.
                  </p>
                </div>
              )}

              </>
              )}

              {sessionMessage && (
                <div className="notice inline-notice">
                  {sessionMessage}
                  <button type="button" className="text-button" onClick={() => setSessionMessage('')}>
                    Dismiss
                  </button>
                </div>
              )}

              <div className="transfer-controls">
                <button
                  type="button"
                  className="primary"
                  disabled={squadSaving || squadLoading || matchInProgress || selected.length !== 7}
                  onClick={() => void saveSquad()}
                >
                  {squadSaving ? 'Saving squad…' : 'Save my squad'}
                </button>
              </div>

              <p className="muted tiny">
                {demoMode
                  ? 'Demo changes are not saved to Supabase.'
                  : 'Saving requires an active gameweek and the correct Supabase permissions.'}
              </p>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Transfer allowance</h3>
                  <p>One new free transfer each gameweek. Unused transfers carry over, up to a maximum of 2. Extra transfers cost 4 points each.</p>
                </div>
                <ArrowLeftRight color="#dfbd62" />
              </div>
              <div className="transfer-summary">
                <div><span>Free transfers</span><strong>{freeTransfers}</strong></div>
                <div><span>Used</span><strong>{transfersUsed}</strong></div>
                <div><span>Transfer hits</span><strong>−{pointsHits} pts</strong></div>
              </div>
              
            </section>
          </>
        )}

       
{screen === 'players' && (
  <section className="panel">
    <div className="panel-heading">
      <div>
        <h3>Player Market</h3>
        <p>Choose 7 players for your fantasy team.</p>
      </div>
      <span className="tag">{players.length} AVAILABLE</span>
    </div>

    <div className="transfer-summary">
      <div>
        <span>Squad selected</span>
        <strong>{selected.length} / 7</strong>
      </div>
      <div>
        <span>Budget used</span>
        <strong>£{selectedCost.toFixed(1)}m</strong>
      </div>
      <div>
        <span>Budget remaining</span>
        <strong>£{Math.max(0, 50 - selectedCost).toFixed(1)}m</strong>
      </div>
    </div>

    <div className="budget-track">
      <span
        style={{
          width: `${Math.min(selectedCost / 50 * 100, 100)}%`,
        }}
      />
    </div>

    {playersLoading && (
      <p className="muted">Loading available players…</p>
    )}

    {playersError && (
      <div className="notice">{playersError}</div>
    )}

    {!playersLoading && !playersError && players.length === 0 && (
      <div className="notice">
        No players are available yet. Check that players have been added
        to the football_players table and marked as active in Supabase.
      </div>
    )}
<div className="player-market-filters">
  <input
    type="search"
    className="player-search"
    placeholder="Search players..."
    value={playerSearch}
    onChange={e => setPlayerSearch(e.target.value)}
  />

  <select
    className="player-price-filter"
    value={priceFilter}
    onChange={e => setPriceFilter(e.target.value)}
  >
    <option value="all">All prices</option>
    <option value="under5">Under £5m</option>
    <option value="5to7">£5m – £7m</option>
    <option value="over7">Over £7m</option>
  </select>
</div>
    <div className="player-list">
      {filteredPlayers.map(p => {
        const isSelected = selected.includes(p.id);

        return (
          <div className="player-row" key={p.id}>
            {p.photo_url ? (
              <img
                className="leaderboard-photo"
                src={p.photo_url}
                alt={p.name}
              />
            ) : (
              <div className="player-photo small-photo">
                {p.name.slice(0, 1)}
              </div>
            )}

            <div className="player-info">
              <strong>{p.name}</strong>
              <span>
                {isSelected ? 'In your squad' : 'Available to select'}
              </span>
            </div>

            <strong className="price">
              £{p.price.toFixed(1)}m
            </strong>

            <button
              type="button"
              className={isSelected ? 'secondary compact-btn' : 'primary compact-btn'}
              disabled={
                matchInProgress ||
                (!isSelected &&
                  (selected.length >= 7 || selectedCost + p.price > 50))
              }
                            onClick={() => {
                if (matchInProgress) return;
                if (selected.includes(p.id)) {
                  applyLineup(selected.filter(id => id !== p.id));
                  if (swapStarter === p.id) setSwapStarter(null);
                  return;
                }
                if (selected.length >= 7 || Math.round((selectedCost + p.price) * 10) > 500) {
                  return;
                }
                applyLineup([...selected, p.id]);
              }}
            >
              {isSelected ? 'Remove' : 'Add player'}
            </button>
          </div>
        );
      })}
    </div>

    <div className="transfer-controls">
      <button
        type="button"
        className="primary"
        disabled={selected.length !== 7 || selectedCost > 50}
        onClick={() => setScreen('squad')}
      >
        {selected.length === 7
          ? 'Pick My Team →'
          : `Select ${7 - selected.length} more player${7 - selected.length === 1 ? '' : 's'}`}
      </button>
    </div>

    <p className="muted tiny">
      Select seven different players within the £50m budget, then arrange
      your five starters and two substitutes on My Squad.
    </p>
  </section>
)}

        {screen === 'leaderboard' && (
          <section className="panel">
            <div className="panel-heading">
              <div><h3>{leaderboardTab === 'managers' ? 'League table' : 'Player leaderboard'}</h3><p>{leaderboardDescription[leaderboardTab]}</p></div>
              <Trophy color="#C4FF61" />
            </div>

            <div className="leaderboard-tabs">
              {leaderboardTabs.map(tab => (
                <button
                  key={tab.id}
                  className={leaderboardTab === tab.id ? 'primary' : 'secondary'}
                  onClick={() => setLeaderboardTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {demoMode && <div className="notice">Demo mode is using sample data.</div>}

            {!demoMode && leaderboardTab === 'managers' && (
              <>
                {standingsLoading && <p className="muted">Loading league table…</p>}
                {standingsError && <div className="notice">Could not load the league table: {standingsError}</div>}
                {!standingsLoading && !standingsError && (
                  <div className="leaderboard-list">
                    {standings.length === 0
                      ? <p className="muted">No managers yet.</p>
                      : standings.map((row, index) => (
                          <div
                            className={`leaderboard-player ${row.manager_id === session?.user?.id ? 'is-me' : ''}`}
                            key={row.manager_id}
                          >
                            <span className={`rank ${index === 0 ? 'first' : ''}`}>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="player-photo small-photo">{(row.display_name || '?').slice(0, 1)}</div>
                            <div className="leaderboard-player-info">
                              <strong>{row.display_name}{row.manager_id === session?.user?.id ? ' (you)' : ''}</strong>
                              <span>{row.last_gameweek_points} pts last gameweek</span>
                            </div>
                            <strong className="leaderboard-stat">{row.total_points} pts</strong>
                          </div>
                        ))}
                  </div>
                )}
                {!standingsLoading && !standingsError && standings.length > 0 && standings.every(r => r.total_points === 0) && (
                  <p className="muted tiny">Points appear once an admin starts a gameweek and records match stats.</p>
                )}
              </>
            )}

            {leaderboardTab !== 'managers' && leaderboardLoading && <p className="muted">Loading leaderboard…</p>}
            {leaderboardTab !== 'managers' && leaderboardError && <div className="notice">Could not load leaderboard: {leaderboardError}</div>}

            {!demoMode && leaderboardTab !== 'managers' && !leaderboardLoading && !leaderboardError && (
              <div className="leaderboard-list">
                {leaderboardPlayers.length === 0
                  ? <p className="muted">No statistics available yet. Results appear after match statistics are recorded.</p>
                  : [...leaderboardPlayers]
                      .sort((a, b) => (Number(leaderboardValue(b)) || 0) - (Number(leaderboardValue(a)) || 0))
                      .map((player, index) => (
                        <div className="leaderboard-player" key={player.player_id}>
                          <span className={`rank ${index === 0 ? 'first' : ''}`}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          {player.photo_url
                            ? <img className="leaderboard-photo" src={player.photo_url} alt={player.display_name} />
                            : <div className="player-photo small-photo">{(player.display_name || '?').slice(0, 1)}</div>}
                          <div className="leaderboard-player-info">
                            <strong>{player.display_name}</strong>
                            {leaderboardTab === 'ratings' && <span>{player.matches_rated ?? 0} ratings recorded</span>}
                          </div>
                          <strong className="leaderboard-stat">
                            {leaderboardValue(player)}
                            {leaderboardTab === 'ratings' ? '' : ` ${leaderboardTab === 'contributions' ? 'G+A' : leaderboardTab === 'goals' ? 'G' : 'A'}`}
                          </strong>
                        </div>
                      ))}
              </div>
            )}

            {demoMode && (
              <div className="leaderboard-list">
    <div className="leaderboard-table-heading">
      <span>RANK</span>
      <span>PLAYER</span>
      <span>PERFORMANCE</span>
    </div>

    {demoPlayers
      .slice(0, 5)
      .map((player, index) => (
        <div
          className={`leaderboard-player leaderboard-row-${index + 1}`}
          key={player.id}
        >
          <span className={`rank ${index < 3 ? `podium podium-${index + 1}` : ''}`}>
            {index === 0 ? '🏆' : String(index + 1).padStart(2, '0')}
          </span>

          <div className="player-photo small-photo">
            {player.name.slice(0, 1)}
          </div>

          <div className="leaderboard-player-info">
            <strong>{player.name}</strong>
            <span>{index === 0 ? 'League leader' : 'Fantasy manager'}</span>
          </div>

          <strong className="leaderboard-stat">
            {leaderboardTab === 'ratings'
              ? '—'
              : leaderboardTab === 'contributions'
                ? `${player.points} G+A`
                : `${player.points} ${leaderboardTab === 'goals' ? 'G' : 'A'}`}
          </strong>
        </div>
      ))}
  </div>
)}
          </section>
        )}

        {screen === 'admin' && isAdmin && supabase && (
          <AdminPanel db={supabase} onChanged={() => setReloadKey(k => k + 1)} />
        )}

        {screen === 'admin' && isAdmin && !supabase && (
          <section className="panel">
            <div className="notice">Connect Supabase to use the admin tools.</div>
          </section>
        )}

        {screen === 'admin' && !isAdmin && (
          <section className="panel">
            <div className="denied">
              <LockKeyhole size={32} />
              <h3>Admin access only</h3>
              <p>Your account cannot edit prices, approve players, or control gameweeks.</p>
            </div>
          </section>
        )}

        <footer>
          <span>EL KHAMES EL MOMTAZ</span>
          <span>Built for Thursday football · Cairo time</span>
        </footer>
      </main>
    </div>
  );
}
