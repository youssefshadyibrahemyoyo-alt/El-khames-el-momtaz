import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AdminProps } from './types';
import { useLanguage } from '../i18n/LanguageContext';
import GameweeksAdmin from './GameweeksAdmin';
import PlayersAdmin from './PlayersAdmin';
import RegistrationsAdmin from './RegistrationsAdmin';
import StatsAdmin from './StatsAdmin';
import ScoringRulesAdmin from './ScoringRulesAdmin';

type Tab = 'registrations' | 'players' | 'gameweeks' | 'stats' | 'scoring';

export default function AdminPanel({ db, onChanged }: AdminProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('registrations');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'registrations', label: t('adminTabRegistrations') },
    { id: 'players', label: t('adminTabPlayers') },
    { id: 'gameweeks', label: t('adminTabGameweeks') },
    { id: 'stats', label: t('adminTabStats') },
    { id: 'scoring', label: t('adminTabScoring') },
  ];

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>{t('adminControlRoom')}</h3>
          <p>{t('adminControlSub')}</p>
        </div>
        <ShieldCheck color="#b9954b" />
      </div>

      <div className="leaderboard-tabs">
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'primary' : 'secondary'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'registrations' && <RegistrationsAdmin db={db} onChanged={onChanged} />}
      {tab === 'players' && <PlayersAdmin db={db} onChanged={onChanged} />}
      {tab === 'gameweeks' && <GameweeksAdmin db={db} onChanged={onChanged} />}
      {tab === 'stats' && <StatsAdmin db={db} onChanged={onChanged} />}
      {tab === 'scoring' && <ScoringRulesAdmin db={db} onChanged={onChanged} />}
    </section>
  );
}
