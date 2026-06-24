-- Harden: handle_new_user() is a trigger function (fires on auth.users insert),
-- never meant to be invoked directly. The default PUBLIC execute grant exposes it
-- as a callable RPC (/rest/v1/rpc/handle_new_user) to anon + authenticated. It's
-- effectively harmless to call (no trigger context → no-op/error) but shouldn't be
-- part of the public API surface. Revoking EXECUTE does NOT affect the trigger,
-- which runs with the function's definer rights regardless of role grants.
-- Flagged by db-linter 0028/0029 (anon/authenticated SECURITY DEFINER executable).

revoke all on function public.handle_new_user() from public, anon, authenticated;
