/*
# Allow x-tranet password entry without prior admin session

1. Purpose
- Allows the footer x-tranet popup to authenticate directly with its private password, even when the browser does not already have an administrator session.

2. Security
- Only the two password-protected panel RPCs are exposed to the anonymous role.
- The access table remains fully private with RLS enabled, no policies, and no table grants.
- The password remains stored only as a bcrypt hash.
- A wrong password raises an error before any pending stores, products, users, or settings are returned or changed.

3. Data safety
- No application data is deleted or changed.
*/

GRANT EXECUTE ON FUNCTION public.admin_panel_load(text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_panel_save(text, numeric, jsonb) TO anon;
