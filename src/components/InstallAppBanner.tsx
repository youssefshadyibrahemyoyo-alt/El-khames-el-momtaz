import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'elkhames_pwa_banner_dismissed_v1';

export default function InstallAppBanner() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalone(standalone);
    if (standalone) return;

    const ua = window.navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
    setIsIosSafari(ios);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (dismissed || isStandalone || (!deferredPrompt && !isIosSafari)) {
    return null;
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore storage errors
    }
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      handleDismiss();
    }
    setDeferredPrompt(null);
  }

  return (
    <div className="pwa-install-banner stagger-item">
      <div className="pwa-install-left">
        <div className="pwa-install-icon">
          <Smartphone size={18} />
        </div>
        <div>
          <strong>{t('pwaInstallTitle')}</strong>
          <p>{deferredPrompt ? t('pwaInstallAndroidSub') : t('pwaInstallIosSub')}</p>
        </div>
      </div>

      <div className="pwa-install-actions">
        {deferredPrompt && (
          <button
            type="button"
            className="primary compact-btn"
            onClick={() => void handleInstallClick()}
          >
            <Download size={13} /> {t('pwaInstallBtn')}
          </button>
        )}
        <button
          type="button"
          className="secondary compact-btn"
          aria-label={t('dismiss')}
          onClick={handleDismiss}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
