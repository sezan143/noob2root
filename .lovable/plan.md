## Goal
Add an admin toggle to enable/disable the Courses module site-wide. When disabled, the "Courses" link is hidden from the public navbar (desktop + mobile) and visits to `/courses*` routes redirect to the homepage.

## Changes

### 1. `site_settings` — new key
Add a new boolean setting `courses_enabled` (default `"true"`). No migration needed; the row is created on first save via the existing upsert in `AdminSettings`.

### 2. `src/pages/admin/AdminSettings.tsx`
Add a "Modules" section (using existing `Card` + `Switch` pattern already used for `enable_comments` / `rss_enabled`) with a "Courses" toggle bound to `settings.courses_enabled`. Default to `true` if the value is not yet in the DB.

### 3. Public settings hook
Add a lightweight hook `src/hooks/useSiteSetting.ts` that fetches a single `site_settings` key (cached with react-query, already used elsewhere) and returns its value. Public and requires no auth — the `site_settings` table already permits anon reads.

### 4. `src/components/layout/Navbar.tsx`
- Compute nav links dynamically: filter out the `Courses` entry when `courses_enabled !== "true"`.
- Apply the same filter to the mobile menu list.

### 5. Route guard
In `src/App.tsx` (or wherever `/courses` and `/courses/:slug*` routes are declared), wrap the courses routes in a small guard component that reads `courses_enabled` and `<Navigate to="/" replace />` when disabled. Admin routes (`/admin/courses`, `CourseEditor`) remain accessible so admins can keep editing while hidden.

## Out of scope
- Sitemap regeneration: `scripts/generate-sitemap.ts` already only lists published courses; hiding the module in the UI doesn't require removing them from the sitemap in this pass (can be a follow-up if desired).
- Per-module toggle already exists on individual course modules (`modules.is_published`); this new toggle is the global on/off switch for the whole Courses feature.