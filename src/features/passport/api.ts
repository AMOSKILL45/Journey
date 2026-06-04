import { supabase } from '@core/supabase/client';

import { parseStamps, type Stamp } from './passport';

export interface Passport {
  stamps: Stamp[];
  countries: string[];
}

export async function fetchMyPassport(): Promise<Passport> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { stamps: [], countries: [] };
  const { data, error } = await supabase
    .from('profiles')
    .select('passport_stamps, countries_visited')
    .eq('id', uid)
    .single();
  if (error) throw error;
  return {
    stamps: parseStamps(data?.passport_stamps),
    countries: (data?.countries_visited ?? []) as string[],
  };
}

export async function rebuildMyPassport(): Promise<void> {
  const { error } = await supabase.rpc('rebuild_my_passport');
  if (error) throw error;
}
