import { buildPublicTripLink } from '@features/trips/utils/publicLink';

describe('buildPublicTripLink', () => {
  it('builds a journey:// deep link from a share token', () => {
    expect(buildPublicTripLink('abc123')).toBe('journey://t/abc123');
  });

  it('embeds the token verbatim (no encoding of plain tokens)', () => {
    expect(buildPublicTripLink('XyZ-789_tok')).toBe('journey://t/XyZ-789_tok');
  });
});
