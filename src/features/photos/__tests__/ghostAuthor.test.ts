import { t } from '@core/i18n';

import { GHOST_AUTHOR_ID, resolveAuthorName } from '../data/ghostAuthor';

describe('resolveAuthorName (photos)', () => {
  it('returns the localized ghost name for the deletion sentinel id', () => {
    expect(resolveAuthorName(GHOST_AUTHOR_ID, 'whatever')).toBe(t('account.ghostName'));
    expect(resolveAuthorName(GHOST_AUTHOR_ID, null)).toBe(t('account.ghostName'));
  });

  it('returns the looked-up name for a normal author', () => {
    expect(resolveAuthorName('user-1', 'Ana')).toBe('Ana');
  });

  it('falls back to anonymous when no name is available', () => {
    expect(resolveAuthorName('user-1', null)).toBe(t('profile.anonymous'));
    expect(resolveAuthorName('user-1', '   ')).toBe(t('profile.anonymous'));
    expect(resolveAuthorName(null, undefined)).toBe(t('profile.anonymous'));
  });

  it('uses the canonical reserved sentinel uuid', () => {
    expect(GHOST_AUTHOR_ID).toBe('de1e7e00-0000-4000-8000-000000000000');
  });
});
