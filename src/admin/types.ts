import type { SupabaseClient } from '@supabase/supabase-js';

export type AdminProps = {
  db: SupabaseClient;
  onChanged: () => void;
};
