import { supabase } from '@core/supabase/client';

export interface RegisterTokenInput {
  token: string;
  platform: 'ios' | 'android';
  timezone: string | null;
  deviceId: string;
}

export async function registerToken(input: RegisterTokenInput): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const { error } = await supabase.from('user_push_tokens').upsert(
    {
      user_id: userData.user.id,
      token: input.token,
      platform: input.platform,
      timezone: input.timezone,
      device_id: input.deviceId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,device_id' },
  );
  if (error) throw error;
}

export async function removeToken(deviceId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const { error } = await supabase
    .from('user_push_tokens')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('device_id', deviceId);
  if (error) throw error;
}
