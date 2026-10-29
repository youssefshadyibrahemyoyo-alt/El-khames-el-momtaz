import { X } from 'lucide-react';
import type { SquadInspection } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';
import FutPlayerCard from './FutPlayerCard';
import AnimatedNumber from './AnimatedNumber';

type SquadInspectorModalProps = {
  managerName: string;
  gameweekNumber: number;
  loading: boolean;
  error: string;
  inspection: SquadInspection | null;
  onClose: () => void;
};

export default function SquadInspectorModal({
  managerName,
  gameweekNumber,
  loading,
  error,
  inspection,
  onClose,
}: SquadInspectorModalProps) {
  const { t } = useLanguage();

  const starters = (inspection?.players ?? []).filter(p => p.is_starter_slot);
  const bench = (inspection?.players ?? []).filter(p => !p.is_starter_slot);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-sheet-spring" onClick={e => e.stopPropagation()}>
        <div className="sheet-grabber" aria-hidden="true" />

        <div className="panel-heading modal-heading">
          <div>
            <h3>
              {managerName} · {t('gameweekOption')} {gameweekNumber}
            </h3>
            <p>{t('inspectorTitle')}</p>
          </div>
          <button type="button" className="secondary compact-btn" onClick={onClose}>
            <X size={14} /> {t('closeBtn')}
          </button>
        </div>

        {loading && <p className="muted">{t('loadingSavedSquad')}</p>}
        {error && <div className="notice">{error}</div>}

        {!loading && !error && inspection && !inspection.has_squad && (
          <div className="notice">{t('noSquadSavedForGw')}</div>
        )}

        {!loading && !error && inspection && inspection.has_squad && (
          <>
            <div className="inspector-badges">
              <span className="inspector-score-pill">
                <strong>
                  <AnimatedNumber value={inspection.total_points ?? 0} decimals={0} />{' '}
                  {t('ptsUnit')}
                </strong>
              </span>
              {inspection.chip && (
                <span className="inspector-badge gold">
                  {t('chipPlayedBadge')}: {inspection.chip}
                </span>
              )}
              {(inspection.points_hit ?? 0) > 0 && (
                <span className="inspector-badge danger">
                  {t('transferHitBadge')}: −{inspection.points_hit} {t('ptsUnit')}
                </span>
              )}
              {inspection.is_rolled_over && (
                <span className="inspector-badge muted-badge">{t('rolledOverBadge')}</span>
              )}
            </div>

            <div className="pitch-3d-stage">
              <div className="egypt-pitch pitch-3d-stadium inspector-pitch">
                <div className="stadium-beam beam-left" aria-hidden="true" />
                <div className="stadium-beam beam-right" aria-hidden="true" />
                <div className="egypt-pitch-title">{t('pitchTitle')}</div>
                <div className="egypt-pitch-markings">
                  <div className="egypt-halfway" />
                  <div className="egypt-centre-circle" />
                  <div className="egypt-goal-box egypt-goal-top" />
                  <div className="egypt-goal-box egypt-goal-bottom" />
                </div>

                <div className="egypt-formation">
                  {starters.map((p, index) => (
                    <FutPlayerCard
                      key={p.player_id}
                      slotNumber={index + 1}
                      name={p.display_name}
                      photoUrl={p.photo_url}
                      statLabel={
                        p.played
                          ? `${p.effective_points} ${t('ptsUnit')}${p.multiplier > 1 ? ` (×${p.multiplier})` : ''}`
                          : t('didNotPlayTag')
                      }
                      secondaryNote={p.subbed_out ? t('autoSubOutTag') : null}
                      isCaptain={p.is_captain}
                      isTripleCaptain={p.is_captain && inspection.chip === 'Triple Captain'}
                      isViceCaptain={!p.is_captain && p.is_vice_captain}
                      isSubbedOut={p.subbed_out}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="inspector-bench">
              <h4>{t('benchTitle')}</h4>
              <div className="inspector-bench-grid">
                {bench.map((p, idx) => (
                  <div
                    key={p.player_id}
                    className={`egypt-bench-player inspector-bench-item ${p.subbed_in ? 'subbed-in-card' : ''}`}
                  >
                    <span className="egypt-sub-number">{idx + 1}</span>
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.display_name} />
                    ) : (
                      <div className="player-photo small-photo">{p.display_name.slice(0, 1)}</div>
                    )}
                    <div className="egypt-bench-info">
                      <strong>{p.display_name}</strong>
                      <span>
                        {p.played ? `${p.raw_points} ${t('ptsUnit')}` : t('didNotPlayTag')}
                        {p.subbed_in ? ` · ${t('autoSubInTag')} (+${p.effective_points})` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
