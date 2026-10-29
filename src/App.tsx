import { useEffect, useMemo, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type {
  AccountRole,
  ChipName,
  FootballPlayer,
  Gameweek,
  LeaguePlayer,
  ManagerTrophyMap,
  PlayerFantasyTotal,
  Profile,
  ScoringRule,
  Screen,
  SquadRecord,
  Standing,
} from './types/league';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  calculateTransfersAndHits,
  computeDemoPoints,
  computeFreeTransfers,
  hasUnsavedSquadChanges,
  isOverBudget,
  pickTargetGameweek,
  SQUAD_BUDGET,
  SQUAD_SIZE,
  STARTERS_COUNT,
  syncSquadLeaders,
} from './lib/squadRules';
import { DEFAULT_SCORING_RULES, DEMO_PLAYERS, DEMO_TROPHIES } from './lib/demoData';
import { useLanguage } from './i18n/LanguageContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AuthScreen from './screens/AuthScreen';
import OverviewScreen from './screens/OverviewScreen';
import SquadScreen from './screens/SquadScreen';
import PlayerMarketScreen from './screens/PlayerMarketScreen';
import MatchesScreen from './screens/MatchesScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import AdminPanel from './admin/AdminPanel';
import PlayerProfileModal from './components/PlayerProfileModal';
import ManagerProfileModal from './components/ManagerProfileModal';

export default function App() {
  const { t } = useLanguage();
  const [demoMode] = useState(!isSupabaseConfigured);
  const [demoRole, setDemoRole] = useState<AccountRole>('admin_player');

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(Boolean(supabase));
  const [screen, setScreen] = useState<Screen>('overview');
  const [reloadKey, setReloadKey] = useState(0);

  // League data
  const [realPlayers, setRealPlayers] = useState<FootballPlayer[]>([]);
  const [playerTotals, setPlayerTotals] = useState<Map<string, PlayerFantasyTotal>>(new Map());
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState('');
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>(DEFAULT_SCORING_RULES);

  // Gameweeks & manager squad
  const [allGameweeks, setAllGameweeks] = useState<Gameweek[]>([]);
  const [gameweek, setGameweek] = useState<Gameweek | null>(null);
  const [targetGw, setTargetGw] = useState<Gameweek | null>(() =>
    !isSupabaseConfigured
      ? {
          id: 2,
          number: 2,
          status: 'open',
          transfer_deadline: new Date(Date.now() + 2 * 3600 * 1000 + 25 * 60 * 1000).toISOString(),
          started_at: null,
          ended_at: null,
        }
      : null
  );
  const [gameweekNumber, setGameweekNumber] = useState(demoMode ? 2 : 1);

  const [selected, setSelected] = useState<string[]>(() =>
    !isSupabaseConfigured ? DEMO_PLAYERS.slice(0, 7).map(p => p.id) : []
  );
  const [captain, setCaptain] = useState(() => (!isSupabaseConfigured ? DEMO_PLAYERS[0].id : ''));
  const [viceCaptain, setViceCaptain] = useState(() =>
    !isSupabaseConfigured ? DEMO_PLAYERS[1].id : ''
  );
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [usedChips, setUsedChips] = useState<string[]>([]);
  const [baselineIds, setBaselineIds] = useState<string[]>([]);
  const [baseFree, setBaseFree] = useState(1);

  // Saved snapshot (to show unsaved changes + Reset button)
  const [savedSnapshot, setSavedSnapshot] = useState<{
    ids: string[];
    captain: string;
    viceCaptain: string;
    chip: string | null;
  }>({ ids: [], captain: '', viceCaptain: '', chip: null });

  const [squadLoading, setSquadLoading] = useState(false);
  const [squadSaving, setSquadSaving] = useState(false);
  const [squadError, setSquadError] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [profileModalPlayerId, setProfileModalPlayerId] = useState<string | null>(null);
  const [myProfileOpen, setMyProfileOpen] = useState(false);

  // Standings & Trophy Cabinet
  const [standings, setStandings] = useState<Standing[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState('');
  const [managerTrophies, setManagerTrophies] = useState<ManagerTrophyMap>(
    demoMode ? DEMO_TROPHIES : {}
  );

  // Auth & profile listener
  useEffect(() => {
    if (!supabase) return;
    let active = true;

    async function fetchProfile(userId: string) {
      setProfileLoading(true);
      const { data, error } = await supabase!
        .from('profiles')
        .select('id,display_name,team_name,avatar_url,budget,role,player_approval_status')
        .eq('id', userId)
        .single();
      if (!active) return;
      if (!error && data) {
        setProfile({
          ...(data as Profile),
          budget: Number((data as Profile).budget ?? SQUAD_BUDGET),
        });
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

  // Refresh profile budget when reloadKey bumps (e.g. after End Gameweek price rises)
  useEffect(() => {
    if (demoMode || !supabase || !session || reloadKey === 0) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id,display_name,team_name,avatar_url,budget,role,player_approval_status')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setProfile({
          ...(data as Profile),
          budget: Number((data as Profile).budget ?? SQUAD_BUDGET),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [demoMode, session, reloadKey]);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const role = demoMode ? demoRole : profile?.role;
  const isAdmin = role === 'admin_player';
  const approved = demoMode || isAdmin || profile?.player_approval_status === 'approved';

  // Load players, fantasy totals & scoring rules
  useEffect(() => {
    if (demoMode || !supabase || !session || !approved) return;
    let cancelled = false;

    async function loadPool() {
      setPlayersLoading(true);
      setPlayersError('');

      const [playersRes, totalsRes, rulesRes, trophiesRes] = await Promise.all([
        supabase!
          .from('football_players')
          .select(
            'id,display_name,price,is_active,photo_url,kit_number,nationality,favourite_team,preferred_foot,playstyle,age,bio,availability_status,availability_note'
          )
          .order('display_name', { ascending: true }),
        supabase!.from('player_fantasy_totals').select('player_id,total_points,matches_played'),
        supabase!.from('scoring_rules').select('key,label,points').order('points', { ascending: false }),
        supabase!.rpc('get_manager_trophy_cabinet'),
      ]);

      if (cancelled) return;

      if (!trophiesRes.error && trophiesRes.data) {
        setManagerTrophies(trophiesRes.data as ManagerTrophyMap);
      }

      if (playersRes.error) {
        setPlayersError(playersRes.error.message);
        setRealPlayers([]);
      } else {
        setRealPlayers((playersRes.data ?? []) as FootballPlayer[]);
      }

      if (!totalsRes.error && totalsRes.data) {
        setPlayerTotals(
          new Map(
            (totalsRes.data as PlayerFantasyTotal[]).map(r => [
              r.player_id,
              {
                player_id: r.player_id,
                total_points: Number(r.total_points) || 0,
                matches_played: Number(r.matches_played) || 0,
              },
            ])
          )
        );
      }

      if (!rulesRes.error && rulesRes.data && rulesRes.data.length > 0) {
        setScoringRules(
          (rulesRes.data as ScoringRule[]).map(r => ({ ...r, points: Number(r.points) }))
        );
      }

      setPlayersLoading(false);
    }

    void loadPool();
    return () => {
      cancelled = true;
    };
  }, [demoMode, session, approved, reloadKey]);

  // Load gameweeks & current manager's squad
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
      setAllGameweeks(rows);
      const { active, target } = pickTargetGameweek(rows);
      setGameweek(active);
      setTargetGw(target);

      const fallbackGw = target ?? active ?? rows[rows.length - 1] ?? null;
      setGameweekNumber(fallbackGw ? fallbackGw.number : 1);

      const { data: mine, error: mineError } = await supabase!
        .from('fantasy_squads')
        .select(
          'id,manager_id,gameweek_id,captain_player_id,vice_captain_player_id,chip,transfers_used,points_hit,free_transfers'
        )
        .eq('manager_id', session!.user.id);

      if (cancelled) return;

      if (mineError) {
        setSquadError(`Could not load your squad: ${mineError.message}`);
        setSquadLoading(false);
        return;
      }

      const squads = (mine ?? []) as SquadRecord[];
      const numberOf = new Map(rows.map(w => [w.id, w.number]));

      if (!target) {
        // Transfers closed: still display manager's latest saved squad so pitch isn't empty
        const latestSquad =
          squads.sort(
            (a, b) => (numberOf.get(b.gameweek_id) ?? 0) - (numberOf.get(a.gameweek_id) ?? 0)
          )[0] ?? null;

        if (latestSquad) {
          const { data: sp } = await supabase!
            .from('squad_players')
            .select('player_id,slot')
            .eq('squad_id', latestSquad.id)
            .order('slot', { ascending: true });
          if (!cancelled && sp) {
            const ids = sp.map(r => String(r.player_id));
            const synced = syncSquadLeaders(
              ids,
              latestSquad.captain_player_id ?? '',
              latestSquad.vice_captain_player_id ?? ''
            );
            setSelected(synced.selected);
            setCaptain(synced.captain);
            setViceCaptain(synced.viceCaptain);
            setSavedSnapshot({
              ids: synced.selected,
              captain: synced.captain,
              viceCaptain: synced.viceCaptain,
              chip: null,
            });
          }
        } else {
          setBaselineIds([]);
          setSelected([]);
          setCaptain('');
          setViceCaptain('');
          setActiveChip(null);
          setUsedChips([]);
          setSavedSnapshot({ ids: [], captain: '', viceCaptain: '', chip: null });
        }
        setSquadError(
          active
            ? 'Transfers are closed for the active gameweek. Ask an admin to generate the next gameweek.'
            : isAdmin
              ? 'No open gameweek yet. Open Admin → Gameweeks and confirm generating Gameweek #1.'
              : 'No open gameweek yet. Ask an admin to generate Gameweek #1.'
        );
        setSquadLoading(false);
        return;
      }

      const current = squads.find(s => s.gameweek_id === target.id) ?? null;
      const previous =
        squads
          .filter(s => (numberOf.get(s.gameweek_id) ?? 0) < target.number)
          .sort(
            (a, b) => (numberOf.get(b.gameweek_id) ?? 0) - (numberOf.get(a.gameweek_id) ?? 0)
          )[0] ?? null;

      setUsedChips(
        squads.filter(s => s.chip && s.gameweek_id !== target.id).map(s => String(s.chip))
      );

      setBaseFree(
        computeFreeTransfers({
          currentSquad: current,
          previousSquad: previous,
          previousWeekNumber: previous ? (numberOf.get(previous.gameweek_id) ?? 0) : 0,
        })
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

        const ids = current ? currentIds : previousIds;
        const source = current ?? previous;
        const synced = syncSquadLeaders(
          ids,
          source?.captain_player_id ?? '',
          source?.vice_captain_player_id ?? ''
        );

        setBaselineIds(previousIds);
        setSelected(synced.selected);
        setCaptain(synced.captain);
        setViceCaptain(synced.viceCaptain);
        setActiveChip(current?.chip ?? null);
        setSavedSnapshot({
          ids: synced.selected,
          captain: synced.captain,
          viceCaptain: synced.viceCaptain,
          chip: current?.chip ?? null,
        });
      } catch (e: any) {
        setSquadError(`Could not load your squad: ${e?.message ?? 'Unknown error'}`);
      }

      setSquadLoading(false);
    }

    void loadSquad();
    return () => {
      cancelled = true;
    };
  }, [demoMode, session, approved, reloadKey]);

  // Load league standings
  useEffect(() => {
    if (demoMode || !supabase || !session || !approved) return;
    if (screen !== 'overview' && screen !== 'leaderboard') return;
    let cancelled = false;

    setStandingsLoading(true);
    setStandingsError('');

    supabase.rpc('league_standings').then(({ data, error }) => {
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
    });

    return () => {
      cancelled = true;
    };
  }, [demoMode, session, approved, screen, reloadKey]);

  const players: LeaguePlayer[] = useMemo(() => {
    if (demoMode) return DEMO_PLAYERS;
    return realPlayers.map(p => {
      const tot = playerTotals.get(p.id);
      return {
        id: p.id,
        name: p.display_name,
        price: Number(p.price),
        points: tot?.total_points ?? 0,
        matchesPlayed: tot?.matches_played ?? 0,
        photo_url: p.photo_url,
        is_active: p.is_active,
        kit_number: p.kit_number ?? null,
        nationality: p.nationality ?? null,
        favourite_team: p.favourite_team ?? null,
        preferred_foot: p.preferred_foot ?? null,
        playstyle: p.playstyle ?? null,
        age: p.age ?? null,
        bio: p.bio ?? null,
        availability_status: p.availability_status ?? 'available',
        availability_note: p.availability_note ?? null,
      };
    });
  }, [demoMode, realPlayers, playerTotals]);

  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  const selectedCost = useMemo(
    () =>
      selected.reduce((sum, id) => {
        const p = playerById.get(id);
        return sum + (p?.price ?? 0);
      }, 0),
    [selected, playerById]
  );

  const { transfersUsed, pointsHits } = calculateTransfersAndHits({
    selected,
    baselineIds,
    freeTransfers: baseFree,
    activeChip,
    gameweekNumber: demoMode ? 2 : (targetGw?.number ?? gameweekNumber),
  });

  const effectiveDemoPoints = computeDemoPoints({
    selected,
    playerById,
    captain,
    viceCaptain,
    activeChip,
    pointsHits,
  });

  const hasUnsaved = hasUnsavedSquadChanges({
    selected,
    savedPlayerIds: savedSnapshot.ids,
    captain,
    savedCaptain: savedSnapshot.captain,
    viceCaptain,
    savedViceCaptain: savedSnapshot.viceCaptain,
    activeChip,
    savedChip: savedSnapshot.chip,
  });

  const managerBudget = Number(profile?.budget ?? SQUAD_BUDGET);

  function handleApplyLineup(next: string[]) {
    const synced = syncSquadLeaders(next, captain, viceCaptain);
    setSelected(synced.selected);
    setCaptain(synced.captain);
    setViceCaptain(synced.viceCaptain);
  }

  function handleAddOrRemovePlayer(player: LeaguePlayer) {
    if (selected.includes(player.id)) {
      handleApplyLineup(selected.filter(id => id !== player.id));
      return;
    }
    if (selected.length >= SQUAD_SIZE || isOverBudget(selectedCost + player.price, managerBudget)) {
      return;
    }
    handleApplyLineup([...selected, player.id]);
  }

  async function saveSquad() {
    setSquadError('');
    setSessionMessage('');

    if (demoMode || !supabase || !session) {
      setSessionMessage(t('squadLockedInToast'));
      setCelebrateKey(k => k + 1);
      return;
    }

    if (!approved) {
      setSquadError('Your player account must be approved before saving a squad.');
      return;
    }

    if (!targetGw) {
      setSquadError('Transfers are currently closed.');
      return;
    }

    const starters = selected.slice(0, STARTERS_COUNT);
    if (selected.length !== SQUAD_SIZE || new Set(selected).size !== SQUAD_SIZE) {
      setSquadError('Select 7 different players before saving.');
      return;
    }
    if (isOverBudget(selectedCost, managerBudget)) {
      setSquadError(`Your squad exceeds your £${managerBudget.toFixed(1)}m budget.`);
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
    try {
      const { error } = await supabase.rpc('save_squad', {
        p_gameweek_id: targetGw.id,
        p_captain: captain,
        p_vice: viceCaptain,
        p_player_ids: selected,
        p_chip: activeChip,
      });

      if (error) {
        setSquadError(`Could not save: ${error.message}`);
        return;
      }

      setSessionMessage(`${t('squadLockedInToast')} (GW ${targetGw.number})`);
      setCelebrateKey(k => k + 1);
      setReloadKey(k => k + 1);
    } finally {
      setSquadSaving(false);
    }
  }

  if (!demoMode && !session) {
    return <AuthScreen />;
  }

  const myStanding = standings.find(row => row.manager_id === session?.user?.id) ?? null;
  const myRank = myStanding ? standings.indexOf(myStanding) + 1 : 0;

  const handleSignOutOrToggleDemo = () => {
    if (demoMode) {
      setDemoRole(prev => (prev === 'admin_player' ? 'player' : 'admin_player'));
      if (screen === 'admin') setScreen('overview');
    } else {
      void signOut();
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        screen={screen}
        onSelectScreen={setScreen}
        isAdmin={isAdmin}
        demoMode={demoMode}
        displayName={profile?.display_name}
        teamName={profile?.team_name}
        avatarUrl={profile?.avatar_url}
        onOpenMyProfile={() => setMyProfileOpen(true)}
        onSignOutOrToggleDemo={handleSignOutOrToggleDemo}
      />

      <main className="main">
        <Topbar
          screen={screen}
          gameweekNumber={gameweekNumber}
          targetGw={targetGw}
          isAdmin={isAdmin}
          demoMode={demoMode}
          avatarUrl={profile?.avatar_url}
          displayName={profile?.display_name}
          onOpenMyProfile={() => setMyProfileOpen(true)}
          onSignOutOrToggleDemo={handleSignOutOrToggleDemo}
        />

        {demoMode && (
          <div className="demo-banner">
            <span>
              <strong>{t('interactivePreview')}</strong> — {t('sampleDataOnly')}
            </span>
            <label>
              {t('previewRole')}
              <select
                value={demoRole}
                onChange={e => {
                  setDemoRole(e.target.value as AccountRole);
                  setScreen('overview');
                }}
              >
                <option value="admin_player">{t('demoAdminAccount')}</option>
                <option value="player">{t('demoPlayerAccount')}</option>
              </select>
            </label>
          </div>
        )}

        {!demoMode && !profileLoading && profile && !approved && (
          <div className="approval-banner">
            <LockKeyhole size={18} />
            <div>
              <strong>{t('awaitingApprovalTitle')}</strong>
              <p>{t('awaitingApprovalDesc')}</p>
            </div>
          </div>
        )}

        <div key={screen} className="screen-stage">
          {screen === 'overview' && (
            <OverviewScreen
              isAdmin={isAdmin}
              demoMode={demoMode}
              selectedCost={selectedCost}
              managerBudget={managerBudget}
              effectiveDemoPoints={effectiveDemoPoints}
              myStanding={myStanding}
              myRank={myRank}
              standingsCount={standings.length}
              standingsLoading={standingsLoading}
              standingsError={standingsError}
              gameweek={gameweek}
              scoringRules={scoringRules}
              onNavigate={setScreen}
            />
          )}

          {screen === 'squad' && (
            <SquadScreen
              demoMode={demoMode}
              managerName={profile?.display_name ?? (isAdmin ? 'Admin' : 'Manager')}
              teamName={profile?.team_name ?? null}
              gameweekNumber={targetGw?.number ?? gameweekNumber}
              squadLoading={squadLoading}
              squadSaving={squadSaving}
              playersError={playersError}
              squadError={squadError}
              sessionMessage={sessionMessage}
              onClearMessage={() => setSessionMessage('')}
              targetGw={targetGw}
              selected={selected}
              playerById={playerById}
              selectedCost={selectedCost}
              managerBudget={managerBudget}
              captain={captain}
              viceCaptain={viceCaptain}
              activeChip={activeChip}
              usedChips={usedChips}
              freeTransfers={baseFree}
              transfersUsed={transfersUsed}
              pointsHits={pointsHits}
              hasUnsaved={hasUnsaved}
              celebrateKey={celebrateKey}
              onResetSquad={() => {
                setSelected(savedSnapshot.ids);
                setCaptain(savedSnapshot.captain);
                setViceCaptain(savedSnapshot.viceCaptain);
                setActiveChip(savedSnapshot.chip);
              }}
              onApplyLineup={handleApplyLineup}
              onSetCaptain={id => {
                setCaptain(id);
                if (viceCaptain === id) {
                  const alt = selected.slice(0, STARTERS_COUNT).find(x => x !== id) ?? '';
                  setViceCaptain(alt);
                }
              }}
              onSetViceCaptain={id => {
                if (id !== captain) setViceCaptain(id);
              }}
              onToggleChip={(chip: ChipName) =>
                setActiveChip(prev => (prev === chip ? null : chip))
              }
              onSaveSquad={() => void saveSquad()}
              onOpenPlayerProfile={setProfileModalPlayerId}
              onNavigate={setScreen}
            />
          )}

          {screen === 'players' && (
            <PlayerMarketScreen
              players={players}
              playersLoading={playersLoading}
              playersError={playersError}
              selected={selected}
              selectedCost={selectedCost}
              managerBudget={managerBudget}
              onAddOrRemovePlayer={handleAddOrRemovePlayer}
              onOpenPlayerProfile={setProfileModalPlayerId}
              onNavigate={setScreen}
            />
          )}

          {screen === 'matches' && (
            <MatchesScreen
              demoMode={demoMode}
              gameweeks={allGameweeks}
              onOpenPlayerProfile={setProfileModalPlayerId}
            />
          )}

          {screen === 'leaderboard' && (
            <LeaderboardScreen
              demoMode={demoMode}
              currentUserId={session?.user?.id}
              isAdmin={isAdmin}
              standings={standings}
              standingsLoading={standingsLoading}
              standingsError={standingsError}
              gameweeks={allGameweeks}
              demoPlayers={DEMO_PLAYERS}
              trophies={managerTrophies}
              onCupChanged={() => setReloadKey(k => k + 1)}
              onOpenPlayerProfile={setProfileModalPlayerId}
            />
          )}

          {screen === 'admin' && isAdmin && supabase && (
            <AdminPanel db={supabase} onChanged={() => setReloadKey(k => k + 1)} />
          )}

          {screen === 'admin' && isAdmin && !supabase && (
            <section className="panel">
              <div className="notice">
                Demo mode: connect Supabase in <code>.env.local</code> to use live admin tools.
              </div>
            </section>
          )}

          {screen === 'admin' && !isAdmin && (
            <section className="panel">
              <div className="denied">
                <LockKeyhole size={32} />
                <h3>{t('adminOnlyTitle')}</h3>
                <p>{t('adminOnlyDesc')}</p>
              </div>
            </section>
          )}
        </div>

        {profileModalPlayerId && (
          <PlayerProfileModal
            playerId={profileModalPlayerId}
            demoMode={demoMode}
            fallbackPlayer={playerById.get(profileModalPlayerId)}
            isSelectedInSquad={selected.includes(profileModalPlayerId)}
            canAddToSquad={
              selected.length < SQUAD_SIZE &&
              !isOverBudget(
                selectedCost + (playerById.get(profileModalPlayerId)?.price ?? 0),
                managerBudget
              )
            }
            onToggleSquadPlayer={
              playerById.get(profileModalPlayerId)
                ? handleAddOrRemovePlayer
                : undefined
            }
            onClose={() => setProfileModalPlayerId(null)}
          />
        )}

        {myProfileOpen && (
          <ManagerProfileModal
            profile={
              profile ?? {
                id: 'demo-user',
                display_name: isAdmin ? 'Admin' : 'Player',
                team_name: 'El Khames XI',
                avatar_url: null,
                budget: SQUAD_BUDGET,
                role: isAdmin ? 'admin_player' : 'player',
                player_approval_status: 'approved',
              }
            }
            demoMode={demoMode}
            trophies={managerTrophies}
            onUpdated={updated => {
              setProfile(updated);
              setStandings(prev =>
                prev.map(s =>
                  s.manager_id === updated.id
                    ? {
                        ...s,
                        display_name: updated.display_name,
                        team_name: updated.team_name,
                        avatar_url: updated.avatar_url,
                      }
                    : s
                )
              );
            }}
            onClose={() => setMyProfileOpen(false)}
          />
        )}

        <footer>
          <span>EL KHAMES EL MOMTAZ</span>
          <span>{t('cairoTimeFooter')}</span>
        </footer>
      </main>
    </div>
  );
}
