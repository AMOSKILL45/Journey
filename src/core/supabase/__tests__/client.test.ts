jest.mock('@core/env', () => ({
  env: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'sb_publishable_test_key',
  },
}));

import { supabase } from '../client';

describe('Supabase client', () => {
  it('instantiates successfully with valid env', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });
});
