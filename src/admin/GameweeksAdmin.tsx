import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarPlus, CheckCircle2, Play, RotateCcw, Square, X } from 'lucide-react';
import type { AdminProps } from './types';
import {
  CAIRO_TZ,
  formatCairoDeadline,
  fromCairoDateTimeInput,
  toCairoDateTimeInput,
} from '../lib/cairoTime';
import { useLanguage } from '../i18n/LanguageContext';

type GW = { id: number; number: number; status: string; transfer_deadline: string | null };
type Result = { error: { message: string } | null };

type ConfirmAction =
  | { kind: 'generate'; nextNumber: number; deadlineIso: string | null }
  | { kind: 'start'; gw: GW }
  | { kind: 'end'; gw: GW }
  | { kind: 'reset_all' };

function suggestNextThursdayCairoInput(now: Date = new Date()): string {
  // Find the next Thursday 19:00 in Cairo time that is at least 1 hour in the future
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now);

  const year = Number(parts.find(p => p.type === 'year')?.value ?? now.getUTCFullYear());
  const month = Number(parts.find(p => p.type === 'month')?.value ?? 1);
  const day = Number(parts.find(p => p.type === 'day')?.value ?? 1);
  const weekdayStr = parts.find(p => p.type === 'weekday')?.value ?? 'Thu';
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const currentDow = dayMap[weekdayStr] ?? 4;
  let daysAhead = (4 - currentDow + 7) % 7;

  const candidateDate = new Date(Date.UTC(year, month - 1, day + daysAhead));
  const y = candidateDate.getUTCFullYear();
  const m = String(candidateDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(candidateDate.getUTCDate()).padStart(2, '0');
  const candidateInput = `${y}-${m}-${d}T19:00`;
  const candidateIso = fromCairoDateTimeInput(candidateInput);

  if (candidateIso && new Date(candidateIso).getTime() > now.getTime() + 45 * 60 * 1000) {
    return candidateInput;
  }

  daysAhead += 7;
  const nextWeekDate = new Date(Date.UTC(year, month - 1, day + daysAhead));
  const ny = nextWeekDate.getUTCFullYear();
  const nm = String(nextWeekDate.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(nextWeekDate.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}T19:00`;
}

export default function GameweeksAdmin({ db, onChanged }: AdminProps) {
  const { t, lang } = useLanguage();
  const [rows, setRows] = useState<GW[]>([]);
  const [deadlines, setDeadlines] = useState<Record<number, string>>({});
  const [newDeadline, setNewDeadline] = useState<string>(() => suggestNextThursdayCairoInput());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db
      .from('gameweeks')
      .select('id,number,status,transfer_deadline')
      .order('number', { ascending: false });
    if (error) {
      setMsg(error.message);
      return;
    }
    const list = (data ?? []) as GW[];
    setRows(list);
    setDeadlines(
      Object.fromEntries(list.map(g => [g.id, toCairoDateTimeInput(g.transfer_deadline)]))
    );
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(label: string, fn: () => PromiseLike<Result>) {
    setBusy(true);
    setMsg('');
    try {
      const { error } = await fn();
      if (error) {
        setMsg(`${label} failed: ${error.message}`);
      } else {
        setMsg(`${label}: done.`);
        setConfirmAction(null);
        await load();
        onChanged();
      }
    } catch (e: any) {
      setMsg(`${label} failed: ${e?.message ?? 'Unexpected error'}`);
    } finally {
      setBusy(false);
    }
  }

  const status = (g: GW) => String(g.status).toLowerCase();
  const hasActive = rows.some(g => status(g) === 'active');
  const hasUnfinished = rows.some(g => ['draft', 'open', 'active'].includes(status(g)));
  const nextGwNumber = (rows[0]?.number ?? 0) + 1;

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    if (confirmAction.kind === 'generate') {
      await run(`Generate Gameweek #${confirmAction.nextNumber}`, () =>
        db.rpc('admin_generate_gameweek', {
          p_transfer_deadline: confirmAction.deadlineIso,
        })
      );
      setNewDeadline(suggestNextThursdayCairoInput());
      return;
    }

    if (confirmAction.kind === 'start') {
      await run(`Start Gameweek #${confirmAction.gw.number}`, () =>
        db.rpc('start_gameweek', { p_gameweek_id: confirmAction.gw.id })
      );
      return;
    }

    if (confirmAction.kind === 'end') {
      await run(`End Gameweek #${confirmAction.gw.number}`, () =>
        db
          .from('gameweeks')
          .update({ status: 'finished', ended_at: new Date().toISOString() })
          .eq('id', confirmAction.gw.id)
      );
      return;
    }

    if (confirmAction.kind === 'reset_all') {
      await run('Reset all rounds', () => db.rpc('admin_reset_all_rounds'));
      setNewDeadline(suggestNextThursdayCairoInput());
    }
  };

  return (
    <div>
      <p className="muted tiny" style={{ marginBottom: 12 }}>
        Flow: click <strong>{t('generateGwBtn')}</strong> and confirm in the popup to open transfers,{' '}
        <strong>Start</strong> when Thursday matches kick off (auto-rolls over squads), record match stats, then{' '}
        <strong>End</strong> the round.
      </p>

      {/* GENERATE NEXT GAMEWEEK CARD */}
      <div className="gw-generator-card">
        <div className="gw-generator-head">
          <div>
            <span className="eyebrow">Round #{nextGwNumber}</span>
            <h4 style={{ margin: '3px 0 0' }}>
              {t('generateNextGwTitle')} · GW #{nextGwNumber}
            </h4>
          </div>
          {nextGwNumber === 1 && (
            <span className="gw-unlimited-pill">GW 1 · Unlimited Free Edits</span>
          )}
        </div>

        <div className="gw-generator-controls">
          <label className="gw-deadline-field">
            <span>{t('deadlineCairoLabel')}</span>
            <input
              type="datetime-local"
              value={newDeadline}
              disabled={busy || hasUnfinished}
              onChange={e => setNewDeadline(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="primary compact-btn gw-generate-btn"
            disabled={busy || !newDeadline || hasUnfinished}
            onClick={() =>
              setConfirmAction({
                kind: 'generate',
                nextNumber: nextGwNumber,
                deadlineIso: fromCairoDateTimeInput(newDeadline),
              })
            }
          >
            <CalendarPlus size={15} /> {t('generateGwBtn')} #{nextGwNumber}
          </button>
        </div>

        {hasUnfinished && (
          <p className="muted tiny" style={{ margin: '8px 0 0' }}>
            {t('finishCurrentGwFirstHint')}
          </p>
        )}
      </div>

      {/* EXISTING GAMEWEEKS TABLE */}
      {rows.length === 0 ? (
        <div className="gw-empty-state">
          <strong>No gameweeks generated yet.</strong>
          <p className="muted tiny" style={{ margin: '4px 0 0' }}>
            Choose your Thursday deadline above, click <strong>{t('generateGwBtn')} #1</strong>, and confirm to open Round 1!
          </p>
        </div>
      ) : (
        <div className="admin-scroll" style={{ marginTop: 14 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>GW</th>
                <th>Status</th>
                <th>{t('deadlineCairoLabel')}</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(g => {
                const st = status(g);
                return (
                  <tr key={g.id}>
                    <td>
                      <strong>GW #{g.number}</strong>
                    </td>
                    <td>
                      <span className={`gw-status-pill gw-status-${st}`}>{g.status}</span>
                    </td>
                    <td>
                      <input
                        type="datetime-local"
                        value={deadlines[g.id] ?? ''}
                        disabled={st === 'finished'}
                        onChange={e => setDeadlines(o => ({ ...o, [g.id]: e.target.value }))}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="secondary compact-btn"
                        disabled={
                          busy ||
                          st === 'finished' ||
                          (deadlines[g.id] ?? '') === toCairoDateTimeInput(g.transfer_deadline)
                        }
                        onClick={() =>
                          void run('Save deadline', () =>
                            db
                              .from('gameweeks')
                              .update({
                                transfer_deadline: fromCairoDateTimeInput(deadlines[g.id] ?? ''),
                              })
                              .eq('id', g.id)
                          )
                        }
                      >
                        Save deadline
                      </button>
                    </td>
                    <td>
                      {['draft', 'open'].includes(st) && (
                        <button
                          type="button"
                          className="primary compact-btn"
                          disabled={busy || hasActive}
                          title={hasActive ? 'End the active gameweek first' : ''}
                          onClick={() => setConfirmAction({ kind: 'start', gw: g })}
                        >
                          <Play size={13} /> Start
                        </button>
                      )}
                      {st === 'active' && (
                        <button
                          type="button"
                          className="primary compact-btn"
                          disabled={busy}
                          onClick={() => setConfirmAction({ kind: 'end', gw: g })}
                        >
                          <Square size={13} /> End
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* RESET ROUNDS ACTION (with confirmation modal) */}
      {rows.length > 0 && (
        <div className="gw-reset-bar">
          <span className="muted tiny">
            Testing before kick-off? You can reset all rounds & transfer hits back to GW #1.
          </span>
          <button
            type="button"
            className="secondary compact-btn danger-outline-btn"
            disabled={busy}
            onClick={() => setConfirmAction({ kind: 'reset_all' })}
          >
            <RotateCcw size={13} /> {t('resetAllRoundsBtn')}
          </button>
        </div>
      )}

      {msg && (
        <div className="notice inline-notice" style={{ marginTop: 12 }}>
          {msg}
        </div>
      )}

      {/* EXPLICIT CONFIRMATION MODAL */}
      {confirmAction && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!busy) setConfirmAction(null);
          }}
        >
          <div
            className="modal-card modal-sheet-spring gw-confirm-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-grabber" aria-hidden="true" />

            <div className="panel-heading modal-heading" style={{ marginBottom: 10 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {confirmAction.kind === 'reset_all' ? (
                  <AlertTriangle size={18} style={{ color: '#e05252' }} />
                ) : (
                  <CheckCircle2 size={18} style={{ color: 'var(--green)' }} />
                )}
                {confirmAction.kind === 'generate' &&
                  `${t('confirmGenerateGwTitle')} #${confirmAction.nextNumber}`}
                {confirmAction.kind === 'start' &&
                  `${t('confirmStartGwTitle')} #${confirmAction.gw.number}`}
                {confirmAction.kind === 'end' &&
                  `${t('confirmEndGwTitle')} #${confirmAction.gw.number}`}
                {confirmAction.kind === 'reset_all' && t('confirmResetRoundsTitle')}
              </h3>
              <button
                type="button"
                className="secondary compact-btn"
                disabled={busy}
                onClick={() => setConfirmAction(null)}
              >
                <X size={14} />
              </button>
            </div>

            {confirmAction.kind === 'generate' && (
              <>
                <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
                  {t('confirmGenerateGwDesc')}
                </p>
                <div className="gw-confirm-summary">
                  <div>
                    <span>Round</span>
                    <strong>Gameweek #{confirmAction.nextNumber}</strong>
                  </div>
                  <div>
                    <span>{t('deadlineCairoLabel')}</span>
                    <strong>
                      {formatCairoDeadline(confirmAction.deadlineIso, lang) || '—'}
                    </strong>
                  </div>
                </div>
              </>
            )}

            {confirmAction.kind === 'start' && (
              <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>
                {t('confirmStartGwDesc')}
              </p>
            )}

            {confirmAction.kind === 'end' && (
              <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>
                {t('confirmEndGwDesc')}
              </p>
            )}

            {confirmAction.kind === 'reset_all' && (
              <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>
                {t('confirmResetRoundsDesc')}
              </p>
            )}

            <div className="gw-confirm-actions">
              <button
                type="button"
                className="secondary compact-btn"
                disabled={busy}
                onClick={() => setConfirmAction(null)}
              >
                {t('cancelBtn')}
              </button>
              <button
                type="button"
                className={
                  confirmAction.kind === 'reset_all'
                    ? 'primary compact-btn danger-solid-btn'
                    : 'primary compact-btn'
                }
                disabled={busy}
                onClick={() => void executeConfirmedAction()}
              >
                {busy
                  ? 'Working…'
                  : confirmAction.kind === 'generate'
                    ? `${t('confirmGenerateBtn')} #${confirmAction.nextNumber}`
                    : confirmAction.kind === 'start'
                      ? t('confirmStartBtn')
                      : confirmAction.kind === 'end'
                        ? t('confirmEndBtn')
                        : t('confirmResetBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
