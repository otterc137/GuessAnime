import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pswtjdfavorlnigtpjdp.supabase.co',
  'sb_publishable_R0HrzCXFgPJO9-AuBK3NwQ_1NQPzKQ5'
);

export async function submitScore(name, score, correct) {
  try {
    const { error } = await supabase
      .from('leaderboard')
      .insert([{ name: name || 'Anonymous', score, correct }]);
    if (error) console.error('Submit error:', error);
  } catch (e) {
    console.error('Submit error:', e);
  }
}

// Table columns: id, name, score, correct, created_at
// If leaderboard is empty but data exists in Supabase: enable RLS for anon role:
// Dashboard → leaderboard table → RLS → New policy: SELECT for anon with USING (true). Also allow INSERT for anon if needed.
export async function getTopScores(count = 10) {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('id, name, score, correct, created_at')
      .order('score', { ascending: false })
      .limit(count);
    console.log('Leaderboard fetch:', { data, error, rowCount: data?.length ?? 0 });
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
