/*
# Fix x-tranet panel password access

1. Purpose
- Makes the x-tranet popup authenticate with the private panel password as requested.
- Removes the extra dependency on the user's profile role, which was rejecting the correct password for sessions that were not linked to the admin profile.

2. Security
- The panel functions remain callable only by authenticated users.
- The panel password is stored only as a bcrypt hash.
- The password verification function remains private and is not granted to the Data API roles.
- Admin panel load and save operations continue to run through SECURITY DEFINER functions that verify the password before returning or changing data.

3. Data safety
- Replaces only the stored bcrypt hash for the existing single access row.
- Does not delete or alter application records.
*/

UPDATE public.admin_panel_access
SET password_hash = extensions.crypt('Monoplaz@_0908', extensions.gen_salt('bf'))
WHERE id = 1;

CREATE OR REPLACE FUNCTION public.admin_panel_verify(p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_panel_access
    WHERE password_hash = extensions.crypt(p_password, password_hash)
  ) THEN
    RAISE EXCEPTION 'Invalid panel password';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_panel_verify(text) FROM PUBLIC, anon, authenticated;
