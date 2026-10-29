import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key && !url.includes('YOUR_PROJECT'));

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const PLAYER_PHOTOS_BUCKET = 'player-photos';

export async function uploadPlayerPhoto(
  db: SupabaseClient,
  playerId: string,
  file: File
): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be under 5 MB.');
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) ? ext : 'png';
  const filePath = `${playerId}/${Date.now()}.${safeExt}`;

  const { error: uploadError } = await db.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .upload(filePath, file, { upsert: true, contentType: file.type || `image/${safeExt}` });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = db.storage.from(PLAYER_PHOTOS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
