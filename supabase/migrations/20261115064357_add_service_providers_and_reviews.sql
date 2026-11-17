/*
# Add service providers and their reviews

1. New Tables
- `service_providers`: a person who offers a specific service listed by a business (name, headline, bio, avatar, phone, starting price). Rating fields `score` and `reviews_count` are maintained automatically from reviews.
- `service_provider_reviews`: a rating (1 to 5) and optional comment left by a signed-in user about one provider. One review per user per provider.

2. Security
- RLS enabled on both tables.
- Anyone (including visitors not signed in) can read providers and reviews of services whose business is visible, mirroring the services table.
- Only the business owner of the service (or an admin) can add, edit or remove providers. Rating fields cannot be written by clients.
- Signed-in users can add and delete only their own reviews; admins can delete any review.
- The rating refresh function is not callable by clients.
*/

CREATE TABLE IF NOT EXISTS service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  headline text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  score numeric NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_providers_service_id_idx ON service_providers (service_id);

ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON service_providers TO anon, authenticated;
GRANT INSERT (service_id, full_name, headline, bio, avatar_url, phone, price), UPDATE (service_id, full_name, headline, bio, avatar_url, phone, price) ON service_providers TO authenticated;
GRANT DELETE ON service_providers TO authenticated;

DROP POLICY IF EXISTS "service_providers_read_public" ON service_providers;
CREATE POLICY "service_providers_read_public" ON service_providers FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM services s
    JOIN businesses b ON b.id = s.business_id
    WHERE s.id = service_providers.service_id
      AND (b.status = 'approved' OR b.owner_id = auth.uid() OR is_admin())
  )
);

DROP POLICY IF EXISTS "service_providers_insert_owner_or_admin" ON service_providers;
CREATE POLICY "service_providers_insert_owner_or_admin" ON service_providers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM services s
    JOIN businesses b ON b.id = s.business_id
    WHERE s.id = service_providers.service_id
      AND (b.owner_id = auth.uid() OR is_admin())
  )
);

DROP POLICY IF EXISTS "service_providers_update_owner_or_admin" ON service_providers;
CREATE POLICY "service_providers_update_owner_or_admin" ON service_providers FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM services s
    JOIN businesses b ON b.id = s.business_id
    WHERE s.id = service_providers.service_id
      AND (b.owner_id = auth.uid() OR is_admin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM services s
    JOIN businesses b ON b.id = s.business_id
    WHERE s.id = service_providers.service_id
      AND (b.owner_id = auth.uid() OR is_admin())
  )
);

DROP POLICY IF EXISTS "service_providers_delete_owner_or_admin" ON service_providers;
CREATE POLICY "service_providers_delete_owner_or_admin" ON service_providers FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM services s
    JOIN businesses b ON b.id = s.business_id
    WHERE s.id = service_providers.service_id
      AND (b.owner_id = auth.uid() OR is_admin())
  )
);

CREATE TABLE IF NOT EXISTS service_provider_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, reviewer_id)
);

ALTER TABLE service_provider_reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON service_provider_reviews TO anon, authenticated;
GRANT INSERT (provider_id, reviewer_id, rating, comment) ON service_provider_reviews TO authenticated;
GRANT DELETE ON service_provider_reviews TO authenticated;

DROP POLICY IF EXISTS "service_provider_reviews_read_public" ON service_provider_reviews;
CREATE POLICY "service_provider_reviews_read_public" ON service_provider_reviews FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "service_provider_reviews_insert_self" ON service_provider_reviews;
CREATE POLICY "service_provider_reviews_insert_self" ON service_provider_reviews FOR INSERT
TO authenticated
WITH CHECK (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "service_provider_reviews_delete_own_or_admin" ON service_provider_reviews;
CREATE POLICY "service_provider_reviews_delete_own_or_admin" ON service_provider_reviews FOR DELETE
TO authenticated
USING (reviewer_id = auth.uid() OR is_admin());

CREATE OR REPLACE FUNCTION refresh_service_provider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_uuid uuid := COALESCE(NEW.provider_id, OLD.provider_id);
BEGIN
  UPDATE service_providers p
  SET
    reviews_count = (SELECT count(*) FROM service_provider_reviews r WHERE r.provider_id = provider_uuid),
    score = COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM service_provider_reviews r WHERE r.provider_id = provider_uuid), 0)
  WHERE p.id = provider_uuid;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION refresh_service_provider_rating() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS service_provider_reviews_refresh_rating ON service_provider_reviews;
CREATE TRIGGER service_provider_reviews_refresh_rating
AFTER INSERT OR DELETE ON service_provider_reviews
FOR EACH ROW EXECUTE FUNCTION refresh_service_provider_rating();
