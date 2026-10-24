import { FormEvent, useEffect, useState } from 'react';
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

    setLeaderboardLoading(false);
  }

  void loadLeaderboard();

  return () => {
    cancelled = true;
  };
}, [screen, leaderboardTab, session, approved]);
import { ArrowLeftRight, CalendarDays, CheckCircle2, ChevronRight, CircleUserRound, Crown, LockKeyhole, LogOut, ShieldCheck, Trophy, UserPlus, Users, Wallet } from 'lucide-react';
import { isSupabaseConfigured, Profile, supabase } from './supabase';

type Screen = 'overview' | 'squad' | 'players' | 'leaderboard' | 'admin';
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

type LeaderboardTab =
  | 'goals'
  | 'assists'
  | 'contributions'
  | 'ratings';
const demoPlayers = [
  { name: 'Karim', price: 7, points: 18 }, { name: 'Omar', price: 6.5, points: 15 }, { name: 'Youssef', price: 6, points: 12 }, { name: 'Ziad', price: 5.5, points: 10 }, { name: 'Adam', price: 5.5, points: 9 }, { name: 'Mazen', price: 4.5, points: 8 }, { name: 'Nour', price: 4.5, points: 7 }, { name: 'Fares', price: 4.5, points: 6 },
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
  const [demoMode, setDemoMode] = useState(!isSupabaseConfigured);
  const [selected, setSelected] = useState<string[]>(['Karim', 'Omar', 'Youssef', 'Ziad', 'Adam', 'Mazen', 'Nour']);
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

const [leaderboardLoading, setLeaderboardLoading] =
  useState(false);

const [leaderboardError, setLeaderboardError] =
  useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (data.session) void loadProfile(data.session.user.id); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) setTimeout(() => void loadProfile(next.user.id), 0); else setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(id: string) {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('id,display_name,role,player_approval_status').eq('id', id).single();
    if (error) setNotice('Your account exists, but its profile could not be loaded. Check the database setup.');
    else setProfile(data as Profile);
  }

  async function submitAuth(e: FormEvent) {
    e.preventDefault(); setNotice('');
    if (!supabase) { setNotice('Connect Supabase to enable real accounts. You can explore the interactive demo meanwhile.'); return; }
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
      if (error) setNotice(error.message); else setNotice('Registration submitted. Check your email if confirmation is enabled. Your player profile will need admin approval.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setNotice(error.message);
    }
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); setSession(null); setProfile(null); }
  const role = demoMode ? demoRole : profile?.role;
  const isAdmin = role === 'admin_player';
  const selectedCost = demoPlayers.filter(p => selected.includes(p.name)).reduce((sum, p) => sum + p.price, 0);
  const starters = selected.slice(0, 5);
  const bench = selected.slice(5, 7);
  const freeTransfers = gameweekNumber >= 2 ? 1 : 0;
  const transferBudget = gameweekNumber === 1 || activeChip === 'Wildcard' ? Number.POSITIVE_INFINITY : Math.max(0, freeTransfers - transfersUsed);
  const effectiveDemoPoints = starters.reduce((sum, name) => { const points = demoPlayers.find(p => p.name === name)?.points ?? 0; return sum + points * (name === captain ? (activeChip === 'Triple Captain' ? 3 : 2) : 1); }, 0) + (activeChip === 'Bench Boost' ? bench.reduce((sum, name) => sum + (demoPlayers.find(p => p.name === name)?.points ?? 0), 0) : 0) - pointsHits;
  const nav: { id: Screen; label: string; icon: any; admin?: boolean }[] = [
    { id: 'overview', label: 'Home', icon: CalendarDays }, { id: 'squad', label: 'My squad', icon: Users }, { id: 'players', label: 'Players', icon: CircleUserRound }, { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }, { id: 'admin', label: 'Admin panel', icon: ShieldCheck, admin: true },
  ];
  const approved = demoMode || profile?.player_approval_status === 'approved';

  if (!demoMode && !session) return <main className="auth-wrap"><div className="brand"><span className="brand-mark">⚽</span><div><div className="eyebrow">SATURDAY FOOTBALL FANTASY</div><h1>El Khames <em>El Momtaz</em></h1></div></div><section className="auth-card"><h2>{authMode === 'signin' ? 'Welcome back' : 'Join your league'}</h2><p className="muted">{authMode === 'signin' ? 'Sign in to manage your squad.' : 'Create your player account. An admin must approve your player profile.'}</p><form onSubmit={submitAuth}>{authMode === 'signup' && <label>Your name<input required value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" /></label>}<label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label><button className="primary full" type="submit">{authMode === 'signin' ? 'Sign in' : 'Create player account'}</button></form>{notice && <p className="notice">{notice}</p>}<button className="text-button" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setNotice(''); }}>{authMode === 'signin' ? 'New here? Register with your invite link' : 'Already registered? Sign in'}</button></section><p className="tiny center">Private league · Invite-only · Cairo time</p></main>;

  return <div className="app-shell"><aside className="sidebar"><div className="brand compact"><span className="brand-mark">⚽</span><div><div className="eyebrow">SATURDAY FANTASY</div><h2>El Khames <em>El Momtaz</em></h2></div></div><div className="league-pill"><span className="pulse"/> PRIVATE LEAGUE <span className="tiny">· 15 players</span></div><nav>{nav.filter(n => !n.admin || isAdmin).map(n => <button key={n.id} className={`nav-item ${screen === n.id ? 'active' : ''}`} onClick={() => setScreen(n.id)}><n.icon size={18}/>{n.label}{n.admin && <span className="nav-admin">ADMIN</span>}</button>)}</nav><div className="sidebar-bottom"><div className="account-chip"><div className="avatar">{isAdmin ? 'A' : 'P'}</div><div className="account-copy"><strong>{demoMode ? (isAdmin ? 'Admin + Player' : 'Player account') : profile?.display_name}</strong><span>{isAdmin ? 'League administrator' : 'Fantasy manager'}</span></div><button className="icon-btn" title="Sign out" onClick={() => demoMode ? setDemoRole(demoRole === 'admin_player' ? 'player' : 'admin_player') : void signOut()}>{demoMode ? <ArrowLeftRight size={16}/> : <LogOut size={16}/>}</button></div><div className="tiny">{demoMode ? 'Demo mode · role switch available' : 'Secure account'}</div></div></aside>
  <main className="main"><header className="topbar"><div><div className="eyebrow">SATURDAY SESSION / GAMEWEEK {String(gameweekNumber).padStart(2, '0')}</div><h2>{nav.find(n => n.id === screen)?.label}</h2></div><div className="top-actions"><span className="deadline"><CalendarDays size={15}/> Transfers close Thu · 12:00 PM</span><div className="avatar">{isAdmin ? 'A' : 'P'}</div></div></header>
  {demoMode && <div className="demo-banner"><span><strong>Interactive preview</strong> — sample data only; real accounts require Supabase setup.</span><label>Preview role <select value={demoRole} onChange={e => { setDemoRole(e.target.value as any); setScreen('overview'); }}><option value="admin_player">Admin + Player</option><option value="player">Player only</option></select></label></div>}
  {!approved && !isAdmin && <div className="approval-banner"><LockKeyhole size={18}/><div><strong>Player profile awaiting approval</strong><p>You can sign in, but admins must approve you before your profile appears in the selectable player pool.</p></div></div>}
  {screen === 'overview' && <><section className="hero"><div className="hero-content"><span className="tag">GAMEWEEK CONTROL</span><h1>Your Saturday.<br/><em>Your fantasy.</em></h1><p>Every 15-minute match counts toward one combined session score. Rotate teams, record stats, climb the table.</p><div className="hero-actions">{isAdmin && <button className="primary" onClick={() => setScreen('admin')}><ShieldCheck size={17}/> Open admin panel</button>}<button className="secondary" onClick={() => setScreen('squad')}>View my squad <ChevronRight size={16}/></button></div></div><div className="hero-ball">⚽</div><div className="hero-lines"/></section><section className="stats-grid"><div className="stat-card"><span>MY TEAM VALUE</span><strong>£{selectedCost.toFixed(1)}m</strong><small><Wallet size={13}/> £{(40-selectedCost).toFixed(1)}m remaining</small></div><div className="stat-card"><span>SESSION POINTS</span><strong>{effectiveDemoPoints} <small>pts</small></strong><small className="positive"><Trophy size={13}/> Chips and transfer hits preview</small></div><div className="stat-card"><span>GAMEWEEK STATUS</span><strong className="status-text">Not started</strong><small><span className="status-dot"/> Admin starts manually</small></div></section><section className="panel"><div className="panel-heading"><div><h3>How this league works</h3><p>Made for your rotating Saturday matches</p></div><span className="tag">LEAGUE RULES</span></div><div className="rule-grid"><div><Users/><strong>5 starters + 2 bench</strong><span>No positions, £40m budget</span></div><div><Crown/><strong>Captain x2</strong><span>Double eligible points</span></div><div><ArrowLeftRight/><strong>Flexible transfers</strong><span>Open after gameweek ends</span></div><div><Trophy/><strong>One session score</strong><span>No appearance points</span></div></div></section></>}
  {screen === 'squad' && <>
    <section className="panel"><div className="panel-heading"><div><h3>My fantasy squad</h3><p>5 starters + 2 bench players. Swap your lineup before each 15-minute match.</p></div><span className="budget">£{selectedCost.toFixed(1)}m / £40.0m</span></div>
      <div className="budget-track"><span style={{width:`${Math.min(selectedCost/40*100,100)}%`}}/></div>
      <div className="lineup-heading"><strong>Starting five</strong><span>{matchInProgress ? 'Lineup locked during match' : 'Changes allowed before kickoff'}</span></div>
      <div className="squad-grid">{starters.map(name => { const p=demoPlayers.find(x=>x.name===name)!; return <div className="player-card" key={name}><div className="player-photo">{name.slice(0,1)}</div><strong>{name}</strong><span>£{p.price.toFixed(1)}m · {p.points} pts</span><button className={`captain-button ${captain===name?'chosen':''}`} onClick={() => !matchInProgress && setCaptain(name)} disabled={matchInProgress}>{captain===name?'★ Captain':'Make captain'}</button><button className="text-button" disabled={matchInProgress || bench.length===0} onClick={() => { if(matchInProgress || !bench.length) return; setSelected(old => { const next=[...old]; const i=next.indexOf(name); const bi=next.indexOf(bench[0]); [next[i],next[bi]]=[next[bi],next[i]]; return next; }); setSessionMessage(`${name} swapped with first bench player ${bench[0]}.`); }}>Swap with bench 1</button></div>; })}</div>
      <div className="lineup-heading bench-heading"><strong>Bench (2)</strong><span>Bench order matters: slot 1 is first to substitute</span></div>
      <div className="bench-grid">{bench.map((name,i) => { const p=demoPlayers.find(x=>x.name===name)!; return <div className="bench-card" key={name}><span className="bench-number">{i+1}</span><div className="player-photo small-photo">{name.slice(0,1)}</div><div className="bench-copy"><strong>{name}</strong><span>£{p.price.toFixed(1)}m · {p.points} pts</span></div>{i===1 && <button className="text-button" disabled={matchInProgress} onClick={() => setSelected(old => { const next=[...old]; [next[5],next[6]]=[next[6],next[5]]; return next; })}>Move up</button>}</div>; })}</div>
      <div className="match-lock-panel"><div><strong>{matchInProgress ? '15-minute match in progress' : 'Before the next match'}</strong><p>{matchInProgress ? 'Starting lineup and bench substitutions are locked until this match finishes.' : 'You can adjust your starting five and bench order now.'}</p></div>{!matchInProgress ? <button className="primary" onClick={() => { setMatchInProgress(true); setDidNotPlay([]); setSessionMessage('Match started. Lineup is now locked for 15 minutes.'); }}>Start 15-minute match</button> : <button className="primary" onClick={() => { let next=[...selected]; let subMessage='Match finished.'; const missing=didNotPlay.find(n=>next.slice(0,5).includes(n)); if(missing && next.length>5){ const b=next[5]; const si=next.indexOf(missing); const bi=next.indexOf(b); [next[si],next[bi]]=[next[bi],next[si]]; subMessage += ` Auto-sub: ${b} replaces ${missing} from bench slot 1.`; } setSelected(next); setMatchInProgress(false); setDidNotPlay([]); setSessionMessage(subMessage+' You can change the lineup before the next match.'); }}>Finish match & auto-sub</button>}</div>
      {matchInProgress && <div className="did-not-play"><label htmlFor="did-not-play">If a starter did not play, mark them for automatic substitution</label><select id="did-not-play" value={didNotPlay[0] ?? ''} onChange={e=>setDidNotPlay(e.target.value?[e.target.value]:[])}><option value="">No absent starter</option>{starters.map(n=><option key={n} value={n}>{n}</option>)}</select></div>}
      {sessionMessage && <div className="notice inline-notice">{sessionMessage}<button className="text-button" onClick={()=>setSessionMessage('')}>Dismiss</button></div>}
      <p className="muted tiny">Demo behavior is local only. Production will store each match lineup and substitution history in the database.</p>
    </section>
    <section className="panel"><div className="panel-heading"><div><h3>Chips</h3><p>Use a chip strategically. Each chip can be used once per season in this league setup.</p></div><span className="tag">GAMEWEEK {gameweekNumber}</span></div><div className="chip-grid">{[{name:'Triple Captain',desc:'Your captain scores triple instead of double.',icon:'👑'},{name:'Wildcard',desc:'Unlimited transfers this gameweek with no transfer hits.',icon:'🃏'},{name:'Bench Boost',desc:'Both bench players’ points count in your session total.',icon:'🪑'}].map(chip=>{const used=usedChips.includes(chip.name); const active=activeChip===chip.name; return <div className={`chip-card ${active?'chip-active':''}`} key={chip.name}><span className="chip-icon">{chip.icon}</span><strong>{chip.name}</strong><p>{chip.desc}</p><span className={`chip-status ${used?'used':active?'active':'available'}`}>{used?'Used this season':active?'Active this gameweek':'Available'}</span><button className={active?'secondary':'primary'} disabled={used || (activeChip!==null&&!active)} onClick={()=>{if(used)return; setActiveChip(chip.name); setUsedChips(old=>old.includes(chip.name)?old:[...old,chip.name]); setSessionMessage(`${chip.name} activated for Gameweek ${gameweekNumber}.`);}}>{used?'Already used':active?'Activated':'Activate chip'}</button></div>;})}</div><p className="tiny muted">For this custom league, Wildcard, Triple Captain and Bench Boost are each one-use-per-season. Wildcard removes transfer limits for the gameweek it is activated.</p></section>
    <section className="panel"><div className="panel-heading"><div><h3>Transfer allowance</h3><p>Initial squad setup is unlimited in Gameweek 1; one free transfer each gameweek from Gameweek 2.</p></div><ArrowLeftRight color="#C4FF61"/></div><div className="transfer-summary"><div><span>Free transfers this week</span><strong>{gameweekNumber===1?'∞':freeTransfers}</strong></div><div><span>Used this week</span><strong>{transfersUsed}</strong></div><div><span>Extra transfer hits</span><strong>−{pointsHits} pts</strong></div></div><p className="muted tiny">Transfers beyond the free allowance cost 4 points each. Wildcard transfers are free while the chip is active. Unused free transfers do not roll over in this initial ruleset.</p><div className="transfer-controls"><button className="secondary" onClick={()=>{setTransfersUsed(v=>v+1); if(gameweekNumber>1 && transfersUsed>=freeTransfers && activeChip!=='Wildcard') setPointsHits(v=>v+4); setSessionMessage(gameweekNumber===1?'Transfer made during initial squad setup.':(transfersUsed>=freeTransfers&&activeChip!=='Wildcard'?'Transfer made: 4-point hit applied.':'Transfer made using your free transfer.'));}}>Record transfer</button><button className="secondary" onClick={()=>{setGameweekNumber(v=>v+1);setTransfersUsed(0);setPointsHits(0);setActiveChip(null);setSessionMessage(`Advanced to Gameweek ${gameweekNumber+1}.`);}}>Demo: next gameweek</button></div></section>
  </>}
  {screen === 'players' && <section className="panel"><div className="panel-heading"><div><h3>Player pool</h3><p>Prices are set by admins. Select five starters plus two bench players within £40m.</p></div><span className="tag">{demoPlayers.length} AVAILABLE</span></div><div className="player-list">{demoPlayers.map((p,i)=><div className="player-row" key={p.name}><div className="player-photo small-photo">{p.name.slice(0,1)}</div><div className="player-info"><strong>{p.name}</strong><span>{p.points} session points</span></div><strong className="price">£{p.price.toFixed(1)}m</strong><button className={selected.includes(p.name)?'secondary compact-btn':'primary compact-btn'} disabled={(!selected.includes(p.name)&&(selected.length>=7||selectedCost+p.price>40||matchInProgress))} onClick={()=>setSelected(old=>{ if(old.includes(p.name)){ const next=old.filter(n=>n!==p.name); if(captain===p.name)setCaptain(next[0]??''); return next; } if(old.length>=7||selectedCost+p.price>40||matchInProgress)return old; return [...old,p.name]; })}>{selected.includes(p.name)?'Remove':selected.length<5?'Add starter':selected.length<7?'Add to bench':'Squad full'}</button></div>)}</div></section>}
  {screen === 'leaderboard' && <section className="panel"><div className="panel-heading"><div><h3>League leaderboard</h3><p>Updates when match stats are saved or corrected.</p></div><Trophy color="#C4FF61"/></div><div className="table-row table-head"><span>RANK</span><span>MANAGER</span><span>TEAM VALUE</span><span>POINTS</span></div>{[['1','You (demo)','£38.0m','42'],['2','Omar','£39.5m','39'],['3','Ziad','£37.0m','34'],['4','Karim','£40.0m','31'],['5','Mazen','£36.5m','27']].map((r,i)=><div className="table-row" key={r[0]}><span className={i===0?'rank first':'rank'}>{r[0].padStart(2,'0')}</span><strong>{r[1]}</strong><span>{r[2]}</span><strong>{r[3]} <small>pts</small></strong></div>)}</section>}
  {screen === 'admin' && isAdmin && <section className="panel"><div className="panel-heading"><div><h3>Admin control room</h3><p>Only authorized Admin + Player accounts can access these controls.</p></div><ShieldCheck color="#C4FF61"/></div><div className="admin-grid"><button className="admin-action" onClick={()=>setNotice('Demo: gameweek started. In production, this action is written securely to the database.')}><CalendarDays/><strong>Start gameweek</strong><span>Open a new session for match entry</span></button><button className="admin-action" onClick={()=>setNotice('Demo: gameweek ended. Final totals would be recalculated and transfers reopened.')}><CheckCircle2/><strong>End gameweek</strong><span>Finalize score and reopen transfers</span></button><button className="admin-action" onClick={()=>setNotice('Demo: player approval queue opened. Production approval controls are backed by admin-only database policies.')}><UserPlus/><strong>Approve registrations</strong><span>Review player join requests</span></button><button className="admin-action" onClick={()=>setNotice('Demo: stat-entry panel selected. Production uses unique event IDs and recalculates scores after corrections.')}><Trophy/><strong>Enter / correct stats</strong><span>Duplicate protection and recalculation</span></button></div>{notice && <div className="notice inline-notice">{notice}<button className="text-button" onClick={()=>setNotice('')}>Dismiss</button></div>}<div className="security-note"><LockKeyhole/><div><strong>Role security</strong><p>Role assignment must be server/database controlled. The client never exposes a “make me admin” option. Use the one-time bootstrap procedure in the included SQL instructions to promote the first two trusted accounts.</p></div></div></section>}
  {screen === 'admin' && !isAdmin && <section className="panel"><div className="denied"><LockKeyhole size={32}/><h3>Admin access only</h3><p>Your player account can manage its own fantasy squad, but cannot edit prices, approve users, change stats, or control gameweeks.</p></div></section>}
  <footer><span>EL KHAMES EL MOMTAZ</span><span>Built for Saturday football · Cairo time</span></footer></main></div>;
}
