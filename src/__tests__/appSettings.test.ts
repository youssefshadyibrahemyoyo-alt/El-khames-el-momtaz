import { describe, expect, it } from 'vitest';
import {
  APP_ICON_CATALOG,
  DEFAULT_APP_ICON,
  getAppIconMeta,
  isValidAppIconId,
} from '../settings/AppSettingsContext';

describe('AppSettingsContext 8-icon catalog', () => {
  it('contains 4 Arabic icons and 4 English icons across green, white, silver, and black', () => {
    expect(APP_ICON_CATALOG).toHaveLength(8);

    const arabic = APP_ICON_CATALOG.filter(i => i.langGroup === 'ar');
    const english = APP_ICON_CATALOG.filter(i => i.langGroup === 'en');
    expect(arabic.map(i => i.colorKey)).toEqual(['green', 'white', 'silver', 'black']);
    expect(english.map(i => i.colorKey)).toEqual(['green', 'white', 'silver', 'black']);
  });

  it('marks green as the main icon colorway and defaults to ar-green', () => {
    expect(DEFAULT_APP_ICON).toBe('ar-green');
    for (const item of APP_ICON_CATALOG) {
      expect(item.isMain).toBe(item.colorKey === 'green');
    }
  });

  it('validates icon ids and maps paths accurately', () => {
    expect(isValidAppIconId('ar-green')).toBe(true);
    expect(isValidAppIconId('en-silver')).toBe(true);
    expect(isValidAppIconId('en-black')).toBe(true);
    expect(isValidAppIconId('unknown-purple')).toBe(false);

    const silverEn = getAppIconMeta('en-silver');
    expect(silverEn.svgPath).toBe('/icons/en-silver.svg');
    expect(silverEn.png512Path).toBe('/icons/en-silver-512.png');
    expect(silverEn.manifestPath).toBe('/manifests/manifest-en-silver.webmanifest');
  });
});
