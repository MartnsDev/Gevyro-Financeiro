import { COST_POLICY } from './cost-policy';
import { isAuthorizedSharedSupabase, SHARED_SUPABASE } from './shared-supabase';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase: SupabaseClient | null =
  (COST_POLICY.allowRemoteServices ||
    isAuthorizedSharedSupabase(url, process.env.NEXT_PUBLIC_SUPABASE_SHARED_PROJECT_ENABLED)) &&
  url &&
  key
    ? createClient(url, key, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: SHARED_SUPABASE.storageKey,
        },
      })
    : null;
