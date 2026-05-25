-- Security hardening: revoke EXECUTE on trigger/helper functions from anon + authenticated.
-- These functions are meant to be invoked by triggers/RLS only, not via PostgREST /rpc.
-- Fixes advisors: anon_security_definer_function_executable + authenticated_security_definer_function_executable + function_search_path_mutable

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_trip() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_trip_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_trip_editor(uuid, uuid) FROM anon, authenticated, public;

-- Fix set_updated_at search_path mutable warning
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;
