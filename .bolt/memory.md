# Project memory

## Product intent & audience

- Spanish-language marketplace/directory platform for local businesses ("negocios") to showcase products, services, and catalog photos.
- Community-oriented: includes emergency contacts feature alongside commerce features.
- Likely Latin American audience given Spanish UI and terminology.

## Brand personality & voice

- Spanish-language interface throughout (negocios, productos, servicios, pedidos, reseñas, etc.).
- Professional but accessible tone for local business owners and customers.

## Visual design & UX direction

- Stack: Vite + React + Tailwind CSS + Lucide React icons.
- Imports use `@/` path alias (maps to `src/`); avoid deep relative paths.
- Production-quality aesthetic expected — rich, polished, not cookie-cutter.
- Images and catalog photos stored in project image folders and served alongside DB content.

## Decisions, constraints & rationale

- Backend: Supabase (requires `.env` with Supabase URL + anon key; app fails with "Missing Supabase env vars" if absent).
- Database: 22 tables including negocios, productos, servicios, pedidos, proveedores de servicios, reseñas, contactos de emergencia — with active RLS policies.
- Content lives in Supabase DB + local image folders; both must stay connected.
- No extra UI/icon/theme packages unless explicitly requested.
- Build verified successful after env file fix.

## Open questions & assumptions

- Exact scope of "pedidos" (orders) unclear — full e-commerce checkout vs. request/inquiry flow?
- Purpose of "contactos de emergencia" within a marketplace context not yet clarified.
- Whether product images are uploaded to Supabase Storage or stored only in local folders needs confirmation.
- Duplicate env files (`.envOLLD`, `.envolll`) remain in project; cleanup pending user confirmation.