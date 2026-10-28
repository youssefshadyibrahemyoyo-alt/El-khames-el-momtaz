import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AdminProps } from './types';
import GameweeksAdmin from './GameweeksAdmin';
import PlayersAdmin from './PlayersAdmin';
import RegistrationsAdmin from './RegistrationsAdmin';
import StatsAdmin from './StatsAdmin';

type Tab = 'registrations' | 'players' | 'gameweeks' | 'stats';

const tabs: { id: Tab; label: string }[] = [
  { id: 'registrations', label: 'Registrations' },
  { id: 'players', label: 'Players & prices' },
  { id: 'gameweeks', label: 'Gameweeks' },
  { id: 'stats', label: 'Match stats' },
];

export default function AdminPanel({ db, onChanged }: AdminProps) {
  const [tab, setTab] = useState<Tab>('registrations');

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Admin control room</h3>
          <p>Approve players, set prices, run gameweeks and record match stats.</p>
        </div>
        <ShieldCheck color="#b9954b" />
      </div>

      <div className="leaderboard-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={tab === t.id ? 'primary' : 'secondary'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'registrations' && <RegistrationsAdmin db={db} onChanged={onChanged} />}
      {tab === 'players' && <PlayersAdmin db={db} onChanged={onChanged} />}
      {tab === 'gameweeks' && <GameweeksAdmin db={db} onChanged={onChanged} />}
      {tab === 'stats' && <StatsAdmin db={db} onChanged={onChanged} />}
    </section>
  );
}
