import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { confirmWordForLocale, matchesConfirmWord } from '../utils/confirmWord';

describe('account/confirmWord', () => {
  it('returns the locale magic word, falling back to English', () => {
    expect(confirmWordForLocale('en')).toBe('DELETE');
    expect(confirmWordForLocale('fr')).toBe('SUPPRIMER');
    expect(confirmWordForLocale('de')).toBe('DELETE');
  });

  it('matches case-insensitively and trims whitespace', () => {
    expect(matchesConfirmWord('DELETE', 'en')).toBe(true);
    expect(matchesConfirmWord('  delete ', 'en')).toBe(true);
    expect(matchesConfirmWord('Supprimer', 'fr')).toBe(true);
  });

  it('rejects the wrong word or empty input', () => {
    expect(matchesConfirmWord('', 'en')).toBe(false);
    expect(matchesConfirmWord('SUPPRIMER', 'en')).toBe(false);
    expect(matchesConfirmWord('DELET', 'en')).toBe(false);
  });

  // Contract guard: the magic word MUST appear in the (seed-owned) confirm-label copy, so a copy
  // change that drops the word is caught here instead of silently breaking the gate at runtime.
  it('the magic word is embedded in the confirmLabel copy for each locale', () => {
    expect(en.account.delete.confirmLabel).toContain('DELETE');
    expect(fr.account.delete.confirmLabel).toContain('SUPPRIMER');
  });
});
