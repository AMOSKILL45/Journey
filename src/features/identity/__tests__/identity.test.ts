jest.mock('@core/supabase/client', () => {
  const invoke = jest.fn();
  return {
    supabase: { functions: { invoke } },
    // expose for spec-side assertions
    __mockInvoke: invoke,
  };
});

import { supabase } from '@core/supabase/client';

import {
  createIdentitySession,
  isAlreadyVerified,
  type CreateIdentitySessionResponse,
} from '../api/identity';

const mockInvoke = supabase.functions.invoke as jest.Mock;

describe('identity.api', () => {
  beforeEach(() => mockInvoke.mockReset());

  describe('isAlreadyVerified', () => {
    it('returns true for { already_verified: true }', () => {
      expect(isAlreadyVerified({ already_verified: true })).toBe(true);
    });

    it('returns false for a session payload', () => {
      const session: CreateIdentitySessionResponse = {
        id: 'vs_123',
        client_secret: 'vs_123_secret_xxx',
        ephemeral_key_secret: 'ek_xxx',
      };
      expect(isAlreadyVerified(session)).toBe(false);
    });
  });

  describe('createIdentitySession', () => {
    it('invokes the create-identity-session edge function with an empty body', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          id: 'vs_123',
          client_secret: 'vs_123_secret_xxx',
          ephemeral_key_secret: 'ek_xxx',
        },
        error: null,
      });

      const result = await createIdentitySession();
      expect(mockInvoke).toHaveBeenCalledWith('create-identity-session', { body: {} });
      expect(result).toEqual({
        id: 'vs_123',
        client_secret: 'vs_123_secret_xxx',
        ephemeral_key_secret: 'ek_xxx',
      });
    });

    it('throws when the edge function returns an error', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: new Error('boom') });
      await expect(createIdentitySession()).rejects.toThrow('boom');
    });

    it('throws when the edge function returns no data', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: null });
      await expect(createIdentitySession()).rejects.toThrow(/no data/i);
    });

    it('passes through already_verified response', async () => {
      mockInvoke.mockResolvedValue({ data: { already_verified: true }, error: null });
      const result = await createIdentitySession();
      expect(isAlreadyVerified(result)).toBe(true);
    });
  });
});
