# Supabase setup for GuessAnime leaderboard + avatars

## 1. Leaderboard table

Ensure the `leaderboard` table has an `avatar_url` column:

```sql
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS avatar_url text;
```

Existing columns: `id` (int8), `name` (text), `score` (int4), `correct` (int4), `created_at` (timestamptz).

## 2. Storage bucket: avatars

1. In **Supabase Dashboard** → **Storage**, create a new bucket.
2. Name: **avatars**
3. Make it **public** (so `getPublicUrl()` works for leaderboard avatars).

## 3. Storage policies for avatars

In **Storage** → **avatars** → **Policies**:

- **Public read**: New policy — allow **SELECT** for role `public` (or `anon`) so anyone can read objects. Example: `USING (true)` for SELECT.
- **Upload**: New policy — allow **INSERT** for role `anon` so the app can upload when a user submits a score. Example: `WITH CHECK (true)` for INSERT (or restrict by bucket if needed).

In the SQL editor you can use:

```sql
-- Allow public read on avatars bucket (policy name example: "Public read")
-- Create via Dashboard: Storage → avatars → New policy → "For full customization"
-- Operation: SELECT (read), Target: All objects, USING: true

-- Allow anon to upload (policy name example: "Anon upload")
-- Operation: INSERT, Target: All objects, WITH CHECK: true
```

Exact policy names and UI may vary by Supabase version; ensure SELECT is allowed for everyone and INSERT is allowed for `anon`.

## 4. RLS for leaderboard table

- **SELECT**: Allow `anon` (e.g. `USING (true)`) so the app can fetch top scores.
- **INSERT**: Allow `anon` so the app can insert a row when the user submits a score (with optional `avatar_url`).

After this, the app will upload the user’s avatar to `avatars`, store the public URL in `leaderboard.avatar_url`, and the podium will show avatars (or a placeholder when `avatar_url` is null).
