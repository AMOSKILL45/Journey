-- Phase 5A: private trip channels. Only trip members may receive/send on 'trip:{uuid}'.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members read trip channel" ON realtime.messages;
CREATE POLICY "Trip members read trip channel" ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'trip:%'
  AND public.is_trip_member((substring(realtime.topic() FROM 6))::uuid, (select auth.uid()))
);

DROP POLICY IF EXISTS "Trip members send trip channel" ON realtime.messages;
CREATE POLICY "Trip members send trip channel" ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'trip:%'
  AND public.is_trip_member((substring(realtime.topic() FROM 6))::uuid, (select auth.uid()))
);
