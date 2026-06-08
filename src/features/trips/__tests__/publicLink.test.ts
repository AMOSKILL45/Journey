import { buildPublicTripLink } from '@features/trips/utils/publicLink';

describe('buildPublicTripLink', () => {
  it('builds a thisisthejourney:// deep link from a share token', () => {
    expect(buildPublicTripLink('abc123')).toBe('thisisthejourney://t/abc123');
  });

  it('embeds the token verbatim (no encoding of plain tokens)', () => {
    expect(buildPublicTripLink('XyZ-789_tok')).toBe('thisisthejourney://t/XyZ-789_tok');
  });
});
