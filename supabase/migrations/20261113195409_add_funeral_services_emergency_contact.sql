/*
# Add funeral services contact to Salud & Emergencias

1. Modified Tables
- `emergency_contacts`
  - New column `description` (text, default empty): short description shown on the card.
  - New column `whatsapp` (text, nullable): WhatsApp number in international format; when set, the card shows a WhatsApp button.
  - The `category` check now also accepts `funeral` (Funeraria).
2. New Rows
- Mora Servicios Previsivos San Miguel Arcángel 2010 (category `funeral`).

3. Security
- No changes to RLS policies or grants. The existing anon/authenticated access continues to apply.

4. Notes
- Existing rows are untouched. The insert is skipped if a row with the same name already exists, so re-running is safe.
*/

ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS whatsapp text;

ALTER TABLE emergency_contacts DROP CONSTRAINT IF EXISTS emergency_contacts_category_check;
ALTER TABLE emergency_contacts ADD CONSTRAINT emergency_contacts_category_check
  CHECK (category = ANY (ARRAY['police'::text, 'fire'::text, 'ambulance'::text, 'pharmacy'::text, 'health_center'::text, 'doctor'::text, 'clinic'::text, 'funeral'::text]));

INSERT INTO emergency_contacts (name, category, phone, address, description, whatsapp, is_on_duty, sort_order)
SELECT
  'Mora Servicios Previsivos San Miguel Arcángel 2010',
  'funeral',
  '0424-7684509 / 0412-9575167',
  'Calle 23 entre 4 y 5, sector Pueblo Nuevo, Santa Bárbara, Edo. Barinas',
  E'Prestación de servicios funerarios\nTraslados nacionales\nConvenios nacionales e internacionales y repatriaciones',
  '584247684509',
  true,
  11
WHERE NOT EXISTS (
  SELECT 1 FROM emergency_contacts WHERE name = 'Mora Servicios Previsivos San Miguel Arcángel 2010'
);
