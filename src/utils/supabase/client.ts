import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          // Add storage key to prevent conflicts
          storageKey: 'utm-mandarin-club-auth',
        },
        global: {
          headers: {
            'x-application-name': 'utm-mandarin-club',
          },
        },
      }
    );
  }
  return supabaseInstance;
}