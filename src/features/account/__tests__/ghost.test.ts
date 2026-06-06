import en from '@core/i18n/locales/en.json';

import { GHOST_USER_ID, displayNameFor, isGhostUser } from '../utils/ghost';

describe('account/ghost', () => {
  it('identifies the reserved sentinel id', () => {
    expect(isGhostUser(GHOST_USER_ID)).toBe(true);
    expect(isGhostUser('some-real-uuid')).toBe(false);
    expect(isGhostUser(null)).toBe(false);
    expect(isGhostUser(undefined)).toBe(false);
  });

  it('shows the localized ghost name for the sentinel, ignoring any stored name', () => {
    expect(displayNameFor(GHOST_USER_ID, 'Real Name')).toBe(en.account.ghostName);
    expect(displayNameFor(GHOST_USER_ID, null)).toBe(en.account.ghostName);
  });

  it('shows the real display name for a normal user', () => {
    expect(displayNameFor('u1', 'Alice')).toBe('Alice');
  });

  it('falls back to the anonymous label when a normal user has no name', () => {
    expect(displayNameFor('u1', null)).toBe(en.profile.anonymous);
    expect(displayNameFor('u1', undefined)).toBe(en.profile.anonymous);
  });
});
