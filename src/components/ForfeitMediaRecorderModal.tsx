import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Mic,
  RefreshCw,
  Square,
  Upload,
  Video,
  X,
} from 'lucide-react';
import type { ForfeitManagerOption, ForfeitMediaType } from '../types/league';
import { useLanguage } from '../i18n/LanguageContext';

export type ForfeitModalTarget =
  | {
      kind: 'new';
      defaultGwNumber?: number | null;
      defaultForfeitTitle?: string;
    }
  | {
      kind: 'gw_loser';
      gameweekId: number;
      gameweekNumber: number;
      forfeitTitle: string;
      managerId: string;
      managerName: string;
      teamName?: string | null;
      initialCaption?: string | null;
    };

export type ForfeitMediaSubmission = {
  blob: File | Blob;
  fileNameHint: string;
  mediaType: ForfeitMediaType;
  caption: string;
  managerId?: string;
  forfeitTitle?: string;
  gameweekNumber?: number | null;
};

type CaptureTab = 'upload' | 'camera' | 'audio';

type Props = {
  target: ForfeitModalTarget;
  managers: ForfeitManagerOption[];
  currentUserId?: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: ForfeitMediaSubmission) => Promise<void>;
};

function pickSupportedMime(candidates: string[]): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      // ignore unsupported query
    }
  }
  return '';
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ForfeitMediaRecorderModal({
  target,
  managers,
  currentUserId,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useLanguage();

  const [tab, setTab] = useState<CaptureTab>('upload');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [streamActive, setStreamActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [localError, setLocalError] = useState('');

  // Captured or uploaded media state
  const [capturedBlob, setCapturedBlob] = useState<File | Blob | null>(null);
  const [capturedName, setCapturedName] = useState('');
  const [capturedType, setCapturedType] = useState<ForfeitMediaType>('video');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Metadata fields
  const defaultMgr =
    (currentUserId && managers.find(m => m.manager_id === currentUserId)?.manager_id) ||
    managers[0]?.manager_id ||
    '';
  const [selectedManagerId, setSelectedManagerId] = useState<string>(
    target.kind === 'gw_loser' ? target.managerId : defaultMgr
  );
  const [forfeitTitle, setForfeitTitle] = useState<string>(
    target.kind === 'gw_loser' ? target.forfeitTitle : target.defaultForfeitTitle || ''
  );
  const [gwNumberInput, setGwNumberInput] = useState<string>(
    target.kind === 'new' && target.defaultGwNumber ? String(target.defaultGwNumber) : ''
  );
  const [caption, setCaption] = useState<string>(
    target.kind === 'gw_loser' ? target.initialCaption || '' : ''
  );

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopLiveStream = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setStreamActive(false);
    setRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      stopLiveStream();
    };
  }, [stopLiveStream]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearCapturedMedia = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setCapturedName('');
    setRecordSeconds(0);
    setLocalError('');
  }, [previewUrl]);

  const openCameraPreview = useCallback(
    async (mode: 'environment' | 'user') => {
      stopLiveStream();
      clearCapturedMedia();
      setLocalError('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setLocalError(t('forfeitCameraDeniedErr'));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        mediaStreamRef.current = stream;
        setStreamActive(true);
        requestAnimationFrame(() => {
          if (liveVideoRef.current) {
            liveVideoRef.current.srcObject = stream;
            void liveVideoRef.current.play().catch(() => {});
          }
        });
      } catch {
        try {
          // Fallback without audio constraint if mic is unavailable
          const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          mediaStreamRef.current = videoOnlyStream;
          setStreamActive(true);
          requestAnimationFrame(() => {
            if (liveVideoRef.current) {
              liveVideoRef.current.srcObject = videoOnlyStream;
              void liveVideoRef.current.play().catch(() => {});
            }
          });
        } catch {
          setLocalError(t('forfeitCameraDeniedErr'));
        }
      }
    },
    [clearCapturedMedia, stopLiveStream, t]
  );

  async function startVideoRecording() {
    if (!mediaStreamRef.current) {
      await openCameraPreview(facingMode);
    }
    const stream = mediaStreamRef.current;
    if (!stream) return;

    chunksRef.current = [];
    const preferredMime = pickSupportedMime([
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ]);

    try {
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = ev => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const actualMime = (recorder.mimeType || preferredMime || 'video/webm')
          .split(';')[0]
          .trim();
        const ext = actualMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: actualMime || 'video/webm' });
        stopLiveStream();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setCapturedBlob(blob);
          setCapturedName(`forfeit-video.${ext}`);
          setCapturedType('video');
          setPreviewUrl(url);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(400);
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds(prev => {
          if (prev >= 59) {
            stopRecordingNow();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setLocalError(t('forfeitCameraDeniedErr'));
    }
  }

  async function startAudioRecording() {
    stopLiveStream();
    clearCapturedMedia();
    setLocalError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setLocalError(t('forfeitCameraDeniedErr'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      setStreamActive(true);
      chunksRef.current = [];

      const preferredMime = pickSupportedMime([
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg',
      ]);

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = ev => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const actualMime = (recorder.mimeType || preferredMime || 'audio/webm')
          .split(';')[0]
          .trim();
        const ext = actualMime.includes('mp4') ? 'm4a' : actualMime.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunksRef.current, { type: actualMime || 'audio/webm' });
        stopLiveStream();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setCapturedBlob(blob);
          setCapturedName(`forfeit-voice.${ext}`);
          setCapturedType('audio');
          setPreviewUrl(url);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(400);
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds(prev => {
          if (prev >= 89) {
            stopRecordingNow();
            return 90;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setLocalError(t('forfeitCameraDeniedErr'));
    }
  }

  function stopRecordingNow() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        stopLiveStream();
      }
    } else {
      stopLiveStream();
    }
  }

  async function handleFlipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (streamActive && !recording) {
      await openCameraPreview(next);
    }
  }

  function handleSwitchTab(nextTab: CaptureTab) {
    stopLiveStream();
    clearCapturedMedia();
    setTab(nextTab);
    if (nextTab === 'camera') {
      void openCameraPreview(facingMode);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError('');

    if (file.size > 50 * 1024 * 1024) {
      setLocalError('Max file size is 50 MB.');
      return;
    }

    clearCapturedMedia();
    const mime = (file.type || '').toLowerCase();
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    let mediaType: ForfeitMediaType = 'video';
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      mediaType = 'image';
    } else if (mime.startsWith('audio/') || ['mp3', 'm4a', 'ogg', 'wav'].includes(ext)) {
      mediaType = 'audio';
    }

    const url = URL.createObjectURL(file);
    setCapturedBlob(file);
    setCapturedName(file.name);
    setCapturedType(mediaType);
    setPreviewUrl(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!capturedBlob) {
      setLocalError(t('forfeitChooseFilePrompt'));
      return;
    }
    if (target.kind === 'new') {
      if (!selectedManagerId) {
        setLocalError('Please select a manager.');
        return;
      }
      if (forfeitTitle.trim().length < 2) {
        setLocalError(t('forfeitTitleInputLabel'));
        return;
      }
    }

    setLocalError('');
    const parsedGw = gwNumberInput.trim() ? Number(gwNumberInput.trim()) : null;

    try {
      await onSubmit({
        blob: capturedBlob,
        fileNameHint: capturedName,
        mediaType: capturedType,
        caption: caption.trim(),
        managerId: selectedManagerId,
        forfeitTitle: forfeitTitle.trim(),
        gameweekNumber: parsedGw && Number.isFinite(parsedGw) && parsedGw > 0 ? parsedGw : null,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div
      className="modal-backdrop forfeit-recorder-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!saving) {
          stopLiveStream();
          onClose();
        }
      }}
    >
      <div
        className="forfeit-recorder-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="forfeit-recorder-header">
          <div>
            <h4>
              {target.kind === 'gw_loser'
                ? `${t('forfeitModalTitleGw')} #${target.gameweekNumber}`
                : t('forfeitModalTitleNew')}
            </h4>
            <p className="muted tiny" style={{ margin: '3px 0 0' }}>
              {target.kind === 'gw_loser'
                ? `${target.teamName || target.managerName} (${target.managerName}) — ${target.forfeitTitle}`
                : t('forfeitModalSubNew')}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            disabled={saving}
            onClick={() => {
              stopLiveStream();
              onClose();
            }}
            aria-label={t('forfeitCancelBtn')}
          >
            <X size={16} />
          </button>
        </div>

        {localError && <div className="notice" style={{ marginBottom: 10 }}>{localError}</div>}

        <form onSubmit={e => void handleSubmit(e)} className="forfeit-recorder-form">
          {target.kind === 'new' && (
            <div className="forfeit-meta-fields">
              <div className="forfeit-meta-row">
                <label className="forfeit-field-label">
                  <span>{t('forfeitSelectManagerLabel')}</span>
                  <select
                    value={selectedManagerId}
                    onChange={e => setSelectedManagerId(e.target.value)}
                    required
                  >
                    {managers.map(m => (
                      <option key={m.manager_id} value={m.manager_id}>
                        {m.team_name ? `${m.team_name} (${m.display_name})` : m.display_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="forfeit-field-label forfeit-gw-num-field">
                  <span>{t('forfeitSelectGwOptional')}</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    placeholder="e.g. 1"
                    value={gwNumberInput}
                    onChange={e => setGwNumberInput(e.target.value)}
                  />
                </label>
              </div>

              <label className="forfeit-field-label">
                <span>{t('forfeitTitleInputLabel')}</span>
                <input
                  type="text"
                  maxLength={180}
                  required
                  placeholder={t('forfeitTitleInputPlaceholder')}
                  value={forfeitTitle}
                  onChange={e => setForfeitTitle(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* Mode Tabs: Upload File | Record Video | Record Voice */}
          <div className="forfeit-capture-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'upload'}
              className={`forfeit-capture-tab ${tab === 'upload' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('upload')}
            >
              <Upload size={14} /> {t('forfeitModeUploadBtn')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'camera'}
              className={`forfeit-capture-tab ${tab === 'camera' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('camera')}
            >
              <Video size={14} /> {t('forfeitModeCameraBtn')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'audio'}
              className={`forfeit-capture-tab ${tab === 'audio' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('audio')}
            >
              <Mic size={14} /> {t('forfeitModeAudioBtn')}
            </button>
          </div>

          {/* Capture / Preview Stage */}
          <div className="forfeit-capture-stage">
            {previewUrl ? (
              <div className="forfeit-preview-box">
                {capturedType === 'video' && (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    className="forfeit-media-player"
                  />
                )}
                {capturedType === 'image' && (
                  <img
                    src={previewUrl}
                    alt="Forfeit proof preview"
                    className="forfeit-media-image"
                  />
                )}
                {capturedType === 'audio' && (
                  <div className="forfeit-audio-preview">
                    <Mic size={22} />
                    <audio src={previewUrl} controls className="forfeit-audio-el" />
                  </div>
                )}

                <button
                  type="button"
                  className="secondary compact-btn"
                  disabled={saving}
                  onClick={() => {
                    clearCapturedMedia();
                    if (tab === 'camera') void openCameraPreview(facingMode);
                  }}
                >
                  <RefreshCw size={13} /> {t('forfeitRetakeBtn')}
                </button>
              </div>
            ) : tab === 'upload' ? (
              <label className="forfeit-dropzone">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*,audio/*"
                  onChange={handleFileSelected}
                  style={{ display: 'none' }}
                />
                <div className="forfeit-dropzone-icon">
                  <Upload size={24} />
                </div>
                <strong>{t('forfeitModeUploadBtn')}</strong>
                <span className="muted tiny">{t('forfeitChooseFilePrompt')}</span>
              </label>
            ) : tab === 'camera' ? (
              <div className="forfeit-camera-box">
                <div className="forfeit-viewfinder-wrap">
                  <video
                    ref={liveVideoRef}
                    muted
                    playsInline
                    autoPlay
                    className="forfeit-live-video"
                  />
                  {recording && (
                    <span className="forfeit-rec-indicator">
                      <span className="rec-dot" /> REC {formatDuration(recordSeconds)}
                    </span>
                  )}
                </div>

                <div className="forfeit-camera-controls">
                  {!streamActive && !recording && (
                    <button
                      type="button"
                      className="secondary compact-btn"
                      onClick={() => void openCameraPreview(facingMode)}
                    >
                      <Camera size={14} /> {t('forfeitStartCameraBtn')}
                    </button>
                  )}

                  {streamActive && !recording && (
                    <button
                      type="button"
                      className="secondary compact-btn"
                      onClick={() => void handleFlipCamera()}
                    >
                      <RefreshCw size={14} /> {t('forfeitFlipCameraBtn')}
                    </button>
                  )}

                  {!recording ? (
                    <button
                      type="button"
                      className="primary compact-btn forfeit-rec-start-btn"
                      onClick={() => void startVideoRecording()}
                    >
                      <Video size={14} /> {t('forfeitStartRecBtn')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="danger compact-btn"
                      onClick={stopRecordingNow}
                    >
                      <Square size={13} /> {t('forfeitStopRecBtn')} ({formatDuration(recordSeconds)})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="forfeit-voice-box">
                <div className={`forfeit-mic-orb ${recording ? 'is-recording' : ''}`}>
                  <Mic size={26} />
                </div>
                {recording && (
                  <strong className="forfeit-voice-timer">
                    REC {formatDuration(recordSeconds)}
                  </strong>
                )}
                {!recording ? (
                  <button
                    type="button"
                    className="primary compact-btn"
                    onClick={() => void startAudioRecording()}
                  >
                    <Mic size={14} /> {t('forfeitStartRecBtn')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="danger compact-btn"
                    onClick={stopRecordingNow}
                  >
                    <Square size={13} /> {t('forfeitStopRecBtn')}
                  </button>
                )}
              </div>
            )}
          </div>

          <label className="forfeit-field-label">
            <span>{t('forfeitCaptionLabel')}</span>
            <input
              type="text"
              maxLength={200}
              placeholder={t('forfeitCaptionPlaceholder')}
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
          </label>

          <div className="forfeit-recorder-footer">
            <button
              type="button"
              className="secondary compact-btn"
              disabled={saving}
              onClick={() => {
                stopLiveStream();
                onClose();
              }}
            >
              {t('forfeitCancelBtn')}
            </button>
            <button
              type="submit"
              className="primary compact-btn"
              disabled={saving || !capturedBlob}
            >
              <Check size={14} />{' '}
              {saving ? t('forfeitSavingMediaBtn') : t('forfeitSaveToHistoryBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
