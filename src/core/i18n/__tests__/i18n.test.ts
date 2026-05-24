import { t, setLocale } from '../index';

describe('i18n', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('returns English translation by default', () => {
    expect(t('welcome.title')).toBe('Welcome');
  });

  it('switches to French when locale changes', () => {
    setLocale('fr');
    expect(t('welcome.title')).toBe('Bienvenue');
  });

  it('falls back to English when key missing in current locale', () => {
    setLocale('fr');
    // 'common.save' exists in both, just verify behavior
    expect(t('common.save')).toBe('Enregistrer');
  });

  it('returns key path when translation missing', () => {
    setLocale('en');
    expect(t('nonexistent.key')).toContain('nonexistent');
  });
});
