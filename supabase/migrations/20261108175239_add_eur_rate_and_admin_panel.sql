/*
# Daily euro rate and admin approval panel

1. New Tables
- `admin_panel_access`: a single row holding the hashed password of the admin approval panel. The password itself is never stored, only a bcrypt hash. RLS is enabled with no policies and no grants, so only the database functions below can read it.

2. Site settings
- Adds the `tasa_euro` setting (Bs. per euro, entered daily by the admin). It is stored in `site_settings` with group `pagos`, which keeps it out of the general settings screen.

3. New functions (all SECURITY DEFINER, callable only by signed-in users)
- `admin_panel_verify(password)`: confirms the caller is an admin and the panel password matches.
- `admin_panel_load(password)`: returns the current euro rate plus stores, products and users that are new (last 7 days) or still pending.
- `admin_panel_save(password, rate, changes)`: verifies the password, saves the new euro rate, and applies the approve/reject choices for stores, products and users.

4. Security
- Anonymous visitors cannot call any of the new functions.
- Every call checks both the admin role and the panel password.
- The panel password hash is inserted separately, outside this migration.

5. Notes
- Running this migration again is safe.
*/

CREATE TABLE IF NOT EXISTS admin_panel_access (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash text NOT NULL
);

ALTER TABLE admin_panel_access ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON admin_panel_access FROM PUBLIC, anon, authenticated;

INSERT INTO site_settings (key, value, label, group_name)
SELECT 'tasa_euro', '', 'Tasa del euro (Bs.)', 'pagos'
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'tasa_euro');

CREATE OR REPLACE FUNCTION public.admin_panel_verify(p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_panel_access
    WHERE password_hash = extensions.crypt(p_password, password_hash)
  ) THEN
    RAISE EXCEPTION 'Invalid panel password';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_panel_load(p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.admin_panel_verify(p_password);

  RETURN jsonb_build_object(
    'tasa_euro', COALESCE((SELECT value FROM public.site_settings WHERE key = 'tasa_euro'), ''),
    'businesses', (
      SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT b.id, b.name, b.status, b.created_at
        FROM public.businesses b
        WHERE b.status = 'pending' OR b.created_at > now() - interval '7 days'
      ) x
    ),
    'products', (
      SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT p.id, p.name, p.moderation_status AS status, p.moderation_note AS note, p.created_at
        FROM public.products p
        WHERE p.moderation_status = 'pending' OR p.created_at > now() - interval '7 days'
      ) x
    ),
    'users', (
      SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT pr.id, pr.display_name AS name, pr.role, pr.approval_status AS status, pr.created_at
        FROM public.profiles pr
        WHERE pr.role <> 'admin'
          AND (pr.approval_status = 'pending' OR pr.created_at > now() - interval '7 days')
      ) x
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_panel_save(p_password text, p_rate numeric, p_changes jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  c record;
BEGIN
  PERFORM public.admin_panel_verify(p_password);

  IF p_rate IS NOT NULL THEN
    IF p_rate <= 0 THEN
      RAISE EXCEPTION 'Invalid rate';
    END IF;
    UPDATE public.site_settings
    SET value = p_rate::text, updated_at = now()
    WHERE key = 'tasa_euro';
  END IF;

  FOR c IN SELECT * FROM jsonb_to_recordset(COALESCE(p_changes, '[]'::jsonb)) AS x(kind text, id uuid, approved boolean) LOOP
    IF c.kind = 'business' THEN
      UPDATE public.businesses
      SET status = CASE WHEN c.approved THEN 'approved' ELSE 'rejected' END
      WHERE id = c.id;
    ELSIF c.kind = 'product' THEN
      UPDATE public.products
      SET moderation_status = CASE WHEN c.approved THEN 'approved' ELSE 'rejected' END,
          moderation_note = CASE WHEN c.approved THEN '' ELSE 'Rechazado por el administrador' END
      WHERE id = c.id;
    ELSIF c.kind = 'user' THEN
      UPDATE public.profiles
      SET approval_status = CASE WHEN c.approved THEN 'approved' ELSE 'rejected' END
      WHERE id = c.id AND role <> 'admin';
    END IF;
  END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_panel_verify(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_panel_load(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_panel_save(text, numeric, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_panel_load(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_panel_save(text, numeric, jsonb) TO authenticated;
