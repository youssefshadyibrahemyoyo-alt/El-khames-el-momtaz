import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppIconId =
  | 'ar-green'
  | 'ar-white'
  | 'ar-silver'
  | 'ar-black'
  | 'en-green'
  | 'en-white'
  | 'en-silver'
  | 'en-black';

export type IconColorKey = 'green' | 'white' | 'silver' | 'black';
export type IconLangGroup = 'ar' | 'en';
export type UiScaleMode = 'compact' | 'standard' | 'comfortable';
export type DefaultLandingScreen = 'overview' | 'squad' | 'players' | 'matches' | 'leaderboard';
export type SplashPreference = 'auto' | 'fast';

export type AppIconMeta = {
  id: AppIconId;
  langGroup: IconLangGroup;
  colorKey: IconColorKey;
  isMain: boolean;
  svgPath: string;
  png512Path: string;
  png192Path: string;
  png180Path: string;
  manifestPath: string;
  homeLabel: string;
  swatchHex: string;
  accentHex: string;
};

export const APP_ICON_CATALOG: AppIconMeta[] = [
  {
    id: 'ar-green',
    langGroup: 'ar',
    colorKey: 'green',
    isMain: true,
    svgPath: '/icons/ar-green.svg',
    png512Path: '/icons/ar-green-512.png',
    png192Path: '/icons/ar-green-192.png',
    png180Path: '/icons/ar-green-180.png',
    manifestPath: '/manifests/manifest-ar-green.webmanifest',
    homeLabel: 'الخميس الممتاز',
    swatchHex: '#0B3521',
    accentHex: '#DFB657',
  },
  {
    id: 'ar-white',
    langGroup: 'ar',
    colorKey: 'white',
    isMain: false,
    svgPath: '/icons/ar-white.svg',
    png512Path: '/icons/ar-white-512.png',
    png192Path: '/icons/ar-white-192.png',
    png180Path: '/icons/ar-white-180.png',
    manifestPath: '/manifests/manifest-ar-white.webmanifest',
    homeLabel: 'الخميس الممتاز',
    swatchHex: '#F6F8F6',
    accentHex: '#0F482D',
  },
  {
    id: 'ar-silver',
    langGroup: 'ar',
    colorKey: 'silver',
    isMain: false,
    svgPath: '/icons/ar-silver.svg',
    png512Path: '/icons/ar-silver-512.png',
    png192Path: '/icons/ar-silver-192.png',
    png180Path: '/icons/ar-silver-180.png',
    manifestPath: '/manifests/manifest-ar-silver.webmanifest',
    homeLabel: 'الخميس الممتاز',
    swatchHex: '#CFD8E3',
    accentHex: '#123C28',
  },
  {
    id: 'ar-black',
    langGroup: 'ar',
    colorKey: 'black',
    isMain: false,
    svgPath: '/icons/ar-black.svg',
    png512Path: '/icons/ar-black-512.png',
    png192Path: '/icons/ar-black-192.png',
    png180Path: '/icons/ar-black-180.png',
    manifestPath: '/manifests/manifest-ar-black.webmanifest',
    homeLabel: 'الخميس الممتاز',
    swatchHex: '#0E1110',
    accentHex: '#E3B851',
  },
  {
    id: 'en-green',
    langGroup: 'en',
    colorKey: 'green',
    isMain: true,
    svgPath: '/icons/en-green.svg',
    png512Path: '/icons/en-green-512.png',
    png192Path: '/icons/en-green-192.png',
    png180Path: '/icons/en-green-180.png',
    manifestPath: '/manifests/manifest-en-green.webmanifest',
    homeLabel: 'El Khames',
    swatchHex: '#0B3521',
    accentHex: '#DFB657',
  },
  {
    id: 'en-white',
    langGroup: 'en',
    colorKey: 'white',
    isMain: false,
    svgPath: '/icons/en-white.svg',
    png512Path: '/icons/en-white-512.png',
    png192Path: '/icons/en-white-192.png',
    png180Path: '/icons/en-white-180.png',
    manifestPath: '/manifests/manifest-en-white.webmanifest',
    homeLabel: 'El Khames',
    swatchHex: '#F6F8F6',
    accentHex: '#0F482D',
  },
  {
    id: 'en-silver',
    langGroup: 'en',
    colorKey: 'silver',
    isMain: false,
    svgPath: '/icons/en-silver.svg',
    png512Path: '/icons/en-silver-512.png',
    png192Path: '/icons/en-silver-192.png',
    png180Path: '/icons/en-silver-180.png',
    manifestPath: '/manifests/manifest-en-silver.webmanifest',
    homeLabel: 'El Khames',
    swatchHex: '#CFD8E3',
    accentHex: '#123C28',
  },
  {
    id: 'en-black',
    langGroup: 'en',
    colorKey: 'black',
    isMain: false,
    svgPath: '/icons/en-black.svg',
    png512Path: '/icons/en-black-512.png',
    png192Path: '/icons/en-black-192.png',
    png180Path: '/icons/en-black-180.png',
    manifestPath: '/manifests/manifest-en-black.webmanifest',
    homeLabel: 'El Khames',
    swatchHex: '#0E1110',
    accentHex: '#E3B851',
  },
];

export const DEFAULT_APP_ICON: AppIconId = 'ar-green';

const ICON_KEY = 'ekm_app_icon';
const PREFS_KEY = 'ekm_user_prefs_v1';

export type UserPrefs = {
  uiScale: UiScaleMode;
  reduceMotion: boolean;
  celebrationsEnabled: boolean;
  hapticsEnabled: boolean;
  confirmPointHits: boolean;
  defaultScreen: DefaultLandingScreen;
  splashMode: SplashPreference;
  deadlineAlerts: boolean;
};

export const DEFAULT_USER_PREFS: UserPrefs = {
  uiScale: 'standard',
  reduceMotion: false,
  celebrationsEnabled: true,
  hapticsEnabled: true,
  confirmPointHits: true,
  defaultScreen: 'overview',
  splashMode: 'auto',
  deadlineAlerts: true,
};

export function isValidAppIconId(val: unknown): val is AppIconId {
  return typeof val === 'string' && APP_ICON_CATALOG.some(item => item.id === val);
}

export function getAppIconMeta(id: AppIconId): AppIconMeta {
  return APP_ICON_CATALOG.find(item => item.id === id) ?? APP_ICON_CATALOG[0];
}

export function getStoredAppIcon(): AppIconId {
  try {
    const raw = localStorage.getItem(ICON_KEY);
    if (isValidAppIconId(raw)) return raw;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_APP_ICON;
}

export function getStoredUserPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_USER_PREFS;
    const parsed = JSON.parse(raw) as Partial<UserPrefs>;
    return {
      uiScale:
        parsed.uiScale === 'compact' ||
        parsed.uiScale === 'standard' ||
        parsed.uiScale === 'comfortable'
          ? parsed.uiScale
          : DEFAULT_USER_PREFS.uiScale,
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : DEFAULT_USER_PREFS.reduceMotion,
      celebrationsEnabled:
        typeof parsed.celebrationsEnabled === 'boolean'
          ? parsed.celebrationsEnabled
          : DEFAULT_USER_PREFS.celebrationsEnabled,
      hapticsEnabled:
        typeof parsed.hapticsEnabled === 'boolean'
          ? parsed.hapticsEnabled
          : DEFAULT_USER_PREFS.hapticsEnabled,
      confirmPointHits:
        typeof parsed.confirmPointHits === 'boolean'
          ? parsed.confirmPointHits
          : DEFAULT_USER_PREFS.confirmPointHits,
      defaultScreen:
        parsed.defaultScreen === 'overview' ||
        parsed.defaultScreen === 'squad' ||
        parsed.defaultScreen === 'players' ||
        parsed.defaultScreen === 'matches' ||
        parsed.defaultScreen === 'leaderboard'
          ? parsed.defaultScreen
          : DEFAULT_USER_PREFS.defaultScreen,
      splashMode: parsed.splashMode === 'fast' ? 'fast' : 'auto',
      deadlineAlerts:
        typeof parsed.deadlineAlerts === 'boolean'
          ? parsed.deadlineAlerts
          : DEFAULT_USER_PREFS.deadlineAlerts,
    };
  } catch {
    return DEFAULT_USER_PREFS;
  }
}

function applyDomAppIcon(iconId: AppIconId) {
  if (typeof document === 'undefined') return;
  const meta = getAppIconMeta(iconId);

  const svgLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (svgLink) svgLink.href = meta.svgPath;

  const altLink = document.querySelector<HTMLLinkElement>('link[rel="alternate icon"]');
  if (altLink) altLink.href = meta.png192Path;

  const appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (appleLink) appleLink.href = meta.png180Path;

  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifestLink) manifestLink.href = meta.manifestPath;

  const appleTitle = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-title"]'
  );
  if (appleTitle) appleTitle.content = meta.homeLabel;
}

function applyDomUserPrefs(prefs: UserPrefs) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.uiScale = prefs.uiScale;
  document.documentElement.dataset.reduceMotion = prefs.reduceMotion ? 'true' : 'false';
  try {
    if (prefs.splashMode === 'fast') {
      localStorage.setItem('ekm_splash_fast', '1');
    } else {
      localStorage.removeItem('ekm_splash_fast');
    }
  } catch {
    // ignore storage errors
  }
}

type AppSettingsContextValue = {
  appIcon: AppIconId;
  activeIconMeta: AppIconMeta;
  setAppIcon: (next: AppIconId) => void;
  prefs: UserPrefs;
  updatePref: <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => void;
  triggerHaptic: (ms?: number) => void;
  resetAllSettings: () => void;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [appIcon, setAppIconState] = useState<AppIconId>(() => getStoredAppIcon());
  const [prefs, setPrefs] = useState<UserPrefs>(() => getStoredUserPrefs());

  useEffect(() => {
    try {
      localStorage.setItem(ICON_KEY, appIcon);
    } catch {
      // ignore
    }
    applyDomAppIcon(appIcon);
  }, [appIcon]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
    applyDomUserPrefs(prefs);
  }, [prefs]);

  const activeIconMeta = useMemo(() => getAppIconMeta(appIcon), [appIcon]);

  const triggerHaptic = (ms = 12) => {
    if (!prefs.hapticsEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(ms);
      }
    } catch {
      // ignore
    }
  };

  const setAppIcon = (next: AppIconId) => {
    setAppIconState(next);
    triggerHaptic(14);
  };

  const updatePref = <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    triggerHaptic(10);
  };

  const resetAllSettings = () => {
    setAppIconState(DEFAULT_APP_ICON);
    setPrefs(DEFAULT_USER_PREFS);
    triggerHaptic(20);
  };

  return (
    <AppSettingsContext.Provider
      value={{
        appIcon,
        activeIconMeta,
        setAppIcon,
        prefs,
        updatePref,
        triggerHaptic,
        resetAllSettings,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (ctx) return ctx;
  const fallbackIcon = getStoredAppIcon();
  return {
    appIcon: fallbackIcon,
    activeIconMeta: getAppIconMeta(fallbackIcon),
    setAppIcon: applyDomAppIcon,
    prefs: DEFAULT_USER_PREFS,
    updatePref: () => undefined,
    triggerHaptic: () => undefined,
    resetAllSettings: () => undefined,
  };
}
