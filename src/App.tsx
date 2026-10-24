
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

type Screen =
  | 'overview'
  | 'squad'
  | 'players'
  | 'leaderboard'
  | 'admin';

type LeaderboardTab =
  | 'goals'
  | 'assists'
  | 'contributions'
  | 'ratings';

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

const demoPlayers = [
  { name: 'Karim', price: 7, points: 18 },
  { name: 'Omar', price: 6.5, points: 15 },
  { name: 'Youssef', price: 6, points: 12 },
  { name: 'Ziad', price: 5.5, points: 10 },
  { name: 'Adam', price: 5.5, points: 9 },
  { name: 'Mazen', price: 4.5, points: 8 },
  { name: 'Nour', price: 4.5, points: 7 },
  { name: 'Fares', price: 4.5, points: 6 },
];

const leaderboardTabs: { id: LeaderboardTab; label: string }[] = [
  { id: 'goals', label: 'Goals' },
  { id: 'assists', label: 'Assists' },
  { id: 'contributions', label: 'Goal contributions' },
  { id: 'ratings', label: 'Ratings' },
];

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

  const [selected, setSelected] = useState([
    'Karim', 'Omar', 'Youssef', 'Ziad', 'Adam', 'Mazen', 'Nour',
  ]);
  const [captain, setCaptain] = useState('Karim');
  const [gameweekNumber, setGameweekNumber] = useState(1);
  const [transfersUsed, setTransfersUsed] = useState(0);
  const [pointsHits, setPointsHits] = useState(0);
  const [usedChips, setUsedChips] = useState<string[]>([]);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [matchInProgress, setMatchInProgress] = useState(false);
  const [didNotPlay, setDidNotPlay] = useState<string[]>([]);
  const [sessionMessage, setSessionMessage] = useState('');

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
      if (data.session) {
        void loadProfile(data.session.user.id);
      }
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

      if (error) {
        setNotice(error.message);
      } else {
        setNotice(
          'Registration submitted. Check your email if confirmation is enabled. An admin must approve your player profile.'
        );
      }
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
  const approved =
    demoMode || profile?.player_approval_status === 'approved';

  const selectedCost = demoPlayers
    .filter(p => selected.includes(p.name))
    .reduce((sum, p) => sum + p.price, 0);

  const starters = selected.slice(0, 5);
  const bench = selected.slice(5, 7);
  const freeTransfers = gameweekNumber >= 2 ? 1 : 0;

  const effectiveDemoPoints =
    starters.reduce((sum, name) => {
      const points = demoPlayers.find(p => p.name === name)?.points ?? 0;
      return sum + points * (
        name === captain
          ? activeChip === 'Triple Captain' ? 3 : 2
          : 1
      );
    }, 0) +
    (activeChip === 'Bench Boost'
      ? bench.reduce(
          (sum, name) =>
            sum + (demoPlayers.find(p => p.name === name)?.points ?? 0),
          0
        )
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

  // Load the selected real leaderboard when its screen or tab changes.
  useEffect(() => {
    if (
      screen !== 'leaderboard' ||
      !supabase ||
      !session ||
      !approved
    ) {
      return;
    }

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

      try {
        const { data, error } = await supabase!
          .from(viewByTab[leaderboardTab])
          .select('*');

        if (cancelled) return;

        if (error) {
          setLeaderboardError(error.message);
          setLeaderboardPlayers([]);
        } else {
          setLeaderboardPlayers(
            (data ?? []) as LeaderboardPlayer[]
          );
        }
      } catch {
        if (!cancelled) {
          setLeaderboardError('Could not load the leaderboard.');
          setLeaderboardPlayers([]);
        }
      }

      if (!cancelled) setLeaderboardLoading(false);
    }

    void loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [screen, leaderboardTab, session, approved]);

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
    if (leaderboardTab === 'contributions') {
      return player.total_contributions ?? 0;
    }
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

        <div className="league-pill">
          <span className="pulse" /> PRIVATE LEAGUE
        </div>

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
              onClick={() =>
                demoMode
                  ? setDemoRole(demoRole === 'admin_player' ? 'player' : 'admin_player')
                  : void signOut()
              }
            >
              {demoMode ? <ArrowLeftRight size={16} /> : <LogOut size={16} />}
            </button>
          </div>
          <div className="tiny">
            {demoMode ? 'Demo mode · sample data' : 'Secure account'}
          </div>
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
                  <button className="secondary" onClick={() => setScreen('squad')}>
                    View my squad <ChevronRight size={16} />
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
                <span>SESSION POINTS</span>
                <strong>{effectiveDemoPoints} <small>pts</small></strong>
                <small className="positive"><Trophy size={13} /> Preview points</small>
              </div>
              <div className="stat-card">
                <span>GAMEWEEK STATUS</span>
                <strong className="status-text">Not started</strong>
                <small><span className="status-dot" /> Admin starts manually</small>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>How this league works</h3>
                  <p>Made for your rotating 15-minute matches</p>
                </div>
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
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>My fantasy squad</h3>
                  <p>5 starters + 2 bench players. Changes lock during a match.</p>
                </div>
                <span className="budget">£{selectedCost.toFixed(1)}m / £40.0m</span>
              </div>

              <div className="budget-track">
                <span style={{ width: `${Math.min(selectedCost / 40 * 100, 100)}%` }} />
              </div>

              <div className="lineup-heading">
                <strong>Starting five</strong>
                <span>{matchInProgress ? 'Lineup locked' : 'Changes allowed before kickoff'}</span>
              </div>

              <div className="squad-grid">
                {starters.map(name => {
                  const p = demoPlayers.find(x => x.name === name)!;
                  return (
                    <div className="player-card" key={name}>
                      <div className="player-photo">{name.slice(0, 1)}</div>
                      <strong>{name}</strong>
                      <span>£{p.price.toFixed(1)}m · {p.points} pts</span>
                      <button
                        className={`captain-button ${captain === name ? 'chosen' : ''}`}
                        disabled={matchInProgress}
                        onClick={() => setCaptain(name)}
                      >
                        {captain === name ? '★ Captain' : 'Make captain'}
                      </button>
                      <button
                        className="text-button"
                        disabled={matchInProgress || bench.length === 0}
                        onClick={() => {
                          const next = [...selected];
                          const i = next.indexOf(name);
                          const bi = next.indexOf(bench[0]);
                          [next[i], next[bi]] = [next[bi], next[i]];
                          setSelected(next);
                        }}
                      >
                        Swap with bench 1
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="lineup-heading bench-heading">
                <strong>Bench (2)</strong>
                <span>Slot 1 is first to substitute</span>
              </div>

              <div className="bench-grid">
                {bench.map((name, i) => {
                  const p = demoPlayers.find(x => x.name === name)!;
                  return (
                    <div className="bench-card" key={name}>
                      <span className="bench-number">{i + 1}</span>
                      <div className="player-photo small-photo">{name.slice(0, 1)}</div>
                      <div className="bench-copy">
                        <strong>{name}</strong>
                        <span>£{p.price.toFixed(1)}m · {p.points} pts</span>
                      </div>
                      {i === 1 && (
                        <button
                          className="text-button"
                          disabled={matchInProgress}
                          onClick={() => setSelected(old => {
                            const next = [...old];
                            [next[5], next[6]] = [next[6], next[5]];
                            return next;
                          })}
                        >
                          Move up
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="match-lock-panel">
                <div>
                  <strong>{matchInProgress ? '15-minute match in progress' : 'Before the next match'}</strong>
                  <p>
                    {matchInProgress
                      ? 'Lineup changes are locked until this match finishes.'
                      : 'You can adjust your lineup before kickoff.'}
                  </p>
                </div>
                {!matchInProgress ? (
                  <button
                    className="primary"
                    onClick={() => {
                      setMatchInProgress(true);
                      setDidNotPlay([]);
                      setSessionMessage('Match started. Lineup is locked.');
                    }}
                  >
                    Start 15-minute match
                  </button>
                ) : (
                  <button
                    className="primary"
                    onClick={() => {
                      const next = [...selected];
                      const missing = didNotPlay.find(n => next.slice(0, 5).includes(n));
                      let message = 'Match finished.';
                      if (missing && next.length > 5) {
                        const b = next[5];
                        const si = next.indexOf(missing);
                        const bi = next.indexOf(b);
                        [next[si], next[bi]] = [next[bi], next[si]];
                        message += ` Auto-sub: ${b} replaces ${missing}.`;
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
                    value={didNotPlay[0] ?? ''}
                    onChange={e => setDidNotPlay(e.target.value ? [e.target.value] : [])}
                  >
                    <option value="">No absent starter</option>
                    {starters.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}

              {sessionMessage && (
                <div className="notice inline-notice">
                  {sessionMessage}
                  <button className="text-button" onClick={() => setSessionMessage('')}>Dismiss</button>
                </div>
              )}

              <p className="muted tiny">
                Squad and match controls are currently a local preview and are not saved to Supabase.
              </p>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div><h3>Chips</h3><p>Each chip is available once per season.</p></div>
                <span className="tag">GAMEWEEK {gameweekNumber}</span>
              </div>
              <div className="chip-grid">
                {[
                  { name: 'Triple Captain', desc: 'Your captain scores triple.', icon: '👑' },
                  { name: 'Wildcard', desc: 'Unlimited transfers this gameweek.', icon: '🃏' },
                  { name: 'Bench Boost', desc: 'Both bench players count.', icon: '🪑' },
                ].map(chip => {
                  const used = usedChips.includes(chip.name);
                  const active = activeChip === chip.name;
                  return (
                    <div className={`chip-card ${active ? 'chip-active' : ''}`} key={chip.name}>
                      <span className="chip-icon">{chip.icon}</span>
                      <strong>{chip.name}</strong>
                      <p>{chip.desc}</p>
                      <span className={`chip-status ${used ? 'used' : active ? 'active' : 'available'}`}>
                        {used ? 'Used this season' : active ? 'Active' : 'Available'}
                      </span>
                      <button
                        className={active ? 'secondary' : 'primary'}
                        disabled={used || (activeChip !== null && !active)}
                        onClick={() => {
                          if (used) return;
                          setActiveChip(chip.name);
                          setUsedChips(old => [...old, chip.name]);
                          setSessionMessage(`${chip.name} activated.`);
                        }}
                      >
                        {used ? 'Already used' : active ? 'Activated' : 'Activate chip'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Transfer allowance</h3>
                  <p>Unlimited initial setup, then one free transfer each gameweek.</p>
                </div>
                <ArrowLeftRight color="#C4FF61" />
              </div>
              <div className="transfer-summary">
                <div><span>Free transfers</span><strong>{gameweekNumber === 1 ? '∞' : freeTransfers}</strong></div>
                <div><span>Used</span><strong>{transfersUsed}</strong></div>
                <div><span>Transfer hits</span><strong>−{pointsHits} pts</strong></div>
              </div>
              <div className="transfer-controls">
                <button
                  className="secondary"
                  onClick={() => {
                    setTransfersUsed(v => v + 1);
                    if (gameweekNumber > 1 && transfersUsed >= freeTransfers && activeChip !== 'Wildcard') {
                      setPointsHits(v => v + 4);
                    }
                  }}
                >
                  Record transfer
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setGameweekNumber(v => v + 1);
                    setTransfersUsed(0);
                    setPointsHits(0);
                    setActiveChip(null);
                    setSessionMessage(`Advanced to Gameweek ${gameweekNumber + 1}.`);
                  }}
                >
                  Demo: next gameweek
                </button>
              </div>
            </section>
          </>
        )}

        {screen === 'players' && (
          <section className="panel">
            <div className="panel-heading">
              <div><h3>Player pool</h3><p>Build a seven-player squad within £40m.</p></div>
              <span className="tag">{demoPlayers.length} AVAILABLE</span>
            </div>
            <div className="player-list">
              {demoPlayers.map(p => (
                <div className="player-row" key={p.name}>
                  <div className="player-photo small-photo">{p.name.slice(0, 1)}</div>
                  <div className="player-info">
                    <strong>{p.name}</strong>
                    <span>{p.points} preview points</span>
                  </div>
                  <strong className="price">£{p.price.toFixed(1)}m</strong>
                  <button
                    className={selected.includes(p.name) ? 'secondary compact-btn' : 'primary compact-btn'}
                    disabled={
                      !selected.includes(p.name) &&
                      (selected.length >= 7 || selectedCost + p.price > 40 || matchInProgress)
                    }
                    onClick={() => setSelected(old => {
                      if (old.includes(p.name)) {
                        const next = old.filter(n => n !== p.name);
                        if (captain === p.name) setCaptain(next[0] ?? '');
                        return next;
                      }
                      if (old.length >= 7 || selectedCost + p.price > 40 || matchInProgress) return old;
                      return [...old, p.name];
                    })}
                  >
                    {selected.includes(p.name) ? 'Remove' : 'Add player'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {screen === 'leaderboard' && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Player leaderboard</h3>
                <p>{leaderboardDescription[leaderboardTab]}</p>
              </div>
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

            {demoMode && (
              <div className="notice">
                Demo mode is using sample data. Sign in to view database statistics.
              </div>
            )}

            {leaderboardLoading && <p className="muted">Loading leaderboard…</p>}

            {leaderboardError && (
              <div className="notice">
                Could not load leaderboard: {leaderboardError}
              </div>
            )}

            {!leaderboardLoading && !leaderboardError && !demoMode && (
              <div className="leaderboard-list">
                {leaderboardPlayers.length === 0 ? (
                  <p className="muted">
                    No statistics available yet. Results appear after match statistics are recorded.
                  </p>
                ) : (
                  [...leaderboardPlayers]
                    .sort((a, b) => {
                      const av = Number(leaderboardValue(a)) || 0;
                      const bv = Number(leaderboardValue(b)) || 0;
                      return bv - av;
                    })
                    .map((player, index) => (
                      <div className="leaderboard-player" key={player.player_id}>
                        <span className={`rank ${index === 0 ? 'first' : ''}`}>
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        {player.photo_url ? (
                          <img
                            className="leaderboard-photo"
                            src={player.photo_url}
                            alt={player.display_name}
                          />
                        ) : (
                          <div className="player-photo small-photo">
                            {(player.display_name || '?').slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div className="leaderboard-player-info">
                          <strong>{player.display_name}</strong>
                          {leaderboardTab === 'ratings' && (
                            <span>{player.matches_rated ?? 0} ratings recorded</span>
                          )}
                        </div>

                        <strong className="leaderboard-stat">
                          {leaderboardValue(player)}
                          {leaderboardTab === 'ratings' ? '' : ` ${leaderboardTab === 'contributions' ? 'G+A' : leaderboardTab === 'goals' ? 'G' : 'A'}`}
                        </strong>
                      </div>
                    ))
                )}
              </div>
            )}

            {demoMode && (
              <div className="leaderboard-list">
                {demoPlayers.slice(0, 5).map((player, index) => (
                  <div className="leaderboard-player" key={player.name}>
                    <span className={`rank ${index === 0 ? 'first' : ''}`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="player-photo small-photo">
                      {player.name.slice(0, 1)}
                    </div>
                    <div className="leaderboard-player-info">
                      <strong>{player.name}</strong>
                      <span>Sample data only</span>
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
              <div>
                <h3>Admin control room</h3>
                <p>Admin actions need database integration before production use.</p>
              </div>
              <ShieldCheck color="#C4FF61" />
            </div>
            <div className="admin-grid">
              <button className="admin-action" onClick={() => setNotice('Gameweek control is still a preview.')}>
                <CalendarDays /><strong>Start gameweek</strong><span>Open a new session</span>
              </button>
              <button className="admin-action" onClick={() => setNotice('Gameweek control is still a preview.')}>
                <CheckCircle2 /><strong>End gameweek</strong><span>Finalize the session</span>
              </button>
              <button className="admin-action" onClick={() => setNotice('Player approval controls need database integration.')}>
                <UserPlus /><strong>Approve registrations</strong><span>Review join requests</span>
              </button>
              <button className="admin-action" onClick={() => setNotice('Match-stat entry needs database integration.')}>
                <Trophy /><strong>Enter / correct stats</strong><span>Record match statistics</span>
              </button>
            </div>
            {notice && (
              <div className="notice inline-notice">
                {notice}
                <button className="text-button" onClick={() => setNotice('')}>Dismiss</button>
              </div>
            )}
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
