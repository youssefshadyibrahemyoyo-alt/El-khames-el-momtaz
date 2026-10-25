
import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Crown,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { isSupabaseConfigured, Profile, supabase } from './supabase';

type Screen = 'overview' | 'squad' | 'players' | 'leaderboard' | 'admin';
type LeaderboardTab = 'goals' | 'assists' | 'contributions' | 'ratings';

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
};

type LeaguePlayer = {
  id: string;
  name: string;
  price: number;
  points: number;
  photo_url: string | null;
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
  { id: 'goals', label: 'Goals' },
  { id: 'assists', label: 'Assists' },
  { id: 'contributions', label: 'Goal contributions' },
  { id: 'ratings', label: 'Ratings' },
];

const activeStatuses = ['active', 'started', 'in_progress', 'open'];

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

  const [gameweek, setGameweek] = useState<Gameweek | null>(null);
  const [squadRecord, setSquadRecord] = useState<SquadRecord | null>(null);
 const [selected, setSelected] = useState<string[]>([]);
const [captain, setCaptain] = useState('');
const [viceCaptain, setViceCaptain] = useState('');
  const [gameweekNumber, setGameweekNumber] = useState(1);
  const [transfersUsed, setTransfersUsed] = useState(0);
  const [pointsHits, setPointsHits] = useState(0);
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
    useState<LeaderboardTab>('goals');
  const [leaderboardPlayers, setLeaderboardPlayers] =
    useState<LeaderboardPlayer[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');

  async function loadProfile(id: string) {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id,display_name,role,player_approval_status')
      .eq('id', id)
      .single();

    if (error) {
      setNotice('Your account profile could not be loaded. Check your database setup.');
    } else {
      setProfile(data as Profile);
    }
  }

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) void loadProfile(data.session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        setSession(next);
        if (next) {
          setTimeout(() => void loadProfile(next.user.id), 0);
        } else {
          setProfile(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
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
      }));

  const playerById = new Map(players.map(p => [p.id, p]));
  


  const selectedPlayers = selected
    .map(id => playerById.get(id))
    .filter((p): p is LeaguePlayer => Boolean(p));

  const selectedCost = selectedPlayers.reduce((sum, p) => sum + p.price, 0);
  const starters = selected.slice(0, 5);
  const bench = selected.slice(5, 7);
  const freeTransfers = gameweekNumber >= 2 ? 1 : 0;

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
        .eq('is_active', true)
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
  }, [demoMode, session, approved]);

  // Load the current active gameweek, then this manager's saved squad.
  useEffect(() => {
    if (demoMode || !supabase || !session || !approved) return;

    let cancelled = false;

    async function loadSquad() {
      setSquadLoading(true);
      setSquadError('');

      const { data: weeks, error: weekError } = await supabase!
        .from('gameweeks')
        .select('id,number,status,transfer_deadline,started_at,ended_at')
        .order('number', { ascending: false });

      if (cancelled) return;

      if (weekError) {
        setSquadError(`Could not load gameweeks: ${weekError.message}`);
        setSquadLoading(false);
        return;
      }

      const weekRows = (weeks ?? []) as Gameweek[];
      const current = weekRows.find(w =>
        activeStatuses.includes(String(w.status).toLowerCase())
      );

      setGameweek(current ?? null);

      if (current) {
        setGameweekNumber(current.number);

        const { data: record, error: recordError } = await supabase!
          .from('fantasy_squads')
          .select('id,manager_id,gameweek_id,captain_player_id,vice_captain_player_id,chip,transfers_used,points_hit')
          .eq('manager_id', session.user.id)
          .eq('gameweek_id', current.id)
          .maybeSingle();

        if (cancelled) return;

        if (recordError) {
          setSquadError(`Could not load your squad: ${recordError.message}`);
        } else if (record) {
          const saved = record as SquadRecord;
          setSquadRecord(saved);
          setTransfersUsed(saved.transfers_used ?? 0);
          setPointsHits(saved.points_hit ?? 0);
          setActiveChip(saved.chip ?? null);

          const { data: rows, error: playersError } = await supabase!
            .from('squad_players')
            .select('player_id,slot')
            .eq('squad_id', saved.id)
            .order('slot', { ascending: true });

          if (cancelled) return;

          if (playersError) {
            setSquadError(`Could not load saved players: ${playersError.message}`);
          } else {
            const ordered = (rows ?? [])
              .sort((a, b) => Number(a.slot) - Number(b.slot))
              .map(row => String(row.player_id));

            setSelected(ordered);
            setCaptain(saved.captain_player_id ?? ordered[0] ?? '');
            setViceCaptain(saved.vice_captain_player_id ?? '');
          }
        } else {
          setSquadRecord(null);
          setSelected([]);
          setCaptain('');
          setTransfersUsed(0);
          setPointsHits(0);
          setActiveChip(null);
        }
      } else {
        setSquadRecord(null);
        setSelected([]);
        setCaptain('');
        setSquadError('No active gameweek. An admin must start a gameweek before a squad can be saved.');
      }

      setSquadLoading(false);
    }

    void loadSquad();
    return () => { cancelled = true; };
  }, [demoMode, session, approved]);

  // Load the selected real leaderboard.
  useEffect(() => {
    if (screen !== 'leaderboard' || !supabase || !session || !approved) return;

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
        .from(viewByTab[leaderboardTab])
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

    if (!gameweek) {
      setSquadError('There is no active gameweek. Ask an admin to start one first.');
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
if (
  !viceCaptain ||
  !starters.includes(viceCaptain) ||
  viceCaptain === captain
) {
  setSquadError('Choose a different vice-captain from your starting five.');
  return;
}
    setSquadSaving(true);

    try {
      let squadId = squadRecord?.id;

     
const squadValues = {
  manager_id: session.user.id,
  gameweek_id: gameweek.id,
  captain_player_id: captain,
  vice_captain_player_id: viceCaptain,
  chip: activeChip,
  transfers_used: transfersUsed,
  points_hit: pointsHits,
};


      if (squadId) {
        const { error } = await supabase
          .from('fantasy_squads')
          .update(squadValues)
          .eq('id', squadId)
          .eq('manager_id', session.user.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('fantasy_squads')
          .insert(squadValues)
          .select('id,manager_id,gameweek_id,captain_player_id,vice_captain_player_id,chip,transfers_used,points_hit')
          .single();

        if (error) throw error;
        squadId = data.id;
        setSquadRecord(data as SquadRecord);
      }

      const { error: deleteError } = await supabase
        .from('squad_players')
        .delete()
        .eq('squad_id', squadId);

      if (deleteError) throw deleteError;

      const playerRows = selected.map((playerId, index) => ({
        squad_id: squadId,
        player_id: playerId,
        slot: index + 1,
      }));

      const { error: insertError } = await supabase
        .from('squad_players')
        .insert(playerRows);

      if (insertError) throw insertError;

      setSessionMessage('Your seven-player squad has been saved.');
      setSquadRecord({
        id: squadId!,
        manager_id: session.user.id,
        gameweek_id: gameweek.id,
        captain_player_id: captain,
        chip: activeChip,
        transfers_used: transfersUsed,
        points_hit: pointsHits,
      });
    } catch (error: any) {
      setSquadError(
        `Save failed: ${error?.message ?? 'Unknown database error'}. Check the Supabase permissions for fantasy_squads and squad_players.`
      );
    } finally {
      setSquadSaving(false);
    }
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

  const leaderboardDescription = {
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
              <CalendarDays size={15} /> Transfers close Thu · 12:00 PM
            </span>
            <div className="avatar">{isAdmin ? 'A' : 'P'}</div>
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

        {!approved && (
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
                    <button className="primary" onClick={() => setScreen('admin')}>
                      <ShieldCheck size={17} /> Open admin panel
                    </button>
                  )}
                  
<div className="hero-actions">
  <button className="secondary" onClick={() => setScreen('squad')}>
    View my squad <ChevronRight size={16} />
  </button>
  <button className="primary" onClick={() => setScreen('players')}>
    Player Market <ArrowLeftRight size={16} />
  </button>
</div>

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
                <span>SESSION POINTS</span>
                <strong>{effectiveDemoPoints} <small>pts</small></strong>
                <small className="positive"><Trophy size={13} /> {demoMode ? 'Preview points' : 'Points integration pending'}</small>
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
                <p className="muted tiny">
                  {squadLoading
                    ? 'Loading your saved squad…'
                    : gameweek
                      ? `Gameweek ${gameweek.number} · ${gameweek.status}`
                      : 'No active gameweek is available for saving.'}
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
                        setActiveChip(chip.name);
                        setUsedChips(old =>
                          old.includes(chip.name) ? old : [...old, chip.name]
                        );
                        setSessionMessage(
                          `${chip.name} selected. Chip usage is not yet permanently tracked in the database.`
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
                                  setSelected(old => {
                                    const next = [...old];
                                    const starterIndex = next.indexOf(id);
                                    const subIndex = next.indexOf(benchId);
                                    if (starterIndex < 0 || subIndex < 0) return old;
                                    [next[starterIndex], next[subIndex]] =
                                      [next[subIndex], next[starterIndex]];
                                    return next;
                                  });
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
                            setSelected(old => {
                              const next = [...old];
                              const starterIndex = next.indexOf(swapStarter);
                              const subIndex = next.indexOf(id);
                              if (starterIndex < 0 || subIndex < 0) return old;
                              [next[starterIndex], next[subIndex]] =
                                [next[subIndex], next[starterIndex]];
                              return next;
                            });
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
                  <p>One free transfer per gameweek from Gameweek 2. Extra transfers cost 4 points.</p>
                </div>
                <ArrowLeftRight color="#dfbd62" />
              </div>
              <div className="transfer-summary">
                <div><span>Free transfers</span><strong>{gameweekNumber === 1 ? '∞' : freeTransfers}</strong></div>
                <div><span>Used</span><strong>{transfersUsed}</strong></div>
                <div><span>Transfer hits</span><strong>−{pointsHits} pts</strong></div>
              </div>
              <div className="transfer-controls">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setTransfersUsed(v => v + 1);
                    if (gameweekNumber > 1 && transfersUsed >= freeTransfers && activeChip !== 'Wildcard') {
                      setPointsHits(v => v + 4);
                    }
                  }}
                >
                  Record transfer (preview)
                </button>
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

    <div className="player-list">
      {players.map(p => {
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

                setSelected(old => {
                  if (old.includes(p.id)) {
                    const next = old.filter(id => id !== p.id);

                    if (captain === p.id) {
                      setCaptain(next.slice(0, 5)[0] ?? '');
                    }

                    return next;
                  }

                  if (old.length >= 7 || selectedCost + p.price > 50) {
                    return old;
                  }

                  const next = [...old, p.id];

                  if (!captain) setCaptain(next[0]);

                  return next;
                });
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
              <div><h3>Player leaderboard</h3><p>{leaderboardDescription[leaderboardTab]}</p></div>
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
            {leaderboardLoading && <p className="muted">Loading leaderboard…</p>}
            {leaderboardError && <div className="notice">Could not load leaderboard: {leaderboardError}</div>}

            {!demoMode && !leaderboardLoading && !leaderboardError && (
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
                {demoPlayers.slice(0, 5).map((player, index) => (
                  <div className="leaderboard-player" key={player.id}>
                    <span className={`rank ${index === 0 ? 'first' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
                    <div className="player-photo small-photo">{player.name.slice(0, 1)}</div>
                    <div className="leaderboard-player-info">
                      <strong>{player.name}</strong><span>Sample data only</span>
                    </div>
                    <strong className="leaderboard-stat">
                      {leaderboardTab === 'ratings' ? '—' : player.points}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {screen === 'admin' && isAdmin && (
          <section className="panel">
            <div className="panel-heading">
              <div><h3>Admin control room</h3><p>Gameweek and match administration still need database integration.</p></div>
              <ShieldCheck color="#C4FF61" />
            </div>
            <div className="admin-grid">
              <button className="admin-action" onClick={() => setNotice('Gameweek start controls are not connected yet.')}>
                <CalendarDays /><strong>Start gameweek</strong><span>Open a new session</span>
              </button>
              <button className="admin-action" onClick={() => setNotice('Gameweek end controls are not connected yet.')}>
                <CheckCircle2 /><strong>End gameweek</strong><span>Finalize the session</span>
              </button>
              <button className="admin-action" onClick={() => setNotice('Player approval controls need database integration.')}>
                <UserPlus /><strong>Approve registrations</strong><span>Review join requests</span>
              </button>
              <button className="admin-action" onClick={() => setNotice('Match-stat entry needs database integration.')}>
                <Trophy /><strong>Enter / correct stats</strong><span>Record match statistics</span>
              </button>
            </div>
            {notice && <div className="notice inline-notice">{notice}</div>}
            <div className="security-note">
              <LockKeyhole />
              <div>
                <strong>Role security</strong>
                <p>Admin privileges must be controlled by Supabase database policies, not client-side switches.</p>
              </div>
            </div>
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
