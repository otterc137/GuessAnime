import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pswtjdfavorlnigtpjdp.supabase.co',
  'sb_publishable_R0HrzCXFgPJO9-AuBK3NwQ_1NQPzKQ5'
);

// Table columns: id, name, score, correct, created_at, avatar_url (text, nullable).
// Add column in Supabase SQL: ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS avatar_url text;
// Storage: Create a public bucket "avatars" in Supabase Dashboard → Storage.
// RLS for avatars: allow public read; allow anon to INSERT (upload).
async function uploadAvatar(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    console.log('[Avatar] uploadAvatar skipped: no valid data URL');
    return null;
  }
  try {
    console.log('[Avatar] uploadAvatar: fetching data URL as blob...');
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = (blob.type || '').includes('png') ? 'png' : 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    console.log('[Avatar] uploadAvatar: path=', path, 'size=', blob.size, 'type=', blob.type);
    const { data: uploadData, error } = await supabase.storage.from('avatars').upload(path, blob, {
      contentType: blob.type || (ext === 'png' ? 'image/png' : 'image/jpeg'),
      upsert: false,
    });
    if (error) {
      console.error('[Avatar] upload error:', error);
      return null;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = urlData?.publicUrl || null;
    console.log('[Avatar] upload result: success, publicUrl=', publicUrl);
    return publicUrl;
  } catch (e) {
    console.error('[Avatar] upload error (exception):', e);
    return null;
  }
}

export async function submitScore(name, score, correct, avatarDataUrl = null) {
  try {
    console.log('[Leaderboard] submitScore called:', { name, score, correct, hasAvatar: !!avatarDataUrl });
    let avatar_url = null;
    if (avatarDataUrl) {
      avatar_url = await uploadAvatar(avatarDataUrl);
      console.log('[Leaderboard] avatar_url after upload:', avatar_url);
    }
    const payload = { name: name || 'Anonymous', score, correct, avatar_url };
    console.log('[Leaderboard] insert payload:', payload);
    const { error } = await supabase
      .from('leaderboard')
      .insert([payload]);
    if (error) {
      console.error('[Leaderboard] insert error:', error);
    } else {
      console.log('[Leaderboard] insert success');
    }
  } catch (e) {
    console.error('[Leaderboard] submit error:', e);
  }
}

// Start of current ISO week (Monday 00:00 UTC)
function getStartOfWeekISO() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday = start
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// If leaderboard is empty but data exists: enable RLS SELECT for anon (USING true). Allow INSERT for anon.
// Leaderboard resets weekly (only scores from current week are shown).
export async function getTopScores(count = 10) {
  try {
    const weekStart = getStartOfWeekISO();
    const { data, error } = await supabase
      .from('leaderboard')
      .select('id, name, score, correct, created_at, avatar_url')
      .gte('created_at', weekStart)
      .order('score', { ascending: false })
      .limit(count);
    console.log('[Leaderboard] fetch:', { rowCount: data?.length ?? 0, error });
    if (data?.length) {
      console.log('[Leaderboard] top 3 avatar_urls:', data.slice(0, 3).map((r, i) => ({ rank: i + 1, name: r.name, avatar_url: r.avatar_url ?? null })));
    }
    if (error) {
      console.error('Fetch error:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('Fetch error:', e);
    return [];
  }
}
