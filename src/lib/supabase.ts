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
export const MANAGER_AVATARS_BUCKET = 'manager-avatars';
export const FORFEIT_MEDIA_BUCKET = 'forfeit-media';

/**
 * Automatically trims solid black phone-screenshot letterbox bars (top/bottom)
 * and caps oversized dimensions to 1440px max while keeping full crisp detail.
 */
async function preparePlayerPhotoFile(file: File): Promise<{ blob: Blob | File; ext: string; mime: string }> {
  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(rawExt) ? rawExt : 'jpg';

  if (typeof document === 'undefined' || safeExt === 'gif') {
    return { blob: file, ext: safeExt, mime: file.type || `image/${safeExt}` };
  }

  return new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          resolve({ blob: file, ext: safeExt, mime: file.type || `image/${safeExt}` });
          return;
        }

        // Sample image rows on a downscaled probe canvas to detect pure-black screenshot bars
        const probeW = Math.min(w, 240);
        const probeH = Math.max(1, Math.round((h * probeW) / w));
        const probe = document.createElement('canvas');
        probe.width = probeW;
        probe.height = probeH;
        const pctx = probe.getContext('2d');
        if (!pctx) {
          resolve({ blob: file, ext: safeExt, mime: file.type || `image/${safeExt}` });
          return;
        }
        pctx.drawImage(img, 0, 0, probeW, probeH);
        const data = pctx.getImageData(0, 0, probeW, probeH).data;

        const isRowNearBlack = (row: number): boolean => {
          let darkCount = 0;
          const rowOffset = row * probeW * 4;
          for (let x = 0; x < probeW; x++) {
            const idx = rowOffset + x * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];
            if (a > 220 && r < 16 && g < 16 && b < 16) darkCount++;
          }
          return darkCount / probeW >= 0.96;
        };

        let topProbe = 0;
        while (topProbe < probeH * 0.35 && isRowNearBlack(topProbe)) topProbe++;

        let bottomProbe = probeH - 1;
        while (bottomProbe > probeH * 0.65 && isRowNearBlack(bottomProbe)) bottomProbe--;

        const hasSignificantBars =
          topProbe >= Math.round(probeH * 0.05) || probeH - 1 - bottomProbe >= Math.round(probeH * 0.05);

        const cropTop = hasSignificantBars ? Math.round((topProbe / probeH) * h) : 0;
        const cropBottom = hasSignificantBars ? Math.round(((bottomProbe + 1) / probeH) * h) : h;
        const cropH = Math.max(1, cropBottom - cropTop);

        const maxDim = 1440;
        const needsResize = w > maxDim || cropH > maxDim;

        if (!hasSignificantBars && !needsResize) {
          resolve({ blob: file, ext: safeExt, mime: file.type || `image/${safeExt}` });
          return;
        }

        const scale = Math.min(1, maxDim / Math.max(w, cropH));
        const outW = Math.max(1, Math.round(w * scale));
        const outH = Math.max(1, Math.round(cropH * scale));

        const outCanvas = document.createElement('canvas');
        outCanvas.width = outW;
        outCanvas.height = outH;
        const octx = outCanvas.getContext('2d');
        if (!octx) {
          resolve({ blob: file, ext: safeExt, mime: file.type || `image/${safeExt}` });
          return;
        }
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = 'high';
        octx.drawImage(img, 0, cropTop, w, cropH, 0, 0, outW, outH);

        outCanvas.toBlob(
          blob => {
            if (blob) {
              resolve({ blob, ext: 'jpg', mime: 'image/jpeg' });
            } else {
              resolve({ blob: file, ext: safeExt, mime: file.type || `image/${safeExt}` });
            }
          },
          'image/jpeg',
          0.92
        );
      } catch {
        resolve({ blob: file, ext: safeExt, mime: file.type || `image/${safeExt}` });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: file, ext: safeExt, mime: file.type || `image/${safeExt}` });
    };

    img.src = objectUrl;
  });
}

export async function uploadPlayerPhoto(
  db: SupabaseClient,
  playerId: string,
  file: File
): Promise<string> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Image must be under 8 MB.');
  }

  const prepared = await preparePlayerPhotoFile(file);
  const filePath = `${playerId}/${Date.now()}.${prepared.ext}`;

  const { error: uploadError } = await db.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .upload(filePath, prepared.blob, { upsert: true, contentType: prepared.mime });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = db.storage.from(PLAYER_PHOTOS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function uploadManagerAvatar(
  db: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Image must be under 8 MB.');
  }

  const prepared = await preparePlayerPhotoFile(file);
  const filePath = `${userId}/${Date.now()}.${prepared.ext}`;

  const { error: uploadError } = await db.storage
    .from(MANAGER_AVATARS_BUCKET)
    .upload(filePath, prepared.blob, { upsert: true, contentType: prepared.mime });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = db.storage.from(MANAGER_AVATARS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function uploadForfeitMedia(
  db: SupabaseClient,
  folderKey: string,
  fileOrBlob: File | Blob,
  fileNameHint?: string
): Promise<{ publicUrl: string; mediaType: 'video' | 'image' | 'audio' }> {
  if (fileOrBlob.size > 50 * 1024 * 1024) {
    throw new Error('Forfeit media must be under 50 MB.');
  }

  const rawMime = (fileOrBlob.type || '').split(';')[0].trim().toLowerCase();
  const hintExt = (
    (fileNameHint || (fileOrBlob instanceof File ? fileOrBlob.name : '')).split('.').pop() || ''
  )
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  // If it's an image File, reuse preparePlayerPhotoFile so phone screenshots/photos stay crisp & fast
  if (rawMime.startsWith('image/') && fileOrBlob instanceof File) {
    const prepared = await preparePlayerPhotoFile(fileOrBlob);
    const filePath = `${folderKey}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${prepared.ext}`;
    const { error: uploadError } = await db.storage
      .from(FORFEIT_MEDIA_BUCKET)
      .upload(filePath, prepared.blob, { upsert: true, contentType: prepared.mime });
    if (uploadError) throw new Error(uploadError.message);
    const { data } = db.storage.from(FORFEIT_MEDIA_BUCKET).getPublicUrl(filePath);
    return { publicUrl: data.publicUrl, mediaType: 'image' };
  }

  let cleanMime = rawMime;
  let ext = hintExt;
  let mediaType: 'video' | 'image' | 'audio' = 'video';

  if (cleanMime.startsWith('audio/') || ['mp3', 'm4a', 'ogg', 'wav'].includes(ext)) {
    mediaType = 'audio';
    if (!cleanMime) cleanMime = ext === 'mp3' ? 'audio/mpeg' : ext === 'm4a' ? 'audio/mp4' : 'audio/webm';
    if (!ext) ext = cleanMime.includes('mp4') ? 'm4a' : cleanMime.includes('mpeg') ? 'mp3' : 'webm';
  } else if (cleanMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    mediaType = 'image';
    if (!cleanMime) cleanMime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    if (!ext) ext = cleanMime.includes('png') ? 'png' : cleanMime.includes('webp') ? 'webp' : 'jpg';
  } else {
    mediaType = 'video';
    if (cleanMime === 'video/x-matroska') cleanMime = 'video/webm';
    if (!cleanMime || !cleanMime.startsWith('video/')) {
      cleanMime = ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4';
    }
    if (!ext) {
      ext = cleanMime.includes('webm') ? 'webm' : cleanMime.includes('quicktime') ? 'mov' : 'mp4';
    }
  }

  const normalizedBlob = new Blob([fileOrBlob], { type: cleanMime });
  const safeFolder = folderKey.replace(/[^a-zA-Z0-9_-]/g, '') || 'forfeits';
  const filePath = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const { error: uploadError } = await db.storage
    .from(FORFEIT_MEDIA_BUCKET)
    .upload(filePath, normalizedBlob, { upsert: true, contentType: cleanMime });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = db.storage.from(FORFEIT_MEDIA_BUCKET).getPublicUrl(filePath);
  return { publicUrl: data.publicUrl, mediaType };
}
